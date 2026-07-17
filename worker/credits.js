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
  const { data, error } = await supabase
    .from("credit_accounts")
    .select(
      "subscription_credits, topup_credits, plan_id, plan_status, period_end, stripe_customer_id, stripe_subscription_id"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const sub = Number(data?.subscription_credits) || 0;
  const top = Number(data?.topup_credits) || 0;
  const planId = String(data?.plan_id || "").toLowerCase();
  const planStatus = String(data?.plan_status || "none").toLowerCase();
  // MVP+ = any active Pricing subscription (Starter, Pro, or Business).
  // Top-ups alone do not unlock MVP+.
  const paidPlan =
    (planStatus === "active" || planStatus === "trialing") &&
    (planId === "starter" || planId === "pro" || planId === "business");
  return {
    subscriptionCredits: sub,
    topupCredits: top,
    totalCredits: sub + top,
    planId: data?.plan_id || null,
    planStatus: data?.plan_status || "none",
    paidPlan,
    mvpPlus: paidPlan,
    periodEnd: data?.period_end || null,
    stripeCustomerId: data?.stripe_customer_id || null,
    stripeSubscriptionId: data?.stripe_subscription_id || null,
    generationCost: GENERATION_CREDIT_COST,
  };
}

/** Keep profiles.mvp_plus aligned with the live Pricing subscription. */
async function syncProfileMvpPlus(supabase, userId, paidPlan) {
  const { error } = await supabase
    .from("profiles")
    .update({ mvp_plus: !!paidPlan })
    .eq("id", userId);
  if (error) throw error;
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
  planById,
  topupById,
  topupCatalog,
  quoteCustomTopup,
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
};
