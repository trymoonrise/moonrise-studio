/**
 * Secured auth routes — lockouts + rate limits in front of Supabase Auth.
 */
const { createClient } = require("@supabase/supabase-js");

function createAuthClient() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const anon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) {
    const err = new Error(
      "Supabase auth is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to worker/.env (local) or Vercel env vars, then restart the worker."
    );
    err.status = 503;
    err.code = "SUPABASE_NOT_CONFIGURED";
    throw err;
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mountAuthRoutes(app, { db, security }) {
  const {
    clientIp,
    normalizeEmail,
    createRateLimiter,
    assertNotLocked,
    recordAuthFailure,
    clearAuthFailures,
  } = security;

  const authIpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    name: "auth",
    keyFn: (req) => "auth-ip:" + clientIp(req),
  });

  const signupLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    name: "signup",
    keyFn: (req) => "signup-ip:" + clientIp(req),
  });

  const forgotLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    name: "password-reset",
    keyFn: (req) => "forgot-ip:" + clientIp(req),
  });

  let _auth = null;
  function authClient() {
    if (!_auth) _auth = createAuthClient();
    return _auth;
  }

  function authConfigured(res) {
    try {
      authClient();
      db();
      return true;
    } catch (e) {
      res.status(503).json({
        error: "Auth service is not configured on the worker.",
        code: "auth_unavailable",
      });
      return false;
    }
  }

  app.get("/auth/status", authIpLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.query.email || "");
      const ip = clientIp(req);
      const gate = await assertNotLocked(db(), { email: email || null, ip });
      res.json({
        locked: !!gate.locked,
        retryAfterMs: gate.retryAfterMs || 0,
        failedCount: gate.failedCount || 0,
        message: gate.locked ? gate.message : null,
        maxFailures: security.AUTH_MAX_FAILURES,
        lockoutMs: security.AUTH_LOCKOUT_MS,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Status check failed" });
    }
  });

  app.post("/auth/signin", authIpLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      const ip = clientIp(req);
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required", code: "invalid_input" });
      }

      const gate = await assertNotLocked(db(), { email, ip });
      if (!gate.ok) {
        return res.status(429).json({
          error: gate.message,
          code: gate.code || "auth_locked",
          retryAfterMs: gate.retryAfterMs,
        });
      }

      const { data, error } = await authClient().auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        const fail = await recordAuthFailure(db(), { email, ip });
        const status = fail.locked ? 429 : 401;
        return res.status(status).json({
          error: fail.message,
          code: fail.code,
          retryAfterMs: fail.retryAfterMs || 0,
          remainingTries: fail.remainingTries,
        });
      }

      await clearAuthFailures(db(), { email, ip });
      res.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type || "bearer",
        user: data.user,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Sign in failed" });
    }
  });

  app.post("/auth/signup", authIpLimiter, signupLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      const handle = String(req.body?.handle || "")
        .trim()
        .replace(/^@/, "")
        .toLowerCase();
      const ip = clientIp(req);
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required", code: "invalid_input" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters", code: "weak_password" });
      }

      const gate = await assertNotLocked(db(), { email, ip });
      if (!gate.ok) {
        return res.status(429).json({
          error: gate.message,
          code: gate.code || "auth_locked",
          retryAfterMs: gate.retryAfterMs,
        });
      }

      const { data, error } = await authClient().auth.signUp({
        email,
        password,
        options: {
          data: handle ? { handle } : undefined,
        },
      });
      if (error) {
        // Do not count "user already registered" as a password failure lockout.
        return res.status(400).json({ error: error.message, code: "signup_failed" });
      }

      if (data?.session) {
        await clearAuthFailures(db(), { email, ip });
        return res.json({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type || "bearer",
          user: data.user,
          needsEmailConfirm: false,
        });
      }

      res.json({
        user: data?.user || null,
        needsEmailConfirm: true,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Sign up failed" });
    }
  });

  app.post("/auth/forgot", authIpLimiter, forgotLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.body?.email);
      const redirectTo = String(req.body?.redirectTo || "").trim();
      if (!email) {
        return res.status(400).json({ error: "Enter your email", code: "invalid_input" });
      }
      // Always return success-shaped response to avoid email enumeration,
      // but still enforce IP rate limits above.
      const opts = redirectTo ? { redirectTo } : undefined;
      const { error } = await authClient().auth.resetPasswordForEmail(email, opts);
      if (error) console.warn("resetPasswordForEmail", error.message);
      res.json({ ok: true, message: "If that email exists, a reset link is on the way." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Reset failed" });
    }
  });

  /**
   * Verify current password under lockout rules (Settings → change password).
   * Body: { email?, password } — email defaults from Bearer user.
   */
  app.post("/auth/verify-password", authIpLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const password = String(req.body?.password || "");
      if (!password) {
        return res.status(400).json({ error: "Password required", code: "invalid_input" });
      }

      const header = String(req.headers.authorization || "");
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      let email = normalizeEmail(req.body?.email);
      if (token) {
        const { data, error } = await db().auth.getUser(token);
        if (error || !data?.user) {
          return res.status(401).json({ error: "Invalid auth token", code: "unauthorized" });
        }
        email = normalizeEmail(data.user.email || email);
      }
      if (!email) {
        return res.status(400).json({ error: "Email required", code: "invalid_input" });
      }

      const ip = clientIp(req);
      const gate = await assertNotLocked(db(), { email, ip });
      if (!gate.ok) {
        return res.status(429).json({
          error: gate.message,
          code: gate.code || "auth_locked",
          retryAfterMs: gate.retryAfterMs,
        });
      }

      const { data, error } = await authClient().auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        const fail = await recordAuthFailure(db(), { email, ip });
        const status = fail.locked ? 429 : 401;
        return res.status(status).json({
          error: fail.message,
          code: fail.code,
          retryAfterMs: fail.retryAfterMs || 0,
          remainingTries: fail.remainingTries,
        });
      }

      await clearAuthFailures(db(), { email, ip });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Verify failed" });
    }
  });
}

module.exports = { mountAuthRoutes, createAuthClient };
