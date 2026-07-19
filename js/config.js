/**
 * Public Studio config only — never put secret keys here.
 * Worker secrets live in worker/.env / Render env vars.
 */
window.SITE_CONFIG = {
  companyName: "trymoonrise.com",
  /** Default social / link preview description (Discord, iMessage, Twitter, etc.). */
  siteDescription:
    "Moonrise is an AI-powered platform that lets you create professional websites in minutes for local business owners, creators, and more! It's designed to make website creation fast, simple, effortless, and get paid.",
  /** Brand assets — relative paths work on Vercel and after custom-domain DNS is pointed here. */
  assetCdnUrl: "doc/",
  brandLogoUrl: "doc/MoonriseLogo.png",
  /** Social / link preview image (Discord, iMessage, Twitter, etc.). */
  embedImageUrl:
    "https://github.com/trymoonrise/moonrise-studio/blob/main/doc/embed.png?raw=true",
  /** Default profile picture when a user has not uploaded one. */
  defaultAvatarUrl: "doc/pfp.png",
  docBaseUrl: "doc/",

  /** Moonrise Studio Supabase project (public anon / publishable key only). */
  supabaseUrl: "https://erfaxgmnzdropviormpj.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZmF4Z21uemRyb3B2aW9ybXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjc2MjQsImV4cCI6MjA5OTc0MzYyNH0.u2kwY7s1dpRkjZ9NG_09jhRML4HvirtrNUvMl1053Xw",

  /**
   * Cloud API worker (generate, Stripe, publish, watermark embed).
   * Hosted on Vercel — works from any device / production Studio URL.
   * Local worker is opt-in: localStorage.ms_use_local_worker = "1"
   */
  workerUrl: "https://moonrise-studio.vercel.app",
  localWorkerUrl: "http://127.0.0.1:8787",

  /**
   * Local LeadFinderCloud on-demand scrape API (npm run search:server).
   * When set, Business Finder triggers a live Maps scrape for type + location.
   */
  leadFinderUrl: "http://127.0.0.1:8790",

  /** Optional Stripe publishable key for client-side elements (Checkout uses worker). */
  stripePublishableKey: "",

  /** Default go-live price label shown on watermark FAQ. */
  goLivePriceLabel: "$500",

  /** Urgency timer length for unpaid previews (hours). */
  watermarkUrgencyHours: 48,

  useSupabaseLeads: false,

  /** Profile handles reserved for the official Moonrise account. */
  ownerHandles: ["moonrise"],

  /**
   * Extra usernames blocked at signup / profile save (plus ownerHandles).
   * Matching is leetspeak-aware and blocks prefixes/suffixes (e.g. m00nrise, xxmoonrise).
   */
  reservedHandles: ["moonrise"],

  /** Official team Telegram chat (Account → Telegram). */
  telegramUrl: "https://t.me/c/3541685239/1",

  /** Official Discord community (Account → Discord). */
  discordUrl: "https://discord.gg/yFJajbBNj",
};

function isPrivateNetworkHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/** True when Studio is opened from localhost or a private LAN IP (local dev only). */
window.isLocalDevHost = function isLocalDevHost() {
  try {
    if (typeof location === "undefined") return false;
    return isPrivateNetworkHost(location.hostname);
  } catch (_) {
    return false;
  }
};

function isMoonriseProductionHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "trymoonrise.com" || host === "www.trymoonrise.com") return true;
  if (host === "moonrise-studio.vercel.app") return true;
  if (host.endsWith(".vercel.app") && host.includes("moonrise")) return true;
  return false;
}

/** Cached after a successful /health probe (see pingMoonriseWorker). */
window.__MOONRISE_RESOLVED_WORKER_URL = "";

/**
 * Resolve the worker base URL for the current page host.
 * Production Studio hosts use same-origin API routes (Vercel rewrites).
 * Local/LAN pages use the cloud worker by default so generate works without
 * `npm start`. Opt into local with:
 *   localStorage.setItem("ms_use_local_worker", "1")
 */
