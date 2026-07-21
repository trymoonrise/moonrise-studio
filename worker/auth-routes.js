/**
 * Secured auth routes - lockouts + rate limits in front of Supabase Auth.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPPORT_EMAIL =
  String(process.env.MOONRISE_SUPPORT_EMAIL || "trymoonrise@gmail.com").trim() ||
  "trymoonrise@gmail.com";

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

function mapSignupAuthError(error) {
  const msg = String(error?.message || "").trim();
  const code = String(error?.code || "").trim();
  if (!msg || msg === "{}" || msg === "[object Object]") {
    return {
      status: 503,
      error:
        "Moonrise can't send confirmation emails yet because trymoonrise.com isn't verified in Resend. Open resend.com/domains, click Verify on trymoonrise.com, then try again. Until then, sign up with trymoonrise@gmail.com.",
      code: "email_send_failed",
    };
  }
  if (/email rate limit exceeded/i.test(msg) || code === "over_email_send_rate_limit") {
    return {
      status: 429,
      error:
        `Too many verification emails were sent. Wait about an hour and try again, or contact ${SUPPORT_EMAIL}.`,
      code: "email_rate_limited",
    };
  }
  if (
    /could not send email|error sending confirmation|testing emails to your own email|domain is not verified|verify a domain/i.test(
      msg
    )
  ) {
    return {
      status: 503,
      error:
        "trymoonrise.com DNS looks set up, but Resend hasn't verified the domain yet. Go to resend.com/domains → trymoonrise.com → Verify, wait a few minutes, then try signup again.",
      code: "email_send_failed",
    };
  }
  if (/already registered|already exists|user already registered/i.test(msg)) {
    return {
      status: 400,
      error: "An account with this email already exists. Sign in instead.",
      code: "signup_exists",
    };
  }
  return {
    status: 400,
    error: msg || "Sign up failed",
    code: "signup_failed",
  };
}

function validatePassword(password, email) {
  const value = String(password || "");
  if (value.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters", code: "weak_password" };
  }
  if (value.length > 128) {
    return { ok: false, error: "Password is too long", code: "weak_password" };
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return {
      ok: false,
      error: "Password must include at least one letter and one number",
      code: "weak_password",
    };
  }
  const local = String(email || "").split("@")[0].toLowerCase();
  if (local && local.length >= 3 && value.toLowerCase().includes(local)) {
    return {
      ok: false,
      error: "Password must not contain your email address",
      code: "weak_password",
    };
  }
  const common = new Set([
    "password",
    "password1",
    "12345678",
    "qwerty123",
    "moonrise",
    "admin123",
    "letmein1",
    "welcome1",
    "passw0rd",
  ]);
  if (common.has(value.toLowerCase())) {
    return { ok: false, error: "Choose a stronger password", code: "weak_password" };
  }
  return { ok: true };
}

function mountAuthRoutes(app, { db, security }) {
  const {
    clientIp,
    normalizeEmail,
    emailHash,
    createDistributedRateLimiter,
    assertNotLocked,
    recordAuthFailure,
    clearAuthFailures,
  } = security;

  const limit = (opts) => createDistributedRateLimiter(db, opts);

  const authIpLimiter = limit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    name: "auth",
    keyFn: (req) => "auth-ip:" + clientIp(req),
  });

  const signupLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    name: "signup",
    keyFn: (req) => "signup-ip:" + clientIp(req),
  });

  const signinEmailLimiter = limit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    name: "signin-email",
    keyFn: (req) => "signin-email:" + emailHash(normalizeEmail(req.body?.email || "")),
    shouldCount: (req) => !!normalizeEmail(req.body?.email),
  });

  const signupEmailLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    name: "signup-email",
    keyFn: (req) => "signup-email:" + emailHash(normalizeEmail(req.body?.email || "")),
    shouldCount: (req) => !!normalizeEmail(req.body?.email),
  });

  const forgotLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    name: "password-reset",
    keyFn: (req) => "forgot-ip:" + clientIp(req),
  });

  const forgotEmailLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    name: "password-reset-email",
    keyFn: (req) => "forgot-email:" + emailHash(normalizeEmail(req.body?.email || "")),
    shouldCount: (req) => !!normalizeEmail(req.body?.email),
  });

  const resendLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    name: "resend-confirm",
    keyFn: (req) => "resend-ip:" + clientIp(req),
  });

  const resendEmailLimiter = limit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    name: "resend-confirm-email",
    keyFn: (req) => "resend-email:" + emailHash(normalizeEmail(req.body?.email || "")),
    shouldCount: (req) => !!normalizeEmail(req.body?.email),
  });

  const verifyPasswordLimiter = limit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    name: "verify-password",
    keyFn: (req) => "verify-pw-ip:" + clientIp(req),
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
      const ip = clientIp(req);
      const gate = await assertNotLocked(db(), { email: null, ip });
      res.json({
        locked: !!gate.locked,
        retryAfterMs: gate.retryAfterMs || 0,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Status check failed" });
    }
  });

  app.post("/auth/signin", authIpLimiter, signinEmailLimiter, async (req, res) => {
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
        const authMessage = String(error?.message || "");
        if (/email not confirmed/i.test(authMessage)) {
          return res.status(403).json({
            error:
              "Verify your email first. Check your inbox for the Moonrise confirmation link, then sign in.",
            code: "email_not_confirmed",
          });
        }
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

  app.post("/auth/signup", authIpLimiter, signupLimiter, signupEmailLimiter, async (req, res) => {
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
      const pwCheck = validatePassword(password, email);
      if (!pwCheck.ok) {
        return res.status(400).json({ error: pwCheck.error, code: pwCheck.code });
      }

      const gate = await assertNotLocked(db(), { email, ip });
      if (!gate.ok) {
        return res.status(429).json({
          error: gate.message,
          code: gate.code || "auth_locked",
          retryAfterMs: gate.retryAfterMs,
        });
      }

      const publicAppUrl = String(process.env.PUBLIC_APP_URL || "https://trymoonrise.com").replace(/\/$/, "");
      const { data, error } = await authClient().auth.signUp({
        email,
        password,
        options: {
          data: handle ? { handle } : undefined,
          emailRedirectTo: `${publicAppUrl}/login.html?confirmed=1`,
        },
      });
      if (error) {
        const mapped = mapSignupAuthError(error);
        return res.status(mapped.status).json({ error: mapped.error, code: mapped.code });
      }

      if (data?.user && !data?.session) {
        const identities = data.user.identities;
        if (!identities || identities.length === 0) {
          return res.status(400).json({
            error: "An account with this email already exists. Sign in instead.",
            code: "signup_exists",
          });
        }
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

  app.post("/auth/forgot", authIpLimiter, forgotLimiter, forgotEmailLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.body?.email);
      const publicAppUrl = String(process.env.PUBLIC_APP_URL || "https://trymoonrise.com").replace(/\/$/, "");
      const redirectTo =
        String(req.body?.redirectTo || "").trim() || `${publicAppUrl}/login.html?mode=recover`;
      if (!email) {
        return res.status(400).json({ error: "Enter your email", code: "invalid_input" });
      }
      // Always return success-shaped response to avoid email enumeration,
      // but still enforce IP rate limits above.
      const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo });
      if (error) console.warn("resetPasswordForEmail", error.message);
      res.json({ ok: true, message: "If that email exists, a reset link is on the way." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Reset failed" });
    }
  });

  app.post("/auth/resend-confirm", authIpLimiter, resendLimiter, resendEmailLimiter, async (req, res) => {
    if (!authConfigured(res)) return;
    try {
      const email = normalizeEmail(req.body?.email);
      if (!email) {
        return res.status(400).json({ error: "Enter your email", code: "invalid_input" });
      }
      const publicAppUrl = String(process.env.PUBLIC_APP_URL || "https://trymoonrise.com").replace(/\/$/, "");
      const { error } = await authClient().auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${publicAppUrl}/login.html?confirmed=1`,
        },
      });
      if (error) {
        const mapped = mapSignupAuthError(error);
        return res.status(mapped.status).json({ error: mapped.error, code: mapped.code });
      }
      res.json({ ok: true, message: "Confirmation email sent. Check your inbox." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Resend failed" });
    }
  });

  /**
   * Verify current password under lockout rules (Settings → change password).
   * Body: { email?, password } - email defaults from Bearer user.
   */
  app.post("/auth/verify-password", authIpLimiter, verifyPasswordLimiter, async (req, res) => {
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
