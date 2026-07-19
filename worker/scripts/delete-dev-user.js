/**
 * Permanently delete a Moonrise Studio account (auth + profile + related data).
 *
 * Usage:
 *   node scripts/delete-dev-user.js --email teambrilliantt@hotmail.com --confirm
 *   node scripts/delete-dev-user.js --user-id <uuid> --confirm
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const crypto = require("crypto");
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
    else if (token === "--user-id") args.userId = argv[++i];
    else if (token === "--help" || token === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`Permanently delete a Moonrise Studio account.

Options:
  --email <email>     Match auth.users email
  --user-id <uuid>    Explicit user id
  --confirm           Required - performs the deletion
  --help              Show this help
`);
}

function emailHash(email) {
  return crypto.createHash("sha256").update("email:" + String(email || "").trim().toLowerCase(), "utf8").digest("hex");
}

async function resolveUser(args) {
  if (args.userId) {
    const { data, error } = await supabase.auth.admin.getUserById(args.userId);
    if (error || !data?.user) throw new Error("No auth user found for id: " + args.userId);
    return data.user;
  }

  if (args.email) {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const user = (data?.users || []).find(
      (row) => String(row.email || "").toLowerCase() === String(args.email).toLowerCase()
    );
    if (!user) throw new Error("No auth user found for email: " + args.email);
    return user;
  }

  throw new Error("Provide --email or --user-id");
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

async function deleteUserData(user) {
  const userId = user.id;
  const email = String(user.email || "");
  const summary = { userId, email, deleted: {}, storageRemoved: {} };

  const tables = [
    ["contact_leads", "user_id"],
    ["generation_jobs", "user_id"],
    ["payments", "user_id"],
    ["projects", "user_id"],
    ["credit_transactions", "user_id"],
    ["credit_accounts", "user_id"],
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

  const { count: profileCount, error: profileCountError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("id", userId);
  if (profileCountError) throw profileCountError;

  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
  if (profileError) throw profileError;
  summary.deleted.profiles = profileCount || 0;

  if (email) {
    const hash = emailHash(email);
    const { error: lockoutError } = await supabase
      .from("auth_lockouts")
      .delete()
      .eq("subject_type", "email")
      .eq("subject_hash", hash);
    if (lockoutError) throw lockoutError;
    summary.deleted.auth_lockouts = 1;
  }

  summary.storageRemoved["studio-avatars"] = await deleteStoragePrefix("studio-avatars", userId);
  summary.storageRemoved["site-images"] = await deleteStoragePrefix("site-images", userId);

  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  if (authDeleteError) throw authDeleteError;
  summary.authDeleted = true;

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

  const user = await resolveUser(args);
  const summary = await deleteUserData(user);

  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
