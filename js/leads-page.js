(function (global) {
  let allLeads = [];
  let meta = {};
  let statusMap = {};
  let visible = [];
  /** Remote search hits (may include no-phone leads excluded from the browse pool). */
  let searchRemoteLeads = [];
  let searchRemoteQuery = "";
  let searchRemoteInFlight = 0;
  /** @type {'default' | 'saved'} */
  let listView = "default";

  const WORKFLOW_VIEWS = [
    { value: "default", label: "Available" },
    { value: "saved", label: "Quick Save" },
  ];
  const INITIAL_RENDER_LIMIT = 24;
  const RENDER_INCREMENT = 24;
  /** Max remote DB pages to pull in one scroll tick when filters sparse-match. */
  const REMOTE_FETCH_GUARD = 4;
  let remoteLoading = false;
  const PREFS_KEY = "lpc_lead_finder_prefs_v1";
  const SAVED_KEY = "lpc_lead_saved_v1";
  let savedIds = new Set();
  const DEFAULT_PREFS = {
    websiteFilter: "all",
    listView: "default",
    priorityCategories: [],
    reviewsFilter: "all",
    hoursFilter: "all",
    ratingFilter: "all",
    businessStatusFilter: "all",
  };
  const WEBSITE_FILTERS = ["web", "noweb", "all"];
  const REVIEWS_FILTERS = ["all", "none", "1", "2", "3", "4", "5", "10plus", "25plus"];
  const HOURS_FILTERS = ["all", "open", "closed", "24h", "unknown"];
  const RATING_FILTERS = ["all", "3", "3.5", "4", "4.5"];
  const BUSINESS_STATUS_FILTERS = ["all", "operating", "permanently-closed", "temporarily-closed"];
  const ADVANCED_FILTER_KEYS = [
    "reviewsFilter",
    "hoursFilter",
    "ratingFilter",
    "businessStatusFilter",
  ];
  /**
   * Website-sale fit scores (higher = more likely to need a lead-gen site).
   * Used by default Smart Mode to pin strong niches at the top of Available.
   */
  const SMART_PROSPECT_CATEGORY_SCORES = {
    Plumbing: 100,
    HVAC: 99,
    Roofing: 98,
    Electrical: 97,
    "Tree Service": 93,
    Moving: 90,
    Landscaping: 87,
    Flooring: 84,
    Painting: 83,
    Pool: 81,
    "Cleaning Services": 75,
    Security: 70,
    Construction: 68,
    "Home Repair": 66,
    Dental: 55,
    "Senior Care": 50,
    Childcare: 48,
    Auto: 42,
    Pets: 36,
    Tutoring: 32,
    Fitness: 20,
    Events: 24,
    "Real Estate": 18,
    "Finance & Legal": 16,
    Medical: 12,
    Beauty: 8,
    Food: 4,
    Tech: 2,
    Marketing: -20,
    Education: 10,
    Other: 0,
  };
  /** Finer niche hits from name/category/search text (beats basic category when higher). */
  const SMART_PROSPECT_TEXT_SCORES = [
    { score: 100, pattern: /plumb|\bdrain\b|sewer|septic|water heater/i },
    { score: 99, pattern: /hvac|heating|air condition|furnace|\bcooling\b/i },
    { score: 98, pattern: /\broof|gutter/i },
    { score: 97, pattern: /electric|electrician/i },
    { score: 96, pattern: /water damage|flood restor/i },
    { score: 95, pattern: /mold remed/i },
    { score: 94, pattern: /garage door/i },
    { score: 93, pattern: /tree\s*(service|care|remov)|arborist|stump/i },
    { score: 92, pattern: /junk removal|trash.?out|haul.?away/i },
    { score: 91, pattern: /pest control|exterminat|mosquito/i },
    { score: 89, pattern: /locksmith/i },
    { score: 88, pattern: /\btow(ing| truck)?\b/i },
    { score: 87, pattern: /landscap|\blawn\b|irrigation|sprinkler/i },
    { score: 85, pattern: /concrete|masonry|asphalt|paving/i },
    { score: 84, pattern: /\bfloor|carpet|\btile\b|hardwood/i },
    { score: 83, pattern: /\bpaint(er|ing)\b/i },
    { score: 82, pattern: /\bfence\b/i },
    { score: 81, pattern: /\bpool\b|hot tub/i },
    { score: 80, pattern: /pressure wash|power wash/i },
    { score: 77, pattern: /handyman/i },
    { score: 76, pattern: /dry\s*wall|siding|stucco/i },
    { score: 66, pattern: /kitchen remodel|bathroom remodel|cabinet/i },
    { score: 60, pattern: /moving|\bmover/i },
    { score: 58, pattern: /security system|\balarm\b|cctv/i },
    { score: 54, pattern: /house clean|maid service|janitor/i },
    { score: -30, pattern: /web design|web develop|marketing agency|\bseo\b/i },
    { score: -50, pattern: /fire station|police|city hall|government/i },
  ];
  /** Minimum score to float into the Smart Mode top band (below this stays in shuffled tail). */
  const SMART_PROSPECT_TOP_MIN = 60;
  // Ordered most-specific first: getBasicCategory() returns the FIRST match,
  // so narrow industries must appear before broad catch-alls.
  const BASIC_CATEGORY_GROUPS = [
    { label: "Childcare", pattern: /daycare|day care|child ?care|preschool|babysit|\bnanny\b/i },
    { label: "Tutoring", pattern: /tutor/i },
    { label: "Education", pattern: /teacher|test prep|learning center|driving school|music lesson|\bacademy\b|education|school/i },
    { label: "Dental", pattern: /dental|dentist|orthodont|endodont|periodont/i },
    { label: "Medical", pattern: /chiropr|doctor|physician|clinic|medical|urgent care|optometr|optician|physical therapy|med spa|dermatolog|pediatric|hospital|surgeon|podiat/i },
    { label: "Beauty", pattern: /salon|barber|\bnail\b|\bhair\b|beauty|\blash|\bbrow\b|makeup|esthetic|waxing|tanning|massage|\bspa\b/i },
    { label: "Pets", pattern: /\bpet\b|\bdog\b|\bcat\b|\bvet\b|veterin|groom|kennel|\banimal\b|aquarium/i },
    { label: "Fitness", pattern: /\bgym\b|fitness|yoga|pilates|crossfit|martial art|karate|taekwondo|\bjiu\b|dance studio|personal train|trainer|workout/i },
    { label: "Food", pattern: /restaurant|cafe|coffee|bakery|\bfood\b|pizza|\bbar\b|grill|\bdeli\b|diner|eatery|catering|caterer|brewery|juice|smoothie|taqueria/i },
    { label: "Auto", pattern: /\bauto\b|\bcar\b|truck|\btire\b|mechanic|detailing|body shop|collision|towing|\btow\b|windshield|oil change|transmission|\btint\b|smog|muffler|\bbrake|\bboat\b|\brv\b|motorcycle|bicycle|bike shop/i },
    { label: "Plumbing", pattern: /plumb|\bdrain\b|sewer|septic|water heater/i },
    { label: "Electrical", pattern: /electric|solar/i },
    { label: "HVAC", pattern: /hvac|heating|air condition|furnace|\bcooling\b/i },
    { label: "Roofing", pattern: /\broof|gutter/i },
    { label: "Tree Service", pattern: /tree\s*(service|care|remov)|arborist|stump/i },
    { label: "Landscaping", pattern: /landscap|\blawn\b|\bgarden|\birrigation|sprinkler|pest control|exterminat|mosquito|\bsod\b/i },
    { label: "Pool", pattern: /\bpool\b|hot tub/i },
    { label: "Painting", pattern: /paint/i },
    { label: "Cleaning Services", pattern: /clean|janitor|\bmaid\b|housekeep|pressure wash|power wash/i },
    { label: "Flooring", pattern: /\bfloor|carpet|\btile\b|hardwood|laminate/i },
    { label: "Tech", pattern: /computer|laptop|tech support|\bit services?\b|phone repair|cell phone|electronics|web design|web develop|software|app develop/i },
    { label: "Marketing", pattern: /marketing|advertis|\bseo\b|branding|graphic design|design agency|\bprint\b|sign shop|signage/i },
    { label: "Security", pattern: /security|\balarm\b|surveillance|\bcctv\b|locksmith/i },
    { label: "Moving", pattern: /moving|\bmover|relocation|storage|junk removal|hauling/i },
    { label: "Construction", pattern: /remodel|renovat|construct|contractor|\bbuilder|concrete|masonry|stucco|drywall|dry wall|\bdeck\b|\bfence|cabinet|kitchen|bathroom|countertop|excavat|demolition|paving|asphalt|siding|insulation|installer|installation|framing|foundation/i },
    { label: "Home Repair", pattern: /handyman|\brepair\b|restoration|water damage|\bmold\b|chimney|fireplace|garage door|appliance|inspector|inspection|\bfix\b/i },
    { label: "Real Estate", pattern: /real estate|realtor|\brealty\b|mortgage|\bbroker|property management|home stag|\bstager\b|interior design|architect/i },
    { label: "Finance & Legal", pattern: /insurance|\btax\b|account|bookkeep|attorney|lawyer|\blegal\b|\bnotary\b|financial|\bcpa\b|payroll/i },
    { label: "Events", pattern: /photograph|videograph|wedding|\bevent\b|\bvenue\b|party rental|equipment rental|\brental\b|florist|flower|\bdj\b/i },
    { label: "Senior Care", pattern: /senior|assisted living|home health|home care|caregiver|hospice|\belder/i },
  ];
  /** @type {Set<string>} */
  let priorityCategories = new Set();
  let reviewsFilter = "all";
  let hoursFilter = "all";
  let ratingFilter = "all";
  let businessStatusFilter = "all";
  /** @type {Record<string, string> | null} */
  let advancedFiltersDraft = null;
  /** Free-text search across name, category, address (city/state/ZIP), and phone. */
  let searchQuery = "";
  /** @type {string[]} */
  let searchTokens = [];
  /** @type {{ niche: string, location: string, nicheTokens: string[], locationTokens: string[], tokens: string[], label: string } | null} */
  let searchParsed = null;
  let searchSuggestActive = -1;
  let searchSuggestOpen = false;
  let searchSuggestTimer = null;
  /** @type {{ setWorkflow: (id: string, workflow: string, name?: string) => Promise<void> } | null} */
  let syncApi = null;
  let syncInitPromise = null;
  /** Ignore list-view toggle sync while applying saved prefs. */
  let viewSelectSyncing = false;
  let renderLimit = INITIAL_RENDER_LIMIT;
  let lastViewFilterSig = "";
  let lastCategoryChipSig = "";
  let filterApplyGen = 0;
  let filterApplyRaf = 0;
  let searchFilterTimer = null;
  let loadMoreObserver = null;
  let loadMoreScrollFallbackBound = false;
  let autoLoadQueued = false;

  const $ = (id) => document.getElementById(id);

  function syncListViewToggle() {
    const group = $("lf-list-view");
    if (!group) return;
    viewSelectSyncing = true;
    try {
      group.querySelectorAll(".lf-toggle-btn[data-list-view]").forEach((btn) => {
        const on = btn.dataset.listView === listView;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    } finally {
      viewSelectSyncing = false;
    }
  }

  function setListView(view, opts) {
    opts = opts || {};
    const v = WORKFLOW_VIEWS.some((w) => w.value === view) ? view : "default";
    listView = v;
    syncListViewToggle();
    if (opts.save) savePrefs();
    if (opts.filter === false) return;
    if (opts.defer) scheduleUiApplyFilters();
    else applyFilters();
  }

  function repScopedKey(base) {
    const id = global.RepSession?.get?.()?.id;
    return id ? "lpc_rep_" + id + "_" + base : base;
  }

  function pickPref(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function normalizePrefs(p) {
    return {
      websiteFilter: pickPref(p.websiteFilter, WEBSITE_FILTERS, DEFAULT_PREFS.websiteFilter),
      listView: (() => {
        const v = p.listView;
        if (v === "pending" || v === "complete" || v === "not-interested" || v === "removed") {
          return DEFAULT_PREFS.listView;
        }
        return WORKFLOW_VIEWS.some((w) => w.value === v) ? v : DEFAULT_PREFS.listView;
      })(),
      priorityCategories: Array.isArray(p.priorityCategories)
        ? p.priorityCategories.map((c) => String(c || "").trim()).filter(Boolean)
        : DEFAULT_PREFS.priorityCategories,
      reviewsFilter: pickPref(p.reviewsFilter, REVIEWS_FILTERS, DEFAULT_PREFS.reviewsFilter),
      hoursFilter: pickPref(p.hoursFilter, HOURS_FILTERS, DEFAULT_PREFS.hoursFilter),
      ratingFilter: pickPref(p.ratingFilter, RATING_FILTERS, DEFAULT_PREFS.ratingFilter),
      businessStatusFilter: pickPref(
        p.businessStatusFilter,
        BUSINESS_STATUS_FILTERS,
        DEFAULT_PREFS.businessStatusFilter
      ),
    };
  }

  function loadPrefs() {
    try {
      const raw = global.RepStorage?.loadItem
        ? global.RepStorage.loadItem(PREFS_KEY)
        : localStorage.getItem(repScopedKey(PREFS_KEY));
      if (!raw) return { ...DEFAULT_PREFS };
      return normalizePrefs(JSON.parse(raw));
    } catch (e) {
      return { ...DEFAULT_PREFS };
    }
  }

  function savePrefs() {
    const prefs = {
      websiteFilter: getWebsiteFilter(),
      // Always persist Available — Quick Save is a temporary browse mode, not a startup default.
      listView: DEFAULT_PREFS.listView,
      priorityCategories: Array.from(priorityCategories),
      ...getAdvancedFilters(),
    };
    const json = JSON.stringify(prefs);
    if (global.RepStorage?.saveItem) global.RepStorage.saveItem(PREFS_KEY, json);
    else localStorage.setItem(repScopedKey(PREFS_KEY), json);
  }

  function applyAdvancedFiltersFromPrefs(prefs) {
    reviewsFilter = prefs.reviewsFilter;
    hoursFilter = prefs.hoursFilter;
    ratingFilter = prefs.ratingFilter;
    businessStatusFilter = prefs.businessStatusFilter;
  }

  function applyPrefsToUi(opts) {
    opts = opts || {};
    const prefs = loadPrefs();
    // Startup resets to Available; later settings sync must not kick you off Quick Save mid-browse.
    if (!opts.preserveListView) {
      listView = DEFAULT_PREFS.listView;
    }
    priorityCategories = new Set(prefs.priorityCategories);
    applyAdvancedFiltersFromPrefs(prefs);
    document
      .querySelectorAll("#lf-website-filter .lf-toggle-btn[data-filter]")
      .forEach((b) => {
        const on = b.dataset.filter === prefs.websiteFilter;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    updateAdvancedFiltersBadge();
    syncListViewToggle();
  }

  function getLeadCategory(lead) {
    const d = display();
    if (d.resolveCategory) return d.resolveCategory(lead);
    return String(lead.categoryGroup || lead.category || "Other").trim() || "Other";
  }

  function getBasicCategory(lead) {
    if (lead && lead.__lfBasicCat) return lead.__lfBasicCat;
    const rawCategory = getLeadCategory(lead);
    const hay = [
      rawCategory,
      lead?.searchQuery,
      lead?.search_query,
      lead?.query,
      lead?.name,
      lead?.category,
      lead?.categoryGroup,
      lead?.titleLine,
    ]
      .map((v) => String(v || ""))
      .join(" ");
    const group = BASIC_CATEGORY_GROUPS.find(
      (item) => item.pattern.test(hay) || (rawCategory && item.pattern.test(rawCategory))
    );
    const label = group ? group.label : "Other";
    if (lead) lead.__lfBasicCat = label;
    return label;
  }

  function getWebsiteProspectScore(lead) {
    if (lead && typeof lead.__lfProspectScore === "number") return lead.__lfProspectScore;
    const basic = getBasicCategory(lead);
    let score = Number(SMART_PROSPECT_CATEGORY_SCORES[basic]) || 0;
    const hay = [
      lead?.category,
      lead?.categoryGroup,
      lead?.name,
      lead?.titleLine,
      lead?.search_query,
      lead?.query,
      lead?.searchQuery,
    ]
      .map((v) => String(v || ""))
      .join(" ");
    for (const item of SMART_PROSPECT_TEXT_SCORES) {
      if (item.pattern.test(hay) && item.score > score) score = item.score;
    }
    if (lead) lead.__lfProspectScore = score;
    return score;
  }

  /**
   * Default Smart Mode: best website-need niches (plumbing, HVAC, roofing, …) float to the top.
   * Within each band, original shuffle order is preserved so cards still feel randomized.
   */
  function applySmartProspectOrder(leads) {
    const indexed = (leads || []).map((lead, index) => ({
      lead,
      index,
      score: getWebsiteProspectScore(lead),
    }));
    const top = indexed
      .filter((row) => row.score >= SMART_PROSPECT_TOP_MIN)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const rest = indexed
      .filter((row) => row.score < SMART_PROSPECT_TOP_MIN)
      .sort((a, b) => a.index - b.index);
    return [...top, ...rest].map((row) => row.lead);
  }

  function getReviewCount(lead) {
    const n = Number(lead?.reviewCount);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }

  function leadSearchHaystack(lead) {
    return [
      lead.name,
      lead.category,
      lead.categoryGroup,
      lead.titleLine,
      lead.address,
      lead.phone,
      lead.hours,
      lead.searchQuery,
      lead.search_query,
      lead.query,
      lead["W4Efsd 2"],
      lead["W4Efsd 3"],
      lead["W4Efsd 5"],
    ]
      .map((v) => String(v || ""))
      .join(" ")
      .toLowerCase();
  }

  function leadLocationHaystack(lead) {
    return [lead.address, lead["W4Efsd 2"], lead["W4Efsd 3"], lead["W4Efsd 5"], lead.searchQuery, lead.search_query]
      .map((v) => String(v || ""))
      .join(" ")
      .toLowerCase();
  }

  function parseLeadSearch(value) {
    if (global.LeadsLoader?.parseSearchQuery) {
      return global.LeadsLoader.parseSearchQuery(value);
    }
    const text = String(value || "")
      .trim()
      .toLowerCase();
    const tokens = text ? text.split(/[\s,]+/).filter((t) => t.length >= 2) : [];
    return {
      raw: String(value || "").trim(),
      text,
      niche: text,
      location: "",
      nicheTokens: tokens,
      locationTokens: [],
      tokens,
      remoteTokens: tokens.slice(0, 4),
      label: text,
    };
  }

  function setSearchQuery(value) {
    const parsed = parseLeadSearch(value);
    const q = parsed.text || String(value || "").trim().toLowerCase();
    if (q === searchQuery && searchParsed?.location === parsed.location && searchParsed?.niche === parsed.niche) {
      return false;
    }
    searchQuery = q;
    searchParsed = parsed;
    searchTokens = parsed.tokens.length ? parsed.tokens : q ? q.split(/\s+/).filter(Boolean) : [];
    if (!searchQuery) {
      searchRemoteLeads = [];
      searchRemoteQuery = "";
      searchParsed = null;
      hideSearchSuggestions();
    }
    return true;
  }

  function tokenMatchesHay(hay, digits, tok) {
    if (hay.includes(tok)) return true;
    const tokDigits = tok.replace(/\D/g, "");
    return tokDigits.length >= 3 && digits.includes(tokDigits);
  }

  function matchesSearchQuery(lead) {
    if (!searchTokens.length) return true;
    const hay = leadSearchHaystack(lead);
    const digits = hay.replace(/\D/g, "");
    const parsed = searchParsed;

    if (parsed?.location && (parsed.nicheTokens.length || parsed.locationTokens.length)) {
      const locHay = leadLocationHaystack(lead);
      const nicheOk =
        !parsed.nicheTokens.length ||
        parsed.nicheTokens.some((tok) => tokenMatchesHay(hay, digits, tok));
      const locOk =
        (parsed.location && locHay.includes(parsed.location)) ||
        (parsed.locationTokens.length > 0 &&
          parsed.locationTokens.every((tok) => tokenMatchesHay(locHay, digits, tok)));
      if (nicheOk && locOk) return true;
      // Soft fallback: every significant token anywhere (handles odd address formats)
    }

    return searchTokens.every((tok) => tokenMatchesHay(hay, digits, tok));
  }

  function leadCityHint(lead) {
    const addr = String(lead.address || lead["W4Efsd 3"] || "").trim();
    if (!addr) return "";
    const m = addr.match(/([A-Za-z .'-]+),\s*[A-Z]{2}\b/);
    if (m) return m[1].trim();
    const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
    return "";
  }

  function buildSearchSuggestions(limit) {
    const max = Math.min(Math.max(Number(limit) || 8, 4), 12);
    const q = searchQuery;
    if (!q || q.length < 2) return [];

    const parsed = searchParsed || parseLeadSearch(q);
    const suggestions = [];
    if (parsed.niche && parsed.location && parsed.label) {
      suggestions.push({
        type: "parsed",
        label: parsed.label,
        query: parsed.niche + " in " + parsed.location,
        meta: "Niche + city",
      });
    }

    const pool = searchPoolLeads();
    const scored = [];
    const seen = new Set();
    for (let i = 0; i < pool.length; i++) {
      const lead = pool[i];
      if (!isLeadFormatValid(lead)) continue;
      const name = String(lead.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      if (!matchesSearchQuery(lead) && !key.includes(q) && !(parsed.niche && key.includes(parsed.niche))) {
        continue;
      }
      seen.add(key);
      const nameLow = key;
      let score = 0;
      if (nameLow.startsWith(q)) score += 80;
      else if (parsed.niche && nameLow.startsWith(parsed.niche)) score += 60;
      else if (nameLow.includes(q)) score += 40;
      else if (parsed.niche && nameLow.includes(parsed.niche)) score += 30;
      if (matchesSearchQuery(lead)) score += 20;
      const city = leadCityHint(lead);
      scored.push({
        type: "business",
        label: name,
        query: name,
        meta: city || String(lead.categoryGroup || lead.category || "").trim(),
        leadId: normalizeLeadId(lead.id),
        score,
      });
    }
    scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    for (const row of scored) {
      if (suggestions.length >= max) break;
      suggestions.push(row);
    }
    return suggestions;
  }

  function hideSearchSuggestions() {
    const list = $("lf-search-suggest");
    const wrap = document.querySelector(".lf-search-wrap");
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    if (wrap) wrap.setAttribute("aria-expanded", "false");
    searchSuggestOpen = false;
    searchSuggestActive = -1;
  }

  function renderSearchSuggestions() {
    const list = $("lf-search-suggest");
    const wrap = document.querySelector(".lf-search-wrap");
    const input = $("lf-search");
    if (!list || !input) return;
    if (document.activeElement !== input) {
      hideSearchSuggestions();
      return;
    }
    const rows = buildSearchSuggestions(8);
    if (!rows.length) {
      hideSearchSuggestions();
      return;
    }
    list.innerHTML = rows
      .map((row, idx) => {
        const active = idx === searchSuggestActive ? " is-active" : "";
        const meta = row.meta
          ? `<span class="lf-search-suggest-meta">${escapeHtml(row.meta)}</span>`
          : "";
        return (
          `<li class="lf-search-suggest-item${active}" role="option" id="lf-suggest-${idx}" data-suggest-idx="${idx}" data-suggest-query="${escapeHtml(row.query)}" aria-selected="${idx === searchSuggestActive ? "true" : "false"}">` +
          `<span class="lf-search-suggest-label">${escapeHtml(row.label)}</span>${meta}</li>`
        );
      })
      .join("");
    list.hidden = false;
    if (wrap) wrap.setAttribute("aria-expanded", "true");
    searchSuggestOpen = true;
    if (window.SiteIcons) window.SiteIcons.initIcons(list);
  }

  function applySearchSuggestion(query) {
    const input = $("lf-search");
    if (!input) return;
    input.value = query;
    hideSearchSuggestions();
    onSearchChangeFromUi(query);
    input.focus();
  }

  function onSearchChangeFromUi(value) {
    const changed = setSearchQuery(value);
    const clearBtn = $("lf-search-clear");
    if (clearBtn) clearBtn.hidden = !searchQuery;
    clearTimeout(searchSuggestTimer);
    searchSuggestTimer = setTimeout(() => {
      searchSuggestTimer = null;
      if (searchQuery) renderSearchSuggestions();
      else hideSearchSuggestions();
    }, 90);
    if (!changed) {
      if (searchQuery) renderSearchSuggestions();
      return;
    }
    clearTimeout(searchFilterTimer);
    searchFilterTimer = setTimeout(() => {
      searchFilterTimer = null;
      void (async () => {
        if (searchQuery) {
          await ensureRemoteSearchMatches();
        }
        scheduleUiApplyFilters();
        // Keep suggestions out of the way once results are on screen so cards stay clickable.
        hideSearchSuggestions();
      })();
    }, 180);
  }

  function searchPoolLeads() {
    if (!searchTokens.length) return allLeads;
    const seen = new Set();
    const out = [];
    for (const lead of allLeads.concat(searchRemoteLeads)) {
      const id = normalizeLeadId(lead?.id) || String(lead?.mapsUrl || lead?.dedupeKey || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(lead);
    }
    return out;
  }

  async function ensureRemoteSearchMatches() {
    const q = searchQuery;
    if (!q || q.length < 2) {
      searchRemoteLeads = [];
      searchRemoteQuery = "";
      return false;
    }
    if (!global.LeadsLoader?.searchRemote) return false;
    if (searchRemoteQuery === q) return false;

    const flight = ++searchRemoteInFlight;
    try {
      const result = await global.LeadsLoader.searchRemote(q, { limit: 250 });
      if (flight !== searchRemoteInFlight || searchQuery !== q) return false;
      searchRemoteQuery = q;
      searchRemoteLeads = Array.isArray(result?.leads) ? result.leads : [];
      return searchRemoteLeads.length > 0;
    } catch (error) {
      console.warn("Business Finder remote search failed", error);
      if (flight === searchRemoteInFlight) {
        searchRemoteLeads = [];
        searchRemoteQuery = q;
      }
      return false;
    }
  }

  function matchesReviewsFilter(lead, filter) {
    if (filter === "all") return true;
    const count = getReviewCount(lead);
    if (filter === "none") return count === 0;
    if (filter === "10plus") return count >= 10;
    if (filter === "25plus") return count >= 25;
    const n = parseInt(String(filter), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return count === n;
    return true;
  }

  function getLeadRating(lead) {
    const n = Number(lead?.rating);
    return Number.isFinite(n) ? n : 0;
  }

  function getLeadHoursStatus(lead) {
    const d = display();
    let hours = d.formatHours ? d.formatHours(lead) : lead.hours || "";
    hours = formatDisplayHours(hours);
    const summary = summarizeHoursStatus(lead, hours);
    if (summary.empty) return "unknown";
    if (summary.text === "Open 24h") return "24h";
    return summary.status === "closed" ? "closed" : "open";
  }

  function matchesHoursFilter(lead, filter) {
    if (filter === "all") return true;
    return getLeadHoursStatus(lead) === filter;
  }

  function matchesRatingFilter(lead, filter) {
    if (filter === "all") return true;
    return getLeadRating(lead) >= parseFloat(filter);
  }

  function matchesBusinessStatusFilter(lead, filter) {
    if (filter === "all") return true;
    const status = String(lead.businessStatus || "").toLowerCase().trim();
    if (filter === "permanently-closed") return /permanently\s*closed/.test(status);
    if (filter === "temporarily-closed") return /temporarily\s*closed/.test(status);
    if (filter === "operating") {
      return (
        !status ||
        (!/permanently\s*closed/.test(status) && !/temporarily\s*closed/.test(status))
      );
    }
    return true;
  }

  function getAdvancedFilters() {
    return {
      reviewsFilter: pickPref(reviewsFilter, REVIEWS_FILTERS, "all"),
      hoursFilter: pickPref(hoursFilter, HOURS_FILTERS, "all"),
      ratingFilter: pickPref(ratingFilter, RATING_FILTERS, "all"),
      businessStatusFilter: pickPref(businessStatusFilter, BUSINESS_STATUS_FILTERS, "all"),
    };
  }

  function matchesAdvancedFilters(lead, filters) {
    const f = filters || getAdvancedFilters();
    if (!matchesReviewsFilter(lead, f.reviewsFilter)) return false;
    if (!matchesHoursFilter(lead, f.hoursFilter)) return false;
    if (!matchesRatingFilter(lead, f.ratingFilter)) return false;
    if (!matchesBusinessStatusFilter(lead, f.businessStatusFilter)) return false;
    return true;
  }

  function countActiveAdvancedFilters(filters) {
    const f = filters || getAdvancedFilters();
    return ADVANCED_FILTER_KEYS.filter((key) => f[key] !== "all").length;
  }

  function advancedFiltersSummary(filters) {
    const f = filters || getAdvancedFilters();
    const parts = [];
    if (f.reviewsFilter !== "all") {
      if (f.reviewsFilter === "none") parts.push("No reviews");
      else if (f.reviewsFilter === "10plus") parts.push("10+ reviews");
      else if (f.reviewsFilter === "25plus") parts.push("25+ reviews");
      else parts.push(f.reviewsFilter + " review" + (f.reviewsFilter === "1" ? "" : "s"));
    }
    if (f.hoursFilter === "open") parts.push("Open now");
    else if (f.hoursFilter === "closed") parts.push("Closed now");
    else if (f.hoursFilter === "24h") parts.push("Open 24h");
    else if (f.hoursFilter === "unknown") parts.push("Hours unknown");
    if (f.ratingFilter !== "all") parts.push(f.ratingFilter + "+ rating");
    if (f.businessStatusFilter === "operating") parts.push("Operating");
    else if (f.businessStatusFilter === "temporarily-closed") parts.push("Temp. closed");
    else if (f.businessStatusFilter === "permanently-closed") parts.push("Perm. closed");
    return parts.join(" · ");
  }

  function updateAdvancedFiltersBadge() {
    const btn = $("lf-advanced-filters-btn");
    if (!btn) return;
    const active = countActiveAdvancedFilters();
    const summary = advancedFiltersSummary();
    if (active > 0) {
      btn.classList.add("lf-advanced-btn--active");
      btn.title = summary;
      btn.setAttribute("aria-label", "Advanced filters (" + active + " active): " + summary);
    } else {
      btn.classList.remove("lf-advanced-btn--active");
      btn.removeAttribute("title");
      btn.setAttribute("aria-label", "Advanced filters");
    }
  }

  function syncAdvancedModalUiFromDraft(opts) {
    const draft = advancedFiltersDraft;
    if (!draft) return;
    document.querySelectorAll("#lf-advanced-filters-dialog [data-af-key][data-af-value]").forEach((btn) => {
      const key = btn.dataset.afKey;
      const on = draft[key] === btn.dataset.afValue;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    global.SegmentSwitch?.refresh?.($("lf-advanced-filters-dialog"), opts?.animate === true);
  }

  function openAdvancedFiltersDialog() {
    const dialog = $("lf-advanced-filters-dialog");
    if (!dialog) return;
    advancedFiltersDraft = { ...getAdvancedFilters() };
    syncAdvancedModalUiFromDraft({ animate: false });
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");
    requestAnimationFrame(() => {
      global.SegmentSwitch?.refresh?.(dialog, false);
    });
    $("lf-advanced-apply")?.focus();
  }

  function closeAdvancedFiltersDialog() {
    const dialog = $("lf-advanced-filters-dialog");
    advancedFiltersDraft = null;
    if (dialog && typeof dialog.close === "function") dialog.close();
    else dialog?.removeAttribute("open");
  }

  function applyAdvancedFiltersDialog() {
    if (!advancedFiltersDraft) return;
    applyAdvancedFiltersFromPrefs(normalizePrefs(advancedFiltersDraft));
    closeAdvancedFiltersDialog();
    updateAdvancedFiltersBadge();
    savePrefs();
    scheduleUiApplyFilters();
  }

  function resetAdvancedFiltersInDialog() {
    advancedFiltersDraft = normalizePrefs({ ...DEFAULT_PREFS });
    syncAdvancedModalUiFromDraft({ animate: true });
  }

  function togglePriorityCategory(category) {
    const cat = String(category || "").trim();
    if (!cat) return;
    if (priorityCategories.has(cat)) priorityCategories.delete(cat);
    else priorityCategories.add(cat);
    const wrap = $("lf-category-chips");
    wrap?.querySelectorAll(".leads-chip[data-category]").forEach((btn) => {
      const active = priorityCategories.has(btn.dataset.category);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    savePrefs();
    lastCategoryChipSig = "";
    scheduleUiApplyFilters();
  }

  function buildFilteredLeads(includeCategoryFilter) {
    const f = getFilters();
    const pool = searchPoolLeads();
    const leads = pool.filter((lead) => matchesLeadListFilters(lead, f.websiteFilter, f));
    const filtered = searchTokens.length ? leads.filter(matchesSearchQuery) : leads;
    const sorted = includeCategoryFilter ? sortLeadsDisplayOrder(filtered) : filtered;
    const valid = [];
    const invalid = [];
    for (let i = 0; i < sorted.length; i++) {
      const lead = sorted[i];
      if (isLeadFormatValid(lead)) valid.push(lead);
      else invalid.push(lead);
    }
    return valid.length && !invalid.length ? valid : valid.concat(invalid);
  }

  function collectCategoryCounts(leads) {
    const counts = new Map();
    leads.filter(isLeadFormatValid).forEach((lead) => {
      const cat = getBasicCategory(lead);
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    // Always list every LeadFinder niche chip (including zeros); Other last if present.
    const ordered = [];
    BASIC_CATEGORY_GROUPS.forEach((item) => {
      ordered.push([item.label, counts.get(item.label) || 0]);
      counts.delete(item.label);
    });
    const leftovers = [...counts.entries()].sort((a, b) => {
      if (a[0] === "Other") return 1;
      if (b[0] === "Other") return -1;
      return a[0].localeCompare(b[0]);
    });
    return ordered.concat(leftovers.filter(([, n]) => n > 0));
  }

  /** Category chips ignore list-view + search so niches stay stable while toggling. */
  function buildCategoryChipLeads() {
    const f = getFilters();
    return allLeads.filter((lead) => {
      if (!matchesWebsiteFilter(lead, f.websiteFilter)) return false;
      return matchesAdvancedFilters(lead, f);
    });
  }

  function categoryChipFiltersSig() {
    const f = getFilters();
    return (
      f.websiteFilter +
      "|" +
      ADVANCED_FILTER_KEYS.map((key) => f[key]).join("|") +
      "|n:" +
      allLeads.length
    );
  }

  /**
   * Let segment toggles paint/slide first, then run the heavy filter pass.
   * Coalesces rapid clicks so only the latest selection is applied.
   */
  function scheduleUiApplyFilters() {
    const gen = ++filterApplyGen;
    if (filterApplyRaf) {
      cancelAnimationFrame(filterApplyRaf);
      filterApplyRaf = 0;
    }
    filterApplyRaf = requestAnimationFrame(() => {
      filterApplyRaf = requestAnimationFrame(() => {
        filterApplyRaf = 0;
        if (gen !== filterApplyGen) return;
        applyFilters();
      });
    });
  }

  function updateCategoryTotalLabel() {
    const available = $("lf-category-available");
    if (!available) return;
    if (!leadsPageReady) {
      available.textContent = "";
      return;
    }
    const total = getAvailableCount();
    if (total == null) {
      available.textContent = "";
      return;
    }
    available.textContent = formatLeadCount(total) + " leads";
  }

  function renderCategoryFilters(filteredLeads) {
    const extra = $("lf-toolbar-extra");
    const wrap = $("lf-category-chips");
    if (!extra || !wrap) return;

    const pairs = collectCategoryCounts(filteredLeads);
    extra.hidden = !leadsPageReady || pairs.length === 0;
    updateCategoryTotalLabel();

    if (!pairs.length) {
      wrap.innerHTML = "";
      return;
    }

    wrap.innerHTML = pairs
      .map(([cat, count]) => {
        const active = priorityCategories.has(cat);
        const empty = count === 0;
        return (
          '<button type="button" class="leads-chip' +
          (active ? " is-active" : "") +
          (empty ? " is-empty" : "") +
          '" data-category="' +
          escapeHtml(cat) +
          '" aria-pressed="' +
          (active ? "true" : "false") +
          '"' +
          (empty ? ' data-empty="1"' : "") +
          ' title="' +
          escapeHtml(
            empty
              ? cat + " — none in current filters"
              : active
                ? "Show all lead categories"
                : "Show " + cat + " leads (" + count + ")"
          ) +
          '">' +
          escapeHtml(cat) +
          "</button>"
        );
      })
      .join("");
  }

  function filtersSig() {
    const af = getAdvancedFilters();
    return (
      getWebsiteFilter() +
      "|" +
      ADVANCED_FILTER_KEYS.map((key) => af[key]).join("|") +
      "|" +
      searchQuery +
      "|" +
      Array.from(priorityCategories).sort().join(",")
    );
  }

  function resetRenderLimit() {
    renderLimit = INITIAL_RENDER_LIMIT;
  }

  function renderedVisibleCount() {
    return Math.min(visible.length, renderLimit);
  }

  function visibleRenderSlice() {
    return visible.slice(0, renderedVisibleCount());
  }

  function hasMoreVisibleLeads() {
    return renderedVisibleCount() < visible.length;
  }

  function hasMoreRemoteLeads() {
    return meta?.hasMore === true || !!global.LeadsLoader?.hasMoreCached?.();
  }

  function mergeIncomingLeads(incoming) {
    const list = Array.isArray(incoming) ? incoming : [];
    if (!list.length) return 0;
    const seen = new Set(allLeads.map((l) => normalizeLeadId(l.id)));
    let added = 0;
    for (const lead of list) {
      const id = normalizeLeadId(lead?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      allLeads.push(lead);
      added += 1;
    }
    return added;
  }

  async function fetchRemoteBatchesForScroll() {
    if (!global.LeadsLoader?.loadMore || remoteLoading) return false;
    if (!hasMoreRemoteLeads()) return false;
    remoteLoading = true;
    let addedAny = false;
    try {
      for (let i = 0; i < REMOTE_FETCH_GUARD; i += 1) {
        if (!hasMoreRemoteLeads()) break;
        const result = await global.LeadsLoader.loadMore();
        if (result?.meta) {
          meta = { ...meta, ...result.meta };
        }
        const appended = result?.appended || [];
        if (appended.length) {
          mergeIncomingLeads(appended);
          addedAny = true;
        }
        if (!result?.hasMore) {
          meta = { ...meta, hasMore: false };
          break;
        }
        // Keep pulling until we have more cards to show, or hit the guard.
        if (addedAny) {
          const preview = buildFilteredLeads(true);
          if (preview.length > visible.length) break;
        }
      }
    } catch (error) {
      console.warn("Business Finder load-more failed", error);
    } finally {
      remoteLoading = false;
    }
    return addedAny;
  }

  function loadNextVisibleBatch() {
    if (hasMoreVisibleLeads()) {
      renderLimit = Math.min(visible.length, renderLimit + RENDER_INCREMENT);
      renderGrid({ appendOnly: true });
      return true;
    }
    if (!hasMoreRemoteLeads() || remoteLoading) return false;
    void (async () => {
      const beforeLimit = renderLimit;
      const beforeVisible = visible.length;
      const added = await fetchRemoteBatchesForScroll();
      if (added) {
        const viewFilterSig = listView + "|" + filtersSig();
        lastViewFilterSig = viewFilterSig;
        visible = buildFilteredLeads(true);
        renderLimit = Math.min(
          visible.length,
          Math.max(beforeLimit + RENDER_INCREMENT, beforeVisible ? beforeLimit : INITIAL_RENDER_LIMIT)
        );
        const grid = $("lf-grid");
        if (grid) delete grid.dataset.renderSig;
        updateViewUi();
        renderGrid();
        updateStats();
        return;
      }
      renderGrid();
    })();
    return true;
  }

  function queueLoadNextVisibleBatch() {
    if (autoLoadQueued) return;
    autoLoadQueued = true;
    const schedule = global.requestAnimationFrame
      ? global.requestAnimationFrame.bind(global)
      : global.setTimeout.bind(global);
    schedule(() => {
      autoLoadQueued = false;
      loadNextVisibleBatch();
    });
  }

  function handleLoadMoreScrollFallback() {
    const sentinel = document.querySelector("[data-lf-load-more-sentinel]");
    if (!sentinel) return;
    const viewportHeight = global.innerHeight || document.documentElement.clientHeight || 0;
    if (sentinel.getBoundingClientRect().top <= viewportHeight + 420) {
      queueLoadNextVisibleBatch();
    }
  }

  function bindLoadMoreScrollFallback() {
    if (loadMoreScrollFallbackBound) return;
    loadMoreScrollFallbackBound = true;
    global.addEventListener("scroll", handleLoadMoreScrollFallback, { passive: true });
    global.addEventListener("resize", handleLoadMoreScrollFallback, { passive: true });
  }

  function normalizeLeadId(id) {
    return String(id ?? "").trim();
  }

  function loadIdSet(key) {
    try {
      const raw = global.RepStorage?.loadItem
        ? global.RepStorage.loadItem(key)
        : localStorage.getItem(repScopedKey(key));
      const o = JSON.parse(raw || "{}");
      return new Set(
        Object.keys(o)
          .filter((id) => id !== "__rev" && o[id])
          .map(normalizeLeadId)
          .filter(Boolean)
      );
    } catch (e) {
      return new Set();
    }
  }

  function saveIdSet(key, set) {
    let prevRev = 0;
    try {
      const raw = global.RepStorage?.loadItem
        ? global.RepStorage.loadItem(key)
        : localStorage.getItem(repScopedKey(key));
      prevRev = Number(JSON.parse(raw || "{}").__rev) || 0;
    } catch (e) {
      prevRev = 0;
    }
    const o = { __rev: Math.max(prevRev + 1, Date.now()) };
    set.forEach((id) => {
      const sid = normalizeLeadId(id);
      if (sid) o[sid] = true;
    });
    const json = JSON.stringify(o);
    if (global.RepStorage?.saveItem) global.RepStorage.saveItem(key, json);
    else localStorage.setItem(repScopedKey(key), json);
  }

  function reloadPersonalMarks() {
    savedIds = loadIdSet(SAVED_KEY);
  }

  function isSaved(lead) {
    return savedIds.has(normalizeLeadId(lead.id));
  }

  function syncSaveButtonUi(btn, saved) {
    if (!btn) return;
    btn.classList.toggle("is-on", saved);
    btn.setAttribute("aria-pressed", saved ? "true" : "false");
    btn.setAttribute("aria-label", saved ? "Remove from Quick Save" : "Quick Save");
    btn.title = saved ? "Unlike" : "Quick Save";
    const card = btn.closest(".lead-card");
    if (card) card.classList.toggle("lead-card--saved", saved);
  }

  function invalidateGridRender() {
    const g = $("lf-grid");
    if (g) delete g.dataset.renderSig;
  }

  function toggleSaved(leadId) {
    const id = normalizeLeadId(leadId);
    if (!id) return;
    if (savedIds.has(id)) savedIds.delete(id);
    else savedIds.add(id);
    saveIdSet(SAVED_KEY, savedIds);
    // Push quickly so a later cloud pull cannot overwrite a just-toggled save.
    if (global.RepStorage?.flushSync) {
      void global.RepStorage.flushSync().catch((e) =>
        console.warn("Quick Save sync failed", e)
      );
    }
  }

  function findLeadById(leadId) {
    const id = normalizeLeadId(leadId);
    if (!id) return null;
    return (
      allLeads.find((l) => normalizeLeadId(l.id) === id) ||
      searchRemoteLeads.find((l) => normalizeLeadId(l.id) === id) ||
      null
    );
  }

  function switchToActiveView() {
    if (listView === "default") return;
    setListView("default", { save: true, filter: false });
  }

  async function handleBuildLeadClick(leadId) {
    const id = normalizeLeadId(leadId);
    const lead = findLeadById(id);
    if (!id || !lead || !canEditLeadStatus(lead)) return;

    // Immediate local On hold so Active list hides this card before navigation.
    patchStatusMapLocal(id, "building", lead?.name);
    global.LeadSync?.saveBuildingLocalSnapshot?.(id, lead?.name);
    try {
      renderGrid();
    } catch (_) {
      /* ignore */
    }

    if (typeof global.forwardLeadToBuilder === "function") {
      const ok = await global.forwardLeadToBuilder(lead);
      if (!ok) {
        // Undo hold if handoff failed before marking/navigating.
        patchStatusMapLocal(id, "active", lead?.name);
        global.LeadSync?.clearBuildingLocalSnapshot?.(id);
        try {
          renderGrid();
        } catch (_) {
          /* ignore */
        }
      }
      return;
    }
    try {
      const pick = global.LeadDisplay?.buildLeadBuilderPick?.(lead) || {
        leadId: id,
        businessName: String(lead.name || "").trim(),
        phone: lead.phone || "",
        mapsUrl: lead.mapsUrl || lead.maps_url || "",
        price: global.LeadDisplay?.priceTierFromReviewCount?.(lead.reviewCount) || "$500",
      };
      sessionStorage.setItem("lpc_lead_pick_v1", JSON.stringify(pick));
      sessionStorage.setItem("lpc_lead_pick_pending_v1", "1");
      try {
        const scoped =
          (global.RepStorage?.key && global.RepStorage.key("lpc_lead_pick_nav_v1")) ||
          "lpc_lead_pick_nav_v1";
        localStorage.setItem(scoped, JSON.stringify({ pick, at: Date.now() }));
      } catch (_) {
        /* ignore */
      }
      void global.LeadSync?.markLeadBuilding?.(id, lead?.name);
      const params = new URLSearchParams({
        from_finder: "1",
        auto_generate: "1",
        lead_id: id,
        name: String(pick.businessName || lead.name || "").trim(),
        category: String(pick.category || lead.category || lead.categoryGroup || "").trim(),
        phone: String(pick.phone || lead.phone || "").trim(),
        address: String(pick.address || lead.address || "").trim(),
        maps: String(pick.mapsUrl || lead.mapsUrl || "").trim(),
      });
      const website = String(pick.website || lead.website || lead.websiteUrl || "").trim();
      const hours = String(pick.hours || lead.hours || "").trim();
      if (website) params.set("website", website);
      if (hours) params.set("hours", hours);
      try {
        const json = JSON.stringify(pick);
        const b64 = btoa(unescape(encodeURIComponent(json)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
        if (b64.length <= 1600) params.set("pick", b64);
      } catch (_) {
        /* ignore */
      }
      window.location.href = "builder.html?" + params.toString();
    } catch (e) {
      console.warn("Generate site fallback failed", e);
      window.location.href =
        "builder.html?lead_id=" + encodeURIComponent(id) +
        "&name=" + encodeURIComponent(String(lead?.name || "").trim());
    }
  }

  function telHref(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 10) return "tel:+1" + digits;
    if (digits.length === 11 && digits[0] === "1") return "tel:+" + digits;
    return digits.length >= 7 ? "tel:+" + digits : "";
  }

  function leadById(leadId) {
    const id = normalizeLeadId(leadId);
    if (!id) return null;
    const found = findLeadById(id);
    if (found) return found;
    const entry = statusEntry(id);
    if (!entry) return null;
    return leadFromStatusEntry(id, entry, "Pending");
  }

  function getLeadWorkflow(lead) {
    const s = statusEntry(lead.id);
    let w = s?.workflow || (s?.called ? "complete" : "");
    if (w === "flagged") w = "";
    if (w) return w;
    if (window.LeadSync?.isConfigured?.()) return "";
    return lead.called ? "complete" : "";
  }

  function statusEntry(leadId) {
    if (!leadId) return null;
    const direct = statusMap[leadId] || statusMap[String(leadId)];
    if (direct) return direct;
    const target = normalizeLeadId(leadId);
    const key = Object.keys(statusMap).find((k) => normalizeLeadId(k) === target);
    return key ? statusMap[key] : null;
  }

  function isRemoved(lead) {
    return getLeadWorkflow(lead) === "removed";
  }

  function isCompleted(lead) {
    return getLeadWorkflow(lead) === "complete";
  }

  function getRepName() {
    return String(global.RepSession?.getName?.() || "").trim();
  }

  function getRepId() {
    return String(
      global.RepSession?.getId?.() || global.RepSession?.get?.()?.id || ""
    ).trim();
  }

  function isOwnerMatch(ownerId, ownerName) {
    const meId = getRepId().toLowerCase();
    const meName = getRepName().toLowerCase();
    const oid = String(ownerId || "").trim().toLowerCase();
    const on = String(ownerName || "").trim().toLowerCase();
    if (meId && oid && meId === oid) return true;
    if (meName && on && meName === on) return true;
    if (meId && on && meId === on) return true;
    if (meName && oid && meName === oid) return true;
    return false;
  }

  function clearStatusEntries(map, leadId) {
    const target = normalizeLeadId(leadId);
    Object.keys(map).forEach((key) => {
      if (normalizeLeadId(key) === target) delete map[key];
    });
  }

  function isCompletedByMe(lead) {
    const s = statusEntry(lead.id);
    if (!s || getLeadWorkflow(lead) !== "complete") return false;
    return isOwnerMatch(s.calledById, s.calledBy);
  }

  function pendingOwnerName(lead) {
    const s = statusEntry(lead.id);
    return String(s?.pendingBy || s?.calledBy || "").trim();
  }

  function isPendingByMe(lead) {
    if (getLeadWorkflow(lead) !== "pending") return false;
    const s = statusEntry(lead.id);
    return isOwnerMatch(s?.pendingById || s?.calledById, pendingOwnerName(lead));
  }

  function isNotInterestedByMe(lead) {
    if (getLeadWorkflow(lead) !== "not-interested") return false;
    const s = statusEntry(lead.id);
    return isOwnerMatch(s?.calledById, s?.calledBy);
  }

  function buildingOwnerName(lead) {
    const s = statusEntry(lead.id);
    return String(s?.buildingBy || s?.calledBy || "").trim();
  }

  function isBuildingByMe(lead) {
    if (getLeadWorkflow(lead) !== "building") return false;
    const s = statusEntry(lead.id);
    return isOwnerMatch(s?.buildingById || s?.calledById, buildingOwnerName(lead));
  }

  /** Building in Lead Builder by a teammate · hidden from this rep's Active list. */
  function isBuildingByOther(lead) {
    if (getLeadWorkflow(lead) !== "building") return false;
    return !isBuildingByMe(lead);
  }

  function isMyBuildingById(leadId) {
    const s = statusEntry(leadId);
    if (!s || s.workflow !== "building") return false;
    return isOwnerMatch(s.buildingById || s.calledById, s.buildingBy || s.calledBy);
  }

  function isLockedByOther(lead) {
    return isPendingByOther(lead) || isBuildingByOther(lead);
  }

  function isWorkingByMe(lead) {
    return isPendingByMe(lead) || isBuildingByMe(lead);
  }

  /** Pending by a teammate · hidden from this rep's callable lists. */
  function isPendingByOther(lead) {
    if (getLeadWorkflow(lead) !== "pending") return false;
    return !isPendingByMe(lead);
  }

  function statusOwnerName(lead) {
    const w = getLeadWorkflow(lead);
    const s = statusEntry(lead.id);
    if (w === "pending") return pendingOwnerName(lead);
    if (w === "complete" || w === "not-interested") {
      return String(s?.calledBy || "").trim();
    }
    if (w === "removed") return getRepName();
    return "";
  }

  function isLeadFormatValid(lead) {
    if (global.LeadCsvFormat?.isValidLead) {
      return global.LeadCsvFormat.isValidLead(lead);
    }
    return lead?.formatValid !== false;
  }

  /** Only the rep who set Pending / Complete / Not interested can change that status. */
  function canEditLeadStatus(lead) {
    if (!isLeadFormatValid(lead)) return false;
    const w = getLeadWorkflow(lead);
    if (!w) return true;
    if (w === "removed") return true;
    const s = statusEntry(lead.id);
    if (w === "pending") {
      return isOwnerMatch(s?.pendingById || s?.calledById, pendingOwnerName(lead));
    }
    if (w === "building") {
      return isOwnerMatch(s?.buildingById || s?.calledById, buildingOwnerName(lead));
    }
    return isOwnerMatch(s?.calledById, s?.calledBy);
  }

  function canEditLeadStatusById(leadId) {
    const lead = findLeadById(leadId);
    if (lead && !isLeadFormatValid(lead)) return false;
    if (lead) return canEditLeadStatus(lead);
    const s = statusEntry(leadId);
    const w = s?.workflow || (s?.called ? "complete" : "");
    if (!w || w === "removed") return true;
    if (w === "pending") {
      return isOwnerMatch(s?.pendingById || s?.calledById, s?.pendingBy || s?.calledBy);
    }
    if (w === "building") {
      return isOwnerMatch(s?.buildingById || s?.calledById, s?.buildingBy || s?.calledBy);
    }
    return isOwnerMatch(s?.calledById, s?.calledBy);
  }

  function isActiveLead(lead) {
    return !getLeadWorkflow(lead);
  }

  function leadFromStatusEntry(id, entry, categoryLabel) {
    const name = String(entry?.businessName || entry?.business_name || "").trim();
    const cat = categoryLabel || "Team completed";
    return {
      id,
      name: name || "Lead",
      category: cat,
      categoryGroup: cat,
      phone: "",
      address: "",
      mapsUrl: "#",
      website: "",
      hours: "",
      hasWebsite: false,
      rating: null,
      reviewCount: null,
      dedupeKey: id,
      sources: [],
      _statusOnly: true,
    };
  }

  /** All team-complete rows from sync, merged with loaded lead cards. */
  function getCompleteLeadsPool() {
    const byId = new Map(allLeads.map((l) => [String(l.id), l]));
    const out = [];
    const seen = new Set();

    Object.entries(statusMap).forEach(([id, entry]) => {
      const sid = String(id);
      const w = entry?.workflow || (entry?.called ? "complete" : "");
      if (w !== "complete" || seen.has(sid)) return;
      seen.add(sid);
      out.push(byId.get(sid) || leadFromStatusEntry(sid, entry));
    });

    if (!window.LeadSync?.isConfigured?.()) {
      allLeads.forEach((lead) => {
        const sid = String(lead.id);
        if (isCompleted(lead) && !seen.has(sid)) {
          seen.add(sid);
          out.push(lead);
        }
      });
    }

    return sortByCompletedAt(out);
  }

  /** Only this rep's pending leads (team lock still applies in Active for others). */
  function getMyPendingLeadsPool() {
    const byId = new Map(allLeads.map((l) => [String(l.id), l]));
    const out = [];
    const seen = new Set();

    Object.entries(statusMap).forEach(([id, entry]) => {
      const sid = String(id);
      const w = entry?.workflow || "";
      if (w !== "pending" || seen.has(sid)) return;
      if (!isOwnerMatch(entry.pendingById || entry.calledById, entry.pendingBy || entry.calledBy)) {
        return;
      }
      seen.add(sid);
      const lead = byId.get(sid);
      if (lead) out.push(lead);
      else {
        const stub = leadFromStatusEntry(sid, entry);
        stub.category = "Your pending";
        stub.categoryGroup = "Your pending";
        out.push(stub);
      }
    });

    if (!window.LeadSync?.isConfigured?.()) {
      allLeads.forEach((lead) => {
        const sid = String(lead.id);
        if (isPendingByMe(lead) && !seen.has(sid)) {
          seen.add(sid);
          out.push(lead);
        }
      });
    }

    return out
      .slice()
      .sort((a, b) => {
        const atA = String(statusEntry(a.id)?.pendingAt || statusEntry(a.id)?.calledAt || "");
        const atB = String(statusEntry(b.id)?.pendingAt || statusEntry(b.id)?.calledAt || "");
        if (atA !== atB) return atB.localeCompare(atA);
        return String(a.name || "").localeCompare(String(b.name || ""));
      })
      .filter((lead) => isPendingByMe(lead));
  }

  /** Team-wide · every rep sees businesses marked not interested. */
  function getNotInterestedLeadsPool() {
    const byId = new Map(allLeads.map((l) => [String(l.id), l]));
    const out = [];
    const seen = new Set();

    Object.entries(statusMap).forEach(([id, entry]) => {
      const sid = String(id);
      if (entry?.workflow !== "not-interested" || seen.has(sid)) return;
      seen.add(sid);
      out.push(byId.get(sid) || leadFromStatusEntry(sid, entry, "Not interested"));
    });

    if (!window.LeadSync?.isConfigured?.()) {
      allLeads.forEach((lead) => {
        const sid = String(lead.id);
        if (getLeadWorkflow(lead) === "not-interested" && !seen.has(sid)) {
          seen.add(sid);
          out.push(lead);
        }
      });
    }

    return sortByCompletedAt(out);
  }

  function sortByCompletedAt(leads) {
    return leads.slice().sort((a, b) => {
      const atA = String(statusEntry(a.id)?.calledAt || "");
      const atB = String(statusEntry(b.id)?.calledAt || "");
      if (atA !== atB) return atB.localeCompare(atA);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function splitCompleteLeads(leads) {
    const mine = [];
    const team = [];
    leads.forEach((lead) => {
      if (isCompletedByMe(lead)) mine.push(lead);
      else team.push(lead);
    });
    return { mine, team };
  }

  function statusSigForLeads(leads) {
    return leads
      .map((l) => {
        const s = statusEntry(l.id) || {};
        return (
          l.id +
          ":" +
          getLeadWorkflow(l) +
          ":" +
          (s.calledBy || "") +
          ":" +
          (s.calledById || "") +
          ":" +
          (s.calledAt || "") +
          ":" +
          (s.pendingBy || "") +
          ":" +
          (s.pendingById || "") +
          ":" +
          (s.pendingAt || "")
        );
      })
      .join(",");
  }

  function isDefaultLead(lead) {
    return isActiveLead(lead);
  }

  function matchesWorkflowView(lead) {
    if (listView === "saved") {
      // Quick Save is a personal bookmark list — keep pending/on-hold items visible.
      if (isLockedByOther(lead)) return false;
      return isSaved(lead) && getLeadWorkflow(lead) !== "not-interested";
    }
    if (isWorkingByMe(lead)) return false;
    if (isLockedByOther(lead)) return false;
    return isActiveLead(lead);
  }

  function countWorkflowView(view) {
    const f = getFilters();
    return allLeads.filter((lead) => {
      if (!matchesWebsiteFilter(lead, f.websiteFilter)) return false;
      if (!matchesAdvancedFilters(lead, f)) return false;
      if (view === "saved") {
        return (
          isSaved(lead) &&
          !isLockedByOther(lead) &&
          getLeadWorkflow(lead) !== "not-interested"
        );
      }
      if (isWorkingByMe(lead)) return false;
      if (view === "default") return isActiveLead(lead) && !isLockedByOther(lead);
      return false;
    }).length;
  }

  function workflowLabel(workflow) {
    if (workflow === "complete") return "Complete";
    if (workflow === "pending") return "Pending";
    if (workflow === "building") return "On hold";
    if (workflow === "not-interested") return "Unsuccessful";
    if (workflow === "removed") return "Removed";
    return "";
  }

  function workflowChipClass(workflow) {
    if (workflow === "complete") return "lf-status-chip-done";
    if (workflow === "pending") return "lf-status-chip-pending";
    if (workflow === "building") return "lf-status-chip-muted";
    if (workflow === "not-interested") return "lf-status-chip-not-interested";
    return "lf-status-chip-muted";
  }

  function personalMarksSig() {
    return Array.from(savedIds).sort().join(",");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function display() {
    return window.LeadDisplay || {};
  }

  function formatRatingParts(lead) {
    const d = display();
    const rating = d.formatRating ? d.formatRating(lead) : "";
    const reviews = d.formatReviews ? d.formatReviews(lead) : "";
    const line = d.formatRatingLine ? d.formatRatingLine(lead) : "";
    const hasData = !!(rating || (reviews && reviews !== "No reviews"));
    return { rating, reviews, line, hasData };
  }

  function renderReviewLine(lead) {
    const { rating, hasData } = formatRatingParts(lead);
    if (!hasData) return { text: "No reviews", empty: true };
    const parts = [];
    if (rating) parts.push(rating);
    const n = Number(lead?.reviewCount);
    if (Number.isFinite(n) && n > 0) {
      parts.push("(" + Math.round(n) + ")");
    }
    if (!parts.length) return { text: "No reviews", empty: true };
    return { text: parts.join(" · "), empty: false };
  }

  function formatTooltipBlocks(text) {
    const blocks = String(text || "")
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!blocks.length) return "";
    return (
      '<span class="lf-pro-tip-inner">' +
      blocks
        .map(
          (block) =>
            '<span class="lf-pro-tip-p">' + escapeHtml(block).replace(/\n/g, "<br>") + "</span>"
        )
        .join("") +
      "</span>"
    );
  }

  /** Drop scrape/test filler so tip popovers stay useful. */
  function isUsefulLeadTipText(text) {
    const t = String(text || "").trim();
    if (t.length < 12) return false;
    const compact = t.replace(/\s+/g, "");
    if (compact.length < 12) return false;
    if (/^(.)\1{19,}$/i.test(compact)) return false;
    const freq = Object.create(null);
    for (let i = 0; i < compact.length; i++) {
      const ch = compact[i];
      freq[ch] = (freq[ch] || 0) + 1;
    }
    const max = Math.max.apply(null, Object.values(freq));
    if (max / compact.length >= 0.65) return false;
    if (compact.length >= 40 && Object.keys(freq).length <= 4) return false;
    return true;
  }

  function sanitizeLeadTipText(text, maxLen) {
    const t = String(text || "").trim();
    if (!isUsefulLeadTipText(t)) return "";
    const limit = Math.max(40, Number(maxLen) || 280);
    if (t.length <= limit) return t;
    return t.slice(0, limit - 1).trimEnd() + "…";
  }

  function collectReviewSnippets(lead) {
    const keys = [
      "reviewQuote",
      "Cw1rxd 2",
      "W4Efsd 6",
      "ah5Ghc",
      "ah5Ghc 2",
      "ah5Ghc 3",
      "e4rVHe",
    ];
    const seen = new Set();
    const out = [];
    keys.forEach((key) => {
      const text = sanitizeLeadTipText(lead?.[key], 220);
      if (!text || text.length < 16) return;
      if (!looksLikeReviewQuote(text)) return;
      const norm = text.toLowerCase();
      if (seen.has(norm)) return;
      seen.add(norm);
      out.push(text);
    });
    return out;
  }

  function buildReviewsTooltip(lead) {
    const { rating, reviews, hasData } = formatRatingParts(lead);
    const blocks = [];
    if (hasData) {
      blocks.push([rating, reviews].filter((v) => v && v !== "No reviews").join(" · "));
    }
    const price = String(lead.priceRange || lead.price_range || lead.doJOZc || "").trim();
    if (price) blocks.push("Price: " + price);
    const status = String(lead.businessStatus || lead.business_status || "").trim();
    if (status) blocks.push(status);
    collectReviewSnippets(lead).forEach((quote) => blocks.push('"' + quote + '"'));
    if (!blocks.length) return "";
    return blocks.join("\n\n");
  }

  function parseHoursClockToMinutes(raw) {
    const t = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    if (!t) return null;
    if (t === "noon") return 12 * 60;
    if (t === "midnight") return 0;
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = m[3].toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function extractHoursClock(text, keyword) {
    const re = new RegExp(
      "\\b" + keyword + "s?\\s+(?:at\\s+)?(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))",
      "i"
    );
    const match = String(text || "").match(re);
    if (!match) return null;
    return parseHoursClockToMinutes(match[1]);
  }

  function isOpenByHoursWindow(nowMinutes, opensAt, closesAt) {
    if (opensAt != null && closesAt != null) {
      if (closesAt > opensAt) {
        return nowMinutes >= opensAt && nowMinutes < closesAt;
      }
      return nowMinutes >= opensAt || nowMinutes < closesAt;
    }
    if (closesAt != null) {
      if (closesAt <= 6 * 60) {
        return nowMinutes < closesAt || nowMinutes >= 8 * 60;
      }
      return nowMinutes < closesAt;
    }
    if (opensAt != null) {
      return nowMinutes >= opensAt;
    }
    return null;
  }

  function summarizeHoursStatus(lead, hours) {
    if (!hours || hours === "Hours not listed" || hours === "NULL") {
      return { text: "Hours not listed", empty: true, status: "", tip: "" };
    }
    const formatted = formatDisplayHours(hours);
    const low = formatted.toLowerCase();
    const tip = buildHoursTooltip(lead, formatted);

    if (/\bopen 24\s*hours?\b/.test(low)) {
      return { text: "Open 24h", empty: false, status: "open", tip };
    }
    if (/\bpermanently\s+closed\b/.test(low) || /\btemporarily\s+closed\b/.test(low)) {
      return { text: "Closed", empty: false, status: "closed", tip };
    }

    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const opensAt = extractHoursClock(formatted, "open");
    const closesAt = extractHoursClock(formatted, "close");
    const windowOpen = isOpenByHoursWindow(nowMinutes, opensAt, closesAt);

    if (windowOpen != null) {
      return {
        text: windowOpen ? "Open" : "Closed",
        empty: false,
        status: windowOpen ? "open" : "closed",
        tip,
      };
    }

    const explicitOpen =
      /(?:^|[·|])\s*open\b/.test(low) && !/^opens?\b/.test(low.trim());
    if (explicitOpen) {
      return { text: "Open", empty: false, status: "open", tip };
    }

    if (/\bclosed\b/.test(low)) {
      return { text: "Closed", empty: false, status: "closed", tip };
    }

    return { text: "Open", empty: false, status: "open", tip };
  }

  function buildHoursTooltip(lead, fallbackHours) {
    const cleaner = global.LeadDisplay?.cleanHoursScheduleText;
    const weekly = global.LeadDisplay?.looksLikeWeeklySchedule;
    const candidates = [
      String(lead?.fullHours || lead?.full_hours || "").trim(),
      formatDisplayHours(fallbackHours || lead?.hours || ""),
    ].filter(Boolean);

    for (let i = 0; i < candidates.length; i++) {
      const cleaned = cleaner
        ? cleaner(candidates[i], lead)
        : String(candidates[i] || "").trim();
      if (!cleaned) continue;
      // Avoid a tip that only repeats Open / Closed / Open 24h (already on the row).
      if (/^(open|closed|open 24h|open 24 hours|hours not listed)$/i.test(cleaned.trim())) {
        continue;
      }
      // Prefer real schedules; never show Maps title mash leftovers.
      if (weekly && !weekly(cleaned) && cleaned.split("\n").length < 2) {
        // Single-line detail like "Closes 5 PM" is still useful.
        if (!/\b(am|pm|closes?|opens?)\b/i.test(cleaned)) continue;
      }
      return cleaned;
    }
    return "";
  }

  function tipIfDifferent(display, full) {
    const a = String(display || "").trim();
    const b = String(full || "").trim();
    if (!b) return "";
    if (a === b) return "";
    return b;
  }

  function renderProRow(icon, label, valueHtml, opts) {
    opts = opts || {};
    const empty = !!opts.empty;
    const tag = opts.href && !empty ? "a" : "div";
    // Only Open/Closed (hours) may show a hover tip — full weekly schedule.
    const tip = opts.scheduleTip && String(opts.scheduleTip).trim();
    const tipId = escapeHtml(String(opts.tipId || label).replace(/\s+/g, "-"));
    const attrs = [
      'class="lf-pro-row' +
        (empty ? " is-empty" : "") +
        (opts.href && !empty ? " is-link" : "") +
        (opts.wrap ? " is-wrap" : "") +
        (opts.status === "open" ? " lf-pro-row--open" : "") +
        (opts.status === "closed" ? " lf-pro-row--closed" : "") +
        (tip ? " has-tip lf-pro-row--hours" : "") +
        '"',
    ];
    attrs.push('aria-label="' + escapeHtml(label) + '"');
    if (tip) {
      attrs.push('tabindex="0"');
      attrs.push('aria-describedby="lf-tip-' + tipId + '"');
    }
    if (opts.href && !empty) {
      attrs.push('href="' + escapeHtml(opts.href) + '"');
      if (opts.external) attrs.push('target="_blank" rel="noopener noreferrer"');
    }
    const tipHtml = tip
      ? '<div class="lf-pro-tip lf-pro-tip--schedule" id="lf-tip-' +
        tipId +
        '" role="tooltip">' +
        formatTooltipBlocks(tip) +
        "</div>"
      : "";
    return (
      "<" +
      tag +
      " " +
      attrs.join(" ") +
      ">" +
      '<span class="lf-pro-row-icon" aria-hidden="true"><span data-icon="' +
      icon +
      '" data-icon-class="lf-pro-ico"></span></span>' +
      '<span class="lf-pro-row-text">' +
      valueHtml +
      "</span>" +
      tipHtml +
      "</" +
      tag +
      ">"
    );
  }

  function renderRatingHtml(lead) {
    const { rating, reviews, hasData } = formatRatingParts(lead);
    if (!hasData) return "";
    const aria = [rating, reviews].filter((v) => v && v !== "No reviews").join(", ");
    const score = rating
      ? '<span class="lf-card-rating-score">' + escapeHtml(rating) + "</span>"
      : "";
    const count =
      reviews && reviews !== "No reviews"
        ? '<span class="lf-card-rating-count">' + escapeHtml(reviews) + "</span>"
        : "";
    return (
      '<div class="lf-card-rating"' +
      (aria ? ' aria-label="' + escapeHtml(aria) + '"' : "") +
      ">" +
      score +
      '<span class="lf-card-rating-star" aria-hidden="true"><span data-icon="star" data-icon-class="lf-card-rating-ico"></span></span>' +
      count +
      "</div>"
    );
  }

  function matchesLeadListFilters(lead, websiteFilter, advanced) {
    if (!matchesWorkflowView(lead)) return false;
    if (!matchesWebsiteFilter(lead, websiteFilter)) return false;
    return matchesAdvancedFilters(lead, advanced);
  }

  function shuffleLeads(leads) {
    const rest = leads.slice();
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return rest;
  }

  function getWebsiteFilter() {
    const active = document.querySelector("#lf-website-filter .lf-toggle-btn.active");
    const v = active?.dataset.filter || "all";
    if (v === "web" || v === "noweb" || v === "all") return v;
    return "all";
  }

  function getFilters() {
    return {
      websiteFilter: getWebsiteFilter(),
      ...getAdvancedFilters(),
    };
  }

  function getBrowsableLeads(websiteFilter) {
    const hasPhone = global.LeadDisplay?.hasCallablePhone || global.LeadsLoader?.hasCallablePhone;
    return allLeads.filter((lead) => {
      if (!matchesWorkflowView(lead)) return false;
      if (!matchesWebsiteFilter(lead, websiteFilter)) return false;
      if (hasPhone && !hasPhone(lead)) return false;
      return true;
    });
  }

  function sortLeadsDisplayOrder(leads) {
    let pool = leads || [];
    if (priorityCategories.size) {
      pool = pool.filter((lead) => priorityCategories.has(getBasicCategory(lead)));
    }
    // Smart Mode is always on for Available (and category-filtered) lists.
    return applySmartProspectOrder(pool);
  }

  function matchesWebsiteFilter(lead, websiteFilter) {
    if (websiteFilter === "noweb") return !lead.hasWebsite;
    if (websiteFilter === "web") return !!lead.hasWebsite;
    return true;
  }

  function countCompleted() {
    return getCompleteLeadsPool().filter((lead) => isCompletedByMe(lead)).length;
  }

  function applyFilters() {
    const viewFilterSig = listView + "|" + filtersSig();
    if (viewFilterSig !== lastViewFilterSig) {
      resetRenderLimit();
      lastViewFilterSig = viewFilterSig;
    }

    visible = buildFilteredLeads(true);

    const grid = $("lf-grid");
    if (grid) delete grid.dataset.renderSig;
    const chipSig = categoryChipFiltersSig();
    if (chipSig !== lastCategoryChipSig) {
      lastCategoryChipSig = chipSig;
      renderCategoryFilters(buildCategoryChipLeads());
    }
    updateViewUi();
    renderGrid();
    updateStats();
    manageTeamStatusPoll();

    // Filters can hide the whole first page — keep pulling until matches appear or DB ends.
    if (visible.length === 0 && hasMoreRemoteLeads() && !remoteLoading) {
      void (async () => {
        const added = await fetchRemoteBatchesForScroll();
        if (added) applyFilters();
        else renderGrid();
      })();
    }
  }

  function updateViewUi() {
    const group = $("lf-list-view");
    if (!group) return;
    // Keep labels stable — rewriting "Available (n)" reflows SegmentSwitch mid-slide.
    group.querySelectorAll(".lf-toggle-btn[data-list-view]").forEach((btn) => {
      const value = btn.dataset.listView;
      const match = WORKFLOW_VIEWS.find((w) => w.value === value);
      if (!match) return;
      if (btn.textContent !== match.label) btn.textContent = match.label;
    });
    syncListViewToggle();
  }

  function setMetricsLoading(loading) {
    const val = loading ? "…" : null;
    ["lf-stat-total", "lf-stat-done", "lf-category-available"].forEach((id) => {
      const el = $(id);
      if (el && val) el.textContent = val;
    });
  }

  function formatLeadCount(n) {
    return Math.max(0, Math.round(Number(n) || 0)).toLocaleString("en-US");
  }

  function filtersAreDefaultWide() {
    if (listView !== "default") return false;
    if (searchQuery) return false;
    if (priorityCategories.size) return false;
    const f = getFilters();
    if (f.websiteFilter !== "all") return false;
    return ADVANCED_FILTER_KEYS.every((key) => f[key] === "all");
  }

  function getKnownDbLeadCount() {
    const dbTotal = Number(meta?.dbRowCount);
    if (Number.isFinite(dbTotal) && dbTotal > 0) return dbTotal;
    const loaderCount = Number(global.LeadsLoader?.getCachedDbRowCount?.());
    if (Number.isFinite(loaderCount) && loaderCount > 0) return loaderCount;
    return 0;
  }

  /** Unfiltered Available view → real table total; filtered views → matches currently known. */
  function getHeaderLeadCount() {
    const dbTotal = getKnownDbLeadCount();
    if (filtersAreDefaultWide() && dbTotal > 0) return dbTotal;
    return visible.length;
  }

  function getAvailableCount() {
    if (!leadsPageReady) return null;
    const dbTotal = getKnownDbLeadCount();
    if (dbTotal > 0) return dbTotal;
    return allLeads.filter(isLeadFormatValid).length;
  }

  function publishNavCount() {
    const count = getAvailableCount();
    if (count == null) return;
    try {
      sessionStorage.setItem(
        "lpc_lead_finder_nav_count_v1",
        JSON.stringify({ count, at: Date.now() })
      );
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("lead-finder-count-changed", { detail: { count } }));
  }

  function updateStats() {
    if (!leadsPageReady) return;
    if ($("lf-stat-total")) {
      $("lf-stat-total").textContent = formatLeadCount(getHeaderLeadCount());
    }
    if ($("lf-stat-done")) $("lf-stat-done").textContent = String(countCompleted());
    updateCategoryTotalLabel();
    publishNavCount();
  }

  function valueClass(text) {
    const t = String(text || "").trim();
    if (t === "NULL") return " lf-detail-val-null";
    if (/not listed$/i.test(t)) return " lf-detail-val-missing";
    return "";
  }

  function formatDisplayHours(raw) {
    if (!raw) return "";
    return String(raw)
      .replace(/[\u00b7\u2022]+/g, "·")
      .replace(/\s*·\s*/g, " · ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function visitWebsiteUrl(lead) {
    const w = String(lead?.website || "").trim();
    if (!w.startsWith("http://") && !w.startsWith("https://")) return "";
    const low = w.toLowerCase();
    if (
      low.includes("google.com/maps") ||
      low.includes("google.com/aclk") ||
      low.includes("gstatic.com")
    ) {
      return "";
    }
    return w;
  }

  function formatWebsiteLabel(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./i, "");
      return host.length > 32 ? host.slice(0, 29) + "…" : host;
    } catch (e) {
      const s = String(url).replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] || "";
      return s.length > 32 ? s.slice(0, 29) + "…" : s;
    }
  }

  function looksLikeReviewQuote(text) {
    const t = String(text || "").trim();
    if (t.length < 24) return false;
    if (/^["“']/.test(t)) return true;
    return t.split(/\s+/).length >= 6;
  }

  function renderLeadAvatar(lead, extraClass) {
    const d = display();
    const avatarText = d.initials ? d.initials(lead) : "?";
    const avatarStyle = d.avatarStyle ? d.avatarStyle(lead) : "";
    const mod = extraClass ? " " + extraClass : "";
    return (
      '<div class="lf-avatar' +
      mod +
      '" style="' +
      avatarStyle +
      '" aria-hidden="true">' +
      escapeHtml(avatarText) +
      "</div>"
    );
  }

  function renderWebsiteCell(websiteUrl) {
    if (!websiteUrl) {
      return '<span class="lf-website-badge lf-website-badge--none">No website</span>';
    }
    const label = formatWebsiteLabel(websiteUrl);
    return (
      '<a class="lf-website-badge lf-website-badge--yes" href="' +
      escapeHtml(websiteUrl) +
      '" target="_blank" rel="noopener noreferrer" title="' +
      escapeHtml(websiteUrl) +
      '">' +
      escapeHtml(label) +
      "</a>"
    );
  }

  function renderInfoRow(label, icon, valueHtml) {
    return (
      '<li class="lf-info-item" aria-label="' +
      escapeHtml(label) +
      '">' +
      '<span class="lf-info-icon" aria-hidden="true"><span data-icon="' +
      icon +
      '" data-icon-class="lf-info-ico"></span></span>' +
      '<div class="lf-info-value">' +
      valueHtml +
      "</div></li>"
    );
  }

  function formatTimeAgo(iso) {
    if (!iso) return "";
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "";
    const sec = Math.floor((Date.now() - then.getTime()) / 1000);
    if (sec < 45) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return min === 1 ? "1 minute ago" : min + " minutes ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr === 1 ? "1 hour ago" : hr + " hours ago";
    const day = Math.floor(hr / 24);
    if (day < 7) return day === 1 ? "1 day ago" : day + " days ago";
    const wk = Math.floor(day / 7);
    if (wk < 5) return wk === 1 ? "1 week ago" : wk + " weeks ago";
    return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function businessDisplayName(lead) {
    const d = display();
    const fromLead = d.formatName ? d.formatName(lead) : lead.name;
    const fromStatus = String(statusEntry(lead.id)?.businessName || "").trim();
    return fromLead || fromStatus || "Business";
  }

  function repAvatarHtml(repName) {
    const name = String(repName || "").trim();
    const RPP = global.RepProfilePhoto;
    const photo =
      (RPP?.urlForRepName && RPP.urlForRepName(name)) ||
      RPP?.DEFAULT_URL ||
      "";
    return (
      '<img class="lf-rep-avatar-img" src="' +
      escapeHtml(photo) +
      '" alt="" width="48" height="48" decoding="async">'
    );
  }

  function renderAnonymousTeamCard(lead, actionLabel) {
    const entry = statusEntry(lead.id) || {};
    const repName = String(entry.calledBy || entry.pendingBy || "").trim() || "Rep";
    const bizName = businessDisplayName(lead);
    const when = formatTimeAgo(entry.calledAt || entry.pendingAt || "");
    const workflow = getLeadWorkflow(lead);
    const label = actionLabel || workflowLabel(workflow) || "Updated";

    return (
      '<article class="lead-card card lead-card--team-anon lead-card--' +
      escapeHtml(workflow || "complete") +
      '" data-id="' +
      escapeHtml(lead.id) +
      '">' +
      '<div class="lf-team-anon-body">' +
      '<div class="lf-team-anon-rep-col">' +
      '<div class="lf-rep-avatar" aria-hidden="true">' +
      repAvatarHtml(repName) +
      "</div>" +
      '<p class="lf-team-anon-rep">' +
      escapeHtml(repName) +
      "</p>" +
      "</div>" +
      '<div class="lf-team-anon-copy">' +
      '<h3 class="lf-team-anon-business">' +
      escapeHtml(bizName) +
      "</h3>" +
      '<div class="lf-team-anon-meta">' +
      '<span class="lf-team-anon-status lf-team-anon-status--' +
      escapeHtml(workflow || "complete") +
      '">' +
      escapeHtml(label) +
      "</span>" +
      (when ? '<span class="lf-team-anon-when">' + escapeHtml(when) + "</span>" : "") +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderFormatErrorCard(lead) {
    const leadId = normalizeLeadId(lead.id);
    const bizName = String(lead.name || lead["qBF1Pd"] || "").trim() || "Unknown lead";
    const formatError = String(lead.formatError || global.LeadCsvFormat?.FORMAT_ERROR || "Format error");
    const avatarHtml = renderLeadAvatar({ ...lead, name: bizName }, "lf-avatar--error");

    return `
      <article class="lead-card card lf-pro lead-card--format-error" data-id="${escapeHtml(leadId)}" aria-disabled="true">
        <header class="lf-pro-head">
          <div class="lf-card-identity">
            ${avatarHtml}
            <div class="lf-card-titles">
              <h3 class="lead-card-name">${escapeHtml(bizName)}</h3>
              <p class="lf-pro-category lf-pro-category--error">Invalid import</p>
            </div>
          </div>
          <span class="lf-status-chip lf-status-chip-format-error">${escapeHtml(formatError)}</span>
        </header>

        <div class="lf-pro-details lf-pro-details--error">
          <p class="lf-format-error-copy">This row does not match the Google Maps CSV format.</p>
        </div>

        <footer class="lf-pro-foot">
          <span class="lf-action-btn lf-action-builder lf-action-builder--full is-disabled" aria-disabled="true">
            <span data-icon="hammer" data-icon-class="lf-action-ico"></span>
            Build Lead
          </span>
        </footer>
      </article>
    `;
  }

  function isBusinessFinderOwner() {
    if (global.SiteOwner?.isSiteOwner) return !!global.SiteOwner.isSiteOwner();
    const id = String(global.RepSession?.getId?.() || global.RepSession?.get?.()?.id || "")
      .trim()
      .toLowerCase();
    const allowed = (global.SITE_CONFIG?.ownerRepIds || []).map((s) => String(s).toLowerCase());
    return !!id && allowed.includes(id);
  }

  function ownerQuickPromptButtonHtml(leadId) {
    if (!isBusinessFinderOwner()) return "";
    if (!global.QuickPrompt?.isConfigured?.()) return "";
    return (
      '<button type="button" class="lf-mark-btn lf-mark-quick-prompt" data-lead-quick-prompt="' +
      escapeHtml(leadId) +
      '" aria-label="Quick Prompt this business" title="Quick Prompt">' +
      '<span data-icon="sparkles" data-icon-class="lf-mark-ico"></span>' +
      "</button>"
    );
  }

  function leadToQuickPromptPayload(lead) {
    const rating =
      lead?.rating != null && lead?.reviewCount != null
        ? String(lead.rating) + " (" + String(lead.reviewCount) + ")"
        : lead?.rating != null
          ? String(lead.rating)
          : String(lead?.reviewLabel || "").trim();
    return {
      lead_id: normalizeLeadId(lead?.id),
      id: normalizeLeadId(lead?.id),
      business_name: String(lead?.name || "").trim(),
      google_maps: String(lead?.mapsUrl || "").trim(),
      phone: String(lead?.phone || "").trim(),
      category: String(lead?.categoryGroup || lead?.category || "").trim(),
      address: String(lead?.address || "").trim(),
      website: String(lead?.website || "").trim(),
      rating,
      hours: String(lead?.hours || lead?.fullHours || "").trim(),
      price: "",
      preference: "",
      owner_name: "",
      notes: "",
    };
  }

  let ownerQuickPromptBusyId = null;

  async function handleOwnerQuickPromptClick(leadId, btn) {
    if (!isBusinessFinderOwner()) return;
    const id = normalizeLeadId(leadId);
    const lead = findLeadById(id);
    if (!id || !lead) return;
    if (ownerQuickPromptBusyId) return;
    if (!global.QuickPrompt?.isConfigured?.()) {
      void global.SiteDialog?.alert?.({
        message: "Quick Prompt is not configured · set quickPromptSecret in private config.",
      });
      return;
    }
    const maps = String(lead.mapsUrl || "").trim();
    const name = String(lead.name || "").trim();
    if (!name || !maps) {
      void global.SiteDialog?.alert?.({
        message: "Quick Prompt needs a business name and Google Maps link.",
      });
      return;
    }

    const rep = global.RepSession?.get?.();
    ownerQuickPromptBusyId = id;
    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
    }
    try {
      const data = await global.QuickPrompt.run({
        lead: leadToQuickPromptPayload(lead),
        repId: rep?.id,
        repName: rep?.name || rep?.id,
      });
      const msg = data?.accepted
        ? 'Quick Prompt started for "' + name + '" · check Telegram in 1–5 min.'
        : 'Quick Prompt sent to Telegram for "' + name + '".';
      void global.SiteDialog?.alert?.({ message: msg });
    } catch (e) {
      console.warn("Business Finder Quick Prompt failed", e);
      const offline = global.QuickPrompt?.isConnectivityError?.(e);
      void global.SiteDialog?.alert?.({
        message: offline
          ? "Could not reach Quick Prompt API · try again in a moment."
          : e?.message || "Quick Prompt failed.",
      });
    } finally {
      ownerQuickPromptBusyId = null;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.removeAttribute("aria-busy");
      }
    }
  }

  function renderCard(lead, opts) {
    if (!isLeadFormatValid(lead)) {
      return renderFormatErrorCard(lead);
    }

    opts = opts || {};
    const leadId = normalizeLeadId(lead.id);
    const workflow = getLeadWorkflow(lead);
    const saved = isSaved(lead);
    let cardMod =
      workflow === "complete"
        ? " lead-card--complete"
        : workflow === "pending"
          ? " lead-card--pending"
          : workflow === "not-interested"
            ? " lead-card--not-interested"
            : "";
    if (saved) cardMod += " lead-card--saved";
    const d = display();
    const phoneDisplay = d.formatPhone ? d.formatPhone(lead) : lead.phone || "Phone not listed";
    const addr = d.formatAddress ? d.formatAddress(lead) : lead.address || "Address not listed";
    let hours = d.formatHours ? d.formatHours(lead) : lead.hours || "Hours not listed";
    hours = formatDisplayHours(hours);
    const bizName = d.formatName ? d.formatName(lead) : lead.name || "Business name not listed";
    const avatarHtml = renderLeadAvatar(lead);
    const websiteUrl = visitWebsiteUrl(lead);
    const phoneRaw = String(lead.phone || "").trim();
    const tel =
      phoneRaw && phoneRaw.toUpperCase() !== "NULL"
        ? phoneRaw.replace(/[^\d+]/g, "")
        : "";

    const statusChip =
      workflow && workflow !== "removed"
        ? `<span class="lf-status-chip ${workflowChipClass(workflow)}">${escapeHtml(workflowLabel(workflow))}</span>`
        : "";

    const canEditStatus = canEditLeadStatus(lead);

    const addressEmpty = !addr || addr === "Address not listed";
    const hoursSummary = summarizeHoursStatus(lead, hours);
    const phoneEmpty = !tel;
    const categoryText = d.formatCategory ? d.formatCategory(lead) : getLeadCategory(lead);
    const mapsUrl = lead.mapsUrl && lead.mapsUrl !== "#" ? String(lead.mapsUrl).trim() : "";
    const review = renderReviewLine(lead);
    const scheduleTip = hoursSummary.empty ? "" : String(hoursSummary.tip || "").trim();

    const mainRows = [
      renderProRow("map-pin", "Address", escapeHtml(addr), { empty: addressEmpty }),
      phoneEmpty
        ? renderProRow("phone", "Phone", escapeHtml(phoneDisplay), { empty: true })
        : renderProRow("phone", "Phone " + phoneDisplay, escapeHtml(phoneDisplay), {
            href: "tel:" + tel,
          }),
      websiteUrl
        ? renderProRow("globe", "Website", escapeHtml(formatWebsiteLabel(websiteUrl)), {
            href: websiteUrl,
            external: true,
          })
        : renderProRow("globe", "Website", "No website", { empty: true }),
      mapsUrl
        ? renderProRow("map-pin", "Google Maps", "Open in Google Maps", {
            href: mapsUrl,
            external: true,
          })
        : renderProRow("map-pin", "Google Maps", "Maps link unavailable", { empty: true }),
    ];

    const sideRows = [
      renderProRow(
        "clock",
        "Hours",
        escapeHtml(hoursSummary.empty ? "Hours not listed" : hoursSummary.text),
        {
          empty: hoursSummary.empty,
          status: hoursSummary.status,
          scheduleTip,
          tipId: leadId + "-hours",
        }
      ),
      renderProRow("star", "Rating", escapeHtml(review.text), { empty: review.empty }),
    ];

    const extraSubline = opts.showTeamCompletedBy
      ? '<p class="lf-pro-note">By ' +
        escapeHtml(String(statusEntry(lead.id)?.calledBy || "").trim() || "Team") +
        "</p>"
      : opts.completedByLine
        ? '<p class="lf-pro-note">' + escapeHtml(opts.completedByLine) + "</p>"
        : "";

    return `
      <article class="lead-card card lf-pro${cardMod}" data-id="${escapeHtml(leadId)}">
        <header class="lf-pro-head">
          <div class="lf-card-identity">
            ${avatarHtml}
            <div class="lf-card-titles">
              <h3 class="lead-card-name">${escapeHtml(bizName)}</h3>
              <p class="lf-pro-category">${escapeHtml(categoryText)}</p>
              ${extraSubline}
            </div>
          </div>
          <div class="lf-card-head-actions">
            <div class="lf-card-mark-stack">
              <button type="button" class="lf-mark-btn lf-mark-save${saved ? " is-on" : ""}" data-lead-save="${escapeHtml(leadId)}" aria-label="${saved ? "Remove from Quick Save" : "Quick Save"}" aria-pressed="${saved ? "true" : "false"}" title="Quick Save">
                <span data-icon="heart" data-icon-class="lf-mark-ico"></span>
              </button>
              ${ownerQuickPromptButtonHtml(leadId)}
            </div>
            ${statusChip}
          </div>
        </header>

        <div class="lf-pro-details" aria-label="Business details">
          <div class="lf-pro-details-main">${mainRows.join("")}</div>
          <div class="lf-pro-details-side">${sideRows.join("")}</div>
        </div>

        <footer class="lf-pro-foot">
          <button type="button" class="lf-action-btn lf-action-builder lf-action-builder--full${canEditStatus ? "" : " is-disabled"}" data-lead-builder="${escapeHtml(leadId)}" aria-label="Generate site for ${escapeHtml(bizName)}"${canEditStatus ? "" : " disabled aria-disabled=\"true\""}>
            <span data-icon="hammer" data-icon-class="lf-action-ico"></span>
            Generate
          </button>
        </footer>
      </article>
    `;
  }

  function renderCompactCompletedCard(lead, opts) {
    opts = opts || {};
    const entry = statusEntry(lead.id) || {};
    const whenIso = String(entry.calledAt || entry.pendingAt || "").trim();
    const when = formatTimeAgo(whenIso);
    const d = display();
    const bizName = businessDisplayName(lead);
    const bizCat = d.formatCategory ? d.formatCategory(lead) : lead.category || lead.categoryGroup || "";
    const workflow = getLeadWorkflow(lead);
    const leadId = normalizeLeadId(lead.id);
    const tel = telHref(String(lead.phone || "").trim());
    const mapsUrl = lead.mapsUrl && lead.mapsUrl !== "#" ? String(lead.mapsUrl).trim() : "";

    const metaParts = [];
    let avatarHtml;
    if (opts.team) {
      const repName = String(entry.calledBy || entry.pendingBy || "").trim() || "Rep";
      avatarHtml =
        '<div class="lf-rep-avatar lf-complete-row-rep-avatar" aria-hidden="true">' +
        repAvatarHtml(repName) +
        "</div>";
      metaParts.push("<span>" + escapeHtml(repName) + "</span>");
    } else {
      avatarHtml = renderLeadAvatar(lead, "lf-avatar--compact");
      if (bizCat && bizCat !== "Category not listed") {
        metaParts.push("<span>" + escapeHtml(bizCat) + "</span>");
      }
    }
    if (when) {
      metaParts.push(
        '<time class="lf-complete-row-time" datetime="' +
          escapeHtml(whenIso) +
          '">' +
          escapeHtml(when) +
          "</time>"
      );
    }

    const rowMod = opts.team ? " lf-complete-row--team" : " lf-complete-row--mine";

    return (
      '<article class="lf-complete-row' +
      rowMod +
      '" data-id="' +
      escapeHtml(leadId) +
      '">' +
      '<div class="lf-complete-row-avatar">' +
      avatarHtml +
      "</div>" +
      '<div class="lf-complete-row-body">' +
      '<h3 class="lf-complete-row-name">' +
      escapeHtml(bizName) +
      "</h3>" +
      (metaParts.length
        ? '<p class="lf-complete-row-meta">' +
          metaParts.join('<span class="lf-meta-dot" aria-hidden="true">·</span>') +
          "</p>"
        : "") +
      "</div>" +
      '<div class="lf-complete-row-actions">' +
      (tel
        ? '<a class="lf-complete-icon-btn" href="' +
          escapeHtml(tel) +
          '" title="Call" aria-label="Call"><span data-icon="phone" data-icon-class="lf-complete-ico"></span></a>'
        : "") +
      (mapsUrl
        ? '<a class="lf-complete-icon-btn" href="' +
          escapeHtml(mapsUrl) +
          '" target="_blank" rel="noopener noreferrer" title="Maps" aria-label="Open in Maps"><span data-icon="map-pin" data-icon-class="lf-complete-ico"></span></a>'
        : "") +
      "</div>" +
      "</article>"
    );
  }

  function renderCompletePane(title, leads, paneClass, cardOpts) {
    cardOpts = cardOpts || {};
    const renderFn =
      cardOpts.renderCard ||
      ((l) => renderCompactCompletedCard(l, cardOpts));
    const emptyMsg = cardOpts.emptyMessage || "No completed leads yet.";
    const desc = cardOpts.paneDesc || "";
    const cards =
      leads.length > 0
        ? leads.map((l) => renderFn(l)).join("")
        : '<p class="lf-complete-empty">' + escapeHtml(emptyMsg) + "</p>";
    return (
      '<section class="lf-complete-pane ' +
      paneClass +
      '" aria-label="' +
      escapeHtml(title) +
      '">' +
      '<header class="lf-complete-pane-head">' +
      '<div class="lf-complete-pane-head-copy">' +
      "<h2 class=\"lf-complete-pane-title\">" +
      escapeHtml(title) +
      "</h2>" +
      (desc ? '<p class="lf-complete-pane-desc">' + escapeHtml(desc) + "</p>" : "") +
      "</div>" +
      '<span class="lf-complete-count" aria-label="' +
      leads.length +
      ' leads">' +
      String(leads.length) +
      "</span>" +
      "</header>" +
      '<div class="lf-complete-pane-grid">' +
      cards +
      "</div>" +
      "</section>"
    );
  }

  function renderCompleteSplit(leads) {
    const { mine, team } = splitCompleteLeads(leads);
    return (
      '<div class="lf-complete-split">' +
      renderCompletePane(
        "Your completed",
        mine,
        "lf-complete-pane--mine",
        {
          paneDesc: "Leads you marked complete",
          emptyMessage: "You haven't completed any leads yet.",
        }
      ) +
      renderCompletePane(
        "Team completed",
        team,
        "lf-complete-pane--team",
        {
          team: true,
          paneDesc: "Completed by teammates",
          emptyMessage: "No team completions yet.",
        }
      ) +
      "</div>"
    );
  }

  function renderLoadMoreSentinel() {
    const rendered = renderedVisibleCount();
    const remaining = visible.length - rendered;
    if (remaining > 0) {
      const next = Math.min(RENDER_INCREMENT, remaining);
      return (
        '<div class="leads-load-more" data-lf-load-more-sentinel aria-live="polite">' +
        '<span class="lf-load-more-status">Loading ' +
        next +
        " more as you scroll...</span>" +
        "</div>"
      );
    }
    if (hasMoreRemoteLeads() || remoteLoading) {
      return (
        '<div class="leads-load-more" data-lf-load-more-sentinel aria-live="polite">' +
        '<span class="lf-load-more-status">' +
        (remoteLoading ? "Fetching more leads..." : "Scroll for more leads...") +
        "</span>" +
        "</div>"
      );
    }
    return "";
  }

  function syncLoadMoreObserver(grid) {
    if (loadMoreObserver) {
      loadMoreObserver.disconnect();
      loadMoreObserver = null;
    }
    const sentinel = grid.querySelector("[data-lf-load-more-sentinel]");
    if (!sentinel) return;
    if ("IntersectionObserver" in global) {
      loadMoreObserver = new global.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            queueLoadNextVisibleBatch();
          }
        },
        { rootMargin: "420px 0px" }
      );
      loadMoreObserver.observe(sentinel);
      return;
    }
    bindLoadMoreScrollFallback();
    handleLoadMoreScrollFallback();
  }

  function renderGrid(options) {
    const opts = options && typeof options === "object" ? options : {};
    const grid = $("lf-grid");
    if (!grid) return;

    const rendered = visibleRenderSlice();
    let sig = listView + "|" + personalMarksSig() + "|" + filtersSig();
    sig += "|" + statusSigForLeads(rendered);
    sig += "|render:" + renderLimit + "|vis:" + visible.length;
    const baseSig = listView + "|" + personalMarksSig() + "|" + filtersSig() + "|vis:" + visible.length;

    if (visible.length > 0 && grid.dataset.renderSig === sig) {
      syncLoadMoreObserver(grid);
      return;
    }

    const loadMore = renderLoadMoreSentinel();
    const prevCount = Number(grid.dataset.renderedCount) || 0;
    const canAppend =
      opts.appendOnly &&
      visible.length > 0 &&
      grid.dataset.renderSigBase === baseSig &&
      prevCount > 0 &&
      rendered.length > prevCount &&
      grid.querySelector(".lead-card");

    grid.dataset.renderSig = sig;
    grid.dataset.renderSigBase = baseSig;
    grid.dataset.renderedCount = String(rendered.length);

    if (visible.length === 0) {
      grid.classList.remove("leads-grid--complete-split");
      const totalLoaded = allLeads.length;
      const validLoaded = allLeads.filter(isLeadFormatValid).length;
      const websiteFilter = getWebsiteFilter();
      const advanced = getAdvancedFilters();
      const hasAdvanced =
        advanced.reviewsFilter !== "all" ||
        advanced.hoursFilter !== "all" ||
        advanced.ratingFilter !== "all" ||
        advanced.businessStatusFilter !== "all";
      const reasons = [];
      if (searchQuery) reasons.push("Clear the search box");
      if (websiteFilter !== "all") reasons.push('Set Website filter to "All"');
      if (hasAdvanced) reasons.push("Reset Advanced filters");
      if (priorityCategories.size) reasons.push("Clear category chips");
      if (listView === "saved") reasons.push('Switch List back to "Available"');
      const remoteSearchHits = searchTokens.length ? searchRemoteLeads.length : 0;
      const searchNoPhoneHint =
        searchQuery && remoteSearchHits > 0
          ? '<p class="muted">Found <strong>' +
            remoteSearchHits +
            '</strong> match' +
            (remoteSearchHits === 1 ? "" : "es") +
            " in the database for \"" +
            escapeHtml(searchQuery) +
            '", but other filters are hiding them.</p>'
          : searchQuery && remoteSearchHits === 0 && searchRemoteQuery === searchQuery
            ? '<p class="muted">No database matches for "' +
              escapeHtml(searchQuery) +
              '". Try a city name, category, or phone digits.</p>'
            : "";
      const dbHint =
        hasMoreRemoteLeads() && !searchQuery
          ? '<p class="muted">More leads are still in the database — scroll or wait while they load.</p>'
          : "";
      grid.innerHTML =
        '<div class="leads-empty card">' +
        "<p><strong>" +
        (listView === "saved" ? "No Quick Save businesses" : "No businesses to show") +
        "</strong></p>" +
        '<p class="muted">' +
        (totalLoaded
          ? "Loaded " +
            validLoaded +
            " of " +
            totalLoaded +
            " leads, but none match the current filters."
          : "Business Finder has not loaded any leads yet.") +
        "</p>" +
        searchNoPhoneHint +
        dbHint +
        (reasons.length
          ? '<p class="muted">Try: ' + escapeHtml(reasons.join(" · ")) + ".</p>"
          : '<p class="muted">Click <strong>Refresh</strong>, or hard-refresh the page (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>).</p>') +
        "</div>";
      syncLoadMoreObserver(grid);
      return;
    }

    grid.classList.remove("leads-grid--complete-split");

    if (canAppend) {
      grid.querySelector("[data-lf-load-more-sentinel]")?.remove();
      const fragmentHtml = rendered.slice(prevCount).map((l) => renderCard(l)).join("") + loadMore;
      grid.insertAdjacentHTML("beforeend", fragmentHtml);
      const newCards = Array.from(grid.children).slice(prevCount);
      requestAnimationFrame(() => {
        if (window.SiteIcons && newCards.length) {
          newCards.forEach((node) => {
            if (node?.nodeType === 1) window.SiteIcons.initIcons(node);
          });
        }
      });
      syncLoadMoreObserver(grid);
      return;
    }

    grid.innerHTML = rendered.map((l) => renderCard(l)).join("") + loadMore;

    requestAnimationFrame(() => {
      if (window.SiteIcons) window.SiteIcons.initIcons(grid);
    });
    syncLoadMoreObserver(grid);
  }

  function patchStatusMapLocal(leadId, workflow, businessName) {
    const next = { ...statusMap };
    const key = normalizeLeadId(leadId);
    const w = String(workflow || "").trim();
    if (w === "removed") {
      next[key] = { workflow: "removed", called: false };
    } else if (w === "pending") {
      next[key] = {
        workflow: "pending",
        called: false,
        pendingBy: getRepName(),
        pendingById: getRepId(),
        pendingAt: new Date().toISOString(),
      };
    } else if (w === "building") {
      next[key] = {
        workflow: "building",
        called: false,
        buildingBy: getRepName(),
        buildingById: getRepId(),
        buildingAt: new Date().toISOString(),
      };
    } else if (w === "complete") {
      next[key] = {
        workflow: "complete",
        called: true,
        calledBy: getRepName(),
        calledById: getRepId(),
        calledAt: new Date().toISOString(),
      };
    } else if (w === "not-interested") {
      next[key] = {
        workflow: "not-interested",
        called: false,
        calledBy: getRepName(),
        calledById: getRepId(),
        calledAt: new Date().toISOString(),
      };
    } else if (w === "active" || !w) {
      clearStatusEntries(next, leadId);
    }
    if (businessName && next[key]) {
      next[key].businessName = String(businessName).trim();
    }
    statusMap = next;
  }

  function ensureSyncReady() {
    if (syncApi && syncApi.mode === "team") return Promise.resolve(syncApi);
    if (!window.LeadSync) return Promise.resolve(null);
    if (!syncInitPromise) {
      syncInitPromise = window.LeadSync.init((map) => {
        scheduleFilterFromSync(map);
      })
        .then((api) => {
          syncApi = api;
          if (api?.mode === "local" && window.LeadSync?.isConfigured?.()) {
            console.warn(
              "Business Finder: team sync unavailable · completed/pending are only on this device until Supabase connects."
            );
          }
          return api;
        })
        .catch((e) => {
          syncInitPromise = null;
          throw e;
        });
    }
    return syncInitPromise;
  }

  function retryTeamSync() {
    if (!window.LeadSync?.isConfigured?.()) return Promise.resolve(null);
    if (syncApi?.mode === "team") {
      return window.LeadSync.refreshTeam?.().catch(() => null);
    }
    syncApi = null;
    syncInitPromise = null;
    return ensureSyncReady();
  }

  function consumeForceTeamRefresh() {
    try {
      if (!sessionStorage.getItem("lpc_lf_force_team_refresh_v1")) return Promise.resolve(null);
      sessionStorage.removeItem("lpc_lf_force_team_refresh_v1");
      return retryTeamSync();
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  async function applyLeadWorkflow(leadId, workflow, options) {
    options = options || {};
    const viewBefore = listView;
    const restoreView = options.restoreView !== false;
    const switchToActive = options.switchToActive === true;
    const w = String(workflow || "").trim();
    const inMyPending =
      w === "active" &&
      (getMyPendingLeadsPool().some((l) => normalizeLeadId(l.id) === normalizeLeadId(leadId)) ||
        isMyBuildingById(leadId));
    if (!canEditLeadStatusById(leadId) && !inMyPending) {
      void global.SiteDialog?.alert({
        message: "You can only change status on leads you marked Pending, Complete, or Unsuccessful.",
      });
      return;
    }
    await ensureSyncReady().catch((e) => {
      console.warn("Lead sync unavailable, using this device only", e);
    });
    const lead = findLeadById(leadId);
    const before = { ...statusMap };
    patchStatusMapLocal(leadId, workflow, lead?.name);
    if (w === "pending") {
      global.LeadSync?.savePendingLocalSnapshot?.(leadId, lead?.name);
    } else if (w === "active" || !w) {
      global.LeadSync?.clearPendingLocalSnapshot?.(leadId);
      global.LeadSync?.clearBuildingLocalSnapshot?.(leadId);
      global.PendingLeadBuilder?.clear?.(normalizeLeadId(leadId));
    } else if (w === "not-interested") {
      global.PendingLeadBuilder?.clear?.(normalizeLeadId(leadId));
    }
    applyFilters();
    try {
      if (syncApi?.setWorkflow) {
        const niDetails =
          w === "not-interested"
            ? {
                phone: String(lead?.phone || "").trim(),
                googleMaps: String(lead?.mapsUrl || "").trim(),
                category: String(lead?.categoryGroup || lead?.category || "").trim(),
                address: String(lead?.address || "").trim(),
              }
            : undefined;
        await syncApi.setWorkflow(leadId, workflow, lead?.name, niDetails);
      }
      if (switchToActive) {
        switchToActiveView();
      } else if (restoreView && listView !== viewBefore) {
        listView = viewBefore;
        syncListViewToggle();
      }
      applyFilters();
      if (w === "complete") {
        const key = normalizeLeadId(leadId);
        const biz =
          String(lead?.name || "").trim() ||
          String(statusMap[key]?.businessName || before[key]?.businessName || "").trim();
        if (global.PendingLeadBuilder?.get?.(key)) {
          global.logSaleFromPendingComplete?.(key, biz);
        }
      }
    } catch (e) {
      statusMap = before;
      if (w === "pending") {
        const key = normalizeLeadId(leadId);
        const hadPending = Object.keys(before).some(
          (k) => normalizeLeadId(k) === key && before[k]?.workflow === "pending"
        );
        if (!hadPending) global.LeadSync?.clearPendingLocalSnapshot?.(leadId);
      }
      if (restoreView && listView !== viewBefore) {
        listView = viewBefore;
        syncListViewToggle();
      }
      applyFilters();
      console.error(e);
      void global.SiteDialog?.alert({ message: "Could not save. Check team sync setup or try again." });
      throw e;
    }
  }

  function bindGridMarkActions() {
    const grid = $("lf-grid");
    if (!grid || grid.dataset.markActionsBound === "1") return;
    grid.dataset.markActionsBound = "1";

    grid.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-lead-save]");
      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = saveBtn.getAttribute("data-lead-save");
        if (!id) return;
        const nowSaved = !savedIds.has(normalizeLeadId(id));
        toggleSaved(id);
        syncSaveButtonUi(saveBtn, nowSaved);
        invalidateGridRender();
        updateViewUi();
        applyFilters();
        return;
      }
      const quickPromptBtn = e.target.closest("[data-lead-quick-prompt]");
      if (quickPromptBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (quickPromptBtn.disabled) return;
        const id = quickPromptBtn.getAttribute("data-lead-quick-prompt");
        if (!id) return;
        void handleOwnerQuickPromptClick(id, quickPromptBtn);
        return;
      }
      const builderBtn = e.target.closest("[data-lead-builder]");
      if (builderBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (builderBtn.disabled || builderBtn.getAttribute("aria-disabled") === "true") {
          return;
        }
        const id = builderBtn.getAttribute("data-lead-builder");
        if (!id) return;
        void handleBuildLeadClick(id);
      }
    });
  }

  let syncFilterTimer = null;
  /** False until leads + workflow sync have loaded once (avoids stat count flash). */
  let leadsPageReady = false;
  let completePollTimer = null;

  function refreshTeamProfilePhotos() {
    const RPP = global.RepProfilePhoto;
    if (!RPP?.refreshTeamPhotos) return Promise.resolve();
    return RPP.refreshTeamPhotos().then(() => {
      const grid = $("lf-grid");
      if (grid && (listView === "complete" || listView === "not-interested")) {
        delete grid.dataset.renderSig;
        renderGrid();
      }
    });
  }

  function manageTeamStatusPoll() {
    clearInterval(completePollTimer);
    completePollTimer = null;
  }
  let refreshBusy = false;

  function showLeadsLoadError(err) {
    const grid = $("lf-grid");
    const msg = escapeHtml(err?.message || String(err));
    const looksLikeSupabase =
      /fetch|network|401|403|jwt|supabase|postgrest|failed to load/i.test(msg);
    if (grid) {
      grid.innerHTML =
        '<div class="leads-error card">' +
        `<p><strong>${looksLikeSupabase ? "Business Finder could not connect to Supabase." : "Business Finder could not load leads."}</strong></p>` +
        `<p class="muted">${msg}</p>` +
        (looksLikeSupabase
          ? '<p class="muted">Check: <code>supabase-full-setup.sql</code> was run, leads are imported into the <code>leads</code> table, and <code>js/config.js</code> has your project URL + publishable key. See <code>LEADS_DATABASE.md</code>.</p>'
          : '<p class="muted">Try a hard refresh (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>). If it persists, check the browser console.</p>') +
        "</div>";
    }
    console.error(err);
  }

  function setRefreshBusy(busy) {
    refreshBusy = busy;
    const btn = $("lf-refresh");
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle("is-loading", busy);
    if (busy) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
  }

  async function refreshLeads() {
    if (refreshBusy) return;
    setRefreshBusy(true);
    try {
      global.LeadsLoader?.clearCache?.();
      await retryTeamSync();
      await loadLeads();
    } catch (err) {
      showLeadsLoadError(err);
    } finally {
      setRefreshBusy(false);
      const btn = $("lf-refresh");
      if (btn && window.SiteIcons) window.SiteIcons.initIcons(btn);
    }
  }

  function scheduleFilterFromSync(map) {
    statusMap = map || statusMap;
    if (!leadsPageReady) return;
    clearTimeout(syncFilterTimer);
    const delay = 150;
    syncFilterTimer = setTimeout(applyFilters, delay);
  }

  async function loadLeads() {
    const loader = window.LeadsLoader;
    if (!loader?.load) throw new Error("LeadsLoader missing");

    const cached = loader.peekCache?.();
    const showCachedFirst = !!(cached?.leads?.length);
    let paintedEarly = false;

    const paintLeads = (payload, opts) => {
      const options = opts || {};
      meta = payload.meta || {};
      allLeads = options.skipShuffle
        ? (payload.leads || []).slice()
        : shuffleLeads(payload.leads || []);
      const websiteFilter = getWebsiteFilter();
      const availableCats = new Set(
        collectCategoryCounts(
          allLeads.filter((lead) => matchesWebsiteFilter(lead, websiteFilter))
        ).map(([cat]) => cat)
      );
      if (priorityCategories.size) {
        priorityCategories = new Set(
          Array.from(priorityCategories).filter((c) => availableCats.has(c))
        );
      }
      leadsPageReady = true;
      clearTimeout(syncFilterTimer);
      syncFilterTimer = null;
      lastViewFilterSig = "";
      lastCategoryChipSig = "";
      applyFilters();
      setMetricsLoading(false);
    };

    if (!showCachedFirst) {
      leadsPageReady = false;
      setMetricsLoading(true);
      const grid = $("lf-grid");
      if (grid) {
        grid.innerHTML =
          '<div class="leads-loading" role="status" aria-live="polite">' +
          '<span class="leads-loading-orb" aria-hidden="true"></span>' +
          '<span class="sr-only">Loading leads</span>' +
          "</div>";
      }
    } else {
      paintLeads(cached);
      paintedEarly = true;
    }

    // Don't let LeadSync setup delay the leads download / first paint.
    const syncReady = ensureSyncReady().catch((e) => {
      console.warn("Lead sync unavailable, using this device only", e);
      return null;
    });

    const data = await loader.load({
      watch: true,
      onPartial: (payload) => {
        if (paintedEarly || !payload?.leads?.length) return;
        paintedEarly = true;
        paintLeads(payload, { skipShuffle: true });
      },
    });

    await consumeForceTeamRefresh();
    await syncReady;

    // Cache already on screen — skip a second full reshuffle/re-render.
    if (data?.fromCache && showCachedFirst) {
      refreshTeamProfilePhotos().catch(() => {});
      if ((location.hash || "").replace(/^#/, "").trim() === "pending") {
        global.DashboardPending?.openToggle?.(true);
      }
      return;
    }

    paintLeads(data || { leads: [], meta: {} });
    refreshTeamProfilePhotos().catch(() => {});
    if ((location.hash || "").replace(/^#/, "").trim() === "pending") {
      global.DashboardPending?.openToggle?.(true);
    }
  }

  let pageReady = false;

  function init() {
    if (pageReady || document.body.dataset.page !== "leads") return;
    pageReady = true;
    bindGridMarkActions();
    reloadPersonalMarks();
    applyPrefsToUi();
    const hashViewInit = (location.hash || "").replace(/^#/, "").trim();
    if (WORKFLOW_VIEWS.some((w) => w.value === hashViewInit)) {
      listView = hashViewInit;
      syncListViewToggle();
    }

    $("lf-advanced-filters-btn")?.addEventListener("click", openAdvancedFiltersDialog);

    $("lf-advanced-apply")?.addEventListener("click", applyAdvancedFiltersDialog);
    $("lf-advanced-cancel")?.addEventListener("click", closeAdvancedFiltersDialog);
    $("lf-advanced-reset")?.addEventListener("click", resetAdvancedFiltersInDialog);

    const advDialog = $("lf-advanced-filters-dialog");
    advDialog?.addEventListener("click", (e) => {
      if (e.target === advDialog) closeAdvancedFiltersDialog();
    });
    advDialog?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeAdvancedFiltersDialog();
    });
    advDialog?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-af-key][data-af-value]");
      if (!btn || !advancedFiltersDraft) return;
      const key = btn.dataset.afKey;
      if (!ADVANCED_FILTER_KEYS.includes(key)) return;
      advancedFiltersDraft[key] = btn.dataset.afValue;
      syncAdvancedModalUiFromDraft({ animate: true });
    });

    $("lf-website-filter")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".lf-toggle-btn[data-filter]");
      if (!btn) return;
      if (btn.classList.contains("active")) return;
      document
        .querySelectorAll("#lf-website-filter .lf-toggle-btn[data-filter]")
        .forEach((b) => {
          const on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      savePrefs();
      scheduleUiApplyFilters();
    });

    $("lf-category-chips")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".leads-chip[data-category]");
      if (!chip) return;
      togglePriorityCategory(chip.dataset.category);
    });

    $("lf-list-view")?.addEventListener("click", (e) => {
      if (viewSelectSyncing) return;
      const btn = e.target.closest(".lf-toggle-btn[data-list-view]");
      if (!btn) return;
      const v = btn.dataset.listView;
      if (!WORKFLOW_VIEWS.some((w) => w.value === v) || v === listView) return;
      setListView(v, { save: true, defer: true });
    });

    const onSearchChange = (value) => onSearchChangeFromUi(value);
    const searchInput = $("lf-search");
    searchInput?.addEventListener("input", (e) => onSearchChange(e.target.value));
    searchInput?.addEventListener("search", (e) => onSearchChange(e.target.value));
    searchInput?.addEventListener("focus", () => {
      if (searchQuery) renderSearchSuggestions();
    });
    searchInput?.addEventListener("keydown", (e) => {
      const list = $("lf-search-suggest");
      if (!list || list.hidden) {
        if (e.key === "Escape") hideSearchSuggestions();
        return;
      }
      const items = [...list.querySelectorAll(".lf-search-suggest-item")];
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        searchSuggestActive = Math.min(items.length - 1, searchSuggestActive + 1);
        renderSearchSuggestions();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        searchSuggestActive = Math.max(0, searchSuggestActive - 1);
        renderSearchSuggestions();
      } else if (e.key === "Enter" && searchSuggestActive >= 0) {
        e.preventDefault();
        const row = items[searchSuggestActive];
        const q = row?.getAttribute("data-suggest-query");
        if (q) applySearchSuggestion(q);
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideSearchSuggestions();
      }
    });
    $("lf-search-suggest")?.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".lf-search-suggest-item");
      if (!item) return;
      e.preventDefault();
      const q = item.getAttribute("data-suggest-query");
      if (q) applySearchSuggestion(q);
    });
    document.addEventListener("click", (e) => {
      const wrap = document.querySelector(".lf-search-wrap");
      if (!wrap || wrap.contains(e.target)) return;
      hideSearchSuggestions();
    });
    $("lf-search-clear")?.addEventListener("click", () => {
      const input = $("lf-search");
      if (input) {
        input.value = "";
        input.focus();
      }
      onSearchChange("");
    });

    $("lf-refresh")?.addEventListener("click", () => {
      refreshLeads();
    });

    window.addEventListener("rep-settings-ready", () => {
      if (document.body.dataset.page !== "leads") return;
      reloadPersonalMarks();
      applyPrefsToUi({ preserveListView: true });
      if (allLeads.length) {
        applyFilters();
      }
    });

    window.addEventListener("rep-settings-pulled", () => {
      if (document.body.dataset.page !== "leads") return;
      reloadPersonalMarks();
      if (leadsPageReady) applyFilters();
    });

    window.addEventListener("leads-cache-refreshed", (e) => {
      if (document.body.dataset.page !== "leads") return;
      const payload = e.detail;
      if (!payload?.leads?.length) return;
      meta = payload.meta || {};
      allLeads = shuffleLeads(payload.leads);
      leadsPageReady = true;
      setMetricsLoading(false);
      applyFilters();
      try {
        global.dispatchEvent(
          new CustomEvent("lead-finder-count-changed", {
            detail: { count: allLeads.filter((lead) => lead.formatValid !== false).length },
          })
        );
      } catch (err) {
        /* ignore */
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (document.body.dataset.page !== "leads") return;
      // Cheap HEAD count only — do not wipe cache / re-download the whole table.
      global.LeadsLoader?.checkForUpdates?.().catch(() => null);
    });

    window.addEventListener("rep-session-changed", () => {
      if (document.body.dataset.page !== "leads") return;
      reloadPersonalMarks();
      window.LeadSync?.refreshTeam?.().catch(() => {});
      if (leadsPageReady) applyFilters();
    });

    window.addEventListener("sent-lead-deleted", (ev) => {
      if (document.body.dataset.page !== "leads") return;
      const leadId = String(ev?.detail?.leadId || "").trim();
      if (leadId) {
        window.LeadSync?.clearPendingLocalSnapshot?.(leadId);
        window.LeadSync?.clearBuildingLocalSnapshot?.(leadId);
      }
      window.LeadSync?.refreshTeam?.({ force: true })
        .then(() => {
          if (leadsPageReady) applyFilters();
        })
        .catch(() => {
          if (leadsPageReady) applyFilters();
        });
    });

    // Restored from the back/forward (bfcache) after building + sending a lead:
    // the in-memory status map is stale, so re-pull the latest workflow status
    // (Pending / Building) and re-render so sent leads drop out of the list.
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      if (document.body.dataset.page !== "leads") return;
      reloadPersonalMarks();
      const done = () => {
        if (leadsPageReady) applyFilters();
      };
      if (window.LeadSync?.refresh) {
        window.LeadSync.refresh().then(done).catch(done);
      } else {
        done();
      }
    });

    setMetricsLoading(true);
    loadLeads().catch((err) => {
      leadsPageReady = false;
      setMetricsLoading(false);
      ["lf-stat-total", "lf-stat-done"].forEach((id) => {
        const el = $(id);
        if (el) el.textContent = "-";
      });
      const grid = $("lf-grid");
      const msg = escapeHtml(err?.message || String(err));
      const looksLikeSupabase =
        /fetch|network|401|403|jwt|supabase|postgrest|failed to load/i.test(msg);
      if (grid) {
        grid.innerHTML =
          '<div class="leads-error card">' +
          `<p><strong>${looksLikeSupabase ? "Business Finder could not connect to Supabase." : "Business Finder could not load leads."}</strong></p>` +
          `<p class="muted">${msg}</p>` +
          (looksLikeSupabase
            ? '<p class="muted">Check: <code>supabase-full-setup.sql</code> was run, leads are imported into the <code>leads</code> table, and <code>js/config.js</code> has your project URL + publishable key. See <code>LEADS_DATABASE.md</code>.</p>'
            : '<p class="muted">Try a hard refresh (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>). If it persists, check the browser console.</p>') +
          "</div>";
      }
      console.error(err);
    });
  }

  function boot() {
    if (global.SiteLock?.whenUnlocked) global.SiteLock.whenUnlocked(init);
    else init();
  }

  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();

  window.LeadsPage = {
    loadLeads,
    applyFilters,
    refreshLeads,
    getAvailableCount,
    isActive() {
      return document.body?.dataset?.page === "leads";
    },
    isReady() {
      return !!leadsPageReady;
    },
  };
})(window);
