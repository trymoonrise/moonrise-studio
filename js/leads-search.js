/**
 * Lead Finder — business type + location search with demo leads fallback.
 */
(function () {
  const typeInput = document.getElementById("lf-type");
  const locationInput = document.getElementById("lf-location");
  const form = document.getElementById("lf-form");
  const statusEl = document.getElementById("lf-status");
  const errorEl = document.getElementById("lf-error");
  const resultsEl = document.getElementById("lf-results");
  const listCountEl = document.getElementById("lf-list-count");
  const findBtn = document.getElementById("lf-find");
  const SAVED_KEY = "ms_lf_quick_save_v1";
  const DISPLAY_PAGE = 80;
  let listView = "default";
  let allLeads = [];
  let leadsReady = false;
  let leadsLoading = false;
  let displayLimit = DISPLAY_PAGE;
  let lastLeads = [];
  let lastQuery = "";
  let lastUsedDemo = false;
  let savedMap = loadSavedMap();
  const revealedLeadIds = new Set();
  let leadRevealObserver = null;

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
    return (leads || []).filter(isSaved);
  }

  function savedLeadsList() {
    return Object.keys(savedMap).map((id) => savedMap[id]);
  }

  /** Demo businesses for empty DB / offline preview. */
  const DEMO_LEADS = [
    {
      id: "demo-gym-1",
      name: "Iron Peak Fitness",
      category: "Gyms & Fitness",
      phone: "(512) 555-0142",
      address: "1840 South Lamar Blvd, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Iron+Peak+Fitness+Austin",
    },
    {
      id: "demo-gym-2",
      name: "Sunrise Strength Co.",
      category: "Gyms & Fitness",
      phone: "(512) 555-0198",
      address: "902 E 6th St, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Sunrise+Strength+Austin",
    },
    {
      id: "demo-barber-1",
      name: "Cedar Street Barbers",
      category: "Barbershops",
      phone: "(512) 555-0117",
      address: "2214 S 1st St, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Cedar+Street+Barbers+Austin",
    },
    {
      id: "demo-barber-2",
      name: "Fade Room",
      category: "Barbershops",
      phone: "(214) 555-0164",
      address: "3812 Greenville Ave, Dallas, TX",
      website: "https://example.com",
      mapsUrl: "https://maps.google.com/?q=Fade+Room+Dallas",
    },
    {
      id: "demo-dental-1",
      name: "Brightside Dental",
      category: "Dental Practices",
      phone: "(512) 555-0133",
      address: "4400 N Lamar Blvd, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Brightside+Dental+Austin",
    },
    {
      id: "demo-dental-2",
      name: "Oak & Ivory Dentistry",
      category: "Dental Practices",
      phone: "(713) 555-0175",
      address: "2200 Westheimer Rd, Houston, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Oak+Ivory+Dentistry+Houston",
    },
    {
      id: "demo-yoga-1",
      name: "Lotus & Linen Yoga",
      category: "Yoga Studios",
      phone: "(512) 555-0188",
      address: "1200 W 6th St, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Lotus+Linen+Yoga+Austin",
    },
    {
      id: "demo-yoga-2",
      name: "Stillwater Studio",
      category: "Yoga Studios",
      phone: "(310) 555-0129",
      address: "1450 Abbot Kinney Blvd, Venice, CA",
      website: "https://example.com",
      mapsUrl: "https://maps.google.com/?q=Stillwater+Studio+Venice",
    },
    {
      id: "demo-rest-1",
      name: "Mesa Verde Kitchen",
      category: "Restaurants",
      phone: "(512) 555-0155",
      address: "1600 E Cesar Chavez St, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Mesa+Verde+Kitchen+Austin",
    },
    {
      id: "demo-rest-2",
      name: "Harbor & Hearth",
      category: "Restaurants",
      phone: "(619) 555-0144",
      address: "880 W Harbor Dr, San Diego, CA",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Harbor+Hearth+San+Diego",
    },
    {
      id: "demo-auto-1",
      name: "Redline Auto Repair",
      category: "Auto Repair",
      phone: "(512) 555-0106",
      address: "5401 N Interstate Hwy 35, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Redline+Auto+Repair+Austin",
    },
    {
      id: "demo-auto-2",
      name: "Northside Motors",
      category: "Auto Repair",
      phone: "(480) 555-0191",
      address: "2323 E Indian School Rd, Phoenix, AZ",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Northside+Motors+Phoenix",
    },
    {
      id: "demo-pet-1",
      name: "Paw & Polish Grooming",
      category: "Pet Groomers",
      phone: "(512) 555-0172",
      address: "7010 Easy Wind Dr, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Paw+Polish+Grooming+Austin",
    },
    {
      id: "demo-pet-2",
      name: "Happy Coat Pets",
      category: "Pet Groomers",
      phone: "(303) 555-0138",
      address: "2555 16th St, Denver, CO",
      website: "https://example.com",
      mapsUrl: "https://maps.google.com/?q=Happy+Coat+Pets+Denver",
    },
    {
      id: "demo-salon-1",
      name: "Copper Crown Salon",
      category: "Hair Salons",
      phone: "(512) 555-0160",
      address: "2700 W Anderson Ln, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Copper+Crown+Salon+Austin",
    },
    {
      id: "demo-cafe-1",
      name: "Blueprint Coffee House",
      category: "Cafes",
      phone: "(512) 555-0121",
      address: "200 Congress Ave, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Blueprint+Coffee+Austin",
    },
    {
      id: "demo-plumb-1",
      name: "True North Plumbing",
      category: "Home Services",
      phone: "(512) 555-0199",
      address: "9100 Burnet Rd, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=True+North+Plumbing+Austin",
    },
    {
      id: "demo-lawn-1",
      name: "Greenline Lawn Care",
      category: "Home Services",
      phone: "(737) 555-0147",
      address: "13001 N MoPac Expy, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Greenline+Lawn+Austin",
    },
    {
      id: "demo-spa-1",
      name: "Riverstone Day Spa",
      category: "Spas",
      phone: "(512) 555-0181",
      address: "3600 N Capital of Texas Hwy, Austin, TX",
      website: "",
      mapsUrl: "https://maps.google.com/?q=Riverstone+Spa+Austin",
    },
    {
      id: "demo-photo-1",
      name: "Frame & Field Studio",
      category: "Photographers",
      phone: "(512) 555-0112",
      address: "115 E 5th St, Austin, TX",
      website: "https://example.com",
      mapsUrl: "https://maps.google.com/?q=Frame+Field+Studio+Austin",
    },
  ];

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

  function filterDemoLeads(type, location) {
    const typeTokens = tokensFrom(type);
    const locTokens = tokensFrom(location);
    const allTokens = typeTokens.concat(locTokens);

    let matches = DEMO_LEADS.filter((lead) => {
      const blob = leadBlob(lead);
      const typeOk =
        !typeTokens.length || typeTokens.some((t) => blob.includes(t));
      const locOk =
        !locTokens.length || locTokens.some((t) => blob.includes(t));
      return typeOk && locOk;
    });

    // If location is too specific (e.g. city not in demo set), keep type matches.
    if (!matches.length && typeTokens.length) {
      matches = DEMO_LEADS.filter((lead) => {
        const blob = leadBlob(lead);
        return typeTokens.some((t) => blob.includes(t));
      });
    }

    // Absolute fallback so Find Leads always returns something in demo mode.
    if (!matches.length) {
      matches = DEMO_LEADS.slice(0, 12);
    }

    // Soft rank: more token hits first.
    return matches
      .map((lead) => {
        const blob = leadBlob(lead);
        const score = allTokens.reduce(
          (n, t) => n + (blob.includes(t) ? 1 : 0),
          0
        );
        return { lead, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((row) => row.lead);
  }

  function setStatus(msg) {
    if (!statusEl) return;
    // Keep the status line for rare empty-state notes only — never show scrape chatter.
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
    listCountEl.textContent = count + " lead" + (count === 1 ? "" : "s");
    listCountEl.hidden = false;
  }

  function leadFinderBaseUrl() {
    return String(window.SITE_CONFIG?.leadFinderUrl || "")
      .trim()
      .replace(/\/$/, "");
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
        website: String(row.website_url || "").trim(),
        hours: String(row.hours || "").trim(),
        hasWebsite: window.LeadCsvFormat?.resolveLeadHasWebsite
          ? window.LeadCsvFormat.resolveLeadHasWebsite(row)
          : Boolean(String(row.website_url || "").trim()),
        searchQuery: String(row.search_query || "").trim(),
        formatValid: true,
      });
    });
    return out;
  }

  /**
   * Ask local LeadFinderCloud (search:server) to scrape Maps for type + location.
   */
  async function scrapeViaLeadFinder(type, location, query) {
    const base = leadFinderBaseUrl();
    if (!base) return { ok: false, skipped: true, reason: "not_configured" };
    const t = String(type || "").trim();
    const loc = String(location || "").trim();
    const q = String(query || "").trim();
    if (!t && !loc && !q) return { ok: false, skipped: true, reason: "empty_query" };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), 180000)
      : null;

    try {
      const res = await fetch(base + "/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: t,
          location: loc,
          query: q || undefined,
        }),
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
        error: aborted
          ? "LeadFinder scrape timed out"
          : e?.message || "LeadFinder unavailable",
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function setError(msg) {
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    if (!msg) {
      window.StudioToast?.clear?.();
      return;
    }
    window.StudioToast?.error?.(msg);
  }

  function buildQuery(type, location) {
    const t = String(type || "").trim();
    const loc = String(location || "").trim();
    if (t && loc) return t + " in " + loc;
    return t || loc;
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

  function getWebsiteFilter() {
    const active = document.querySelector("#lf-website-filter .ms-lf-website-btn.is-active");
    return String(active?.getAttribute("data-website") || "all").toLowerCase();
  }

  function applyWebsiteFilter(leads, filter) {
    const mode = String(filter || "all").toLowerCase();
    if (mode === "with") return (leads || []).filter(leadHasWebsite);
    if (mode === "without") return (leads || []).filter((lead) => !leadHasWebsite(lead));
    return leads || [];
  }

  function motionReduced() {
    return (
      document.documentElement.getAttribute("data-reduce-motion") === "1" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function observeLeadReveals(root) {
    leadRevealObserver?.disconnect();
    if (!root) return;

    const cards = Array.from(root.querySelectorAll(".ms-lf-reveal"));
    if (!cards.length) return;

    if (motionReduced()) {
      cards.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    function revealCard(el) {
      if (!el || el.classList.contains("is-visible")) return;
      el.classList.add("is-visible");
      const id = el.getAttribute("data-lead-id");
      if (id) revealedLeadIds.add(id);
    }

    leadRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealCard(entry.target);
          leadRevealObserver?.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    // Wait a frame so layout settles after innerHTML / un-hiding.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cards.forEach((el) => {
          const id = el.getAttribute("data-lead-id");
          if (id && revealedLeadIds.has(id)) {
            el.classList.add("is-visible");
            return;
          }
          const rect = el.getBoundingClientRect();
          const inView =
            rect.bottom > 40 &&
            rect.top < (window.innerHeight || document.documentElement.clientHeight) - 24;
          if (inView) {
            // Force a paint at opacity 0, then ease in.
            void el.offsetWidth;
            revealCard(el);
            return;
          }
          leadRevealObserver?.observe(el);
        });
      });
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
    // Only animate the first reveal — re-renders should not flash opacity.
    if (resultsEl.classList.contains("is-visible")) return;
    resultsEl.classList.add("ms-panel-anim");
    void resultsEl.offsetWidth;
    resultsEl.classList.add("is-visible");
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
      .replace(/^[\s\d.,\-−–—+·•]+/, "")
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
          hours: pick.hours || "",
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
      hours: "",
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
    return { href: "builder.html?" + params.toString(), pick };
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
    const ratingLine = LD?.formatRatingLine ? LD.formatRatingLine(lead) : "";
    const saved = isSaved(lead);
    const tel = telHref(phone || lead.phone);
    const handoff = builderHrefForLead(lead);

    const addressEmpty = !address;
    const phoneEmpty = !phone;
    const hoursEmpty = !openStatus.text;
    const ratingEmpty = !ratingLine || ratingLine === "No reviews";

    const mainRows = [
      renderProRow(ICO.pin, "Address", escapeHtml(address || "Address not listed"), {
        empty: addressEmpty,
      }),
      phoneEmpty
        ? renderProRow(ICO.phone, "Phone", "Phone not listed", { empty: true })
        : renderProRow(ICO.phone, "Phone " + phone, escapeHtml(phone), {
            href: tel || undefined,
          }),
      hasSite && website
        ? renderProRow(ICO.globe, "Website", escapeHtml(formatWebsiteLabel(website)), {
            href: website,
            external: true,
          })
        : renderProRow(ICO.globe, "Website", '<span class="ms-lf-pro-no-site">No website</span>', {
            empty: true,
          }),
      mapsUrl
        ? renderProRow(ICO.pin, "Google Maps", "Open in Google Maps", {
            href: mapsUrl,
            external: true,
          })
        : renderProRow(ICO.pin, "Google Maps", "Maps link unavailable", { empty: true }),
    ];

    const sideRows = [
      renderProRow(
        ICO.clock,
        "Hours",
        escapeHtml(hoursEmpty ? "Hours not listed" : openStatus.text),
        {
          empty: hoursEmpty,
          status: openStatus.kind || "",
        }
      ),
      renderProRow(
        ICO.star,
        "Rating",
        escapeHtml(ratingEmpty ? "No reviews" : ratingLine),
        { empty: ratingEmpty }
      ),
    ];

        return (
      '<article class="ms-card ms-lead-card ms-lf-pro ms-lf-reveal' +
      (saved ? " is-saved" : "") +
      (alreadyVisible ? " is-visible" : "") +
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
      '<div class="ms-lf-pro-details-main">' +
      mainRows.join("") +
          "</div>" +
      '<div class="ms-lf-pro-details-side">' +
      sideRows.join("") +
      "</div></div>" +
      '<footer class="ms-lf-pro-foot">' +
      '<a class="ms-btn ms-lf-pro-generate" href="' +
      escapeHtml(handoff.href) +
      '" data-lead-builder="' +
      escapeHtml(id) +
      '">' +
      ICO.hammer +
      "Generate</a></footer></article>"
    );
  }

  function renderLeads(leads, query, isDemo) {
    if (!resultsEl) return;
    lastLeads = Array.isArray(leads) ? leads.slice() : [];
    lastQuery = query || "";
    lastUsedDemo = !!isDemo;

    const websiteFilter = getWebsiteFilter();
    let visible = applyWebsiteFilter(lastLeads, websiteFilter);
    if (listView === "saved") {
      const fromSearch = applyListFilter(visible);
      visible = fromSearch.length ? fromSearch : applyWebsiteFilter(savedLeadsList(), websiteFilter);
    }

    revealResults();
    setListCount(visible.length);

    if (!visible.length) {
      resultsEl.innerHTML =
        '<div class="ms-dash-empty">' +
        (listView === "saved"
          ? "No Quick Save businesses yet. Heart a lead on Available to keep it here."
          : leadsReady
            ? 'No leads match "' + escapeHtml(query) + '". Try another type or city.'
            : "No leads loaded yet. Refresh the page or check your connection.") +
        "</div>";
      return;
    }

    const shown = visible.slice(0, displayLimit);
    const hasMore = visible.length > displayLimit;

    resultsEl.innerHTML =
      (isDemo && listView !== "saved"
        ? '<p class="ms-muted ms-lf-demo-note">Showing demo leads for preview</p>'
        : "") +
      shown.map((lead, index) => renderLeadCard(lead, index)).join("") +
      (hasMore
        ? '<div class="ms-lf-more-wrap"><button type="button" class="ms-btn ms-btn-secondary" id="lf-load-more">Show more (' +
          (visible.length - displayLimit) +
          " remaining)</button></div>"
        : "");

    observeLeadReveals(resultsEl);

    window.LeadWebsiteEnrich?.enqueue?.(shown, () => {
      refreshVisibleLeads();
    });
  }

  function refreshVisibleLeads() {
    if (listView === "saved" && !lastLeads.length) {
      renderLeads(savedLeadsList(), "Quick Save", false);
      setStatus("");
      return;
    }
    if (!lastLeads.length) return;
    renderLeads(lastLeads, lastQuery, lastUsedDemo);
  }

  async function preloadAllLeads() {
    if (leadsLoading) return;
    const loader = window.LeadsLoader;
    if (!loader?.load) {
      setError("Leads loader is not available.");
      return;
    }
    leadsLoading = true;
    setError("");
    setStatus("");
    try {
      const data = await loader.load({ force: true, forceFull: true, watch: true });
      allLeads = Array.isArray(data?.leads) ? data.leads.slice() : [];
      leadsReady = allLeads.length > 0;
      displayLimit = DISPLAY_PAGE;
      if (!allLeads.length) {
        setStatus("No leads in the database yet.");
        setListCount(0);
        return;
      }
      setStatus("");
      renderLeads(allLeads, "All leads", false);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not load leads from Supabase.");
      setStatus("");
    } finally {
      leadsLoading = false;
    }
  }

  async function findLeads() {
    const type = typeInput?.value || "";
    const location = locationInput?.value || "";
    const websiteFilter = getWebsiteFilter();
    const query = buildQuery(type, location) || "All leads";
    setError("");
    setStatus("");
    hideAllSuggests();
    displayLimit = DISPLAY_PAGE;
    resetLeadReveals();

    setFindBusy(true);
    if (resultsEl) resultsEl.hidden = true;

    let leads = [];
    let usedDemo = false;
    let remoteError = "";

    try {
      const canScrape = Boolean(leadFinderBaseUrl()) && (type.trim() || location.trim());

      if (canScrape) {
        const scraped = await scrapeViaLeadFinder(type, location, query === "All leads" ? "" : query);
        if (scraped.ok && scraped.leads?.length) {
          leads = applyWebsiteFilter(scraped.leads, websiteFilter);
          const byKey = new Map();
          allLeads.forEach((lead) => {
            const key = leadId(lead) || lead.mapsUrl || lead.name;
            if (key) byKey.set(key, lead);
          });
          scraped.leads.forEach((lead) => {
            const key = leadId(lead) || lead.mapsUrl || lead.name;
            if (key) byKey.set(key, lead);
          });
          allLeads = Array.from(byKey.values());
          leadsReady = allLeads.length > 0;
        } else if (!scraped.skipped) {
          remoteError = scraped.error || "Live scrape returned no leads";
          console.warn("LeadFinder scrape:", remoteError);
        }
      }

      if (!leads.length && allLeads.length) {
        leads = filterLocalLeads(type, location);
      }

      if (!leads.length && window.LeadsLoader?.searchRemote && (type.trim() || location.trim())) {
        try {
          const result = await window.LeadsLoader.searchRemote(
            buildQuery(type, location) || type || location,
            {
              limit: 250,
              websiteFilter: websiteFilter,
            }
          );
          if (result?.ok && Array.isArray(result.leads) && result.leads.length) {
            leads = applyWebsiteFilter(result.leads, websiteFilter);
          } else if (result && result.ok === false && result.error) {
            remoteError = remoteError || String(result.error);
            console.warn("Business Finder search failed:", remoteError);
          }
    } catch (e) {
          remoteError = remoteError || e?.message || String(e);
          console.warn(e);
        }
      }

      if (!leads.length && allLeads.length && !type.trim() && !location.trim()) {
        leads = allLeads.slice();
      }

      if (!leads.length && !allLeads.length) {
        leads = applyWebsiteFilter(filterDemoLeads(type, location), websiteFilter);
        usedDemo = true;
      }

      setStatus("");
      if (usedDemo && remoteError) {
        setError("Could not search live leads — showing demo results.");
      } else if (remoteError && !leads.length) {
        setError(remoteError);
      }
      renderLeads(leads, query, usedDemo);
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
    hideSuggest(kind);
    input.focus();
    if (kind === "type") {
      document.querySelectorAll("#lf-tags button").forEach((b) => {
        b.classList.toggle("is-active", (b.getAttribute("data-type") || "") === value);
      });
    }
  }

  function bindSuggestField(kind) {
    const input = kind === "type" ? typeInput : locationInput;
    const list = document.getElementById(kind === "type" ? "lf-type-suggest" : "lf-location-suggest");
    if (!input || !list) return;

    const schedule = () => {
      clearTimeout(suggestState[kind].timer);
      suggestState[kind].timer = setTimeout(() => {
        suggestState[kind].timer = null;
        renderSuggest(kind);
      }, 80);
    };

    input.addEventListener("focus", () => {
      hideSuggest(kind === "type" ? "location" : "type");
      renderSuggest(kind);
    });
    input.addEventListener("input", schedule);
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

    list.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ms-lf-suggest-item");
      if (!item) return;
      e.preventDefault();
      applySuggest(kind, item.getAttribute("data-value") || "");
    });
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
    if (allLeads.length) {
      displayLimit = DISPLAY_PAGE;
      const type = typeInput?.value || "";
      const location = locationInput?.value || "";
      if (type.trim() || location.trim()) {
        findLeads();
      } else {
        resetLeadReveals();
        renderLeads(allLeads, "All leads", false);
        setStatus("");
      }
      return;
    }
    if (typeInput?.value?.trim() || locationInput?.value?.trim()) {
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
      displayLimit += DISPLAY_PAGE;
      refreshVisibleLeads();
      return;
    }
    const builderLink = e.target.closest("[data-lead-builder]");
    if (builderLink) {
      const id = builderLink.getAttribute("data-lead-builder") || "";
      const lead =
        lastLeads.find((item) => leadId(item) === id) ||
        savedMap[id] ||
        null;
      if (lead) {
        e.preventDefault();
        const handoff = builderHrefForLead(lead);
        storeBuilderPick(handoff.pick);
        location.href = handoff.href;
      }
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

  document.getElementById("lf-tags")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (!btn || !typeInput) return;
    typeInput.value = btn.getAttribute("data-type") || "";
    typeInput.focus();
    hideAllSuggests();
    document.querySelectorAll("#lf-tags button").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    if (allLeads.length || leadFinderBaseUrl()) findLeads();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".ms-lf-suggest-wrap")) return;
    hideAllSuggests();
  });

  let booted = false;

  function bootLeadsSearch() {
    if (booted || document.body?.dataset?.page !== "leads") return;
    const run = () => {
      if (booted) return;
      booted = true;
      renderPopularTags();
      bindSuggestField("type");
      bindSuggestField("location");
      syncListViewToggle();
      void preloadAllLeads();
    };
    document.addEventListener("ms:auth-ready", run, { once: true });
    void window.StudioAuth?.getSession?.().then((session) => {
      if (session) run();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootLeadsSearch);
  } else {
    bootLeadsSearch();
  }

  window.addEventListener("leads-cache-refreshed", (e) => {
    if (document.body?.dataset?.page !== "leads") return;
    const payload = e.detail;
    if (!payload?.leads?.length) return;
    allLeads = payload.leads.slice();
    leadsReady = true;
    if (!typeInput?.value?.trim() && !locationInput?.value?.trim()) {
      renderLeads(allLeads, "All leads", false);
      setStatus("");
    }
  });
})();
