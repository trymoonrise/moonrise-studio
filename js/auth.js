/**
 * Supabase Auth helpers + page gate for Studio.
 * Sign-in / sign-up / reset go through the worker so lockouts + rate limits apply.
 */
(function (global) {
  const PUBLIC_PAGES = new Set([
    "index",
    "login",
    "apply",
    "orders",
    "home",
    "contact",
    "privacy",
    "terms",
    "download",
  ]);
  const SUPPORT_EMAIL = "trymoonrise@gmail.com";
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
    if (typeof global.resolveWorkerUrl === "function") {
      const resolved = String(global.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    return String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
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

  function isUselessAuthErrorText(text) {
    const value = String(text || "").trim();
    return !value || value === "{}" || value === "[object Object]";
  }

  function pickAuthErrorMessage(payload, fallback) {
    const raw =
      payload && payload.error !== undefined
        ? payload.error
        : payload && payload.message !== undefined
          ? payload.message
          : undefined;
    if (typeof raw === "string") {
      const text = raw.trim();
      if (text && !isUselessAuthErrorText(text)) return text;
    }
    if (raw && typeof raw === "object") {
      if (typeof raw.message === "string" && raw.message.trim()) return raw.message.trim();
    }
    const code = String(payload?.code || "").trim();
    if (code === "signup_exists") {
      return "An account with this email already exists. Sign in instead.";
    }
    if (code === "email_rate_limited" || code === "over_email_send_rate_limit") {
      return "Too many verification emails were sent. Wait about an hour and try again.";
    }
    if (code === "email_send_failed") {
      return (
        fallback ||
        "Moonrise can't send confirmation emails yet. Verify trymoonrise.com in Resend (resend.com/domains), or sign up with trymoonrise@gmail.com for now."
      );
    }
    if (code === "signup_failed") {
      return fallback || "Sign up failed. Please try again in a few minutes.";
    }
    return fallback || "Authentication failed";
  }

  function authError(payload, fallback) {
    const err = new Error(pickAuthErrorMessage(payload, fallback));
    err.code = payload?.code || "";
    err.retryAfterMs = Number(payload?.retryAfterMs) || 0;
    err.remainingTries = payload?.remainingTries;
    return err;
  }

  function formatAuthError(err, fallback) {
    if (!err) return fallback || "Authentication failed";
    if (typeof err === "string") {
      const text = err.trim();
      return text && text !== "[object Object]" && text !== "{}" ? text : fallback || "Authentication failed";
    }
    const fromMessage = pickAuthErrorMessage(
      {
        error: err.message,
        message: err.message,
        code: err.code,
      },
      fallback
    );
    if (fromMessage && fromMessage !== "Authentication failed") return fromMessage;
    if (typeof err.code === "string" && err.code === "email_rate_limited") {
      return "Too many verification emails were sent. Wait about an hour and try again.";
    }
    return fallback || "Authentication failed";
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
      global.MsAuthSecurity?.scrubUrlAuthFragments?.();
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

  function readAuthCallbackParams() {
    if (typeof location === "undefined") {
      return { hash: new URLSearchParams(), query: new URLSearchParams() };
    }
    const hash = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const query = new URLSearchParams(String(location.search || ""));
    return { hash, query };
  }

  /** Finish email confirm / magic-link / recovery callbacks and persist session. */
  async function completeAuthCallbackFromUrl() {
    const sb = getClient();
    if (!sb || typeof location === "undefined") return null;

    const { hash, query } = readAuthCallbackParams();
    const accessToken = hash.get("access_token") || query.get("access_token");
    const refreshToken = hash.get("refresh_token") || query.get("refresh_token");
    if (accessToken && refreshToken) {
      const data = await applySessionTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      global.MsAuthSecurity?.scrubUrlAuthFragments?.();
      return data?.session || (await getSession());
    }

    const code = query.get("code");
    if (code) {
      try {
        const { data, error } = await withTimeout(
          sb.auth.exchangeCodeForSession(code),
          AUTH_TIMEOUT_MS,
          "Confirm email"
        );
        if (!error && data?.session) {
          global.MsAuthSecurity?.scrubUrlAuthFragments?.();
          return data.session;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    const tokenHash = query.get("token_hash");
    const otpType = String(query.get("type") || hash.get("type") || "signup").toLowerCase();
    if (tokenHash) {
      const verifyType =
        otpType === "recovery"
          ? "recovery"
          : otpType === "email_change"
            ? "email_change"
            : otpType === "invite"
              ? "invite"
              : "signup";
      try {
        const { data, error } = await withTimeout(
          sb.auth.verifyOtp({ token_hash: tokenHash, type: verifyType }),
          AUTH_TIMEOUT_MS,
          "Verify email"
        );
        if (!error && data?.session) {
          global.MsAuthSecurity?.scrubUrlAuthFragments?.();
          return data.session;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    return (await getSession()) || null;
  }

  function clearAuthCallbackFromUrl() {
    if (typeof location === "undefined") return;
    try {
      global.MsAuthSecurity?.scrubUrlAuthFragments?.();
      const params = new URLSearchParams(location.search);
      params.delete("code");
      params.delete("token_hash");
      params.delete("type");
      params.delete("confirmed");
      params.delete("check_email");
      const next = params.get("next") || "dashboard.html";
      params.delete("next");
      const qs = new URLSearchParams();
      if (next !== "dashboard.html") qs.set("next", next);
      if (params.get("mode") === "signup") qs.set("mode", "signup");
      const suffix = qs.toString() ? "?" + qs.toString() : "";
      history.replaceState(null, "", location.pathname + suffix);
    } catch (_) {
      /* ignore */
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
    try {
      global.MsAuthSecurity?.clearSensitiveClientStorage?.();
    } catch (_) {
      /* ignore */
    }
    if (!sb) return;
    try {
      await withTimeout(sb.auth.signOut(), 4000, "Sign out");
    } catch (e) {
      /* still clear local session best-effort */
    }
    try {
      global.localStorage.removeItem("moonrise-studio-auth");
    } catch (_) {
      /* ignore */
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
            notification_prefs: { email: true, clientPurchases: false },
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

    return !!(
      String(payout.email || "").trim() &&
      String(payout.phone || "").trim() &&
      String(payout.payoutMethod || payout.payout_method || "").trim() &&
      String(payout.payoutHandle || payout.payout_handle || "").trim()
    );
  }

  async function studioOnboardingRedirect(nextUrl) {
    const destination = String(nextUrl || "dashboard.html");
    const profile = await getProfile();
    if (studioOnboarded(profile)) {
      return destination;
    }
    return "onboarding.html?next=" + encodeURIComponent(destination);
  }

  async function ensureStudioOnboarding(existingSession) {
    const page = document.body?.dataset?.page || "";
    if (PUBLIC_PAGES.has(page)) return null;
    if (page === "onboarding") return null;

    const session = existingSession || (await getSession());
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

  async function resendConfirmationEmail(email) {
    const address = String(email || "").trim();
    if (!address) throw new Error("Enter your email");
    return workerAuth("/auth/resend-confirm", { email: address });
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

  function releaseAuthGate() {
    try {
      if (typeof global.__msReleaseAuthGate === "function") {
        global.__msReleaseAuthGate();
        return;
      }
      document.documentElement.classList.remove("ms-auth-gating");
      document.documentElement.classList.add("ms-auth-ready");
    } catch (_) {
      /* ignore */
    }
  }

  async function requireAuth() {
    const page = document.body?.dataset?.page || "";
    if (PUBLIC_PAGES.has(page)) {
      releaseAuthGate();
      return null;
    }
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(
        (location.pathname.split("/").pop() || "dashboard.html") + location.search + location.hash
      );
      location.replace("login.html?next=" + next);
      return null;
    }
    releaseAuthGate();
    return session;
  }

  global.StudioAuth = {
    getClient,
    getSession,
    getUser,
    getProfile,
    friendlyNetworkMessage: friendlyAuthMessage,
    formatAuthError,
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
    completeAuthCallbackFromUrl,
    clearAuthCallbackFromUrl,
    requestPasswordReset,
    resendConfirmationEmail,
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
