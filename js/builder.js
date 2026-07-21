/**
 * Builder - business details → generate with Website Presets, then AI edit / publish.
 */
(function () {
  const DEFAULT_TEMPLATE_ID = "local-service";

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
    userId: "",
    projectId: null,
    project: null,
    templateId: DEFAULT_TEMPLATE_ID,
    mode: "preview",
    viewport: "desktop",
    viewportBeforeFullscreen: "desktop",
    viewportWidths: {
      desktop: null,
      tablet: 768,
      phone: 390,
    },
    viewportHeights: {
      desktop: null,
      tablet: null,
      phone: null,
    },
    /** True only after the user manually resizes that viewport (keeps desktop fill by default). */
    viewportCustomized: {
      desktop: false,
      tablet: false,
      phone: false,
    },
    priceCents: 30000,
    html: "",
    profile: null,
    leadId: null,
    fromFinder: false,
    autoGeneratePending: false,
    aiImages: false,
    pro: false,
    mvpPlus: false,
    paidPlan: false,
    hasActiveSubscription: false,
    planStatus: "none",
    totalCredits: 0,
    generationCost: 5,
    builderOnboarded: false,
    onboardDone: false,
    onboardStep: 1,
    mapsReady: false,
    mapsScraping: false,
    business: {
      businessName: "",
      category: "",
      phone: "",
      address: "",
      description: "",
      mapsUrl: "",
      website: "",
      hours: "",
    },
    linkBusiness: {
      businessName: "",
      category: "",
      phone: "",
      address: "",
      description: "",
      mapsUrl: "",
      website: "",
      hours: "",
    },
  };

  const BUILDER_SIDE_WIDTH_KEY = "ms_lb_side_width_v2";
  const BUILDER_SHELL_NAV_KEY = "ms_lb_show_shell";
  const BUILDER_SIDE_MIN = 280;
  const BUILDER_SIDE_DEFAULT = 340;
  const BUILDER_SIDE_MAX = 520;

  /** Active /generate AbortController so sidebar cancel can stop the request. */
  let generateAbort = null;
  let generateInFlight = false;
  let generateBootStarted = false;
  const GEN_INFLIGHT_KEY = "ms_generate_inflight_v1";
  const GEN_INFLIGHT_MAX_MS = 15 * 60 * 1000;
  let genProgressActive = false;
  let genProgressPct = 0;
  let genProgressTimer = null;
  let genProgressFinishTimer = null;
  let previewSizeLabelHideTimer = null;
  let previewSizeLabelFadeTimer = null;
  const PREVIEW_SIZE_LABEL_MS = 1400;

  const BUSINESS_FIELDS = {
    businessName: "onb-name",
    category: "onb-category",
    phone: "onb-phone",
    address: "onb-address",
    description: "onb-description",
    mapsUrl: "onb-maps",
  };

  const BUILDER_INTAKE_KEY = "ms_builder_intake_v1";

  function pageKind() {
    const page = document.body?.dataset?.page || "builder";
    return page === "editor" ? "editor" : "builder";
  }

  function isBuilderFormPage() {
    return pageKind() === "builder";
  }

  function isEditorPage() {
    return pageKind() === "editor";
  }

  function shellChannelId() {
    return "builder";
  }

  function editorPageUrl(query) {
    const q = query instanceof URLSearchParams ? query : new URLSearchParams(query || {});
    const s = q.toString();
    return "editor.html" + (s ? "?" + s : "");
  }

  function redirectToEditor(extra) {
    const q = new URLSearchParams(location.search);
    if (extra && typeof extra === "object") {
      Object.entries(extra).forEach(([k, v]) => {
        if (v != null && v !== "") q.set(k, String(v));
      });
    }
    location.replace(editorPageUrl(q));
  }

  function persistIntakeForEditorHandoff() {
    captureOnboardDetails();
    const notes = readUserGenerationPrompt();
    try {
      sessionStorage.setItem(
        BUILDER_INTAKE_KEY,
        JSON.stringify({
          business: { ...state.business },
          linkBusiness: { ...state.linkBusiness },
          leadId: state.leadId || null,
          fromFinder: !!state.fromFinder,
          notes,
          templateId: state.templateId,
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function hydrateIntakeFromBuilderHandoff() {
    try {
      const raw = sessionStorage.getItem(BUILDER_INTAKE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.business && typeof data.business === "object") {
        Object.assign(state.business, data.business);
      }
      if (data.linkBusiness && typeof data.linkBusiness === "object") {
        Object.assign(state.linkBusiness, data.linkBusiness);
      }
      if (data.leadId) state.leadId = String(data.leadId);
      if (data.fromFinder) state.fromFinder = true;
      if (data.templateId) state.templateId = data.templateId;
      if (data.notes) {
        setUserGenerationPrompt(data.notes);
      }
      sessionStorage.removeItem(BUILDER_INTAKE_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function readUserGenerationPrompt() {
    if (state._pendingNotes) {
      return sanitizeClientText(state._pendingNotes, 2000);
    }
    return "";
  }

  function setUserGenerationPrompt(value) {
    state._pendingNotes = sanitizeClientText(value || "", 2000) || "";
  }

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
    if (typeof window.resolveWorkerUrl === "function") {
      const resolved = String(window.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    const cached = String(window.__MOONRISE_RESOLVED_WORKER_URL || "")
      .trim()
      .replace(/\/$/, "");
    if (cached) return cached;
    return String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function clampBuilderSideWidth(width, bodyWidth) {
    const maxFromBody =
      Number.isFinite(bodyWidth) && bodyWidth > 0
        ? Math.max(BUILDER_SIDE_MIN, Math.min(BUILDER_SIDE_MAX, Math.floor(bodyWidth - 420)))
        : BUILDER_SIDE_MAX;
    return Math.max(BUILDER_SIDE_MIN, Math.min(maxFromBody, Math.round(width)));
  }

  function applyBuilderSideWidth(width) {
    const body = document.querySelector(".ms-lb-body");
    if (!body) return;
    const next = clampBuilderSideWidth(width, body.getBoundingClientRect().width);
    body.style.setProperty("--ms-lb-side-w", next + "px");
  }

  function sb() {
    const client = window.SiteSupabase?.getClient?.();
    if (!client) {
      throw new Error(
        "Supabase is not configured. Reload the page - if this persists, check that js/config.js loaded."
      );
    }
    return client;
  }

  function params() {
    return new URLSearchParams(location.search);
  }

  function setStatus(msg) {
    const el = document.getElementById("builder-status");
    if (el) {
      el.textContent = msg || "";
      el.classList.toggle("is-error", false);
    }
    const setupEl = document.getElementById("builder-setup-status");
    if (setupEl) {
      setupEl.hidden = !msg;
      setupEl.textContent = msg || "";
    }
  }

  function setError(msg) {
    const el = document.getElementById("builder-error");
    const status = document.getElementById("builder-status");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    if (!msg) {
      if (status) status.classList.remove("is-error");
      if (!genProgressActive) clearPreviewGenError();
      window.StudioToast?.clear?.();
      return;
    }
    // Keep a persistent line above the ask bar - toast alone is easy to miss.
    if (status) {
      status.textContent = msg;
      status.classList.add("is-error");
    }
    // Always surface the error in preview when there is no site yet.
    if (!(state.html && String(state.html).trim())) {
      failGenerateProgress(msg);
    }
    window.StudioToast?.error?.(msg);
  }

  function clearPreviewGenError() {
    const err = document.getElementById("preview-gen-error");
    if (err) {
      err.hidden = true;
      err.setAttribute("hidden", "");
    }
  }

  function showPreviewGenError(msg) {
    stopGenerateProgressTick();
    genProgressActive = false;
    document.body.classList.remove("ms-lb-generating");
    document.documentElement.classList.remove("ms-lb-boot-generating");
    const loading = document.getElementById("preview-loading");
    if (loading) {
      loading.hidden = true;
      loading.setAttribute("hidden", "");
    }
    const err = document.getElementById("preview-gen-error");
    const copy = document.getElementById("preview-gen-error-copy");
    if (copy) copy.textContent = String(msg || "Generation failed").trim();
    if (err) {
      err.hidden = false;
      err.removeAttribute("hidden");
    }
    const empty = document.getElementById("preview-empty");
    if (empty) empty.hidden = true;
  }

  function stopGenerateProgressTick() {
    if (genProgressTimer) {
      window.clearInterval(genProgressTimer);
      genProgressTimer = null;
    }
    if (genProgressFinishTimer) {
      window.clearTimeout(genProgressFinishTimer);
      genProgressFinishTimer = null;
    }
  }

  function renderGenerateProgress(pct, label) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    genProgressPct = clamped;
    const fill = document.getElementById("preview-progress-fill");
    const pctEl = document.getElementById("preview-progress-pct");
    const bar = document.getElementById("preview-progress");
    const copy = document.getElementById("preview-loading-copy");
    if (fill) fill.style.width = clamped + "%";
    if (pctEl) pctEl.textContent = clamped + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(clamped));
    if (label && copy) copy.textContent = label;
  }

  function startGenerateProgress(label) {
    stopGenerateProgressTick();
    clearPreviewGenError();
    genProgressActive = true;
    genProgressPct = 0;
    document.body.classList.add("ms-lb-generating");
    document.documentElement.classList.remove("ms-lb-boot-generating");
    renderGenerateProgress(0, label || "Building your website…");
    syncBuilderChannelGenerating({ cancellable: false });
    const startedAt = Date.now();
    const approachMs = 90000;
    genProgressTimer = window.setInterval(() => {
      if (!genProgressActive) return;
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / approachMs);
      const eased = 1 - Math.pow(1 - t, 2.2);
      // Climb toward 95% while waiting; 100% is reserved for a finished site.
      const cap = generateAbort ? 95 : 90;
      const target = Math.floor(5 + eased * (cap - 5));
      if (target > genProgressPct) renderGenerateProgress(target);

      // Hard stop so the bar never sits at 92% forever.
      if (elapsed > 165000 && !(state.html && String(state.html).trim())) {
        try {
          generateAbort?.abort();
        } catch (_) {
          /* ignore */
        }
        failGenerateProgress("Generation timed out. Please try again.");
        generateInFlight = false;
        generateAbort = null;
        syncBuilderChannelGenerating();
      }
    }, 180);
    syncEmptyState();
  }

  function clearGenerateProgressUi() {
    stopGenerateProgressTick();
    genProgressActive = false;
    genProgressPct = 0;
    document.body.classList.remove("ms-lb-generating");
    document.documentElement.classList.remove("ms-lb-boot-generating");
    renderGenerateProgress(0, "Building your website…");
    const loading = document.getElementById("preview-loading");
    if (loading) {
      loading.hidden = true;
      loading.setAttribute("hidden", "");
    }
    syncBuilderChannelGenerating();
  }

  function syncBuilderChannelGenerating(opts) {
    const busy = !!(generateAbort || generateInFlight || genProgressActive);
    window.StudioShell?.setChannelGenerating?.(
      shellChannelId(),
      busy,
      {
        // Cancel only while a live /generate AbortController exists.
        cancellable: !!(busy && generateAbort && opts?.cancellable !== false),
      }
    );
  }

  function finishGenerateProgress() {
    return new Promise((resolve) => {
      stopGenerateProgressTick();
      genProgressActive = true;
      document.body.classList.add("ms-lb-generating");
      renderGenerateProgress(100, "Website ready");
      syncEmptyState();
      genProgressFinishTimer = window.setTimeout(() => {
        clearGenerateProgressUi();
        syncEmptyState();
        resolve();
      }, 380);
    });
  }

  /** Paint the finished site and drive the bar to 100% - single completion path. */
  async function revealGeneratedSite(html, opts) {
    const next = ensureMobileFriendlyHtml(html || "");
    if (!String(next || "").trim()) {
      throw new Error("Generation returned empty HTML. Please try again.");
    }
    state.html = next;
    state.onboardDone = true;
    state.autoGeneratePending = false;
    state.mode = "preview";
    clearPreviewGenError();
    setBuilderPhase("workspace");
    renderGenerateProgress(100, "Website ready");
    syncEmptyState();
    updatePreview();
    writePreviewDocument(state.html);
    schedulePreviewRepaint();
    syncPromptActionUi();
    syncRedesignButtonUi();
    await finishGenerateProgress();
    // Re-assert paint after overlay hides (iframe can miss write while covered).
    if (state.html) {
      writePreviewDocument(state.html);
      schedulePreviewRepaint();
    }
    syncEmptyState();
    if (opts?.status) setStatus(opts.status);
    setPublishEnabled();
  }

  function failGenerateProgress(msg) {
    clearGenerateProgressUi();
    if (msg) showPreviewGenError(msg);
    else clearPreviewGenError();
    syncEmptyState();
  }

  function setPromptBusy(busy, label) {
    const status = document.getElementById("builder-status");
    const setupStatus = document.getElementById("builder-setup-status");
    if (busy) {
      if (!genProgressActive) startGenerateProgress(label || "Building your website…");
      else if (label) renderGenerateProgress(genProgressPct, label);
      if (setupStatus) {
        setupStatus.hidden = true;
        setupStatus.textContent = "";
      }
      if (status) status.textContent = "";
    } else {
      if (genProgressActive && genProgressPct < 100) {
        clearGenerateProgressUi();
      } else if (!genProgressActive) {
        document.body.classList.remove("ms-lb-generating");
        document.documentElement.classList.remove("ms-lb-boot-generating");
      }
      if (setupStatus) {
        setupStatus.hidden = true;
        setupStatus.textContent = "";
      }
    }
    // Channel progress tracks prepare + in-flight generate (not only AbortController).
    syncBuilderChannelGenerating();
    if (!busy) {
      generateAbort = null;
      syncBuilderChannelGenerating();
      updateEmptyCopy(state.fromFinder);
    }
    syncEmptyState();
  }

  function cancelActiveGeneration() {
    if (!generateAbort) return false;
    try {
      generateAbort.abort();
    } catch (_) {
      /* ignore */
    }
    generateAbort = null;
    return true;
  }

  document.addEventListener("ms:cancel-generation", () => {
    cancelActiveGeneration();
  });

  function syncPromptActionUi() {
    /* Ask AI bar removed - edits happen outside this UI. */
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
      // Full real page - never card mode
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
      /* cross-origin or not ready - ignore */
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
    syncManualFieldsExpanded();
  }

  function applyLeadIntake(payload, opts) {
    const p = payload && typeof payload === "object" ? payload : {};
    const force = !!(opts && opts.force);
    const name = String(p.businessName || p.name || "").trim();
    const category = String(p.category || "").trim();
    const phone = String(p.phone || "").trim();
    const address = String(p.address || "").trim();
    const maps = String(p.mapsUrl || p.maps || "").trim();
    const website = String(p.website || p.websiteUrl || "").trim();
    const hours = String(p.hours || "").trim();
    const description = String(p.description || p.about || "").trim();
    if (p.leadId) state.leadId = String(p.leadId);
    if (name) setBusinessValue("businessName", name, !force);
    if (category) setBusinessValue("category", category, !force);
    if (phone) setBusinessValue("phone", phone, !force);
    if (address) setBusinessValue("address", address, !force);
    if (website) setBusinessValue("website", website, !force);
    if (hours) setBusinessValue("hours", hours, !force);
    if (description) setBusinessValue("description", description, !force);
    if (maps) {
      setBusinessValue("mapsUrl", maps, !force);
      state.mapsReady = true;
    }
  }

  function buildFinderPrompt() {
    const name = businessValue("businessName") || "this business";
    const category = businessValue("category");
    const address = businessValue("address");
    const phone = businessValue("phone");
    const website = businessValue("website");
    const hours = businessValue("hours");
    const description = businessValue("description");
    const maps = businessValue("mapsUrl");
    const rating = String(params().get("rating") || "").trim();
    const reviews = String(params().get("reviews") || "").trim();
    const parts = [
      "Create a complete multi-section landing page website for " + name + ".",
      "Use ONLY the real business facts below in the hero, contact blocks, footer, and CTAs - never invent a different company name or phone.",
    ];
    if (category) parts.push("Trade/category: " + category + ".");
    if (address) parts.push("Service address: " + address + ".");
    if (phone) parts.push("Phone (click-to-call): " + phone + ".");
    if (maps) parts.push("Google Maps link for directions: " + maps + ".");
    if (website) parts.push("Existing website (reference only, do not iframe): " + website + ".");
    if (hours) parts.push("Hours: " + hours + ".");
    if (description) parts.push("About: " + description + ".");
    if (rating) parts.push("Google rating: " + rating + (reviews ? " (" + reviews + " reviews)" : "") + ".");
    parts.push(
      "Required page sections: sticky nav, hero with primary CTA, services, credibility/proof, about, testimonials, FAQ or pricing when relevant, contact form, and footer with phone + address.",
      "Mobile-first, conversion-focused, ready to publish."
    );
    return parts.join(" ");
  }

  function intakeFromQuery() {
    const p = params();
    if (!hasFreshLeadIntake(p)) {
      // Plain builder open - never reuse a leftover Finder pick.
      // Keep state when opening an existing project by id.
      if (!p.get("project_id")) clearBuilderForNextVisit();
      return false;
    }

    state.leadId = p.get("lead_id") || p.get("lead") || null;
    state.fromFinder =
      p.get("from_finder") === "1" ||
      p.get("auto_generate") === "1" ||
      !!(p.get("lead_id") || p.get("lead") || p.get("pick"));
    try {
      if (!state.fromFinder && sessionStorage.getItem("lpc_lead_pick_pending_v1") === "1") {
        state.fromFinder = true;
      }
    } catch (_) {
      /* ignore */
    }

    // Prefer sessionStorage / pick payload before query fields (more complete).
    applyPickFromStorageOrQuery(p, { retain: true });

    applyLeadIntake(
      {
        businessName: p.get("name") || "",
        category: p.get("category") || "",
        phone: p.get("phone") || "",
        address: p.get("address") || "",
        mapsUrl: p.get("maps") || "",
        website: p.get("website") || "",
        hours: p.get("hours") || "",
        description: p.get("description") || "",
        leadId: state.leadId,
      },
      { force: true }
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

    if (state.fromFinder && (bizName || state.leadId)) {
      state.autoGeneratePending = p.get("auto_generate") !== "0";
    }
    return filled;
  }

  function applyPickFromStorageOrQuery(p, opts) {
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
    if (!pick || typeof pick !== "object") return false;

    applyLeadIntake(
      {
        leadId: pick.leadId,
        businessName: pick.businessName || pick.name,
        category: pick.category,
        phone: pick.phone,
        address: pick.address,
        mapsUrl: pick.mapsUrl || pick.maps,
        website: pick.website || pick.websiteUrl,
        hours: pick.hours,
        description: pick.description || pick.about,
      },
      { force: true }
    );
    // Keep the pick until /generate is armed so retries still have lead facts.
    if (!opts?.retain) {
      try {
        sessionStorage.removeItem("lpc_lead_pick_pending_v1");
        sessionStorage.removeItem("lpc_lead_pick_v1");
      } catch (_) {
        /* ignore */
      }
    }
    return true;
  }

  function readBuilderShellHidden() {
    try {
      return localStorage.getItem(BUILDER_SHELL_NAV_KEY) === "0";
    } catch (_) {
      return false;
    }
  }

  function syncBuilderShellLayout() {
    if (isEditorPage()) {
      document.body.classList.add("ms-lb-hide-shell");
      return;
    }
    const hideShell =
      readBuilderShellHidden() && window.matchMedia("(min-width: 901px)").matches;
    document.body.classList.toggle("ms-lb-hide-shell", hideShell);
    window.dispatchEvent(new Event("resize"));
  }

  function setBuilderPhase(phase) {
    const setup = document.getElementById("builder-setup");
    const workspace = document.getElementById("builder-workspace");
    const isSetup = phase === "setup";
    if (setup) setup.hidden = !isSetup;
    if (workspace) workspace.hidden = isSetup;
    document.body.classList.toggle("ms-lb-setup", isSetup);
    document.body.classList.toggle("ms-lb-workspace", !isSetup);
    syncBuilderShellLayout();
    syncPromptActionUi();
  }

  function setOnboardOpen(open) {
    if (isEditorPage()) {
      if (!open) return;
      location.href = "builder.html";
      return;
    }
    if (
      !open &&
      !state.onboardDone &&
      !state.builderOnboarded &&
      !hasOpenProject() &&
      !hasFinderHandoff()
    ) {
      return;
    }
  }

  /** Send the user back to the page they opened from (Business Finder, Projects, Dashboard…). */
  function leaveBuilder() {
    if (isEditorPage()) {
      location.href = "builder.html";
      return;
    }
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

  const BUILDER_ONBOARD_KEY = "ms_builder_onboard_done_v1";

  function userScopedKey(base) {
    return base + "_" + (state.userId || "anon");
  }

  function profileBranding(profile) {
    return profile?.branding_defaults &&
      typeof profile.branding_defaults === "object" &&
      !Array.isArray(profile.branding_defaults)
      ? profile.branding_defaults
      : {};
  }

  function profileHasBuilderOnboarded(profile) {
    const branding = profileBranding(profile);
    return !!(
      branding.builderOnboarded ||
      branding.builder_onboarded ||
      branding.builderOnboardingDone
    );
  }

  function localHasBuilderOnboarded() {
    try {
      return localStorage.getItem(userScopedKey(BUILDER_ONBOARD_KEY)) === "1";
    } catch (_) {
      return false;
    }
  }

  function syncBuilderOnboardedFromProfile(profile) {
    state.builderOnboarded = profileHasBuilderOnboarded(profile) || localHasBuilderOnboarded();
  }

  async function markBuilderOnboarded() {
    if (state.builderOnboarded) return;
    state.builderOnboarded = true;
    try {
      localStorage.setItem(userScopedKey(BUILDER_ONBOARD_KEY), "1");
    } catch (_) {
      /* ignore */
    }
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) return;
      const nextBranding = {
        ...profileBranding(state.profile),
        builderOnboarded: true,
      };
      const { error } = await sb()
        .from("profiles")
        .update({ branding_defaults: nextBranding })
        .eq("id", user.id);
      if (!error) {
        state.profile = {
          ...(state.profile || {}),
          branding_defaults: nextBranding,
        };
      }
    } catch (_) {
      /* Local flag is enough if the profile update fails. */
    }
  }

  async function inferBuilderOnboardedFromProjects() {
    if (state.builderOnboarded || !state.userId) return;
    try {
      const { data, error } = await sb()
        .from("projects")
        .select("id")
        .eq("user_id", state.userId)
        .limit(1)
        .maybeSingle();
      if (!error && data?.id) {
        await markBuilderOnboarded();
      }
    } catch (_) {
      /* First-time users or network failures can continue through setup. */
    }
  }

  /**
   * Wipe everything the builder is holding so the page is a blank slate next
   * time it's opened. Runs on leave (pagehide), on bfcache restore, and at the
   * start of a fresh setup visit so the form is always ready for new paste-in.
   */
  function clearBuilderForNextVisit() {
    clearTimeout(editState.saveTimer);
    exitEditMode({ serialize: false });
    editState.history = [];
    editState.historyIndex = -1;
    editState.lastWrittenHtml = "";
    editState.saveGeneration = 0;
    setEditSaveStatus("idle");

    Object.values(BUSINESS_FIELDS).forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = "";
    });
    state._pendingNotes = "";
    const codeEl = document.getElementById("code-editor");
    if (codeEl) codeEl.value = "";

    state.projectId = null;
    state.project = null;
    state.html = "";
    state.leadId = null;
    state.fromFinder = false;
    state.autoGeneratePending = false;
    state.onboardDone = false;
    state.onboardStep = 1;
    state.mapsReady = false;
    state.mapsScraping = false;
    state.mode = "preview";
    Object.keys(state.business).forEach((k) => (state.business[k] = ""));
    syncManualFieldsExpanded();
    Object.keys(state.linkBusiness).forEach((k) => (state.linkBusiness[k] = ""));

    try {
      sessionStorage.removeItem("lpc_lead_pick_v1");
      sessionStorage.removeItem("lpc_lead_pick_pending_v1");
    } catch (_) {
      /* ignore */
    }

    try {
      setScrapeStatus("");
    } catch (_) {
      /* ignore */
    }
  }

  /** True when the URL intentionally handed a lead into Builder (not a stale visit). */
  function hasFreshLeadIntake(p) {
    const q = p || params();
    return !!(
      q.get("from_finder") === "1" ||
      q.get("auto_generate") === "1" ||
      q.get("pick") ||
      q.get("lead_id") ||
      q.get("lead") ||
      q.get("name") ||
      q.get("maps") ||
      q.get("phone") ||
      q.get("address")
    );
  }

  /** True when opening / editing an existing project (not a blank create visit). */
  function hasOpenProject() {
    return !!(state.projectId || params().get("project_id"));
  }

  /** Finder swipe / lead handoff - must not be wiped or sent to blank setup. */
  function hasFinderHandoff() {
    return !!(state.fromFinder || hasFreshLeadIntake());
  }

  function ensureOnboardSurvey() {
    // Existing project / Finder handoff opens are never the create survey.
    if (state.onboardDone || state.builderOnboarded || hasOpenProject() || hasFinderHandoff()) {
      return false;
    }
    if (isEditorPage()) {
      location.href = "builder.html";
      return true;
    }
    showOnboardStep(1);
    updateOnboardContinue();
    return true;
  }

  function syncSetupStepIndicators() {
    /* single-step setup - no progress indicators */
  }

  function dismissOnboard() {
    return false;
  }

  function showOnboardStep(step) {
    state.onboardStep = 1;
    const s1 = document.getElementById("onboard-step-1");
    if (!s1) return;
    s1.hidden = false;
    s1.classList.add("is-active");
    updateOnboardContinue();
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
    // Any link is enough - no Google-only requirement
    return isLooseLink(f.maps);
  }

  function canContinueOnboard() {
    // Wait until Maps lookup finishes so Generate uses resolved details.
    if (state.mapsScraping) return false;
    const fields = readOnboardFields();
    if (isMapsPathReady(fields) || isManualComplete(fields)) return true;
    // Business Finder handoff may omit phone - still let them continue with the rest.
    if (
      state.leadId &&
      fields.name &&
      (fields.maps || fields.category || fields.address || fields.phone)
    ) {
      return true;
    }
    return false;
  }

  const ONBOARD_GENERATE_LABEL = "Generate site";

  function setOnboardGenerateLoading(busy, label) {
    const btn = document.getElementById("onboard-generate");
    if (!btn) return;
    btn.classList.toggle("is-busy", !!busy);
    btn.setAttribute("aria-busy", busy ? "true" : "false");
    if (busy) {
      btn.disabled = true;
      btn.textContent = label || "Loading…";
    } else {
      btn.textContent = ONBOARD_GENERATE_LABEL;
    }
  }

  function updateOnboardContinue() {
    const btn = document.getElementById("onboard-generate");
    if (!btn) return;
    // Keep Generate in a loading state while Maps lookup or /generate is in flight.
    if (state.mapsScraping) {
      setOnboardGenerateLoading(true, "Looking up…");
      window.StudioShell?.setChannelGenerating?.(shellChannelId(), true, { cancellable: false });
      return;
    }
    if (generateAbort || generateInFlight || genProgressActive) {
      setOnboardGenerateLoading(true, "Generating…");
      syncBuilderChannelGenerating();
      return;
    }
    setOnboardGenerateLoading(false);
    btn.disabled = !canContinueOnboard();
  }

  function shouldExpandManualFields() {
    const name = String(document.getElementById("onb-name")?.value || "").trim();
    const category = String(document.getElementById("onb-category")?.value || "").trim();
    const phone = String(document.getElementById("onb-phone")?.value || "").trim();
    const address = String(document.getElementById("onb-address")?.value || "").trim();
    const description = String(document.getElementById("onb-description")?.value || "").trim();
    const active = document.activeElement?.id;
    const primaryFocused =
      active === "onb-name" ||
      active === "onb-phone" ||
      active === "onb-category" ||
      active === "onb-address" ||
      active === "onb-description";
    return !!(name || category || phone || address || description || primaryFocused);
  }

  function syncManualFieldsExpanded() {
    const section = document.querySelector(".ms-bs-path--manual");
    if (!section) return;
    section.classList.toggle("is-manual-expanded", shouldExpandManualFields());
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
    // Busy/success are shown on the input shell - no status line text.
    if (tone === "ok" || tone === "busy" || !msg) {
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
      /* ignore - optional enrichment */
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

    // Link alone unlocks Continue - scrape fills manual fields best-effort
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
    setScrapeStatus("", "busy");
    updateOnboardContinue();
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
      // Clear lookup progress on the Builder channel unless /generate is already running.
      if (!generateAbort) {
        window.StudioShell?.setChannelGenerating?.(null, false);
      }
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
    if (state.html && state.html.trim()) {
      syncEmptyState();
      return;
    }
    if (genProgressActive) {
      syncEmptyState();
      return;
    }
    const name = businessValue("businessName");
    if (fromFinder && name && !state.onboardDone) {
      copy.textContent = "Add a Google link or manual details, then generate your site";
    } else if (!state.onboardDone && !state.projectId && isEditorPage()) {
      copy.textContent = "Open Builder to gather business details, then generate your site here";
    } else if (!state.onboardDone) {
      copy.textContent = "Add a Google link or manual details, then generate your site";
    } else if (fromFinder && name) {
      copy.textContent = "Website ready for " + name;
    } else {
      copy.textContent = "Your website is ready";
    }
    syncEmptyState();
  }

  function isOwnerHandle() {
    const handle = String(state.profile?.handle || "")
      .toLowerCase()
      .replace(/^@/, "");
    if (!handle) return false;
    const owners = window.SITE_CONFIG?.ownerHandles || [];
    return owners.some((h) => String(h || "").toLowerCase() === handle);
  }

  function hasActiveSubscription() {
    return !!(state.hasActiveSubscription || isOwnerHandle());
  }

  function hasPaidPlan() {
    return hasActiveSubscription();
  }

  function hasMvpPlus() {
    return !!(state.mvpPlus || hasActiveSubscription());
  }

  /** View Code / Download - MVP+ subscription or active paid plan. */
  function canAccessCodeTools() {
    return hasMvpPlus();
  }

  const MVP_STAR_TONES = 6;

  function cycleMvpStar(star) {
    if (!star) return;
    const next = (Number(star.dataset.tone || 0) + 1) % MVP_STAR_TONES;
    star.dataset.tone = String(next);
    star.classList.remove("is-flash");
    void star.offsetWidth;
    star.classList.add("is-flash");
  }

  function ensureMvpStar(btn, locked) {
    if (!btn) return;
    let star = btn.querySelector(".ms-mvp-star");
    if (!locked) {
      star?.remove();
      return;
    }
    if (!star) {
      star = document.createElement("span");
      star.className = "ms-mvp-star";
      star.dataset.tone = "0";
      star.setAttribute("role", "button");
      star.setAttribute("tabindex", "0");
      star.setAttribute("aria-label", "Premium feature");
      star.title = "Premium - click the star to shift colors";
      star.innerHTML = '<span class="ms-mvp-star-glyph" aria-hidden="true"></span>';
      star.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cycleMvpStar(star);
      });
      star.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        cycleMvpStar(star);
      });
      btn.appendChild(star);
    }
  }

  /** Gate Code / Download - MVP+ or active paid plan. */
  function denyPaidPlan(feature) {
    const label = feature === "download" ? "Download HTML" : "View Code";
    const btn =
      feature === "download"
        ? document.getElementById("btn-download-html")
        : document.querySelector('.is-mode[data-mode="code"]');
    cycleMvpStar(btn?.querySelector(".ms-mvp-star"));
    window.StudioToast?.error?.(
      label + " unlocks with MVP+ (Donate) or an active Starter, Pro, or Business plan."
    );
    if (state.mode === "code") {
      state.mode = "preview";
      try {
        updatePreview();
      } catch (_) {
        /* ignore */
      }
    }
    location.href = "donate.html";
    return false;
  }

  function requirePaidPlan(feature) {
    if (canAccessCodeTools()) return true;
    return denyPaidPlan(feature);
  }

  async function requirePaidPlanAsync(feature) {
    if (canAccessCodeTools()) return true;
    // Credits often load after first paint - refresh once before denying.
    await syncCreditsFromWorker();
    if (canAccessCodeTools()) return true;
    return denyPaidPlan(feature);
  }

  /** @deprecated alias */
  function requireMvpPlus(feature) {
    return requirePaidPlan(feature);
  }

  function syncMvpAccessUi() {
    const locked = !canAccessCodeTools();
    const codeBtn = document.querySelector('.is-mode[data-mode="code"]');
    const downloadBtn = document.getElementById("btn-download-html");
    const lockHint = "Unlock with MVP+ (Donate) or an active Starter, Pro, or Business plan";
    if (codeBtn) {
      codeBtn.classList.toggle("is-mvp-locked", locked);
      codeBtn.setAttribute("aria-disabled", locked ? "true" : "false");
      codeBtn.title = locked ? lockHint : "Code";
      codeBtn.setAttribute(
        "aria-label",
        locked ? "View Code (MVP+ or plan required)" : "Code"
      );
      ensureMvpStar(codeBtn, locked);
    }
    if (downloadBtn) {
      downloadBtn.classList.toggle("is-mvp-locked", locked);
      downloadBtn.setAttribute("aria-disabled", locked ? "true" : "false");
      downloadBtn.title = locked ? lockHint : "Download HTML";
      downloadBtn.setAttribute(
        "aria-label",
        locked ? "Download HTML (MVP+ or plan required)" : "Download HTML"
      );
      ensureMvpStar(downloadBtn, locked);
    }
    // Never leave a locked user stuck in code mode.
    if (locked && state.mode === "code") {
      state.mode = "preview";
      try {
        updatePreview();
      } catch (_) {
        /* ignore */
      }
    }
  }

  function applySubscriptionFromBalance(data) {
    if (!data || typeof data !== "object") return;
    state.planStatus = String(data.planStatus || "none");
    state.hasActiveSubscription =
      data.hasActiveSubscription === true ||
      state.planStatus === "active" ||
      isOwnerHandle();
    state.mvpPlus = !!(data.mvpPlus || isOwnerHandle());
    state.paidPlan = state.hasActiveSubscription;
    state.pro = state.hasActiveSubscription;
    if (data.totalCredits != null) {
      state.totalCredits = Number(data.totalCredits) || 0;
    }
    syncMvpAccessUi();
    if (state.mode === "code" && !canAccessCodeTools()) {
      state.mode = "preview";
      try {
        updatePreview();
      } catch (_) {
        /* ignore */
      }
    }
  }

  async function syncCreditsFromWorker() {
    try {
      const base = workerUrl();
      if (!base) return false;
      const headers = await Promise.race([
        authHeaders(),
        new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error("Sign in timed out")), 8000)
        ),
      ]);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 10000);
      let res;
      try {
        res = await fetch(base + "/credits/balance", {
          headers,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timer);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      applySubscriptionFromBalance(data);
      state.generationCost = Number(data.generationCost) || 0;
      document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: data }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function syncMvpFromProfile(profile) {
    if (profile?.mvp_plus || isOwnerHandle()) {
      state.mvpPlus = true;
      syncMvpAccessUi();
    }
    return syncCreditsFromWorker();
  }

  function releaseFinderLeadHold() {
    const id = String(state.leadId || "").trim();
    if (!id || !state.fromFinder) return;
    if (window.LeadHandoff?.release?.(id)) return;
    try {
      const key = "ms_lf_claimed_v1";
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      if (raw && typeof raw === "object" && !Array.isArray(raw) && raw[id] && raw[id].from !== "project") {
        delete raw[id];
        localStorage.setItem(key, JSON.stringify(raw));
      }
    } catch (_) {
      /* ignore */
    }
  }

  async function ensureCreditsForGeneration() {
    return true;
  }

  function readIntake() {
    captureOnboardDetails();
    const notes = readUserGenerationPrompt();
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
      description: sanitizeClientText(businessValue("description"), 500),
      mapsUrl,
      website: sanitizeClientText(businessValue("website"), 500),
      hours: sanitizeClientText(businessValue("hours"), 200),
      notes,
      leadId: state.leadId,
      templateId: state.templateId || DEFAULT_TEMPLATE_ID || "local-service",
      usePresets: true,
      fromFinder: !!state.fromFinder,
      aiImages: state.aiImages,
      pro: hasPaidPlan(),
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

  function setPreviewFrameViewportClass(frame, vp) {
    if (!frame) return;
    frame.classList.add("ms-preview-frame");
    frame.classList.toggle("is-desktop", vp === "desktop");
    frame.classList.toggle("is-tablet", vp === "tablet");
    frame.classList.toggle("is-phone", vp === "phone");
    frame.classList.toggle("is-fullscreen", vp === "fullscreen");
  }

  function syncEmptyState() {
    const empty = document.getElementById("preview-empty");
    const loading = document.getElementById("preview-loading");
    const loadingCopy = document.getElementById("preview-loading-copy");
    const genError = document.getElementById("preview-gen-error");
    const frame = document.getElementById("preview-frame");
    const hasHtml = !!(state.html && state.html.trim());
    const showCode = state.mode === "code";
    const projectLoading = document.body.classList.contains("ms-lb-project-loading");
    // Overlay only while a real generate/load is active - never a fake "Generating…" state.
    const showLoading = (genProgressActive || projectLoading) && !showCode;
    const showGenError =
      !!(genError && !genError.hidden) && !showLoading && !hasHtml && !showCode;
    if (loading) {
      if (showLoading) {
        loading.hidden = false;
        loading.removeAttribute("hidden");
      } else {
        loading.hidden = true;
        loading.setAttribute("hidden", "");
      }
    }
    if (loadingCopy && showLoading) {
      if (genProgressActive) {
        /* label owned by renderGenerateProgress */
      } else if (projectLoading) {
        loadingCopy.textContent = "Loading project…";
        const fill = document.getElementById("preview-progress-fill");
        const pctEl = document.getElementById("preview-progress-pct");
        if (fill) fill.style.width = "35%";
        if (pctEl) pctEl.textContent = "";
      }
    }
    if (empty) empty.hidden = showLoading || showGenError || hasHtml || showCode;
    // Never use display:none on the preview iframe - Safari/Firefox can drop
    // written documents, leaving a blank preview when opening a project.
    if (frame) {
      frame.hidden = false;
      frame.removeAttribute("hidden");
      // Keep the frame visible whenever we have HTML - parking after generate
      // was leaving a blank gray preview with a 1×1 invisible iframe.
      const park = !hasHtml || showCode || ((genProgressActive || projectLoading) && !hasHtml);
      frame.classList.toggle("is-parked", park);
      if (!park) setPreviewFrameViewportClass(frame, state.viewport);
    }
  }

  function syncFullscreenUi() {
    const isFs = state.viewport === "fullscreen";
    document.body.classList.toggle("ms-lb-fullscreen", isFs);
    const exitBtn = document.getElementById("lb-exit-fullscreen");
    if (exitBtn) exitBtn.hidden = !isFs;
    const browser = document.getElementById("preview-browser");
    if (browser) browser.classList.toggle("is-fullscreen", isFs);
  }

  const VIEWPORT_WIDTH_LIMITS = {
    desktop: { min: 480, defaultWidth: null },
    tablet: { min: 560, defaultWidth: 768 },
    phone: { min: 280, defaultWidth: 390 },
  };

  const VIEWPORT_HEIGHT_LIMITS = {
    desktop: { min: 360, defaultHeight: null },
    tablet: { min: 360, defaultHeight: null },
    phone: { min: 360, defaultHeight: null },
  };

  function isResizableViewport(vp) {
    return vp === "desktop" || vp === "tablet" || vp === "phone";
  }

  function previewWrapPadding(vp) {
    return vp === "desktop" ? 0 : 16;
  }

  function getViewportMaxWidth(vp) {
    const wrap = document.getElementById("preview-wrap");
    if (!wrap) return VIEWPORT_WIDTH_LIMITS[vp]?.defaultWidth || 1200;
    return Math.max(VIEWPORT_WIDTH_LIMITS[vp]?.min || 280, wrap.clientWidth - previewWrapPadding(vp));
  }

  function getViewportMaxHeight(vp) {
    const wrap = document.getElementById("preview-wrap");
    if (!wrap) return 900;
    const pad = vp === "desktop" ? 0 : 12;
    return Math.max(VIEWPORT_HEIGHT_LIMITS[vp]?.min || 360, wrap.clientHeight - pad);
  }

  function clampViewportWidth(vp, width) {
    const limits = VIEWPORT_WIDTH_LIMITS[vp];
    if (!limits) return width;
    const max = getViewportMaxWidth(vp);
    return Math.max(limits.min, Math.min(max, Math.round(width)));
  }

  function clampViewportHeight(vp, height) {
    const limits = VIEWPORT_HEIGHT_LIMITS[vp];
    if (!limits) return height;
    const max = getViewportMaxHeight(vp);
    return Math.max(limits.min, Math.min(max, Math.round(height)));
  }

  function ensureViewportWidth(vp) {
    if (!isResizableViewport(vp)) return null;
    if (state.viewportWidths[vp] != null) return state.viewportWidths[vp];
    const shell = document.getElementById("preview-frame-shell");
    if (shell) {
      const measured = Math.round(shell.getBoundingClientRect().width);
      if (measured > 0) {
        if (vp === "desktop" && measured >= getViewportMaxWidth(vp) - 2) {
          state.viewportWidths.desktop = null;
          return null;
        }
        state.viewportWidths[vp] = measured;
        return measured;
      }
    }
    state.viewportWidths[vp] = limitsDefaultWidth(vp);
    return state.viewportWidths[vp];
  }

  function ensureViewportHeight(vp) {
    if (!isResizableViewport(vp)) return null;
    if (state.viewportHeights[vp] != null) return state.viewportHeights[vp];
    const shell = document.getElementById("preview-frame-shell");
    if (shell) {
      const measured = Math.round(shell.getBoundingClientRect().height);
      if (measured > 0) {
        if (measured >= getViewportMaxHeight(vp) - 2) {
          state.viewportHeights[vp] = null;
          return null;
        }
        state.viewportHeights[vp] = measured;
        return measured;
      }
    }
    state.viewportHeights[vp] = limitsDefaultHeight(vp);
    return state.viewportHeights[vp];
  }

  function limitsDefaultWidth(vp) {
    return VIEWPORT_WIDTH_LIMITS[vp]?.defaultWidth ?? null;
  }

  function limitsDefaultHeight(vp) {
    return VIEWPORT_HEIGHT_LIMITS[vp]?.defaultHeight ?? null;
  }

  function resolveViewportWidthPx(vp) {
    const stored = state.viewportWidths[vp];
    if (stored != null) return clampViewportWidth(vp, stored);
    return getViewportMaxWidth(vp);
  }

  function resolveViewportHeightPx(vp) {
    const stored = state.viewportHeights[vp];
    if (stored != null) return clampViewportHeight(vp, stored);
    return getViewportMaxHeight(vp);
  }

  function pinShellSizeForTransition(shell) {
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    if (rect.width > 0) shell.style.width = Math.round(rect.width) + "px";
    if (rect.height > 0) shell.style.height = Math.round(rect.height) + "px";
  }

  function beginViewportEase(shell) {
    if (!shell) return;
    pinShellSizeForTransition(shell);
    shell.classList.add("is-vp-easing");
    shell.addEventListener(
      "transitionend",
      (event) => {
        if (event.target !== shell) return;
        if (event.propertyName !== "width" && event.propertyName !== "height") return;
        shell.classList.remove("is-vp-easing");
        syncPreviewSizeLabel(
          Math.round(shell.getBoundingClientRect().width),
          Math.round(shell.getBoundingClientRect().height)
        );
        if (state.mode === "edit") positionEditToolbar();
      },
      { once: true }
    );
  }

  function scheduleViewportSizeApply() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => applyPreviewViewportSize());
    });
  }

  function resetViewportSize(vp) {
    if (!isResizableViewport(vp)) return;
    const shell = document.getElementById("preview-frame-shell");
    const shouldEase = shell && state.viewport === vp && state.mode !== "code";
    if (shouldEase) beginViewportEase(shell);
    state.viewportWidths[vp] = limitsDefaultWidth(vp);
    state.viewportHeights[vp] = limitsDefaultHeight(vp);
    state.viewportCustomized[vp] = false;
    if (shouldEase) scheduleViewportSizeApply();
    else applyPreviewViewportSize();
  }

  function hidePreviewSizeLabel(immediate) {
    const label = document.getElementById("preview-vp-size");
    if (!label) return;
    clearTimeout(previewSizeLabelHideTimer);
    clearTimeout(previewSizeLabelFadeTimer);
    previewSizeLabelHideTimer = null;
    previewSizeLabelFadeTimer = null;
    label.classList.remove("is-visible");
    if (immediate) {
      label.hidden = true;
      label.textContent = "";
      return;
    }
    previewSizeLabelFadeTimer = window.setTimeout(() => {
      label.hidden = true;
      previewSizeLabelFadeTimer = null;
    }, 460);
  }

  function syncPreviewSizeLabel(width, height) {
    const label = document.getElementById("preview-vp-size");
    if (!label) return;
    const show = isResizableViewport(state.viewport) && state.mode !== "code";
    if (!show) {
      hidePreviewSizeLabel(true);
      return;
    }
    const shell = document.getElementById("preview-frame-shell");
    const w = width ?? (shell ? Math.round(shell.getBoundingClientRect().width) : null);
    const h = height ?? (shell ? Math.round(shell.getBoundingClientRect().height) : null);
    if (!w || !h) {
      hidePreviewSizeLabel(true);
      return;
    }
    label.textContent = w + " × " + h;
    label.hidden = false;
    window.requestAnimationFrame(() => label.classList.add("is-visible"));
    clearTimeout(previewSizeLabelHideTimer);
    clearTimeout(previewSizeLabelFadeTimer);
    previewSizeLabelFadeTimer = null;
    previewSizeLabelHideTimer = window.setTimeout(() => {
      hidePreviewSizeLabel(false);
      previewSizeLabelHideTimer = null;
    }, PREVIEW_SIZE_LABEL_MS);
  }

  function applyPreviewViewportSize() {
    const shell = document.getElementById("preview-frame-shell");
    const wrap = document.getElementById("preview-wrap");
    const frame = document.getElementById("preview-frame");
    if (!shell || !wrap) return;

    const vp = state.viewport;
    // Desktop always fills the preview pane - resizing it collapses the shell
    // into a blank gray panel with a thin vertical resizer line in the center.
    const desktopFill = vp === "desktop" || vp === "fullscreen" || state.mode === "code";
    const canResize =
      !desktopFill &&
      isResizableViewport(vp) &&
      state.mode !== "code" &&
      state.viewport !== "fullscreen";
    const resizable = canResize;
    wrap.classList.toggle("is-vp-resizable", resizable);
    shell.className =
      "ms-preview-frame-shell" +
      (vp && vp !== "fullscreen" ? " is-" + vp : "") +
      (resizable ? " is-resizable" : "");

    if (!resizable) {
      // Clear any leftover drag sizing so the iframe can fill edge-to-edge.
      shell.style.width = "";
      shell.style.height = "";
      shell.style.maxWidth = "";
      shell.style.maxHeight = "";
      state.viewportCustomized.desktop = false;
      state.viewportWidths.desktop = null;
      state.viewportHeights.desktop = null;
      syncPreviewSizeLabel(null, null);
      setPreviewFrameViewportClass(frame, vp);
      if (state.mode === "edit") positionEditToolbar();
      return;
    }

    let width = resolveViewportWidthPx(vp);
    let height = resolveViewportHeightPx(vp);
    if (state.viewportWidths[vp] == null && vp !== "desktop") {
      state.viewportWidths[vp] = width;
    }
    // Prefer measured wrap size; fall back after layout if wrap was still 0×0.
    if ((wrap.clientWidth < 40 || wrap.clientHeight < 40) && wrap.dataset.msVpRetry !== "1") {
      wrap.dataset.msVpRetry = "1";
      requestAnimationFrame(() => {
        delete wrap.dataset.msVpRetry;
        applyPreviewViewportSize();
      });
    }
    shell.style.width = Math.max(width, VIEWPORT_WIDTH_LIMITS[vp]?.min || 280) + "px";
    shell.style.height = Math.max(height, VIEWPORT_HEIGHT_LIMITS[vp]?.min || 360) + "px";

    syncPreviewSizeLabel(width, height);

    setPreviewFrameViewportClass(frame, vp);
    if (state.mode === "edit") positionEditToolbar();
  }

  function applyPreviewViewportWidth() {
    applyPreviewViewportSize();
  }

  function applyViewportFrameClass() {
    const frame = document.getElementById("preview-frame");
    setPreviewFrameViewportClass(frame, state.viewport);
    syncFullscreenUi();
    setModeUi();
    applyPreviewViewportSize();
  }

  function setViewport(vp) {
    const prev = state.viewport;
    const shell = document.getElementById("preview-frame-shell");

    if (vp === "fullscreen") {
      if (state.viewport !== "fullscreen") {
        state.viewportBeforeFullscreen =
          state.viewport && state.viewport !== "fullscreen" ? state.viewport : state.viewportBeforeFullscreen;
      }
    } else {
      state.viewportBeforeFullscreen = vp;
    }

    // Switching back to desktop always restores full-bleed preview.
    if (vp === "desktop") {
      state.viewportCustomized.desktop = false;
      state.viewportWidths.desktop = null;
      state.viewportHeights.desktop = null;
      if (shell) {
        shell.style.width = "";
        shell.style.height = "";
      }
    }

    const shouldEase =
      shell &&
      prev !== vp &&
      isResizableViewport(prev) &&
      isResizableViewport(vp) &&
      prev !== "desktop" &&
      vp !== "desktop" &&
      state.mode !== "code";

    if (shouldEase) beginViewportEase(shell);

    state.viewport = vp;
    syncFullscreenUi();
    setModeUi();
    const frame = document.getElementById("preview-frame");
    if (vp === "fullscreen" && frame) {
      frame.classList.remove("is-parked");
      frame.hidden = false;
      frame.removeAttribute("hidden");
    }
    setPreviewFrameViewportClass(frame, vp);

    if (shouldEase) scheduleViewportSizeApply();
    else applyPreviewViewportSize();
  }

  function bindPreviewViewportResizer() {
    const shell = document.getElementById("preview-frame-shell");
    const wrap = document.getElementById("preview-wrap");
    const left = document.getElementById("preview-vp-resizer-left");
    const right = document.getElementById("preview-vp-resizer-right");
    const top = document.getElementById("preview-vp-resizer-top");
    const bottom = document.getElementById("preview-vp-resizer-bottom");
    if (!shell || !wrap || !left || !right || !top || !bottom) return;

    let dragging = false;
    let axis = "x";
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let edge = "right";

    const applyDragSize = (width, height) => {
      const vp = state.viewport;
      if (width != null) {
        state.viewportWidths[vp] = width;
        state.viewportCustomized[vp] = true;
        shell.style.width = width + "px";
      }
      if (height != null) {
        state.viewportHeights[vp] = height;
        state.viewportCustomized[vp] = true;
        shell.style.height = height + "px";
      }
      syncPreviewSizeLabel(
        width ?? state.viewportWidths[vp] ?? Math.round(shell.getBoundingClientRect().width),
        height ?? state.viewportHeights[vp] ?? Math.round(shell.getBoundingClientRect().height)
      );
      if (state.mode === "edit") positionEditToolbar();
    };

    const onPointerMove = (event) => {
      if (!dragging || !isResizableViewport(state.viewport)) return;
      const vp = state.viewport;
      if (axis === "x") {
        const delta = event.clientX - startX;
        const widthDelta = edge === "right" ? delta * 2 : -delta * 2;
        applyDragSize(clampViewportWidth(vp, startWidth + widthDelta), null);
      } else {
        const delta = event.clientY - startY;
        const heightDelta = edge === "bottom" ? delta * 2 : -delta * 2;
        applyDragSize(null, clampViewportHeight(vp, startHeight + heightDelta));
      }
      event.preventDefault();
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("ms-lb-vp-resizing");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    const startDrag = (event, nextAxis, side) => {
      // Desktop fills the pane - never enter resize mode (collapses the preview).
      if (state.viewport === "desktop" || state.viewport === "fullscreen") return;
      if (!isResizableViewport(state.viewport) || state.mode === "code") return;
      if (event.button != null && event.button !== 0) return;
      const vp = state.viewport;
      ensureViewportWidth(vp);
      ensureViewportHeight(vp);
      dragging = true;
      axis = nextAxis;
      edge = side;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = shell.getBoundingClientRect().width;
      startHeight = shell.getBoundingClientRect().height;
      document.body.classList.add("ms-lb-vp-resizing");
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);
      event.preventDefault();
    };

    left.addEventListener("pointerdown", (event) => startDrag(event, "x", "left"));
    right.addEventListener("pointerdown", (event) => startDrag(event, "x", "right"));
    top.addEventListener("pointerdown", (event) => startDrag(event, "y", "top"));
    bottom.addEventListener("pointerdown", (event) => startDrag(event, "y", "bottom"));

    const nudgeWidth = (side, step) => {
      if (!isResizableViewport(state.viewport) || state.mode === "code") return;
      const vp = state.viewport;
      ensureViewportWidth(vp);
      const current = state.viewportWidths[vp] ?? shell.getBoundingClientRect().width;
      applyDragSize(clampViewportWidth(vp, current + (side === "right" ? step : -step)), null);
    };

    const nudgeHeight = (side, step) => {
      if (!isResizableViewport(state.viewport) || state.mode === "code") return;
      const vp = state.viewport;
      ensureViewportHeight(vp);
      const current = state.viewportHeights[vp] ?? shell.getBoundingClientRect().height;
      applyDragSize(null, clampViewportHeight(vp, current + (side === "bottom" ? step : -step)));
    };

    left.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const step = event.shiftKey ? 24 : 12;
      nudgeWidth(event.key === "ArrowRight" ? "right" : "left", step);
      event.preventDefault();
    });
    right.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const step = event.shiftKey ? 24 : 12;
      nudgeWidth(event.key === "ArrowRight" ? "right" : "left", step);
      event.preventDefault();
    });
    top.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const step = event.shiftKey ? 24 : 12;
      nudgeHeight(event.key === "ArrowDown" ? "top" : "bottom", step);
      event.preventDefault();
    });
    bottom.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const step = event.shiftKey ? 24 : 12;
      nudgeHeight(event.key === "ArrowDown" ? "bottom" : "top", step);
      event.preventDefault();
    });

    window.addEventListener("resize", () => {
      if (!isResizableViewport(state.viewport)) return;
      applyPreviewViewportSize();
    });
  }

  function exitFullscreen() {
    if (state.viewport !== "fullscreen") return;
    const restore = state.viewportBeforeFullscreen || "desktop";
    setViewport(restore);
    if (state.mode === "edit") {
      positionEditToolbar();
      return;
    }
    if (state.mode !== "code") {
      updatePreview();
    }
  }

  function setModeUi() {
    document.querySelectorAll(".is-mode").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
    });
    document.querySelectorAll(".is-vp").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.vp === state.viewport);
    });
    const browser = document.getElementById("preview-browser");
    if (browser) {
      browser.classList.toggle("is-code", state.mode === "code");
      browser.classList.toggle("is-edit", state.mode === "edit");
    }
  }

  const EDIT_STYLE_ID = "ms-lb-edit-style";
  const EDIT_HOVER_ATTR = "data-ms-edit-hover";
  const EDIT_SELECT_ATTR = "data-ms-edit-selected";
  const EDIT_DRAG_ATTR = "data-ms-edit-dragging";
  const EDIT_DROP_ATTR = "data-ms-edit-drop";
  const EDIT_AXIS_ATTR = "data-ms-edit-axis";
  const EDIT_REORDERABLE_ATTR = "data-ms-edit-reorderable";
  const EDIT_DROP_IMAGE_ATTR = "data-ms-edit-drop-image";
  const EDIT_DRAG_THRESHOLD_PX = 6;
  const PREVIEW_SANDBOX_PREVIEW = "allow-same-origin allow-scripts allow-forms";
  const PREVIEW_SANDBOX_EDIT = "allow-same-origin";
  const EDITABLE_TAGS = new Set([
    "img",
    "a",
    "button",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "label",
    "span",
    "strong",
    "em",
    "small",
    "figcaption",
    "blockquote",
    "td",
    "th",
    "section",
    "header",
    "footer",
    "nav",
    "main",
    "article",
    "aside",
    "div",
  ]);
  const EDIT_SKIP_TAGS = new Set([
    "script",
    "style",
    "link",
    "meta",
    "title",
    "head",
    "html",
    "body",
    "svg",
    "path",
    "noscript",
    "iframe",
    "br",
    "hr",
  ]);

  const editState = {
    selected: null,
    hovered: null,
    history: [],
    historyIndex: -1,
    saveTimer: null,
    saveStatus: "idle",
    saveGeneration: 0,
    boundDoc: null,
    listeners: null,
    lastWrittenHtml: "",
    lastSandboxMode: "",
    skipRewrite: false,
    toolbarTab: "style",
    drag: null,
    didDrag: false,
    dropImageEl: null,
    previewObjectUrl: "",
    previewPainted: false,
  };

  function rgbToHex(color) {
    const raw = String(color || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    const m = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return "#000000";
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  function setEditSaveStatus(status, message) {
    editState.saveStatus = status;
    const el = document.getElementById("lb-edit-save-status");
    if (!el) return;
    const labels = {
      idle: "",
      unsaved: "Unsaved changes",
      saving: "Saving…",
      saved: "Saved",
      error: message || "Save failed - retrying",
    };
    const text = labels[status] || "";
    el.hidden = !text;
    el.textContent = text;
    el.classList.remove("is-unsaved", "is-saving", "is-saved", "is-error", "is-hint");
    if (status === "unsaved" || status === "saving" || status === "saved" || status === "error") {
      el.classList.add("is-" + status);
    }
  }

  function getPreviewFrame() {
    return document.getElementById("preview-frame");
  }

  function getPreviewDoc() {
    return getPreviewFrame()?.contentDocument || null;
  }

  function applyPreviewSandbox(mode) {
    const frame = getPreviewFrame();
    if (!frame) return;
    const next = mode === "edit" ? PREVIEW_SANDBOX_EDIT : PREVIEW_SANDBOX_PREVIEW;
    const prev = frame.getAttribute("sandbox") || "";
    if (prev !== next) {
      frame.setAttribute("sandbox", next);
      // Changing sandbox resets the iframe document - force a rewrite next.
      editState.lastWrittenHtml = "";
    }
    editState.lastSandboxMode = mode;
  }

  /** Close dangling tags so truncated model output still paints in the iframe. */
  function closeIncompleteHtml(html) {
    let out = String(html || "");
    if (!out.trim()) return out;
    const openScript = (out.match(/<script\b(?![^>]*\/>)/gi) || []).length;
    const closeScript = (out.match(/<\/script>/gi) || []).length;
    if (openScript > closeScript) {
      out += "\n</script>".repeat(openScript - closeScript);
    }
    const openStyle = (out.match(/<style\b/gi) || []).length;
    const closeStyle = (out.match(/<\/style>/gi) || []).length;
    if (openStyle > closeStyle) {
      out += "\n</style>".repeat(openStyle - closeStyle);
    }
    if (/<body[\s>]/i.test(out) && !/<\/body>/i.test(out)) out += "\n</body>";
    if (/<html[\s>]/i.test(out) && !/<\/html>/i.test(out)) out += "\n</html>";
    return out;
  }

  function revokePreviewObjectUrl() {
    if (!editState.previewObjectUrl) return;
    try {
      URL.revokeObjectURL(editState.previewObjectUrl);
    } catch (_) {
      /* ignore */
    }
    editState.previewObjectUrl = "";
  }

  /**
   * Keep preview (and eventually saved HTML) scrollable on phones:
   * unlock body height locks, strip catastrophic div{overflow:hidden}, tame wide fixed nav docks.
   */
  function ensureMobileFriendlyHtml(html) {
    let out = String(html || "");
    if (!out.trim()) return out;

    if (!/<meta[^>]+name=["']viewport["']/i.test(out)) {
      out = out.replace(
        /<head([^>]*)>/i,
        '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
      );
    } else {
      out = out.replace(
        /<meta[^>]+name=["']viewport["'][^>]*>/i,
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
      );
    }

    // AI sometimes emits `div { overflow: hidden }` which traps scroll on wrappers.
    out = out.replace(/\bdiv\s*\{([^{}]*)\}/gi, function (full, body) {
      if (!/overflow\s*:\s*hidden/i.test(body)) return full;
      if (/^\s*overflow\s*:\s*hidden\s*;?\s*$/i.test(body)) {
        return "/* moonrise: stripped-universal-div-overflow */";
      }
      const next = body
        .replace(/overflow\s*:\s*hidden\s*!important\s*;?/gi, "")
        .replace(/overflow\s*:\s*hidden\s*;?/gi, "");
      return "div{" + next + "}";
    });
    out = out.replace(
      /\b(html|body)\s*\{([^}]*?)overflow\s*:\s*hidden(\s*!important)?([^}]*)\}/gi,
      function (_full, sel, before, _imp, after) {
        return sel + "{" + before + "overflow: visible" + after + "}";
      }
    );

    const css = [
      "/* Moonrise mobile-fit - one scroll root (html), body must not trap scroll */",
      "html{max-width:100%!important;overflow-x:hidden!important;overflow-y:scroll!important;height:auto!important;max-height:none!important;-webkit-overflow-scrolling:touch}",
      "body{max-width:100%!important;overflow-x:hidden!important;overflow-y:visible!important;height:auto!important;max-height:none!important;min-height:100%;position:relative!important}",
      "img,video,canvas,svg{max-width:100%;height:auto}",
      "iframe{max-width:100%}",
      ".nav,.dock,nav[class],header .dock,header nav{max-width:100%}",
      "body > div, main, .page, .wrapper, .site, .layout, .site-wrap, .app, #app, #root, #__next{overflow-x:hidden!important;overflow-y:visible!important;max-height:none!important;height:auto!important}",
      "@media (max-width:767px){",
      ".nav{padding:.65rem!important;left:0;right:0}",
      ".dock,header .dock,nav.dock{max-width:calc(100vw - 1.25rem);width:max-content;margin-left:auto;margin-right:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap}",
      ".dock::-webkit-scrollbar,header .dock::-webkit-scrollbar{display:none}",
      ".dock a,header .dock a{white-space:nowrap;flex:0 0 auto}",
      ".hero,.hero-content,section,.container{max-width:100vw;box-sizing:border-box}",
      ".hero,.hero-stage{min-height:min(100svh,100vh);max-height:none;overflow-x:hidden;overflow-y:visible}",
      ".about-badge{right:.75rem!important;bottom:.75rem!important}",
      ".cred-strip,.hero-btns,.cta-btns{gap:.75rem}",
      "}",
    ].join("");

    const styleTag = '<style data-ms-mobile-fit="1">' + css + "</style>";
    // Always refresh so older broken mobile-fit CSS gets replaced.
    if (/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i.test(out)) {
      return out.replace(/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i, styleTag);
    }
    if (/<\/head>/i.test(out)) return out.replace(/<\/head>/i, styleTag + "\n</head>");
    if (/<body[^>]*>/i.test(out)) return out.replace(/<body([^>]*)>/i, "<body$1>\n" + styleTag);
    return styleTag + out;
  }

  function markPreviewPainted(ok) {
    editState.previewPainted = !!ok;
    syncEmptyState();
  }

  function previewDocLooksPainted(doc) {
    if (!doc?.body) return false;
    const bodyHtml = String(doc.body.innerHTML || "").trim();
    if (!bodyHtml || bodyHtml === "<br>" || bodyHtml === "<br/>") return false;
    return !!doc.querySelector("h1, h2, nav, header, main, section, .hero, footer, .nav, p, a");
  }

  function writePreviewDocument(html) {
    const frame = getPreviewFrame();
    if (!frame || !html) return null;
    // Keep the frame in the layout tree - never display:none / parked while painting.
    frame.hidden = false;
    frame.removeAttribute("hidden");
    frame.classList.remove("is-parked");
    markPreviewPainted(false);
    void frame.offsetWidth;
    setPreviewFrameViewportClass(frame, state.viewport);
    applyPreviewViewportSize();
    const safeHtml = closeIncompleteHtml(ensureMobileFriendlyHtml(injectContactFormPreviewHtml(html)));
    revokePreviewObjectUrl();
    try {
      if (frame.getAttribute("src")) frame.removeAttribute("src");
    } catch (_) {
      /* ignore */
    }

    const finishPaint = () => {
      bindPreviewScrollBridge();
      frame.classList.remove("is-parked");
      applyPreviewViewportSize();
      let painted = false;
      try {
        painted = previewDocLooksPainted(frame.contentDocument);
      } catch (_) {
        painted = false;
      }
      // srcdoc/blob can be opaque briefly - treat a non-tiny frame as painted.
      if (!painted && frame.clientWidth > 80 && frame.clientHeight > 80) {
        painted = !frame.classList.contains("is-parked");
      }
      markPreviewPainted(painted);
      if (!painted) {
        window.setTimeout(() => {
          try {
            markPreviewPainted(previewDocLooksPainted(frame.contentDocument));
          } catch (_) {
            /* ignore */
          }
        }, 200);
      }
    };

    // Prefer srcdoc; fall back to blob URL (requires CSP frame-src blob:).
    let paintedViaWrite = false;
    try {
      const doc = frame.contentDocument;
      if (doc) {
        doc.open();
        doc.write(safeHtml);
        doc.close();
        paintedViaWrite = previewDocLooksPainted(doc);
      }
    } catch (_) {
      paintedViaWrite = false;
    }

    if (!paintedViaWrite) {
      try {
        frame.srcdoc = safeHtml;
      } catch (_) {
        const blob = new Blob([safeHtml], { type: "text/html;charset=utf-8" });
        editState.previewObjectUrl = URL.createObjectURL(blob);
        frame.src = editState.previewObjectUrl;
      }
    }

    editState.lastWrittenHtml = html;
    frame.addEventListener("load", finishPaint, { once: true });
    window.setTimeout(finishPaint, 0);
    window.setTimeout(finishPaint, 120);
    try {
      return frame.contentDocument;
    } catch (_) {
      return null;
    }
  }

  /** Re-paint preview after layout - fixes blank iframe when opening a project in a new tab. */
  function ensurePreviewPainted() {
    if (!(state.html && String(state.html).trim())) return;
    if (state.mode === "code") return;
    const frame = getPreviewFrame();
    if (!frame) return;
    frame.classList.remove("is-parked");
    applyPreviewViewportSize();
    const doc = getPreviewDoc();
    const ready = !doc || doc.readyState === "complete";
    const contentMissing = !previewDocLooksPainted(doc);
    if (editState.lastWrittenHtml !== state.html || (contentMissing && ready)) {
      writePreviewDocument(state.html);
      return;
    }
    if (!contentMissing) markPreviewPainted(true);
  }

  /** Schedule several paints - Finder swipe often finishes before the preview grid has height. */
  function schedulePreviewRepaint() {
    if (!(state.html && String(state.html).trim()) || state.mode === "code") return;
    markPreviewPainted(false);
    [0, 50, 150, 400, 900, 1800].forEach((ms) => {
      window.setTimeout(() => {
        if (!(state.html && String(state.html).trim()) || state.mode === "code") return;
        writePreviewDocument(state.html);
        ensurePreviewPainted();
      }, ms);
    });
    // Never leave the spinner up forever if paint detection is flaky.
    window.setTimeout(() => {
      if (!editState.previewPainted && state.html) markPreviewPainted(true);
    }, 4000);
  }

  /** Forward wheel/trackpad scroll into the preview iframe when chrome/overlays steal the event. */
  function bindPreviewScrollBridge() {
    const wrap = document.getElementById("preview-wrap");
    const frame = getPreviewFrame();
    if (!wrap || !frame || wrap.dataset.msScrollBridge === "1") return;
    wrap.dataset.msScrollBridge = "1";

    wrap.addEventListener(
      "wheel",
      (event) => {
        if (state.mode === "code") return;
        if (state.viewport === "fullscreen") return;
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        if (!doc || !win) return;

        // Let the iframe handle its own wheel when the pointer is over it.
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        if (path.includes(frame)) return;

        const scrollingEl =
          doc.scrollingElement || doc.documentElement || doc.body;
        if (!scrollingEl) return;

        const maxScroll = Math.max(0, scrollingEl.scrollHeight - win.innerHeight);
        if (maxScroll <= 0) return;

        const next = Math.min(maxScroll, Math.max(0, scrollingEl.scrollTop + event.deltaY));
        if (next === scrollingEl.scrollTop) return;
        event.preventDefault();
        scrollingEl.scrollTop = next;
      },
      { passive: false }
    );
  }

  function setEditHint(msg) {
    const el = document.getElementById("lb-edit-save-status");
    if (!el || editState.saveStatus !== "idle") return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("is-hint");
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.add("is-hint");
  }

  function clearDragMarks(doc) {
    if (!doc) return;
    doc.querySelectorAll("[" + EDIT_DRAG_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_DRAG_ATTR);
    });
    doc.querySelectorAll("[" + EDIT_DROP_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_DROP_ATTR);
      el.removeAttribute(EDIT_AXIS_ATTR);
    });
    doc.querySelectorAll("[" + EDIT_REORDERABLE_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_REORDERABLE_ATTR);
    });
    doc.querySelectorAll("[" + EDIT_DROP_IMAGE_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_DROP_IMAGE_ATTR);
    });
    editState.dropImageEl = null;
  }

  function clearEditMarks(doc) {
    if (!doc) return;
    clearDragMarks(doc);
    doc.querySelectorAll("[" + EDIT_HOVER_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_HOVER_ATTR);
    });
    doc.querySelectorAll("[" + EDIT_SELECT_ATTR + "]").forEach((el) => {
      el.removeAttribute(EDIT_SELECT_ATTR);
    });
  }

  function serializePreviewHtml() {
    const doc = getPreviewDoc();
    if (!doc || !doc.documentElement) return state.html || "";
    clearEditMarks(doc);
    doc.getElementById(EDIT_STYLE_ID)?.remove();
    doc.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    ensureEditStyles(doc);
    if (editState.selected?.isConnected) {
      editState.selected.setAttribute(EDIT_SELECT_ATTR, "1");
      if (getReorderContext(editState.selected)) {
        editState.selected.setAttribute(EDIT_REORDERABLE_ATTR, "1");
      }
    }
    return html;
  }

  function ensureEditStyles(doc) {
    if (!doc) return;
    let style = doc.getElementById(EDIT_STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = EDIT_STYLE_ID;
      (doc.head || doc.documentElement).appendChild(style);
    }
    style.textContent =
      "[" +
      EDIT_HOVER_ATTR +
      "]{outline:2px dashed rgba(37,99,235,.75)!important;outline-offset:3px!important;cursor:pointer!important}" +
      "[" +
      EDIT_SELECT_ATTR +
      "]{outline:3px solid #2563eb!important;outline-offset:3px!important;box-shadow:0 0 0 4px rgba(37,99,235,.18)!important}" +
      "[" +
      EDIT_REORDERABLE_ATTR +
      "]{cursor:grab!important}" +
      "[" +
      EDIT_DRAG_ATTR +
      "]{opacity:.55!important;cursor:grabbing!important;outline:3px solid #2563eb!important;outline-offset:3px!important;user-select:none!important;-webkit-user-select:none!important}" +
      "[" +
      EDIT_DROP_ATTR +
      '="before"][' +
      EDIT_AXIS_ATTR +
      '="y"]{box-shadow:0 -3px 0 0 #2563eb!important}' +
      "[" +
      EDIT_DROP_ATTR +
      '="after"][' +
      EDIT_AXIS_ATTR +
      '="y"]{box-shadow:0 3px 0 0 #2563eb!important}' +
      "[" +
      EDIT_DROP_ATTR +
      '="before"][' +
      EDIT_AXIS_ATTR +
      '="x"]{box-shadow:-3px 0 0 0 #2563eb!important}' +
      "[" +
      EDIT_DROP_ATTR +
      '="after"][' +
      EDIT_AXIS_ATTR +
      '="x"]{box-shadow:3px 0 0 0 #2563eb!important}' +
      "[" +
      EDIT_DROP_IMAGE_ATTR +
      "]{outline:3px dashed #059669!important;outline-offset:4px!important;box-shadow:0 0 0 4px rgba(5,150,105,.2)!important}" +
      "[contenteditable=true]{outline:2px solid #60a5fa!important;outline-offset:3px!important;cursor:text!important}" +
      "*{scroll-behavior:auto!important}";
  }

  function isSkippedEditElement(el) {
    if (!el || el.nodeType !== 1) return true;
    return EDIT_SKIP_TAGS.has(el.tagName.toLowerCase());
  }

  function resolveEditableTarget(node) {
    let el = node;
    if (el && el.nodeType === 3) el = el.parentElement;
    while (el && el.nodeType === 1) {
      if (el === el.ownerDocument?.body || el === el.ownerDocument?.documentElement) {
        return null;
      }
      const tag = el.tagName.toLowerCase();
      if (!isSkippedEditElement(el) && EDITABLE_TAGS.has(tag)) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function targetFromFramePoint(clientX, clientY) {
    const frame = getPreviewFrame();
    const doc = frame?.contentDocument;
    if (!frame || !doc) return null;
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * frame.clientWidth;
    const y = ((clientY - rect.top) / rect.height) * frame.clientHeight;
    return resolveEditableTarget(doc.elementFromPoint(x, y));
  }

  const TEXT_TAGS = new Set([
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "li", "label", "span", "strong", "em", "small",
    "figcaption", "blockquote", "td", "th",
  ]);
  const SECTION_TAGS = new Set([
    "section", "header", "footer", "nav", "main", "article", "aside",
  ]);

  function classifyEditable(el) {
    if (!el) return "block";
    const tag = el.tagName.toLowerCase();
    if (tag === "img") return "image";
    if (tag === "a" || tag === "button") return "link";
    if (TEXT_TAGS.has(tag)) return "text";
    if (SECTION_TAGS.has(tag)) return "section";
    return "block";
  }

  function isPageSectionPeer(el) {
    if (!el || el.nodeType !== 1 || isSkippedEditElement(el)) return false;
    const tag = el.tagName.toLowerCase();
    return SECTION_TAGS.has(tag) || tag === "div";
  }

  /** Repeated siblings in the same container, or top-level page sections. */
  function getReorderContext(el) {
    if (!el?.parentElement) return null;
    const parent = el.parentElement;
    const doc = parent.ownerDocument;
    if (parent === doc?.documentElement) return null;
    const tag = el.tagName;
    const kind = classifyEditable(el);
    let peers;
    if (parent === doc?.body) {
      if (!isPageSectionPeer(el)) return null;
      peers = Array.from(parent.children).filter(isPageSectionPeer);
    } else if (kind === "section") {
      peers = Array.from(parent.children).filter(isPageSectionPeer);
    } else {
      peers = Array.from(parent.children).filter(
        (child) => child.nodeType === 1 && child.tagName === tag
      );
    }
    if (peers.length < 2 || !peers.includes(el)) return null;
    const index = peers.indexOf(el);
    return {
      canPrev: index > 0,
      canNext: index < peers.length - 1,
      index,
      total: peers.length,
      parent,
      peers,
    };
  }

  function moveElementAmongPeers(el, direction) {
    const ctx = getReorderContext(el);
    if (!ctx) return;
    const peers = ctx.peers || [];
    const index = peers.indexOf(el);
    if (index < 0) return;
    if (direction === "prev" && ctx.canPrev) {
      ctx.parent.insertBefore(el, peers[index - 1]);
    } else if (direction === "next" && ctx.canNext) {
      const after = peers[index + 1];
      ctx.parent.insertBefore(el, after.nextElementSibling);
    }
  }

  function isHorizontalReorderParent(parent) {
    if (!parent) return false;
    const win = parent.ownerDocument?.defaultView;
    const cs = win?.getComputedStyle(parent);
    if (!cs) return false;
    const display = cs.display || "";
    if (display.includes("grid")) {
      const cols = cs.gridTemplateColumns || "";
      if (cols && cols !== "none" && cols.split(" ").filter(Boolean).length > 1) return true;
    }
    if (display.includes("flex")) {
      const dir = cs.flexDirection || "row";
      return dir === "row" || dir === "row-reverse";
    }
    return false;
  }

  function getReorderPeers(el) {
    const ctx = getReorderContext(el);
    if (!ctx) return null;
    return { parent: ctx.parent, peers: ctx.peers || [], horizontal: isHorizontalReorderParent(ctx.parent) };
  }

  function clearDropIndicators(doc) {
    if (!doc) return;
    doc.querySelectorAll("[" + EDIT_DROP_ATTR + "]").forEach((node) => {
      node.removeAttribute(EDIT_DROP_ATTR);
      node.removeAttribute(EDIT_AXIS_ATTR);
    });
  }

  function resolveDropSlot(dragEl, clientX, clientY) {
    const info = getReorderPeers(dragEl);
    if (!info) return null;
    const { peers, horizontal } = info;
    let insertBefore = null;
    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i];
      if (peer === dragEl) continue;
      const r = peer.getBoundingClientRect();
      const before = horizontal
        ? clientX < r.left + r.width / 2
        : clientY < r.top + r.height / 2;
      if (before) {
        insertBefore = peer;
        break;
      }
    }
    return { insertBefore, horizontal, peers, parent: info.parent };
  }

  function paintDropIndicator(dragEl, slot) {
    const doc = dragEl?.ownerDocument;
    if (!doc) return;
    clearDropIndicators(doc);
    if (!slot) return;
    const axis = slot.horizontal ? "x" : "y";
    const { insertBefore, peers } = slot;
    let markEl = null;
    let side = "before";
    if (insertBefore) {
      markEl = insertBefore;
      side = "before";
    } else {
      const last = peers.filter((p) => p !== dragEl).pop() || peers[peers.length - 1];
      markEl = last;
      side = "after";
    }
    if (!markEl || markEl === dragEl) return;
    markEl.setAttribute(EDIT_DROP_ATTR, side);
    markEl.setAttribute(EDIT_AXIS_ATTR, axis);
  }

  function applyReorderDrop(dragEl, slot) {
    if (!dragEl || !slot || !dragEl.parentNode) return false;
    const { insertBefore, parent } = slot;
    if (insertBefore === dragEl) return false;
    if (insertBefore) {
      if (dragEl.nextElementSibling === insertBefore) return false;
      if (insertBefore.parentNode !== parent) return false;
      parent.insertBefore(dragEl, insertBefore);
      return true;
    }
    if (parent.lastElementChild === dragEl) return false;
    parent.appendChild(dragEl);
    return true;
  }

  function endPointerDrag(commit) {
    const drag = editState.drag;
    const doc = editState.boundDoc;
    editState.drag = null;

    if (doc) {
      clearDropIndicators(doc);
      doc.querySelectorAll("[" + EDIT_DRAG_ATTR + "]").forEach((node) => {
        node.removeAttribute(EDIT_DRAG_ATTR);
      });
    }

    if (drag?.active && drag.el?.isConnected) {
      editState.didDrag = true;
      const el = drag.el;
      if (commit && drag.slot) {
        editState.selected = el;
        el.setAttribute(EDIT_SELECT_ATTR, "1");
        commitEditChange((node) => {
          applyReorderDrop(node, drag.slot);
        });
      } else {
        selectEditable(el, { keepTab: true });
      }
    }

    window.setTimeout(() => {
      editState.didDrag = false;
    }, 0);
  }

  function pushEditHistory() {
    const snap = serializePreviewHtml();
    if (!snap) return;
    if (editState.historyIndex >= 0 && editState.history[editState.historyIndex] === snap) {
      return;
    }
    editState.history = editState.history.slice(0, editState.historyIndex + 1);
    editState.history.push(snap);
    if (editState.history.length > 40) editState.history.shift();
    editState.historyIndex = editState.history.length - 1;
  }

  function restoreEditSnapshot(html) {
    state.html = html;
    editState.lastWrittenHtml = "";
    editState.selected = null;
    editState.hovered = null;
    hideEditToolbar();
    editState.skipRewrite = false;
    const doc = writePreviewDocument(html);
    if (doc) attachEditMode(doc);
    scheduleEditAutosave();
  }

  function undoEdit() {
    if (editState.historyIndex <= 0) return;
    editState.historyIndex -= 1;
    restoreEditSnapshot(editState.history[editState.historyIndex]);
  }

  function redoEdit() {
    if (editState.historyIndex >= editState.history.length - 1) return;
    editState.historyIndex += 1;
    restoreEditSnapshot(editState.history[editState.historyIndex]);
  }

  function hideEditToolbar() {
    const toolbar = document.getElementById("lb-edit-toolbar");
    if (toolbar) toolbar.hidden = true;
  }

  function positionEditToolbar() {
    const toolbar = document.getElementById("lb-edit-toolbar");
    const wrap = document.getElementById("preview-wrap");
    const frame = document.getElementById("preview-frame");
    const el = editState.selected;
    if (!toolbar || !wrap || !frame || !el || !el.isConnected) {
      hideEditToolbar();
      return;
    }
    toolbar.hidden = false;

    const place = () => {
      if (!el.isConnected) return;
      const wrapRect = wrap.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const gap = 14;
      const pad = 10;
      const tbW = Math.min(toolbar.offsetWidth || 300, wrap.clientWidth - pad * 2);
      const tbH = toolbar.offsetHeight || 140;

      const elTop = frameRect.top - wrapRect.top + elRect.top;
      const elBottom = frameRect.top - wrapRect.top + elRect.bottom;
      const elMidX = frameRect.left - wrapRect.left + elRect.left + elRect.width / 2;

      const spaceAbove = elTop - pad;
      const spaceBelow = wrap.clientHeight - elBottom - pad;
      const need = tbH + gap;

      let top;
      let placeSide = "above";
      if (spaceAbove >= need || (spaceAbove >= spaceBelow && spaceAbove >= tbH * 0.55)) {
        top = elTop - tbH - gap;
        placeSide = "above";
        if (top < pad) {
          top = elBottom + gap;
          placeSide = "below";
        }
      } else {
        top = elBottom + gap;
        placeSide = "below";
      }

      if (placeSide === "below" && top + tbH > wrap.clientHeight - pad && spaceAbove > spaceBelow) {
        top = Math.max(pad, elTop - tbH - gap);
        placeSide = "above";
      }

      top = Math.max(pad, Math.min(top, wrap.clientHeight - tbH - pad));

      // Keep clear of the selection when possible (avoid covering mid-element).
      if (placeSide === "above" && top + tbH + 4 > elTop) {
        const below = elBottom + gap;
        if (below + tbH <= wrap.clientHeight - pad) {
          top = below;
          placeSide = "below";
        }
      }
      if (placeSide === "below" && top < elBottom - 4) {
        const above = elTop - tbH - gap;
        if (above >= pad) {
          top = above;
          placeSide = "above";
        }
      }

      let left = elMidX - tbW / 2;
      left = Math.max(pad, Math.min(left, wrap.clientWidth - tbW - pad));

      toolbar.style.top = top + "px";
      toolbar.style.left = left + "px";
      toolbar.dataset.place = placeSide;
    };

    place();
    requestAnimationFrame(place);
  }

  function editBtn(action, label, opts) {
    opts = opts || {};
    return (
      '<button type="button" class="ms-lb-edit-btn' +
      (opts.danger ? " is-danger" : "") +
      (opts.primary ? " is-primary" : "") +
      (opts.icon ? " is-icon" : "") +
      '" data-edit-action="' +
      action +
      '"' +
      (opts.title ? ' title="' + String(opts.title).replace(/"/g, "&quot;") + '"' : "") +
      (opts.disabled ? " disabled" : "") +
      ">" +
      label +
      "</button>"
    );
  }

  function editGroup(inner) {
    return '<div class="ms-lb-edit-group">' + inner + "</div>";
  }

  function editSection(label, inner) {
    return (
      '<div class="ms-lb-edit-section">' +
      '<span class="ms-lb-edit-section-label">' +
      label +
      "</span>" +
      '<div class="ms-lb-edit-section-body">' +
      inner +
      "</div></div>"
    );
  }

  const SITE_IMAGES_BUCKET = "site-images";
  const SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
  const SITE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  function siteImageExt(type) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    return "jpg";
  }

  function sanitizeSiteImageName(name) {
    return String(name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image";
  }

  function siteImageScopeId() {
    return (
      String(state.leadId || state.project?.lead_id || "").trim() ||
      String(state.projectId || "").trim() ||
      "draft"
    );
  }

  function setEditUploadStatus(msg, kind) {
    const el = document.getElementById("lb-edit-upload-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("is-error", "is-ok");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "ok") el.classList.add("is-ok");
  }

  async function uploadSiteImage(file) {
    if (!file) throw new Error("Choose an image first.");
    if (!SITE_IMAGE_TYPES.has(file.type)) throw new Error("Use JPG, PNG, WebP, or GIF.");
    if (file.size > SITE_IMAGE_MAX_BYTES) throw new Error("Image must be 5 MB or smaller.");
    if (!state.projectId) throw new Error("Save or generate a site before uploading images.");

    const user = await window.StudioAuth.getUser();
    if (!user?.id) throw new Error("Sign in required to upload images.");

    const client = window.SiteSupabase?.getClient?.();
    if (!client) throw new Error("Storage is not configured.");

    const scope = siteImageScopeId().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "draft";
    const path =
      user.id +
      "/" +
      scope +
      "/" +
      Date.now() +
      "-" +
      sanitizeSiteImageName(file.name) +
      "." +
      siteImageExt(file.type);

    const { error } = await client.storage.from(SITE_IMAGES_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;

    const { data } = client.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(path);
    const url = String(data?.publicUrl || "").trim();
    if (!url) throw new Error("Upload succeeded but URL is missing.");
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  async function handleSiteImageUpload(file, imageEl) {
    const btn = document.getElementById("lb-edit-upload-btn");
    const input = document.getElementById("lb-edit-file");
    const target = imageEl || editState.selected;
    if (!target || classifyEditable(target) !== "image") return;
    if (editState.selected !== target) selectEditable(target);
    try {
      if (btn) btn.disabled = true;
      setEditUploadStatus("Uploading…");
      const url = await uploadSiteImage(file);
      commitEditChange((node) => {
        node.setAttribute("src", url);
      });
      const srcInput = document.getElementById("lb-edit-src");
      if (srcInput) srcInput.value = url;
      const thumb = document.getElementById("lb-edit-thumb");
      if (thumb) {
        thumb.src = url;
        thumb.classList.remove("is-empty");
        thumb.alt = "";
      }
      setEditUploadStatus("Uploaded", "ok");
      window.StudioToast?.success?.("Image uploaded");
    } catch (e) {
      setEditUploadStatus(e.message || "Upload failed", "error");
      window.StudioToast?.error?.(e.message || "Upload failed");
    } finally {
      if (btn) btn.disabled = false;
      if (input) input.value = "";
    }
  }

  function defaultEditToolbarTab(kind) {
    if (kind === "image") return "media";
    if (kind === "section") return "layout";
    return "style";
  }

  function editToolbarTabsFor(kind, el) {
    const tabs = [];
    if (kind === "text" || kind === "link" || kind === "block" || kind === "section") {
      tabs.push({ id: "style", label: "Style" });
    }
    tabs.push({ id: "layout", label: "Layout" });
    if (kind === "image") tabs.push({ id: "media", label: "Media" });
    if (kind === "link" || el?.tagName?.toLowerCase() === "a") {
      tabs.push({ id: "content", label: "Link" });
    }
    return tabs;
  }

  function renderEditToolbar() {
    const el = editState.selected;
    const tabsEl = document.getElementById("lb-edit-tabs");
    const main = document.getElementById("lb-edit-toolbar-main");
    const foot = document.getElementById("lb-edit-toolbar-foot");
    if (!tabsEl || !main || !foot || !el) {
      hideEditToolbar();
      return;
    }
    const kind = classifyEditable(el);
    const doc = el.ownerDocument;
    const computed = doc.defaultView?.getComputedStyle(el);
    const textColor = rgbToHex(computed?.color || "#000000");
    const bgColor = rgbToHex(computed?.backgroundColor || "#ffffff");
    const tabs = editToolbarTabsFor(kind, el);
    if (!tabs.some((t) => t.id === editState.toolbarTab)) {
      editState.toolbarTab = tabs[0]?.id || "style";
    }
    const tab = editState.toolbarTab;

    tabsEl.innerHTML = tabs
      .map(
        (t) =>
          '<button type="button" class="ms-lb-edit-tab' +
          (t.id === tab ? " is-active" : "") +
          '" role="tab" aria-selected="' +
          (t.id === tab ? "true" : "false") +
          '" data-edit-tab="' +
          t.id +
          '">' +
          t.label +
          "</button>"
      )
      .join("");

    let body = "";
    if (tab === "style") {
      const chunks = [];
      if (kind === "text" || kind === "link" || kind === "block") {
        chunks.push(
          editSection(
            "Text",
            editGroup(editBtn("edit-text", "Edit text")) +
              editGroup(
                editBtn("align-left", "Left", { title: "Align left" }) +
                  editBtn("align-center", "Center", { title: "Align center" }) +
                  editBtn("align-right", "Right", { title: "Align right" })
              )
          )
        );
        chunks.push(
          editSection(
            "Size & color",
            editGroup(
              editBtn("size-down", "A−", { title: "Smaller" }) +
                editBtn("size-up", "A+", { title: "Larger" })
            ) +
              '<label class="ms-lb-edit-swatch" title="Text color">' +
              '<input class="ms-lb-edit-color" type="color" data-edit-action="text-color" value="' +
              textColor +
              '">' +
              '<span class="ms-lb-edit-swatch-label">Text</span>' +
              "</label>"
          )
        );
      }
      if (kind === "section" || kind === "block") {
        chunks.push(
          editSection(
            "Background",
            '<label class="ms-lb-edit-swatch" title="Background color">' +
              '<input class="ms-lb-edit-color" type="color" data-edit-action="bg-color" value="' +
              (bgColor === "#000000" ? "#ffffff" : bgColor) +
              '">' +
              '<span class="ms-lb-edit-swatch-label">Fill color</span>' +
              "</label>"
          )
        );
      }
      if (!chunks.length) {
        body = '<p class="ms-lb-edit-empty">No style options for this element.</p>';
      } else {
        body = '<div class="ms-lb-edit-panel">' + chunks.join("") + "</div>";
      }
    } else if (tab === "layout") {
      const chunks = [];
      if (kind === "section" || kind === "block") {
        chunks.push(
          editSection(
            "Spacing",
            editGroup(
              editBtn("pad-less", "− Space", { title: "Less padding" }) +
                editBtn("pad-more", "+ Space", { title: "More padding" })
            )
          )
        );
      }
      const reorder = getReorderContext(el);
      if (reorder) {
        const horizontalReorder = isHorizontalReorderParent(reorder.parent);
        const prevLabel = horizontalReorder ? "←" : "↑";
        const nextLabel = horizontalReorder ? "→" : "↓";
        const prevTitle = horizontalReorder ? "Move earlier" : "Move up";
        const nextTitle = horizontalReorder ? "Move later" : "Move down";
        chunks.push(
          editSection(
            "Order",
            editGroup(
              editBtn("move-prev", prevLabel, {
                icon: true,
                title: prevTitle,
                disabled: !reorder.canPrev,
              }) +
                editBtn("move-next", nextLabel, {
                  icon: true,
                  title: nextTitle,
                  disabled: !reorder.canNext,
                })
            ) +
              '<span class="ms-lb-edit-count">' +
              (reorder.index + 1) +
              " of " +
              reorder.total +
              "</span>" +
              '<span class="ms-lb-edit-hint">Or drag to reorder</span>'
          )
        );
      }
      chunks.push(
        editSection(
          "Element",
          editGroup(editBtn("duplicate", "Duplicate") + editBtn("hide", "Hide"))
        )
      );
      body = '<div class="ms-lb-edit-panel">' + chunks.join("") + "</div>";
    } else if (tab === "media" && kind === "image") {
      const src = String(el.getAttribute("src") || "").trim();
      const alt = String(el.getAttribute("alt") || "");
      body =
        '<div class="ms-lb-edit-panel ms-lb-edit-panel-fields">' +
        '<p class="ms-lb-edit-hint">Drop an image onto the preview, or upload here</p>' +
        '<div class="ms-lb-edit-image-row">' +
        (src
          ? '<img class="ms-lb-edit-thumb" id="lb-edit-thumb" src="' +
            src.replace(/"/g, "&quot;") +
            '" alt="">'
          : '<div class="ms-lb-edit-thumb is-empty" id="lb-edit-thumb" aria-hidden="true">No image</div>') +
        '<div class="ms-lb-edit-upload">' +
        '<button type="button" class="ms-lb-edit-upload-btn" id="lb-edit-upload-btn">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
        "Upload image</button>" +
        '<input class="ms-lb-edit-file" id="lb-edit-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif">' +
        '<p class="ms-lb-edit-upload-status" id="lb-edit-upload-status"></p>' +
        "</div></div>" +
        '<div class="ms-lb-edit-field">' +
        '<span class="ms-lb-edit-label">Image URL</span>' +
        '<input class="ms-lb-edit-input" id="lb-edit-src" type="url" value="' +
        src.replace(/"/g, "&quot;") +
        '" placeholder="https://…"></div>' +
        '<div class="ms-lb-edit-field">' +
        '<span class="ms-lb-edit-label">Alt text</span>' +
        '<input class="ms-lb-edit-input" id="lb-edit-alt" type="text" value="' +
        alt.replace(/"/g, "&quot;") +
        '" placeholder="Describe the image"></div></div>';
    } else if (tab === "content") {
      body =
        '<div class="ms-lb-edit-panel ms-lb-edit-panel-fields">' +
        '<div class="ms-lb-edit-field">' +
        '<span class="ms-lb-edit-label">Link URL</span>' +
        '<input class="ms-lb-edit-input" id="lb-edit-href" type="url" value="' +
        String(el.getAttribute("href") || "").replace(/"/g, "&quot;") +
        '" placeholder="https://…"></div></div>';
    } else {
      body = '<p class="ms-lb-edit-empty">Nothing here for this element.</p>';
    }

    main.innerHTML = body;
    foot.innerHTML =
      editGroup(
        editBtn("undo", "Undo", { disabled: editState.historyIndex <= 0, title: "Undo" }) +
          editBtn("redo", "Redo", {
            disabled: editState.historyIndex >= editState.history.length - 1,
            title: "Redo",
          })
      ) + editGroup(editBtn("delete", "Delete", { danger: true }));

    positionEditToolbar();
  }

  function selectEditable(el, opts) {
    opts = opts || {};
    const doc = getPreviewDoc();
    if (!doc) return;
    clearEditMarks(doc);
    editState.hovered = null;
    editState.selected = el;
    if (el) {
      el.setAttribute(EDIT_SELECT_ATTR, "1");
      if (getReorderContext(el)) el.setAttribute(EDIT_REORDERABLE_ATTR, "1");
      if (!opts.keepTab) {
        editState.toolbarTab = defaultEditToolbarTab(classifyEditable(el));
      }
    }
    renderEditToolbar();
  }

  function commitEditChange(mutator, opts) {
    opts = opts || {};
    if (!editState.selected) return;
    pushEditHistory();
    mutator(editState.selected);
    state.html = serializePreviewHtml();
    editState.lastWrittenHtml = state.html;
    if (opts.silentToolbar) positionEditToolbar();
    else renderEditToolbar();
    scheduleEditAutosave();
  }

  function startInlineTextEdit(el) {
    if (!el) return;
    pushEditHistory();
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.focus();
    const finish = () => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      el.removeEventListener("blur", finish);
      el.removeEventListener("keydown", onKey);
      state.html = serializePreviewHtml();
      editState.lastWrittenHtml = state.html;
      scheduleEditAutosave();
      renderEditToolbar();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        el.blur();
      }
      if (e.key === "Enter" && !e.shiftKey && el.tagName.toLowerCase() !== "p") {
        e.preventDefault();
        el.blur();
      }
    };
    el.addEventListener("blur", finish);
    el.addEventListener("keydown", onKey);
  }

  function handleEditToolbarAction(action, target) {
    const el = editState.selected;
    if (!el && action !== "undo" && action !== "redo") return;
    if (action === "undo") return undoEdit();
    if (action === "redo") return redoEdit();
    if (action === "close") {
      selectEditable(null);
      hideEditToolbar();
      return;
    }
    if (action === "edit-text") return startInlineTextEdit(el);
    if (action === "align-left") {
      return commitEditChange((node) => {
        node.style.textAlign = "left";
      });
    }
    if (action === "align-center") {
      return commitEditChange((node) => {
        node.style.textAlign = "center";
      });
    }
    if (action === "align-right") {
      return commitEditChange((node) => {
        node.style.textAlign = "right";
      });
    }
    if (action === "size-up" || action === "size-down") {
      return commitEditChange((node) => {
        const doc = node.ownerDocument;
        const current = parseFloat(doc.defaultView.getComputedStyle(node).fontSize) || 16;
        node.style.fontSize = Math.max(10, current + (action === "size-up" ? 2 : -2)) + "px";
      });
    }
    if (action === "text-color") {
      return commitEditChange((node) => {
        node.style.color = target.value;
      });
    }
    if (action === "bg-color") {
      return commitEditChange((node) => {
        node.style.backgroundColor = target.value;
      });
    }
    if (action === "pad-more" || action === "pad-less") {
      return commitEditChange((node) => {
        const doc = node.ownerDocument;
        const current = parseFloat(doc.defaultView.getComputedStyle(node).paddingTop) || 0;
        const next = Math.max(0, current + (action === "pad-more" ? 8 : -8));
        node.style.padding = next + "px";
      });
    }
    if (action === "hide") {
      return commitEditChange((node) => {
        node.style.display = "none";
        selectEditable(null);
        hideEditToolbar();
      });
    }
    if (action === "move-prev" || action === "move-next") {
      return commitEditChange((node) => {
        moveElementAmongPeers(node, action === "move-prev" ? "prev" : "next");
        selectEditable(node);
      });
    }
    if (action === "duplicate") {
      return commitEditChange((node) => {
        const clone = node.cloneNode(true);
        clone.removeAttribute(EDIT_SELECT_ATTR);
        clone.removeAttribute(EDIT_HOVER_ATTR);
        node.parentNode?.insertBefore(clone, node.nextSibling);
        selectEditable(clone);
      });
    }
    if (action === "delete") {
      return commitEditChange((node) => {
        const parent = node.parentNode;
        node.remove();
        selectEditable(null);
        hideEditToolbar();
        if (parent && parent !== parent.ownerDocument?.body) {
          /* keep empty parents for layout */
        }
      });
    }
  }

  function bindEditToolbarUi() {
    const toolbar = document.getElementById("lb-edit-toolbar");
    if (!toolbar || toolbar.dataset.bound === "1") return;
    toolbar.dataset.bound = "1";
    toolbar.addEventListener("click", (e) => {
      const tabBtn = e.target.closest("[data-edit-tab]");
      if (tabBtn) {
        e.preventDefault();
        e.stopPropagation();
        const next = tabBtn.getAttribute("data-edit-tab");
        if (next && next !== editState.toolbarTab) {
          editState.toolbarTab = next;
          renderEditToolbar();
        }
        return;
      }
      const uploadBtn = e.target.closest("#lb-edit-upload-btn");
      if (uploadBtn) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("lb-edit-file")?.click();
        return;
      }
      const btn = e.target.closest("[data-edit-action]");
      if (!btn || btn.tagName === "INPUT") return;
      e.preventDefault();
      e.stopPropagation();
      handleEditToolbarAction(btn.getAttribute("data-edit-action"), btn);
    });
    toolbar.addEventListener("change", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.id === "lb-edit-file" && el.files?.[0]) {
        void handleSiteImageUpload(el.files[0]);
      }
    });
    toolbar.addEventListener("input", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.dataset.editAction === "text-color" || el.dataset.editAction === "bg-color") {
        commitEditChange((node) => {
          if (el.dataset.editAction === "text-color") node.style.color = el.value;
          else node.style.backgroundColor = el.value;
        }, { silentToolbar: true });
        return;
      }
      if (el.id === "lb-edit-href") {
        commitEditChange((node) => node.setAttribute("href", el.value.trim()), {
          silentToolbar: true,
        });
      } else if (el.id === "lb-edit-src") {
        commitEditChange(
          (node) => {
            node.setAttribute("src", el.value.trim());
            const thumb = document.getElementById("lb-edit-thumb");
            if (thumb && thumb.tagName === "IMG") thumb.src = el.value.trim();
          },
          { silentToolbar: true }
        );
      } else if (el.id === "lb-edit-alt") {
        commitEditChange((node) => node.setAttribute("alt", el.value), { silentToolbar: true });
      }
    });
  }

  function dataTransferHasImage(dt) {
    if (!dt) return false;
    const files = dt.files;
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        if (SITE_IMAGE_TYPES.has(files[i].type)) return true;
      }
    }
    const items = dt.items;
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && SITE_IMAGE_TYPES.has(items[i].type)) return true;
      }
    }
    const types = dt.types ? Array.from(dt.types) : [];
    return types.includes("Files");
  }

  function pickImageFileFromDataTransfer(dt) {
    if (!dt?.files?.length) return null;
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files[i];
      if (SITE_IMAGE_TYPES.has(file.type)) return file;
    }
    return null;
  }

  function setImageDropHighlight(el) {
    const doc = editState.boundDoc;
    if (editState.dropImageEl && editState.dropImageEl !== el) {
      editState.dropImageEl.removeAttribute(EDIT_DROP_IMAGE_ATTR);
    }
    editState.dropImageEl = el && classifyEditable(el) === "image" ? el : null;
    if (editState.dropImageEl) {
      editState.dropImageEl.setAttribute(EDIT_DROP_IMAGE_ATTR, "1");
    } else if (doc) {
      doc.querySelectorAll("[" + EDIT_DROP_IMAGE_ATTR + "]").forEach((node) => {
        node.removeAttribute(EDIT_DROP_IMAGE_ATTR);
      });
    }
  }

  function detachEditMode() {
    const doc = editState.boundDoc;
    if (doc && editState.listeners) {
      const L = editState.listeners;
      doc.removeEventListener("pointermove", L.onPointerMove, true);
      doc.removeEventListener("pointerdown", L.onPointerDown, true);
      doc.removeEventListener("pointerup", L.onPointerUp, true);
      doc.removeEventListener("pointercancel", L.onPointerCancel, true);
      doc.removeEventListener("click", L.onClick, true);
      doc.removeEventListener("dblclick", L.onDblClick, true);
      doc.removeEventListener("submit", L.onSubmit, true);
      doc.removeEventListener("keydown", L.onKey, true);
      doc.removeEventListener("dragenter", L.onDragEnter, true);
      doc.removeEventListener("dragover", L.onDragOver, true);
      doc.removeEventListener("dragleave", L.onDragLeave, true);
      doc.removeEventListener("drop", L.onDrop, true);
    }
    if (doc) {
      clearEditMarks(doc);
      doc.getElementById(EDIT_STYLE_ID)?.remove();
      doc.querySelectorAll("[contenteditable]").forEach((el) => {
        el.removeAttribute("contenteditable");
      });
    }
    editState.boundDoc = null;
    editState.listeners = null;
    editState.selected = null;
    editState.hovered = null;
    editState.drag = null;
    editState.dropImageEl = null;
    hideEditToolbar();
  }

  function attachEditMode(doc) {
    detachEditMode();
    if (!doc) return;
    ensureEditStyles(doc);
    bindEditToolbarUi();

    const onPointerMove = (e) => {
      if (editState.drag?.el) {
        const drag = editState.drag;
        if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.active && Math.hypot(dx, dy) >= EDIT_DRAG_THRESHOLD_PX) {
          if (!getReorderContext(drag.el)) {
            editState.drag = null;
          } else {
            drag.active = true;
            editState.didDrag = true;
            if (editState.hovered) {
              editState.hovered.removeAttribute(EDIT_HOVER_ATTR);
              editState.hovered = null;
            }
            drag.el.setAttribute(EDIT_DRAG_ATTR, "1");
            drag.el.setAttribute(EDIT_REORDERABLE_ATTR, "1");
            try {
              drag.el.setPointerCapture?.(e.pointerId);
            } catch (_) {
              /* ignore */
            }
          }
        }
        if (editState.drag?.active) {
          e.preventDefault();
          const slot = resolveDropSlot(editState.drag.el, e.clientX, e.clientY);
          editState.drag.slot = slot;
          paintDropIndicator(editState.drag.el, slot);
          return;
        }
      }

      if (editState.drag?.active) return;
      const target = resolveEditableTarget(e.target);
      if (editState.hovered && editState.hovered !== editState.selected) {
        editState.hovered.removeAttribute(EDIT_HOVER_ATTR);
        editState.hovered.removeAttribute(EDIT_REORDERABLE_ATTR);
      }
      editState.hovered = target && target !== editState.selected ? target : null;
      if (editState.hovered) {
        editState.hovered.setAttribute(EDIT_HOVER_ATTR, "1");
        if (getReorderContext(editState.hovered)) {
          editState.hovered.setAttribute(EDIT_REORDERABLE_ATTR, "1");
        }
      }
    };

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      if (e.target?.closest?.("[contenteditable=true]")) return;
      const target = resolveEditableTarget(e.target);
      if (!target) return;
      if (getReorderContext(target) || target.tagName.toLowerCase() === "img") {
        e.preventDefault();
      }
      editState.drag = {
        el: target,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        active: false,
        slot: null,
      };
    };

    const onPointerUp = (e) => {
      const drag = editState.drag;
      if (!drag) return;
      if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
      if (drag.active) {
        e.preventDefault();
        e.stopPropagation();
        endPointerDrag(true);
        return;
      }
      editState.drag = null;
    };

    const onPointerCancel = () => {
      if (editState.drag?.active) endPointerDrag(false);
      else editState.drag = null;
    };

    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (editState.didDrag) return;
      const target = resolveEditableTarget(e.target) || targetFromFramePoint(e.clientX, e.clientY);
      if (!target) {
        selectEditable(null);
        hideEditToolbar();
        return;
      }
      selectEditable(target);
    };

    const onDblClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (editState.didDrag) return;
      const target = resolveEditableTarget(e.target);
      if (!target) return;
      selectEditable(target);
      const kind = classifyEditable(target);
      if (kind === "text" || kind === "link" || kind === "block") {
        startInlineTextEdit(target);
      }
    };

    const onSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoEdit();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redoEdit();
      } else if (e.key === "Escape") {
        if (editState.drag?.active) {
          endPointerDrag(false);
          return;
        }
        selectEditable(null);
        hideEditToolbar();
      } else if (
        editState.selected &&
        editState.selected.getAttribute("contenteditable") !== "true" &&
        e.altKey &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        const reorder = getReorderContext(editState.selected);
        if (reorder) {
          e.preventDefault();
          handleEditToolbarAction(e.key === "ArrowLeft" ? "move-prev" : "move-next");
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        editState.selected &&
        editState.selected.getAttribute("contenteditable") !== "true"
      ) {
        e.preventDefault();
        handleEditToolbarAction("delete");
      }
    };

    const onDragEnter = (e) => {
      if (!dataTransferHasImage(e.dataTransfer)) return;
      const target = resolveEditableTarget(e.target);
      if (target && classifyEditable(target) === "image") {
        e.preventDefault();
        setImageDropHighlight(target);
      }
    };

    const onDragOver = (e) => {
      if (!dataTransferHasImage(e.dataTransfer)) return;
      const target = resolveEditableTarget(e.target);
      if (target && classifyEditable(target) === "image") {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setImageDropHighlight(target);
      } else {
        setImageDropHighlight(null);
      }
    };

    const onDragLeave = (e) => {
      const related = e.relatedTarget;
      if (related && doc.contains(related)) return;
      setImageDropHighlight(null);
    };

    const onDrop = (e) => {
      const target = resolveEditableTarget(e.target);
      setImageDropHighlight(null);
      if (!target || classifyEditable(target) !== "image") return;
      const file = pickImageFileFromDataTransfer(e.dataTransfer);
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      void handleSiteImageUpload(file, target);
    };

    editState.listeners = {
      onPointerMove,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onClick,
      onDblClick,
      onSubmit,
      onKey,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    };
    editState.boundDoc = doc;
    doc.addEventListener("pointermove", onPointerMove, true);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("pointerup", onPointerUp, true);
    doc.addEventListener("pointercancel", onPointerCancel, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("dblclick", onDblClick, true);
    doc.addEventListener("submit", onSubmit, true);
    doc.addEventListener("keydown", onKey, true);
    doc.addEventListener("dragenter", onDragEnter, true);
    doc.addEventListener("dragover", onDragOver, true);
    doc.addEventListener("dragleave", onDragLeave, true);
    doc.addEventListener("drop", onDrop, true);

    if (!editState.history.length) {
      editState.history = [serializePreviewHtml()];
      editState.historyIndex = 0;
    }
  }

  function flushEditHtmlToState() {
    if (state.mode !== "edit") return state.html;
    const next = serializePreviewHtml();
    if (next) {
      state.html = next;
      editState.lastWrittenHtml = next;
    }
    return state.html;
  }

  function stripRuntimeEmbedsFromStoredHtml(html) {
    return String(html || "")
      .replace(/<script\b[^>]*src=["'][^"']*\/embed\.js[^"']*["'][^>]*>\s*<\/script>/gi, "")
      .replace(/<script\b[^>]*src=["'][^"']*\/contact-form\.js[^"']*["'][^>]*>\s*<\/script>/gi, "")
      .replace(/<!--\s*moonrise:watermark\s*-->/gi, "");
  }

  function escapePreviewAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  /** Inject contact-form.js for editor preview (published sites get this on deploy). */
  function injectContactFormPreviewHtml(html) {
    const cfg = readContactFormConfig();
    if (!cfg.enabled || !state.projectId) {
      return stripRuntimeEmbedsFromStoredHtml(html);
    }
    const workerBase = workerUrl();
    if (!workerBase) return stripRuntimeEmbedsFromStoredHtml(html);

    let attrs =
      `data-project-id="${escapePreviewAttr(state.projectId)}" ` +
      `data-worker="${escapePreviewAttr(workerBase)}"`;

    if (cfg.mode === "custom") {
      const detected = detectContactEndpoint(cfg.endpointUrl);
      if (!cfg.endpointUrl || detected.type === "invalid" || detected.needsChatId) {
        return stripRuntimeEmbedsFromStoredHtml(html);
      }
      attrs +=
        ` data-mode="custom"` +
        ` data-endpoint="${escapePreviewAttr(cfg.endpointUrl)}"` +
        ` data-endpoint-type="${escapePreviewAttr(detected.type)}"`;
    } else {
      if (!cfg.notificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.notificationEmail)) {
        return stripRuntimeEmbedsFromStoredHtml(html);
      }
      attrs += ` data-mode="auto"`;
    }

    let out = stripRuntimeEmbedsFromStoredHtml(html);
    const tag = `\n<script src="${workerBase}/contact-form.js" ${attrs}></script>\n`;
    if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${tag}</body>`);
    return out + tag;
  }

  async function persistHtmlQuiet(html) {
    if (!state.projectId) return;
    const clean = stripRuntimeEmbedsFromStoredHtml(html);
    const user = await window.StudioAuth.getUser();
    const { error } = await sb()
      .from("projects")
      .update({
        html: clean,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.projectId)
      .eq("user_id", user.id);
    if (error) throw error;
    if (state.project) state.project.html = clean;
  }

  function scheduleEditAutosave() {
    if (!state.projectId) {
      setEditSaveStatus("unsaved");
      return;
    }
    setEditSaveStatus("unsaved");
    clearTimeout(editState.saveTimer);
    const gen = ++editState.saveGeneration;
    editState.saveTimer = setTimeout(() => {
      void runEditAutosave(gen);
    }, 800);
  }

  async function runEditAutosave(gen) {
    if (gen !== editState.saveGeneration) return;
    const html = flushEditHtmlToState();
    if (!state.projectId || !html) return;
    setEditSaveStatus("saving");
    try {
      await persistHtmlQuiet(html);
      if (gen !== editState.saveGeneration) return;
      setEditSaveStatus("saved");
      setTimeout(() => {
        if (editState.saveStatus === "saved") setEditSaveStatus("idle");
      }, 1800);
    } catch (e) {
      if (gen !== editState.saveGeneration) return;
      setEditSaveStatus("error", e.message || "Save failed");
      clearTimeout(editState.saveTimer);
      editState.saveTimer = setTimeout(() => {
        void runEditAutosave(++editState.saveGeneration);
      }, 2000);
    }
  }

  async function flushEditAutosaveNow() {
    clearTimeout(editState.saveTimer);
    flushEditHtmlToState();
    if (!state.projectId || !state.html) return;
    if (editState.saveStatus === "idle" || editState.saveStatus === "saved") return;
    const gen = ++editState.saveGeneration;
    await runEditAutosave(gen);
  }

  function enterEditMode() {
    if (!state.html || !state.html.trim()) {
      setError("Generate a site first, then use Edit.");
      state.mode = "preview";
      return;
    }
    bindEditToolbarUi();
    // Re-render the site with scripts disabled so the generated page can't
    // intercept clicks or navigate while the user is editing.
    applyPreviewSandbox("edit");
    const doc = writePreviewDocument(state.html) || getPreviewDoc();
    if (doc) attachEditMode(doc);
    setEditSaveStatus(editState.saveStatus === "saved" ? "idle" : editState.saveStatus);
    setEditHint("Click any text, image, or section to edit it.");
  }

  function exitEditMode({ serialize } = { serialize: true }) {
    if (serialize && editState.boundDoc) {
      flushEditHtmlToState();
    }
    detachEditMode();
    setEditHint("");
  }

  function updatePreview() {
    // Hard gate: never render the code editor without an active subscription.
    if (state.mode === "code" && !canAccessCodeTools()) {
      state.mode = "preview";
    }
    const frame = document.getElementById("preview-frame");
    const editor = document.getElementById("code-editor");
    const wrap = document.getElementById("preview-wrap");
    setModeUi();
    syncPreviewChromeUrl();

    if (state.mode === "code") {
      exitEditMode({ serialize: true });
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
    setPreviewFrameViewportClass(frame, state.viewport);
    syncFullscreenUi();
    syncEmptyState();
    applyPreviewViewportSize();

    if (state.mode === "edit") {
      // enterEditMode re-renders with a script-free sandbox and binds editing.
      enterEditMode();
      editState.skipRewrite = false;
      refreshWatermark();
      return;
    }

    // Preview mode: make sure scripts are enabled again, then render if needed.
    const restoringFromEdit = editState.lastSandboxMode === "edit";
    if (restoringFromEdit) {
      exitEditMode({ serialize: false });
      applyPreviewSandbox("preview");
    }

    const bodyHtml = String(getPreviewDoc()?.body?.innerHTML || "").trim();
    const bodyLooksEmpty = !bodyHtml || bodyHtml === "<br>" || bodyHtml === "<br/>";
    const needsWrite =
      !!(state.html && frame) &&
      !editState.skipRewrite &&
      (restoringFromEdit ||
        editState.lastWrittenHtml !== state.html ||
        !frame.contentDocument?.body ||
        bodyLooksEmpty);

    if (needsWrite) {
      writePreviewDocument(state.html);
    } else {
      const existing = getPreviewDoc();
      if (existing && state.html && !existing.querySelector("[data-ms-mobile-fit]")) {
        writePreviewDocument(state.html);
      }
    }

    setEditSaveStatus("idle");
    editState.skipRewrite = false;
    refreshWatermark();
    if (state.html && state.mode !== "code") {
      frame?.classList.remove("is-parked");
      setPreviewFrameViewportClass(frame, state.viewport);
      requestAnimationFrame(() => {
        ensurePreviewPainted();
        requestAnimationFrame(() => ensurePreviewPainted());
      });
      window.setTimeout(() => ensurePreviewPainted(), 120);
      window.setTimeout(() => ensurePreviewPainted(), 400);
      window.setTimeout(() => {
        if (state.html) ensurePreviewPainted();
      }, 900);
    }
  }

  function setPublishEnabled() {
    const ready = canPublishSite();
    const isLive = !!liveSiteUrl();
    const hasUpdates = isLive && hasUnpublishedChanges();
    const btn = document.getElementById("btn-publish-top");
    if (btn) btn.disabled = !ready || (isLive && !hasUpdates);
    syncPublishLiveUi();
  }

  const PAYMENT_POLICY_AGREE_KEY = "ms_lb_payment_policy_v1";

  function paymentPolicyStorageKey() {
    if (!state.projectId) return "";
    return PAYMENT_POLICY_AGREE_KEY + "_" + (state.userId || "anon") + "_" + state.projectId;
  }

  function isPaymentPolicyAgreed() {
    const box = document.getElementById("lb-payment-policy-agree");
    if (box?.checked) return true;
    try {
      const key = paymentPolicyStorageKey();
      return !!(key && localStorage.getItem(key) === "1");
    } catch (_) {
      return false;
    }
  }

  function rememberPaymentPolicyAgreement() {
    try {
      const key = paymentPolicyStorageKey();
      if (key) localStorage.setItem(key, "1");
    } catch (_) {
      /* ignore */
    }
    const box = document.getElementById("lb-payment-policy-agree");
    if (box) box.checked = true;
  }

  function syncPaymentPolicyAgreeUi() {
    const box = document.getElementById("lb-payment-policy-agree");
    if (!box) return;
    let agreed = false;
    try {
      const key = paymentPolicyStorageKey();
      agreed = !!(key && localStorage.getItem(key) === "1");
    } catch (_) {
      agreed = false;
    }
    box.checked = agreed;
  }

  function canPublishSite() {
    return !!(state.projectId && state.html && isPaymentPolicyAgreed());
  }

  const PUBLISH_BTN_ICON =
    '<path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><polyline points="12 3 12 15"/><path d="m7 8 5-5 5 5"/>';
  const LIVE_BTN_ICON =
    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';

  function liveBannerDismissKey() {
    return state.projectId ? "ms_live_banner_dismissed_" + state.projectId : "";
  }

  function isLiveBannerDismissed() {
    const key = liveBannerDismissKey();
    if (!key) return false;
    try {
      return localStorage.getItem(key) === "1";
    } catch (_) {
      return false;
    }
  }

  function dismissLiveBanner({ persist = true } = {}) {
    const banner = document.getElementById("lb-live-banner");
    if (banner) banner.hidden = true;
    if (persist && state.projectId) {
      try {
        localStorage.setItem(liveBannerDismissKey(), "1");
      } catch (_) {
        /* ignore */
      }
    }
  }

  function dismissOfflineBanner() {
    const banner = document.getElementById("lb-offline-banner");
    if (banner) banner.hidden = true;
  }

  function showOfflineBanner(url) {
    const banner = document.getElementById("lb-offline-banner");
    const urlEl = document.getElementById("lb-offline-banner-url");
    const raw = String(url || "").trim();
    if (!banner || !raw) return;
    dismissLiveBanner({ persist: false });
    if (urlEl) {
      urlEl.textContent = raw.replace(/^https?:\/\//i, "");
    }
    banner.hidden = true;
    void banner.offsetWidth;
    banner.hidden = false;
  }

  function syncPublishLiveUi({ showBanner = false } = {}) {
    const url = liveSiteUrl();
    const isLive = !!url;
    const hasUpdates = isLive && hasUnpublishedChanges();
    const paid = isPaidProject(state.project);
    syncPreviewChromeUrl();
    const publishBtn = document.getElementById("btn-publish-top");
    const unpublishBtn = document.getElementById("btn-unpublish-top");
    const deleteBtn = document.getElementById("btn-delete-top");
    const settingsDeleteBtn = document.getElementById("lb-set-delete");
    const settingsUnpublishBtn = document.getElementById("lb-set-unpublish");
    const label = publishBtn?.querySelector(".ms-lb-publish-label");
    const icon = publishBtn?.querySelector(".ms-lb-publish-icon");

    if (publishBtn) {
      publishBtn.classList.toggle("is-live", isLive && !hasUpdates);
      publishBtn.classList.toggle("needs-update", hasUpdates);
      publishBtn.setAttribute(
        "aria-label",
        !isLive
          ? "Publish site"
          : hasUpdates
            ? "Publish changes to live site"
            : "Site is live"
      );
      if (!canPublishSite()) {
        publishBtn.disabled = true;
      } else if (isLive) {
        publishBtn.disabled = !hasUpdates;
      } else {
        publishBtn.disabled = false;
      }
    }
    if (label) label.textContent = publishTopLabel();
    if (icon) icon.innerHTML = hasUpdates || !isLive ? PUBLISH_BTN_ICON : LIVE_BTN_ICON;
    const settingsPublish = document.getElementById("lb-set-publish");
    if (settingsPublish) {
      settingsPublish.textContent = settingsPublishLabel();
      settingsPublish.disabled = !canPublishSite() || (isLive && !hasUpdates);
    }
    if (unpublishBtn) unpublishBtn.hidden = !isLive;
    if (settingsUnpublishBtn) settingsUnpublishBtn.hidden = !isLive;
    if (deleteBtn) deleteBtn.hidden = !state.projectId || paid;
    if (settingsDeleteBtn) {
      settingsDeleteBtn.hidden = paid;
      settingsDeleteBtn.disabled = paid;
      settingsDeleteBtn.title = paid
        ? "This website was paid for - it can’t be deleted."
        : "";
    }
    syncRedesignButtonUi();

    const offlineBanner = document.getElementById("lb-offline-banner");
    if (isLive && offlineBanner) offlineBanner.hidden = true;

    const banner = document.getElementById("lb-live-banner");
    const link = document.getElementById("lb-live-banner-link");
    if (link) {
      link.href = url || "#";
      link.textContent = url || "";
    }
    if (!banner) return;

    if (!isLive) {
      banner.hidden = true;
      return;
    }
    if (showBanner) {
      try {
        localStorage.removeItem(liveBannerDismissKey());
      } catch (_) {
        /* ignore */
      }
      dismissOfflineBanner();
      banner.hidden = true;
      void banner.offsetWidth;
      banner.hidden = false;
      return;
    }
    banner.hidden = isLiveBannerDismissed();
  }

  const MIN_PRICE_CENTS = 100;
  const MAX_PRICE_CENTS = 10000000;
  const DEFAULT_PRICE_CENTS = 50000;
  let priceCountUpToken = 0;
  let priceCountUpDone = false;

  function cancelPriceCountUp() {
    priceCountUpToken += 1;
    priceCountUpDone = true;
  }

  function hasPendingProjectLoad() {
    if (state.projectId) return true;
    try {
      return !!String(params().get("project_id") || "").trim();
    } catch (_) {
      return false;
    }
  }

  function formatPriceInputValue(cents) {
    const n = Number(cents) / 100;
    if (!Number.isFinite(n)) return "";
    const hasCents = Math.round(n * 100) % 100 !== 0;
    return n.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
  }

  function clampPriceCents(cents) {
    const n = Math.round(Number(cents));
    if (!Number.isFinite(n)) return DEFAULT_PRICE_CENTS;
    return Math.min(MAX_PRICE_CENTS, Math.max(MIN_PRICE_CENTS, n));
  }

  function parsePriceInput(raw) {
    let s = String(raw || "").trim().replace(/\$/g, "").replace(/,/g, "").toLowerCase();
    if (!s) return null;
    const kMatch = s.match(/^(\d+(?:\.\d+)?)\s*k$/);
    if (kMatch) {
      const dollars = Number(kMatch[1]) * 1000;
      if (!Number.isFinite(dollars)) return null;
      return clampPriceCents(dollars * 100);
    }
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    const dollars = Number(s);
    if (!Number.isFinite(dollars)) return null;
    return clampPriceCents(Math.round(dollars * 100));
  }

  function prefersReducedMotion() {
    try {
      return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch (_) {
      return false;
    }
  }

  function animatePriceCountUp(targetCents) {
    const inputEl = document.getElementById("lb-price-input");
    if (!inputEl) return;
    const target = clampPriceCents(targetCents);
    if (priceCountUpDone || prefersReducedMotion() || document.activeElement === inputEl) {
      inputEl.value = formatPriceInputValue(target);
      priceCountUpDone = true;
      return;
    }

    const token = ++priceCountUpToken;
    const durationMs = 900;
    const start = performance.now();
    inputEl.value = "0";

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
      if (token !== priceCountUpToken) return;
      if (document.activeElement === inputEl) {
        inputEl.value = formatPriceInputValue(target);
        priceCountUpDone = true;
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      const cents = Math.round(target * easeOutCubic(t));
      inputEl.value = formatPriceInputValue(cents);
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      inputEl.value = formatPriceInputValue(target);
      priceCountUpDone = true;
    }

    requestAnimationFrame(frame);
  }

  function setPriceCents(cents, { persist = false, syncInput = true } = {}) {
    state.priceCents = clampPriceCents(cents);
    syncPriceUi({ syncInput });
    if (persist) {
      void persistPrice().then(() => refreshWatermark());
    }
  }

  function syncPriceUi({ syncInput = true, animate = false } = {}) {
    const cents = clampPriceCents(state.priceCents);
    state.priceCents = cents;
    const inputEl = document.getElementById("lb-price-input");
    const statEl = inputEl?.closest(".ms-lb-price-stat");
    if (syncInput && inputEl && document.activeElement !== inputEl) {
      if (animate && !priceCountUpDone) {
        animatePriceCountUp(cents);
      } else {
        inputEl.value = formatPriceInputValue(cents);
      }
    }
    if (statEl) {
      const invalid =
        inputEl &&
        document.activeElement === inputEl &&
        String(inputEl.value || "").trim() !== "" &&
        parsePriceInput(inputEl.value) == null;
      statEl.classList.toggle("is-invalid", !!invalid);
    }
  }

  // Persist the seller-chosen price to the project row so the live watermark
  // checkout (an unauthenticated business owner) can charge the right amount.
  async function persistPrice() {
    if (!state.projectId) return;
    try {
      localStorage.setItem("ms_project_price_" + state.projectId, String(state.priceCents));
    } catch (_) {
      /* ignore */
    }
    try {
      const user = await window.StudioAuth.getUser();
      await sb()
        .from("projects")
        .update({ price_cents: state.priceCents })
        .eq("id", state.projectId)
        .eq("user_id", user.id);
      if (state.project) state.project.price_cents = state.priceCents;
    } catch (_) {
      /* non-fatal - price still applied locally */
    }
  }

  function refreshWatermark() {
    const host = document.getElementById("watermark-host");
    window.MoonriseWatermarkEmbed?.unmount?.();
    if (host) host.innerHTML = "";

    // Watermark preview is editor-only suppressed; live sites get embed.js on publish.
    if (document.body?.dataset?.page === "editor") {
      setPublishEnabled();
      return;
    }

    const unpaid = state.project?.watermark_enabled !== false;
    if (host && unpaid && state.projectId && window.MoonriseWatermarkEmbed?.mount) {
      const CC = window.MoonriseCreatorContact;
      const creatorContact =
        CC?.readStoredCreatorContact?.(state.project) ||
        CC?.creatorContactFromProfile?.(state.profile) ||
        null;
      window.MoonriseWatermarkEmbed.mount({
        host,
        projectId: state.projectId,
        workerUrl: workerUrl(),
        urgencyEndsAt: state.project?.urgency_ends_at || "",
        creatorContact,
        hqContact: CC?.HQ_CONTACT || null,
      });
    }
    setPublishEnabled();
  }

  function workerUnreachableMessage(base, cause) {
    const url = String(base || "").replace(/\/$/, "") || "the Moonrise worker";
    const detail = cause ? " (" + String(cause).replace(/^Error:\s*/i, "") + ")" : "";
    try {
      if (location.protocol === "file:") {
        return (
          "Generation needs the live Moonrise site. Open https://trymoonrise.com/editor.html instead of a file on your computer." +
          detail
        );
      }
    } catch (_) {
      /* ignore */
    }
    const isLocal = /localhost|127\.0\.0\.1|\[::1\]|:8787/i.test(url);
    if (isLocal) {
      return (
        "Can't reach the local Moonrise worker at " +
        url +
        ". Start it with: cd moonrise-studio/worker && npm start - or run localStorage.setItem('ms_use_local_worker','0') and refresh to use the cloud API." +
        detail
      );
    }
    return (
      "Can't reach the Moonrise API at " +
      url +
      ". Hard-refresh and try again. If you're on a VPN or flaky network, reconnect and retry." +
      detail
    );
  }

  async function pingWorker(_base, signal) {
    if (typeof window.pingMoonriseWorker === "function") {
      return window.pingMoonriseWorker(signal);
    }
    const base = workerUrl();
    const health = await fetch(base + "/health", { method: "GET", cache: "no-store", signal });
    if (!health.ok) throw new Error("Worker health check failed (" + health.status + ")");
    return base;
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
    if (!user?.id) throw new Error("Sign in required to open this project.");
    const { data, error } = await sb()
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Project not found");
    cancelPriceCountUp();
    state.projectId = data.id;
    state.project = data;
    state.html = ensureMobileFriendlyHtml(data.html || "");
    editState.lastWrittenHtml = "";
    editState.previewPainted = false;
    state.viewportCustomized.desktop = false;
    state.viewportWidths.desktop = null;
    state.viewportHeights.desktop = null;
    const dbPrice = Number(data.price_cents);
    const savedPrice = Number(localStorage.getItem("ms_project_price_" + data.id));
    if (Number.isFinite(dbPrice) && dbPrice >= MIN_PRICE_CENTS) {
      state.priceCents = clampPriceCents(dbPrice);
    } else if (Number.isFinite(savedPrice) && savedPrice >= MIN_PRICE_CENTS) {
      state.priceCents = clampPriceCents(savedPrice);
    } else {
      state.priceCents = DEFAULT_PRICE_CENTS;
    }
    syncPriceUi({ animate: false });
    state.templateId = data.template_id || state.templateId;
    state.leadId = data.lead_id || null;
    state.onboardDone = !!(state.html && state.html.trim());
    const ctx = data.business_context || {};
    if (ctx.notes) {
      setUserGenerationPrompt(ctx.notes);
    }
    setBusinessValue("businessName", data.business_name || ctx.businessName || "");
    setBusinessValue("category", ctx.category || "");
    setBusinessValue("phone", ctx.phone || "");
    setBusinessValue("address", ctx.address || "");
    setBusinessValue("description", ctx.description || "");
    setBusinessValue("mapsUrl", ctx.mapsUrl || "");
    syncBusinessToOnboard();
    syncOnboardTemplateSelection();
    syncPromptActionUi();
    syncMvpAccessUi();
    syncSiteSettingsUi();
    syncPaymentPolicyAgreeUi();
    updatePreview();
    schedulePreviewRepaint();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ensurePreviewPainted());
    });
  }

  function hydrateIntakeFromFinderUrl() {
    const p = params();
    const name = String(p.get("name") || "").trim();
    const category = String(p.get("category") || "").trim();
    const phone = String(p.get("phone") || "").trim();
    const address = String(p.get("address") || "").trim();
    const maps = String(p.get("maps") || "").trim();
    const website = String(p.get("website") || "").trim();
    const hours = String(p.get("hours") || "").trim();
    const description = String(p.get("description") || "").trim();
    const leadId = String(p.get("lead_id") || p.get("lead") || "").trim();
    // Finder swipe: always prefer URL/pick facts over empty onboard fields.
    if (leadId) state.leadId = leadId;
    if (name) setBusinessValue("businessName", name);
    if (category) setBusinessValue("category", category);
    if (phone) setBusinessValue("phone", phone);
    if (address) setBusinessValue("address", address);
    if (maps) {
      setBusinessValue("mapsUrl", maps);
      state.mapsReady = true;
    }
    if (website) setBusinessValue("website", website);
    if (hours) setBusinessValue("hours", hours);
    if (description) setBusinessValue("description", description);
    if (!state.fromFinder && hasFreshLeadIntake(p)) state.fromFinder = true;
    syncBusinessToOnboard(true);
  }

  function readGenInflight() {
    if (window.MsGenerationLock?.readInflight) return window.MsGenerationLock.readInflight();
    try {
      const raw = sessionStorage.getItem(GEN_INFLIGHT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      const age = Date.now() - Number(data.startedAt || 0);
      if (!data.requestId || age > GEN_INFLIGHT_MAX_MS) {
        sessionStorage.removeItem(GEN_INFLIGHT_KEY);
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function writeGenInflight(payload) {
    if (window.MsGenerationLock?.writeInflight) {
      window.MsGenerationLock.writeInflight(payload);
      return;
    }
    try {
      sessionStorage.setItem(
        GEN_INFLIGHT_KEY,
        JSON.stringify({
          ...payload,
          startedAt: payload.startedAt || Date.now(),
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function clearGenInflight() {
    if (window.MsGenerationLock?.clearInflight) {
      window.MsGenerationLock.clearInflight();
      return;
    }
    try {
      sessionStorage.removeItem(GEN_INFLIGHT_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function generationBlockedMessage() {
    return "A website is already being generated. Wait for it to finish before starting another.";
  }

  function currentGenerationLeadId() {
    const p = params();
    return String(state.leadId || p.get("lead_id") || p.get("lead") || "").trim() || null;
  }

  function canResumeInflightGeneration(inflight, opts) {
    if (!inflight?.requestId) return false;
    if (opts?.resume) return true;
    const leadId = currentGenerationLeadId();
    if (inflight.leadId && leadId && inflight.leadId === leadId) return true;
    if (inflight.projectId && state.projectId && inflight.projectId === state.projectId) return true;
    if (
      !inflight.leadId &&
      !leadId &&
      inflight.requestId &&
      (opts?.fromFinder || state.fromFinder || hasFreshLeadIntake())
    ) {
      return true;
    }
    return false;
  }

  function assertCanStartGeneration(opts, isRedesign) {
    const inflight = readGenInflight();
    const lockActive = window.MsGenerationLock?.isActive?.() || !!inflight?.requestId;
    if (!lockActive) return { ok: true, resume: false };
    if (generateInFlight) return { ok: false, reason: "in_tab" };
    if (!isRedesign && canResumeInflightGeneration(inflight, opts)) {
      return { ok: true, resume: true };
    }
    return { ok: false, reason: "blocked" };
  }

  function createGenerateRequestId(isRedesign, opts) {
    if (!isRedesign && opts?.resume) {
      const existing = readGenInflight();
      if (existing?.requestId) return existing.requestId;
    }
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "gen-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function sleepMs(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function pollGenerateUntilDone(base, requestId, headers, signal) {
    const deadline = Date.now() + GEN_INFLIGHT_MAX_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) {
        const err = new Error("Generation cancelled.");
        err.name = "AbortError";
        throw err;
      }
      const res = await fetch(
        base + "/generate/status?requestId=" + encodeURIComponent(requestId),
        { headers, signal }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.html) return data;
      if (res.status === 404) break;
      if (res.status >= 500 && data.code === "generation_failed") {
        throw new Error(data.error || "Generation failed");
      }
      renderGenerateProgress(
        Math.max(genProgressPct, 40),
        "Still building your website…"
      );
      await sleepMs((Number(data.retryAfterSec) || 3) * 1000);
    }
    throw new Error(
      "Generation is still running. Keep this tab open - it should finish shortly."
    );
  }

  async function runGenerateRequest(base, requestId, intake, headers, signal) {
    const res = await fetch(base + "/generate", {
      method: "POST",
      headers: {
        ...headers,
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({
        projectId: state.projectId,
        requestId,
        ...intake,
      }),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 202 && data.inProgress) {
      return pollGenerateUntilDone(
        base,
        String(data.requestId || requestId),
        headers,
        signal
      );
    }
    if (res.status === 409 && data.code === "generation_in_progress") {
      const err = new Error(data.error || generationBlockedMessage());
      err.code = "generation_in_progress";
      throw err;
    }
    if (res.status === 429 || data.code === "rate_limited") {
      try {
        return await pollGenerateUntilDone(base, requestId, headers, signal);
      } catch (_) {
        throw new Error(
          data.error ||
            "Too many generation attempts. Your site may still be building - wait a moment and refresh."
        );
      }
    }
    if (!res.ok) throw new Error(data.error || "Generation failed");
    return data;
  }

  function beginFinderGenerateUi() {
    state.fromFinder = true;
    setBuilderPhase("workspace");
    clearPreviewGenError();
    editState.previewPainted = false;
    // Show preparing progress immediately so swipe never lands on "No code generated yet".
    if (!genProgressActive && !(state.html && String(state.html).trim())) {
      startGenerateProgress("Preparing your website…");
    } else {
      syncEmptyState();
    }
  }

  async function generate(opts) {
    const fromOnboard = !!(opts && opts.fromOnboard);
    const fromFinderFlow = !!(opts && opts.fromFinder) || !!state.fromFinder || hasFreshLeadIntake();
    const isRedesign = !!(opts && opts.redesign);
    if (generateInFlight && !isRedesign) return;

    const startCheck = assertCanStartGeneration(opts, isRedesign);
    if (!startCheck.ok) {
      if (startCheck.reason === "blocked") {
        const msg = generationBlockedMessage();
        if (fromOnboard) setOnboardError(msg);
        else setError(msg);
        window.StudioToast?.error?.(msg);
      }
      return;
    }
    if (startCheck.resume) {
      opts = { ...(opts || {}), resume: true };
    }

    generateInFlight = true;
    syncBuilderChannelGenerating({ cancellable: false });
    setError("");
    setOnboardError("");
    clearPreviewGenError();

    // Finder swipe: open workspace + preparing progress immediately.
    if (fromFinderFlow && !isRedesign) beginFinderGenerateUi();

    // Dock generate is blocked until the first site exists - unless this is setup Generate
    // or a Business Finder auto-generate handoff.
    if (!fromOnboard && !fromFinderFlow && !isRedesign && !state.onboardDone) {
      ensureOnboardSurvey();
      setError("Add a Google link or fill business details, then generate.");
      generateInFlight = false;
      syncBuilderChannelGenerating();
      return;
    }

    if (isRedesign) {
      if (!state.projectId || !(state.html && String(state.html).trim())) {
        setError("Generate a site first, then redesign.");
        generateInFlight = false;
        syncBuilderChannelGenerating();
        return;
      }
    }

    if (fromOnboard) captureOnboardDetails();
    if (fromFinderFlow) {
      applyPickFromStorageOrQuery(params(), { retain: true });
      hydrateIntakeFromFinderUrl();
      syncBusinessToOnboard(true);
    }

    const intake = readIntake();
    if (!intake.businessName || intake.businessName === "Untitled business") {
      if (fromFinderFlow) {
        const fallback =
          String(params().get("name") || "").trim() ||
          (state.leadId ? "Local Business" : "");
        if (fallback) {
          intake.businessName = sanitizeClientText(fallback, 120) || "Local Business";
          setBusinessValue("businessName", intake.businessName);
        }
      }
    }
    if (!intake.businessName || intake.businessName === "Untitled business") {
      const msg = "Business name is required.";
      if (fromOnboard) {
        setOnboardError(msg);
        updateOnboardContinue();
      } else setError(msg);
      generateInFlight = false;
      syncBuilderChannelGenerating();
      return;
    }

    // Guarantee Finder facts are on the payload even if onboard inputs were empty.
    if (fromFinderFlow) {
      const p = params();
      if (!intake.category) intake.category = sanitizeClientText(p.get("category") || "", 80);
      if (!intake.phone) intake.phone = sanitizeClientText(p.get("phone") || "", 40);
      if (!intake.address) intake.address = sanitizeClientText(p.get("address") || "", 200);
      if (!intake.mapsUrl) intake.mapsUrl = sanitizeClientText(p.get("maps") || "", 500);
      if (!intake.website) intake.website = sanitizeClientText(p.get("website") || "", 500);
      if (!intake.hours) intake.hours = sanitizeClientText(p.get("hours") || "", 200);
      if (!intake.description) {
        intake.description = sanitizeClientText(p.get("description") || "", 500);
      }
      if (!intake.leadId) intake.leadId = state.leadId || p.get("lead_id") || p.get("lead") || null;
    }

    intake.templateId = intake.templateId || state.templateId || "local-service";
    intake.usePresets = true;
    intake.fromFinder = fromFinderFlow;
    intake.redesign = isRedesign;
    intake.notes = readUserGenerationPrompt() || intake.notes || "";
    if (isRedesign) {
      const redesignNote =
        "REDESIGN: Create a completely different website - new layout, palette, typography, section order, and visual style. Do not reuse the previous design.";
      intake.notes = intake.notes
        ? String(intake.notes).trim() + "\n" + redesignNote
        : redesignNote;
    }

    try {
      assertSafePrompt(intake.notes);
    } catch (e) {
      if (fromOnboard) setOnboardError(e.message);
      else setError(e.message);
      generateInFlight = false;
      syncBuilderChannelGenerating();
      return;
    }

    setStatus("");
    if ((fromOnboard || fromFinderFlow) && !isRedesign) {
      setBuilderPhase("workspace");
    }

    renderGenerateProgress(Math.max(genProgressPct, 6), "Starting generation…");
    if (!genProgressActive) {
      startGenerateProgress("Starting generation…");
    }

    if (!(await ensureCreditsForGeneration())) {
      generateInFlight = false;
      failGenerateProgress("");
      syncBuilderChannelGenerating();
      return;
    }

    generateAbort = new AbortController();
    const signal = generateAbort.signal;
    const GENERATE_TIMEOUT_MS = 160000;
    const generateTimer = window.setTimeout(() => {
      try {
        generateAbort.abort();
      } catch (_) {
        /* ignore */
      }
    }, GENERATE_TIMEOUT_MS);
    // Real generate request armed - consume the stored pick and show building progress.
    applyPickFromStorageOrQuery(params(), { retain: false });
    setPromptBusy(true, isRedesign ? "Redesigning your website…" : "Building your website…");
    updateOnboardContinue();
    const generatedHtmlKeep = { html: "" };
    let generationSucceeded = false;
    try {
      let base = workerUrl();
      if (!base) throw new Error("Worker URL is not configured.");
      try {
        base = await pingWorker(base, signal);
      } catch (e) {
        if (e?.name === "AbortError") throw e;
        const primary =
          typeof window.resolveWorkerUrl === "function" ? window.resolveWorkerUrl() : base;
        throw new Error(workerUnreachableMessage(primary || base, e?.message || e));
      }
      renderGenerateProgress(Math.max(genProgressPct, 18), "Building your website…");
      const headers = await authHeaders();
      const requestId = createGenerateRequestId(isRedesign, opts);
      writeGenInflight({
        requestId,
        projectId: state.projectId || null,
        leadId: intake.leadId || state.leadId || null,
        redesign: isRedesign,
      });
      renderGenerateProgress(Math.max(genProgressPct, 25), "Building your website…");
      const data = await runGenerateRequest(base, requestId, intake, headers, signal);
      renderGenerateProgress(Math.max(genProgressPct, 88), "Finishing your website…");
      if (data.credits) {
        state.totalCredits = Number(data.credits.totalCredits) || 0;
        document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: data.credits }));
      }
      state.projectId = data.projectId;
      generatedHtmlKeep.html = ensureMobileFriendlyHtml(data.html || "");
      if (!String(generatedHtmlKeep.html || "").trim()) {
        throw new Error("Generation returned empty HTML. Please try again.");
      }
      editState.history = [];
      editState.historyIndex = -1;
      editState.lastWrittenHtml = "";
      editState.previewPainted = false;
      state.viewportCustomized.desktop = false;
      state.viewportWidths.desktop = null;
      state.viewportHeights.desktop = null;
      setEditSaveStatus("idle");
      history.replaceState({}, "", editorPageUrl({ project_id: state.projectId }));
      void markBuilderOnboarded();
      const statusMsg = isRedesign
        ? "Redesign complete."
        : data.presetCount
          ? "Generated with " + data.presetCount + " Website Presets. Watermark is on until payment."
          : "Generated. Watermark is on until payment.";
      await revealGeneratedSite(generatedHtmlKeep.html, { status: statusMsg });
      clearGenInflight();
      generationSucceeded = true;
      generateAbort = null;
      syncBuilderChannelGenerating();
      void loadProject(state.projectId)
        .then(() => {
          if (generatedHtmlKeep.html) {
            state.html = generatedHtmlKeep.html;
            writePreviewDocument(state.html);
            schedulePreviewRepaint();
          }
          syncPublishLiveUi();
          syncPriceUi({ animate: false });
        })
        .catch((loadErr) => {
          console.warn("loadProject after generate failed:", loadErr);
        });
      const setupStatus = document.getElementById("builder-setup-status");
      if (setupStatus) {
        setupStatus.hidden = true;
        setupStatus.textContent = "";
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        const msg = fromFinderFlow
          ? "Generation timed out or was cancelled. Please try again."
          : "Generation cancelled.";
        failGenerateProgress(msg);
        setStatus("");
        const status = document.getElementById("builder-status");
        if (status) {
          status.textContent = msg;
          status.classList.add("is-error");
        }
        if (fromOnboard) setOnboardError("");
        return;
      }
      let msg = e.message || "Generation failed";
      if (e?.code === "generation_in_progress") {
        clearGenInflight();
        msg = generationBlockedMessage();
      }
      if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
        msg = workerUnreachableMessage(workerUrl(), msg);
      }
      if (fromOnboard) setOnboardError(msg);
      failGenerateProgress(msg);
      const status = document.getElementById("builder-status");
      if (status) {
        status.textContent = msg;
        status.classList.add("is-error");
      }
      window.StudioToast?.error?.(msg);
      setStatus("");
      if ((fromOnboard || fromFinderFlow) && !isRedesign && !(state.html && String(state.html).trim())) {
        setBuilderPhase("workspace");
      }
    } finally {
      window.clearTimeout(generateTimer);
      generateInFlight = false;
      document.documentElement.classList.remove("ms-lb-boot-generating");
      if (generationSucceeded) {
        generateAbort = null;
        syncBuilderChannelGenerating();
      } else if (generatedHtmlKeep.html && String(generatedHtmlKeep.html).trim()) {
        // HTML arrived but success path failed mid-reveal - still finish.
        try {
          await revealGeneratedSite(generatedHtmlKeep.html);
        } catch (_) {
          failGenerateProgress("Could not display the generated website. Please try again.");
        }
        generateAbort = null;
        syncBuilderChannelGenerating();
      } else {
        generateAbort = null;
        syncBuilderChannelGenerating();
      }
      updateOnboardContinue();
      syncEmptyState();
    }
  }

  function syncRedesignButtonUi() {
    const btn = document.getElementById("btn-redesign-top");
    const label = btn?.querySelector(".ms-lb-redesign-label");
    const canRedesign = !!(state.projectId && state.html && String(state.html).trim());
    if (btn) {
      btn.hidden = !canRedesign;
      btn.disabled = !!generateAbort;
      btn.setAttribute("aria-label", "Redesign website");
    }
    if (label) {
      label.textContent = "Redesign";
    }
  }

  async function redesignSite() {
    setError("");
    if (!state.projectId || !(state.html && String(state.html).trim())) {
      setError("Generate a site first, then redesign.");
      return;
    }
    if (generateAbort) {
      setError("A generation is already running.");
      return;
    }
    const confirmed = await confirmRedesign();
    if (!confirmed) return;
    await generate({ redesign: true });
  }

  let redesignConfirmResolver = null;

  function closeRedesignConfirm(result) {
    const dialog = document.getElementById("lb-redesign-dialog");
    const submit = document.getElementById("lb-redesign-submit");
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Redesign";
    }
    dialog?.close();
    if (!redesignConfirmResolver) return;
    const resolve = redesignConfirmResolver;
    redesignConfirmResolver = null;
    resolve(!!result);
  }

  function confirmRedesign() {
    return new Promise((resolve) => {
      const dialog = document.getElementById("lb-redesign-dialog");
      const costEl = document.getElementById("lb-redesign-cost");
      if (!dialog) {
        resolve(false);
        return;
      }
      if (costEl) {
        costEl.textContent = "Your current design will be replaced with a new one.";
      }
      redesignConfirmResolver = resolve;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "open");
      window.requestAnimationFrame(() => {
        document.getElementById("lb-redesign-cancel")?.focus();
      });
    });
  }

  function bindRedesignConfirm() {
    const dialog = document.getElementById("lb-redesign-dialog");
    if (!dialog) return;

    document.getElementById("lb-redesign-cancel")?.addEventListener("click", () => {
      closeRedesignConfirm(false);
    });
    document.getElementById("lb-redesign-submit")?.addEventListener("click", () => {
      const submit = document.getElementById("lb-redesign-submit");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Starting…";
      }
      closeRedesignConfirm(true);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeRedesignConfirm(false);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeRedesignConfirm(false);
    });
  }

  async function editWithAi() {
    /* Ask AI bar removed. */
  }

  async function runPromptAction() {
    setError("");
    if (!state.onboardDone && !state.builderOnboarded) {
      ensureOnboardSurvey();
      setError("Generate a site first from setup.");
      return;
    }
    await generate({ fromOnboard: false });
  }

  async function publish() {
    if (publishInFlight) return;
    setError("");
    if (!isPaymentPolicyAgreed()) {
      setError("Check the payment policy agreement before publishing.");
      document.getElementById("lb-payment-policy-agree")?.focus();
      return;
    }
    if (ensureOnboardSurvey()) {
      setError("Add a Google link or fill business details, then generate.");
      return;
    }
    if (!state.projectId) return;
    setPublishLoading(true);
    try {
      if (state.mode === "edit") {
        flushEditHtmlToState();
        await flushEditAutosaveNow();
      } else if (state.mode === "code") {
        state.html = ensureMobileFriendlyHtml(document.getElementById("code-editor")?.value || state.html);
        await persistHtmlQuiet(state.html).catch(() => {});
      } else if (state.html) {
        state.html = ensureMobileFriendlyHtml(state.html);
        await persistHtmlQuiet(state.html).catch(() => {});
      }
      // Publishing is allowed while the watermark is on. The seller isn't the
      // payer - the live site carries the "Complete your order" widget and the
      // business owner pays there to remove the watermark (which auto-redeploys
      // the clean site).
      await persistPrice();
      const wasLive = !!liveSiteUrl();
      const hadUpdates = wasLive && hasUnpublishedChanges();
      const watermarked = state.project?.watermark_enabled !== false;
      setStatus(watermarked ? "Publishing to Vercel (with watermark)…" : "Publishing to Vercel…");
      const headers = await authHeaders();
      const res = await fetch(workerUrl() + "/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ projectId: state.projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Publish failed");
      await loadProject(state.projectId);
      rememberPaymentPolicyAgreement();
      const url = data.url || liveSiteUrl() || "done";
      syncPublishLiveUi({ showBanner: true });
      syncSiteSettingsUi();
      const action = wasLive && hadUpdates ? "Updated" : "Published";
      setStatus(
        state.project?.watermark_enabled !== false
          ? action + " with watermark: " +
              url +
              " - your client can pay on the live site to remove it."
          : action + ": " + url
      );
    } catch (e) {
      setError(e.message || "Publish failed");
      setStatus("");
    } finally {
      setPublishLoading(false);
    }
  }

  async function workerPost(path, body) {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured.");
    const headers = await authHeaders();
    let res;
    try {
      res = await fetch(base + path, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (e?.name === "TypeError" && /fetch/i.test(String(e.message || ""))) {
        const err = new Error("Could not reach the server. Try again in a moment.");
        err.code = "NETWORK";
        throw err;
      }
      throw e;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      const err = new Error(data.error || "Not found");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function unpublish() {
    if (!state.projectId) {
      setError("Open a project before unpublishing.");
      return;
    }
    if (!liveSiteUrl()) {
      setError("This site is not published.");
      syncPublishLiveUi();
      return;
    }
    const previousUrl = liveSiteUrl();
    const confirmed = await confirmUnpublish();
    if (!confirmed) return;
    setError("");
    setStatus("Taking site offline…");
    try {
      let data;
      try {
        // /publish?action=unpublish is deployed on production; /unpublish rewrite may not be yet.
        data = await workerPost("/publish", {
          projectId: state.projectId,
          action: "unpublish",
        });
      } catch (firstErr) {
        const retry =
          firstErr?.code === "NOT_FOUND" ||
          firstErr?.code === "NETWORK" ||
          /not found|404|reach the server/i.test(String(firstErr.message || ""));
        if (!retry) throw firstErr;
        data = await workerPost("/unpublish", { projectId: state.projectId });
      }
      void data;
      await loadProject(state.projectId);
      dismissLiveBanner({ persist: false });
      syncPublishLiveUi();
      syncSiteSettingsUi();
      showOfflineBanner(previousUrl);
      setStatus("Site unpublished - it is no longer live.");
    } catch (e) {
      setError(e.message || "Unpublish failed");
      setStatus("");
    }
  }

  let unpublishConfirmResolver = null;

  function closeUnpublishConfirm(result) {
    const dialog = document.getElementById("lb-unpublish-dialog");
    const submit = document.getElementById("lb-unpublish-submit");
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Unpublish";
    }
    dialog?.close();
    if (!unpublishConfirmResolver) return;
    const resolve = unpublishConfirmResolver;
    unpublishConfirmResolver = null;
    resolve(!!result);
  }

  function confirmUnpublish() {
    return new Promise((resolve) => {
      const dialog = document.getElementById("lb-unpublish-dialog");
      const urlEl = document.getElementById("lb-unpublish-url");
      if (!dialog) {
        resolve(false);
        return;
      }
      if (urlEl) {
        const live = liveSiteUrl();
        urlEl.textContent = live
          ? live.replace(/^https?:\/\//i, "")
          : "Not published";
      }
      unpublishConfirmResolver = resolve;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "open");
      window.requestAnimationFrame(() => {
        document.getElementById("lb-unpublish-cancel")?.focus();
      });
    });
  }

  function bindUnpublishConfirm() {
    const dialog = document.getElementById("lb-unpublish-dialog");
    if (!dialog) return;

    document.getElementById("lb-unpublish-cancel")?.addEventListener("click", () => {
      closeUnpublishConfirm(false);
    });
    document.getElementById("lb-unpublish-submit")?.addEventListener("click", () => {
      const submit = document.getElementById("lb-unpublish-submit");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Unpublishing…";
      }
      closeUnpublishConfirm(true);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeUnpublishConfirm(false);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeUnpublishConfirm(false);
    });
  }

  let deleteConfirmResolver = null;

  function closeDeleteConfirm(result) {
    const dialog = document.getElementById("lb-delete-dialog");
    const submit = document.getElementById("lb-delete-submit");
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Delete project";
    }
    dialog?.close();
    if (!deleteConfirmResolver) return;
    const resolve = deleteConfirmResolver;
    deleteConfirmResolver = null;
    resolve(!!result);
  }

  function confirmDeleteProject() {
    return new Promise((resolve) => {
      const dialog = document.getElementById("lb-delete-dialog");
      const nameEl = document.getElementById("lb-delete-project-name");
      if (!dialog) {
        resolve(false);
        return;
      }
      if (nameEl) {
        const name = String(state.project?.business_name || state.businessName || "This project").trim();
        nameEl.textContent = name || "This project";
      }
      deleteConfirmResolver = resolve;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "open");
      window.requestAnimationFrame(() => {
        document.getElementById("lb-delete-cancel")?.focus();
      });
    });
  }

  function bindDeleteConfirm() {
    const dialog = document.getElementById("lb-delete-dialog");
    if (!dialog) return;

    document.getElementById("lb-delete-cancel")?.addEventListener("click", () => {
      closeDeleteConfirm(false);
    });
    document.getElementById("lb-delete-submit")?.addEventListener("click", () => {
      const submit = document.getElementById("lb-delete-submit");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Deleting…";
      }
      closeDeleteConfirm(true);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDeleteConfirm(false);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDeleteConfirm(false);
    });
  }

  async function deleteProject() {
    if (!state.projectId) {
      setError("No project to delete");
      return;
    }
    if (isPaidProject(state.project)) {
      setError("This website was paid for - it can’t be deleted.");
      return;
    }
    const confirmed = await confirmDeleteProject();
    if (!confirmed) return;
    setError("");
    setStatus("Deleting project…");
    try {
      if (liveSiteUrl()) {
        try {
          await workerPost("/publish", {
            projectId: state.projectId,
            action: "unpublish",
          });
        } catch (_) {
          /* Still delete the project row if Vercel cleanup fails. */
        }
      }
      const user = await window.StudioAuth.getUser();
      const { data, error } = await sb()
        .from("projects")
        .delete()
        .eq("id", state.projectId)
        .eq("user_id", user.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        throw new Error("This website was paid for - it can’t be deleted.");
      }
      location.href = "dashboard.html";
    } catch (e) {
      setStatus("");
      setError(e.message || "Could not delete project");
    }
  }

  async function downloadHtml() {
    if (!(await requirePaidPlanAsync("download"))) return;
    if (!state.html || !state.html.trim()) {
      setError("Nothing to download yet - generate a site first.");
      return;
    }
    if (state.mode === "code") {
      state.html = document.getElementById("code-editor")?.value || state.html;
    } else if (state.mode === "edit") {
      flushEditHtmlToState();
    }
    const html = String(state.html || "").trim();
    if (!html) {
      setError("Nothing to download yet - generate a site first.");
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      (readIntake().businessName || "site").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase() +
      ".html";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function qrBusinessName() {
    return (
      businessValue("businessName") ||
      String(state.project?.business_name || "").trim() ||
      String(state.project?.business_context?.businessName || "").trim() ||
      readIntake().businessName ||
      "Business"
    );
  }

  function qrBusinessDetails() {
    const ctx = state.project?.business_context || {};
    const category =
      businessValue("category") ||
      String(ctx.category || state.project?.category || "").trim();
    const phone =
      businessValue("phone") ||
      String(ctx.phone || state.project?.phone || "").trim();
    const address =
      businessValue("address") ||
      String(ctx.address || state.project?.address || "").trim();
    const url = liveSiteUrl() || "";
    let siteLabel = url;
    try {
      const parsed = new URL(url);
      siteLabel = parsed.hostname.replace(/^www\./i, "");
      const path = parsed.pathname.replace(/\/$/, "");
      if (path && path !== "/") siteLabel += path;
    } catch (_) {
      /* keep raw url */
    }
    return { category, phone, address, siteLabel, url };
  }

  function syncQrBusinessCardDetails() {
    const details = qrBusinessDetails();
    const categoryEl = document.getElementById("lb-qr-category");
    const metaEl = document.getElementById("lb-qr-meta");
    if (categoryEl) {
      categoryEl.textContent = details.category || "";
      categoryEl.hidden = !details.category;
    }
    if (metaEl) {
      metaEl.textContent = "";
      const rows = [];
      if (details.phone) rows.push({ label: "Phone", value: details.phone });
      if (details.address) rows.push({ label: "Address", value: details.address });
      rows.forEach((row) => {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.className = "ms-lb-qr-meta-label";
        label.textContent = row.label;
        const value = document.createElement("span");
        value.className = "ms-lb-qr-meta-value";
        value.textContent = row.value;
        li.appendChild(label);
        li.appendChild(value);
        metaEl.appendChild(li);
      });
      metaEl.hidden = rows.length === 0;
    }
  }

  function qrCardRestTransform() {
    return "none";
  }

  function closeQrBusinessCard() {
    const modal = document.getElementById("lb-qr-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("ms-lb-qr-open");
    const card = document.getElementById("lb-qr-card");
    if (card) card.style.transform = qrCardRestTransform();
  }

  function bindQrCardTilt() {
    const card = document.getElementById("lb-qr-card");
    if (!card || card.dataset.tiltBound === "1") return;
    card.dataset.tiltBound = "1";
    card.style.transform = qrCardRestTransform();
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        "rotateY(" + (x * 24).toFixed(2) + "deg) rotateX(" + (-y * 18).toFixed(2) + "deg)";
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = qrCardRestTransform();
    });
  }

  async function ensureQrLibrary() {
    if (typeof QRCode !== "undefined" && QRCode.toCanvas) return QRCode;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ms-qrcode="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("QR library failed to load")), {
          once: true,
        });
        if (typeof QRCode !== "undefined" && QRCode.toCanvas) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "js/vendor/qrcode.min.js?v=1.5.1";
      script.dataset.msQrcode = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("QR library failed to load. Refresh and try again."));
      document.head.appendChild(script);
    });
    if (typeof QRCode === "undefined" || !QRCode.toCanvas) {
      throw new Error("QR library failed to load. Refresh and try again.");
    }
    return QRCode;
  }

  const QR_CANVAS_PX = 168;

  async function renderQrToCanvas(canvas, url) {
    if (!canvas) throw new Error("QR canvas missing");
    const lib = await ensureQrLibrary();
    await lib.toCanvas(canvas, url, {
      width: QR_CANVAS_PX,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return y;
    let line = "";
    let cy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = words[i];
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
    return cy + lineHeight;
  }

  function drawQrDownloadMetaRow(ctx, label, value, x, y, maxWidth) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 16px DM Sans, system-ui, sans-serif";
    ctx.fillText(String(label || "").toUpperCase(), x, y);
    ctx.fillStyle = "#475569";
    ctx.font = "500 22px DM Sans, system-ui, sans-serif";
    return wrapText(ctx, value, x, y + 28, maxWidth, 32);
  }

  async function downloadQrBusinessCardPng() {
    const url = liveSiteUrl();
    const name = qrBusinessName();
    if (!url) {
      setError("Publish your website first before creating a QR business card.");
      return;
    }
    const canvas = document.createElement("canvas");
    const w = 1200;
    const h = 680;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#f8fafc");
    grad.addColorStop(0.45, "#eef2ff");
    grad.addColorStop(1, "#e0e7ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Landscape card panel
    const cardX = 60;
    const cardY = 60;
    const cardW = w - 120;
    const cardH = h - 120;
    roundRect(ctx, cardX, cardY, cardW, cardH, 36);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const copyX = cardX + 56;
    const copyMaxW = cardW * 0.52;
    const details = qrBusinessDetails();

    let textY = cardY + 96;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 44px DM Sans, system-ui, sans-serif";
    textY = wrapText(ctx, name, copyX, textY, copyMaxW, 54);

    if (details.category) {
      textY += 8;
      ctx.fillStyle = "#64748b";
      ctx.font = "600 24px DM Sans, system-ui, sans-serif";
      textY = wrapText(ctx, details.category, copyX, textY, copyMaxW, 32);
    }

    if (details.phone) {
      textY += 12;
      textY = drawQrDownloadMetaRow(ctx, "Phone", details.phone, copyX, textY, copyMaxW);
    }
    if (details.address) {
      textY += 8;
      textY = drawQrDownloadMetaRow(ctx, "Address", details.address, copyX, textY, copyMaxW);
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(copyX, cardY + cardH - 88);
    ctx.lineTo(copyX + copyMaxW * 0.72, cardY + cardH - 88);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px DM Sans, system-ui, sans-serif";
    ctx.fillText("Scan with a phone camera", copyX, cardY + cardH - 56);

    const qrCanvas = document.createElement("canvas");
    await renderQrToCanvas(qrCanvas, url);
    const qrSize = 300;
    const qrPad = 22;
    const qrBoxX = cardX + cardW - qrSize - qrPad - 56;
    const qrBoxY = cardY + (cardH - qrSize - qrPad * 2) / 2;
    roundRect(ctx, qrBoxX, qrBoxY, qrSize + qrPad * 2, qrSize + qrPad * 2, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.1)";
    ctx.stroke();
    ctx.drawImage(qrCanvas, qrBoxX + qrPad, qrBoxY + qrPad, qrSize, qrSize);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download =
      name.replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").toLowerCase().replace(/^-|-$/g, "") ||
      "business-card";
    a.download += "-qr-card.png";
    a.click();
    window.StudioToast?.success?.("Business card downloaded");
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  async function openQrBusinessCard() {
    setError("");
    const url = liveSiteUrl();
    if (!url) {
      setError("Publish your website first before creating a QR business card.");
      return;
    }

    const name = qrBusinessName();
    const modal = document.getElementById("lb-qr-modal");
    const nameEl = document.getElementById("lb-qr-name");
    const codeLinkEl = document.getElementById("lb-qr-code-link");
    const canvas = document.getElementById("lb-qr-canvas");
    if (!modal || !nameEl || !codeLinkEl || !canvas) return;

    nameEl.href = url;
    nameEl.textContent = name;
    codeLinkEl.href = url;
    syncQrBusinessCardDetails();

    try {
      await renderQrToCanvas(canvas, url);
    } catch (e) {
      setError(e.message || "Could not create QR code");
      return;
    }

    modal.hidden = false;
    document.body.classList.add("ms-lb-qr-open");
    bindQrCardTilt();
  }

  function bindQrBusinessCardUi() {
    document.getElementById("lb-qr-close")?.addEventListener("click", closeQrBusinessCard);
    document.getElementById("lb-qr-close-backdrop")?.addEventListener("click", closeQrBusinessCard);
    document.getElementById("lb-qr-download")?.addEventListener("click", () => {
      void downloadQrBusinessCardPng();
    });
    document.getElementById("lb-qr-copy")?.addEventListener("click", async () => {
      const url = liveSiteUrl();
      if (!url) {
        setError("Publish your website first before creating a QR business card.");
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        window.StudioToast?.success?.("Link copied");
      } catch (_) {
        setError("Could not copy link");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !document.getElementById("lb-qr-modal")?.hidden) {
        closeQrBusinessCard();
      }
    });
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

  function normalizeLiveSiteUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    try {
      const parsed = new URL(raw.startsWith("http") ? raw : "https://" + raw);
      const host = parsed.hostname.toLowerCase();
      const slug = String(state.project?.business_context?.vercelSlug || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (slug && host.endsWith(".vercel.app") && host !== slug + ".vercel.app") {
        const prefix = slug + "-";
        if (host.startsWith(prefix)) {
          parsed.hostname = slug + ".vercel.app";
        }
      }
      return parsed.toString().replace(/\/$/, "");
    } catch (_) {
      return raw;
    }
  }

  function liveSiteUrl() {
    return normalizeLiveSiteUrl(state.project?.vercel_url);
  }

  /** Must match worker publishContentHash for publish/update detection. */
  function publishContentHash(html) {
    const str = String(html || "");
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
  }

  function currentPublishHtml() {
    if (state.mode === "edit") {
      flushEditHtmlToState();
    } else if (state.mode === "code") {
      const editor = document.getElementById("code-editor");
      if (editor) state.html = editor.value;
    }
    return ensureMobileFriendlyHtml(state.html || "");
  }

  function publishSettingsFingerprint() {
    const cfg = readContactFormConfig();
    const ctx = state.project?.business_context || {};
    const domain = ctx.customDomain && typeof ctx.customDomain === "object" ? ctx.customDomain : {};
    return publishContentHash(
      JSON.stringify({
        contactForm: {
          enabled: cfg.enabled,
          mode: cfg.mode,
          notificationEmail: cfg.notificationEmail,
          endpointUrl: cfg.endpointUrl,
          endpointType: cfg.endpointType,
        },
        customDomain: {
          hostname: String(domain.hostname || domain.domain || "").trim(),
          status: String(domain.status || "").trim(),
        },
      })
    );
  }

  function hasUnpublishedChanges() {
    if (!liveSiteUrl()) return false;
    const ctx = state.project?.business_context || {};
    const publishedSettings = String(ctx.publishedSettingsHash || "").trim();
    const currentSettings = publishSettingsFingerprint();
    if (!publishedSettings && readContactFormConfig().enabled) return true;
    if (publishedSettings && currentSettings !== publishedSettings) return true;
    const publishedHash = String(ctx.publishedContentHash || "").trim();
    const currentHash = publishContentHash(currentPublishHtml());
    if (publishedHash) return currentHash !== publishedHash;
    const lastPub = Date.parse(ctx.lastPublishedAt || "");
    const updated = Date.parse(state.project?.updated_at || "");
    if (Number.isFinite(lastPub) && Number.isFinite(updated)) {
      return updated > lastPub + 1500;
    }
    return false;
  }

  function publishTopLabel() {
    if (!liveSiteUrl()) return "Publish";
    return hasUnpublishedChanges() ? "Update" : "Live";
  }

  function publishBusyLabel() {
    return liveSiteUrl() && hasUnpublishedChanges() ? "Updating…" : "Publishing…";
  }

  let publishInFlight = false;

  function setPublishLoading(busy) {
    publishInFlight = busy;
    const topBtn = document.getElementById("btn-publish-top");
    const settingsBtn = document.getElementById("lb-set-publish");

    if (topBtn) {
      topBtn.classList.toggle("is-loading", busy);
      topBtn.setAttribute("aria-busy", busy ? "true" : "false");
      const label = topBtn.querySelector(".ms-lb-publish-label");
      if (label) {
        if (busy) {
          if (!label.dataset.idleText) label.dataset.idleText = label.textContent;
          label.textContent = publishBusyLabel();
        } else if (label.dataset.idleText) {
          label.textContent = label.dataset.idleText;
          delete label.dataset.idleText;
        }
      }
      if (busy) topBtn.disabled = true;
    }

    if (settingsBtn) {
      settingsBtn.classList.toggle("is-loading", busy);
      settingsBtn.setAttribute("aria-busy", busy ? "true" : "false");
      if (busy) {
        if (!settingsBtn.dataset.idleText) settingsBtn.dataset.idleText = settingsBtn.textContent;
        settingsBtn.textContent = publishBusyLabel();
        settingsBtn.disabled = true;
      } else if (settingsBtn.dataset.idleText) {
        settingsBtn.textContent = settingsBtn.dataset.idleText;
        delete settingsBtn.dataset.idleText;
      }
    }

    if (!busy) {
      setPublishEnabled();
      syncSiteSettingsUi();
    }
  }

  function settingsPublishLabel() {
    if (!liveSiteUrl()) return "Publish Site";
    return hasUnpublishedChanges() ? "Update Site" : "Published";
  }

  function isPaidProject(project) {
    const p = project || state.project;
    if (!p) return false;
    if (window.StudioProjects?.isClientPaidProject) return window.StudioProjects.isClientPaidProject(p);
    return p.watermark_enabled === false;
  }

  const VERCEL_SLUG_STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "at",
    "in",
    "on",
    "for",
    "to",
    "by",
    "llc",
    "llp",
    "inc",
    "corp",
    "co",
    "company",
    "ltd",
    "pllc",
    "service",
    "services",
    "repair",
    "repairs",
    "solutions",
    "group",
    "team",
    "handyman",
    "handymen",
    "professional",
    "professionals",
    "pros",
    "local",
    "best",
    "top",
    "quality",
    "premium",
    "trusted",
    "certified",
    "home",
    "homes",
    "business",
  ]);

  function slugifyVercelSegment(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function buildPredictedVercelSlug() {
    const ctx = state.project?.business_context || {};
    const saved = slugifyVercelSegment(ctx.vercelSlug);
    if (saved && saved.length >= 3) return saved.slice(0, 48);

    const businessName =
      businessValue("businessName") || state.project?.business_name || "your-site";

    const tokens = String(businessName)
      .toLowerCase()
      .replace(/['’]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const meaningful = tokens.filter((word) => !VERCEL_SLUG_STOP_WORDS.has(word));
    const words = (meaningful.length ? meaningful : tokens).slice(0, 4);
    let slug = slugifyVercelSegment(words.join("-")).slice(0, 48);
    if (slug.length < 3) slug = "your-site";
    return slug;
  }

  const PREVIEW_URL_UNPUBLISHED = "Publish to see your URL";

  function previewSiteUrl() {
    const live = liveSiteUrl();
    if (!live) return "";
    return /^https?:\/\//i.test(live) ? live : "https://" + live.replace(/^\/\//, "");
  }

  function previewChromeUrlLabel() {
    const live = liveSiteUrl();
    if (!live) return PREVIEW_URL_UNPUBLISHED;
    try {
      return new URL(live.startsWith("http") ? live : "https://" + live).hostname;
    } catch (_) {
      return live.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    }
  }

  function syncPreviewChromeUrl() {
    const el = document.getElementById("lb-preview-chrome-url");
    const copyBtn = document.getElementById("lb-preview-chrome-copy");
    const live = liveSiteUrl();
    const label = previewChromeUrlLabel();
    if (el) {
      el.textContent = label;
      el.classList.toggle("is-unpublished", !live);
      el.title = live ? previewSiteUrl() : "Publish your site to get a live link";
    }
    if (copyBtn) copyBtn.disabled = !live;
  }

  function bindPreviewChromeActions() {
    document.getElementById("lb-preview-chrome-copy")?.addEventListener("click", async () => {
      const url = previewSiteUrl();
      if (!url) {
        window.StudioToast?.error?.("Publish first to get a public URL.");
        return;
      }
      try {
        await copyText(url);
        setStatus("Link copied.");
      } catch (e) {
        setError(e.message || "Could not copy link");
      }
    });
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
    const domainWidgetInput = document.getElementById("lb-custom-domain");
    const domainWidgetHint = document.getElementById("lb-custom-domain-hint");
    const domainWidgetSummary = document.getElementById("lb-custom-domain-summary");
    const domainWidgetSave = document.getElementById("lb-custom-domain-save");
    const shareUrl = document.getElementById("lb-set-share-url");
    const shareHint = document.getElementById("lb-set-share-hint");
    const openBtn = document.getElementById("lb-set-open-link");
    const publishBtn = document.getElementById("lb-set-publish");

    const customDomain = String(ctx.customDomain || "");
    if (domainInput) domainInput.value = customDomain;
    if (domainWidgetInput) domainWidgetInput.value = customDomain;

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
    }

    if (publishBtn) {
      publishBtn.textContent = settingsPublishLabel();
      publishBtn.disabled = !canPublishSite() || (!!url && !hasUnpublishedChanges());
    }
    syncContactFormWidgetUi();
    syncCustomDomainWidgetUi();
    syncLbToolsPanelLayout();
  }

  function readCustomDomainConfig() {
    const ctx = state.project?.business_context || {};
    const domain = String(ctx.customDomain || "").trim();
    const enabled =
      ctx.customDomainEnabled === true ||
      (ctx.customDomainEnabled !== false && !!domain);
    return { enabled, domain };
  }

  function scrollSideControlsToWidget(widget) {
    const panel = document.querySelector(".ms-lb-side-controls");
    if (!panel || !widget) return;
    window.requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const widgetRect = widget.getBoundingClientRect();
      if (widgetRect.bottom > panelRect.bottom - 12) {
        panel.scrollTop += widgetRect.bottom - panelRect.bottom + 28;
      } else if (widgetRect.top < panelRect.top + 8) {
        panel.scrollTop += widgetRect.top - panelRect.top - 12;
      }
    });
  }

  function syncLbToolsPanelLayout() {
    const body = document.querySelector(".ms-lb-body");
    if (!body) return;
    const anyExpanded = !!body.querySelector(".ms-lb-side-controls .ms-lb-widget.is-expanded");
    body.classList.toggle("is-tools-expanded", anyExpanded);
  }

  function setLbWidgetExpanded(widget, body, checkbox, expanded, { animate = true, onChange } = {}) {
    if (checkbox) checkbox.checked = !!expanded;
    if (widget) {
      if (!animate) widget.classList.add("is-instant");
      widget.classList.toggle("is-expanded", !!expanded);
      if (!animate) {
        window.requestAnimationFrame(() => widget.classList.remove("is-instant"));
      }
    }
    if (body) body.setAttribute("aria-hidden", expanded ? "false" : "true");
    if (onChange) onChange(!!expanded);
    syncLbToolsPanelLayout();
    if (expanded && widget) {
      window.setTimeout(() => scrollSideControlsToWidget(widget), animate ? 420 : 0);
    }
  }

  function syncCustomDomainWidgetUi() {
    const cfg = readCustomDomainConfig();
    const domainWidgetInput = document.getElementById("lb-custom-domain");
    const domainWidgetHint = document.getElementById("lb-custom-domain-hint");
    const domainWidgetSummary = document.getElementById("lb-custom-domain-summary");
    const isLive = !!liveSiteUrl();

    setCustomDomainExpanded(cfg.enabled, { animate: false });

    if (domainWidgetInput) domainWidgetInput.value = cfg.domain;
    if (domainWidgetSummary) {
      domainWidgetSummary.textContent = cfg.domain || "Connect your own domain";
    }
    if (domainWidgetHint) {
      domainWidgetHint.textContent = !isLive
        ? "Publish your site first, then connect your domain."
        : cfg.domain
          ? "Saved. Point your DNS records to the published Vercel site."
          : "Enter the domain you want to connect.";
    }
  }

  function setCustomDomainExpanded(expanded, { animate = true } = {}) {
    setLbWidgetExpanded(
      document.getElementById("lb-custom-domain-widget"),
      document.getElementById("lb-custom-domain-body"),
      document.getElementById("lb-custom-domain-enabled"),
      expanded,
      {
        animate,
        onChange: (on) => {
          const domainWidgetSave = document.getElementById("lb-custom-domain-save");
          const isLive = !!liveSiteUrl();
          if (domainWidgetSave) domainWidgetSave.disabled = !isLive || !on;
        },
      }
    );
  }

  function readContactFormConfig() {
    const ctx = state.project?.business_context || {};
    const raw = ctx.contactForm && typeof ctx.contactForm === "object" ? ctx.contactForm : {};
    return {
      enabled: !!raw.enabled,
      mode: raw.mode === "custom" ? "custom" : "auto",
      notificationEmail: String(raw.notificationEmail || "").trim(),
      endpointUrl: String(raw.endpointUrl || "").trim(),
      endpointType: String(raw.endpointType || "").trim(),
    };
  }

  function detectContactEndpoint(url) {
    const raw = String(url || "").trim();
    if (!raw) return { type: "invalid", url: "" };
    let parsed;
    try {
      parsed = new URL(raw);
    } catch (_) {
      return { type: "invalid", url: raw };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { type: "invalid", url: raw };
    }
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    if (host.includes("formspree.io") && /\/f\/[a-z0-9]+/i.test(pathname)) {
      return { type: "formspree", url: raw };
    }
    if (
      (host.includes("discord.com") || host.includes("discordapp.com")) &&
      pathname.includes("/api/webhooks/")
    ) {
      return { type: "discord", url: raw };
    }
    if (host === "api.telegram.org" && pathname.includes("/sendmessage")) {
      const chatId = parsed.searchParams.get("chat_id");
      if (!chatId) return { type: "telegram", url: raw, needsChatId: true };
      return { type: "telegram", url: raw, chatId };
    }
    return { type: "webhook", url: raw };
  }

  function validateCustomContactEndpoint(endpointUrl) {
    const detected = detectContactEndpoint(endpointUrl);
    if (detected.type === "invalid") {
      return "Enter a valid HTTPS endpoint URL.";
    }
    if (detected.needsChatId) {
      return "Telegram links must include ?chat_id=YOUR_CHAT_ID in the URL.";
    }
    return "";
  }

  function syncContactFormWidgetUi() {
    const cfg = readContactFormConfig();
    const emailEl = document.getElementById("lb-contact-form-email");
    const endpointEl = document.getElementById("lb-contact-form-endpoint");
    const autoFields = document.getElementById("lb-contact-form-auto-fields");
    const customFields = document.getElementById("lb-contact-form-custom-fields");

    setContactFormExpanded(cfg.enabled, { animate: false });

    if (emailEl) {
      emailEl.value = cfg.notificationEmail || String(state.profile?.email || "").trim();
    }
    if (endpointEl) endpointEl.value = cfg.endpointUrl;

    document.querySelectorAll("[data-form-mode]").forEach((btn) => {
      const on = btn.getAttribute("data-form-mode") === cfg.mode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (autoFields) autoFields.hidden = cfg.mode !== "auto";
    if (customFields) customFields.hidden = cfg.mode !== "custom";
  }

  function setContactFormExpanded(expanded, { animate = true } = {}) {
    setLbWidgetExpanded(
      document.getElementById("lb-contact-form-widget"),
      document.getElementById("lb-contact-form-body"),
      document.getElementById("lb-contact-form-enabled"),
      expanded,
      { animate }
    );
  }

  function setContactFormMode(mode) {
    const next = mode === "custom" ? "custom" : "auto";
    document.querySelectorAll("[data-form-mode]").forEach((btn) => {
      const on = btn.getAttribute("data-form-mode") === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const autoFields = document.getElementById("lb-contact-form-auto-fields");
    const customFields = document.getElementById("lb-contact-form-custom-fields");
    if (autoFields) autoFields.hidden = next !== "auto";
    if (customFields) customFields.hidden = next !== "custom";
  }

  async function saveContactFormFromSettings() {
    setSiteSettingsError("");
    setSiteSettingsStatus("");
    const enabled = !!document.getElementById("lb-contact-form-enabled")?.checked;
    const modeBtn = document.querySelector("[data-form-mode].is-active");
    const mode = modeBtn?.getAttribute("data-form-mode") === "custom" ? "custom" : "auto";
    const notificationEmail = sanitizeClientText(
      document.getElementById("lb-contact-form-email")?.value || "",
      120
    );
    const endpointUrl = sanitizeClientText(
      document.getElementById("lb-contact-form-endpoint")?.value || "",
      500
    );

    if (enabled && mode === "auto") {
      if (!notificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
        setSiteSettingsError("Enter a valid notification email.");
        return;
      }
    }
    if (enabled && mode === "custom") {
      const endpointError = validateCustomContactEndpoint(endpointUrl);
      if (endpointError) {
        setSiteSettingsError(endpointError);
        return;
      }
    }

    const detected =
      mode === "custom" ? detectContactEndpoint(endpointUrl) : { type: "auto", url: "" };

    const ctx = {
      ...(state.project?.business_context || {}),
      contactForm: {
        enabled,
        mode,
        notificationEmail: mode === "auto" ? notificationEmail : "",
        endpointUrl: mode === "custom" ? endpointUrl : "",
        endpointType: mode === "custom" ? detected.type : "",
      },
    };

    if (!state.projectId) {
      state.project = { ...(state.project || {}), business_context: ctx };
      syncContactFormWidgetUi();
      setSiteSettingsStatus("Contact form settings saved locally. Publish to activate.");
      return;
    }

    try {
      await persistProjectPatch({ business_context: ctx });
      syncContactFormWidgetUi();
      syncPublishLiveUi();
      syncSiteSettingsUi();
      if (state.html && state.mode === "preview") {
        writePreviewDocument(state.html);
      }
      const live = liveSiteUrl();
      if (live) {
        setSiteSettingsStatus(
          "Contact form saved. Click Update (top bar) to apply on the live site."
        );
        window.StudioToast?.success?.("Contact form saved — click Update to apply on your live URL.");
      } else {
        setSiteSettingsStatus("Contact form settings saved. Publish to activate on the live site.");
      }
    } catch (e) {
      setSiteSettingsError(e.message || "Could not save contact form settings");
    }
  }

  function bindContactFormWidget() {
    document.getElementById("lb-contact-form-enabled")?.addEventListener("change", (e) => {
      setContactFormExpanded(!!e.target.checked);
    });
    document.querySelectorAll("[data-form-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setContactFormMode(btn.getAttribute("data-form-mode"));
      });
    });
    document.getElementById("lb-contact-form-save")?.addEventListener("click", () => {
      void saveContactFormFromSettings();
    });
  }

  function bindCustomDomainWidget() {
    document.getElementById("lb-custom-domain-enabled")?.addEventListener("change", (e) => {
      const on = !!e.target.checked;
      setCustomDomainExpanded(on);
      if (!on && readCustomDomainConfig().enabled) {
        void saveDomainFromSettings("lb-custom-domain");
      }
    });
    document.getElementById("lb-custom-domain-save")?.addEventListener("click", () => {
      void saveDomainFromSettings("lb-custom-domain");
    });
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
      setPublishEnabled();
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

  async function saveDomainFromSettings(inputId = "lb-set-domain") {
    setSiteSettingsError("");
    setSiteSettingsStatus("");
    const fromWidget = inputId === "lb-custom-domain";
    const enabled = fromWidget
      ? !!document.getElementById("lb-custom-domain-enabled")?.checked
      : true;

    if (fromWidget && !enabled) {
      const ctx = {
        ...(state.project?.business_context || {}),
        customDomain: "",
        customDomainEnabled: false,
      };
      if (!state.projectId) {
        state.project = { ...(state.project || {}), business_context: ctx };
        syncCustomDomainWidgetUi();
        syncSiteSettingsUi();
        setSiteSettingsStatus("Custom domain disabled.");
        return;
      }
      try {
        await persistProjectPatch({ business_context: ctx });
        syncSiteSettingsUi();
        setSiteSettingsStatus("Custom domain disabled.");
      } catch (e) {
        setSiteSettingsError(e.message || "Could not save domain");
      }
      return;
    }

    if (!liveSiteUrl()) {
      setSiteSettingsError("Publish your site first to connect a domain.");
      return;
    }
    const domain = sanitizeClientText(document.getElementById(inputId)?.value || "", 120)
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
      customDomainEnabled: true,
    };
    try {
      await persistProjectPatch({ business_context: ctx });
      syncSiteSettingsUi();
      setSiteSettingsStatus("Domain saved. Point DNS to your Vercel deployment next.");
      setStatus("Custom domain saved.");
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
    document.getElementById("lb-set-unpublish")?.addEventListener("click", async () => {
      setSiteSettingsError("");
      await unpublish();
      syncSiteSettingsUi();
      if (!liveSiteUrl()) setSiteSettingsStatus("Site unpublished.");
    });
    document.getElementById("lb-set-domain-save")?.addEventListener("click", () => {
      void saveDomainFromSettings("lb-set-domain");
    });
    document.getElementById("lb-set-branding-save")?.addEventListener("click", () => {
      void saveBrandingFromSettings();
    });
    document.getElementById("lb-set-contact-save")?.addEventListener("click", () => {
      void saveContactFromSettings();
    });
    bindContactFormWidget();
    bindCustomDomainWidget();
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
        ? "Hey - I put together a site for " + name + ". Take a look: " + url
        : "Hey - I can build a polished site for " + name + ". Want a quick preview?";
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
      const settings = document.getElementById("builder-site-settings");
      if (settings && !settings.hidden) {
        setSiteSettingsOpen(false);
        e.preventDefault();
      }
    });
  }

  function bindOnboard() {
    let mapsTimer = null;

    document.getElementById("onboard-cancel")?.addEventListener("click", () => {
      leaveBuilder();
    });

    document.getElementById("onboard-generate")?.addEventListener("click", () => {
      setOnboardError("");
      if (!canContinueOnboard()) {
        setOnboardError("Paste a link or fill every manual field.");
        updateOnboardContinue();
        return;
      }
      const err = validateOnboardDetails();
      if (err) {
        setOnboardError(err);
        updateOnboardContinue();
        return;
      }
      captureOnboardDetails();
      persistIntakeForEditorHandoff();
      redirectToEditor(new URLSearchParams({ from_builder: "1", auto_generate: "1" }));
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

    ["onb-name", "onb-category", "onb-phone", "onb-address", "onb-description"].forEach((id) => {
      const el = document.getElementById(id);
      el?.addEventListener("input", () => {
        syncManualFieldsExpanded();
        updateOnboardContinue();
        if (id === "onb-name") syncPreviewChromeUrl();
      });
      el?.addEventListener("focus", () => {
        syncManualFieldsExpanded();
      });
      el?.addEventListener("blur", () => {
        window.requestAnimationFrame(() => syncManualFieldsExpanded());
      });
    });

    syncManualFieldsExpanded();
    updateOnboardContinue();
  }

  function bindNavSwitch() {
    document.getElementById("lb-back-menu")?.addEventListener("click", (event) => {
      event.stopPropagation();
      leaveBuilder();
    });
    document.getElementById("lb-shell-toggle")?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (window.matchMedia("(max-width: 900px)").matches) {
        document.getElementById("ms-menu-toggle")?.click();
        return;
      }
      const hideShell = !document.body.classList.contains("ms-lb-hide-shell");
      document.body.classList.toggle("ms-lb-hide-shell", hideShell);
      try {
        localStorage.setItem(BUILDER_SHELL_NAV_KEY, hideShell ? "0" : "1");
      } catch (_) {
        /* ignore */
      }
      window.dispatchEvent(new Event("resize"));
    });
  }

  function bindFullscreenControls() {
    document.getElementById("lb-exit-fullscreen")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitFullscreen();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || state.viewport !== "fullscreen") return;
      event.preventDefault();
      exitFullscreen();
    });
  }

  function bindPaneResizer() {
    const body = document.querySelector(".ms-lb-body");
    const side = document.querySelector(".ms-lb-side");
    const resizer = document.getElementById("lb-pane-resizer");
    if (!body || !side || !resizer) return;

    const saved = Number(localStorage.getItem(BUILDER_SIDE_WIDTH_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      applyBuilderSideWidth(saved);
    } else {
      applyBuilderSideWidth(side.getBoundingClientRect().width || BUILDER_SIDE_DEFAULT);
    }

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    const onPointerMove = (event) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      const next = clampBuilderSideWidth(startWidth + delta, body.getBoundingClientRect().width);
      body.style.setProperty("--ms-lb-side-w", next + "px");
      event.preventDefault();
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("ms-lb-pane-resizing");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      const width = side.getBoundingClientRect().width;
      if (Number.isFinite(width) && width > 0) {
        localStorage.setItem(BUILDER_SIDE_WIDTH_KEY, String(Math.round(width)));
      }
    };

    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startWidth = side.getBoundingClientRect().width;
      document.body.classList.add("ms-lb-pane-resizing");
      resizer.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);
      event.preventDefault();
    });

    resizer.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const step = event.shiftKey ? 24 : 12;
      const dir = event.key === "ArrowLeft" ? -1 : 1;
      const current = side.getBoundingClientRect().width || BUILDER_SIDE_MIN;
      const next = clampBuilderSideWidth(current + dir * step, body.getBoundingClientRect().width);
      body.style.setProperty("--ms-lb-side-w", next + "px");
      localStorage.setItem(BUILDER_SIDE_WIDTH_KEY, String(next));
      event.preventDefault();
    });
  }

  function bindToolbar() {
    syncMvpAccessUi();
    document.getElementById("preview-gen-error-retry")?.addEventListener("click", () => {
      clearPreviewGenError();
      setError("");
      void generate({ fromFinder: !!state.fromFinder || hasFreshLeadIntake() });
    });
    // Capture-phase: block Code / Download before any other handler runs.
    document.addEventListener(
      "click",
      (e) => {
        const codeBtn = e.target.closest?.('.is-mode[data-mode="code"]');
        if (codeBtn) {
          if (!canAccessCodeTools()) {
            e.preventDefault();
            e.stopPropagation();
            void requirePaidPlanAsync("code");
          }
          return;
        }
        const downloadBtn = e.target.closest?.("#btn-download-html");
        if (downloadBtn) {
          if (!canAccessCodeTools()) {
            e.preventDefault();
            e.stopPropagation();
            void requirePaidPlanAsync("download");
          }
        }
      },
      true
    );
    document.querySelectorAll(".is-mode").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.dataset.mode === "code") {
          if (!(await requirePaidPlanAsync("code"))) return;
        }
        if (state.mode === "code") {
          state.html = document.getElementById("code-editor")?.value || state.html;
        } else if (state.mode === "edit") {
          flushEditHtmlToState();
          void flushEditAutosaveNow();
        }
        const next = btn.dataset.mode;
        if (next === "edit" && !(state.html && state.html.trim())) {
          setError("Generate a site first, then use Edit.");
          return;
        }
        if (next === "code" && !(state.html && state.html.trim())) {
          setError("Generate a site first, then view code.");
          return;
        }
        state.mode = next;
        updatePreview();
      });
    });
    document.querySelectorAll(".is-vp").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vp = btn.dataset.vp;
        if (vp === "fullscreen" && state.viewport === "fullscreen") {
          exitFullscreen();
          return;
        }
        if (vp !== "fullscreen" && vp === state.viewport) {
          resetViewportSize(vp);
          return;
        }
        if (state.mode === "code") {
          state.mode = "preview";
          setViewport(vp);
          updatePreview();
          return;
        }
        if (state.mode === "edit") {
          flushEditHtmlToState();
          editState.skipRewrite = true;
          setViewport(vp);
          positionEditToolbar();
          return;
        }
        setViewport(vp);
        updatePreview();
      });
    });
    const priceInput = document.getElementById("lb-price-input");
    if (priceInput) {
      const commitPriceInput = () => {
        const parsed = parsePriceInput(priceInput.value);
        if (parsed == null) {
          syncPriceUi({ syncInput: true });
          return;
        }
        setPriceCents(parsed, { persist: true, syncInput: true });
      };
      priceInput.addEventListener("input", () => {
        const parsed = parsePriceInput(priceInput.value);
        if (parsed == null) {
          syncPriceUi({ syncInput: false });
          return;
        }
        setPriceCents(parsed, { persist: false, syncInput: false });
      });
      priceInput.addEventListener("change", commitPriceInput);
      priceInput.addEventListener("blur", commitPriceInput);
      priceInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitPriceInput();
          priceInput.blur();
        }
      });
      priceInput.addEventListener("focus", () => {
        // Stop any in-flight count-up so the user can edit immediately.
        cancelPriceCountUp();
        priceInput.select();
      });
    }
    if (hasPendingProjectLoad()) {
      cancelPriceCountUp();
      const inputEl = document.getElementById("lb-price-input");
      if (inputEl && document.activeElement !== inputEl) inputEl.value = "";
    } else {
      syncPriceUi({ animate: true });
    }
    document.getElementById("code-editor")?.addEventListener("input", () => {
      if (!canAccessCodeTools()) return;
      state.html = document.getElementById("code-editor").value;
      syncPublishLiveUi();
    });
    document.getElementById("btn-download-html")?.addEventListener("click", downloadHtml);
    document.getElementById("btn-qr-code")?.addEventListener("click", () => {
      void openQrBusinessCard();
    });
    document.getElementById("btn-publish-top")?.addEventListener("click", publish);
    document.getElementById("lb-payment-policy-agree")?.addEventListener("change", () => {
      setPublishEnabled();
      const settingsPublish = document.getElementById("lb-set-publish");
      if (settingsPublish) settingsPublish.disabled = !canPublishSite();
    });
    document.getElementById("btn-redesign-top")?.addEventListener("click", () => {
      void redesignSite();
    });
    document.getElementById("btn-unpublish-top")?.addEventListener("click", unpublish);
    document.getElementById("btn-delete-top")?.addEventListener("click", () => {
      void deleteProject();
    });
    document.getElementById("lb-live-banner-close")?.addEventListener("click", () => dismissLiveBanner());
    document.getElementById("lb-offline-banner-close")?.addEventListener("click", () => dismissOfflineBanner());
  }

  function startFinderGenerateOnce() {
    if (generateBootStarted) return;
    generateBootStarted = true;
    beginFinderGenerateUi();
    void generate({ fromFinder: true });
  }

  async function bootBuilderForm() {
    bindOnboard();
    document.addEventListener("ms:credits-changed", (e) => {
      applySubscriptionFromBalance(e.detail);
    });

    const p = params();
    if (p.get("project_id") || hasFreshLeadIntake(p)) {
      redirectToEditor();
      return;
    }

    if (document.body.dataset.msAuthFired !== "1") {
      await new Promise((resolve) => {
        window.StudioBoot?.whenAuthReady?.(resolve) ?? resolve();
      });
    }

    window.addEventListener("pagehide", () => {
      if (generateAbort) return;
      clearBuilderForNextVisit();
    });

    clearBuilderForNextVisit();
    showOnboardStep(1);
    updateOnboardContinue();

    requestAnimationFrame(() => {
      clearBuilderForNextVisit();
      updateOnboardContinue();
    });
    window.setTimeout(() => {
      clearBuilderForNextVisit();
      updateOnboardContinue();
    }, 250);

    const maps = document.getElementById("onb-maps")?.value?.trim();
    if (maps && isLooseLink(maps)) void scrapeMapsLink();
    else if (isManualComplete()) updateOnboardContinue();
  }

  async function bootEditor() {
    syncBuilderShellLayout();
    bindNavSwitch();
    bindFullscreenControls();
    bindPreviewChromeActions();
    bindPreviewViewportResizer();
    bindPaneResizer();
    bindToolbar();
    bindQrBusinessCardUi();
    bindUnpublishConfirm();
    bindDeleteConfirm();
    bindRedesignConfirm();
    bindSiteSettings();
    document.addEventListener("ms:credits-changed", (e) => {
      applySubscriptionFromBalance(e.detail);
    });

    // Finder swipe: show preparing progress before any auth wait so preview is never blank.
    const projectIdEarly = params().get("project_id");
    const finderEarly = !projectIdEarly && hasFreshLeadIntake();
    if (finderEarly) {
      state.fromFinder = true;
      state.autoGeneratePending = params().get("auto_generate") !== "0";
      setBuilderPhase("workspace");
      beginFinderGenerateUi();
      intakeFromQuery();
      hydrateIntakeFromFinderUrl();
    }

    // Wait briefly for shell auth so project load / generate has a session.
    // Finder handoff uses a shorter wait - generate must start ASAP.
    if (document.body.dataset.msAuthFired !== "1") {
      await new Promise((resolve) => {
        window.StudioBoot?.whenAuthReady?.(resolve) ?? resolve();
      });
    }
    const [bootUser, profile] = await Promise.all([
      window.StudioAuth.getUser(),
      window.StudioAuth.getProfile(),
    ]);
    state.userId = bootUser?.id || "";
    state.profile = profile;
    syncBuilderOnboardedFromProfile(state.profile);
    await inferBuilderOnboardedFromProjects();
    await syncMvpFromProfile(state.profile);
    // Wipe blank editor visits on leave / bfcache restore. Never wipe while
    // opening a project_id or Finder swipe handoff (tab switches would blank the editor).
    window.addEventListener("pagehide", () => {
      // Don't wipe in-flight generation - mobile browsers fire pagehide on tab switch.
      if (generateAbort) return;
      if (state.mode === "edit" && state.projectId) {
        flushEditHtmlToState();
      }
      if (hasOpenProject() || hasFinderHandoff()) return;
      clearBuilderForNextVisit();
    });
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.mode === "edit") {
        void flushEditAutosaveNow();
      }
    });
    window.addEventListener("pageshow", (e) => {
      if (
        e.persisted &&
        !hasOpenProject() &&
        !hasFinderHandoff() &&
        !hasFreshLeadIntake() &&
        !generateAbort
      ) {
        clearBuilderForNextVisit();
        setBuilderPhase("workspace");
        updatePreview();
      }
    });
    const projectId = params().get("project_id");
    const finderHandoff = hasFreshLeadIntake();
    // URL-first: always paint the editor workspace.
    if (projectId || finderHandoff) setBuilderPhase("workspace");
    // Fresh blank visits only - never clear before Finder intake (wipes pick + flags).
    if (!projectId && !finderHandoff) clearBuilderForNextVisit();
    const fromFinder = intakeFromQuery();
    hydrateIntakeFromBuilderHandoff();
    // Finder → Editor: claim this lead so it stays hidden in Business Finder.
    if (state.fromFinder && state.leadId) {
      try {
        const key = "ms_lf_claimed_v1";
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        const map = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        const id = String(state.leadId).trim();
        if (id && !map[id]) {
          map[id] = {
            id,
            name: businessValue("businessName") || "",
            at: new Date().toISOString(),
            from: "editor",
          };
          localStorage.setItem(key, JSON.stringify(map));
        }
      } catch (_) {
        /* ignore */
      }
    }
    const skipSetup =
      !projectId &&
      state.fromFinder &&
      !!(businessValue("businessName") || state.leadId || businessValue("mapsUrl"));

    setBuilderPhase("workspace");
    if (params().get("paid") === "1" && projectId) {
      setStatus("Payment received - removing watermark…");
      const sessionId = String(params().get("session_id") || "").trim();
      if (sessionId.startsWith("cs_") && workerUrl()) {
        try {
          const res = await fetch(workerUrl() + "/fulfill-go-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Unlock failed");
          window.StudioToast?.success?.(
            data.redeployed
              ? "Payment confirmed - watermark removed and live site updated."
              : "Payment confirmed - watermark removed."
          );
        } catch (e) {
          window.StudioToast?.error?.(e.message || "Could not unlock after payment");
        }
      }
      try {
        const url = new URL(location.href);
        url.searchParams.delete("paid");
        url.searchParams.delete("session_id");
        history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch (_) {
        /* ignore */
      }
    }
    if (projectId) {
      try {
        setStatus("Loading project…");
        document.body.classList.add("ms-lb-project-loading");
        syncEmptyState();
        await loadProject(projectId);
        // Existing projects always open in the editor - even with empty HTML.
        state.onboardDone = true;
        setBuilderPhase("workspace");
        setStatus("");
        updateEmptyCopy(fromFinder);
        updatePreview();
        schedulePreviewRepaint();
        // Empty project (failed/aborted generate) - start generation instead of blank parked iframe.
        if (!(state.html && String(state.html).trim())) {
          const biz =
            businessValue("businessName") ||
            state.project?.business_name ||
            String(params().get("name") || "").trim();
          if (biz) {
            if (!businessValue("businessName")) setBusinessValue("businessName", biz);
            state.fromFinder = true;
            startFinderGenerateOnce();
          } else {
            setError("This project has no website yet. Use Builder to add business details, then generate.");
          }
        }
      } catch (e) {
        setBuilderPhase("workspace");
        state.onboardDone = false;
        setError(e.message || "Could not open project");
        window.StudioToast?.error?.(e.message || "Could not open project");
        updateEmptyCopy(false);
        updatePreview();
      } finally {
        document.body.classList.remove("ms-lb-project-loading");
        syncEmptyState();
      }
    } else if (skipSetup || finderHandoff || finderEarly || params().get("from_builder") === "1") {
      state.onboardDone = false;
      setBuilderPhase("workspace");
      const fromBuilderHandoff = params().get("from_builder") === "1";
      const shouldAutoGen =
        fromBuilderHandoff ||
        finderEarly ||
        state.autoGeneratePending ||
        params().get("auto_generate") === "1" ||
        params().get("from_finder") === "1" ||
        !!state.fromFinder ||
        !!finderHandoff;
      if (shouldAutoGen) {
        state.autoGeneratePending = false;
        if (fromBuilderHandoff) {
          if (!generateBootStarted) {
            generateBootStarted = true;
            beginFinderGenerateUi();
            void generate({ fromOnboard: true });
          }
        } else {
          state.fromFinder = true;
          startFinderGenerateOnce();
        }
      } else {
        updateEmptyCopy(!!state.fromFinder);
        updatePreview();
      }
    } else {
      state.onboardDone = false;
      setBuilderPhase("workspace");
      updateEmptyCopy(fromFinder);
      updatePreview();
    }
  }

  async function boot() {
    if (isBuilderFormPage()) return bootBuilderForm();
    return bootEditor();
  }

  boot();
})();
