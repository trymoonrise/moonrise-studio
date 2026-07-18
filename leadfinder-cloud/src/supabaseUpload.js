import { createClient } from "@supabase/supabase-js";
import { leadToSupabaseRow } from "./csv.js";

const CHUNK = 200;

function makeClient(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false },
  });
}

/**
 * Upload leads through public.import_leads_csv_rows.
 * Rows use public.leads column names (maps_url, business_name, …).
 */
export async function uploadLeadsToSupabase(leads, cfg) {
  if (!cfg.useSupabase) {
    return { skipped: true, reason: "SKIP_SUPABASE=1", imported: 0, skippedRows: 0 };
  }
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    return { skipped: true, reason: "missing supabase credentials", imported: 0, skippedRows: 0 };
  }
  if (!Array.isArray(leads) || !leads.length) {
    return { imported: 0, skippedRows: 0, rowCount: 0 };
  }

  const supabase = makeClient(cfg);
  const rows = leads.map((lead) => leadToSupabaseRow(lead));
  let imported = 0;
  let skippedRows = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase.rpc("import_leads_csv_rows", { rows: chunk });
    if (error) throw error;
    imported += Number(data?.imported) || 0;
    skippedRows += Number(data?.skipped) || 0;
  }

  return { imported, skippedRows, rowCount: rows.length };
}
