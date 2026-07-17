/**
 * Moonrise Studio worker
 * - POST /generate   OpenRouter HTML generation
 * - POST /checkout   Stripe Checkout Session
 * - POST /webhooks/stripe  payment → unlock watermark
 * - POST /resolve-maps  Google Maps URL → business details
 * - POST /publish    Vercel deployment
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const PORT = Number(process.env.PORT || 8787);
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
/** Public base URL of THIS worker (used to embed the watermark widget into live sites). */
const WORKER_PUBLIC_URL = String(
  process.env.WORKER_PUBLIC_URL || `http://127.0.0.1:${PORT}`
).replace(/\/$/, "");
const WATERMARK_EMBED_PATH = path.join(__dirname, "..", "watermark", "embed.js");
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
/**
 * Website Presets gallery used as the only visual reference for generation.
 * Default: moonrise-studio/Website Presets
 * Override with WEBSITE_PRESETS_DIR if needed.
 */
const WEBSITE_PRESETS_DIR = String(
  process.env.WEBSITE_PRESETS_DIR || path.join(__dirname, "..", "Website Presets")
).trim();
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
const PRESET_MAX_FILES = 8;
const PRESET_MAX_CHARS_EACH = 1800;
const PRESET_MAX_TOTAL_CHARS = 12000;

const {
  GENERATION_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
  buildGenerationUserPrompt,
  buildEditUserPrompt,
  buildBusinessBrief,
} = require("./generate-prompt");

let _supabaseAdmin = null;
function db() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
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

const app = express();

/**
 * Public endpoints reachable from any deployed (Vercel) site, where an
 * unauthenticated business owner pays to remove the watermark. These must be
 * open to all origins, so allow `*` before the stricter global CORS runs.
 */
const PUBLIC_PATHS = new Set(["/public-checkout", "/embed.js"]);
app.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "moonrise-studio-worker",
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasVercel: !!process.env.VERCEL_TOKEN,
  });
});

