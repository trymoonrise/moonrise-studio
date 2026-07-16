/**
 * Handle cleaning + reserved-name checks (brand spoof / leetspeak).
 */
(function (global) {
  const LEET = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "@": "a",
    "$": "s",
    "!": "i",
    "|": "i",
  };

  function reservedRoots() {
    const cfg = global.SITE_CONFIG || {};
    const list = []
      .concat(cfg.ownerHandles || ["moonrise"])
      .concat(cfg.reservedHandles || [])
      .concat(["moonrisestudio"]);
    const out = [];
    const seen = new Set();
    list.forEach(function (item) {
      const folded = foldHandle(item);
      if (!folded || folded.length < 4 || seen.has(folded)) return;
      seen.add(folded);
      out.push(folded);
    });
    return out;
  }

  /** Lowercase, strip diacritics, map leetspeak, keep letters only. */
  function foldHandle(raw) {
    return String(raw || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/^@+/, "")
      .split("")
      .map(function (ch) {
        return LEET[ch] || ch;
      })
      .join("")
      .replace(/[^a-z]/g, "");
  }

  function cleanHandle(raw, maxLen) {
    const max = Math.max(3, Number(maxLen) || 24);
    return String(raw || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, max);
  }

  function isReservedHandle(raw) {
    const folded = foldHandle(raw);
    if (!folded) return false;
    return reservedRoots().some(function (root) {
      return folded === root || folded.indexOf(root) !== -1;
    });
  }

  function assertHandleAllowed(raw, opts) {
    const clean = cleanHandle(raw);
    if (!clean) throw new Error("Choose a username");
    if (clean.length < 3) throw new Error("Username must be at least 3 characters");
    if (isReservedHandle(raw) || isReservedHandle(clean)) {
      const existing = cleanHandle(opts && opts.existingHandle);
      const owners = (global.SITE_CONFIG?.ownerHandles || ["moonrise"]).map(function (h) {
        return cleanHandle(h);
      });
      // Canonical owner may keep their exact reserved handle on profile save.
      if (existing && clean === existing && owners.indexOf(clean) !== -1) {
        return clean;
      }
      throw new Error("That username is not allowed");
    }
    return clean;
  }

  /** Safe base for profile handles when the chosen name is empty or reserved. */
  function fallbackHandleBase(email) {
    let base = cleanHandle(String(email || "").split("@")[0], 18);
    if (!base || isReservedHandle(base)) base = "user";
    return base;
  }

  global.StudioHandles = {
    foldHandle,
    cleanHandle,
    isReservedHandle,
    assertHandleAllowed,
    fallbackHandleBase,
    reservedRoots,
  };
})(window);
