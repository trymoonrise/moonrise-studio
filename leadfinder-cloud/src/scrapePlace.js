/**
 * Playwright helper: open a Google Maps place URL and extract current fields
 * (website, phone, rating, hours, etc.) for Clean / refresh upserts.
 *
 * Website detection is STRICT:
 * - HAS website = official Maps Website / authority row only
 * - NO website = explicit "Add website" missing-info prompt, or no authority after panel settle
 * - Booking / Services / Appointments URLs are NOT treated as the business website
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs inside the browser via page.evaluate - keep self-contained. */
export function scrapeGoogleMapsPlaceInBrowser(payload) {
  const mapsUrl = typeof payload === "string" ? payload : String(payload?.mapsUrl || "");
  const knownName = typeof payload === "string" ? "" : String(payload?.knownName || "");

  const sleepLocal = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  function cleanLabel(value, prefixes) {
    let text = String(value || "").trim();
    for (const prefix of prefixes) {
      text = text.replace(new RegExp(`^${prefix}\\s*:?\\s*`, "i"), "").trim();
    }
    return text;
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const value = textOf(document.querySelector(selector));
      if (value) return value;
    }
    return "";
  }

  function firstAttribute(selectors, attribute) {
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.getAttribute(attribute);
      if (value) return absoluteUrl(value);
    }
    return "";
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

  function linkLabel(link) {
    return [
      link.getAttribute("aria-label"),
      link.getAttribute("data-tooltip"),
      link.getAttribute("data-item-id"),
      link.getAttribute("data-value"),
      textOf(link),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  /** True when Maps explicitly says this place has no website on file. */
  function hasExplicitMissingWebsite() {
    const nodes = document.querySelectorAll("button, a, [role='button'], span, div");
    for (const el of nodes) {
      const t = textOf(el);
      if (!t || t.length > 64) continue;
      if (/^add(\s+place'?s)?\s+website$/i.test(t)) return true;
      const aria = String(el.getAttribute("aria-label") || "");
      if (/^add(\s+place'?s)?\s+website$/i.test(aria.trim())) return true;
    }
    // Dense pages sometimes only expose the phrase in body copy once hydrated.
    const body = textOf(document.body);
    if (/\badd missing information\b/i.test(body) && /\badd(\s+place'?s)?\s+website\b/i.test(body)) {
      return true;
    }
    return false;
  }

  /** Extract https URL from Maps label text like "pelvicsanity.com" or "Website: pelvicsanity.com". */
  function websiteUrlFromLabelText(value) {
    let text = cleanLabel(String(value || ""), ["Website", "Open website", "Visit website"]);
    text = text.replace(/^https?:\/\//i, "").replace(/^www\./i, "").trim();
    if (!text) return "";
    if (!/^[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+\.[a-z]{2,}(?:[/?#].*)?$/i.test(text)) {
      return "";
    }
    const normalized = absoluteUrl("https://" + text.split(/[/?#]/)[0]);
    if (!normalized || isMapsOrGoogleHost(normalized)) return "";
    return normalized;
  }

  function websiteFromAuthorityNode(node) {
    if (!node) return "";

    const directHref = unwrapGoogleRedirect(node.getAttribute("href") || "");
    if (directHref && /^https?:/i.test(directHref) && !isMapsOrGoogleHost(directHref)) {
      return directHref;
    }

    const childAnchor = node.querySelector?.('a[href]:not([href^="tel:"])');
    if (childAnchor) {
      const childHref = unwrapGoogleRedirect(childAnchor.getAttribute("href") || "");
      if (childHref && /^https?:/i.test(childHref) && !isMapsOrGoogleHost(childHref)) {
        return childHref;
      }
    }

    const fromAria = websiteUrlFromLabelText(node.getAttribute("aria-label") || "");
    if (fromAria) return fromAria;

    const fromTooltip = websiteUrlFromLabelText(node.getAttribute("data-tooltip") || "");
    if (fromTooltip) return fromTooltip;

    const fromValue = websiteUrlFromLabelText(node.getAttribute("data-value") || "");
    if (fromValue) return fromValue;

    const fromIo = websiteUrlFromLabelText(textOf(node.querySelector(".Io6YTe") || node));
    if (fromIo) return fromIo;

    return "";
  }

  /**
   * Strict official Website row only.
   * Ignores Appointments / Services / Booking / Menu / Order links that also show domains.
   */
  function firstOfficialWebsiteUrl() {
    const authorityNodes = document.querySelectorAll(
      '[data-item-id="authority"], [data-item-id^="authority"]',
    );
    for (const node of authorityNodes) {
      const href = websiteFromAuthorityNode(node);
      if (href) return href;
    }

    const labeledSelectors = [
      'a[data-value="Website"][href]',
      'a[data-tooltip="Open website"][href]',
      'a[aria-label^="Website:" i][href]',
      'a[aria-label^="Website " i][href]',
      'a[aria-label^="Open website" i][href]',
      'a[aria-label*="Open website" i][href]',
      "a.lcr4fd[href]",
    ];
    for (const selector of labeledSelectors) {
      for (const node of document.querySelectorAll(selector)) {
        const label = linkLabel(node);
        if (/add(\s+place'?s)?\s+website/i.test(label)) continue;
        // lcr4fd can appear on non-website actions - require website cue unless authority already matched above
        if (selector === "a.lcr4fd[href]" && !/\bwebsite\b|authority/i.test(label)) continue;
        const href = unwrapGoogleRedirect(node.getAttribute("href") || "");
        if (href && /^https?:/i.test(href) && !isMapsOrGoogleHost(href)) return href;
      }
    }

    for (const link of document.querySelectorAll("a[href]")) {
      const label = linkLabel(link);
      if (!label) continue;
      if (/add(\s+place'?s)?\s+website/i.test(label)) continue;
      // Reject booking / services / menu noise even if a domain is visible
      if (
        /\b(appointment|appointments|book online|reserve a table|order online|menu|services|directions|send to phone|nearby|share|save)\b/i.test(
          label,
        ) &&
        !/\bwebsite\b/i.test(label)
      ) {
        continue;
      }
      if (!/\bwebsite\b/i.test(label) && !/\bauthority\b/i.test(label)) continue;
      const href = unwrapGoogleRedirect(link.getAttribute("href") || "");
      if (href && /^https?:/i.test(href) && !isMapsOrGoogleHost(href)) return href;
    }

    return "";
  }

  function firstWebsiteUrl() {
    return firstOfficialWebsiteUrl();
  }

  function websiteDecision() {
    const url = firstOfficialWebsiteUrl();
    if (url) return { status: "has", url };
    if (hasExplicitMissingWebsite()) return { status: "missing", url: "" };
    return { status: "unknown", url: "" };
  }

  function placeScrollRoot() {
    return (
      document.querySelector('.m6QErb.DxyBCb[tabindex="-1"]') ||
      document.querySelector(".m6QErb.DxyBCb") ||
      document.querySelector('[role="main"]') ||
      document.querySelector(".m6QErb") ||
      null
    );
  }

  /** Dense place pages lazy-render Website / Add website below the fold. */
  async function scrollPlaceDetails() {
    const root = placeScrollRoot();
    if (!root) {
      window.scrollBy(0, 600);
      await sleepLocal(120);
      window.scrollBy(0, 600);
      await sleepLocal(120);
      return;
    }
    const max = Math.min(Math.max(root.scrollHeight, 800), 3200);
    for (let y = 0; y <= max; y += 320) {
      root.scrollTop = y;
      await sleepLocal(70);
    }
    root.scrollTop = 0;
    await sleepLocal(100);
  }

  function firstDataItemText(selectors, labelPrefixes) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const label = cleanLabel(element.getAttribute("aria-label"), labelPrefixes);
      if (label) return label;
      const value = textOf(element.querySelector(".Io6YTe") || element);
      if (value) return cleanLabel(value, labelPrefixes);
    }
    return "";
  }

  function extractPhone(rawText) {
    const patterns = [
      /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
      /(?:\+?1[\s.-]?)?\d{3}[\s.-]\d{3}[\s.-]\d{4}/,
      /\+?\d{10,15}/,
    ];
    for (const pattern of patterns) {
      const match = String(rawText || "").match(pattern);
      if (match) return match[0];
    }
    return "";
  }

  function phoneFromTelHref(href) {
    const raw = String(href || "").replace(/^tel:/i, "").trim();
    if (!raw) return "";
    return extractPhone(raw) || raw;
  }

  function firstPhone() {
    const fromButton =
      firstDataItemText(
        [
          'button[data-item-id^="phone"]',
          '[data-item-id^="phone"]',
          'button[aria-label^="Phone" i]',
          'button[data-tooltip*="phone" i]',
          'a[aria-label^="Phone" i]',
        ],
        ["Phone", "Call"],
      ) || "";
    if (fromButton) return extractPhone(fromButton) || fromButton;

    const telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) {
      const fromHref = phoneFromTelHref(telLink.getAttribute("href"));
      if (fromHref) return fromHref;
      const fromText = extractPhone(textOf(telLink));
      if (fromText) return fromText;
    }

    for (const el of document.querySelectorAll("[data-item-id^='phone']")) {
      const itemId = el.getAttribute("data-item-id") || "";
      const telMatch = itemId.match(/tel:([^"'\s]+)/i);
      if (telMatch) {
        const fromId = phoneFromTelHref(`tel:${telMatch[1]}`);
        if (fromId) return fromId;
      }
      const labeled = cleanLabel(el.getAttribute("aria-label"), ["Phone", "Call"]);
      if (labeled) return extractPhone(labeled) || labeled;
    }

    return "";
  }

  function parseCoords(href) {
    const out = { latitude: "", longitude: "", place_id: "" };
    const m = String(href || "").match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) {
      out.latitude = m[1];
      out.longitude = m[2];
    }
    const c = String(href || "").match(/(ChIJ[\w-]+)/);
    if (c) out.place_id = c[1];
    return out;
  }

  function hasContactPanel() {
    return Boolean(
      document.querySelector(
        [
          'a[data-item-id="authority"][href]',
          'a[data-item-id^="authority"][href]',
          'a[aria-label*="website" i][href]',
          'a[data-tooltip="Open website"][href]',
          'button[data-item-id^="phone"]',
          '[data-item-id^="phone"]',
          'a[href^="tel:"]',
          'button[data-item-id="address"]',
          '[data-item-id="address"]',
        ].join(", "),
      ),
    );
  }

  function pageReady() {
    const name = textOf(document.querySelector("h1.DUwDvf, h1.fontHeadlineLarge, h1"));
    const loading = /loading/i.test(textOf(document.body));
    return {
      ready: !!name && !loading && (hasContactPanel() || document.readyState === "complete"),
      name,
      hasContacts: hasContactPanel(),
    };
  }

  return (async () => {
    // Wait for title + any contact cues (phone/address may appear before Website).
    for (let i = 0; i < 50; i += 1) {
      const state = pageReady();
      if (state.ready && state.hasContacts) break;
      if (state.ready && i > 20) break;
      await sleepLocal(100);
    }

    // Force lazy rows (Website / Add website) to mount on dense listings.
    await scrollPlaceDetails();

    // Do NOT stop early just because phone/address exist - wait for website decision.
    let decision = websiteDecision();
    for (let i = 0; i < 45; i += 1) {
      if (decision.status === "has" || decision.status === "missing") break;
      if (i === 15 || i === 30) await scrollPlaceDetails();
      await sleepLocal(120);
      decision = websiteDecision();
    }

    // Final pass after one more scroll if still unknown.
    if (decision.status === "unknown") {
      await scrollPlaceDetails();
      await sleepLocal(250);
      decision = websiteDecision();
    }

    const websiteUrl = decision.url || "";
    const rawText = textOf(document.body);
    const address = firstDataItemText(
      ['button[data-item-id="address"]', '[data-item-id="address"]'],
      ["Address"],
    );
    const phone = firstPhone() || extractPhone(rawText);
    const category = firstDataItemText(
      [
        'button[jsaction*="category"]',
        'button[aria-label^="Category"]',
        '[aria-label^="Category:"]',
        "button.DkEaL",
        ".DkEaL",
      ],
      ["Category"],
    );
    const hours = firstDataItemText(
      ['button[data-item-id="oh"]', '[data-item-id="oh"]', 'button[aria-label*="Hours"]'],
      ["Hours"],
    );
    const coords = parseCoords(location.href);
    const name = firstText(["h1.DUwDvf", "h1.fontHeadlineLarge", "h1"]) || knownName;

    const row = {
      maps_url: mapsUrl || location.href,
      business_name: name,
      rating: firstText([".F7nice span[aria-hidden='true']", ".MW4etd"]),
      review_count: firstText([".F7nice span[aria-label*='review']", ".UY7F9"]),
      category,
      address,
      city_state_zip: "",
      hours,
      detail_extra_1: "",
      detail_extra_2: "",
      detail_extra_3: "",
      phone,
      website_url: websiteUrl,
      website_label: websiteUrl ? "Website" : "",
      has_website: Boolean(websiteUrl),
      website_status: decision.status,
      latitude: coords.latitude,
      longitude: coords.longitude,
      place_id: coords.place_id,
      collected_at: new Date().toISOString(),
      scrape_source: "leadfinder-cloud-clean",
    };

    return {
      row: name ? row : null,
      hadWebsite: Boolean(websiteUrl),
      hadPhone: Boolean(phone),
      websiteUrl,
      websiteStatus: decision.status,
      phone,
      name,
      finalUrl: location.href,
    };
  })();
}

export async function scrapeMapsPlace(page, mapsUrl, cfg, knownName = "") {
  const url = String(mapsUrl || "").trim();
  if (!url.startsWith("http")) {
    throw new Error("Invalid Maps URL");
  }

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: cfg.maxMapsWaitMs || 20000,
  });

  for (const label of ["Accept all", "I agree", "Accept"]) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      break;
    }
  }

  await page
    .waitForSelector(
      "h1.DUwDvf, h1.fontHeadlineLarge, h1, a[data-item-id='authority'], button[data-item-id='address'], button[data-item-id^='phone']",
      {
        timeout: cfg.pageReadyMs || 8000,
      },
    )
    .catch(() => {});

  // Prefer the official Website control when present; do not treat phone-only as done.
  await page
    .waitForSelector(
      [
        "[data-item-id='authority']",
        "a[aria-label^='Website' i]",
        "a[data-tooltip='Open website']",
        "button[data-item-id^='phone']",
        "a[href^='tel:']",
        "button[data-item-id='address']",
      ].join(", "),
      { timeout: cfg.placeContactWaitMs || 6000 },
    )
    .catch(() => {});

  // Give dense attribute rows time to paint before in-page scroll + website decision.
  await sleep(cfg.placeSettleMs ?? 700);

  return page.evaluate(scrapeGoogleMapsPlaceInBrowser, {
    mapsUrl: url,
    knownName,
  });
}
