/**
 * Business page bone structures - derived from scanning 261 real lead websites
 * (LeadFinderCloud/data/all-leads.csv, Jul 2026).
 *
 * Generation uses these as the fixed page arc; Website Presets supply the visuals.
 */
"use strict";

const TRADE_BUCKETS = [
  { id: "barber_salon", match: /barber|hair salon|beauty salon|nail salon|spa|massage/i },
  { id: "dental_medical", match: /dental|dentist|orthodont|chiropract|physical therapy|clinic|doctor|medical|urgent care|optomet|dermatolog|pediatric/i },
  { id: "restaurant_food", match: /restaurant|cafe|coffee|bakery|pizza|food|catering|juice|\bbar\b|grill|kitchen|diner/i },
  { id: "fitness", match: /gym|fitness|yoga|pilates|crossfit|martial|training|sport/i },
  { id: "home_services", match: /plumb|electric|hvac|roof|landscap|lawn|pest|clean|paint|handyman|pressure wash|pool|flooring|carpet|tree service|contractor|construction|garage door/i },
  { id: "auto", match: /auto repair|car detail|tire|oil change|body shop|towing|mechanic/i },
  { id: "legal_finance", match: /attorney|law firm|lawyer|legal|accounting|insurance|financial|real estate/i },
  { id: "pet", match: /veterinar|pet groom|dog train|pet board|animal/i },
  { id: "professional", match: /marketing|agency|consult|design|photograph|software|tech/i },
];

const DEFAULT_BUCKET = "local_service";

/** Human labels for prompt + docs. */
const SECTION_LABELS = {
  navigation: "Navigation",
  hero: "Hero",
  credibility: "Credibility / trust strip",
  services: "Services",
  about: "About",
  gallery: "Photo gallery / portfolio",
  testimonials: "Testimonials / reviews",
  pricing: "Pricing / packages",
  team: "Team / staff",
  faq: "FAQ",
  hours_location: "Hours & location",
  map: "Map embed",
  cta_band: "CTA band",
  contact_form: "Contact form",
  footer: "Footer",
};

/**
 * Preset manifest categories to pull for each page section.
 * Used when selecting the component kit locally.
 */
const SECTION_PRESET_CATEGORIES = {
  navigation: ["navigation", "menus", "docks"],
  hero: ["hero", "heroes", "text", "videos"],
  credibility: ["hooks", "features", "announcements", "badges", "numbers"],
  services: ["features", "cards", "sections", "pricing"],
  about: ["sections", "bios", "text", "profiles"],
  gallery: ["galleries", "images", "stack-gallery", "carousels", "cards"],
  testimonials: ["testimonials", "hooks", "cards"],
  pricing: ["pricing", "cards", "features", "comparisons"],
  team: ["bios", "profiles", "avatars", "cards"],
  faq: ["accordions", "sections"],
  hours_location: ["sections", "maps", "text"],
  map: ["maps"],
  cta_band: ["cta", "buttons", "announcements"],
  contact_form: ["forms", "inputs", "textareas"],
  footer: ["footers"],
  accent: ["backgrounds", "effects", "animation", "ease-in"],
};

/**
 * Typical page arc per trade (from real-site frequency analysis).
 * Order is fixed - assembler adapts presets into this skeleton.
 */
