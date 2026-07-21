/**
 * Cross-tab generation lock (localStorage + BroadcastChannel).
 */
(function (global) {
  const KEY = "ms_generate_inflight_v1";
  const MAX_MS = 15 * 60 * 1000;
  const CHANNEL = "ms-generation-lock-v1";
  let bc = null;

  try {
    bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  } catch (_) {
    bc = null;
  }

  function notifyChanged() {
    try {
      document.dispatchEvent(new CustomEvent("ms:generation-lock-changed"));
    } catch (_) {
      /* ignore */
    }
  }

  function readInflight() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      const age = Date.now() - Number(data.startedAt || 0);
      if (!data.requestId || age > MAX_MS) {
        localStorage.removeItem(KEY);
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function writeInflight(payload) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...payload,
          startedAt: payload.startedAt || Date.now(),
        })
      );
      bc?.postMessage({ type: "set" });
      notifyChanged();
    } catch (_) {
      /* ignore */
    }
  }

  function clearInflight() {
    try {
      localStorage.removeItem(KEY);
      bc?.postMessage({ type: "clear" });
      notifyChanged();
    } catch (_) {
      /* ignore */
    }
  }

  function isActive() {
    return !!readInflight()?.requestId;
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) notifyChanged();
    });
    bc?.addEventListener("message", notifyChanged);
  }

  global.MsGenerationLock = {
    KEY,
    MAX_MS,
    readInflight,
    writeInflight,
    clearInflight,
    isActive,
  };
})(typeof window !== "undefined" ? window : globalThis);
