/**
 * Local HTTP API for on-demand Business Finder scrapes.
 *
 *   npm run search:server
 *   POST http://localhost:8790/search  { "type": "Gyms", "location": "Austin, TX" }
 *   GET  http://localhost:8790/health
 *
 * Binds 127.0.0.1 by default. Set LEADFINDER_SEARCH_HOST=0.0.0.0 only if needed,
 * and set LEADFINDER_SEARCH_SECRET when exposing beyond localhost.
 */
import http from "node:http";
import process from "node:process";
import { config } from "./config.js";
import { scrapeBusinessSearch, enrichMapsPlace } from "./searchScrape.js";

const PORT = Math.max(
  1,
  Number(process.env.PORT || process.env.LEADFINDER_SEARCH_PORT || 8790),
);
const HOST = String(
  process.env.LEADFINDER_SEARCH_HOST ||
    (process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME
      ? "0.0.0.0"
      : "127.0.0.1"),
);
const SEARCH_SECRET = String(process.env.LEADFINDER_SEARCH_SECRET || "").trim();

let busy = false;
let enrichBusy = false;
let busySince = 0;
let enrichBusySince = 0;

/** Client aborts around 180s — never leave the lock stuck longer than this. */
const BUSY_MAX_MS = Math.max(
  60_000,
  Number(process.env.LEADFINDER_BUSY_MAX_MS || 3 * 60_000) || 180_000,
);

function clearStaleBusy(kind) {
  const now = Date.now();
  if (kind === "enrich") {
    if (enrichBusy && enrichBusySince && now - enrichBusySince > BUSY_MAX_MS) {
      console.warn(
        `Enrich busy lock stale (${Math.round((now - enrichBusySince) / 1000)}s) — clearing`,
      );
      enrichBusy = false;
      enrichBusySince = 0;
      return true;
    }
    return false;
  }
  if (busy && busySince && now - busySince > BUSY_MAX_MS) {
    console.warn(`Search busy lock stale (${Math.round((now - busySince) / 1000)}s) — clearing`);
    busy = false;
    busySince = 0;
    return true;
  }
  return false;
}

function setBusy(on) {
  busy = !!on;
  busySince = on ? Date.now() : 0;
}

function setEnrichBusy(on) {
  enrichBusy = !!on;
  enrichBusySince = on ? Date.now() : 0;
}

function corsHeaders(req) {
  const origin = String(req?.headers?.origin || "").trim();
  const allow =
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin) ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3\[0-1])\.)/i.test(origin) ||
    /(?:^|\.)trymoonrise\.com$/i.test(new URL(origin || "http://local").hostname || "");
  let allowOrigin = "*";
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      const ok =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "[::1]" ||
        host === "::1" ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host) ||
        host === "trymoonrise.com" ||
        host.endsWith(".trymoonrise.com");
      allowOrigin = ok ? origin : "null";
    } catch (_) {
      allowOrigin = "null";
    }
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-LeadFinder-Secret",
    "Access-Control-Allow-Private-Network": "true",
    Vary: "Origin",
  };
}

function sendJson(res, status, body, req) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...corsHeaders(req),
  });
  res.end(payload);
}

function requireSearchAuth(req, res) {
  if (!SEARCH_SECRET) return true;
  const auth = String(req.headers.authorization || "").trim();
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = String(req.headers["x-leadfinder-secret"] || "").trim();
  if (bearer === SEARCH_SECRET || header === SEARCH_SECRET) return true;
  sendJson(res, 401, { ok: false, error: "Unauthorized" }, req);
  return false;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleEnrichPlace(req, res) {
  clearStaleBusy("enrich");
  if (enrichBusy) {
    const waited = enrichBusySince ? Date.now() - enrichBusySince : 0;
    sendJson(
      res,
      409,
      {
        ok: false,
        error: "A place enrichment is already running. Try again in a moment.",
        busyForMs: waited,
        retryAfterMs: Math.max(5_000, BUSY_MAX_MS - waited),
      },
      req,
    );
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message }, req);
    return;
  }

  const mapsUrl = String(body.mapsUrl || body.url || "").trim();
  const businessName = String(body.businessName || body.name || "").trim();
  if (!mapsUrl.startsWith("http")) {
    sendJson(
      res,
      400,
      { ok: false, error: 'Provide { "mapsUrl": "https://www.google.com/maps/place/..." }' },
      req,
    );
    return;
  }

  setEnrichBusy(true);
  console.log(`Enrich place start · ${businessName || mapsUrl.slice(0, 80)}`);
  try {
    const result = await enrichMapsPlace({
      mapsUrl,
      businessName,
      upload: body.upload !== false,
      cfg: config(),
    });
    console.log(
      `Enrich place done · website=${result.websiteUrl || "(none)"} · status=${result.websiteStatus} · ${result.durationMs}ms`,
    );
    sendJson(res, 200, result, req);
  } catch (error) {
    console.error("Enrich place failed:", error.message || error);
    sendJson(
      res,
      500,
      {
        ok: false,
        error: error.message || String(error),
      },
      req,
    );
  } finally {
    setEnrichBusy(false);
  }
}

