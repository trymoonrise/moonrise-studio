/**
 * Dashboard — overview cards + sales list + recent projects.
 */
(async function () {
  const DEFAULT_GOAL = 1000;
  const MIN_GOAL = 1;
  const MAX_GOAL = 1000000;
  const COMMISSION_RATE = 0.4;

  let goalTarget = DEFAULT_GOAL;
  let goalUserId = "";
  let savingGoal = false;
  let salesCount = 0;
  let commissionEarned = 0;
  let allProjects = [];
  let deleteProjectId = null;
  const PREVIEW_LIMIT = 3;

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
    return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
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
    return p.status === "paid" || p.status === "published";
  }

  function renderSalesProgress() {
    const el = document.getElementById("dash-sales-progress");
    if (!el) return;
    el.textContent = String(salesCount);
  }

  function renderProgress() {
    const pct = goalTarget > 0 ? Math.min(100, Math.round((commissionEarned / goalTarget) * 100)) : 0;
    const pctEl = document.getElementById("stat-goal-pct");
    const ringEl = document.getElementById("stat-goal-ring");
    const commissionEl = document.getElementById("stat-commission");
    const labelEl = document.getElementById("stat-goal-pct-label");

    if (commissionEl) commissionEl.textContent = formatCommission(commissionEarned);
    if (pctEl) pctEl.textContent = pct + "%";
    if (labelEl) {
      labelEl.textContent = "of goal";
      labelEl.setAttribute(
        "aria-label",
        formatCommission(commissionEarned) + " earned, " + pct + " percent of " + formatGoal(goalTarget) + " goal"
      );
    }
    if (ringEl) {
      ringEl.style.strokeDasharray = "100";
      ringEl.style.strokeDashoffset = String(100 - pct);
    }
  }

  function renderGoal() {
    const goalEl = document.getElementById("stat-goal");
    const input = document.getElementById("stat-goal-input");
    if (goalEl) {
      goalEl.textContent = formatGoal(goalTarget);
      goalEl.setAttribute(
        "aria-label",
        "Commission goal " + formatGoal(goalTarget) + ", click to edit"
      );
    }
    if (input) input.value = String(goalTarget);
    renderSalesProgress();
    renderProgress();
  }

  function setStats(salesProjects) {
    const sales = (salesProjects || []).filter(isSale);
    salesCount = sales.length;
    commissionEarned = calcCommission(sales);
    renderGoal();
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
    if (!client || !userId) {
      renderGoal();
      return;
    }
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
    renderGoal();
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

  function saleRow(p) {
    return (
      '<a class="ms-dash-row" href="builder.html?project_id=' +
      encodeURIComponent(p.id) +
      '">' +
      '<div class="ms-dash-row-main">' +
      '<span class="ms-dash-row-name">' +
      escapeHtml(p.business_name || "Untitled") +
      "</span>" +
      '<span class="ms-dash-row-date">' +
      escapeHtml(formatDate(p.updated_at)) +
      "</span>" +
      "</div>" +
      '<span class="ms-dash-pill ms-dash-pill--' +
      statusTone(p) +
      '">' +
      escapeHtml(statusLabel(p)) +
      "</span>" +
      "</a>"
    );
  }

  function renderSales(list) {
    const host = document.getElementById("dash-sales-list");
    if (!host) return;

    const sales = (list || []).filter(isSale);

    if (!sales.length) {
      host.innerHTML =
        '<div class="ms-dash-empty ms-dash-empty--dotted"><p>No sales yet</p></div>';
      return;
    }

    host.innerHTML = sales.slice(0, 6).map(saleRow).join("");
  }

  function projectPreview(p) {
    const name = p.business_name || "Untitled";
    const hasHtml = !!(p.html && String(p.html).trim());
    const shot = hasHtml
      ? '<div class="ms-dash-preview-shot" aria-hidden="true">' +
        '<iframe class="ms-dash-preview-iframe" data-preview-id="' +
        escapeAttr(p.id) +
        '" title="" tabindex="-1" loading="lazy" sandbox=""></iframe></div>'
      : '<div class="ms-dash-preview-shot ms-dash-preview-shot--empty" aria-hidden="true">' +
        '<span class="ms-dash-preview-placeholder">' +
        escapeHtml(name.slice(0, 1).toUpperCase()) +
        "</span></div>";

    return (
      '<article class="ms-dash-preview">' +
      shot +
      '<button type="button" class="ms-dash-preview-delete" data-project-delete="' +
      escapeAttr(p.id) +
      '" aria-label="Delete ' +
      escapeAttr(name) +
      '">×</button>' +
      '<a class="ms-dash-preview-meta" href="builder.html?project_id=' +
      encodeURIComponent(p.id) +
      '">' +
      '<span class="ms-dash-preview-name">' +
      escapeHtml(name) +
      "</span>" +
      '<span class="ms-dash-pill ms-dash-pill--' +
      statusTone(p) +
      '">' +
      escapeHtml(statusLabel(p)) +
      "</span>" +
      "</a>" +
      '<a class="ms-dash-preview-hit" href="builder.html?project_id=' +
      encodeURIComponent(p.id) +
      '" aria-label="Open ' +
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
    const slice = (projects || []).slice(0, PREVIEW_LIMIT);
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
    const host = document.getElementById("dash-projects-list");
    const countEl = document.getElementById("dash-projects-count");
    const card = document.querySelector(".ms-dash-projects-card");
    const btn = document.getElementById("dash-projects-toggle");
    const panel = document.getElementById("dash-projects-panel");
    const projects = list || [];
    allProjects = projects.slice();
    if (countEl) {
      countEl.textContent =
        projects.length + " " + plural(projects.length, "project", "projects");
    }
    if (!host) return;

    if (!projects.length) {
      host.innerHTML = "";
      card?.classList.add("is-empty");
      card?.classList.remove("is-open");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.disabled = true;
      }
      if (panel) panel.hidden = true;
      return;
    }

    card?.classList.remove("is-empty");
    if (btn) btn.disabled = false;
    host.innerHTML = "";
    const withHtml = await fetchPreviewHtml(projects);
    host.innerHTML = withHtml.map(projectPreview).join("");
    mountPreviewFrames(withHtml);
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
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
    if (submit) submit.disabled = true;
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) throw new Error("Sign in required");
      const client = window.SiteSupabase.getClient();
      const { error: dbError } = await window.StudioAuth.withTimeout(
        client.from("projects").delete().eq("id", deleteProjectId).eq("user_id", user.id),
        6000,
        "Delete project"
      );
      if (dbError) throw dbError;
      allProjects = allProjects.filter((p) => p.id !== deleteProjectId);
      const sales = allProjects.filter(isSale);
      setStats(sales);
      renderSales(allProjects);
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
      renderSales([]);
      await renderProjects([]);
      return;
    }

    await loadGoal(user.id);

    const client = window.SiteSupabase.getClient();
    let list = [];
    try {
      const query = client
        .from("projects")
        .select("id,business_name,status,watermark_enabled,updated_at,vercel_url,price_cents")
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
      renderGoal();
      const host = document.getElementById("dash-sales-list");
      if (host) {
        host.innerHTML =
          '<div class="ms-dash-empty"><p>Could not load sales.</p>' +
          '<div class="ms-dash-empty-actions">' +
          '<a class="ms-btn ms-dash-btn" href="builder.html">Start a build</a>' +
          "</div></div>";
      }
      await renderProjects([]);
      return;
    }

    const sales = list.filter(isSale);
    setStats(sales);
    renderSales(list);
    await renderProjects(list);
  }

  let started = false;

  function start() {
    if (started) return;
    started = true;
    bindGoalEditor();
    bindProjectsToggle();
    bindProjectActions();
    load().catch((e) => console.warn(e));
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();

