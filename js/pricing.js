/**
 * Pricing — credit plans and custom top-ups via Stripe Checkout.
 */
(function () {
  const DEFAULT_TOPUP = {
    centsPerCredit: 5,
    creditsPerDollar: 20,
    minDollars: 1,
    maxDollars: 1000,
  };

  const FALLBACK_CATALOG = {
    generationCost: 5,
    plans: [
      { id: "starter", name: "Starter", priceLabel: "$5", credits: 100, description: "For getting started" },
      { id: "pro", name: "Pro", priceLabel: "$10", credits: 200, description: "For growing your pipeline", popular: true },
      { id: "business", name: "Business", priceLabel: "$20", credits: 500, description: "For teams building at scale" },
    ],
    topup: DEFAULT_TOPUP,
  };

  let topupConfig = { ...DEFAULT_TOPUP };

  function workerUrl() {
    if (typeof window.resolveWorkerUrl === "function") return window.resolveWorkerUrl();
    return String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  async function authHeaders() {
    const session = await window.StudioAuth.getSession();
    if (!session?.access_token) throw new Error("Sign in required");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function planBenefits(plan, genCost) {
    const sites = Math.floor((plan.credits || 0) / (genCost || 5));
    return [
      "Up to " + sites + " websites per month",
      "Download HTML",
      "View code",
      "Everything in the store is free",
      "Business Finder lead search",
      "Credits refresh monthly",
    ];
  }

  function quoteTopup(dollars) {
    const amount = Number(dollars);
    if (!Number.isFinite(amount)) return null;
    if (amount < topupConfig.minDollars || amount > topupConfig.maxDollars) return null;
    const priceCents = Math.round(amount * 100);
    const credits = Math.floor(priceCents / topupConfig.centsPerCredit);
    if (credits <= 0) return null;
    return { dollars: amount, priceCents, credits };
  }

  function formatCredits(n) {
    return Number(n).toLocaleString("en-US");
  }

  function syncTopupUi(opts) {
    const showValidation = opts?.showValidation !== false;
    const input = document.getElementById("topup-amount");
    const inputWrap = input?.closest(".ms-pricing-topup-input-wrap");
    const tooltip = document.getElementById("topup-amount-tooltip");
    const preview = document.getElementById("topup-preview");
    const btn = document.getElementById("btn-topup-purchase");
    if (!input || !preview || !btn) return;

    input.min = String(topupConfig.minDollars);
    input.max = String(topupConfig.maxDollars);

    const quote = quoteTopup(input.value);
    if (quote) {
      preview.textContent = "= " + formatCredits(quote.credits) + " credits";
      btn.disabled = false;
      inputWrap?.classList.remove("is-invalid");
      input.setAttribute("aria-invalid", "false");
      if (tooltip) {
        tooltip.hidden = true;
        tooltip.textContent = "";
      }
      return;
    }

    preview.textContent = "";
    btn.disabled = true;

    if (!showValidation) {
      inputWrap?.classList.remove("is-invalid");
      input.setAttribute("aria-invalid", "false");
      if (tooltip) {
        tooltip.hidden = true;
        tooltip.textContent = "";
      }
      return;
    }

    const amount = Number(input.value);
    const belowMinimum = !input.value || !Number.isFinite(amount) || amount < topupConfig.minDollars;
    const message = belowMinimum
      ? "Minimum is $" + topupConfig.minDollars
      : "Maximum is $" + topupConfig.maxDollars.toLocaleString("en-US");
    inputWrap?.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    if (tooltip) {
      tooltip.hidden = false;
      tooltip.textContent = message;
    }
  }

  function applyTopupConfig(config) {
    if (!config || typeof config !== "object") return;
    topupConfig = {
      centsPerCredit: Number(config.centsPerCredit) || DEFAULT_TOPUP.centsPerCredit,
      creditsPerDollar: Number(config.creditsPerDollar) || DEFAULT_TOPUP.creditsPerDollar,
      minDollars: Number(config.minDollars) || DEFAULT_TOPUP.minDollars,
      maxDollars: Number(config.maxDollars) || DEFAULT_TOPUP.maxDollars,
    };
    syncTopupUi();
  }

  function renderPlans(catalog, balance) {
    const root = document.getElementById("pricing-plans");
    if (!root) return;
    const activePlan = balance?.planId || null;
    const genCost = catalog.generationCost || 5;

    root.innerHTML = catalog.plans
      .map((plan) => {
        const isActive = activePlan === plan.id && balance?.planStatus === "active";
        const isPopular = !!plan.popular;
        const benefits = planBenefits(plan, genCost);
        return (
          '<article class="ms-pricing-plan' +
          (isPopular ? " is-popular" : "") +
          (isActive ? " is-current" : "") +
          '" data-plan="' +
          escapeHtml(plan.id) +
          '">' +
          (isPopular ? '<span class="ms-pricing-popular">Popular</span>' : "") +
          '<h3>' +
          escapeHtml(plan.name) +
          "</h3>" +
          '<div class="ms-pricing-plan-price">' +
          escapeHtml(plan.priceLabel) +
          "<span>/mo</span></div>" +
          '<p class="ms-pricing-credit-count">' +
          plan.credits +
          " credits</p>" +
          '<ul class="ms-pricing-features">' +
          benefits.map((b) => "<li>" + escapeHtml(b) + "</li>").join("") +
          "</ul>" +
          '<button type="button" class="ms-btn' +
          (isPopular ? "" : " ms-btn-secondary") +
          ' ms-pricing-plan-btn" data-plan-checkout="' +
          escapeHtml(plan.id) +
          '"' +
          (isActive ? " disabled" : "") +
          ">" +
          (isActive ? "Current" : "Subscribe") +
          "</button></article>"
        );
      })
      .join("");
  }

  async function loadCatalogAndBalance() {
    const base = workerUrl();
    let catalog = FALLBACK_CATALOG;
    if (base) {
      try {
        const catalogRes = await fetch(base + "/credits/catalog");
        const remoteCatalog = await catalogRes.json();
        if (catalogRes.ok && remoteCatalog?.plans?.length) {
          catalog = remoteCatalog;
        }
      } catch (_) {
        /* Keep the visible local catalog if billing is temporarily unavailable. */
      }
    }

    applyTopupConfig(catalog.topup || DEFAULT_TOPUP);

    let balance = null;
    try {
      if (!base) throw new Error("Worker URL is not configured");
      await window.StudioAuth?.requireAuth?.();
      const headers = await authHeaders();
      const balRes = await fetch(base + "/credits/balance", { headers });
      balance = await balRes.json();
    } catch (_) {
      /* guest view */
    }

    renderPlans(catalog, balance);

    const portalBtn = document.getElementById("btn-billing-portal");
    if (portalBtn) {
      portalBtn.hidden = !balance?.stripeCustomerId;
    }

    return { catalog, balance };
  }

  async function startPlanCheckout(planId, btn) {
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = "Redirecting…";
    try {
      await window.StudioAuth.requireAuth();
      const base = workerUrl();
      const headers = await authHeaders();
      const res = await fetch(base + "/credits/plan-checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.alreadyActive) {
        window.StudioToast?.success?.("That plan is already active.");
        await loadCatalogAndBalance();
        return;
      }
      if (data.manageExisting) {
        window.StudioToast?.info?.("Opening billing to change your plan…");
      }
      if (!data.url) throw new Error("No checkout URL returned");
      location.href = data.url;
    } catch (e) {
      window.StudioToast?.error?.(e.message || "Checkout failed");
      btn.disabled = false;
      btn.textContent = prev;
    }
  }

  async function startCustomTopupCheckout(btn) {
    const input = document.getElementById("topup-amount");
    const quote = quoteTopup(input?.value);
    if (!quote) {
      window.StudioToast?.error?.(
        "Enter an amount between $" + topupConfig.minDollars + " and $" + topupConfig.maxDollars
      );
      return;
    }

    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = "Redirecting…";
    try {
      await window.StudioAuth.requireAuth();
      const base = workerUrl();
      const headers = await authHeaders();
      const res = await fetch(base + "/credits/topup-checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ amountDollars: quote.dollars }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.url) throw new Error("No checkout URL returned");
      location.href = data.url;
    } catch (e) {
      window.StudioToast?.error?.(e.message || "Checkout failed");
      btn.disabled = false;
      btn.textContent = prev;
      syncTopupUi();
    }
  }

  async function openBillingPortal() {
    try {
      const base = workerUrl();
      const headers = await authHeaders();
      const res = await fetch(base + "/credits/billing-portal", {
        method: "POST",
        headers,
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Portal failed");
      location.href = data.url;
    } catch (e) {
      window.StudioToast?.error?.(e.message || "Could not open billing portal");
    }
  }

  async function fulfillCheckout(sessionId) {
    const base = workerUrl();
    const headers = await authHeaders();
    const res = await fetch(base + "/credits/fulfill-checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not activate credits");
    document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: data }));
    return data;
  }

  function handleReturnQuery() {
    const q = new URLSearchParams(location.search);
    const sessionId = q.get("session_id");
    if (q.get("sub") === "1") {
      window.StudioToast?.success?.("Payment received - activating your plan…");
      let tries = 0;
      const poll = async () => {
        tries += 1;
        if (sessionId) {
          try {
            await fulfillCheckout(sessionId);
          } catch (e) {
            if (tries >= 10) window.StudioToast?.error?.(e.message);
          }
        }
        const { balance } = await loadCatalogAndBalance();
        if (balance?.planStatus === "active" && balance.totalCredits > 0) {
          window.StudioToast?.success?.("Plan active. Credits are ready.");
          document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: balance }));
          return;
        }
        if (tries < 10) window.setTimeout(poll, 1500);
      };
      void poll();
      history.replaceState({}, "", "pricing.html");
    } else if (q.get("sub") === "canceled") {
      window.StudioToast?.error?.("Checkout canceled.");
      history.replaceState({}, "", "pricing.html");
    } else if (q.get("topup") === "1") {
      window.StudioToast?.success?.("Top-up received - adding credits…");
      void (async () => {
        try {
          if (sessionId) await fulfillCheckout(sessionId);
          const { balance } = await loadCatalogAndBalance();
          document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: balance }));
          window.StudioToast?.success?.("Credits added.");
        } catch (e) {
          window.StudioToast?.error?.(e.message || "Could not add credits");
        }
      })();
      history.replaceState({}, "", "pricing.html");
    } else if (q.get("topup") === "canceled") {
      window.StudioToast?.error?.("Top-up canceled.");
      history.replaceState({}, "", "pricing.html");
    }
  }

  async function claimDeveloperCredits(btn) {
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = "Claiming…";
    try {
      await window.StudioAuth.requireAuth();
      const base = workerUrl();
      const headers = await authHeaders();
      const res = await fetch(base + "/credits/claim-developer", {
        method: "POST",
        headers,
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not claim credits");
      document.dispatchEvent(new CustomEvent("ms:credits-changed", { detail: data }));
      await loadCatalogAndBalance();
      window.StudioToast?.success?.(
        data.alreadyClaimed
          ? "Developer credits already claimed."
          : "50 developer credits added."
      );
      if (data.alreadyClaimed) {
        btn.textContent = "Claimed";
        return;
      }
      btn.textContent = prev;
      btn.disabled = false;
    } catch (e) {
      window.StudioToast?.error?.(e.message || "Could not claim credits");
      btn.disabled = false;
      btn.textContent = prev;
    }
  }

  function bindEvents() {
    document.getElementById("pricing-plans")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-plan-checkout]");
      if (!btn || btn.disabled) return;
      void startPlanCheckout(btn.getAttribute("data-plan-checkout"), btn);
    });
    document.getElementById("topup-amount")?.addEventListener("input", () => {
      syncTopupUi({ showValidation: true });
    });
    document.getElementById("topup-amount")?.addEventListener("blur", () => {
      syncTopupUi({ showValidation: false });
    });
    document.getElementById("btn-topup-purchase")?.addEventListener("click", (e) => {
      void startCustomTopupCheckout(e.currentTarget);
    });
    document.getElementById("btn-dev-credits")?.addEventListener("click", (e) => {
      void claimDeveloperCredits(e.currentTarget);
    });
    document.getElementById("btn-billing-portal")?.addEventListener("click", () => {
      void openBillingPortal();
    });
  }

  async function boot() {
    bindEvents();
    handleReturnQuery();
    applyTopupConfig(DEFAULT_TOPUP);
    renderPlans(FALLBACK_CATALOG, null);
    try {
      await loadCatalogAndBalance();
    } catch (e) {
      window.StudioToast?.error?.(e.message || "Could not load pricing");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    void boot();
  }
})();
