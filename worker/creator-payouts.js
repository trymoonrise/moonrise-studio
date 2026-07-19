/**
 * Record pending creator payouts when a go-live sale completes.
 */
const CREATOR_SHARE_RATE = 0.8;

function readPayoutProfile(profile) {
  const raw = profile?.payout_profile;
  const p = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    email: String(p.email || "").trim(),
    phone: String(p.phone || p.phoneNumber || "").trim(),
    payoutMethod: String(p.payoutMethod || p.payout_method || "")
      .trim()
      .toLowerCase(),
    payoutHandle: String(p.payoutHandle || p.payout_handle || "").trim(),
  };
}

async function recordPendingCreatorPayout(supabase, { projectId, ownerId, session, project }) {
  if (!supabase || !projectId || !ownerId) return { ok: false, skipped: true };

  const saleCents = Number(session?.amount_total);
  const fallbackCents = Number(project?.price_cents);
  const amountCents =
    Number.isFinite(saleCents) && saleCents > 0
      ? saleCents
      : Number.isFinite(fallbackCents) && fallbackCents > 0
        ? fallbackCents
        : 0;
  if (!amountCents) return { ok: false, skipped: true, reason: "no_amount" };

  let payout = readPayoutProfile(null);
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("payout_profile")
      .eq("id", ownerId)
      .maybeSingle();
    payout = readPayoutProfile(profile);
  } catch (e) {
    console.warn("recordPendingCreatorPayout profile lookup failed", e?.message || e);
  }

  let paymentId = null;
  const sessionId = String(session?.id || "").trim();
  if (sessionId) {
    try {
      const { data: payment } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      paymentId = payment?.id || null;
    } catch (e) {
      console.warn("recordPendingCreatorPayout payment lookup failed", e?.message || e);
    }
  }

  const creatorShareCents = Math.round(amountCents * CREATOR_SHARE_RATE);
  const platformShareCents = Math.max(0, amountCents - creatorShareCents);

  try {
    const { data: existing } = await supabase
      .from("creator_payouts")
      .select("status")
      .eq("project_id", projectId)
      .maybeSingle();
    if (String(existing?.status || "").toLowerCase() === "paid") {
      return { ok: true, skipped: true, reason: "already_paid" };
    }

    const { error } = await supabase.from("creator_payouts").upsert(
      {
        payment_id: paymentId,
        project_id: projectId,
        creator_user_id: ownerId,
        sale_cents: amountCents,
        creator_share_cents: creatorShareCents,
        platform_share_cents: platformShareCents,
        status: "pending",
        payout_method: payout.payoutMethod || null,
        payout_handle: payout.payoutHandle || null,
        payout_email: payout.email || null,
        payout_phone: payout.phone || null,
      },
      { onConflict: "project_id", ignoreDuplicates: false }
    );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn("recordPendingCreatorPayout upsert failed", e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
}

module.exports = {
  recordPendingCreatorPayout,
  CREATOR_SHARE_RATE,
};
