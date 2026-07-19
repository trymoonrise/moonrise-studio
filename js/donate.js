/**
 * Donate - one-time Stripe checkout + supporter wall.
 */
(function () {
  const MESSAGE_KEY = "ms_donate_message_draft_v1";
  const AMOUNT_KEY = "ms_donate_amount_draft_v1";
  const CUSTOM_MODE_KEY = "ms_donate_custom_amount_v1";
  const PRESET_AMOUNTS = [1, 10, 25, 50, 100];
  let donateConfig = {
    oneTimeDefaultDollars: 25,
    donateMinDollars: 1,
    donateMaxDollars: 1000,
    donorMessageMax: 120,
  };

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

  function syncSubmitLabel() {
    const btn = document.getElementById("btn-donate-continue");
    if (!btn || btn.classList.contains("is-loading")) return;
    const quote = readOneTimeAmount();
    btn.textContent = quote ? `Donate ${quote.priceLabel}` : "Continue to checkout";
  }

  function readCustomAmountMode() {
    try {
      return localStorage.getItem(CUSTOM_MODE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function saveCustomAmountMode(open) {
    try {
      if (open) localStorage.setItem(CUSTOM_MODE_KEY, "1");
      else localStorage.removeItem(CUSTOM_MODE_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function isPresetAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && PRESET_AMOUNTS.includes(amount);
  }

  function setCustomAmountOpen(open, options = {}) {
    const panel = document.getElementById("donate-onetime-custom");
    const customBtn = document.querySelector("[data-donate-preset='custom']");
    const input = document.getElementById("donate-onetime-amount");
    const shouldOpen = !!open;
    panel?.toggleAttribute("hidden", !shouldOpen);
    customBtn?.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    saveCustomAmountMode(shouldOpen);
    if (shouldOpen && options.focus !== false) {
      window.requestAnimationFrame(() => {
        input?.focus();
        input?.select?.();
      });
    }
    syncOneTimeAmountUi();
  }

  function syncOneTimeAmountUi() {
    const input = document.getElementById("donate-onetime-amount");
    const wrap = document.getElementById("donate-onetime-amount-wrap");
    const hint = document.getElementById("donate-onetime-amount-hint");
    const err = document.getElementById("donate-onetime-amount-error");
    const presets = document.getElementById("donate-onetime-presets");
    const customOpen = !document.getElementById("donate-onetime-custom")?.hidden;
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
      hint.textContent = `${formatDollars(min)} - ${formatDollars(max)}`;
    }

    const quote = readOneTimeAmount();
    const invalid = customOpen && input?.value && !quote;
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
        const raw = btn.getAttribute("data-donate-preset") || "";
        if (raw === "custom") {
          btn.classList.toggle("is-active", customOpen);
          return;
        }
        const preset = Number(raw);
        btn.classList.toggle(
          "is-active",
          !customOpen && Number.isFinite(current) && preset === current
        );
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

  function renderLeaderboard(entries) {
    const list = document.getElementById("donate-leaderboard-list");
    const LB = window.MoonriseDonateLeaderboard;
    if (!LB || !list) return;
    LB.clearLoading(list);
    LB.renderList(list, entries, { showPlaceholder: true });
  }

  async function loadLeaderboard() {
    const list = document.getElementById("donate-leaderboard-list");
    const LB = window.MoonriseDonateLeaderboard;
    if (!LB || !list) return;

    if (!workerUrl()) {
      list.innerHTML =
        '<li class="ms-donate-lb-empty">Leaderboard unavailable - worker not configured.</li>';
      return;
    }

    LB.renderLoading(list, 5);

    try {
      const entries = await LB.fetchEntries(10);
      renderLeaderboard(entries);
    } catch (e) {
      LB.clearLoading(list);
      list.innerHTML =
        '<li class="ms-donate-lb-empty">Leaderboard unavailable right now. Try again in a moment.</li>';
      console.warn("Donate leaderboard:", e?.message || e);
    }
  }

  async function loadConfig() {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured.");
    const res = await fetch(base + "/donate/config", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load donate info");

    donateConfig = {
      oneTimeDefaultDollars: Number(data.oneTimeDefaultDollars) || 25,
      donateMinDollars: Number(data.donateMinDollars) || 1,
      donateMaxDollars: Number(data.donateMaxDollars) || 1000,
      donorMessageMax: Number(data.donorMessageMax) || 120,
    };

    const input = document.getElementById("donate-onetime-amount");
    const draft = readOneTimeAmountDraft();
    if (input && draft != null) {
      input.value = String(draft);
    }
    const useCustom =
      readCustomAmountMode() || (draft != null && !isPresetAmount(draft));
    setCustomAmountOpen(useCustom, { focus: false });
    if (!useCustom) {
      syncOneTimeAmountUi();
    }
    syncMessageUi();
    if (Array.isArray(data.leaderboardEntries)) {
      renderLeaderboard(data.leaderboardEntries);
    }
    return data;
  }

  async function startCheckout() {
    const btn = document.getElementById("btn-donate-continue");
    setError("");
    setOk("");

    const quote = readOneTimeAmount();
    if (!quote) {
      syncOneTimeAmountUi();
      setError(
        `Enter an amount between ${formatDollars(donateConfig.donateMinDollars)} and ${formatDollars(donateConfig.donateMaxDollars)}`
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
      saveOneTimeAmountDraft(quote.dollars);
      const res = await fetch(base + "/donate-checkout", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          mode: "once",
          message,
          amountDollars: quote.dollars,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.url) throw new Error("No checkout URL returned");
      location.href = data.url;
    } catch (e) {
      setError(e.message || "Could not start checkout");
      resetDonateButton();
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

    setOk("Confirming your donation…");
    try {
      const base = workerUrl();
      const res = await fetch(base + "/donate-fulfill", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not confirm payment");
      setOk("Thank you! Your one-time support was received.");
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
    document.getElementById("btn-donate-continue")?.addEventListener("click", () => {
      void startCheckout();
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
      const preset = btn.getAttribute("data-donate-preset") || "";
      if (preset === "custom") {
        setCustomAmountOpen(true);
        return;
      }
      setCustomAmountOpen(false, { focus: false });
      input.value = preset;
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
    void loadLeaderboard();
    try {
      await loadConfig();
    } catch (e) {
      setError(e.message || "Could not load donate page");
    }
    await loadLeaderboard();
    await fulfillReturn();
  }

  if (document.body.dataset.msAuthFired === "1") boot();
  else document.addEventListener("ms:auth-ready", boot, { once: true });
})();
