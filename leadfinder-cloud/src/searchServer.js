/**
 * Local HTTP API for on-demand Business Finder scrapes.
 *
 *   npm run search:server
 *   POST http://localhost:8790/search  { "type": "Gyms", "location": "Austin, TX" }
 *   GET  http://localhost:8790/health
 */
import http from "node:http";
import process from "node:process";
import { config } from "./config.js";
import { scrapeBusinessSearch, enrichMapsPlace } from "./searchScrape.js";

const PORT = Math.max(
  1,
  Number(process.env.PORT || process.env.LEADFINDER_SEARCH_PORT || 8790),
);
const HOST = String(process.env.LEADFINDER_SEARCH_HOST || "0.0.0.0");

let busy = false;
let enrichBusy = false;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
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
  if (enrichBusy) {
    sendJson(res, 409, {
      ok: false,
      error: "A place enrichment is already running. Try again in a moment.",
    });
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
    return;
  }

  const mapsUrl = String(body.mapsUrl || body.url || "").trim();
  const businessName = String(body.businessName || body.name || "").trim();
  if (!mapsUrl.startsWith("http")) {
    sendJson(res, 400, { ok: false, error: 'Provide { "mapsUrl": "https://www.google.com/maps/place/..." }' });
    return;
  }

  enrichBusy = true;
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
    sendJson(res, 200, result);
  } catch (error) {
    console.error("Enrich place failed:", error.message || error);
    sendJson(res, 500, {
      ok: false,
      error: error.message || String(error),
    });
  } finally {
    enrichBusy = false;
  }
}

async function handleSearch(req, res) {
  if (busy) {
    sendJson(res, 409, {
      ok: false,
      error: "A scrape is already running. Try again in a moment.",
    });
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
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
    sendJson(res, 400, {
      ok: false,
      error: 'Provide { "type", "location" } or { "query" } or { "latitude", "longitude" }',
    });
    return;
  }

  busy = true;
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
      cfg: config(),
    });
    console.log(
      `Search scrape done · ${result.rowCount} rows · imported ${result.imported} · ${result.durationMs}ms`,
    );
    sendJson(res, 200, {
      ok: true,
      query: result.query,
      rowCount: result.rowCount,
      minRows: result.minRows,
      targetMet: result.targetMet,
      imported: result.imported,
      skippedRows: result.skippedRows,
      durationMs: result.durationMs,
      leads: result.leads,
    });
  } catch (error) {
    console.error("Search scrape failed:", error.message || error);
    sendJson(res, 500, {
      ok: false,
      error: error.message || String(error),
    });
  } finally {
    busy = false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const method = String(req.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "leadfinder-cloud-search",
      busy,
      enrichBusy,
      port: PORT,
    });
    return;
  }

  if (method === "POST" && url.pathname === "/enrich-place") {
    await handleEnrichPlace(req, res);
    return;
  }

  if (method === "POST" && (url.pathname === "/search" || url.pathname === "/scrape")) {
    await handleSearch(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found. Use POST /search" });
});

server.listen(PORT, HOST, () => {
  console.log(`LeadFinder search server · http://${HOST}:${PORT}`);
  console.log(`POST /search  { "type": "Gyms", "location": "Austin, TX" }`);
});
