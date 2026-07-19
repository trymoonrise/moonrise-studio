/**
 * One-off: scan leads with websites and infer common page sections per trade.
 * Usage: node scripts/analyze-lead-website-structure.js [--limit=400] [--concurrency=8]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const CSV_PATH = path.join(__dirname, "..", "..", "..", "LeadFinderCloud", "data", "all-leads.csv");
const OUT_PATH = path.join(__dirname, "lead-structure-analysis.json");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "1"];
  })
);
const LIMIT = Number(args.limit || 350);
const CONCURRENCY = Math.min(12, Math.max(2, Number(args.concurrency || 8)));
const FETCH_TIMEOUT_MS = 12000;

/** Broad trade buckets for aggregation. */
const TRADE_BUCKETS = [
  { id: "barber_salon", match: /barber|hair salon|beauty salon|nail salon|spa|massage/i },
  { id: "dental_medical", match: /dental|dentist|orthodont|chiropract|physical therapy|clinic|doctor|medical|urgent care|optomet|dermatolog|pediatric/i },
  { id: "restaurant_food", match: /restaurant|cafe|coffee|bakery|pizza|food|catering|juice|bar\b|grill|kitchen|diner/i },
  { id: "fitness", match: /gym|fitness|yoga|pilates|crossfit|martial|training|sport/i },
  { id: "home_services", match: /plumb|electric|hvac|roof|landscap|lawn|pest|clean|paint|handyman|pressure wash|pool|flooring|carpet|tree service|contractor|construction|garage door/i },
  { id: "auto", match: /auto repair|car detail|tire|oil change|body shop|towing|mechanic/i },
  { id: "legal_finance", match: /attorney|law firm|lawyer|legal|accounting|insurance|financial|real estate/i },
  { id: "pet", match: /veterinar|pet groom|dog train|pet board|animal/i },
  { id: "professional", match: /marketing|agency|consult|design|photograph|software|tech/i },
];

const DEFAULT_BUCKET = "local_service";

function tradeBucket(category, name) {
  const hay = `${category || ""} ${name || ""}`;
  for (const b of TRADE_BUCKETS) {
    if (b.match.test(hay)) return b.id;
  }
  return DEFAULT_BUCKET;
}

function isValidSite(url) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (/google\.(com|ca)|gstatic\.com|facebook\.com\/pg|instagram\.com|yelp\.com|bbb\.org/i.test(u)) {
    return false;
  }
  return true;
}

/** Section detectors - keyword/heuristic on lowercased HTML text + attrs. */
const SECTION_DETECTORS = {
  navigation: /\b(nav|navbar|site-header|main-menu|menu-toggle)\b|<nav[\s>]/i,
  hero: /\b(hero|banner|jumbotron|masthead|page-header)\b|class="[^"]*hero/i,
  credibility: /\b(licensed|insured|certified|accredited|years of experience|since 19|since 20|\b\d+\+?\s*years\b|bbb|award|trusted by|as seen on)\b/i,
  services: /\b(our services|services we offer|what we do|service area|service menu)\b|\bservices\b/i,
  about: /\b(about us|who we are|our story|meet the team|our team|our mission)\b/i,
  gallery: /\b(gallery|portfolio|our work|before and after|photo gallery|project gallery)\b/i,
  testimonials: /\b(testimonial|what (our )?clients say|customer reviews|google reviews|review carousel|client stories)\b|\breviews\b/i,
  pricing: /\b(pricing|our rates|price list|packages|plans)\b/i,
  faq: /\b(faq|frequently asked)\b/i,
  team: /\b(meet (the )?team|our (staff|dentists|doctors|barbers|stylists|trainers|attorneys))\b/i,
  hours_location: /\b(hours of operation|business hours|find us|visit us|directions|service area)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(am|pm|closed)\b/i,
  map: /\b(google\.com\/maps|maps\.google|iframe[^>]+maps|data-map|mapbox)\b/i,
  contact_form: /<form[\s\S]{0,2500}?(name|phone|email|message|submit)/i,
  cta_band: /\b(book (now|online|appointment)|schedule (a )?(consultation|appointment)|get (a )?quote|call now|contact us today|free estimate)\b/i,
  footer: /<footer[\s>]/i,
};

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "MoonriseStudioStructureBot/1.0 (+research)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct) && !ct.includes("text")) return "";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 1_500_000) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch (_) {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function detectSections(html) {
  const text = String(html || "");
  const found = {};
  for (const [key, re] of Object.entries(SECTION_DETECTORS)) {
    found[key] = re.test(text);
  }
  return found;
}

