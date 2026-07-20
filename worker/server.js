/**
 * Moonrise Studio worker
 * - POST /generate   OpenRouter HTML generation
 * - POST /checkout   Stripe Checkout Session
 * - POST /webhooks/stripe  payment → unlock watermark
 * - POST /resolve-maps  Google Maps URL → business details
 * - POST /publish    Vercel deployment
 * - POST /unpublish  Take site offline on Vercel
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

/** Load worker/.env, filling blank values that would otherwise block Supabase. */
function loadWorkerEnv() {
  const dotenv = require("dotenv");
  const envPath = path.join(__dirname, ".env");
  dotenv.config({ path: envPath });

  // If a parent shell exported empty SUPABASE_* values, dotenv won't override them.
  // Re-read the file and fill only blank keys.
  if (!fs.existsSync(envPath)) return;
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] == null || String(process.env[key]).trim() === "") {
      process.env[key] = value;
    }
  }

  // Optional local vault (gitignored) for dev tokens — never committed.
  const vaultPath = path.join(__dirname, "..", "..", "accesstokens.env");
  if (fs.existsSync(vaultPath) && !String(process.env.GITHUB_TOKEN || "").trim()) {
    const vault = dotenv.parse(fs.readFileSync(vaultPath));
    if (vault.GITHUB_TOKEN) process.env.GITHUB_TOKEN = vault.GITHUB_TOKEN;
  }
}
loadWorkerEnv();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { formatApiError, respondApiError, sendStripeMissing } = require("./api-errors");

const PORT = Number(process.env.PORT || 8787);
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
/** Public base URL of THIS worker (used to embed the watermark widget into live sites). */
function resolveWorkerPublicUrl() {
  const fromEnv = String(process.env.WORKER_PUBLIC_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Vercel sets VERCEL_URL without protocol (e.g. moonrise-studio.vercel.app).
  const vercelHost = String(process.env.VERCEL_URL || "").trim().replace(/^https?:\/\//, "");
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;
  // Prefer the Studio cloud worker when publishing from local without env set.
  if (process.env.VERCEL_TOKEN || process.env.NODE_ENV === "production") {
    return "https://trymoonrise.com";
  }
  return `http://127.0.0.1:${PORT}`;
}
const WORKER_PUBLIC_URL = resolveWorkerPublicUrl();
const WATERMARK_EMBED_PATH = path.join(__dirname, "..", "watermark", "embed.js");
const CONTACT_FORM_SCRIPT_PATH = path.join(__dirname, "..", "watermark", "contact-form.js");
/** Website generation and editing - override with WEBSITE_GENERATION_MODEL. */
const WEBSITE_GENERATION_MODEL = String(
  process.env.WEBSITE_GENERATION_MODEL || "minimax/minimax-m2.7"
).trim();
/** Assemble output budget (output tokens dominate cost + latency). */
const WEBSITE_MAX_OUTPUT_TOKENS = Math.max(
  8000,
  Number(process.env.WEBSITE_MAX_OUTPUT_TOKENS || 12000)
);
/** Edit output budget. */
const WEBSITE_EDIT_MAX_OUTPUT_TOKENS = Math.max(
  2000,
  Number(process.env.WEBSITE_EDIT_MAX_OUTPUT_TOKENS || 5500)
);
/** Max HTML chars sent into an edit prompt (full rewrite still, but capped). */
const WEBSITE_EDIT_MAX_INPUT_CHARS = Math.max(
  40000,
  Number(process.env.WEBSITE_EDIT_MAX_INPUT_CHARS || 120000)
);
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
/**
 * Website Presets gallery used as the visual kit for generation.
 * Prefer a no-space path (Vercel includeFiles + brace globs), then the
 * human-named folder. Override with WEBSITE_PRESETS_DIR if needed.
 */
function resolveWebsitePresetsDir() {
  const fromEnv = String(process.env.WEBSITE_PRESETS_DIR || "").trim();
  const candidates = [
    fromEnv,
    path.join(__dirname, "..", "website-presets"),
    path.join(__dirname, "website-presets"),
    path.join(__dirname, "..", "Website Presets"),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "presets", "manifest.json"))) return dir;
  }
  return candidates[candidates.length - 1] || path.join(__dirname, "..", "Website Presets");
}
const WEBSITE_PRESETS_DIR = resolveWebsitePresetsDir();
/** Prefer one component from each of these real manifest categories. */
const PRESET_PACK_CATEGORIES = [
  "navigation",
  "hero",
  "features",
  "cards",
  "testimonials",
  "cta",
  "forms",
  "footers",
  "buttons",
  "sections",
];
/**
 * Kit budget floors are intentionally high so low Vercel env overrides cannot
 * starve generation into "invent a hero from scratch" mode.
 */
const PRESET_MAX_FILES = Math.max(10, Number(process.env.WEBSITE_PRESET_MAX_FILES || 12));
const PRESET_MAX_CHARS_EACH = Math.max(2800, Number(process.env.WEBSITE_PRESET_MAX_CHARS_EACH || 3600));
const PRESET_MAX_TOTAL_CHARS = Math.max(
  24000,
  Number(process.env.WEBSITE_PRESET_MAX_TOTAL_CHARS || 32000)
);

const {
  PLAN_SYSTEM_PROMPT,
  GENERATION_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
  buildPlanUserPrompt,
  buildGenerationUserPrompt,
  buildEditUserPrompt,
  buildBusinessBrief,
  buildVariationBrief,
  selectStockMedia,
  ensureStockMediaInHtml,
  ensurePaletteContrast,
  assessSiteCompleteness,
} = require("./generate-prompt");
const { catalogStats } = require("./stock-media");
const {
  getBusinessStructure,
  getStructurePresetRoles,
} = require("./business-structures");
const githubPresets = require("./github-presets");

// Warm GitHub preset manifest cache at startup (non-blocking).
githubPresets.ensureManifest().catch((e) => {
  console.warn("Startup preset manifest prefetch failed:", e.message);
});

const security = require("./security");
const { mountAuthRoutes } = require("./auth-routes");
const {
  GENERATION_CREDIT_COST,
  planById,
  getBalance,
  syncProfileMvpPlus,
  grantSubscription,
  grantTopup,
  deductCredits,
  refundCredits,
  deactivatePlan,
  planLineItem,
  quoteCustomTopup,
  resolveTopupFromSession,
  customTopupLineItem,
  TOPUP_MIN_DOLLARS,
  TOPUP_MAX_DOLLARS,
  DONATE_MIN_DOLLARS,
  DONATE_MAX_DOLLARS,
  DONATE_DEFAULT_DOLLARS,
  publicPlansCatalog,
  quoteDonation,
  donateOneTimeLineItem,
  donateSubscriptionLineItem,
  donatePriceLabel,
  donateAmountCents,
  publicDonateConfig,
  hasActiveMvpDonationSubscription,
  grantMvpDonation,
  revokeMvpDonation,
} = require("./credits");
const {
  DONOR_MESSAGE_MAX,
  sanitizeDonorMessage,
  recordOneTimeDonationPayment,
  reconcilePendingDonationPayments,
  getDonationLeaderboard,
} = require("./donate-leaderboard");
const {
  startSecurityCardVerification,
  completeSecurityCardVerification,
  chargeSecurityCard,
  publicSecurityCardConfig,
  publicSecurityCardStatus,
} = require("./security-card");
const { notifyGoLiveSale } = require("./sale-telegram");
const {
  vapidConfigured,
  upsertPushSubscription,
  deletePushSubscription,
  notifyCreatorClientPurchase,
} = require("./creator-push");
const { recordPendingCreatorPayout } = require("./creator-payouts");
const { sendContactLeadEmail, sendPurchaseInvoiceEmail } = require("./contact-mail");
const {
  detectContactEndpoint,
  readContactFormConfig,
  escapeHtmlAttr,
} = require("./contact-endpoint");
const {
  buildCreatorContactSnapshot,
  hqContactSnapshot,
  encodeContactPayload,
  readStoredCreatorContact,
} = require("./creator-contact");
const { clientIp, createRateLimiter, applySecurityHeaders } = security;
const {
  resolveExistingGeneration,
  failGenerationJob,
  findJobByRequestId,
  buildDonePayload,
  waitForGenerationJob,
  ACTIVE_JOB_MS,
} = require("./generate-jobs");

/** Same requestId retries (refresh/resume) must not consume generate rate limit slots. */
const seenGenerateRequestIds = new Map();

function shouldCountGenerate(req) {
  const rid = String(req.body?.requestId || req.headers["x-request-id"] || "").trim();
  if (!rid) return true;
  const key = String(req.user?.id || clientIp(req)) + ":" + rid;
  if (seenGenerateRequestIds.has(key)) return false;
  seenGenerateRequestIds.set(key, Date.now());
  if (seenGenerateRequestIds.size > 8000) {
    const cutoff = Date.now() - ACTIVE_JOB_MS;
    for (const [k, t] of seenGenerateRequestIds) {
      if (t < cutoff) seenGenerateRequestIds.delete(k);
    }
  }
  return true;
}

/** Roles the atmosphere planner should cover. */
const PLAN_ROLE_CATEGORIES = {
  nav: ["navigation", "menus", "docks", "sidebars"],
  hero: ["hero", "heroes", "text", "videos"],
  features: ["features", "cards", "sections", "hooks"],
  proof: ["testimonials", "hooks", "cards"],
  cta: ["cta", "buttons", "announcement"],
  form: ["forms", "inputs", "textareas"],
  footer: ["footers"],
  accent: ["backgrounds", "effects", "animation", "ease-in"],
};

const CATALOG_PER_BUCKET = 8;

let _supabaseAdmin = null;
function db() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    const err = new Error(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to worker/.env (local) or Vercel env vars, then restart the worker."
    );
    err.status = 503;
    err.code = "SUPABASE_NOT_CONFIGURED";
    throw err;
  }
  _supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/** Monthly hosting & maintenance billed with every go-live checkout. */
const HOSTING_MONTHLY_CENTS = Math.max(
  0,
  Number(process.env.STRIPE_HOSTING_MONTHLY_CENTS || 400)
);

function hostingMaintenanceLineItem() {
  return {
    price_data: {
      currency: "usd",
      recurring: { interval: "month" },
      product_data: {
        name: "Hosting & maintenance",
        description: "Monthly website hosting and ongoing maintenance.",
      },
      unit_amount: HOSTING_MONTHLY_CENTS,
    },
    quantity: 1,
  };
}

function goLiveUpfrontLineItem(amountCents, businessName) {
  const label = String(businessName || "").trim();
  return {
    price_data: {
      currency: "usd",
      product_data: {
        name: label ? `Website for ${label}` : "Website development",
        description: label
          ? `Website purchase and go-live for ${label}.`
          : "Website purchase and go-live.",
      },
      unit_amount: amountCents,
    },
    quantity: 1,
  };
}

function goLiveCheckoutLineItems(amountCents, businessName) {
  return [goLiveUpfrontLineItem(amountCents, businessName), hostingMaintenanceLineItem()];
}

const MIN_GO_LIVE_AMOUNT_CENTS = 100;
const MAX_GO_LIVE_AMOUNT_CENTS = 10000000;

function resolveGoLiveAmountCents(...candidates) {
  for (const raw of candidates) {
    const cents = Math.round(Number(raw));
    if (Number.isFinite(cents) && cents >= MIN_GO_LIVE_AMOUNT_CENTS) {
      return Math.min(MAX_GO_LIVE_AMOUNT_CENTS, cents);
    }
  }
  return Number(process.env.STRIPE_AMOUNT_CENTS || 50000);
}

function createGoLiveCheckoutSession(stripe, opts) {
  const {
    project,
    projectId,
    userId,
    amountCents,
    successUrl,
    cancelUrl,
    customerEmail,
    lineItems,
  } = opts;
  const businessName = String(project?.business_name || "").trim();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems || goLiveCheckoutLineItems(amountCents, businessName),
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail || undefined,
    metadata: {
      projectId,
      userId,
      type: "go_live",
    },
    subscription_data: {
      metadata: {
        type: "site_hosting",
        projectId,
        userId,
      },
    },
  });
}

/** Buyer email from a completed Checkout Session. */
function buyerEmailFromSession(session) {
  const email = String(
    session?.customer_details?.email || session?.customer_email || ""
  )
    .trim()
    .toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

/** Pull Stripe invoice PDF (base64) for email attachment. */
async function loadGoLiveInvoicePdf(stripe, session) {
  let amountCents =
    session?.amount_total != null ? Number(session.amount_total) : null;
  let pdfBase64 = null;
  const invoiceId =
    typeof session?.invoice === "string"
      ? session.invoice
      : session?.invoice?.id || null;
  if (!stripe || !invoiceId) {
    return { amountCents, pdfBase64 };
  }
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (invoice.amount_paid != null) amountCents = Number(invoice.amount_paid);
    if (invoice.invoice_pdf) {
      const pdfRes = await fetch(invoice.invoice_pdf);
      if (pdfRes.ok) {
        pdfBase64 = Buffer.from(await pdfRes.arrayBuffer()).toString("base64");
      }
    }
  } catch (e) {
    console.warn("Could not load invoice PDF:", e.message);
  }
  return { amountCents, pdfBase64 };
}

/**
 * After a go-live Stripe payment: flip watermark off, record payment, redeploy clean HTML.
 * Shared by the Stripe webhook and the /fulfill-go-live return path.
 */
async function unlockGoLiveAfterPayment(supabase, { projectId, session, userId }) {
  if (!projectId) throw new Error("projectId required");

  const { data: existingProject, error: loadErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!existingProject) throw new Error("Project not found");

  const ownerId = userId || existingProject.user_id || null;
  const subId =
    typeof session?.subscription === "string"
      ? session.subscription
      : session?.subscription?.id || null;
  const priorCtx =
    existingProject.business_context &&
    typeof existingProject.business_context === "object" &&
    !Array.isArray(existingProject.business_context)
      ? existingProject.business_context
      : {};

  const invoiceEmailAlreadySent = !!priorCtx.purchaseInvoiceEmailSentAt;
  const saleTelegramAlreadySent = !!priorCtx.saleTelegramSentAt;
  const creatorPushAlreadySent = !!priorCtx.creatorPushSentAt;

  const { error: unlockErr } = await supabase
    .from("projects")
    .update({
      watermark_enabled: false,
      status: "paid",
      stripe_checkout_session_id: session?.id || existingProject.stripe_checkout_session_id || null,
      business_context: {
        ...priorCtx,
        hostingSubscriptionId: subId || priorCtx.hostingSubscriptionId || null,
        hostingMonthlyCents: HOSTING_MONTHLY_CENTS,
        paidAt: priorCtx.paidAt || new Date().toISOString(),
      },
    })
    .eq("id", projectId);
  if (unlockErr) throw unlockErr;

  if (session?.id && ownerId) {
    await supabase.from("payments").upsert(
      {
        user_id: ownerId,
        project_id: projectId,
        stripe_session_id: session.id,
        stripe_payment_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        amount_cents: session.amount_total,
        currency: session.currency || "usd",
        kind: "go_live",
        status: "paid",
      },
      { onConflict: "stripe_session_id" }
    );
  }

  const { data: fresh, error: freshErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (freshErr) throw freshErr;
  if (!fresh) throw new Error("Project missing after unlock");

  let redeploy = null;
  if (fresh.vercel_url || fresh.business_context?.vercelSlug) {
    try {
      redeploy = await deployProjectToVercel(supabase, fresh);
    } catch (redeployErr) {
      console.error("Auto-redeploy after payment failed:", redeployErr.message);
      redeploy = { error: redeployErr.message || "Redeploy failed" };
    }
  }

  const siteUrl = redeploy?.url || fresh.vercel_url || null;

  // Simple email + invoice PDF to the buyer. Idempotent across webhook + fulfill.
  if (!invoiceEmailAlreadySent && session) {
    try {
      const email = buyerEmailFromSession(session);
      if (email) {
        const stripe = stripeClient();
        const { amountCents, pdfBase64 } = await loadGoLiveInvoicePdf(stripe, session);
        const safeName = String(fresh.business_name || "invoice")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40);
        await sendPurchaseInvoiceEmail({
          to: email,
          businessName: fresh.business_name || "",
          amountCents,
          siteUrl,
          pdfBase64,
          pdfFilename: `${safeName || "invoice"}-invoice.pdf`,
        });
        const ctxAfter =
          fresh.business_context &&
          typeof fresh.business_context === "object" &&
          !Array.isArray(fresh.business_context)
            ? fresh.business_context
            : {};
        await supabase
          .from("projects")
          .update({
            business_context: {
              ...ctxAfter,
              purchaseInvoiceEmailSentAt: new Date().toISOString(),
              purchaseInvoiceEmailTo: email,
            },
          })
          .eq("id", projectId);
      } else {
        console.warn("Go-live invoice email skipped: no buyer email on session", session.id);
      }
    } catch (mailErr) {
      console.error("Go-live invoice email failed:", mailErr.message || mailErr);
    }
  }

  if (!saleTelegramAlreadySent && session) {
    try {
      await notifyGoLiveSale(supabase, {
        project: fresh,
        session,
        ownerId,
        siteUrl,
        hostingMonthlyCents: HOSTING_MONTHLY_CENTS,
      });
    } catch (telegramErr) {
      console.error("Go-live sale Telegram failed:", telegramErr.message || telegramErr);
    }
  }

  if (!creatorPushAlreadySent && session) {
    try {
      await notifyCreatorClientPurchase(supabase, {
        project: fresh,
        session,
        ownerId,
        siteUrl,
      });
    } catch (pushErr) {
      console.error("Creator client-purchase push failed:", pushErr.message || pushErr);
    }
  }

  try {
    await recordPendingCreatorPayout(supabase, {
      projectId,
      ownerId,
      session,
      project: fresh,
    });
  } catch (payoutErr) {
    console.warn("Pending creator payout record failed:", payoutErr?.message || payoutErr);
  }

  return {
    projectId,
    watermarkEnabled: false,
    url: siteUrl,
    redeployed: !!(redeploy && !redeploy.error),
    redeployError: redeploy?.error || null,
  };
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(applySecurityHeaders);

/**
 * Public endpoints reachable from any deployed (Vercel) site, where an
 * unauthenticated business owner pays to remove the watermark. These must be
 * open to all origins, so allow `*` before the stricter global CORS runs.
 */
const PUBLIC_PATHS = new Set([
  "/health",
  "/public-checkout",
  "/fulfill-go-live",
  "/embed.js",
  "/contact-form.js",
  "/contact-submit",
  "/public-orders",
  "/public-creator-contact",
]);
app.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});

