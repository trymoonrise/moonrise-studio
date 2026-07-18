/**
 * Creator security card — $1 verify + refund, saved for off-session Terms enforcement.
 */

const SECURITY_VERIFY_CENTS = Math.max(
  50,
  Number(process.env.SECURITY_CARD_VERIFY_CENTS || 100)
);

const MAX_ENFORCEMENT_CENTS = Math.max(
  SECURITY_VERIFY_CENTS,
  Number(process.env.SECURITY_CARD_MAX_CHARGE_CENTS || 500000)
);

function normalizeSecurityCard(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const verifiedAt = String(raw.verifiedAt || raw.verified_at || "").trim();
  const paymentMethodId = String(raw.paymentMethodId || raw.payment_method_id || "").trim();
  if (!verifiedAt || !paymentMethodId) return null;
  return {
    verifiedAt,
    paymentMethodId,
    stripeCustomerId: String(raw.stripeCustomerId || raw.stripe_customer_id || "").trim() || null,
    brand: String(raw.brand || "").trim() || null,
    last4: String(raw.last4 || "").trim() || null,
    expMonth: Number(raw.expMonth || raw.exp_month) || null,
    expYear: Number(raw.expYear || raw.exp_year) || null,
  };
}

function securityCardFromProfile(profile) {
  const payout =
    profile?.payout_profile &&
    typeof profile.payout_profile === "object" &&
    !Array.isArray(profile.payout_profile)
      ? profile.payout_profile
      : {};
  return normalizeSecurityCard(payout.securityCard || payout.security_card);
}

async function loadProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("payout_profile, handle, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

async function saveSecurityCard(supabase, userId, payoutProfile, securityCard) {
  const next = {
    ...(payoutProfile && typeof payoutProfile === "object" ? payoutProfile : {}),
    securityCard,
  };
  const { error } = await supabase
    .from("profiles")
    .update({ payout_profile: next, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  return next;
}

async function getOrCreateStripeCustomer(stripe, supabase, userId, email) {
  const profile = await loadProfile(supabase, userId);
  const payout = profile.payout_profile || {};
  const existing = normalizeSecurityCard(payout.securityCard);
  if (existing?.stripeCustomerId) {
    return { customerId: existing.stripeCustomerId, payoutProfile: payout };
  }

  const { data: account } = await supabase
    .from("credit_accounts")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (account?.stripe_customer_id) {
    return { customerId: account.stripe_customer_id, payoutProfile: payout };
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { userId, type: "creator_security" },
  });

  await supabase.rpc("ensure_credit_account", { p_user_id: userId });
  await supabase
    .from("credit_accounts")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customer.id,
      },
      { onConflict: "user_id" }
    );

  return { customerId: customer.id, payoutProfile: payout };
}

async function startSecurityCardVerification(stripe, supabase, userId, email) {
  const { customerId } = await getOrCreateStripeCustomer(stripe, supabase, userId, email);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: SECURITY_VERIFY_CENTS,
    currency: "usd",
    customer: customerId,
    setup_future_usage: "off_session",
    metadata: {
      type: "security_card_verify",
      userId,
    },
    automatic_payment_methods: { enabled: true },
    description: "Moonrise security card confirmation (refunded immediately)",
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountCents: SECURITY_VERIFY_CENTS,
    stripeCustomerId: customerId,
  };
}

