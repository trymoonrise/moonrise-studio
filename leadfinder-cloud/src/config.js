import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function projectRoot() {
  return path.resolve(__dirname, "..");
}

dotenv.config({ path: path.join(projectRoot(), ".env") });
dotenv.config({ path: path.join(projectRoot(), "..", "LeadFinder", ".env") });

export function config() {
  const root = projectRoot();
  const dataDir = process.env.DATA_DIR || path.join(root, "data");

  return {
    root,
    dataDir,
    seedFile:
      process.env.LEADFINDER_SEEDS ||
      path.join(root, "seeds", "prefix_suffix_groups.txt"),
    stateFile: path.join(dataDir, "cloud-state.json"),
    masterCsvFile: path.join(dataDir, "all-leads.csv"),
    discordWebhookUrl: String(process.env.DISCORD_WEBHOOK_URL || "").trim(),
    // Hard-locked: every Discord message is exactly 1000 leads.
    discordBatchSize: 1000,
    queriesPerRun: Math.max(1, Number(process.env.QUERIES_PER_RUN || 50)),
    // Parallel Google Maps tabs in one Chromium (1–8). Higher = faster, more CPU/RAM.
    scrapeWorkers: Math.max(1, Math.min(8, Number(process.env.SCRAPE_WORKERS || 4))),
    cleanPageSize: Math.max(10, Number(process.env.CLEAN_PAGE_SIZE || 40)),
    minSearchResults: Math.max(1, Number(process.env.MIN_SEARCH_RESULTS || 50)),
    searchNoNewLeadTimeoutMs: Math.max(
      400,
      Number(process.env.SEARCH_NO_NEW_LEAD_TIMEOUT_MS || 3500),
    ),
    maxScrolls: Math.max(20, Number(process.env.MAX_SCROLLS || 260)),
    noNewLeadTimeoutMs: Math.max(400, Number(process.env.NO_NEW_LEAD_TIMEOUT_MS || 1600)),
    maxMapsWaitMs: Number(process.env.MAX_MAPS_WAIT_MS || 20000),
    pageReadyMs: Number(process.env.PAGE_READY_MS || 6000),
    pageSettleMs: Number(process.env.PAGE_SETTLE_MS || 250),
    settleFastMs: Number(process.env.SETTLE_FAST_MS || 40),
    settleSlowMs: Number(process.env.SETTLE_SLOW_MS || 120),
    finalSettleMs: Number(process.env.FINAL_SETTLE_MS || 250),
    placeSettleMs: Number(process.env.PLACE_SETTLE_MS || 400),
    placeContactWaitMs: Number(process.env.PLACE_CONTACT_WAIT_MS || 3500),
    // After list scrape, open place pages for leads missing website and/or phone.
    enrichMissingContacts: process.env.ENRICH_MISSING_CONTACTS !== "0",
    enrichMaxPerQuery: Math.max(0, Number(process.env.ENRICH_MAX_PER_QUERY || 40)),
    headless: process.env.HEADLESS !== "0",
    chromeChannel: process.env.CHROME_CHANNEL || "",
    scrapeEveryTime: process.env.SCRAPE_EVERY_TIME !== "0",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "",
    useSupabase: process.env.SKIP_SUPABASE !== "1",
    stateBucket: process.env.LEADFINDER_STATE_BUCKET || "leadfinder-cloud",
    stateObject: process.env.LEADFINDER_STATE_OBJECT || "cloud-state.json",
  };
}
