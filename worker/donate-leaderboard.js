/**
 * Donation leaderboard — aggregate paid MVP+ support by supporter.
 */

const DONOR_MESSAGE_MAX = 120;

function sanitizeDonorMessage(raw) {
  let text = String(raw || "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/<[^>]*>/g, "");
  if (text.length > DONOR_MESSAGE_MAX) {
    text = text.slice(0, DONOR_MESSAGE_MAX);
  }
  return text || null;
}

function formatDonationTotal(cents) {
  const value = Math.max(0, Number(cents) || 0);
  const dollars = value / 100;
  if (value % 100 === 0) return `$${dollars.toFixed(0)}`;
  return `$${dollars.toFixed(2)}`;
}

function displayNameFromProfile(profile) {
  const display = String(profile?.display_name || "").trim();
  if (display) return display;
  const handle = String(profile?.handle || "").trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  return "Supporter";
}

function initialsFromName(name) {
  const parts = String(name || "")
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function getDonationLeaderboard(supabase, limit = 10) {
  const cap = Math.min(Math.max(Number(limit) || 10, 1), 25);

  const { data: payments, error } = await supabase
    .from("payments")
    .select("user_id, amount_cents, donor_message, created_at")
    .eq("status", "paid")
    .eq("kind", "mvp_donation");

  if (error) throw error;

  const byUser = new Map();
  for (const row of payments || []) {
    const userId = row.user_id;
    if (!userId) continue;
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        totalCents: 0,
        message: null,
        messageAt: null,
      });
    }
    const agg = byUser.get(userId);
    agg.totalCents += Math.max(0, Number(row.amount_cents) || 0);
    const msg = String(row.donor_message || "").trim();
    const createdAt = row.created_at || null;
    if (msg && (!agg.messageAt || String(createdAt) > String(agg.messageAt))) {
      agg.message = msg;
      agg.messageAt = createdAt;
    }
  }

  const userIds = [...byUser.keys()];
  if (!userIds.length) return [];

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", userIds);
  if (profileErr) throw profileErr;

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return [...byUser.entries()]
    .map(([userId, agg]) => {
      const profile = profileMap.get(userId) || {};
      const name = displayNameFromProfile(profile);
      return {
        totalCents: agg.totalCents,
        totalLabel: formatDonationTotal(agg.totalCents),
        message: agg.message,
        name,
        handle: String(profile.handle || "").trim() || null,
        avatarUrl: profile.avatar_url || null,
        initials: initialsFromName(name),
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, cap)
    .map((row, index) => ({
      rank: index + 1,
      name: row.name,
      handle: row.handle,
      avatarUrl: row.avatarUrl,
      initials: row.initials,
      totalCents: row.totalCents,
      totalLabel: row.totalLabel,
      message: row.message,
    }));
}

module.exports = {
  DONOR_MESSAGE_MAX,
  sanitizeDonorMessage,
  getDonationLeaderboard,
  formatDonationTotal,
};
