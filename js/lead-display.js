/**
 * Display labels for lead fields (NULL = bad data, empty = not listed).
 */
(function (global) {
  const NULL = "NULL";

  function raw(value) {
    return String(value ?? "").trim();
  }

  function isNullMarker(value) {
    return raw(value).toUpperCase() === NULL;
  }

  function isPlaceholder(value) {
    const v = raw(value).toLowerCase();
    return !v || v === "-" || v === "-" || v === "n/a";
  }

  function looksLikeBusinessName(value) {
    const n = raw(value);
    if (!n || isPlaceholder(n)) return false;
    const low = n.toLowerCase();
    if (/,/.test(n) || /\s-\s/.test(n)) return true;
    if (n.length > 32) return true;
    if (
      /academy|preschool|childcare|child care|dental|chiropractic|associates|services/i.test(low) &&
      n.split(/\s+/).length >= 3
    ) {
      return true;
    }
    return false;
  }

  function isShortCategory(value) {
    const v = raw(value);
    if (!v || isPlaceholder(v)) return false;
    if (looksLikeBusinessName(v)) return false;
    return true;
  }

  function isMapsUiLabel(value) {
    const v = raw(value).toLowerCase();
    if (!v || v === "·") return true;
    return /^(directions|website|menu|call|save|share|order online|overview|reviews|photos|updates|about)$/i.test(v);
  }

  function looksLikeReviewStat(value) {
    const v = raw(value);
    if (!v) return false;
    const low = v.toLowerCase();
    if (/^no reviews?$/i.test(low)) return true;
    if (/^\(\d+\)$/.test(v)) return true;
    if (/^\d+\s+reviews?$/i.test(low)) return true;
    if (/^\d+(\.\d+)?\s*[·•]\s*.+reviews?/i.test(v)) return true;
    if (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0 && Number(v) <= 5) return true;
    // Mashed Maps scrape: "Pjs 5.0(19)GardenerTemporarily"
    if (/\d+(?:\.\d+)?\(\d+\)/.test(v)) return true;
    return false;
  }

  /** True when Maps export glued name + rating + reviews + category + status. */
  function looksLikeMashedMapsSnippet(value) {
    return /\d+(?:\.\d+)?\(\d+\)/.test(raw(value));
  }

  /**
   * Recover "Gardener" / "Tutoring service" from snippets like
   * "Pjs 5.0(19)GardenerTemporarily" or "… 5.0(4)Educational consultantOpen".
   */
  function extractCategoryFromMashedMapsSnippet(value, name) {
    const src = raw(value);
    if (!src || !looksLikeMashedMapsSnippet(src)) return "";
    const ratingHit = src.match(/\d+(?:\.\d+)?\(\d+\)/);
    if (!ratingHit || ratingHit.index == null) return "";
    let after = src.slice(ratingHit.index + ratingHit[0].length).trim();
    if (!after) return "";
    after = after
      .replace(
        /(Temporarily\s*Closed|Permanently\s*Closed|Temporarily|Permanently|Closed|Open)\s*$/i,
        ""
      )
      .trim();
    // Soft-split jammed CamelCase tails left after status strip ("LawnCare" → "Lawn Care").
    after = after.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
    if (!after) return "";
    if (isMapsUiLabel(after) || looksLikeStreetAddress(after) || looksLikeHours(after)) return "";
    const nameLow = raw(name).toLowerCase();
    if (nameLow && after.toLowerCase() === nameLow) return "";
    if (after.length > 60) return "";
    return after;
  }

  function scrubCategoryCandidate(value, name) {
    let v = raw(value);
    if (!v) return "";
    if (looksLikeMashedMapsSnippet(v)) {
      v = extractCategoryFromMashedMapsSnippet(v, name);
    }
    if (!v) return "";
    v = v
      .replace(
        /\s*(temporarily\s*closed|permanently\s*closed|temporarily|permanently)\s*$/i,
        ""
      )
      .trim();
    return v;
  }

  const PHONE_RE = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9]/;
  const STREET_WORD_RE =
    /\b(st|street|rd|road|ave|avenue|blvd|boulevard|dr|drive|ln|lane|way|suite|ste|hwy|highway|pkwy|parkway|ct|court|pl|place)\b/i;

  /** Google Maps title lines like "5.0(70)PlumberOpen 24 hours" — not a schedule. */
  function looksLikeMapsTitleMash(value) {
    const v = raw(value);
    if (!v) return false;
    return /\d+(?:\.\d+)?\(\d+\)\s*[A-Za-z]/.test(v) || /\d+(?:\.\d+)?\(\d+\)[A-Za-z]/.test(v);
  }

  /** Strip "4.7(198)" / "4.7 · 198 reviews" noise often mashed into Maps address fields. */
  function stripEmbeddedRating(value) {
    return raw(value)
      .replace(/\s*\d+(?:\.\d+)?\s*\(\s*\d+\s*\)\s*/g, " ")
      .replace(/\s*[★☆]\s*\d+(?:\.\d+)?(?:\s*[·•|,]\s*\d+\s*reviews?)?/gi, " ")
      .replace(/\s*\d+(?:\.\d+)?\s*[·•|,]\s*\d+\s*reviews?\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function spaceMapsTitleMash(value) {
    return raw(value)
      .replace(/(\))(?=[A-Za-z])/g, "$1 ")
      .replace(/([A-Za-z0-9#])(Open|Closed|Closes|Opens)/gi, "$1 $2")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /** Remove Open/Closed/hours glued onto street lines ("Unit DClosed", "… #COpen 24 hours"). */
  function stripTrailingHoursStatus(value) {
    let v = spaceMapsTitleMash(value);
    if (!v) return "";
    v = v
      .replace(
        /\s*(?:Open\s+24\s+hours?|Temporarily\s+Closed|Permanently\s+Closed|Opens?\b[^]*|Closes?\b[^]*|Closed\b[^]*)\s*$/i,
        ""
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    return v;
  }

  function extractHoursFragment(value) {
    const v = spaceMapsTitleMash(value);
    if (!v) return "";
    if (looksLikeHours(v) && !looksLikeMapsTitleMash(v)) return v;
    const m = v.match(/((?:Open\s+24\s+hours?|Opens?\b[^]*|Closed\b[^]*|Closes\b[^]*))$/i);
    if (!m) return "";
    const frag = m[1].trim();
    return looksLikeHours(frag) && !looksLikeMapsTitleMash(frag) ? frag : "";
  }

  function looksLikeWeeklySchedule(value) {
    const v = raw(value);
    if (!v) return false;
    if (
      /\b(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\b/i.test(
        v
      )
    ) {
      return true;
    }
    if (/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(v) && /\b(opens?|closes?|closed|open)\b/i.test(v)) {
      return true;
    }
    return false;
  }

  function looksLikeHours(value) {
    const v = raw(value).replace(/^[\s·•]+/, "");
    if (!v) return false;
    if (looksLikeMapsTitleMash(v)) return false;
    const low = v.toLowerCase();
    if (/^(open|closed|closes)\b/.test(low)) return true;
    if (/open 24\s*hours?/i.test(v) && !/\d+(?:\.\d+)?\(/.test(v)) return true;
    if (/\b(opens?|closed|closes soon)\b/i.test(v) && /\b(AM|PM)\b/i.test(v)) return true;
    if (/^opens?\b/i.test(low) && /\d/.test(v)) return true;
    return false;
  }

  /** Prefer real schedule text; strip biz name + Maps title mash from tip/full_hours. */
  function cleanHoursScheduleText(text, lead) {
    const name = raw(lead?.name || lead?.qBF1Pd).toLowerCase();
    const parts = raw(text)
      .split(/\s*\|\s*|\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (name && s.toLowerCase() === name) return "";
        if (looksLikeMapsTitleMash(s)) return extractHoursFragment(s);
        if (looksLikeHours(s) || looksLikeWeeklySchedule(s)) return s;
        // Lines that are only a rating/category dump, drop.
        if (/\d+(?:\.\d+)?\s*\(\d+\)/.test(s) && !/\b(am|pm)\b/i.test(s)) return "";
        return looksLikeWeeklySchedule(s) ? s : "";
      })
      .filter(Boolean);

    if (!parts.length) return "";
    // De-dupe while keeping order
    const seen = new Set();
    const unique = [];
    parts.forEach((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(p);
    });
    return unique.join("\n");
  }

  function looksLikeStreetAddress(value) {
    const cleaned = stripEmbeddedRating(value);
    const v = cleaned || raw(value);
    if (!v || isNullMarker(v) || isPlaceholder(v)) return false;
    if (looksLikeHours(v)) return false;
    if (PHONE_RE.test(v)) return false;
    if (v.startsWith("http")) return false;
    // Business-name + rating mash ("… Lane … 4.7(198)") is not an address.
    if (looksLikeMapsTitleMash(raw(value)) && !ADDRESS_RE.test(cleaned)) return false;
    if (ADDRESS_RE.test(v)) return true;
    if (STREET_WORD_RE.test(v) && ADDRESS_RE.test(v)) return true;
    if (/,/.test(v) && /\d{5}/.test(v) && !looksLikeHours(v)) return true;
    return false;
  }

  function extraFieldCandidates(lead, keys) {
    const out = [];
    keys.forEach((key) => {
      const v = raw(lead?.[key]);
      if (v) out.push(v);
    });
    return out;
  }

  function resolveHoursRaw(lead) {
    const full = raw(lead?.fullHours || lead?.full_hours);
    if (full) {
      const cleaned = cleanHoursScheduleText(full, lead);
      if (cleaned) {
        // Card status line prefers a compact one-liner; tip uses the multi-line schedule.
        const firstLine = cleaned.split("\n")[0];
        if (looksLikeHours(firstLine) || looksLikeWeeklySchedule(cleaned)) {
          return firstLine.replace(/\n+/g, " · ");
        }
      }
      const frag = extractHoursFragment(full);
      if (frag) return frag;
    }
    const candidates = [
      lead?.hours,
      ...extraFieldCandidates(lead, ["W4Efsd 4", "Hours", "hours"]),
      lead?.address,
      ...extraFieldCandidates(lead, ["W4Efsd 2", "W4Efsd 5", "W4Efsd 6", "W4Efsd 7"]),
    ];
    for (const c of candidates) {
      if (!c || isNullMarker(c) || isPlaceholder(c)) continue;
      if (looksLikeMapsTitleMash(c)) {
        const frag = extractHoursFragment(c);
        if (frag) return frag;
        continue;
      }
      if (looksLikeHours(c)) return c;
    }
    return "";
  }

  function resolveAddressRaw(lead) {
    const streetCandidates = [
      lead?.address,
      lead?.hours,
      lead?.fullHours,
      lead?.full_hours,
      ...extraFieldCandidates(lead, ["W4Efsd 2", "W4Efsd 5", "Address", "address"]),
    ];
    let street = "";
    for (const c of streetCandidates) {
      if (!c || isNullMarker(c) || isPlaceholder(c)) continue;
      const spaced = spaceMapsTitleMash(c);
      const cleaned = stripTrailingHoursStatus(stripEmbeddedRating(spaced));
      if (!cleaned || looksLikeHours(cleaned)) continue;
      if (looksLikeStreetAddress(cleaned) || looksLikeStreetAddress(spaced) || ADDRESS_RE.test(cleaned)) {
        street = cleaned;
        break;
      }
    }
    const cityStateZip = stripTrailingHoursStatus(stripEmbeddedRating(lead?.["W4Efsd 3"] || lead?.city_state_zip));
    if (
      street &&
      cityStateZip &&
      cityStateZip !== street &&
      !looksLikeHours(cityStateZip) &&
      /[A-Z]{2}\s*\d{5}/.test(cityStateZip)
    ) {
      return `${street}, ${cityStateZip}`;
    }
    if (street) return street;
    for (const c of extraFieldCandidates(lead, ["W4Efsd 3", "W4Efsd 6", "W4Efsd 7"])) {
      if (!c || isNullMarker(c) || isPlaceholder(c)) continue;
      const cleaned = stripTrailingHoursStatus(stripEmbeddedRating(c));
      if (!cleaned || looksLikeHours(cleaned)) continue;
      if (looksLikeStreetAddress(cleaned) || looksLikeStreetAddress(c)) return cleaned;
    }
    return "";
  }

  function sanitizeLeadFields(lead) {
    if (!lead || typeof lead !== "object") return lead;
    const address = resolveAddressRaw(lead);
    const hours = resolveHoursRaw(lead);
    return {
      ...lead,
      address,
      hours,
      phone: raw(lead.phone || lead.UsdlK || lead.phoneE164 || lead.phone_e164),
    };
  }

  function nameFromMapsUrl(mapsUrl) {
    const m = String(mapsUrl || "").match(/\/place\/([^/]+)\//);
    if (!m) return "";
    return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
  }

  function resolveName(lead) {
    const direct = raw(lead?.name);
    if (!isBadName(direct)) return direct;
    const fromCat = raw(lead?.category);
    if (looksLikeBusinessName(fromCat)) return fromCat;
    const fromMaps = nameFromMapsUrl(lead?.mapsUrl);
    if (fromMaps && !isPlaceholder(fromMaps)) return fromMaps;
    return "";
  }

  function isGenericCategory(value) {
    const v = raw(value).toLowerCase();
    if (!v) return true;
    return /^(local business|business|establishment|service establishment|point of interest|company|store|general contractor|contractor|professional services?)$/i.test(
      v
    );
  }

  function titleCaseCategory(value) {
    return raw(value)
      .split(/\s+/)
      .map((word, index) => {
        const low = word.toLowerCase();
        if (index > 0 && /^(and|or|of|the|&)$/i.test(low)) return low;
        return low.charAt(0).toUpperCase() + low.slice(1);
      })
      .join(" ");
  }

  function normalizeCategoryLabel(value) {
    let v = raw(value);
    if (!v || isGenericCategory(v)) return "";
    v = v.replace(/\s+services?$/i, "").trim();
    if (!v || isGenericCategory(v)) return "";
    return titleCaseCategory(v);
  }

  const CATEGORY_INFERENCE = [
    { label: "Tutoring", pattern: /tutor/i },
    { label: "Tree Service", pattern: /tree\s*(service|care|remov)|arborist|stump/i },
    {
      label: "Cleaning Services",
      pattern: /clean|janitor|\bmaid\b|housekeep|pressure wash|power wash|carpet clean/i,
    },
    { label: "Childcare", pattern: /daycare|day care|child ?care|preschool|babysit|\bnanny\b/i },
    { label: "Dental", pattern: /dental|dentist|orthodont|endodont|periodont/i },
    {
      label: "Medical",
      pattern: /chiropr|doctor|physician|clinic|medical|urgent care|optometr|optician|physical therapy|med spa|dermatolog|pediatric|hospital|surgeon|podiat/i,
    },
    {
      label: "Beauty",
      pattern: /salon|barber|\bnail\b|\bhair\b|beauty|\blash|\bbrow\b|makeup|esthetic|waxing|tanning|massage|\bspa\b/i,
    },
    { label: "Pets", pattern: /\bpet\b|\bdog\b|\bcat\b|\bvet\b|veterin|groom|kennel|\banimal\b|aquarium/i },
    {
      label: "Fitness",
      pattern: /\bgym\b|fitness|yoga|pilates|crossfit|martial art|karate|taekwondo|\bjiu\b|dance studio|personal train|trainer|workout/i,
    },
    {
      label: "Food",
      pattern: /restaurant|cafe|coffee|bakery|\bfood\b|pizza|\bbar\b|grill|\bdeli\b|diner|eatery|catering|caterer|brewery|juice|smoothie|taqueria/i,
    },
    {
      label: "Auto",
      pattern: /\bauto\b|\bcar\b|truck|\btire\b|mechanic|detailing|body shop|collision|towing|\btow\b|windshield|oil change|transmission|\btint\b|smog|muffler|\bbrake|\bboat\b|\brv\b|motorcycle|bicycle|bike shop/i,
    },
    { label: "Plumbing", pattern: /plumb|\bdrain\b|sewer|septic|water heater/i },
    { label: "Electrical", pattern: /electric|solar/i },
    { label: "HVAC", pattern: /hvac|heating|air condition|furnace|\bcooling\b/i },
    { label: "Roofing", pattern: /\broof|gutter/i },
    {
      label: "Landscaping",
      pattern: /landscap|\blawn\b|\bgarden|\bgardener\b|\birrigation|sprinkler|pest control|exterminat|mosquito|\bsod\b/i,
    },
    { label: "Pool", pattern: /\bpool\b|hot tub/i },
    { label: "Painting", pattern: /paint/i },
    { label: "Flooring", pattern: /\bfloor|carpet|\btile\b|hardwood|laminate/i },
    {
      label: "Tech",
      pattern: /computer|laptop|tech support|\bit services?\b|phone repair|cell phone|electronics|web design|web develop|software|app develop/i,
    },
    {
      label: "Marketing",
      pattern: /marketing|advertis|\bseo\b|branding|graphic design|design agency|\bprint\b|sign shop|signage/i,
    },
    { label: "Security", pattern: /security|\balarm\b|surveillance|\bcctv\b|locksmith/i },
    { label: "Moving", pattern: /moving|\bmover|relocation|storage|junk removal|hauling/i },
    {
      label: "Construction",
      pattern: /remodel|renovat|construct|contractor|\bbuilder|concrete|masonry|stucco|drywall|dry wall|\bdeck\b|\bfence|cabinet|kitchen|bathroom|countertop|excavat|demolition|paving|asphalt|siding|insulation|installer|installation|framing|foundation/i,
    },
    {
      label: "Home Repair",
      pattern: /handyman|\brepair\b|restoration|water damage|\bmold\b|chimney|fireplace|garage door|appliance|inspector|inspection|\bfix\b/i,
    },
    {
      label: "Real Estate",
      pattern: /real estate|realtor|\brealty\b|mortgage|\bbroker|property management|home stag|\bstager\b|interior design|architect/i,
    },
    {
      label: "Finance & Legal",
      pattern: /insurance|\btax\b|account|bookkeep|attorney|lawyer|\blegal\b|\bnotary\b|financial|\bcpa\b|payroll/i,
    },
    {
      label: "Events",
      pattern: /photograph|videograph|wedding|\bevent\b|\bvenue\b|party rental|equipment rental|\brental\b|florist|flower|\bdj\b/i,
    },
    {
      label: "Senior Care",
      pattern: /senior|assisted living|home health|home care|caregiver|hospice|\belder/i,
    },
    { label: "Education", pattern: /teacher|test prep|learning center|driving school|music lesson|\bacademy\b|school/i },
  ];

  function inferCategoryFromText() {
    const hay = Array.from(arguments)
      .map((part) => raw(part))
      .filter(Boolean)
      .join(" ");
    if (!hay) return "";
    for (const { label, pattern } of CATEGORY_INFERENCE) {
      if (pattern.test(hay)) return label;
    }
    return "";
  }

  function pickCategoryCandidate(value, name) {
    const scrubbed = scrubCategoryCandidate(value, name);
    if (!scrubbed) return "";
    const normalized = normalizeCategoryLabel(scrubbed);
    if (!normalized) return "";
    if (looksLikeReviewStat(normalized)) return "";
    if (normalized === name) return "";
    if (looksLikeStreetAddress(normalized) || looksLikeHours(normalized) || isMapsUiLabel(normalized)) {
      return "";
    }
    if (looksLikeBusinessName(normalized) && !isShortCategory(normalized)) return "";
    return normalized;
  }

  function resolveCategory(lead) {
    const name = resolveName(lead);
    const candidates = [
      lead?.categoryGroup,
      lead?.["R8c4Qb 2"],
      lead?.category,
      lead?.titleLine,
      lead?.["W4Efsd"],
      lead?.description,
    ];
    for (const candidate of candidates) {
      const picked = pickCategoryCandidate(candidate, name);
      if (picked) return picked;
    }
    const inferred = inferCategoryFromText(
      lead?.searchQuery,
      lead?.search_query,
      name,
      lead?.description
    );
    if (inferred) return inferred;
    return "Uncategorized";
  }

  function isBadAddress(value, lead) {
    const cleaned = stripEmbeddedRating(value);
    const v = cleaned || raw(value);
    if (!v || isNullMarker(v) || isPlaceholder(v)) return true;
    if (looksLikeHours(v)) return true;
    if (looksLikeMapsTitleMash(raw(value)) && !ADDRESS_RE.test(cleaned)) return true;
    const cat = resolveCategory(lead).toLowerCase();
    const low = v.toLowerCase();
    if (cat && low === cat) return true;
    if (!/\d/.test(v) && /day care|daycare|preschool|chiropractor|groomer/i.test(low)) return true;
    if (!looksLikeStreetAddress(v)) return true;
    return false;
  }

  function isBadName(value) {
    const v = raw(value);
    if (!v || isNullMarker(v) || isPlaceholder(v)) return true;
    if (v.length < 2) return true;
    return false;
  }

  function isBadPhone(value) {
    const v = raw(value);
    if (!v || isNullMarker(v)) return true;
    const digits = v.replace(/\D/g, "");
    return digits.length < 10;
  }

  function hasCallablePhone(lead) {
    return !isBadPhone(lead?.phone);
  }

  /** US display for Lead Builder: +1(401)300-0957 */
  function formatPhoneForLeadBuilder(value) {
    const t = raw(value);
    if (!t || isNullMarker(t)) return "";
    let d = t.replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10) {
      return "+1(" + d.slice(0, 3) + ")" + d.slice(3, 6) + "-" + d.slice(6);
    }
    if (d[0] !== "1") d = "1" + d;
    d = d.slice(0, 11);
    const n = d[0] === "1" ? d.slice(1) : d;
    if (n.length <= 3) return "+1(" + n;
    if (n.length <= 6) return "+1(" + n.slice(0, 3) + ")" + n.slice(3);
    return "+1(" + n.slice(0, 3) + ")" + n.slice(3, 6) + "-" + n.slice(6);
  }

  function format(value, notListedLabel, isInvalid) {
    const v = raw(value);
    if (!v) return notListedLabel;
    if (isNullMarker(v) || (isInvalid && isInvalid(v))) return NULL;
    return v;
  }

  function avatarColorsForLead(lead) {
    const palettes = [
      ["#0f766e", "#14b8a6"],
      ["#1d4ed8", "#3b82f6"],
      ["#7c3aed", "#a78bfa"],
      ["#be185d", "#f472b6"],
      ["#c2410c", "#fb923c"],
      ["#b45309", "#fbbf24"],
      ["#047857", "#34d399"],
      ["#0e7490", "#22d3ee"],
      ["#4338ca", "#818cf8"],
      ["#a21caf", "#e879f9"],
    ];
    const key = String(lead?.id || resolveName(lead) || "?");
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return palettes[hash % palettes.length];
  }

  global.LeadDisplay = {
    NULL,
    resolveName,
    resolveCategory,
    formatName: (lead) => {
      const n = resolveName(lead);
      if (!n) return "Business name not listed";
      return n;
    },
    formatPhone: (lead) => {
      const rawPhone = raw(lead?.phone || lead?.UsdlK || lead?.phoneE164 || lead?.phone_e164);
      const formatted = formatPhoneForLeadBuilder(rawPhone);
      if (formatted) return formatted;
      return format(rawPhone, "Phone not listed", isBadPhone);
    },
    hasCallablePhone,
    isBadPhone,
    formatAddress: (lead) => {
      const a = resolveAddressRaw(lead);
      if (!a) return "Address not listed";
      const cleaned = stripTrailingHoursStatus(stripEmbeddedRating(a));
      return format(cleaned || a, "Address not listed", (v) => isBadAddress(v, lead));
    },
    formatHours: (lead) => {
      const h = resolveHoursRaw(lead);
      if (!h) return "Hours not listed";
      if (isNullMarker(h)) return NULL;
      return h;
    },
    /** Compact open/closed label for cards: Open, Closed, Open 24h, Opens 9 AM, etc. */
    formatOpenStatus: (lead) => {
      const status = raw(lead?.businessStatus || lead?.business_status).toLowerCase();
      if (/permanently\s*closed/.test(status)) return { text: "Closed", kind: "closed" };
      if (/temporarily\s*closed/.test(status)) return { text: "Closed", kind: "closed" };

      const hours = resolveHoursRaw(lead) || "";
      const low = hours.toLowerCase();
      if (!hours || isNullMarker(hours) || hours === "Hours not listed") {
        // Fall back to status glued on address/category
        const mash = spaceMapsTitleMash(
          [lead?.address, lead?.hours, lead?.category, lead?.categoryGroup, lead?.titleLine]
            .map(raw)
            .filter(Boolean)
            .join(" ")
        );
        if (/\bpermanently\s+closed\b|\btemporarily\s+closed\b|\bclosed\b/i.test(mash)) {
          return { text: "Closed", kind: "closed" };
        }
        if (/\bopen 24\s*hours?\b/i.test(mash)) return { text: "Open 24h", kind: "open" };
        if (/\bopen\b/i.test(mash) && !/\bopens?\b/i.test(mash.replace(/\bopen\b/i, ""))) {
          return { text: "Open", kind: "open" };
        }
        return { text: "", kind: "" };
      }
      if (/\bopen 24\s*hours?\b/.test(low)) return { text: "Open 24h", kind: "open" };
      if (/\bpermanently\s+closed\b|\btemporarily\s+closed\b/.test(low)) {
        return { text: "Closed", kind: "closed" };
      }
      if (/^closed\b/.test(low) || /\bclosed\b/.test(low)) return { text: "Closed", kind: "closed" };
      if (/^open\b/.test(low) && !/^opens?\b/.test(low)) return { text: "Open", kind: "open" };
      // Keep "Opens 9 AM" / "Closes 5 PM" as the chip label
      const compact = hours.replace(/\s+/g, " ").trim();
      if (compact.length <= 28) {
        const kind = /^closes?\b|^closed\b/i.test(compact) ? "closed" : "open";
        return { text: compact, kind };
      }
      return { text: "Open", kind: "open" };
    },
    formatCategory: (lead) => {
      const c = resolveCategory(lead);
      if (!c) return "Category not listed";
      return c;
    },
    formatRating: (lead) => {
      const n = Number(lead?.rating);
      if (!Number.isFinite(n) || n <= 0) return "";
      return n % 1 === 0 ? n.toFixed(1) : String(Math.round(n * 10) / 10);
    },
    formatReviews: (lead) => {
      if (lead?.hasNoReviews || lead?.reviewLabel === "No reviews") return "No reviews";
      const n = Number(lead?.reviewCount);
      if (!Number.isFinite(n) || n < 0) return "";
      if (n === 0) return "No reviews";
      if (n === 1) return "1 review";
      return `${Math.round(n)} reviews`;
    },
    formatRatingLine: (lead) => {
      const n = Number(lead?.rating);
      const c = Number(lead?.reviewCount);
      const rating =
        Number.isFinite(n) && n > 0 ? (n % 1 === 0 ? n.toFixed(1) : String(Math.round(n * 10) / 10)) : "";
      let count = "";
      if (!(lead?.hasNoReviews || lead?.reviewLabel === "No reviews")) {
        if (Number.isFinite(c) && c > 0) count = "(" + String(Math.round(c)) + ")";
      }
      if (rating && count) return rating + " • " + count;
      if (rating) return rating;
      if (count) return count;
      return "";
    },
    initials: (lead) => {
      const name = resolveName(lead);
      if (!name) return "?";
      const skip = new Set(["the", "a", "an"]);
      const parts = name.split(/\s+/).filter((p) => p && !skip.has(p.toLowerCase()));
      if (!parts.length) return "?";
      if (parts.length === 1) {
        const w = parts[0].replace(/[^A-Za-z0-9]/g, "");
        return (w.slice(0, 2) || "?").toUpperCase();
      }
      const a = parts[0][0] || "?";
      const b = parts[1][0] || "";
      return (a + b).toUpperCase();
    },
    /** Stable gradient colors per lead (by id). */
    avatarColors: (lead) => avatarColorsForLead(lead),
    avatarStyle: (lead) => {
      const [a, b] = avatarColorsForLead(lead);
      return `--lf-avatar-a:${a};--lf-avatar-b:${b}`;
    },
    /** Suggested upfront tier from Google review count (Business Finder → Lead Builder). */
    priceTierFromReviewCount(reviewCount) {
      const c = Number(reviewCount);
      if (!Number.isFinite(c) || c < 0) return "$500";
      if (c <= 10) return "$500";
      if (c <= 30) return "$700";
      if (c <= 100) return "$1,000";
      return "$1,500";
    },
    formatPhoneForLeadBuilder,
    sanitizeLeadFields,
    resolveAddressRaw,
    resolveHoursRaw,
    looksLikeHours,
    looksLikeStreetAddress,
    looksLikeMapsTitleMash,
    looksLikeWeeklySchedule,
    extractHoursFragment,
    cleanHoursScheduleText,
    stripTrailingHoursStatus,
    spaceMapsTitleMash,
    buildLeadBuilderPick(lead) {
      const phone = formatPhoneForLeadBuilder(
        lead?.phone || lead?.UsdlK || lead?.phoneE164 || lead?.phone_e164
      );
      const mapsUrl = raw(lead?.mapsUrl || lead?.maps_url);
      const formatted = global.LeadDisplay.formatName(lead);
      const businessName =
        formatted === "Business name not listed" ? raw(lead?.name) : formatted;
      const categoryRaw = global.LeadDisplay.formatCategory(lead);
      const category =
        categoryRaw &&
        categoryRaw !== "Category not listed" &&
        categoryRaw !== "Uncategorized"
          ? categoryRaw
          : raw(lead?.categoryGroup || lead?.category);
      const addressRaw = global.LeadDisplay.formatAddress(lead);
      const address =
        addressRaw && addressRaw !== "Address not listed" && addressRaw !== NULL
          ? stripTrailingHoursStatus(stripEmbeddedRating(addressRaw))
          : resolveAddressRaw(lead);
      const website = raw(lead?.website || lead?.websiteUrl || lead?.website_url);
      const hoursRaw = global.LeadDisplay.formatHours(lead);
      const hours =
        hoursRaw && hoursRaw !== "Hours not listed" && hoursRaw !== NULL
          ? hoursRaw
          : resolveHoursRaw(lead);
      return {
        leadId: raw(lead?.id),
        name: "",
        businessName,
        category: category || "",
        phone: phone || raw(lead?.phone),
        address: address || "",
        mapsUrl,
        website,
        hours: hours || "",
        price: global.LeadDisplay.priceTierFromReviewCount(lead?.reviewCount),
      };
    },
  };
})(window);
