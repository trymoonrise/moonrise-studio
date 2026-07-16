/**
 * Projects channel — all user sites in one place.
 */
(async function () {
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
    } catch (_) {
      return "";
    }
  }

  function formatDateTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_) {
      return formatDate(iso);
    }
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
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
    if (p.watermark_enabled) return "draft";
    return "draft";
  }

  function hostFromUrl(url) {
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch (_) {
      return String(url || "").replace(/^https?:\/\//i, "").split("/")[0] || "";
    }
  }

  function projectCard(p) {
    const name = p.business_name || "Untitled";
    const live = String(p.vercel_url || "").trim();
    const updated = formatDateTime(p.updated_at);
    const openHref = "builder.html?project_id=" + encodeURIComponent(p.id);

    return (
      '<article class="ms-project-card">' +
      '<div class="ms-project-card-main">' +
      '<div class="ms-project-card-top">' +
      '<h3 class="ms-project-name">' +
      escapeHtml(name) +
      "</h3>" +
      '<span class="ms-dash-pill ms-dash-pill--' +
      statusTone(p) +
      '">' +
      escapeHtml(statusLabel(p)) +
      "</span>" +
      "</div>" +
      '<div class="ms-project-meta">' +
      (updated
        ? '<span class="ms-project-meta-item">Updated ' + escapeHtml(updated) + "</span>"
        : "") +
      (p.watermark_enabled
        ? '<span class="ms-project-meta-item ms-project-meta-item--warn">Watermark on</span>'
        : '<span class="ms-project-meta-item">Unlocked</span>') +
      (live
        ? '<a class="ms-project-meta-item ms-project-live" href="' +
          escapeHtml(live) +
          '" target="_blank" rel="noopener">' +
          escapeHtml(hostFromUrl(live)) +
          "</a>"
        : '<span class="ms-project-meta-item">No domain yet</span>') +
      "</div>" +
      "</div>" +
      '<div class="ms-project-actions">' +
      '<a class="ms-btn" href="' +
      openHref +
      '">Open in Builder</a>' +
      (live
        ? '<a class="ms-btn ms-btn-secondary" href="' +
          escapeHtml(live) +
          '" target="_blank" rel="noopener">View live</a>'
        : "") +
      "</div>" +
      "</article>"
    );
  }

  function setCount(n) {
    const el = document.getElementById("projects-count");
    if (!el) return;
    el.textContent = n + " " + plural(n, "project", "projects");
  }

  function render(list) {
    const host = document.getElementById("projects-list");
    const empty = document.getElementById("projects-empty");
    const loading = document.getElementById("projects-loading");
    if (loading) loading.remove();
    if (!host) return;

    const projects = Array.isArray(list) ? list : [];
    setCount(projects.length);

    if (!projects.length) {
      host.innerHTML = "";
      host.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    host.hidden = false;
    host.innerHTML = projects.map(projectCard).join("");
  }

  async function load() {
    const session = await window.StudioAuth?.requireAuth?.();
    if (!session) return;

    const user = await window.StudioAuth.getUser();
    if (!user) {
      render([]);
      return;
    }

    const client = window.SiteSupabase?.getClient?.();
    if (!client) {
      window.StudioToast?.error?.("Could not connect to the database.");
      render([]);
      return;
    }

    try {
      const query = client
        .from("projects")
        .select("id,business_name,status,watermark_enabled,updated_at,vercel_url,created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const { data, error } = await window.StudioAuth.withTimeout(
        query,
        8000,
        "Load projects"
      );

      if (error) throw error;
      render(data || []);
    } catch (e) {
      console.warn("projects load", e);
      window.StudioToast?.error?.(e.message || "Could not load projects.");
      render([]);
    }
  }

  await load();
})();
