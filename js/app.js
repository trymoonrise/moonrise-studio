/**
 * Moonrise Studio shell — SiteDrop-style sidebar layout.
 */
(function () {
  const MENU = [
    { id: "dashboard", href: "dashboard.html", label: "Dashboard", icon: "grid" },
    { id: "leads", href: "leads.html", label: "Business Finder", icon: "search" },
    { id: "builder", href: "builder.html", label: "Builder", icon: "hammer" },
    { id: "projects", href: "projects.html", label: "Projects", icon: "folder" },
    { id: "finance", href: "finance.html", label: "Finance", icon: "dollar" },
    { id: "store", href: "store.html", label: "Store", icon: "bag", soon: true },
  ];

  const OWNER_MENU_ITEM = {
    id: "clients",
    href: "clients.html",
    label: "My clients",
    icon: "users",
    after: "builder",
  };

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
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.2 6.3L19 10l-5.8 1.7L12 18l-1.2-6.3L5 10l5.8-1.7L12 2z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
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
      // Stale after 30 days — re-check via auth
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

  function menuItems(includeOwner) {
    if (!includeOwner) return MENU.slice();
    const items = MENU.slice();
    const idx = items.findIndex((item) => item.id === OWNER_MENU_ITEM.after);
    const insertAt = idx >= 0 ? idx + 1 : items.length;
    items.splice(insertAt, 0, OWNER_MENU_ITEM);
    return items;
  }

  function brandLogo() {
    const c = window.SITE_CONFIG || {};
    return c.brandLogoUrl || "doc/MoonriseLogo.png";
  }

  function defaultAvatarUrl() {
    const c = window.SITE_CONFIG || {};
    return c.defaultAvatarUrl || "doc/pfp.png";
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
    return (
      '<a class="ms-nav-link' +
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
      "</span></a>"
    );
  }

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
    { id: "privacy", href: "privacy.html", label: "Privacy" },
    { id: "terms", href: "terms.html", label: "Terms" },
    { id: "help", href: "help.html", label: "Help" },
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
      '<nav class="ms-sidebar-legal" aria-label="Legal and support">' +
      links.join('<span class="ms-sidebar-legal-sep" aria-hidden="true">•</span>') +
      "</nav>"
    );
  }

  function initialFrom(text) {
    const s = String(text || "M").trim();
    return (s.charAt(0) || "M").toUpperCase();
  }

  function buildShell(opts) {
    const page = document.body?.dataset?.page || "";
    if (page === "index" || page === "home" || page === "login" || page === "apply") return;

    const shell = document.getElementById("shell");
    if (!shell) return;

    const includeOwner = !!(opts && opts.includeOwner);
    const menuHtml = menuItems(includeOwner)
      .map((item) => navLink(item, page))
      .join("");
    const accountHtml = ACCOUNT.map((item) => navLink(item, page)).join("");
    const bootAvatar = resolveAvatarUrl(cachedAvatarUrl());

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
      sidebarLegal(page) +
      '<div class="ms-sidebar-foot">' +
      '<div class="ms-user-row">' +
      '<div class="ms-user-avatar is-loading" id="ms-user-avatar" aria-hidden="true">' +
      '<span class="ms-user-avatar-spin" id="ms-user-avatar-spin" aria-hidden="true"></span>' +
      '<span id="ms-user-avatar-initial" hidden>M</span>' +
      '<img id="ms-user-avatar-img" src="' +
      bootAvatar +
      '" alt="" width="38" height="38" decoding="async" fetchpriority="high">' +
      "</div>" +
      '<div class="ms-user-meta">' +
      '<strong class="ms-user-name" id="ms-user-name">Loading…</strong>' +
      "</div>" +
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
        setNavOpen(false);
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

    // Paint cached/default avatar immediately; spinner clears on load
    setSidebarAvatar(cachedAvatarUrl(), "M");

    bindExternalRedirects();
    initSidebarResize();
  }

  /** Insert My clients without rebuilding the whole sidebar (avoids channel flash). */
  function ensureOwnerNavItem() {
    if (document.querySelector('[data-nav="clients"]')) return;
    const page = document.body?.dataset?.page || "";
    const mainNav = document.querySelector('.ms-nav-group .ms-nav[aria-label="Main"]');
    if (!mainNav) return;
    const after = mainNav.querySelector('[data-nav="' + OWNER_MENU_ITEM.after + '"]');
    const html = navLink(OWNER_MENU_ITEM, page);
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const link = wrap.firstElementChild;
    if (!link) return;
    // Avoid transition flash on late insert
    link.style.transition = "none";
    if (after && after.nextSibling) {
      mainNav.insertBefore(link, after.nextSibling);
    } else if (after) {
      mainNav.appendChild(link);
    } else {
      mainNav.appendChild(link);
    }
    requestAnimationFrame(function () {
      link.style.transition = "";
    });
  }

  function removeOwnerNavItem() {
    document.querySelectorAll('[data-nav="clients"]').forEach((el) => el.remove());
  }

  const TELEGRAM_LOGO =
    '<svg class="ms-telegram-logo" viewBox="0 0 240 240" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="ms-tg-grad" x1="50%" y1="0%" x2="50%" y2="100%">' +
    '<stop offset="0%" stop-color="#2AABEE"/><stop offset="100%" stop-color="#229ED9"/>' +
    "</linearGradient></defs>" +
    '<circle cx="120" cy="120" r="120" fill="url(#ms-tg-grad)"/>' +
    '<path fill="#FFF" d="M81.229 129.86s38.688-16.426 58.802-24.65c7.762-3.07 33.252-13.775 33.252-13.775s11.878-4.613 10.91 6.531c-.323 4.603-2.91 20.652-4.847 38.07-2.91 24.65-6.456 51.652-6.456 51.652s-.485 11.13-10.263 12.938c-9.778 1.808-23.275-7.27-25.859-9.724-2.101-2.1-19.372-12.615-26.168-18.403-1.939-1.616-4.2-4.847.323-8.724 9.778-8.401 21.631-18.726 28.75-25.375 3.232-2.91 6.455-9.723-3.555-1.616-14.533 11.777-29.39 22.75-29.39 22.75s-6.778 4.2-19.372.323c-12.615-3.878-27.428-8.886-27.428-8.886s-10.101-6.294 7.116-12.777z"/>' +
    "</svg>";

  function telegramUrl() {
    return (
      (window.SITE_CONFIG && window.SITE_CONFIG.telegramUrl) ||
      "https://t.me/c/3541685239/1"
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
      '<div class="ms-redirect-icon ms-redirect-icon--telegram" aria-hidden="true">' +
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
    pendingRedirectUrl = String(url || telegramUrl()).trim() || telegramUrl();
    const title = document.getElementById("ms-redirect-title");
    const copy = document.querySelector("#ms-redirect-modal .ms-redirect-copy");
    const goBtn = document.getElementById("ms-redirect-go");
    const name = String(label || "Telegram").trim() || "Telegram";
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
      if (v) sessionStorage.setItem(AVATAR_CACHE_KEY, v);
      else sessionStorage.removeItem(AVATAR_CACHE_KEY);
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

    // Already showing this exact image (cached) — no spinner flash
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
            .select("handle, display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (data?.handle) handle = data.handle;
          else if (data?.display_name) handle = data.display_name;
          avatarUrl = String(data?.avatar_url || "").trim();
        }
      } catch (e) {
        /* keep metadata fallback */
      }

      const clean = String(handle).replace(/^@/, "").trim() || "moonrise";
      nameEl.textContent = clean;
      setSidebarAvatar(avatarUrl, clean);
      return { handle: clean, avatarUrl };
    } catch (e) {
      nameEl.textContent = "Account";
      setSidebarAvatar("", "Account");
      return { handle: "", avatarUrl: "" };
    }
  }

  async function boot() {
    // Paint owner item on first frame when we already know (kills refresh glitch)
    buildShell({ includeOwner: shouldIncludeOwnerNav() });
    document.body.classList.add("ms-ready");
    document.dispatchEvent(new Event("ms:shell-ready"));

    if (window.StudioAuth?.requireAuth) {
      try {
        await window.StudioAuth.requireAuth();
      } catch (e) {
        console.warn(e);
      }
    }

    const identity = await hydrateUser().catch(() => ({ handle: "", avatarUrl: "" }));
    const owner = await isSiteOwner(identity.handle);
    writeOwnerNavCache(owner, identity.handle);
    if (owner) ensureOwnerNavItem();
    else removeOwnerNavItem();

    document.addEventListener("ms:avatar-changed", (e) => {
      const nameEl = document.getElementById("ms-user-name");
      const handle = e.detail?.handle || nameEl?.textContent || "M";
      if (nameEl && e.detail?.handle) nameEl.textContent = e.detail.handle;
      setSidebarAvatar(e.detail?.url || "", handle);
      // Keep owner nav cache in sync if handle changes
      void isSiteOwner(handle).then((ok) => {
        writeOwnerNavCache(ok, handle);
        if (ok) ensureOwnerNavItem();
        else removeOwnerNavItem();
      });
    });
    document.body.dataset.msAuthFired = "1";
    document.dispatchEvent(new Event("ms:auth-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
