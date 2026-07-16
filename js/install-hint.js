/**
 * Install / Add to Home Screen hint — Dashboard only.
 * Ported from moonrise-website (ios-install-banner).
 */
(function () {
  if (document.body?.getAttribute("data-page") !== "dashboard") return;

  const PWA_BASE_URL = new URL("../", document.currentScript?.src || window.location.href);
  const PWA_MANIFEST_URL = new URL("manifest.json", PWA_BASE_URL).href;
  const PWA_SW_URL = new URL("sw.js", PWA_BASE_URL).href;
  const PWA_THEME_COLOR = "#0f172a";
  const PWA_BRAND_ICON = "doc/MoonriseLogo.png";
  const INSTALL_HINT_KEY = "ms_ios_install_hint_dismissed_v1";
  const PWA_APP_TITLE = "Moonrise";

  function pwaIconUrl() {
    const raw = String(window.SITE_CONFIG?.brandLogoUrl || PWA_BRAND_ICON).trim();
    try {
      return new URL(raw, PWA_BASE_URL).href;
    } catch (_) {
      return new URL(PWA_BRAND_ICON, PWA_BASE_URL).href;
    }
  }

  function pwaAddMeta(name, content) {
    if (document.querySelector('meta[name="' + name + '"]')) return;
    const m = document.createElement("meta");
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  }

  function pwaAddAppleIcon(sizes, href) {
    const sel = sizes
      ? 'link[rel="apple-touch-icon"][sizes="' + sizes + '"]'
      : 'link[rel="apple-touch-icon"]:not([sizes])';
    if (document.querySelector(sel)) return;
    const l = document.createElement("link");
    l.rel = "apple-touch-icon";
    if (sizes) l.setAttribute("sizes", sizes);
    l.href = href;
    document.head.appendChild(l);
  }

  function ensurePwaMetadata() {
    if (!document.head) return;

    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = PWA_MANIFEST_URL;
      document.head.appendChild(manifest);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement("meta");
      theme.name = "theme-color";
      theme.content = PWA_THEME_COLOR;
      document.head.appendChild(theme);
    }

    pwaAddMeta("mobile-web-app-capable", "yes");
    pwaAddMeta("apple-mobile-web-app-capable", "yes");
    pwaAddMeta("apple-mobile-web-app-status-bar-style", "default");
    pwaAddMeta("apple-mobile-web-app-title", PWA_APP_TITLE);
    pwaAddMeta("application-name", PWA_APP_TITLE);

    const brandIcon = pwaIconUrl();
    pwaAddAppleIcon("", brandIcon);
    pwaAddAppleIcon("120x120", brandIcon);
    pwaAddAppleIcon("152x152", brandIcon);
    pwaAddAppleIcon("167x167", brandIcon);
    pwaAddAppleIcon("180x180", brandIcon);

    pwaAddMeta("msapplication-TileColor", PWA_THEME_COLOR);
    pwaAddMeta("msapplication-TileImage", brandIcon);
  }

  function isIosDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return iOS || iPadOS;
  }

  function isAndroidDevice() {
    return /android/i.test(navigator.userAgent || "");
  }

  function isDesktopDevice() {
    return !isIosDevice() && !isAndroidDevice();
  }

  function isStandaloneDisplay() {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true
    );
  }

  function isInstallHintDismissed() {
    try {
      return localStorage.getItem(INSTALL_HINT_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function markInstallHintDismissed() {
    try {
      localStorage.setItem(INSTALL_HINT_KEY, "1");
    } catch (_) {
      /* ignore */
    }
  }

  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById("ios-install-banner");
    const sub = banner?.querySelector(".ios-install-banner-text span");
    if (sub) sub.innerHTML = installHintSubcopyHtml();
    if (banner && isDesktopDevice()) {
      banner.classList.add("ios-install-banner--installable");
      banner.title = "Click to install Moonrise";
    }
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    markInstallHintDismissed();
    const banner = document.getElementById("ios-install-banner");
    if (banner) dismissInstallHint(banner);
  });

  const SHARE_ICO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function installHintSubcopyHtml() {
    if (isIosDevice()) {
      return (
        'Tap <span class="ios-install-banner-share">' +
        SHARE_ICO +
        "</span> then <em>Add to Home Screen</em>"
      );
    }
    if (isDesktopDevice()) {
      return deferredInstallPrompt
        ? "<em>Click here</em> to download the app · or use your browser menu to install"
        : "Click here to download the app · or use your browser menu to install";
    }
    if (deferredInstallPrompt) {
      return "Tap <em>Install</em> from the browser menu";
    }
    return "Browser menu → <em>Install</em> / <em>Add to Home Screen</em>";
  }

  function dismissInstallHint(banner) {
    if (!banner || banner.dataset.leaving === "1") return;
    banner.dataset.leaving = "1";
    banner.classList.remove("is-visible");
    banner.classList.add("is-leaving");
    markInstallHintDismissed();
    const finish = () => {
      banner.removeEventListener("transitionend", onEnd);
      banner.remove();
    };
    const onEnd = (e) => {
      if (e.target !== banner) return;
      if (e.propertyName !== "opacity" && e.propertyName !== "transform") return;
      finish();
    };
    banner.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 420);
  }

  function maybeShowInstallHint() {
    if (document.body?.getAttribute("data-page") !== "dashboard") return;
    if (isStandaloneDisplay()) return;
    if (isInstallHintDismissed()) return;
    if (!document.body) return;
    if (document.getElementById("ios-install-banner")) return;

    const banner = document.createElement("div");
    banner.id = "ios-install-banner";
    banner.className = "ios-install-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Install " + PWA_APP_TITLE);
    banner.innerHTML =
      '<img class="ios-install-banner-icon" src="' +
      pwaIconUrl() +
      '" alt="" width="40" height="40" decoding="async" loading="eager">' +
      '<div class="ios-install-banner-text">' +
      "<strong>Install Moonrise</strong>" +
      "<span>" +
      installHintSubcopyHtml() +
      "</span>" +
      "</div>" +
      '<button type="button" class="ios-install-banner-close" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(banner);
    if (deferredInstallPrompt && isDesktopDevice()) {
      banner.classList.add("ios-install-banner--installable");
      banner.title = "Click to install Moonrise";
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add("is-visible"));
    });

    banner.querySelector(".ios-install-banner-close")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismissInstallHint(banner);
    });

    banner.addEventListener("click", async (e) => {
      if (e.target.closest(".ios-install-banner-close")) return;
      if (!deferredInstallPrompt) return;
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        if (choice?.outcome === "accepted") dismissInstallHint(banner);
      } catch (_) {
        /* ignore */
      }
    });
  }

  function canRegisterServiceWorker() {
    const host = window.location.hostname;
    return (
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" ||
        host === "localhost" ||
        host === "127.0.0.1")
    );
  }

  function registerPwaServiceWorker() {
    if (!canRegisterServiceWorker()) return;
    navigator.serviceWorker
      .register(PWA_SW_URL, { updateViaCache: "none" })
      .then((reg) => {
        try {
          reg.update?.();
        } catch (_) {
          /* ignore */
        }
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  }

  ensurePwaMetadata();
  if (document.readyState === "loading") {
    window.addEventListener("load", registerPwaServiceWorker, { once: true });
    document.addEventListener("DOMContentLoaded", maybeShowInstallHint, { once: true });
  } else {
    registerPwaServiceWorker();
    maybeShowInstallHint();
  }
})();
