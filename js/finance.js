/**
 * Finance — commission payout profile wizard.
 */
(function () {
  const ICON_FILES = {
    cashapp: "Cashapp.png",
    venmo: "Venmo.png",
    paypal: "PayPal.png",
    zelle: "Zelle.png",
    applepay: "ApplePay.png",
    googlepay: "GooglePay.png",
    stripe: "Stripe.png",
    crypto: "Bitcoin.png",
  };

  const METHOD_DEFS = [
    {
      id: "cashapp",
      label: "Cash App",
      placeholder: "$cashtag",
      hint: "Type your $cashtag, or paste your Cash App link",
    },
    {
      id: "venmo",
      label: "Venmo",
      placeholder: "@username",
      hint: "Type your @username, or paste your Venmo link",
    },
    {
      id: "paypal",
      label: "PayPal",
      placeholder: "@username",
      hint: "Type your PayPal.me username, or paste your link",
    },
    {
      id: "zelle",
      label: "Zelle",
      placeholder: "you@email.com or (555) 123-4567",
      hint: "Paste the email or phone you use for Zelle",
    },
    {
      id: "applepay",
      label: "Apple Pay",
      placeholder: "(555) 123-4567 or Apple ID email",
      hint: "Paste the phone number or email linked to your Apple Pay",
    },
    {
      id: "googlepay",
      label: "Google Pay",
      placeholder: "you@gmail.com or phone",
      hint: "Paste the email or phone you use for Google Pay",
    },
    {
      id: "stripe",
      label: "Stripe",
      placeholder: "buy.stripe.com/your-link",
      hint: "Paste your Stripe Payment Link",
    },
    {
      id: "crypto",
      label: "Crypto",
      placeholder: "Wallet address or payment link",
      hint: "Paste your crypto wallet address or payment link",
    },
    {
      id: "other",
      label: "Other",
      placeholder: "Payment link or phone number",
      hint: "Paste a payment link or phone number",
    },
  ];

  const METHODS = METHOD_DEFS.map((m) => m.id);
  const METHOD_LABELS = Object.fromEntries(METHOD_DEFS.map((m) => [m.id, m.label]));
  const DRAFT_KEY = "ms_finance_payout_draft_v1";

  const state = { step: 1, saved: false };
  /** Last known payout profile (DB or draft) for autofill / Edit. */
  let cachedProfile = {};

  function sb() {
    return window.SiteSupabase.getClient();
  }

  function iconUrl(id) {
    const file = ICON_FILES[id];
    return file ? "doc/" + file : "";
  }

  function setError(msg) {
    const el = document.getElementById("fin-error");
    const ok = document.getElementById("fin-ok");
    if (ok) ok.hidden = true;
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

  function setOk(msg) {
    const el = document.getElementById("fin-ok");
    setError("");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  const PHONE_COUNTRIES = [
    { iso: "US", name: "United States", dial: "1", flag: "🇺🇸", mask: "us" },
    { iso: "CA", name: "Canada", dial: "1", flag: "🇨🇦", mask: "us" },
    { iso: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧", mask: "intl" },
    { iso: "AU", name: "Australia", dial: "61", flag: "🇦🇺", mask: "intl" },
    { iso: "MX", name: "Mexico", dial: "52", flag: "🇲🇽", mask: "intl" },
    { iso: "IN", name: "India", dial: "91", flag: "🇮🇳", mask: "intl" },
    { iso: "DE", name: "Germany", dial: "49", flag: "🇩🇪", mask: "intl" },
    { iso: "FR", name: "France", dial: "33", flag: "🇫🇷", mask: "intl" },
    { iso: "BR", name: "Brazil", dial: "55", flag: "🇧🇷", mask: "intl" },
    { iso: "PH", name: "Philippines", dial: "63", flag: "🇵🇭", mask: "intl" },
    { iso: "NG", name: "Nigeria", dial: "234", flag: "🇳🇬", mask: "intl" },
    { iso: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰", mask: "intl" },
  ];

  let phoneCountryIso = "US";

  function phoneCountry(iso) {
    return PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /** Format national digits as +1(xxx)xxx-xxxx for US/CA, or +dial + spaced digits for others. */
  function formatPhoneDisplay(nationalDigits, iso) {
    const country = phoneCountry(iso || phoneCountryIso);
    const dial = country.dial;
    let d = digitsOnly(nationalDigits);

    // Strip leading country dial if the user pasted a full international number
    if (d.startsWith(dial) && d.length > dial.length + 6) {
      d = d.slice(dial.length);
    }

    if (country.mask === "us") {
      d = d.slice(0, 10);
      if (!d.length) return "";
      if (d.length <= 3) return "+" + dial + "(" + d;
      if (d.length <= 6) return "+" + dial + "(" + d.slice(0, 3) + ")" + d.slice(3);
      return "+" + dial + "(" + d.slice(0, 3) + ")" + d.slice(3, 6) + "-" + d.slice(6);
    }

    d = d.slice(0, 12);
    if (!d.length) return "+" + dial + " ";
    // Group as +44 7700 900123 style chunks of 3–4
    const parts = [];
    let rest = d;
    while (rest.length) {
      const take = rest.length > 7 ? 4 : rest.length > 4 ? 3 : rest.length;
      parts.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
    return "+" + dial + " " + parts.join(" ");
  }

  function nationalDigitsFromDisplay(value, iso) {
    const country = phoneCountry(iso || phoneCountryIso);
    let d = digitsOnly(value);
    if (d.startsWith(country.dial) && d.length > country.dial.length) {
      d = d.slice(country.dial.length);
    }
    return country.mask === "us" ? d.slice(0, 10) : d.slice(0, 12);
  }

  function setPhoneCountry(iso, opts) {
    const country = phoneCountry(iso);
    phoneCountryIso = country.iso;
    const flag = document.getElementById("fin-phone-flag");
    const dial = document.getElementById("fin-phone-dial");
    const input = document.getElementById("fin-biz-phone");
    if (flag) flag.textContent = country.flag;
    if (dial) dial.textContent = "+" + country.dial;
    if (input) {
      input.dataset.country = country.iso;
      input.placeholder = country.mask === "us" ? "(555) 000-0000" : "Phone number";
      if (!opts?.skipFormat) {
        const national = nationalDigitsFromDisplay(input.value, country.iso);
        input.value = formatPhoneDisplay(national, country.iso);
      }
    }
    document.querySelectorAll("#fin-phone-menu .ms-phone-option").forEach((btn) => {
      const on = btn.getAttribute("data-iso") === country.iso;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setPhoneMenuOpen(open) {
    const wrap = document.getElementById("fin-phone-country");
    const menu = document.getElementById("fin-phone-menu");
    const trigger = document.getElementById("fin-phone-trigger");
    if (!wrap || !menu || !trigger) return;
    wrap.classList.toggle("is-open", open);
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderPhoneCountries() {
    const menu = document.getElementById("fin-phone-menu");
    if (!menu) return;
    menu.innerHTML = PHONE_COUNTRIES.map((c) => {
      const selected = c.iso === phoneCountryIso;
      return (
        '<button type="button" class="ms-phone-option' +
        (selected ? " is-selected" : "") +
        '" role="option" data-iso="' +
        c.iso +
        '" aria-selected="' +
        (selected ? "true" : "false") +
        '">' +
        '<span class="ms-phone-option-flag" aria-hidden="true">' +
        c.flag +
        "</span>" +
        '<span class="ms-phone-option-name">' +
        escapeHtml(c.name) +
        "</span>" +
        '<span class="ms-phone-option-dial">+' +
        c.dial +
        "</span>" +
        "</button>"
      );
    }).join("");
  }

  function applyPhoneInput(raw) {
    const input = document.getElementById("fin-biz-phone");
    if (!input) return;
    const national = nationalDigitsFromDisplay(raw, phoneCountryIso);
    input.value = formatPhoneDisplay(national, phoneCountryIso);
  }

  function detectCountryFromPhone(value) {
    const d = digitsOnly(value);
    if (!d) return "US";
    // Longest dial match first
    const sorted = PHONE_COUNTRIES.slice().sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (d.startsWith(c.dial) && d.length >= c.dial.length + 7) return c.iso;
    }
    if (d.length === 10) return "US";
    return phoneCountryIso || "US";
  }

  function fillPhoneFromSaved(value, preferredIso) {
    const raw = String(value || "").trim();
    const input = document.getElementById("fin-biz-phone");
    if (!raw) {
      setPhoneCountry(preferredIso || "US", { skipFormat: true });
      if (input) input.value = "";
      return;
    }
    const pref = String(preferredIso || "").toUpperCase();
    const iso =
      pref && PHONE_COUNTRIES.some((c) => c.iso === pref)
        ? pref
        : detectCountryFromPhone(raw);
    setPhoneCountry(iso, { skipFormat: true });
    applyPhoneInput(raw);
  }

  function normalizeMethods(raw) {
    const out = {};
    METHODS.forEach((id) => {
      out[id] = { enabled: false, handle: "" };
    });
    if (!raw) return out;

    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (!item) return;
        if (typeof item === "string") {
          const id = METHODS.includes(item) ? item : "";
          if (id) out[id] = { enabled: true, handle: "" };
          return;
        }
        const id = String(item.id || item.method || "").trim();
        if (!METHODS.includes(id)) return;
        const handle = String(item.handle || item.value || item.link || "").trim();
        const enabled =
          item.enabled === undefined && item.on === undefined
            ? !!handle
            : !!(item.enabled ?? item.on);
        out[id] = { enabled: enabled && !!handle ? true : !!enabled, handle };
        if (handle && out[id].enabled === false && (item.enabled ?? item.on) !== false) {
          out[id].enabled = true;
        }
      });
      return out;
    }

    if (typeof raw !== "object") return out;

    Object.keys(raw).forEach((id) => {
      if (!METHODS.includes(id)) return;
      const row = raw[id];
      if (row == null) return;
      if (typeof row === "string") {
        const handle = row.trim();
        out[id] = { enabled: !!handle, handle };
        return;
      }
      if (typeof row !== "object") return;
      const handle = String(row.handle || row.value || row.link || "").trim();
      let enabled = !!(row.enabled ?? row.on);
      if (handle && row.enabled === undefined && row.on === undefined) enabled = true;
      out[id] = { enabled, handle };
    });
    return out;
  }

  function normalizeProfile(raw) {
    let p = raw;
    if (typeof p === "string") {
      try {
        p = JSON.parse(p);
      } catch (_) {
        p = {};
      }
    }
    if (!p || typeof p !== "object" || Array.isArray(p)) p = {};
    const email = String(p.email || "").trim();
    const phone = String(p.phone || p.phoneNumber || p.tel || "").trim();
    const phoneCountry = String(p.phoneCountry || p.phone_country || "")
      .trim()
      .toUpperCase();
    return {
      ...p,
      email,
      phone,
      phoneCountry: phoneCountry || undefined,
      methods: normalizeMethods(p.methods),
      completedAt: p.completedAt || p.completed_at || "",
    };
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return normalizeProfile(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function writeDraft(profile) {
    try {
      const p = normalizeProfile(profile || {});
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          email: p.email,
          phone: p.phone,
          phoneCountry: p.phoneCountry || phoneCountryIso,
          methods: p.methods,
          completedAt: p.completedAt || "",
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (_) {
      /* ignore quota */
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function mergeProfiles(primary, fallback) {
    const a = normalizeProfile(primary);
    const b = normalizeProfile(fallback);
    const methods = {};
    METHODS.forEach((id) => {
      const am = a.methods[id] || { enabled: false, handle: "" };
      const bm = b.methods[id] || { enabled: false, handle: "" };
      const pick =
        am.enabled && am.handle
          ? am
          : bm.enabled && bm.handle
            ? bm
            : am.handle
              ? am
              : bm;
      methods[id] = {
        enabled: !!pick.enabled,
        handle: String(pick.handle || "").trim(),
      };
    });
    return {
      ...b,
      ...a,
      email: a.email || b.email,
      phone: a.phone || b.phone,
      phoneCountry: a.phoneCountry || b.phoneCountry,
      methods,
      completedAt: a.completedAt || b.completedAt,
    };
  }

  function bindPhoneField() {
    renderPhoneCountries();
    setPhoneCountry(phoneCountryIso, { skipFormat: true });

    document.getElementById("fin-phone-trigger")?.addEventListener("click", (e) => {
      e.preventDefault();
      const wrap = document.getElementById("fin-phone-country");
      setPhoneMenuOpen(!wrap?.classList.contains("is-open"));
    });

    document.getElementById("fin-phone-menu")?.addEventListener("click", (e) => {
      const opt = e.target.closest?.("[data-iso]");
      if (!opt) return;
      setPhoneCountry(opt.getAttribute("data-iso") || "US");
      setPhoneMenuOpen(false);
      document.getElementById("fin-biz-phone")?.focus();
    });

    document.addEventListener("click", (e) => {
      const wrap = document.getElementById("fin-phone-country");
      if (!wrap || wrap.contains(e.target)) return;
      setPhoneMenuOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setPhoneMenuOpen(false);
    });

    const input = document.getElementById("fin-biz-phone");
    if (!input) return;

    input.addEventListener("input", () => {
      clearInvalidPulse();
      applyPhoneInput(input.value);
    });

    input.addEventListener("paste", (e) => {
      const text = e.clipboardData?.getData("text") || "";
      if (!text) return;
      e.preventDefault();
      const iso = detectCountryFromPhone(text);
      if (iso !== phoneCountryIso) setPhoneCountry(iso, { skipFormat: true });
      applyPhoneInput(text);
    });

    input.addEventListener("keydown", (e) => {
      // Keep caret usable; allow navigation / edit keys
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key === "Tab" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Home" ||
        e.key === "End" ||
        e.metaKey ||
        e.ctrlKey
      ) {
        return;
      }
    });
  }

  function readContact() {
    const phoneEl = document.getElementById("fin-biz-phone");
    const formatted = String(phoneEl?.value || "").trim();
    return {
      email: String(document.getElementById("fin-biz-email")?.value || "").trim(),
      phone: formatted,
      phoneCountry: phoneCountryIso,
    };
  }

  function readMethods() {
    const methods = {};
    METHODS.forEach((id) => {
      const enabled = !!document.querySelector('[data-method-toggle="' + id + '"]')?.checked;
      const handle = String(
        document.querySelector('[data-method-handle="' + id + '"]')?.value || ""
      ).trim();
      methods[id] = { enabled, handle };
    });
    return methods;
  }

  function renderMethods() {
    const host = document.getElementById("fin-methods");
    if (!host) return;
    host.innerHTML = METHOD_DEFS.map((m) => {
      const src = iconUrl(m.id);
      const icon = src
        ? '<img class="ms-fin-method-icon" src="' +
          src +
          '" alt="" width="28" height="28" loading="lazy">'
        : '<span class="ms-fin-method-fallback">' +
          escapeHtml(m.label.charAt(0)) +
          "</span>";
      return (
        '<div class="ms-fin-method" data-method="' +
        m.id +
        '">' +
        '<div class="ms-fin-method-row">' +
        '<div class="ms-fin-method-identity">' +
        icon +
        '<span class="ms-fin-method-name">' +
        escapeHtml(m.label) +
        "</span></div>" +
        '<label class="ms-lb-toggle ms-fin-toggle">' +
        '<input type="checkbox" data-method-toggle="' +
        m.id +
        '">' +
        '<span class="ms-lb-switch" aria-hidden="true"></span>' +
        "</label></div>" +
        '<div class="ms-fin-method-fields ms-expand" hidden>' +
        '<div class="ms-expand-inner">' +
        '<input class="ms-input" data-method-handle="' +
        m.id +
        '" placeholder="' +
        escapeAttr(m.placeholder) +
        '" autocomplete="off">' +
        '<p class="ms-fin-method-hint">' +
        escapeHtml(m.hint) +
        "</p></div></div></div>"
      );
    }).join("");
  }

  function fillForm(profile) {
    const p = normalizeProfile(profile);
    cachedProfile = p;
    const emailEl = document.getElementById("fin-biz-email");
    if (emailEl) emailEl.value = p.email || "";
    fillPhoneFromSaved(p.phone || "", p.phoneCountry);

    const methods = p.methods || {};
    METHODS.forEach((id) => {
      const row = methods[id] || { enabled: false, handle: "" };
      const toggle = document.querySelector('[data-method-toggle="' + id + '"]');
      const handle = document.querySelector('[data-method-handle="' + id + '"]');
      if (toggle) toggle.checked = !!(row.enabled && row.handle);
      if (handle) handle.value = row.handle || "";
      syncMethodRow(id, true);
    });
  }

  function syncMethodRow(id, instant) {
    const block = document.querySelector('.ms-fin-method[data-method="' + id + '"]');
    const toggle = document.querySelector('[data-method-toggle="' + id + '"]');
    if (!block || !toggle) return;
    const fields = block.querySelector(".ms-fin-method-fields");
    const on = !!toggle.checked;
    block.classList.toggle("is-on", on);
    if (fields) {
      if (window.StudioMotion?.setOpen) {
        window.StudioMotion.setOpen(fields, on, { instant: !!instant });
      } else {
        fields.hidden = !on;
        fields.classList.toggle("is-open", on);
      }
    }
  }

  function enabledMethods(methods) {
    return METHODS.filter((id) => methods[id]?.enabled && methods[id]?.handle);
  }

  function clearInvalidPulse() {
    document.querySelectorAll(".is-invalid-pulse").forEach((el) => {
      el.classList.remove("is-invalid-pulse");
    });
  }

  function pulseInvalid(target) {
    clearInvalidPulse();
    let el = null;
    if (target === "phone") {
      el = document.getElementById("fin-phone") || document.getElementById("fin-biz-phone");
    } else if (target === "email") {
      el = document.getElementById("fin-biz-email");
    } else if (target instanceof Element) {
      el = target;
    }
    if (!el) return;
    // Retrigger animation if already applied
    void el.offsetWidth;
    el.classList.add("is-invalid-pulse");
    const onEnd = (e) => {
      if (e.animationName && e.animationName !== "ms-invalid-pulse") return;
      el.classList.remove("is-invalid-pulse");
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
    el.focus?.();
  }

  function showStepError(err) {
    if (!err) {
      setError("");
      clearInvalidPulse();
      return;
    }
    if (typeof err === "object" && err.field) {
      setError("");
      pulseInvalid(err.field);
      return;
    }
    setError(typeof err === "string" ? err : err.message || "Something went wrong.");
  }

  function validateStep(step) {
    if (step === 1) {
      const contact = readContact();
      if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        return { field: "email", message: "Enter a valid email." };
      }
      if (!contact.phone || nationalDigitsFromDisplay(contact.phone).length < 7) {
        return { field: "phone", message: "Enter a valid phone number." };
      }
      return null;
    }
    if (step === 2) {
      const methods = readMethods();
      const on = METHODS.filter((id) => methods[id].enabled);
      if (!on.length) return "Enable at least one payment method.";
      for (const id of on) {
        if (!methods[id].handle) {
          return "Add a handle or link for " + METHOD_LABELS[id] + ".";
        }
      }
      return null;
    }
    return null;
  }

  function renderReview(targetId) {
    const contact = readContact();
    const methods = readMethods();
    const host = document.getElementById(targetId);
    if (!host) return;

    const methodRows = enabledMethods(methods)
      .map((id) => {
        const src = iconUrl(id);
        const icon = src
          ? '<img class="ms-fin-review-method-icon" src="' + src + '" alt="">'
          : "";
        return (
          '<div class="ms-fin-review-row">' +
          '<span class="ms-fin-review-method">' +
          icon +
          escapeHtml(METHOD_LABELS[id]) +
          "</span><strong>" +
          escapeHtml(methods[id].handle) +
          "</strong></div>"
        );
      })
      .join("");

    host.innerHTML =
      '<div class="ms-fin-review-block">' +
      '<div class="ms-fin-review-kicker">Contact</div>' +
      '<div class="ms-fin-review-line">' +
      escapeHtml(contact.email) +
      "</div>" +
      '<div class="ms-fin-review-line">' +
      escapeHtml(contact.phone) +
      "</div></div>" +
      '<div class="ms-fin-review-block">' +
      '<div class="ms-fin-review-kicker">Payment methods</div>' +
      (methodRows || '<p class="ms-muted">No methods enabled.</p>') +
      "</div>";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function setStep(step, instant) {
    const prev = state.step;
    state.step = step;
    const panels = Array.from(document.querySelectorAll("[data-step-panel]"));
    const motion = window.StudioMotion;

    panels.forEach((panel) => {
      const n = Number(panel.getAttribute("data-step-panel"));
      const on = n === step;
      if (instant || !motion?.showPanel) {
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
        panel.classList.toggle("is-visible", on);
        return;
      }
      if (on) {
        motion.showPanel(panel);
      } else if (n === prev || panel.classList.contains("is-active")) {
        motion.hidePanel(panel);
      } else {
        panel.hidden = true;
        panel.classList.remove("is-active", "is-visible");
      }
    });

    document.querySelectorAll("[data-step-indicator]").forEach((el) => {
      const n = Number(el.getAttribute("data-step-indicator"));
      el.classList.toggle("is-active", n === step);
      el.classList.toggle("is-done", n < step);
    });
    if (step === 3) renderReview("fin-review");
    setError("");
  }

  function buildProfile() {
    return {
      ...readContact(),
      methods: readMethods(),
      completedAt: new Date().toISOString(),
    };
  }

  function isComplete(profile) {
    const p = normalizeProfile(profile);
    if (!p.email || !p.phone) return false;
    return METHODS.some((id) => p.methods[id]?.enabled && p.methods[id]?.handle);
  }

  function showSaved(profile) {
    const p = normalizeProfile(profile);
    cachedProfile = p;
    writeDraft(p);
    fillForm(p);
    renderReview("fin-saved-review");
    document.getElementById("fin-wizard").hidden = true;
    document.getElementById("fin-saved").hidden = false;
    const meta = document.getElementById("fin-saved-meta");
    if (meta && p.completedAt) {
      const d = new Date(p.completedAt);
      meta.textContent =
        "Saved " +
        d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        ". Use these methods when paying commissioners.";
    }
    state.saved = true;
  }

  function showWizard(step) {
    document.getElementById("fin-wizard").hidden = false;
    document.getElementById("fin-saved").hidden = true;
    fillForm(cachedProfile);
    setStep(step || 1, true);
    state.saved = false;
  }

  async function persistPayoutProfile(profile) {
    const user = await window.StudioAuth.getUser();
    if (!user) throw new Error("Sign in required");

    // Make sure a profiles row exists before updating (update can no-op with 0 rows).
    await window.StudioAuth.ensureProfile?.(user);

    const client = sb();
    if (!client) throw new Error("Could not connect to the database.");

    const payload = {
      payout_profile: profile,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("payout_profile")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const handle =
        String(user.user_metadata?.handle || "")
          .replace(/^@/, "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 18) || "user";
      const upsert = await client
        .from("profiles")
        .upsert(
          {
            id: user.id,
            handle: handle + "_" + String(user.id).replace(/-/g, "").slice(0, 6),
            display_name: handle,
            ...payload,
          },
          { onConflict: "id" }
        )
        .select("payout_profile")
        .maybeSingle();
      if (upsert.error) throw upsert.error;
      data = upsert.data;
    }

    const saved = normalizeProfile(data?.payout_profile);
    if (!saved.email && !saved.phone && !enabledMethods(saved.methods).length) {
      throw new Error("Save did not stick. Refresh and try again.");
    }
    return saved;
  }

  async function saveProfile() {
    setError("");
    clearInvalidPulse();
    const err1 = validateStep(1);
    if (err1) {
      setStep(1);
      showStepError(err1);
      return;
    }
    const err2 = validateStep(2);
    if (err2) {
      setStep(2);
      showStepError(err2);
      return;
    }

    const btn = document.getElementById("fin-save");
    if (btn) btn.disabled = true;
    try {
      const profile = normalizeProfile(buildProfile());
      const saved = await persistPayoutProfile(profile);
      const next = mergeProfiles(profile, saved);
      next.completedAt = profile.completedAt || next.completedAt;
      cachedProfile = next;
      writeDraft(next);
      setOk("Profile saved.");
      window.StudioToast?.clear?.();
      showSaved(next);
    } catch (e) {
      setError(e.message || "Could not save profile");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bind() {
    bindPhoneField();

    document.getElementById("fin-biz-email")?.addEventListener("input", () => {
      clearInvalidPulse();
      setError("");
    });

    document.getElementById("fin-next-1")?.addEventListener("click", () => {
      const err = validateStep(1);
      if (err) return showStepError(err);
      setError("");
      clearInvalidPulse();
      const draft = normalizeProfile({
        ...cachedProfile,
        ...readContact(),
        methods: readMethods(),
      });
      cachedProfile = draft;
      writeDraft(draft);
      setStep(2);
    });
    document.getElementById("fin-next-2")?.addEventListener("click", () => {
      const err = validateStep(2);
      if (err) return showStepError(err);
      setError("");
      const draft = normalizeProfile({
        ...cachedProfile,
        ...readContact(),
        methods: readMethods(),
      });
      cachedProfile = draft;
      writeDraft(draft);
      setStep(3);
    });
    document.getElementById("fin-back-2")?.addEventListener("click", () => setStep(1));
    document.getElementById("fin-back-3")?.addEventListener("click", () => setStep(2));
    document.getElementById("fin-save")?.addEventListener("click", saveProfile);
    document.getElementById("fin-edit")?.addEventListener("click", () => showWizard(1));

    document.getElementById("fin-methods")?.addEventListener("change", (e) => {
      const toggle = e.target?.closest?.("[data-method-toggle]");
      if (!toggle) return;
      syncMethodRow(toggle.getAttribute("data-method-toggle"));
    });
  }

  async function boot() {
    renderMethods();
    bind();

    const wizard = document.getElementById("fin-wizard");
    const saved = document.getElementById("fin-saved");
    // Keep both hidden until we know which view to show (avoids wizard flash).
    if (wizard) wizard.hidden = true;
    if (saved) saved.hidden = true;

    try {
      const user = await window.StudioAuth.getUser();
      if (!user) {
        showWizard(1);
        setStep(1, true);
        return;
      }
      const { data } = await sb()
        .from("profiles")
        .select("payout_profile")
        .eq("id", user.id)
        .maybeSingle();

      const fromDb = normalizeProfile(data?.payout_profile || {});
      const fromDraft = readDraft();
      let profile = mergeProfiles(fromDb, fromDraft);
      if (!profile.email && user.email) profile.email = user.email;
      cachedProfile = profile;
      fillForm(profile);

      const emailEl = document.getElementById("fin-biz-email");
      if (emailEl && !emailEl.value && user.email) {
        emailEl.value = user.email;
        cachedProfile = { ...cachedProfile, email: user.email };
      }

      if (isComplete(profile)) showSaved(profile);
      else {
        showWizard(1);
        setStep(1, true);
      }
    } catch (e) {
      console.warn(e);
      showWizard(1);
      setStep(1, true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
