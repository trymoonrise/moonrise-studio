/**
 * Floating generation announcement — standalone UI component.
 * Requires generation-lock.js (loaded automatically if missing).
 */
(function (global) {
  const ROOT_ID = "ms-gen-announce";
  const LIVE_ID = "ms-gen-announce-live";
  const CSS_HREF = "css/generation-announce.css?v=20260721-float";
  const LOCK_SRC = "js/generation-lock.js?v=20260721-one-gen";

  let mounted = false;
  let wasVisible = false;

  function ensureStyles() {
    if (document.querySelector('link[data-ms-gen-announce-css="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    link.dataset.msGenAnnounceCss = "1";
    document.head.appendChild(link);
  }

  function ensureGenerationLock() {
    if (global.MsGenerationLock) return Promise.resolve();
    if (document.querySelector('script[src*="generation-lock.js"]')) {
      return new Promise((resolve) => {
        const wait = () => {
          if (global.MsGenerationLock) resolve();
          else global.requestAnimationFrame(wait);
        };
        if (document.readyState === "complete") wait();
        else global.addEventListener("load", wait, { once: true });
      });
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = LOCK_SRC;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function isAppShellPage() {
    return !!document.getElementById("shell");
  }

  function shouldShow() {
    if (!global.MsGenerationLock?.isActive?.()) return false;
    const page = document.body?.dataset?.page || "";
    if (page === "editor") {
      const previewLoading = document.getElementById("preview-loading");
      if (previewLoading && !previewLoading.hidden) return false;
    }
    return true;
  }

  function mount() {
    if (mounted || document.getElementById(ROOT_ID)) return;
    mounted = true;
    ensureStyles();

    const root = document.createElement("aside");
    root.id = ROOT_ID;
    root.className = "ms-gen-announce";
    root.hidden = true;
    root.setAttribute("aria-label", "Website generation status");
    root.innerHTML =
      '<div class="ms-gen-announce-card">' +
      '<span class="ms-gen-announce-spinner" aria-hidden="true"></span>' +
      '<div class="ms-gen-announce-copy">' +
      "<span>Generating your website…</span>" +
      '<span class="ms-gen-announce-sub">Keep this tab open while we build it.</span>' +
      "</div>" +
      "</div>" +
      '<span class="ms-sr-only" id="' +
      LIVE_ID +
      '" aria-live="polite" aria-atomic="true"></span>';

    document.body.appendChild(root);
  }

  function setVisible(visible) {
    const root = document.getElementById(ROOT_ID);
    const live = document.getElementById(LIVE_ID);
    if (!root) return;

    root.classList.toggle("is-visible", visible);
    root.hidden = !visible;
    if (visible) root.removeAttribute("hidden");
    else root.setAttribute("hidden", "");

    if (visible && !wasVisible && live) {
      live.textContent =
        "Your website is being generated. This may take a minute. Please keep this tab open.";
    }
    if (!visible && live) live.textContent = "";
    wasVisible = visible;
  }

  function sync() {
    if (!isAppShellPage()) return;
    mount();
    setVisible(shouldShow());
  }

  function bindListeners() {
    if (bindListeners.done) return;
    bindListeners.done = true;

    document.addEventListener("ms:generation-lock-changed", sync);
    document.addEventListener("ms:shell-ready", sync);
    global.addEventListener("storage", (e) => {
      if (e.key === global.MsGenerationLock?.KEY) sync();
    });
  }

  function init() {
    if (!isAppShellPage()) return;
    void ensureGenerationLock().then(() => {
      bindListeners();
      sync();
    });
  }

  global.MsGenerationAnnounce = {
    init,
    sync,
    mount,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