function orderFromSections(sections) {
  const canonical = [
    "navigation",
    "hero",
    "credibility",
    "services",
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
  return canonical.filter((k) => sections[k]);
}

async function mapPool(items, fn, concurrency) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0;
}

function buildBlueprint(bucketStats) {
  const blueprints = {};
  for (const [bucket, data] of Object.entries(bucketStats)) {
    const total = data.scanned || 0;
    if (!total) continue;
    const freq = {};
    for (const [section, count] of Object.entries(data.sectionHits)) {
      freq[section] = pct(count, total);
    }
  const ranked = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([section, rate]) => ({ section, rate }));

    const core = ranked.filter((r) => r.rate >= 55).map((r) => r.section);
    const common = ranked.filter((r) => r.rate >= 30 && r.rate < 55).map((r) => r.section);
    const optional = ranked.filter((r) => r.rate >= 15 && r.rate < 30).map((r) => r.section);

    blueprints[bucket] = {
      sampleSize: total,
      coreSections: core.length ? core : ranked.slice(0, 6).map((r) => r.section),
      commonSections: common,
      optionalSections: optional,
      frequencies: freq,
      typicalOrder: data.typicalOrder || [],
    };
  }
  return blueprints;
}

function typicalOrderFromSamples(samples) {
  const pos = {};
  const counts = {};
  for (const order of samples) {
    order.forEach((sec, idx) => {
      if (!pos[sec]) pos[sec] = [];
      pos[sec].push(idx);
      counts[sec] = (counts[sec] || 0) + 1;
    });
  }
  return Object.keys(pos)
    .filter((k) => (counts[k] || 0) >= Math.max(3, Math.floor(samples.length * 0.2)))
    .sort((a, b) => {
      const avgA = pos[a].reduce((s, v) => s + v, 0) / pos[a].length;
      const avgB = pos[b].reduce((s, v) => s + v, 0) / pos[b].length;
      return avgA - avgB;
    });
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("CSV not found:", CSV_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

  const candidates = [];
  for (const row of rows) {
    const url = String(row.website_url || row.website || "").trim();
    if (!isValidSite(url)) continue;
    const category = String(row.category_group || row.category || "").trim();
    const name = String(row.business_name || "").trim();
    const bucket = tradeBucket(category, name);
    candidates.push({ url, category, name, bucket });
  }

  // Stratified sample: up to LIMIT, spread across buckets
  const byBucket = new Map();
  for (const c of candidates) {
    if (!byBucket.has(c.bucket)) byBucket.set(c.bucket, []);
    byBucket.get(c.bucket).push(c);
  }
  const perBucket = Math.max(12, Math.ceil(LIMIT / byBucket.size));
  const sample = [];
  for (const list of byBucket.values()) {
    for (let i = 0; i < Math.min(perBucket, list.length); i += 1) {
      sample.push(list[i]);
    }
    if (sample.length >= LIMIT) break;
  }

  console.log(`Scanning ${sample.length} websites across ${byBucket.size} trade buckets...`);

  const bucketStats = {};
  for (const b of [...byBucket.keys(), DEFAULT_BUCKET]) {
    bucketStats[b] = { scanned: 0, sectionHits: {}, orderSamples: [] };
  }

  let done = 0;
  await mapPool(
    sample,
    async (item) => {
      const html = await fetchHtml(item.url);
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${sample.length}`);
      if (!html || html.length < 400) return null;
      const sections = detectSections(html);
      const order = orderFromSections(sections);
      const stat = bucketStats[item.bucket] || bucketStats[DEFAULT_BUCKET];
      stat.scanned += 1;
      for (const [k, v] of Object.entries(sections)) {
        if (v) stat.sectionHits[k] = (stat.sectionHits[k] || 0) + 1;
      }
      if (order.length) stat.orderSamples.push(order);
      return { ...item, sections, order };
    },
    CONCURRENCY
  );

  for (const stat of Object.values(bucketStats)) {
    stat.typicalOrder = typicalOrderFromSamples(stat.orderSamples || []);
    delete stat.orderSamples;
  }

  const blueprints = buildBlueprint(bucketStats);
  const report = {
    generatedAt: new Date().toISOString(),
    csvPath: CSV_PATH,
    totalWithWebsite: candidates.length,
    scanned: sample.length,
    bucketStats,
    blueprints,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT_PATH);
  for (const [bucket, bp] of Object.entries(blueprints)) {
    console.log(`\n${bucket} (n=${bp.sampleSize})`);
    console.log("  core:", bp.coreSections.join(" → "));
    if (bp.commonSections.length) console.log("  common:", bp.commonSections.join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