const corsOrigins = String(process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isPrivateLanHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (corsOrigins.includes("*") || corsOrigins.includes(origin)) return true;
  // Local Studio may run on any port / LAN IP (Live Server, phone testing, etc.)
  try {
    const url = new URL(origin);
    if ((url.protocol === "http:" || url.protocol === "https:") && isPrivateLanHost(url.hostname)) {
      return true;
    }
  } catch (_) {
    /* ignore */
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

app.get("/health", async (_req, res) => {
  try {
    await githubPresets.ensureManifest();
  } catch (e) {
    console.warn("Health: GitHub preset manifest prefetch failed:", e.message);
  }
  const manifest = loadPresetManifest();
  let sampleKit = 0;
  try {
    sampleKit = selectKitIdsLocally({
      businessName: "Health Check Plumbing",
      category: "plumber",
    }).ids.length;
  } catch (_) {
    sampleKit = 0;
  }
  res.json({
    ok: true,
    service: "moonrise-studio-worker",
    websiteGenerationModel: WEBSITE_GENERATION_MODEL,
    websiteMaxOutputTokens: WEBSITE_MAX_OUTPUT_TOKENS,
    workerPublicUrl: WORKER_PUBLIC_URL,
    watermarkEmbedPath: WATERMARK_EMBED_PATH,
    watermarkEmbedExists: fs.existsSync(WATERMARK_EMBED_PATH),
    websitePresetBudget: {
      maxFiles: PRESET_MAX_FILES,
      maxCharsEach: PRESET_MAX_CHARS_EACH,
      maxTotalChars: PRESET_MAX_TOTAL_CHARS,
    },
    websitePresets: {
      dir: WEBSITE_PRESETS_DIR,
      ...githubPresets.getPresetSourceMeta(),
      manifestCount: manifest.length,
      sampleKitCount: sampleKit,
      ready: manifest.length > 0 && sampleKit > 0,
    },
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAuthAnon: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasVercel: !!process.env.VERCEL_TOKEN,
    stockMedia: typeof catalogStats === "function" ? catalogStats() : undefined,
  });
});

/** Stripe webhook needs raw body - mount before json parser. */
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = stripeClient();
  if (!stripe) return res.status(500).send("Stripe not configured");
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature error", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const projectId = session.metadata?.projectId;
      const userId = session.metadata?.userId;
      const kind = String(session.metadata?.type || "").toLowerCase();
        const supabase = db();

      // Credit plan subscription (Starter / Pro / Business)
      if (kind === "credit_plan" && userId) {
        const planId = String(session.metadata?.planId || "").toLowerCase();
        const plan = planById(planId);
        if (plan) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id || null;
          let periodStart = null;
          let periodEnd = null;
          if (subId && stripe) {
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              periodStart = sub.current_period_start
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null;
              periodEnd = sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null;
            } catch (_) {
              /* optional */
            }
          }
          await grantSubscription(supabase, {
            userId,
            credits: plan.credits,
            planId: plan.id,
            idempotencyKey: `checkout:${session.id}`,
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : session.customer?.id || null,
            stripeSubscriptionId: subId,
            periodStart,
            periodEnd,
          });
        await supabase.from("payments").upsert(
          {
            user_id: userId,
              project_id: null,
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null,
              amount_cents: session.amount_total || plan.priceCents,
            currency: session.currency || "usd",
            status: "paid",
          },
          { onConflict: "stripe_session_id" }
        );
        }
      } else if (kind === "credit_topup" && userId) {
        const topup = resolveTopupFromSession(session);
        if (topup) {
          await grantTopup(supabase, {
            userId,
            credits: topup.credits,
            idempotencyKey: `topup:${session.id}`,
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : session.customer?.id || null,
          });
          await supabase.from("payments").upsert(
            {
              user_id: userId,
              project_id: null,
              stripe_session_id: session.id,
              stripe_payment_intent:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id || null,
              amount_cents: session.amount_total || topup.priceCents,
              currency: session.currency || "usd",
              status: "paid",
            },
            { onConflict: "stripe_session_id" }
          );
        }
      } else if (kind === "mvp_donation" && userId) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;
        let periodEnd = null;
        if (subId && stripe) {
          const sub = await stripe.subscriptions.retrieve(subId);
          periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
        }
        await grantMvpDonation(supabase, {
          userId,
          sessionId: session.id,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : session.customer?.id || null,
          stripeSubscriptionId: subId,
          periodEnd,
        });
        const donorMessage = sanitizeDonorMessage(session.metadata?.donorMessage);
        await supabase.from("payments").upsert(
          {
            user_id: userId,
            project_id: null,
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null,
            amount_cents: session.amount_total || Number(session.metadata?.priceCents) || donateAmountCents(),
            currency: session.currency || "usd",
            status: "paid",
            kind: "mvp_donation",
            donor_message: donorMessage,
          },
          { onConflict: "stripe_session_id" }
        );
      } else if (kind === "mvp_donation_onetime" && userId) {
        await recordOneTimeDonationPayment(supabase, session);
      } else if (projectId) {
        // Business-owner go-live payment (type=go_live or legacy sessions):
        // remove watermark + redeploy clean HTML without embed.js.
        await unlockGoLiveAfterPayment(supabase, {
          projectId,
          session,
          userId: userId || session.metadata?.userId || null,
        });
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id || null;
      if (subId && stripe) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        const kind = String(sub.metadata?.type || "").toLowerCase();
        const planId = String(sub.metadata?.planId || "").toLowerCase();
        const plan = planById(planId);
        if (kind === "credit_plan" && userId && plan) {
          const supabase = db();
          const isRenewal = String(invoice.billing_reason || "") === "subscription_cycle";
          if (isRenewal) {
            await grantSubscription(supabase, {
              userId,
              credits: plan.credits,
              planId: plan.id,
              idempotencyKey: `invoice:${invoice.id}`,
              stripeCustomerId:
                typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
              stripeSubscriptionId: subId,
              periodStart: sub.current_period_start
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null,
              periodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
            });
          }
        } else if (kind === "mvp_donation" && userId) {
          const billingReason = String(invoice.billing_reason || "");
          if (billingReason === "subscription_cycle") {
            const supabase = db();
            const paidCents = Math.max(
              0,
              Number(invoice.amount_paid || invoice.total || donateAmountCents())
            );
            await supabase.from("payments").upsert(
              {
                user_id: userId,
                project_id: null,
                stripe_session_id: `invoice:${invoice.id}`,
                stripe_payment_intent:
                  typeof invoice.payment_intent === "string"
                    ? invoice.payment_intent
                    : invoice.payment_intent?.id || null,
                amount_cents: paidCents,
                currency: invoice.currency || "usd",
                status: "paid",
                kind: "mvp_donation",
              },
              { onConflict: "stripe_session_id" }
            );
          }
        }
      }
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      const kind = String(sub.metadata?.type || "").toLowerCase();
      if (kind === "credit_plan" && userId) {
        const status = String(sub.status || "");
        const active = status === "active" || status === "trialing";
        if (event.type === "customer.subscription.deleted" || !active) {
          await deactivatePlan(db(), userId);
        } else if (active) {
          const planId = String(sub.metadata?.planId || "").toLowerCase();
          const plan = planById(planId);
          if (plan) {
            await db()
              .from("credit_accounts")
              .update({
                plan_id: plan.id,
                plan_status: "active",
                stripe_subscription_id: sub.id,
                period_start: sub.current_period_start
                  ? new Date(sub.current_period_start * 1000).toISOString()
                  : null,
                period_end: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : null,
              })
              .eq("user_id", userId);
            await db().from("profiles").update({ mvp_plus: true }).eq("id", userId);
          }
        }
      } else if (kind === "mvp_donation" && userId) {
        const status = String(sub.status || "");
        const active = status === "active" || status === "trialing";
        if (event.type === "customer.subscription.deleted" || !active) {
          await revokeMvpDonation(db(), userId);
        } else if (active) {
          await grantMvpDonation(db(), {
            userId,
            stripeCustomerId:
              typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
            stripeSubscriptionId: sub.id,
            periodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.use(express.json({ limit: "2mb" }));

async function requireUser(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const { data, error } = await db().auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid auth token" });
    req.user = data.user;
    next();
  } catch (e) {
    res.status(401).json({ error: e.message || "Unauthorized" });
  }
}

mountAuthRoutes(app, { db, security });

const generateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  name: "generate",
  keyFn: (req) => "gen:" + (req.user?.id || clientIp(req)),
  shouldCount: shouldCountGenerate,
});
const editLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  name: "edit",
  keyFn: (req) => "edit:" + (req.user?.id || clientIp(req)),
});
const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  name: "checkout",
  keyFn: (req) => "chk:" + (req.user?.id || clientIp(req)),
});
const publicCheckoutLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  name: "public-checkout",
  keyFn: (req) => "pchk:" + clientIp(req),
});
const publishLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  name: "publish",
  keyFn: (req) => "pub:" + (req.user?.id || clientIp(req)),
});
const mapsLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  name: "resolve-maps",
  keyFn: (req) => "maps:" + (req.user?.id || clientIp(req)),
});
const leadFinderLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  name: "lead-finder",
  keyFn: (req) => "lf:" + (req.user?.id || clientIp(req)),
});
const contactSubmitLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  name: "contact-submit",
  keyFn: (req) => "cform:" + clientIp(req) + ":" + String(req.body?.projectId || ""),
});


function stripDemoChrome(html) {
  return String(html || "")
    .replace(/<div[^>]*class=["'][^"']*toggles[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?toggles[\s\S]*?<\/script>/gi, "");
}

/**
 * Inject mobile-fit CSS so generated sites scroll and don't overflow on phones.
 * Fixes common AI output issues: fixed pill navs too wide, body height locks,
 * and catastrophic `div { overflow: hidden }` rules that trap page scroll.
 */
function ensureMobileFriendlyHtml(html) {
  let out = String(html || "");
  if (!out.trim()) return out;

  if (!/<meta[^>]+name=["']viewport["']/i.test(out)) {
    out = out.replace(
      /<head([^>]*)>/i,
      '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    );
  } else {
    out = out.replace(
      /<meta[^>]+name=["']viewport["'][^>]*>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    );
  }

  // AI sometimes emits `div { overflow: hidden }` which traps scroll on wrappers.
  out = out.replace(/\bdiv\s*\{([^{}]*)\}/gi, (full, body) => {
    if (!/overflow\s*:\s*hidden/i.test(body)) return full;
    if (/^\s*overflow\s*:\s*hidden\s*;?\s*$/i.test(body)) {
      return "/* moonrise: stripped-universal-div-overflow */";
    }
    const next = body
      .replace(/overflow\s*:\s*hidden\s*!important\s*;?/gi, "")
      .replace(/overflow\s*:\s*hidden\s*;?/gi, "");
    return "div{" + next + "}";
  });
  out = out.replace(
    /\b(html|body)\s*\{([^}]*?)overflow\s*:\s*hidden(\s*!important)?([^}]*)\}/gi,
    (full, sel, before, _imp, after) =>
      sel + "{" + before + "overflow: visible" + after + "}"
  );

  const css = `
/* Moonrise mobile-fit - one scroll root (html), body must not trap scroll */
html{max-width:100%!important;overflow-x:hidden!important;overflow-y:scroll!important;height:auto!important;max-height:none!important;-webkit-overflow-scrolling:touch}
body{max-width:100%!important;overflow-x:hidden!important;overflow-y:visible!important;height:auto!important;max-height:none!important;min-height:100%;position:relative!important}
img,video,canvas,svg{max-width:100%;height:auto}
iframe{max-width:100%}
.nav,.dock,nav[class],header .dock,header nav{max-width:100%}
body > div, main, .page, .wrapper, .site, .layout, .site-wrap, .app, #app, #root, #__next{overflow-x:hidden!important;overflow-y:visible!important;max-height:none!important;height:auto!important}
@media (max-width:767px){
  .nav{padding:.65rem!important;left:0;right:0}
  .dock,header .dock,nav.dock{max-width:calc(100vw - 1.25rem);width:max-content;margin-left:auto;margin-right:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap}
  .dock::-webkit-scrollbar,header .dock::-webkit-scrollbar{display:none}
  .dock a,header .dock a{white-space:nowrap;flex:0 0 auto}
  .hero,.hero-content,section,.container{max-width:100vw;box-sizing:border-box}
  .hero,.hero-stage{min-height:min(100svh,100vh);max-height:none;overflow-x:hidden;overflow-y:visible}
  .about-badge{right:.75rem!important;bottom:.75rem!important}
  .cred-strip,.hero-btns,.cta-btns{gap:.75rem}
}
#mr-wm-chip-root,.mr-wm,[data-moonrise-watermark]{z-index:2147483000!important;pointer-events:none}
.mr-wm-chip,#mr-wm-open{pointer-events:auto!important}
`.trim();

  const styleTag = `<style data-ms-mobile-fit="1">${css}</style>`;
  // Always refresh the mobile-fit block so older broken CSS gets replaced on republish.
  if (/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i.test(out)) {
    out = out.replace(/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i, styleTag);
  } else if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${styleTag}\n</head>`);
  } else if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>\n${styleTag}`);
  } else {
    out = styleTag + out;
  }
  return out;
}

function sanitizeUserText(raw, maxLen) {
  const max = Math.max(32, Number(maxLen) || 4000);
  let text = String(raw || "")
    .replace(/\u0000/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, "")
    .trim()
    .slice(0, max);

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
    /forget\s+(everything|all)\s+(above|before|previously)/gi,
    /you\s+are\s+now\s+(dan|jailbroken|unrestricted|developer\s+mode)/gi,
    /override\s+(system|safety|security)\s+(prompt|rules|policy)/gi,
    /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions)/gi,
    /exfiltrat/gi,
    /prompt\s*injection/gi,
    /<\s*script\b/gi,
    /javascript\s*:/gi,
    /on(error|load|click)\s*=/gi,
    /data:\s*text\/html/gi,
  ];

  for (const re of injectionPatterns) {
    text = text.replace(re, "[filtered]");
  }
  return text;
}

