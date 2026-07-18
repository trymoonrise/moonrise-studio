import { scrapeGoogleMapsPlaceInBrowser, scrapeMapsPlace } from "./scrapePlace.js";

/**
 * Browser-side Google Maps list scraper for page.evaluate().
 * Mirrors LeadFinder/background.js scrapeGoogleMapsResults (without Chrome extension APIs).
 * Playwright only accepts one serializable argument — pass { queryText, options }.
 */
export function scrapeGoogleMapsListInBrowser(payload) {
  const queryText =
    typeof payload === "string" ? payload : String(payload?.queryText || "");
  const options = typeof payload === "string" ? {} : payload?.options || {};
  const maxScrolls = Number(options.maxScrolls) || 260;
  const minResults = Math.max(0, Number(options.minResults) || 0);
  const noNewLeadTimeoutMs = Number(options.noNewLeadTimeoutMs) || 1600;
  const settleFastMs = Number(options.settleFastMs) || 0;
  const settleSlowMs = Number(options.settleSlowMs) || 8;
  const finalSettleMs = Number(options.finalSettleMs) || 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function textOf(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function absoluteUrl(value) {
    if (!value) return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return String(value || "");
    }
  }

  function hasReachedEndOfList() {
    const markers = document.querySelectorAll(
      '.HlvSq, .fontBodyMedium, [role="status"], [aria-live], .PbZDve',
    );
    for (const node of markers) {
      const value = textOf(node);
      if (/you.?ve reached the end of the list/i.test(value) || /end of the list/i.test(value)) {
        return true;
      }
    }
    const body = textOf(document.body);
    return /you.?ve reached the end of the list/i.test(body) || /reached the end of (the )?list/i.test(body);
  }

  function findResultsPanel() {
    const candidates = [
      document.querySelector('[role="feed"]'),
      document.querySelector("div[aria-label][role='feed']"),
      document.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf"),
      document.querySelector(".m6QErb.XiKgde"),
      document.querySelector(".siAUzd"),
    ].filter(Boolean);

    return (
      candidates.find((candidate) => {
        const articles = candidate.querySelectorAll('[role="article"], .Nv2PK').length;
        return articles > 0 && candidate.scrollHeight > candidate.clientHeight;
      }) ||
      candidates.find((candidate) => candidate.querySelector('[role="article"], .Nv2PK')) ||
      candidates[0] ||
      null
    );
  }

  function firstText(card, selectors) {
    for (const selector of selectors) {
      const value = textOf(card.querySelector(selector));
      if (value) return value;
    }
    return "";
  }

  function textValues(card, selector) {
    return Array.from(
      new Set(
        Array.from(card.querySelectorAll(selector))
          .map(textOf)
          .filter(Boolean),
      ),
    );
  }

  function attributeValues(card, selector, attribute) {
    return Array.from(
      new Set(
        Array.from(card.querySelectorAll(selector))
          .map((el) => el.getAttribute(attribute))
          .filter(Boolean)
          .map(absoluteUrl),
      ),
    );
  }

  function firstAttribute(card, selectors, attribute) {
    for (const selector of selectors) {
      const value = absoluteUrl(card.querySelector(selector)?.getAttribute(attribute) || "");
      if (value) return value;
    }
    return "";
  }

  function extractPhone(rawText) {
    const patterns = [
      /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
      /(?:\+?1[\s.-]?)?\d{3}[\s.-]\d{3}[\s.-]\d{4}/,
    ];
    for (const pattern of patterns) {
      const match = String(rawText || "").match(pattern);
      if (match) return match[0];
    }
    return "";
  }

  function phoneFromCard(card) {
    const direct = firstText(card, [".UsdlK", 'span[aria-label*="Phone" i]']);
    if (direct) return extractPhone(direct) || direct;

    const tel = card.querySelector('a[href^="tel:"]');
    if (tel) {
      const hrefPhone = extractPhone(String(tel.getAttribute("href") || "").replace(/^tel:/i, ""));
      if (hrefPhone) return hrefPhone;
      const textPhone = extractPhone(textOf(tel));
      if (textPhone) return textPhone;
    }

    for (const el of card.querySelectorAll("[data-item-id^='phone'], [aria-label*='Phone' i]")) {
      const itemId = el.getAttribute("data-item-id") || "";
      const telMatch = itemId.match(/tel:([^"'\s]+)/i);
      if (telMatch) {
        const fromId = extractPhone(telMatch[1]);
        if (fromId) return fromId;
      }
      const labeled = extractPhone(el.getAttribute("aria-label") || textOf(el));
      if (labeled) return labeled;
    }

    return extractPhone(textOf(card));
  }

  function splitDetailsText(value) {
    return String(value || "")
      .replace(/\s*[·•]\s*/g, "\n")
      .split(/\n|\s{2,}/)
      .map((part) => part.replace(/^[·•]\s*/, "").replace(/\s*[·•]$/, "").trim())
      .filter(Boolean);
  }

  function isRatingText(value) {
    return /^\d(?:\.\d)?$/.test(String(value || "").trim());
  }

  function isReviewText(value) {
    return /^\(?[\d,]+\)?$/.test(String(value || "").trim()) || /\breviews?\b/i.test(String(value || ""));
  }

  function isActionText(value) {
    return /\b(website|directions|save|share|call|order|menu|open maps)\b/i.test(String(value || ""));
  }

  function isHoursText(value) {
    return /\b(open|closed|closes|opens|24 hours)\b/i.test(String(value || ""));
  }

  function isAddressText(value) {
    const text = String(value || "").trim();
    return (
      /\d/.test(text) &&
      /\b(st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|hwy|highway|way|ln|lane|ct|court|pl|place|pkwy|parkway|sq|square|mall|center|centre|plaza|ste|suite|unit)\b/i.test(
        text,
      )
    );
  }

  function cleanCategoryText(value) {
    return String(value || "")
      .replace(/\$\d+(?:\.\d{2})?/g, "")
      .replace(/\b(open|closed|closes|opens)\b.*$/i, "")
      .trim();
  }

  function detailTokens(card) {
    return Array.from(
      new Set(
        Array.from(card.querySelectorAll(".W4Efsd, .W4Efsd span, .fontBodyMedium"))
          .flatMap((el) => splitDetailsText(textOf(el)))
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    );
  }

  function parsedCardDetails(card, name) {
    const tokens = detailTokens(card);
    const normalizedName = String(name || "").trim().toLowerCase();
    const rating = firstText(card, [".MW4etd"]) || tokens.find(isRatingText) || "";
    const reviews = firstText(card, [".UY7F9"]) || tokens.find(isReviewText) || "";
    const phone = phoneFromCard(card);
    const address =
      tokens.find((value) => {
        if (value === phone || isRatingText(value) || isReviewText(value) || isActionText(value) || isHoursText(value)) {
          return false;
        }
        return isAddressText(value);
      }) || "";
    const category =
      tokens.find((value) => {
        const cleaned = cleanCategoryText(value);
        if (!cleaned || cleaned === phone || cleaned === rating || cleaned === reviews) return false;
        if (normalizedName && cleaned.toLowerCase() === normalizedName) return false;
        if (isRatingText(cleaned) || isReviewText(cleaned) || isActionText(cleaned) || isHoursText(cleaned) || isAddressText(cleaned)) {
          return false;
        }
        return /[a-z]/i.test(cleaned) && cleaned.length < 60;
      }) || "";

    return {
      rating,
      reviews,
      category: cleanCategoryText(category),
      address,
      hours: tokens.find((value) => isHoursText(value) && !isActionText(value)) || "",
      phone,
    };
  }

  function unwrapGoogleRedirect(url) {
    const href = absoluteUrl(url);
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
          if (target && /^https?:/i.test(String(target))) return absoluteUrl(target);
        }
      }
    } catch {
      // keep original
    }
    return href;
  }

  function firstWebsiteUrl(card) {
    function isMapsOrGoogleHost(href) {
      try {
        const parsed = new URL(href);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        if (
          host.includes("googleadservices.com") ||
          host.includes("doubleclick.net") ||
          path.includes("/aclk")
        ) {
          return true;
        }
        return (
          host.includes("google.") ||
          host.includes("gstatic.com") ||
          host.includes("goo.gl") ||
          host.includes("maps.app.goo.gl")
        );
      } catch {
        return true;
      }
    }

    function linkLabel(anchor) {
      return [
        anchor.getAttribute("aria-label"),
        anchor.getAttribute("data-tooltip"),
        anchor.getAttribute("data-item-id"),
        anchor.getAttribute("data-value"),
        textOf(anchor),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    }

    // Prefer official Website / authority only (list cards often omit it — enrichment fills in).
    const direct = firstAttribute(
      card,
      [
        'a[data-item-id="authority"][href]',
        'a[data-item-id^="authority"][href]',
        'a[data-value="Website"][href]',
        'a[aria-label^="Website" i][href]',
        'a[aria-label^="Open website" i][href]',
        'a[data-tooltip="Open website"][href]',
      ],
      "href",
    );
    if (direct) {
      const href = unwrapGoogleRedirect(direct);
      if (href && !isMapsOrGoogleHost(href)) return href;
    }

    const link = Array.from(card.querySelectorAll("a[href]")).find((anchor) => {
      const label = linkLabel(anchor);
      if (/add(\s+place'?s)?\s+website/i.test(label)) return false;
      if (
        /\b(appointment|appointments|book online|menu|services|directions|order)\b/i.test(label) &&
        !/\bwebsite\b/i.test(label)
      ) {
        return false;
      }
      return /\bwebsite\b/i.test(label) || /\bauthority\b/i.test(label);
    });
    const href = unwrapGoogleRedirect(link?.getAttribute("href") || "");
    if (href && !isMapsOrGoogleHost(href)) return href;
    return "";
  }

  function extractCard(card) {
    const rawText = textOf(card);
    const name =
      firstText(card, [".qBF1Pd", ".fontHeadlineSmall", ".NrDZNb [class]"]) ||
      card.getAttribute("aria-label") ||
      "";
    if (!name || /^results$/i.test(name) || /available filters/i.test(rawText)) return null;

    const details = parsedCardDetails(card, name);
    const mapsUrl =
      firstAttribute(card, ['a.hfpxzc[href*="/maps/place/"]'], "href") ||
      firstAttribute(card, ["a.hfpxzc[href]", 'a[href*="/maps/place/"]'], "href");
    const websiteUrl = firstWebsiteUrl(card);
    const phone = details.phone;
    const imageSrcs = attributeValues(card, ".Jn12ke img[src], img.Jn12ke[src], .Jn12ke[src]", "src");
    const cw = textValues(card, ".Cw1rxd");
    const r8 = textValues(card, ".R8c4Qb");

    return {
      maps_url: mapsUrl,
      business_name: name,
      rating: details.rating,
      review_count: details.reviews,
      category: details.category,
      address: details.address,
      city_state_zip: "",
      hours: details.hours,
      detail_extra_1: "",
      detail_extra_2: "",
      detail_extra_3: "",
      phone,
      website_url: websiteUrl,
      website_label: cw[0] || (websiteUrl ? "Website" : ""),
      directions_label: r8[0] || (mapsUrl ? "Directions" : ""),
      review_quote: "",
      category_group: details.category,
      price_label: "",
      image_url: imageSrcs[0] || "",
      extra_1: "",
      extra_2: "",
      extra_3: "",
      maps_extra: "",
      search_query: queryText,
      scrape_source: "leadfinder-cloud",
      collected_at: new Date().toISOString(),
    };
  }

  function collectRows(panel, rowsByKey) {
    if (!panel) return 0;
    let added = 0;
    for (const card of panel.querySelectorAll('[role="article"], .Nv2PK')) {
      const row = extractCard(card);
      if (!row) continue;
      const key =
        row.maps_url || `${row.business_name}::${row.phone}::${row.address}`;
      if (!key || rowsByKey[key]) continue;
      rowsByKey[key] = row;
      added += 1;
    }
    return added;
  }

  function scrollResultsPanel(panel) {
    if (!panel) return;
    const cards = panel.querySelectorAll('[role="article"], .Nv2PK');
    const lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.scrollIntoView({ block: "end", behavior: "auto" });
    panel.scrollTop = panel.scrollHeight;
  }

  return (async () => {
    const rowsByKey = {};
    let panel = findResultsPanel();
    for (let i = 0; i < 60; i += 1) {
      if (panel?.querySelector?.('[role="article"], .Nv2PK')) break;
      await sleep(16);
      panel = findResultsPanel();
    }

    let lastNewAt = Date.now();
    let reachedEnd = false;
    let inactiveTimeout = false;

    for (let i = 0; i < maxScrolls; i += 1) {
      panel = findResultsPanel() || panel;
      const added = collectRows(panel, rowsByKey);
      if (added > 0) lastNewAt = Date.now();

      if (hasReachedEndOfList()) {
        if (minResults > 0 && Object.keys(rowsByKey).length < minResults && i < maxScrolls - 8) {
          scrollResultsPanel(panel);
          continue;
        }
        reachedEnd = true;
        break;
      }

      if (Date.now() - lastNewAt >= noNewLeadTimeoutMs) {
        if (minResults > 0 && Object.keys(rowsByKey).length < minResults && i < maxScrolls - 8) {
          lastNewAt = Date.now();
        } else {
          inactiveTimeout = true;
          break;
        }
      }

      // Burst scrolls — Maps loads laggy chunks; double-hit cuts waiting.
      scrollResultsPanel(panel);
      scrollResultsPanel(panel);
      const waitMs = added > 0 ? settleFastMs : settleSlowMs;
      if (waitMs > 0) await sleep(waitMs);
    }

    if (finalSettleMs > 0) await sleep(finalSettleMs);
    panel = findResultsPanel() || panel;
    collectRows(panel, rowsByKey);

    return {
      rows: Object.values(rowsByKey),
      rowCount: Object.keys(rowsByKey).length,
      reachedEnd: reachedEnd || hasReachedEndOfList(),
      inactiveTimeout,
      panelFound: Boolean(panel),
      finalUrl: location.href,
    };
  })();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsContactEnrichment(row) {
  const website = String(row?.website_url || row?.["lcr4fd href"] || "").trim();
  const phone = String(row?.phone || row?.UsdlK || "").trim();
  const mapsUrl = String(row?.maps_url || row?.["hfpxzc href"] || "").trim();
  return Boolean(mapsUrl.startsWith("http") && (!website || !phone));
}

function mergePlaceIntoListRow(listRow, placeRow) {
  if (!placeRow) return listRow;
  const next = { ...listRow };
  const assignIfEmpty = (key, ...aliases) => {
    const current = String(next[key] || "").trim();
    if (current) return;
    for (const alias of aliases) {
      const value = String(placeRow[alias] || "").trim();
      if (value) {
        next[key] = value;
        return;
      }
    }
  };

  assignIfEmpty("website_url", "website_url", "lcr4fd href");
  assignIfEmpty("phone", "phone", "UsdlK");
  assignIfEmpty("address", "address", "W4Efsd 2");
  assignIfEmpty("category", "category", "W4Efsd");
  assignIfEmpty("hours", "hours", "W4Efsd 4");
  assignIfEmpty("rating", "rating", "MW4etd");
  assignIfEmpty("review_count", "review_count", "UY7F9");
  assignIfEmpty("latitude", "latitude");
  assignIfEmpty("longitude", "longitude");
  assignIfEmpty("place_id", "place_id");

  if (next.website_url && !next.website_label) next.website_label = "Website";
  if (next.website_url) {
    next.has_website = true;
    next.website_status = String(placeRow.website_status || "has").trim() || "has";
  } else if (placeRow.website_status === "missing") {
    next.has_website = false;
    next.website_status = "missing";
  }
  return next;
}

async function enrichMissingContacts(page, rows, cfg, queryText) {
  if (!cfg.enrichMissingContacts) {
    return { rows: Array.isArray(rows) ? rows : [], enriched: 0, attempted: 0 };
  }
  const list = Array.isArray(rows) ? rows : [];
  const maxEnrich = Math.max(0, Number(cfg.enrichMaxPerQuery) || 40);
  const targets = list.filter(needsContactEnrichment).slice(0, maxEnrich);
  if (!targets.length) return { rows: list, enriched: 0, attempted: 0 };

  let enriched = 0;
  for (const row of targets) {
    const mapsUrl = String(row.maps_url || row["hfpxzc href"] || "").trim();
    const name = String(row.business_name || row.qBF1Pd || "").trim();
    const beforeWebsite = String(row.website_url || "").trim();
    const beforePhone = String(row.phone || "").trim();
    try {
      const result = await scrapeMapsPlace(page, mapsUrl, cfg, name);
      if (!result?.row) continue;
      Object.assign(row, mergePlaceIntoListRow(row, result.row));
      row.search_query = row.search_query || queryText;
      row.scrape_source = "leadfinder-cloud";
      const gainedWebsite = !beforeWebsite && String(row.website_url || "").trim();
      const gainedPhone = !beforePhone && String(row.phone || "").trim();
      if (gainedWebsite || gainedPhone) enriched += 1;
    } catch {
      // Keep list-card data if place refresh fails.
    }
  }

  return { rows: list, enriched, attempted: targets.length };
}

export async function scrapeMapsSearch(page, queryText, cfg, geo) {
  const encoded = encodeURIComponent(queryText);
  const lat = Number(geo?.latitude ?? geo?.lat);
  const lng = Number(geo?.longitude ?? geo?.lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const url = hasGeo
    ? `https://www.google.com/maps/search/${encoded}/@${lat},${lng},14z`
    : `https://www.google.com/maps/search/${encoded}`;
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: cfg.maxMapsWaitMs,
  });

  // Consent / cookie walls (EU and variants) — no wait after click
  for (const label of ["Accept all", "I agree", "Accept"]) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      break;
    }
  }

  // Wait until either a results feed OR a place action panel is ready.
  // Exact-name searches often redirect /search → /place after a beat.
  const readyMs = cfg.pageReadyMs || 6000;
  await page
    .waitForSelector(
      '[role="feed"] [role="article"], [role="feed"] .Nv2PK, .Nv2PK, a[data-item-id="authority"], a[data-item-id^="authority"], button[data-item-id^="phone"], button[data-item-id="address"]',
      { timeout: readyMs },
    )
    .catch(() => {});

  await sleep(cfg.pageSettleMs || 250);

  // Poll briefly for /search → /place redirect + contact actions.
  let landedOnPlace = false;
  for (let i = 0; i < 20; i += 1) {
    landedOnPlace = await page.evaluate(() => {
      const href = String(location.href || "");
      const hasPlaceUrl = /\/maps\/place\//i.test(href);
      const hasPlaceHeader = Boolean(document.querySelector("h1.DUwDvf, h1.fontHeadlineLarge"));
      const hasActions = Boolean(
        document.querySelector(
          'a[data-item-id="authority"], a[data-item-id^="authority"], button[data-item-id^="phone"], button[data-item-id="address"], a[href^="tel:"]',
        ),
      );
      return hasPlaceUrl && hasPlaceHeader && hasActions;
    });
    if (landedOnPlace) break;

    const hasFeed = await page
      .locator('[role="feed"] [role="article"], [role="feed"] .Nv2PK, .Nv2PK')
      .first()
      .isVisible()
      .catch(() => false);
    if (hasFeed) break;

    await sleep(150);
  }

  if (landedOnPlace) {
    await page
      .waitForSelector(
        "a[data-item-id='authority'], a[data-item-id^='authority'], button[data-item-id^='phone'], a[href^='tel:'], button[data-item-id='address']",
        { timeout: cfg.placeContactWaitMs || 3500 },
      )
      .catch(() => {});
    await sleep(cfg.placeSettleMs ?? 400);

    const result = await page.evaluate(scrapeGoogleMapsPlaceInBrowser, {
      mapsUrl: page.url(),
      knownName: "",
    });
    const row = result?.row
      ? {
          ...result.row,
          search_query: queryText,
          scrape_source: "leadfinder-cloud",
        }
      : null;
    const rows = row ? [row] : [];
    return {
      rows,
      rowCount: rows.length,
      reachedEnd: true,
      inactiveTimeout: false,
      panelFound: false,
      placePage: true,
      finalUrl: page.url(),
      enriched: 0,
    };
  }

  const listResult = await page.evaluate(scrapeGoogleMapsListInBrowser, {
    queryText,
    options: {
      maxScrolls: cfg.maxScrolls,
      minResults: Math.max(0, Number(cfg.minSearchResults) || 0),
      noNewLeadTimeoutMs: cfg.noNewLeadTimeoutMs,
      settleFastMs: cfg.settleFastMs,
      settleSlowMs: cfg.settleSlowMs,
      finalSettleMs: cfg.finalSettleMs,
    },
  });

  const enrich = await enrichMissingContacts(page, listResult.rows || [], cfg, queryText);

  return {
    ...listResult,
    rows: enrich.rows,
    rowCount: enrich.rows.length,
    placePage: false,
    enriched: enrich.enriched,
    enrichAttempted: enrich.attempted,
  };
}
