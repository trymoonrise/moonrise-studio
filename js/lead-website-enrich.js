/**
 * Background website verification for leads scraped from Maps list cards.
 * Opens each place page via LeadFinderCloud Playwright when a Maps URL exists
 * but no official website URL is stored yet.
 */
(function (global) {
  const MAX_PER_BATCH = 24;
  const queue = [];
  const checked = new Set();
  let running = false;

  function baseUrl() {
    if (typeof global.resolveLeadFinderUrl === "function") {
      return global.resolveLeadFinderUrl();
    }
    return "";
  }

  function mapsKey(lead) {
    return String(lead?.mapsUrl || lead?.maps_url || "").trim();
  }

  function needsWebsiteCheck(lead) {
    const fmt = global.LeadCsvFormat;
    // Valid official site already present — skip.
    if (fmt?.resolveLeadHasWebsite?.(lead)) return false;
    const maps = mapsKey(lead);
    if (!maps.startsWith("http")) return false;
    // Stale Google Ads / aclk URLs must be re-checked even if marked enriched.
    const rawSite = String(lead?.website || lead?.website_url || lead?.websiteUrl || "").trim();
    const storedIsNoise =
      rawSite &&
      (fmt?.isValidWebsiteUrl ? !fmt.isValidWebsiteUrl(rawSite) : /google\.com\/aclk/i.test(rawSite));
    if (storedIsNoise) {
      if (checked.has(maps)) return false;
      return true;
    }
    if (lead?.websiteStatus === "missing" || lead?.websiteEnriched === true) return false;
    if (checked.has(maps)) return false;
    return true;
  }

  function applyEnrichment(lead, data) {
    if (!lead || !data?.ok) return false;
    const fmt = global.LeadCsvFormat;
    const url = String(data.websiteUrl || data.website || "").trim();
    if (fmt?.isValidWebsiteUrl?.(url)) {
      const normalized = fmt.normalizeWebsiteUrl ? fmt.normalizeWebsiteUrl(url) : url;
      lead.website = normalized;
      lead.website_url = normalized;
      lead["lcr4fd href"] = normalized;
      lead.hasWebsite = true;
      lead.websiteStatus = "has";
      lead.websiteEnriched = true;
      return true;
    }
    if (data.websiteStatus === "missing") {
      lead.hasWebsite = false;
      lead.website = "";
      lead.website_url = "";
      lead.websiteStatus = "missing";
      lead.websiteEnriched = true;
      return true;
    }
    return false;
  }

  async function fetchPlaceWebsite(mapsUrl, businessName) {
    const res = await fetch(baseUrl() + "/enrich-place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapsUrl,
        businessName: String(businessName || "").trim(),
        upload: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Website check failed (" + res.status + ")");
    }
    return data;
  }

  async function pump(onUpdate) {
    if (running || !queue.length || !baseUrl()) return;
    running = true;
    while (queue.length) {
      const item = queue.shift();
      try {
        const data = await fetchPlaceWebsite(item.mapsUrl, item.name);
        if (applyEnrichment(item.lead, data)) {
          onUpdate?.(item.lead, data);
        }
      } catch (_) {
        /* keep list-card data on failure */
      }
    }
    running = false;
  }

  function enqueue(leads, onUpdate) {
    if (!baseUrl() || !Array.isArray(leads) || !leads.length) return 0;
    let added = 0;
    for (const lead of leads) {
      if (added >= MAX_PER_BATCH) break;
      if (!needsWebsiteCheck(lead)) continue;
      const mapsUrl = mapsKey(lead);
      checked.add(mapsUrl);
      queue.push({
        lead,
        mapsUrl,
        name: String(lead?.name || lead?.business_name || "").trim(),
      });
      added += 1;
    }
    if (added) void pump(onUpdate);
    return added;
  }

  global.LeadWebsiteEnrich = {
    enqueue,
    needsWebsiteCheck,
    baseUrl,
  };
})(window);
