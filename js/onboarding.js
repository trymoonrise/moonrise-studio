/**
 * Creator Studio onboarding wizard (required once; replayable from Settings).
 */
(async function () {
  const TOTAL_STEPS = 6;
  const DRAFT_KEY = "ms_studio_onboarding_draft_v1";
  const FORCE_REPLAY_KEY = "ms_force_studio_onboarding_replay";
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

  function canAutoVerifyCard() {
    if (verifying || cardVerified) return false;
    const email = String(document.getElementById("onb-email")?.value || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (!document.getElementById("onb-card-agree")?.checked) return false;
    return SC.isCardComplete?.() === true;
  }

  function setCardRetryVisible(visible) {
    const retryBtn = document.getElementById("onb-retry-card");
    if (retryBtn) retryBtn.hidden = !visible;
  }

  function scheduleAutoVerifyCard() {
    clearTimeout(autoVerifyTimer);
    if (!canAutoVerifyCard()) return;
    autoVerifyTimer = window.setTimeout(() => {
      void verifySecurityCard({ auto: true });
    }, 450);
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
    /* Disabled — scaling the step container while children animate caused visible jank. */
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
          if (step === 6) {
            document.querySelector(".ms-onboard")?.classList.add("is-celebrating");
          } else {
            document.querySelector(".ms-onboard")?.classList.remove("is-celebrating");
          }
        }

        setError("");
        if (step === 5 && !cardVerified) {
          void mountSecurityCard();
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
    const wrap = document.getElementById("onb-security-card-verified-wrap");
    const mount = document.getElementById("onb-security-card-mount");
    const panel = document.getElementById("onb-security-card-panel");
    if (card) {
      if (el) el.textContent = SC.formatCardLabel(card);
      if (wrap) wrap.hidden = false;
      if (mount) mount.hidden = true;
      setCardRetryVisible(false);
      panel?.classList.remove("is-load-error");
    } else {
      if (wrap) wrap.hidden = true;
      if (el) el.textContent = "";
    }
  }

  function applyVerifiedCard(card) {
    verifiedCard = card || null;
    cardVerified = !!card;
    if (card) {
      cachedPayout = P.normalizeProfile({ ...cachedPayout, securityCard: card });
      writeDraft({ securityCard: card });
    }
    showVerifiedCard(card);
    syncFinishButton();
  }

  async function mountSecurityCard() {
    const host = document.getElementById("onb-security-card-mount");
    const panel = document.getElementById("onb-security-card-panel");
    if (!host || cardVerified) return;
    host.hidden = false;
    panel?.classList.remove("is-load-error");
    setCardRetryVisible(false);
    host.classList.add("is-loading");
    setError("");
    try {
      host.innerHTML = "";
      await SC.mountCard(host, {
        elementId: "onb-security-card-element",
        onChange: () => {
          scheduleAutoVerifyCard();
        },
      });
    } catch (e) {
      panel?.classList.add("is-load-error");
      setCardRetryVisible(true);
      setError(e.message || "Could not load card form");
    } finally {
      host.classList.remove("is-loading");
    }
  }

  function collectStepDraft() {
    if (step === 4 && phoneField) {
      const phone = phoneField.read();
      writeDraft(phone);
    }
    if (step === 5) {
      const email = String(document.getElementById("onb-email")?.value || "").trim();
      const phone = phoneField ? phoneField.read() : {};
      writeDraft({ email, ...phone, securityCard: verifiedCard || cachedPayout.securityCard });
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
      if (!phoneField?.isValid()) {
        return "Enter a valid phone number clients can call for small changes.";
      }
      return null;
    }
    if (step === 5) {
      const email = String(document.getElementById("onb-email")?.value || "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Enter a valid email.";
      }
      if (!phoneField?.isValid()) {
        return "Go back and enter a valid phone number.";
      }
      if (!document.getElementById("onb-card-agree")?.checked) {
        return "Please authorize storing your card for payouts.";
      }
      if (!cardVerified) {
        return "Connect your payout card before continuing.";
      }
      return null;
    }
    return null;
  }

  async function verifySecurityCard(options) {
    const opts = options && typeof options === "object" ? options : {};
    if (verifying || cardVerified) return;
    const email = String(document.getElementById("onb-email")?.value || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!opts.auto) setError("Enter a valid email first.");
      return;
    }
    if (!document.getElementById("onb-card-agree")?.checked) {
      if (!opts.auto) setError("Please authorize storing your card for payouts.");
      return;
    }
    if (SC.isCardComplete?.() !== true) {
      if (!opts.auto) setError("Enter your full card details first.");
      return;
    }

    verifying = true;
    const btn = document.getElementById("onb-finish-setup");
    const prevLabel = btn?.textContent || "Continue";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Connecting…";
    }
    setError("");
    setCardRetryVisible(false);
    try {
      const card = await SC.verifyCard({ email });
      applyVerifiedCard(card);
      if (!opts.auto) {
        window.StudioToast?.success?.("Payout card connected.");
      }
    } catch (e) {
      setError(e.message || "Could not connect payout card");
      setCardRetryVisible(true);
      const host = document.getElementById("onb-security-card-mount");
      if (host && !cardVerified) host.hidden = false;
    } finally {
      verifying = false;
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
      throw new Error("Connect your payout card before continuing.");
    }

    const email = String(document.getElementById("onb-email")?.value || "").trim();
    const phone = phoneField.read();
    const payout = P.normalizeProfile({
      ...cachedPayout,
      email,
      phone: phone.phone,
      phoneCountry: phone.phoneCountry,
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

    if (step === 5) {
      if (saving) return;
      saving = true;
      const btn = document.getElementById("onb-finish-setup");
      if (btn) btn.disabled = true;
      try {
        await persistComplete();
        await showStep(6, { direction: "forward" });
        const finder = document.getElementById("onb-go-finder");
        const dash = document.getElementById("onb-go-dash");
        if (finder) finder.href = "leads.html";
        if (dash) dash.href = nextUrl;
      } catch (e) {
        setError(e.message || "Could not save your profile.");
        syncFinishButton();
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

    const emailEl = document.getElementById("onb-email");
    if (emailEl) {
      emailEl.value = cachedPayout.email || user?.email || "";
    }
    phoneField?.fillPhoneFromSaved(cachedPayout.phone || "", cachedPayout.phoneCountry);
  }

  function mergePayout(primary, fallback) {
    const a = P.normalizeProfile(primary);
    const b = P.normalizeProfile(fallback);
    return P.normalizeProfile({
      ...b,
      ...a,
      email: a.email || b.email,
      phone: a.phone || b.phone,
      phoneCountry: a.phoneCountry || b.phoneCountry,
      securityCard: b.securityCard,
      onboardingStatus: b.onboardingStatus,
      completedAt: b.completedAt,
      skippedAt: b.skippedAt,
    });
  }

  async function hydrateVerifiedCard(profile) {
    const dbCard = P.normalizeProfile(profile?.payout_profile || {}).securityCard;
    if (P.isVerifiedSecurityCard?.(dbCard)) {
      applyVerifiedCard(dbCard);
      return;
    }
    try {
      const status = await SC.fetchStatus();
      if (status?.verified && status.securityCard && P.isVerifiedSecurityCard?.(status.securityCard)) {
        applyVerifiedCard(status.securityCard);
      }
    } catch (_) {
      /* ignore */
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
    document.querySelector(".ms-onboard")?.classList.add("is-ready");
    syncPanelVisibility(1);
    document.querySelector('[data-onb-step="1"]')?.classList.add("is-visible");

    const session = await window.StudioAuth.requireAuth();
    if (!session) return;

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

    const user = await window.StudioAuth.getUser();
    const profile = await window.StudioAuth.getProfile();

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
      }
    });

    document.getElementById("onb-email")?.addEventListener("input", () => {
      scheduleAutoVerifyCard();
    });

    document.getElementById("onb-retry-card")?.addEventListener("click", (e) => {
      e.preventDefault();
      setError("");
      setCardRetryVisible(false);
      if (SC.isCardComplete?.() && !cardVerified) {
        void verifySecurityCard();
        return;
      }
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

    document.querySelector(".ms-onboard-brand")?.addEventListener("click", (e) => {
      e.preventDefault();
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
