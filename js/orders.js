/**
 * Public Locate My Order — published sites catalog (no auth).
 */
(function () {
  let activeYear = "";
  let availableYears = [];

  function cloudWorkerUrl() {
    return String(window.SITE_CONFIG?.workerUrl || "https://moonrise-studio.vercel.app").replace(
      /\/$/,
      ""
    );
  }

  function localWorkerUrl() {
    if (typeof window.resolveWorkerUrl === "function") {
      try {
        const resolved = String(window.resolveWorkerUrl() || "").replace(/\/$/, "");
        if (resolved) return resolved;
      } catch (_) {
        /* ignore */
      }
    }
    return cloudWorkerUrl();
  }

  /** Candidate API bases — public catalog prefers cloud so a stopped local worker does not break it. */
  function workerCandidates() {
    const cloud = cloudWorkerUrl();
    const local = localWorkerUrl();
    const out = [];
    const add = (url) => {
      const base = String(url || "").replace(/\/$/, "");
      if (!base || out.includes(base)) return;
      out.push(base);
    };

    try {
      if (typeof location !== "undefined" && /^https?:$/i.test(location.protocol)) {
        // Same-origin when Studio is served from the Vercel host (rewrites /public-orders → API).
        if (location.origin === cloud || location.hostname.endsWith("vercel.app")) {
          add(location.origin);
        }
      }
    } catch (_) {
      /* ignore */
    }

    add(cloud);
    if (window.isLocalDevHost?.() && local !== cloud) add(local);
    return out;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPrice(cents) {
    const dollars = Number(cents) / 100;
    if (!Number.isFinite(dollars) || dollars <= 0) return "";
    const hasCents = Math.round(dollars * 100) % 100 !== 0;
    return (
      "$" +
      dollars.toLocaleString("en-US", {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatPublished(iso) {
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

  function statusMeta(order) {
    if (order.watermarkEnabled) {
      return {
        label: "Awaiting payment",
        tone: "preview",
        hint: "Watermark still active",
      };
    }
    return {
      label: "Live",
      tone: "live",
      hint: "Watermark removed",
    };
  }

  function cardHtml(order) {
    const status = statusMeta(order);
    const price = formatPrice(order.priceCents);
    const when = formatPublished(order.publishedAt || order.updatedAt);
    const year = order.publishedYear || "";
    const ctaLabel = order.watermarkEnabled ? "Open preview" : "Visit website";
    return (
      '<article class="ms-orders-card">' +
      '<div class="ms-orders-card-top">' +
      '<span class="ms-orders-badge is-' +
      status.tone +
      '" title="' +
      escapeHtml(status.hint) +
      '">' +
      escapeHtml(status.label) +
      "</span>" +
      (year ? '<span class="ms-orders-year">' + escapeHtml(String(year)) + "</span>" : "") +
      "</div>" +
      "<h2>" +
      escapeHtml(order.businessName) +
      "</h2>" +
      '<p class="ms-orders-meta">' +
      (when ? "Published " + escapeHtml(when) : "Published site") +
      (price && order.watermarkEnabled ? " · " + escapeHtml(price) + " to unlock" : "") +
      "</p>" +
      '<a class="ms-orders-cta" href="' +
      escapeHtml(order.url) +
      '" target="_blank" rel="noopener noreferrer">' +
      ctaLabel +
      "</a>" +
      "</article>"
    );
  }

  async function fetchOrdersFrom(base, q, year) {
    const url = new URL(String(base).replace(/\/$/, "") + "/public-orders");
    if (q) url.searchParams.set("q", q);
    if (year) url.searchParams.set("year", String(year));
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      mode: "cors",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load published sites");
    return {
      orders: Array.isArray(data.orders) ? data.orders : [],
      years: Array.isArray(data.years) ? data.years : [],
      total: Number(data.total) || (Array.isArray(data.orders) ? data.orders.length : 0),
    };
  }

  async function fetchOrders(q, year) {
    const bases = workerCandidates();
    let lastError = null;
    for (const base of bases) {
      try {
        return await fetchOrdersFrom(base, q, year);
      } catch (err) {
        lastError = err;
      }
    }
    const msg = lastError?.message || "Please try again shortly.";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
      throw new Error(
        "Could not reach the Moonrise catalog API. Check your connection, or open Studio from https://moonrise-studio.vercel.app/orders.html"
      );
    }
    throw lastError || new Error("Could not load published sites");
  }

  function renderYears(yearsEl) {
    if (!yearsEl) return;
    if (!availableYears.length) {
      yearsEl.hidden = true;
      yearsEl.innerHTML = "";
      return;
    }
    yearsEl.hidden = false;
    yearsEl.innerHTML =
      '<button type="button" class="ms-orders-year-btn' +
      (!activeYear ? " is-active" : "") +
      '" data-year="" aria-pressed="' +
      (!activeYear ? "true" : "false") +
      '">All years</button>' +
      availableYears
        .map((year) => {
          const on = String(activeYear) === String(year);
          return (
            '<button type="button" class="ms-orders-year-btn' +
            (on ? " is-active" : "") +
            '" data-year="' +
            escapeHtml(String(year)) +
            '" aria-pressed="' +
            (on ? "true" : "false") +
            '">' +
            escapeHtml(String(year)) +
            "</button>"
          );
        })
        .join("");
  }

  function render(orders, statusEl, gridEl, query) {
    const countEl = document.getElementById("orders-count");
    if (countEl) countEl.textContent = String(orders.length);

    if (!orders.length) {
      statusEl.hidden = false;
      statusEl.innerHTML = query
        ? "<strong>No matches</strong><span>Try another business name" +
          (activeYear ? " or clear the year filter" : "") +
          ".</span>"
        : "<strong>No published websites yet</strong><span>Sites appear here automatically after they are published in Moonrise Studio.</span>";
      gridEl.innerHTML = "";
      return;
    }
    statusEl.hidden = true;
    statusEl.textContent = "";
    gridEl.innerHTML = orders.map(cardHtml).join("");
  }

  async function boot() {
    const statusEl = document.getElementById("orders-status");
    const gridEl = document.getElementById("orders-grid");
    const searchEl = document.getElementById("orders-search");
    const yearsEl = document.getElementById("orders-years");
    if (!statusEl || !gridEl) return;

    let timer = null;
    let latestQuery = "";

    async function load(q) {
      latestQuery = String(q || "").trim();
      statusEl.hidden = false;
      statusEl.textContent = "Loading published sites…";
      try {
        const result = await fetchOrders(latestQuery, activeYear);
        if (String(searchEl?.value || "").trim() !== latestQuery) return;
        if (!latestQuery && !activeYear) {
          availableYears = result.years.slice();
        } else if (result.years.length) {
          availableYears = [...new Set([...availableYears, ...result.years])].sort((a, b) => b - a);
        }
        renderYears(yearsEl);
        render(result.orders, statusEl, gridEl, latestQuery);
      } catch (e) {
        statusEl.hidden = false;
        statusEl.innerHTML =
          "<strong>Could not load catalog</strong><span>" +
          escapeHtml(e.message || "Please try again shortly.") +
          "</span>";
        gridEl.innerHTML = "";
        const countEl = document.getElementById("orders-count");
        if (countEl) countEl.textContent = "—";
      }
    }

    searchEl?.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void load(searchEl.value);
      }, 220);
    });

    yearsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-year]");
      if (!btn) return;
      activeYear = btn.getAttribute("data-year") || "";
      renderYears(yearsEl);
      void load(searchEl?.value || "");
    });

    await load("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
})();
