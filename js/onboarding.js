/**
 * Creator Studio onboarding wizard (required once; replayable from Settings).
 */
(async function () {
  const TOTAL_STEPS = 7;
  const DRAFT_KEY = "ms_studio_onboarding_draft_v1";
  const FORCE_REPLAY_KEY = "ms_force_studio_onboarding_replay";
  const PAYOUT_METHOD_OPTIONS = [
    {
      id: "venmo",
      name: "Venmo",
      logo: "doc/Venmo.png",
      label: "Venmo username",
      placeholder: "@username",
      hint: "Your Venmo @username or phone number.",
    },
    {
      id: "paypal",
      name: "PayPal",
      logo: "doc/PayPal.png",
      label: "PayPal email",
      placeholder: "you@email.com",
      hint: "PayPal email where you receive payouts.",
    },
    {
      id: "zelle",
      name: "Zelle",
      logo: "doc/Zelle.png",
      label: "Zelle email or phone",
      placeholder: "you@email.com",
      hint: "Email or mobile number linked to Zelle.",
    },
    {
      id: "cashapp",
      name: "Cash App",
      logo: "doc/Cashapp.png",
      label: "Cash App $cashtag",
      placeholder: "$cashtag",
      hint: "Your Cash App $cashtag or url to your cashapp.",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      logo: "doc/ApplePay.png",
      label: "Apple Pay contact",
      placeholder: "you@email.com",
      hint: "Email or phone linked to Apple Pay.",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      logo: "doc/GooglePay.png",
      label: "Google Pay email",
      placeholder: "you@gmail.com",
      hint: "Gmail or phone linked to Google Pay.",
    },
    {
      id: "bitcoin",
      name: "Bitcoin",
      logo: "doc/Bitcoin.png",
      label: "Bitcoin wallet address",
      placeholder: "bc1… or 1…",
      hint: "Your Bitcoin wallet address for payouts.",
    },
    {
      id: "other",
      name: "Other",
      logo:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#f1f5f9"/><circle cx="7" cy="12" r="1.5" fill="#64748b"/><circle cx="12" cy="12" r="1.5" fill="#64748b"/><circle cx="17" cy="12" r="1.5" fill="#64748b"/></svg>',
        ),
      label: "Payout details",
      placeholder: "Describe how you get paid",
      hint: "Tell us how you want to receive payouts (e.g. Wise, check, another app).",
    },
  ];
  const PAYOUT_METHODS = Object.fromEntries(PAYOUT_METHOD_OPTIONS.map((item) => [item.id, item]));

  function normalizePayoutMethodId(methodId) {
    const id = String(methodId || "").trim().toLowerCase();
    if (id === "bank") return "other";
    return id;
  }
  const pageParams = new URLSearchParams(location.search);

  function safeNext(raw) {
    const s = String(raw || "dashboard.html").trim();
    if (!s || s.startsWith("http") || s.includes("://") || s.includes("..")) {
      return "dashboard.html";
    }
    if (s.startsWith("onboarding.html")) return "dashboard.html";
    return s;
  }

  function hasForceReplay() {
    try {
      return sessionStorage.getItem(FORCE_REPLAY_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function clearForceReplay() {
    try {
      sessionStorage.removeItem(FORCE_REPLAY_KEY);
    } catch (_) {
      /* ignore */
    }
    window.StudioAuth?.setForceOnboardingReplay?.(false);
  }

  const isReplay = pageParams.get("replay") === "1" || hasForceReplay();
  const nextUrl = safeNext(pageParams.get("next") || "dashboard.html");

  const P = window.MoonrisePayoutProfile;
  const SC = window.MoonriseSecurityCard;
  if (!P || !SC) {
    console.error("MoonrisePayoutProfile or MoonriseSecurityCard missing");
    return;
  }

  let step = 1;
  let saving = false;
  let verifying = false;
  let cardVerified = false;
  let verifiedCard = null;
  let cachedPayout = P.normalizeProfile({});
  let phoneField = null;
  let autoVerifyTimer = null;
  let authEmail = "";
  let authUserId = "";

  function sessionCardStorageKey() {
    return authUserId ? "ms_onb_sec_card_" + authUserId : "";
  }

  function rememberSessionCard(card) {
    const key = sessionCardStorageKey();
    if (!key || !card?.paymentMethodId) return;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ paymentMethodId: String(card.paymentMethodId) })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function sessionTrustsCard(card) {
    const key = sessionCardStorageKey();
    if (!key || !card?.paymentMethodId) return false;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      return saved?.paymentMethodId === card.paymentMethodId;
    } catch (_) {
      return false;
    }
  }

  function clearSessionCard() {
    const key = sessionCardStorageKey();
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch (_) {
      /* ignore */
    }
  }

  function getVerifyEmail() {
    return String(authEmail || "").trim();
  }

  function readPayoutForm() {
    return {
      payoutMethod: normalizePayoutMethodId(document.getElementById("onb-payout-method")?.value || ""),
      payoutHandle: String(document.getElementById("onb-payout-handle")?.value || "").trim(),
    };
  }

  function readContactForm() {
    return {
      email: String(document.getElementById("onb-contact-email")?.value || "").trim(),
      ...(phoneField?.read() || {}),
    };
  }

  function syncPayoutHandleUi() {
    const method = normalizePayoutMethodId(document.getElementById("onb-payout-method")?.value || "");
    const meta = PAYOUT_METHODS[method];
    const hasMethod = !!meta;
    const field = document.getElementById("onb-payout-handle-field");
    const label = document.getElementById("onb-payout-handle-label");
    const input = document.getElementById("onb-payout-handle");
    const hint = document.getElementById("onb-payout-handle-hint");

    if (field) field.classList.toggle("is-locked", !hasMethod);
    if (label) label.textContent = meta?.label || "Payout details";
    if (input) {
      input.disabled = !hasMethod;
      input.required = hasMethod;
      input.placeholder = hasMethod
        ? meta?.placeholder || "Enter payout details"
        : "Select a payout method first";
    }
    if (hint) {
      hint.textContent = hasMethod
        ? meta?.hint || "Where we send your creator share."
        : "Choose how you get paid above, then enter your details here.";
    }
  }

  function setPayoutPickerOpen(open) {
    const root = document.getElementById("onb-payout-picker");
    const menu = document.getElementById("onb-payout-picker-menu");
    const trigger = document.getElementById("onb-payout-picker-trigger");
    if (!root || !menu || !trigger) return;
    root.classList.toggle("is-open", !!open);
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderPayoutPickerValue(methodId) {
    const normalizedId = normalizePayoutMethodId(methodId);
    const method = PAYOUT_METHODS[normalizedId];
    const input = document.getElementById("onb-payout-method");
    const empty = document.getElementById("onb-payout-picker-empty");
    const selected = document.getElementById("onb-payout-picker-selected");
    const logo = document.getElementById("onb-payout-picker-logo");
    const name = document.getElementById("onb-payout-picker-name");
    if (input) input.value = method ? normalizedId : "";

    if (method) {
      if (empty) empty.hidden = true;
      if (selected) selected.hidden = false;
      if (logo) {
        logo.src = method.logo;
        logo.alt = method.name;
      }
      if (name) name.textContent = method.name;
    } else {
      if (empty) empty.hidden = false;
      if (selected) selected.hidden = true;
      if (logo) {
        logo.removeAttribute("src");
        logo.alt = "";
      }
      if (name) name.textContent = "";
    }

    document.querySelectorAll(".ms-payout-picker-option").forEach((btn) => {
      const on = btn.getAttribute("data-payout-method") === normalizedId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    syncPayoutHandleUi();
  }

  function bindPayoutPicker() {
    const root = document.getElementById("onb-payout-picker");
    const menu = document.getElementById("onb-payout-picker-menu");
    const trigger = document.getElementById("onb-payout-picker-trigger");
    if (!root || !menu || !trigger) return;

    menu.innerHTML = PAYOUT_METHOD_OPTIONS.map((item) => {
      return (
        '<button type="button" class="ms-payout-picker-option" role="option" data-payout-method="' +
        item.id +
        '" aria-selected="false">' +
        '<img class="ms-payout-picker-option-logo" src="' +
        P.escapeAttr(item.logo) +
        '" alt="" width="28" height="28">' +
        '<span class="ms-payout-picker-option-copy">' +
        '<span class="ms-payout-picker-option-name">' +
        P.escapeHtml(item.name) +
        "</span>" +
        "</span>" +
        '<svg class="ms-payout-picker-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' +
        "</button>"
      );
    }).join("");

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      setPayoutPickerOpen(!root.classList.contains("is-open"));
    });

    menu.addEventListener("click", (e) => {
      const opt = e.target.closest?.("[data-payout-method]");
      if (!opt) return;
      renderPayoutPickerValue(opt.getAttribute("data-payout-method") || "");
      setPayoutPickerOpen(false);
      document.getElementById("onb-payout-handle")?.focus();
      if (validatePayoutStep() === null) setError("");
    });

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) setPayoutPickerOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setPayoutPickerOpen(false);
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function validatePayoutStep() {
    const payout = readPayoutForm();
    if (!PAYOUT_METHODS[payout.payoutMethod]) {
      return "Select how you want to get paid.";
    }
    if (payout.payoutHandle.length < 3) {
      return "Enter your payout details.";
    }
    return null;
  }

  function validateContactStep() {
    const contact = readContactForm();
    if (!isValidEmail(contact.email)) {
      return "Enter a valid email.";
    }
    if (!phoneField?.isValid()) {
      return "Enter a valid phone number clients can call for small changes.";
    }
    return null;
  }

  function canAutoVerifyCard() {
    if (verifying || cardVerified) return false;
    if (!getVerifyEmail() || !isValidEmail(getVerifyEmail())) return false;
    if (!document.getElementById("onb-card-agree")?.checked) return false;
    return SC.isCardComplete?.() === true;
  }

  function setCardRetryVisible(visible) {
    const retryBtn = document.getElementById("onb-retry-card");
    if (retryBtn) retryBtn.hidden = !visible;
  }

  function updateStripePartnerLoading() {
    const badge = document.getElementById("onb-stripe-partner");
    if (!badge) return;
    const loading = verifying || autoVerifyTimer != null;
    badge.classList.toggle("is-verifying", loading);
    badge.setAttribute("aria-busy", loading ? "true" : "false");
  }

  function clearVerifiedCardUi() {
    verifiedCard = null;
    cardVerified = false;
    clearSessionCard();
    setSecurityCardUiMode("entry");
    setCardRetryVisible(false);
    syncFinishButton();
  }

  function setSecurityCardUiMode(mode) {
    const el = document.getElementById("onb-security-card-verified");
    const wrap = document.getElementById("onb-security-card-verified-wrap");
    const mount = document.getElementById("onb-security-card-mount");
    const panel = document.getElementById("onb-security-card-panel");
    const verified = mode === "verified";

    if (wrap) {
      wrap.hidden = !verified;
      if (verified) wrap.removeAttribute("hidden");
      else wrap.setAttribute("hidden", "");
    }
    if (mount) {
      mount.hidden = verified;
      if (verified) {
        mount.setAttribute("hidden", "");
        mount.innerHTML = "";
        SC.unmountCard?.();
      } else {
        mount.removeAttribute("hidden");
      }
    }
    if (!verified && el) el.textContent = "";
    if (verified) setCardRetryVisible(false);
    panel?.classList.toggle("is-verified", verified);
  }

  function scheduleAutoVerifyCard() {
    clearTimeout(autoVerifyTimer);
    autoVerifyTimer = null;
    updateStripePartnerLoading();
    if (!canAutoVerifyCard()) return;
    autoVerifyTimer = window.setTimeout(() => {
      autoVerifyTimer = null;
      updateStripePartnerLoading();
      void verifySecurityCard({ auto: true });
    }, 450);
    updateStripePartnerLoading();
  }

  function sb() {
    return window.SiteSupabase.getClient();
  }

  function setError(msg) {
    if (!msg) {
      window.StudioToast?.clear?.();
      return;
    }
    window.StudioToast?.error?.(msg);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") delete parsed.securityCard;
      return P.normalizeProfile(parsed);
    } catch (_) {
      return null;
    }
  }

  function writeDraft(partial) {
    try {
      const safe = { ...(partial || {}) };
      delete safe.securityCard;
      const merged = P.normalizeProfile({ ...cachedPayout, ...safe });
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          email: merged.email,
          phone: merged.phone,
          phoneCountry: merged.phoneCountry,
          payoutMethod: merged.payoutMethod,
          payoutHandle: merged.payoutHandle,
          updatedAt: new Date().toISOString(),
        })
      );
      cachedPayout = merged;
    } catch (_) {
      /* ignore */
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  const MOTION = {
    panelMs: 440,
    exitMs: 260,
    overlapMs: 100,
    contentMs: 520,
  };

  function setTransitioning(active) {
    document.body.classList.toggle("is-transitioning", !!active);
  }

  function waitForPanelTransition(el, fallbackMs) {
    if (!el || prefersReducedMotion()) {
      return waitMs(0);
    }
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", onEnd);
        clearTimeout(timer);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target !== el) return;
        if (event.propertyName === "opacity" || event.propertyName === "filter") {
          finish();
        }
      };
      const timer = setTimeout(finish, fallbackMs);
      el.addEventListener("transitionend", onEnd);
    });
  }

  function updateProgress() {
    const fill = document.getElementById("onb-progress-fill");
    const label = document.getElementById("onb-progress-label");
    const bar = document.getElementById("onb-progress-bar");
    const pct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);
    if (fill) fill.style.setProperty("--onb-progress", String(pct / 100));
    if (bar) bar.setAttribute("aria-valuenow", String(step));
    if (label) {
      label.textContent = step + " / " + TOTAL_STEPS;
      if (!prefersReducedMotion()) {
        label.classList.remove("is-bump");
        void label.offsetWidth;
        label.classList.add("is-bump");
      }
    }
  }

  function pulseMainCard() {
    /* Disabled - scaling the step container while children animate caused visible jank. */
  }

  function revealPanel(panel) {
    if (!panel) return;
    if (prefersReducedMotion()) {
      panel.classList.add("is-visible");
      return;
    }
    panel.classList.remove("is-visible");
    void panel.offsetWidth;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add("is-visible");
      });
    });
  }

  function syncPanelVisibility(activeStep) {
    document.querySelectorAll("[data-onb-step]").forEach((panel) => {
      const id = Number(panel.getAttribute("data-onb-step"));
      const active = id === activeStep;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
      if (!active) {
        panel.classList.remove("is-visible", "is-exiting", "is-onb-in", "ms-panel-anim");
      }
    });
  }

  function resetPanelScroll(panel) {
    panel?.querySelector(".ms-onboard-panel-scroll")?.scrollTo({ top: 0, behavior: "instant" });
  }

  async function hidePanelAnimated(panel) {
    if (!panel) return;
    if (prefersReducedMotion()) {
      panel.hidden = true;
      panel.classList.remove("is-active", "is-visible", "is-exiting", "ms-panel-anim");
      return;
    }
    panel.classList.add("ms-panel-anim", "is-exiting");
    panel.classList.remove("is-visible");
    await waitForPanelTransition(panel, MOTION.exitMs);
    panel.hidden = true;
    panel.classList.remove("is-active", "is-exiting", "ms-panel-anim");
  }

  async function showPanelAnimated(panel) {
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add("is-active", "ms-panel-anim");
    panel.classList.remove("is-exiting");
    if (prefersReducedMotion()) {
      panel.classList.add("is-visible");
      return;
    }
    panel.classList.remove("is-visible");
    void panel.offsetWidth;
    revealPanel(panel);
    await waitForPanelTransition(panel, MOTION.panelMs);
    await waitMs(MOTION.contentMs);
  }

  async function crossfadePanels(currentPanel, nextPanel) {
    if (!nextPanel) return;
    const reduced = prefersReducedMotion();

    if (reduced) {
      if (currentPanel && currentPanel !== nextPanel) {
        currentPanel.hidden = true;
        currentPanel.classList.remove("is-active", "is-visible", "is-exiting", "ms-panel-anim");
      }
      nextPanel.hidden = false;
      nextPanel.classList.add("is-active", "is-visible");
      resetPanelScroll(nextPanel);
      return;
    }

    nextPanel.hidden = false;
    nextPanel.classList.add("is-active", "ms-panel-anim");
    nextPanel.classList.remove("is-visible", "is-exiting");
    resetPanelScroll(nextPanel);
    void nextPanel.offsetWidth;

    if (currentPanel && currentPanel !== nextPanel) {
      currentPanel.classList.add("ms-panel-anim", "is-exiting");
      currentPanel.classList.remove("is-visible");
      await waitMs(MOTION.overlapMs);
      revealPanel(nextPanel);
      await waitForPanelTransition(currentPanel, MOTION.exitMs);
      currentPanel.hidden = true;
      currentPanel.classList.remove("is-active", "is-exiting", "ms-panel-anim", "is-visible");
      await waitMs(MOTION.contentMs);
      return;
    }

    revealPanel(nextPanel);
    await waitForPanelTransition(nextPanel, MOTION.panelMs);
    await waitMs(MOTION.contentMs);
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function prefersReducedMotion() {
    return !!window.StudioMotion?.prefersReducedMotion?.();
  }

  let stepTransition = null;

  async function showStep(n, opts) {
    const target = Math.max(1, Math.min(TOTAL_STEPS, n));
    const direction =
      opts?.direction ||
      (target > step ? "forward" : target < step ? "back" : "none");
    if (target === step && !opts?.force) return;

    if (stepTransition) await stepTransition;

    stepTransition = (async () => {
      const main = document.getElementById("onb-main");
      const currentPanel = document.querySelector(`[data-onb-step="${step}"]`);
      const nextPanel = document.querySelector(`[data-onb-step="${target}"]`);
      const reduced = prefersReducedMotion();

      setTransitioning(true);

      if (main) {
        main.classList.remove("is-forward", "is-back", "is-entering");
        if (direction === "forward") main.classList.add("is-forward");
        if (direction === "back") main.classList.add("is-back");
        if (direction === "none") main.classList.add("is-entering");
      }

      try {
        if (currentPanel && currentPanel !== nextPanel) {
          await crossfadePanels(currentPanel, nextPanel);
        } else if (nextPanel) {
          if (direction === "none" && nextPanel.classList.contains("is-visible")) {
            nextPanel.hidden = false;
            nextPanel.classList.add("is-active", "is-visible");
          } else {
            await showPanelAnimated(nextPanel);
          }
          resetPanelScroll(nextPanel);
        }

        step = target;
        updateProgress();
        pulseMainCard();
        syncPanelVisibility(step);

        if (nextPanel) {
          if (step === 7) {
            document.querySelector(".ms-onboard")?.classList.add("is-celebrating");
          } else {
            document.querySelector(".ms-onboard")?.classList.remove("is-celebrating");
          }
        }

        setError("");
        if (step === 4) {
          prepareSecurityCardStep();
        }
        if (step === 5) {
          syncPayoutHandleUi();
        }
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      } finally {
        setTransitioning(false);
      }
    })();

    await stepTransition;
    stepTransition = null;
  }

  function syncFinishButton() {
    const btn = document.getElementById("onb-finish-setup");
    if (btn) btn.disabled = !cardVerified;
  }

  function showVerifiedCard(card) {
    const el = document.getElementById("onb-security-card-verified");
    const label = card ? SC.formatCardLabel(card) : "";
    const show =
      !!card &&
      P.isVerifiedSecurityCard?.(card) &&
      !!String(card.last4 || "").trim() &&
      !!label &&
      sessionTrustsCard(card);
    if (show) {
      if (el) el.textContent = label;
      setSecurityCardUiMode("verified");
      document.getElementById("onb-security-card-panel")?.classList.remove("is-load-error");
    } else {
      setSecurityCardUiMode("entry");
    }
  }

  function applyVerifiedCard(card) {
    if (!P.isVerifiedSecurityCard?.(card) || !String(card?.last4 || "").trim()) {
      clearVerifiedCardUi();
      return;
    }
    rememberSessionCard(card);
    verifiedCard = card;
    cardVerified = true;
    cachedPayout = P.normalizeProfile({ ...cachedPayout, securityCard: card });
    showVerifiedCard(card);
    syncFinishButton();
  }

  function prepareSecurityCardStep() {
    if (cardVerified && verifiedCard && sessionTrustsCard(verifiedCard)) {
      showVerifiedCard(verifiedCard);
      return;
    }
    clearVerifiedCardUi();
    void mountSecurityCard();
  }

  async function mountSecurityCard() {
    const host = document.getElementById("onb-security-card-mount");
    const panel = document.getElementById("onb-security-card-panel");
    if (!host || cardVerified) return;
    setSecurityCardUiMode("entry");
    setCardRetryVisible(false);
    host.classList.add("is-loading");
    setError("");
    try {
      host.innerHTML = "";
      await SC.mountCard(host, {
        elementId: "onb-security-card-element",
        onChange: (event) => {
          if (!event?.complete) {
            clearTimeout(autoVerifyTimer);
            autoVerifyTimer = null;
            updateStripePartnerLoading();
          }
          scheduleAutoVerifyCard();
        },
      });
      panel?.classList.remove("is-load-error");
    } catch (e) {
      panel?.classList.add("is-load-error");
      setCardRetryVisible(true);
      setError(e.message || "Could not load security card form");
    } finally {
      host.classList.remove("is-loading");
    }
  }

  function collectStepDraft() {
    if (step === 5) {
      writeDraft(readPayoutForm());
    }
    if (step === 6 && phoneField) {
      writeDraft({ ...readPayoutForm(), ...readContactForm() });
    }
  }

  function validateCurrentStep() {
    if (step === 3) {
      if (!document.getElementById("onb-legal-agree")?.checked) {
        return "Please agree to the Privacy Policy and Terms of Service to continue.";
      }
      return null;
    }
    if (step === 4) {
      if (!document.getElementById("onb-card-agree")?.checked) {
        return "Please authorize Moonrise to store and charge this card to continue.";
      }
      if (!cardVerified) {
        return "Complete your security card before continuing.";
      }
      return null;
    }
    if (step === 5) {
      const payoutErr = validatePayoutStep();
      if (payoutErr) return payoutErr;
      if (!cardVerified) {
        return "Go back and add your security card.";
      }
      return null;
    }
    if (step === 6) {
      const contactErr = validateContactStep();
      if (contactErr) return contactErr;
      const payoutErr = validatePayoutStep();
      if (payoutErr) return payoutErr;
      if (!cardVerified) {
        return "Go back and add your security card.";
      }
      return null;
    }
    return null;
  }

  async function verifySecurityCard(options) {
    const opts = options && typeof options === "object" ? options : {};
    if (verifying || cardVerified) return;
    const email = getVerifyEmail();
    if (!email || !isValidEmail(email)) {
      if (!opts.auto) setError("Your account needs a valid email before adding a security card.");
      return;
    }
    if (!document.getElementById("onb-card-agree")?.checked) {
      if (!opts.auto) setError("Please authorize Moonrise to store and charge this card to continue.");
      return;
    }
    if (SC.isCardComplete?.() !== true) {
      if (!opts.auto) setError("Enter your card details to continue.");
      return;
    }

    verifying = true;
    updateStripePartnerLoading();
    const btn = document.getElementById("onb-finish-setup");
    const prevLabel = btn?.textContent || "Continue";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Verifying…";
    }
    setError("");
    setCardRetryVisible(false);
    try {
      const card = await SC.verifyCard({ email });
      applyVerifiedCard(card);
      if (!opts.auto) {
        window.StudioToast?.success?.("Security card on file.");
      }
    } catch (e) {
      setError(e.message || "Could not add security card");
      setCardRetryVisible(true);
      setSecurityCardUiMode("entry");
    } finally {
      verifying = false;
      updateStripePartnerLoading();
      if (btn) {
        btn.textContent = prevLabel;
      }
      syncFinishButton();
    }
  }

  async function persistComplete() {
    const user = await window.StudioAuth.getUser();
    if (!user) throw new Error("Not signed in");
    if (!cardVerified || !P.isVerifiedSecurityCard?.(verifiedCard)) {
      throw new Error("Complete your security card before continuing.");
    }

    const payoutForm = readPayoutForm();
    const contact = readContactForm();
    const payout = P.normalizeProfile({
      ...cachedPayout,
      ...payoutForm,
      email: contact.email,
      phone: contact.phone,
      phoneCountry: contact.phoneCountry,
      securityCard: verifiedCard || cachedPayout.securityCard,
      completedAt: new Date().toISOString(),
      onboardingStatus: "complete",
      skippedAt: "",
    });

    const profile = await window.StudioAuth.getProfile();
    const branding = P.brandingDefaultsFrom(profile);
    branding.studioOnboardedAt = new Date().toISOString();

    const { error } = await window.StudioAuth.withTimeout(
      sb()
        .from("profiles")
        .update({
          payout_profile: payout,
          branding_defaults: branding,
        })
        .eq("id", user.id),
      8000,
      "Save onboarding"
    );
    if (error) throw error;

    cachedPayout = payout;
    clearDraft();
    clearForceReplay();
  }

  async function goNext() {
    if (stepTransition) return;
    const err = validateCurrentStep();
    if (err) {
      setError(err);
      return;
    }
    collectStepDraft();

    if (step === 6) {
      if (saving) return;
      saving = true;
      const btn = document.querySelector('[data-onb-step="6"] [data-onb-next]');
      if (btn) btn.disabled = true;
      try {
        await persistComplete();
        await showStep(7, { direction: "forward" });
        const finder = document.getElementById("onb-go-finder");
        const dash = document.getElementById("onb-go-dash");
        if (finder) finder.href = "leads.html";
        if (dash) dash.href = nextUrl;
      } catch (e) {
        setError(e.message || "Could not save your profile.");
        if (btn) btn.disabled = false;
      } finally {
        saving = false;
      }
      return;
    }

    if (step >= TOTAL_STEPS) {
      location.assign(nextUrl);
      return;
    }
    await showStep(step + 1, { direction: "forward" });
  }

  async function goBack() {
    if (stepTransition) return;
    setError("");
    if (step <= 1) return;
    await showStep(step - 1, { direction: "back" });
  }

  function fillForm(profile, user) {
    const draft = readDraft();
    const fromDb = P.normalizeProfile(profile?.payout_profile || {});
    cachedPayout = draft ? mergePayout(draft, fromDb) : fromDb;
    authEmail = String(user?.email || cachedPayout.email || "").trim();

    const contactEmailEl = document.getElementById("onb-contact-email");
    if (contactEmailEl) {
      contactEmailEl.value = cachedPayout.email || authEmail || "";
    }
    const payoutMethodEl = document.getElementById("onb-payout-method");
    if (payoutMethodEl) {
      renderPayoutPickerValue(cachedPayout.payoutMethod || "");
    } else {
      syncPayoutHandleUi();
    }
    const payoutHandleEl = document.getElementById("onb-payout-handle");
    if (payoutHandleEl) {
      payoutHandleEl.value = cachedPayout.payoutHandle || "";
    }
    phoneField?.fillPhoneFromSaved(cachedPayout.phone || "", cachedPayout.phoneCountry);
  }

  function mergePayout(primary, fallback) {
    const a = P.normalizeProfile(primary);
    const b = P.normalizeProfile(fallback);
    const savedCard =
      P.isVerifiedSecurityCard?.(b.securityCard) && String(b.securityCard.last4 || "").trim()
        ? b.securityCard
        : null;
    return P.normalizeProfile({
      ...b,
      ...a,
      email: a.email || b.email,
      phone: a.phone || b.phone,
      phoneCountry: a.phoneCountry || b.phoneCountry,
      payoutMethod: a.payoutMethod || b.payoutMethod,
      payoutHandle: a.payoutHandle || b.payoutHandle,
      securityCard: savedCard,
      onboardingStatus: b.onboardingStatus,
      completedAt: b.completedAt,
      skippedAt: b.skippedAt,
    });
  }

  async function hydrateVerifiedCard(profile) {
    verifiedCard = null;
    cardVerified = false;
    setSecurityCardUiMode("entry");
    setCardRetryVisible(false);
    syncFinishButton();

    const dbCard = P.normalizeProfile(profile?.payout_profile || {}).securityCard;
    if (!P.isVerifiedSecurityCard?.(dbCard) || !String(dbCard.last4 || "").trim()) {
      return;
    }
    if (sessionTrustsCard(dbCard)) {
      verifiedCard = dbCard;
      cardVerified = true;
      cachedPayout = P.normalizeProfile({ ...cachedPayout, securityCard: dbCard });
      syncFinishButton();
    }
  }

  function bindFlipCards() {
    const cards = document.querySelectorAll(".ms-onboard-flip-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", flipped ? "true" : "false");
      });
    });
  }

  async function boot() {
    const session = await window.StudioAuth.requireAuth();
    if (!session) return;

    document.querySelector(".ms-onboard")?.classList.add("is-ready");
    syncPanelVisibility(1);
    document.querySelector('[data-onb-step="1"]')?.classList.add("is-visible");

    await window.StudioAuth.ensureProfile?.();

    phoneField = P.createPhoneField({
      root: "onb-phone-root",
      country: "onb-phone-country",
      trigger: "onb-phone-trigger",
      flag: "onb-phone-flag",
      dial: "onb-phone-dial",
      menu: "onb-phone-menu",
      input: "onb-phone",
    });
    phoneField.bind();
    bindPayoutPicker();

    const user = await window.StudioAuth.getUser();
    const profile = await window.StudioAuth.getProfile();
    authUserId = String(user?.id || "").trim();
    authEmail = String(user?.email || "").trim();

    if (!isReplay && window.StudioAuth.studioOnboarded?.(profile)) {
      location.replace(nextUrl);
      return;
    }

    fillForm(profile, user);
    await hydrateVerifiedCard(profile);

    document.querySelectorAll("[data-onb-next]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        void goNext();
      });
    });
    document.querySelectorAll("[data-onb-back]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        void goBack();
      });
    });

    document.getElementById("onb-legal-agree")?.addEventListener("change", () => {
      if (document.getElementById("onb-legal-agree")?.checked) setError("");
    });

    document.getElementById("onb-card-agree")?.addEventListener("change", () => {
      if (document.getElementById("onb-card-agree")?.checked) {
        setError("");
        scheduleAutoVerifyCard();
      } else {
        clearTimeout(autoVerifyTimer);
        autoVerifyTimer = null;
        updateStripePartnerLoading();
      }
    });

    document.getElementById("onb-contact-email")?.addEventListener("input", () => {
      if (validateContactStep() === null) setError("");
    });

    document.getElementById("onb-payout-handle")?.addEventListener("input", () => {
      if (validatePayoutStep() === null) setError("");
    });

    document.getElementById("onb-retry-card")?.addEventListener("click", (e) => {
      e.preventDefault();
      setError("");
      clearVerifiedCardUi();
      void mountSecurityCard().then(() => {
        const panel = document.getElementById("onb-security-card-panel");
        if (panel?.classList.contains("is-load-error")) {
          setCardRetryVisible(true);
        }
      });
    });

    document.getElementById("onb-go-dash")?.addEventListener("click", (e) => {
      e.preventDefault();
      location.assign(nextUrl);
    });

    bindFlipCards();

    await showStep(1, { direction: "none", force: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();
