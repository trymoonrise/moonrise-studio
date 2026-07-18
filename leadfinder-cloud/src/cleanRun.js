import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { uploadLeadsToSupabase } from "./supabaseUpload.js";
import { scrapeMapsPlace } from "./scrapePlace.js";

const PAGE_SIZE = 40;
const DEFAULT_STATE = {
  offset: 0,
  checked: 0,
  updated: 0,
  websitesFound: 0,
  failed: 0,
  mode: "missing_website", // missing_website → then all_stale
  updatedAt: "",
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: null,
    workers: null,
    reset: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--reset") args.reset = true;
    if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]);
    if (arg.startsWith("--workers=")) args.workers = Number(arg.split("=")[1]);
  }
  return args;
}

function emitChat(payload) {
  console.log(`LFCHAT:${JSON.stringify(payload)}`);
}

function cleanStatePath(cfg) {
  return path.join(cfg.dataDir, "clean-state.json");
}

async function loadCleanState(cfg) {
  try {
    const raw = await fs.readFile(cleanStatePath(cfg), "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === "ENOENT") return { ...DEFAULT_STATE };
    throw error;
  }
}

async function saveCleanState(cfg, state) {
  await fs.mkdir(cfg.dataDir, { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString() };
  await fs.writeFile(cleanStatePath(cfg), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function makeClient(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false },
  });
}

async function launchBrowserPool(cfg, workerCount) {
  const launchOptions = {
    headless: cfg.headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  };
  if (cfg.chromeChannel) launchOptions.channel = cfg.chromeChannel;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });
  const pages = [];
  for (let i = 0; i < workerCount; i += 1) {
    pages.push(await context.newPage());
  }
  return { browser, pages };
}

/**
 * Fetch a page of leads to refresh.
 * Phase 1: no website. Phase 2: oldest first (may have gained a site).
 */
