/**
 * All projects — search, filter, and open builds.
 */
(function () {
  const SEARCH_RESULT_LIMIT = 200;
  let allProjects = [];
  let deleteProjectId = null;
  let projectSearchQuery = "";
  let projectLiveFilter = "all";
  let projectSuggestIndex = -1;
  let projectPaintToken = 0;

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

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  function isLiveProject(p) {
    if (window.StudioProjects?.isLiveProject) return window.StudioProjects.isLiveProject(p);
    return String(p?.status || "").toLowerCase() === "published";
  }

  function canDeleteProject(p) {
    if (window.StudioProjects?.canDeleteProject) return window.StudioProjects.canDeleteProject(p);
    return p?.watermark_enabled !== false;
  }

  function projectContext(p) {
    const ctx = p?.business_context;
    return ctx && typeof ctx === "object" ? ctx : {};
  }

  function projectSearchFields(p) {
    const ctx = projectContext(p);
    const address = String(ctx.address || ctx.city_state_zip || ctx.location || "").trim();
    const category = String(ctx.category || "").trim();
    const phone = String(ctx.phone || ctx.businessPhone || "").trim();
    const domain = String(ctx.customDomain || "").trim();
    const maps = String(ctx.mapsUrl || ctx.maps_url || "").trim();
    const site = String(p.vercel_url || "").trim();
    const name = String(p.business_name || ctx.businessName || "").trim();
    const status = String(p.status || "").trim();
    const id = String(p.id || "").trim();
    const leadId = String(p.lead_id || "").trim();
    return { name, address, category, phone, domain, maps, site, status, id, leadId };
  }

  function projectHaystack(p) {
    const f = projectSearchFields(p);
    return [f.name, f.address, f.category, f.phone, f.domain, f.maps, f.site, f.status, f.id, f.leadId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function filteredProjects(list, query, liveFilter) {
    const q = String(query || "").trim().toLowerCase();
    const filter = liveFilter || projectLiveFilter || "all";
    let projects = (list || []).slice();
    if (filter === "live") projects = projects.filter(isLiveProject);
    else if (filter === "not-live") projects = projects.filter((p) => !isLiveProject(p));
    if (!q) return projects;
    return projects.filter((p) => projectHaystack(p).includes(q)).slice(0, SEARCH_RESULT_LIMIT);
  }

  function buildProjectSuggestions(list, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    const out = [];

    function push(value, kind) {
      const text = String(value || "").trim();
      if (!text) return;
      const key = kind + ":" + text.toLowerCase();
      if (seen.has(key) || !text.toLowerCase().includes(q)) return;
      seen.add(key);
      out.push({ value: text, kind });
    }

    (list || []).forEach((p) => {
      const f = projectSearchFields(p);
      push(f.name, "Name");
      push(f.category, "Category");
      push(f.address, "Location");
      push(f.phone, "Phone");
      push(f.domain, "Domain");
      if (f.site) {
        try {
          push(new URL(f.site).hostname, "Site");
        } catch (_) {
          push(f.site.replace(/^https?:\/\//i, "").split("/")[0], "Site");
        }
      }
      f.address
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((part) => push(part, "Location"));
    });

    return out.slice(0, 8);
  }

  function renderProjectSuggestions() {
    const listEl = document.getElementById("projects-suggest");
    const input = document.getElementById("projects-search");
    if (!listEl || !input) return;
    const items = buildProjectSuggestions(allProjects, projectSearchQuery);
    projectSuggestIndex = -1;
    if (!items.length || !projectSearchQuery.trim()) {
      listEl.hidden = true;
      listEl.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
      return;
    }
    listEl.innerHTML = items
      .map(
        (item, i) =>
          '<li class="ms-dash-projects-suggest-item" role="option" id="projects-suggest-' +
          i +
          '" data-suggest="' +
          escapeAttr(item.value) +
          '" aria-selected="false">' +
          '<span class="ms-dash-projects-suggest-kind">' +
          escapeHtml(item.kind) +
          "</span>" +
          '<span class="ms-dash-projects-suggest-value">' +
          escapeHtml(item.value) +
          "</span></li>"
      )
      .join("");
    listEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function hideProjectSuggestions() {
    const listEl = document.getElementById("projects-suggest");
    const input = document.getElementById("projects-search");
    if (listEl) {
      listEl.hidden = true;
      listEl.innerHTML = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
    projectSuggestIndex = -1;
  }

  function highlightProjectSuggestion(index) {
    const listEl = document.getElementById("projects-suggest");
    if (!listEl || listEl.hidden) return;
    const items = [...listEl.querySelectorAll(".ms-dash-projects-suggest-item")];
    items.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    projectSuggestIndex = index;
    if (index >= 0 && items[index]) items[index].scrollIntoView({ block: "nearest" });
  }

  function applyProjectSearch(query, { fromSuggest = false } = {}) {
    projectSearchQuery = String(query || "");
    const input = document.getElementById("projects-search");
    const clearBtn = document.getElementById("projects-search-clear");
    if (input && input.value !== projectSearchQuery) input.value = projectSearchQuery;
    if (clearBtn) clearBtn.hidden = !projectSearchQuery.trim();
    if (fromSuggest) hideProjectSuggestions();
    else renderProjectSuggestions();
    void paintProjects();
  }

  function syncProjectLiveFilterUi() {
    document.querySelectorAll(".ms-projects-filters [data-live-filter]").forEach((btn) => {
      const on = btn.getAttribute("data-live-filter") === projectLiveFilter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    window.SegmentSwitch?.refresh?.(document.querySelector(".ms-projects-filters"), true);
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
        8000,
        "Project previews"
      );
      if (error) throw error;
      const map = Object.fromEntries((data || []).map((d) => [d.id, d.html || ""]));
      return slice.map((p) => ({ ...p, html: map[p.id] || "" }));
    } catch (e) {
      console.warn("projects fetchPreviewHtml", e);
      return slice;
    }
  }

  function mountPreviewFrames(projects) {
    const byId = Object.fromEntries((projects || []).map((p) => [p.id, p.html || ""]));
    document.querySelectorAll("#projects-list .ms-dash-preview-iframe[data-preview-id]").forEach((frame) => {
      const id = frame.getAttribute("data-preview-id");
      const html = byId[id];
      if (html) frame.srcdoc = html;
    });
  }

  function projectPreview(p) {
    const name = p.business_name || "Untitled";
    const hasHtml = !!(p.html && String(p.html).trim());
    const paid = !canDeleteProject(p);
    const live = isLiveProject(p);
    const liveBadge = live ? '<span class="ms-dash-preview-live" aria-label="Live site">Live</span>' : "";
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
    const deleteBtn = paid
      ? ""
      : '<button type="button" class="ms-dash-preview-delete" data-project-delete="' +
        escapeAttr(p.id) +
        '" aria-label="Delete ' +
        escapeAttr(name) +
        '">×</button>';

    return (
      '<article class="ms-dash-preview">' +
      shot +
      deleteBtn +
      '<a class="ms-dash-preview-meta" href="editor.html?project_id=' +
      encodeURIComponent(p.id) +
      '">' +
      '<span class="ms-dash-preview-name">' +
      escapeHtml(name) +
      "</span>" +
      "</a>" +
      '<a class="ms-dash-preview-hit" href="editor.html?project_id=' +
      encodeURIComponent(p.id) +
      '" aria-label="Open ' +
      escapeAttr(name) +
      '"></a>' +
      "</article>"
    );
  }

  async function paintProjects() {
    const token = ++projectPaintToken;
    const host = document.getElementById("projects-list");
    const countEl = document.getElementById("projects-count");
    const hint = document.getElementById("projects-search-hint");
    const searchWrap = document.getElementById("projects-search-wrap");
    const projects = allProjects.slice();

    if (countEl) {
      countEl.textContent = projects.length + " " + plural(projects.length, "project", "projects");
    }
    if (searchWrap) searchWrap.hidden = !projects.length;

    if (!host) return;

    if (!projects.length) {
      host.innerHTML = '<div class="ms-dash-empty ms-dash-empty--dotted"><p>No projects yet.</p></div>';
      if (hint) {
        hint.hidden = true;
        hint.textContent = "";
      }
      return;
    }

    syncProjectLiveFilterUi();

    const shown = filteredProjects(projects, projectSearchQuery);
    const q = projectSearchQuery.trim();
    if (hint) {
      if (q) {
        const pool =
          projectLiveFilter === "live"
            ? projects.filter(isLiveProject)
            : projectLiveFilter === "not-live"
              ? projects.filter((p) => !isLiveProject(p))
              : projects;
        const totalMatches = pool.filter((p) => projectHaystack(p).includes(q.toLowerCase())).length;
        hint.hidden = false;
        hint.textContent =
          totalMatches === 0
            ? "No projects match that search."
            : totalMatches > SEARCH_RESULT_LIMIT
              ? "Showing " + SEARCH_RESULT_LIMIT + " of " + totalMatches + " matches."
              : totalMatches + " " + plural(totalMatches, "match", "matches") + ".";
      } else if (projectLiveFilter !== "all" && !shown.length) {
        hint.hidden = false;
        hint.textContent =
          projectLiveFilter === "live" ? "No live projects yet." : "No unpublished projects.";
      } else {
        hint.hidden = true;
        hint.textContent = "";
      }
    }

    if (!shown.length) {
      if (token !== projectPaintToken) return;
      host.innerHTML =
        '<div class="ms-dash-empty ms-dash-empty--dotted"><p>' +
        (q
          ? "No projects match that search."
          : projectLiveFilter === "live"
            ? "No live projects yet."
            : projectLiveFilter === "not-live"
              ? "No unpublished projects."
              : "No projects yet.") +
        "</p></div>";
      return;
    }

    const withHtml = await fetchPreviewHtml(shown);
    if (token !== projectPaintToken) return;
    host.innerHTML = withHtml.map(projectPreview).join("");
    mountPreviewFrames(withHtml);
  }

  function openDeleteDialog(project) {
    const dialog = document.getElementById("projects-delete-dialog");
    const message = document.getElementById("projects-delete-message");
    const error = document.getElementById("projects-delete-error");
    if (!dialog || !project) return;
    if (!canDeleteProject(project)) {
      window.StudioToast?.error?.("This website was paid for — it can’t be deleted.");
      return;
    }
    deleteProjectId = project.id;
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    if (message) {
      const liveNote = isLiveProject(project) ? " It will be taken offline first." : "";
      message.textContent =
        'Delete "' + (project.business_name || "Untitled") + '"? This cannot be undone.' + liveNote;
    }
    dialog.showModal();
  }

  function closeDeleteDialog() {
    deleteProjectId = null;
    document.getElementById("projects-delete-dialog")?.close();
  }

  async function confirmDeleteProject() {
    const error = document.getElementById("projects-delete-error");
    const submit = document.getElementById("projects-delete-submit");
    if (!deleteProjectId) return;
    const project = allProjects.find((p) => p.id === deleteProjectId);
    if (project && !canDeleteProject(project)) {
      if (error) {
        error.hidden = false;
        error.textContent = "This website was paid for — it can’t be deleted.";
      }
      return;
    }
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    if (submit) submit.disabled = true;
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) throw new Error("Sign in required");
      if (project && isLiveProject(project) && window.StudioProjects?.unpublishProject) {
        await window.StudioProjects.unpublishProject(project.id);
      }
      const client = window.SiteSupabase.getClient();
      const { data, error: dbError } = await window.StudioAuth.withTimeout(
        client.from("projects").delete().eq("id", deleteProjectId).eq("user_id", user.id).select("id"),
        6000,
        "Delete project"
      );
      if (dbError) throw dbError;
      if (!data?.length) {
        if (project && !canDeleteProject(project)) {
          throw new Error("This website was paid for — it can’t be deleted.");
        }
        throw new Error("Could not delete project. Refresh and try again.");
      }
      allProjects = allProjects.filter((p) => p.id !== deleteProjectId);
      await paintProjects();
      closeDeleteDialog();
    } catch (e) {
      if (error) {
        error.hidden = false;
        error.textContent = e.message || "Could not delete project.";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function bindProjectLiveFilter() {
    document.querySelector(".ms-projects-filters")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-live-filter]");
      if (!btn) return;
      const next = btn.getAttribute("data-live-filter") || "all";
      if (next === projectLiveFilter) return;
      projectLiveFilter = next;
      void paintProjects();
    });
  }

  function bindProjectSearch() {
    const input = document.getElementById("projects-search");
    const clearBtn = document.getElementById("projects-search-clear");
    const listEl = document.getElementById("projects-suggest");
    if (!input) return;

    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => applyProjectSearch(input.value), 120);
    });

    input.addEventListener("keydown", (e) => {
      const items = listEl ? [...listEl.querySelectorAll(".ms-dash-projects-suggest-item")] : [];
      if (e.key === "ArrowDown" && items.length) {
        e.preventDefault();
        highlightProjectSuggestion(projectSuggestIndex < items.length - 1 ? projectSuggestIndex + 1 : 0);
        return;
      }
      if (e.key === "ArrowUp" && items.length) {
        e.preventDefault();
        highlightProjectSuggestion(projectSuggestIndex > 0 ? projectSuggestIndex - 1 : items.length - 1);
        return;
      }
      if (e.key === "Enter" && projectSuggestIndex >= 0 && items[projectSuggestIndex]) {
        e.preventDefault();
        applyProjectSearch(items[projectSuggestIndex].getAttribute("data-suggest") || "", { fromSuggest: true });
        return;
      }
      if (e.key === "Escape") {
        if (!listEl?.hidden) {
          e.preventDefault();
          hideProjectSuggestions();
          return;
        }
        if (input.value) {
          e.preventDefault();
          applyProjectSearch("", { fromSuggest: true });
        }
      }
    });

    input.addEventListener("blur", () => window.setTimeout(() => hideProjectSuggestions(), 140));
    clearBtn?.addEventListener("click", () => {
      applyProjectSearch("", { fromSuggest: true });
      input.focus();
    });
    listEl?.addEventListener("mousedown", (e) => {
      const item = e.target.closest("[data-suggest]");
      if (!item) return;
      e.preventDefault();
      applyProjectSearch(item.getAttribute("data-suggest") || "", { fromSuggest: true });
    });
  }

  function bindProjectActions() {
    document.getElementById("projects-list")?.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-project-delete]");
      if (!deleteBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.getAttribute("data-project-delete") || "";
      const project = allProjects.find((p) => p.id === id);
      if (project) openDeleteDialog(project);
    });

    document.getElementById("projects-delete-cancel")?.addEventListener("click", closeDeleteDialog);
    document.getElementById("projects-delete-submit")?.addEventListener("click", () => void confirmDeleteProject());
    document.getElementById("projects-delete-dialog")?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDeleteDialog();
    });
    document.getElementById("projects-delete-dialog")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDeleteDialog();
    });
  }

  async function loadProjects() {
    const user = await window.StudioAuth.getUser();
    if (!user) {
      allProjects = [];
      await paintProjects();
      return;
    }
    const client = window.SiteSupabase.getClient();
    const { data, error } = await window.StudioAuth.withTimeout(
      client
        .from("projects")
        .select("id,business_name,status,watermark_enabled,updated_at,vercel_url,price_cents,lead_id,business_context")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(200),
      8000,
      "Projects"
    );
    if (error) throw error;
    allProjects = data || [];
    await paintProjects();
  }

  function start() {
    bindProjectLiveFilter();
    bindProjectSearch();
    bindProjectActions();
    void loadProjects().catch((e) => {
      console.warn(e);
      const host = document.getElementById("projects-list");
      if (host) host.innerHTML = '<div class="ms-dash-empty"><p>Could not load projects.</p></div>';
    });
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  window.setTimeout(() => {
    if (document.body.dataset.page === "projects" && !allProjects.length) start();
  }, 2500);
})();
