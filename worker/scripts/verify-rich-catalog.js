const fs = require("fs");
const path = require("path");
const { getBusinessStructure, getStructurePresetRoles } = require("../business-structures");
const { formatPresetCatalog, formatPresetPack } = require("../generate-prompt");

const manifestPath = path.join(__dirname, "..", "..", "Website Presets", "presets", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const required = [
  "id",
  "slug",
  "file",
  "title",
  "category",
  "tags",
  "role",
  "pageReady",
  "layout",
  "summary",
  "slots",
  "mood",
  "adaptHint",
  "structure",
];

let missing = 0;
for (const entry of manifest) {
  for (const key of required) {
    if (!(key in entry)) {
      missing += 1;
      break;
    }
  }
  if (!entry.structure || typeof entry.structure.layout !== "string") missing += 1;
}

console.log(
  "entries",
  manifest.length,
  "missingFields",
  missing,
  "pageReady",
  manifest.filter((e) => e.pageReady).length
);

for (const id of ["0110", "0111", "0114", "0118"]) {
  const entry = manifest.find((x) => String(x.id) === id);
  console.log(
    "sample",
    id,
    entry
      ? {
          role: entry.role,
          pageReady: entry.pageReady,
          layout: entry.layout,
          summary: entry.summary,
          slots: entry.slots,
          mood: entry.mood,
        }
      : "MISSING"
  );
}

function hashPick(seed, modulo) {
  const s = String(seed || "moonrise");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

function preferPageReadyPool(pool) {
  const ready = pool.filter((item) => item && item.pageReady === true);
  return ready.length ? ready : pool;
}

function scorePresetCandidate(item, { sectionRole, moodAnchor, layoutAnchor, seedKey }) {
  let score = 0;
  if (item.pageReady === true) score += 40;
  if (item.role && sectionRole && item.role === sectionRole) score += 25;
  for (const mood of item.mood || []) {
    if (moodAnchor.has(mood)) score += 8;
  }
  if (layoutAnchor && item.layout === layoutAnchor) score += 10;
  score += hashPick(`${seedKey}:${item.id}`, 7);
  return score;
}

function selectKit(ctx) {
  const structure = getBusinessStructure(ctx);
  const sectionRoles = getStructurePresetRoles(structure, 12);
  const seed = `${ctx.businessName || ""}:${ctx.variationSeed || ""}`;
  const byCategory = new Map();
  for (const item of manifest) {
    const cat = String(item.category || "").toLowerCase();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }
  const ids = [];
  const roleById = {};
  const used = new Set();
  const moodAnchor = new Set();
  let layoutAnchor = "";

  for (const { section, role, categories } of sectionRoles) {
    if (ids.length >= 12) break;
    let pool = [];
    for (const cat of categories) {
      for (const item of byCategory.get(cat) || []) pool.push(item);
    }
    if (section === "contact_form") {
      const filtered = pool.filter(
        (item) => !/login|subscribe|newsletter|sign-?up|inline-form|multi-step/i.test(String(item.slug || item.title || ""))
      );
      if (filtered.length) pool = filtered;
    }
    let candidates = preferPageReadyPool(pool);
    const roleMatched = candidates.filter((item) => item.role === role);
    if (roleMatched.length) candidates = roleMatched;

    const ranked = candidates
      .filter((item) => item.id && item.file && !used.has(String(item.id)))
      .map((item) => ({
        item,
        score: scorePresetCandidate(item, {
          sectionRole: role,
          moodAnchor,
          layoutAnchor,
          seedKey: `${seed}:${section}`,
        }),
      }))
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) continue;
    const topScore = ranked[0].score;
    const cluster = ranked.filter((row) => row.score >= topScore - 12);
    const chosen = cluster[hashPick(`${seed}:${section}:pick`, cluster.length)].item;
    used.add(String(chosen.id));
    ids.push(String(chosen.id));
    roleById[chosen.id] = role;
    for (const mood of chosen.mood || []) moodAnchor.add(mood);
    if (!layoutAnchor && chosen.layout) layoutAnchor = chosen.layout;
  }
  return { ids, roleById, structure };
}

for (const ctx of [
  { businessName: "Ace Plumbing", category: "plumber", variationSeed: "v1" },
  { businessName: "Glow Spa", category: "spa massage", variationSeed: "v2" },
  { businessName: "Summit Law", category: "attorney", variationSeed: "v3" },
]) {
  const result = selectKit(ctx);
  const packs = result.ids.map((id) => {
    const entry = manifest.find((x) => String(x.id) === id);
    return {
      id,
      role: result.roleById[id],
      pageReady: entry.pageReady,
      mood: (entry.mood || []).join("|"),
      layout: entry.layout,
      title: entry.title,
    };
  });
  const readyPct = `${packs.filter((p) => p.pageReady).length}/${packs.length}`;
  console.log(`\nKIT ${ctx.businessName} ${result.structure.bucket} pageReady ${readyPct}`);
  console.log(packs.map((p) => `${p.role}=${p.id}(${p.layout},${p.mood})`).join(" | "));
}

const catalogLine = formatPresetCatalog([
  {
    id: "0111",
    role: "hero",
    layout: "split-media",
    summary: "Split hero.",
    mood: ["bold", "media-forward"],
    slots: ["headline", "media"],
    pageReady: true,
  },
]);
console.log("\ncatalog line:", catalogLine);

const packText = formatPresetPack([
  {
    id: "0111",
    role: "hero",
    title: "Split",
    layout: "split-media",
    summary: "Split hero.",
    slots: ["headline", "media"],
    mood: ["bold"],
    adaptHint: "Keep split.",
    structure: { layout: "CSS grid", patterns: ["media frame"], hasMedia: true, hasForm: false },
    html: '<div class="hero"><h1>Hi</h1></div>',
  },
]);
console.log("pack has adaptHint", packText.includes("Adapt hint:"));
console.log("pack has slots", packText.includes("Slots to fill:"));
