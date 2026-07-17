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

async function main() {
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .ilike("handle", "moonrise");

  if (profileError) throw profileError;

  let userId = profiles?.[0]?.id;
  if (!userId) {
    const { data: allProfiles, error } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .order("created_at", { ascending: true })
      .limit(20);
    if (error) throw error;
    console.error("No profile with handle 'moonrise'. Profiles:", allProfiles);
    process.exit(1);
  }

  const profile = profiles[0];
  const idempotencyKey = `manual-topup-${Date.now()}-moonrise-200`;

  const { data, error } = await supabase.rpc("credits_grant_topup", {
    p_user_id: userId,
    p_credits: 200,
    p_idempotency_key: idempotencyKey,
    p_stripe_customer_id: null,
  });

  if (error) throw error;

  const { data: account, error: accountError } = await supabase
    .from("credit_accounts")
    .select("subscription_credits, topup_credits, plan_id, plan_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (accountError) throw accountError;

  console.log(
    JSON.stringify(
      {
        userId,
        handle: profile.handle,
        displayName: profile.display_name,
        grant: data,
        balance: account,
        totalCredits: (account?.subscription_credits || 0) + (account?.topup_credits || 0),
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
