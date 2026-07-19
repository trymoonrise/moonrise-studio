/**
 * Supabase Auth helpers + page gate for Studio.
 * Sign-in / sign-up / reset go through the worker so lockouts + rate limits apply.
 */
(function (global) {
  const PUBLIC_PAGES = new Set(["index", "login", "apply", "orders", "home", "contact", "privacy", "terms"]);
  const AUTH_TIMEOUT_MS = 45000;
  const AUTH_RETRY_DELAY_MS = 800;

  function getClient() {
    return global.SiteSupabase?.getClient?.() || null;
  }

  function isLocalFilePage() {
    try {
      return typeof location !== "undefined" && location.protocol === "file:";
    } catch (_) {
      return false;
    }
  }

  function workerUrl() {
    const cloud = String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
    try {
      if (typeof location !== "undefined" && cloud) {
        const cloudOrigin = new URL(cloud).origin;
        if (location.origin === cloudOrigin) return location.origin;
      }
    } catch (_) {
      /* keep cloud fallback */
    }
    if (typeof global.resolveWorkerUrl === "function") {
      const resolved = String(global.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    return cloud;
  }

  function assertAuthReachable() {
    if (isLocalFilePage()) {
      throw authError({
        error:
          "Sign-in does not work when this page is opened as a file. Use https://trymoonrise.com/login.html instead.",
        code: "file_protocol",
      });
    }
    if (!workerUrl()) {
      throw authError({ error: "Worker URL is not configured", code: "worker_missing" });
    }
  }

  function warmAuthService() {
    if (isLocalFilePage()) return;
    const base = workerUrl();
    if (!base) return;
    void fetch(base + "/auth/status", { method: "GET", cache: "no-store" }).catch(() => {});
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
      if (isLocalFilePage()) {
        return "Sign-in does not work when this page is opened as a file. Use https://trymoonrise.com/login.html instead.";
      }
      if (fallback) return fallback;
      return "Can't reach the sign-in service. Check your connection and try again.";
    }
    if (lower.includes("timed out") || lower.includes("timeout")) {
      if (fallback) return fallback;
      return "Sign-in timed out. Please try again.";
    }
    return raw || fallback || "Authentication failed";
  }

  async function workerAuth(path, body, headers, attempt = 0) {
    assertAuthReachable();
    const base = workerUrl();
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
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS));
        return workerAuth(path, body, headers, attempt + 1);
      }
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
    try {
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
    } catch (e) {
      throw authError({
        error: friendlyAuthMessage(e, "Could not save your session. Try again."),
        code: "session_error",
      });
    }
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

  function brandingDefaultsFrom(profile) {
    return profile?.branding_defaults &&
      typeof profile.branding_defaults === "object" &&
      !Array.isArray(profile.branding_defaults)
      ? profile.branding_defaults
      : {};
  }

  function payoutProfileComplete(profile) {
    return studioOnboarded(profile);
  }

  function verifiedSecurityCard(payout) {
    const card = payout?.securityCard;
    return !!(
      card &&
      String(card.verifiedAt || "").trim() &&
      String(card.paymentMethodId || "").trim()
    );
  }

  const FORCE_ONBOARDING_REPLAY_KEY = "ms_force_studio_onboarding_replay";

  function hasForceOnboardingReplay() {
    try {
      return sessionStorage.getItem(FORCE_ONBOARDING_REPLAY_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setForceOnboardingReplay(enabled) {
    try {
      if (enabled) sessionStorage.setItem(FORCE_ONBOARDING_REPLAY_KEY, "1");
      else sessionStorage.removeItem(FORCE_ONBOARDING_REPLAY_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function studioOnboarded(profile) {
    if (!profile) return false;
    if (hasForceOnboardingReplay()) return false;

    const branding = brandingDefaultsFrom(profile);
    if (!String(branding.studioOnboardedAt || "").trim()) return false;

    const payout = payoutProfileFrom(profile);
    if (String(payout.onboardingStatus || "") !== "complete") return false;
    if (String(payout.skippedAt || "").trim()) return false;
    if (!verifiedSecurityCard(payout)) return false;

    return !!(String(payout.email || "").trim() && String(payout.phone || "").trim());
  }

  async function studioOnboardingRedirect(nextUrl) {
    const destination = String(nextUrl || "dashboard.html");
    const profile = await getProfile();
    if (studioOnboarded(profile)) {
      return destination;
    }
    return "onboarding.html?next=" + encodeURIComponent(destination);
  }

  async function ensureStudioOnboarding() {
    const page = document.body?.dataset?.page || "";
    if (PUBLIC_PAGES.has(page)) return null;
    if (page === "onboarding") return null;

    const session = await getSession();
    if (!session) return null;

    const profile = await getProfile();
    if (studioOnboarded(profile)) {
      return null;
    }

    const next =
      (location.pathname.split("/").pop() || "dashboard.html") + location.search + location.hash;
    const replayQs = hasForceOnboardingReplay() ? "replay=1&" : "";
    location.replace(
      "onboarding.html?" + replayQs + "next=" + encodeURIComponent(next)
    );
    return "redirect";
  }

  async function clearStudioOnboardingFlag() {
    setForceOnboardingReplay(true);
    const user = await getUser();
    if (!user) throw new Error("Not signed in");
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    const profile = await getProfile();
    const branding = { ...brandingDefaultsFrom(profile) };
    branding.studioOnboardedAt = null;
    delete branding.studioOnboardedAt;
    const { error } = await withTimeout(
      sb.from("profiles").update({ branding_defaults: branding }).eq("id", user.id),
      6000,
      "Clear onboarding"
    );
    if (error) throw error;
    return branding;
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
    friendlyNetworkMessage: friendlyAuthMessage,
    warmAuthService,
    workerUrl,
    payoutProfileComplete,
    studioOnboarded,
    studioOnboardingRedirect,
    ensureStudioOnboarding,
    clearStudioOnboardingFlag,
    hasForceOnboardingReplay,
    setForceOnboardingReplay,
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
