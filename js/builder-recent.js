/**
 * Builder - recent projects rail.
 */
(function (global) {
  const LIMIT = 40;
  let allProjects = [];
  let projectLiveFilter = "all";
  let recentHeightObserver = null;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function isLiveProject(p) {
    return String(p?.status || "").toLowerCase() === "published";
  }

  function formatWhen(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function filteredProjects(list) {
    const filter = projectLiveFilter || "all";
    let projects = (list || []).slice();
    if (filter === "live") {
      projects = projects.filter(isLiveProject);
    } else if (filter === "not-live") {
      projects = projects.filter((p) => !isLiveProject(p));
    }
    return projects;
  }

  function projectCard(p) {
    const name = p.business_name || "Untitled";
    const href = "editor.html?project_id=" + encodeURIComponent(p.id);
    const hasHtml = !!(p.html && String(p.html).trim());
    const when = formatWhen(p.updated_at);
    const live = isLiveProject(p);
    const liveBadge = live
      ? '<span class="ms-dash-preview-live" aria-label="Live site">Live</span>'
      : "";
    const shot = hasHtml
      ? '<div class="ms-dash-preview-shot" aria-hidden="true">' +
        liveBadge +
        '<iframe class="ms-dash-preview-iframe" data-preview-id="' +
        escapeAttr(p.id) +
        '" title="" tabindex="-1" loading="lazy" sandbox=""></iframe></div>'
      : '<div class="ms-dash-preview-shot ms-dash-preview-shot--empty" aria-hidden="true">' +
        liveBadge +
        '<span class="ms-dash-preview-placeholder">' +
        escapeHtml(name.slice(0, 1).toUpperCase()) +
        "</span></div>";

    return (
      '<article class="ms-dash-preview ms-bs-recent-card">' +
      shot +
      '<a class="ms-dash-preview-meta" href="' +
      href +
      '">' +
      '<span class="ms-dash-preview-name">' +
      escapeHtml(name) +
      "</span>" +
      (when ? '<span class="ms-bs-recent-when">' + escapeHtml(when) + "</span>" : "") +
      "</a>" +
      '<a class="ms-dash-preview-hit" href="' +
      href +
      '" aria-label="Open ' +
      escapeAttr(name) +
      '"></a>' +
      "</article>"
    );
  }

  async function fetchPreviewHtml(projects) {
    const slice = projects || [];
    if (!slice.length) return [];
    const client = window.SiteSupabase?.getClient?.();
    if (!client) return slice;
    try {
      const { data, error } = await window.StudioAuth.withTimeout(
        client
          .from("projects")
          .select("id,html")
          .in(
            "id",
            slice.map((p) => p.id)
          ),
        6000,
        "Project previews"
      );
      if (error) throw error;
      const map = Object.fromEntries((data || []).map((d) => [d.id, d.html || ""]));
      return slice.map((p) => ({ ...p, html: map[p.id] || "" }));
    } catch (e) {
      console.warn("builder-recent fetchPreviewHtml", e);
      return slice;
    }
  }

  function mountPreviewFrames(projects) {
    const byId = Object.fromEntries((projects || []).map((p) => [p.id, p.html || ""]));
    document.querySelectorAll("#builder-recent-list .ms-dash-preview-iframe[data-preview-id]").forEach((frame) => {
      const id = frame.getAttribute("data-preview-id");
      const html = byId[id];
      if (html) frame.srcdoc = html;
    });
  }

  function syncProjectLiveFilterUi() {
    document.querySelectorAll(".ms-bs-recent-filters [data-live-filter]").forEach((btn) => {
      const on = btn.getAttribute("data-live-filter") === projectLiveFilter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    global.SegmentSwitch?.refresh?.(document.querySelector(".ms-bs-recent-filters"), true);
  }

  function emptyMessage() {
    if (projectLiveFilter === "live") return "No live projects yet.";
    if (projectLiveFilter === "not-live") return "No unpublished projects.";
    return "No projects yet.";
  }

  function syncRecentPanelHeight() {
    const card = document.getElementById("builder-setup-card");
    const recent = document.querySelector(".ms-bs-recent");
    if (!card || !recent) return;
    if (window.matchMedia("(max-width: 900px)").matches) {
      recent.style.maxHeight = "";
      return;
    }
    recent.style.maxHeight = card.offsetHeight + "px";
  }

  function bindRecentPanelHeightSync() {
    const card = document.getElementById("builder-setup-card");
    if (!card) return;

    const sync = () => window.requestAnimationFrame(syncRecentPanelHeight);
    sync();

    if (typeof ResizeObserver !== "undefined") {
      recentHeightObserver?.disconnect();
      recentHeightObserver = new ResizeObserver(sync);
      recentHeightObserver.observe(card);
    }
    window.addEventListener("resize", sync, { passive: true });
  }

  async function paintBuilderRecentProjects() {
    const listEl = document.getElementById("builder-recent-list");
    const countEl = document.getElementById("builder-recent-count");
    if (!listEl || document.body.dataset.page !== "builder") return;

    syncProjectLiveFilterUi();

    const shown = filteredProjects(allProjects);
    if (countEl) {
      countEl.hidden = !allProjects.length;
      countEl.textContent = allProjects.length ? String(allProjects.length) : "";
    }

    if (!allProjects.length) {
      listEl.innerHTML = '<p class="ms-muted ms-bs-recent-empty">No projects yet.</p>';
      return;
    }

    if (!shown.length) {
      listEl.innerHTML = '<p class="ms-muted ms-bs-recent-empty">' + escapeHtml(emptyMessage()) + "</p>";
      return;
    }

    const withHtml = await fetchPreviewHtml(shown);
    listEl.innerHTML = withHtml.map(projectCard).join("");
    mountPreviewFrames(withHtml);
    syncRecentPanelHeight();
  }

  async function loadBuilderRecentProjects() {
    const listEl = document.getElementById("builder-recent-list");
    if (!listEl || document.body.dataset.page !== "builder") return;

    if (!allProjects.length) {
      listEl.innerHTML = '<p class="ms-muted ms-bs-recent-loading">Loading…</p>';
    }

    try {
      const user = await window.StudioAuth.getUser();
      if (!user) {
        allProjects = [];
        listEl.innerHTML = '<p class="ms-muted ms-bs-recent-empty">Sign in to see projects.</p>';
        return;
      }

      const client = window.SiteSupabase?.getClient?.();
      if (!client) {
        throw new Error("Supabase client unavailable");
      }

      const { data, error } = await window.StudioAuth.withTimeout(
        client
          .from("projects")
          .select("id,business_name,status,updated_at,vercel_url")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(LIMIT),
        8000,
        "Recent projects"
      );
      if (error) throw error;

      allProjects = data || [];
      await paintBuilderRecentProjects();
    } catch (e) {
      console.warn("builder-recent load", e);
      if (!allProjects.length) {
        listEl.innerHTML = '<p class="ms-muted ms-bs-recent-empty">Could not load projects.</p>';
      }
    }
  }

  function bindProjectLiveFilter() {
    document.querySelector(".ms-bs-recent-filters")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-live-filter]");
      if (!btn) return;
      const next = btn.getAttribute("data-live-filter") || "all";
      if (next === projectLiveFilter) return;
      projectLiveFilter = next;
      void paintBuilderRecentProjects();
    });
  }

  bindProjectLiveFilter();
  bindRecentPanelHeightSync();

  function start() {
    void loadBuilderRecentProjects();
  }

  window.StudioBoot?.whenAuthReady?.(start) ?? start();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && document.body.dataset.page === "builder") {
      void loadBuilderRecentProjects();
    }
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && document.body.dataset.page === "builder") {
      void loadBuilderRecentProjects();
    }
  });
})(window);