window.resolveWorkerUrl = function resolveWorkerUrl() {
  if (window.__MOONRISE_RESOLVED_WORKER_URL) {
    return window.__MOONRISE_RESOLVED_WORKER_URL;
  }
  const cloud = String(window.SITE_CONFIG?.workerUrl || "https://moonrise-studio.vercel.app").replace(
    /\/$/,
    ""
  );
  const localConfigured = String(window.SITE_CONFIG?.localWorkerUrl || "http://127.0.0.1:8787").replace(
    /\/$/,
    ""
  );
  try {
    if (typeof location === "undefined") return cloud || localConfigured;
    const pageHost = location.hostname;
    const isLocalPage = isPrivateNetworkHost(pageHost);
    const pref =
      typeof localStorage !== "undefined" ? localStorage.getItem("ms_use_local_worker") : null;
    // Opt-in only — default cloud avoids "Can't reach worker" when local isn't running.
    const useLocal = isLocalPage && pref === "1";
    if (useLocal && localConfigured) {
      const local = new URL(localConfigured);
      if (
        (pageHost === "localhost" || pageHost === "127.0.0.1" || pageHost === "[::1]") &&
        (local.hostname === "localhost" || local.hostname === "127.0.0.1" || local.hostname === "[::1]") &&
        pageHost !== local.hostname
      ) {
        local.hostname = pageHost;
      }
      return local.origin;
    }
    if (isMoonriseProductionHost(pageHost)) {
      return location.origin;
    }
  } catch (_) {
    /* keep cloud */
  }
  return cloud || localConfigured;
};

/** Ordered worker bases to try when probing reachability (primary → cloud → page origin). */
window.workerUrlCandidates = function workerUrlCandidates() {
  const out = [];
  const push = (url) => {
    const base = String(url || "")
      .trim()
      .replace(/\/$/, "");
    if (base && !out.includes(base)) out.push(base);
  };
  push(typeof window.resolveWorkerUrl === "function" ? window.resolveWorkerUrl() : "");
  push(window.SITE_CONFIG?.workerUrl);
  try {
    if (typeof location !== "undefined") push(location.origin);
  } catch (_) {
    /* ignore */
  }
  return out;
};

/**
 * Probe /health across workerUrlCandidates(); caches the first reachable base.
 * @returns {Promise<string>} reachable worker base URL
 */
window.pingMoonriseWorker = async function pingMoonriseWorker(signal) {
  const cached = String(window.__MOONRISE_RESOLVED_WORKER_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (cached) return cached;

  const candidates = window.workerUrlCandidates();
  let lastErr = null;

  for (const base of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 15000);
      const onParentAbort = () => ctrl.abort();
      signal?.addEventListener("abort", onParentAbort);
      try {
        const health = await fetch(base + "/health", {
          method: "GET",
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!health.ok) throw new Error("Worker health check failed (" + health.status + ")");
        window.__MOONRISE_RESOLVED_WORKER_URL = base;
        return base;
      } catch (e) {
        if (signal?.aborted || (e?.name === "AbortError" && signal?.aborted)) {
          const err = new Error("Aborted");
          err.name = "AbortError";
          throw err;
        }
        lastErr = e;
        await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
      } finally {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onParentAbort);
      }
    }
  }

  throw lastErr || new Error("Worker unreachable");
};

/**
 * LeadFinder scrape API — always via authenticated worker proxy when available.
 * Avoids mixed-content / private-network blocks to localhost from HTTPS Studio.
 */
window.resolveLeadFinderUrl = function resolveLeadFinderUrl() {
  try {
    if (typeof window.resolveWorkerUrl === "function") {
      const worker = String(window.resolveWorkerUrl() || "").trim().replace(/\/$/, "");
      if (worker) return worker + "/lead-finder";
    }
    if (window.isLocalDevHost()) {
      return String(window.SITE_CONFIG?.leadFinderUrl || "")
        .trim()
        .replace(/\/$/, "");
    }
  } catch (_) {
    /* keep empty */
  }
  return "";
};
