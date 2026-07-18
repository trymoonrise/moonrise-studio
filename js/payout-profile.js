/**
 * Shared payout profile helpers for onboarding and Settings.
 */
(function (global) {
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

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function phoneCountry(iso) {
    return PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
  }

  /** National digits only — country dial is shown beside the input, not inside it. */
  function formatPhoneDisplay(nationalDigits, iso) {
    const country = phoneCountry(iso);
    let d = digitsOnly(nationalDigits);
    if (
      d.startsWith(country.dial) &&
      (d.length > (country.mask === "us" ? 10 : 12) ||
        d.length >= country.dial.length + 7)
    ) {
      d = d.slice(country.dial.length);
    }
    if (country.mask === "us") {
      d = d.slice(0, 10);
      if (!d.length) return "";
      if (d.length <= 3) return "(" + d;
      if (d.length <= 6) return "(" + d.slice(0, 3) + ") " + d.slice(3);
      return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
    }
    d = d.slice(0, 12);
    if (!d.length) return "";
    const parts = [];
    let rest = d;
    while (rest.length) {
      const take = rest.length > 7 ? 4 : rest.length > 4 ? 3 : rest.length;
      parts.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
    return parts.join(" ");
  }

  function nationalDigitsFromDisplay(value, iso) {
    const country = phoneCountry(iso);
    let d = digitsOnly(value);
    const hasPlus = String(value || "").trim().startsWith("+");
    if (d.startsWith(country.dial)) {
      const rest = d.slice(country.dial.length);
      const maxNational = country.mask === "us" ? 10 : 12;
      if (hasPlus || d.length > maxNational) {
        d = rest;
      }
    }
    return country.mask === "us" ? d.slice(0, 10) : d.slice(0, 12);
  }

  function caretDigitIndex(value, caret, iso) {
    const country = phoneCountry(iso);
    const prefix = String(value || "").slice(0, Math.max(0, caret || 0));
    let digits = digitsOnly(prefix);
    const hasPlus = String(value || "").trim().startsWith("+");
    if (
      digits.startsWith(country.dial) &&
      (hasPlus || (country.mask === "us" && digitsOnly(value).length > 10))
    ) {
      digits = digits.slice(country.dial.length);
    }
    return digits.length;
  }

  function caretPosForDigitIndex(formatted, digitIndex) {
    if (digitIndex <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        seen += 1;
        if (seen >= digitIndex) return i + 1;
      }
    }
    return formatted.length;
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

  function normalizeSecurityCard(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const verifiedAt = String(raw.verifiedAt || raw.verified_at || "").trim();
    const paymentMethodId = String(raw.paymentMethodId || raw.payment_method_id || "").trim();
    if (!verifiedAt || !paymentMethodId) return null;
    return {
      verifiedAt,
      paymentMethodId,
      stripeCustomerId: String(raw.stripeCustomerId || raw.stripe_customer_id || "").trim() || "",
      brand: String(raw.brand || "").trim(),
      last4: String(raw.last4 || "").trim(),
      expMonth: Number(raw.expMonth || raw.exp_month) || null,
      expYear: Number(raw.expYear || raw.exp_year) || null,
    };
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
      email,
      phone,
      phoneCountry: phoneCountryCode || undefined,
      securityCard: normalizeSecurityCard(p.securityCard || p.security_card),
      completedAt: p.completedAt || p.completed_at || "",
      onboardingStatus: String(p.onboardingStatus || p.onboarding_status || ""),
      skippedAt: p.skippedAt || p.skipped_at || "",
    };
  }

  function hasSecurityCard(profileOrPayout) {
    const payout =
      profileOrPayout?.payout_profile != null
        ? normalizeProfile(profileOrPayout.payout_profile)
        : normalizeProfile(profileOrPayout);
    return !!payout.securityCard;
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

  function isVerifiedSecurityCard(card) {
    return !!(
      card &&
      String(card.verifiedAt || "").trim() &&
      String(card.paymentMethodId || "").trim()
    );
  }

  function isStudioOnboarded(profile) {
    try {
      if (sessionStorage.getItem("ms_force_studio_onboarding_replay") === "1") {
        return false;
      }
    } catch (_) {
      /* ignore */
    }
    if (typeof global.StudioAuth?.studioOnboarded === "function") {
      return !!global.StudioAuth.studioOnboarded(profile);
    }

    if (!studioOnboardedAt(profile)) return false;

    const payout = normalizeProfile(profile?.payout_profile || {});
    if (String(payout.onboardingStatus || "") !== "complete") return false;
    if (String(payout.skippedAt || "").trim()) return false;
    if (!isVerifiedSecurityCard(payout.securityCard)) return false;

    return !!(String(payout.email || "").trim() && String(payout.phone || "").trim());
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
      const caret = input.selectionStart;
      const digitIndex =
        caret == null ? nationalDigitsFromDisplay(raw, phoneCountryIso).length : caretDigitIndex(raw, caret, phoneCountryIso);
      const national = nationalDigitsFromDisplay(raw, phoneCountryIso);
      const formatted = formatPhoneDisplay(national, phoneCountryIso);
      input.value = formatted;
      try {
        const pos = caretPosForDigitIndex(formatted, digitIndex);
        input.setSelectionRange(pos, pos);
      } catch (_) {
        /* ignore unsupported selection */
      }
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
      const national = nationalDigitsFromDisplay(phoneEl?.value || "", phoneCountryIso);
      const country = phoneCountry(phoneCountryIso);
      return {
        phone: national ? "+" + country.dial + national : "",
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

  global.MoonrisePayoutProfile = {
    PHONE_COUNTRIES,
    escapeHtml,
    escapeAttr,
    digitsOnly,
    phoneCountry,
    formatPhoneDisplay,
    nationalDigitsFromDisplay,
    detectCountryFromPhone,
    normalizeProfile,
    normalizeSecurityCard,
    hasSecurityCard,
    isVerifiedSecurityCard,
    brandingDefaultsFrom,
    studioOnboardedAt,
    isStudioOnboarded,
    createPhoneField,
  };
})(window);
