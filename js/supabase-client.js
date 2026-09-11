/**
 * Shared Supabase browser client with Auth session persistence.
 * "Auto save" on login stores the session in localStorage (stay signed in).
 * When that switch is off, the session lives in sessionStorage only (sign in each visit).
 */
(function (global) {
  const AUTH_STORAGE_KEY = "moonrise-studio-auth";
  const REMEMBER_LOGIN_KEY = "ms_auth_autosave_enabled";

  let client = null;
  let rememberForClient = null;

  function cfg() {
    const c = global.SITE_CONFIG || {};
    return {
      url: String(c.supabaseUrl || "").trim(),
      key: String(c.supabaseAnonKey || "").trim(),
    };
  }

  function canUse() {
    const { url, key } = cfg();
    return !!(url && key && global.supabase?.createClient);
  }

  function isRememberLoginEnabled() {
    try {
      return global.localStorage.getItem(REMEMBER_LOGIN_KEY) !== "0";
    } catch (_) {
      return true;
    }
  }

  function setRememberLoginEnabled(on) {
    const enabled = !!on;
    try {
      global.localStorage.setItem(REMEMBER_LOGIN_KEY, enabled ? "1" : "0");
    } catch (_) {
      /* ignore */
    }
    try {
      if (enabled) {
        // Promote tab session → durable so Auto save ON actually stays signed in.
        const raw = global.sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (raw && !global.localStorage.getItem(AUTH_STORAGE_KEY)) {
          global.localStorage.setItem(AUTH_STORAGE_KEY, raw);
        }
        global.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        // Max security: keep this tab only; never leave a durable session on disk.
        const raw = global.localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw && !global.sessionStorage.getItem(AUTH_STORAGE_KEY)) {
          global.sessionStorage.setItem(AUTH_STORAGE_KEY, raw);
        }
        global.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (_) {
      /* ignore */
    }
    if (rememberForClient !== null && rememberForClient !== enabled) {
      resetClient();
    }
  }

  function authStorage() {
    try {
      return isRememberLoginEnabled() ? global.localStorage : global.sessionStorage;
    } catch (_) {
      return global.localStorage;
    }
  }

  function readStoredAuthRaw() {
    try {
      return authStorage().getItem(AUTH_STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function clearPersistedAuth() {
    try {
      global.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    try {
      global.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function dropInactiveAuthCopy(remember) {
    try {
      if (remember) global.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      else global.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function resetClient() {
    if (client?.auth?.stopAutoRefresh) {
      try {
        client.auth.stopAutoRefresh();
      } catch (_) {
        /* ignore */
      }
    }
    client = null;
    rememberForClient = null;
  }

  function getClient() {
    const remember = isRememberLoginEnabled();
    if (client && rememberForClient === remember) return client;
    if (!canUse()) return null;
    // Keep any existing session when recreating the client (e.g. Auto save toggle).
    // Only drop the inactive store AFTER the new client is up, and only if the
    // active store already has a session copy.
    const { url, key } = cfg();
    const prev = client;
    if (prev?.auth?.stopAutoRefresh) {
      try {
        prev.auth.stopAutoRefresh();
      } catch (_) {
        /* ignore */
      }
    }
    client = global.supabase.createClient(url, key, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage(),
        // Password sign-in goes through the worker then setSession — not PKCE.
        flowType: "implicit",
        // WebAuthn passkeys (Face ID / fingerprint / password manager).
        experimental: { passkey: true },
      },
    });
    rememberForClient = remember;
    try {
      // Always drop the inactive store so Auto save off cannot leave a durable session behind.
      dropInactiveAuthCopy(remember);
    } catch (_) {
      /* ignore */
    }
    return client;
  }

  global.SiteSupabase = {
    AUTH_STORAGE_KEY,
    REMEMBER_LOGIN_KEY,
    getClient,
    canUse,
    resetClient,
    isRememberLoginEnabled,
    setRememberLoginEnabled,
    readStoredAuthRaw,
    clearPersistedAuth,
  };
})(window);