const BUSINESS_STRUCTURES = {
  barber_salon: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "pricing",
    "hours_location",
    "cta_band",
    "contact_form",
    "footer",
  ],
  dental_medical: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "team",
    "gallery",
    "testimonials",
    "pricing",
    "faq",
    "hours_location",
    "map",
    "cta_band",
    "contact_form",
    "footer",
  ],
  restaurant_food: [
    "navigation",
    "hero",
    "credibility",
    "about",
    "gallery",
    "services",
    "hours_location",
    "testimonials",
    "map",
    "contact_form",
    "footer",
  ],
  fitness: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "pricing",
    "gallery",
    "testimonials",
    "faq",
    "team",
    "cta_band",
    "contact_form",
    "footer",
  ],
  home_services: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "pricing",
    "faq",
    "map",
    "hours_location",
    "contact_form",
    "cta_band",
    "footer",
  ],
  auto: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "pricing",
    "hours_location",
    "faq",
    "map",
    "cta_band",
    "contact_form",
    "footer",
  ],
  legal_finance: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "team",
    "gallery",
    "testimonials",
    "pricing",
    "hours_location",
    "map",
    "cta_band",
    "contact_form",
    "footer",
  ],
  pet: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "hours_location",
    "team",
    "faq",
    "cta_band",
    "map",
    "contact_form",
    "footer",
  ],
  professional: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "gallery",
    "about",
    "testimonials",
    "pricing",
    "faq",
    "hours_location",
    "cta_band",
    "contact_form",
    "footer",
  ],
  local_service: [
    "navigation",
    "hero",
    "credibility",
    "services",
    "about",
    "gallery",
    "testimonials",
    "pricing",
    "hours_location",
    "faq",
    "map",
    "contact_form",
    "cta_band",
    "footer",
  ],
};

function getTradeBucket(ctx) {
  const hay = `${ctx?.category || ""} ${ctx?.businessName || ""} ${ctx?.notes || ""}`;
  for (const b of TRADE_BUCKETS) {
    if (b.match.test(hay)) return b.id;
  }
  return DEFAULT_BUCKET;
}

function getBusinessStructure(ctx) {
  const bucket = getTradeBucket(ctx);
  const sections = BUSINESS_STRUCTURES[bucket] || BUSINESS_STRUCTURES[DEFAULT_BUCKET];
  return {
    bucket,
    sections,
    labels: sections.map((s) => SECTION_LABELS[s] || s),
  };
}

function formatStructureForPrompt(structure) {
  const { bucket, sections } = structure;
  const lines = sections.map((s, i) => `${i + 1}. ${SECTION_LABELS[s] || s} (\`${s}\`)`);
  return [
    `Trade bucket: ${bucket}`,
    "Full page arc (build EVERY section below in order; one cohesive scrolling site):",
    ...lines,
    "",
    "Sections without a matching kit preset: still build them using the same palette, typography, and stock media.",
  ].join("\n");
}

/**
 * Ordered preset picks: prioritize sections that anchor a full page (nav, hero,
 * services, proof, form, footer), then fill remaining trade-specific sections.
 */
const PRESET_SECTION_PRIORITY = [
  "navigation",
  "hero",
  "services",
  "credibility",
  "about",
  "gallery",
  "testimonials",
  "pricing",
  "team",
  "faq",
  "hours_location",
  "map",
  "cta_band",
  "contact_form",
  "footer",
];

function getStructurePresetRoles(structure, maxFiles = 10) {
  const structureSet = new Set(structure.sections);
  const ordered = [];
  const seen = new Set();

  for (const section of PRESET_SECTION_PRIORITY) {
    if (!structureSet.has(section) || seen.has(section)) continue;
    ordered.push(section);
    seen.add(section);
  }
  for (const section of structure.sections) {
    if (seen.has(section)) continue;
    ordered.push(section);
    seen.add(section);
  }

  const roles = [];
  for (const section of ordered) {
    if (roles.length >= maxFiles) break;
    const cats = SECTION_PRESET_CATEGORIES[section];
    if (!cats) continue;
    roles.push({ section, role: section, categories: cats });
  }
  return roles;
}

module.exports = {
  TRADE_BUCKETS,
  DEFAULT_BUCKET,
  SECTION_LABELS,
  SECTION_PRESET_CATEGORIES,
  PRESET_SECTION_PRIORITY,
  BUSINESS_STRUCTURES,
  getTradeBucket,
  getBusinessStructure,
  formatStructureForPrompt,
  getStructurePresetRoles,
};
