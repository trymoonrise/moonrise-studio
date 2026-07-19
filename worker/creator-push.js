/**
 * Web Push alerts for creators when a client pays to go live (My Clients).
 * Idempotent via project.business_context.creatorPushSentAt.
 */
const webpush = require("web-push");

function vapidConfigured() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  return !!(publicKey && privateKey);
}

function vapidSubject() {
  const fromEnv = String(process.env.VAPID_SUBJECT || "").trim();
  if (fromEnv) return fromEnv;
  const app = String(process.env.PUBLIC_APP_URL || "https://trymoonrise.com").trim();
  try {
    return "mailto:noreply@" + new URL(app).hostname;
  } catch (_) {
    return "mailto:noreply@trymoonrise.com";
  }
}

function configureWebPush() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    vapidSubject(),
    String(process.env.VAPID_PUBLIC_KEY).trim(),
    String(process.env.VAPID_PRIVATE_KEY).trim()
  );
  return true;
}

function readBusinessContext(project) {
  const ctx = project?.business_context;
  if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) return { ...ctx };
  return {};
}

function prefsAllowClientPurchases(prefs) {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return false;
  if (prefs.clientPurchases === true) return true;
  if (prefs.purchaseAlerts === true) return true;
  return false;
}

function moneyLabel(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n) || n < 0) return "";
  return "$" + (n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildClientPurchasePayload({ businessName, amountCents, projectId }) {
  const name = String(businessName || "A client").trim() || "A client";
  const amount = moneyLabel(amountCents);
  const body = amount
    ? name + " purchased their website (" + amount + "). Open My Clients."
    : name + " purchased their website. Open My Clients.";
  return {
    title: "New client · My Clients",
    body,
    url: "clients.html",
    tag: projectId ? "client-purchase-" + projectId : "client-purchase",
    projectId: projectId || null,
  };
}

async function upsertPushSubscription(supabase, { userId, endpoint, keys, userAgent }) {
  const p256dh = String(keys?.p256dh || "").trim();
  const auth = String(keys?.auth || "").trim();
  const ep = String(endpoint || "").trim();
  if (!userId || !ep || !p256dh || !auth) {
    throw new Error("endpoint and keys.p256dh / keys.auth are required");
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: ep,
        p256dh,
        auth,
        user_agent: userAgent ? String(userAgent).slice(0, 400) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )
    .select("id, endpoint")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deletePushSubscription(supabase, { userId, endpoint }) {
  const ep = String(endpoint || "").trim();
  if (!userId || !ep) throw new Error("endpoint required");
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", ep);
  if (error) throw error;
  return { ok: true };
}

async function deletePushSubscriptionByEndpoint(supabase, endpoint) {
  const ep = String(endpoint || "").trim();
  if (!ep) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", ep);
}

async function sendPushToUser(supabase, userId, payload) {
  if (!configureWebPush()) {
    return { ok: false, skipped: true, reason: "vapid_not_configured" };
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;
  if (!rows?.length) {
    return { ok: false, skipped: true, reason: "no_subscriptions" };
  }

  const body = JSON.stringify(payload || {});
  let sent = 0;
  const stale = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent += 1;
      } catch (err) {
        const status = Number(err?.statusCode || err?.status || 0);
        if (status === 404 || status === 410) {
          stale.push(row.endpoint);
        } else {
          console.warn("Web push send failed:", err?.message || err);
        }
      }
    })
  );

  for (const endpoint of stale) {
    try {
      await deletePushSubscriptionByEndpoint(supabase, endpoint);
    } catch (_) {
      /* ignore */
    }
  }

  return { ok: sent > 0, sent, stale: stale.length, total: rows.length };
}

/**
 * Notify the project creator that a client paid to go live.
 */
async function notifyCreatorClientPurchase(
  supabase,
  { project, session, ownerId, siteUrl }
) {
  if (!project?.id) {
    return { ok: false, skipped: true, reason: "missing_project" };
  }

  const creatorId = ownerId || project.user_id || null;
  if (!creatorId) {
    return { ok: false, skipped: true, reason: "missing_owner" };
  }

  const ctx = readBusinessContext(project);
  if (ctx.creatorPushSentAt) {
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", creatorId)
    .maybeSingle();
  if (profileErr) throw profileErr;

  if (!prefsAllowClientPurchases(profile?.notification_prefs)) {
    return { ok: false, skipped: true, reason: "prefs_disabled" };
  }

  const businessName =
    String(project.business_name || ctx.businessName || "").trim() || "A client";
  const amountCents =
    session?.amount_total != null
      ? Math.round(Number(session.amount_total))
      : Number(project.price_cents) || null;

  const payload = buildClientPurchasePayload({
    businessName,
    amountCents,
    projectId: project.id,
  });
  if (siteUrl) payload.siteUrl = String(siteUrl);

  const result = await sendPushToUser(supabase, creatorId, payload);

  if (result.ok || result.reason === "no_subscriptions") {
    // Mark sent when delivered, or when prefs were on but no device yet
    // (avoid hammering on every fulfill retry). Prefer marking only on ok.
    if (result.ok) {
      await supabase
        .from("projects")
        .update({
          business_context: {
            ...ctx,
            creatorPushSentAt: new Date().toISOString(),
          },
        })
        .eq("id", project.id);
    }
  }

  return result;
}

module.exports = {
  vapidConfigured,
  upsertPushSubscription,
  deletePushSubscription,
  notifyCreatorClientPurchase,
  sendPushToUser,
  prefsAllowClientPurchases,
};
