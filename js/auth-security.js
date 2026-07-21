/**
 * Client-side auth security helpers — storage hygiene, URL token scrubbing, HTML escape.
 */
(function (global) {
  const AUTH_STORAGE_KEY = "moonrise-studio-auth";

  const SESSION_CACHE_KEYS = [
    "ms_sidebar_profile_v1",
    "ms_avatar_url_v1",
    "ms_sidebar_income_v1",
    "ms_clients_cache_v2",
    "ms_dashboard_stats_v1",
  ];

  const LOCAL_SENSITIVE_KEYS = [
    "ms_studio_onboarding_draft_v1",
    "ms_owner_nav_v1",
  ];

  const SESSION_SENSITIVE_KEYS = [
    "ms_pw_recovery",
    "ms_force_studio_onboarding_replay",
    "ms_prompt_install_after_login",
    "ms_login_check_email",
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clearStorageKeys(storage, keys) {
    if (!storage) return;
    keys.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (_) {
        /* ignore */
      }
    });
  }

  /**
   * Remove cached PII and auth-adjacent data on sign-out.
   * Does not remove moonrise-studio-auth (Supabase signOut handles that).
   */
  function clearSensitiveClientStorage(options) {
    const opts = options && typeof options === "object" ? options : {};
    clearStorageKeys(global.localStorage, LOCAL_SENSITIVE_KEYS);
    clearStorageKeys(global.sessionStorage, SESSION_CACHE_KEYS);
    if (!opts.keepSessionFlags) {
      clearStorageKeys(global.sessionStorage, SESSION_SENSITIVE_KEYS);
    }
    if (opts.clearAutosave) {
      try {
        global.localStorage.removeItem("ms_auth_autosave_email");
        global.localStorage.removeItem("ms_auth_autosave_handle");
      } catch (_) {
        /* ignore */
      }
    }
  }

  /** Strip OAuth tokens from the URL bar as soon as possible. */
  function scrubUrlAuthFragments() {
    if (typeof location === "undefined") return;
    try {
      const hash = String(location.hash || "");
      const search = String(location.search || "");
      const sensitive =
        /(?:^|[?#&])(?:access_token|refresh_token|token_hash|code)=/i.test(hash + search);
      if (!sensitive) return;

      const params = new URLSearchParams(location.search);
      params.delete("code");
      params.delete("token_hash");
      params.delete("type");
      params.delete("access_token");
      params.delete("refresh_token");
      params.delete("expires_in");
      params.delete("token_type");
      const qs = params.toString();
      const path = location.pathname + (qs ? "?" + qs : "");
      history.replaceState(null, "", path);
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * UX-only gate check (not cryptographic). Matches auth-gate-head.js rules.
   */
  function hasStoredSessionForGate() {
    try {
      const raw = global.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.session?.access_token ||
        parsed?.currentSession?.access_token;
      const refresh =
        parsed?.refresh_token ||
        parsed?.session?.refresh_token ||
        parsed?.currentSession?.refresh_token;
      if (!token || !refresh) return false;
      const exp =
        parsed?.expires_at ||
        parsed?.session?.expires_at ||
        parsed?.currentSession?.expires_at;
      if (exp && Number(exp) * 1000 < Date.now() - 60000) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  global.MsAuthSecurity = {
    AUTH_STORAGE_KEY,
    escapeHtml,
    clearSensitiveClientStorage,
    scrubUrlAuthFragments,
    hasStoredSessionForGate,
  };
})(window);