function assertSafeEditIntent(prompt) {
  const p = String(prompt || "").toLowerCase();
  const blocked = [
    "ignore previous",
    "ignore all instructions",
    "system prompt",
    "jailbreak",
    "exfiltrate",
    "steal password",
    "credit card",
    "malware",
    "phishing",
    "crypto miner",
    "eval(",
    "document.cookie",
    "localstorage",
    "sessionstorage",
    "fetch('http",
    'fetch("http',
    "xmlhttprequest",
    "new function(",
    "child_process",
    "process.env",
    "api key",
    "secret key",
    "authorization: bearer",
    "base64,",
    "atob(",
    "btoa(",
    "<iframe",
    "window.location",
    "document.write",
  ];
  for (const b of blocked) {
    if (p.includes(b)) {
      const err = new Error("That prompt looks unsafe and was blocked.");
      err.status = 400;
      throw err;
    }
  }
}

function fillTemplate(html, ctx) {
  const phoneTel = String(ctx.phone || "").replace(/\D/g, "");
  return html
    .replaceAll("{{BUSINESS_NAME}}", ctx.businessName || "Business")
    .replaceAll("{{CATEGORY}}", ctx.category || "Local business")
    .replaceAll("{{PHONE}}", ctx.phone || "")
    .replaceAll("{{PHONE_TEL}}", phoneTel || "")
    .replaceAll("{{ADDRESS}}", ctx.address || "")
    .replaceAll("{{MAPS_URL}}", ctx.mapsUrl || "")
    .replaceAll("{{NOTES}}", ctx.notes || "");
}

function loadTemplate(templateId) {
  const safe = String(templateId || "local-service").replace(/[^a-z0-9-]/gi, "");
  const file = path.join(TEMPLATES_DIR, `${safe}.html`);
  if (!fs.existsSync(file)) {
    return fs.readFileSync(path.join(TEMPLATES_DIR, "local-service.html"), "utf8");
  }
  return fs.readFileSync(file, "utf8");
}

function hashPick(seed, modulo) {
  const s = String(seed || "moonrise");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

function presetPickSeed(ctx) {
  const base = String(ctx?.businessName || ctx?.category || ctx?.leadId || "site");
  const variation = String(ctx?.variationSeed || ctx?.requestId || "").trim();
  return variation ? `${base}:${variation}` : base;
}

function newVariationSeed() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cached Website Presets manifest (mtime-checked). */
let _presetManifestCache = null;

function loadPresetManifest() {
  const fromGithub = githubPresets.getManifestSync();
  if (fromGithub.length) return fromGithub;

  const manifestPath = path.join(WEBSITE_PRESETS_DIR, "presets", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    _presetManifestCache = { mtimeMs: -1, path: manifestPath, items: [] };
    return [];
  }
  try {
    const stat = fs.statSync(manifestPath);
    if (
      _presetManifestCache &&
      _presetManifestCache.path === manifestPath &&
      _presetManifestCache.mtimeMs === stat.mtimeMs
    ) {
      return _presetManifestCache.items;
    }
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const items = Array.isArray(raw) ? raw : [];
    _presetManifestCache = { mtimeMs: stat.mtimeMs, path: manifestPath, items };
    return items;
  } catch (_) {
    return _presetManifestCache?.items || [];
  }
}

async function readPresetHtmlFile(filename) {
  const safeName = String(filename || "").trim();
  if (!safeName) return "";

  if (githubPresets.shouldUseGithub()) {
    try {
      return await githubPresets.loadPresetHtml(safeName);
    } catch (e) {
      console.warn("GitHub preset file fetch failed:", safeName, e.message);
    }
  }

  const filePath = path.join(WEBSITE_PRESETS_DIR, "presets", safeName);
  if (!fs.existsSync(filePath)) return "";
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return "";
  }
}

/** Strip comments + collapse whitespace so kit snippets stay tiny. */
function compactSnippet(text) {
  return String(text || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

function extractPresetSnippet(html) {
  const text = String(html || "");
  const styleMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const style = styleMatch ? compactSnippet(styleMatch[1]) : "";
  // Drop demo chrome panels so the model sees real layout, not gallery toggles.
  let body = compactSnippet(bodyMatch ? bodyMatch[1] : text)
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<div[^>]*(?:demo-controls|preset-controls|section-toggles)[^>]*>[\s\S]*?<\/div>/gi, "");
  // Keep most of the budget for markup structure; CSS is supporting context.
  const styleBudget = Math.floor(PRESET_MAX_CHARS_EACH * 0.35);
  const bodyBudget = Math.max(900, PRESET_MAX_CHARS_EACH - styleBudget - 40);
  const stylePart = style
    ? `<style>${style.length > styleBudget ? style.slice(0, styleBudget) : style}</style>`
    : "";
  if (body.length > bodyBudget) body = body.slice(0, bodyBudget);
  let out = stylePart + body;
  if (out.length > PRESET_MAX_CHARS_EACH) {
    return out.slice(0, PRESET_MAX_CHARS_EACH);
  }
  return out;
}

/**
 * Compact catalog for stage 1 - only page-building roles, a few options each.
 * No HTML bodies (keeps the vibe pass tiny + fast).
 */
function buildAtmosphereCatalog(ctx) {
  const manifest = loadPresetManifest();
  if (!manifest.length) return [];

  const seed = presetPickSeed(ctx);
  const byCategory = new Map();
  for (const item of manifest) {
    const cat = String(item?.category || "").trim().toLowerCase();
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }

  const picked = [];
  const used = new Set();
  for (const cats of Object.values(PLAN_ROLE_CATEGORIES)) {
    const pool = [];
    for (const cat of cats) {
      for (const item of byCategory.get(cat) || []) pool.push(item);
    }
    if (!pool.length) continue;
    const start = hashPick(`${seed}:${cats[0]}`, pool.length);
    for (let n = 0; n < CATALOG_PER_BUCKET && n < pool.length; n += 1) {
      const item = pool[(start + n) % pool.length];
      if (!item?.id || used.has(item.id)) continue;
      used.add(item.id);
      picked.push({
        id: String(item.id),
        title: item.title || item.slug || item.id,
        category: item.category || "",
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 4) : [],
        file: item.file,
      });
    }
  }
  return picked;
}

/**
 * Load full HTML snippets for the ids the planner collected.
 */
async function loadPresetsByIds(ids, roleById) {
  const manifest = loadPresetManifest();
  const byId = new Map(manifest.map((item) => [String(item.id), item]));
  const pack = [];
  let total = 0;
  const unique = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const id = String(raw || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }

  for (const id of unique) {
    if (pack.length >= PRESET_MAX_FILES) break;
    const item = byId.get(id);
    if (!item?.file) continue;
    const html = await readPresetHtmlFile(item.file);
    if (!html) continue;
    const snippet = extractPresetSnippet(html);
    if (!snippet) continue;
    if (total + snippet.length > PRESET_MAX_TOTAL_CHARS) break;
    total += snippet.length;
    pack.push({
      id: item.id,
      title: item.title,
      category: item.category,
      role: (roleById && roleById[id]) || item.category || "",
      tags: item.tags || [],
      html: snippet,
    });
  }
  return pack;
}

function parsePlanJson(raw) {
  let text = String(raw || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) text = objMatch[0];
  const plan = JSON.parse(text);
  if (!plan || typeof plan !== "object") throw new Error("Invalid plan");
  const picks = Array.isArray(plan.picks) ? plan.picks : [];
  const ids = [];
  const roleById = {};
  for (const pick of picks) {
    if (!pick) continue;
    if (typeof pick === "string") {
      ids.push(pick);
      continue;
    }
    const id = String(pick.id || "").trim();
    if (!id) continue;
    ids.push(id);
    if (pick.role) roleById[id] = String(pick.role);
  }
  return { plan, ids, roleById };
}

