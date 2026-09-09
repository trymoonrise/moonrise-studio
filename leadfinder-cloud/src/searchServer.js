/**
 * Local HTTP API for on-demand Business Finder scrapes.
 *
 *   npm run search:server
 *   POST http://localhost:8790/search  { "type": "Gyms", "location": "Austin, TX" }
 *   GET  http://localhost:8790/health
 *
 * Binds 127.0.0.1 by default. Set LEADFINDER_SEARCH_HOST=0.0.0.0 only if needed,
 * and set LEADFINDER_SEARCH_SECRET when exposing beyond localhost.
 *
 * Concurrent searches/enrichments wait in a single queue (no 409) so Near Me
 * recovers when another scrape is already running.
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

/** Client aborts around 180s — never leave a lock stuck longer than this. */
const BUSY_MAX_MS = Math.max(
  60_000,
  Number(process.env.LEADFINDER_BUSY_MAX_MS || 3 * 60_000) || 180_000,
);

/** Max time a queued request waits for the Playwright lock. */
const QUEUE_WAIT_MAX_MS = Math.max(
  30_000,
  Number(process.env.LEADFINDER_QUEUE_WAIT_MAX_MS || 170_000) || 170_000,
);

let playwrightBusy = false;
let playwrightBusySince = 0;
let playwrightBusyKind = "";
let queueTail = Promise.resolve();
let queueDepth = 0;

function setPlaywrightBusy(on, kind) {
  playwrightBusy = !!on;
  playwrightBusySince = on ? Date.now() : 0;
  playwrightBusyKind = on ? String(kind || "playwright") : "";
}

function clearStalePlaywrightBusy() {
  if (
    playwrightBusy &&
    playwrightBusySince &&
    Date.now() - playwrightBusySince > BUSY_MAX_MS
  ) {
    console.warn(
      `Playwright lock stale (${Math.round((Date.now() - playwrightBusySince) / 1000)}s, kind=${playwrightBusyKind}) — clearing`,
    );
    setPlaywrightBusy(false);
    return true;
  }
  return false;
}

/**
 * Serialize all Playwright work. Waiters stay connected instead of getting 409.
 */
function withPlaywrightLock(kind, work, opts = {}) {
  const maxWaitMs = Math.max(5_000, Number(opts.maxWaitMs) || QUEUE_WAIT_MAX_MS);
  const enqueuedAt = Date.now();
  queueDepth += 1;
  const run = queueTail.then(async () => {
    queueDepth = Math.max(0, queueDepth - 1);
    clearStalePlaywrightBusy();
    const waited = Date.now() - enqueuedAt;
    if (waited > maxWaitMs) {
      const err = new Error(
        "Maps scanner is busy. Wait a moment, then try again.",
      );
      err.code = "queue_timeout";
      err.waitedMs = waited;
      throw err;
    }
    setPlaywrightBusy(true, kind);
    try {
      return await work();
    } finally {
      setPlaywrightBusy(false);
    }
  });
  queueTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function corsHeaders(req) {
  const origin = String(req?.headers?.origin || "").trim();
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

  console.log(`Enrich place queued · ${businessName || mapsUrl.slice(0, 80)} · depth=${queueDepth}`);
  try {
    const result = await withPlaywrightLock("enrich", async () => {
      console.log(`Enrich place start · ${businessName || mapsUrl.slice(0, 80)}`);
      const out = await enrichMapsPlace({
        mapsUrl,
        businessName,
        upload: body.upload !== false,
        cfg: config(),
      });
      console.log(
        `Enrich place done · website=${out.websiteUrl || "(none)"} · status=${out.websiteStatus} · ${out.durationMs}ms`,
      );
      return out;
    });
    sendJson(res, 200, result, req);
  } catch (error) {
    const status = error?.code === "queue_timeout" ? 503 : 500;
    console.error("Enrich place failed:", error.message || error);
    sendJson(
      res,
      status,
      {
        ok: false,
        error: error.message || String(error),
        code: error?.code || undefined,
      },
      req,
    );
  }
}

async function handleSearch(req, res) {
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

  console.log(
    `Search scrape queued · type="${type}" location="${location}" query="${query}"` +
      (hasGeo ? ` geo=${latitude},${longitude} r=${radiusMiles}mi` : "") +
      ` · depth=${queueDepth}`,
  );
  try {
    const result = await withPlaywrightLock("search", async () => {
      console.log(
        `Search scrape start · type="${type}" location="${location}" query="${query}"` +
          (hasGeo ? ` geo=${latitude},${longitude} r=${radiusMiles}mi` : ""),
      );
      const out = await scrapeBusinessSearch({
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
        `Search scrape done · ${out.rowCount} rows · imported ${out.imported} · ${out.durationMs}ms`,
      );
      return out;
    });
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
    const status = error?.code === "queue_timeout" ? 503 : 500;
    console.error("Search scrape failed:", error.message || error);
    sendJson(
      res,
      status,
      {
        ok: false,
        error: error.message || String(error),
        code: error?.code || undefined,
      },
      req,
    );
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
    clearStalePlaywrightBusy();
    sendJson(
      res,
      200,
      {
        ok: true,
        service: "leadfinder-cloud-search",
        busy: playwrightBusy,
        enrichBusy: playwrightBusy && playwrightBusyKind === "enrich",
        busyForMs: playwrightBusy && playwrightBusySince ? Date.now() - playwrightBusySince : 0,
        enrichBusyForMs:
          playwrightBusy && playwrightBusyKind === "enrich" && playwrightBusySince
            ? Date.now() - playwrightBusySince
            : 0,
        busyKind: playwrightBusyKind || "",
        queueDepth,
        busyMaxMs: BUSY_MAX_MS,
        port: PORT,
        authRequired: Boolean(SEARCH_SECRET),
        queueMode: true,
      },
      req,
    );
    return;
  }

  if (method === "POST" && url.pathname === "/reset-busy") {
    if (!requireSearchAuth(req, res)) return;
    const wasBusy = playwrightBusy || queueDepth > 0;
    setPlaywrightBusy(false);
    // Soft-reset only the lock flag; in-flight work still finishes and releases.
    sendJson(
      res,
      200,
      {
        ok: true,
        cleared: wasBusy,
        message: wasBusy ? "Busy lock flag cleared." : "No busy lock was set.",
        queueDepth,
      },
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
  console.log("Queue mode: concurrent scrapes wait instead of 409");
  if (SEARCH_SECRET) console.log("Auth: LEADFINDER_SEARCH_SECRET required");
});
