/**
 * Public Studio config only — never put secret keys here.
 * Worker secrets live in worker/.env / Render env vars.
 */
window.SITE_CONFIG = {
  companyName: "trymoonrise.com",
  /** Default social / link preview description (Discord, iMessage, Twitter, etc.). */
  siteDescription:
    "Moonrise is an AI-powered platform that lets you create professional websites in minutes for local business owners, creators, and more! It's designed to make website creation fast, simple, effortless, and get paid.",
  /** Absolute CDN base for brand assets (watermarks / OG tags on other origins). */
  assetCdnUrl: "https://moonrise-studio.vercel.app/doc/",
  brandLogoUrl: "https://moonrise-studio.vercel.app/doc/MoonriseLogo.png",
  /** Social / link preview image (Discord, iMessage, Twitter, etc.). */
  embedImageUrl:
    "https://github.com/trymoonrise/moonrise-studio/blob/main/doc/embed.png?raw=true",
  /** Default profile picture when a user has not uploaded one. */
  defaultAvatarUrl: "https://moonrise-studio.vercel.app/doc/pfp.png",
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

/**
 * Resolve the worker base URL for the current page host.
 * Public hosts always use the cloud worker.
 * Local/LAN pages also use the cloud worker by default so generate works
 * without a local `npm start`. Opt into local with:
 *   localStorage.setItem("ms_use_local_worker", "1")
 */
window.resolveWorkerUrl = function resolveWorkerUrl() {
  const cloud = String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
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
  } catch (_) {
    /* keep cloud */
  }
  return cloud || localConfigured;
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
