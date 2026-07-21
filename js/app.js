/**
 * Moonrise Studio shell - SiteDrop-style sidebar layout.
 */
(function (global) {
  const MENU = [
    { id: "dashboard", href: "dashboard.html", label: "Dashboard", icon: "grid" },
    { id: "leads", href: "leads.html", label: "Business Finder", icon: "search" },
    { id: "builder", href: "builder.html", label: "Builder", icon: "hammer" },
    { id: "clients", href: "clients.html", label: "My Clients", icon: "users" },
    { id: "donate", href: "donate.html", label: "Donate", icon: "heart" },
    { id: "store", href: "store.html", label: "Store", icon: "bag" },
  ];

  const OWNER_MENU = [
    {
      id: "pending-payouts",
      href: "pending-payouts.html",
      label: "Pending payouts",
      icon: "dollar",
      ownerOnly: true,
    },
  ];

  const ACCOUNT = [
    { id: "settings", href: "settings.html", label: "Settings", icon: "gear" },
    { id: "course", href: "course.html", label: "Course", icon: "grad" },
    { id: "help", href: "help.html", label: "Help", icon: "help" },
    {
      id: "telegram",
      href: (window.SITE_CONFIG && window.SITE_CONFIG.telegramUrl) || "https://t.me/c/3541685239/1",
      label: "Telegram",
      icon: "telegram",
      external: true,
    },
    {
      id: "discord",
      href: (window.SITE_CONFIG && window.SITE_CONFIG.discordUrl) || "https://discord.gg/yFJajbBNj",
      label: "Discord",
      icon: "discord",
      external: true,
    },
  ];

  const ICONS = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
    hammer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12l-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="m20.91 11.73-4.24-4.24"/><path d="m14.5 7.5 3.5-3.5a2.12 2.12 0 0 1 3 3L17.5 10.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    grad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 4.3 3.7 11.1c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.4.8 1 .8.5 0 .8-.2 1.1-.5l2.7-2.6 4.5 3.3c.8.5 1.4.2 1.6-.8L23 5.5c.3-1.2-.5-1.8-1.5-1.2zM9.4 14.5l9.7-6.1c.5-.3.9 0 .5.3l-7.9 7.1-.3 3.2-2-4.5z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.2 6.3L19 10l-5.8 1.7L12 18l-1.2-6.3L5 10l5.8-1.7L12 2z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  };

  const OWNER_NAV_KEY = "ms_owner_nav_v1";

  function ownerHandles() {
    return (window.SITE_CONFIG?.ownerHandles || ["moonrise"]).map((h) =>
      String(h || "")
        .replace(/^@/, "")
        .trim()
        .toLowerCase()
    );
  }

  function normalizeHandle(raw) {
    return String(raw || "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
  }

  function readOwnerNavCache() {
    try {
      const raw = localStorage.getItem(OWNER_NAV_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.owner) return false;
      // Stale after 30 days - re-check via auth
      if (data.at && Date.now() - Number(data.at) > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
      const allowed = ownerHandles();
      if (data.handle && allowed.includes(normalizeHandle(data.handle))) return true;
      // Owner flag without handle still trusted for first paint; verified after auth
      return !!data.owner;
    } catch (_) {
      return false;
    }
  }

  /** Sync peek at persisted auth so owner nav can paint without a flash. */
  function syncOwnerFromAuthStorage() {
    try {
      const raw = localStorage.getItem("moonrise-studio-auth");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
      const handle = normalizeHandle(
        user?.user_metadata?.handle || user?.user_metadata?.username || ""
      );
      if (handle && ownerHandles().includes(handle)) return true;
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function shouldIncludeOwnerNav() {
    return readOwnerNavCache() || syncOwnerFromAuthStorage();
  }

  function writeOwnerNavCache(isOwner, handle) {
    try {
      if (!isOwner) {
        localStorage.removeItem(OWNER_NAV_KEY);
        return;
      }
      localStorage.setItem(
        OWNER_NAV_KEY,
        JSON.stringify({
          owner: true,
          handle: normalizeHandle(handle),
          at: Date.now(),
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  async function isSiteOwner(handleHint) {
    const allowed = ownerHandles();
    if (handleHint && allowed.includes(normalizeHandle(handleHint))) return true;
    try {
      const profile = await window.StudioAuth?.getProfile?.();
      if (profile?.handle && allowed.includes(normalizeHandle(profile.handle))) {
        return true;
      }
      const user = await window.StudioAuth?.getUser?.();
      const meta = normalizeHandle(user?.user_metadata?.handle || "");
      if (meta && allowed.includes(meta)) return true;
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function gateOwnerPage(fallback) {
    return isSiteOwner().then((ok) => {
      if (ok) return true;
      window.location.replace(fallback || "dashboard.html");
      return false;
    });
  }

  window.StudioOwner = { isSiteOwner, gateOwnerPage, ownerHandles };

  function menuItems() {
    const items = MENU.slice();
    if (shouldIncludeOwnerNav()) {
      items.push(...OWNER_MENU);
    }
    return items;
  }

  function injectOwnerNav(page) {
    if (!shouldIncludeOwnerNav()) return;
    if (document.querySelector('[data-nav="pending-payouts"]')) return;
    const nav = document.querySelector(".ms-sidebar-scroll .ms-nav-group nav.ms-nav");
    if (!nav) return;
    OWNER_MENU.forEach((item) => {
      nav.insertAdjacentHTML("beforeend", navLink(item, page || document.body?.dataset?.page || ""));
    });
  }

  function brandLogo() {
    const c = window.SITE_CONFIG || {};
    return (
      c.brandLogoUrl ||
      "doc/MoonriseLogo.png"
    );
  }

  function defaultAvatarUrl() {
    const c = window.SITE_CONFIG || {};
    return (
      c.defaultAvatarUrl ||
      "doc/pfp.png"
    );
  }

  function isCustomAvatarUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return false;
    return raw !== defaultAvatarUrl();
  }

  function resolveAvatarUrl(url) {
    const raw = String(url || "").trim();
    return raw || defaultAvatarUrl();
  }

  function companyName() {
    return (window.SITE_CONFIG && window.SITE_CONFIG.companyName) || "Moonrise Studio";
  }

  function navLink(item, page) {
    if (item.soon) {
      return (
        '<span class="ms-nav-link is-soon" data-nav="' +
        item.id +
        '" aria-disabled="true">' +
        '<span class="ms-nav-ico" aria-hidden="true">' +
        (ICONS[item.icon] || "") +
        "</span>" +
        '<span class="ms-nav-label"><s>' +
        item.label +
        "</s></span>" +
        '<span class="ms-nav-soon">Soon!</span>' +
        "</span>"
      );
    }

    const active = !item.external && page === item.id ? " is-active" : "";
    const externalAttrs = item.external
      ? ' data-external-redirect="true" data-external-url="' +
        String(item.href || "").replace(/"/g, "&quot;") +
        '" data-external-label="' +
        String(item.label || "external site").replace(/"/g, "&quot;") +
        '"'
      : "";
    const href = item.external ? "#" : item.href;
    const externalMark = item.external
      ? '<span class="ms-nav-external" aria-hidden="true" title="Opens externally">' +
        ICONS.external +
        "</span>"
      : "";
    const cancelMark =
      item.id === "builder"
        ? '<button type="button" class="ms-nav-cancel" data-nav-cancel="' +
          item.id +
          '" hidden aria-label="Cancel website generation" title="Cancel generation">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
          "</button>"
        : "";
    return (
      '<a class="ms-nav-link' +
      (item.external ? " is-external" : "") +
      active +
      '" href="' +
      href +
      '" data-nav="' +
      item.id +
      '"' +
      externalAttrs +
      ">" +
      '<span class="ms-nav-ico" aria-hidden="true">' +
      (ICONS[item.icon] || "") +
      "</span>" +
      '<span class="ms-nav-label">' +
      item.label +
      "</span>" +
      externalMark +
      cancelMark +
      '<span class="ms-nav-progress" aria-hidden="true"></span>' +
      "</a>"
    );
  }

  /** Live-only flag - never restore from storage (stale markers looked like "still generating"). */
  let channelGeneratingId = null;
  let channelGeneratingCancellable = false;

  function applyChannelGenerating() {
    const id = channelGeneratingId;
    document.querySelectorAll(".ms-nav-link[data-nav]").forEach((el) => {
      const on = !!id && el.getAttribute("data-nav") === id;
      el.classList.toggle("is-generating", on);
      const cancelBtn = el.querySelector("[data-nav-cancel]");
      if (cancelBtn) {
        cancelBtn.hidden = !(
          on &&
          channelGeneratingCancellable &&
          (el.getAttribute("data-nav") === "builder")
        );
      }
      if (on) {
        el.setAttribute("aria-busy", "true");
        el.setAttribute(
          "title",
          channelGeneratingCancellable ? "Generating website…" : "Looking up business…"
        );
      } else {
        el.removeAttribute("aria-busy");
        const title = el.getAttribute("title");
        if (title === "Generating website…" || title === "Looking up business…") {
          el.removeAttribute("title");
        }
      }
    });
  }

  function setChannelGenerating(navId, busy, opts) {
    channelGeneratingId = busy && navId ? String(navId) : null;
    // /generate keeps cancel; Maps lookup passes { cancellable: false }.
    channelGeneratingCancellable = !!(channelGeneratingId && opts?.cancellable !== false);
    // Clear any legacy session marker from older builds
    try {
      sessionStorage.removeItem("ms_channel_generating");
    } catch {
      /* ignore */
    }
    applyChannelGenerating();
  }

  function cancelChannelGenerating() {
    const nav = channelGeneratingId || "builder";
    setChannelGenerating(null, false);
    document.dispatchEvent(new CustomEvent("ms:cancel-generation", { detail: { nav } }));
  }

  function bindNavCancel() {
    document.getElementById("ms-sidebar")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-nav-cancel]");
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      cancelChannelGenerating();
      window.StudioToast?.success?.("Generation canceled.");
    });
  }

  window.StudioShell = Object.assign(window.StudioShell || {}, {
    setChannelGenerating,
    applyChannelGenerating,
    cancelChannelGenerating,
  });

  function navSection(label, icon) {
    return (
      '<p class="ms-nav-section">' +
      '<span class="ms-nav-section-ico" aria-hidden="true">' +
      (ICONS[icon] || "") +
      "</span>" +
      '<span class="ms-nav-section-label">' +
      label +
      "</span></p>"
    );
  }

  function navGroup(label, icon, itemsHtml, ariaLabel) {
    return (
      '<div class="ms-nav-group">' +
      navSection(label, icon) +
      '<nav class="ms-nav" aria-label="' +
      ariaLabel +
      '">' +
      itemsHtml +
      "</nav></div>"
    );
  }

  const SIDEBAR_LEGAL = [
    { id: "guide", href: "guide.html", label: "Guide" },
    { id: "privacy", href: "privacy.html", label: "Privacy" },
    { id: "terms", href: "terms.html", label: "Terms" },
  ];

  function sidebarLegal(page) {
    const links = SIDEBAR_LEGAL.map((item) => {
      const active = page === item.id ? " is-active" : "";
      return (
        '<a class="ms-sidebar-legal-link' +
        active +
        '" href="' +
        item.href +
        '">' +
        item.label +
        "</a>"
      );
    });
    return (
      '<nav class="ms-sidebar-legal" aria-label="Help and legal">' +
      links.join('<span class="ms-sidebar-legal-sep" aria-hidden="true">•</span>') +
      "</nav>"
    );
  }

  function initialFrom(text) {
    const s = String(text || "M").trim();
    return (s.charAt(0) || "M").toUpperCase();
  }

  function stripHardRefreshParam() {
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has("_ms_r")) return;
      url.searchParams.delete("_ms_r");
      const next = url.pathname + url.search + url.hash;
      history.replaceState({}, "", next);
    } catch (_) {
      /* ignore */
    }
  }

  function hardRefreshSite() {
    const btn = document.getElementById("ms-hard-refresh");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-spinning");
    }
    const reload = () => {
      try {
        const url = new URL(location.href);
        url.searchParams.set("_ms_r", String(Date.now()));
        location.replace(url.pathname + url.search + url.hash);
      } catch (_) {
        location.reload();
      }
    };
    const jobs = [];
    try {
      if ("serviceWorker" in navigator) {
        jobs.push(
          navigator.serviceWorker.getRegistrations().then((regs) =>
            Promise.all(regs.map((reg) => reg.unregister()))
          )
        );
      }
      if ("caches" in window) {
        jobs.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
      }
    } catch (_) {
      /* ignore */
    }
    Promise.allSettled(jobs).then(reload, reload);
  }

  /** Fixed top-right hard refresh - all Studio pages / phones / tablets / desktop. */
  function ensureHardRefreshButton() {
    stripHardRefreshParam();
    if (!document.body) return;
    let btn = document.getElementById("ms-hard-refresh");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "ms-hard-refresh";
      btn.className = "ms-hard-refresh";
      btn.setAttribute("aria-label", "Hard refresh");
      btn.title = "Hard refresh";
      btn.innerHTML = ICONS.refresh;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        hardRefreshSite();
      });
      document.body.appendChild(btn);
    } else if (btn.parentElement !== document.body) {
      document.body.appendChild(btn);
    }
  }

  function buildShell(opts) {
    const page = document.body?.dataset?.page || "";
    if (page === "index" || page === "home" || page === "login" || page === "apply" || page === "orders") return;

    const shell = document.getElementById("shell");
    if (!shell) return;

    const menuHtml = menuItems()
      .map((item) => navLink(item, page))
      .join("");
    const accountHtml = ACCOUNT.map((item) => navLink(item, page)).join("");
    const bootProfile = readProfileCache();
    const bootAuth = peekAuthUser();
    const bootHandle = String(bootProfile?.handle || bootAuth?.handle || "")
      .replace(/^@/, "")
      .trim();
    const bootAvatar = resolveAvatarUrl(bootProfile?.avatarUrl || cachedAvatarUrl() || "");
    const bootIncome = readIncomeCache();
    const bootIncomeLabel =
      bootIncome != null
        ? global.StudioIncome?.formatIncome?.(bootIncome) ??
          "$" +
            Number(bootIncome).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
        : "$0.00";
    const avatarBusy =
      !bootAvatar || bootAvatar === defaultAvatarUrl() ? " is-loading" : " has-photo";

    shell.innerHTML =
      '<aside class="ms-sidebar" id="ms-sidebar">' +
      '<div class="ms-brand">' +
      '<img class="ms-brand-logo" src="' +
      brandLogo() +
      '" alt="" loading="eager" decoding="async">' +
      '<div class="ms-brand-copy">' +
      '<strong class="ms-brand-name">' +
      companyName() +
      "</strong>" +
      "</div></div>" +
      '<div class="ms-sidebar-scroll">' +
      navGroup("Workspace", "layers", menuHtml, "Main") +
      navGroup("Account", "user", accountHtml, "Account") +
      "</div>" +
      '<a class="ms-credits-tag ms-income-tag" id="ms-user-income" href="dashboard.html" title="View income on Dashboard">' +
      '<span class="ms-credits-tag-label">Income</span>' +
      '<strong class="ms-credits-tag-value" id="ms-user-income-value">' +
      bootIncomeLabel +
      "</strong>" +
      "</a>" +
      sidebarLegal(page) +
      '<div class="ms-sidebar-foot">' +
      '<div class="ms-user-row">' +
      '<a class="ms-user-profile" href="settings.html" aria-label="Open settings">' +
      '<div class="ms-user-avatar-wrap">' +
      '<div class="ms-user-avatar' +
      avatarBusy +
      '" id="ms-user-avatar" aria-hidden="true">' +
      '<span class="ms-user-avatar-spin" id="ms-user-avatar-spin" aria-hidden="true"></span>' +
      '<span id="ms-user-avatar-initial" hidden>M</span>' +
      '<img id="ms-user-avatar-img" src="' +
      bootAvatar +
      '" alt="" width="38" height="38" decoding="async" fetchpriority="high">' +
      "</div>" +
      '<span class="ms-user-status" title="Online" aria-hidden="true"></span>' +
      "</div>" +
      '<div class="ms-user-meta">' +
      '<strong class="ms-user-name" id="ms-user-name">' +
      (bootHandle || "") +
      "</strong>" +
      "</div>" +
      "</a>" +
      '<button type="button" class="ms-user-logout" id="ms-signout" aria-label="Sign out">' +
      ICONS.logout +
      "</button>" +
      "</div>" +
      '</div></aside>' +
      '<div class="ms-sidebar-resizer" id="ms-sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" tabindex="0"></div>' +
      '<button type="button" class="ms-menu-toggle" id="ms-menu-toggle" aria-label="Open menu">☰</button>';

    document.getElementById("ms-signout")?.addEventListener("click", async () => {
      await window.StudioAuth?.signOut?.();
      location.href = "index.html";
    });

    const sidebar = document.getElementById("ms-sidebar");
    const menuToggle = document.getElementById("ms-menu-toggle");

    function setNavOpen(open) {
      document.body.classList.toggle("ms-nav-open", open);
      menuToggle?.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.addEventListener("click", () => {
      setNavOpen(!document.body.classList.contains("ms-nav-open"));
    });

    document.addEventListener("click", (event) => {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
      if (!document.body.classList.contains("ms-nav-open")) return;
      if (sidebar?.contains(event.target) || menuToggle?.contains(event.target)) return;
      setNavOpen(false);
    });

    sidebar?.addEventListener("click", (event) => {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
      const link = event.target.closest?.("a[href]");
      if (link?.dataset.externalRedirect === "true") {
        event.preventDefault();
        setNavOpen(false);
        openRedirectConfirm(
          link.getAttribute("data-external-url") || telegramUrl(),
          link.getAttribute("data-external-label") || "Telegram"
        );
        return;
      }
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      event.preventDefault();
      setNavOpen(false);
      window.setTimeout(() => {
        location.href = href;
      }, 280);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !document.body.classList.contains("ms-nav-open")) return;
      setNavOpen(false);
      menuToggle?.focus();
    });

    paintSidebarFromCache();

    bindExternalRedirects();
    initSidebarResize();
  }

  const TELEGRAM_LOGO =
    '<svg class="ms-telegram-logo" viewBox="0 0 240 240" aria-hidden="true" focusable="false">' +
    '<circle cx="120" cy="120" r="120" fill="#2AABEE"/>' +
    '<path fill="#FFF" d="M54.6 117.4c35.5-15.5 59.2-25.7 71-30.7 33.6-14 40.6-16.4 45.1-16.5 1 0 3.2.2 4.7 1.4 1.2 1 1.6 2.3 1.7 3.3.2 1 .4 3.3.2 5.1-1.9 20.1-10.1 68.9-14.3 91.4-1.8 9.5-5.3 12.7-8.7 13-7.4.6-13-4.9-20.2-9.6-11.2-7.3-17.5-11.9-28.4-19.1-12.6-8.3-4.4-12.8 2.8-20.3 1.9-1.9 34.4-31.5 35-33.4.1-.2.1-1.1-.4-1.5-.5-.4-1.2-.3-1.7-.2-.7.2-12.2 7.8-34.5 22.8-3.3 2.2-6.2 3.3-8.9 3.3-2.9 0-8.6-1.7-12.8-3.1-5.1-1.7-9.2-2.6-8.8-5.5.2-1.5 2.2-3.1 6.1-4.8z"/>' +
    "</svg>";

  const DISCORD_LOGO =
    '<svg class="ms-discord-logo" viewBox="0 0 240 240" aria-hidden="true" focusable="false">' +
    '<circle cx="120" cy="120" r="120" fill="#5865F2"/>' +
    '<g transform="translate(52.5 66) scale(1.06)">' +
    '<path fill="#FFF" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.5 0A72.37 72.37 0 0 0 45.25 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.92-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.45-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"/>' +
    "</g></svg>";

  function telegramUrl() {
    return (
      (window.SITE_CONFIG && window.SITE_CONFIG.telegramUrl) ||
      "https://t.me/c/3541685239/1"
    );
  }

  function discordUrl() {
    return (
      (window.SITE_CONFIG && window.SITE_CONFIG.discordUrl) ||
      "https://discord.gg/yFJajbBNj"
    );
  }

  function ensureRedirectModal() {
    let el = document.getElementById("ms-redirect-modal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "ms-redirect-modal";
    el.className = "ms-redirect";
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="ms-redirect-card" role="dialog" aria-modal="true" aria-labelledby="ms-redirect-title">' +
      '<header class="ms-redirect-head">' +
      '<div class="ms-redirect-icon ms-redirect-icon--telegram" id="ms-redirect-icon" aria-hidden="true">' +
      TELEGRAM_LOGO +
      "</div>" +
      '<h2 id="ms-redirect-title">Open Telegram?</h2>' +
      '<p class="ms-redirect-copy">You’re about to open <strong>Telegram</strong> in a new tab. You’ll leave Moonrise Studio temporarily.</p>' +
      "</header>" +
      '<footer class="ms-redirect-actions">' +
      '<button type="button" class="ms-redirect-cancel" id="ms-redirect-cancel">Stay here</button>' +
      '<button type="button" class="ms-btn ms-redirect-go" id="ms-redirect-go">Continue to Telegram</button>' +
      "</footer>" +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  let pendingRedirectUrl = "";
  let redirectBound = false;

  function setRedirectOpen(open) {
    const el = ensureRedirectModal();
    el.hidden = !open;
    el.classList.toggle("is-open", open);
    el.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("ms-redirect-open", open);
    if (open) {
      document.getElementById("ms-redirect-go")?.focus();
    } else {
      pendingRedirectUrl = "";
    }
  }

  function openRedirectConfirm(url, label) {
    ensureRedirectModal();
    const name = String(label || "Telegram").trim() || "Telegram";
    const isDiscord = /discord/i.test(name) || /discord\.gg/i.test(String(url || ""));
    pendingRedirectUrl =
      String(url || "").trim() || (isDiscord ? discordUrl() : telegramUrl());
    const title = document.getElementById("ms-redirect-title");
    const copy = document.querySelector("#ms-redirect-modal .ms-redirect-copy");
    const goBtn = document.getElementById("ms-redirect-go");
    const icon = document.getElementById("ms-redirect-icon");
    if (icon) {
      icon.className =
        "ms-redirect-icon " + (isDiscord ? "ms-redirect-icon--discord" : "ms-redirect-icon--telegram");
      icon.innerHTML = isDiscord ? DISCORD_LOGO : TELEGRAM_LOGO;
    }
    if (title) title.textContent = "Open " + name + "?";
    if (copy) {
      copy.innerHTML =
        "You’re about to open <strong>" +
        name.replace(/</g, "&lt;") +
        "</strong> in a new tab. You’ll leave Moonrise Studio temporarily.";
    }
    if (goBtn) goBtn.textContent = "Continue to " + name;
    setRedirectOpen(true);
  }

  function bindExternalRedirects() {
    ensureRedirectModal();
    if (redirectBound) return;
    redirectBound = true;

    document.addEventListener("click", (e) => {
      const link = e.target.closest?.("[data-external-redirect]");
      if (!link) return;
      e.preventDefault();
      const url = link.getAttribute("data-external-url") || telegramUrl();
      const label = link.getAttribute("data-external-label") || "Telegram";
      openRedirectConfirm(url, label);
    });

    document.getElementById("ms-redirect-cancel")?.addEventListener("click", () => {
      setRedirectOpen(false);
    });

    document.getElementById("ms-redirect-go")?.addEventListener("click", () => {
      const url = pendingRedirectUrl || telegramUrl();
      setRedirectOpen(false);
      window.open(url, "_blank", "noopener,noreferrer");
    });

    document.getElementById("ms-redirect-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "ms-redirect-modal") setRedirectOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const el = document.getElementById("ms-redirect-modal");
      if (el && !el.hidden) setRedirectOpen(false);
    });
  }

  const SIDEBAR_KEY = "ms-sidebar-w";
  const SIDEBAR_MIN = 220;
  const SIDEBAR_MAX = 420;
  const SIDEBAR_DEFAULT = 268;

  function clampSidebar(w) {
    const n = Math.round(Number(w) || SIDEBAR_DEFAULT);
    return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, n));
  }

  function applySidebarWidth(px) {
    const w = clampSidebar(px);
    document.documentElement.style.setProperty("--ms-sidebar-w", w + "px");
    const resizer = document.getElementById("ms-sidebar-resizer");
    if (resizer) {
      resizer.setAttribute("aria-valuenow", String(w));
      resizer.setAttribute("aria-valuemin", String(SIDEBAR_MIN));
      resizer.setAttribute("aria-valuemax", String(SIDEBAR_MAX));
    }
    return w;
  }

  function isMobileShell() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function syncSidebarForViewport() {
    if (isMobileShell()) {
      document.documentElement.style.setProperty("--ms-sidebar-w", "0px");
      document.documentElement.style.setProperty("--ms-content-scale", "1");
      return;
    }
    document.documentElement.style.removeProperty("--ms-content-scale");
    loadSidebarWidth();
  }

  function loadSidebarWidth() {
    if (isMobileShell()) {
      document.documentElement.style.setProperty("--ms-sidebar-w", "0px");
      return 0;
    }
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved) return applySidebarWidth(saved);
    } catch (e) {
      /* ignore */
    }
    return applySidebarWidth(SIDEBAR_DEFAULT);
  }

  function saveSidebarWidth(px) {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(clampSidebar(px)));
    } catch (e) {
      /* ignore */
    }
  }

  function initSidebarResize() {
    const resizer = document.getElementById("ms-sidebar-resizer");
    syncSidebarForViewport();
    window.addEventListener("resize", syncSidebarForViewport);
    if (!resizer) return;

    let dragging = false;
    let startX = 0;
    let startW = SIDEBAR_DEFAULT;

    function onMove(clientX) {
      const next = startW + (clientX - startX);
      applySidebarWidth(next);
    }

    function stopDrag() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("ms-sidebar-resizing");
      const current = getComputedStyle(document.documentElement)
        .getPropertyValue("--ms-sidebar-w")
        .trim();
      saveSidebarWidth(parseFloat(current) || SIDEBAR_DEFAULT);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      onMove(e.clientX);
    }

    function onPointerUp() {
      stopDrag();
    }

    resizer.addEventListener("pointerdown", (e) => {
      if (isMobileShell()) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startW =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--ms-sidebar-w")
        ) || SIDEBAR_DEFAULT;
      document.body.classList.add("ms-sidebar-resizing");
      resizer.setPointerCapture?.(e.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    });

    resizer.addEventListener("keydown", (e) => {
      if (isMobileShell()) return;
      const step = e.shiftKey ? 24 : 12;
      const current =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--ms-sidebar-w")
        ) || SIDEBAR_DEFAULT;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        saveSidebarWidth(applySidebarWidth(current - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        saveSidebarWidth(applySidebarWidth(current + step));
      } else if (e.key === "Home") {
        e.preventDefault();
        saveSidebarWidth(applySidebarWidth(SIDEBAR_MIN));
      } else if (e.key === "End") {
        e.preventDefault();
        saveSidebarWidth(applySidebarWidth(SIDEBAR_MAX));
      }
    });

    resizer.addEventListener("dblclick", () => {
      if (isMobileShell()) return;
      saveSidebarWidth(applySidebarWidth(SIDEBAR_DEFAULT));
    });
  }

  const AVATAR_CACHE_KEY = "ms_avatar_url_v1";
  const PROFILE_CACHE_KEY = "ms_sidebar_profile_v1";
  const INCOME_CACHE_KEY = "ms_sidebar_income_v1";

  function readProfileCache() {
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch (_) {
      return null;
    }
  }

  function rememberProfileCache(handle, avatarUrl, extras) {
    try {
      const clean = String(handle || "")
        .replace(/^@/, "")
        .trim();
      if (!clean) return;
      sessionStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({
          handle: clean,
          avatarUrl: String(avatarUrl || "").trim(),
          mvpPlus: !!(extras && extras.mvpPlus),
          at: Date.now(),
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function clearLegacyProfileCosmetics() {
    document.querySelectorAll(".ms-user-hat, .set-avatar-hat").forEach((el) => el.remove());
    const nameEl = document.getElementById("ms-user-name");
    if (nameEl) nameEl.style.removeProperty("color");
  }

  function readIncomeCache() {
    try {
      const raw = sessionStorage.getItem(INCOME_CACHE_KEY);
      if (raw == null) return null;
      const data = JSON.parse(raw);
      if (data && typeof data === "object" && data.income != null) {
        return Number(data.income) || 0;
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch (_) {
      return null;
    }
  }

  function rememberIncomeCache(income) {
    try {
      sessionStorage.setItem(
        INCOME_CACHE_KEY,
        JSON.stringify({ income: Number(income) || 0, at: Date.now() })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function peekAuthUser() {
    try {
      const cached = readProfileCache();
      if (cached?.handle) {
        return {
          handle: String(cached.handle).replace(/^@/, "").trim(),
          avatarUrl: String(cached.avatarUrl || "").trim(),
        };
      }
      const raw = localStorage.getItem("moonrise-studio-auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
      if (!user) return null;
      const handle = String(
        user.user_metadata?.handle || user.user_metadata?.username || user.email?.split("@")[0] || ""
      )
        .replace(/^@/, "")
        .trim();
      if (!handle) return null;
      return { handle, avatarUrl: "" };
    } catch (_) {
      return null;
    }
  }

  function paintSidebarFromCache() {
    const cached = readProfileCache();
    const auth = peekAuthUser();
    const handle = String(cached?.handle || auth?.handle || "")
      .replace(/^@/, "")
      .trim();
    const nameEl = document.getElementById("ms-user-name");
    if (nameEl && handle) nameEl.textContent = handle;

    const avatar = cached?.avatarUrl || cachedAvatarUrl() || auth?.avatarUrl || "";
    setSidebarAvatar(avatar, handle || "M");

    const income = readIncomeCache();
    if (income != null) setSidebarIncome(income);
    clearLegacyProfileCosmetics();
  }

  function cachedAvatarUrl() {
    try {
      return String(sessionStorage.getItem(AVATAR_CACHE_KEY) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function rememberAvatarUrl(url) {
    try {
      const v = String(url || "").trim();
      if (!isCustomAvatarUrl(v)) {
        sessionStorage.removeItem(AVATAR_CACHE_KEY);
        return;
      }
      sessionStorage.setItem(AVATAR_CACHE_KEY, v);
    } catch (_) {
      /* ignore */
    }
  }

  function setSidebarAvatar(url, handle) {
    const initialEl = document.getElementById("ms-user-avatar-initial");
    const imgEl = document.getElementById("ms-user-avatar-img");
    const avatarEl = document.getElementById("ms-user-avatar");
    if (!avatarEl) return;
    window.clearTimeout(avatarEl._msRevealTimer);
    avatarEl.classList.remove("is-avatar-ready");

    const initial = initialFrom(handle);
    if (initialEl) {
      initialEl.textContent = initial;
      initialEl.hidden = true;
    }

    const resolved = resolveAvatarUrl(url);
    rememberAvatarUrl(url);

    if (!imgEl) return;

    const markLoaded = () => {
      avatarEl.classList.remove("is-loading");
      avatarEl.classList.add("has-photo", "is-avatar-ready");
      imgEl.hidden = false;
      if (initialEl) initialEl.hidden = true;
      avatarEl._msRevealTimer = window.setTimeout(() => {
        avatarEl.classList.remove("is-avatar-ready");
      }, 650);
    };

    const markError = () => {
      avatarEl.classList.remove("is-loading", "has-photo");
      imgEl.hidden = true;
      if (initialEl) initialEl.hidden = false;
    };

    imgEl.hidden = false;
    imgEl.alt = "";
    imgEl.decoding = "async";
    imgEl.setAttribute("fetchpriority", "high");

    // Already showing this exact image (cached) - no spinner flash
    if (imgEl.getAttribute("src") === resolved && imgEl.complete && imgEl.naturalWidth > 0) {
      markLoaded();
      return;
    }

    avatarEl.classList.add("is-loading", "has-photo");

    let settled = false;
    const finish = async (ok) => {
      if (settled) return;
      settled = true;
      imgEl.onload = null;
      imgEl.onerror = null;
      if (!ok) {
        markError();
        return;
      }
      try {
        await imgEl.decode?.();
      } catch (_) {
        /* load event is enough when decode() is unavailable or rejects */
      }
      markLoaded();
    };

    imgEl.onload = () => finish(true);
    imgEl.onerror = () => {
      // Fall back to default local avatar once
      if (resolved !== defaultAvatarUrl() && imgEl.getAttribute("src") !== defaultAvatarUrl()) {
        settled = false;
        imgEl.src = defaultAvatarUrl();
        return;
      }
      finish(false);
    };

    imgEl.src = resolved;

    // Cached by browser and already decoded
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      finish(true);
    }
  }

  async function fetchCreditBalanceDetailed() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { error: "offline" };
    }
    try {
      const session = await window.StudioAuth?.getSession?.();
      if (!session?.access_token) {
        return { error: "auth" };
      }
      const base =
        typeof window.resolveWorkerUrl === "function"
          ? window.resolveWorkerUrl()
          : String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
      if (!base) {
        return { error: "unavailable" };
      }
      let res;
      try {
        res = await fetch(base + "/credits/balance", {
          headers: { Authorization: "Bearer " + session.access_token },
        });
      } catch (_) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          return { error: "offline" };
        }
        return { error: "network" };
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status >= 500) return { error: "server" };
        return { error: "network" };
      }
      return { data };
    } catch (_) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { error: "offline" };
      }
      return { error: "network" };
    }
  }

  function generationBlockMessage(reason) {
    switch (reason) {
      case "offline":
        return "You're offline. Connect to Wi‑Fi or mobile data, then try again.";
      case "network":
      case "server":
        return window.isLocalDevHost?.()
          ? "Can't reach the local Moonrise worker. Start it with: cd moonrise-studio/worker && npm run dev"
          : "Can't reach Moonrise right now. Check your internet connection and try again.";
      case "auth":
        return "Sign in to generate a website.";
      case "unavailable":
        return "Moonrise services aren't available right now. Try again in a moment.";
      case "no_credits":
        return "Generation is free - try again in a moment.";
      default:
        return "Can't generate right now. Check your connection and try again.";
    }
  }

  async function fetchCreditBalance() {
    const result = await fetchCreditBalanceDetailed();
    return result.data || null;
  }

  async function canAffordGeneration() {
    return { ok: true, totalCredits: null, cost: 0 };
  }

  async function hydrateCredits() {
    try {
      return await fetchCreditBalance();
    } catch (_) {
      return null;
    }
  }

  function setSidebarIncome(income) {
    const valueEl = document.getElementById("ms-user-income-value");
    const tag = document.getElementById("ms-user-income");
    const formatted =
      global.StudioIncome?.formatIncome?.(income) ??
      "$" +
        Number(income || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    if (valueEl) valueEl.textContent = formatted;
    if (tag) {
      tag.title = "Your 90% share from paid client sites - @moonrise keeps 10%. Open Dashboard.";
    }
    rememberIncomeCache(income);
  }

  async function hydrateIncome() {
    const valueEl = document.getElementById("ms-user-income-value");
    if (!valueEl || !global.StudioIncome?.fetchUserIncome) return null;
    try {
      const data = await global.StudioIncome.fetchUserIncome();
      setSidebarIncome(data.income);
      return data;
    } catch (_) {
      setSidebarIncome(0);
      return null;
    }
  }

  async function hydrateUser() {
    const nameEl = document.getElementById("ms-user-name");
    if (!nameEl) return { handle: "", avatarUrl: "" };

    try {
      const user = await window.StudioAuth?.getUser?.();
      if (!user) {
        nameEl.textContent = "Guest";
        setSidebarAvatar("", "Guest");
        return { handle: "", avatarUrl: "" };
      }

      let handle =
        user.user_metadata?.handle ||
        user.email?.split("@")[0] ||
        "moonrise";
      let avatarUrl = "";

      try {
        const client = window.SiteSupabase?.getClient?.();
        if (client) {
          const { data } = await client
            .from("profiles")
            .select("handle, display_name, avatar_url, mvp_plus")
            .eq("id", user.id)
            .maybeSingle();
          if (data?.handle) handle = data.handle;
          else if (data?.display_name) handle = data.display_name;
          avatarUrl = String(data?.avatar_url || "").trim();

          const clean = String(handle).replace(/^@/, "").trim() || "moonrise";
          const isOwner = ownerHandles().includes(normalizeHandle(clean));
          writeOwnerNavCache(isOwner, clean);
          const mvpPlus = !!data?.mvp_plus || isOwner;
          nameEl.textContent = clean;
          setSidebarAvatar(avatarUrl, clean);
          clearLegacyProfileCosmetics();
          rememberProfileCache(clean, avatarUrl, { mvpPlus });
          injectOwnerNav(document.body?.dataset?.page || "");
          return { handle: clean, avatarUrl };
        } else {
          void hydrateIncome();
        }
      } catch (e) {
        /* keep metadata fallback */
        void hydrateIncome();
      }

      const clean = String(handle).replace(/^@/, "").trim() || "moonrise";
      const isOwner = ownerHandles().includes(normalizeHandle(clean));
      writeOwnerNavCache(isOwner, clean);
      nameEl.textContent = clean;
      setSidebarAvatar(avatarUrl, clean);
      rememberProfileCache(clean, avatarUrl);
      injectOwnerNav(document.body?.dataset?.page || "");
      return { handle: clean, avatarUrl };
    } catch (e) {
      nameEl.textContent = "Account";
      setSidebarAvatar("", "Account");
      return { handle: "", avatarUrl: "" };
    }
  }

  function bindShellListeners() {
    document.addEventListener("ms:avatar-changed", (e) => {
      const nameEl = document.getElementById("ms-user-name");
      const handle = e.detail?.handle || nameEl?.textContent || "M";
      if (nameEl && e.detail?.handle) nameEl.textContent = e.detail.handle;
      setSidebarAvatar(e.detail?.url || "", handle);
      if (e.detail?.handle) rememberProfileCache(e.detail.handle, e.detail?.url || "");
    });
    document.addEventListener("ms:income-changed", (e) => {
      if (e.detail?.income != null) setSidebarIncome(e.detail.income);
      else void hydrateIncome();
    });
  }

  async function boot() {
    let session = null;
    if (window.StudioAuth?.requireAuth) {
      try {
        session = await window.StudioAuth.requireAuth();
        if (!session) return;
      } catch (e) {
        console.warn(e);
        return;
      }
    }

    buildShell();
    ensureHardRefreshButton();
    bindNavCancel();
    bindShellListeners();
    try {
      sessionStorage.removeItem("ms_channel_generating");
    } catch {
      /* ignore */
    }
    setChannelGenerating(null, false);
    document.body.classList.add("ms-ready");
    document.dispatchEvent(new Event("ms:shell-ready"));
    document.body.dataset.msAuthFired = "1";
    document.dispatchEvent(new Event("ms:auth-ready"));

    if (session && window.StudioAuth.ensureStudioOnboarding) {
      try {
        const redirected = await window.StudioAuth.ensureStudioOnboarding(session);
        if (redirected === "redirect") return;
      } catch (e) {
        console.warn(e);
      }
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.StudioMotion?.playPageMotion?.();
      });
    });
    clearLegacyProfileCosmetics();

    void hydrateUser().catch(() => ({ handle: "", avatarUrl: "" }));
    void hydrateIncome();

    ensureInstallHintScript();
    ensureGenerationAnnounceScript();
  }

  function ensureGenerationAnnounceScript() {
    if (window.MsGenerationAnnounce) {
      window.MsGenerationAnnounce.init?.();
      return;
    }
    if (document.querySelector('script[src*="generation-announce.js"]')) return;
    const s = document.createElement("script");
    s.src = "js/generation-announce.js?v=20260721-float";
    s.defer = true;
    document.head.appendChild(s);
  }

  function ensureInstallHintScript() {
    if (window.__msInstallHintBooted) return;
    if (document.querySelector('script[src*="install-hint.js"]')) return;
    const s = document.createElement("script");
    s.src = "js/install-hint.js";
    s.defer = true;
    document.head.appendChild(s);
  }

  window.StudioCredits = {
    fetchBalance: fetchCreditBalance,
    canAffordGeneration,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
