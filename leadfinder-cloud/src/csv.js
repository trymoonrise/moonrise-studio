import fs from "node:fs/promises";
import path from "node:path";

/**
 * Readable lead columns (renamed from Instant Data Scraper CSS classes).
 * import_leads_csv_rows still accepts legacy keys as aliases.
 */
export const SUPABASE_CSV_HEADERS = [
  "maps_url",
  "business_name",
  "rating",
  "review_count",
  "category",
  "address",
  "city_state_zip",
  "hours",
  "detail_extra_1",
  "detail_extra_2",
  "detail_extra_3",
  "phone",
  "website_url",
  "website_label",
  "directions_label",
  "review_quote",
  "category_group",
  "price_label",
  "image_url",
  "extra_1",
  "extra_2",
  "extra_3",
  "maps_extra",
  "search_query",
  "collected_at",
  "scrape_source",
  "latitude",
  "longitude",
  "place_id",
  "plus_code",
  "business_status",
  "price_range",
  "description",
  "full_hours",
  "amenities",
  "directions_url",
  "menu_url",
  "order_url",
  "booking_url",
];

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPhoneUs(value) {
  const raw = cleanText(value);
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 11 && digits[0] === "1") digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length !== 10) return raw;
  return `+1(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeRating(value) {
  const text = cleanText(value);
  if (!text) return "";
  const match = text.match(/(\d(?:\.\d)?)/);
  if (!match) return "";
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 5) return "";
  return n % 1 === 0 ? n.toFixed(1) : String(Math.round(n * 10) / 10);
}

function normalizeReviews(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (/no reviews?/i.test(text)) return "(0)";
  const paren = text.match(/\(([\d,]+)\)/);
  if (paren) return `(${paren[1].replace(/,/g, "")})`;
  const bare = text.match(/([\d,]+)/);
  if (bare) return `(${bare[1].replace(/,/g, "")})`;
  return text;
}

function unwrapGoogleRedirect(url) {
  const href = cleanText(url);
  if (!href) return "";
  try {
    const parsed = new URL(href);
    if (parsed.hostname.includes("google.") && parsed.pathname.includes("/url")) {
      const target = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (target) return target;
    }
  } catch {
    // keep original
  }
  return href;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function pick(src, ...keys) {
  for (const key of keys) {
    const value = src?.[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

/** Normalize a scraped lead into Supabase column shape. */
export function leadToSupabaseRow(lead) {
  const row = {};
  for (const header of SUPABASE_CSV_HEADERS) row[header] = "";

  const src = lead || {};
  row.maps_url = cleanText(
    pick(src, "maps_url", "hfpxzc href", "Google Maps URL", "Google Maps Link")
  );
  row.business_name = cleanText(
    pick(src, "business_name", "qBF1Pd", "Business Name", "name")
  );
  row.rating = normalizeRating(pick(src, "rating", "MW4etd", "Rating"));
  row.review_count = normalizeReviews(pick(src, "review_count", "UY7F9", "Reviews"));
  row.category = cleanText(pick(src, "category", "W4Efsd", "Category"));
  row.address = cleanText(pick(src, "address", "W4Efsd 2", "Address"));
  row.city_state_zip = cleanText(pick(src, "city_state_zip", "W4Efsd 3", "City State Zip"));
  row.hours = cleanText(pick(src, "hours", "W4Efsd 4", "Hours"));
  row.detail_extra_1 = cleanText(pick(src, "detail_extra_1", "W4Efsd 5"));
  row.detail_extra_2 = cleanText(pick(src, "detail_extra_2", "W4Efsd 6"));
  row.detail_extra_3 = cleanText(pick(src, "detail_extra_3", "W4Efsd 7"));
  row.phone = formatPhoneUs(pick(src, "phone", "UsdlK", "Phone"));
  row.website_url = unwrapGoogleRedirect(
    pick(src, "website_url", "lcr4fd href", "Website")
  );
  row.website_label = cleanText(pick(src, "website_label", "Cw1rxd"));
  row.directions_label = cleanText(pick(src, "directions_label", "R8c4Qb"));
  row.review_quote = cleanText(pick(src, "review_quote", "Cw1rxd 2"));
  row.category_group = cleanText(pick(src, "category_group", "R8c4Qb 2"));
  row.price_label = cleanText(pick(src, "price_label", "doJOZc", "price_range"));
  row.image_url = cleanText(pick(src, "image_url", "Jn12ke src"));
  row.extra_1 = cleanText(pick(src, "extra_1", "ah5Ghc"));
  row.extra_2 = cleanText(pick(src, "extra_2", "ah5Ghc 2"));
  row.extra_3 = cleanText(pick(src, "extra_3", "ah5Ghc 3"));
  row.maps_extra = cleanText(pick(src, "maps_extra", "e4rVHe"));
  row.search_query = cleanText(pick(src, "search_query", "Search Query"));
  row.collected_at =
    cleanText(pick(src, "collected_at", "Collected At")) || new Date().toISOString();
  row.scrape_source =
    cleanText(pick(src, "scrape_source", "Scrape Source")) || "leadfinder-cloud";
  row.latitude = cleanText(src.latitude || "");
  row.longitude = cleanText(src.longitude || "");
  row.place_id = cleanText(src.place_id || "");
  row.plus_code = cleanText(src.plus_code || "");
  row.business_status = cleanText(src.business_status || "");
  row.price_range = cleanText(pick(src, "price_range", "price_label", "doJOZc"));
  row.description = cleanText(src.description || "");
  row.full_hours = cleanText(src.full_hours || "");
  row.amenities = cleanText(src.amenities || "");
  row.directions_url = cleanText(src.directions_url || "");
  row.menu_url = cleanText(src.menu_url || "");
  row.order_url = cleanText(src.order_url || "");
  row.booking_url = cleanText(src.booking_url || "");
  return row;
}

export function rowsToCsv(rows, headers = SUPABASE_CSV_HEADERS) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    const normalized = leadToSupabaseRow(row);
    lines.push(headers.map((header) => csvEscape(normalized[header] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export async function appendLeadsToMasterCsv(csvPath, leads) {
  if (!leads.length) return;
  await fs.mkdir(path.dirname(csvPath), { recursive: true });

  let writeHeader = false;
  try {
    await fs.access(csvPath);
  } catch {
    writeHeader = true;
  }

  const body = rowsToCsv(leads);
  if (writeHeader) {
    await fs.writeFile(csvPath, body, "utf8");
    return;
  }

  const existing = await fs.readFile(csvPath, "utf8");
  const firstLine = existing.split(/\r?\n/)[0] || "";
  const isModern = firstLine.includes("maps_url") && firstLine.includes("business_name");
  const isLegacy = firstLine.includes("hfpxzc href") || firstLine.includes("qBF1Pd");
  if (!isModern) {
    const backup = `${csvPath}.legacy-${Date.now()}.bak`;
    await fs.rename(csvPath, backup);
    console.warn(
      isLegacy
        ? `Legacy CSS-header CSV moved to ${backup}; starting readable-header CSV`
        : `Unrecognized CSV moved to ${backup}; starting readable-header CSV`
    );
    await fs.writeFile(csvPath, body, "utf8");
    return;
  }

  const withoutHeader = body.split(/\r?\n/).slice(1).join("\n");
  if (!withoutHeader.trim()) return;
  await fs.appendFile(
    csvPath,
    withoutHeader.endsWith("\n") ? withoutHeader : `${withoutHeader}\n`,
    "utf8"
  );
}