/** Stripe webhook needs raw body — mount before json parser. */
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
      if (projectId && userId) {
        const supabase = db();
        await supabase
          .from("projects")
          .update({
            watermark_enabled: false,
            status: "paid",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", projectId);

        await supabase.from("payments").upsert(
          {
            user_id: userId,
            project_id: projectId,
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null,
            amount_cents: session.amount_total,
            currency: session.currency || "usd",
            status: "paid",
          },
          { onConflict: "stripe_session_id" }
        );

        // Auto-redeploy the clean site (watermark_enabled is now false, so the
        // widget is no longer injected) so the live site updates itself.
        try {
          const { data: fresh } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle();
          if (fresh && fresh.vercel_url) {
            await deployProjectToVercel(supabase, fresh);
          }
        } catch (redeployErr) {
          console.error("Auto-redeploy after payment failed:", redeployErr.message);
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


function stripDemoChrome(html) {
  return String(html || "")
    .replace(/<div[^>]*class=["'][^"']*toggles[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?toggles[\s\S]*?<\/script>/gi, "");
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

function loadPresetManifest() {
  const manifestPath = path.join(WEBSITE_PRESETS_DIR, "presets", "manifest.json");
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function extractPresetSnippet(html) {
  const text = String(html || "");
  const styleMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const style = styleMatch ? styleMatch[1].trim() : "";
  const body = bodyMatch ? bodyMatch[1].trim() : text.trim();
  let out = "";
  if (style) out += `<style>\n${style}\n</style>\n`;
  out += body;
  if (out.length > PRESET_MAX_CHARS_EACH) {
    return out.slice(0, PRESET_MAX_CHARS_EACH) + "\n<!-- truncated -->";
  }
  return out;
}

/**
 * Pick a compact pack of Website Preset snippets for generation.
 * Deterministic per business so regenerations stay somewhat stable.
 * Categories match moonrise-studio/Website Presets/presets/manifest.json.
 */
function loadWebsitePresetPack(ctx) {
  const manifest = loadPresetManifest();
  if (!manifest.length) {
    console.warn(
      "Website Presets manifest empty or missing at",
      path.join(WEBSITE_PRESETS_DIR, "presets", "manifest.json")
    );
    return [];
  }

  const seed = String(ctx?.businessName || ctx?.category || ctx?.leadId || "site");
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
    const filePath = path.join(WEBSITE_PRESETS_DIR, "presets", item.file);
    if (!fs.existsSync(filePath)) continue;
    let html = "";
    try {
      html = fs.readFileSync(filePath, "utf8");
    } catch (_) {
      continue;
    }
    const snippet = extractPresetSnippet(html);
    if (!snippet) continue;
    if (total + snippet.length > PRESET_MAX_TOTAL_CHARS) break;
    total += snippet.length;
    pack.push({
      id: item.id,
      title: item.title,
      category: item.category,
      tags: item.tags || [],
      html: snippet,
    });
  }
  return pack;
}

async function generateWithOpenRouter(ctx, presetPack) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    // Offline / no-key fallback: stitch a minimal page from a template only.
    return fillTemplate(loadTemplate(ctx.templateId || "local-service"), ctx);
  }

  const presets = Array.isArray(presetPack) ? presetPack : [];
  const userPrompt = buildGenerationUserPrompt(ctx, presets);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": PUBLIC_APP_URL,
      "X-Title": "Moonrise Studio",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: GENERATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.72,
      max_tokens: 12000,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter error ${res.status}`);
  }
  let html = data?.choices?.[0]?.message?.content || "";
  html = html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    // Last resort if the model returns junk — still never feed old templates as the prompt.
    return stripDemoChrome(fillTemplate(loadTemplate(ctx.templateId || "local-service"), ctx));
  }
  return stripDemoChrome(html);
}

function urgencyHours() {
  return Number(process.env.WATERMARK_URGENCY_HOURS || 96);
}

app.post("/generate", requireUser, async (req, res) => {
  try {
    let notes = sanitizeUserText(req.body.notes || "", 2000);
    if (notes) assertSafeEditIntent(notes);

    const ctx = {
      businessName: sanitizeUserText(req.body.businessName || "Untitled business", 120) || "Untitled business",
      category: sanitizeUserText(req.body.category || "", 80),
      phone: sanitizeUserText(req.body.phone || "", 40),
      address: sanitizeUserText(req.body.address || "", 200),
      mapsUrl: sanitizeUserText(req.body.mapsUrl || "", 500),
      website: sanitizeUserText(req.body.website || "", 500),
      hours: sanitizeUserText(req.body.hours || "", 200),
      notes,
      leadId: req.body.leadId || null,
      templateId: String(req.body.templateId || "local-service").replace(/[^a-z0-9-]/gi, "") || "local-service",
      fromFinder: req.body.fromFinder === true || req.body.fromFinder === "1",
    };

    if (ctx.mapsUrl && !/^https?:\/\//i.test(ctx.mapsUrl)) {
      return res.status(400).json({ error: "Maps link must start with http:// or https://" });
    }

    const supabase = db();
    const jobInsert = await supabase
      .from("generation_jobs")
      .insert({
        user_id: req.user.id,
        project_id: req.body.projectId || null,
        status: "running",
        prompt: {
          ...ctx,
          brief: buildBusinessBrief(ctx),
          presetsDir: WEBSITE_PRESETS_DIR,
        },
      })
      .select("id")
      .single();

    // Always compose from Website Presets + best-practice prompt (no legacy template dump).
    const presetPack = loadWebsitePresetPack(ctx);
    const html = await generateWithOpenRouter(ctx, presetPack);
    const ends = new Date(Date.now() + urgencyHours() * 3600 * 1000).toISOString();

    let projectId = req.body.projectId || null;
    if (projectId) {
      const { data: existing } = await supabase
        .from("projects")
        .select("id,user_id")
        .eq("id", projectId)
        .maybeSingle();
      if (!existing || existing.user_id !== req.user.id) {
        return res.status(403).json({ error: "Project not found" });
      }
      const { error } = await supabase
        .from("projects")
        .update({
          business_name: ctx.businessName,
          lead_id: ctx.leadId,
          template_id: ctx.templateId,
          html,
          status: "preview",
          watermark_enabled: true,
          urgency_ends_at: ends,
          business_context: ctx,
        })
        .eq("id", projectId);
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
        })
        .eq("id", jobInsert.data.id);
    }

    res.json({ projectId, html, presetCount: presetPack.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Generate failed" });
  }
});

app.post("/checkout", requireUser, async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
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
        url: `${PUBLIC_APP_URL}/builder.html?project_id=${projectId}`,
      });
    }

    const allowedAmounts = new Set([30000, 50000, 70000, 100000, 150000]);
    const requestedAmount = Number(req.body.amountCents);
    const amountCents = allowedAmounts.has(requestedAmount)
      ? requestedAmount
      : Number(project.price_cents) > 0
        ? Number(project.price_cents)
        : Number(process.env.STRIPE_AMOUNT_CENTS || 50000);
    const priceId = process.env.STRIPE_PRICE_ID;
    const lineItems = priceId && !allowedAmounts.has(requestedAmount)
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Go live — ${project.business_name}`,
                description: "Remove Moonrise watermark and unlock publish",
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${PUBLIC_APP_URL}/builder.html?project_id=${projectId}&paid=1`,
      cancel_url: `${PUBLIC_APP_URL}/builder.html?project_id=${projectId}&canceled=1`,
      customer_email: req.user.email || undefined,
      metadata: {
        projectId,
        userId: req.user.id,
      },
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
    res.status(500).json({ error: e.message || "Checkout failed" });
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

/**
 * Public, unauthenticated checkout used by the watermark widget on a LIVE site.
 * The business owner just pays — no Studio login. Keyed by project_id, charges
 * the seller-chosen price (projects.price_cents). Payment confirmation and the
 * clean redeploy happen in the Stripe webhook.
 */
app.post("/public-checkout", async (req, res) => {
  try {
    const stripe = stripeClient();
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
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

    const amount =
      Number(project.price_cents) > 0
        ? Number(project.price_cents)
        : Number(process.env.STRIPE_AMOUNT_CENTS || 50000);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Go live — ${project.business_name}`,
              description: "Remove the Moonrise watermark and publish this website",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${liveUrl}${liveUrl.includes("?") ? "&" : "?"}paid=1`,
      cancel_url: liveUrl,
      metadata: {
        projectId,
        userId: project.user_id,
      },
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
    res.status(500).json({ error: e.message || "Checkout failed" });
  }
});


app.post("/edit", requireUser, async (req, res) => {
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

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return res.status(503).json({ error: "OpenRouter is not configured" });
    }

    const resOr = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": PUBLIC_APP_URL,
        "X-Title": "Moonrise Studio Edit",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: EDIT_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildEditUserPrompt(instruction, currentHtml),
          },
        ],
        temperature: 0.3,
        max_tokens: 7000,
      }),
    });
    const data = await resOr.json().catch(() => ({}));
    if (!resOr.ok) {
      throw new Error(data?.error?.message || "OpenRouter error " + resOr.status);
    }
    let html = data?.choices?.[0]?.message?.content || "";
    html = html
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    html = stripDemoChrome(html);
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
 * Inject the Moonrise watermark widget into the HTML that goes live.
 * The widget is only added while the project is unpaid (watermark_enabled).
 * The clean HTML is always kept in the DB, so removal = redeploy without this.
 */
function injectWatermarkEmbed(html, project) {
  const src = String(html || "");
  const tag =
    `\n<script src="${WORKER_PUBLIC_URL}/embed.js" ` +
    `data-project-id="${project.id}" ` +
    `data-worker="${WORKER_PUBLIC_URL}" defer></` +
    `script>\n`;
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${tag}</body>`);
  }
  return src + tag;
}

/**
 * Deploy a project's site to Vercel. Adds the watermark widget when the project
 * is still unpaid. Reused by /publish (seller) and the Stripe webhook (auto
 * clean redeploy after the business owner pays).
 */
async function deployProjectToVercel(supabase, project) {
  const baseHtml = project.html || "<!doctype html><title>Site</title>";
  const html = project.watermark_enabled
    ? injectWatermarkEmbed(baseHtml, project)
    : String(baseHtml);

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    const fakeUrl = `${PUBLIC_APP_URL}/preview/${project.id}`;
    await supabase
      .from("projects")
      .update({
        status: "published",
        vercel_url: fakeUrl,
        vercel_deployment_id: "local-fallback",
      })
      .eq("id", project.id);
    return { url: fakeUrl, fallback: true, watermarked: !!project.watermark_enabled };
  }

  const name =
    String(project.business_name || "moonrise-site")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "moonrise-site";

  const files = [
    {
      file: "index.html",
      data: Buffer.from(html).toString("base64"),
      encoding: "base64",
    },
  ];

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (process.env.VERCEL_TEAM_ID) {
    headers["X-Vercel-Team-Id"] = process.env.VERCEL_TEAM_ID;
  }

  const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      files,
      projectSettings: { framework: null },
    }),
  });
  const deployData = await deployRes.json().catch(() => ({}));
  if (!deployRes.ok) {
    throw new Error(deployData?.error?.message || `Vercel deploy failed (${deployRes.status})`);
  }

  const url = deployData.url
    ? deployData.url.startsWith("http")
      ? deployData.url
      : `https://${deployData.url}`
    : null;

  await supabase
    .from("projects")
    .update({
      status: "published",
      vercel_url: url,
      vercel_deployment_id: deployData.id || deployData.uid || null,
    })
    .eq("id", project.id);

  return { url, deployment: deployData, watermarked: !!project.watermark_enabled };
}

app.post("/publish", requireUser, async (req, res) => {
  try {
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

    // Publishing is allowed while watermarked: the live site carries the
    // paywall widget so the business owner can pay to remove it.
    const result = await deployProjectToVercel(supabase, project);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Publish failed" });
  }
});

app.post("/resolve-maps", requireUser, async (req, res) => {
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
    (seed.businessName && !snippet ? "perplexity/sonar" : OPENROUTER_MODEL);
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
    // Some models wrap JSON in prose — pull first object
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
    // Google often returns a JS shell — still enrich from the place name via a search model
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`moonrise-studio-worker listening on 0.0.0.0:${PORT}`);
});
