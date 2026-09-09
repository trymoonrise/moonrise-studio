/**
 * Lead Finder - map-first search + slide-to-generate.
 */
(function () {
  const MAP_UI = !!document.getElementById("lf-map");
  const typeInput = document.getElementById("lf-type");
  const locationInput = document.getElementById("lf-location");
  const queryInput = document.getElementById("lf-query");
  const areaToggle = document.getElementById("lf-area-toggle");
  const form = document.getElementById("lf-form");
  const statusEl = document.getElementById("lf-status");
  const errorEl = document.getElementById("lf-error");
  const resultsEl = document.getElementById("lf-results");
  const resultsPanel = document.getElementById("lf-results-panel");
  const sheetHandle = document.getElementById("lf-sheet-handle");
  const listCountEl = document.getElementById("lf-list-count");
  const findBtn = document.getElementById("lf-find");
  const searchPill = document.getElementById("lf-search-pill");
  const searchToggle = document.getElementById("lf-search-toggle");
  const menuToggleBtn = document.getElementById("lf-menu-toggle");
  const locateBtn = document.getElementById("lf-locate");
  const scanNearBtn = document.getElementById("lf-scan-near");
  const scanAllBtn = document.getElementById("lf-scan-all");
  const SAVED_KEY = "ms_lf_quick_save_v1";
  const CLAIMED_KEY = "ms_lf_claimed_v1";
  const AREA_PREF_KEY = "ms_lf_in_my_area_v1";
  const NEARBY_RADIUS_MILES = 10;
  const AREA_LOCATION_LABEL = "Using your location";
  const DISPLAY_PAGE = MAP_UI ? 40 : 100;
  const MAP_MARKER_LIMIT = 120;
  const LOADING_CARD_COUNT = MAP_UI ? 2 : 6;
  const MIN_SEARCH_RESULTS = MAP_UI ? 18 : 50;
  const MAP_DEFAULT = { lat: 34.05, lng: -118.25, zoom: 8 };
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
  let lfMap = null;
  let lfMarkersLayer = null;
  let lfMarkerById = new Map();
  let selectedLeadId = "";
  let userLocationMarker = null;
  let mapResizeTimer = null;
  let mapIconDefault = null;
  let mapIconSelected = null;
  let lastMarkerSignature = "";
  let lastMarkerIdsSignature = "";
  let mapIdlePreloadTimer = null;

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

  function parseCoordNumber(value) {
    if (value == null || value === "") return NaN;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function coordsFromMapsUrl(url) {
    const href = String(url || "");
    let match = href.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    match = href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
    return null;
  }

  function leadCoords(lead) {
    // Empty-string lat/lng from fast scrapes become Number("") === 0 — do not
    // treat that as Null Island or Near Me filters wipe every result.
    let lat = parseCoordNumber(lead?.latitude ?? lead?.lat);
    let lng = parseCoordNumber(lead?.longitude ?? lead?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      const fromUrl = coordsFromMapsUrl(lead?.mapsUrl || lead?.maps_url);
      if (!fromUrl) return null;
      lat = fromUrl.lat;
      lng = fromUrl.lng;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
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

    // Live Maps scrape already centered on the user — if every parsed pin
    // falls outside the radius (bad coords), keep the scrape instead of empty.
    if (!inRadius.length && opts.trustScrapeRadius && (leads || []).length) {
      return withDistance
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .map((row) => ({
          ...row.lead,
          distanceMiles: Math.round(row.distanceMiles * 10) / 10,
        }))
        .concat(
          withoutDistance.map((row) => ({ ...row.lead, distanceMiles: null }))
        );
    }

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
    if (coords.searchCity || coords.searchRegion || coords.searchState) {
      return {
        city: coords.searchCity || "",
        region: coords.searchRegion || "",
        state: coords.searchState || stateDisplayName(coords.searchRegion || ""),
        label: coords.searchLabel || "",
      };
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
      const regionCode = String(data?.principalSubdivisionCode || "")
        .trim()
        .replace(/^US-/i, "");
      const regionName = String(data?.principalSubdivision || "").trim();
      const region = regionCode || regionName;
      const state = stateDisplayName(regionCode || regionName);
      const label = city && region ? city + ", " + (regionCode || region) : city || state || region || "";
      coords.searchCity = city;
      coords.searchRegion = region;
      coords.searchState = state;
      coords.searchLabel = label;
      return { city, region, state, label };
    } catch (_) {
      return null;
    }
  }

  const US_STATE_BY_CODE = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  };

  function stateDisplayName(region) {
    const raw = String(region || "").trim();
    if (!raw) return "";
    if (/^[A-Za-z]{2}$/.test(raw)) {
      return US_STATE_BY_CODE[raw.toUpperCase()] || raw.toUpperCase();
    }
    const low = raw.toLowerCase();
    const match = Object.values(US_STATE_BY_CODE).find((n) => n.toLowerCase() === low);
    return match || raw;
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
    // Local LeadFinderCloud does not need auth; sending Authorization
    // triggers a CORS preflight that used to fail and look "offline".
    const base = leadFinderBaseUrl();
    if (!isWorkerLeadFinderBase(base)) return headers;
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

  const LOCATION_DENIED_MSG =
    "Location is blocked for this site. Allow location, then tap again. " +
    "If you chose Don’t allow, open the lock/info icon in the address bar → Site settings → Location → Allow.";

  let locationPermissionState = "unknown";
  let locationPermissionWatchBound = false;

  function isLocationDeniedError(err) {
    return /permission denied|location is blocked|don’t allow|don't allow/i.test(
      String(err?.message || err || "")
    );
  }

  async function queryGeolocationPermission() {
    try {
      if (!navigator.permissions?.query) return "unknown";
      const status = await navigator.permissions.query({ name: "geolocation" });
      locationPermissionState = status.state || "unknown";
      if (!locationPermissionWatchBound && typeof status.addEventListener === "function") {
        locationPermissionWatchBound = true;
        status.addEventListener("change", () => {
          locationPermissionState = status.state || "unknown";
          if (status.state === "granted" && MAP_UI && !userCoords) {
            void ensureUserLocation({ quiet: true, fly: true });
          }
        });
      }
      return locationPermissionState;
    } catch (_) {
      return "unknown";
    }
  }

  function syncLocationChrome(denied) {
    locateBtn?.classList.toggle("is-location-blocked", !!denied);
    locateBtn?.setAttribute("aria-pressed", denied ? "false" : locateBtn.getAttribute("aria-pressed") || "false");
    if (denied) {
      locateBtn?.setAttribute(
        "title",
        "Location blocked — tap to allow access"
      );
    } else {
      locateBtn?.setAttribute("title", "My location");
    }
  }

  /**
   * Always hits the browser geolocation API (never skips after a prior denial).
   * Browsers only re-show the native dialog when state is "prompt"; if permanently
   * blocked we still call it and surface clear steps to re-enable.
   */
  function requestUserLocation(options) {
    const opts = options && typeof options === "object" ? options : {};
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
          locationPermissionState = "granted";
          syncLocationChrome(false);
          resolve({ lat, lng, accuracyMeters: Number(pos?.coords?.accuracy) || null });
        },
        (err) => {
          const code = Number(err?.code);
          if (code === 1) {
            locationPermissionState = "denied";
            syncLocationChrome(true);
            reject(Object.assign(new Error(LOCATION_DENIED_MSG), { code: 1, permissionDenied: true }));
          } else if (code === 2) {
            reject(new Error("Location unavailable. Try again or enter a city manually."));
          } else if (code === 3) {
            reject(new Error("Location request timed out. Try again."));
          } else {
            reject(new Error(err?.message || "Could not get your location."));
          }
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy !== false,
          timeout: Number(opts.timeout) > 0 ? Number(opts.timeout) : 15000,
          // Fresh fix when the user taps Locate / Scan Near Me.
          maximumAge: opts.fresh ? 0 : Number.isFinite(opts.maximumAge) ? opts.maximumAge : 60000,
        }
      );
    });
  }

  async function ensureUserLocation(options) {
    const opts = options && typeof options === "object" ? options : {};
    await queryGeolocationPermission();
    try {
      const coords = await requestUserLocation({
        fresh: opts.fresh !== false,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
        enableHighAccuracy: opts.enableHighAccuracy,
      });
      userCoords = coords;
      syncLocationChrome(false);
      if (opts.fly !== false && MAP_UI) flyToUserLocation(coords);
      return coords;
    } catch (e) {
      if (!opts.quiet) {
        setError(e?.message || LOCATION_DENIED_MSG);
        if (MAP_UI && isLocationDeniedError(e)) {
          setStatus("Allow location to scan businesses near you.");
          revealResults();
        }
      }
      throw e;
    }
  }

  /** First open: ask the browser for location and center the map (no auto-scan). */
  async function promptMapLocationOnOpen() {
    if (!MAP_UI) return;
    try {
      await ensureUserLocation({
        fresh: false,
        maximumAge: 120000,
        fly: true,
        quiet: true,
      });
      setStatus("");
    } catch (e) {
      syncLocationChrome(isLocationDeniedError(e));
      if (isLocationDeniedError(e)) {
        setStatus("Allow location to scan businesses near you.");
      }
    }
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
      setFindBusy(true, "near");
    }
    try {
      // Always re-prompt the browser — do not reuse a prior denial.
      const coords = await ensureUserLocation({ fresh: true, fly: !!MAP_UI, quiet: true });
      if (token !== areaRequestToken) return false;
      userCoords = coords;
      inMyArea = true;
      persistAreaPref(true);
      setAreaLocationField();
      syncAreaUi();
      hideSuggest("location");
      setError("");
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
      setError(e?.message || LOCATION_DENIED_MSG);
      if (MAP_UI) {
        setStatus("Allow location to scan businesses near you.");
        revealResults();
      }
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
    selectedLeadId = "";
    if (MAP_UI) {
      if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.hidden = false;
      }
      hideResultsPanel();
      lastMarkerSignature = "";
      lastMarkerIdsSignature = "";
      syncMapMarkers([]);
      setSearchPillMode("idle");
      return;
    }
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
    // Live Maps via local :8790 (dev) or worker → LEADFINDER_SEARCH_URL (prod).
    return Boolean(leadFinderBaseUrl());
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
    // Map Finder starts idle; Near Me is explicit via Scan Near Me.
    if (readAreaPref() && !MAP_UI) {
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

  function generationBlockedMessage() {
    return "A website is already being generated. Wait for it to finish before starting another.";
  }

  function syncGenerateSlideLockState() {
    /* Slides stay interactive; builder enforces one generation at a time. */
  }

  function refreshGenerateSlideLockState() {
    return false;
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
    // Hide scrape chatter on legacy list UI; map Finder shows short scan notes.
    if (!msg || (!MAP_UI && /scraping|searching|loading leads|scanning/i.test(msg))) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
  }

  function setFindBusy(busy, source) {
    const src = source || (MAP_UI ? "near" : "find");
    if (findBtn) {
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

    const nearLoading = !!busy && (src === "near" || (MAP_UI && src === "find"));
    const allLoading = !!busy && src === "all";

    if (scanNearBtn) {
      scanNearBtn.disabled = !!busy;
      scanNearBtn.classList.toggle("is-loading", nearLoading);
      scanNearBtn.setAttribute("aria-busy", nearLoading ? "true" : "false");
      if (nearLoading) {
        if (!scanNearBtn.dataset.prevLabel) {
          scanNearBtn.dataset.prevLabel = scanNearBtn.textContent || "Scan nearby";
        }
        scanNearBtn.innerHTML =
          '<span class="ms-lf-map-scan-spin" aria-hidden="true"></span><span class="ms-lf-map-scan-label">Scanning…</span>';
      } else if (scanNearBtn.dataset.prevLabel) {
        scanNearBtn.textContent = scanNearBtn.dataset.prevLabel;
        delete scanNearBtn.dataset.prevLabel;
      } else if (!busy) {
        scanNearBtn.classList.remove("is-loading");
        scanNearBtn.removeAttribute("aria-busy");
      }
    }

    if (scanAllBtn) {
      scanAllBtn.disabled = !!busy;
      scanAllBtn.classList.toggle("is-loading", allLoading);
      scanAllBtn.setAttribute("aria-busy", allLoading ? "true" : "false");
      if (allLoading) {
        if (!scanAllBtn.dataset.prevLabel) {
          scanAllBtn.dataset.prevLabel = scanAllBtn.textContent || "All";
        }
        scanAllBtn.innerHTML =
          '<span class="ms-lf-map-scan-spin" aria-hidden="true"></span>';
        scanAllBtn.setAttribute("title", "Scanning…");
      } else if (scanAllBtn.dataset.prevLabel) {
        scanAllBtn.textContent = scanAllBtn.dataset.prevLabel;
        scanAllBtn.setAttribute("title", "All businesses in the state");
        delete scanAllBtn.dataset.prevLabel;
      } else if (!busy) {
        scanAllBtn.classList.remove("is-loading");
        scanAllBtn.removeAttribute("aria-busy");
      }
    }
  }

  function setListCount(n) {
    if (!listCountEl) return;
    const count = Math.max(0, Number(n) || 0);
    if (MAP_UI) {
      listCountEl.textContent =
        count.toLocaleString() + " Business" + (count === 1 ? "" : "es");
      listCountEl.hidden = false;
      return;
    }
    listCountEl.textContent = count.toLocaleString() + " lead" + (count === 1 ? "" : "s");
    listCountEl.hidden = false;
  }

  function setResultsPanelOpen(open) {
    if (!resultsPanel) return;
    if (open) revealResults();
    else if (!resultsEl?.classList.contains("is-loading") && !(lastLeads || []).length) {
      hideResultsPanel();
    }
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
    // Map Finder is scan-driven; prefetching the full DB on idle wastes bandwidth/CPU.
    if (MAP_UI) return false;
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

  function schedulePrefetchSupabaseLeads() {
    const run = () => void prefetchRemainingSupabaseLeads();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 400);
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

  function hydrateLeadCoords(lead) {
    if (!lead || typeof lead !== "object") return lead;
    const point = leadCoords(lead);
    if (!point) return lead;
    if (parseCoordNumber(lead.latitude) !== point.lat) lead.latitude = point.lat;
    if (parseCoordNumber(lead.longitude) !== point.lng) lead.longitude = point.lng;
    return lead;
  }

  function rowsToFinderLeads(rows) {
    const parse = window.LeadCsvFormat?.parseRow;
    const out = [];
    (rows || []).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const lead = parse ? parse(row) : null;
      if (lead?.mapsUrl || lead?.name) {
        out.push(hydrateLeadCoords(lead));
        return;
      }
      const mapsUrl = String(row.maps_url || row.mapsUrl || "").trim();
      const name = String(row.business_name || row.name || "").trim();
      if (!mapsUrl && !name) return;
      const fromUrl = coordsFromMapsUrl(mapsUrl);
      out.push(
        hydrateLeadCoords({
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
          latitude: parseCoordNumber(row.latitude) || fromUrl?.lat || null,
          longitude: parseCoordNumber(row.longitude) || fromUrl?.lng || null,
          formatValid: true,
        })
      );
    });
    return out;
  }

  /**
   * Ask local LeadFinderCloud (search:server) to scrape Maps for type + location.
   */
  async function scrapeViaLeadFinder(type, location, query, geo) {
    const candidates =
      typeof window.leadFinderUrlCandidates === "function"
        ? window.leadFinderUrlCandidates()
        : [leadFinderBaseUrl()].filter(Boolean);
    if (!candidates.length) return { ok: false, skipped: true, reason: "not_configured" };
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

    const body = {
      type: t,
      location: loc,
      minResults: MIN_SEARCH_RESULTS,
      // Interactive Finder: skip place-page enrichment so first results return faster.
      enrich: false,
      fast: true,
      // Do not write leadfinder-cloud/data/*.csv — watchers treat that as a hard refresh.
      upload: false,
    };
    if (q) body.query = q;
    if (hasGeo) {
      body.latitude = Number(geo.latitude);
      body.longitude = Number(geo.longitude);
      body.radiusMiles = Number(geo.radiusMiles) || NEARBY_RADIUS_MILES;
    }

    let lastOffline = false;
    let lastError = "";
    let lastAborted = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const base = candidates[i];
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(() => controller.abort(), 180000)
        : null;
      try {
        const headers = await scrapeAuthHeadersForBase(base);
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
        if (res.status === 409) {
          const retryAfter = Math.min(
            60_000,
            Math.max(4_000, Number(data?.retryAfterMs) || 8_000)
          );
          lastError =
            data?.error ||
            "A Maps scan is already running. Wait a moment, then try again.";
          // One automatic retry — covers a scrape that just finished or a stale lock.
          if (!body._retried409) {
            await new Promise((r) => setTimeout(r, retryAfter));
            body._retried409 = true;
            i -= 1;
            continue;
          }
          return { ok: false, error: lastError };
        }
        if (!res.ok || !data?.ok) {
          lastError = data?.error || "LeadFinder scrape failed (" + res.status + ")";
          return { ok: false, error: lastError };
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
        const msg = scrapeErrorMessage(e);
        const offline =
          !aborted &&
          /failed to fetch|networkerror|network error|load failed|unreachable/i.test(msg);
        lastAborted = aborted;
        lastOffline = offline;
        lastError = aborted ? "LeadFinder scrape timed out" : msg;
        if (!offline) break;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    return {
      ok: false,
      error: lastAborted
        ? "LeadFinder scrape timed out"
        : lastOffline && !candidates.some(isWorkerLeadFinderBase)
          ? "Live Maps search server is not running. On this machine only: localStorage.setItem('ms_use_local_leadfinder','1') then cd leadfinder-cloud && npm run search:server — otherwise use tryMoonrise.com (cloud)."
          : lastOffline
            ? "Live Maps search is temporarily unavailable. Try again in a moment."
          : lastError || "LeadFinder scrape failed",
    };
  }

  async function scrapeAuthHeadersForBase(base) {
    const headers = { "Content-Type": "application/json" };
    if (!isWorkerLeadFinderBase(base)) return headers;
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
    // Always allow local Maps re-checks — Supabase has_website can be stale
    // (e.g. Crumbl marked missing while the place page has a real site).
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
    if (window.LeadWebsiteEnrich?.needsWebsiteCheck) {
      return window.LeadWebsiteEnrich.needsWebsiteCheck(lead);
    }
    return leadNeedsWebsiteCheck(lead);
  }

  function getWebsiteFilter() {
    const active =
      document.querySelector("#lf-website-filter .ms-lf-map-filter-btn.is-active") ||
      document.querySelector("#lf-website-filter .ms-lf-website-btn.is-active");
    return String(active?.getAttribute("data-website") || "without").toLowerCase();
  }

  function applyWebsiteFilter(leads, filter) {
    const mode = String(filter || "all").toLowerCase();
    const pool = reconcileLeadList(leads);
    // Strict filters:
    // - with → confirmed has website
    // - without → confirmed missing website (unknowns stay in All only)
    if (mode === "with") return pool.filter(leadHasWebsite);
    if (mode === "without") return pool.filter(leadMissingWebsite);
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
    if (resultsPanel) {
      const firstOpen =
        resultsPanel.hidden || !resultsPanel.classList.contains("is-sheet-open");
      resultsPanel.hidden = false;
      if (firstOpen) {
        resultsPanel.classList.remove("is-sheet-open");
        // Two frames: paint off-screen, then ease up into view.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            resultsPanel.classList.add("is-sheet-open");
          });
        });
      } else {
        resultsPanel.classList.add("is-sheet-open");
      }
    }
    syncSheetLayoutVars();
    ensureMobileSheetHeight();
    // Re-measure after paint — dock height can settle one frame later.
    window.requestAnimationFrame(() => {
      syncSheetLayoutVars();
      ensureMobileSheetHeight();
    });
  }

  function hideResultsPanel() {
    if (!resultsPanel) return;
    resultsPanel.classList.remove("is-sheet-open");
    resultsPanel.hidden = true;
  }

  const SHEET_MQ = "(max-width: 900px)";
  /** Ratios of the free band between top chrome and Scan dock (not full viewport). */
  const SHEET_SNAPS = [
    { id: "peek", ratio: 0.42 },
    { id: "mid", ratio: 0.68 },
    { id: "full", ratio: 1 },
  ];
  const SHEET_UI_GAP = 10;
  let sheetSnapIndex = 1;
  let sheetDragBound = false;

  function isMobileSheetLayout() {
    return MAP_UI && window.matchMedia?.(SHEET_MQ)?.matches === true;
  }

  function sheetUiClearance() {
    const stage = document.querySelector(".ms-lf-map-stage");
    const top = document.querySelector(".ms-lf-map-top");
    const actions = document.querySelector(".ms-lf-map-actions");
    const stageRect = stage?.getBoundingClientRect?.();
    const topRect = top?.getBoundingClientRect?.();
    const actionsRect = actions?.getBoundingClientRect?.();
    const stageTop = stageRect?.top ?? 0;
    const stageBottom = stageRect?.bottom ?? (Number(window.innerHeight) || 640);
    const stageH = Math.max(320, stageRect?.height || stageBottom - stageTop);

    const topInset = topRect
      ? Math.max(96, Math.ceil(topRect.bottom - stageTop) + SHEET_UI_GAP)
      : Math.round(stageH * 0.22);

    // Dock height used as sheet padding-bottom (panel is floor-anchored).
    const fromRect = actionsRect
      ? Math.ceil(stageBottom - actionsRect.top)
      : 0;
    const fromOffset = actions ? Math.ceil(actions.offsetHeight || 0) : 0;
    const dockH = Math.max(72, fromRect, fromOffset) || Math.round(stageH * 0.16);

    const maxH = Math.max(150, stageH - topInset - dockH);
    return { stageH, topInset, dockH, maxH };
  }

  function syncSheetLayoutVars() {
    if (!resultsPanel) return sheetUiClearance();
    const clear = sheetUiClearance();
    const stage = document.querySelector(".ms-lf-map-stage");
    const pageBody = document.getElementById("page-body");
    // Mobile uses --lf-sheet-dock; PC uses --lf-actions-clearance. Keep both in sync.
    resultsPanel.style.setProperty("--lf-sheet-dock", clear.dockH + "px");
    stage?.style?.setProperty("--lf-sheet-dock", clear.dockH + "px");
    pageBody?.style?.setProperty("--lf-actions-clearance", clear.dockH + "px");
    stage?.style?.setProperty("--lf-actions-clearance", clear.dockH + "px");
    resultsPanel.style.setProperty("--lf-sheet-max", clear.maxH + "px");
    stage?.style?.setProperty("--lf-sheet-max", clear.maxH + "px");
    return clear;
  }

  function sheetSnapHeights() {
    const { maxH } = syncSheetLayoutVars();
    const minPeek = Math.min(maxH, Math.round(Math.max(150, maxH * SHEET_SNAPS[0].ratio)));
    return SHEET_SNAPS.map((snap, i) => {
      const raw = Math.round(maxH * snap.ratio);
      const px = i === 0 ? minPeek : Math.max(minPeek, Math.min(maxH, raw));
      return { id: snap.id, px };
    });
  }

  function setSheetHeightPx(px, options) {
    if (!MAP_UI || !resultsPanel) return;
    const opts = options && typeof options === "object" ? options : {};
    const snaps = sheetSnapHeights();
    const minH = snaps[0].px;
    const maxH = snaps[snaps.length - 1].px;
    const next = Math.max(minH, Math.min(maxH, Math.round(Number(px) || minH)));
    if (opts.dragging) resultsPanel.classList.add("is-sheet-dragging");
    else resultsPanel.classList.remove("is-sheet-dragging");
    resultsPanel.style.setProperty("--lf-sheet-h", next + "px");
    const stage = document.querySelector(".ms-lf-map-stage");
    stage?.style?.setProperty("--lf-sheet-h", next + "px");
    if (!opts.dragging) scheduleMapInvalidate();
  }

  function setSheetSnap(index, options) {
    const snaps = sheetSnapHeights();
    const i = Math.max(0, Math.min(snaps.length - 1, Number(index) || 0));
    sheetSnapIndex = i;
    setSheetHeightPx(snaps[i].px, options);
    if (sheetHandle) {
      sheetHandle.setAttribute("aria-valuenow", String(i));
      sheetHandle.setAttribute("aria-valuetext", snaps[i].id);
    }
  }

  function nearestSheetSnapIndex(px) {
    const snaps = sheetSnapHeights();
    let best = 0;
    let bestDist = Infinity;
    snaps.forEach((snap, i) => {
      const d = Math.abs(snap.px - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function currentSheetHeightPx() {
    if (!resultsPanel) return sheetSnapHeights()[sheetSnapIndex]?.px || 0;
    const raw = String(
      resultsPanel.style.getPropertyValue("--lf-sheet-h") || ""
    ).trim();
    const fromStyle = Number.parseFloat(raw);
    if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;
    const dock = Number.parseFloat(
      String(resultsPanel.style.getPropertyValue("--lf-sheet-dock") || "").trim()
    );
    const total = resultsPanel.getBoundingClientRect().height || 0;
    if (total > 0 && Number.isFinite(dock) && dock > 0) {
      return Math.max(0, total - dock);
    }
    return sheetSnapHeights()[1].px;
  }

  function ensureMobileSheetHeight() {
    if (!MAP_UI || !resultsPanel || resultsPanel.hidden) return;
    const hasExplicit = String(
      resultsPanel.style.getPropertyValue("--lf-sheet-h") || ""
    ).trim();
    if (!hasExplicit) setSheetSnap(sheetSnapIndex || 1);
    else setSheetHeightPx(currentSheetHeightPx());
  }

  function initMobileResultsSheet() {
    if (!MAP_UI || !resultsPanel || !sheetHandle || sheetDragBound) return;
    sheetDragBound = true;

    let dragging = false;
    let pointerId = null;
    let startY = 0;
    let startH = 0;

    const onMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      e.preventDefault();
      const dy = startY - e.clientY; // drag up → taller
      setSheetHeightPx(startH + dy, { dragging: true });
    };

    const endDrag = (e) => {
      if (!dragging || (e && e.pointerId !== pointerId)) return;
      dragging = false;
      try {
        sheetHandle.releasePointerCapture?.(pointerId);
      } catch (_) {
        /* ignore */
      }
      pointerId = null;
      const h = currentSheetHeightPx();
      const snaps = sheetSnapHeights();
      // Velocity-ish bias: if dragged past midpoint toward next snap, prefer it.
      let idx = nearestSheetSnapIndex(h);
      const cur = snaps[sheetSnapIndex]?.px || h;
      if (h > cur + 28) idx = Math.min(snaps.length - 1, sheetSnapIndex + 1);
      else if (h < cur - 28) idx = Math.max(0, sheetSnapIndex - 1);
      else idx = nearestSheetSnapIndex(h);
      setSheetSnap(idx);
    };

    sheetHandle.addEventListener(
      "pointerdown",
      (e) => {
        if (resultsPanel.hidden) return;
        if (e.button != null && e.button !== 0) return;
        dragging = true;
        pointerId = e.pointerId;
        startY = e.clientY;
        startH = currentSheetHeightPx();
        sheetHandle.setPointerCapture?.(pointerId);
        resultsPanel.classList.add("is-sheet-dragging");
        e.preventDefault();
      },
      { passive: false }
    );

    sheetHandle.addEventListener("pointermove", onMove, { passive: false });
    sheetHandle.addEventListener("pointerup", endDrag);
    sheetHandle.addEventListener("pointercancel", endDrag);

    sheetHandle.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setSheetSnap(sheetSnapIndex + 1);
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setSheetSnap(sheetSnapIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setSheetSnap(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSheetSnap(SHEET_SNAPS.length - 1);
      }
    });

    // Pull-down from top of list collapses (touch / mobile primarily).
    let listPullStartY = 0;
    let listPulling = false;
    resultsEl?.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches?.[0]) return;
        if ((resultsEl.scrollTop || 0) > 2) return;
        listPullStartY = e.touches[0].clientY;
        listPulling = true;
        startH = currentSheetHeightPx();
      },
      { passive: true }
    );
    resultsEl?.addEventListener(
      "touchmove",
      (e) => {
        if (!listPulling || !e.touches?.[0]) return;
        const dy = e.touches[0].clientY - listPullStartY;
        if (dy <= 8) return;
        if ((resultsEl.scrollTop || 0) > 2) {
          listPulling = false;
          return;
        }
        e.preventDefault();
        setSheetHeightPx(startH - dy, { dragging: true });
      },
      { passive: false }
    );
    const endListPull = () => {
      if (!listPulling) return;
      listPulling = false;
      if (!resultsPanel.classList.contains("is-sheet-dragging")) return;
      const h = currentSheetHeightPx();
      let idx = nearestSheetSnapIndex(h);
      const cur = sheetSnapHeights()[sheetSnapIndex]?.px || h;
      if (h < cur - 28) idx = Math.max(0, sheetSnapIndex - 1);
      setSheetSnap(idx);
    };
    resultsEl?.addEventListener("touchend", endListPull);
    resultsEl?.addEventListener("touchcancel", endListPull);

    window.addEventListener(
      "resize",
      () => {
        syncSheetLayoutVars();
        if (!resultsPanel.hidden) setSheetSnap(sheetSnapIndex);
      },
      { passive: true }
    );

    syncSheetLayoutVars();
    setSheetSnap(1);
  }

  function renderLoadingSkeletonRow() {
    return (
      '<div class="ms-lf-skel-row">' +
      '<span class="ms-lf-skel-icon" aria-hidden="true"></span>' +
      '<span class="ms-lf-skel-line"></span>' +
      "</div>"
    );
  }

  function renderMapLoadingCard(index) {
    return (
      '<div class="ms-lf-map-skel" aria-hidden="true" style="animation-delay:' +
      index * 80 +
      'ms">' +
      '<div class="ms-lf-map-skel-row">' +
      '<span class="ms-lf-map-skel-avatar"></span>' +
      '<span class="ms-lf-map-skel-lines">' +
      '<span class="ms-lf-map-skel-line"></span>' +
      '<span class="ms-lf-map-skel-line ms-lf-map-skel-line--med"></span>' +
      '<span class="ms-lf-map-skel-line ms-lf-map-skel-line--short"></span>' +
      '<span class="ms-lf-map-skel-line ms-lf-map-skel-line--tiny"></span>' +
      "</span></div>" +
      '<div class="ms-lf-map-skel-slide"></div>' +
      "</div>"
    );
  }

  function renderLoadingCard(index) {
    if (MAP_UI) return renderMapLoadingCard(index);
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
    if (listCountEl && !MAP_UI) listCountEl.hidden = true;
  }

  function clearLoadingCards() {
    if (!resultsEl) return;
    resultsEl.classList.remove("is-loading");
    resultsEl.removeAttribute("aria-busy");
    if (listCountEl && MAP_UI) listCountEl.hidden = false;
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
    if (!candidate) {
      candidate = String(
        lead.category || lead.categoryGroup || lead.type || lead.types || ""
      ).trim();
    }
    // Prefer first type from Google-style types arrays.
    if (!candidate && Array.isArray(lead.types) && lead.types.length) {
      candidate = String(lead.types[0] || "").replace(/_/g, " ");
    }
    const cleaned = cleanCategoryText(candidate)
      .replace(/\b\d+(\.\d+)?\s*(mi|miles|km)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!cleaned) return "";
    // Drop junk that is clearly not a category.
    if (cleaned.length > 40) return cleaned.slice(0, 38).trim() + "…";
    if (cleaned.toLowerCase() === displayName(lead).toLowerCase()) return "";
    if (/^(business|company|store|shop)$/i.test(cleaned)) return "";
    return cleaned;
  }

  function formatPhoneDisplay(phone) {
    const raw = String(phone || "").trim();
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return (
        "(" +
        digits.slice(1, 4) +
        ") " +
        digits.slice(4, 7) +
        "-" +
        digits.slice(7)
      );
    }
    if (digits.length === 10) {
      return (
        "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6)
      );
    }
    return raw.replace(/^\+1\s*/, "").replace(/^\+1/, "");
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
    near: '<svg class="ms-lf-pro-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
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
      (opts.status === "closed" ? " is-closed" : "") +
      (opts.status === "has-site" ? " is-has-site" : "") +
      (opts.status === "no-site" ? " is-no-site" : "") +
      (opts.rowClass ? " " + opts.rowClass : "");
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
      (opts.status === "closed" ? " is-closed" : "") +
      (opts.status === "has-site" ? " is-has-site" : "") +
      (opts.status === "no-site" ? " is-no-site" : "");
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
        status: opts.leftStatus,
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

  function canInteractGenerateSlide(slide) {
    if (!slide || slide.classList.contains("is-disabled") || slide.classList.contains("is-done")) {
      return false;
    }
    if (slide.classList.contains("is-completing") || slide.classList.contains("is-returning")) {
      return false;
    }
    const thumb = slide.querySelector(".ms-lf-slide-thumb");
    return thumb?.getAttribute("aria-disabled") !== "true";
  }

  function onGenerateSlideComplete(slide) {
    if (!slide || slide.classList.contains("is-done")) return;
    const id = slide.getAttribute("data-lead-slide") || "";
    const lead =
      lastLeads.find((item) => leadId(item) === id) || savedMap[id] || null;
    if (!lead) {
      window.MsLfSlide?.resetSlide(slide, true);
      showGenerateBlocked("Could not open that lead. Try again.");
      return;
    }
    void launchBuilderForLead(lead).then((ok) => {
      if (!ok) {
        window.MsLfSlide?.resetSlide(slide, true);
        return;
      }
      slide.classList.add("is-done");
    });
  }

  function bindGenerateSlides() {
    if (!resultsEl || resultsEl.dataset.slideBound === "1") return;
    if (!window.MsLfSlide) return;
    resultsEl.dataset.slideBound = "1";

    window.MsLfSlide.bindContainer(resultsEl, {
      canInteract(slide) {
        return canInteractGenerateSlide(slide);
      },
      onComplete: onGenerateSlideComplete,
    });

    resultsEl.addEventListener("keydown", (e) => {
      const thumb = e.target.closest(".ms-lf-slide-thumb");
      if (!thumb) return;
      const slide = thumb.closest(".ms-lf-slide");
      if (!slide || !canInteractGenerateSlide(slide)) return;
      const metrics = window.MsLfSlide.metrics(slide);
      if (!metrics) return;
      const { max } = metrics;
      const cur = window.MsLfSlide.readX(slide);

      if (e.key === "ArrowRight" || e.key === "End") {
        e.preventDefault();
        if (e.key === "End") {
          window.MsLfSlide.completeSlide(slide, onGenerateSlideComplete);
        } else {
          const next = Math.min(max, cur + Math.max(28, max * 0.22));
          slide.classList.add("is-returning");
          window.MsLfSlide.setX(slide, next, metrics);
          if (window.MsLfSlide.completes(next, max)) {
            window.MsLfSlide.completeSlide(slide, onGenerateSlideComplete);
          } else {
            window.setTimeout(() => slide.classList.remove("is-returning"), 220);
          }
        }
      } else if (e.key === "ArrowLeft" || e.key === "Home" || e.key === "Escape") {
        e.preventDefault();
        window.MsLfSlide.resetSlide(slide, true);
      }
    });
  }

  function renderMapLeadCard(lead, index) {
    const id = leadId(lead);
    const name = displayName(lead);
    const category = displayCategory(lead);
    const address = displayAddress(lead);
    const phone = formatPhoneDisplay(displayPhone(lead));
    const phoneRaw = displayPhone(lead);
    const openStatus = displayOpenStatus(lead);
    const ratingLine = formatRatingCompact(lead);
    const website = leadWebsite(lead);
    const hasSite = leadHasWebsite(lead);
    const missingSite = leadMissingWebsite(lead);
    const checkingSite = !!lead.websiteCheckPending || leadNeedsWebsiteCheck(lead);
    const distanceLine =
      lead.distanceMiles != null
        ? lead.distanceMiles < 0.2
          ? "< 0.2 mi"
          : lead.distanceMiles.toFixed(1) + " mi"
        : "";
    const selected = selectedLeadId && selectedLeadId === id;
    const tel = telHref(phoneRaw || phone);
    const mapsUrl = String(lead.mapsUrl || lead.maps_url || "").trim();

    let websiteLabel;
    let websiteStatus = "";
    let websiteHref;
    if (hasSite && website) {
      websiteLabel = escapeHtml(formatWebsiteLabel(website));
      websiteHref = website;
      websiteStatus = "has-site";
    } else if (hasSite) {
      websiteLabel = '<span class="ms-lf-pro-has-site">Has website</span>';
      websiteStatus = "has-site";
    } else if (checkingSite && !missingSite) {
      websiteLabel = '<span class="ms-lf-pro-site-check">Checking…</span>';
    } else {
      websiteLabel = '<span class="ms-lf-pro-no-site">No website</span>';
      websiteStatus = "no-site";
    }

    const detailRows = [
      renderProRowPair(
        ICO.pin,
        "Address and hours",
        escapeHtml(address || "Address not listed"),
        escapeHtml(openStatus.text || "Hours not listed"),
        {
          leftEmpty: !address,
          leftHref: address && mapsUrl ? mapsUrl : undefined,
          leftExternal: !!(address && mapsUrl),
          rightEmpty: !openStatus.text,
          rightStatus: openStatus.kind || "",
        }
      ),
      renderProRowPair(
        ICO.phone,
        "Phone and rating",
        phone ? escapeHtml(phone) : "Phone not listed",
        escapeHtml(ratingLine || "No reviews"),
        {
          leftEmpty: !phone,
          leftHref: phone ? tel || undefined : undefined,
          rightEmpty: !ratingLine,
        }
      ),
      renderProRowPair(
        ICO.globe,
        "Website and Google Maps",
        websiteLabel,
        mapsUrl ? "Google Maps" : "Maps unavailable",
        {
          rowClass: "ms-lf-map-card-website",
          leftHref: websiteHref,
          leftExternal: !!websiteHref,
          leftStatus: websiteStatus,
          rightEmpty: !mapsUrl,
          rightHref: mapsUrl || undefined,
          rightExternal: !!mapsUrl,
        }
      ),
    ];

    const metaBits = [];
    if (category) metaBits.push(escapeHtml(category));
    if (distanceLine) {
      metaBits.push(
        '<span class="ms-lf-map-card-distance">' + escapeHtml(distanceLine) + "</span>"
      );
    }

    return (
      '<article class="ms-lf-map-card ms-lead-card is-compact' +
      (selected ? " is-selected" : "") +
      '" data-lead-id="' +
      escapeHtml(id) +
      '" data-map-card="' +
      escapeHtml(id) +
      '">' +
      '<div class="ms-lf-map-card-head">' +
      '<div class="ms-lf-pro-avatar" style="' +
      escapeHtml(avatarStyleAttr(lead)) +
      '" aria-hidden="true">' +
      escapeHtml(displayInitials(lead)) +
      "</div>" +
      '<div class="ms-lf-map-card-titles">' +
      "<h3>" +
      escapeHtml(name) +
      "</h3>" +
      (metaBits.length ? "<p>" + metaBits.join(" · ") + "</p>" : "") +
      "</div></div>" +
      '<div class="ms-lf-map-card-details" aria-label="Business details">' +
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

  function renderLeadCard(lead, index) {
    if (MAP_UI) return renderMapLeadCard(lead, index);
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
      if (MAP_UI) {
        lastMarkerSignature = "";
        lastMarkerIdsSignature = "";
        syncMapMarkers([]);
        setSearchPillMode("idle");
      }
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
    window.MsLfSlide?.prime(resultsEl);
    refreshGenerateSlideLockState();
    if (MAP_UI) {
      syncMapMarkers(shown);
      setSearchPillMode("idle");
    }

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
    if (MAP_UI) return false;
    if (shouldSkipBulkPaint()) return false;
    displayLimit = DISPLAY_PAGE;
    if (!allLeads.length) return false;
    setStatus("");
    renderLeads(allLeads, "All leads");
    return true;
  }

  async function preloadAllLeads(options) {
    const opts = options && typeof options === "object" ? options : {};
    if (!isDbConnected()) {
      window.LeadsLoader?.clearCache?.();
      allLeads = [];
      leadsReady = false;
      if (!opts.quiet) showSearchPrompt();
      return;
    }
    if (leadsLoading) return;
    const loader = window.LeadsLoader;
    if (!loader?.load) {
      if (!opts.quiet) setError("Leads loader is not available.");
      return;
    }
    leadsLoading = true;
    if (!opts.quiet) {
      setError("");
      setStatus("");
    }
    if (!MAP_UI) showLoadingCards();
    try {
      const cached = loader.peekCache?.();
      let paintedFromCache = false;
      if (cached?.leads?.length) {
        paintedFromCache = paintPreloadedLeads(cached.leads);
        if (paintedFromCache) clearLoadingCards();
      }

      const data = await loader.load({
        // Map UI does not need realtime watch churn on the idle map screen.
        watch: !MAP_UI,
        onPartial: (payload) => {
          if (MAP_UI) return;
          if (!payload?.leads?.length) return;
          if (shouldSkipBulkPaint()) return;
          if (typeInput?.value?.trim() || locationInput?.value?.trim()) return;
          paintPreloadedLeads(payload.leads);
          clearLoadingCards();
        },
      });

      if (!paintPreloadedLeads(data?.leads || [])) {
        clearLoadingCards();
        if (MAP_UI) {
          setListCount(0);
          return;
        }
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
      if (!MAP_UI) schedulePrefetchSupabaseLeads();
    } catch (e) {
      console.error(e);
      clearLoadingCards();
      if (!opts.quiet) {
        setError(e?.message || "Could not load leads from Supabase.");
        setStatus("");
      }
      if (!MAP_UI && resultsEl) {
        resultsEl.innerHTML =
          '<div class="ms-dash-empty">Could not load leads. Check your connection and refresh.</div>';
      }
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
    if (!userCoords) {
      setError(LOCATION_DENIED_MSG);
      return;
    }

    const searchType = nearbySearchType(typeInput?.value || "");
    const scrapeType = searchType || "businesses";
    const websiteFilter = getWebsiteFilter();
    const query = searchType ? searchType + " near you" : "Businesses near you";
    const geoContext = await reverseGeocodeSearchContext(userCoords);
    const nearbyLocation =
      geoContext?.label ||
      [geoContext?.city, geoContext?.region].filter(Boolean).join(", ") ||
      "";

    setError("");
    setStatus("");
    hideAllSuggests();
    displayLimit = DISPLAY_PAGE;
    resetLeadReveals();
    setFindBusy(true, "near");
    if (!opts.fromAreaToggle) showLoadingCards();
    if (MAP_UI) setStatus("Scanning nearby…");
    flyToUserLocation(userCoords);

    let leads = [];
    let remoteError = "";
    let scrapedFresh = false;

    function mergeById(base, extra) {
      const byId = new Map();
      (base || []).forEach((lead) => {
        const id = leadId(lead);
        if (id) byId.set(id, lead);
        else byId.set(String(lead.mapsUrl || lead.name || Math.random()), lead);
      });
      (extra || []).forEach((lead) => {
        const id = leadId(lead) || String(lead.mapsUrl || lead.name || "");
        if (id) byId.set(id, lead);
      });
      return Array.from(byId.values());
    }

    try {
      // Prefer true distance from cached/local leads so "nearby" is geo-real.
      if (!allLeads.length && isDbConnected()) {
        try {
          await preloadAllLeads({ quiet: true });
        } catch (_) {
          /* continue with remote search */
        }
      }

      const memoryPool = applyWebsiteFilter(
        searchType ? filterLocalLeads(searchType, "") : (allLeads.length ? allLeads.slice() : lastLeads.slice()),
        websiteFilter
      );
      const memoryNearby = applyNearbyFilterAndSort(
        memoryPool,
        userCoords,
        NEARBY_RADIUS_MILES,
        { includeUnknownDistance: false }
      );
      if (memoryNearby.length) {
        leads = mergeById(leads, memoryNearby);
      }

      if (isDbConnected()) {
        const db = await searchSupabaseLeads(
          scrapeType,
          nearbyLocation,
          websiteFilter
        );
        if (db.ok && db.leads?.length) {
          const dbNearby = applyNearbyFilterAndSort(
            applyWebsiteFilter(db.leads, websiteFilter),
            userCoords,
            NEARBY_RADIUS_MILES,
            {
              trustScrapeRadius: false,
              includeUnknownDistance: false,
            }
          );
          mergeScrapedIntoAllLeads(db.leads);
          leads = mergeById(leads, dbNearby);
        } else if (db.reason === "sign_in_required") {
          remoteError = "Sign in to search Business Finder leads.";
        } else if (!db.skipped && db.error) {
          remoteError = db.error;
        }
      }

      if (leads.length && MAP_UI) {
        setStatus(shouldTryLiveScrape() ? "Showing nearby businesses — refreshing…" : "");
        setError("");
        renderLeads(
          rankLeadsForView(leads, { trustScrapeRadius: false }),
          query
        );
      }

      if ((!leads.length || (MAP_UI && leads.length < 8)) && shouldTryLiveScrape()) {
        if (MAP_UI && !leads.length) setStatus("Scanning Google Maps near you…");
        const scraped = await scrapeViaLeadFinder(scrapeType, nearbyLocation, "", {
          latitude: userCoords.lat,
          longitude: userCoords.lng,
          radiusMiles: NEARBY_RADIUS_MILES,
        });
        if (scraped.ok && scraped.leads?.length) {
          scrapedFresh = true;
          let scrapedFiltered = applyWebsiteFilter(scraped.leads, websiteFilter);
          scrapedFiltered = applyNearbyFilterAndSort(
            scrapedFiltered,
            userCoords,
            NEARBY_RADIUS_MILES,
            {
              trustScrapeRadius: true,
              includeUnknownDistance: true,
            }
          );
          mergeScrapedIntoAllLeads(scraped.leads);
          leads = mergeById(leads, scrapedFiltered);
        } else if (!scraped.skipped) {
          remoteError = scraped.error || "Nearby scrape returned no leads";
          console.warn("Nearby scrape:", remoteError);
        }
      }

      // Final pass: re-filter merged set so nothing outside the radius remains.
      leads = applyNearbyFilterAndSort(leads, userCoords, NEARBY_RADIUS_MILES, {
        trustScrapeRadius: scrapedFresh,
        includeUnknownDistance: scrapedFresh,
      });
      leads = applyWebsiteFilter(leads, websiteFilter);

      if (!leads.length) {
        if (remoteError) {
          setError(remoteError);
        } else {
          setError(
            "No businesses found within " +
              NEARBY_RADIUS_MILES +
              " miles. Try All for statewide results."
          );
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
      if (MAP_UI && leads.length) flyToUserLocation(userCoords);
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

    setFindBusy(true, MAP_UI ? "all" : "find");
    if (!opts.fromAreaToggle) showLoadingCards();
    if (MAP_UI) setStatus("Scanning Google Maps…");

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

      // Paint DB hits immediately; live scrape can still fill gaps afterward.
      if (leads.length && MAP_UI) {
        setStatus(shouldTryLiveScrape() ? "Showing saved leads — refreshing from Maps…" : "");
        setError("");
        renderLeads(rankLeadList(leads), query);
      }

      if ((!leads.length || (MAP_UI && leads.length < MIN_SEARCH_RESULTS)) && shouldTryLiveScrape() && (searchType || location.trim())) {
        if (MAP_UI && !leads.length) setStatus("Scanning Google Maps…");
        const scraped = await scrapeViaLeadFinder(searchType, location, "", null);
        if (scraped.ok && scraped.leads?.length) {
          scrapedFresh = true;
          const scrapedFiltered = applyWebsiteFilter(scraped.leads, websiteFilter);
          mergeScrapedIntoAllLeads(scraped.leads);
          if (scrapedFiltered.length) {
            const byId = new Map();
            leads.forEach((lead) => {
              const id = leadId(lead);
              if (id) byId.set(id, lead);
            });
            scrapedFiltered.forEach((lead) => {
              const id = leadId(lead);
              if (id) byId.set(id, lead);
              else leads.push(lead);
            });
            leads = Array.from(byId.values());
          }
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
      leads = applyWebsiteFilter(leads, websiteFilter);
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
      !MAP_UI &&
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
    if (MAP_UI) {
      void runMapSearchSubmit();
      return;
    }
    findLeads();
  });

  document.getElementById("lf-website-filter")?.addEventListener("click", (e) => {
    const btn =
      e.target.closest("button[data-website].ms-lf-map-filter-btn") ||
      e.target.closest("button[data-website]");
    if (!btn) return;
    document
      .querySelectorAll("#lf-website-filter .ms-lf-map-filter-btn, #lf-website-filter .ms-lf-website-btn")
      .forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    if (listView === "saved") {
      resetLeadReveals();
      refreshVisibleLeads();
      return;
    }
    // Always re-run the active search so All / No Website / Website is applied at source.
    if (inMyArea || typeInput?.value?.trim() || locationInput?.value?.trim() || MAP_UI) {
      displayLimit = DISPLAY_PAGE;
      if (MAP_UI && !inMyArea && !typeInput?.value?.trim() && !locationInput?.value?.trim()) {
        if (lastLeads.length) {
          resetLeadReveals();
          refreshVisibleLeads();
        }
        return;
      }
      void findLeads();
      return;
    }
    if (allLeads.length || lastLeads.length) {
      displayLimit = DISPLAY_PAGE;
      resetLeadReveals();
      if (lastLeads.length) refreshVisibleLeads();
      else if (allLeads.length && !MAP_UI) {
        renderLeads(allLeads, "All leads");
        setStatus("");
      }
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
          schedulePrefetchSupabaseLeads();
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

  function setSearchPillMode(mode) {
    if (!searchPill) return;
    searchPill.dataset.mode = mode === "search" ? "search" : "idle";
    if (mode === "search") {
      window.requestAnimationFrame(() => queryInput?.focus());
    }
  }

  function scheduleMapInvalidate() {
    if (!lfMap) return;
    if (mapResizeTimer) window.clearTimeout(mapResizeTimer);
    mapResizeTimer = window.setTimeout(() => {
      mapResizeTimer = null;
      lfMap?.invalidateSize({ animate: false });
    }, 120);
  }

  function getMapIcons() {
    const pinSvg =
      '<svg class="ms-lf-map-pin-svg" viewBox="0 0 28 36" aria-hidden="true" focusable="false">' +
      '<path class="ms-lf-map-pin-body" d="M14 1.2C7.1 1.2 1.5 6.8 1.5 13.7c0 8.6 10.1 18.8 12.05 20.7a.7.7 0 0 0 1.1 0C16.7 32.5 26.5 22.3 26.5 13.7 26.5 6.8 20.9 1.2 14 1.2z"/>' +
      '<circle class="ms-lf-map-pin-dot" cx="14" cy="13.5" r="4.2"/>' +
      "</svg>";
    if (!mapIconDefault) {
      mapIconDefault = L.divIcon({
        className: "ms-lf-map-marker",
        html: '<div class="ms-lf-map-pin">' + pinSvg + "</div>",
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
    }
    if (!mapIconSelected) {
      mapIconSelected = L.divIcon({
        className: "ms-lf-map-marker",
        html: '<div class="ms-lf-map-pin is-selected">' + pinSvg + "</div>",
        iconSize: [32, 40],
        iconAnchor: [16, 38],
      });
    }
    return { def: mapIconDefault, sel: mapIconSelected };
  }

  function setMapLoading(isLoading) {
    const stage = document.getElementById("lf-map-stage");
    const loader = document.getElementById("lf-map-loader");
    if (!stage) return;
    stage.classList.toggle("is-map-loading", !!isLoading);
    if (loader) loader.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function initLeadMap(attempt) {
    if (!MAP_UI || lfMap) return;
    if (typeof L === "undefined") {
      const n = Number(attempt) || 0;
      if (n < 60) window.setTimeout(() => initLeadMap(n + 1), 50);
      else setMapLoading(false);
      return;
    }
    const el = document.getElementById("lf-map");
    if (!el) {
      setMapLoading(false);
      return;
    }
    setMapLoading(true);
    try {
      const reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.getAttribute("data-reduce-motion") === "1";
      lfMap = L.map(el, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false,
        fadeAnimation: !reduceMotion,
        zoomAnimation: !reduceMotion,
        markerZoomAnimation: !reduceMotion,
      }).setView([MAP_DEFAULT.lat, MAP_DEFAULT.lng], MAP_DEFAULT.zoom);
      const tiles = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
          maxZoom: 16,
          updateWhenIdle: false,
          updateWhenZooming: true,
          keepBuffer: 2,
          crossOrigin: true,
        }
      );
      let revealed = false;
      const revealMap = () => {
        if (revealed) return;
        revealed = true;
        setMapLoading(false);
        scheduleMapInvalidate();
      };
      tiles.once("tileload", revealMap);
      tiles.once("load", revealMap);
      tiles.on("tileerror", () => {
        window.setTimeout(revealMap, 200);
      });
      tiles.addTo(lfMap);
      lfMap.whenReady(() => {
        scheduleMapInvalidate();
        window.setTimeout(revealMap, 700);
      });
      window.setTimeout(revealMap, 1600);
      lfMarkersLayer = L.layerGroup().addTo(lfMap);
      const scrollSafe = [
        resultsPanel,
        document.querySelector(".ms-lf-map-top"),
        document.querySelector(".ms-lf-map-actions"),
      ].filter(Boolean);
      scrollSafe.forEach((node) => {
        try {
          L.DomEvent.disableScrollPropagation(node);
          L.DomEvent.disableClickPropagation(node);
        } catch (_) {
          /* ignore */
        }
        node.addEventListener(
          "wheel",
          (e) => {
            e.stopPropagation();
          },
          { passive: true }
        );
      });
      scheduleMapInvalidate();
      window.setTimeout(scheduleMapInvalidate, 250);
    } catch (e) {
      console.error("Business Finder map init failed", e);
      lfMap = null;
      setMapLoading(false);
    }
  }

  function selectLeadOnMap(id, { scrollCard = true } = {}) {
    const next = String(id || "");
    if (selectedLeadId === next && !scrollCard) return;
    const prev = selectedLeadId;
    selectedLeadId = next;
    const icons = typeof L !== "undefined" ? getMapIcons() : null;
    if (icons) {
      if (prev && lfMarkerById.has(prev)) {
        lfMarkerById.get(prev).setIcon(icons.def);
      }
      if (selectedLeadId && lfMarkerById.has(selectedLeadId)) {
        lfMarkerById.get(selectedLeadId).setIcon(icons.sel);
      }
    }
    resultsEl?.querySelectorAll(".ms-lf-map-card.is-selected").forEach((card) => {
      if (card.getAttribute("data-lead-id") !== selectedLeadId) {
        card.classList.remove("is-selected");
      }
    });
    if (selectedLeadId) {
      const card = resultsEl?.querySelector(
        '.ms-lf-map-card[data-lead-id="' +
          selectedLeadId.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
          '"]'
      );
      card?.classList.add("is-selected");
      if (scrollCard) {
        card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  function syncMapMarkers(leads, options) {
    if (!MAP_UI || !lfMap || !lfMarkersLayer) return;
    const opts = options && typeof options === "object" ? options : {};
    const icons = getMapIcons();
    const pool = Array.isArray(leads) ? leads : [];
    const withCoords = [];
    for (let i = 0; i < pool.length && withCoords.length < MAP_MARKER_LIMIT; i += 1) {
      const lead = pool[i];
      const coords = leadCoords(lead);
      if (!coords) continue;
      withCoords.push({ lead, coords, id: leadId(lead) });
    }
    const idsSignature = withCoords.map((row) => row.id).join("|");
    const signature = idsSignature + "#" + selectedLeadId;
    if (signature === lastMarkerSignature && lfMarkerById.size === withCoords.length) {
      return;
    }

    const leadsChanged = idsSignature !== lastMarkerIdsSignature;
    lastMarkerIdsSignature = idsSignature;
    lastMarkerSignature = signature;

    // Selection-only change: swap icons in place — never pan/zoom the map.
    if (!leadsChanged && lfMarkerById.size === withCoords.length) {
      withCoords.forEach(({ id }) => {
        const marker = lfMarkerById.get(id);
        if (!marker) return;
        marker.setIcon(id === selectedLeadId ? icons.sel : icons.def);
      });
      return;
    }

    lfMarkersLayer.clearLayers();
    lfMarkerById = new Map();
    const bounds = [];
    withCoords.forEach(({ lead, coords, id }) => {
      const marker = L.marker([coords.lat, coords.lng], {
        icon: id === selectedLeadId ? icons.sel : icons.def,
        title: displayName(lead),
        keyboard: false,
        riseOnHover: true,
      });
      marker.on("click", () => {
        // Highlight + scroll the card only — keep current map center/zoom.
        revealResults();
        selectLeadOnMap(id, { scrollCard: true });
      });
      marker.addTo(lfMarkersLayer);
      lfMarkerById.set(id, marker);
      bounds.push([coords.lat, coords.lng]);
    });

    // Fit bounds only when the business set changes (initial scan / new results).
    if (opts.fit === false || !bounds.length) return;
    if (bounds.length === 1) {
      lfMap.setView(bounds[0], Math.max(lfMap.getZoom(), 13));
    } else {
      try {
        lfMap.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: false });
      } catch (_) {
        /* ignore */
      }
    }
  }

  function flyToUserLocation(coords) {
    if (!lfMap || !coords) return;
    lfMap.setView([coords.lat, coords.lng], 13, { animate: true });
    if (userLocationMarker) {
      userLocationMarker.setLatLng([coords.lat, coords.lng]);
    } else {
      userLocationMarker = L.circleMarker([coords.lat, coords.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: "#38bdf8",
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(lfMap);
    }
  }

  function applyFreeTextSearch(raw) {
    const text = String(raw || "").trim();
    const parsed = text ? parseCombinedSearchText(text) : null;
    if (parsed) {
      if (typeInput) typeInput.value = parsed.type || text;
      if (locationInput) locationInput.value = parsed.location || locationInput.value || "";
    } else if (text) {
      if (typeInput) typeInput.value = text;
    }
  }

  async function runMapScanNearMe() {
    setSearchPillMode("idle");
    setError("");
    if (MAP_UI) {
      setStatus("Getting your location…");
      revealResults();
    }
    const ok = await enableInMyArea({ autoSearch: true });
    if (ok && userCoords) flyToUserLocation(userCoords);
  }

  async function resolveStateLabelForScan() {
    if (!userCoords) {
      try {
        await ensureUserLocation({ fresh: true, fly: false, quiet: true });
      } catch (_) {
        /* fall through to map center / defaults */
      }
    }
    const coords =
      (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)
        ? userCoords
        : null) ||
      (lfMap
        ? { lat: lfMap.getCenter().lat, lng: lfMap.getCenter().lng }
        : null);
    if (coords) {
      const geo = await reverseGeocodeSearchContext(coords);
      const state = geo?.state || stateDisplayName(geo?.region) || "";
      if (state) return state;
    }

    const existing = String(locationInput?.value || "").trim();
    if (existing && !isAreaLocationLabel(existing)) {
      const m = existing.match(/,\s*([A-Za-z]{2})$/);
      if (m) {
        const named = stateDisplayName(m[1]);
        if (named) return named;
      }
      const namedExisting = stateDisplayName(existing);
      if (
        namedExisting &&
        Object.values(US_STATE_BY_CODE).some(
          (n) => n.toLowerCase() === namedExisting.toLowerCase()
        )
      ) {
        return namedExisting;
      }
    }
    return "California";
  }

  async function runMapScanAll() {
    // Statewide scan: every business in the state (not city / near-me radius).
    inMyArea = false;
    if (areaToggle) areaToggle.checked = false;
    persistAreaPref(false);
    syncAreaUi();
    setSearchPillMode("idle");
    setError("");
    if (MAP_UI) {
      setStatus("Finding your state…");
      revealResults();
    }

    const stateLabel = await resolveStateLabelForScan();
    if (locationInput) locationInput.value = stateLabel;
    // Always reset niche so All never inherits "plumber", "dentist", etc.
    if (typeInput) typeInput.value = "businesses";

    if (MAP_UI) setStatus("Scanning all businesses in " + stateLabel + "…");
    await findLeads();
  }

  function filterLoadedLeadsByQuery(raw) {
    const q = String(raw || "").trim();
    if (!q) return [];
    const pool = allLeads.length ? allLeads : lastLeads;
    if (!pool.length) return [];
    const qLower = q.toLowerCase();
    const tokens = tokensFrom(q);
    return pool.filter((lead) => {
      const blob = leadBlob(lead);
      if (blob.includes(qLower)) return true;
      return tokens.length > 0 && tokens.every((t) => blob.includes(t));
    });
  }

  async function runMapSearchSubmit() {
    const q = String(queryInput?.value || "").trim();
    if (!q && !typeInput?.value?.trim() && !locationInput?.value?.trim()) {
      setSearchPillMode("search");
      queryInput?.focus();
      return;
    }

    // Prefer filtering businesses already on screen / in memory (name search).
    if (q) {
      const localHits = filterLoadedLeadsByQuery(q);
      if (localHits.length) {
        setError("");
        setStatus("");
        revealResults();
        const websiteFilter = getWebsiteFilter();
        renderLeads(
          rankLeadsForView(applyWebsiteFilter(localHits, websiteFilter)),
          q
        );
        setSearchPillMode("idle");
        return;
      }
    }

    inMyArea = false;
    if (areaToggle) areaToggle.checked = false;
    persistAreaPref(false);
    syncAreaUi();
    applyFreeTextSearch(q);
    if (!q && !typeInput?.value?.trim() && !locationInput?.value?.trim()) {
      setSearchPillMode("search");
      queryInput?.focus();
      return;
    }
    await findLeads();
    setSearchPillMode("idle");
  }

  function openStudioMenu() {
    const shellToggle = document.getElementById("ms-menu-toggle");
    if (shellToggle) {
      shellToggle.click();
      return;
    }
    document.body.classList.toggle("ms-nav-open");
  }

  function bindMapFinderUi() {
    if (!MAP_UI) return;
    initLeadMap();
    initMobileResultsSheet();
    setListCount(0);
    hideResultsPanel();

    menuToggleBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (searchPill?.dataset.mode === "search") setSearchPillMode("idle");
      openStudioMenu();
    });

    searchToggle?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = searchPill?.dataset.mode !== "search";
      if (open) {
        setSearchPillMode("search");
        return;
      }
      // Second tap on the search icon submits (does not just close).
      void runMapSearchSubmit();
    });

    locateBtn?.addEventListener("click", async () => {
      setError("");
      setStatus("Getting your location…");
      try {
        // Re-prompt every tap until the browser grants access.
        await ensureUserLocation({ fresh: true, fly: true, quiet: false });
        setStatus("");
        setError("");
      } catch (_) {
        /* ensureUserLocation already surfaces the allow-location message */
      }
    });

    scanNearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void runMapScanNearMe();
    });

    scanAllBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void runMapScanAll();
    });

    queryInput?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSearchPillMode("idle");
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        void runMapSearchSubmit();
      }
    });

    // Click / tap outside the search pill returns to the business count.
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (searchPill?.dataset.mode !== "search") return;
        if (e.target.closest("#lf-search-pill")) return;
        setSearchPillMode("idle");
      },
      true
    );

    locateBtn?.addEventListener(
      "click",
      () => {
        if (searchPill?.dataset.mode === "search") setSearchPillMode("idle");
      },
      true
    );

    resultsEl?.addEventListener("click", (e) => {
      const card = e.target.closest(".ms-lf-map-card[data-lead-id]");
      if (!card) return;
      if (e.target.closest(".ms-lf-slide")) return;
      // Let phone / Maps / website links open normally.
      if (e.target.closest("a[href]")) return;
      selectLeadOnMap(card.getAttribute("data-lead-id") || "", { scrollCard: false });
      const marker = lfMarkerById.get(card.getAttribute("data-lead-id") || "");
      if (marker && lfMap) {
        lfMap.panTo(marker.getLatLng(), { animate: true });
      }
    });

    window.addEventListener("resize", scheduleMapInvalidate, { passive: true });
  }

  function scheduleMapIdlePreload() {
    if (!MAP_UI || !isDbConnected()) return;
    const run = () => {
      if (leadsLoading || leadsReady) return;
      void preloadAllLeads({ quiet: true });
    };
    if (typeof requestIdleCallback === "function") {
      mapIdlePreloadTimer = requestIdleCallback(run, { timeout: 4000 });
    } else {
      mapIdlePreloadTimer = window.setTimeout(run, 1800);
    }
  }

  function bootLeadsSearch() {
    if (booted || document.body?.dataset?.page !== "leads") return;
    if (isDbConnected() && !MAP_UI) showLoadingCards();
    // Start Leaflet immediately — don't hold the map behind auth warmup.
    if (MAP_UI) initLeadMap();
    const run = () => {
      if (booted) return;
      booted = true;
      try {
        bindMapFinderUi();
        if (!MAP_UI) {
          renderPopularTags();
          bindSuggestField("type");
          bindSuggestField("location");
        }
        bindAreaToggle();
        syncListViewToggle();
        refreshGenerateSlideLockState();
        document.addEventListener("ms:generation-lock-changed", refreshGenerateSlideLockState);
        if (MAP_UI) {
          showSearchPrompt();
          // Ask for location as soon as Finder opens (browser permission prompt).
          void promptMapLocationOnOpen();
          // Warm cache after first paint so the map stays responsive on open.
          scheduleMapIdlePreload();
          void hydrateClaimedFromProjects();
        } else {
          void hydrateClaimedFromProjects().then((changed) => {
            if (changed && lastLeads.length) refreshVisibleLeads();
          });
          void preloadAllLeads();
        }
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
    window.StudioBoot?.whenAuthReady?.(run) ?? run();
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
    if (MAP_UI) return;
    if (!typeInput?.value?.trim() && !locationInput?.value?.trim() && !inMyArea) {
      renderLeads(allLeads, "All leads");
    }
  });

  window.addEventListener("leads-cache-refreshed", (e) => {
    if (document.body?.dataset?.page !== "leads") return;
    if (!isDbConnected()) return;
    const payload = e.detail;
    if (!payload?.leads?.length) return;
    allLeads = rankLeadList(payload.leads.slice());
    leadsReady = true;
    if (MAP_UI || shouldSkipBulkPaint()) return;
    if (!typeInput?.value?.trim() && !locationInput?.value?.trim()) {
      renderLeads(allLeads, "All leads");
      setStatus("");
    }
  });
})();
