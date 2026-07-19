/**
 * Telegram alerts when a business owner pays to go live (watermark unlock).
 */

const CREATOR_SHARE_RATE = 0.8;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMoney(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "-";
  return "$" + (n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatWhen(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleString("en-US", {
      timeZone: process.env.SALE_NOTIFY_TIMEZONE || "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (_) {
    return raw;
  }
}

function telegramConfigured() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_SALE_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();
  return !!(token && chatId);
}

function payoutEmail(profile) {
  const payout =
    profile?.payout_profile &&
    typeof profile.payout_profile === "object" &&
    !Array.isArray(profile.payout_profile)
      ? profile.payout_profile
      : {};
  return String(payout.email || "").trim();
}

function payoutPhone(profile) {
  const payout =
    profile?.payout_profile &&
    typeof profile.payout_profile === "object" &&
    !Array.isArray(profile.payout_profile)
      ? profile.payout_profile
      : {};
  return String(payout.phone || "").trim();
}

function readBusinessContext(project) {
  return project?.business_context &&
    typeof project.business_context === "object" &&
    !Array.isArray(project.business_context)
    ? project.business_context
    : {};
}

function buildSaleMessage(payload) {
  const {
    businessName,
    category,
    address,
    phone,
    siteUrl,
    buyerEmail,
    paidAt,
    saleCents,
    creatorShareCents,
    platformShareCents,
    hostingMonthlyCents,
    checkoutTotalCents,
    creatorHandle,
    creatorDisplayName,
    creatorEmail,
    creatorPhone,
    creatorStudioEmail,
    leadMapsUrl,
    projectId,
    sessionId,
    leadId,
  } = payload;

  const lines = [
    "<b>🎉 New go-live sale</b>",
    "",
    "<b>Business</b>",
    escapeHtml(businessName || "Unknown business"),
    category ? "Category: " + escapeHtml(category) : "",
    address ? "Address: " + escapeHtml(address) : "",
    phone ? "Phone: " + escapeHtml(phone) : "",
    leadMapsUrl ? '<a href="' + escapeHtml(leadMapsUrl) + '">Google Maps</a>' : "",
    "",
    "<b>Creator</b>",
    creatorHandle ? "@" + escapeHtml(String(creatorHandle).replace(/^@/, "")) : "-",
    creatorDisplayName ? "Name: " + escapeHtml(creatorDisplayName) : "",
    creatorEmail ? "Payout email: " + escapeHtml(creatorEmail) : "",
    creatorStudioEmail && creatorStudioEmail !== creatorEmail
      ? "Studio login: " + escapeHtml(creatorStudioEmail)
      : "",
    creatorPhone ? "Phone: " + escapeHtml(creatorPhone) : "",
    "",
    "<b>Payment</b>",
    "Website price: " + escapeHtml(formatMoney(saleCents)),
    "Creator share (80%): " + escapeHtml(formatMoney(creatorShareCents)),
    "Moonrise (20%): " + escapeHtml(formatMoney(platformShareCents)),
    hostingMonthlyCents
      ? "Hosting: " + escapeHtml(formatMoney(hostingMonthlyCents)) + "/mo"
      : "",
    checkoutTotalCents != null && checkoutTotalCents !== saleCents
      ? "Checkout total (incl. hosting): " + escapeHtml(formatMoney(checkoutTotalCents))
      : "",
    buyerEmail ? "Buyer: " + escapeHtml(buyerEmail) : "",
    "When: " + escapeHtml(formatWhen(paidAt)),
    siteUrl ? '<a href="' + escapeHtml(siteUrl) + '">Live site</a>' : "",
    "",
    "Project: <code>" + escapeHtml(projectId || "-") + "</code>",
    leadId ? "Lead: <code>" + escapeHtml(leadId) + "</code>" : "",
    sessionId ? "Stripe: <code>" + escapeHtml(sessionId) + "</code>" : "",
  ];

  return lines.filter(Boolean).join("\n");
}

async function sendTelegramHtml(text) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_SALE_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chatId) {
    return { ok: false, skipped: true, reason: "telegram_not_configured" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: String(text || "").slice(0, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const msg = data?.description || data?.error || `Telegram HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { ok: true, messageId: data?.result?.message_id || null };
}

async function loadCreatorContext(supabase, ownerId) {
  if (!ownerId) return { profile: null, studioEmail: "" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, display_name, payout_profile")
    .eq("id", ownerId)
    .maybeSingle();

  let studioEmail = "";
  try {
    const { data } = await supabase.auth.admin.getUserById(ownerId);
    studioEmail = String(data?.user?.email || "").trim();
  } catch (_) {
    /* ignore */
  }

  return { profile: profile || null, studioEmail };
}

async function loadLeadContext(supabase, leadId) {
  const id = String(leadId || "").trim();
  if (!id) return null;
  const { data } = await supabase
    .from("leads")
    .select("business_name, address, phone, category, category_group, maps_url")
    .eq("id", id)
    .maybeSingle();
  return data || null;
}

/**
 * Send a one-time Telegram alert for a successful go-live sale.
 * Idempotent via project.business_context.saleTelegramSentAt.
 */
async function notifyGoLiveSale(supabase, { project, session, ownerId, siteUrl, hostingMonthlyCents }) {
  if (!telegramConfigured()) {
    return { ok: false, skipped: true, reason: "telegram_not_configured" };
  }
  if (!project?.id) {
    return { ok: false, skipped: true, reason: "missing_project" };
  }

  const ctx = readBusinessContext(project);
  if (ctx.saleTelegramSentAt) {
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  const saleCents = resolveGoLiveSaleCents(project, session);
  const creatorShareCents = Math.round(saleCents * CREATOR_SHARE_RATE);
  const platformShareCents = Math.max(0, saleCents - creatorShareCents);
  const checkoutTotalCents =
    session?.amount_total != null ? Math.round(Number(session.amount_total)) : null;
  const paidAt = ctx.paidAt || new Date().toISOString();
  const buyerEmail = buyerEmailFromSession(session);

  const [{ profile, studioEmail }, lead] = await Promise.all([
    loadCreatorContext(supabase, ownerId || project.user_id),
    loadLeadContext(supabase, project.lead_id || ctx.leadId),
  ]);

  const businessName =
    String(project.business_name || ctx.businessName || lead?.business_name || "").trim() ||
    "Unknown business";
  const category = String(ctx.category || lead?.category_group || lead?.category || "").trim();
  const address = String(ctx.address || lead?.address || "").trim();
  const phone = String(ctx.phone || lead?.phone || "").trim();
  const leadMapsUrl = String(lead?.maps_url || ctx.mapsUrl || "").trim();

  const text = buildSaleMessage({
    businessName,
    category,
    address,
    phone,
    siteUrl: String(siteUrl || project.vercel_url || "").trim(),
    buyerEmail,
    paidAt,
    saleCents,
    creatorShareCents,
    platformShareCents,
    hostingMonthlyCents,
    checkoutTotalCents,
    creatorHandle: String(profile?.handle || "").trim(),
    creatorDisplayName: String(profile?.display_name || "").trim(),
    creatorEmail: payoutEmail(profile),
    creatorPhone: payoutPhone(profile),
    creatorStudioEmail: studioEmail,
    leadMapsUrl,
    projectId: project.id,
    sessionId: String(session?.id || "").trim(),
    leadId: String(project.lead_id || ctx.leadId || "").trim(),
  });

  const sent = await sendTelegramHtml(text);

  const { data: latest } = await supabase
    .from("projects")
    .select("business_context")
    .eq("id", project.id)
    .maybeSingle();
  const latestCtx = readBusinessContext(latest);
  await supabase
    .from("projects")
    .update({
      business_context: {
        ...latestCtx,
        saleTelegramSentAt: new Date().toISOString(),
        saleTelegramMessageId: sent.messageId || null,
      },
    })
    .eq("id", project.id);

  return { ok: true, messageId: sent.messageId || null };
}

function buyerEmailFromSession(session) {
  const email = String(session?.customer_details?.email || session?.customer_email || "")
    .trim()
    .toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function resolveGoLiveSaleCents(project, session) {
  const fromProject = Math.round(Number(project?.price_cents));
  if (Number.isFinite(fromProject) && fromProject > 0) return fromProject;
  const fromSession = Math.round(Number(session?.amount_total));
  if (Number.isFinite(fromSession) && fromSession > 0) return fromSession;
  return 0;
}

module.exports = {
  CREATOR_SHARE_RATE,
  telegramConfigured,
  notifyGoLiveSale,
  buildSaleMessage,
  formatMoney,
};