async function completeSecurityCardVerification(stripe, supabase, userId, paymentIntentId) {
  const intentId = String(paymentIntentId || "").trim();
  if (!intentId.startsWith("pi_")) {
    throw Object.assign(new Error("Valid payment intent required"), { status: 400 });
  }

  const pi = await stripe.paymentIntents.retrieve(intentId);
  if (String(pi.metadata?.userId || "") !== userId) {
    throw Object.assign(new Error("Payment does not belong to this account"), { status: 403 });
  }
  if (String(pi.metadata?.type || "") !== "security_card_verify") {
    throw Object.assign(new Error("Not a security card verification"), { status: 400 });
  }
  if (pi.status !== "succeeded") {
    throw Object.assign(new Error("Card verification has not completed yet"), { status: 409 });
  }

  const paymentMethodId =
    typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || "";
  if (!paymentMethodId) {
    throw Object.assign(new Error("No payment method on file"), { status: 400 });
  }

  const customerId =
    typeof pi.customer === "string" ? pi.customer : pi.customer?.id || "";
  if (!customerId) {
    throw Object.assign(new Error("Missing Stripe customer"), { status: 400 });
  }

  try {
    await stripe.refunds.create({ payment_intent: intentId });
  } catch (refundErr) {
    const msg = String(refundErr?.message || "");
    if (!/already been refunded|refund/i.test(msg)) {
      console.error("Security card refund failed:", refundErr.message);
      throw Object.assign(new Error("Card verified but refund failed — contact support"), {
        status: 502,
      });
    }
  }

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }).catch((e) => {
    if (!/already been attached/i.test(String(e.message || ""))) throw e;
  });

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = pm.card || {};
  const verifiedAt = new Date().toISOString();
  const securityCard = {
    verifiedAt,
    paymentMethodId,
    stripeCustomerId: customerId,
    brand: card.brand || null,
    last4: card.last4 || null,
    expMonth: card.exp_month || null,
    expYear: card.exp_year || null,
  };

  const profile = await loadProfile(supabase, userId);
  const payoutProfile = await saveSecurityCard(
    supabase,
    userId,
    profile.payout_profile,
    securityCard
  );

  return { securityCard, payoutProfile };
}

/**
 * Charge a creator's saved security card off-session (Terms enforcement, chargebacks, etc.).
 * Requires the card to have been verified with setup_future_usage: off_session.
 */
async function chargeSecurityCard(stripe, supabase, userId, opts) {
  const amountCents = Math.round(Number(opts?.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw Object.assign(new Error("amountCents must be at least 50"), { status: 400 });
  }
  if (amountCents > MAX_ENFORCEMENT_CENTS) {
    throw Object.assign(
      new Error(`amountCents exceeds maximum (${MAX_ENFORCEMENT_CENTS})`),
      { status: 400 }
    );
  }

  const reason = String(opts?.reason || "").trim().slice(0, 500);
  if (!reason) {
    throw Object.assign(new Error("reason is required"), { status: 400 });
  }

  const profile = await loadProfile(supabase, userId);
  const card = securityCardFromProfile(profile);
  if (!card?.paymentMethodId || !card?.stripeCustomerId) {
    throw Object.assign(new Error("Creator has no verified security card on file"), { status: 404 });
  }

  const referenceId = String(opts?.referenceId || opts?.reference_id || "").trim().slice(0, 120);

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: card.stripeCustomerId,
      payment_method: card.paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        type: "security_card_enforcement",
        userId: String(userId),
        reason,
        referenceId: referenceId || undefined,
      },
      description: "Moonrise Terms enforcement",
    });
  } catch (err) {
    const code = err?.code || err?.raw?.code || "";
    if (code === "authentication_required") {
      throw Object.assign(
        new Error("Card requires authentication — cannot charge off-session"),
        { status: 409, code }
      );
    }
    throw Object.assign(new Error(err.message || "Charge failed"), {
      status: err.statusCode === 402 ? 402 : 502,
      code,
    });
  }

  if (paymentIntent.status !== "succeeded") {
    throw Object.assign(
      new Error("Charge did not succeed: " + paymentIntent.status),
      { status: 402, paymentIntentId: paymentIntent.id }
    );
  }

  return {
    ok: true,
    paymentIntentId: paymentIntent.id,
    amountCents,
    status: paymentIntent.status,
    userId,
    handle: String(profile.handle || "").trim(),
    cardLast4: card.last4 || null,
    reason,
    referenceId: referenceId || null,
  };
}

function publicSecurityCardConfig() {
  return {
    verifyAmountCents: SECURITY_VERIFY_CENTS,
    verifyAmountLabel:
      SECURITY_VERIFY_CENTS % 100 === 0
        ? `$${SECURITY_VERIFY_CENTS / 100}`
        : `$${(SECURITY_VERIFY_CENTS / 100).toFixed(2)}`,
    publishableKey: String(process.env.STRIPE_PUBLISHABLE_KEY || "").trim(),
  };
}

function publicSecurityCardStatus(profile) {
  const card = securityCardFromProfile(profile);
  return {
    verified: !!card,
    securityCard: card,
  };
}

module.exports = {
  SECURITY_VERIFY_CENTS,
  MAX_ENFORCEMENT_CENTS,
  normalizeSecurityCard,
  securityCardFromProfile,
  startSecurityCardVerification,
  completeSecurityCardVerification,
  chargeSecurityCard,
  publicSecurityCardConfig,
  publicSecurityCardStatus,
};
