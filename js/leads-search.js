/**
 * Lead Finder - business type + location search.
 */
(function () {
  const typeInput = document.getElementById("lf-type");
  const locationInput = document.getElementById("lf-location");
  const areaToggle = document.getElementById("lf-area-toggle");
  const form = document.getElementById("lf-form");
  const statusEl = document.getElementById("lf-status");
  const errorEl = document.getElementById("lf-error");
  const resultsEl = document.getElementById("lf-results");
  const listCountEl = document.getElementById("lf-list-count");
  const findBtn = document.getElementById("lf-find");
  const SAVED_KEY = "ms_lf_quick_save_v1";
  const CLAIMED_KEY = "ms_lf_claimed_v1";
  const AREA_PREF_KEY = "ms_lf_in_my_area_v1";
  const DEV_NOTICE_KEY = "ms_lf_dev_notice_dismissed_v1";
  const NEARBY_RADIUS_MILES = 5;
  const AREA_LOCATION_LABEL = "Using your location";
  const DISPLAY_PAGE = 100;
  const LOADING_CARD_COUNT = 6;
  const MIN_SEARCH_RESULTS = 50;
  let listView = "default";
  let allLeads = [];
  let leadsReady = false;
  let leadsLoading = false;
  let displayLimit = DISPLAY_PAGE;
  let lastLeads = [];
  let lastQuery = "";
  let savedMap = loadSavedMap();
  let claimedMap = loadClaimedMap();
  const revealedLeadIds = new Set();
  let leadRevealObserver = null;
  let inMyArea = false;
  let userCoords = null;
  let areaRequestToken = 0;
  let websiteVerifyJob = 0;
  let prefetchJob = 0;
  let prefetchAbort = null;
  let websiteRefreshTimer = null;
  let listCountJob = 0;

  function readAreaPref() {
    try {
      return localStorage.getItem(AREA_PREF_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function persistAreaPref(on) {
    try {
      localStorage.setItem(AREA_PREF_KEY, on ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const r = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function leadCoords(lead) {
    const lat = Number(lead?.latitude ?? lead?.lat);
    const lng = Number(lead?.longitude ?? lead?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    const url = String(lead?.mapsUrl || lead?.maps_url || "");
    let match = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    match = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    return null;
  }

  function withDistanceFromUser(leads, coords) {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      return (leads || []).map((lead) => ({ lead, distanceMiles: null }));
    }
    return (leads || []).map((lead) => {
      const point = leadCoords(lead);
      const distanceMiles = point
        ? haversineMiles(coords.lat, coords.lng, point.lat, point.lng)
        : null;
      return { lead, distanceMiles };
    });
  }

  function applyNearbyFilterAndSort(leads, coords, radiusMiles, options) {
    const opts = options && typeof options === "object" ? options : {};
    const radius = Number(radiusMiles) || NEARBY_RADIUS_MILES;
    const rows = withDistanceFromUser(leads, coords);
    const withDistance = rows.filter((row) => row.distanceMiles != null);
    const withoutDistance = rows.filter((row) => row.distanceMiles == null);

    if (!withDistance.length && opts.trustScrapeRadius) {
      return (leads || []).map((lead) => ({ ...lead, distanceMiles: null }));
    }

    const inRadius = withDistance
      .filter((row) => row.distanceMiles <= radius)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);

    const ranked = inRadius.map((row) => ({
      ...row.lead,
      distanceMiles: Math.round(row.distanceMiles * 10) / 10,
    }));

    if (opts.includeUnknownDistance && withoutDistance.length) {
      withoutDistance.forEach((row) => {
        ranked.push({ ...row.lead, distanceMiles: null });
      });
    }

    return ranked;
  }

  function shouldSkipBulkPaint() {
    return !!(inMyArea || readAreaPref() || areaToggle?.checked);
  }

  function nearbySearchType(type) {
    return String(type || "").trim();
  }

  function scrapeErrorMessage(err) {
    const msg = String(err?.message || err || "").trim();
    if (/failed to fetch|networkerror|network error|load failed/i.test(msg)) {
      return "Live search server unreachable - check your connection and try again.";
    }
    return msg || "Live search unavailable";
  }

  function isWorkerLeadFinderBase(base) {
    return /\/lead-finder$/i.test(String(base || "").trim());
  }

  async function reverseGeocodeSearchContext(coords) {
    if (!coords) return null;
    if (coords.searchCity) {
      return { city: coords.searchCity, region: coords.searchRegion || "", label: coords.searchLabel || "" };
    }
    try {
      const url =
        "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
        encodeURIComponent(coords.lat) +
        "&longitude=" +
        encodeURIComponent(coords.lng) +
        "&localityLanguage=en";
      const res = await fetch(url, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      const city = String(data?.city || data?.locality || "").trim();
      const region = String(data?.principalSubdivisionCode || data?.principalSubdivision || "")
        .trim()
        .replace(/^US-/i, "");
      const label = city && region ? city + ", " + region : city || region || "";
      coords.searchCity = city;
      coords.searchRegion = region;
      coords.searchLabel = label;
      return { city, region, label };
    } catch (_) {
      return null;
    }
  }

  function leadsMatchingSearchCity(leads, cityContext) {
    const city = String(cityContext?.city || "").trim().toLowerCase();
    const region = String(cityContext?.region || "").trim().toLowerCase();
    if (!city) return [];
    return (leads || []).filter((lead) => {
      const blob = leadBlob(lead);
      if (!blob.includes(city)) return false;
      if (region && region.length >= 2 && !blob.includes(region)) return false;
      return true;
    });
  }

  function mergeNearbyResults(primary, secondary) {
    const seen = new Set();
    const out = [];
    (primary || []).concat(secondary || []).forEach((lead) => {
      const key = leadId(lead) || lead.mapsUrl || lead.name;
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(lead);
    });
    return out;
  }

  async function scrapeAuthHeaders() {
    const headers = { "Content-Type": "application/json" };
    try {
      const session = await window.StudioAuth?.getSession?.();
      if (session?.access_token) {
        headers.Authorization = "Bearer " + session.access_token;
      }
    } catch (_) {
      /* ignore */
    }
    return headers;
  }

  function requestUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported in this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos?.coords?.latitude);
          const lng = Number(pos?.coords?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error("Could not read your location."));
            return;
          }
          resolve({ lat, lng, accuracyMeters: Number(pos?.coords?.accuracy) || null });
        },
        (err) => {
          const code = Number(err?.code);
          if (code === 1) {
            reject(new Error("Location permission denied. Allow location to search near you."));
          } else if (code === 2) {
            reject(new Error("Location unavailable. Try again or enter a city manually."));
          } else if (code === 3) {
            reject(new Error("Location request timed out. Try again."));
          } else {
            reject(new Error(err?.message || "Could not get your location."));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
      );
    });
  }

  function isAreaLocationLabel(value) {
    const v = String(value || "").trim().toLowerCase();
    return v === "using your location" || v === "near you";
  }

  function setAreaLocationField() {
    if (locationInput) locationInput.value = AREA_LOCATION_LABEL;
  }

  function syncAreaUi() {
    const locked = !!inMyArea;
    if (locationInput) {
      locationInput.readOnly = locked;
      locationInput.setAttribute("aria-readonly", locked ? "true" : "false");
      if (locked && userCoords) setAreaLocationField();
    }
    const inputWrap = locationInput?.closest(".ms-lf-input");
    if (inputWrap) inputWrap.classList.toggle("is-area-locked", locked);
    if (areaToggle) areaToggle.checked = locked;
    const clearBtn = document.getElementById("lf-location-clear");
    if (clearBtn && locked) clearBtn.hidden = true;
    else syncFieldClear("location");
  }

  async function enableInMyArea(options) {
    const opts = options && typeof options === "object" ? options : {};
    const token = ++areaRequestToken;
    const willSearch = opts.autoSearch !== false;
    setError("");
    if (areaToggle) areaToggle.disabled = true;
    if (willSearch) {
      showLoadingCards();
      setFindBusy(true);
    }
    try {
      const coords = await requestUserLocation();
      if (token !== areaRequestToken) return false;
      userCoords = coords;
      inMyArea = true;
      persistAreaPref(true);
      setAreaLocationField();
      syncAreaUi();
      hideSuggest("location");
      if (willSearch) {
        await findNearbyLeads({ fromAreaToggle: true });
      }
      return true;
    } catch (e) {
      if (token !== areaRequestToken) return false;
      inMyArea = false;
      userCoords = null;
      persistAreaPref(false);
      if (areaToggle) areaToggle.checked = false;
      syncAreaUi();
      if (willSearch) {
        clearLoadingCards();
        setFindBusy(false);
      }
      setError(e?.message || "Could not use your location.");
      return false;
    } finally {
      if (areaToggle) areaToggle.disabled = false;
    }
  }

  function isDbConnected() {
    return window.LeadsLoader?.isDatabaseRequired?.() === true;
  }

  function showSearchPrompt() {
    clearLoadingCards();
    setStatus("");
    setError("");
    setListCount(0);
    if (!resultsEl) return;
    resultsEl.hidden = false;
    resultsEl.innerHTML = isDbConnected()
      ? '<div class="ms-dash-empty">Loading leads from the database…</div>'
      : '<div class="ms-dash-empty">Leave both fields blank to browse all businesses, or enter a type and location to narrow results.</div>';
  }

  async function searchSupabaseLeads(type, location, websiteFilter) {
    const loader = window.LeadsLoader;
    if (!loader?.searchRemote || !isDbConnected()) {
      return { ok: false, skipped: true, reason: "not_configured" };
    }
    const query = buildQuery(type, location);
    if (!query || query.length < 2) {
      return { ok: false, skipped: true, reason: "empty_query" };
    }
    try {
      const result = await loader.searchRemote(query, { websiteFilter, limit: 250 });
      if (result.error === "sign_in_required") {
        return { ok: false, skipped: true, reason: "sign_in_required" };
      }
      if (!result.ok) {
        return {
          ok: false,
          error: result.error || "Could not search the leads database.",
        };
      }
      const leads = Array.isArray(result.leads) ? result.leads : [];
      return {
        ok: true,
        leads,
        query: result.query || query,
        total: Number(result.total) || leads.length,
      };
    } catch (e) {
      return { ok: false, error: scrapeErrorMessage(e) };
    }
  }

  async function loadMoreFromSupabase() {
    const loader = window.LeadsLoader;
    if (!loader?.loadMore || !isDbConnected()) return false;
    setFindBusy(true);
    try {
      const data = await loader.loadMore();
      const appended = Array.isArray(data?.appended) ? data.appended : [];
      if (appended.length) {
        mergeScrapedIntoAllLeads(appended);
        if (!typeInput?.value?.trim() && !locationInput?.value?.trim() && !inMyArea) {
          renderLeads(allLeads, "All leads");
        } else {
          refreshVisibleLeads();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Business Finder loadMore failed", e);
      return false;
    } finally {
      setFindBusy(false);
    }
  }

  function shouldTryLiveScrape() {
    return (
      window.isLocalDevHost?.() === true &&
      Boolean(String(window.SITE_CONFIG?.leadFinderUrl || "").trim())
    );
  }

  function restoreNormalList() {
    setError("");
    setStatus("");
    displayLimit = DISPLAY_PAGE;
    resetLeadReveals();
    clearLoadingCards();
    setFindBusy(false);

    let pool = allLeads;
    if (!pool.length && isDbConnected()) {
      const cached = window.LeadsLoader?.peekCache?.();
      if (cached?.leads?.length) {
        pool = rankLeadList(cached.leads.slice());
        allLeads = pool;
        leadsReady = true;
      }
    }

    if (pool.length) {
      renderLeads(pool, "All leads");
      return;
    }

    if (!isDbConnected()) {
      showSearchPrompt();
      return;
    }

    if (leadsLoading) {
      showLoadingCards();
      return;
    }

    void preloadAllLeads();
  }

  function disableInMyArea() {
    areaRequestToken += 1;
    inMyArea = false;
    userCoords = null;
    persistAreaPref(false);
    if (areaToggle) areaToggle.checked = false;
    if (locationInput) {
      locationInput.readOnly = false;
      locationInput.removeAttribute("aria-readonly");
      if (isAreaLocationLabel(locationInput.value)) {
        locationInput.value = "";
      }
    }
    syncAreaUi();
    restoreNormalList();
  }

  function bindAreaToggle() {
    if (!areaToggle || areaToggle.dataset.bound === "1") return;
    areaToggle.dataset.bound = "1";
    areaToggle.addEventListener("change", () => {
      if (areaToggle.checked) {
        void enableInMyArea({ autoSearch: true });
        return;
      }
      disableInMyArea();
    });
    if (readAreaPref()) {
      areaToggle.checked = true;
      void enableInMyArea({ autoSearch: true });
    } else {
      syncAreaUi();
    }
  }

  /** High-fit niches surfaced first in Popular tags. */
  const POPULAR_TOP_CATEGORIES = window.LeadProspectRank?.TOP_SEARCH_CATEGORIES || [
    "Plumbers",
    "HVAC",
    "Roofing",
    "Electricians",
    "Landscaping",
    "Tree Service",
    "Pest Control",
    "Garage Door Repair",
    "Cleaning Services",
    "Handyman",
    "Moving Companies",
    "Locksmiths",
  ];

  function rankLeadList(leads) {
    const pool = reconcileLeadList(Array.isArray(leads) ? leads : []);
    if (!pool.length) return pool;
    if (window.LeadProspectRank?.prepareList) {
      // Full shuffle + score sort on huge cached pools can freeze mobile Safari.
      if (pool.length > 1200) return pool.slice();
      return window.LeadProspectRank.prepareList(pool);
    }
    return pool.slice();
  }

  /** Business-type catalog for suggestions + Popular tags. */
  const TYPE_CATALOG = [
    "Barbershops",
    "Hair Salons",
    "Nail Salons",
    "Beauty Salons",
    "Spas",
    "Massage Therapy",
    "Med Spas",
    "Gyms & Fitness",
    "Yoga Studios",
    "Pilates Studios",
    "CrossFit Gyms",
    "Martial Arts",
    "Personal Trainers",
    "Dental Practices",
    "Orthodontists",
    "Chiropractors",
    "Physical Therapy",
    "Urgent Care",
    "Optometrists",
    "Dermatologists",
    "Pediatric Clinics",
    "Veterinary Clinics",
    "Pet Groomers",
    "Dog Trainers",
    "Pet Boarding",
    "Restaurants",
    "Cafes & Coffee",
    "Bakeries",
    "Pizza Shops",
    "Food Trucks",
    "Catering",
    "Juice Bars",
    "Auto Repair",
    "Car Detailing",
    "Tire Shops",
    "Oil Change",
    "Body Shops",
    "Towing Services",
    "Plumbers",
    "Electricians",
    "HVAC",
    "Roofing",
    "Landscaping",
    "Lawn Care",
    "Tree Service",
    "Pest Control",
    "Pool Service",
    "Painting Contractors",
    "Cleaning Services",
    "Pressure Washing",
    "Flooring",
    "Carpet Cleaning",
    "Handyman",
    "General Contractors",
    "Remodeling",
    "Garage Door Repair",
    "Locksmiths",
    "Security Systems",
    "Moving Companies",
    "Junk Removal",
    "Storage Units",
    "Real Estate Agents",
    "Property Management",
    "Mortgage Brokers",
    "Insurance Agencies",
    "Tax Preparers",
    "Accountants",
    "Law Firms",
    "Notaries",
    "Daycares",
    "Preschools",
    "Tutoring",
    "Driving Schools",
    "Music Lessons",
    "Photographers",
    "Videographers",
    "Wedding Venues",
    "Event Planners",
    "Florists",
    "DJs",
    "Senior Care",
    "Home Health Care",
    "Marketing Agencies",
    "Web Design",
    "IT Support",
    "Phone Repair",
    "Print Shops",
    "Sign Shops",
    "Dry Cleaners",
    "Laundromats",
    "Tailors",
    "Appliance Repair",
    "Furniture Stores",
    "Boutique Retail",
    "Thrift Stores",
    "Tattoo Studios",
    "Tattoo Removal",
  ];

  const LOCATION_SEED = [
    "San Marcos, TX",
    "Austin, TX",
    "San Antonio, TX",
    "Houston, TX",
    "Dallas, TX",
    "Fort Worth, TX",
    "Round Rock, TX",
    "New Braunfels, TX",
    "Kyle, TX",
    "Buda, TX",
    "Los Angeles, CA",
    "San Diego, CA",
    "San Francisco, CA",
    "San Jose, CA",
    "Orange County, CA",
    "Phoenix, AZ",
    "Scottsdale, AZ",
    "Tucson, AZ",
    "Denver, CO",
    "Boulder, CO",
    "Miami, FL",
    "Orlando, FL",
    "Tampa, FL",
    "Atlanta, GA",
    "Chicago, IL",
    "Nashville, TN",
    "Charlotte, NC",
    "Raleigh, NC",
    "Seattle, WA",
    "Portland, OR",
    "Las Vegas, NV",
    "Salt Lake City, UT",
    "New York, NY",
    "Brooklyn, NY",
    "Boston, MA",
    "Philadelphia, PA",
    "Washington, DC",
  ];

  function loadSavedMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function persistSavedMap() {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedMap));
    } catch (e) {
      /* ignore quota */
    }
  }

  function loadClaimedMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(CLAIMED_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function persistClaimedMap() {
    try {
      localStorage.setItem(CLAIMED_KEY, JSON.stringify(claimedMap));
    } catch (e) {
      /* ignore quota */
    }
  }

  function isClaimed(leadOrId) {
    const id =
      typeof leadOrId === "string" || typeof leadOrId === "number"
        ? String(leadOrId || "").trim()
        : leadId(leadOrId);
    return !!(id && claimedMap[id]);
  }

  /**
   * Slide to generate → hide this business from Available + Quick Save.
   * Local first (instant), then optionally mirrored via projects.lead_id.
   */
  function markLeadClaimed(lead) {
    const id = leadId(lead);
    if (!id) return false;
    if (claimedMap[id]) return true;
    claimedMap[id] = {
      id,
      name: String(lead?.name || lead?.businessName || "").trim(),
      mapsUrl: String(lead?.mapsUrl || lead?.maps_url || "").trim(),
      at: new Date().toISOString(),
    };
    persistClaimedMap();
    if (savedMap[id]) {
      delete savedMap[id];
      persistSavedMap();
    }
    return true;
  }

  function releaseLeadClaim(leadOrId) {
    const id =
      typeof leadOrId === "string" || typeof leadOrId === "number"
        ? String(leadOrId || "").trim()
        : leadId(leadOrId);
    if (!id || !claimedMap[id] || claimedMap[id].from === "project") return false;
    delete claimedMap[id];
    persistClaimedMap();
    if (lastLeads.length) refreshVisibleLeads();
    return true;
  }

  function showGenerateBlocked(msg) {
    const text = String(msg || "").trim();
    if (!text) return;
    window.StudioToast?.error?.(text);
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = text;
    }
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
  }

  async function canAffordGeneration() {
    return { ok: true };
  }

  function mergeClaimedIds(ids) {
    let changed = false;
    (ids || []).forEach((raw) => {
      const id = String(raw || "").trim();
      if (!id || claimedMap[id]) return;
      claimedMap[id] = { id, at: new Date().toISOString(), from: "project" };
      changed = true;
    });
    if (changed) persistClaimedMap();
    return changed;
  }

  function filterClaimed(leads) {
    return (leads || []).filter((lead) => !isClaimed(lead));
  }

  async function hydrateClaimedFromProjects() {
    try {
      const sb = window.StudioAuth?.getClient?.() || window.SiteSupabase?.getClient?.();
      const user = await window.StudioAuth?.getUser?.();
      if (!sb || !user?.id) return false;
      const { data, error } = await sb
        .from("projects")
        .select("lead_id")
        .eq("user_id", user.id)
        .not("lead_id", "is", null)
        .limit(2000);
      if (error) throw error;
      const ids = (data || [])
        .map((row) => String(row.lead_id || "").trim())
        .filter(Boolean);
      return mergeClaimedIds(ids);
    } catch (e) {
      console.warn("hydrateClaimedFromProjects", e);
      return false;
    }
  }

  function leadId(lead) {
    return String(lead?.id || lead?.mapsUrl || lead?.name || "").trim();
  }

  function isSaved(lead) {
    const id = leadId(lead);
    return !!(id && savedMap[id]);
  }

  function toggleSaved(lead) {
    const id = leadId(lead);
    if (!id) return false;
    if (savedMap[id]) {
      delete savedMap[id];
      persistSavedMap();
      return false;
    }
    savedMap[id] = {
      id: id,
      name: lead.name || "",
      category: lead.category || lead.categoryGroup || "",
      phone: lead.phone || lead.phoneE164 || "",
      address: lead.address || "",
      website: lead.website || lead.websiteUrl || "",
      mapsUrl: lead.mapsUrl || "",
      hasWebsite: lead.hasWebsite,
    };
    persistSavedMap();
    return true;
  }

  function getListView() {
    const active = document.querySelector("#lf-list-view .ms-lf-website-btn.is-active");
    return String(active?.getAttribute("data-list-view") || listView || "default");
  }

  function syncListViewToggle() {
    document.querySelectorAll("#lf-list-view .ms-lf-website-btn").forEach((btn) => {
      const on = btn.getAttribute("data-list-view") === listView;
      btn.classList.toggle("is-active", on);
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function applyListFilter(leads) {
    if (listView !== "saved") return leads || [];
    return filterClaimed((leads || []).filter(isSaved));
  }

  function savedLeadsList() {
    return filterClaimed(Object.keys(savedMap).map((id) => savedMap[id]));
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tokensFrom(text) {
    return String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9&]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !["in", "the", "and", "for", "near"].includes(t));
  }

  function leadBlob(lead) {
    return [lead.name, lead.category, lead.address, lead.phone]
      .join(" ")
      .toLowerCase();
  }

  function filterLocalLeads(type, location) {
    const typeTokens = tokensFrom(type);
    const locTokens = tokensFrom(location);
    const pool = allLeads.length ? allLeads : lastLeads;
    if (!typeTokens.length && !locTokens.length) return pool.slice();

    return pool.filter((lead) => {
      const blob = leadBlob(lead);
      const typeOk = !typeTokens.length || typeTokens.some((t) => blob.includes(t));
      const locOk = !locTokens.length || locTokens.some((t) => blob.includes(t));
      return typeOk && locOk;
    });
  }

  function setStatus(msg) {
    if (!statusEl) return;
    // Keep the status line for rare empty-state notes only - never show scrape chatter.
    if (!msg || /scraping|searching|loading leads/i.test(msg)) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
  }

  function setFindBusy(busy) {
    if (!findBtn) return;
    findBtn.disabled = !!busy;
    findBtn.classList.toggle("is-busy", !!busy);
    findBtn.setAttribute("aria-busy", busy ? "true" : "false");
    if (busy) {
      findBtn.dataset.prevLabel = findBtn.textContent || "";
      findBtn.textContent = "Finding…";
    } else if (findBtn.dataset.prevLabel) {
      findBtn.textContent = findBtn.dataset.prevLabel;
      delete findBtn.dataset.prevLabel;
    }
  }

  function setListCount(n) {
    if (!listCountEl) return;
    const count = Math.max(0, Number(n) || 0);
    listCountEl.textContent = count.toLocaleString() + " lead" + (count === 1 ? "" : "s");
    listCountEl.hidden = false;
  }

  async function refreshListCount(fallbackCount) {
    const job = ++listCountJob;
    const visible = Math.max(0, Number(fallbackCount) || 0);

    if (listView === "saved" || inMyArea || !isDbConnected()) {
      setListCount(visible);
      return;
    }

    const websiteFilter = getWebsiteFilter();
    const query = buildQuery(typeInput?.value || "", locationInput?.value || "");
    const loader = window.LeadsLoader;

    if (!query && websiteFilter === "all") {
      const dbTotal = getDbLeadTotal();
      setListCount(dbTotal > 0 ? dbTotal : visible);
      return;
    }

    if (!loader?.countRemoteLeads) {
      setListCount(visible);
      return;
    }

    try {
      const total = await loader.countRemoteLeads(query, { websiteFilter });
      if (job !== listCountJob) return;
      setListCount(Number.isFinite(total) && total >= 0 ? total : visible);
    } catch (_) {
      if (job !== listCountJob) return;
      setListCount(visible);
    }
  }

  function getDbLeadTotal() {
    const fromLoader = Number(window.LeadsLoader?.getCachedDbRowCount?.());
    if (Number.isFinite(fromLoader) && fromLoader > 0) return fromLoader;
    const fromCache = Number(window.LeadsLoader?.peekCache?.()?.meta?.dbRowCount);
    if (Number.isFinite(fromCache) && fromCache > 0) return fromCache;
    return 0;
  }

  function shouldPrefetchAllLeads() {
    return (
      isDbConnected() &&
      !typeInput?.value?.trim() &&
      !locationInput?.value?.trim() &&
      !inMyArea &&
      document.body?.dataset?.page === "leads"
    );
  }

  function stopPrefetchSupabaseLeads() {
    prefetchJob += 1;
    if (prefetchAbort) {
      prefetchAbort.abort();
      prefetchAbort = null;
    }
  }

  async function prefetchRemainingSupabaseLeads() {
    if (!shouldPrefetchAllLeads()) return;
    if (!window.LeadsLoader?.hasMoreCached?.()) return;
    if (!window.LeadsLoader?.prefetchAllPages) return;

    stopPrefetchSupabaseLeads();
    const job = prefetchJob;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    prefetchAbort = controller;

    setStatus("Loading all leads from the database…");
    try {
      await window.LeadsLoader.prefetchAllPages({
        signal: controller?.signal,
        onBatch: (result) => {
          if (job !== prefetchJob || !shouldPrefetchAllLeads()) return;
          const appended = Array.isArray(result?.appended) ? result.appended.length : 0;
          if (appended) {
            setStatus(
              "Loading leads… " +
                Number(result?.meta?.loadedRows || result?.leads?.length || 0).toLocaleString() +
                " of " +
                getDbLeadTotal().toLocaleString()
            );
          }
        },
      });
      if (job === prefetchJob && shouldPrefetchAllLeads()) {
        setStatus("");
        refreshVisibleLeads();
      }
    } catch (e) {
      if (job === prefetchJob && e?.name !== "AbortError") {
        console.warn("prefetchRemainingSupabaseLeads", e);
        setStatus("");
      }
    } finally {
      if (prefetchAbort === controller) prefetchAbort = null;
    }
  }

  function leadFinderBaseUrl() {
    if (typeof window.resolveLeadFinderUrl === "function") {
      return window.resolveLeadFinderUrl();
    }
    return "";
  }

  function rowsToFinderLeads(rows) {
    const parse = window.LeadCsvFormat?.parseRow;
    const out = [];
    (rows || []).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const lead = parse ? parse(row) : null;
      if (lead?.mapsUrl || lead?.name) {
        out.push(lead);
        return;
      }
      const mapsUrl = String(row.maps_url || row.mapsUrl || "").trim();
      const name = String(row.business_name || row.name || "").trim();
      if (!mapsUrl && !name) return;
      out.push({
        id: row.id || mapsUrl || name,
        name: name || "Business",
        category: String(row.category_group || row.category || "").trim(),
        categoryGroup: String(row.category_group || row.category || "").trim(),
        phone: String(row.phone || "").trim(),
        address: String(row.address || "").trim(),
        mapsUrl,
        website: window.LeadCsvFormat?.resolveLeadWebsite
          ? window.LeadCsvFormat.resolveLeadWebsite(row)
          : String(row.website_url || "").trim(),
        hours: String(row.hours || "").trim(),
        hasWebsite: window.LeadCsvFormat?.resolveLeadHasWebsite
          ? window.LeadCsvFormat.resolveLeadHasWebsite(row)
          : Boolean(String(row.website_url || "").trim()),
        searchQuery: String(row.search_query || "").trim(),
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        formatValid: true,
      });
    });
    return out;
  }

  /**
   * Ask local LeadFinderCloud (search:server) to scrape Maps for type + location.
   */
  async function scrapeViaLeadFinder(type, location, query, geo) {
    const base = leadFinderBaseUrl();
    if (!base) return { ok: false, skipped: true, reason: "not_configured" };
    const t = String(type || "").trim();
    const loc = String(location || "").trim();
    const q = String(query || "").trim();
    const hasGeo =
      geo &&
      Number.isFinite(Number(geo.latitude)) &&
      Number.isFinite(Number(geo.longitude));
    if (!t && !loc && !q && !hasGeo) {
      return { ok: false, skipped: true, reason: "empty_query" };
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), 180000)
      : null;

    const body = {
      type: t,
      location: loc,
      minResults: MIN_SEARCH_RESULTS,
    };
    if (q) body.query = q;
    if (hasGeo) {
      body.latitude = Number(geo.latitude);
      body.longitude = Number(geo.longitude);
      body.radiusMiles = Number(geo.radiusMiles) || NEARBY_RADIUS_MILES;
    }

    try {
      const headers = await scrapeAuthHeaders();
      if (isWorkerLeadFinderBase(base) && !headers.Authorization) {
        return { ok: false, skipped: true, reason: "sign_in_required" };
      }
      const res = await fetch(base + "/search", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller?.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        return {
          ok: false,
          error: data?.error || "LeadFinder scrape failed (" + res.status + ")",
        };
      }
      const leads = rowsToFinderLeads(data.leads || []);
      return {
        ok: true,
        query: data.query || q,
        leads,
        rowCount: Number(data.rowCount) || leads.length,
        imported: Number(data.imported) || 0,
        durationMs: Number(data.durationMs) || 0,
      };
    } catch (e) {
      const aborted = e?.name === "AbortError";
      return {
        ok: false,
        error: aborted ? "LeadFinder scrape timed out" : scrapeErrorMessage(e),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function setError(msg) {
    if (errorEl) {
      if (!msg) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    }
    if (!msg) {
      window.StudioToast?.clear?.();
      return;
    }
    window.StudioToast?.error?.(msg);
  }

  const US_STATE_NAMES = new Set([
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
    "district of columbia",
  ]);

  function isLikelyPlaceText(text) {
    const raw = String(text || "").trim();
    if (!raw) return false;
    const low = raw.toLowerCase();
    if (US_STATE_NAMES.has(low)) return true;
    if (/^[a-z\s.'-]+,\s*[a-z]{2}$/i.test(raw)) return true;
    if (/^\d{5}(-\d{4})?$/.test(raw)) return true;
    if (/\b(county|parish)\b/i.test(raw)) return true;
    return false;
  }

  function parseCombinedSearchText(text) {
    const raw = String(text || "").trim();
    if (!raw || raw.length < 3) return null;
    const loader = window.LeadsLoader;
    if (!loader || typeof loader.parseSearchQuery !== "function") return null;
    const parsed = loader.parseSearchQuery(raw);
    const niche = String(parsed?.niche || "").trim();
    const location = String(parsed?.location || "").trim();
    if (niche && location) return { type: niche, location };
    if (niche && isLikelyPlaceText(niche) && !location) return { type: "", location: niche };
    return null;
  }

  /** Normalize Business type + Location fields into scrape-ready type/location. */
  function normalizeSearchInputs(typeRaw, locationRaw) {
    let type = String(typeRaw || "").trim();
    let location = String(locationRaw || "").trim();

    const fromType = type ? parseCombinedSearchText(type) : null;
    if (fromType) {
      type = fromType.type || type;
      location = location || fromType.location || "";
    }

    const fromLocation = location ? parseCombinedSearchText(location) : null;
    if (fromLocation) {
      if (fromLocation.type) type = type || fromLocation.type;
      location = fromLocation.location || location;
    }

    if (!type && location && isLikelyPlaceText(location)) {
      return { type: "", location };
    }

    if (type && !location && isLikelyPlaceText(type)) {
      return { type: "", location: type };
    }

    return { type, location };
  }

  function buildQuery(type, location) {
    const t = String(type || "").trim();
    const loc = String(location || "").trim();
    if (inMyArea && userCoords) {
      if (t) return t + " near you";
      return "Businesses near you";
    }
    if (t && loc) return t + " in " + loc;
    if (t && !loc) return t;
    if (!t && loc) return "Businesses in " + loc;
    return "";
  }

  function rankLeadsForView(leads, options) {
    const opts = options && typeof options === "object" ? options : {};
    if (inMyArea && userCoords) {
      const nearby = applyNearbyFilterAndSort(leads, userCoords, NEARBY_RADIUS_MILES, {
        trustScrapeRadius: !!opts.trustScrapeRadius,
        includeUnknownDistance: !!opts.trustScrapeRadius,
      });
      if (nearby.length) return nearby;
    }
    return rankLeadList(leads);
  }

  function leadPhone(lead) {
    return String(lead.phone || "").trim();
  }

  function leadWebsite(lead) {
    const fmt = window.LeadCsvFormat;
    if (fmt?.resolveLeadWebsite) return fmt.resolveLeadWebsite(lead);
    return String(lead.website || lead.websiteUrl || lead.website_url || "").trim();
  }

  function leadHasWebsite(lead) {
    const fmt = window.LeadCsvFormat;
    if (fmt?.resolveLeadHasWebsite) return fmt.resolveLeadHasWebsite(lead);
    const w = leadWebsite(lead);
    return w.startsWith("http://") || w.startsWith("https://");
  }

  function leadMissingWebsite(lead) {
    const fmt = window.LeadCsvFormat;
    if (fmt?.resolveLeadMissingWebsite) return fmt.resolveLeadMissingWebsite(lead);
    return !leadHasWebsite(lead);
  }

  function leadNeedsWebsiteCheck(lead) {
    const fmt = window.LeadCsvFormat;
    if (fmt?.resolveLeadNeedsWebsiteCheck) return fmt.resolveLeadNeedsWebsiteCheck(lead);
    return !leadHasWebsite(lead) && !leadMissingWebsite(lead);
  }

  function renderWebsiteCell(lead) {
    const website = leadWebsite(lead);
    if (leadHasWebsite(lead) && website) {
      return escapeHtml(formatWebsiteLabel(website));
    }
    if (leadMissingWebsite(lead)) {
      return '<span class="ms-lf-pro-no-site">No website</span>';
    }
    if (leadNeedsWebsiteCheck(lead)) {
      return '<span class="ms-lf-pro-site-check">Checking…</span>';
    }
    return '<span class="ms-lf-pro-no-site">No website</span>';
  }

  function reconcileLeadWebsite(lead) {
    return window.LeadCsvFormat?.reconcileLeadWebsiteFields
      ? window.LeadCsvFormat.reconcileLeadWebsiteFields(lead)
      : lead;
  }

  function reconcileLeadList(leads) {
    return (leads || []).map((lead) => reconcileLeadWebsite(lead));
  }

  function scheduleWebsiteRefresh() {
    if (websiteRefreshTimer) return;
    websiteRefreshTimer = setTimeout(() => {
      websiteRefreshTimer = null;
      refreshVisibleLeads();
    }, 150);
  }

  function enqueueWebsiteVerification(leads) {
    if (isDbConnected()) return;
    const maxBatch = Number(window.LeadWebsiteEnrich?.MAX_PER_BATCH) || 48;
    const candidates = (leads || [])
      .filter((lead) => needsWebsiteCheck(lead))
      .slice(0, maxBatch);
    if (!candidates.length) return;

    const jobId = ++websiteVerifyJob;
    const enrich = window.LeadWebsiteEnrich;
    if (!enrich?.enqueue) {
      candidates.forEach((lead) => {
        lead.websiteCheckPending = false;
      });
      scheduleWebsiteRefresh();
      return;
    }

    void (async () => {
      candidates.forEach((lead) => {
        lead.websiteCheckPending = true;
      });
      scheduleWebsiteRefresh();
      if (jobId !== websiteVerifyJob) return;

      let canRun = false;
      try {
        canRun = enrich.canRunEnrichment ? await enrich.canRunEnrichment() : !!enrich.baseUrl?.();
      } catch (_) {
        canRun = false;
      }
      if (jobId !== websiteVerifyJob) return;

      if (!canRun) {
        try {
          await enrich.fallbackLeads?.(candidates, scheduleWebsiteRefresh);
        } catch (_) {
          candidates.forEach((lead) => enrich.markLeadWebsiteUnknown?.(lead));
          scheduleWebsiteRefresh();
        }
        return;
      }

      try {
        enrich.enqueue(candidates, scheduleWebsiteRefresh);
      } catch (_) {
        scheduleWebsiteRefresh();
      }
    })();
  }

  function needsWebsiteCheck(lead) {
    if (isDbConnected()) return false;
    if (window.LeadWebsiteEnrich?.needsWebsiteCheck) {
      return window.LeadWebsiteEnrich.needsWebsiteCheck(lead);
    }
    return leadNeedsWebsiteCheck(lead);
  }

  function getWebsiteFilter() {
    const active = document.querySelector("#lf-website-filter .ms-lf-website-btn.is-active");
    return String(active?.getAttribute("data-website") || "all").toLowerCase();
  }

  function applyWebsiteFilter(leads, filter) {
    const mode = String(filter || "all").toLowerCase();
    const pool = reconcileLeadList(leads);
    if (mode === "with") return pool.filter(leadHasWebsite);
    if (mode === "without") {
      return pool.filter((lead) => !leadHasWebsite(lead) && (leadMissingWebsite(lead) || leadNeedsWebsiteCheck(lead)));
    }
    return pool;
  }

  function motionReduced() {
    return (
      document.documentElement.getAttribute("data-reduce-motion") === "1" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function observeLeadReveals(root) {
    leadRevealObserver?.disconnect();
    leadRevealObserver = null;
    if (!root) return;

    root.querySelectorAll(".ms-lf-reveal").forEach((el) => {
      el.classList.add("is-visible", "is-revealed");
      const id = el.getAttribute("data-lead-id");
      if (id) revealedLeadIds.add(id);
    });
  }

  function resetLeadReveals() {
    revealedLeadIds.clear();
    leadRevealObserver?.disconnect();
    leadRevealObserver = null;
  }

  function revealResults() {
    if (!resultsEl) return;
    resultsEl.hidden = false;
    resultsEl.classList.add("is-visible");
  }

  function renderLoadingSkeletonRow() {
    return (
      '<div class="ms-lf-skel-row">' +
      '<span class="ms-lf-skel-icon" aria-hidden="true"></span>' +
      '<span class="ms-lf-skel-line"></span>' +
      "</div>"
    );
  }

  function renderLoadingCard(index) {
    const mainRows = Array.from({ length: 3 }, () => renderLoadingSkeletonRow()).join("");
    const sideRows = Array.from({ length: 2 }, () => renderLoadingSkeletonRow()).join("");
    return (
      '<article class="ms-card ms-lead-card ms-lf-pro ms-lf-skeleton" aria-hidden="true" style="--ms-lf-skel-delay:' +
      index * 90 +
      'ms">' +
      '<header class="ms-lf-pro-head">' +
      '<div class="ms-lf-pro-identity">' +
      '<div class="ms-lf-skel-avatar" aria-hidden="true"></div>' +
      '<div class="ms-lf-pro-titles">' +
      '<div class="ms-lf-skel-line ms-lf-skel-line--title"></div>' +
      '<div class="ms-lf-skel-line ms-lf-skel-line--sub"></div>' +
      "</div></div>" +
      '<div class="ms-lf-skel-circle" aria-hidden="true"></div>' +
      "</header>" +
      '<div class="ms-lf-pro-details">' +
      '<div class="ms-lf-pro-details-main">' +
      mainRows +
      "</div>" +
      '<div class="ms-lf-pro-details-side">' +
      sideRows +
      "</div></div>" +
      '<footer class="ms-lf-pro-foot">' +
      '<div class="ms-lf-skel-slide" aria-hidden="true"></div>' +
      '<div class="ms-lf-skel-loader" aria-hidden="true">' +
      '<div class="ms-lb-dots-loader"><span></span><span></span><span></span></div>' +
      "</div></footer></article>"
    );
  }

  function showLoadingCards() {
    if (!resultsEl) return;
    resetLeadReveals();
    resultsEl.innerHTML = Array.from({ length: LOADING_CARD_COUNT }, (_, i) =>
      renderLoadingCard(i)
    ).join("");
    resultsEl.classList.add("is-loading");
    resultsEl.setAttribute("aria-busy", "true");
    revealResults();
    if (listCountEl) listCountEl.hidden = true;
  }

  function clearLoadingCards() {
    if (!resultsEl) return;
    resultsEl.classList.remove("is-loading");
    resultsEl.removeAttribute("aria-busy");
  }

  const LD = window.LeadDisplay || null;

  function displayName(lead) {
    if (LD?.formatName) {
      const n = LD.formatName(lead);
      if (n && n !== "Business name not listed") return n;
    }
    return String(lead.name || "Business").trim() || "Business";
  }

  function cleanCategoryText(value) {
    return String(value || "")
      .replace(/^[\s\d.,\-−–\u2014+·•]+/, "")
      .replace(/\b(temporarily closed|permanently closed|temporarily|permanently|closed|open now|open)\b.*$/i, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayCategory(lead) {
    let candidate = "";
    if (LD?.formatCategory) {
      const c = LD.formatCategory(lead);
      if (c && c !== "Category not listed" && c !== "Uncategorized") candidate = c;
    }
    if (!candidate) candidate = String(lead.category || lead.categoryGroup || "").trim();
    const cleaned = cleanCategoryText(candidate);
    // Drop junk: leftover digits, business-name-like length, or matches the name.
    if (!cleaned || /\d/.test(cleaned) || cleaned.length > 26) return "";
    if (cleaned.toLowerCase() === displayName(lead).toLowerCase()) return "";
    return cleaned;
  }

  function displayAddress(lead) {
    let addr = "";
    if (LD?.formatAddress) {
      const a = LD.formatAddress(lead);
      if (a && a !== "Address not listed" && a !== LD.NULL) addr = String(a);
    }
    if (!addr) addr = String(lead.address || "").trim();
    if (!addr) return "";
    return addr
      .replace(/\s*\d+(?:\.\d+)?\s*\(\s*\d+\s*\)\s*/g, " ")
      .replace(/([A-Za-z0-9#])(Open|Closed|Opens|Closes)/gi, "$1 $2")
      .replace(
        /\s*(?:Open\s+24\s+hours?|Temporarily\s+Closed|Permanently\s+Closed|Opens?\b.*|Closes?\b.*|Closed\b.*)\s*$/i,
        ""
      )
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function displayPhone(lead) {
    if (LD?.formatPhone) {
      const p = LD.formatPhone(lead);
      if (p && p !== "Phone not listed" && p !== LD.NULL) return p;
    }
    return (
      leadPhone(lead) ||
      String(lead.UsdlK || lead.phoneE164 || lead.phone_e164 || "").trim()
    );
  }

  function displayOpenStatus(lead) {
    if (LD?.formatOpenStatus) {
      const s = LD.formatOpenStatus(lead);
      if (s?.text) return s;
    }
    const hours = String(lead.hours || "").trim();
    if (!hours) return { text: "", kind: "" };
    if (/open 24/i.test(hours)) return { text: "Open 24h", kind: "open" };
    if (/\bclosed\b/i.test(hours)) return { text: "Closed", kind: "closed" };
    if (/^opens?\b/i.test(hours)) return { text: hours.slice(0, 28), kind: "open" };
    if (/^open\b/i.test(hours)) return { text: "Open", kind: "open" };
    return { text: "", kind: "" };
  }

  function displayInitials(lead) {
    if (LD?.initials) return LD.initials(lead);
    const n = displayName(lead);
    return (n.slice(0, 2) || "?").toUpperCase();
  }

  function avatarStyleAttr(lead) {
    if (LD?.avatarStyle) return LD.avatarStyle(lead);
    return "--lf-avatar-a:#3b82f6;--lf-avatar-b:#2563eb";
  }

  function formatWebsiteLabel(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw.startsWith("http") ? raw : "https://" + raw);
      const host = u.hostname.replace(/^www\./i, "");
      const path = u.pathname && u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "";
      return host + path;
    } catch (_) {
      return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    }
  }

  function telHref(phone) {
    const digits = String(phone || "").replace(/[^\d+]/g, "");
    if (!digits || digits.replace(/\D/g, "").length < 7) return "";
    return "tel:" + digits;
  }

  const ICO = {
    pin: '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    phone:
      '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    globe:
      '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    clock:
      '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star: '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>',
    hammer:
      '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-2.5L16 7.84"/><path d="m12 9 4.5-4.5a2.12 2.12 0 0 1 3 3L15 12"/></svg>',
  };

  function renderProRow(iconHtml, label, valueHtml, opts) {
    opts = opts || {};
    const empty = !!opts.empty;
    const tag = opts.href && !empty ? "a" : "div";
    const cls =
      "ms-lf-pro-row" +
      (empty ? " is-empty" : "") +
      (opts.href && !empty ? " is-link" : "") +
      (opts.status === "open" ? " is-open" : "") +
      (opts.status === "closed" ? " is-closed" : "");
    const attrs = ['class="' + cls + '"', 'aria-label="' + escapeHtml(label) + '"'];
    if (opts.href && !empty) {
      attrs.push('href="' + escapeHtml(opts.href) + '"');
      if (opts.external) attrs.push('target="_blank" rel="noopener noreferrer"');
    }
    return (
      "<" +
      tag +
      " " +
      attrs.join(" ") +
      ">" +
      '<span class="ms-lf-pro-row-icon" aria-hidden="true">' +
      iconHtml +
      "</span>" +
      '<span class="ms-lf-pro-row-text">' +
      valueHtml +
      "</span>" +
      "</" +
      tag +
      ">"
    );
  }

  function renderProRowCell(valueHtml, opts) {
    opts = opts || {};
    const empty = !!opts.empty;
    const slot = opts.slot === "aside" ? "aside" : "main";
    const tag = opts.href && !empty ? "a" : "span";
    const cls =
      "ms-lf-pro-row-" +
      slot +
      (empty ? " is-empty" : "") +
      (opts.href && !empty ? " is-link" : "") +
      (opts.status === "open" ? " is-open" : "") +
      (opts.status === "closed" ? " is-closed" : "");
    const attrs = ['class="' + cls + '"'];
    if (opts.href && !empty) {
      attrs.push('href="' + escapeHtml(opts.href) + '"');
      if (opts.external) attrs.push('target="_blank" rel="noopener noreferrer"');
    }
    return "<" + tag + " " + attrs.join(" ") + ">" + valueHtml + "</" + tag + ">";
  }

  function renderProRowPair(iconHtml, label, leftHtml, rightHtml, opts) {
    opts = opts || {};
    const rowClass = opts.rowClass ? " " + opts.rowClass : "";
    return (
      '<div class="ms-lf-pro-row ms-lf-pro-row--pair' +
      rowClass +
      '" aria-label="' +
      escapeHtml(label) +
      '">' +
      '<span class="ms-lf-pro-row-icon" aria-hidden="true">' +
      iconHtml +
      "</span>" +
      '<div class="ms-lf-pro-row-pair-body">' +
      renderProRowCell(leftHtml, {
        slot: "main",
        empty: !!opts.leftEmpty,
        href: opts.leftHref,
        external: opts.leftExternal,
      }) +
      renderProRowCell(rightHtml, {
        slot: "aside",
        empty: !!opts.rightEmpty,
        href: opts.rightHref,
        external: opts.rightExternal,
        status: opts.rightStatus,
      }) +
      "</div></div>"
    );
  }

  function formatRatingCompact(lead) {
    const n = Number(lead?.rating);
    const c = Number(lead?.reviewCount);
    const rating =
      Number.isFinite(n) && n > 0
        ? n % 1 === 0
          ? n.toFixed(1)
          : String(Math.round(n * 10) / 10)
        : "";
    let count = "";
    if (!(lead?.hasNoReviews || lead?.reviewLabel === "No reviews")) {
      if (Number.isFinite(c) && c > 0) count = "(" + String(Math.round(c)) + ")";
    }
    if (rating && count) return rating + " • " + count;
    if (rating) return rating;
    if (count) return count;
    return "";
  }

  function builderPickFromLead(lead) {
    if (LD?.buildLeadBuilderPick) {
      const pick = LD.buildLeadBuilderPick(lead);
      if (pick && typeof pick === "object") {
        return {
          leadId: pick.leadId || leadId(lead),
          businessName: pick.businessName || displayName(lead),
          category: pick.category || displayCategory(lead) || "",
          phone: pick.phone || displayPhone(lead) || "",
          address: pick.address || displayAddress(lead) || "",
          mapsUrl: pick.mapsUrl || String(lead.mapsUrl || lead.maps_url || "").trim(),
          website: pick.website || leadWebsite(lead) || "",
          hours: pick.hours || String(lead.hours || "").trim(),
          description: pick.description || String(lead.description || lead.about || "").trim(),
          rating: pick.rating || lead.rating || lead.stars || "",
          reviewCount: pick.reviewCount || lead.reviewCount || lead.reviews || "",
          price: pick.price || "",
        };
      }
    }
    return {
      leadId: leadId(lead),
      businessName: displayName(lead),
      category: displayCategory(lead) || "",
      phone: displayPhone(lead) || "",
      address: displayAddress(lead) || "",
      mapsUrl: String(lead.mapsUrl || lead.maps_url || "").trim(),
      website: leadWebsite(lead) || "",
      hours: String(lead.hours || "").trim(),
      description: String(lead.description || lead.about || "").trim(),
      rating: lead.rating || lead.stars || "",
      reviewCount: lead.reviewCount || lead.reviews || "",
      price: "",
    };
  }

  function storeBuilderPick(pick) {
    try {
      sessionStorage.setItem("lpc_lead_pick_v1", JSON.stringify(pick));
      sessionStorage.setItem("lpc_lead_pick_pending_v1", "1");
    } catch (_) {
      /* ignore quota */
    }
  }

  function builderHrefForLead(lead) {
    const pick = builderPickFromLead(lead);
    const params = new URLSearchParams({
      from_finder: "1",
      auto_generate: "1",
      lead_id: pick.leadId || "",
      name: pick.businessName || "",
      category: pick.category || "",
      phone: pick.phone || "",
      address: pick.address || "",
      maps: pick.mapsUrl || "",
    });
    if (pick.website) params.set("website", pick.website);
    if (pick.hours) params.set("hours", pick.hours);
    if (pick.description) params.set("description", String(pick.description).slice(0, 400));
    if (pick.rating) params.set("rating", String(pick.rating));
    if (pick.reviewCount) params.set("reviews", String(pick.reviewCount));
    try {
      const json = JSON.stringify(pick);
      const b64 = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
      if (b64.length <= 1800) params.set("pick", b64);
    } catch (_) {
      /* ignore */
    }
    return { href: "editor.html?" + params.toString(), pick };
  }

  async function launchBuilderForLead(lead, opts) {
    if (!lead) return false;
    markLeadClaimed(lead);
    const handoff = builderHrefForLead(lead);
    storeBuilderPick(handoff.pick);
    location.href = handoff.href;
    return true;
  }

  const SLIDE_COMPLETE_TOLERANCE_PX = 2;
  const SLIDE_MIN_DRAG_RATIO = 0.88;
  const SLIDE_COMPLETE_RATIO = 0.94;

  function slideCompletes(current, max, dragPx) {
    if (max <= 0) return false;
    const minDrag = max * SLIDE_MIN_DRAG_RATIO;
    if (dragPx < minDrag) return false;
    return current >= max * SLIDE_COMPLETE_RATIO - SLIDE_COMPLETE_TOLERANCE_PX;
  }

  function slidePad(track) {
    if (!track) return 4;
    const style = window.getComputedStyle(track);
    return Number.parseFloat(style.paddingLeft) || 4;
  }

  function slideThumbWidth(thumb) {
    if (!thumb) return 44;
    void thumb.offsetWidth;
    const w = thumb.getBoundingClientRect().width || thumb.offsetWidth || 0;
    return w > 8 ? w : 44;
  }

  function slideMetrics(slide) {
    const track = slide?.querySelector(".ms-lf-slide-track");
    const thumb = slide?.querySelector(".ms-lf-slide-thumb");
    if (!track || !thumb) return null;
    const pad = slidePad(track);
    void track.offsetWidth;
    void thumb.offsetWidth;
    void slide?.offsetWidth;
    const thumbW = slideThumbWidth(thumb);
    const innerW = Math.max(0, track.clientWidth - pad * 2);
    const max = Math.max(0, innerW - thumbW);
    return { track, thumb, pad, thumbW, max };
  }

  function slideXFromPointer(track, clientX, max, grabOffsetX) {
    const thumb = track.querySelector(".ms-lf-slide-thumb");
    if (!thumb || max <= 0) return 0;
    const rect = track.getBoundingClientRect();
    const pad = slidePad(track);
    const thumbW = slideThumbWidth(thumb);
    const centerX = clientX - (grabOffsetX || 0);
    const raw = centerX - rect.left - pad - thumbW / 2;
    return Math.max(0, Math.min(max, raw));
  }

  function slideMax(slide, pass) {
    const metrics = slideMetrics(slide);
    if (!metrics) return 0;
    if (metrics.max <= 0 && (pass || 0) < 3) {
      return slideMax(slide, (pass || 0) + 1);
    }
    return metrics.max;
  }

  function readSlideX(slide) {
    const inline = slide.style.getPropertyValue("--ms-lf-slide-x");
    if (inline) {
      const parsed = Number.parseFloat(inline);
      if (Number.isFinite(parsed)) return parsed;
    }
    const computed = window.getComputedStyle(slide).getPropertyValue("--ms-lf-slide-x");
    const parsed = Number.parseFloat(computed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clearSlideInlineStyles(slide) {
    if (!slide) return;
    slide.style.removeProperty("--ms-lf-slide-x");
    slide.style.removeProperty("--ms-lf-slide-max");
    slide.style.removeProperty("--ms-lf-slide-fill");
  }

  function setSlideX(slide, x, metricsOrMax) {
    const metrics =
      metricsOrMax && typeof metricsOrMax === "object"
        ? metricsOrMax
        : slideMetrics(slide);
    if (!metrics) return 0;
    const max =
      typeof metricsOrMax === "number" && Number.isFinite(metricsOrMax)
        ? metricsOrMax
        : metrics.max;
    const clamped = Math.max(0, Math.min(max, x));
    slide.style.setProperty("--ms-lf-slide-x", clamped + "px");
    slide.style.setProperty("--ms-lf-slide-max", max + "px");
    slide.style.setProperty(
      "--ms-lf-slide-fill",
      metrics.pad + clamped + metrics.thumbW + "px"
    );
    return clamped;
  }

  function resetSlide(slide, animated) {
    if (!slide) return;
    const metrics = slideMetrics(slide);
    if (!metrics) return;
    slide.classList.remove("is-dragging", "is-done", "is-completing");
    if (animated) {
      slide.classList.add("is-returning");
      setSlideX(slide, 0, metrics);
      window.setTimeout(() => {
        slide.classList.remove("is-returning");
        clearSlideInlineStyles(slide);
      }, 280);
      return;
    }
    slide.classList.remove("is-returning");
    clearSlideInlineStyles(slide);
  }

  function completeSlide(slide) {
    if (!slide || slide.classList.contains("is-done") || slide.classList.contains("is-completing")) {
      return;
    }
    const id = slide.getAttribute("data-lead-slide") || "";
    const metrics = slideMetrics(slide);
    if (!metrics) return;
    const lead =
      lastLeads.find((item) => leadId(item) === id) || savedMap[id] || null;
    if (!lead) {
      resetSlide(slide, true);
      showGenerateBlocked("Could not open that lead. Try again.");
      return;
    }
    void (async () => {
      slide.classList.remove("is-dragging", "is-returning");
      slide.classList.add("is-completing");
      setSlideX(slide, metrics.max, metrics);
      window.setTimeout(() => {
        slide.classList.remove("is-completing");
        void launchBuilderForLead(lead).then((ok) => {
          if (!ok) {
            resetSlide(slide, true);
            return;
          }
          slide.classList.add("is-done");
        });
      }, 220);
    })();
  }

  function beginSlideDrag(e, slide) {
    if (e.button != null && e.button !== 0) return false;
    if (!slide || slide.classList.contains("is-disabled") || slide.classList.contains("is-done")) {
      return false;
    }
    if (slide.classList.contains("is-completing") || slide.classList.contains("is-returning")) {
      return false;
    }
    if (slide.dataset.slideDragging === "1") return false;

    const metrics = slideMetrics(slide);
    if (!metrics || metrics.max <= 0) return false;
    const { track, thumb, max } = metrics;
    if (thumb.disabled || thumb.getAttribute("aria-disabled") === "true") return false;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const onThumb = e.target.closest(".ms-lf-slide-thumb");
    const thumbRect = thumb.getBoundingClientRect();
    const grabOffsetX = onThumb
      ? startX - (thumbRect.left + thumbRect.width / 2)
      : metrics.thumbW / 2;
    let startLeft = onThumb ? readSlideX(slide) : 0;
    startLeft = Math.max(0, Math.min(max, startLeft));
    setSlideX(slide, startLeft, metrics);
    let current = startLeft;
    let finished = false;
    let moved = false;
    let raf = 0;
    let pendingX = startLeft;
    const pointerId = e.pointerId ?? 1;
    const usePointer = e.pointerId != null;
    const captureEl = track;

    slide.dataset.slideDragging = "1";
    slide.classList.remove("is-returning", "is-completing");
    slide.classList.add("is-dragging");
    document.body.classList.add("ms-lf-slide-dragging");

    if (usePointer) {
      try {
        captureEl.setPointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
    }

    const flush = () => {
      raf = 0;
      if (finished) return;
      const live = slideMetrics(slide) || metrics;
      current = setSlideX(slide, pendingX, live);
    };

    const clientXFromEvent = (ev) => {
      if (ev.clientX != null) return ev.clientX;
      const touch = ev.changedTouches?.[0] || ev.touches?.[0];
      return touch ? touch.clientX : startX;
    };

    const onMove = (ev) => {
      if (finished) return;
      if (usePointer && ev.pointerId != null && ev.pointerId !== pointerId) return;
      if (!usePointer && ev.type === "mousemove" && ev.buttons === 0) return;
      ev.preventDefault();
      const cx = clientXFromEvent(ev);
      const liveMax = (slideMetrics(slide) || metrics).max;
      pendingX = slideXFromPointer(track, cx, liveMax, grabOffsetX);
      if (Math.abs(cx - startX) >= 2) moved = true;
      if (!raf) raf = window.requestAnimationFrame(flush);
    };

    const cleanup = (ev) => {
      if (finished) return;
      if (usePointer && ev?.pointerId != null && ev.pointerId !== pointerId) return;
      finished = true;
      delete slide.dataset.slideDragging;
      document.body.classList.remove("ms-lf-slide-dragging");
      if (raf) window.cancelAnimationFrame(raf);
      if (usePointer) {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", cleanup, true);
        window.removeEventListener("pointercancel", cleanup, true);
      } else {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseup", cleanup, true);
        window.removeEventListener("touchmove", onMove, true);
        window.removeEventListener("touchend", cleanup, true);
        window.removeEventListener("touchcancel", cleanup, true);
      }
      if (usePointer) {
        try {
          captureEl.releasePointerCapture(pointerId);
        } catch (_) {
          /* ignore */
        }
      }
      slide.classList.remove("is-dragging");
      const live = slideMetrics(slide) || metrics;
      current = setSlideX(slide, pendingX, live);
      const endX = ev ? clientXFromEvent(ev) : startX;
      const dragPx = Math.abs(endX - startX);
      if (moved && slideCompletes(current, live.max, dragPx)) completeSlide(slide);
      else resetSlide(slide, true);
    };

    if (usePointer) {
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", cleanup, true);
      window.addEventListener("pointercancel", cleanup, true);
    } else if (e.type === "touchstart") {
      window.addEventListener("touchmove", onMove, { capture: true, passive: false });
      window.addEventListener("touchend", cleanup, true);
      window.addEventListener("touchcancel", cleanup, true);
    } else {
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", cleanup, true);
    }
    return true;
  }

  function bindGenerateSlides() {
    if (!resultsEl || resultsEl.dataset.slideBound === "1") return;
    resultsEl.dataset.slideBound = "1";

    function onSlideStart(e) {
      const track = e.target.closest(".ms-lf-slide-track");
      if (!track) return;
      const slide = track.closest(".ms-lf-slide");
      if (!slide) return;
      beginSlideDrag(e, slide);
    }

    resultsEl.addEventListener("pointerdown", onSlideStart, true);
    resultsEl.addEventListener(
      "touchstart",
      (e) => {
        if (typeof window.PointerEvent === "function") return;
        onSlideStart(e);
      },
      { capture: true, passive: false }
    );
    resultsEl.addEventListener(
      "mousedown",
      (e) => {
        if (typeof window.PointerEvent === "function") return;
        onSlideStart(e);
      },
      true
    );

    resultsEl.addEventListener("keydown", (e) => {
      const thumb = e.target.closest(".ms-lf-slide-thumb");
      if (!thumb) return;
      const slide = thumb.closest(".ms-lf-slide");
      if (!slide || slide.classList.contains("is-done") || slide.classList.contains("is-completing")) {
        return;
      }
      const metrics = slideMetrics(slide);
      if (!metrics) return;
      const { max } = metrics;
      const cur = readSlideX(slide);

      if (e.key === "ArrowRight" || e.key === "End") {
        e.preventDefault();
        if (e.key === "End") completeSlide(slide);
        else {
          const next = Math.min(max, cur + Math.max(28, max * 0.22));
          slide.classList.add("is-returning");
          setSlideX(slide, next, metrics);
          if (slideCompletes(next, max, next)) completeSlide(slide);
          else window.setTimeout(() => slide.classList.remove("is-returning"), 220);
        }
      } else if (e.key === "ArrowLeft" || e.key === "Home" || e.key === "Escape") {
        e.preventDefault();
        resetSlide(slide, true);
      }
    });
  }

  function renderLeadCard(lead, index) {
    const id = leadId(lead);
    const revealDelay = Math.min((index || 0) % 8, 7) * 45;
    const alreadyVisible = revealedLeadIds.has(id);
    const name = displayName(lead);
    const category = displayCategory(lead) || "Business";
    const address = displayAddress(lead);
    const phone = displayPhone(lead);
    const openStatus = displayOpenStatus(lead);
    const website = leadWebsite(lead);
    const hasSite = leadHasWebsite(lead);
    const mapsUrl = String(lead.mapsUrl || lead.maps_url || "").trim();
    const ratingLine = formatRatingCompact(lead);
    const distanceLine =
      inMyArea && lead.distanceMiles != null
        ? lead.distanceMiles < 0.2
          ? "< 0.2 mi"
          : lead.distanceMiles.toFixed(1) + " mi"
        : "";
    const saved = isSaved(lead);
    const tel = telHref(phone || lead.phone);
    const prospectScore = window.LeadProspectRank?.getWebsiteProspectScore?.(lead) ?? 0;
    const isTopPick = prospectScore >= (window.LeadProspectRank?.TOP_MIN ?? 60);

    const addressEmpty = !address;
    const phoneEmpty = !phone;
    const hoursEmpty = !openStatus.text;
    const ratingEmpty = !ratingLine;

    const detailRows = [
      renderProRowPair(
        ICO.pin,
        "Address and hours",
        escapeHtml(address || "Address not listed"),
        escapeHtml(hoursEmpty ? "Hours not listed" : openStatus.text),
        {
          leftEmpty: addressEmpty,
          rightEmpty: hoursEmpty,
          rightStatus: openStatus.kind || "",
        }
      ),
      renderProRowPair(
        ICO.phone,
        "Phone and rating",
        phoneEmpty ? "Phone not listed" : escapeHtml(phone),
        escapeHtml(ratingEmpty ? "No reviews" : ratingLine),
        {
          leftEmpty: phoneEmpty,
          leftHref: phoneEmpty ? undefined : tel || undefined,
          rightEmpty: ratingEmpty,
        }
      ),
      renderProRowPair(
        ICO.globe,
        "Website and Google Maps",
        renderWebsiteCell(lead),
        mapsUrl ? "Google Maps" : "Maps link unavailable",
        {
          rowClass: "ms-lf-pro-row--website",
          leftHref: hasSite && website ? website : undefined,
          leftExternal: !!(hasSite && website),
          rightEmpty: !mapsUrl,
          rightHref: mapsUrl || undefined,
          rightExternal: !!mapsUrl,
        }
      ),
    ];

        return (
      '<article class="ms-card ms-lead-card ms-lf-pro ms-lf-reveal' +
      (saved ? " is-saved" : "") +
      (alreadyVisible ? " is-visible is-revealed" : "") +
      '" data-lead-id="' +
      escapeHtml(id) +
      '" style="--lf-reveal-delay:' +
      revealDelay +
      'ms">' +
      '<header class="ms-lf-pro-head">' +
      '<div class="ms-lf-pro-identity">' +
      '<div class="ms-lf-pro-avatar" style="' +
      escapeHtml(avatarStyleAttr(lead)) +
      '" aria-hidden="true">' +
      escapeHtml(displayInitials(lead)) +
      "</div>" +
      '<div class="ms-lf-pro-titles">' +
      '<h3 class="ms-lf-pro-name">' +
          escapeHtml(name) +
      "</h3>" +
      '<p class="ms-lf-pro-category">' +
      escapeHtml(category) +
      (distanceLine
        ? ' <span class="ms-lf-pro-distance">' + escapeHtml(distanceLine) + "</span>"
        : "") +
      "</p>" +
      "</div></div>" +
      '<div class="ms-lf-pro-head-actions">' +
      '<button type="button" class="ms-lf-pro-save' +
      (saved ? " is-on" : "") +
      '" data-lead-save="' +
      escapeHtml(id) +
      '" aria-label="' +
      (saved ? "Remove from Quick Save" : "Quick Save") +
      '" aria-pressed="' +
      (saved ? "true" : "false") +
      '" title="Quick Save">' +
      '<svg viewBox="0 0 24 24" fill="' +
      (saved ? "currentColor" : "none") +
      '" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>' +
      "</button></div></header>" +
      '<div class="ms-lf-pro-details" aria-label="Business details">' +
      detailRows.join("") +
      "</div>" +
      '<footer class="ms-lf-pro-foot">' +
      '<div class="ms-lf-slide" data-lead-slide="' +
      escapeHtml(id) +
      '" role="group" aria-label="Slide to generate site for ' +
      escapeHtml(name) +
      '">' +
      '<div class="ms-lf-slide-track">' +
      '<div class="ms-lf-slide-fill" aria-hidden="true"></div>' +
      '<span class="ms-lf-slide-label" aria-hidden="true">Slide to generate</span>' +
      '<button type="button" class="ms-lf-slide-thumb" aria-label="Slide to generate site for ' +
      escapeHtml(name) +
      '">' +
      ICO.hammer +
      "</button>" +
      "</div></div></footer></article>"
    );
  }

  function renderLeads(leads, query) {
    if (!resultsEl) return;
    clearLoadingCards();
    lastLeads = Array.isArray(leads) ? leads.slice() : [];
    lastQuery = query || "";

    const websiteFilter = getWebsiteFilter();
    let visible = filterClaimed(applyWebsiteFilter(lastLeads, websiteFilter));
    if (listView === "saved") {
      const fromSearch = applyListFilter(visible);
      visible = fromSearch.length
        ? fromSearch
        : filterClaimed(applyWebsiteFilter(savedLeadsList(), websiteFilter));
    }

    revealResults();
    void refreshListCount(visible.length);

    if (!visible.length) {
      const nearbyEmpty =
        inMyArea &&
        "No businesses found within 5 miles. Try a specific category (e.g. Plumber, Barbershop) or turn off Near me.";
      resultsEl.innerHTML =
        '<div class="ms-dash-empty">' +
        (listView === "saved"
          ? "No Quick Save businesses yet. Heart a lead on Available to keep it here."
          : nearbyEmpty
            ? nearbyEmpty
            : leadsReady
              ? 'No leads match "' + escapeHtml(query) + '". Try another type or city.'
              : "No leads loaded yet. Refresh the page or check your connection.") +
        "</div>";
      setStatus("");
      return;
    }

    const isQuickSave = listView === "saved";
    const shown = isQuickSave ? visible : visible.slice(0, displayLimit);
    const uiHasMore = !isQuickSave && visible.length > displayLimit;
    const dbHasMore =
      !isQuickSave && isDbConnected() && window.LeadsLoader?.hasMoreCached?.();
    const hasMore = uiHasMore || dbHasMore;
    let moreLabel = "";
    if (dbHasMore) {
      moreLabel = "Load more";
    } else if (uiHasMore) {
      moreLabel = "Show more";
    }

    resultsEl.innerHTML =
      shown.map((lead, index) => renderLeadCard(lead, index)).join("") +
      (hasMore
        ? '<div class="ms-lf-more-wrap"><button type="button" class="ms-btn ms-btn-secondary" id="lf-load-more">' +
          escapeHtml(moreLabel || "Show more") +
          "</button></div>"
        : "");

    observeLeadReveals(resultsEl);

    if (websiteFilter === "without") {
      enqueueWebsiteVerification(shown);
    }
  }

  function refreshVisibleLeads() {
    if (listView === "saved" && !lastLeads.length) {
      renderLeads(savedLeadsList(), "Quick Save");
      setStatus("");
      return;
    }
    if (!lastLeads.length) return;
    renderLeads(lastLeads, lastQuery);
  }

  function paintPreloadedLeads(leads) {
    allLeads = rankLeadList(Array.isArray(leads) ? leads : []);
    leadsReady = allLeads.length > 0;
    if (shouldSkipBulkPaint()) return false;
    displayLimit = DISPLAY_PAGE;
    if (!allLeads.length) return false;
    setStatus("");
    renderLeads(allLeads, "All leads");
    return true;
  }

  async function preloadAllLeads() {
    if (!isDbConnected()) {
      window.LeadsLoader?.clearCache?.();
      allLeads = [];
      leadsReady = false;
      showSearchPrompt();
      return;
    }
    if (leadsLoading) return;
    const loader = window.LeadsLoader;
    if (!loader?.load) {
      setError("Leads loader is not available.");
      return;
    }
    leadsLoading = true;
    setError("");
    setStatus("");
    showLoadingCards();
    try {
      const cached = loader.peekCache?.();
      let paintedFromCache = false;
      if (cached?.leads?.length) {
        paintedFromCache = paintPreloadedLeads(cached.leads);
        if (paintedFromCache) clearLoadingCards();
      }

      const data = await loader.load({
        watch: true,
        onPartial: (payload) => {
          if (!payload?.leads?.length) return;
          if (shouldSkipBulkPaint()) return;
          if (typeInput?.value?.trim() || locationInput?.value?.trim()) return;
          paintPreloadedLeads(payload.leads);
          clearLoadingCards();
        },
      });

      if (!paintPreloadedLeads(data?.leads || [])) {
        clearLoadingCards();
        setStatus("No leads in the database yet.");
        setListCount(0);
        resultsEl.innerHTML =
          '<div class="ms-dash-empty">No leads in the database yet.</div>';
        return;
      }
      clearLoadingCards();
      if (data?.fromCache && paintedFromCache) {
        loader.checkForUpdates?.().catch(() => null);
      }
      void prefetchRemainingSupabaseLeads();
    } catch (e) {
      console.error(e);
      clearLoadingCards();
      setError(e?.message || "Could not load leads from Supabase.");
      setStatus("");
      resultsEl.innerHTML =
        '<div class="ms-dash-empty">Could not load leads. Check your connection and refresh.</div>';
    } finally {
      leadsLoading = false;
    }
  }

  async function findNearbyLeads(options) {
    const opts = options && typeof options === "object" ? options : {};
    const token = areaRequestToken;
    if (!userCoords) {
      const ok = await enableInMyArea({ autoSearch: false });
      if (!ok || token !== areaRequestToken) return;
    }
    const searchType = nearbySearchType(typeInput?.value || "");
    const scrapeType = searchType || "businesses";
    const websiteFilter = getWebsiteFilter();
    const query = searchType ? searchType + " near you" : "Businesses near you";

    setError("");
    setStatus("");
    hideAllSuggests();
    displayLimit = DISPLAY_PAGE;
    resetLeadReveals();
    setFindBusy(true);
    if (!opts.fromAreaToggle) showLoadingCards();

    let leads = [];
    let remoteError = "";
    let scrapedFresh = false;

    try {
      if (isDbConnected()) {
        const db = await searchSupabaseLeads(scrapeType, "", websiteFilter);
        if (db.ok && db.leads?.length) {
          leads = applyWebsiteFilter(
            applyNearbyFilterAndSort(db.leads, userCoords, NEARBY_RADIUS_MILES, {
              trustScrapeRadius: false,
              includeUnknownDistance: false,
            }),
            websiteFilter
          );
          mergeScrapedIntoAllLeads(db.leads);
        } else if (db.reason === "sign_in_required") {
          remoteError = "Sign in to search Business Finder leads.";
        } else if (!db.skipped && db.error) {
          remoteError = db.error;
        }
      }

      if (!leads.length && shouldTryLiveScrape()) {
        const scraped = await scrapeViaLeadFinder(scrapeType, "", "", {
          latitude: userCoords.lat,
          longitude: userCoords.lng,
          radiusMiles: NEARBY_RADIUS_MILES,
        });
        if (scraped.ok && scraped.leads?.length) {
          scrapedFresh = true;
          leads = applyWebsiteFilter(scraped.leads, websiteFilter);
          leads = applyNearbyFilterAndSort(leads, userCoords, NEARBY_RADIUS_MILES, {
            trustScrapeRadius: true,
            includeUnknownDistance: true,
          });
          mergeScrapedIntoAllLeads(scraped.leads);
        } else if (!scraped.skipped) {
          remoteError = scraped.error || "Nearby scrape returned no leads";
          console.warn("Nearby scrape:", remoteError);
        }
      }

      if (!leads.length && allLeads.length) {
        const pool = applyWebsiteFilter(
          searchType ? filterLocalLeads(searchType, "") : allLeads.slice(),
          websiteFilter
        );
        leads = applyNearbyFilterAndSort(pool, userCoords, NEARBY_RADIUS_MILES, {
          includeUnknownDistance: false,
        });
      }

      if (!leads.length) {
        if (remoteError) {
          setError(remoteError);
        }
      } else {
        setStatus("");
        setError("");
      }

      if (!inMyArea || token !== areaRequestToken) return;

      renderLeads(
        rankLeadsForView(leads, { trustScrapeRadius: scrapedFresh }),
        query
      );
    } finally {
      setFindBusy(false);
    }
  }

  function mergeScrapedIntoAllLeads(scrapedLeads) {
    const byKey = new Map();
    allLeads.forEach((lead) => {
      const key = leadId(lead) || lead.mapsUrl || lead.name;
      if (key) byKey.set(key, lead);
    });
    (scrapedLeads || []).forEach((lead) => {
      const key = leadId(lead) || lead.mapsUrl || lead.name;
      if (key) byKey.set(key, lead);
    });
    allLeads = rankLeadList(Array.from(byKey.values()));
    leadsReady = allLeads.length > 0;
  }

  async function findLeads(options) {
    if (inMyArea) {
      await findNearbyLeads(options);
      return;
    }

    const opts = options && typeof options === "object" ? options : {};
    const normalized = normalizeSearchInputs(typeInput?.value || "", locationInput?.value || "");
    let searchType = normalized.type;
    let location = normalized.location;
    const websiteFilter = getWebsiteFilter();

    const query = buildQuery(searchType, location);
    if (searchType || location.trim()) {
      stopPrefetchSupabaseLeads();
    }
    if (!searchType && !location.trim()) {
      setError("");
      setStatus("");
      hideAllSuggests();
      displayLimit = DISPLAY_PAGE;
      resetLeadReveals();

      if (!allLeads.length && isDbConnected()) {
        setFindBusy(true);
        if (!opts.fromAreaToggle) showLoadingCards();
        try {
          await preloadAllLeads();
        } finally {
          setFindBusy(false);
        }
        return;
      }

      if (!allLeads.length) {
        showSearchPrompt();
        return;
      }

      renderLeads(rankLeadList(allLeads), "All leads");
      return;
    }
    setError("");
    setStatus("");
    hideAllSuggests();
    displayLimit = DISPLAY_PAGE;
    resetLeadReveals();

    setFindBusy(true);
    if (!opts.fromAreaToggle) showLoadingCards();

    let leads = [];
    let remoteError = "";
    let scrapedFresh = false;

    try {
      if (isDbConnected()) {
        const db = await searchSupabaseLeads(searchType, location, websiteFilter);
        if (db.ok && db.leads?.length) {
          leads = applyWebsiteFilter(db.leads, websiteFilter);
          mergeScrapedIntoAllLeads(db.leads);
        } else if (db.reason === "sign_in_required") {
          remoteError = "Sign in to search Business Finder leads.";
        } else if (!db.skipped && db.error) {
          remoteError = db.error;
          console.warn("Business Finder Supabase search:", remoteError);
        }
      }

      if (!leads.length && shouldTryLiveScrape() && (searchType || location.trim())) {
        const scraped = await scrapeViaLeadFinder(searchType, location, "", null);
        if (scraped.ok && scraped.leads?.length) {
          scrapedFresh = true;
          leads = applyWebsiteFilter(scraped.leads, websiteFilter);
          mergeScrapedIntoAllLeads(scraped.leads);
        } else if (!scraped.skipped) {
          remoteError = scraped.error || "Live scrape returned no leads";
          console.warn("LeadFinder scrape:", remoteError);
        }
      }

      if (!leads.length && allLeads.length) {
        leads = filterLocalLeads(searchType, location);
        leads = applyWebsiteFilter(leads, websiteFilter);
      }

      setStatus("");
      if (remoteError && !leads.length) {
        setError(remoteError);
      }
      renderLeads(rankLeadList(leads), query);
    } finally {
      setFindBusy(false);
    }
  }

  function scoreSuggestMatch(label, query) {
    const q = String(query || "").trim().toLowerCase();
    const low = String(label || "").toLowerCase();
    if (!q) return 1;
    if (low === q) return 100;
    if (low.startsWith(q)) return 80;
    if (low.includes(" " + q) || low.includes(q)) return 50;
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length && tokens.every((t) => low.includes(t))) return 40;
    return 0;
  }

  function locationPool() {
    const seen = new Set();
    const out = [];
    function push(raw) {
      const v = String(raw || "").trim();
      if (!v || v.length < 2) return;
      const key = v.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(v);
    }
    LOCATION_SEED.forEach(push);
    (allLeads || []).forEach((lead) => {
      const addr = String(lead.address || lead.city_state_zip || "").trim();
      if (!addr) return;
      // Prefer "City, ST" style chunks
      const cityState = addr.match(/([A-Za-z .'-]+,\s*[A-Z]{2})(?:\s+\d{5})?/);
      if (cityState) push(cityState[1].trim());
      else {
        const parts = addr.split(",");
        if (parts.length >= 2) push(parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim().replace(/\d{5}.*$/, "").trim());
      }
    });
    return out;
  }

  function buildTypeSuggestions(query, limit) {
    const max = Math.min(Math.max(Number(limit) || 8, 4), 10);
    const q = String(query || "").trim();
    const scored = TYPE_CATALOG.map((label) => ({
      label,
      meta: "Category",
      value: label,
      score: scoreSuggestMatch(label, q),
    })).filter((row) => (q ? row.score > 0 : true));
    scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    if (!q) return scored.slice(0, max);
    return scored.slice(0, max);
  }

  function buildLocationSuggestions(query, limit) {
    const max = Math.min(Math.max(Number(limit) || 8, 4), 10);
    const q = String(query || "").trim();
    const scored = locationPool()
      .map((label) => ({
        label,
        meta: "Location",
        value: label,
        score: scoreSuggestMatch(label, q),
      }))
      .filter((row) => (q ? row.score > 0 : true));
    scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    return scored.slice(0, max);
  }

  const suggestState = {
    type: { active: -1, open: false, timer: null },
    location: { active: -1, open: false, timer: null },
  };

  function hideSuggest(kind) {
    const list = document.getElementById(kind === "type" ? "lf-type-suggest" : "lf-location-suggest");
    const wrap = document.getElementById(kind === "type" ? "lf-type-wrap" : "lf-location-wrap");
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    if (wrap) wrap.setAttribute("aria-expanded", "false");
    suggestState[kind].open = false;
    suggestState[kind].active = -1;
  }

  function hideAllSuggests() {
    hideSuggest("type");
    hideSuggest("location");
  }

  function renderSuggest(kind) {
    const isType = kind === "type";
    const input = isType ? typeInput : locationInput;
    const list = document.getElementById(isType ? "lf-type-suggest" : "lf-location-suggest");
    const wrap = document.getElementById(isType ? "lf-type-wrap" : "lf-location-wrap");
    if (!input || !list) return;
    if (document.activeElement !== input) {
      hideSuggest(kind);
      return;
    }
    const rows = isType
      ? buildTypeSuggestions(input.value, 9)
      : buildLocationSuggestions(input.value, 9);
    if (!rows.length) {
      hideSuggest(kind);
      return;
    }
    if (suggestState[kind].active >= rows.length) suggestState[kind].active = rows.length - 1;
    list.innerHTML = rows
      .map((row, idx) => {
        const on = idx === suggestState[kind].active;
        return (
          '<li class="ms-lf-suggest-item' +
          (on ? " is-active" : "") +
          '" role="option" id="lf-' +
          kind +
          "-opt-" +
          idx +
          '" data-value="' +
          escapeHtml(row.value) +
          '" aria-selected="' +
          (on ? "true" : "false") +
          '">' +
          '<span class="ms-lf-suggest-label">' +
          escapeHtml(row.label) +
          "</span>" +
          (row.meta
            ? '<span class="ms-lf-suggest-meta">' + escapeHtml(row.meta) + "</span>"
            : "") +
          "</li>"
        );
      })
      .join("");
    list.hidden = false;
    if (wrap) wrap.setAttribute("aria-expanded", "true");
    suggestState[kind].open = true;
  }

  function applySuggest(kind, value) {
    const input = kind === "type" ? typeInput : locationInput;
    if (!input || !value) return;
    input.value = value;
    syncFieldClear(kind);
    hideSuggest(kind);
    input.focus();
    if (kind === "type") {
      document.querySelectorAll("#lf-tags button").forEach((b) => {
        b.classList.toggle("is-active", (b.getAttribute("data-type") || "") === value);
      });
    }
  }

  function syncFieldClear(kind) {
    const input = kind === "type" ? typeInput : locationInput;
    const clearBtn = document.getElementById(kind === "type" ? "lf-type-clear" : "lf-location-clear");
    if (!clearBtn) return;
    const hasValue = !!(input && String(input.value || "").trim());
    clearBtn.hidden = !hasValue;
  }

  function clearField(kind) {
    const input = kind === "type" ? typeInput : locationInput;
    if (!input) return;
    if (kind === "location" && inMyArea) {
      disableInMyArea();
      return;
    }
    input.value = "";
    hideSuggest(kind);
    syncFieldClear(kind);
    if (kind === "type") {
      document.querySelectorAll("#lf-tags button").forEach((b) => b.classList.remove("is-active"));
    }
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (
      !inMyArea &&
      !typeInput?.value?.trim() &&
      !locationInput?.value?.trim() &&
      allLeads.length
    ) {
      displayLimit = DISPLAY_PAGE;
      resetLeadReveals();
      renderLeads(allLeads, "All leads");
      setStatus("");
    }
  }

  function bindSuggestField(kind) {
    const input = kind === "type" ? typeInput : locationInput;
    const list = document.getElementById(kind === "type" ? "lf-type-suggest" : "lf-location-suggest");
    const clearBtn = document.getElementById(kind === "type" ? "lf-type-clear" : "lf-location-clear");
    if (!input || !list) return;

    const schedule = () => {
      clearTimeout(suggestState[kind].timer);
      suggestState[kind].timer = setTimeout(() => {
        suggestState[kind].timer = null;
        renderSuggest(kind);
      }, 80);
    };

    input.addEventListener("focus", () => {
      if (kind === "location" && inMyArea) return;
      hideSuggest(kind === "type" ? "location" : "type");
      renderSuggest(kind);
    });
    input.addEventListener("input", () => {
      if (kind === "location" && inMyArea) return;
      syncFieldClear(kind);
      schedule();
    });
    input.addEventListener("keydown", (e) => {
      if (!suggestState[kind].open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        renderSuggest(kind);
      }
      const items = [...list.querySelectorAll(".ms-lf-suggest-item")];
      if (!items.length) {
        if (e.key === "Escape") hideSuggest(kind);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestState[kind].active = Math.min(items.length - 1, suggestState[kind].active + 1);
        renderSuggest(kind);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestState[kind].active = Math.max(0, suggestState[kind].active - 1);
        renderSuggest(kind);
      } else if (e.key === "Enter" && suggestState[kind].active >= 0) {
        e.preventDefault();
        const row = items[suggestState[kind].active];
        applySuggest(kind, row?.getAttribute("data-value") || "");
      } else if (e.key === "Escape") {
        hideSuggest(kind);
      }
    });

    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearField(kind);
    });

    list.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ms-lf-suggest-item");
      if (!item) return;
      e.preventDefault();
      applySuggest(kind, item.getAttribute("data-value") || "");
    });

    syncFieldClear(kind);
  }

  function renderPopularTags() {
    const host = document.getElementById("lf-tags");
    if (!host) return;
    host.innerHTML = TYPE_CATALOG.map((label) => {
      return (
        '<button type="button" data-type="' +
        escapeHtml(label) +
        '">' +
        escapeHtml(label) +
        "</button>"
      );
    }).join("");
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    findLeads();
  });

  document.getElementById("lf-website-filter")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-website]");
    if (!btn) return;
    document.querySelectorAll("#lf-website-filter .ms-lf-website-btn").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    if (listView === "saved") {
      resetLeadReveals();
      refreshVisibleLeads();
      return;
    }
    if (allLeads.length || inMyArea) {
      displayLimit = DISPLAY_PAGE;
      const type = typeInput?.value || "";
      const location = locationInput?.value || "";
      if (type.trim() || location.trim() || inMyArea) {
        findLeads();
      } else {
        resetLeadReveals();
        renderLeads(allLeads, "All leads");
        setStatus("");
      }
      return;
    }
    if (typeInput?.value?.trim() || locationInput?.value?.trim() || inMyArea) {
      findLeads();
    } else if (lastLeads.length) {
      resetLeadReveals();
      refreshVisibleLeads();
    }
  });

  document.getElementById("lf-list-view")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-list-view]");
    if (!btn) return;
    const next = btn.getAttribute("data-list-view") || "default";
    if (next === listView) return;
    listView = next;
    syncListViewToggle();
    resetLeadReveals();
    refreshVisibleLeads();
  });

  resultsEl?.addEventListener("click", (e) => {
    if (e.target.closest("#lf-load-more")) {
      e.preventDefault();
      const visibleCount = Math.min(displayLimit + DISPLAY_PAGE, lastLeads.length);
      if (displayLimit + DISPLAY_PAGE < lastLeads.length) {
        displayLimit += DISPLAY_PAGE;
        refreshVisibleLeads();
        return;
      }
      if (isDbConnected() && window.LeadsLoader?.hasMoreCached?.()) {
        void loadMoreFromSupabase().then((loaded) => {
          if (!loaded) {
            displayLimit += DISPLAY_PAGE;
            refreshVisibleLeads();
            return;
          }
          void prefetchRemainingSupabaseLeads();
        });
        return;
      }
      displayLimit += DISPLAY_PAGE;
      refreshVisibleLeads();
      return;
    }
    if (e.target.closest(".ms-lf-slide-thumb")) return;
    if (e.target.closest(".ms-lf-slide-track")) {
      e.preventDefault();
      return;
    }
    const btn = e.target.closest("[data-lead-save]");
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute("data-lead-save") || "";
    const lead =
      lastLeads.find((item) => leadId(item) === id) ||
      savedMap[id] ||
      null;
    if (!lead) return;
    const on = toggleSaved(lead);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Remove from Quick Save" : "Quick Save");
    const heart = btn.querySelector("svg");
    if (heart) heart.setAttribute("fill", on ? "currentColor" : "none");
    const card = btn.closest(".ms-lead-card");
    if (card) card.classList.toggle("is-saved", on);
    if (listView === "saved") refreshVisibleLeads();
  });

  bindGenerateSlides();

  document.getElementById("lf-tags")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (!btn || !typeInput) return;
    typeInput.value = btn.getAttribute("data-type") || "";
    syncFieldClear("type");
    typeInput.focus();
    hideAllSuggests();
    document.querySelectorAll("#lf-tags button").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    if (allLeads.length || isDbConnected() || shouldTryLiveScrape()) findLeads();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".ms-lf-suggest-wrap")) return;
    hideAllSuggests();
  });

  let booted = false;

  function initDevNotice() {
    const notice = document.getElementById("lf-dev-notice");
    if (!notice) return;
    try {
      if (localStorage.getItem(DEV_NOTICE_KEY) === "1") {
        notice.classList.add("is-hidden");
        return;
      }
    } catch (e) {
      /* ignore */
    }
    const dismiss = () => {
      notice.classList.add("is-hidden");
      try {
        localStorage.setItem(DEV_NOTICE_KEY, "1");
      } catch (e) {
        /* ignore */
      }
    };
    notice.addEventListener("click", dismiss);
    notice.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dismiss();
      }
    });
  }

  function bootLeadsSearch() {
    if (booted || document.body?.dataset?.page !== "leads") return;
    if (isDbConnected()) showLoadingCards();
    const run = () => {
      if (booted) return;
      booted = true;
      try {
        initDevNotice();
        renderPopularTags();
        bindSuggestField("type");
        bindSuggestField("location");
        bindAreaToggle();
        syncListViewToggle();
        void hydrateClaimedFromProjects().then((changed) => {
          if (changed && lastLeads.length) refreshVisibleLeads();
        });
        void preloadAllLeads();
      } catch (e) {
        console.error(e);
        clearLoadingCards();
        setError("Business Finder failed to start. Refresh the page.");
        if (resultsEl) {
          resultsEl.hidden = false;
          resultsEl.innerHTML =
            '<div class="ms-dash-empty">Business Finder failed to start. Refresh the page.</div>';
        }
      }
    };
    if (document.body?.dataset?.msAuthFired === "1") {
      run();
      return;
    }
    document.addEventListener("ms:auth-ready", run, { once: true });
    void window.StudioAuth?.getSession?.().then((session) => {
      if (session) run();
    });
    setTimeout(() => {
      if (!booted) run();
    }, 12000);
  }

  window.LeadHandoff = {
    release: releaseLeadClaim,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootLeadsSearch);
  } else {
    bootLeadsSearch();
  }

  window.addEventListener("leads-page-appended", (e) => {
    if (document.body?.dataset?.page !== "leads") return;
    const appended = e.detail?.appended;
    if (!Array.isArray(appended) || !appended.length) return;
    mergeScrapedIntoAllLeads(appended);
    if (!typeInput?.value?.trim() && !locationInput?.value?.trim() && !inMyArea) {
      renderLeads(allLeads, "All leads");
    }
  });

  window.addEventListener("leads-cache-refreshed", (e) => {
    if (document.body?.dataset?.page !== "leads") return;
    if (!isDbConnected()) return;
    if (shouldSkipBulkPaint()) return;
    const payload = e.detail;
    if (!payload?.leads?.length) return;
    allLeads = rankLeadList(payload.leads.slice());
    leadsReady = true;
    if (!typeInput?.value?.trim() && !locationInput?.value?.trim()) {
      renderLeads(allLeads, "All leads");
      setStatus("");
    }
  });
})();