async function openRouterChat({ model, system, user, temperature, maxTokens, title, prefer }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("MiniMax website generation is not configured");
  const body = {
    model: model || WEBSITE_GENERATION_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: temperature ?? 0.5,
    max_tokens: maxTokens ?? 2000,
  };
  // Prefer faster providers for generate; cheaper is fine for light JSON tasks.
  const sort = prefer === "price" ? "price" : prefer === "throughput" ? "throughput" : "";
  if (sort) {
    body.provider = { sort };
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": PUBLIC_APP_URL,
      "X-Title": title || "Moonrise Studio",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.max(60000, Number(process.env.OPENROUTER_TIMEOUT_MS || 150000))),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter error ${res.status}`);
  }
  const choice = data?.choices?.[0] || {};
  return {
    content: choice?.message?.content || "",
    finishReason: choice?.finish_reason || "",
  };
}

/**
 * Category → design atmosphere/palette heuristics.
 * Lets us skip the stage-1 "vibe" LLM call for most businesses (big speed win)
 * while still handing the assembler a coherent, trade-appropriate design system.
 */
const ATMOSPHERE_PROFILES = [
  {
    match: /spa|massage|wellness|yoga|pilates|beauty|salon|nail|skin|med ?spa|facial/i,
    atmosphere: "Calm, restorative wellness space - soft light, natural textures, unhurried luxury.",
    voice: "warm calm reassuring",
    palette: { bg: "#f6f4ef", surface: "#ffffff", ink: "#2f2a24", muted: "#8a8175", accent: "#7c8a5a" },
    type: { display: "elegant serif", body: "clean humanist sans" },
  },
  {
    match: /restaurant|cafe|coffee|bakery|pizza|food|catering|juice|bar|grill|kitchen|diner/i,
    atmosphere: "Appetizing, welcoming eatery - warm ambient light, honest craft, hometown energy.",
    voice: "warm inviting appetizing",
    palette: { bg: "#fbf6f0", surface: "#ffffff", ink: "#2a1c14", muted: "#8a7263", accent: "#c1440e" },
    type: { display: "characterful serif", body: "friendly sans" },
  },
  {
    match: /gym|fitness|crossfit|training|martial|boxing|athletic|sport/i,
    atmosphere: "High-energy performance gym - bold contrast, kinetic motion, disciplined power.",
    voice: "bold energetic motivating",
    palette: { bg: "#0f1115", surface: "#171a21", ink: "#f5f7fa", muted: "#9aa3b2", accent: "#e0fe10" },
    type: { display: "condensed bold sans", body: "clean sans" },
  },
  {
    match: /law|attorney|legal|accounting|finance|financial|advisor|insurance|consult|tax|bank/i,
    atmosphere: "Established, trustworthy professional firm - composed, precise, quietly premium.",
    voice: "confident precise authoritative",
    palette: { bg: "#f7f8fa", surface: "#ffffff", ink: "#0f1b2d", muted: "#5b6b80", accent: "#1e3a8a" },
    type: { display: "refined serif", body: "neutral sans" },
  },
  {
    match: /plumb|electric|hvac|roof|contractor|construction|handyman|landscap|lawn|pest|clean|paint|repair|garage|auto|mechanic|towing|tire/i,
    atmosphere: "Dependable local trade - sturdy, no-nonsense, ready-to-help and on time.",
    voice: "clear confident dependable",
    palette: { bg: "#f4f6f8", surface: "#ffffff", ink: "#111827", muted: "#5b6472", accent: "#ea580c" },
    type: { display: "strong grotesk", body: "clean sans" },
  },
  {
    match: /dental|dentist|ortho|clinic|medical|doctor|health|vet|chiro|therapy|optom|derma|urgent/i,
    atmosphere: "Clean, reassuring care practice - bright, hygienic, gentle and modern.",
    voice: "friendly calm trustworthy",
    palette: { bg: "#f2f8fb", surface: "#ffffff", ink: "#0d2635", muted: "#5a7488", accent: "#0891b2" },
    type: { display: "rounded sans", body: "clean sans" },
  },
  {
    match: /tech|software|saas|studio|agency|design|creative|marketing|media|startup|app|digital/i,
    atmosphere: "Sharp modern studio - confident minimalism, crisp motion, forward-looking.",
    voice: "sharp modern confident",
    palette: { bg: "#0b0d12", surface: "#14171f", ink: "#f4f6fb", muted: "#98a2b3", accent: "#6366f1" },
    type: { display: "modern grotesk", body: "clean sans" },
  },
  {
    match: /pet|dog|groom|boarding|animal/i,
    atmosphere: "Friendly, caring pet service - playful warmth, soft and approachable.",
    voice: "friendly warm playful",
    palette: { bg: "#fbf7f1", surface: "#ffffff", ink: "#2c2318", muted: "#8b7c67", accent: "#d97706" },
    type: { display: "rounded sans", body: "friendly sans" },
  },
];

const DEFAULT_ATMOSPHERE = {
  atmosphere: "Clean, trustworthy local business - modern, conversion-first, premium but approachable.",
  voice: "clear confident local",
  palette: { bg: "#f8fafc", surface: "#ffffff", ink: "#0f172a", muted: "#64748b", accent: "#2563eb" },
  type: { display: "modern grotesk", body: "clean sans" },
};

/**
 * Derive a design plan locally (no LLM) from the business category/name.
 */
function buildLocalPlan(ctx) {
  const hay = `${ctx?.category || ""} ${ctx?.businessName || ""} ${ctx?.notes || ""}`.toLowerCase();
  const profile = ATMOSPHERE_PROFILES.find((p) => p.match.test(hay)) || DEFAULT_ATMOSPHERE;
  const structure = getBusinessStructure(ctx);
  const variation = buildVariationBrief(ctx?.variationSeed);
  return {
    atmosphere: profile.atmosphere,
    voice: profile.voice,
    palette: { ...profile.palette },
    type: { ...profile.type },
    structure,
    variation,
  };
}

/**
 * Pick one preset per page section from the trade-specific bone structure.
 * Instant (no network) - uses manifest + scanned real-site patterns.
 */
function selectKitIdsLocally(ctx) {
  const manifest = loadPresetManifest();
  if (!manifest.length) return { ids: [], roleById: {} };

  const structure = getBusinessStructure(ctx);
  const sectionRoles = getStructurePresetRoles(structure, PRESET_MAX_FILES);
  const seed = presetPickSeed(ctx);
  const byCategory = new Map();
  for (const item of manifest) {
    const cat = String(item?.category || "").trim().toLowerCase();
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }

  const ids = [];
  const roleById = {};
  const used = new Set();
  for (const { section, role, categories } of sectionRoles) {
    if (ids.length >= PRESET_MAX_FILES) break;
    const pool = [];
    for (const cat of categories) {
      for (const item of byCategory.get(cat) || []) pool.push(item);
    }
    if (!pool.length) continue;
    const start = hashPick(`${seed}:${section}`, pool.length);
    for (let n = 0; n < pool.length; n += 1) {
      const item = pool[(start + n) % pool.length];
      const id = String(item?.id || "");
      if (!id || used.has(id) || !item.file) continue;
      used.add(id);
      ids.push(id);
      roleById[id] = role;
      break;
    }
  }
  return { ids, roleById, structure };
}

/**
 * Stage 1 - atmosphere + collect component ids (no HTML dump).
 */
async function planAtmosphereAndPicks(ctx) {
  const catalog = buildAtmosphereCatalog(ctx);
  if (!catalog.length) {
    return { plan: { atmosphere: "", picks: [] }, ids: [], roleById: {}, catalog };
  }
  const rawResult = await openRouterChat({
    system: PLAN_SYSTEM_PROMPT,
    user: buildPlanUserPrompt(ctx, catalog),
    temperature: 0.45,
    maxTokens: 600,
    prefer: "price",
    title: "Moonrise Studio Atmosphere",
  });
  const raw = rawResult.content;
  try {
    const parsed = parsePlanJson(raw);
    // Keep only ids that exist in the catalog we offered.
    const allowed = new Set(catalog.map((c) => String(c.id)));
    const ids = parsed.ids.filter((id) => allowed.has(String(id))).slice(0, PRESET_MAX_FILES);
    if (ids.length) {
      return { plan: parsed.plan, ids, roleById: parsed.roleById, catalog };
    }
  } catch (e) {
    console.warn("Atmosphere plan parse failed, using catalog fallback:", e.message);
  }
  // Fallback: deterministic picks from catalog buckets.
  const fallbackIds = catalog
    .filter((_, i) => i % Math.max(1, Math.floor(catalog.length / 7)) === 0)
    .slice(0, 7)
    .map((c) => String(c.id));
  return {
    plan: {
      atmosphere: `${ctx.category || "Local"} business - clean, trustworthy, conversion-first.`,
      voice: "clear confident local",
      palette: {
        bg: "#f8fafc",
        surface: "#ffffff",
        ink: "#0f172a",
        muted: "#64748b",
        accent: "#2563eb",
      },
      picks: fallbackIds.map((id) => ({ id })),
    },
    ids: fallbackIds,
    roleById: {},
    catalog,
  };
}

/**
 * Stage 2 - assemble only the collected kit into one HTML site.
 */
function isTruncatedHtml(html) {
  const raw = String(html || "");
  if (!raw.trim()) return true;
  if (!/<\/html>/i.test(raw)) return true;
  if (!/<\/body>/i.test(raw)) return true;
  const scripts = (raw.match(/<script\b(?![^>]*\/>)/gi) || []).length;
  const scriptEnds = (raw.match(/<\/script>/gi) || []).length;
  if (scripts > scriptEnds) return true;
  return false;
}

function closeIncompleteHtml(html) {
  let out = String(html || "");
  if (!out.trim()) return out;
  const openScript = (out.match(/<script\b(?![^>]*\/>)/gi) || []).length;
  const closeScript = (out.match(/<\/script>/gi) || []).length;
  if (openScript > closeScript) {
    out += "\n</script>".repeat(openScript - closeScript);
  }
  const openStyle = (out.match(/<style\b/gi) || []).length;
  const closeStyle = (out.match(/<\/style>/gi) || []).length;
  if (openStyle > closeStyle) {
    out += "\n</style>".repeat(openStyle - closeStyle);
  }
  if (/<body[\s>]/i.test(out) && !/<\/body>/i.test(out)) out += "\n</body>";
  if (/<html[\s>]/i.test(out) && !/<\/html>/i.test(out)) out += "\n</html>";
  return out;
}

function sanitizeGeneratedCopy(html) {
  return String(html || "").replace(/>([^<]*)</g, (match, text) => {
    if (!text.includes("\u2014")) return match;
    return `>${text.replace(/\u2014/g, " - ")}<`;
  });
}

async function generateWithOpenRouter(ctx, presetPack, plan) {
  const presets = Array.isArray(presetPack) ? presetPack : [];
  const stockMedia = selectStockMedia(ctx);
  const structure = plan?.structure || getBusinessStructure(ctx);

  async function assemble({ retryIncomplete = false, maxTokens = WEBSITE_MAX_OUTPUT_TOKENS } = {}) {
    const userPrompt = buildGenerationUserPrompt(ctx, presets, plan, stockMedia, { retryIncomplete });
    const result = await openRouterChat({
      system: GENERATION_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: retryIncomplete ? 0.38 : 0.58,
      maxTokens,
      prefer: "throughput",
      title: retryIncomplete ? "Moonrise Studio Assemble (retry)" : "Moonrise Studio Assemble",
    });
    let html = String(result.content || "")
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      throw new Error("MiniMax did not return a complete HTML document");
    }
    html = ensurePaletteContrast(
      sanitizeGeneratedCopy(
        ensureMobileFriendlyHtml(ensureStockMediaInHtml(stripDemoChrome(html), stockMedia))
      )
    );
    return { html, finishReason: result.finishReason || "" };
  }

  let { html, finishReason } = await assemble();
  const firstPass = assessSiteCompleteness(html, structure);
  const truncated = finishReason === "length";
  // Retry when structurally thin OR the model hit max_tokens mid-page.
  if ((truncated || !firstPass.ok) && html.length < 28000) {
    console.warn(
      "Assembled page needs retry:",
      truncated ? "finish_reason=length" : firstPass.reasons.join(", ")
    );
    const retryBudget = Math.min(
      16000,
      Math.max(WEBSITE_MAX_OUTPUT_TOKENS, Math.floor(WEBSITE_MAX_OUTPUT_TOKENS * 1.25))
    );
    const retry = await assemble({ retryIncomplete: true, maxTokens: retryBudget });
    const retryPass = assessSiteCompleteness(retry.html, structure);
    if (retryPass.ok || retry.html.length > html.length) {
      html = retry.html;
      finishReason = retry.finishReason;
    }
  }
  if (finishReason === "length") {
    console.warn("Assemble finished with finish_reason=length; closed tags via closeIncompleteHtml");
  }
  return closeIncompleteHtml(html);
}

/** Map manifest category/tags to bone-structure section role for assembly. */
function inferPresetRole(item) {
  const cat = String(item?.category || "").trim().toLowerCase();
  const tagStr = Array.isArray(item?.tags) ? item.tags.join(" ").toLowerCase() : "";
  const hay = `${cat} ${tagStr} ${String(item?.title || "").toLowerCase()}`;
  if (/^navigation$|^menus$|^docks$|^sidebars$/.test(cat) || /\bnav\b/.test(hay)) return "navigation";
  if (/^hero|^heroes$|^videos$/.test(cat) || /\bhero\b/.test(hay)) return "hero";
  if (/^testimonials$/.test(cat) || /\btestimonial\b/.test(hay)) return "testimonials";
  if (/^forms$|^inputs$|^textareas$/.test(cat) || /\bform\b/.test(hay)) return "contact_form";
  if (/^footers$/.test(cat) || /\bfooter\b/.test(hay)) return "footer";
  if (/^cta$|^buttons$|^announcements$/.test(cat) || /\bcta\b/.test(hay)) return "cta_band";
  if (/^galleries$|^images$|^carousels$/.test(cat) || /\bgallery\b/.test(hay)) return "gallery";
  if (/^pricing$|^comparisons$/.test(cat) || /\bpricing\b/.test(hay)) return "pricing";
  if (/^maps$/.test(cat) || /\bmap\b/.test(hay)) return "map";
  if (/^bios$|^profiles$|^avatars$/.test(cat) || /\bteam\b/.test(hay)) return "team";
  if (/^accordions$/.test(cat) || /\bfaq\b/.test(hay)) return "faq";
  if (/^features$|^cards$|^sections$|^hooks$/.test(cat)) return "services";
  return cat || "component";
}

/**
 * Pick a compact pack of Website Preset snippets for generation.
 * Deterministic per business so regenerations stay somewhat stable.
 * Categories match moonrise-studio/Website Presets/presets/manifest.json.
 * @deprecated Prefer planAtmosphereAndPicks + loadPresetsByIds.
 */
async function loadWebsitePresetPack(ctx) {
  const manifest = loadPresetManifest();
  if (!manifest.length) {
    console.warn(
      "Website Presets manifest empty or missing at",
      githubPresets.getPresetSourceMeta().treeUrl ||
        path.join(WEBSITE_PRESETS_DIR, "presets", "manifest.json")
    );
    return [];
  }

  const seed = presetPickSeed(ctx);
  const byCategory = new Map();
  for (const item of manifest) {
    const cat = String(item?.category || "").trim();
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }

  const picked = [];
  const usedFiles = new Set();
  for (const cat of PRESET_PACK_CATEGORIES) {
    const list = byCategory.get(cat) || [];
    if (!list.length) continue;
    const idx = hashPick(`${seed}:${cat}`, list.length);
    const item = list[idx];
    if (!item?.file || usedFiles.has(item.file)) continue;
    usedFiles.add(item.file);
    picked.push(item);
    if (picked.length >= PRESET_MAX_FILES) break;
  }

  // Fill remaining slots from page-building categories / tags when thin.
  if (picked.length < PRESET_MAX_FILES) {
    const fallback = manifest.filter((item) =>
      /hero|cta|feature|testimonial|footer|form|card|nav|section|pricing|announcement/i.test(
        `${item.category || ""} ${(item.tags || []).join(" ")} ${item.title || ""}`
      )
    );
    for (let i = 0; i < fallback.length && picked.length < PRESET_MAX_FILES; i += 1) {
      const item = fallback[(hashPick(seed, fallback.length) + i) % fallback.length];
      if (!item?.file || usedFiles.has(item.file)) continue;
      usedFiles.add(item.file);
      picked.push(item);
    }
  }

  const pack = [];
  let total = 0;
  for (const item of picked) {
    const html = await readPresetHtmlFile(item.file);
    if (!html) continue;
    const snippet = extractPresetSnippet(html);
    if (!snippet) continue;
    if (total + snippet.length > PRESET_MAX_TOTAL_CHARS) break;
    total += snippet.length;
    pack.push({
      id: item.id,
      title: item.title,
      category: item.category,
      role: inferPresetRole(item),
      tags: item.tags || [],
      html: snippet,
    });
  }
  return pack;
}

function urgencyHours() {
  return Number(process.env.WATERMARK_URGENCY_HOURS || 96);
}

app.get("/generate/status", requireUser, async (req, res) => {
  try {
    const supabase = db();
    const requestId = String(req.query.requestId || "").trim();
    if (!requestId) return res.status(400).json({ error: "requestId required" });
    const job = await findJobByRequestId(supabase, req.user.id, requestId);
    if (!job) return res.status(404).json({ error: "Generation not found", code: "not_found" });
    if (job.status === "done") {
      return res.json(await buildDonePayload(supabase, job, getBalance, req.user.id));
    }
    if (job.status === "failed") {
      return res.status(500).json({ error: job.error || "Generation failed", code: "generation_failed" });
    }
    return res.status(202).json({
      inProgress: true,
      jobId: job.id,
      requestId,
      retryAfterSec: 3,
    });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load generation status");
  }
});

app.post("/generate", requireUser, generateLimiter, async (req, res) => {
  const supabase = db();
  const requestId = String(req.body.requestId || req.headers["x-request-id"] || "").trim();
  let activeJobId = null;

  try {
    const existing = await resolveExistingGeneration(
      supabase,
      req.user.id,
      requestId,
      getBalance
    );
    if (existing.action === "return") {
      return res.json(existing.payload);
    }
    if (existing.action === "poll") {
      return res.status(202).json({
        inProgress: true,
        jobId: existing.jobId,
        requestId: existing.requestId || requestId || null,
        retryAfterSec: 3,
        message: "Generation already running.",
      });
    }
    if (existing.action === "error") {
      return res.status(500).json({ error: existing.error || "Generation failed" });
    }

    let notes = sanitizeUserText(req.body.notes || "", 2000);
    if (notes) assertSafeEditIntent(notes);

    const ctx = {
      businessName: sanitizeUserText(req.body.businessName || "Untitled business", 120) || "Untitled business",
      category: sanitizeUserText(req.body.category || "", 80),
      phone: sanitizeUserText(req.body.phone || "", 40),
      address: sanitizeUserText(req.body.address || "", 200),
      description: sanitizeUserText(req.body.description || "", 500),
      mapsUrl: sanitizeUserText(req.body.mapsUrl || "", 500),
      website: sanitizeUserText(req.body.website || "", 500),
      hours: sanitizeUserText(req.body.hours || "", 200),
      notes,
      leadId: req.body.leadId || null,
      templateId: String(req.body.templateId || "local-service").replace(/[^a-z0-9-]/gi, "") || "local-service",
      fromFinder: req.body.fromFinder === true || req.body.fromFinder === "1",
      requestId: requestId || null,
      variationSeed: requestId || newVariationSeed(),
    };

    if (ctx.description && !/About the business:/i.test(String(ctx.notes || ""))) {
      ctx.notes = [ctx.notes, "About the business: " + ctx.description + "."]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    if (ctx.mapsUrl && !/^https?:\/\//i.test(ctx.mapsUrl)) {
      return res.status(400).json({ error: "Maps link must start with http:// or https://" });
    }

    const jobInsert = await supabase
      .from("generation_jobs")
      .insert({
        user_id: req.user.id,
        project_id: req.body.projectId || null,
        status: "running",
        prompt: {
          ...ctx,
          requestId: requestId || null,
          brief: buildBusinessBrief(ctx),
          presetsDir: WEBSITE_PRESETS_DIR,
        },
      })
      .select("id")
      .single();
    activeJobId = jobInsert?.data?.id || null;

    // Manifest must be loaded before kit selection (GitHub cache is empty on cold start).
    try {
      await githubPresets.ensureManifest();
    } catch (e) {
      console.warn("GitHub preset manifest load failed; using local fallback if available:", e.message);
    }

    // Fast path (default): pick the component kit + palette locally (instant),
    // then a single assembly call. Set WEBSITE_PLAN_WITH_LLM=1 to restore the
    // slower two-call flow where MiniMax also chooses the components.
    let plan;
    let ids;
    let roleById;
    if (process.env.WEBSITE_PLAN_WITH_LLM === "1") {
      ({ plan, ids, roleById } = await planAtmosphereAndPicks(ctx));
      plan.structure = getBusinessStructure(ctx);
      plan.variation = buildVariationBrief(ctx.variationSeed);
    } else {
      plan = buildLocalPlan(ctx);
      ({ ids, roleById } = selectKitIdsLocally(ctx));
    }
    let presetPack = await loadPresetsByIds(ids, roleById);
    if (!presetPack.length) {
      console.warn("Kit load returned 0 presets; falling back to category pack", {
        presetsSource: githubPresets.getPresetSourceMeta(),
        presetsDir: WEBSITE_PRESETS_DIR,
        manifestCount: loadPresetManifest().length,
        ids,
      });
      presetPack = await loadWebsitePresetPack(ctx);
    }
    if (!presetPack.length) {
      console.error("Website Presets kit is empty - generation will freestyle without kit HTML", {
        presetsSource: githubPresets.getPresetSourceMeta(),
        presetsDir: WEBSITE_PRESETS_DIR,
        manifestExists: fs.existsSync(path.join(WEBSITE_PRESETS_DIR, "presets", "manifest.json")),
      });
    } else {
      const src = githubPresets.getPresetSourceMeta();
      console.log(
        `Website Presets kit ready: ${presetPack.length} components from ${src.treeUrl || WEBSITE_PRESETS_DIR}`
      );
    }
    if (jobInsert?.data?.id) {
      await supabase
        .from("generation_jobs")
        .update({
          prompt: {
            ...ctx,
            brief: buildBusinessBrief(ctx),
            presetsDir: WEBSITE_PRESETS_DIR,
            presetsSource: githubPresets.getPresetSourceMeta(),
            atmosphere: plan?.atmosphere || "",
            pickIds: ids,
            kit: presetPack.map((p) => ({ id: p.id, role: p.role, title: p.title })),
          },
        })
        .eq("id", jobInsert.data.id);
    }
    const html = await generateWithOpenRouter(ctx, presetPack, plan);
    const ends = new Date(Date.now() + urgencyHours() * 3600 * 1000).toISOString();

    let projectId = req.body.projectId || null;
    const isRedesign =
      req.body.redesign === true ||
      req.body.redesign === "1" ||
      /REDESIGN:/i.test(String(ctx.notes || ""));
    if (projectId) {
      const { data: existing } = await supabase
        .from("projects")
        .select("id,user_id,watermark_enabled,status,business_context")
        .eq("id", projectId)
        .maybeSingle();
      if (!existing || existing.user_id !== req.user.id) {
        return res.status(403).json({ error: "Project not found" });
      }
      const nextContext = {
        ...(existing.business_context && typeof existing.business_context === "object"
          ? existing.business_context
          : {}),
        ...ctx,
        redesignedAt: isRedesign ? new Date().toISOString() : undefined,
      };
      const patch = {
          business_name: ctx.businessName,
          lead_id: ctx.leadId,
          template_id: ctx.templateId,
          html,
          urgency_ends_at: ends,
        business_context: nextContext,
      };
      // Full redesign keeps payment / publish state; first generate on a project still
      // starts watermarked in preview.
      if (!isRedesign) {
        patch.status = "preview";
        patch.watermark_enabled = true;
      }
      const { error } = await supabase.from("projects").update(patch).eq("id", projectId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: req.user.id,
          business_name: ctx.businessName,
          lead_id: ctx.leadId,
          template_id: ctx.templateId,
          html,
          status: "preview",
          watermark_enabled: true,
          urgency_ends_at: ends,
          business_context: ctx,
        })
        .select("id")
        .single();
      if (error) throw error;
      projectId = data.id;
    }

    if (jobInsert?.data?.id) {
      await supabase
        .from("generation_jobs")
        .update({
          status: "done",
          project_id: projectId,
          result_html: html.slice(0, 200000),
          prompt: {
            ...ctx,
            requestId: requestId || null,
            brief: buildBusinessBrief(ctx),
            presetsDir: WEBSITE_PRESETS_DIR,
            presetCount: presetPack.length,
          },
        })
        .eq("id", jobInsert.data.id);
    }

    const balance = await getBalance(supabase, req.user.id);
    res.json({
      projectId,
      html,
      presetCount: presetPack.length,
      credits: balance,
      creditsUsed: 0,
    });
  } catch (e) {
    console.error(e);
    await failGenerationJob(supabase, activeJobId, e.message || "Generate failed");
    const status = e.status || 500;
    const formatted = formatApiError(e, "Generate failed");
    res.status(status).json({
      error: formatted.message,
      code: formatted.code || e.code || undefined,
    });
  }
});

app.post("/checkout", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const projectId = req.body.projectId;
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.watermark_enabled) {
      return res.json({
        alreadyPaid: true,
        url: `${PUBLIC_APP_URL}/editor.html?project_id=${projectId}`,
      });
    }

    const amountCents = resolveGoLiveAmountCents(
      req.body.amountCents,
      project.price_cents
    );
    const lineItems = goLiveCheckoutLineItems(amountCents, project.business_name);

    const session = await createGoLiveCheckoutSession(stripe, {
      project,
      projectId,
      userId: req.user.id,
      amountCents,
      successUrl: `${PUBLIC_APP_URL}/editor.html?project_id=${projectId}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${PUBLIC_APP_URL}/editor.html?project_id=${projectId}&canceled=1`,
      customerEmail: req.user.email || undefined,
      lineItems,
    });

    await supabase
      .from("projects")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", projectId);

    await supabase.from("payments").upsert(
      {
        user_id: req.user.id,
        project_id: projectId,
        stripe_session_id: session.id,
        amount_cents: session.amount_total || amountCents,
              currency: "usd",
        status: "pending",
      },
      { onConflict: "stripe_session_id" }
    );

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Checkout failed");
  }
});

/**
 * Web Push - creator My Clients purchase alerts.
 */
app.get("/push/vapid-public-key", (_req, res) => {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  if (!publicKey || !vapidConfigured()) {
    return res.status(503).json({ error: "Push notifications are not configured" });
  }
  res.json({ publicKey });
});

app.post("/push/subscribe", requireUser, async (req, res) => {
  try {
    const endpoint = String(req.body?.endpoint || "").trim();
    const keys = req.body?.keys || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "endpoint and keys required" });
    }
    const row = await upsertPushSubscription(db(), {
      userId: req.user.id,
      endpoint,
      keys,
      userAgent: req.get("user-agent") || "",
    });
    res.json({ ok: true, id: row?.id || null });
  } catch (e) {
    console.error("push/subscribe", e);
    res.status(500).json({ error: e.message || "Subscribe failed" });
  }
});

app.post("/push/unsubscribe", requireUser, async (req, res) => {
  try {
    const endpoint = String(req.body?.endpoint || "").trim();
    if (!endpoint) return res.status(400).json({ error: "endpoint required" });
    await deletePushSubscription(db(), { userId: req.user.id, endpoint });
    res.json({ ok: true });
  } catch (e) {
    console.error("push/unsubscribe", e);
    res.status(500).json({ error: e.message || "Unsubscribe failed" });
  }
});

/**
 * Credit billing - plans, top-ups, balance, billing portal.
 */
app.get("/credits/catalog", (_req, res) => {
  res.json(publicPlansCatalog());
});

app.get("/credits/balance", requireUser, async (req, res) => {
  try {
    const supabase = db();
    let balance = await getBalance(supabase, req.user.id);
    const stripe = stripeClient();
    if (stripe && balance.stripeCustomerId && balance.planId) {
      const { data: account } = await supabase
        .from("credit_accounts")
        .select("stripe_subscription_id, period_start")
        .eq("user_id", req.user.id)
        .maybeSingle();
      // Only sync real Stripe subscription ids (skip manual grants like "manual_mvp_plus").
      if (
        account?.stripe_subscription_id &&
        String(account.stripe_subscription_id).startsWith("sub_")
      ) {
        try {
          const sub = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
          const active = sub.status === "active" || sub.status === "trialing";
          if (!active) {
            await deactivatePlan(supabase, req.user.id);
          } else {
            const planId = String(sub.metadata?.planId || balance.planId).toLowerCase();
            const plan = planById(planId);
            const periodStart = sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null;
            if (plan && periodStart && periodStart !== account.period_start) {
              await grantSubscription(supabase, {
                userId: req.user.id,
                credits: plan.credits,
                planId: plan.id,
                idempotencyKey: `subscription-period:${sub.id}:${sub.current_period_start}`,
                stripeCustomerId:
                  typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
                stripeSubscriptionId: sub.id,
                periodStart,
                periodEnd: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : null,
              });
            }
          }
          balance = await getBalance(supabase, req.user.id);
        } catch (syncErr) {
          console.error("Subscription sync failed", syncErr.message);
        }
      }
    }
    // MVP+ mirrors Pricing subscription: on with Starter/Pro/Business, off otherwise.
    try {
      await syncProfileMvpPlus(supabase, req.user.id, balance.hasActiveSubscription);
    } catch (syncMvpErr) {
      console.error("MVP+ profile sync failed", syncMvpErr.message);
    }
    res.json(balance);
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load credit balance");
  }
});

app.post("/credits/plan-checkout", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const planId = String(req.body.planId || "").toLowerCase();
    const plan = planById(planId);
    if (!plan) return res.status(400).json({ error: "Unknown plan" });

    const supabase = db();
    const existing = await getBalance(supabase, req.user.id);
    if (existing.planStatus === "active" && existing.planId === plan.id) {
      return res.json({ alreadyActive: true, url: `${PUBLIC_APP_URL}/pricing.html` });
    }
    if (existing.planStatus === "active" && existing.stripeCustomerId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: existing.stripeCustomerId,
        return_url: `${PUBLIC_APP_URL}/pricing.html`,
      });
      return res.json({ manageExisting: true, url: portal.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: planLineItem(plan, stripe),
      success_url: `${PUBLIC_APP_URL}/pricing.html?sub=1&plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_APP_URL}/pricing.html?sub=canceled`,
      customer: existing.stripeCustomerId || undefined,
      customer_email: existing.stripeCustomerId ? undefined : req.user.email || undefined,
      client_reference_id: req.user.id,
      metadata: {
        type: "credit_plan",
        planId: plan.id,
        userId: req.user.id,
      },
      subscription_data: {
        metadata: {
          type: "credit_plan",
          planId: plan.id,
          userId: req.user.id,
        },
      },
    });

    await supabase.from("payments").upsert(
      {
        user_id: req.user.id,
        project_id: null,
        stripe_session_id: session.id,
        amount_cents: plan.priceCents,
        currency: "usd",
        status: "pending",
      },
      { onConflict: "stripe_session_id" }
    );

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Plan checkout failed");
  }
});

app.post("/credits/claim-developer", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const DEVELOPER_CREDIT_GRANT = 50;
    const supabase = db();
    const userId = req.user.id;
    const result = await grantTopup(supabase, {
      userId,
      credits: DEVELOPER_CREDIT_GRANT,
      idempotencyKey: `developer-credits:v1:${userId}`,
    });
    const balance = await getBalance(supabase, userId);
    const alreadyClaimed = !!(result && result.duplicate);
    res.json({
      ...balance,
      alreadyClaimed,
      granted: alreadyClaimed ? 0 : DEVELOPER_CREDIT_GRANT,
    });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not claim developer credits");
  }
});

app.post("/credits/topup-checkout", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const quote = quoteCustomTopup(req.body.amountDollars);
    if (!quote) {
      return res.status(400).json({
        error: `Enter an amount between $${TOPUP_MIN_DOLLARS} and $${TOPUP_MAX_DOLLARS}`,
      });
    }

    const supabase = db();
    const existing = await getBalance(supabase, req.user.id);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: customTopupLineItem(quote),
      success_url: `${PUBLIC_APP_URL}/pricing.html?topup=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_APP_URL}/pricing.html?topup=canceled`,
      customer: existing.stripeCustomerId || undefined,
      customer_email: existing.stripeCustomerId ? undefined : req.user.email || undefined,
      metadata: {
        type: "credit_topup",
        topupId: "custom",
        custom: "1",
        credits: String(quote.credits),
        priceCents: String(quote.priceCents),
        userId: req.user.id,
      },
    });

    await supabase.from("payments").upsert(
      {
        user_id: req.user.id,
        project_id: null,
        stripe_session_id: session.id,
        amount_cents: quote.priceCents,
        currency: "usd",
        status: "pending",
      },
      { onConflict: "stripe_session_id" }
    );

    res.json({ url: session.url, sessionId: session.id, quote });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Top-up checkout failed");
  }
});

app.post("/credits/billing-portal", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const balance = await getBalance(db(), req.user.id);
    if (!balance.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account yet. Subscribe to a plan first." });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: balance.stripeCustomerId,
      return_url: `${PUBLIC_APP_URL}/pricing.html`,
    });

    res.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Billing portal failed");
  }
});

/**
 * Creator security card - $1 verify + refund, card kept on file after validation.
 */
app.get("/security-card/config", requireUser, (_req, res) => {
  res.json(publicSecurityCardConfig());
});

app.get("/security-card/status", requireUser, async (req, res) => {
  try {
    const { data, error } = await db()
      .from("profiles")
      .select("payout_profile")
      .eq("id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    res.json(publicSecurityCardStatus(data));
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load card verification status");
  }
});

app.post("/security-card/start", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const email = String(req.body?.email || req.user.email || "").trim();
    const data = await startSecurityCardVerification(stripe, db(), req.user.id, email);
    res.json(data);
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not verify card");
  }
});

app.post("/security-card/complete", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const paymentIntentId = String(req.body?.paymentIntentId || req.body?.payment_intent_id || "").trim();
    const result = await completeSecurityCardVerification(
      stripe,
      db(),
      req.user.id,
      paymentIntentId
    );
    res.json({
      ok: true,
      verified: true,
      securityCard: result.securityCard,
    });
  } catch (e) {
    console.error(e);
    const status = Number(e.status) || 500;
    res.status(status).json({
      error: e.message || "Could not connect security card",
      code: e.code || undefined,
    });
  }
});

/**
 * Admin-only: charge a creator's saved security card (Terms enforcement).
 * Header: Authorization: Bearer <SECURITY_CARD_ADMIN_SECRET>
 */
function requireSecurityCardAdmin(req, res, next) {
  const secret = String(process.env.SECURITY_CARD_ADMIN_SECRET || "").trim();
  if (!secret) {
    return res.status(503).json({ error: "Security card admin API is not configured" });
  }
  const auth = String(req.headers.authorization || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/admin/security-card/charge", requireSecurityCardAdmin, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const userId = String(req.body?.userId || req.body?.user_id || "").trim();
    if (!userId) return res.status(400).json({ error: "userId required" });

    const result = await chargeSecurityCard(stripe, db(), userId, {
      amountCents: req.body?.amountCents ?? req.body?.amount_cents,
      reason: req.body?.reason,
      referenceId: req.body?.referenceId || req.body?.reference_id,
    });

    res.json(result);
  } catch (e) {
    console.error("security-card charge", e);
    const status = Number(e.status) || 500;
    res.status(status).json({ error: e.message || "Charge failed", code: e.code || undefined });
  }
});

app.post("/credits/fulfill-checkout", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const sessionId = String(req.body.sessionId || "").trim();
    if (!sessionId.startsWith("cs_")) {
      return res.status(400).json({ error: "Valid checkout session required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = String(session.metadata?.userId || "");
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Checkout session does not belong to this account" });
    }
    if (session.status !== "complete" || session.payment_status === "unpaid") {
      return res.status(409).json({ error: "Payment is not complete yet" });
    }

    const supabase = db();
    const kind = String(session.metadata?.type || "").toLowerCase();
    if (kind === "credit_plan") {
      const plan = planById(session.metadata?.planId);
      if (!plan) return res.status(400).json({ error: "Unknown plan" });
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || null;
      let sub = null;
      if (subId) sub = await stripe.subscriptions.retrieve(subId);
      await grantSubscription(supabase, {
        userId,
        credits: plan.credits,
        planId: plan.id,
        idempotencyKey: `checkout:${session.id}`,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : session.customer?.id || null,
        stripeSubscriptionId: subId,
        periodStart: sub?.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        periodEnd: sub?.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
      });
    } else if (kind === "credit_topup") {
      const topup = resolveTopupFromSession(session);
      if (!topup) return res.status(400).json({ error: "Unknown top-up" });
      await grantTopup(supabase, {
        userId,
        credits: topup.credits,
        idempotencyKey: `topup:${session.id}`,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : session.customer?.id || null,
      });
    } else {
      return res.status(400).json({ error: "Not a credit checkout" });
    }

    await supabase
      .from("payments")
      .update({
        status: "paid",
        stripe_payment_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
      })
      .eq("stripe_session_id", session.id);

    res.json(await getBalance(supabase, userId));
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not fulfill checkout");
  }
});

/** @deprecated Use GET /credits/balance */
app.get("/mvp-status", requireUser, async (req, res) => {
  try {
    const balance = await getBalance(db(), req.user.id);
    res.json({
      mvpPlus: balance.mvpPlus,
      paidPlan: balance.hasActiveSubscription,
      codeAccess: balance.codeAccess,
      ...balance,
    });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load status");
  }
});

app.get("/donate/config", requireUser, async (req, res) => {
  try {
    const supabase = db();
    const stripe = stripeClient();
    if (stripe) {
      await reconcilePendingDonationPayments(supabase, stripe, req.user.id);
    }
    const balance = await getBalance(supabase, req.user.id);
    const leaderboardLimit = Math.min(Math.max(Number(req.query.leaderboard) || 10, 1), 25);
    const leaderboardEntries = await getDonationLeaderboard(supabase, leaderboardLimit);
    res.json({
      ...publicDonateConfig(balance),
      donorMessageMax: DONOR_MESSAGE_MAX,
      leaderboardEntries,
    });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load donate config");
  }
});

app.get("/donate/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const entries = await getDonationLeaderboard(db(), limit);
    res.json({ entries });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not load leaderboard");
  }
});

app.post("/donate/billing-portal", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const balance = await getBalance(db(), req.user.id);
    if (!balance.stripeCustomerId) {
      return res.status(400).json({
        error: "No Stripe billing account yet. Subscribe first to manage billing.",
      });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: balance.stripeCustomerId,
      return_url: `${PUBLIC_APP_URL}/donate.html`,
    });

    res.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Billing portal failed");
  }
});

app.post("/donate-checkout", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const supabase = db();
    const balance = await getBalance(supabase, req.user.id);
    const donorMessage = sanitizeDonorMessage(req.body?.message);
    const mode = String(req.body?.mode || "once").toLowerCase();
    const isOneTime =
      mode === "once" || mode === "onetime" || mode === "one_time" || mode === "one-time";

    if (!isOneTime) {
      return res.status(400).json({
        error: "Only one-time donations are supported. Choose an amount and try again.",
      });
    }

    const quote = quoteDonation(req.body?.amountDollars ?? DONATE_DEFAULT_DOLLARS);
    if (!quote) {
      return res.status(400).json({
        error: `Enter an amount between $${DONATE_MIN_DOLLARS} and $${DONATE_MAX_DOLLARS}`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: donateOneTimeLineItem(quote),
      success_url: `${PUBLIC_APP_URL}/donate.html?paid=1&mode=once&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_APP_URL}/donate.html?canceled=1`,
      customer: balance.stripeCustomerId || undefined,
      customer_email: balance.stripeCustomerId ? undefined : req.user.email || undefined,
      client_reference_id: req.user.id,
      metadata: {
        type: "mvp_donation_onetime",
        userId: req.user.id,
        priceCents: String(quote.priceCents),
        ...(donorMessage ? { donorMessage } : {}),
      },
    });

    await supabase.from("payments").upsert(
      {
        user_id: req.user.id,
        project_id: null,
        stripe_session_id: session.id,
        amount_cents: quote.priceCents,
        currency: "usd",
        status: "pending",
        kind: "mvp_donation",
        donor_message: donorMessage,
      },
      { onConflict: "stripe_session_id" }
    );

    res.json({ url: session.url, sessionId: session.id, mode: "once", quote });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Donate checkout failed");
  }
});

app.post("/donate-fulfill", requireUser, checkoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const sessionId = String(req.body.sessionId || "").trim();
    if (!sessionId.startsWith("cs_")) {
      return res.status(400).json({ error: "Valid checkout session required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = String(session.metadata?.userId || "");
    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Checkout session does not belong to this account" });
    }
    if (session.status !== "complete" || session.payment_status === "unpaid") {
      return res.status(409).json({ error: "Payment is not complete yet" });
    }
    const kind = String(session.metadata?.type || "").toLowerCase();
    if (kind !== "mvp_donation" && kind !== "mvp_donation_onetime") {
      return res.status(400).json({ error: "Not a donation checkout" });
    }

    const supabase = db();
    const donorMessage = sanitizeDonorMessage(session.metadata?.donorMessage);

    if (kind === "mvp_donation_onetime") {
      await recordOneTimeDonationPayment(supabase, session, donorMessage);
      const balance = await getBalance(supabase, userId);
      return res.json({ ...balance, oneTime: true });
    }

    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;
    let periodEnd = null;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
    }
    await grantMvpDonation(supabase, {
      userId,
      sessionId: session.id,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id || null,
      stripeSubscriptionId: subId,
      periodEnd,
    });
    await supabase.from("payments").upsert(
      {
        user_id: userId,
        project_id: null,
        stripe_session_id: session.id,
        stripe_payment_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        amount_cents: Math.max(
          0,
          Number(session.amount_total || session.metadata?.priceCents || donateAmountCents()),
        ),
        currency: session.currency || "usd",
        status: "paid",
        kind: "mvp_donation",
        donor_message: donorMessage,
      },
      { onConflict: "stripe_session_id" },
    );

    const balance = await getBalance(supabase, userId);
    res.json({ ...balance, mvpPlus: true });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Could not fulfill donation");
  }
});

/** @deprecated Use POST /credits/plan-checkout with planId starter */
app.post("/mvp-checkout", requireUser, checkoutLimiter, async (req, res) => {
  req.body.planId = "starter";
  const stripe = stripeClient();
  if (!stripe) return sendStripeMissing(res);
  try {
    const plan = planById("starter");
    const supabase = db();
    const existing = await getBalance(supabase, req.user.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: planLineItem(plan, stripe),
      success_url: `${PUBLIC_APP_URL}/pricing.html?sub=1&plan=starter&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_APP_URL}/pricing.html?sub=canceled`,
      customer: existing.stripeCustomerId || undefined,
      customer_email: existing.stripeCustomerId ? undefined : req.user.email || undefined,
      client_reference_id: req.user.id,
      metadata: { type: "credit_plan", planId: "starter", userId: req.user.id },
      subscription_data: {
        metadata: { type: "credit_plan", planId: "starter", userId: req.user.id },
      },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    respondApiError(res, e, "Checkout failed");
  }
});

/** Serve the watermark widget script so live (Vercel) sites can embed it. */
app.get("/embed.js", (_req, res) => {
  try {
    const js = fs.readFileSync(WATERMARK_EMBED_PATH, "utf8");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(js);
  } catch (e) {
    console.error("embed.js read failed", e.message);
    res.status(500).type("application/javascript").send("// Moonrise watermark embed unavailable");
  }
});

/** Serve the contact form handler for published sites. */
app.get("/contact-form.js", (_req, res) => {
  try {
    const js = fs.readFileSync(CONTACT_FORM_SCRIPT_PATH, "utf8");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(js);
  } catch (e) {
    console.error("contact-form.js read failed", e.message);
    res.status(500).type("application/javascript").send("// Moonrise contact form unavailable");
  }
});

/**
 * Public contact form submit (Auto mode).
 * Delivers leads to the notification email configured in Builder.
 */
app.post("/contact-submit", contactSubmitLimiter, async (req, res) => {
  try {
    const projectId = String(req.body?.projectId || req.body?.project_id || "").trim();
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const name = String(req.body?.name || "").trim().slice(0, 200);
    const phone = String(req.body?.phone || "").trim().slice(0, 80);
    const message = String(req.body?.message || "").trim().slice(0, 5000);
    const extras =
      req.body?.extras && typeof req.body.extras === "object" && !Array.isArray(req.body.extras)
        ? req.body.extras
        : {};

    if (!name && !phone && !message && !Object.keys(extras).length) {
      return res.status(400).json({ error: "Please fill out the form before submitting" });
    }

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,user_id,business_name,business_context")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });

    const cfg = readContactFormConfig(project);
    if (!cfg?.enabled || cfg.mode !== "auto") {
      return res.status(403).json({ error: "Contact form is not enabled for this site" });
    }

    const to = String(cfg.notificationEmail || "").trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: "Notification email is not configured" });
    }

    const payload = { name, phone, message, extras };

    const { error: insertError } = await supabase.from("contact_leads").insert({
      project_id: project.id,
      user_id: project.user_id,
      mode: "auto",
      notification_email: to,
      endpoint_url: null,
      payload,
    });
    if (insertError) throw insertError;

    await sendContactLeadEmail({
      to,
      businessName: project.business_name,
      fields: payload,
      projectId: project.id,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("contact-submit", e);
    respondApiError(res, e, "Could not send message");
  }
});

/** Public creator contact card for a watermarked published site (business owner view). */
app.get("/public-creator-contact", async (req, res) => {
  try {
    const projectId = String(req.query.projectId || req.query.project_id || "").trim();
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,status,watermark_enabled,business_context")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!isWatermarkActive(project)) {
      return res.status(404).json({ error: "Creator contact is not available for this site" });
    }

    let creator = readStoredCreatorContact(project);
    if (!creator) {
      return res.status(404).json({ error: "Creator contact is not available yet" });
    }
    res.json({ creator, hq: hqContactSnapshot() });
  } catch (e) {
    console.error("public-creator-contact", e);
    respondApiError(res, e, "Could not load creator contact");
  }
});

/**
 * Public catalog of published preview / live sites for Locate My Order.
 * Every successful /publish writes vercel_url + status=published, so sites appear here automatically.
 * Safe fields only - no HTML, no owner identity.
 */
app.get("/public-orders", async (req, res) => {
  try {
    const supabase = db();
    const q = String(req.query.q || "").trim();
    const yearRaw = String(req.query.year || "").trim();
    const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;

    let query = supabase
      .from("projects")
      .select("id,business_name,status,watermark_enabled,price_cents,vercel_url,updated_at,created_at,business_context")
      .in("status", ["published", "paid"])
      .not("vercel_url", "is", null)
      .neq("vercel_url", "")
      .order("updated_at", { ascending: false })
      .limit(300);

    if (q) {
      query = query.ilike("business_name", "%" + q.replace(/[%_]/g, "") + "%");
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || [])
      .filter((row) => String(row.vercel_url || "").trim())
      .map((row) => {
        const priceCents = Number(row.price_cents);
        const unpaid = !!row.watermark_enabled;
        const ctx =
          row.business_context && typeof row.business_context === "object" ? row.business_context : {};
        const publishedAt =
          String(ctx.publishedAt || ctx.lastPublishedAt || row.updated_at || row.created_at || "").trim() ||
          null;
        const publishedYear = publishedAt ? new Date(publishedAt).getFullYear() : null;
        return {
          id: row.id,
          businessName: row.business_name || "Untitled business",
          status: unpaid
            ? "preview"
            : row.status === "published" || row.status === "paid"
              ? "live"
              : String(row.status || "preview"),
          watermarkEnabled: unpaid,
          priceCents: Number.isFinite(priceCents) && priceCents > 0 ? priceCents : 50000,
          url: String(row.vercel_url).trim(),
          updatedAt: row.updated_at || null,
          publishedAt,
          publishedYear: Number.isFinite(publishedYear) ? publishedYear : null,
        };
      });

    const years = [
      ...new Set(
        mapped
          .map((o) => o.publishedYear)
          .filter((y) => Number.isFinite(y))
          .sort((a, b) => b - a)
      ),
    ];

    const orders = mapped.filter((order) => (year ? order.publishedYear === year : true));

    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({ orders, years, total: orders.length });
  } catch (e) {
    console.error("public-orders", e);
    respondApiError(res, e, "Failed to load orders");
  }
});

/**
 * Public, unauthenticated checkout used by the watermark widget on a LIVE site.
 * The business owner just pays - no Studio login. Keyed by project_id, charges
 * the seller-chosen price (projects.price_cents). Unlock + clean redeploy run
 * from the Stripe webhook and/or POST /fulfill-go-live on return (?paid=1).
 */
app.post("/public-checkout", publicCheckoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);
    const projectId = String(req.body.projectId || req.body.project_id || "").trim();
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });

    const liveUrl = String(project.vercel_url || `${PUBLIC_APP_URL}/preview/${projectId}`);
    if (!project.watermark_enabled) {
      return res.json({ alreadyPaid: true, url: liveUrl });
    }

    const amount = resolveGoLiveAmountCents(project.price_cents);

    const session = await createGoLiveCheckoutSession(stripe, {
      project,
      projectId,
      userId: project.user_id,
      amountCents: amount,
      successUrl: `${liveUrl}${liveUrl.includes("?") ? "&" : "?"}paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: liveUrl,
    });

    await supabase
      .from("projects")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", projectId);

    await supabase.from("payments").upsert(
      {
        user_id: project.user_id,
        project_id: projectId,
        stripe_session_id: session.id,
        amount_cents: session.amount_total || amount,
        currency: "usd",
        status: "pending",
      },
      { onConflict: "stripe_session_id" }
    );

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Checkout failed");
  }
});

