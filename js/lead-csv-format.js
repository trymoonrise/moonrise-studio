/**
 * Google Maps lead export CSV · column layout used for Business Finder cards.
 * Header: hfpxzc href, qBF1Pd, MW4etd, UY7F9, W4Efsd … Jn12ke src
 */
(function (global) {
  const COL = {
    mapsUrl: "maps_url",
    name: "business_name",
    rating: "rating",
    reviewCount: "review_count",
    titleLine: "category",
    address1: "address",
    line3: "city_state_zip",
    line4: "hours",
    address2: "detail_extra_1",
    phone: "phone",
    website: "website_url",
    websiteLabel: "website_label",
    directionsLabel: "directions_label",
    reviewQuote: "review_quote",
    categoryGroup: "category_group",
    extra: "extra_1",
    reviewQuoteAlt: "detail_extra_2",
    profileImage: "image_url",
  };

  /** Legacy Instant-Data-Scraper CSS class headers (still accepted on read). */
  const LEGACY_COL = {
    mapsUrl: "hfpxzc href",
    name: "qBF1Pd",
    rating: "MW4etd",
    reviewCount: "UY7F9",
    titleLine: "W4Efsd",
    address1: "W4Efsd 2",
    line3: "W4Efsd 3",
    line4: "W4Efsd 4",
    address2: "W4Efsd 5",
    phone: "UsdlK",
    website: "lcr4fd href",
    websiteLabel: "Cw1rxd",
    directionsLabel: "R8c4Qb",
    reviewQuote: "Cw1rxd 2",
    categoryGroup: "R8c4Qb 2",
    extra: "ah5Ghc",
    reviewQuoteAlt: "W4Efsd 6",
    profileImage: "Jn12ke src",
  };

  const COLUMN_KEYS = [...new Set([...Object.values(COL), ...Object.values(LEGACY_COL)])];
  const MIN_COLUMN_KEYS = 8;
  const FORMAT_ERROR = "Format error";

  function cell(row, field) {
    if (!row) return "";
    const modern = COL[field];
    const legacy = LEGACY_COL[field];
    if (modern != null && row[modern] != null && String(row[modern]).trim() !== "") {
      return row[modern];
    }
    if (legacy != null && row[legacy] != null && String(row[legacy]).trim() !== "") {
      return row[legacy];
    }
    if (row[field] != null) return row[field];
    return "";
  }

  const PHONE_RE = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9]/;
  const STREET_WORD_RE =
    /\b(st|street|rd|road|ave|avenue|blvd|boulevard|dr|drive|ln|lane|way|suite|ste|hwy|highway|pkwy|parkway|ct|court|pl|place)\b/i;

  function raw(value) {
    return String(value ?? "").trim();
  }

  function hasColumnKey(row, key) {
    return row && Object.prototype.hasOwnProperty.call(row, key);
  }

  function countSchemaKeys(row) {
    if (!row || typeof row !== "object") return 0;
    return COLUMN_KEYS.filter((key) => hasColumnKey(row, key)).length;
  }

  function isValidMapsUrl(url) {
    const u = raw(url).toLowerCase();
    if (!/google\.com\/maps\/place\//i.test(u)) return false;
    if (!u.includes("/data=!") && !u.includes("/data%3d!")) return false;
    if (!u.includes("1s0x") && !u.includes("19s") && !u.includes("/g/")) return false;
    return true;
  }

  function isMapsUiLabel(value) {
    const v = raw(value).toLowerCase();
    if (!v || v === "·") return true;
    return /^(directions|website|menu|call|save|share|order online|overview|reviews|photos|updates|about)$/i.test(v);
  }

  function unwrapGoogleRedirect(url) {
    const href = raw(url);
    if (!href) return "";
    try {
      const parsed = new URL(href);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("google.") && (parsed.pathname.includes("/url") || parsed.pathname.includes("/aclk"))) {
        const candidates = [
          parsed.searchParams.get("adurl"),
          parsed.searchParams.get("q"),
          parsed.searchParams.get("url"),
          parsed.searchParams.get("continue"),
        ];
        for (const target of candidates) {
          const next = raw(target);
          if (next && /^https?:\/\//i.test(next)) return next;
        }
      }
    } catch (_) {
      /* keep original */
    }
    return href;
  }

  function isGoogleNoiseWebsiteUrl(url) {
    const low = raw(url).toLowerCase();
    if (!low) return true;
    return (
      low.includes("google.com/maps") ||
      low.includes("google.com/aclk") ||
      low.includes("googleadservices.com") ||
      low.includes("doubleclick.net") ||
      low.includes("gstatic.com") ||
      low.includes("google.com/url") ||
      low.includes("maps.app.goo.gl") ||
      low.includes("goo.gl/maps")
    );
  }

  function isValidWebsiteUrl(url) {
    const u = unwrapGoogleRedirect(raw(url));
    if (!u) return false;
    const low = u.toLowerCase();
    if (!low.startsWith("http://") && !low.startsWith("https://")) return false;
    if (isGoogleNoiseWebsiteUrl(u)) return false;
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (!host || host === "localhost") return false;
      if (host.includes("google.") || host.endsWith(".google")) return false;
    } catch (_) {
      return false;
    }
    return true;
  }

  function normalizeWebsiteUrl(url) {
    let u = unwrapGoogleRedirect(raw(url));
    if (!u) return "";
    // Bare domains from Maps labels: weathertightroofing.com
    if (!/^https?:\/\//i.test(u) && /^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(u)) {
      u = "https://" + u.replace(/^\/\//, "");
    }
    return isValidWebsiteUrl(u) ? u : "";
  }

  /**
   * Official business website only - not booking, menu, order, or Google Ads click URLs.
   */
  function resolveWebsiteUrl(row) {
    const primary = raw(
      cell(row, "website") || row.website || row.websiteUrl || row["lcr4fd href"] || row.website_url
    );
    const normalized = normalizeWebsiteUrl(primary);
    if (normalized) return normalized;
    // Label-only fallback never invents a URL - only reject ad noise.
    return "";
  }

  function resolveLeadWebsite(lead) {
    if (!lead || typeof lead !== "object") return "";
    const fromRow = resolveWebsiteUrl(lead);
    if (fromRow) return fromRow;
    return normalizeWebsiteUrl(
      raw(lead.website || lead.websiteUrl || lead.website_url || lead["lcr4fd href"])
    );
  }

  function resolveSupabaseHasWebsiteFlag(lead) {
    if (!lead || typeof lead !== "object") return null;
    const rawFlag = lead.has_website ?? lead.hasWebsite;
    if (rawFlag === true || rawFlag === false) return rawFlag;
    if (rawFlag === "true" || rawFlag === "t" || rawFlag === 1 || rawFlag === "1") return true;
    if (rawFlag === "false" || rawFlag === "f" || rawFlag === 0 || rawFlag === "0") return false;
    return null;
  }

  /**
   * Strict website classification for Business Finder filters.
   * - has: valid official business URL on the lead
   * - missing: Maps place check confirmed no website on file
   * - unknown: not verified yet (must not be treated as confirmed "no website")
   */
  function normalizeWebsiteStatus(lead) {
    const status = raw(lead?.websiteStatus || lead?.website_status).toLowerCase();
    if (status === "has" || status === "missing" || status === "unknown") return status;
    return "";
  }

  function classifyLeadWebsite(lead) {
    const website = resolveLeadWebsite(lead);
    if (website) {
      return { status: "has", hasWebsite: true, website, confirmed: true };
    }

    const dbFlag = resolveSupabaseHasWebsiteFlag(lead);
    if (dbFlag === false) {
      return { status: "missing", hasWebsite: false, website: "", confirmed: true };
    }
    if (dbFlag === true) {
      const rawUrl = raw(
        lead?.website_url || lead?.websiteUrl || lead?.website || cell(lead, "website")
      );
      const fallback = normalizeWebsiteUrl(rawUrl);
      if (fallback) {
        return { status: "has", hasWebsite: true, website: fallback, confirmed: true };
      }
      return { status: "missing", hasWebsite: false, website: "", confirmed: true };
    }

    const status = normalizeWebsiteStatus(lead);
    if (status === "missing") {
      return { status: "missing", hasWebsite: false, website: "", confirmed: true };
    }
    if (status === "has") {
      return { status: "unknown", hasWebsite: false, website: "", confirmed: false };
    }
    if (status === "unknown") {
      return { status: "unknown", hasWebsite: false, website: "", confirmed: false };
    }
    if (lead?.websiteEnriched === true && lead?.websiteConfirmed === true) {
      return { status: "missing", hasWebsite: false, website: "", confirmed: true };
    }

    return { status: "unknown", hasWebsite: false, website: "", confirmed: false };
  }

  function reconcileLeadWebsiteFields(lead) {
    if (!lead || typeof lead !== "object") return lead;
    const classified = classifyLeadWebsite(lead);
    lead.website = classified.website;
    lead.hasWebsite = classified.hasWebsite;
    lead.websiteStatus = classified.status;
    lead.websiteConfirmed = classified.confirmed;
    return lead;
  }

  function resolveLeadHasWebsite(lead) {
    return classifyLeadWebsite(lead).status === "has";
  }

  function resolveLeadMissingWebsite(lead) {
    return classifyLeadWebsite(lead).status === "missing";
  }

  function resolveLeadNeedsWebsiteCheck(lead) {
    if (resolveSupabaseHasWebsiteFlag(lead) !== null) return false;
    const classified = classifyLeadWebsite(lead);
    if (classified.status === "has" || classified.status === "missing") return false;
    const maps = raw(lead?.mapsUrl || lead?.maps_url);
    return maps.startsWith("http");
  }

  function looksLikeHours(value) {
    const v = raw(value).replace(/^[\s·•]+/, "");
    if (!v) return false;
    const low = v.toLowerCase();
    if (/^(open|closed|closes)\b/.test(low)) return true;
    if (/\b(opens?|closed|closes soon)\b/i.test(v) && /\b(AM|PM)\b/i.test(v)) return true;
    if (/^opens?\b/i.test(low) && /\d/.test(v)) return true;
    if (/open 24 hours/i.test(v)) return true;
    return false;
  }

  function cleanAddressCandidate(value) {
    let v = raw(value);
    if (!v) return "";
    v = v.replace(/([A-Za-z0-9#])(Open|Closed|Opens|Closes)/gi, "$1 $2");
    v = v.replace(/\s*(Open 24 hours)\s*$/i, "").trim();
    v = v.replace(/([A-Za-z0-9#])\s+(Open|Closed)$/i, "$1").trim();
    v = v
      .replace(/\s*(Opens?|Closed|Closes)\b[^]*$/i, (m) => {
        return looksLikeHours(m) ? "" : m;
      })
      .trim();
    v = v.replace(PHONE_RE, "").replace(/\(\s*\)/g, "").trim();
    return v;
  }

  function looksLikeStreetAddress(value) {
    const v = cleanAddressCandidate(value);
    if (!v) return false;
    if (looksLikeHours(v)) return false;
    if (v.startsWith("http")) return false;
    if (ADDRESS_RE.test(v)) return true;
    if (STREET_WORD_RE.test(v) && /\d/.test(v)) return true;
    if (/,/.test(v) && /\d/.test(v)) return true;
    return false;
  }

  function extractHoursFragment(value) {
    const v = raw(value);
    if (!v) return "";
    if (looksLikeHours(v)) return v;
    const m = v.match(/((?:Opens?|Closed|Closes|Open 24 hours)\b[^]*)/i);
    return m ? m[1].trim() : "";
  }

  function parseRatingValue(text) {
    const t = raw(text);
    if (!t) return null;
    const m = t.match(/^(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function parseReviewCount(text) {
    const t = raw(text);
    if (!t) return { count: null, label: "" };
    if (/no reviews/i.test(t)) return { count: 0, label: "No reviews" };
    const paren = t.match(/\((\d+)\)/);
    if (paren) return { count: Number(paren[1]), label: "" };
    const plain = t.match(/^(\d+)$/);
    if (plain) return { count: Number(plain[1]), label: "" };
    return { count: null, label: "" };
  }

  function resolveAddress(row) {
    const streetCandidates = ["address1", "line3", "address2", "titleLine"];
    let street = "";
    for (const field of streetCandidates) {
      const cleaned = cleanAddressCandidate(cell(row, field));
      if (looksLikeStreetAddress(cleaned)) {
        street = cleaned;
        break;
      }
    }
    const cityStateZip = raw(cell(row, "line3"));
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
    if (cityStateZip && looksLikeStreetAddress(cityStateZip)) return cityStateZip;
    return "";
  }

  function resolveHours(row) {
    const fullHours = raw(row.full_hours || row.fullHours);
    if (fullHours) {
      if (global.LeadDisplay?.cleanHoursScheduleText) {
        const cleaned = global.LeadDisplay.cleanHoursScheduleText(fullHours, {
          name: raw(cell(row, "name") || row.name),
        });
        if (cleaned) {
          return cleaned.split("\n")[0].replace(/\n+/g, " · ");
        }
      }
      const firstBlock = fullHours
        .split(/\n\n+/)
        .map((part) => part.trim())
        .filter(Boolean)[0];
      // Don't treat Maps title mash (name + 5.0(70)Category…) as hours.
      if (
        firstBlock &&
        !/\d+(?:\.\d+)?\(\d+\)/.test(firstBlock) &&
        looksLikeHours(firstBlock)
      ) {
        return firstBlock.replace(/\n+/g, " · ");
      }
      const frag = extractHoursFragment(fullHours);
      if (frag) return frag;
    }
    const parts = [];
    ["line4", "line3", "address1", "address2"].forEach((field) => {
      const v = raw(cell(row, field));
      if (!v) return;
      const hours = extractHoursFragment(v);
      if (hours && !parts.includes(hours)) parts.push(hours);
    });
    return parts.slice(0, 2).join(" · ");
  }

  function resolveReviewQuote(row) {
    const quote = raw(cell(row, "reviewQuote")) || raw(cell(row, "reviewQuoteAlt")) || raw(cell(row, "extra"));
    if (!quote) return "";
    if (/^["“]/.test(quote) || quote.length > 18) return quote;
    return "";
  }

  function resolveCategoryGroup(row) {
    if (global.LeadDisplay?.resolveCategory) {
      return global.LeadDisplay.resolveCategory({
        name: raw(cell(row, "name")),
        titleLine: raw(cell(row, "titleLine")),
        categoryGroup: raw(cell(row, "categoryGroup")),
        category: raw(cell(row, "categoryGroup")),
        search_query: raw(row.search_query),
        searchQuery: raw(row.search_query),
        description: raw(row.description),
        W4Efsd: raw(cell(row, "titleLine")),
        "R8c4Qb 2": raw(cell(row, "categoryGroup")),
      });
    }
    const titleLine = raw(cell(row, "titleLine"));
    const mashed = titleLine.match(/\d+(?:\.\d+)?\(\d+\)/);
    if (mashed) {
      let after = titleLine.slice(mashed.index + mashed[0].length).trim();
      after = after
        .replace(
          /(Temporarily\s*Closed|Permanently\s*Closed|Temporarily|Permanently|Closed|Open)\s*$/i,
          ""
        )
        .trim();
      if (after && !isMapsUiLabel(after) && !looksLikeStreetAddress(after) && !looksLikeHours(after)) {
        return after;
      }
    } else if (
      titleLine &&
      !isMapsUiLabel(titleLine) &&
      !looksLikeStreetAddress(titleLine) &&
      !looksLikeHours(titleLine) &&
      !/no reviews/i.test(titleLine) &&
      !/^\d+\s+reviews?$/i.test(titleLine) &&
      !/^\(\d+\)$/.test(titleLine) &&
      titleLine.length <= 48
    ) {
      return titleLine;
    }
    const grp = raw(cell(row, "categoryGroup"));
    if (grp && !isMapsUiLabel(grp) && !/\d+(?:\.\d+)?\(\d+\)/.test(grp)) return grp;
    return "Uncategorized";
  }

  function validateRow(row) {
    if (!row || typeof row !== "object") {
      return { valid: false, error: FORMAT_ERROR };
    }
    if (countSchemaKeys(row) < MIN_COLUMN_KEYS) {
      return { valid: false, error: FORMAT_ERROR };
    }
    const mapsUrl = raw(cell(row, "mapsUrl") || row.maps_url || row.mapsUrl);
    if (!isValidMapsUrl(mapsUrl)) {
      return { valid: false, error: FORMAT_ERROR };
    }
    const name = raw(cell(row, "name") || row.name);
    if (!name) {
      return { valid: false, error: FORMAT_ERROR };
    }
    return { valid: true, error: "" };
  }

  function copyColumns(row) {
    const out = {};
    COLUMN_KEYS.forEach((key) => {
      if (hasColumnKey(row, key)) out[key] = row[key];
    });
    return out;
  }

  function parseRow(row) {
    const validation = validateRow(row);
    const columns = copyColumns(row);
    const mapsUrl = raw(cell(row, "mapsUrl") || row.maps_url || row.mapsUrl);
    const name = raw(cell(row, "name") || row.name);
    const rating = parseRatingValue(cell(row, "rating"));
    const reviewMeta = parseReviewCount(cell(row, "reviewCount"));
    const phone = raw(cell(row, "phone"));
    const websiteUrl = resolveWebsiteUrl(row);
    const websiteClass = classifyLeadWebsite({
      ...row,
      website: websiteUrl,
      website_url: websiteUrl,
      websiteStatus: row.websiteStatus || row.website_status,
      websiteEnriched: row.websiteEnriched,
      has_website: row.has_website,
    });
    const hasWebsite = websiteClass.hasWebsite;
    const dbHasWebsite = resolveSupabaseHasWebsiteFlag(row);
    const address = resolveAddress(row);
    const hours = resolveHours(row);
    const categoryGroup = resolveCategoryGroup(row);
    const reviewQuote = resolveReviewQuote(row);
    const profileImage = raw(cell(row, "profileImage"));

    return {
      id: row.id,
      name,
      category: categoryGroup,
      categoryGroup,
      titleLine: raw(cell(row, "titleLine")),
      phone,
      address,
      mapsUrl,
      website: websiteClass.website,
      hours: hours || raw(row.full_hours),
      hasWebsite,
      has_website: dbHasWebsite === null ? hasWebsite : dbHasWebsite,
      websiteStatus: websiteClass.status,
      websiteConfirmed: websiteClass.confirmed,
      rating,
      reviewCount: reviewMeta.count,
      reviewLabel: reviewMeta.label,
      hasNoReviews: reviewMeta.count === 0 && reviewMeta.label === "No reviews",
      reviewQuote,
      profileImage,
      searchQuery: raw(row.search_query),
      collectedAt: row.collected_at || null,
      businessStatus: raw(row.business_status),
      priceRange: raw(row.price_range || row.doJOZc || row.price_label),
      description: raw(row.description),
      fullHours: raw(row.full_hours),
      amenities: raw(row.amenities),
      plusCode: raw(row.plus_code),
      placeId: raw(row.place_id),
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      directionsUrl: raw(row.directions_url),
      menuUrl: raw(row.menu_url),
      orderUrl: raw(row.order_url),
      bookingUrl: raw(row.booking_url),
      formatValid: validation.valid,
      formatError: validation.error,
      dedupeKey: row.id || "",
      sources: [],
      ...columns,
    };
  }

  function isValidLead(lead) {
    if (!lead || typeof lead !== "object") return false;
    if (lead.formatValid === true) return true;
    if (lead.formatValid === false) return false;
    return validateRow(lead).valid;
  }

  global.LeadCsvFormat = {
    COL,
    COLUMN_KEYS,
    FORMAT_ERROR,
    validateRow,
    parseRow,
    isValidLead,
    isValidMapsUrl,
    looksLikeHours,
    looksLikeStreetAddress,
    cleanAddressCandidate,
    isValidWebsiteUrl,
    isGoogleNoiseWebsiteUrl,
    normalizeWebsiteUrl,
    unwrapGoogleRedirect,
    resolveWebsiteUrl,
    resolveLeadWebsite,
    resolveLeadHasWebsite,
    resolveLeadMissingWebsite,
    resolveLeadNeedsWebsiteCheck,
    resolveSupabaseHasWebsiteFlag,
    classifyLeadWebsite,
    reconcileLeadWebsiteFields,
  };
})(window);
