/**
 * Credit billing helpers — plans, top-ups, balance, deduct/refund via Supabase RPC.
 */

const GENERATION_CREDIT_COST = 5;

const CREDIT_PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 500,
    credits: 100,
    envPriceId: "STRIPE_PLAN_STARTER_PRICE_ID",
    description: "100 AI credits per month",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 1000,
    credits: 200,
    envPriceId: "STRIPE_PLAN_PRO_PRICE_ID",
    description: "200 AI credits per month",
    popular: true,
  },
  business: {
    id: "business",
    name: "Business",
    priceCents: 2000,
    credits: 500,
    envPriceId: "STRIPE_PLAN_BUSINESS_PRICE_ID",
    description: "500 AI credits per month",
  },
};

const CREDIT_TOPUPS = {
  small: { id: "small", priceCents: 200, credits: 40, label: "$2" },
  medium: { id: "medium", priceCents: 500, credits: 110, label: "$5" },
  large: { id: "large", priceCents: 1000, credits: 250, label: "$10" },
};

const TOPUP_CENTS_PER_CREDIT = Math.max(
  1,
  Number(process.env.TOPUP_CENTS_PER_CREDIT || 5)
);
const TOPUP_MIN_DOLLARS = Math.max(1, Number(process.env.TOPUP_MIN_DOLLARS || 1));
const TOPUP_MAX_DOLLARS = Math.max(
  TOPUP_MIN_DOLLARS,
  Number(process.env.TOPUP_MAX_DOLLARS || 1000)
);

const DONATE_MIN_DOLLARS = Math.max(1, Number(process.env.DONATE_MIN_DOLLARS || 1));
const DONATE_MAX_DOLLARS = Math.max(
  DONATE_MIN_DOLLARS,
  Number(process.env.DONATE_MAX_DOLLARS || 1000)
);
const DONATE_DEFAULT_DOLLARS = Math.min(
  DONATE_MAX_DOLLARS,
  Math.max(DONATE_MIN_DOLLARS, Number(process.env.DONATE_DEFAULT_DOLLARS || 25))
);

const DONATE_BENEFITS = [
  "View code and download HTML in Builder",
  "Everything free in the Store",
  "Support Moonrise — keep generation free for everyone",
];

function topupCatalog() {
  return {
    centsPerCredit: TOPUP_CENTS_PER_CREDIT,
    creditsPerDollar: 100 / TOPUP_CENTS_PER_CREDIT,
    minDollars: TOPUP_MIN_DOLLARS,
    maxDollars: TOPUP_MAX_DOLLARS,
  };
}

function quoteCustomTopup(amountDollars) {
  const dollars = Number(amountDollars);
  if (!Number.isFinite(dollars)) return null;
  if (dollars < TOPUP_MIN_DOLLARS || dollars > TOPUP_MAX_DOLLARS) return null;
  const priceCents = Math.round(dollars * 100);
  const credits = Math.floor(priceCents / TOPUP_CENTS_PER_CREDIT);
  if (credits <= 0) return null;
  return {
    priceCents,
    credits,
    priceLabel: `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`,
    dollars: priceCents / 100,
  };
}

function resolveTopupFromSession(session) {
  const meta = session?.metadata || {};
  const customCredits = Number(meta.credits);
  const customCents = Number(meta.priceCents) || Number(session?.amount_total);
  if (
    (meta.custom === "1" || meta.topupId === "custom") &&
    customCredits > 0 &&
    customCents > 0
  ) {
    return {
      id: "custom",
      priceCents: customCents,
      credits: customCredits,
      label: `$${(customCents / 100).toFixed(customCents % 100 === 0 ? 0 : 2)}`,
    };
  }
  return topupById(meta.topupId);
}

function planById(planId) {
  return CREDIT_PLANS[String(planId || "").toLowerCase()] || null;
}

function topupById(topupId) {
  return CREDIT_TOPUPS[String(topupId || "").toLowerCase()] || null;
}

async function ensureAccount(supabase, userId) {
  await supabase.rpc("ensure_credit_account", { p_user_id: userId });
}

