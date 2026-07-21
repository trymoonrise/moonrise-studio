/**
 * Public Studio config only - never put secret keys here.
 * Worker secrets live in worker/.env / Render env vars.
 */
window.SITE_CONFIG = {
  companyName: "trymoonrise.com",
  siteName: "Moonrise Studio",
  siteUrl: "https://trymoonrise.com",
  locale: "en_US",
  supportEmail: "trymoonrise@gmail.com",
  /** Default social / link preview description (Discord, iMessage, Twitter, etc.). */
  siteDescription:
    "Moonrise is an AI-powered platform that lets you create professional websites in minutes for local business owners, creators, and more! It's designed to make website creation fast, simple, effortless, and get paid.",
  seoKeywords:
    "AI website builder, sell websites, local business websites, website creator income, Moonrise Studio, trymoonrise, build websites get paid",
  seoFaq: [
    {
      q: "What is Moonrise Studio?",
      a: "Moonrise Studio is an AI-powered platform that helps creators build professional websites for local businesses and earn when clients unlock the live site.",
    },
    {
      q: "How does Moonrise work?",
      a: "Find businesses that need a site, build their preview for free in Moonrise, send the link, and get paid when the owner unlocks the watermark on the live website.",
    },
    {
      q: "How much does it cost to go live?",
      a: "Creators build and preview for free. When a business owner goes live, they pay through the watermark checkout on the published site. Moonrise keeps 10% and the creator keeps 90%. The watermark is removed automatically after payment.",
    },
    {
      q: "Can business owners pay without a Moonrise account?",
      a: "Yes. Owners pay directly on the live watermarked site through secure Stripe checkout. They do not need a creator account.",
    },
    {
      q: "Who is Moonrise for?",
      a: "Moonrise is for creators, freelancers, and side hustlers who want to sell websites to local shops, cafes, salons, and other small businesses without coding.",
    },
  ],
  /** Brand assets - relative paths work on Vercel and after custom-domain DNS is pointed here. */
  assetCdnUrl: "doc/",
  brandLogoUrl: "doc/MoonriseLogo.png",
  /** Social / link preview image (Discord, iMessage, Twitter, etc.). */
  embedImageUrl: "https://trymoonrise.com/doc/embed.png",
  /** Default profile picture when a user has not uploaded one. */
  defaultAvatarUrl: "doc/pfp.png",
  docBaseUrl: "doc/",

  /** Moonrise Studio Supabase project (public anon / publishable key only). */
  supabaseUrl: "https://erfaxgmnzdropviormpj.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZmF4Z21uemRyb3B2aW9ybXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjc2MjQsImV4cCI6MjA5OTc0MzYyNH0.u2kwY7s1dpRkjZ9NG_09jhRML4HvirtrNUvMl1053Xw",

  /**
   * Cloud API worker (generate, Stripe, publish, watermark embed).
   * Hosted on Vercel - works from any device / production Studio URL.
   * Local worker is opt-in: localStorage.ms_use_local_worker = "1"
   */
  workerUrl: "https://trymoonrise.com",
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

  useSupabaseLeads: true,

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

/** Canonical cloud worker (apex). www redirects /api with 308 and breaks browser fetch CORS. */
function moonriseCanonicalWorkerBase() {
  return String(window.SITE_CONFIG?.workerUrl || "https://trymoonrise.com")
    .trim()
    .replace(/\/$/, "");
}

/** www → apex so API calls stay same-origin (www /health 308 breaks fetch CORS). */
function enforceMoonriseApexHost() {
  try {
    if (typeof location === "undefined") return;
    if (String(location.hostname || "").toLowerCase() !== "www.trymoonrise.com") return;
    const apex = moonriseCanonicalWorkerBase();
    location.replace(apex + location.pathname + location.search + location.hash);
  } catch (_) {
    /* ignore */
  }
}

enforceMoonriseApexHost();

function moonriseWorkerApiUrl(base, path) {
  const route = String(path || "").startsWith("/") ? path : "/" + String(path || "");
  try {
    if (typeof location !== "undefined") {
      const pageOrigin = String(location.origin || "").replace(/\/$/, "");
      const workerOrigin = String(base || "").replace(/\/$/, "");
      if (pageOrigin && workerOrigin && pageOrigin === workerOrigin) {
        return route;
      }
    }
  } catch (_) {
    /* keep absolute */
  }
  return String(base || "").replace(/\/$/, "") + route;
}

function moonriseProductionWorkerBase(pageHost) {
  const host = String(pageHost || "").toLowerCase();
  if (host === "trymoonrise.com" || host === "www.trymoonrise.com") {
    return moonriseCanonicalWorkerBase();
  }
  if (isMoonriseProductionHost(host)) {
    try {
      return String(location.origin || "").replace(/\/$/, "");
    } catch (_) {
      return moonriseCanonicalWorkerBase();
    }
  }
  return "";
}

/** Cached after a successful /health probe (see pingMoonriseWorker). */
window.__MOONRISE_RESOLVED_WORKER_URL = "";

function workerCacheMatchesPage(url) {
  try {
    if (!url || typeof location === "undefined") return true;
    if (isMoonriseProductionHost(location.hostname)) {
      const urlOrigin = new URL(url).origin;
      const host = String(location.hostname || "").toLowerCase();
      if (host === "trymoonrise.com" || host === "www.trymoonrise.com") {
        return (
          urlOrigin === moonriseCanonicalWorkerBase() || urlOrigin === location.origin
        );
      }
      return urlOrigin === location.origin;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function clearStaleWorkerUrlCache() {
  const cached = String(window.__MOONRISE_RESOLVED_WORKER_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (cached && !workerCacheMatchesPage(cached)) {
    window.__MOONRISE_RESOLVED_WORKER_URL = "";
  }
}

clearStaleWorkerUrlCache();

/**
 * Resolve the worker base URL for the current page host.
 * Production Studio hosts use same-origin API routes (Vercel rewrites).
 * Local/LAN pages use the cloud worker by default so generate works without
 * `npm start`. Opt into local with:
 *   localStorage.setItem("ms_use_local_worker", "1")
 */
window.resolveWorkerUrl = function resolveWorkerUrl() {
  clearStaleWorkerUrlCache();
  const cached = String(window.__MOONRISE_RESOLVED_WORKER_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (cached && workerCacheMatchesPage(cached)) {
    return cached;
  }
  const cloud = String(window.SITE_CONFIG?.workerUrl || "https://trymoonrise.com").replace(/\/$/, "");
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
    // Opt-in only - default cloud avoids "Can't reach worker" when local isn't running.
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
      const prodBase = moonriseProductionWorkerBase(pageHost);
      if (prodBase) return prodBase;
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
  try {
    if (typeof location !== "undefined" && isMoonriseProductionHost(location.hostname)) {
      const host = String(location.hostname || "").toLowerCase();
      push(moonriseProductionWorkerBase(location.hostname));
      push(moonriseCanonicalWorkerBase());
      // Never probe www — it 308-redirects /health without CORS on the redirect.
      if (host !== "trymoonrise.com" && host !== "www.trymoonrise.com") {
        if (location.origin) push(location.origin);
      }
      return out;
    }
  } catch (_) {
    /* ignore */
  }
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
  clearStaleWorkerUrlCache();
  const cached = String(window.__MOONRISE_RESOLVED_WORKER_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (cached && workerCacheMatchesPage(cached)) return cached;

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
      const timer = window.setTimeout(() => ctrl.abort(), 30000);
      const onParentAbort = () => ctrl.abort();
      signal?.addEventListener("abort", onParentAbort);
      try {
        const healthUrl = moonriseWorkerApiUrl(base, "/health");
        const health = await fetch(healthUrl, {
          method: "GET",
          cache: "no-store",
          credentials: "omit",
          mode: healthUrl.startsWith("http") ? "cors" : "same-origin",
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
 * LeadFinder scrape API - always via authenticated worker proxy when available.
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
