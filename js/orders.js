/**
 * Public Locate My Order — published sites catalog (no auth).
 */
(function () {
  function workerUrl() {
    if (typeof window.resolveWorkerUrl === "function") return window.resolveWorkerUrl();
    return String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "") || "https://moonrise-studio.vercel.app";
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

  function statusMeta(order) {
    if (order.watermarkEnabled) {
      return { label: "Preview", tone: "preview" };
    }
    return { label: "Live", tone: "live" };
  }

  function cardHtml(order) {
    const status = statusMeta(order);
    const price = formatPrice(order.priceCents);
    const when = formatDate(order.updatedAt);
    const ctaLabel = order.watermarkEnabled ? "View & purchase" : "View site";
    return (
      '<article class="ms-orders-card">' +
      '<div class="ms-orders-card-top">' +
      '<span class="ms-orders-badge is-' +
      status.tone +
      '">' +
      escapeHtml(status.label) +
      "</span>" +
      (price
        ? '<span class="ms-orders-price">' + escapeHtml(price) + "</span>"
        : "") +
      "</div>" +
      "<h2>" +
      escapeHtml(order.businessName) +
      "</h2>" +
      (when
        ? '<p class="ms-orders-meta">Updated ' + escapeHtml(when) + "</p>"
        : "") +
      '<a class="ms-orders-cta" href="' +
      escapeHtml(order.url) +
      '" target="_blank" rel="noopener noreferrer">' +
      ctaLabel +
      "</a>" +
      "</article>"
    );
  }

  async function fetchOrders(q) {
    const url = new URL(workerUrl() + "/public-orders");
    if (q) url.searchParams.set("q", q);
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load published sites");
    return Array.isArray(data.orders) ? data.orders : [];
  }

  function render(orders, statusEl, gridEl, query) {
    if (!orders.length) {
      statusEl.hidden = false;
      statusEl.textContent = query
        ? "No published sites match that search."
        : "No published websites yet.";
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
    if (!statusEl || !gridEl) return;

    let timer = null;
    let latestQuery = "";

    async function load(q) {
      latestQuery = String(q || "").trim();
      statusEl.hidden = false;
      statusEl.textContent = "Loading published sites…";
      try {
        const orders = await fetchOrders(latestQuery);
        if (String(searchEl?.value || "").trim() !== latestQuery) return;
        render(orders, statusEl, gridEl, latestQuery);
      } catch (e) {
        statusEl.hidden = false;
        statusEl.textContent = e.message || "Could not load published sites.";
        gridEl.innerHTML = "";
      }
    }

    searchEl?.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void load(searchEl.value);
      }, 220);
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