async function getBalance(supabase, userId) {
  await ensureAccount(supabase, userId);
  const [accountRes, profileRes] = await Promise.all([
    supabase
      .from("credit_accounts")
      .select(
        "subscription_credits, topup_credits, plan_id, plan_status, period_end, stripe_customer_id, stripe_subscription_id"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("mvp_plus").eq("id", userId).maybeSingle(),
  ]);
  const { data, error } = accountRes;
  if (error) throw error;
  const sub = Number(data?.subscription_credits) || 0;
  const top = Number(data?.topup_credits) || 0;
  const mvpPlus = !!profileRes.data?.mvp_plus;
  const planStatus = data?.plan_status || "none";
  const hasActiveSubscription = String(planStatus).toLowerCase() === "active";
  return {
    subscriptionCredits: sub,
    topupCredits: top,
    totalCredits: sub + top,
    planId: data?.plan_id || null,
    planStatus,
    hasActiveSubscription,
    codeAccess: hasActiveSubscription,
    paidPlan: hasActiveSubscription,
    mvpPlus,
    periodEnd: data?.period_end || null,
    stripeCustomerId: data?.stripe_customer_id || null,
    stripeSubscriptionId: data?.stripe_subscription_id || null,
    generationCost: 0,
  };
}

function quoteDonation(amountDollars) {
  const dollars = Number(amountDollars);
  if (!Number.isFinite(dollars)) return null;
  if (dollars < DONATE_MIN_DOLLARS || dollars > DONATE_MAX_DOLLARS) return null;
  const priceCents = Math.round(dollars * 100);
  if (priceCents < DONATE_MIN_DOLLARS * 100) return null;
  return {
    priceCents,
    priceLabel: `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`,
    dollars: priceCents / 100,
  };
}

async function syncProfileMvpPlus(supabase, userId, hasActiveSubscription) {
  if (!userId || !hasActiveSubscription) return;
  const { error } = await supabase
    .from("profiles")
    .update({ mvp_plus: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

function donateMonthlyAmountCents() {
  return Math.max(
    500,
    Number(process.env.STRIPE_DONATE_AMOUNT_CENTS || process.env.STRIPE_MVP_AMOUNT_CENTS || 500)
  );
}

function donateAmountCents() {
  return donateMonthlyAmountCents();
}

function donateMonthlyPriceLabel() {
  const cents = donateMonthlyAmountCents();
  const dollars = cents / 100;
  return `$${dollars.toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

function donatePriceLabel() {
  return donateMonthlyPriceLabel();
}

function donateOneTimeLineItem(quote) {
  return [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Moonrise Studio Support",
          description: "One-time donation — thank you for fueling Moonrise.",
        },
        unit_amount: quote.priceCents,
      },
      quantity: 1,
    },
  ];
}

function donateSubscriptionLineItem(quote) {
  const priceId = String(
    process.env.STRIPE_DONATE_PRICE_ID || process.env.STRIPE_MVP_PRICE_ID || ""
  ).trim();
  if (!quote && priceId) {
    return [{ price: priceId, quantity: 1 }];
  }
  const cents = quote?.priceCents ?? donateMonthlyAmountCents();
  return [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Moonrise MVP+ Support",
          description:
            "Monthly support — MVP+ perks: Builder code access and free Store items while subscribed.",
        },
        unit_amount: cents,
        recurring: { interval: "month" },
      },
      quantity: 1,
    },
  ];
}

function hasActiveMvpDonationSubscription(balance) {
  return (
    String(balance?.planId || "") === "mvp_donate" &&
    String(balance?.planStatus || "").toLowerCase() === "active"
  );
}

function hasCreditPlanSubscription(balance) {
  const planId = String(balance?.planId || "").toLowerCase();
  return (
    (planId === "starter" || planId === "pro" || planId === "business") &&
    String(balance?.planStatus || "").toLowerCase() === "active"
  );
}

function publicDonateConfig(balance) {
  const cents = donateMonthlyAmountCents();
  const monthlyDefaultDollars = cents / 100;
  const mvpPlus = !!balance?.mvpPlus;
  const hasActiveSubscription = hasActiveMvpDonationSubscription(balance);
  const canManageBilling =
    !!balance?.stripeCustomerId && (hasActiveSubscription || mvpPlus);
  const oneTimeQuote = quoteDonation(DONATE_DEFAULT_DOLLARS);
  const monthlyQuote = quoteDonation(monthlyDefaultDollars);
  return {
    mvpPlus,
    hasActiveSubscription,
    canManageBilling,
    monthlyPriceCents: cents,
    monthlyPriceLabel: donateMonthlyPriceLabel(),
    monthlyDefaultDollars: monthlyQuote?.dollars || monthlyDefaultDollars,
    oneTimeDefaultDollars: oneTimeQuote?.dollars || DONATE_DEFAULT_DOLLARS,
    oneTimePriceLabel: oneTimeQuote?.priceLabel || `$${DONATE_DEFAULT_DOLLARS}`,
    donateMinDollars: DONATE_MIN_DOLLARS,
    donateMaxDollars: DONATE_MAX_DOLLARS,
    benefits: DONATE_BENEFITS,
  };
}

async function grantMvpDonation(supabase, opts) {
  const userId = opts.userId;
  const sessionId = String(opts.sessionId || "").trim();
  const stripeCustomerId = opts.stripeCustomerId || null;
  const stripeSubscriptionId = opts.stripeSubscriptionId || null;
  const periodEnd = opts.periodEnd || null;
  if (!userId) throw new Error("userId required");
  await ensureAccount(supabase, userId);

  const { data: account, error: accountReadErr } = await supabase
    .from("credit_accounts")
    .select("plan_id, plan_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (accountReadErr) throw accountReadErr;

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ mvp_plus: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileErr) throw profileErr;

  const accountUpdate = {
    ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
  };
  const creditPlanActive = hasCreditPlanSubscription({
    planId: account?.plan_id,
    planStatus: account?.plan_status,
  });

  if (stripeSubscriptionId) {
    if (!creditPlanActive) {
      accountUpdate.plan_id = "mvp_donate";
      accountUpdate.plan_status = "active";
      accountUpdate.stripe_subscription_id = stripeSubscriptionId;
      accountUpdate.period_end = periodEnd;
    }
  } else if (sessionId && !creditPlanActive) {
    accountUpdate.stripe_subscription_id = `manual_donate_${sessionId}`;
    accountUpdate.plan_id = "mvp_donate";
    accountUpdate.plan_status = "active";
  }

  if (Object.keys(accountUpdate).length) {
    const { error: accountErr } = await supabase
      .from("credit_accounts")
      .update(accountUpdate)
      .eq("user_id", userId);
    if (accountErr) throw accountErr;
  }

  return { mvpPlus: true };
}

async function revokeMvpDonation(supabase, userId) {
  if (!userId) throw new Error("userId required");

  const { data: account, error: accountReadErr } = await supabase
    .from("credit_accounts")
    .select("plan_id, plan_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (accountReadErr) throw accountReadErr;

  if (String(account?.plan_id || "") === "mvp_donate") {
    const { error: accountErr } = await supabase
      .from("credit_accounts")
      .update({
        plan_id: null,
        plan_status: "none",
        stripe_subscription_id: null,
        period_end: null,
      })
      .eq("user_id", userId);
    if (accountErr) throw accountErr;
  }

  const keepMvpPlus = hasCreditPlanSubscription({
    planId: account?.plan_id,
    planStatus: account?.plan_status,
  });
  if (!keepMvpPlus) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ mvp_plus: false, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (profileErr) throw profileErr;
  }

  return { mvpPlus: keepMvpPlus };
}

async function grantSubscription(supabase, opts) {
  const {
    userId,
    credits,
    planId,
    idempotencyKey,
    stripeCustomerId,
    stripeSubscriptionId,
    periodStart,
    periodEnd,
  } = opts;
  const { data, error } = await supabase.rpc("credits_grant_subscription", {
    p_user_id: userId,
    p_credits: credits,
    p_plan_id: planId,
    p_idempotency_key: idempotencyKey,
    p_stripe_customer_id: stripeCustomerId || null,
    p_stripe_subscription_id: stripeSubscriptionId || null,
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });
  if (error) throw error;
  return data;
}

async function grantTopup(supabase, opts) {
  const { userId, credits, idempotencyKey, stripeCustomerId } = opts;
  const { data, error } = await supabase.rpc("credits_grant_topup", {
    p_user_id: userId,
    p_credits: credits,
    p_idempotency_key: idempotencyKey,
    p_stripe_customer_id: stripeCustomerId || null,
  });
  if (error) throw error;
  return data;
}

async function deductCredits(supabase, opts) {
  const { userId, amount, idempotencyKey, reason } = opts;
  const { data, error } = await supabase.rpc("credits_deduct", {
    p_user_id: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_reason: reason || "usage",
  });
  if (error) {
    if (String(error.message || "").includes("insufficient_credits")) {
      const err = new Error("Insufficient credits");
      err.code = "INSUFFICIENT_CREDITS";
      err.status = 402;
      throw err;
    }
    throw error;
  }
  return data;
}

async function refundCredits(supabase, opts) {
  const { userId, amount, idempotencyKey, reason } = opts;
  const { data, error } = await supabase.rpc("credits_refund", {
    p_user_id: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_reason: reason || "refund",
  });
  if (error) throw error;
  return data;
}

async function deactivatePlan(supabase, userId) {
  const { error } = await supabase.rpc("credits_deactivate_plan", {
    p_user_id: userId,
  });
  if (error) throw error;
}

function planLineItem(plan, stripe) {
  const priceId = String(process.env[plan.envPriceId] || "").trim();
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }
  return [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: `Moonrise Studio ${plan.name}`,
          description: `${plan.credits} AI credits per month - website generation, code access, and Studio perks`,
        },
        unit_amount: plan.priceCents,
        recurring: { interval: "month" },
      },
      quantity: 1,
    },
  ];
}

function customTopupLineItem(quote) {
  return [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Moonrise Studio Credit Top-up",
          description: `${quote.credits} AI credits - never expire`,
        },
        unit_amount: quote.priceCents,
      },
      quantity: 1,
    },
  ];
}

function topupLineItem(topup) {
  return [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: "Moonrise Studio Credit Top-up",
          description: `${topup.credits} AI credits - never expire`,
        },
        unit_amount: topup.priceCents,
      },
      quantity: 1,
    },
  ];
}

function publicPlansCatalog() {
  return {
    generationCost: GENERATION_CREDIT_COST,
    plans: Object.values(CREDIT_PLANS).map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      priceLabel: `$${p.priceCents / 100}`,
      credits: p.credits,
      description: p.description,
      popular: !!p.popular,
      websitesPerMonth: Math.floor(p.credits / GENERATION_CREDIT_COST),
    })),
    topup: topupCatalog(),
  };
}

module.exports = {
  GENERATION_CREDIT_COST,
  CREDIT_PLANS,
  CREDIT_TOPUPS,
  TOPUP_CENTS_PER_CREDIT,
  TOPUP_MIN_DOLLARS,
  TOPUP_MAX_DOLLARS,
  DONATE_MIN_DOLLARS,
  DONATE_MAX_DOLLARS,
  DONATE_DEFAULT_DOLLARS,
  planById,
  topupById,
  topupCatalog,
  quoteCustomTopup,
  quoteDonation,
  donateOneTimeLineItem,
  resolveTopupFromSession,
  ensureAccount,
  getBalance,
  syncProfileMvpPlus,
  grantSubscription,
  grantTopup,
  deductCredits,
  refundCredits,
  deactivatePlan,
  planLineItem,
  topupLineItem,
  customTopupLineItem,
  publicPlansCatalog,
  donateAmountCents,
  donateMonthlyAmountCents,
  donateSubscriptionLineItem,
  donatePriceLabel,
  publicDonateConfig,
  DONATE_BENEFITS,
  hasActiveMvpDonationSubscription,
  grantMvpDonation,
  revokeMvpDonation,
};