/**
 * Backup fulfill path when the buyer returns from Stripe with ?paid=1&session_id=.
 * Verifies the Checkout Session against Stripe, then unlocks + redeploys.
 * Safe to call alongside the webhook (idempotent watermark flip + payment upsert).
 */
app.post("/fulfill-go-live", publicCheckoutLimiter, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return sendStripeMissing(res);

    const sessionId = String(req.body.sessionId || req.body.session_id || "").trim();
    if (!sessionId.startsWith("cs_")) {
      return res.status(400).json({ error: "Valid checkout session required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete" || session.payment_status === "unpaid") {
      return res.status(409).json({ error: "Payment is not complete yet" });
    }

    const kind = String(session.metadata?.type || "").toLowerCase();
    if (kind && kind !== "go_live" && kind !== "site_hosting") {
      return res.status(400).json({ error: "Not a go-live checkout" });
    }

    const projectId = String(
      session.metadata?.projectId || req.body.projectId || req.body.project_id || ""
    ).trim();
    if (!projectId) {
      return res.status(400).json({ error: "projectId missing on checkout session" });
    }

    const bodyProjectId = String(req.body.projectId || req.body.project_id || "").trim();
    if (bodyProjectId && bodyProjectId !== projectId) {
      return res.status(403).json({ error: "Checkout session does not match this project" });
    }

    const result = await unlockGoLiveAfterPayment(db(), {
      projectId,
      session,
      userId: session.metadata?.userId || null,
    });

    res.json({
      ok: true,
      watermarkEnabled: false,
      url: result.url,
      redeployed: result.redeployed,
      redeployError: result.redeployError,
    });
  } catch (e) {
    console.error("fulfill-go-live", e);
    respondApiError(res, e, "Could not unlock site after payment");
  }
});

