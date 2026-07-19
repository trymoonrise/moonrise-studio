/**
 * Background website verification for leads scraped from Maps list cards.
 * Opens each place page via LeadFinderCloud Playwright when a Maps URL exists
 * but no official website URL is stored yet.
 */
(function (global) {
  const MAX_PER_BATCH = 48;
  const REQUEST_TIMEOUT_MS = 45000;
  const queue = [];
  const checked = new Set();
  let running = false;

  function baseUrl() {
    if (typeof global.resolveLeadFinderUrl === "function") {
      return global.resolveLeadFinderUrl();
    }
    return "";
  }

  function fmt() {
    return global.LeadCsvFormat;
  }

  function mapsKey(lead) {
    return String(lead?.mapsUrl || lead?.maps_url || "").trim();
  }

  function markChecked(mapsUrl) {
    if (mapsUrl) checked.add(mapsUrl);
  }

  function markLeadWebsiteMissing(lead) {
    if (!lead) return false;
    const F = fmt();
    lead.website = "";
    lead.website_url = "";
    lead.websiteStatus = "missing";
    lead.websiteEnriched = true;
    lead.websiteConfirmed = true;
    lead.websiteCheckPending = false;
    if (F?.reconcileLeadWebsiteFields) F.reconcileLeadWebsiteFields(lead);
    else lead.hasWebsite = false;
    return true;
  }

  function markLeadWebsiteUnknown(lead) {
    if (!lead) return false;
    const F = fmt();
    lead.websiteStatus = "unknown";
    lead.websiteEnriched = false;
    lead.websiteConfirmed = false;
    lead.websiteCheckPending = false;
    if (F?.reconcileLeadWebsiteFields) F.reconcileLeadWebsiteFields(lead);
    else lead.hasWebsite = false;
    return true;
  }

  function needsWebsiteCheck(lead) {
    const F = fmt();
    if (F?.resolveSupabaseHasWebsiteFlag?.(lead) !== null) return false;
    if (F?.resolveLeadHasWebsite?.(lead)) return false;
    if (F?.resolveLeadMissingWebsite?.(lead)) return false;
    const maps = mapsKey(lead);
    if (!maps.startsWith("http")) return false;
    if (checked.has(maps)) return false;

    const rawSite = String(lead?.website || lead?.website_url || lead?.websiteUrl || "").trim();
    const storedIsNoise =
      rawSite &&
      (F?.isValidWebsiteUrl ? !F.isValidWebsiteUrl(rawSite) : /google\.com\/aclk/i.test(rawSite));
    if (storedIsNoise) return true;

    return F?.resolveLeadNeedsWebsiteCheck ? F.resolveLeadNeedsWebsiteCheck(lead) : true;
  }

  /**
   * @returns {"has"|"missing"|"unknown"|""} definitive status when enrichment settled
   */
  function applyEnrichment(lead, data) {
    if (!lead || !data?.ok) return "";
    const F = fmt();
    const url = String(data.websiteUrl || data.website || "").trim();
    const status = String(data.websiteStatus || data.website_status || "").trim().toLowerCase();

    if (F?.isValidWebsiteUrl?.(url)) {
      const normalized = F.normalizeWebsiteUrl ? F.normalizeWebsiteUrl(url) : url;
      lead.website = normalized;
      lead.website_url = normalized;
      lead["lcr4fd href"] = normalized;
      lead.websiteStatus = "has";
      lead.websiteEnriched = true;
      lead.websiteConfirmed = true;
      lead.websiteCheckPending = false;
      if (F?.reconcileLeadWebsiteFields) F.reconcileLeadWebsiteFields(lead);
      else lead.hasWebsite = true;
      return "has";
    }

    if (status === "missing") {
      markLeadWebsiteMissing(lead);
      return "missing";
    }

    markLeadWebsiteUnknown(lead);
    return "unknown";
  }

  async function authHeaders() {
    const headers = { "Content-Type": "application/json" };
    try {
      const session = await global.StudioAuth?.getSession?.();
      if (session?.access_token) {
        headers.Authorization = "Bearer " + session.access_token;
      }
    } catch (_) {
      /* ignore */
    }
    return headers;
  }

  async function canRunEnrichment() {
    const url = baseUrl();
    if (!url) return false;
    if (!/\/lead-finder$/i.test(url)) return true;
    const headers = await authHeaders();
    return !!headers.Authorization;
  }

  async function fetchPlaceWebsite(mapsUrl, businessName) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      : null;
    try {
      const res = await fetch(baseUrl() + "/enrich-place", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          mapsUrl,
          businessName: String(businessName || "").trim(),
          upload: true,
        }),
        signal: controller?.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Website check failed (" + res.status + ")");
      }
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function pump(onUpdate) {
    if (running || !queue.length) return;
    if (!(await canRunEnrichment())) {
      while (queue.length) {
        const item = queue.shift();
        markLeadWebsiteUnknown(item.lead);
        onUpdate?.(item.lead);
      }
      return;
    }

    running = true;
    while (queue.length) {
      const item = queue.shift();
      item.lead.websiteCheckPending = true;
      try {
        const data = await fetchPlaceWebsite(item.mapsUrl, item.name);
        const outcome = applyEnrichment(item.lead, data);
        if (outcome === "has" || outcome === "missing") {
          markChecked(item.mapsUrl);
        }
        onUpdate?.(item.lead, data);
      } catch (_) {
        markLeadWebsiteUnknown(item.lead);
        onUpdate?.(item.lead);
      }
    }
    running = false;
  }

  function enqueue(leads, onUpdate) {
    if (!Array.isArray(leads) || !leads.length) return 0;
    let added = 0;
    for (const lead of leads) {
      if (added >= MAX_PER_BATCH) break;
      if (!needsWebsiteCheck(lead)) continue;
      const mapsUrl = mapsKey(lead);
      queue.push({
        lead,
        mapsUrl,
        name: String(lead?.name || lead?.business_name || "").trim(),
      });
      lead.websiteCheckPending = true;
      added += 1;
    }
    if (added) void pump(onUpdate);
    return added;
  }

  async function fallbackLeads(leads, onUpdate) {
    const list = (leads || []).filter(needsWebsiteCheck);
    if (!list.length) return 0;
    list.forEach((lead) => markLeadWebsiteUnknown(lead));
    if (onUpdate) onUpdate();
    return list.length;
  }

  global.LeadWebsiteEnrich = {
    enqueue,
    fallbackLeads,
    markLeadWebsiteMissing,
    markLeadWebsiteUnknown,
    needsWebsiteCheck,
    canRunEnrichment,
    baseUrl,
    MAX_PER_BATCH,
  };
})(window);
