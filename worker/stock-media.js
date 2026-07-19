/**
 * Curated stock media for website generation.
 * Uses known-good public CDN URLs (Unsplash + Pexels) - no live scrape mid-generate.
 * Pick by business category so aesthetics match the trade.
 *
 * Library: stock-media-library.js (400+ assets across 30 trade packs)
 * Rebuild: node scripts/build-stock-library.js --verify
 * Expand:  node scripts/expand-stock-library.js
 */

const library = require("./stock-media-library");

const U = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const VID = library.VIDEOS || {};

const SLOT_KEYS = [
  "hero",
  "about",
  "service1",
  "service2",
  "service3",
  "gallery1",
  "gallery2",
  "gallery3",
  "gallery4",
  "portrait",
  "detail1",
  "detail2",
];

function resolveImageUrl(entry) {
  if (!entry) return "";
  if (typeof entry === "string") {
    if (/^https?:\/\//i.test(entry)) return entry;
    if (entry.startsWith("pexels-")) {
      const id = entry.replace(/^pexels-/, "");
      return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
    }
    if (entry.startsWith("photo-")) return U(entry);
    return entry;
  }
  return entry.url || "";
}

function buildPackImages(pack) {
  const urls = [];
  const fromIds = Array.isArray(pack.images) ? pack.images : [];
  for (const id of fromIds) {
    const url = resolveImageUrl(id);
    if (url) urls.push(url);
  }
  const gallery = Array.isArray(pack.galleryUrls) ? pack.galleryUrls : [];
  for (const url of gallery) {
    if (url && !urls.includes(url)) urls.push(url);
  }
  const fallback = (library.ALL_IMAGE_URLS || []).slice(0, 16);
  for (const url of fallback) {
    if (urls.length >= SLOT_KEYS.length) break;
    if (url && !urls.includes(url)) urls.push(url);
  }
  const images = {};
  SLOT_KEYS.forEach((slot, i) => {
    images[slot] = urls[i % urls.length] || urls[0] || "";
  });
  images._all = urls;
  return images;
}

function buildPackVideos(pack) {
  const keys = Array.isArray(pack.videos) ? pack.videos : ["city", "ambient"];
  const videos = {
    hero: VID[keys[0]] || VID.city || VID.ambient,
    ambient: VID[keys[1]] || VID.ambient || VID.soft,
  };
  if (keys[2] && VID[keys[2]]) videos.detail = VID[keys[2]];
  return videos;
}

/** Runtime packs keyed by trade (images resolved to absolute CDN URLs). */
const PACKS = {};
for (const [key, pack] of Object.entries(library.PACKS || {})) {
  PACKS[key] = {
    label: pack.label,
    images: buildPackImages(pack),
    videos: buildPackVideos(pack),
  };
}

function compileMatchers() {
  const fromLib = Array.isArray(library.MATCHERS) ? library.MATCHERS : [];
  const compiled = [];
  for (const m of fromLib) {
    try {
      const raw = String(m.re || "");
      const match = raw.match(/^\/(.+)\/([a-z]*)$/i);
      if (!match) continue;
      compiled.push({ key: m.key, re: new RegExp(match[1], match[2] || "i") });
    } catch (_) {
      /* skip bad matcher */
    }
  }
  if (compiled.length) return compiled;
  return [
    { key: "barber", re: /barber|fade|men'?s cut|clipper|barbershop|beard trim/i },
    { key: "salon", re: /hair salon|beauty salon|nail salon|hairstylist|manicure/i },
    { key: "spa", re: /spa|massage|wellness|facial|aromatherapy/i },
    { key: "landscaping", re: /landscap|garden|lawn|yard|tree service|plants?/i },
    { key: "florist", re: /florist|flower shop|bouquet|floral/i },
    { key: "plumbing", re: /plumb|pipe|drain|water heater|faucet|toilet/i },
    { key: "electrical", re: /electric|wiring|breaker|panel|outlet/i },
    { key: "hvac", re: /hvac|heating|air ?condition|furnace|thermostat/i },
    { key: "roofing", re: /roof|gutter|shingle|siding/i },
    { key: "painting", re: /paint|painter|drywall|wallpaper/i },
    { key: "cleaning", re: /clean|janitor|maid|housekeep|pressure wash/i },
    { key: "construction", re: /construct|contractor|remodel|builder|handyman/i },
    { key: "tutoring", re: /tutor|school|teach|education|learning|academy|books?/i },
    { key: "daycare", re: /daycare|childcare|preschool|kids|children/i },
    { key: "restaurant", re: /restaurant|dining|bistro|steakhouse|grill|cuisine/i },
    { key: "pizza", re: /pizza|italian|pizzaria/i },
    { key: "cafe", re: /cafe|coffee|espresso|bakery|pastry|brunch/i },
    { key: "fitness", re: /gym|fitness|crossfit|workout|athletic|boxing/i },
    { key: "yoga", re: /yoga|pilates|meditation|mindful/i },
    { key: "dental", re: /dental|dentist|orthodont|teeth|oral/i },
    { key: "medical", re: /clinic|medical|doctor|health|chiro|therapy/i },
    { key: "pets", re: /pet|dog|cat|groom|boarding|veterinar|animal/i },
    { key: "legal", re: /law|attorney|legal|lawyer|notary/i },
    { key: "finance", re: /account|finance|insurance|tax|cpa|advisor/i },
    { key: "realestate", re: /real estate|realtor|property|listing|broker/i },
    { key: "auto", re: /auto|car detail|mechanic|tire|body shop|towing/i },
    { key: "photography", re: /photograph|photo studio|videograph/i },
    { key: "agency", re: /agency|marketing|design studio|saas|software|startup/i },
    { key: "moving", re: /moving|movers|storage|hauling|relocation/i },
  ];
}

const MATCHERS = compileMatchers();

function pickPackKey(ctx) {
  const hay = `${ctx?.category || ""} ${ctx?.businessName || ""} ${ctx?.notes || ""}`;
  for (const m of MATCHERS) {
    if (m.re.test(hay)) return m.key;
  }
  return "default";
}

function selectStockMedia(ctx) {
  const key = pickPackKey(ctx);
  const pack = PACKS[key] || PACKS.default;
  return {
    key,
    label: pack.label,
    images: { ...pack.images },
    videos: { ...pack.videos },
  };
}

function catalogStats() {
  return {
    ...(library.meta || {}),
    packs: Object.keys(PACKS).length,
    matchers: MATCHERS.length,
  };
}

/** Compact prompt block - absolute URLs only. */
function formatStockMediaForPrompt(media) {
  if (!media?.images) return "";
  const img = media.images;
  const vid = media.videos || {};
  const extras = Array.isArray(img._all) ? img._all.slice(SLOT_KEYS.length, SLOT_KEYS.length + 8) : [];
  const lines = [
    `## Stock media pack (REQUIRED - use these exact URLs)`,
    `Theme: ${media.label || media.key || "general"}`,
    "Use ONLY these absolute https URLs for images and videos. Never invent URLs. Never keep relative ../stock/ paths.",
    "",
    "Images:",
    `- hero: ${img.hero}`,
    `- about: ${img.about}`,
    `- service1: ${img.service1}`,
    `- service2: ${img.service2}`,
    `- service3: ${img.service3 || img.service1}`,
    `- gallery1: ${img.gallery1}`,
    `- gallery2: ${img.gallery2}`,
    `- gallery3: ${img.gallery3 || img.gallery1}`,
    `- gallery4: ${img.gallery4 || img.gallery2}`,
    `- portrait: ${img.portrait}`,
    `- detail1: ${img.detail1 || img.about}`,
    `- detail2: ${img.detail2 || img.service1}`,
  ];
  if (extras.length) {
    lines.push("", "More gallery options:");
    extras.forEach((url, i) => lines.push(`- extra${i + 1}: ${url}`));
  }
  lines.push(
    "",
    "Videos (muted autoplay loop playsinline - use in hero or atmosphere sections):",
    `- heroVideo: ${vid.hero || img.hero}`,
    `- ambientVideo: ${vid.ambient || vid.hero || ""}`,
    vid.detail ? `- detailVideo: ${vid.detail}` : "",
    "",
    "Placement:",
    "- Hero: prefer muted looping <video> with poster=hero image, OR a full-bleed hero image.",
    "- About / services / gallery: use the matching image URLs with descriptive alt text.",
    "- Every visual section needs real media - no empty gray boxes, no broken relative paths.",
    "- If you need more images than unique slots above, REUSE these pack URLs. Never invent URLs.",
    "- Match the theme to this business (barber gets haircuts, gardener gets plants, tutor gets books, plumber gets tools)."
  );
  return lines.filter(Boolean).join("\n");
}

/**
 * Rewrite relative Website Presets stock paths to absolute pack URLs
 * so the model (and final HTML) never ship dead ../stock/media links.
 */
function rewriteStockPathsInHtml(html, media) {
  const src = String(html || "");
  if (!src || !media?.images) return src;
  const img = media.images;
  const vid = media.videos || {};
  let out = src;

  const imageTargets = [
    [/(\.\.\/)+stock\/media\/16-9[^"' )\]]*/gi, img.hero],
    [/(\.\.\/)+stock\/media\/4-5[^"' )\]]*/gi, img.portrait],
    [/(\.\.\/)+stock\/media\/9-16[^"' )\]]*/gi, img.gallery1],
    [/(\.\.\/)+stock\/media\/heroes\/[^"' )\]]+\.(?:png|jpe?g|webp|gif)/gi, img.hero],
    [/(\.\.\/)+stock\/media\/(?!heroes\/)[^"' )\]]+\.(?:png|jpe?g|webp|gif)/gi, img.about],
  ];
  for (const [re, url] of imageTargets) {
    out = out.replace(re, url);
  }

  const videoTargets = [
    [/(\.\.\/)+stock\/media\/heroes\/ocean[^"' )\]]*/gi, vid.hero || img.hero],
    [/(\.\.\/)+stock\/media\/heroes\/city[^"' )\]]*/gi, vid.ambient || vid.hero || img.hero],
    [/(\.\.\/)+stock\/media\/heroes\/forest[^"' )\]]*/gi, vid.ambient || vid.hero || img.hero],
    [/(\.\.\/)+stock\/media\/heroes\/[^"' )\]]+\.mp4/gi, vid.hero || img.hero],
    [/(\.\.\/)+stock\/media\/[^"' )\]]+\.mp4/gi, vid.ambient || vid.hero || img.hero],
  ];
  for (const [re, url] of videoTargets) {
    out = out.replace(re, url);
  }

  return out;
}

/** Final safety net: replace any leftover relative stock paths in assembled HTML. */
function ensureStockMediaInHtml(html, media) {
  let out = rewriteStockPathsInHtml(html, media);
  if (!media?.images?.hero) return out;
  out = out.replace(
    /src=(["'])(?!https?:\/\/)[^"']*\.(?:png|jpe?g|webp|gif|mp4)\1/gi,
    (match) => {
      if (/https?:\/\//i.test(match)) return match;
      if (/\.mp4/i.test(match)) {
        return `src="${media.videos?.hero || media.images.hero}"`;
      }
      return `src="${media.images.hero}"`;
    }
  );
  return out;
}

module.exports = {
  selectStockMedia,
  formatStockMediaForPrompt,
  rewriteStockPathsInHtml,
  ensureStockMediaInHtml,
  catalogStats,
  PACKS,
  MATCHERS,
  VID,
};
