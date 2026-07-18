/**
 * Shared payout method defs + profile normalize helpers for Finance + Onboarding.
 */
(function (global) {
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

  function iconUrl(id) {
    const file = ICON_FILES[id];
    return file ? "doc/" + file : "";
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function phoneCountry(iso) {
    return PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
  }

  function formatPhoneDisplay(nationalDigits, iso) {
    const country = phoneCountry(iso);
    const dial = country.dial;
    let d = digitsOnly(nationalDigits);
    if (d.startsWith(dial) && d.length > dial.length + 6) d = d.slice(dial.length);
    if (country.mask === "us") {
      d = d.slice(0, 10);
      if (!d.length) return "";
      if (d.length <= 3) return "+" + dial + "(" + d;
      if (d.length <= 6) return "+" + dial + "(" + d.slice(0, 3) + ")" + d.slice(3);
      return "+" + dial + "(" + d.slice(0, 3) + ")" + d.slice(3, 6) + "-" + d.slice(6);
    }
    d = d.slice(0, 12);
    if (!d.length) return "+" + dial + " ";
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
    const country = phoneCountry(iso);
    let d = digitsOnly(value);
    if (d.startsWith(country.dial) && d.length > country.dial.length) {
      d = d.slice(country.dial.length);
    }
    return country.mask === "us" ? d.slice(0, 10) : d.slice(0, 12);
  }

  function detectCountryFromPhone(value, fallbackIso) {
    const d = digitsOnly(value);
    if (!d) return fallbackIso || "US";
    const sorted = PHONE_COUNTRIES.slice().sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (d.startsWith(c.dial) && d.length >= c.dial.length + 7) return c.iso;
    }
    if (d.length === 10) return "US";
    return fallbackIso || "US";
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
    const phoneCountryCode = String(p.phoneCountry || p.phone_country || "")
      .trim()
      .toUpperCase();
    return {
      ...p,
      email,
      phone,
      phoneCountry: phoneCountryCode || undefined,
      methods: normalizeMethods(p.methods),
      completedAt: p.completedAt || p.completed_at || "",
      onboardingStatus: String(p.onboardingStatus || p.onboarding_status || ""),
      skippedAt: p.skippedAt || p.skipped_at || "",
    };
  }

  function brandingDefaultsFrom(profile) {
    return profile?.branding_defaults &&
      typeof profile.branding_defaults === "object" &&
      !Array.isArray(profile.branding_defaults)
      ? { ...profile.branding_defaults }
      : {};
  }

  function studioOnboardedAt(profile) {
    const branding = brandingDefaultsFrom(profile);
    return String(branding.studioOnboardedAt || "").trim();
  }

  function isStudioOnboarded(profile, opts) {
    try {
      if (sessionStorage.getItem("ms_force_studio_onboarding_replay") === "1") {
        return false;
      }
    } catch (_) {
      /* ignore */
    }
    if (opts?.ignoreFinanceBackfill) {
      return !!studioOnboardedAt(profile);
    }
    if (studioOnboardedAt(profile)) return true;
    // Backfill: creators who already finished finance payout setup.
    return !!global.StudioAuth?.financeProfileComplete?.(profile);
  }

  /**
   * Phone field controller bound to element IDs.
   * ids: { root, country, trigger, flag, dial, menu, input }
   */
  function createPhoneField(ids) {
    let phoneCountryIso = "US";

    function setPhoneCountry(iso, opts) {
      const country = phoneCountry(iso);
      phoneCountryIso = country.iso;
      const flag = document.getElementById(ids.flag);
      const dial = document.getElementById(ids.dial);
      const input = document.getElementById(ids.input);
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
      document.querySelectorAll("#" + ids.menu + " .ms-phone-option").forEach((btn) => {
        const on = btn.getAttribute("data-iso") === country.iso;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    function setPhoneMenuOpen(open) {
      const wrap = document.getElementById(ids.country);
      const menu = document.getElementById(ids.menu);
      const trigger = document.getElementById(ids.trigger);
      if (!wrap || !menu || !trigger) return;
      wrap.classList.toggle("is-open", open);
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function renderPhoneCountries() {
      const menu = document.getElementById(ids.menu);
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
      const input = document.getElementById(ids.input);
      if (!input) return;
      const national = nationalDigitsFromDisplay(raw, phoneCountryIso);
      input.value = formatPhoneDisplay(national, phoneCountryIso);
    }

    function fillPhoneFromSaved(value, preferredIso) {
      const raw = String(value || "").trim();
      const input = document.getElementById(ids.input);
      if (!raw) {
        setPhoneCountry(preferredIso || "US", { skipFormat: true });
        if (input) input.value = "";
        return;
      }
      const pref = String(preferredIso || "").toUpperCase();
      const iso =
        pref && PHONE_COUNTRIES.some((c) => c.iso === pref)
          ? pref
          : detectCountryFromPhone(raw, phoneCountryIso);
      setPhoneCountry(iso, { skipFormat: true });
      applyPhoneInput(raw);
    }

    function bind() {
      renderPhoneCountries();
      setPhoneCountry(phoneCountryIso, { skipFormat: true });

      document.getElementById(ids.trigger)?.addEventListener("click", (e) => {
        e.preventDefault();
        const wrap = document.getElementById(ids.country);
        setPhoneMenuOpen(!wrap?.classList.contains("is-open"));
      });

      document.getElementById(ids.menu)?.addEventListener("click", (e) => {
        const opt = e.target.closest?.("[data-iso]");
        if (!opt) return;
        setPhoneCountry(opt.getAttribute("data-iso") || "US");
        setPhoneMenuOpen(false);
        document.getElementById(ids.input)?.focus();
      });

      document.addEventListener("click", (e) => {
        const wrap = document.getElementById(ids.country);
        if (!wrap || wrap.contains(e.target)) return;
        setPhoneMenuOpen(false);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setPhoneMenuOpen(false);
      });

      const input = document.getElementById(ids.input);
      if (!input) return;

      input.addEventListener("input", () => applyPhoneInput(input.value));
      input.addEventListener("paste", (e) => {
        const text = e.clipboardData?.getData("text") || "";
        if (!text) return;
        e.preventDefault();
        const iso = detectCountryFromPhone(text, phoneCountryIso);
        if (iso !== phoneCountryIso) setPhoneCountry(iso, { skipFormat: true });
        applyPhoneInput(text);
      });
    }

    function read() {
      const phoneEl = document.getElementById(ids.input);
      return {
        phone: String(phoneEl?.value || "").trim(),
        phoneCountry: phoneCountryIso,
      };
    }

    function isValid() {
      const { phone } = read();
      return !!phone && nationalDigitsFromDisplay(phone, phoneCountryIso).length >= 7;
    }

    return {
      bind,
      fillPhoneFromSaved,
      read,
      isValid,
      getCountryIso: () => phoneCountryIso,
      nationalDigitsFromDisplay: (v) => nationalDigitsFromDisplay(v, phoneCountryIso),
    };
  }

  function renderMethodsHtml(host, opts) {
    if (!host) return;
    const classPrefix = opts?.classPrefix || "ms-fin";
    host.innerHTML = METHOD_DEFS.map((m) => {
      const src = iconUrl(m.id);
      const icon = src
        ? '<img class="' +
          classPrefix +
          '-method-icon" src="' +
          src +
          '" alt="" width="28" height="28" loading="lazy">'
        : '<span class="' +
          classPrefix +
          '-method-fallback">' +
          escapeHtml(m.label.charAt(0)) +
          "</span>";
      return (
        '<div class="' +
        classPrefix +
        '-method" data-method="' +
        m.id +
        '">' +
        '<div class="' +
        classPrefix +
        '-method-row">' +
        '<div class="' +
        classPrefix +
        '-method-identity">' +
        icon +
        '<span class="' +
        classPrefix +
        '-method-name">' +
        escapeHtml(m.label) +
        "</span></div>" +
        '<label class="ms-lb-toggle ' +
        classPrefix +
        '-toggle">' +
        '<input type="checkbox" data-method-toggle="' +
        m.id +
        '">' +
        '<span class="ms-lb-switch" aria-hidden="true"></span>' +
        "</label></div>" +
        '<div class="' +
        classPrefix +
        '-method-fields ms-expand" hidden>' +
        '<div class="ms-expand-inner">' +
        '<input class="ms-input" data-method-handle="' +
        m.id +
        '" placeholder="' +
        escapeAttr(m.placeholder) +
        '" autocomplete="off">' +
        '<p class="' +
        classPrefix +
        '-method-hint">' +
        escapeHtml(m.hint) +
        "</p></div></div></div>"
      );
    }).join("");
  }

  function readMethodsFromDom() {
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

  function fillMethodsDom(profileMethods, classPrefix) {
    const prefix = classPrefix || "ms-fin";
    const methods = normalizeMethods(profileMethods);
    METHODS.forEach((id) => {
      const row = methods[id] || { enabled: false, handle: "" };
      const toggle = document.querySelector('[data-method-toggle="' + id + '"]');
      const handle = document.querySelector('[data-method-handle="' + id + '"]');
      if (toggle) toggle.checked = !!(row.enabled && row.handle);
      if (handle) handle.value = row.handle || "";
      const block = document.querySelector("." + prefix + '-method[data-method="' + id + '"]');
      const fields = block?.querySelector("." + prefix + "-method-fields");
      const on = !!toggle?.checked;
      block?.classList.toggle("is-on", on);
      if (fields) {
        if (global.StudioMotion?.setOpen) {
          global.StudioMotion.setOpen(fields, on, { instant: true });
        } else {
          fields.hidden = !on;
          fields.classList.toggle("is-open", on);
        }
      }
    });
  }

  function bindMethodsHost(host, classPrefix) {
    if (!host) return;
    const prefix = classPrefix || "ms-fin";
    host.addEventListener("change", (e) => {
      const toggle = e.target?.closest?.("[data-method-toggle]");
      if (!toggle) return;
      const id = toggle.getAttribute("data-method-toggle");
      const block = host.querySelector("." + prefix + '-method[data-method="' + id + '"]');
      const fields = block?.querySelector("." + prefix + "-method-fields");
      const on = !!toggle.checked;
      block?.classList.toggle("is-on", on);
      if (fields) {
        if (global.StudioMotion?.setOpen) {
          global.StudioMotion.setOpen(fields, on);
        } else {
          fields.hidden = !on;
          fields.classList.toggle("is-open", on);
        }
      }
    });
  }

  function validateMethods(methods) {
    const on = METHODS.filter((id) => methods[id]?.enabled);
    if (!on.length) return "Enable at least one payment method.";
    for (const id of on) {
      if (!methods[id].handle) {
        return "Add a handle or link for " + METHOD_LABELS[id] + ".";
      }
    }
    return null;
  }

  global.MoonrisePayoutProfile = {
    ICON_FILES,
    METHOD_DEFS,
    METHODS,
    METHOD_LABELS,
    PHONE_COUNTRIES,
    escapeHtml,
    escapeAttr,
    iconUrl,
    digitsOnly,
    phoneCountry,
    formatPhoneDisplay,
    nationalDigitsFromDisplay,
    detectCountryFromPhone,
    normalizeMethods,
    normalizeProfile,
    brandingDefaultsFrom,
    studioOnboardedAt,
    isStudioOnboarded,
    createPhoneField,
    renderMethodsHtml,
    readMethodsFromDom,
    fillMethodsDom,
    bindMethodsHost,
    validateMethods,
  };
})(window);
