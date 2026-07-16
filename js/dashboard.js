/**
 * Dashboard — overview cards + sales list + recent projects.
 */
(async function () {
  const DEFAULT_GOAL = 1000;
  const MIN_GOAL = 1;
  const MAX_GOAL = 1000000;

  let goalTarget = DEFAULT_GOAL;
  let goalUserId = "";
  let savingGoal = false;
  let salesCount = 0;

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
    return Number(n).toLocaleString();
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
    el.textContent = formatGoal(salesCount);
  }

  function renderGoal() {
    const goalEl = document.getElementById("stat-goal");
    const input = document.getElementById("stat-goal-input");
    if (goalEl) {
      goalEl.textContent = formatGoal(goalTarget);
      goalEl.setAttribute(
        "aria-label",
        "Sales goal " + formatGoal(goalTarget) + ", click to edit"
      );
    }
    if (input) input.value = String(goalTarget);
    renderSalesProgress();
  }

  function setStats(total, published, sales) {
    salesCount = sales;
    const closeRate = total > 0 ? Math.round((sales / total) * 100) : 0;
    const closeEl = document.getElementById("stat-close");
    const ringEl = document.getElementById("stat-close-ring");
    const publishedEl = document.getElementById("stat-published");

    renderGoal();
    if (closeEl) closeEl.textContent = closeRate + "%";
    if (ringEl) {
      const clamped = Math.max(0, Math.min(100, closeRate));
      ringEl.style.strokeDasharray = "100";
      ringEl.style.strokeDashoffset = String(100 - clamped);
    }
    if (publishedEl) publishedEl.textContent = String(published);
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

  function projectRow(p) {
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

  function renderProjects(list) {
    const host = document.getElementById("dash-projects-list");
    const countEl = document.getElementById("dash-projects-count");
    const projects = list || [];
    if (countEl) {
      countEl.textContent =
        projects.length + " " + plural(projects.length, "project", "projects");
    }
    if (!host) return;
    if (!projects.length) {
      host.innerHTML =
        '<div class="ms-dash-empty">' +
        "<p>No projects yet</p>" +
        '<div class="ms-dash-empty-actions">' +
        '<a class="ms-btn ms-dash-btn" href="builder.html">Start a build</a>' +
        '<a class="ms-btn ms-btn-secondary ms-dash-btn-ghost" href="leads.html">Find a lead</a>' +
        "</div>" +
        "</div>";
      return;
    }
    host.innerHTML = projects.map(projectRow).join("");
  }

  function bindProjectsToggle() {
    const btn = document.getElementById("dash-projects-toggle");
    const panel = document.getElementById("dash-projects-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      btn.closest(".ms-dash-island")?.classList.toggle("is-open", !open);
    });
  }

  async function load() {
    const user = await window.StudioAuth.getUser();
    if (!user) {
      goalUserId = "";
      goalTarget = DEFAULT_GOAL;
      salesCount = 0;
      setStats(0, 0, 0);
      renderSales([]);
      renderProjects([]);
      return;
    }

    await loadGoal(user.id);

    const client = window.SiteSupabase.getClient();
    let list = [];
    try {
      const query = client
        .from("projects")
        .select("id,business_name,status,watermark_enabled,updated_at,vercel_url")
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
      setStats(0, 0, 0);
      const host = document.getElementById("dash-sales-list");
      if (host) {
        host.innerHTML =
          '<div class="ms-dash-empty"><p>Could not load sales.</p>' +
          '<div class="ms-dash-empty-actions">' +
          '<a class="ms-btn ms-dash-btn" href="builder.html">Start a build</a>' +
          "</div></div>";
      }
      renderProjects([]);
      return;
    }

    const published = list.filter((p) => p.status === "published").length;
    const sales = list.filter(isSale).length;
    setStats(list.length, published, sales);
    renderSales(list);
    renderProjects(list);
  }

  let started = false;

  function start() {
    if (started) return;
    started = true;
    bindProjectsToggle();
    bindGoalEditor();
    load().catch((e) => console.warn(e));
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();