app.post("/edit", requireUser, editLimiter, async (req, res) => {
  try {
    const projectId = req.body.projectId;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    const instruction = sanitizeUserText(req.body.instruction || req.body.notes || "", 2000);
    if (!instruction || instruction.length < 3) {
      return res.status(400).json({ error: "Describe the change you want" });
    }
    assertSafeEditIntent(instruction);

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });

    let currentHtml = String(project.html || "").trim();
    if (!currentHtml) return res.status(400).json({ error: "Generate a site before editing" });
    if (currentHtml.length > 350000) {
      return res.status(400).json({ error: "HTML is too large to edit" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return respondApiError(res, new Error("OpenRouter is not configured"), "OpenRouter is not configured", 503);
    }

    const editResult = await openRouterChat({
      system: EDIT_SYSTEM_PROMPT,
      user: buildEditUserPrompt(instruction, currentHtml, WEBSITE_EDIT_MAX_INPUT_CHARS),
        temperature: 0.3,
      maxTokens: WEBSITE_EDIT_MAX_OUTPUT_TOKENS,
      prefer: "throughput",
      title: "Moonrise Studio Edit",
    });
    let html = String(editResult.content || "")
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    html = ensurePaletteContrast(stripDemoChrome(html));
    if (editResult.finishReason === "length") {
      console.warn("Edit finished with finish_reason=length");
    }
    if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
      return res.status(502).json({ error: "Model did not return usable HTML" });
    }

    const { error: upErr } = await supabase
      .from("projects")
      .update({
        html,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
    if (upErr) throw upErr;

    res.json({ projectId, html });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || "Edit failed" });
  }
});

/**
 * Unpaid preview sites carry the paywall widget until the business owner pays.
 */
function isWatermarkActive(project) {
  return !!project && project.watermark_enabled !== false;
}

/** Keep runtime embed scripts out of stored HTML (publish injects them). */
function stripRuntimeEmbedsFromStoredHtml(html) {
  return String(html || "")
    .replace(/<script\b[^>]*src=["'][^"']*\/embed\.js[^"']*["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<script\b[^>]*src=["'][^"']*\/contact-form\.js[^"']*["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<!--\s*moonrise:watermark\s*-->/gi, "");
}

/** Allow the worker embed + Stripe checkout from generated CSP meta tags. */
function patchHtmlCspForWatermark(html, workerBase) {
  let out = String(html || "");
  let origin = "";
  try {
    origin = new URL(workerBase).origin;
  } catch (_) {
    return out;
  }
  if (!origin) return out;

  return out.replace(
    /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']*)["'][^>]*>/gi,
    (full, policy) => {
      let next = policy;
      if (/script-src/i.test(next)) {
        if (!next.includes(origin)) {
          next = next.replace(/script-src([^;]*)/i, (m, rest) => `script-src${rest} ${origin}`);
        }
      } else {
        next = `${next}; script-src 'self' 'unsafe-inline' ${origin} https://js.stripe.com`;
      }
      if (/connect-src/i.test(next)) {
        if (!next.includes(origin)) {
          next = next.replace(
            /connect-src([^;]*)/i,
            (m, rest) => `connect-src${rest} ${origin} https://api.stripe.com`
          );
        }
      } else {
        next = `${next}; connect-src 'self' ${origin} https://api.stripe.com`;
      }
      if (/frame-src/i.test(next)) {
        if (!next.includes("checkout.stripe.com")) {
          next = next.replace(
            /frame-src([^;]*)/i,
            (m, rest) => `${m} https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com`
          );
        }
      }
      return full.replace(policy, next);
    }
  );
}

/**
 * Inject the Moonrise watermark widget into the HTML that goes live.
 * The widget is only added while the project is unpaid (watermark_enabled).
 * The clean HTML is always kept in the DB, so removal = redeploy without this.
 */
function injectWatermarkEmbed(html, project) {
  const workerBase = resolveWorkerPublicUrl();
  let src = stripRuntimeEmbedsFromStoredHtml(String(html || ""));
  src = patchHtmlCspForWatermark(src, workerBase);
  const urgency = String(project?.urgency_ends_at || "").trim();
  const urgencyAttr = urgency
    ? ` data-urgency-ends-at="${escapeHtmlAttr(urgency)}"`
    : "";
  const projectId = escapeHtmlAttr(String(project?.id || "").trim());
  const workerAttr = escapeHtmlAttr(workerBase);
  const creatorContact = readStoredCreatorContact(project);
  const creatorAttr = creatorContact
    ? ` data-creator-contact="${escapeHtmlAttr(encodeContactPayload(creatorContact))}"`
    : "";
  const hqAttr = ` data-hq-contact="${escapeHtmlAttr(encodeContactPayload(hqContactSnapshot()))}"`;
  // Synchronous load (no defer/async) so embed.js can read data-* via currentScript.
  const tag =
    `\n<!-- moonrise:watermark -->\n` +
    `<script src="${workerAttr}/embed.js" ` +
    `data-project-id="${projectId}" ` +
    `data-worker="${workerAttr}"${urgencyAttr}${creatorAttr}${hqAttr}></script>\n`;
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${tag}</body>`);
  }
  return src + tag;
}

/**
 * Inject the Moonrise contact form handler on published sites when enabled.
 * Auto mode emails leads via /contact-submit; Custom mode POSTs to the pasted URL.
 */
function injectContactFormHandler(html, project) {
  const cfg = readContactFormConfig(project);
  if (!cfg?.enabled) return String(html || "");

  const workerBase = resolveWorkerPublicUrl();
  let attrs =
    `data-project-id="${escapeHtmlAttr(project.id)}" ` +
    `data-worker="${escapeHtmlAttr(workerBase)}"`;

  if (cfg.mode === "custom") {
    const detected = detectContactEndpoint(cfg.endpointUrl);
    if (!cfg.endpointUrl || detected.type === "invalid") {
      console.warn("contact form custom: invalid endpoint for project", project.id);
      return String(html || "");
    }
    if (detected.needsChatId) {
      console.warn("contact form telegram: missing chat_id for project", project.id);
      return String(html || "");
    }
    attrs +=
      ` data-mode="custom"` +
      ` data-endpoint="${escapeHtmlAttr(cfg.endpointUrl)}"` +
      ` data-endpoint-type="${escapeHtmlAttr(detected.type)}"`;
  } else {
    const email = String(cfg.notificationEmail || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn("contact form auto: missing notification email for project", project.id);
      return String(html || "");
    }
    attrs += ` data-mode="auto"`;
  }

  const src = String(html || "");
  const tag = `\n<script src="${workerBase}/contact-form.js" ${attrs}></script>\n`;
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${tag}</body>`);
  }
  return src + tag;
}