async function fetchLeadBatch(supabase, cleanState) {
  const from = cleanState.offset;
  const to = from + PAGE_SIZE - 1;
  const select =
    "id,business_name,phone,maps_url,website_url,has_website,collected_at,last_seen_at,imported_at";

  let query = supabase.from("leads").select(select);

  if (cleanState.mode === "missing_website") {
    query = query.eq("has_website", false).order("imported_at", { ascending: true });
  } else {
    query = query.order("last_seen_at", { ascending: true, nullsFirst: true });
  }

  const { data, error } = await query.range(from, to);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function hadWebsite(lead) {
  return Boolean(String(lead?.website_url || "").trim());
}

function fieldsChanged(before, after) {
  const keys = [
    "website_url",
    "phone",
    "rating",
    "review_count",
    "category",
    "address",
    "hours",
  ];
  const changes = [];
  for (const key of keys) {
    const a = String(before?.[key] || "").trim();
    const b = String(after?.[key] || "").trim();
    if (b && b !== a) changes.push(key);
  }
  return changes;
}

async function refreshOne(page, lead, cfg) {
  const mapsUrl = String(lead.maps_url || "").trim();
  const name = String(lead.business_name || "").trim() || "(unnamed)";
  if (!mapsUrl.startsWith("http")) {
    return { lead, ok: false, error: "missing maps url", row: null, changes: [] };
  }

  try {
    const result = await scrapeMapsPlace(page, mapsUrl, cfg, name);
    const row = result?.row;
    if (!row) {
      return { lead, ok: false, error: "empty place page", row: null, changes: [] };
    }

    // Keep original Maps URL as identity key for upsert
    row.maps_url = mapsUrl;
    if (!row.business_name) row.business_name = name;

    const changes = fieldsChanged(lead, row);
    return {
      lead,
      ok: true,
      error: null,
      row,
      changes,
      gainedWebsite: !hadWebsite(lead) && Boolean(row.website_url),
      websiteUrl: row.website_url || "",
    };
  } catch (error) {
    return { lead, ok: false, error: error.message, row: null, changes: [] };
  }
}

async function main() {
  const cfg = config();
  const args = parseArgs(process.argv.slice(2));
  const workerCount = Math.max(
    1,
    Math.min(
      8,
      Number.isFinite(args.workers) && args.workers > 0
        ? Math.floor(args.workers)
        : cfg.scrapeWorkers || 4,
    ),
  );

  if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseKey) {
    throw new Error("Supabase credentials required for Clean");
  }

  let cleanState = await loadCleanState(cfg);
  if (args.reset) {
    cleanState = { ...DEFAULT_STATE };
    await saveCleanState(cfg, cleanState);
  }

  const limit =
    args.limit != null && Number.isFinite(args.limit)
      ? Math.max(1, args.limit)
      : Number.POSITIVE_INFINITY;

  emitChat({
    event: "status",
    text: `Clean · ${workerCount} workers · mode ${cleanState.mode} · offset ${cleanState.offset}`,
  });
  console.log(
    `Clean start workers=${workerCount} mode=${cleanState.mode} offset=${cleanState.offset}`,
  );

  const supabase = makeClient(cfg);
  let browserBundle = null;
  let processedThisRun = 0;

  try {
    if (!args.dryRun) {
      browserBundle = await launchBrowserPool(cfg, workerCount);
    }

    while (processedThisRun < limit) {
      const batch = await fetchLeadBatch(supabase, cleanState);
      if (!batch.length) {
        if (cleanState.mode === "missing_website") {
          emitChat({
            event: "status",
            text: "Clean · no-website queue done · switching to full refresh (oldest first)",
          });
          cleanState.mode = "all_stale";
          cleanState.offset = 0;
          await saveCleanState(cfg, cleanState);
          continue;
        }
        emitChat({ event: "status", text: "Clean · all leads checked" });
        break;
      }

      const slice = batch.slice(0, Math.max(0, limit - processedThisRun));
      emitChat({
        event: "status",
        text: `Clean batch · ${slice.length} leads · ${cleanState.mode}`,
      });

      if (args.dryRun) {
        for (const lead of slice) {
          emitChat({
            event: "lead",
            name: String(lead.business_name || "").trim() || "(unnamed)",
            mapsUrl: String(lead.maps_url || "").trim(),
            phone: String(lead.phone || "").trim(),
          });
        }
        cleanState.offset += slice.length;
        cleanState.checked += slice.length;
        processedThisRun += slice.length;
        await saveCleanState(cfg, cleanState);
        continue;
      }

      const results = [];
      for (let i = 0; i < slice.length; i += workerCount) {
        const chunk = slice.slice(i, i + workerCount);
        const chunkResults = await Promise.all(
          chunk.map((lead, idx) =>
            refreshOne(browserBundle.pages[idx % browserBundle.pages.length], lead, cfg),
          ),
        );
        results.push(...chunkResults);
      }

      const toUpload = [];
      for (const item of results) {
        cleanState.checked += 1;
        processedThisRun += 1;
        const name = String(item.lead.business_name || "").trim() || "(unnamed)";

        if (!item.ok || !item.row) {
          cleanState.failed += 1;
          emitChat({
            event: "status",
            text: `Clean miss · ${name} — ${item.error || "unknown"}`,
          });
          continue;
        }

        emitChat({
          event: "lead",
          name,
          mapsUrl: String(item.lead.maps_url || "").trim(),
          phone: String(item.row.phone || item.lead.phone || "").trim(),
        });

        if (item.gainedWebsite) {
          cleanState.websitesFound += 1;
          emitChat({
            event: "status",
            text: `Website found · ${name} · ${item.websiteUrl}`,
          });
          console.log(`Clean website found: ${name} → ${item.websiteUrl}`);
        }

        if (item.changes.length || item.gainedWebsite) {
          cleanState.updated += 1;
          toUpload.push(item.row);
        } else {
          // Still touch last_seen via upsert of collected_at + maps url + name
          toUpload.push({
            maps_url: item.row.maps_url,
            business_name: item.row.business_name,
            collected_at: item.row.collected_at,
            scrape_source: "leadfinder-cloud-clean",
          });
        }
      }

      if (toUpload.length) {
        try {
          const upload = await uploadLeadsToSupabase(toUpload, cfg);
          emitChat({
            event: "status",
            text: `Clean upsert · imported ${upload.imported} · skipped ${upload.skippedRows}`,
          });
          console.log(
            `Clean upsert: imported=${upload.imported} skipped=${upload.skippedRows}`,
          );
        } catch (error) {
          emitChat({
            event: "status",
            text: `Clean upsert failed: ${error.message}`,
          });
          console.error("Clean upsert failed:", error.message);
        }
      }

      cleanState.offset += slice.length;
      await saveCleanState(cfg, cleanState);

      emitChat({
        event: "status",
        text: `Clean progress · checked ${cleanState.checked} · updated ${cleanState.updated} · websites ${cleanState.websitesFound} · failed ${cleanState.failed}`,
      });
      console.log(
        `Clean progress checked=${cleanState.checked} updated=${cleanState.updated} websites=${cleanState.websitesFound}`,
      );
    }
  } finally {
    if (browserBundle?.browser) {
      await browserBundle.browser.close().catch(() => {});
    }
  }

  emitChat({
    event: "status",
    text: `Clean done · checked ${cleanState.checked} · updated ${cleanState.updated} · websites ${cleanState.websitesFound}`,
  });
  console.log("LeadFinder Clean finished.");
}

main().catch((error) => {
  console.error("Fatal Clean:", error);
  process.exitCode = 1;
});
