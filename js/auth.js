/**
 * Supabase Auth helpers + page gate for Studio.
 */
(function (global) {
  const PUBLIC_PAGES = new Set(["index", "login", "apply"]);
  const AUTH_TIMEOUT_MS = 8000;

  function getClient() {
    return global.SiteSupabase?.getClient?.() || null;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error((label || "Request") + " timed out")), ms)
      ),
    ]);
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
    const { data, error } = await withTimeout(
      sb.auth.signUp({
        email: String(email || "").trim(),
        password: String(password || ""),
        options: {
          data: {
            handle: cleanHandle,
          },
        },
      }),
      AUTH_TIMEOUT_MS,
      "Sign up"
    );
    if (error) throw error;
    // Don't block navigation on profile write
    if (data?.user?.id) {
      Promise.resolve(ensureProfile(data.user, cleanHandle)).catch(() => {});
    }
    return data;
  }

  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");
    const { data, error } = await withTimeout(
      sb.auth.signInWithPassword({
        email: String(email || "").trim(),
        password: String(password || ""),
      }),
      AUTH_TIMEOUT_MS,
      "Sign in"
    );
    if (error) throw error;
    if (data?.user) {
      Promise.resolve(ensureProfile(data.user)).catch(() => {});
    }
    return data;
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

  async function changePassword(currentPassword, newPassword) {
    const sb = getClient();
    if (!sb) throw new Error("Supabase is not configured");

    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    if (!current) throw new Error("Enter your current password");
    if (next.length < 8) throw new Error("New password must be at least 8 characters");
    if (current === next) throw new Error("New password must be different from the current one");

    const user = await getUser();
    if (!user?.email) throw new Error("Not signed in");

    const { error: verifyError } = await withTimeout(
      sb.auth.signInWithPassword({
        email: user.email,
        password: current,
      }),
      AUTH_TIMEOUT_MS,
      "Verify password"
    );
    if (verifyError) throw new Error("Current password is incorrect");

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
      location.replace("apply.html?next=" + next);
      return null;
    }
    return session;
  }

  global.StudioAuth = {
    getClient,
    getSession,
    getUser,
    getProfile,
    signUp,
    signIn,
    signOut,
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
