/**
 * Builder — details → template → generate, then AI edit / publish.
 */
(function () {
  const TEMPLATES = [
    { id: "coral-navy", name: "Coral", desc: "Scroll zoom", preview: "testtemplates/01-coral-navy/index.html" },
    { id: "lime-charcoal", name: "Volt", desc: "Split + video", preview: "testtemplates/02-lime-charcoal/index.html" },
    { id: "crimson-ink", name: "Ink", desc: "Type wipe", preview: "testtemplates/03-crimson-ink/index.html" },
    { id: "teal-amber", name: "Tide", desc: "Ocean film", preview: "testtemplates/04-teal-amber/index.html" },
    { id: "cobalt-gold", name: "Beacon", desc: "Clip path", preview: "testtemplates/05-cobalt-gold/index.html" },
    { id: "magenta-mint", name: "Bloom", desc: "Parallax", preview: "testtemplates/06-magenta-mint/index.html" },
    { id: "orange-slate", name: "Forge", desc: "Grain + wipe", preview: "testtemplates/07-orange-slate/index.html" },
    { id: "sapphire-sand", name: "Aura", desc: "Float zoom", preview: "testtemplates/08-sapphire-sand/index.html" },
    { id: "emerald-mist", name: "Verdant", desc: "Curtain part", preview: "testtemplates/09-emerald-mist/index.html" },
    { id: "rose-stone", name: "Bloomrose", desc: "Blur clarify", preview: "testtemplates/10-rose-stone/index.html" },
    { id: "indigo-cream", name: "North", desc: "Word blur-in", preview: "testtemplates/11-indigo-cream/index.html" },
    { id: "copper-night", name: "Kiln", desc: "Line + video", preview: "testtemplates/12-copper-night/index.html" },
    { id: "sky-graphite", name: "Drift", desc: "Circle expand", preview: "testtemplates/13-sky-graphite/index.html" },
    { id: "olive-bone", name: "Grove", desc: "Image stack", preview: "testtemplates/14-olive-bone/index.html" },
    { id: "wine-fog", name: "Vellum", desc: "Fog veil", preview: "testtemplates/15-wine-fog/index.html" },
    { id: "canary-ink", name: "Spark", desc: "Marquee pop", preview: "testtemplates/16-canary-ink/index.html" },
    { id: "glacier-slate", name: "Frost", desc: "Sheet lift", preview: "testtemplates/17-glacier-slate/index.html" },
    { id: "clay-fog", name: "Terra", desc: "Split slide", preview: "testtemplates/18-clay-fog/index.html" },
    { id: "cyan-void", name: "Pulse", desc: "Scan grid", preview: "testtemplates/19-cyan-void/index.html" },
    { id: "forest-cream", name: "Canopy", desc: "Triple sway", preview: "testtemplates/20-forest-cream/index.html" },
    { id: "ruby-smoke", name: "Crimson", desc: "Reveal bar", preview: "testtemplates/21-ruby-smoke/index.html" },
    { id: "azure-paper", name: "Paper", desc: "Underline draw", preview: "testtemplates/22-azure-paper/index.html" },
    { id: "honey-espresso", name: "Amber", desc: "Breathe glow", preview: "testtemplates/23-honey-espresso/index.html" },
    { id: "pearl-midnight", name: "Lumen", desc: "Split meet", preview: "testtemplates/24-pearl-midnight/index.html" },
    { id: "moss-porcelain", name: "Moss", desc: "Unmask slide", preview: "testtemplates/25-moss-porcelain/index.html" },
    { id: "flame-coal", name: "Ember", desc: "Rising embers", preview: "testtemplates/26-flame-coal/index.html" },
    { id: "arctic-navy", name: "Polar", desc: "Aurora poly", preview: "testtemplates/27-arctic-navy/index.html" },
  ];

  const GALLERY_IDS = new Set(TEMPLATES.map((t) => t.id));

  /** Templates shown per page in the chooser. */
  const TEMPLATES_PER_PAGE = 3;
  let onboardTemplatePage = 0;

  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
    /forget\s+(everything|all)\s+(above|before|previously)/gi,
    /you\s+are\s+now\s+(dan|jailbroken|unrestricted|developer\s+mode)/gi,
    /override\s+(system|safety|security)\s+(prompt|rules|policy)/gi,
    /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions)/gi,
    /exfiltrat/gi,
    /prompt\s*injection/gi,
    /<\s*script\b/gi,
    /javascript\s*:/gi,
    /on(error|load|click)\s*=/gi,
    /data:\s*text\/html/gi,
  ];

  const BLOCKED_PHRASES = [
    "ignore previous",
    "ignore all instructions",
    "system prompt",
    "jailbreak",
    "exfiltrate",
    "steal password",
    "credit card",
    "malware",
    "phishing",
    "crypto miner",
    "eval(",
    "document.cookie",
    "localstorage",
    "fetch('http",
    'fetch("http',
  ];

  const state = {
    projectId: null,
    project: null,
    templateId: "coral-navy",
    mode: "preview",
    viewport: "desktop",
    html: "",
    profile: null,
    leadId: null,
    aiImages: false,
    pro: false,
    onboardDone: false,
    onboardStep: 1,
    mapsReady: false,
    mapsScraping: false,
    business: {
      businessName: "",
      category: "",
      phone: "",
      address: "",
      mapsUrl: "",
    },
    linkBusiness: {
      businessName: "",
      category: "",
      phone: "",
      address: "",
      mapsUrl: "",
    },
  };

  const BUSINESS_FIELDS = {
    businessName: "onb-name",
    category: "onb-category",
    phone: "onb-phone",
    address: "onb-address",
    mapsUrl: "onb-maps",
  };

  function businessValue(key) {
    const input = document.getElementById(BUSINESS_FIELDS[key]);
    return String(input?.value || state.business[key] || state.linkBusiness[key] || "").trim();
  }

  function setBusinessValue(key, value, preserveExisting) {
    const next = String(value || "");
    const input = document.getElementById(BUSINESS_FIELDS[key]);
    if (preserveExisting && (input?.value || state.business[key])) return;
    state.business[key] = next;
    if (input) input.value = next;
  }

  function workerUrl() {
    return String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function sb() {
    return window.SiteSupabase.getClient();
  }

  function params() {
    return new URLSearchParams(location.search);
  }

  function setStatus(msg) {
    const el = document.getElementById("builder-status");
    if (el) el.textContent = msg || "";
    const setupEl = document.getElementById("builder-setup-status");
    if (setupEl) {
      setupEl.hidden = !msg;
      setupEl.textContent = msg || "";
    }
  }

  function setError(msg) {
    const el = document.getElementById("builder-error");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    if (!msg) {
      window.StudioToast?.clear?.();
      return;
    }
    window.StudioToast?.error?.(msg);
  }

  function setOnboardError(msg) {
    const el = document.getElementById("onboard-error");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    if (!msg) return;
    window.StudioToast?.error?.(msg);
  }

  function sanitizeClientText(raw, maxLen) {
    const max = Math.max(32, Number(maxLen) || 2000);
    let text = String(raw || "")
      .replace(/\u0000/g, "")
      .replace(/[\u200B-\u200F\u202A-\u202E]/g, "")
      .trim()
      .slice(0, max);
    for (const re of INJECTION_PATTERNS) {
      text = text.replace(re, "[filtered]");
    }
    return text;
  }

  function assertSafePrompt(prompt) {
    const p = String(prompt || "").toLowerCase();
    for (const b of BLOCKED_PHRASES) {
      if (p.includes(b)) {
        throw new Error("That prompt looks unsafe and was blocked.");
      }
    }
  }

  function galleryTemplates() {
    return TEMPLATES.filter((t) => GALLERY_IDS.has(t.id));
  }

  function setTemplateViewerOpen(open, template) {
    const viewer = document.getElementById("template-viewer");
    const frame = document.getElementById("template-viewer-frame");
    if (!viewer || !frame) return;

    if (open && template) {
      state.templateId = template.id;
      syncOnboardTemplateSelection();
      const generateButton = document.getElementById("onboard-generate");
      if (generateButton) generateButton.disabled = false;
      const title = document.getElementById("template-viewer-title");
      const desc = document.getElementById("template-viewer-desc");
      if (title) title.textContent = template.name;
      if (desc) desc.textContent = template.desc;
      // Full real page — never card mode
      frame.src = template.preview || "";
      frame.removeAttribute("scrolling");
    } else {
      frame.removeAttribute("src");
    }

    viewer.hidden = !open;
    viewer.classList.toggle("is-open", open);
    viewer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("ms-tpl-viewer-open", open);
  }

  function openTemplateViewer(templateId) {
    const template = galleryTemplates().find((item) => item.id === templateId);
    if (template) setTemplateViewerOpen(true, template);
  }

  function closeTemplateViewer() {
    setTemplateViewerOpen(false);
  }

  function syncOnboardTemplateSelection() {
    const grid = document.getElementById("onboard-templates");
    if (!grid) return;
    grid.querySelectorAll("[data-template-id]").forEach((btn) => {
      const id = btn.getAttribute("data-template-id") || "";
      const selected = id === state.templateId;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  /** Hide the demo section-toggle panel inside a same-origin preview iframe. */
  function stripPreviewChrome(iframe) {
    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.getElementById("ms-preview-chrome")) return;
      const style = doc.createElement("style");
      style.id = "ms-preview-chrome";
      style.textContent = ".toggles{display:none!important}";
      (doc.head || doc.documentElement).appendChild(style);
    } catch (_) {
      /* cross-origin or not ready — ignore */
    }
  }

  function hydrateOnboardPreviews(grid) {
    if (!grid) return;

    const frames = Array.from(grid.querySelectorAll(".ms-lb-tpl-frame[data-preview-src]")).filter(
      (frame) => frame.dataset.hydrated !== "1",
    );
    if (!frames.length) return;

    const start = () => {
      frames.forEach((frame) => {
        frame.dataset.hydrated = "1";
        const src = frame.getAttribute("data-preview-src") || "";
        const iframe = frame.querySelector(".ms-lb-tpl-preview");
        if (!src || !iframe) {
          frame.classList.remove("is-loading");
          frame.classList.add("is-ready");
          return;
        }

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          frame.classList.remove("is-loading");
          frame.classList.add("is-ready");
        };

        iframe.addEventListener(
          "load",
          () => {
            stripPreviewChrome(iframe);
            finish();
          },
          { once: true },
        );
        iframe.addEventListener("error", finish, { once: true });
        iframe.src = src;
        window.setTimeout(finish, 8000);
      });
    };

    if (window.StudioMotion?.prefersReducedMotion?.()) {
      start();
    } else {
      window.setTimeout(start, 120);
    }
  }

  function templatePageCount() {
    return Math.max(1, Math.ceil(galleryTemplates().length / TEMPLATES_PER_PAGE));
  }

  function renderTemplatePage() {
    const grid = document.getElementById("onboard-templates");
    if (!grid) return;

    const all = galleryTemplates();
    const pages = templatePageCount();
    onboardTemplatePage = Math.min(Math.max(0, onboardTemplatePage), pages - 1);
    const startIndex = onboardTemplatePage * TEMPLATES_PER_PAGE;
    const slice = all.slice(startIndex, startIndex + TEMPLATES_PER_PAGE);

    grid.innerHTML = slice
      .map((t) => {
        const active = t.id === state.templateId ? " is-selected" : "";
        const previewUrl = t.preview
          ? t.preview + (t.preview.includes("?") ? "&" : "?") + "preview=card"
          : "";
        const preview = previewUrl
          ? '<iframe class="ms-lb-tpl-preview" title="' +
            t.name +
            ' preview" loading="lazy" scrolling="no" tabindex="-1" sandbox="allow-scripts allow-same-origin"></iframe>'
          : '<div class="ms-lb-tpl-fallback">' + t.name + "</div>";
        const frameAttrs = previewUrl
          ? ' class="ms-lb-tpl-frame is-loading" data-preview-src="' +
            previewUrl.replace(/"/g, "&quot;") +
            '"'
          : ' class="ms-lb-tpl-frame is-ready"';
        return (
          '<button type="button" class="ms-lb-tpl-card' +
          active +
          '" role="option" aria-selected="' +
          (t.id === state.templateId ? "true" : "false") +
          '" data-template-id="' +
          t.id +
          '">' +
          "<div" +
          frameAttrs +
          ">" +
          preview +
          "</div>" +
          '<div class="ms-lb-tpl-meta"><strong>' +
          t.name +
          "</strong></div>" +
          "</button>"
        );
      })
      .join("");

    grid.querySelectorAll("[data-template-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openTemplateViewer(btn.getAttribute("data-template-id") || "");
      });
    });

    const pager = document.getElementById("onboard-tpl-pager");
    const count = document.getElementById("onboard-tpl-count");
    const prev = document.getElementById("onboard-tpl-prev");
    const next = document.getElementById("onboard-tpl-next");
    if (pager) pager.hidden = pages <= 1;
    if (count) count.textContent = onboardTemplatePage + 1 + " / " + pages;
    if (prev) prev.disabled = onboardTemplatePage <= 0;
    if (next) next.disabled = onboardTemplatePage >= pages - 1;

    hydrateOnboardPreviews(grid);
  }

  function renderOnboardTemplates() {
    const grid = document.getElementById("onboard-templates");
    if (!grid) return;

    if (grid.dataset.rendered === "1" && grid.children.length) {
      syncOnboardTemplateSelection();
      return;
    }

    // Open on the page holding the current selection, if any.
    const selectedIndex = galleryTemplates().findIndex((t) => t.id === state.templateId);
    if (selectedIndex >= 0) {
      onboardTemplatePage = Math.floor(selectedIndex / TEMPLATES_PER_PAGE);
    }

    const prev = document.getElementById("onboard-tpl-prev");
    const next = document.getElementById("onboard-tpl-next");
    prev?.addEventListener("click", () => {
      onboardTemplatePage -= 1;
      renderTemplatePage();
    });
    next?.addEventListener("click", () => {
      onboardTemplatePage += 1;
      renderTemplatePage();
    });

    renderTemplatePage();
    grid.dataset.rendered = "1";
  }

  function captureOnboardDetails() {
    Object.entries(BUSINESS_FIELDS).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (input) state.business[key] = String(input.value || "");
    });
  }

  function syncBusinessToOnboard(force) {
    Object.entries(BUSINESS_FIELDS).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      const next = state.business[key] || "";
      if (force || !input.value) input.value = next;
    });
  }

  function applyLeadIntake(payload, opts) {
    const p = payload && typeof payload === "object" ? payload : {};
    const force = !!(opts && opts.force);
    const name = String(p.businessName || p.name || "").trim();
    const category = String(p.category || "").trim();
    const phone = String(p.phone || "").trim();
    const address = String(p.address || "").trim();
    const maps = String(p.mapsUrl || p.maps || "").trim();
    if (p.leadId && !state.leadId) state.leadId = String(p.leadId);
    if (name) setBusinessValue("businessName", name, !force);
    if (category) setBusinessValue("category", category, !force);
    if (phone) setBusinessValue("phone", phone, !force);
    if (address) setBusinessValue("address", address, !force);
    if (maps) {
      setBusinessValue("mapsUrl", maps, !force);
      state.mapsReady = true;
    }
  }

  function intakeFromQuery() {
    const p = params();
    state.leadId = p.get("lead_id") || p.get("lead") || null;

    applyPickFromStorageOrQuery(p);

    applyLeadIntake(
      {
        businessName: p.get("name") || "",
        category: p.get("category") || "",
        phone: p.get("phone") || "",
        address: p.get("address") || "",
        mapsUrl: p.get("maps") || "",
        leadId: state.leadId,
      },
      { force: false }
    );

    // Always push state into Step 1 inputs so the form shows the lead.
    syncBusinessToOnboard(true);

    const bizName = businessValue("businessName");
    const maps = businessValue("mapsUrl");
    const filled =
      !!(state.leadId || bizName || maps || businessValue("phone") || businessValue("address"));
    if (filled) {
      updateOnboardContinue();
      if (maps && isLooseLink(maps)) state.mapsReady = true;
      if (isManualComplete() || isMapsPathReady()) {
        setScrapeStatus("Details loaded from Business Finder", "ok");
      }
    }
    return filled;
  }

  function applyPickFromStorageOrQuery(p) {
    let pick = null;
    const pickParam = p.get("pick");
    if (pickParam) {
      try {
        const b64 = pickParam.replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
        const json = decodeURIComponent(escape(atob(b64 + pad)));
        pick = JSON.parse(json);
      } catch (_) {
        /* ignore */
      }
    }
    if (!pick) {
      try {
        const raw = sessionStorage.getItem("lpc_lead_pick_v1");
        if (raw) pick = JSON.parse(raw);
      } catch (_) {
        /* ignore */
      }
    }
    if (!pick || typeof pick !== "object") return;

    applyLeadIntake(
      {
        leadId: pick.leadId,
        businessName: pick.businessName || pick.name,
        category: pick.category,
        phone: pick.phone,
        address: pick.address,
        mapsUrl: pick.mapsUrl || pick.maps,
      },
      { force: true }
    );
    try {
      sessionStorage.removeItem("lpc_lead_pick_pending_v1");
    } catch (_) {
      /* ignore */
    }
  }

  function setBuilderPhase(phase) {
    const setup = document.getElementById("builder-setup");
    const workspace = document.getElementById("builder-workspace");
    const isSetup = phase === "setup";
    if (setup) setup.hidden = !isSetup;
    if (workspace) workspace.hidden = isSetup;
    document.body.classList.toggle("ms-lb-setup", isSetup);
    document.body.classList.toggle("ms-lb-workspace", !isSetup);
  }

  function setOnboardOpen(open) {
    if (!open && !state.onboardDone) {
      setBuilderPhase("setup");
      return;
    }
    setBuilderPhase(open ? "setup" : "workspace");
  }

  /** Send the user back to the page they opened Builder from (Business Finder, Projects, Dashboard…). */
  function leaveBuilder() {
    const fallback = "dashboard.html";
    let target = fallback;
    try {
      const ref = document.referrer;
      if (ref) {
        const url = new URL(ref, location.href);
        const samePage = url.pathname === location.pathname;
        if (url.origin === location.origin && !samePage && /\.html?$/i.test(url.pathname)) {
          target = url.pathname.split("/").pop() + url.search;
        }
      }
    } catch (_) {
      /* ignore malformed referrer */
    }
    location.href = target;
  }

  /** Keep incomplete setup on the survey page — cannot skip to the workspace. */
  function ensureOnboardSurvey() {
    if (state.onboardDone) return false;
    setBuilderPhase("setup");
    showOnboardStep(state.onboardStep === 2 ? 2 : 1);
    updateOnboardContinue();
    return true;
  }

  function syncSetupStepIndicators(step) {
    document.querySelectorAll("[data-step-indicator]").forEach((el) => {
      const n = Number(el.getAttribute("data-step-indicator") || "0");
      el.classList.toggle("is-active", n === step);
      el.classList.toggle("is-done", n < step);
    });
  }

  function dismissOnboard() {
    if (state.onboardDone) return false;
    if (state.onboardStep === 2) {
      setOnboardError("");
      showOnboardStep(1);
      updateOnboardContinue();
      return true;
    }
    return false;
  }

  function showOnboardStep(step) {
    state.onboardStep = step;
    const s1 = document.getElementById("onboard-step-1");
    const s2 = document.getElementById("onboard-step-2");
    const card = document.getElementById("builder-setup-card");
    const reduce = window.StudioMotion?.prefersReducedMotion?.();
    const steps = [s1, s2];

    if (card) card.classList.toggle("is-templates", step === 2);
    syncSetupStepIndicators(step);

    steps.forEach((el, index) => {
      if (!el) return;
      const active = step === index + 1;
      el.classList.remove("is-entering");
      if (active) {
        el.hidden = false;
        el.classList.add("is-active");
        if (!reduce) {
          void el.offsetWidth;
          el.classList.add("is-entering");
          window.setTimeout(() => el.classList.remove("is-entering"), 520);
        }
      } else {
        el.hidden = true;
        el.classList.remove("is-active");
      }
    });

    if (step === 2) {
      renderOnboardTemplates();
      const gen = document.getElementById("onboard-generate");
      if (gen) gen.disabled = !state.templateId;
      const body = s2?.querySelector(".ms-lb-onboard-body");
      if (body) body.scrollTop = 0;
    }
  }

  function isLooseLink(url) {
    const s = String(url || "").trim();
    if (!s || s.length < 4) return false;
    if (/^https?:\/\//i.test(s)) return true;
    if (/^www\./i.test(s)) return true;
    // bare domain / path
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#]\S*)?$/i.test(s)) return true;
    return false;
  }

  function normalizeLink(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (/^www\./i.test(s) || /^[a-z0-9].*\.[a-z]{2,}/i.test(s)) return "https://" + s;
    return s;
  }

  function isGoogleMapsUrl(url) {
    try {
      const u = new URL(normalizeLink(url));
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (["maps.app.goo.gl", "goo.gl", "g.co", "g.page"].includes(host)) return true;
      if (host === "google.com" || host.startsWith("google.") || host.startsWith("maps.google.")) {
        return true;
      }
      if (host.includes(".google.")) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function readOnboardFields() {
    return {
      name: sanitizeClientText(document.getElementById("onb-name")?.value || "", 120),
      category: sanitizeClientText(document.getElementById("onb-category")?.value || "", 80),
      phone: sanitizeClientText(document.getElementById("onb-phone")?.value || "", 40),
      address: sanitizeClientText(document.getElementById("onb-address")?.value || "", 200),
      maps: sanitizeClientText(document.getElementById("onb-maps")?.value || "", 900),
    };
  }

  function isManualComplete(fields) {
    const f = fields || readOnboardFields();
    return !!(f.name && f.category && f.phone && f.address);
  }

  function isMapsPathReady(fields) {
    const f = fields || readOnboardFields();
    // Any link is enough — no Google-only requirement
    return isLooseLink(f.maps);
  }

  function canContinueOnboard() {
    const fields = readOnboardFields();
    if (isMapsPathReady(fields) || isManualComplete(fields)) return true;
    // Business Finder handoff may omit phone — still let them continue with the rest.
    if (
      state.leadId &&
      fields.name &&
      (fields.maps || fields.category || fields.address || fields.phone)
    ) {
      return true;
    }
    return false;
  }

  function updateOnboardContinue() {
    const btn = document.getElementById("onboard-next");
    if (btn) btn.disabled = !canContinueOnboard();
  }

  function setScrapeStatus(msg, tone) {
    const el = document.getElementById("onboard-scrape-status");
    const shell = document.querySelector(".ms-lb-onboard-maps-shell");
    if (shell) {
      shell.classList.toggle("is-ok", tone === "ok");
      shell.classList.toggle("is-busy", tone === "busy");
      shell.classList.toggle("is-err", tone === "err");
    }
    if (!el) return;
    // Success is shown on the input (green) — no status line.
    if (tone === "ok" || !msg) {
      el.hidden = true;
      el.textContent = "";
      el.className = "ms-lb-onboard-scrape";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.className = "ms-lb-onboard-scrape" + (tone ? " is-" + tone : "");
  }

  function normalizeResolvedDetails(data) {
    if (!data || typeof data !== "object") return null;
    const businessName = String(
      data.businessName || data.business_name || data.name || ""
    ).trim();
    const category = String(data.category || "").trim();
    const phone = String(data.phone || data.telephone || "").trim();
    const address = String(
      data.address || data.formatted_address || data.city_state_zip || ""
    ).trim();
    const mapsUrl = String(data.mapsUrl || data.maps_url || data.url || "").trim();
    if (!businessName && !category && !phone && !address && !mapsUrl) return null;
    return { businessName, category, phone, address, mapsUrl };
  }

  /** Store resolved Google / lead details without changing manual input fields. */
  function applyLinkDetails(data) {
    const d = normalizeResolvedDetails(data);
    if (!d) return false;
    let filled = false;
    if (d.businessName) {
      state.linkBusiness.businessName = d.businessName;
      filled = true;
    }
    if (d.category) {
      state.linkBusiness.category = d.category;
      filled = true;
    }
    if (d.phone) {
      state.linkBusiness.phone = d.phone;
      filled = true;
    }
    if (d.address) {
      state.linkBusiness.address = d.address;
      filled = true;
    }
    if (d.mapsUrl) {
      state.linkBusiness.mapsUrl = d.mapsUrl;
      filled = true;
    }
    state.mapsReady = true;
    updateOnboardContinue();
    return filled;
  }

  /** Push explicit lead/project details into the manual fields. */
  function applyScrapedDetails(data) {
    const d = normalizeResolvedDetails(data);
    if (!d) return false;
    let filled = false;
    if (d.businessName) {
      setBusinessValue("businessName", d.businessName);
      filled = true;
    }
    if (d.category) {
      setBusinessValue("category", d.category);
      filled = true;
    }
    if (d.phone) {
      setBusinessValue("phone", d.phone);
      filled = true;
    }
    if (d.address) {
      setBusinessValue("address", d.address);
      filled = true;
    }
    if (d.mapsUrl) {
      setBusinessValue("mapsUrl", d.mapsUrl);
      filled = true;
    }
    state.mapsReady = true;
    syncBusinessToOnboard(true);
    captureOnboardDetails();
    updateOnboardContinue();
    return filled;
  }

  async function lookupLeadDetailsClient(mapsUrl, businessName) {
    try {
      const client = sb();
      if (!client) return null;
      const urls = [...new Set([mapsUrl, String(mapsUrl || "").split("?")[0]].filter(Boolean))];
      for (const u of urls) {
        const { data } = await client
          .from("leads")
          .select("business_name,phone,address,category,maps_url,city_state_zip")
          .eq("maps_url", u)
          .limit(1)
          .maybeSingle();
        if (data?.business_name) {
          return {
            businessName: String(data.business_name || "").trim(),
            phone: String(data.phone || "").trim(),
            address: String(data.address || data.city_state_zip || "").trim(),
            category: String(data.category || "").trim(),
            mapsUrl: String(data.maps_url || mapsUrl).trim(),
          };
        }
      }
      const name = String(businessName || nameFromMapsUrl(mapsUrl) || "").trim();
      if (name.length >= 4) {
        const { data } = await client
          .from("leads")
          .select("business_name,phone,address,category,maps_url,city_state_zip")
          .ilike("business_name", name)
          .limit(1)
          .maybeSingle();
        if (data?.business_name) {
          return {
            businessName: String(data.business_name || "").trim(),
            phone: String(data.phone || "").trim(),
            address: String(data.address || data.city_state_zip || "").trim(),
            category: String(data.category || "").trim(),
            mapsUrl: String(data.maps_url || mapsUrl).trim(),
          };
        }
      }
    } catch (_) {
      /* ignore — optional enrichment */
    }
    return null;
  }

  async function scrapeMapsLink() {
    const raw = String(document.getElementById("onb-maps")?.value || "").trim();
    if (!raw) {
      state.mapsReady = false;
      setScrapeStatus("");
      updateOnboardContinue();
      return;
    }

    if (!isLooseLink(raw)) {
      state.mapsReady = false;
      setScrapeStatus("Paste any business link to continue", "err");
      updateOnboardContinue();
      return;
    }

    const maps = normalizeLink(sanitizeClientText(raw, 900));
    const mapsEl = document.getElementById("onb-maps");
    if (mapsEl && mapsEl.value.trim() !== maps) mapsEl.value = maps;
    setBusinessValue("mapsUrl", maps);

    // Link alone unlocks Continue — scrape fills manual fields best-effort
    state.mapsReady = true;
    updateOnboardContinue();

    if (!isGoogleMapsUrl(maps)) {
      setScrapeStatus("", "ok");
      return;
    }

    // Prefill name/category from the URL while we resolve the rest
    const guessedName = nameFromMapsUrl(maps);
    if (guessedName) {
      applyLinkDetails({
        businessName: guessedName,
        category: inferCategoryFromName(guessedName),
        mapsUrl: maps,
      });
    }

    state.mapsScraping = true;
    setScrapeStatus("Fetching business details…", "busy");
    setOnboardError("");
    try {
      const base = workerUrl();
      if (!base) throw new Error("Worker URL is not configured");
      const headers = await authHeaders();
      const res = await fetch(base + "/resolve-maps", {
        method: "POST",
        headers,
        body: JSON.stringify({ mapsUrl: maps }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "lookup failed");
      applyLinkDetails(data);
      // If the worker returned a thin payload, try leads as a second source
      if (!isManualComplete()) {
        const fromLead = await lookupLeadDetailsClient(
          data.mapsUrl || maps,
          data.businessName || guessedName
        );
        if (fromLead) applyLinkDetails(fromLead);
      }
      setScrapeStatus("", "ok");
    } catch (err) {
      const fromLead = await lookupLeadDetailsClient(maps, guessedName);
      if (fromLead) {
        applyLinkDetails(fromLead);
        setScrapeStatus("", "ok");
      } else if (guessedName) {
        applyLinkDetails({
          businessName: guessedName,
          category: inferCategoryFromName(guessedName),
          mapsUrl: maps,
        });
        setScrapeStatus("", "ok");
      } else {
        state.mapsReady = true;
        setScrapeStatus(err?.message || "Could not read that Maps link", "err");
      }
    } finally {
      state.mapsScraping = false;
      updateOnboardContinue();
    }
  }

  function validateOnboardDetails() {
    const fields = readOnboardFields();
    const mapsOk = isMapsPathReady(fields);
    const manualOk = isManualComplete(fields);

    if (!mapsOk && !manualOk) {
      return "Paste a link or fill every manual field.";
    }
    if (fields.maps && !isLooseLink(fields.maps) && !manualOk) {
      return "Paste a link to continue.";
    }
    // Normalize + keep whatever they pasted
    if (fields.maps) {
      const normalized = normalizeLink(fields.maps);
      document.getElementById("onb-maps").value = normalized;
      fields.maps = normalized;
    }
    if (!fields.name && mapsOk) {
      const guessed = nameFromMapsUrl(fields.maps);
      if (guessed) {
        state.linkBusiness.businessName = state.linkBusiness.businessName || guessed;
        state.linkBusiness.category =
          state.linkBusiness.category || inferCategoryFromName(guessed);
        state.linkBusiness.mapsUrl = state.linkBusiness.mapsUrl || fields.maps;
        fields.name = guessed;
      } else if (!fields.name) {
        // Link-only path: keep a soft internal placeholder so generation can proceed.
        state.linkBusiness.businessName = state.linkBusiness.businessName || "Local Business";
        state.linkBusiness.mapsUrl = state.linkBusiness.mapsUrl || fields.maps;
        fields.name = "Local Business";
      }
    }
    if (!fields.name && !mapsOk) {
      return "Business name is required.";
    }
    return "";
  }

  function updateEmptyCopy(fromFinder) {
    const empty = document.getElementById("preview-empty");
    const copy = empty?.querySelector("p");
    if (!copy) return;
    const name = businessValue("businessName");
    if (!state.onboardDone) {
      copy.textContent = "Complete business details and pick a template to generate your site";
    } else if (fromFinder && name) {
      copy.textContent = "Ready for " + name + " — generate or ask AI to refine";
    } else {
      copy.textContent = "Ask AI below to refine the page, or regenerate from Details";
    }
  }

  function readIntake() {
    captureOnboardDetails();
    const notes = sanitizeClientText(document.getElementById("biz-notes").value, 2000);
    const mapsUrl = sanitizeClientText(businessValue("mapsUrl"), 500);
    const businessName =
      sanitizeClientText(businessValue("businessName"), 120) ||
      guessNameFromPrompt(notes) ||
      nameFromMapsUrl(mapsUrl) ||
      "Untitled business";
    return {
      businessName,
      category: sanitizeClientText(businessValue("category"), 80),
      phone: sanitizeClientText(businessValue("phone"), 40),
      address: sanitizeClientText(businessValue("address"), 200),
      mapsUrl,
      notes,
      leadId: state.leadId,
      templateId: state.templateId,
      aiImages: state.aiImages,
      pro: state.pro,
    };
  }

  function guessNameFromPrompt(notes) {
    const m = String(notes || "").match(/for\s+([A-Z][\w&'’.\-\s]{1,40})/i);
    return m ? m[1].trim() : "";
  }

  function nameFromMapsUrl(mapsUrl) {
    const m = String(mapsUrl || "").match(/\/place\/([^/@?#]+)/i);
    if (!m) return "";
    try {
      return decodeURIComponent(m[1].replace(/\+/g, " ")).replace(/-/g, " ").trim();
    } catch (_) {
      return m[1].replace(/[-+]/g, " ").trim();
    }
  }

  function inferCategoryFromName(name) {
    const n = String(name || "").toLowerCase();
    if (/plumb|drain|septic|pipe/.test(n)) return "Plumbing";
    if (/electr/.test(n)) return "Electrical";
    if (/hvac|heating|cooling|air\s*cond/.test(n)) return "HVAC";
    if (/roof/.test(n)) return "Roofing";
    if (/landscap|lawn|garden/.test(n)) return "Landscaping";
    if (/clean/.test(n)) return "Cleaning";
    if (/dentist|dental/.test(n)) return "Dental";
    if (/barber|salon|hair/.test(n)) return "Beauty";
    if (/restaurant|cafe|pizza|grill|kitchen/.test(n)) return "Restaurant";
    if (/auto|mechanic|tire/.test(n)) return "Auto";
    if (/gym|fitness|yoga/.test(n)) return "Fitness";
    return "";
  }

  function syncEmptyState() {
    const empty = document.getElementById("preview-empty");
    const frame = document.getElementById("preview-frame");
    const hasHtml = !!(state.html && state.html.trim());
    if (empty) empty.hidden = hasHtml || state.mode === "code";
    if (frame) frame.hidden = !hasHtml || state.mode === "code";
  }

  function setModeUi() {
    document.querySelectorAll(".is-mode").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
    });
    document.querySelectorAll(".is-vp").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.vp === state.viewport);
    });
    const browser = document.getElementById("preview-browser");
    if (browser) browser.classList.toggle("is-code", state.mode === "code");
  }

  function updatePreview() {
    const frame = document.getElementById("preview-frame");
    const editor = document.getElementById("code-editor");
    const wrap = document.getElementById("preview-wrap");
    setModeUi();

    if (state.mode === "code") {
      if (wrap) wrap.hidden = true;
      if (editor) {
      editor.hidden = false;
        editor.value = state.html || "";
        editor.removeAttribute("hidden");
        editor.focus({ preventScroll: true });
      }
      syncEmptyState();
      return;
    }

    if (wrap) wrap.hidden = false;
    if (editor) {
    editor.hidden = true;
      editor.setAttribute("hidden", "");
    }
    if (frame) frame.className = "ms-preview-frame is-" + state.viewport;
    syncEmptyState();

    if (state.html && frame) {
      const doc = frame.contentDocument;
      if (doc) {
        doc.open();
        doc.write(state.html);
        doc.close();
      }
    }
    refreshWatermark();
  }

  function setPublishEnabled() {
    const ready = !!(state.projectId && state.html);
    const btn = document.getElementById("btn-publish-top");
    if (btn) btn.disabled = !ready;
  }

  function refreshWatermark() {
    const host = document.getElementById("watermark-host");
    const enabled = !!(state.project?.watermark_enabled && state.html);
    window.StudioWatermark.mount(host, {
      enabled,
      projectId: state.projectId,
      handle: state.profile?.handle || "moonrise",
      avatarUrl:
        state.profile?.avatar_url ||
        (window.SITE_CONFIG && window.SITE_CONFIG.defaultAvatarUrl) ||
        "doc/pfp.png",
      urgencyEndsAt: state.project?.urgency_ends_at,
    });
    setPublishEnabled();
  }

  async function authHeaders() {
    const session = await window.StudioAuth.getSession();
    if (!session?.access_token) throw new Error("Sign in required");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  async function loadProject(id) {
    const user = await window.StudioAuth.getUser();
    const { data, error } = await sb()
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Project not found");
    state.projectId = data.id;
    state.project = data;
    state.html = data.html || "";
    state.templateId = data.template_id || state.templateId;
    state.leadId = data.lead_id || null;
    state.onboardDone = !!(state.html && state.html.trim());
    const ctx = data.business_context || {};
    setBusinessValue("businessName", data.business_name || ctx.businessName || "");
    setBusinessValue("category", ctx.category || "");
    setBusinessValue("phone", ctx.phone || "");
    setBusinessValue("address", ctx.address || "");
    setBusinessValue("mapsUrl", ctx.mapsUrl || "");
    if (ctx.notes) document.getElementById("biz-notes").value = ctx.notes;
    syncBusinessToOnboard();
    syncOnboardTemplateSelection();
    updatePreview();
  }

  async function generate(opts) {
    const fromOnboard = !!(opts && opts.fromOnboard);
    setError("");
    setOnboardError("");

    // Dock / shortcut generate is blocked until the survey finishes via onboard Generate.
    if (!fromOnboard && !state.onboardDone) {
      ensureOnboardSurvey();
      setError("Finish business details and pick a template first.");
      return;
    }

    if (fromOnboard) captureOnboardDetails();

    const intake = readIntake();
    if (!intake.businessName || intake.businessName === "Untitled business") {
      const msg = "Business name is required.";
      if (fromOnboard) {
        showOnboardStep(1);
        setOnboardError(msg);
        updateOnboardContinue();
      } else setError(msg);
      return;
    }
    if (!intake.templateId) {
      const msg = "Pick a template first.";
      if (fromOnboard) {
        showOnboardStep(2);
        setOnboardError(msg);
      } else setError(msg);
      return;
    }

    if (!intake.notes) {
      intake.notes =
        "Personalize this template for " +
        intake.businessName +
        (intake.category ? ", a " + intake.category : "") +
        (intake.address ? " at " + intake.address : "") +
        (intake.phone ? ". Phone: " + intake.phone : "") +
        ". Keep contact details accurate.";
      document.getElementById("biz-notes").value = intake.notes;
    }

    try {
      assertSafePrompt(intake.notes);
    } catch (e) {
      if (fromOnboard) setOnboardError(e.message);
      else setError(e.message);
      return;
    }

    setStatus("Generating with OpenRouter…");
    document.body.classList.add("ms-lb-generating");
    const btn = document.getElementById("btn-generate");
    const onboardBtn = document.getElementById("onboard-generate");
    if (btn) btn.disabled = true;
    if (onboardBtn) onboardBtn.disabled = true;
    try {
      const headers = await authHeaders();
      const res = await fetch(workerUrl() + "/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: state.projectId,
          ...intake,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generation failed");
      state.projectId = data.projectId;
      state.html = data.html || "";
      state.onboardDone = true;
      setBuilderPhase("workspace");
      await loadProject(state.projectId);
      history.replaceState({}, "", "builder.html?project_id=" + encodeURIComponent(state.projectId));
      setStatus("Generated. Watermark is on until payment.");
      state.mode = "preview";
      updatePreview();
    } catch (e) {
      const msg = e.message || "Generation failed";
      if (fromOnboard) setOnboardError(msg);
      setError(msg);
      setStatus("");
    } finally {
      if (btn) btn.disabled = false;
      if (onboardBtn) onboardBtn.disabled = !state.templateId;
      document.body.classList.remove("ms-lb-generating");
    }
  }

  async function editWithAi() {
    setError("");
    if (!state.projectId || !state.html) {
      setError("Generate a site first, then ask AI to change it.");
      if (!state.onboardDone) setBuilderPhase("setup");
      return;
    }

    let instruction = sanitizeClientText(document.getElementById("biz-notes")?.value || "", 2000);
    if (!instruction || instruction.length < 3) {
      setError("Describe the change you want in the AI bar.");
      return;
    }
    try {
      assertSafePrompt(instruction);
    } catch (e) {
      setError(e.message);
      return;
    }

    setStatus("Updating with AI…");
    document.body.classList.add("ms-lb-generating");
    const btn = document.getElementById("btn-generate");
    if (btn) btn.disabled = true;
    try {
      if (state.mode === "code") {
        state.html = document.getElementById("code-editor")?.value || state.html;
      }
      const headers = await authHeaders();
      const res = await fetch(workerUrl() + "/edit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: state.projectId,
          instruction,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Edit failed");
      state.html = data.html || state.html;
      await loadProject(state.projectId);
      setStatus("Updated.");
      document.getElementById("biz-notes").value = "";
      updatePreview();
    } catch (e) {
      setError(e.message || "Edit failed");
      setStatus("");
    } finally {
      if (btn) btn.disabled = false;
      document.body.classList.remove("ms-lb-generating");
    }
  }

  async function runPromptAction() {
    if (!state.onboardDone) {
      ensureOnboardSurvey();
      setError("Finish business details and pick a template first.");
      return;
    }
    if (state.html && state.projectId) {
      await editWithAi();
      return;
    }
    await generate({ fromOnboard: false });
  }

  async function publish() {
    setError("");
    if (ensureOnboardSurvey()) {
      setError("Finish business details and pick a template first.");
      return;
    }
    if (!state.projectId) return;
    if (state.project?.watermark_enabled) {
      setError("Pay to remove the watermark before publishing.");
      window.StudioWatermark.openPaywall({
        projectId: state.projectId,
        handle: state.profile?.handle || "moonrise",
        avatarUrl:
          state.profile?.avatar_url ||
          (window.SITE_CONFIG && window.SITE_CONFIG.defaultAvatarUrl) ||
          "doc/pfp.png",
        urgencyEndsAt: state.project?.urgency_ends_at,
      });
      return;
    }
    setStatus("Publishing to Vercel…");
    try {
      const headers = await authHeaders();
      const res = await fetch(workerUrl() + "/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId: state.projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Publish failed");
      await loadProject(state.projectId);
      setStatus("Published: " + (data.url || "done"));
    } catch (e) {
      setError(e.message || "Publish failed");
      setStatus("");
    }
  }

  async function deleteProject() {
    if (!state.projectId) {
      setError("No project to delete");
      return;
    }
    if (!confirm("Delete this project permanently?")) return;
    const user = await window.StudioAuth.getUser();
    await sb().from("projects").delete().eq("id", state.projectId).eq("user_id", user.id);
    location.href = "projects.html";
  }

  function downloadHtml() {
    if (ensureOnboardSurvey()) {
      setError("Finish business details and pick a template first.");
      return;
    }
    if (!state.html || !state.html.trim()) {
      setError("Nothing to download yet — generate a site first.");
      return;
    }
    if (state.mode === "code") {
      state.html = document.getElementById("code-editor")?.value || state.html;
    }
    const blob = new Blob([state.html || ""], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      (readIntake().businessName || "site").replace(/\s+/g, "-").toLowerCase() + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setSiteSettingsError(msg) {
    const el = document.getElementById("lb-settings-error");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    if (!msg) return;
    window.StudioToast?.error?.(msg);
  }

  function setSiteSettingsStatus(msg) {
    const el = document.getElementById("lb-settings-status");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("is-ok");
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.add("is-ok");
  }

  function showSettingsTab(tab) {
    const id = String(tab || "domain");
    document.querySelectorAll("[data-settings-tab]").forEach((btn) => {
      const on = btn.getAttribute("data-settings-tab") === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-settings-panel") === id;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  }

  function liveSiteUrl() {
    return String(state.project?.vercel_url || "").trim();
  }

  function syncSiteSettingsUi() {
    const name =
      businessValue("businessName") ||
      state.project?.business_name ||
      "Your site";
    const sub = document.getElementById("lb-settings-subtitle");
    if (sub) sub.textContent = name;

    const title = document.getElementById("lb-set-title");
    if (title) title.value = name;
    const phone = document.getElementById("lb-set-phone");
    if (phone) phone.value = businessValue("phone");
    const category = document.getElementById("lb-set-category");
    if (category) category.value = businessValue("category");
    const address = document.getElementById("lb-set-address");
    if (address) address.value = businessValue("address");
    const maps = document.getElementById("lb-set-maps");
    if (maps) maps.value = businessValue("mapsUrl");

    const ctx = state.project?.business_context || {};
    const accent = String(ctx.accentColor || "#3b82f6");
    const accentEl = document.getElementById("lb-set-accent");
    const accentHex = document.getElementById("lb-set-accent-hex");
    if (accentEl) accentEl.value = accent;
    if (accentHex) accentHex.value = accent;

    const url = liveSiteUrl();
    const liveUrlEl = document.getElementById("lb-set-live-url");
    const domainRow = document.getElementById("lb-set-domain-row");
    const domainNote = document.getElementById("lb-set-domain-note");
    const domainInput = document.getElementById("lb-set-domain");
    const shareUrl = document.getElementById("lb-set-share-url");
    const shareHint = document.getElementById("lb-set-share-hint");
    const openBtn = document.getElementById("lb-set-open-link");
    const publishBtn = document.getElementById("lb-set-publish");

    if (domainInput) domainInput.value = String(ctx.customDomain || "");

    if (url) {
      if (liveUrlEl) {
        liveUrlEl.hidden = false;
        liveUrlEl.textContent = url;
      }
      if (domainRow) domainRow.hidden = false;
      if (domainNote) domainNote.hidden = true;
      if (shareUrl) shareUrl.value = url;
      if (shareHint) shareHint.textContent = "Anyone with this link can view your live site.";
      if (openBtn) openBtn.disabled = false;
      if (publishBtn) publishBtn.textContent = "Re-publish Site";
    } else {
      if (liveUrlEl) {
        liveUrlEl.hidden = true;
        liveUrlEl.textContent = "";
      }
      if (domainRow) domainRow.hidden = true;
      if (domainNote) {
        domainNote.hidden = false;
        domainNote.textContent = "Publish your site first to connect a domain.";
      }
      if (shareUrl) shareUrl.value = "";
      if (shareHint) {
        shareHint.textContent = state.html
          ? "Publish first to get a public URL."
          : "Generate and publish a site to share a link.";
      }
      if (openBtn) openBtn.disabled = true;
      if (publishBtn) publishBtn.textContent = "Publish Site";
    }

    if (publishBtn) publishBtn.disabled = !state.projectId || !state.html;
  }

  function setSiteSettingsOpen(open) {
    const el = document.getElementById("builder-site-settings");
    const settingsBtn = document.getElementById("btn-builder-settings");
    if (!el) return;
    if (open && ensureOnboardSurvey()) return;
    if (open) {
      syncSiteSettingsUi();
      showSettingsTab("domain");
      setSiteSettingsError("");
      setSiteSettingsStatus("");
    }
    el.hidden = !open;
    el.classList.toggle("is-open", open);
    el.setAttribute("aria-hidden", open ? "false" : "true");
    if (settingsBtn) {
      settingsBtn.classList.toggle("is-active", open);
      settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function applyAccentToHtml(html, color) {
    const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#3b82f6";
    let next = String(html || "");
    const styleTag =
      '<style id="moonrise-accent">:root{--accent:' +
      safe +
      ";--ms-accent:" +
      safe +
      ";}a{accent-color:" +
      safe +
      ";}</style>";
    if (/id=["']moonrise-accent["']/.test(next)) {
      next = next.replace(
        /<style[^>]*id=["']moonrise-accent["'][^>]*>[\s\S]*?<\/style>/i,
        styleTag
      );
    } else if (/<\/head>/i.test(next)) {
      next = next.replace(/<\/head>/i, styleTag + "</head>");
    } else {
      next = styleTag + next;
    }
    return next;
  }

  function applyTitleToHtml(html, title) {
    const safe = String(title || "Site")
      .replace(/</g, "")
      .replace(/>/g, "")
      .trim();
    let next = String(html || "");
    if (/<title>[\s\S]*?<\/title>/i.test(next)) {
      next = next.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + safe + "</title>");
    }
    return next;
  }

  async function persistProjectPatch(patch) {
    if (!state.projectId) throw new Error("Generate a site first");
    const user = await window.StudioAuth.getUser();
    const { error } = await sb()
      .from("projects")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.projectId)
      .eq("user_id", user.id);
    if (error) throw error;
    await loadProject(state.projectId);
  }

  async function saveBrandingFromSettings() {
    setSiteSettingsError("");
    setSiteSettingsStatus("");
    const title = sanitizeClientText(document.getElementById("lb-set-title")?.value || "", 120);
    let accent = String(document.getElementById("lb-set-accent-hex")?.value || "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) {
      accent = String(document.getElementById("lb-set-accent")?.value || "#3b82f6");
    }
    if (!title) {
      setSiteSettingsError("Site title is required.");
      return;
    }
    if (!state.html) {
      setSiteSettingsError("Generate a site before applying branding.");
      return;
    }
    setBusinessValue("businessName", title);
    let html = applyTitleToHtml(state.html, title);
    html = applyAccentToHtml(html, accent);
    state.html = html;
    const ctx = {
      ...(state.project?.business_context || {}),
      businessName: title,
      accentColor: accent,
    };
    try {
      await persistProjectPatch({
        business_name: title,
        html,
        business_context: ctx,
      });
      updatePreview();
      syncSiteSettingsUi();
      setSiteSettingsStatus("Branding applied.");
    } catch (e) {
      setSiteSettingsError(e.message || "Could not save branding");
    }
  }

  async function saveContactFromSettings() {
    setSiteSettingsError("");
    setSiteSettingsStatus("");
    const phone = sanitizeClientText(document.getElementById("lb-set-phone")?.value || "", 40);
    const category = sanitizeClientText(document.getElementById("lb-set-category")?.value || "", 80);
    const address = sanitizeClientText(document.getElementById("lb-set-address")?.value || "", 200);
    const maps = sanitizeClientText(document.getElementById("lb-set-maps")?.value || "", 500);
    if (maps && !/^https?:\/\//i.test(maps)) {
      setSiteSettingsError("Maps link must start with http:// or https://.");
      return;
    }
    setBusinessValue("phone", phone);
    setBusinessValue("category", category);
    setBusinessValue("address", address);
    setBusinessValue("mapsUrl", maps);
    const name = businessValue("businessName") || "Untitled business";
    const ctx = {
      ...(state.project?.business_context || {}),
      businessName: name,
      phone,
      category,
      address,
      mapsUrl: maps,
    };
    if (!state.projectId) {
      setSiteSettingsStatus("Contact saved locally.");
      return;
    }
    try {
      await persistProjectPatch({ business_context: ctx });
      syncSiteSettingsUi();
      setSiteSettingsStatus("Contact saved.");
    } catch (e) {
      setSiteSettingsError(e.message || "Could not save contact");
    }
  }

  async function saveDomainFromSettings() {
    setSiteSettingsError("");
    setSiteSettingsStatus("");
    if (!liveSiteUrl()) {
      setSiteSettingsError("Publish your site first to connect a domain.");
      return;
    }
    const domain = sanitizeClientText(document.getElementById("lb-set-domain")?.value || "", 120)
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .toLowerCase();
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      setSiteSettingsError("Enter a valid domain like www.yourbusiness.com");
      return;
    }
    const ctx = {
      ...(state.project?.business_context || {}),
      customDomain: domain,
    };
    try {
      await persistProjectPatch({ business_context: ctx });
      syncSiteSettingsUi();
      setSiteSettingsStatus("Domain saved. Point DNS to your Vercel deployment next.");
    } catch (e) {
      setSiteSettingsError(e.message || "Could not save domain");
    }
  }

  async function copyText(text) {
    const value = String(text || "");
    if (!value) throw new Error("Nothing to copy");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function bindSiteSettings() {
    document.getElementById("btn-builder-settings")?.addEventListener("click", () => {
      const el = document.getElementById("builder-site-settings");
      const open = el && !el.hidden;
      setSiteSettingsOpen(!open);
    });
    document.getElementById("btn-close-site-settings")?.addEventListener("click", () => {
      setSiteSettingsOpen(false);
    });
    document.getElementById("builder-site-settings")?.addEventListener("click", (e) => {
      if (e.target?.id === "builder-site-settings") setSiteSettingsOpen(false);
    });
    document.querySelectorAll("[data-settings-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showSettingsTab(btn.getAttribute("data-settings-tab"));
        setSiteSettingsError("");
        setSiteSettingsStatus("");
      });
    });
    document.getElementById("lb-set-publish")?.addEventListener("click", async () => {
      setSiteSettingsError("");
      await publish();
      syncSiteSettingsUi();
      if (liveSiteUrl()) setSiteSettingsStatus("Published.");
    });
    document.getElementById("lb-set-domain-save")?.addEventListener("click", () => {
      void saveDomainFromSettings();
    });
    document.getElementById("lb-set-branding-save")?.addEventListener("click", () => {
      void saveBrandingFromSettings();
    });
    document.getElementById("lb-set-contact-save")?.addEventListener("click", () => {
      void saveContactFromSettings();
    });
    document.getElementById("lb-set-accent")?.addEventListener("input", (e) => {
      const hex = document.getElementById("lb-set-accent-hex");
      if (hex) hex.value = e.target.value;
    });
    document.getElementById("lb-set-accent-hex")?.addEventListener("change", (e) => {
      const v = String(e.target.value || "").trim();
      const color = document.getElementById("lb-set-accent");
      if (color && /^#[0-9a-fA-F]{6}$/.test(v)) color.value = v;
    });
    document.getElementById("lb-set-copy-link")?.addEventListener("click", async () => {
      try {
        await copyText(document.getElementById("lb-set-share-url")?.value || liveSiteUrl());
        setSiteSettingsStatus("Link copied.");
      } catch (e) {
        setSiteSettingsError(e.message || "Could not copy");
      }
    });
    document.getElementById("lb-set-open-link")?.addEventListener("click", () => {
      const url = liveSiteUrl();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
    document.getElementById("lb-set-copy-pitch")?.addEventListener("click", async () => {
      const name =
        businessValue("businessName") ||
        state.project?.business_name ||
        "your business";
      const url = liveSiteUrl();
      const pitch = url
        ? "Hey — I put together a site for " + name + ". Take a look: " + url
        : "Hey — I can build a polished site for " + name + ". Want a quick preview?";
      try {
        await copyText(pitch);
        setSiteSettingsStatus("Pitch copied.");
      } catch (e) {
        setSiteSettingsError(e.message || "Could not copy");
      }
    });
    document.getElementById("lb-set-delete")?.addEventListener("click", () => {
      setSiteSettingsOpen(false);
      void deleteProject();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const viewer = document.getElementById("template-viewer");
      if (viewer && !viewer.hidden) {
        closeTemplateViewer();
        e.preventDefault();
        return;
      }
      const settings = document.getElementById("builder-site-settings");
      if (settings && !settings.hidden) {
        setSiteSettingsOpen(false);
        e.preventDefault();
        return;
      }
      if (dismissOnboard()) {
        e.preventDefault();
      }
    });
  }

  function bindOnboard() {
    let mapsTimer = null;

    document.getElementById("template-viewer-close")?.addEventListener("click", closeTemplateViewer);
    document.getElementById("template-viewer-back")?.addEventListener("click", closeTemplateViewer);
    document.getElementById("template-viewer")?.addEventListener("click", (event) => {
      if (event.target?.id === "template-viewer") closeTemplateViewer();
    });
    document.getElementById("template-viewer-generate")?.addEventListener("click", () => {
      closeTemplateViewer();
      document.getElementById("onboard-generate")?.click();
    });

    document.getElementById("onboard-cancel")?.addEventListener("click", () => {
      leaveBuilder();
    });

    document.getElementById("onboard-next")?.addEventListener("click", () => {
      setOnboardError("");
      if (!canContinueOnboard()) {
        setOnboardError("Paste a link or fill every manual field.");
        updateOnboardContinue();
        return;
      }
      const err = validateOnboardDetails();
      if (err) {
        setOnboardError(err);
        return;
      }
      captureOnboardDetails();
      showOnboardStep(2);
    });

    document.getElementById("onboard-back")?.addEventListener("click", () => {
      setOnboardError("");
      showOnboardStep(1);
      updateOnboardContinue();
    });

    document.getElementById("onboard-generate")?.addEventListener("click", () => {
      setOnboardError("");
      const err = validateOnboardDetails();
      if (err) {
        showOnboardStep(1);
        setOnboardError(err);
        updateOnboardContinue();
        return;
      }
      if (!state.templateId) {
        setOnboardError("Pick a template.");
        return;
      }
      captureOnboardDetails();
      generate({ fromOnboard: true });
    });

    document.getElementById("onb-maps")?.addEventListener("input", () => {
      clearTimeout(mapsTimer);
      const maps = document.getElementById("onb-maps")?.value?.trim() || "";
      if (!maps) {
        state.mapsReady = false;
        setScrapeStatus("");
        updateOnboardContinue();
        return;
      }
      // Unlock Continue as soon as it looks like a link
      if (isLooseLink(maps)) {
        state.mapsReady = true;
        updateOnboardContinue();
        mapsTimer = setTimeout(() => {
          void scrapeMapsLink();
        }, 650);
      } else {
        state.mapsReady = false;
        setScrapeStatus("");
        updateOnboardContinue();
      }
    });

    document.getElementById("onb-maps")?.addEventListener("paste", () => {
      clearTimeout(mapsTimer);
      mapsTimer = setTimeout(() => {
        const maps = document.getElementById("onb-maps")?.value?.trim() || "";
        if (isLooseLink(maps)) {
          state.mapsReady = true;
          updateOnboardContinue();
        }
        void scrapeMapsLink();
      }, 120);
    });

    ["onb-name", "onb-category", "onb-phone", "onb-address"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        updateOnboardContinue();
      });
    });

    updateOnboardContinue();
  }

  function bindToolbar() {
    document.querySelectorAll(".is-mode").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.mode === "code") {
          state.html = document.getElementById("code-editor")?.value || state.html;
        }
        state.mode = btn.dataset.mode;
        updatePreview();
      });
    });
    document.querySelectorAll(".is-vp").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.viewport = btn.dataset.vp;
        if (state.mode === "code") state.mode = "preview";
        updatePreview();
      });
    });
    document.getElementById("code-editor")?.addEventListener("input", () => {
      state.html = document.getElementById("code-editor").value;
    });
    document.getElementById("opt-ai-images")?.addEventListener("change", (e) => {
      state.aiImages = !!e.target.checked;
    });
    document.getElementById("opt-pro")?.addEventListener("change", (e) => {
      state.pro = !!e.target.checked;
    });
    document.getElementById("btn-generate")?.addEventListener("click", runPromptAction);
    document.getElementById("biz-notes")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runPromptAction();
      }
    });
    document.getElementById("btn-download-html")?.addEventListener("click", downloadHtml);
    document.getElementById("btn-publish-top")?.addEventListener("click", publish);
  }

  async function boot() {
    bindToolbar();
    bindSiteSettings();
    bindOnboard();
    const projectId = params().get("project_id");
    setBuilderPhase(projectId ? "workspace" : "setup");
    const fromFinder = intakeFromQuery();
    state.profile = await window.StudioAuth.getProfile();
    if (params().get("paid") === "1" && projectId) {
      setStatus("Payment received — watermark should be off. Refreshing…");
    }
    if (projectId) {
      try {
        await loadProject(projectId);
        if (!state.onboardDone) {
          setBuilderPhase("setup");
          showOnboardStep(1);
          updateOnboardContinue();
          const maps = document.getElementById("onb-maps")?.value?.trim();
          if (maps && isLooseLink(maps)) void scrapeMapsLink();
        } else {
          setBuilderPhase("workspace");
        }
        updateEmptyCopy(fromFinder);
      } catch (e) {
        setError(e.message);
        state.onboardDone = false;
        setBuilderPhase("setup");
        showOnboardStep(1);
        updateOnboardContinue();
        updatePreview();
      }
    } else {
      state.onboardDone = false;
      setBuilderPhase("setup");
      showOnboardStep(1);
      syncSetupStepIndicators(1);
      updateEmptyCopy(fromFinder);
      updatePreview();
      updateOnboardContinue();
      if (fromFinder) setStatus("Business details loaded — confirm and continue");
      const maps = document.getElementById("onb-maps")?.value?.trim();
      if (maps && isLooseLink(maps)) void scrapeMapsLink();
      else if (isManualComplete()) updateOnboardContinue();
    }
  }

  boot();
})();
