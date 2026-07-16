/**
 * Load leads from Supabase `leads` table (raw Google CSV columns).
 * Leads without a callable phone number are excluded from Business Finder.
 * Cold loads only pull the first page; more rows arrive as the user scrolls.
 */
(function (global) {
  const CACHE_KEY = "lpc_leads_cache_v15";
  /** Serve cached leads without a full table download for this long. */
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  /** After this age, do a cheap HEAD count check (not a full refetch) when opening Business Finder. */
  const CACHE_STALE_CHECK_MS = 30 * 60 * 1000;
  const REALTIME_REFRESH_DEBOUNCE_MS = 4 * 1000;
  /** Only while Business Finder page is open and realtime is down. */
  const FALLBACK_POLL_MS = 15 * 60 * 1000;
  /** Lightweight HEAD count while Business Finder page is open. */
  const COUNT_POLL_MS = 10 * 60 * 1000;
  const REALTIME_RETRY_MS = 60 * 1000;
  const SUPABASE_WAIT_MS = 8000;
  /** Rows fetched per scroll page (raw table rows before phone filter). Keep small for Safari/mobile. */
  const UI_PAGE_SIZE = 60;
  /** Legacy parallel full-table page size (force-refresh / tools only). */
  const PAGE_SIZE = 500;
  /** Parallel page downloads after the first page (keep low to avoid saturating mobile Safari). */
  const FETCH_CONCURRENCY = 2;
  const PARSE_YIELD_EVERY = 80;

  /**
   * Columns required by LeadCsvFormat + Business Finder cards.
   * Omit profile image URLs (avatars use initials) and unused Maps UI label columns.
   */
  const LEAD_SELECT =
    "id,search_query,collected_at,full_hours,business_status,price_range,has_website,maps_url,business_name,rating,review_count,category,address,city_state_zip,hours,detail_extra_1,detail_extra_2,phone,website_url,website_label,directions_label,review_quote,category_group,image_url";

  const LEAD_COUNT_SELECT = "id,phone";

  function cfg() {
    const c = global.SITE_CONFIG || {};
    return {
      url: String(c.supabaseUrl || "").trim(),
      key: String(c.supabaseAnonKey || "").trim(),
      useDatabase: c.useSupabaseLeads !== false,
    };
  }

  function isDatabaseRequired() {
    const { url, key, useDatabase } = cfg();
    return useDatabase && !!(url && key);
  }

  function isLeadsExperienceActive() {
    if (global.LeadsPage?.isActive?.()) return true;
    try {
      return /\/leads\.html$/i.test(String(global.location?.pathname || ""));
    } catch (e) {
      return false;
    }
  }

  function hasCallablePhone(lead) {
    if (global.LeadDisplay?.hasCallablePhone) {
      return global.LeadDisplay.hasCallablePhone(lead);
    }
    const digits = String(lead?.phone || "").replace(/\D/g, "");
    return digits.length >= 10;
  }

  function rawRowToLead(row) {
    if (global.LeadCsvFormat?.parseRow) {
      return global.LeadCsvFormat.parseRow(row);
    }
    const mapsUrl = String(row["hfpxzc href"] || row.maps_url || row.mapsUrl || "").trim();
    const name = String(row["qBF1Pd"] || row.business_name || row.name || "").trim();
    const lcr4fd = String(row["lcr4fd href"] || row.website_url || row.website || "").trim();
    const booking = String(row.booking_url || row.bookingUrl || "").trim();
    const website =
      (global.LeadCsvFormat?.resolveWebsiteUrl
        ? global.LeadCsvFormat.resolveWebsiteUrl(row)
        : "") ||
      lcr4fd ||
      booking;
    return {
      id: row.id,
      name,
      category: String(row["R8c4Qb 2"] || row.category_group || row.category || "").trim(),
      categoryGroup: String(row["R8c4Qb 2"] || row.category_group || row.categoryGroup || "").trim(),
      phone: String(row["UsdlK"] || row.phone || "").trim(),
      address: String(row["W4Efsd 2"] || row.address || "").trim(),
      mapsUrl,
      website,
      hours: String(row["W4Efsd 3"] || row.hours || row.city_state_zip || "").trim(),
      hasWebsite: row.has_website === true || website !== "",
      rating: null,
      reviewCount: null,
      formatValid: false,
      formatError: "Format error",
      dedupeKey: row.id || "",
      sources: [],
      importedAt: String(row.imported_at || "").trim(),
      firstSeenAt: String(row.first_seen_at || "").trim(),
      collectedAt: String(row.collected_at || "").trim(),
    };
  }

  function finalizeLead(lead) {
    if (global.LeadDisplay?.sanitizeLeadFields) {
      return global.LeadDisplay.sanitizeLeadFields(lead);
    }
    return lead;
  }

  function filterBrowsableLeads(leads) {
    return (leads || []).filter((lead) => {
      if (hasCallablePhone(lead)) return true;
      const name = String(lead?.name || "").trim();
      const maps = String(lead?.mapsUrl || "").trim();
      return !!(name && maps);
    });
  }

  function applyProspectPool(leads) {
    return filterBrowsableLeads(leads);
  }

  function buildMeta(leads, dbRowCount, pageInfo) {
    const validLeads = leads.filter((l) => l.formatValid !== false);
    const categories = [
      ...new Set(validLeads.map((l) => l.categoryGroup || l.category || "Other")),
    ].sort();
    const info = pageInfo && typeof pageInfo === "object" ? pageInfo : {};
    const knownTotal = Number(dbRowCount) || leads.length;
    const nextOffset = Number(info.nextOffset);
    const loadedRows = Number(info.loadedRows);
    const hasMore =
      typeof info.hasMore === "boolean"
        ? info.hasMore
        : Number.isFinite(nextOffset) && nextOffset < knownTotal;
    return {
      source: "supabase",
      total: leads.length,
      valid: validLeads.length,
      invalid: leads.length - validLeads.length,
      noWebsite: leads.filter((l) => !l.hasWebsite).length,
      withWebsite: leads.filter((l) => l.hasWebsite).length,
      withPhone: leads.filter((l) => hasCallablePhone(l)).length,
      dbRowCount: knownTotal,
      hasMore,
      nextOffset: Number.isFinite(nextOffset) ? nextOffset : leads.length,
      loadedRows: Number.isFinite(loadedRows) ? loadedRows : leads.length,
      categories,
    };
  }

  function normalizeJsonLead(lead) {
    const row = { ...lead };
    if (!global.LeadCsvFormat?.parseRow) {
      return {
        ...lead,
        formatValid: false,
        formatError: "Format error",
      };
    }
    const parsed = global.LeadCsvFormat.parseRow(row);
    if (parsed.formatValid) return parsed;
    return {
      ...parsed,
      id: lead.id || parsed.id,
      dedupeKey: lead.dedupeKey || parsed.dedupeKey,
      sources: lead.sources || parsed.sources,
      formatValid: false,
      formatError: "Format error",
    };
  }

  function cacheAgeMs(cached) {
    if (!cached?.cachedAt) return Number.POSITIVE_INFINITY;
    return Math.max(0, Date.now() - Number(cached.cachedAt || 0));
  }

  function readCache() {
    try {
      let raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) {
        try {
          raw =
            sessionStorage.getItem("lpc_leads_cache_v14") ||
            sessionStorage.getItem("lpc_leads_cache_v12") ||
            localStorage.getItem(CACHE_KEY) ||
            localStorage.getItem("lpc_leads_cache_v14") ||
            localStorage.getItem("lpc_leads_cache_v12");
          if (raw) sessionStorage.setItem(CACHE_KEY, raw);
        } catch (_) {
          /* ignore */
        }
      }
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!Array.isArray(o?.leads) || !o.leads.length) return null;
      const age = Date.now() - Number(o.cachedAt || 0);
      return {
        meta: o.meta || {},
        leads: o.leads,
        cachedAt: Number(o.cachedAt || 0),
        fresh: age >= 0 && age < CACHE_TTL_MS,
        needsStaleCheck: age >= CACHE_STALE_CHECK_MS,
      };
    } catch (e) {
      return null;
    }
  }

  function slimLeadForCache(lead) {
    if (!lead || typeof lead !== "object") return lead;
    const slim = { ...lead };
    delete slim.profileImage;
    delete slim.fullHours;
    delete slim.full_hours;
    delete slim.amenities;
    delete slim.description;
    delete slim.reviewQuote;
    return slim;
  }

  function writeCache(payload) {
    const leads = Array.isArray(payload.leads)
      ? payload.leads.map(slimLeadForCache)
      : [];
    const packed = JSON.stringify({
      meta: payload.meta || {},
      leads,
      cachedAt: Date.now(),
    });
    try {
      sessionStorage.setItem(CACHE_KEY, packed);
    } catch (e) {
      /* ignore quota */
    }
    try {
      localStorage.setItem(CACHE_KEY, packed);
    } catch (e) {
      /* quota — sessionStorage copy is enough for same-tab navigation */
    }
  }

  function touchCacheTimestamp() {
    const cached = readCache();
    if (!cached?.leads?.length) return;
    writeCache({ meta: cached.meta, leads: cached.leads });
  }

  function peekCache() {
    return readCache();
  }

  function clearCache() {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (e) {
      /* ignore */
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      /* ignore */
    }
    try {
      ["v14", "v13", "v12", "v11", "v10"].forEach((v) => {
        sessionStorage.removeItem("lpc_leads_cache_" + v);
        localStorage.removeItem("lpc_leads_cache_" + v);
      });
    } catch (e) {
      /* ignore */
    }
  }

  function dispatchNavCount(count) {
    if (!Number.isFinite(count)) return;
    try {
      global.dispatchEvent(new CustomEvent("lead-finder-count-changed", { detail: { count } }));
    } catch (e) {
      /* ignore */
    }
  }

  function countNavLeads(leads) {
    return (leads || []).filter((lead) => {
      if (global.LeadCsvFormat?.isValidLead) return global.LeadCsvFormat.isValidLead(lead);
      return lead?.formatValid !== false;
    }).length;
  }

  async function loadFromJson() {
    const res = await fetch("data/leads.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load leads.json");
    const data = await res.json();
    const leads = applyProspectPool(
      (data.leads || [])
        .map((l) => {
          const lead = normalizeJsonLead(l);
          delete lead.called;
          return finalizeLead(lead);
        })
    );
    const meta = {
      ...(data.meta || {}),
      source: "json",
      total: leads.length,
      noWebsite: leads.length,
      valid: leads.filter((l) => l.formatValid !== false).length,
      invalid: leads.filter((l) => l.formatValid === false).length,
      withPhone: leads.length,
    };
    writeCache({ meta, leads });
    return { meta, leads };
  }

  async function fetchLeadRowCount(client) {
    const { count, error } = await client
      .from("leads")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return Number(count) || 0;
  }

  async function fetchLeadPage(client, from, to, select, withCount) {
    const columns = select || LEAD_SELECT;
    const query = client
      .from("leads")
      .select(columns, withCount ? { count: "exact" } : undefined)
      .order("id", { ascending: true })
      .range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    return {
      rows: data || [],
      count: count == null ? null : Number(count),
    };
  }

  async function fetchLeadRows(client, select, options) {
    const opts = options && typeof options === "object" ? options : {};
    const onBatch = typeof opts.onBatch === "function" ? opts.onBatch : null;
    const pageSize = PAGE_SIZE;
    const columns = select || LEAD_SELECT;

    // First page + exact count in one round-trip (no separate HEAD).
    const first = await client
      .from("leads")
      .select(columns, { count: "exact" })
      .order("id", { ascending: true })
      .range(0, pageSize - 1);

    if (first.error) throw first.error;
    const firstRows = first.data || [];
    const counted = Number(first.count);
    const hasExactCount = Number.isFinite(counted) && counted >= 0;

    // If PostgREST did not return an exact count, fall back to sequential paging.
    if (!hasExactCount) {
      const rows = firstRows.slice();
      if (onBatch && firstRows.length) {
        onBatch({
          pageIndex: 0,
          pageCount: 0,
          rows: firstRows,
          dbRowCount: firstRows.length,
          partial: true,
        });
      }
      let from = pageSize;
      for (;;) {
        if (!firstRows.length || firstRows.length < pageSize) break;
        const { data, error } = await client
          .from("leads")
          .select(columns)
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data?.length) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return { rows, dbRowCount: rows.length };
    }

    const knownTotal = counted;
    const pageCount = Math.max(1, Math.ceil(knownTotal / pageSize) || 1);
    const pages = new Array(pageCount);
    pages[0] = firstRows;

    if (onBatch) {
      onBatch({
        pageIndex: 0,
        pageCount,
        rows: firstRows,
        dbRowCount: knownTotal,
        partial: pageCount > 1,
      });
    }

    if (pageCount > 1) {
      let next = 1;
      const workers = Array.from(
        { length: Math.min(FETCH_CONCURRENCY, pageCount - 1) },
        async () => {
          while (next < pageCount) {
            const pageIndex = next++;
            const from = pageIndex * pageSize;
            const { data, error } = await client
              .from("leads")
              .select(columns)
              .order("id", { ascending: true })
              .range(from, from + pageSize - 1);
            if (error) throw error;
            pages[pageIndex] = data || [];
            if (onBatch) {
              onBatch({
                pageIndex,
                pageCount,
                rows: pages[pageIndex],
                dbRowCount: knownTotal,
                partial: true,
              });
            }
          }
        }
      );
      await Promise.all(workers);
    }

    const rows = [];
    for (let i = 0; i < pages.length; i++) {
      if (pages[i]?.length) rows.push(...pages[i]);
    }
    return { rows, dbRowCount: knownTotal };
  }

  function yieldToUi() {
    return new Promise((resolve) => {
      if (typeof global.requestAnimationFrame === "function") {
        global.requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async function rowsToLeads(rows, options) {
    const opts = options && typeof options === "object" ? options : {};
    const onPartial = typeof opts.onPartial === "function" ? opts.onPartial : null;
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(finalizeLead(rawRowToLead(rows[i])));
      if ((i + 1) % PARSE_YIELD_EVERY === 0) {
        if (onPartial) {
          onPartial(applyProspectPool(out.slice()), { partial: true });
        }
        await yieldToUi();
      }
    }
    const leads = applyProspectPool(out).sort((a, b) => {
      const g = (a.categoryGroup || "").localeCompare(b.categoryGroup || "");
      if (g) return g;
      return (a.name || "").localeCompare(b.name || "");
    });
    return leads;
  }

  async function fetchBrowsableLeadCount(client) {
    const { rows } = await fetchLeadRows(client, LEAD_COUNT_SELECT);
    return rows.filter((row) => {
      if (global.LeadCsvFormat?.isValidLead && global.LeadCsvFormat?.parseRow) {
        return global.LeadCsvFormat.isValidLead(global.LeadCsvFormat.parseRow(row));
      }
      return hasCallablePhone({ phone: row.phone || row.UsdlK });
    }).length;
  }

  function getProjectInfo() {
    const { url, useDatabase } = cfg();
    let host = "";
    try {
      host = new URL(url).host;
    } catch (e) {
      host = url;
    }
    return {
      projectUrl: url,
      projectHost: host,
      table: "public.leads",
      useDatabase,
    };
  }

  async function verifySupabaseConnection() {
    const info = getProjectInfo();
    if (!isDatabaseRequired()) {
      return {
        ok: false,
        connected: false,
        reason: info.useDatabase ? "missing_supabase_keys" : "supabase_disabled",
        ...info,
      };
    }

    const sb = await waitForSupabaseClient();
    if (!sb) {
      return {
        ok: false,
        connected: false,
        reason: "client_unavailable",
        error: "Supabase client could not start (check js/config.js and the supabase-js script)",
        ...info,
      };
    }

    try {
      const dbRowCount = await fetchLeadRowCount(sb);
      const callableInTable =
        dbRowCount > 0 ? await fetchBrowsableLeadCount(sb) : 0;
      return {
        ok: true,
        connected: true,
        ...info,
        dbRowCount,
        callableInTable,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      return {
        ok: false,
        connected: false,
        reason: "query_failed",
        error: String(e?.message || e),
        ...info,
      };
    }
  }

  async function loadFromSupabase(options) {
    const opts = options && typeof options === "object" ? options : {};
    const onPartial = typeof opts.onPartial === "function" ? opts.onPartial : null;
    const forceFull = !!opts.forceFull;
    const sb = global.SiteSupabase?.getClient?.() || null;
    if (!sb) {
      throw new Error(
        "Supabase not configured · add supabaseUrl and supabaseAnonKey in js/config.js"
      );
    }

    if (forceFull) {
      const fetched = await fetchLeadRows(sb, LEAD_SELECT, {});
      if (!fetched.rows.length) {
        throw new Error(
          "Leads table is empty · import google CSV into public.leads (Table Editor), then refresh"
        );
      }
      const leads = await rowsToLeads(fetched.rows);
      const payload = {
        meta: {
          ...buildMeta(leads, fetched.dbRowCount, {
            hasMore: false,
            nextOffset: fetched.dbRowCount,
            loadedRows: fetched.rows.length,
          }),
          ...getProjectInfo(),
        },
        leads,
      };
      writeCache(payload);
      dispatchNavCount(countNavLeads(leads));
      return payload;
    }

    const page = await fetchLeadPage(sb, 0, UI_PAGE_SIZE - 1, LEAD_SELECT, true);
    if (!page.rows.length) {
      throw new Error(
        "Leads table is empty · import google CSV into public.leads (Table Editor), then refresh"
      );
    }

    const dbRowCount = Number.isFinite(page.count) ? page.count : page.rows.length;
    const nextOffset = page.rows.length;
    const hasMore = page.rows.length >= UI_PAGE_SIZE && nextOffset < dbRowCount;

    let firstPaintDone = false;
    if (onPartial) {
      const early = applyProspectPool(page.rows.map((row) => finalizeLead(rawRowToLead(row))));
      if (early.length) {
        firstPaintDone = true;
        onPartial(
          {
            meta: {
              ...buildMeta(early, dbRowCount, {
                hasMore,
                nextOffset,
                loadedRows: page.rows.length,
              }),
              ...getProjectInfo(),
              loading: true,
            },
            leads: early,
            partial: true,
          },
          { partial: true }
        );
      }
    }

    const leads = await rowsToLeads(page.rows, {
      onPartial: firstPaintDone
        ? null
        : (partialLeads) => {
            onPartial?.(
              {
                meta: {
                  ...buildMeta(partialLeads, dbRowCount, {
                    hasMore,
                    nextOffset,
                    loadedRows: page.rows.length,
                  }),
                  ...getProjectInfo(),
                  loading: true,
                },
                leads: partialLeads,
                partial: true,
              },
              { partial: true }
            );
          },
    });

    const payload = {
      meta: {
        ...buildMeta(leads, dbRowCount, {
          hasMore,
          nextOffset,
          loadedRows: page.rows.length,
        }),
        ...getProjectInfo(),
      },
      leads,
    };
    writeCache(payload);
    dispatchNavCount(countNavLeads(leads));
    return payload;
  }

  let loadMorePromise = null;

  async function loadMore() {
    if (loadMorePromise) return loadMorePromise;
    loadMorePromise = (async () => {
      const cached = readCache();
      const existing = Array.isArray(cached?.leads) ? cached.leads : [];
      const dbRowCount = Number(cached?.meta?.dbRowCount) || 0;
      let nextOffset = Number(cached?.meta?.nextOffset);
      if (!Number.isFinite(nextOffset)) nextOffset = Number(cached?.meta?.loadedRows) || 0;
      const hasMoreFlag = cached?.meta?.hasMore === true;
      if (!hasMoreFlag || (dbRowCount > 0 && nextOffset >= dbRowCount)) {
        return {
          meta: {
            ...(cached?.meta || {}),
            hasMore: false,
            nextOffset,
          },
          leads: existing,
          appended: [],
          hasMore: false,
        };
      }

      if (!isDatabaseRequired()) {
        return { meta: cached?.meta || {}, leads: existing, appended: [], hasMore: false };
      }
      const sb = await waitForSupabaseClient();
      if (!sb) {
        throw new Error("Supabase client unavailable");
      }

      const to = nextOffset + UI_PAGE_SIZE - 1;
      const page = await fetchLeadPage(sb, nextOffset, to, LEAD_SELECT, false);
      const loadedRows = nextOffset + page.rows.length;
      const knownTotal = dbRowCount || loadedRows;
      const hasMore = page.rows.length >= UI_PAGE_SIZE && loadedRows < knownTotal;

      const fresh = applyProspectPool(page.rows.map((row) => finalizeLead(rawRowToLead(row))));
      const seen = new Set(existing.map((l) => String(l.id || l.dedupeKey || "")));
      const appended = fresh.filter((lead) => {
        const key = String(lead.id || lead.dedupeKey || "");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const leads = existing.concat(appended);
      const payload = {
        meta: {
          ...buildMeta(leads, knownTotal || leads.length, {
            hasMore,
            nextOffset: loadedRows,
            loadedRows,
          }),
          ...getProjectInfo(),
          ...(cached?.meta || {}),
          hasMore,
          nextOffset: loadedRows,
          loadedRows,
          total: leads.length,
          valid: leads.filter((l) => l.formatValid !== false).length,
          dbRowCount: knownTotal || leads.length,
        },
        leads,
      };
      writeCache(payload);
      dispatchNavCount(countNavLeads(leads));
      try {
        global.dispatchEvent(
          new CustomEvent("leads-page-appended", {
            detail: { appended, meta: payload.meta, leads },
          })
        );
      } catch (e) {
        /* ignore */
      }
      return {
        meta: payload.meta,
        leads,
        appended,
        hasMore,
      };
    })().finally(() => {
      loadMorePromise = null;
    });
    return loadMorePromise;
  }

  function hasMoreCached() {
    const cached = readCache();
    return cached?.meta?.hasMore === true;
  }

  function getCachedDbRowCount() {
    const cached = readCache();
    const fromCache = Number(cached?.meta?.dbRowCount);
    if (Number.isFinite(fromCache) && fromCache > 0) return fromCache;
    if (Number.isFinite(lastKnownDbRowCount) && lastKnownDbRowCount > 0) return lastKnownDbRowCount;
    return 0;
  }

  function escapeIlikePattern(value) {
    return String(value || "")
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
  }

  function quoteFilterColumn(name) {
    const col = String(name || "").trim();
    if (!col) return "";
    return /[^a-z0-9_]/i.test(col) ? `"${col.replace(/"/g, "")}"` : col;
  }

  const SEARCH_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "in",
    "near",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "around",
    "within",
  ]);

  const CITY_MULTIWORD_PREFIX =
    /^(san|santa|los|las|el|la|new|north|south|east|west|fort|mount|mt|saint|st|lake|port|cape|grand|del|rio)\b/i;

  const NICHE_ALIASES = {
    barbershop: ["barber", "barbershop", "barbers"],
    barbers: ["barber", "barbershop"],
    barber: ["barber", "barbershop"],
    barbershops: ["barber", "barbershop", "barbers"],
    salon: ["salon", "hair salon", "beauty salon"],
    dentist: ["dental", "dentist"],
    dental: ["dental", "dentist"],
    gym: ["gym", "gyms", "fitness"],
    gyms: ["gym", "gyms", "fitness"],
    fitness: ["gym", "fitness", "workout"],
    yoga: ["yoga", "studio"],
    restaurant: ["restaurant", "restaurants"],
    restaurants: ["restaurant", "restaurants"],
    plumber: ["plumbing", "plumber"],
    plumbing: ["plumbing", "plumber"],
    hvac: ["hvac", "heating", "air conditioning"],
    daycare: ["daycare", "day care", "childcare", "child care"],
    childcare: ["childcare", "child care", "daycare"],
    pet: ["pet", "groomer", "grooming"],
    groomers: ["pet", "groomer", "grooming"],
    auto: ["auto", "mechanic", "repair"],
  };

  function cleanSearchText(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/[／|/]+/g, " ")
      .replace(/[^\w\s,#.+'-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizeSearchPart(part) {
    return String(part || "")
      .toLowerCase()
      .split(/[\s,]+/)
      .map((tok) => tok.replace(/^[^a-z0-9+]+|[^a-z0-9+]+$/gi, ""))
      .filter((tok) => tok.length >= 2 && !SEARCH_STOPWORDS.has(tok));
  }

  function expandNicheTokens(tokens) {
    const out = new Set();
    tokens.forEach((tok) => {
      out.add(tok);
      const aliases = NICHE_ALIASES[tok];
      if (aliases) aliases.forEach((alias) => tokenizeSearchPart(alias).forEach((t) => out.add(t)));
    });
    return [...out];
  }

  /**
   * Parse free-text Business Finder queries:
   * "barbershop, san marcos" | "barbershop in san marcos" | "barbershop san marcos"
   */
  function parseSearchQuery(raw) {
    const original = String(raw || "").trim();
    const text = cleanSearchText(original);
    if (!text) {
      return {
        raw: "",
        text: "",
        niche: "",
        location: "",
        nicheTokens: [],
        locationTokens: [],
        tokens: [],
        remoteTokens: [],
        label: "",
      };
    }

    let niche = "";
    let location = "";

    if (text.includes(",")) {
      const parts = text
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        niche = parts[0];
        location = parts.slice(1).join(" ");
      }
    }

    if (!location) {
      const locSplit = text.match(/^(.+?)\s+(?:in|near|around|at|within)\s+(.+)$/);
      if (locSplit) {
        niche = locSplit[1].trim();
        location = locSplit[2].trim();
      }
    }

    if (!location) {
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length >= 3) {
        const lastTwo = words.slice(-2);
        if (CITY_MULTIWORD_PREFIX.test(lastTwo[0])) {
          location = lastTwo.join(" ");
          niche = words.slice(0, -2).join(" ");
        }
      } else if (words.length === 2 && words[1].length >= 5) {
        // "barbershop sacramento" — not "beauty salon" / "tree service"
        const secondIsNicheWord =
          /^(shop|shops|salon|salons|service|services|center|centre|clinic|repair|care|store|studio|company|group|gym|cafe|bar|spa|llc|inc|ltd)$/i.test(
            words[1]
          );
        if (!secondIsNicheWord) {
          niche = words[0];
          location = words[1];
        }
      }
    }

    if (!niche && !location) {
      niche = text;
    }

    const nicheTokens = expandNicheTokens(tokenizeSearchPart(niche));
    const locationTokens = tokenizeSearchPart(location);
    const tokens = [...new Set([...nicheTokens, ...locationTokens])];
    // Remote: niche tokens (max 3) + whole location phrase as one token when present
    const remoteTokens = [];
    nicheTokens.slice(0, 3).forEach((t) => {
      if (!remoteTokens.includes(t)) remoteTokens.push(t);
    });
    if (location) {
      const locPhrase = location.trim();
      if (locPhrase.length >= 2 && !remoteTokens.includes(locPhrase)) {
        remoteTokens.push(locPhrase);
      }
    } else {
      tokens.slice(0, 4).forEach((t) => {
        if (!remoteTokens.includes(t)) remoteTokens.push(t);
      });
    }

    const labelParts = [];
    if (niche) labelParts.push(niche.replace(/\b\w/g, (c) => c.toUpperCase()));
    if (location) labelParts.push("in " + location.replace(/\b\w/g, (c) => c.toUpperCase()));

    return {
      raw: original,
      text,
      niche,
      location,
      nicheTokens,
      locationTokens,
      tokens,
      remoteTokens: remoteTokens.slice(0, 5),
      label: labelParts.join(" "),
    };
  }

  /**
   * Full-table search for Business Finder. Includes leads without phones so niche
   * lookups (e.g. "barber") are not empty when phones were never scraped.
   */
  async function searchRemote(queryText, options = {}) {
    const parsed = parseSearchQuery(queryText);
    const rawQuery = parsed.raw || String(queryText || "").trim();
    if (rawQuery.length < 2) {
      return { ok: true, query: rawQuery, leads: [], total: 0, parsed };
    }
    if (!isDatabaseRequired()) {
      return { ok: false, query: rawQuery, leads: [], total: 0, error: "database_disabled", parsed };
    }
    const sb = await waitForSupabaseClient();
    if (!sb) {
      return { ok: false, query: rawQuery, leads: [], total: 0, error: "client_unavailable", parsed };
    }

    const limit = Math.min(Math.max(Number(options.limit) || 250, 20), 400);
    // Only real public.leads columns — ghost Maps scrape keys break PostgREST filters.
    const fields = [
      "business_name",
      "category",
      "category_group",
      "address",
      "city_state_zip",
      "search_query",
      "phone",
      "hours",
      "description",
    ];

    function orAcrossFields(tokens) {
      const parts = [];
      tokens.forEach((token) => {
        const cleaned = String(token || "").trim();
        if (cleaned.length < 2) return;
        const pattern = `%${escapeIlikePattern(cleaned)}%`;
        fields.forEach((field) => {
          parts.push(`${quoteFilterColumn(field)}.ilike.${pattern}`);
        });
      });
      return parts.join(",");
    }

    const nicheTokens = (
      parsed.nicheTokens.length
        ? parsed.nicheTokens
        : parsed.tokens.length
          ? parsed.tokens
          : [parsed.text || rawQuery.toLowerCase()]
    ).slice(0, 4);

    const locationTokens = [];
    if (parsed.location) {
      locationTokens.push(parsed.location.trim());
      parsed.locationTokens.slice(0, 2).forEach((t) => {
        if (!locationTokens.includes(t)) locationTokens.push(t);
      });
    }

    let query = sb.from("leads").select(LEAD_SELECT);

    // (any niche token) AND (any location token) when both present
    const nicheOr = orAcrossFields(nicheTokens);
    if (nicheOr) query = query.or(nicheOr);

    const locationOr = orAcrossFields(locationTokens);
    if (locationOr) query = query.or(locationOr);

    const websiteFilter = String(options.websiteFilter || "all").toLowerCase();
    if (websiteFilter === "with") {
      query = query.eq("has_website", true);
    } else if (websiteFilter === "without") {
      query = query.or("has_website.eq.false,has_website.is.null");
    }

    const { data, error } = await query.order("id", { ascending: true }).limit(limit);
    if (error) {
      return {
        ok: false,
        query: rawQuery,
        leads: [],
        total: 0,
        error: String(error.message || error),
        parsed,
      };
    }

    const leads = (data || [])
      .map((row) => finalizeLead(rawRowToLead(row)))
      .filter((lead) => lead && (lead.formatValid !== false || lead.name || lead.mapsUrl))
      .filter((lead) => {
        if (websiteFilter === "with") return !!lead.hasWebsite;
        if (websiteFilter === "without") return !lead.hasWebsite;
        return true;
      });

    return {
      ok: true,
      query: rawQuery,
      leads,
      total: leads.length,
      truncated: (data || []).length >= limit,
      parsed,
    };
  }

  let refreshPromise = null;
  let staleCheckPromise = null;
  let realtimeChannel = null;
  let realtimeSubscribed = false;
  let realtimeRefreshTimer = null;
  let fallbackPollTimer = null;
  let countPollTimer = null;
  let realtimeRetryTimer = null;
  let lastKnownDbRowCount = null;
  let syncHooksBound = false;
  let watchActive = false;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForSupabaseClient() {
    const started = Date.now();
    while (Date.now() - started < SUPABASE_WAIT_MS) {
      if (global.SiteSupabase?.canUse?.()) {
        const client = global.SiteSupabase.getClient();
        if (client) return client;
      }
      await wait(120);
    }
    return global.SiteSupabase?.getClient?.() || null;
  }

  function queueRealtimeRefresh() {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
      // Full lead downloads only while Business Finder is open.
      if (!isLeadsExperienceActive()) return;
      scheduleStaleCheck({ forceFullOnMismatch: true, preferFull: true });
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }

  function stopFallbackPoll() {
    if (!fallbackPollTimer) return;
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }

  function startFallbackPoll() {
    if (fallbackPollTimer || !isDatabaseRequired()) return;
    if (!isLeadsExperienceActive()) return;
    fallbackPollTimer = setInterval(() => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      if (!isLeadsExperienceActive()) {
        stopFallbackPoll();
        return;
      }
      const cached = readCache();
      if (cached?.fresh && !cached.needsStaleCheck) return;
      scheduleStaleCheck();
    }, FALLBACK_POLL_MS);
  }

  function stopCountPoll() {
    if (!countPollTimer) return;
    clearInterval(countPollTimer);
    countPollTimer = null;
  }

  async function refreshNavLeadCount() {
    if (!isDatabaseRequired()) return null;
    const cached = readCache();
    if (cached?.meta?.valid != null && cacheAgeMs(cached) < CACHE_TTL_MS) {
      const count = Number(cached.meta.valid);
      if (Number.isFinite(count)) {
        dispatchNavCount(count);
        return count;
      }
    }
    // Prefer previously cached nav count — never download the full leads list just for a badge.
    return null;
  }

  /**
   * Cheap HEAD count vs cache. Full table download only when the row count changed
   * (or when realtime forces a refresh on the Business Finder page).
   */
  function scheduleStaleCheck(options) {
    const opts = options && typeof options === "object" ? options : {};
    if (staleCheckPromise) return staleCheckPromise;
    if (refreshPromise) return refreshPromise;

    staleCheckPromise = (async () => {
      try {
        if (!isDatabaseRequired()) return null;
        const cached = readCache();
        if (!cached?.leads?.length) {
          return scheduleBackgroundRefresh();
        }
        if (opts.preferFull && isLeadsExperienceActive()) {
          clearCache();
          return scheduleBackgroundRefresh();
        }
        const sb = await waitForSupabaseClient();
        if (!sb) return null;
        const count = await fetchLeadRowCount(sb);
        const cachedCount = Number(cached.meta?.dbRowCount);
        lastKnownDbRowCount = count;
        if (Number.isFinite(cachedCount) && count === cachedCount) {
          touchCacheTimestamp();
          dispatchNavCount(Number(cached.meta?.valid) || countNavLeads(cached.leads));
          return cached;
        }
        if (opts.forceFullOnMismatch !== false) {
          clearCache();
          return scheduleBackgroundRefresh();
        }
        return cached;
      } catch (e) {
        console.warn("Business Finder stale check failed", e);
        return null;
      } finally {
        staleCheckPromise = null;
      }
    })();
    return staleCheckPromise;
  }

  async function pollLeadCount() {
    if (!isDatabaseRequired()) return;
    if (!isLeadsExperienceActive()) {
      stopCountPoll();
      return;
    }
    if (document.visibilityState && document.visibilityState !== "visible") return;
    try {
      const sb = await waitForSupabaseClient();
      if (!sb) return;
      const count = await fetchLeadRowCount(sb);
      const cached = readCache();
      const cachedCount = Number(cached?.meta?.dbRowCount);
      if (lastKnownDbRowCount == null) {
        lastKnownDbRowCount = Number.isFinite(cachedCount) ? cachedCount : count;
      }
      if (count !== lastKnownDbRowCount) {
        lastKnownDbRowCount = count;
        if (isLeadsExperienceActive()) {
          clearCache();
          scheduleBackgroundRefresh();
        }
      } else if (cached?.leads?.length) {
        touchCacheTimestamp();
      }
    } catch (e) {
      console.warn("Business Finder count poll failed", e);
    }
  }

  function startCountPoll() {
    if (countPollTimer || !isDatabaseRequired()) return;
    if (!isLeadsExperienceActive()) return;
    pollLeadCount().catch(() => null);
    countPollTimer = setInterval(() => {
      pollLeadCount().catch(() => null);
    }, COUNT_POLL_MS);
  }

  function unsubscribeLeadsRealtime() {
    const sb = global.SiteSupabase?.getClient?.() || null;
    if (realtimeChannel && sb?.removeChannel) {
      sb.removeChannel(realtimeChannel).catch(() => null);
    }
    realtimeChannel = null;
    realtimeSubscribed = false;
  }

  function scheduleRealtimeRetry() {
    if (realtimeRetryTimer || !isDatabaseRequired()) return;
    if (!isLeadsExperienceActive()) return;
    realtimeRetryTimer = setTimeout(() => {
      realtimeRetryTimer = null;
      if (isLeadsExperienceActive()) {
        subscribeLeadsRealtime().catch(() => null);
      }
    }, REALTIME_RETRY_MS);
  }

  async function subscribeLeadsRealtime() {
    if (!isDatabaseRequired()) return;
    // Realtime egress only while Business Finder is the active page.
    if (!isLeadsExperienceActive()) {
      unsubscribeLeadsRealtime();
      stopFallbackPoll();
      stopCountPoll();
      return;
    }
    if (realtimeSubscribed) return;

    const sb = await waitForSupabaseClient();
    if (!sb?.channel) {
      startFallbackPoll();
      startCountPoll();
      scheduleRealtimeRetry();
      return;
    }

    unsubscribeLeadsRealtime();

    const channelName = "lead-finder-leads-" + Math.random().toString(36).slice(2, 10);
    realtimeChannel = sb
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          queueRealtimeRefresh();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          realtimeSubscribed = true;
          stopFallbackPoll();
          startCountPoll();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Business Finder realtime channel:", status, err || "");
          realtimeSubscribed = false;
          unsubscribeLeadsRealtime();
          if (isLeadsExperienceActive()) {
            startFallbackPoll();
            startCountPoll();
            scheduleRealtimeRetry();
          }
        }
      });
  }

  function bindSyncHooks() {
    if (syncHooksBound) return;
    syncHooksBound = true;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (!isDatabaseRequired() || !isLeadsExperienceActive()) return;
      scheduleStaleCheck();
      if (!realtimeSubscribed) {
        subscribeLeadsRealtime().catch(() => null);
      }
    });

    window.addEventListener("pageshow", (e) => {
      if (!e.persisted || !isDatabaseRequired() || !isLeadsExperienceActive()) return;
      scheduleStaleCheck();
      if (!realtimeSubscribed) {
        subscribeLeadsRealtime().catch(() => null);
      }
    });
  }

  async function loadFromSource(options) {
    if (isDatabaseRequired()) {
      return loadFromSupabase(options);
    }
    const { useDatabase } = cfg();
    if (useDatabase) {
      throw new Error(
        "Leads are set to load from the database but Supabase keys are missing in js/config.js"
      );
    }
    return loadFromJson();
  }

  function scheduleBackgroundRefresh(options) {
    if (refreshPromise) return refreshPromise;
    refreshPromise = loadFromSource(options)
      .then((payload) => {
        lastKnownDbRowCount = Number(payload?.meta?.dbRowCount) || payload?.leads?.length || 0;
        try {
          global.dispatchEvent(new CustomEvent("leads-cache-refreshed", { detail: payload }));
        } catch (e) {
          /* ignore */
        }
        return payload;
      })
      .catch((e) => console.warn("Lead cache refresh failed", e))
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  async function load(opts) {
    const options = opts && typeof opts === "object" ? opts : {};
    const onLeadsPage = !!options.watch || isLeadsExperienceActive();
    watchActive = onLeadsPage;

    if (onLeadsPage) {
      bindSyncHooks();
      subscribeLeadsRealtime().catch(() => null);
      startCountPoll();
    }

    const cached = readCache();
    if (cached?.leads?.length && !options.force) {
      if (isDatabaseRequired()) {
        lastKnownDbRowCount = Number(cached.meta?.dbRowCount) || cached.leads.length;
        dispatchNavCount(Number(cached.meta?.valid) || countNavLeads(cached.leads));
        // Revisits: serve cache immediately. Only cheap-check / refetch when aged or forced.
        if (onLeadsPage && cached.needsStaleCheck) {
          scheduleStaleCheck();
        }
      }
      return {
        meta: cached.meta,
        leads: cached.leads,
        fromCache: true,
        stale: !cached.fresh,
      };
    }

    const payload = await loadFromSource({
      onPartial: typeof options.onPartial === "function" ? options.onPartial : null,
      forceFull: !!options.forceFull,
    });
    lastKnownDbRowCount = Number(payload?.meta?.dbRowCount) || payload?.leads?.length || 0;
    return payload;
  }

  function refreshFromSource() {
    watchActive = true;
    clearCache();
    return scheduleBackgroundRefresh();
  }

  /** Nav badge only — do not open realtime/pollers from every channel. */
  function ensureNavWatch() {
    if (!isDatabaseRequired()) return;
    const cached = readCache();
    if (cached?.meta?.valid != null) {
      dispatchNavCount(Number(cached.meta.valid));
    }
  }

  global.LeadsLoader = {
    load,
    loadMore,
    hasMoreCached,
    getCachedDbRowCount,
    searchRemote,
    parseSearchQuery,
    loadFromJson,
    loadFromSupabase,
    refresh: refreshFromSource,
    checkForUpdates: scheduleStaleCheck,
    refreshNavLeadCount,
    fetchBrowsableLeadCount,
    verifySupabaseConnection,
    getProjectInfo,
    isDatabaseRequired,
    isLeadsExperienceActive,
    peekCache,
    clearCache,
    hasCallablePhone,
    applyProspectPool,
    countNavLeads,
    ensureNavWatch,
    UI_PAGE_SIZE,
  };
})(window);
