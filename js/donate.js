/**
 * Donate — MVP+ via Stripe + supporter wall.
 */
(function () {
  const MESSAGE_KEY = "ms_donate_message_draft_v1";
  const AMOUNT_KEY = "ms_donate_amount_draft_v1";
  let donateMode = "monthly";
  let donateConfig = {
    mvpPlus: false,
    hasActiveSubscription: false,
    canManageBilling: false,
    monthlyPriceLabel: "$5/mo",
    monthlyDefaultDollars: 5,
    oneTimePriceLabel: "$25",
    oneTimeDefaultDollars: 25,
    donateMinDollars: 1,
    donateMaxDollars: 1000,
    donorMessageMax: 120,
  };

  function workerUrl() {
    if (typeof window.resolveWorkerUrl === "function") return window.resolveWorkerUrl();
    return String(window.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function authHeaders() {
    const session = await window.StudioAuth.getSession();
    if (!session?.access_token) throw new Error("Sign in required");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  function setError(msg) {
    const el = document.getElementById("donate-error");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function setOk(msg) {
    const el = document.getElementById("donate-ok");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function defaultBenefits() {
    return Array.isArray(window.MVP_PLUS_BENEFITS) && window.MVP_PLUS_BENEFITS.length
      ? window.MVP_PLUS_BENEFITS
      : [
          "View code and download HTML in Builder",
          "Everything free in the Store",
          "Support Moonrise — keep generation free for everyone",
        ];
  }

  function renderBenefits(list) {
    const ul = document.getElementById("donate-benefits");
    if (!ul) return;
    const items = Array.isArray(list) && list.length ? list : defaultBenefits();
    ul.innerHTML = items
      .map(
        (item) =>
          "<li><span class=\"ms-donate-perk-icon\" aria-hidden=\"true\">" +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
          "</span><span>" +
          escapeHtml(item) +
          "</span></li>"
      )
      .join("");
  }

  function readMessageDraft() {
    try {
      return localStorage.getItem(MESSAGE_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function saveMessageDraft(value) {
    try {
      localStorage.setItem(MESSAGE_KEY, String(value || ""));
    } catch (_) {
      /* ignore */
    }
  }

  function formatDollars(dollars) {
    const value = Number(dollars);
    if (!Number.isFinite(value)) return "$0";
    const cents = Math.round(value * 100);
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  }

  function readOneTimeAmountDraft() {
    try {
      const raw = localStorage.getItem(AMOUNT_KEY);
      if (raw == null) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function saveOneTimeAmountDraft(value) {
    try {
      if (value == null || !Number.isFinite(Number(value))) {
        localStorage.removeItem(AMOUNT_KEY);
        return;
      }
      localStorage.setItem(AMOUNT_KEY, String(value));
    } catch (_) {
      /* ignore */
    }
  }

  function quoteDonationAmount(dollars) {
    const amount = Number(dollars);
    if (!Number.isFinite(amount)) return null;
    if (amount < donateConfig.donateMinDollars || amount > donateConfig.donateMaxDollars) return null;
    const priceCents = Math.round(amount * 100);
    if (priceCents < donateConfig.donateMinDollars * 100) return null;
    return {
      dollars: priceCents / 100,
      priceCents,
      priceLabel: formatDollars(priceCents / 100),
    };
  }

  function readOneTimeAmount() {
    const input = document.getElementById("donate-onetime-amount");
    if (!input) {
      return quoteDonationAmount(donateConfig.oneTimeDefaultDollars);
    }
    return quoteDonationAmount(input.value);
  }

  function monthlyAmountLabel() {
    return formatDollars(donateConfig.monthlyDefaultDollars);
  }

  function syncMonthlyPrice() {
    const price = document.getElementById("donate-monthly-price");
    if (!price) return;
    const dollars = monthlyAmountLabel();
    price.innerHTML = `${escapeHtml(dollars)}<span>/mo</span>`;
  }

  function syncSubmitLabel() {
    const btn = document.getElementById("btn-donate-continue");
    if (!btn || btn.classList.contains("is-loading")) return;
    if (donateMode === "once") {
      const quote = readOneTimeAmount();
      btn.textContent = quote ? `Donate ${quote.priceLabel}` : "Continue to checkout";
      return;
    }
    btn.textContent = `Start MVP+ · ${monthlyAmountLabel()}/mo`;
  }

  function setDonateMode(mode) {
    const next = mode === "once" ? "once" : "monthly";
    if (next === "monthly" && donateConfig.mvpPlus) {
      donateMode = "once";
    } else {
      donateMode = next;
    }

    const monthlyTab = document.getElementById("donate-tab-monthly");
    const onceTab = document.getElementById("donate-tab-once");
    const monthlyPanel = document.getElementById("donate-panel-monthly");
    const oncePanel = document.getElementById("donate-panel-once");

    monthlyTab?.classList.toggle("is-active", donateMode === "monthly");
    onceTab?.classList.toggle("is-active", donateMode === "once");
    monthlyTab?.setAttribute("aria-selected", donateMode === "monthly" ? "true" : "false");
    onceTab?.setAttribute("aria-selected", donateMode === "once" ? "true" : "false");
    if (monthlyPanel) monthlyPanel.hidden = donateMode !== "monthly";
    if (oncePanel) oncePanel.hidden = donateMode !== "once";
    syncSubmitLabel();
  }

  function syncOneTimeAmountUi() {
    const input = document.getElementById("donate-onetime-amount");
    const wrap = document.getElementById("donate-onetime-amount-wrap");
    const hint = document.getElementById("donate-onetime-amount-hint");
    const err = document.getElementById("donate-onetime-amount-error");
    const presets = document.getElementById("donate-onetime-presets");
    const min = donateConfig.donateMinDollars;
    const max = donateConfig.donateMaxDollars;

    if (input) {
      input.min = String(min);
      input.max = String(max);
      if (!input.value) {
        const draft = readOneTimeAmountDraft();
        input.value = String(draft ?? donateConfig.oneTimeDefaultDollars);
      }
    }
    if (hint) {
      hint.textContent = `${formatDollars(min)} – ${formatDollars(max)}`;
    }

    const quote = readOneTimeAmount();
    const invalid = input?.value && !quote;
    wrap?.classList.toggle("is-invalid", !!invalid);
    if (err) {
      err.hidden = !invalid;
      err.textContent = invalid
        ? `Enter an amount between ${formatDollars(min)} and ${formatDollars(max)}`
        : "";
    }

    if (presets && input) {
      const current = Number(input.value);
      presets.querySelectorAll("[data-donate-preset]").forEach((btn) => {
        const preset = Number(btn.getAttribute("data-donate-preset"));
        btn.classList.toggle("is-active", Number.isFinite(current) && preset === current);
      });
    }

    syncSubmitLabel();
  }

  function resetDonateButton() {
    const btn = document.getElementById("btn-donate-continue");
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove("is-loading");
    syncSubmitLabel();
  }

  function syncMessageUi() {
    const max = Math.max(40, Number(donateConfig.donorMessageMax) || 120);
    const field = document.getElementById("donate-message");
    const count = document.getElementById("donate-message-count");
    if (field) {
      field.maxLength = max;
      if (!field.value && readMessageDraft()) {
        field.value = readMessageDraft().slice(0, max);
      }
    }
    updateMessageCount();
    if (count && !field) count.textContent = `0 / ${max}`;
  }

  function updateMessageCount() {
    const field = document.getElementById("donate-message");
    const count = document.getElementById("donate-message-count");
    const max = Math.max(40, Number(donateConfig.donorMessageMax) || 120);
    if (!count) return;
    const len = field ? String(field.value || "").length : 0;
    count.textContent = `${len} / ${max}`;
  }

  function readDonorMessage() {
    const field = document.getElementById("donate-message");
    const max = Math.max(40, Number(donateConfig.donorMessageMax) || 120);
    return String(field?.value || "").trim().slice(0, max);
  }

  function setActiveUi(active, canManage) {
    const card = document.getElementById("donate-checkout-card");
    const activeBanner = document.getElementById("donate-active-banner");
    const manageBtn = document.getElementById("btn-manage-stripe");

    card?.classList.toggle("is-mvp-active", !!active);
    if (activeBanner) activeBanner.hidden = !active;
    if (manageBtn) manageBtn.hidden = !canManage;

    if (active) {
      setDonateMode("once");
    } else {
      setDonateMode(donateMode === "once" ? "once" : "monthly");
    }

    syncOneTimeAmountUi();
    syncMonthlyPrice();
  }

  function rankClass(rank) {
    if (rank === 1) return " is-gold";
    if (rank === 2) return " is-silver";
    if (rank === 3) return " is-bronze";
    return "";
  }

  function renderLeaderboard(entries) {
    const list = document.getElementById("donate-leaderboard-list");
    if (!list) return;

    if (!Array.isArray(entries) || !entries.length) {
      list.innerHTML =
        '<li class="ms-donate-lb-empty">Be the first on the wall — donate and leave a note.</li>';
      return;
    }

    list.innerHTML = entries
      .map((entry) => {
        const rank = Number(entry.rank) || 0;
        const name = escapeHtml(entry.name || "Supporter");
        const total = escapeHtml(entry.totalLabel || "");
        const message = String(entry.message || "").trim();
        const avatar = entry.avatarUrl
          ? `<img class="ms-donate-lb-avatar" src="${escapeHtml(entry.avatarUrl)}" alt="" width="32" height="32" loading="lazy" decoding="async">`
          : `<span class="ms-donate-lb-avatar is-fallback" aria-hidden="true">${escapeHtml(entry.initials || "?")}</span>`;
        const quote = message
          ? `<blockquote class="ms-donate-lb-quote">“${escapeHtml(message)}”</blockquote>`
          : "";

        return (
          `<li class="ms-donate-lb-item${rankClass(rank)}">` +
          `<div class="ms-donate-lb-rank" aria-label="Rank ${rank}">#${rank}</div>` +
          `<div class="ms-donate-lb-body">` +
          `<div class="ms-donate-lb-person">` +
          avatar +
          `<div class="ms-donate-lb-meta">` +
          `<strong class="ms-donate-lb-name">${name}</strong>` +
          `<span class="ms-donate-lb-amount">${total}</span>` +
          `</div></div>` +
          quote +
          `</div></li>`
        );
      })
      .join("");
  }

  async function loadLeaderboard() {
    const base = workerUrl();
    if (!base) return;
    try {
      const headers = await authHeaders();
      let res = await fetch(base + "/donate/leaderboard?limit=10", { headers });
      let data = await res.json().catch(() => ({}));

      if (!res.ok) {
        res = await fetch(base + "/donate/config", { headers });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load leaderboard");
        renderLeaderboard(data.leaderboardEntries);
        return;
      }

      renderLeaderboard(data.entries);
    } catch (_) {
      renderLeaderboard([]);
      const list = document.getElementById("donate-leaderboard-list");
      if (list) {
        list.innerHTML =
          '<li class="ms-donate-lb-empty">Leaderboard unavailable right now. Try again in a moment.</li>';
      }
    }
  }

  async function loadConfig() {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured.");
    const res = await fetch(base + "/donate/config", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load donate info");

    donateConfig = {
      mvpPlus: !!data.mvpPlus,
      hasActiveSubscription: !!data.hasActiveSubscription,
      canManageBilling: !!data.canManageBilling,
      monthlyPriceLabel: String(data.monthlyPriceLabel || "$5/mo"),
      monthlyDefaultDollars: Number(data.monthlyDefaultDollars) || 5,
      oneTimePriceLabel: String(data.oneTimePriceLabel || "$25"),
      oneTimeDefaultDollars: Number(data.oneTimeDefaultDollars) || 25,
      donateMinDollars: Number(data.donateMinDollars) || 1,
      donateMaxDollars: Number(data.donateMaxDollars) || 1000,
      donorMessageMax: Number(data.donorMessageMax) || 120,
    };

    renderBenefits(defaultBenefits());
    syncOneTimeAmountUi();
    syncMonthlyPrice();
    syncMessageUi();
    setActiveUi(donateConfig.mvpPlus, donateConfig.canManageBilling);
    if (Array.isArray(data.leaderboardEntries)) {
      renderLeaderboard(data.leaderboardEntries);
    }
    return data;
  }

  async function startCheckout(mode) {
    const isOneTime = mode === "once";
    const btn = document.getElementById("btn-donate-continue");
    setError("");
    setOk("");

    const quote = isOneTime
      ? readOneTimeAmount()
      : quoteDonationAmount(donateConfig.monthlyDefaultDollars);
    if (!quote) {
      if (isOneTime) syncOneTimeAmountUi();
      setError(
        isOneTime
          ? `Enter an amount between ${formatDollars(donateConfig.donateMinDollars)} and ${formatDollars(donateConfig.donateMaxDollars)}`
          : "Could not start monthly checkout"
      );
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.textContent = "Opening checkout…";
    }

    try {
      const base = workerUrl();
      if (!base) throw new Error("Worker URL is not configured.");
      const message = readDonorMessage();
      saveMessageDraft(message);
      if (isOneTime) saveOneTimeAmountDraft(quote.dollars);
      const res = await fetch(base + "/donate-checkout", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          mode: isOneTime ? "once" : "monthly",
          message,
          amountDollars: quote.dollars,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!isOneTime && data.alreadyActive) {
        setActiveUi(true, donateConfig.canManageBilling);
        setOk("You already have an active MVP+ subscription.");
        resetDonateButton();
        return;
      }
      if (!data.url) throw new Error("No checkout URL returned");
      location.href = data.url;
    } catch (e) {
      setError(e.message || "Could not start checkout");
      resetDonateButton();
    }
  }

  async function openBillingPortal() {
    const btn = document.getElementById("btn-manage-stripe");
    setError("");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Opening Stripe…";
    }
    try {
      const base = workerUrl();
      if (!base) throw new Error("Worker URL is not configured.");
      const res = await fetch(base + "/donate/billing-portal", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open billing portal");
      if (!data.url) throw new Error("No portal URL returned");
      location.href = data.url;
    } catch (e) {
      setError(e.message || "Could not open Stripe billing");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Manage subscription";
      }
    }
  }

  async function fulfillReturn() {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (params.get("canceled") === "1") {
      window.StudioToast?.error?.("Checkout canceled.");
      history.replaceState({}, "", "donate.html");
      return;
    }
    if (params.get("paid") !== "1" || !sessionId) return;

    const isOneTime = params.get("mode") === "once";
    setOk(isOneTime ? "Confirming your donation…" : "Confirming your subscription…");
    try {
      const base = workerUrl();
      const res = await fetch(base + "/donate-fulfill", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not confirm payment");
      if (data.oneTime) {
        setOk("Thank you! Your one-time support was received.");
      } else {
        donateConfig.mvpPlus = true;
        donateConfig.hasActiveSubscription = true;
        donateConfig.canManageBilling = true;
        setActiveUi(true, true);
        setOk("Thank you! MVP+ is now active on your account.");
        document.dispatchEvent(
          new CustomEvent("ms:credits-changed", {
            detail: { mvpPlus: true },
          })
        );
      }
      try {
        localStorage.removeItem(MESSAGE_KEY);
      } catch (_) {
        /* ignore */
      }
      history.replaceState({}, "", "donate.html");
      await loadLeaderboard();
    } catch (e) {
      setError(e.message || "Payment received but confirmation failed. Refresh in a moment.");
    }
  }

  function bindUi() {
    document.getElementById("donate-modes")?.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-mode]");
      if (!tab) return;
      setDonateMode(tab.getAttribute("data-mode"));
    });

    document.getElementById("btn-donate-continue")?.addEventListener("click", () => {
      void startCheckout(donateMode);
    });

    document.getElementById("btn-manage-stripe")?.addEventListener("click", () => {
      void openBillingPortal();
    });

    document.getElementById("donate-message")?.addEventListener("input", () => {
      updateMessageCount();
      saveMessageDraft(readDonorMessage());
    });

    document.getElementById("donate-onetime-amount")?.addEventListener("input", () => {
      saveOneTimeAmountDraft(document.getElementById("donate-onetime-amount")?.value);
      syncOneTimeAmountUi();
    });

    document.getElementById("donate-onetime-amount")?.addEventListener("blur", () => {
      syncOneTimeAmountUi();
    });

    document.getElementById("donate-onetime-presets")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-donate-preset]");
      if (!btn) return;
      const input = document.getElementById("donate-onetime-amount");
      if (!input) return;
      input.value = btn.getAttribute("data-donate-preset") || "";
      saveOneTimeAmountDraft(input.value);
      syncOneTimeAmountUi();
    });
  }

  async function boot() {
    try {
      await window.StudioAuth?.requireAuth?.();
    } catch (_) {
      location.href = "login.html?next=donate.html";
      return;
    }
    bindUi();
    try {
      await loadConfig();
      await loadLeaderboard();
    } catch (e) {
      setError(e.message || "Could not load donate page");
    }
    await fulfillReturn();
  }

  if (document.body.dataset.msAuthFired === "1") boot();
  else document.addEventListener("ms:auth-ready", boot, { once: true });
})();
