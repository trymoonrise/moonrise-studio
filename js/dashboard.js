/**
 * Dashboard — overview metrics + recent projects.
 */
(async function () {
  const DEFAULT_GOAL = 1000;
  const MIN_GOAL = 1;
  const MAX_GOAL = 1000000;
  const COMMISSION_RATE = 0.8;

  let goalTarget = DEFAULT_GOAL;
  let goalUserId = "";
  let savingGoal = false;
  let salesCount = 0;
  let commissionEarned = 0;
  let allProjects = [];
  let deleteProjectId = null;
  let projectSearchQuery = "";
  let projectSuggestIndex = -1;
  let projectPaintToken = 0;
  let statsAnimFrame = 0;
  let statsIntroPlayed = false;
  /** Soft cap only for search results; default view shows every project. */
  const SEARCH_RESULT_LIMIT = 100;
  const STATS_INTRO_MS = 1100;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function formatGoal(n) {
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function formatCommission(n) {
    return (
      "$" +
      Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function commissionFromProject(project) {
    const cents = Number(project?.price_cents);
    if (!Number.isFinite(cents) || cents <= 0) return 0;
    return Math.round(cents * COMMISSION_RATE) / 100;
  }

  function calcCommission(sales) {
    return (sales || []).reduce((sum, project) => sum + commissionFromProject(project), 0);
  }

  function parseGoal(raw) {
    const n = Math.round(Number(String(raw ?? "").replace(/,/g, "").trim()));
    if (!Number.isFinite(n) || n < MIN_GOAL) return null;
    return Math.min(MAX_GOAL, n);
  }

  function statusLabel(p) {
    if (p.status === "published") return "Live";
    if (p.status === "paid") return "Paid";
    if (p.watermark_enabled) return "Preview";
    return String(p.status || "Draft");
  }

  function statusTone(p) {
    if (p.status === "published") return "live";
    if (p.status === "paid") return "paid";
    return "draft";
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  function isSale(p) {
    // Only count when the business owner paid to remove the watermark.
    return p.watermark_enabled === false;
  }

  function isPaidProject(p) {
    if (!p) return false;
    if (p.watermark_enabled === false) return true;
    return String(p.status || "").toLowerCase() === "paid";
  }

  function prefersReducedMotion() {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function goalPct(commission, goal) {
    const g = Number(goal);
    if (!Number.isFinite(g) || g <= 0) return 0;
    return Math.min(100, Math.round((Number(commission) / g) * 100));
  }

  function paintStatsValues({ goal, commission, sales, pct }) {
    const goalEl = document.getElementById("stat-goal");
    const salesEl = document.getElementById("dash-sales-progress");
    const pctEl = document.getElementById("stat-goal-pct");
    const commissionEl = document.getElementById("stat-commission");
    const ringEl = document.getElementById("stat-goal-ring");
    const ring = document.querySelector(".ms-dash-ring");
    const input = document.getElementById("stat-goal-input");

    if (goalEl) {
      goalEl.textContent = formatGoal(goal);
      goalEl.setAttribute(
        "aria-label",
        "Commission goal " + formatGoal(goal) + ", click to edit"
      );
    }
    if (input && document.activeElement !== input) input.value = String(Math.round(goal));
    if (salesEl) salesEl.textContent = String(Math.round(sales));
    if (commissionEl) commissionEl.textContent = formatCommission(commission);
    if (pctEl) pctEl.textContent = Math.round(pct) + "%";
    if (ring) {
      ring.setAttribute(
        "aria-label",
        Math.round(pct) +
          " percent — " +
          formatCommission(commission) +
          " earned of " +
          formatGoal(goal) +
          " goal"
      );
    }
    if (ringEl) {
      ringEl.style.strokeDasharray = "100";
      ringEl.style.strokeDashoffset = String(100 - pct);
    }
  }

  function cancelStatsAnimation() {
    if (statsAnimFrame) {
      cancelAnimationFrame(statsAnimFrame);
      statsAnimFrame = 0;
    }
  }

  function animateStatsToCurrent() {
    cancelStatsAnimation();
    const goal = goalTarget;
    const commission = commissionEarned;
    const sales = salesCount;
    const pct = goalPct(commission, goal);
    const ringEl = document.getElementById("stat-goal-ring");
    const prevTransition = ringEl?.style.transition;

    if (prefersReducedMotion()) {
      paintStatsValues({ goal, commission, sales, pct });
      return;
    }

    if (ringEl) ringEl.style.transition = "none";

    const start = performance.now();
    const from = { goal: 0, commission: 0, sales: 0, pct: 0 };

    function frame(now) {
      const t = Math.min(1, (now - start) / STATS_INTRO_MS);
      const e = easeOutCubic(t);
      paintStatsValues({
        goal: from.goal + (goal - from.goal) * e,
        commission: from.commission + (commission - from.commission) * e,
        sales: from.sales + (sales - from.sales) * e,
        pct: from.pct + (pct - from.pct) * e,
      });
      if (t < 1) {
        statsAnimFrame = requestAnimationFrame(frame);
      } else {
        statsAnimFrame = 0;
        paintStatsValues({ goal, commission, sales, pct });
        if (ringEl) ringEl.style.transition = prevTransition || "";
      }
    }

    paintStatsValues(from);
    statsAnimFrame = requestAnimationFrame(frame);
  }

  function renderSalesProgress() {
    const el = document.getElementById("dash-sales-progress");
    if (!el) return;
    el.textContent = String(salesCount);
  }

  function renderProgress() {
    paintStatsValues({
      goal: goalTarget,
      commission: commissionEarned,
      sales: salesCount,
      pct: goalPct(commissionEarned, goalTarget),
    });
  }

  function renderGoal() {
    const input = document.getElementById("stat-goal-input");
    if (input && document.activeElement !== input) input.value = String(goalTarget);
    paintStatsValues({
      goal: goalTarget,
      commission: commissionEarned,
      sales: salesCount,
      pct: goalPct(commissionEarned, goalTarget),
    });
  }

  function setStats(salesProjects, opts) {
    const sales = (salesProjects || []).filter(isSale);
    salesCount = sales.length;
    commissionEarned = calcCommission(sales);
    const animate = opts?.animate === true || (opts?.animate !== false && !statsIntroPlayed);
    if (animate) {
      statsIntroPlayed = true;
      animateStatsToCurrent();
    } else {
      renderGoal();
    }
  }

  async function persistGoal(value) {
    if (!goalUserId || savingGoal) return;
    const client = window.SiteSupabase?.getClient?.();
    if (!client) return;
    savingGoal = true;
    try {
      const { error } = await window.StudioAuth.withTimeout(
        client
          .from("profiles")
          .update({
            goal_target: value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goalUserId),
        5000,
        "Save goal"
      );
      if (error) throw error;
    } catch (e) {
      console.warn("persistGoal", e);
    } finally {
      savingGoal = false;
    }
  }

  async function loadGoal(userId) {
    goalUserId = userId || "";
    goalTarget = DEFAULT_GOAL;
    const client = window.SiteSupabase?.getClient?.();
    if (!client || !userId) return;
    try {
      const { data, error } = await window.StudioAuth.withTimeout(
        client.from("profiles").select("goal_target").eq("id", userId).maybeSingle(),
        4000,
        "Load goal"
      );
      if (error) throw error;
      const parsed = parseGoal(data?.goal_target);
      goalTarget = parsed || DEFAULT_GOAL;
    } catch (e) {
      console.warn("loadGoal", e);
      goalTarget = DEFAULT_GOAL;
    }
    const input = document.getElementById("stat-goal-input");
    if (input) input.value = String(goalTarget);
  }

  function bindGoalEditor() {
    const wrap = document.getElementById("stat-goal-wrap");
    const display = document.getElementById("stat-goal");
    const input = document.getElementById("stat-goal-input");
    if (!wrap || !display || !input) return;

    let editing = false;

    function startEdit() {
      if (editing) return;
      editing = true;
      wrap.classList.add("is-editing");
      input.hidden = false;
      input.value = String(goalTarget);
      input.focus();
      input.select();
    }

    function endEdit(commit) {
      if (!editing) return;
      editing = false;
      wrap.classList.remove("is-editing");
      input.hidden = true;

      if (commit) {
        const next = parseGoal(input.value);
        if (next != null && next !== goalTarget) {
          goalTarget = next;
          void persistGoal(goalTarget);
        }
      }
      renderGoal();
    }

    display.addEventListener("click", (e) => {
      e.preventDefault();
      startEdit();
    });

    wrap.addEventListener("click", (e) => {
      if (e.target === input || e.target === display) return;
      if (!editing) startEdit();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        endEdit(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        endEdit(false);
      }
    });

    input.addEventListener("blur", () => {
      endEdit(true);
    });
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
    const ip = String(ctx.ip || ctx.ipAddress || ctx.clientIp || "").trim();
    const name = String(p.business_name || ctx.businessName || "").trim();
    const status = String(p.status || "").trim();
    const id = String(p.id || "").trim();
    const leadId = String(p.lead_id || "").trim();
    return {
      name,
      address,
      category,
      phone,
      domain,
      maps,
      site,
      ip,
      status,
      id,
      leadId,
    };
  }

  function projectHaystack(p) {
    const f = projectSearchFields(p);
    return [
      f.name,
      f.address,
      f.category,
      f.phone,
      f.domain,
      f.maps,
      f.site,
      f.ip,
      f.status,
      f.id,
      f.leadId,
      statusLabel(p),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function filteredProjects(list, query) {
    const q = String(query || "").trim().toLowerCase();
    const projects = list || [];
    if (!q) return projects.slice();
    const matched = projects.filter((p) => projectHaystack(p).includes(q));
    return matched.slice(0, SEARCH_RESULT_LIMIT);
  }

  function buildProjectSuggestions(list, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q || q.length < 1) return [];
    const seen = new Set();
    const out = [];

    function push(value, kind) {
      const text = String(value || "").trim();
      if (!text) return;
      const key = kind + ":" + text.toLowerCase();
      if (seen.has(key)) return;
      if (!text.toLowerCase().includes(q)) return;
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
      push(f.ip, "IP");
      if (f.site) {
        try {
          push(new URL(f.site).hostname, "Site");
        } catch (_) {
          push(f.site.replace(/^https?:\/\//i, "").split("/")[0], "Site");
        }
      }
      // City-ish token from address for location suggestions
      const parts = f.address.split(",").map((s) => s.trim()).filter(Boolean);
      parts.forEach((part) => push(part, "Location"));
    });

    out.sort((a, b) => {
      const aStarts = a.value.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.value.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.value.localeCompare(b.value);
    });
    return out.slice(0, 8);
  }

  function renderProjectSuggestions() {
    const listEl = document.getElementById("dash-projects-suggest");
    const input = document.getElementById("dash-projects-search");
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
          '<li class="ms-dash-projects-suggest-item" role="option" id="dash-projects-suggest-' +
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
    const listEl = document.getElementById("dash-projects-suggest");
    const input = document.getElementById("dash-projects-search");
    if (listEl) {
      listEl.hidden = true;
      listEl.innerHTML = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
    projectSuggestIndex = -1;
  }

  function highlightProjectSuggestion(index) {
    const listEl = document.getElementById("dash-projects-suggest");
    if (!listEl || listEl.hidden) return;
    const items = [...listEl.querySelectorAll(".ms-dash-projects-suggest-item")];
    items.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    projectSuggestIndex = index;
    if (index >= 0 && items[index]) {
      items[index].scrollIntoView({ block: "nearest" });
    }
  }

  function applyProjectSearch(query, { fromSuggest = false } = {}) {
    projectSearchQuery = String(query || "");
    const input = document.getElementById("dash-projects-search");
    const clearBtn = document.getElementById("dash-projects-search-clear");
    if (input && input.value !== projectSearchQuery) input.value = projectSearchQuery;
    if (clearBtn) clearBtn.hidden = !projectSearchQuery.trim();
    if (fromSuggest) hideProjectSuggestions();
    else renderProjectSuggestions();
    void paintProjects();
  }

  async function paintProjects() {
    const token = ++projectPaintToken;
    const host = document.getElementById("dash-projects-list");
    const countEl = document.getElementById("dash-projects-count");
    const hint = document.getElementById("dash-projects-search-hint");
    const searchWrap = document.getElementById("dash-projects-search-wrap");
    const card = document.querySelector(".ms-dash-projects-card");
    const btn = document.getElementById("dash-projects-toggle");
    const panel = document.getElementById("dash-projects-panel");
    const projects = allProjects.slice();

    if (countEl) {
      countEl.textContent =
        projects.length + " " + plural(projects.length, "project", "projects");
    }
    if (searchWrap) searchWrap.hidden = !projects.length;

    if (!host) return;

    if (!projects.length) {
      host.innerHTML = "";
      if (hint) {
        hint.hidden = true;
        hint.textContent = "";
      }
      card?.classList.add("is-empty");
      card?.classList.remove("is-open");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.disabled = true;
      }
      if (panel) panel.hidden = true;
      hideProjectSuggestions();
      return;
    }

    card?.classList.remove("is-empty");
    if (btn) btn.disabled = false;

    const shown = filteredProjects(projects, projectSearchQuery);
    const q = projectSearchQuery.trim();
    if (hint) {
      if (q) {
        const totalMatches = projects.filter((p) => projectHaystack(p).includes(q.toLowerCase())).length;
        hint.hidden = false;
        hint.textContent =
          totalMatches === 0
            ? "No projects match that search."
            : totalMatches > SEARCH_RESULT_LIMIT
              ? "Showing " + SEARCH_RESULT_LIMIT + " of " + totalMatches + " matches."
              : totalMatches + " " + plural(totalMatches, "match", "matches") + ".";
      } else {
        hint.hidden = true;
        hint.textContent = "";
      }
    }

    if (!shown.length) {
      if (token !== projectPaintToken) return;
      host.innerHTML =
        '<div class="ms-dash-empty ms-dash-empty--dotted"><p>No projects match that search.</p></div>';
      return;
    }

    const withHtml = await fetchPreviewHtml(shown);
    if (token !== projectPaintToken) return;
    host.innerHTML = withHtml.map(projectPreview).join("");
    mountPreviewFrames(withHtml);
  }

  function projectPreview(p) {
    const name = p.business_name || "Untitled";
    const hasHtml = !!(p.html && String(p.html).trim());
    const paid = isPaidProject(p);
    const shot = hasHtml
      ? '<div class="ms-dash-preview-shot" aria-hidden="true">' +
        '<iframe class="ms-dash-preview-iframe" data-preview-id="' +
        escapeAttr(p.id) +
        '" title="" tabindex="-1" loading="lazy" sandbox=""></iframe></div>'
      : '<div class="ms-dash-preview-shot ms-dash-preview-shot--empty" aria-hidden="true">' +
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
      '<a class="ms-dash-preview-meta" href="builder.html?project_id=' +
      encodeURIComponent(p.id) +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="ms-dash-preview-name">' +
      escapeHtml(name) +
      "</span>" +
      "</a>" +
      '<a class="ms-dash-preview-hit" href="builder.html?project_id=' +
      encodeURIComponent(p.id) +
      '" target="_blank" rel="noopener noreferrer" aria-label="Open ' +
      escapeAttr(name) +
      '"></a>' +
      "</article>"
    );
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#39;");
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
      console.warn("fetchPreviewHtml", e);
      return slice;
    }
  }

  function mountPreviewFrames(projects) {
    const byId = Object.fromEntries((projects || []).map((p) => [p.id, p.html || ""]));
    document.querySelectorAll(".ms-dash-preview-iframe[data-preview-id]").forEach((frame) => {
      const id = frame.getAttribute("data-preview-id");
      const html = byId[id];
      if (html) frame.srcdoc = html;
    });
  }

  async function renderProjects(list) {
    allProjects = (list || []).slice();
    await paintProjects();
  }

  function bindProjectsToggle() {
    const btn = document.getElementById("dash-projects-toggle");
    const panel = document.getElementById("dash-projects-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", () => {
      if (btn.disabled || btn.closest(".ms-dash-projects-card")?.classList.contains("is-empty")) {
        return;
      }
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      btn.closest(".ms-dash-island")?.classList.toggle("is-open", !open);
    });
  }

  function openDeleteDialog(project) {
    const dialog = document.getElementById("dash-project-delete-dialog");
    const message = document.getElementById("dash-project-delete-message");
    const error = document.getElementById("dash-project-delete-error");
    if (!dialog || !project) return;
    if (isPaidProject(project)) {
      window.StudioToast?.error?.(
        "This website was paid for — it can’t be deleted."
      );
      return;
    }
    deleteProjectId = project.id;
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    if (message) {
      message.textContent =
        'Delete "' +
        (project.business_name || "Untitled") +
        '"? This cannot be undone.';
    }
    dialog.showModal();
  }

  function closeDeleteDialog() {
    const dialog = document.getElementById("dash-project-delete-dialog");
    deleteProjectId = null;
    dialog?.close();
  }

  async function confirmDeleteProject() {
    const error = document.getElementById("dash-project-delete-error");
    const submit = document.getElementById("dash-project-delete-submit");
    if (!deleteProjectId) return;
    const project = allProjects.find((p) => p.id === deleteProjectId);
    if (project && isPaidProject(project)) {
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
      const client = window.SiteSupabase.getClient();
      const { data, error: dbError } = await window.StudioAuth.withTimeout(
        client
          .from("projects")
          .delete()
          .eq("id", deleteProjectId)
          .eq("user_id", user.id)
          .select("id"),
        6000,
        "Delete project"
      );
      if (dbError) throw dbError;
      if (!data?.length) {
        throw new Error("This website was paid for — it can’t be deleted.");
      }
      allProjects = allProjects.filter((p) => p.id !== deleteProjectId);
      setStats(allProjects.filter(isSale));
      await renderProjects(allProjects);
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

  function bindProjectSearch() {
    const input = document.getElementById("dash-projects-search");
    const clearBtn = document.getElementById("dash-projects-search-clear");
    const listEl = document.getElementById("dash-projects-suggest");
    if (!input) return;

    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        applyProjectSearch(input.value);
      }, 120);
    });

    input.addEventListener("keydown", (e) => {
      const items = listEl ? [...listEl.querySelectorAll(".ms-dash-projects-suggest-item")] : [];
      if (e.key === "ArrowDown" && items.length) {
        e.preventDefault();
        const next = projectSuggestIndex < items.length - 1 ? projectSuggestIndex + 1 : 0;
        highlightProjectSuggestion(next);
        return;
      }
      if (e.key === "ArrowUp" && items.length) {
        e.preventDefault();
        const next = projectSuggestIndex > 0 ? projectSuggestIndex - 1 : items.length - 1;
        highlightProjectSuggestion(next);
        return;
      }
      if (e.key === "Enter" && projectSuggestIndex >= 0 && items[projectSuggestIndex]) {
        e.preventDefault();
        applyProjectSearch(items[projectSuggestIndex].getAttribute("data-suggest") || "", {
          fromSuggest: true,
        });
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

    input.addEventListener("blur", () => {
      window.setTimeout(() => hideProjectSuggestions(), 140);
    });

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
    document.getElementById("dash-projects-list")?.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-project-delete]");
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = deleteBtn.getAttribute("data-project-delete") || "";
        const project = allProjects.find((p) => p.id === id);
        if (project) openDeleteDialog(project);
        return;
      }
    });

    document.getElementById("dash-project-delete-cancel")?.addEventListener("click", () => {
      closeDeleteDialog();
    });

    document.getElementById("dash-project-delete-submit")?.addEventListener("click", () => {
      void confirmDeleteProject();
    });

    document.getElementById("dash-project-delete-dialog")?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDeleteDialog();
    });

    document.getElementById("dash-project-delete-dialog")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeDeleteDialog();
    });
  }

  async function load() {
    const user = await window.StudioAuth.getUser();
    if (!user) {
      goalUserId = "";
      goalTarget = DEFAULT_GOAL;
      salesCount = 0;
      commissionEarned = 0;
      setStats([]);
      await renderProjects([]);
      return;
    }

    await loadGoal(user.id);

    const client = window.SiteSupabase.getClient();
    let list = [];
    try {
      const query = client
        .from("projects")
        .select("id,business_name,status,watermark_enabled,updated_at,vercel_url,price_cents,lead_id,business_context")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      const { data, error } = await window.StudioAuth.withTimeout(
        query,
        6000,
        "Dashboard"
      );
      if (error) throw error;
      list = data || [];
    } catch (e) {
      console.warn(e);
      commissionEarned = 0;
      salesCount = 0;
      setStats([]);
      await renderProjects([]);
      return;
    }

    setStats(list.filter(isSale));
    await renderProjects(list);
  }

  let started = false;
  let loadInFlight = null;

  function refreshDashboard() {
    if (document.visibilityState === "hidden") return;
    if (loadInFlight) return;
    loadInFlight = load()
      .catch((e) => console.warn(e))
      .finally(() => {
        loadInFlight = null;
      });
  }

  function bindDashboardRefresh() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshDashboard();
    });
    window.addEventListener("focus", refreshDashboard);
  }

  function start() {
    if (started) return;
    started = true;
    bindGoalEditor();
    bindProjectsToggle();
    bindProjectSearch();
    bindProjectActions();
    bindDashboardRefresh();
    refreshDashboard();
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();

