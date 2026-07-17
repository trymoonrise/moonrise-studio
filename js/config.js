/**
 * Public Studio config only — never put secret keys here.
 * Worker secrets live in worker/.env / Render env vars.
 */
window.SITE_CONFIG = {
  companyName: "Moonrise Studio",
  brandLogoUrl: "doc/MoonriseLogo.png",
  /** Default profile picture when a user has not uploaded one. */
  defaultAvatarUrl: "doc/pfp.png",
  docBaseUrl: "doc/",

  /** Moonrise Studio Supabase project (public anon / publishable key only). */
  supabaseUrl: "https://erfaxgmnzdropviormpj.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZmF4Z21uemRyb3B2aW9ybXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjc2MjQsImV4cCI6MjA5OTc0MzYyNH0.u2kwY7s1dpRkjZ9NG_09jhRML4HvirtrNUvMl1053Xw",

  /** Render worker base URL (local default; override in production). */
  workerUrl: "http://127.0.0.1:8787",

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
