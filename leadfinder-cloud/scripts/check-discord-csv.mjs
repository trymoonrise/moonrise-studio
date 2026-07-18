import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { leadToSupabaseRow } from "../src/csv.js";

dotenv.config({ path: "./.env" });
dotenv.config({ path: "../LeadFinder/.env" });

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const parseLine = (line) => {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let ci = 0; ci < line.length; ci += 1) {
      const ch = line[ci];
      if (ch === '"') {
        if (inQ && line[ci + 1] === '"') {
          cur += '"';
          ci += 1;
        } else {
          inQ = !inQ;
        }
        continue;
      }
      if (ch === "," && !inQ) {
        cols.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    return cols;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let li = 1; li < lines.length; li += 1) {
    const cols = parseLine(lines[li]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/check-discord-csv.mjs <path-to-csv>");
  process.exit(1);
}

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const normalized = rows.map((r) => leadToSupabaseRow(r));
const withMaps = normalized.filter((r) => String(r.maps_url || "").startsWith("http"));

console.log(
  JSON.stringify(
    {
      rows: rows.length,
      withMapsUrl: withMaps.length,
      missingName: withMaps.filter((r) => !String(r.business_name || "").trim()).length,
      sampleName: withMaps[0]?.business_name,
      samplePhone: withMaps[0]?.phone,
      sampleSource: withMaps[0]?.scrape_source,
    },
    null,
    2,
  ),
);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sample = withMaps.slice(0, 5);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.rpc("import_leads_csv_rows", { rows: sample });
if (error) {
  console.error("RPC ERROR", error.message);
  process.exit(1);
}
console.log("sampleImport", data);

const maps = sample[0]?.maps_url;
const { data: found, error: e2 } = await supabase
  .from("leads")
  .select("id,business_name,phone,scrape_source,maps_url")
  .eq("maps_url", maps)
  .limit(1);
if (e2) {
  console.error(e2.message);
  process.exit(1);
}
console.log("found", found);