function preparePublishedHtml(project) {
  let html = ensureMobileFriendlyHtml(
    stripRuntimeEmbedsFromStoredHtml(project.html || "<!doctype html><title>Site</title>")
  );
  if (isWatermarkActive(project)) {
    html = injectWatermarkEmbed(html, project);
  }
  html = injectContactFormHandler(html, project);
  return html;
}

const VERCEL_SLUG_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "at",
  "in",
  "on",
  "for",
  "to",
  "by",
  "llc",
  "llp",
  "inc",
  "corp",
  "co",
  "company",
  "ltd",
  "pllc",
  "service",
  "services",
  "repair",
  "repairs",
  "solutions",
  "group",
  "team",
  "handyman",
  "handymen",
  "professional",
  "professionals",
  "pros",
  "local",
  "best",
  "top",
  "quality",
  "premium",
  "trusted",
  "certified",
  "home",
  "homes",
  "business",
]);

function createVercelScope(kind) {
  const token = process.env.VERCEL_TOKEN;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  let teamQuery = "";
  if (kind === "studio") {
    const teamId = String(process.env.VERCEL_TEAM_ID || "").trim();
    if (teamId) {
      headers["X-Vercel-Team-Id"] = teamId;
      teamQuery = `?teamId=${encodeURIComponent(teamId)}`;
    }
  } else if (kind === "client") {
    const clientTeamId = String(process.env.VERCEL_CLIENT_SITES_TEAM_ID || "").trim();
    if (clientTeamId) {
      headers["X-Vercel-Team-Id"] = clientTeamId;
      teamQuery = `?teamId=${encodeURIComponent(clientTeamId)}`;
    }
  }
  return { headers, teamQuery, kind };
}

function vercelApiHeaders(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (process.env.VERCEL_TEAM_ID) {
    headers["X-Vercel-Team-Id"] = process.env.VERCEL_TEAM_ID;
  }
  return headers;
}

function vercelTeamQuery() {
  const teamId = String(process.env.VERCEL_TEAM_ID || "").trim();
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function vercelHostname(url) {
  try {
    return new URL(normalizeVercelUrl(url) || "").hostname.toLowerCase();
  } catch (_) {
    return "";
  }
}

function looksLikePreviewVercelHost(host) {
  const base = String(host || "").toLowerCase().replace(/\.vercel\.app$/i, "");
  if (!base) return false;
  // Preview: …-{deploymentId} or …-{deploymentId}-{teamSlug}
  if (/-[a-z0-9]{8,12}(?:-[a-z0-9-]+)?$/i.test(base)) return true;
  // Preview hash embedded before a team suffix (e.g. slug-abc12345team-teamslug)
  const parts = base.split("-");
  return parts.some((part) => /^[a-z0-9]{8,12}$/i.test(part) && /\d/.test(part));
}

function isPublicProductionVercelUrl(url, projectSlug) {
  const host = vercelHostname(url);
  if (!host || !host.endsWith(".vercel.app")) return false;
  if (looksLikePreviewVercelHost(host)) return false;
  const slug = String(projectSlug || "").toLowerCase();
  if (!slug) return false;
  return stripTeamSuffixFromVercelHost(host, slug) === `${slug}.vercel.app`;
}

function productionUrlCandidates(projectSlug) {
  const slug = String(projectSlug || "").trim().toLowerCase();
  if (!slug) return [];
  return [`https://${slug}.vercel.app`];
}

function stripTeamSuffixFromVercelHost(host, projectSlug) {
  const slug = String(projectSlug || "").trim().toLowerCase();
  const base = String(host || "").trim().toLowerCase();
  if (!slug || !base) return base;
  const teamSlug = String(process.env.VERCEL_TEAM_SLUG || "").trim().toLowerCase();
  if (teamSlug && base === `${slug}-${teamSlug}.vercel.app`) {
    return `${slug}.vercel.app`;
  }
  return base;
}

function normalizeClientSitePublicUrl(url, projectSlug) {
  const normalized = normalizeVercelUrl(url);
  if (!normalized) return normalized;
  try {
    const parsed = new URL(normalized);
    parsed.hostname = stripTeamSuffixFromVercelHost(parsed.hostname, projectSlug);
    return parsed.toString().replace(/\/$/, "");
  } catch (_) {
    return normalized;
  }
}

function normalizeVercelUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}

function slugifyVercelSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Short, stable slug from the business name (e.g. "Hammer and Nail Juarez Handyman Service" → hammer-and-nail-juarez). */
function buildVercelProjectSlug(project) {
  const ctx = project.business_context && typeof project.business_context === "object" ? project.business_context : {};
  const saved = slugifyVercelSegment(ctx.vercelSlug);
  if (saved && saved.length >= 3) return saved.slice(0, 48);

  const tokens = String(project.business_name || "site")
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const meaningful = tokens.filter((word) => !VERCEL_SLUG_STOP_WORDS.has(word));
  const words = (meaningful.length ? meaningful : tokens).slice(0, 4);
  let slug = slugifyVercelSegment(words.join("-")).slice(0, 48);
  if (slug.length < 3) slug = "site";
  return slug;
}

function pickProductionUrl(deployData, projectSlug) {
  const aliases = Array.isArray(deployData?.alias) ? deployData.alias : [];
  const normalized = aliases.map(normalizeVercelUrl).filter(Boolean);
  const preferred = productionUrlCandidates(projectSlug);

  for (const candidate of preferred) {
    const exact = normalized.find((url) => url.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;
  }

  const clean = normalized
    .filter((url) => /\.vercel\.app/i.test(url))
    .filter((url) => isPublicProductionVercelUrl(url, projectSlug))
    .sort((a, b) => a.length - b.length);
  if (clean.length) return clean[0];

  for (const candidate of preferred) {
    return candidate;
  }

  const fallback = normalizeVercelUrl(deployData?.url);
  if (fallback && isPublicProductionVercelUrl(fallback, projectSlug)) return fallback;

  return preferred[0] || `https://${projectSlug}.vercel.app`;
}

async function disableVercelDeploymentProtection(scope, projectId) {
  if (!projectId) return false;
  const { headers, teamQuery } = scope;
  // passwordProtection is update-only (not accepted on project create). Try
  // both fields, then fall back to SSO-only if the plan/schema rejects password.
  const attempts = [
    { ssoProtection: null, passwordProtection: null },
    { ssoProtection: null },
  ];
  for (const body of attempts) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}${teamQuery}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        }
      );
      if (res.ok) return true;
      const data = await res.json().catch(() => ({}));
      const msg = String(data?.error?.message || res.status);
      if (/passwordProtection/i.test(msg)) continue;
      console.warn("Vercel deployment protection not disabled:", msg);
      return false;
    } catch (e) {
      console.warn("Vercel deployment protection patch failed:", e.message);
      return false;
    }
  }
  return false;
}

async function assignVercelProductionAlias(scope, deploymentId, projectSlug) {
  if (!deploymentId || !projectSlug) return null;
  const { headers, teamQuery } = scope;
  const aliases = productionUrlCandidates(projectSlug).map((url) => vercelHostname(url)).filter(Boolean);
  for (const alias of aliases) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v2/deployments/${encodeURIComponent(deploymentId)}/aliases${teamQuery}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ alias }),
        }
      );
      if (res.ok || res.status === 409) {
        return `https://${alias}`;
      }
      const data = await res.json().catch(() => ({}));
      console.warn("Vercel alias assign failed:", alias, data?.error?.message || res.status);
    } catch (e) {
      console.warn("Vercel alias assign error:", alias, e.message);
    }
  }
  return null;
}

async function listDeploymentAliases(scope, deploymentId) {
  if (!deploymentId) return [];
  const { headers, teamQuery } = scope;
  try {
    const res = await fetch(
      `https://api.vercel.com/v2/deployments/${encodeURIComponent(deploymentId)}/aliases${teamQuery}`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray(data?.aliases) ? data.aliases : Array.isArray(data) ? data : [];
    return rows
      .map((row) => normalizeVercelUrl(row?.alias || row?.domain || row))
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

async function resolvePublicProductionUrl(scope, deployData, projectSlug) {
  const deploymentId = deployData?.id || deployData?.uid || null;
  let url = pickProductionUrl(deployData, projectSlug);
  if (deploymentId) {
    const assigned = await assignVercelProductionAlias(scope, deploymentId, projectSlug);
    if (assigned) url = assigned;
    const listed = await listDeploymentAliases(scope, deploymentId);
    const publicAlias = listed.find((candidate) => isPublicProductionVercelUrl(candidate, projectSlug));
    if (publicAlias) url = publicAlias;
  }
  url = normalizeClientSitePublicUrl(url, projectSlug);
  if (!isPublicProductionVercelUrl(url, projectSlug)) {
    url = productionUrlCandidates(projectSlug)[0] || url;
  }
  return normalizeClientSitePublicUrl(url, projectSlug);
}

async function ensureVercelProject(scope, slug) {
  const { headers, teamQuery } = scope;
  const getRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(slug)}${teamQuery}`, {
    headers,
  });
  if (getRes.ok) {
    const data = await getRes.json().catch(() => ({}));
    const project = { id: data.id, name: data.name || slug };
    await disableVercelDeploymentProtection(scope, project.id);
    return project;
  }
  if (getRes.status !== 404) {
    const data = await getRes.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Vercel project lookup failed (${getRes.status})`);
  }

  const createRes = await fetch(`https://api.vercel.com/v11/projects${teamQuery}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: slug,
      // Create schema accepts ssoProtection, not passwordProtection.
      ssoProtection: null,
    }),
  });
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(createData?.error?.message || `Vercel project create failed (${createRes.status})`);
  }
  const project = { id: createData.id, name: createData.name || slug };
  await disableVercelDeploymentProtection(scope, project.id);
  return project;
}

async function ensureVercelProjectForMoonrise(scope, project, preferredSlug) {
  const suffix = String(project.id || "").replace(/-/g, "").slice(0, 6);
  const candidates = [preferredSlug];
  if (suffix && !preferredSlug.endsWith(suffix)) {
    candidates.push(`${preferredSlug}-${suffix}`);
  }

  let lastError = null;
  for (const slug of candidates) {
    try {
      const vercelProject = await ensureVercelProject(scope, slug);
      return { slug, vercelProject };
    } catch (e) {
      lastError = e;
      if (!/already exists|exists|duplicate|taken|409/i.test(String(e.message || ""))) throw e;
    }
  }
  throw lastError || new Error("Could not create Vercel project");
}

/** Stable fingerprint of deployed HTML - must match builder.js publishContentHash. */
function publishContentHash(html) {
  const str = String(html || "");
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

async function attachCreatorContactSnapshot(supabase, project) {
  if (!project?.user_id) return project;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, handle, payout_profile")
    .eq("id", project.user_id)
    .maybeSingle();
  if (error) throw error;
  const snapshot = buildCreatorContactSnapshot(profile || {});
  const ctx = {
    ...(project.business_context && typeof project.business_context === "object"
      ? project.business_context
      : {}),
  };
  if (snapshot) ctx.creatorContact = snapshot;
  else delete ctx.creatorContact;
  return { ...project, business_context: ctx };
}

/**
 * Deploy a project's site to Vercel. Adds the watermark widget when the project
 * is still unpaid. Reused by /publish (seller) and the Stripe webhook (auto
 * clean redeploy after the business owner pays).
 */
async function deployProjectToVercel(supabase, project) {
  const html = preparePublishedHtml(project);
  if (isWatermarkActive(project) && !html.includes("embed.js")) {
    console.warn("Watermark embed missing from published HTML for project", project.id);
  }

    const token = process.env.VERCEL_TOKEN;
    if (!token) {
    const fakeUrl = `${PUBLIC_APP_URL}/preview/${project.id}`;
    const publishedAt = new Date().toISOString();
    const ctx = {
      ...(project.business_context && typeof project.business_context === "object" ? project.business_context : {}),
      publishedAt:
        project.business_context && typeof project.business_context === "object" && project.business_context.publishedAt
          ? project.business_context.publishedAt
          : publishedAt,
      lastPublishedAt: publishedAt,
      publishedContentHash: publishContentHash(html),
    };
      await supabase
        .from("projects")
        .update({
          status: "published",
          vercel_url: fakeUrl,
          vercel_deployment_id: "local-fallback",
        business_context: ctx,
      })
      .eq("id", project.id);
    return { url: fakeUrl, fallback: true, watermarked: isWatermarkActive(project) };
  }

  const clientScope = createVercelScope("client");
  const preferredSlug = buildVercelProjectSlug(project);
  const { slug, vercelProject } = await ensureVercelProjectForMoonrise(clientScope, project, preferredSlug);

    const files = [
      {
        file: "index.html",
      data: Buffer.from(html).toString("base64"),
        encoding: "base64",
      },
    ];

    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: clientScope.headers,
      body: JSON.stringify({
      name: slug,
      project: vercelProject.name || slug,
      target: "production",
        files,
        projectSettings: { framework: null },
      }),
    });
    const deployData = await deployRes.json().catch(() => ({}));
    if (!deployRes.ok) {
      throw new Error(deployData?.error?.message || `Vercel deploy failed (${deployRes.status})`);
    }

  await disableVercelDeploymentProtection(clientScope, vercelProject.id);
  const url = await resolvePublicProductionUrl(clientScope, deployData, slug);
  const publishedAt = new Date().toISOString();
  const ctx = {
    ...(project.business_context && typeof project.business_context === "object" ? project.business_context : {}),
    vercelSlug: slug,
    publishedAt:
      project.business_context && typeof project.business_context === "object" && project.business_context.publishedAt
        ? project.business_context.publishedAt
        : publishedAt,
    lastPublishedAt: publishedAt,
    publishedContentHash: publishContentHash(html),
  };

    await supabase
      .from("projects")
      .update({
        status: "published",
        vercel_url: url,
        vercel_deployment_id: deployData.id || deployData.uid || null,
      business_context: ctx,
    })
    .eq("id", project.id);

  return { url, deployment: deployData, watermarked: isWatermarkActive(project), vercelSlug: slug };
}

async function deleteVercelClientProject(slug) {
  if (!slug) return false;
  const scopes = [createVercelScope("client"), createVercelScope("studio")];
  let lastError = null;
  for (const scope of scopes) {
    const delRes = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(slug)}${scope.teamQuery}`,
      {
        method: "DELETE",
        headers: scope.headers,
      }
    );
    if (delRes.ok || delRes.status === 404) return true;
    const data = await delRes.json().catch(() => ({}));
    lastError = new Error(data?.error?.message || `Vercel unpublish failed (${delRes.status})`);
  }
  if (lastError) throw lastError;
  return true;
}

async function unpublishProjectFromVercel(supabase, project) {
  const token = process.env.VERCEL_TOKEN;
  const ctx =
    project.business_context && typeof project.business_context === "object" ? project.business_context : {};
  const slug = slugifyVercelSegment(ctx.vercelSlug) || buildVercelProjectSlug(project);

  if (token && slug) {
    await deleteVercelClientProject(slug);
  }

  const nextStatus = project.watermark_enabled ? "draft" : "paid";
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: nextStatus,
      vercel_url: null,
      vercel_deployment_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id);
  if (updateError) throw updateError;

  return { ok: true, status: nextStatus, vercelSlug: slug || null };
}

