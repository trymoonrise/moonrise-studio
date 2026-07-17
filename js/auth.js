/**
 * Supabase Auth helpers + page gate for Studio.
 * Sign-in / sign-up / reset go through the worker so lockouts + rate limits apply.
 */
(function (global) {
  const PUBLIC_PAGES = new Set(["index", "login", "apply", "orders", "home"]);
  const AUTH_TIMEOUT_MS = 12000;

  function getClient() {
    return global.SiteSupabase?.getClient?.() || null;
  }

  function workerUrl() {
    return String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error((label || "Request") + " timed out")), ms)
      ),
    ]);
  }

  function authError(payload, fallback) {
    const err = new Error(
      (payload && (payload.error || payload.message)) || fallback || "Authentication failed"
    );
    err.code = payload?.code || "";
    err.retryAfterMs = Number(payload?.retryAfterMs) || 0;
    err.remainingTries = payload?.remainingTries;
    return err;
  }

  function friendlyAuthMessage(err, fallback) {
    const raw = String(err?.message || err || "").trim();
    const lower = raw.toLowerCase();
    if (
      !raw ||
      lower === "failed to fetch" ||
      lower.includes("networkerror") ||
      lower.includes("load failed") ||
      lower.includes("network request failed")
    ) {
      return "Can't reach the sign-in service. Check your connection and try again.";
    }
    if (lower.includes("timed out") || lower.includes("timeout")) {
      return "Sign-in timed out. Please try again.";
    }
    return raw || fallback || "Authentication failed";
  }

  async function workerAuth(path, body, headers) {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured");
    let res;
    try {
      res = await withTimeout(
        fetch(base + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
          },
          body: JSON.stringify(body || {}),
        }),
        AUTH_TIMEOUT_MS,
        "Auth"
      );
    } catch (e) {
      throw authError({ error: friendlyAuthMessage(e), code: "network_error" });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw authError(data, "Authentication failed");
    return data;
  }

  async function applySessionTokens(payload) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    if (!payload?.access_token || !payload?.refresh_token) {
      return payload;
    }
    const { data, error } = await withTimeout(
      sb.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      }),
      AUTH_TIMEOUT_MS,
      "Session"
    );
    if (error) throw error;
    return data;
  }

  async function getSession() {
    const sb = getClient();
    if (!sb) return null;
    try {
      const { data, error } = await withTimeout(sb.auth.getSession(), AUTH_TIMEOUT_MS, "Session");
      if (error) return null;
      return data?.session || null;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function signUp(email, password, handle) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    const handles = global.StudioHandles;
    if (!handles?.assertHandleAllowed) {
      throw new Error("Handle validation is unavailable");
    }
    const cleanHandle = handles.assertHandleAllowed(handle);
    const payload = await workerAuth("/auth/signup", {
      email: String(email || "").trim(),
      password: String(password || ""),
      handle: cleanHandle,
    });
    const sessionData = await applySessionTokens(payload);
    const user = sessionData?.user || payload.user;
    if (user?.id) {
      Promise.resolve(ensureProfile(user, cleanHandle)).catch(() => {});
    }
    return {
      user: user || null,
      session: sessionData?.session || null,
      needsEmailConfirm: !!payload.needsEmailConfirm,
    };
  }

  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    const payload = await workerAuth("/auth/signin", {
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    const sessionData = await applySessionTokens(payload);
    const user = sessionData?.user || payload.user;
    if (user) {
      Promise.resolve(ensureProfile(user)).catch(() => {});
    }
    return sessionData || payload;
  }

  async function signOut() {
    const sb = getClient();
    setFinanceOnboardingSoftSkip(false);
    if (!sb) return;
    try {
      await withTimeout(sb.auth.signOut(), 4000, "Sign out");
    } catch (e) {
      /* still clear local session best-effort */
    }
  }

  async function ensureProfile(user, handleOverride) {
    const sb = getClient();
    if (!sb || !user?.id) return;
    const handles = global.StudioHandles;
    const metaHandle = String(user.user_metadata?.handle || "").replace(/^@/, "");
    let base = handles?.cleanHandle
      ? handles.cleanHandle(handleOverride || metaHandle, 18)
      : String(handleOverride || metaHandle || "")
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 18);
    if (!base || handles?.isReservedHandle?.(base)) {
      base = handles?.fallbackHandleBase?.(user.email) || "user";
    }
    const handle = base + "_" + String(user.id).replace(/-/g, "").slice(0, 6);

    try {
      const { data: existing } = await withTimeout(
        sb.from("profiles").select("id").eq("id", user.id).maybeSingle(),
        4000,
        "Profile check"
      );
      if (existing?.id) return;
      await withTimeout(
        sb.from("profiles").upsert(
          {
            id: user.id,
            handle,
            display_name:
              (handleOverride || metaHandle || base).replace(/^@/, "").trim() || base,
            branding_defaults: {},
            notification_prefs: { email: true },
          },
          { onConflict: "id" }
        ),
        4000,
        "Profile save"
      );
    } catch (e) {
      console.warn("ensureProfile", e);
    }
  }

  async function getProfile() {
    const sb = getClient();
    const user = await getUser();
    if (!sb || !user) return null;
    try {
      const { data } = await withTimeout(
        sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        4000,
        "Profile"
      );
      return data || null;
    } catch (e) {
      return null;
    }
  }

  function payoutProfileFrom(profile) {
    return profile?.payout_profile &&
      typeof profile.payout_profile === "object" &&
      !Array.isArray(profile.payout_profile)
      ? profile.payout_profile
      : {};
  }

  function financeProfileComplete(profile) {
    const payout = payoutProfileFrom(profile);
    if (payout.onboardingStatus === "complete") return true;
    const methods =
      payout.methods && typeof payout.methods === "object" && !Array.isArray(payout.methods)
        ? payout.methods
        : {};
    const hasMethod = Object.values(methods).some(
      (method) => method?.enabled && String(method.handle || "").trim()
    );
    return !!(String(payout.email || "").trim() && String(payout.phone || "").trim() && hasMethod);
  }

  const FINANCE_SOFT_SKIP_KEY = "ms_finance_onboarding_soft_skip";

  function hasFinanceOnboardingSoftSkip() {
    try {
      return sessionStorage.getItem(FINANCE_SOFT_SKIP_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setFinanceOnboardingSoftSkip(enabled) {
    try {
      if (enabled) sessionStorage.setItem(FINANCE_SOFT_SKIP_KEY, "1");
      else sessionStorage.removeItem(FINANCE_SOFT_SKIP_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function financeOnboardingDone(profile) {
    return financeProfileComplete(profile);
  }

  async function financeOnboardingRedirect(nextUrl) {
    const destination = String(nextUrl || "dashboard.html");
    const profile = await getProfile();
    if (financeOnboardingDone(profile)) {
      setFinanceOnboardingSoftSkip(false);
      return destination;
    }
    return (
      "finance.html?onboarding=1&next=" +
      encodeURIComponent(destination)
    );
  }

  async function ensureFinanceOnboarding() {
    const page = document.body?.dataset?.page || "";
    if (PUBLIC_PAGES.has(page)) return null;
    const params = new URLSearchParams(location.search);
    if (page === "finance" && params.get("onboarding") === "1") return null;

    const session = await getSession();
    if (!session) return null;

    const profile = await getProfile();
    if (financeProfileComplete(profile)) {
      setFinanceOnboardingSoftSkip(false);
      return null;
    }
    if (hasFinanceOnboardingSoftSkip()) return null;

    const next =
      (location.pathname.split("/").pop() || "dashboard.html") + location.search + location.hash;
    location.replace(
      "finance.html?onboarding=1&next=" + encodeURIComponent(next)
    );
    return "redirect";
  }

  async function requestPasswordReset(email) {
    const address = String(email || "").trim();
    if (!address) throw new Error("Enter your email");
    const redirectTo = new URL("login.html?mode=recover", location.href).href;
    return workerAuth("/auth/forgot", { email: address, redirectTo });
  }

  async function setPassword(newPassword) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    const next = String(newPassword || "");
    if (next.length < 8) throw new Error("New password must be at least 8 characters");
    const { data, error } = await withTimeout(
      sb.auth.updateUser({ password: next }),
      AUTH_TIMEOUT_MS,
      "Set password"
    );
    if (error) throw error;
    return data;
  }

  async function changePassword(currentPassword, newPassword) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");

    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    if (!current) throw new Error("Enter your current password");
    if (next.length < 8) throw new Error("New password must be at least 8 characters");
    if (current === next) throw new Error("New password must be different from the current one");

    const session = await getSession();
    if (!session?.access_token) throw new Error("Not signed in");

    await workerAuth(
      "/auth/verify-password",
      { password: current },
      { Authorization: "Bearer " + session.access_token }
    );

    const { data, error } = await withTimeout(
      sb.auth.updateUser({ password: next }),
      AUTH_TIMEOUT_MS,
      "Update password"
    );
    if (error) throw error;
    return data;
  }

  async function requireAuth() {
    const page = document.body?.dataset?.page || "";
    if (PUBLIC_PAGES.has(page)) return null;
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(
        (location.pathname.split("/").pop() || "dashboard.html") + location.search
      );
      location.replace("login.html?next=" + next);
      return null;
    }
    return session;
  }

  global.StudioAuth = {
    getClient,
    getSession,
    getUser,
    getProfile,
    financeProfileComplete,
    financeOnboardingDone,
    financeOnboardingRedirect,
    ensureFinanceOnboarding,
    hasFinanceOnboardingSoftSkip,
    setFinanceOnboardingSoftSkip,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    setPassword,
    changePassword,
    ensureProfile,
    requireAuth,
    withTimeout,
    assertHandleAllowed: function (raw, opts) {
      return global.StudioHandles.assertHandleAllowed(raw, opts);
    },
    isReservedHandle: function (raw) {
      return !!global.StudioHandles?.isReservedHandle?.(raw);
    },
  };
})(window);
