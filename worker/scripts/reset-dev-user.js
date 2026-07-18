/**
 * Reset a Moonrise Studio creator account to "new user" state for testing.
 *
 * Usage:
 *   node scripts/reset-dev-user.js --email trymoonrise@gmail.com --confirm
 *   node scripts/reset-dev-user.js --handle moonrise --confirm
 *   node scripts/reset-dev-user.js --user-id <uuid> --confirm
 *
 * Keeps auth.users (same login email/password). Clears onboarding, payout profile,
 * security card, credits, projects, payments, and storage avatars/site images.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in worker/.env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs(argv) {
  const args = { confirm: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--confirm") args.confirm = true;
    else if (token === "--email") args.email = argv[++i];
    else if (token === "--handle") args.handle = argv[++i];
    else if (token === "--user-id") args.userId = argv[++i];
    else if (token === "--help" || token === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Reset a creator account to new-user state.

Options:
  --email <email>     Match auth.users email
  --handle <handle>   Match profiles.handle (case-insensitive)
  --user-id <uuid>    Explicit user id
  --confirm           Required — performs the reset
  --help              Show this help
`);
}

async function resolveUserId(args) {
  if (args.userId) return args.userId;

  if (args.email) {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const user = (data?.users || []).find(
      (row) => String(row.email || "").toLowerCase() === String(args.email).toLowerCase()
    );
    if (!user) throw new Error("No auth user found for email: " + args.email);
    return user.id;
  }

  if (args.handle) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .ilike("handle", args.handle)
      .limit(1);
    if (error) throw error;
    if (!data?.[0]?.id) throw new Error("No profile found for handle: " + args.handle);
    return data[0].id;
  }

  throw new Error("Provide --email, --handle, or --user-id");
}

async function deleteStoragePrefix(bucket, prefix) {
  const limit = 100;
  let offset = 0;
  let removed = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      if (String(error.message || "").toLowerCase().includes("not found")) return removed;
      throw error;
    }
    const entries = data || [];
    if (!entries.length) break;
    const paths = entries
      .filter((entry) => entry?.name)
      .map((entry) => (prefix ? `${prefix}/${entry.name}` : entry.name));
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) throw removeError;
      removed += paths.length;
    }
    if (entries.length < limit) break;
    offset += limit;
  }
  return removed;
}

async function resetUser(userId) {
  const summary = {
    userId,
    deleted: {},
    storageRemoved: {},
  };

  const { data: beforeProfile, error: beforeProfileError } = await supabase
    .from("profiles")
    .select("handle, display_name, payout_profile, branding_defaults, mvp_plus")
    .eq("id", userId)
    .maybeSingle();
  if (beforeProfileError) throw beforeProfileError;

  const tables = [
    ["contact_leads", "user_id"],
    ["generation_jobs", "user_id"],
    ["payments", "user_id"],
    ["projects", "user_id"],
    ["credit_transactions", "user_id"],
  ];

  for (const [table, column] of tables) {
    const { count, error: countError } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);
    if (countError) throw countError;

    const { error } = await supabase.from(table).delete().eq(column, userId);
    if (error) throw error;
    summary.deleted[table] = count || 0;
  }

  const { error: creditError } = await supabase
    .from("credit_accounts")
    .update({
      subscription_credits: 0,
      topup_credits: 0,
      plan_id: null,
      plan_status: "none",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      period_start: null,
      period_end: null,
    })
    .eq("user_id", userId);
  if (creditError) throw creditError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      payout_profile: {},
      security_card_fingerprint: null,
      branding_defaults: {},
      mvp_plus: false,
      avatar_url: null,
      notification_prefs: { email: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  summary.storageRemoved["studio-avatars"] = await deleteStoragePrefix("studio-avatars", userId);
  summary.storageRemoved["site-images"] = await deleteStoragePrefix("site-images", userId);

  summary.before = {
    handle: beforeProfile?.handle || null,
    displayName: beforeProfile?.display_name || null,
    mvpPlus: !!beforeProfile?.mvp_plus,
    hadPayoutProfile: !!Object.keys(beforeProfile?.payout_profile || {}).length,
  };

  return summary;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.confirm) {
    console.error("Refusing to run without --confirm");
    printHelp();
    process.exit(1);
  }

  const userId = await resolveUserId(args);
  const summary = await resetUser(userId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...summary,
        browserCleanup: {
          localStorageKeys: [
            "ms_studio_onboarding_draft_v1",
            "ms_builder_onboard_done_v1",
            "ms_clients_cache_v1",
            "ms_dashboard_stats_v1",
            "moonrise-studio-auth",
          ],
          sessionStorageKeys: ["ms_force_studio_onboarding_replay"],
          note: "Clear site data for moonrise-studio.vercel.app or sign out and hard refresh.",
        },
        nextSteps: [
          "Sign out in the app (or clear moonrise-studio-auth from localStorage).",
          "Sign back in with the same email — you should land in onboarding.",
          "Use a Stripe test card if re-testing security card (or the same card if fingerprint was cleared).",
          "Re-claim developer credits from Pricing after reset if needed.",
        ],
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
