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
  if (!P) {
    console.error("MoonrisePayoutProfile missing");
    return;
  }

  let step = 1;
  let saving = false;
  let cachedPayout = P.normalizeProfile({});
  let phoneField = null;

  function sb() {
    return window.SiteSupabase.getClient();
  }

  function setError(msg) {
    const el = document.getElementById("onb-error");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
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
      return P.normalizeProfile(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function writeDraft(partial) {
    try {
      const merged = P.normalizeProfile({ ...cachedPayout, ...partial });
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          email: merged.email,
          phone: merged.phone,
          phoneCountry: merged.phoneCountry,
          methods: merged.methods,
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

  function updateProgress() {
    const fill = document.getElementById("onb-progress-fill");
    const label = document.getElementById("onb-progress-label");
    const pct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = step + " / " + TOTAL_STEPS;
  }

  function showStep(n) {
    step = Math.max(1, Math.min(TOTAL_STEPS, n));
    document.querySelectorAll("[data-onb-step]").forEach((panel) => {
      const id = Number(panel.getAttribute("data-onb-step"));
      const on = id === step;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
    updateProgress();
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function collectStepDraft() {
    if (step === 4 && phoneField) {
      const phone = phoneField.read();
      writeDraft(phone);
    }
    if (step === 5) {
      const email = String(document.getElementById("onb-email")?.value || "").trim();
      const methods = P.readMethodsFromDom();
      const phone = phoneField ? phoneField.read() : {};
      writeDraft({ email, methods, ...phone });
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
      return P.validateMethods(P.readMethodsFromDom());
    }
    return null;
  }

  async function persistComplete() {
    const user = await window.StudioAuth.getUser();
    if (!user) throw new Error("Not signed in");

    const email = String(document.getElementById("onb-email")?.value || "").trim();
    const phone = phoneField.read();
    const methods = P.readMethodsFromDom();
    const payout = P.normalizeProfile({
      ...cachedPayout,
      email,
      phone: phone.phone,
      phoneCountry: phone.phoneCountry,
      methods,
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
    window.StudioAuth.setFinanceOnboardingSoftSkip?.(false);
  }

  async function goNext() {
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
        showStep(6);
        const finder = document.getElementById("onb-go-finder");
        const dash = document.getElementById("onb-go-dash");
        if (finder) finder.href = "leads.html";
        if (dash) dash.href = nextUrl;
      } catch (e) {
        setError(e.message || "Could not save your profile.");
      } finally {
        saving = false;
        if (btn) btn.disabled = false;
      }
      return;
    }

    if (step >= TOTAL_STEPS) {
      location.assign(nextUrl);
      return;
    }
    showStep(step + 1);
  }

  function goBack() {
    setError("");
    if (step <= 1) return;
    showStep(step - 1);
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
    P.fillMethodsDom(cachedPayout.methods, "ms-fin");
  }

  function mergePayout(primary, fallback) {
    const a = P.normalizeProfile(primary);
    const b = P.normalizeProfile(fallback);
    const methods = {};
    P.METHODS.forEach((id) => {
      const am = a.methods[id] || { enabled: false, handle: "" };
      const bm = b.methods[id] || { enabled: false, handle: "" };
      const pick =
        am.enabled && am.handle ? am : bm.enabled && bm.handle ? bm : am.handle ? am : bm;
      methods[id] = { enabled: !!pick.enabled, handle: String(pick.handle || "").trim() };
    });
    return P.normalizeProfile({
      ...b,
      ...a,
      email: a.email || b.email,
      phone: a.phone || b.phone,
      phoneCountry: a.phoneCountry || b.phoneCountry,
      methods,
    });
  }

  async function boot() {
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

    const methodsHost = document.getElementById("onb-methods");
    P.renderMethodsHtml(methodsHost, { classPrefix: "ms-fin" });
    P.bindMethodsHost(methodsHost, "ms-fin");

    const user = await window.StudioAuth.getUser();
    const profile = await window.StudioAuth.getProfile();

    if (!isReplay && P.isStudioOnboarded(profile)) {
      location.replace(nextUrl);
      return;
    }

    fillForm(profile, user);

    document.querySelectorAll("[data-onb-next]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        void goNext();
      });
    });
    document.querySelectorAll("[data-onb-back]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        goBack();
      });
    });

    document.getElementById("onb-go-dash")?.addEventListener("click", (e) => {
      e.preventDefault();
      location.assign(nextUrl);
    });

    showStep(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();
