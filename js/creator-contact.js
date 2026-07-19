/**
 * Creator contact helpers for watermark preview + contact pages.
 */
(function (global) {
  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatPhoneDisplay(e164) {
    const raw = String(e164 || "").trim();
    const d = digitsOnly(raw);
    if (d.length === 11 && d.startsWith("1")) {
      return "(" + d.slice(1, 4) + ") " + d.slice(4, 7) + "-" + d.slice(7);
    }
    if (d.length === 10) {
      return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
    }
    return raw;
  }

  function normalizePayoutProfile(raw) {
    let p = raw;
    if (typeof p === "string") {
      try {
        p = JSON.parse(p);
      } catch (_) {
        p = {};
      }
    }
    if (!p || typeof p !== "object" || Array.isArray(p)) p = {};
    return {
      email: String(p.email || "").trim(),
      phone: String(p.phone || p.phoneNumber || p.tel || "").trim(),
      phoneCountry: String(p.phoneCountry || p.phone_country || "US")
        .trim()
        .toUpperCase(),
    };
  }

  function creatorContactFromProfile(profile) {
    const payout = normalizePayoutProfile(profile?.payout_profile);
    const name =
      String(profile?.display_name || profile?.handle || "").trim() || "Your creator";
    const email = payout.email;
    let phone = payout.phone;
    if (phone && !phone.startsWith("+")) {
      const national = digitsOnly(phone);
      const dial = payout.phoneCountry === "US" || payout.phoneCountry === "CA" ? "1" : "";
      phone = national && dial ? "+" + dial + national : phone;
    }
    const phoneDisplay = formatPhoneDisplay(phone);
    if (!email && !phone) return null;
    return {
      kind: "creator",
      name,
      subtitle: "Website creator · site changes & updates",
      email,
      phone,
      phoneDisplay: phoneDisplay || phone,
    };
  }

  function readStoredCreatorContact(project) {
    const ctx =
      project?.business_context && typeof project.business_context === "object"
        ? project.business_context
        : {};
    const stored = ctx.creatorContact;
    if (!stored || typeof stored !== "object") return null;
    const email = String(stored.email || "").trim();
    const phone = String(stored.phone || "").trim();
    if (!email && !phone) return null;
    return {
      kind: "creator",
      name: String(stored.name || "Your creator").trim() || "Your creator",
      subtitle: String(stored.subtitle || "Website creator · site changes & updates").trim(),
      email,
      phone,
      phoneDisplay:
        String(stored.phoneDisplay || "").trim() || formatPhoneDisplay(phone) || phone,
    };
  }

  function resolveCreatorContact(opts) {
    if (opts?.creatorContact && (opts.creatorContact.email || opts.creatorContact.phone)) {
      return opts.creatorContact;
    }
    if (opts?.project) {
      const stored = readStoredCreatorContact(opts.project);
      if (stored) return stored;
    }
    if (opts?.profile) {
      return creatorContactFromProfile(opts.profile);
    }
    return null;
  }

  const HQ_CONTACT = {
    kind: "hq",
    name: "Moonrise",
    org: "Moonrise Studio",
    subtitle: "Headquarters · trymoonrise.com",
    email: "trymoonrise@gmail.com",
    phone: "+14013000957",
    phoneDisplay: "(401) 300-0957",
    url: "https://trymoonrise.com",
    discordUrl: "https://discord.gg/yFJajbBNj",
  };

  global.MoonriseCreatorContact = {
    HQ_CONTACT,
    formatPhoneDisplay,
    creatorContactFromProfile,
    readStoredCreatorContact,
    resolveCreatorContact,
  };
})(typeof window !== "undefined" ? window : globalThis);