async function handleUnpublishProject(req, res) {
  const projectId = req.body.projectId;
  if (!projectId) return res.status(400).json({ error: "projectId required" });

  const supabase = db();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", req.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!project) return res.status(404).json({ error: "Project not found" });

  const hasUrl = !!String(project.vercel_url || "").trim();
  const isPublished = String(project.status || "").toLowerCase() === "published";

  if (!hasUrl && !isPublished) {
    return res.status(400).json({ error: "This site is not published" });
  }

  if (!hasUrl && isPublished) {
    const nextStatus = project.watermark_enabled ? "draft" : "paid";
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        status: nextStatus,
        vercel_url: null,
        vercel_deployment_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    if (updateError) throw updateError;
    return res.json({ ok: true, status: nextStatus, reset: true });
  }

  const result = await unpublishProjectFromVercel(supabase, project);
  res.json(result);
}

app.post("/publish", requireUser, publishLimiter, async (req, res) => {
  try {
    if (String(req.body?.action || "").toLowerCase() === "unpublish") {
      return await handleUnpublishProject(req, res);
    }

    const projectId = req.body.projectId;
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const supabase = db();
    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Ensure unpaid projects stay watermarked through publish (DB default is true).
    let publishProject = project;
    if (isWatermarkActive(project) && project.watermark_enabled !== true) {
      const { data: fixed, error: fixErr } = await supabase
        .from("projects")
        .update({ watermark_enabled: true })
        .eq("id", projectId)
        .eq("user_id", req.user.id)
        .select("*")
        .maybeSingle();
      if (!fixErr && fixed) publishProject = fixed;
      else publishProject = { ...project, watermark_enabled: true };
    }

    // Publishing is allowed while watermarked: the live site carries the
    // paywall widget so the business owner can pay to remove it.
    const withContact = await attachCreatorContactSnapshot(supabase, publishProject);
    const result = await deployProjectToVercel(supabase, withContact);
    res.json(result);
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Publish failed");
  }
});

app.post("/unpublish", requireUser, publishLimiter, async (req, res) => {
  try {
    await handleUnpublishProject(req, res);
  } catch (e) {
    console.error(e);
    respondApiError(res, e, "Unpublish failed");
  }
});

app.post("/resolve-maps", requireUser, mapsLimiter, async (req, res) => {
  try {
    const rawUrl = sanitizeUserText(req.body.mapsUrl || req.body.url || "", 800);
    if (!rawUrl) return res.status(400).json({ error: "Maps link required" });
    if (!/^https?:\/\//i.test(rawUrl)) {
      return res.status(400).json({ error: "Maps link must start with http:// or https://" });
    }
    if (!isGoogleMapsUrl(rawUrl)) {
      return res.status(400).json({ error: "Paste a Google Maps place link" });
    }

    const details = await resolveGoogleMapsPlace(rawUrl);
    res.json(details);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || "Could not read that Maps link" });
  }
});

/** Proxy on-demand Maps scrapes to LeadFinderCloud search:server (Playwright on Render). */
app.post("/lead-finder/search", requireUser, leadFinderLimiter, async (req, res) => {
  const upstream = String(process.env.LEADFINDER_SEARCH_URL || "").trim().replace(/\/$/, "");
  if (!upstream) {
    return res.status(503).json({
      ok: false,
      error: "Live Maps search is not available right now. Browse saved leads or import a CSV instead.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const upstreamRes = await fetch(`${upstream}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      signal: controller.signal,
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        ok: false,
        error: data?.error || `LeadFinder upstream failed (${upstreamRes.status})`,
        ...data,
      });
    }
    res.json(data);
  } catch (e) {
    const aborted = e?.name === "AbortError";
    console.error("LeadFinder proxy failed:", e?.message || e);
    res.status(502).json({
      ok: false,
      error: aborted ? "Live search timed out" : e?.message || "LeadFinder proxy failed",
    });
  } finally {
    clearTimeout(timer);
  }
});

/** Proxy single-place website verification to LeadFinderCloud (Playwright). */
app.post("/lead-finder/enrich-place", requireUser, leadFinderLimiter, async (req, res) => {
  const upstream = String(process.env.LEADFINDER_SEARCH_URL || "").trim().replace(/\/$/, "");
  if (!upstream) {
    return res.status(503).json({
      ok: false,
      error: "Website verification is not available right now. Try again later or enter the website manually.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const upstreamRes = await fetch(`${upstream}/enrich-place`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      signal: controller.signal,
    });
    const data = await upstreamRes.json().catch(() => ({}));
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        ok: false,
        error: data?.error || `LeadFinder enrich failed (${upstreamRes.status})`,
        ...data,
      });
    }
    res.json(data);
  } catch (e) {
    const aborted = e?.name === "AbortError";
    console.error("LeadFinder enrich proxy failed:", e?.message || e);
    res.status(502).json({
      ok: false,
      error: aborted ? "Website verification timed out" : e?.message || "LeadFinder enrich proxy failed",
    });
  } finally {
    clearTimeout(timer);
  }
});

function isGoogleMapsUrl(url) {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const shortHosts = ["maps.app.goo.gl", "goo.gl", "g.co", "g.page"];
    if (shortHosts.includes(host)) return true;
    if (host === "google.com" || host.startsWith("google.") || host.startsWith("maps.google.")) {
      return true;
    }
    if (host.includes(".google.")) return true;
    return false;
  } catch (_) {
    return false;
  }
}

function decodePlaceSlug(slug) {
  try {
    return decodeURIComponent(String(slug || "").replace(/\+/g, " "))
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch (_) {
    return String(slug || "")
      .replace(/[-+]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function nameFromMapsUrl(mapsUrl) {
  const raw = String(mapsUrl || "");
  const m =
    raw.match(/\/place\/([^/@?#]+)/i) ||
    raw.match(/[?&]q=([^&]+)/i);
  if (!m) return "";
  return decodePlaceSlug(m[1]);
}

function placeIdFromMapsUrl(mapsUrl) {
  const raw = String(mapsUrl || "");
  const m =
    raw.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i) ||
    raw.match(/!19s(ChIJ[\w-]+)/) ||
    raw.match(/place_id[=:](ChIJ[\w-]+)/i) ||
    raw.match(/\/g\/([\w]+)/);
  return m ? m[1] : "";
}

function coordsFromMapsUrl(mapsUrl) {
  const raw = String(mapsUrl || "");
  const at = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: at[1], lng: at[2] };
  const m2 = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m2) return { lat: m2[1], lng: m2[2] };
  return null;
}

function inferCategoryFromName(name) {
  const n = String(name || "").toLowerCase();
  if (/plumb|drain|septic|pipe/.test(n)) return "Plumbing";
  if (/electr/.test(n)) return "Electrical";
  if (/hvac|heating|cooling|air\s*cond/.test(n)) return "HVAC";
  if (/roof/.test(n)) return "Roofing";
  if (/landscap|lawn|garden/.test(n)) return "Landscaping";
  if (/clean/.test(n)) return "Cleaning";
  if (/dentist|dental/.test(n)) return "Dental";
  if (/barber|salon|hair/.test(n)) return "Beauty";
  if (/restaurant|cafe|pizza|grill|kitchen/.test(n)) return "Restaurant";
  if (/auto|mechanic|tire/.test(n)) return "Auto";
  if (/gym|fitness|yoga/.test(n)) return "Fitness";
  return "";
}

function extractFromAppInit(html, seed) {
  const out = { ...seed };
  const name = seed.businessName || "";
  if (!name) return out;
  const idx = html.indexOf(name);
  if (idx < 0) return out;
  const window = html.slice(Math.max(0, idx - 200), idx + 2500);
  // Phone patterns near the business name blob
  const phoneMatch = window.match(
    /(?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  if (phoneMatch && !out.phone) out.phone = phoneMatch[0];
  const addrMatch = window.match(
    /\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9 .'#\-]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Hwy|Highway|Pkwy|Parkway)\b[^"]{0,60}/i
  );
  if (addrMatch && !out.address) out.address = addrMatch[0].replace(/\\+"/g, "").trim();
  return out;
}

function pickMeta(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i"
  );
  const m = String(html || "").match(re) || String(html || "").match(re2);
  return m ? m[1].trim() : "";
}

function extractJsonLdLocalBusiness(html) {
  const blocks = String(html || "").match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const jsonText = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const graph = item["@graph"] || [item];
        for (const node of graph) {
          const type = String(node["@type"] || "").toLowerCase();
          if (!type.includes("localbusiness") && !type.includes("organization") && !type.includes("place")) {
            continue;
          }
          const addr = node.address || {};
          const address =
            typeof addr === "string"
              ? addr
              : [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode]
                  .filter(Boolean)
                  .join(", ");
          return {
            businessName: String(node.name || "").trim(),
            phone: String(node.telephone || "").trim(),
            address: String(address || "").trim(),
            category: String(node["@type"] || "")
              .replace(/LocalBusiness/i, "")
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .trim(),
          };
        }
      }
    } catch (_) {
      /* ignore bad json-ld */
    }
  }
  return null;
}

async function followMapsRedirects(startUrl) {
  let current = startUrl;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+",
      },
    });
    const loc = res.headers.get("location");
    if (loc && res.status >= 300 && res.status < 400) {
      current = new URL(loc, current).toString();
      continue;
    }
    const html = await res.text().catch(() => "");
    return { finalUrl: current, html: String(html || "").slice(0, 250000), status: res.status };
  }
  return { finalUrl: current, html: "", status: 0 };
}

async function lookupLeadByMaps(mapsUrl, businessName) {
  try {
    const supabase = db();
    const urls = [...new Set([mapsUrl, String(mapsUrl || "").split("?")[0]].filter(Boolean))];
    for (const u of urls) {
      const { data } = await supabase
        .from("leads")
        .select("business_name,phone,address,category,maps_url,city_state_zip")
        .eq("maps_url", u)
        .limit(1)
        .maybeSingle();
      if (data?.business_name) {
        return {
          businessName: String(data.business_name || "").trim(),
          phone: String(data.phone || "").trim(),
          address: String(data.address || data.city_state_zip || "").trim(),
          category: String(data.category || "").trim(),
          mapsUrl: String(data.maps_url || mapsUrl).trim(),
          source: "leads",
        };
      }
    }

    const name = String(businessName || nameFromMapsUrl(mapsUrl) || "").trim();
    if (name.length >= 4) {
      const { data } = await supabase
        .from("leads")
        .select("business_name,phone,address,category,maps_url,city_state_zip")
        .ilike("business_name", name)
        .limit(1)
        .maybeSingle();
      if (data?.business_name) {
        return {
          businessName: String(data.business_name || "").trim(),
          phone: String(data.phone || "").trim(),
          address: String(data.address || data.city_state_zip || "").trim(),
          category: String(data.category || "").trim(),
          mapsUrl: String(data.maps_url || mapsUrl).trim(),
          source: "leads",
        };
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function enrichWithOpenRouter(snippet, seed) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return seed;
  const hasSignal = !!(snippet || seed.businessName || seed.mapsUrl);
  if (!hasSignal) return seed;
  const mapsModel =
    process.env.OPENROUTER_MAPS_MODEL ||
    (seed.businessName && !snippet ? "perplexity/sonar" : WEBSITE_GENERATION_MODEL);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": PUBLIC_APP_URL,
        "X-Title": "Moonrise Studio Maps Resolve",
      },
      body: JSON.stringify({
        model: mapsModel,
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "Extract real-world business contact details. Return ONLY JSON with keys businessName, category, phone, address. Use empty strings when unknown. Prefer US phone format. No markdown.",
          },
          {
            role: "user",
            content: JSON.stringify({
              seed: {
                businessName: seed.businessName || "",
                category: seed.category || "",
                phone: seed.phone || "",
                address: seed.address || "",
                mapsUrl: seed.mapsUrl || "",
                placeId: seed.placeId || "",
                coords: seed.coords || null,
              },
              pageText: String(snippet || "").slice(0, 12000),
              task: seed.businessName
                ? "Look up this Google Maps business and fill missing phone, address, and category."
                : "Extract business details from the page text.",
            }),
          },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return seed;
    let text = data?.choices?.[0]?.message?.content || "";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    // Some models wrap JSON in prose - pull first object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) text = objMatch[0];
    const parsed = JSON.parse(text);
    return {
      businessName: sanitizeUserText(parsed.businessName || seed.businessName || "", 120),
      category: sanitizeUserText(parsed.category || seed.category || "", 80),
      phone: sanitizeUserText(parsed.phone || seed.phone || "", 40),
      address: sanitizeUserText(parsed.address || seed.address || "", 200),
      mapsUrl: seed.mapsUrl,
      source: seed.source === "leads" ? "leads" : "openrouter",
    };
  } catch (_) {
    return seed;
  }
}

async function resolveGoogleMapsPlace(rawUrl) {
  let followed = { finalUrl: rawUrl, html: "", status: 0 };
  try {
    followed = await followMapsRedirects(rawUrl);
  } catch (e) {
    console.warn("Maps fetch failed, using URL-only details:", e.message);
  }
  const finalUrl = followed.finalUrl || rawUrl;
  const html = followed.html || "";
  const placeId = placeIdFromMapsUrl(finalUrl) || placeIdFromMapsUrl(rawUrl);
  const coords = coordsFromMapsUrl(finalUrl) || coordsFromMapsUrl(rawUrl);

  let details = {
    businessName: nameFromMapsUrl(finalUrl) || nameFromMapsUrl(rawUrl),
    category: "",
    phone: "",
    address: "",
    mapsUrl: finalUrl,
    placeId,
    coords,
    source: "url",
  };
  if (!details.category) {
    details.category = inferCategoryFromName(details.businessName);
  }

  const fromLead =
    (await lookupLeadByMaps(finalUrl, details.businessName)) ||
    (finalUrl !== rawUrl ? await lookupLeadByMaps(rawUrl, details.businessName) : null);
  if (fromLead?.businessName) {
    details = { ...details, ...fromLead, mapsUrl: finalUrl, placeId, coords };
  }

  const ld = extractJsonLdLocalBusiness(html);
  if (ld) {
    details = {
      ...details,
      businessName: ld.businessName || details.businessName,
      phone: ld.phone || details.phone,
      address: ld.address || details.address,
      category: ld.category || details.category,
      source: details.source === "leads" ? "leads" : "json-ld",
    };
  }

  if (html) {
    details = extractFromAppInit(html, details);
  }

  const ogTitle = pickMeta(html, "og:title");
  const ogDesc = pickMeta(html, "og:description");
  if (ogTitle && ogTitle.toLowerCase() !== "google maps" && !details.businessName) {
    details.businessName = ogTitle.replace(/\s*[-–|].*$/, "").trim();
  }
  if (ogDesc && !details.address && !/google maps/i.test(ogDesc)) {
    details.address = ogDesc.slice(0, 200);
  }

  const needsMore = !details.businessName || !details.phone || !details.address || !details.category;
  if (needsMore) {
    const plain = html
      ? html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
    // Google often returns a JS shell - still enrich from the place name via a search model
    const usefulPlain =
      plain && !/^google maps$/i.test(plain.slice(0, 40)) && plain.length > 400 ? plain : "";
    details = await enrichWithOpenRouter(usefulPlain, details);
  }

  if (!details.category) {
    details.category = inferCategoryFromName(details.businessName);
  }

  details.businessName = sanitizeUserText(details.businessName || "", 120);
  details.category = sanitizeUserText(details.category || "", 80);
  details.phone = sanitizeUserText(details.phone || "", 40);
  details.address = sanitizeUserText(details.address || "", 200);
  details.mapsUrl = sanitizeUserText(details.mapsUrl || finalUrl, 800);
  delete details.placeId;
  delete details.coords;

  if (!details.businessName && !details.mapsUrl) {
    const err = new Error("Could not read business details from that link");
    err.status = 422;
    throw err;
  }

  return details;
}

module.exports = app;

/** Local / Render long-running process. Skip listen on Vercel serverless. */
if (!process.env.VERCEL) {
app.listen(PORT, "0.0.0.0", () => {
  console.log(`moonrise-studio-worker listening on 0.0.0.0:${PORT}`);
});
}
