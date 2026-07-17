/**
 * Map backend failures to short, actionable messages for the Studio UI.
 */

const STRIPE_CHECKOUT_WRITE_MSG =
  'Stripe key is missing Checkout Sessions Write. In Stripe Dashboard → API keys → edit this restricted key, enable "Checkout Sessions: Write", save, then retry payment.';

const STRIPE_CHECKOUT_READ_MSG =
  'Stripe key is missing Checkout Sessions Read. In Stripe Dashboard → API keys → edit this restricted key, enable "Checkout Sessions: Read", save, then retry.';

const STRIPE_BILLING_PORTAL_MSG =
  'Stripe key is missing Billing Portal access. In Stripe Dashboard → API keys → edit this restricted key, enable "Billing Portal: Write", save, then retry.';

const STRIPE_SUBSCRIPTIONS_MSG =
  'Stripe key is missing Subscriptions Read. In Stripe Dashboard → API keys → edit this restricted key, enable "Subscriptions: Read", save, then retry.';

const STRIPE_GENERIC_PERM_MSG =
  'Stripe key is missing required permissions. In Stripe Dashboard → API keys → edit this restricted key, enable Checkout Sessions (Read + Write), Billing Portal (Write), and Subscriptions (Read), save, then retry payment.';

const STRIPE_NOT_CONFIGURED_MSG =
  "Stripe is not configured on the server. Add STRIPE_SECRET_KEY in your deployment environment (Vercel → Settings → Environment Variables), redeploy, then retry payment.";

const OPENROUTER_NOT_CONFIGURED_MSG =
  "Website generation is not configured. Add OPENROUTER_API_KEY in your deployment environment, redeploy the worker, then try again.";

const VERCEL_NOT_CONFIGURED_MSG =
  "Publishing is not configured. Add VERCEL_TOKEN in your deployment environment, redeploy the worker, then try publishing again.";

function isStripePermissionError(err) {
  const msg = String(err?.message || "");
  return (
    err?.type === "StripePermissionError" ||
    err?.code === "permission_denied" ||
    /does not have the required permissions|permission denied|missing the required permissions|checkout_session_write/i.test(
      msg
    )
  );
}

function stripePermissionMessage(err) {
  if (!isStripePermissionError(err)) return null;
  const msg = String(err?.message || "").toLowerCase();

  if (/checkout_session_write|checkout sessions: write|checkout sessions write/.test(msg)) {
    return STRIPE_CHECKOUT_WRITE_MSG;
  }
  if (/checkout_session_read|checkout sessions: read|checkout sessions read/.test(msg)) {
    return STRIPE_CHECKOUT_READ_MSG;
  }
  if (/billing_portal|billing portal/.test(msg)) {
    return STRIPE_BILLING_PORTAL_MSG;
  }
  if (/subscriptions?_read|subscriptions: read|subscriptions read/.test(msg)) {
    return STRIPE_SUBSCRIPTIONS_MSG;
  }
  if (/checkout/.test(msg)) return STRIPE_CHECKOUT_WRITE_MSG;
  return STRIPE_GENERIC_PERM_MSG;
}

function formatApiError(err, fallback) {
  const stripeMsg = stripePermissionMessage(err);
  if (stripeMsg) {
    return { message: stripeMsg, status: 403, code: "STRIPE_PERMISSION_DENIED" };
  }

  const raw = String(err?.message || "").trim();
  const lower = raw.toLowerCase();

  if (!raw && fallback) {
    return { message: fallback, status: err?.status || 500, code: err?.code || undefined };
  }

  if (/^stripe not configured$/i.test(raw)) {
    return { message: STRIPE_NOT_CONFIGURED_MSG, status: 500, code: "STRIPE_NOT_CONFIGURED" };
  }

  if (/openrouter is not configured|minimax website generation is not configured/i.test(raw)) {
    return { message: OPENROUTER_NOT_CONFIGURED_MSG, status: 503, code: "OPENROUTER_NOT_CONFIGURED" };
  }

  if (/vercel.*not configured|vercel_token is required/i.test(lower)) {
    return { message: VERCEL_NOT_CONFIGURED_MSG, status: 500, code: "VERCEL_NOT_CONFIGURED" };
  }

  if (err?.code === "INSUFFICIENT_CREDITS") {
    return {
      message: raw || "Not enough credits for this action. Top up on Pricing or upgrade your plan.",
      status: 402,
      code: "INSUFFICIENT_CREDITS",
    };
  }

  return {
    message: raw || fallback || "Something went wrong. Please try again.",
    status: err?.status || 500,
    code: err?.code || undefined,
  };
}

function stripeMissingResponse() {
  return { message: STRIPE_NOT_CONFIGURED_MSG, status: 500, code: "STRIPE_NOT_CONFIGURED" };
}

function respondApiError(res, err, fallback, defaultStatus = 500) {
  const formatted = formatApiError(err, fallback);
  const status = formatted.status || defaultStatus;
  const body = { error: formatted.message };
  if (formatted.code) body.code = formatted.code;
  return res.status(status).json(body);
}

function sendStripeMissing(res) {
  const formatted = stripeMissingResponse();
  return res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
}

module.exports = {
  formatApiError,
  respondApiError,
  sendStripeMissing,
  stripeMissingResponse,
  stripePermissionMessage,
  STRIPE_CHECKOUT_WRITE_MSG,
};