async function handleSearch(req, res) {
  clearStaleBusy("search");
  if (busy) {
    const waited = busySince ? Date.now() - busySince : 0;
    sendJson(
      res,
      409,
      {
        ok: false,
        error: "A scrape is already running. Try again in a moment.",
        busyForMs: waited,
        retryAfterMs: Math.max(5_000, BUSY_MAX_MS - waited),
      },
      req,
    );
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message }, req);
    return;
  }

  const type = String(body.type || body.businessType || "").trim();
  const location = String(body.location || body.city || "").trim();
  const query = String(body.query || "").trim();
  const latitude = Number(body.latitude ?? body.lat);
  const longitude = Number(body.longitude ?? body.lng);
  const radiusMiles = Number(body.radiusMiles ?? body.radius ?? 5);
  const hasGeo = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!type && !location && !query && !hasGeo) {
    sendJson(
      res,
      400,
      {
        ok: false,
        error: 'Provide { "type", "location" } or { "query" } or { "latitude", "longitude" }',
      },
      req,
    );
    return;
  }

  setBusy(true);
  console.log(
    `Search scrape start · type="${type}" location="${location}" query="${query}"` +
      (hasGeo ? ` geo=${latitude},${longitude} r=${radiusMiles}mi` : ""),
  );
  try {
    const result = await scrapeBusinessSearch({
      type,
      location,
      query,
      latitude: hasGeo ? latitude : undefined,
      longitude: hasGeo ? longitude : undefined,
      radiusMiles: hasGeo ? radiusMiles : undefined,
      minRows: Math.max(1, Number(body.minResults) || 50),
      upload: body.upload !== false,
      dryRun: Boolean(body.dryRun),
      enrich: body.enrich !== false && body.fast !== true,
      cfg: config(),
    });
    console.log(
      `Search scrape done · ${result.rowCount} rows · imported ${result.imported} · ${result.durationMs}ms`,
    );
    sendJson(
      res,
      200,
      {
        ok: true,
        dryRun: Boolean(result.dryRun),
        query: result.query,
        rowCount: result.rowCount,
        minRows: result.minRows,
        targetMet: result.targetMet,
        imported: result.imported,
        skippedRows: result.skippedRows,
        durationMs: result.durationMs,
        leads: result.leads,
      },
      req,
    );
  } catch (error) {
    console.error("Search scrape failed:", error.message || error);
    sendJson(
      res,
      500,
      {
        ok: false,
        error: error.message || String(error),
      },
      req,
    );
  } finally {
    setBusy(false);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const method = String(req.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    clearStaleBusy("search");
    clearStaleBusy("enrich");
    sendJson(
      res,
      200,
      {
        ok: true,
        service: "leadfinder-cloud-search",
        busy,
        enrichBusy,
        busyForMs: busy && busySince ? Date.now() - busySince : 0,
        enrichBusyForMs: enrichBusy && enrichBusySince ? Date.now() - enrichBusySince : 0,
        busyMaxMs: BUSY_MAX_MS,
        port: PORT,
        authRequired: Boolean(SEARCH_SECRET),
      },
      req,
    );
    return;
  }

  if (method === "POST" && url.pathname === "/reset-busy") {
    if (!requireSearchAuth(req, res)) return;
    const wasBusy = busy || enrichBusy;
    setBusy(false);
    setEnrichBusy(false);
    sendJson(
      res,
      200,
      { ok: true, cleared: wasBusy, message: wasBusy ? "Busy locks cleared." : "No busy lock was set." },
      req,
    );
    return;
  }

  if (method === "POST" && url.pathname === "/enrich-place") {
    if (!requireSearchAuth(req, res)) return;
    await handleEnrichPlace(req, res);
    return;
  }

  if (method === "POST" && (url.pathname === "/search" || url.pathname === "/scrape")) {
    if (!requireSearchAuth(req, res)) return;
    await handleSearch(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found. Use POST /search" }, req);
});

server.listen(PORT, HOST, () => {
  console.log(`LeadFinder search server · http://${HOST}:${PORT}`);
  console.log(`POST /search  { "type": "Gyms", "location": "Austin, TX" }`);
  if (SEARCH_SECRET) console.log("Auth: LEADFINDER_SEARCH_SECRET required");
});
