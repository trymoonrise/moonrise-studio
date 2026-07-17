/**
 * Public Studio config only — never put secret keys here.
 * Worker secrets live in worker/.env / Render env vars.
 */
window.SITE_CONFIG = {
  companyName: "Moonrise Studio",
  brandLogoUrl:
    "https://github.com/trymoonrise/dashboard/raw/main/doc/MoonriseLogo.png",
  /** Social / link preview image (Discord, iMessage, Twitter, etc.). */
  embedImageUrl:
    "https://github.com/trymoonrise/dashboard/raw/main/doc/embed.png",
  /** Default profile picture when a user has not uploaded one. */
  defaultAvatarUrl:
    "https://github.com/trymoonrise/dashboard/raw/main/doc/pfp.png",
  docBaseUrl: "doc/",

  /** Moonrise Studio Supabase project (public anon / publishable key only). */
  supabaseUrl: "https://erfaxgmnzdropviormpj.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZmF4Z21uemRyb3B2aW9ybXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjc2MjQsImV4cCI6MjA5OTc0MzYyNH0.u2kwY7s1dpRkjZ9NG_09jhRML4HvirtrNUvMl1053Xw",

  /**
   * Cloud API worker (generate, Stripe, publish, watermark embed).
   * Hosted on Vercel — works from any device / production Studio URL.
   * Set localStorage.ms_use_local_worker = "1" to force localWorkerUrl instead.
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

/**
 * Resolve the worker base URL for the current page host.
 * Rewrites loopback (127.0.0.1 ↔ localhost) and LAN IP when Studio isn't on loopback.
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
    const isLocalPage =
      pageHost === "localhost" ||
      pageHost === "127.0.0.1" ||
      pageHost === "[::1]" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(pageHost) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(pageHost);
    const pref =
      typeof localStorage !== "undefined" ? localStorage.getItem("ms_use_local_worker") : null;
    const useLocal = pref === "1" || (pref !== "0" && isLocalPage);
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
