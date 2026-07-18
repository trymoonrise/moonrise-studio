/**
 * On-demand Maps scrape for a Business Finder type + location search.
 * Standalone from the hourly seed cron (cloudRun).
 *
 * CLI:
 *   node src/searchScrape.js --type="Gyms" --location="Austin, TX"
 *   node src/searchScrape.js --query="Barbershops in Dallas"
 */
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { config } from "./config.js";
import { appendLeadsToMasterCsv, leadToSupabaseRow } from "./csv.js";
import { scrapeMapsSearch } from "./scrapeMapsList.js";
import { scrapeMapsPlace } from "./scrapePlace.js";
import { uploadLeadsToSupabase } from "./supabaseUpload.js";

export function buildSearchQuery(type, location, query, geo) {
  const t = String(type || "").trim();
  const loc = String(location || "").trim();
  const lat = Number(geo?.latitude ?? geo?.lat);
  const lng = Number(geo?.longitude ?? geo?.lng);

  if (t && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${t} near ${lat.toFixed(5)},${lng.toFixed(5)}`;
  }
  if (t && loc) return `${t} in ${loc}`;
  if (t && !loc) return t;
  if (!t && loc) return `businesses in ${loc}`;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `businesses near ${lat.toFixed(5)},${lng.toFixed(5)}`;
  }
  const q = String(query || "").trim();
  if (q) return q;
  return "";
}

function leadRowKey(row) {
  return (
    String(row?.maps_url || row?.mapsUrl || "").trim() ||
    `${String(row?.business_name || row?.name || "").trim()}::${String(row?.phone || "").trim()}::${String(row?.address || "").trim()}`
  );
}

function mergeLeadRows(existing, incoming) {
  const map = new Map();
  (existing || []).forEach((row) => {
    const key = leadRowKey(row);
    if (key) map.set(key, row);
  });
  (incoming || []).forEach((row) => {
    const key = leadRowKey(row);
    if (key) map.set(key, row);
  });
  return [...map.values()];
}

function buildFallbackQueries(type, location, primaryQuery) {
  const t = String(type || "").trim();
  const loc = String(location || "").trim();
  const primary = String(primaryQuery || "").trim();
  const out = [];

  if (t && !loc) {
    out.push(`${t} United States`);
    if (!/\bs$/i.test(t)) out.push(`${t}s`);
  } else if (!t && loc) {
    out.push(`local businesses in ${loc}`);
    out.push(`shops in ${loc}`);
    out.push(`companies in ${loc}`);
  } else if (t && loc) {
    out.push(`${t} near ${loc}`);
    if (!/\bs$/i.test(t)) out.push(`${t}s in ${loc}`);
  }

  return [...new Set(out.filter((q) => q && q.toLowerCase() !== primary.toLowerCase()))].slice(0, 4);
}

function parseArgs(argv) {
  const args = {
    type: "",
    location: "",
    query: "",
    dryRun: false,
    noUpload: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--no-upload") args.noUpload = true;
    if (arg.startsWith("--type=")) args.type = arg.slice("--type=".length);
    if (arg.startsWith("--location=")) args.location = arg.slice("--location=".length);
    if (arg.startsWith("--query=")) args.query = arg.slice("--query=".length);
  }
  return args;
}

export async function launchBrowser(cfg) {
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
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();
  return { browser, page };
}

/**
 * Scrape Google Maps for one business-type / location search and optionally
 * upload into public.leads.
 *
 * @param {{ type?: string, location?: string, query?: string, dryRun?: boolean, upload?: boolean, cfg?: object }} options
 */
export async function scrapeBusinessSearch(options = {}) {
  const cfg = options.cfg || config();
  const geo =
    options.geo && typeof options.geo === "object"
      ? options.geo
      : Number.isFinite(Number(options.latitude)) && Number.isFinite(Number(options.longitude))
        ? {
            latitude: Number(options.latitude),
            longitude: Number(options.longitude),
            radiusMiles: Number(options.radiusMiles) || 5,
          }
        : null;
  const searchType = String(options.type || "").trim();
  const searchLocation = String(options.location || "").trim();
  const searchQuery = buildSearchQuery(
    searchType,
    searchLocation,
    options.query,
    geo,
  );
  if (!searchQuery || searchQuery.length < 2) {
    throw new Error("Provide --type and --location, or --query, or latitude/longitude");
  }

  const minRows = Math.max(1, Number(options.minRows ?? cfg.minSearchResults ?? 50));

  const dryRun = Boolean(options.dryRun);
  const shouldUpload = options.upload !== false && !dryRun && cfg.useSupabase;

  const startedAt = Date.now();
  let browser = null;

  try {
    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        query: searchQuery,
        rowCount: 0,
        imported: 0,
        skippedRows: 0,
        leads: [],
        durationMs: Date.now() - startedAt,
      };
    }

    const bundle = await launchBrowser(cfg);
    browser = bundle.browser;
    const searchCfg = {
      ...cfg,
      minSearchResults: minRows,
      noNewLeadTimeoutMs: cfg.searchNoNewLeadTimeoutMs || cfg.noNewLeadTimeoutMs,
    };

    let rawRows = [];
    const primaryResult = await scrapeMapsSearch(bundle.page, searchQuery, searchCfg, geo);
    rawRows = mergeLeadRows(rawRows, Array.isArray(primaryResult?.rows) ? primaryResult.rows : []);

    for (const fallbackQuery of buildFallbackQueries(searchType, searchLocation, searchQuery)) {
      if (rawRows.length >= minRows) break;
      const extra = await scrapeMapsSearch(bundle.page, fallbackQuery, searchCfg, geo);
      rawRows = mergeLeadRows(rawRows, Array.isArray(extra?.rows) ? extra.rows : []);
    }

    const leads = rawRows.map((row) => {
      const normalized = leadToSupabaseRow({
        ...row,
        search_query: row.search_query || searchQuery,
        scrape_source: row.scrape_source || "leadfinder-cloud-search",
      });
      return normalized;
    });

    let imported = 0;
    let skippedRows = 0;

    if (leads.length) {
      await appendLeadsToMasterCsv(cfg.masterCsvFile, leads).catch(() => {});
    }

    if (shouldUpload && leads.length) {
      const upload = await uploadLeadsToSupabase(leads, cfg);
      if (upload.skipped) {
        console.warn(`Supabase skipped: ${upload.reason}`);
      } else {
        imported = Number(upload.imported) || 0;
        skippedRows = Number(upload.skippedRows) || 0;
      }
    }

    return {
      ok: true,
      dryRun: false,
      query: searchQuery,
      rowCount: leads.length,
      minRows,
      targetMet: leads.length >= minRows,
      imported,
      skippedRows,
      placePage: Boolean(primaryResult?.placePage),
      enriched: Number(primaryResult?.enriched) || 0,
      leads,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Open one Maps place page and detect the official Website row (Playwright).
 */
export async function enrichMapsPlace(options = {}) {
  const cfg = options.cfg || config();
  const mapsUrl = String(options.mapsUrl || options.url || "").trim();
  const businessName = String(options.businessName || options.name || "").trim();
  if (!mapsUrl.startsWith("http")) {
    throw new Error("mapsUrl is required");
  }

  const shouldUpload = options.upload !== false && cfg.useSupabase;
  const startedAt = Date.now();
  let browser = null;

  try {
    const bundle = await launchBrowser(cfg);
    browser = bundle.browser;
    const result = await scrapeMapsPlace(bundle.page, mapsUrl, cfg, businessName);
    const placeRow = result?.row || null;
    const websiteUrl = String(placeRow?.website_url || result?.websiteUrl || "").trim();
    const websiteStatus = String(
      placeRow?.website_status || result?.websiteStatus || (websiteUrl ? "has" : "unknown"),
    ).trim();

    let imported = 0;
    if (shouldUpload && placeRow?.maps_url) {
      const normalized = leadToSupabaseRow({
        ...placeRow,
        scrape_source: placeRow.scrape_source || "leadfinder-cloud-enrich",
      });
      const upload = await uploadLeadsToSupabase([normalized], cfg);
      imported = Number(upload.imported) || 0;
    }

    return {
      ok: true,
      mapsUrl: placeRow?.maps_url || mapsUrl,
      businessName: placeRow?.business_name || businessName,
      websiteUrl,
      websiteStatus,
      hasWebsite: websiteStatus === "has" && Boolean(websiteUrl),
      phone: String(placeRow?.phone || result?.phone || "").trim(),
      imported,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await scrapeBusinessSearch({
    type: args.type,
    location: args.location,
    query: args.query,
    dryRun: args.dryRun,
    upload: !args.noUpload,
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        query: result.query,
        rowCount: result.rowCount,
        imported: result.imported,
        skippedRows: result.skippedRows,
        durationMs: result.durationMs,
        sample: result.leads?.[0]?.business_name || null,
      },
      null,
      2,
    ),
  );
}

const isDirectRun = process.argv[1] && pathEquals(process.argv[1], fileURLToPath(import.meta.url));

function pathEquals(a, b) {
  return String(a || "").replace(/\\/g, "/").toLowerCase() === String(b || "").replace(/\\/g, "/").toLowerCase();
}

if (isDirectRun) {
  main().catch((error) => {
    console.error("Fatal search scrape:", error.message || error);
    process.exitCode = 1;
  });
}
