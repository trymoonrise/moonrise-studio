/**
 * Worker security helpers — rate limits, password lockouts, HTTP hardening.
 * Lockout state prefers public.auth_lockouts (service role), with in-memory fallback.
 */
const crypto = require("crypto");

const AUTH_MAX_FAILURES = Number(process.env.AUTH_MAX_FAILURES || 6);
const AUTH_LOCKOUT_MS = Number(process.env.AUTH_LOCKOUT_MS || 60 * 60 * 1000); // 1 hour
const AUTH_FAILURE_WINDOW_MS = Number(process.env.AUTH_FAILURE_WINDOW_MS || 60 * 60 * 1000);

/** Process-local fallback when auth_lockouts table is unavailable. */
const memoryLockouts = new Map();

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function clientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  if (xf) return xf.slice(0, 64);
  return String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 64);
}

function emailHash(email) {
  return sha256("email:" + normalizeEmail(email));
}

function ipHash(ip) {
  return sha256("ip:" + String(ip || "unknown"));
}

function memKey(subjectType, subjectHash) {
  return subjectType + ":" + subjectHash;
}

function getMemoryRow(subjectType, subjectHash) {
  return memoryLockouts.get(memKey(subjectType, subjectHash)) || null;
}

function setMemoryRow(row) {
  memoryLockouts.set(memKey(row.subject_type, row.subject_hash), { ...row });
}

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" ||
    !!process.env.VERCEL ||
    String(process.env.VERCEL_ENV || "") === "production"
  );
}

/**
 * Baseline browser / API hardening headers (OWASP-style basics).
 */
function applySecurityHeaders(req, res, next) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()"
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (proto === "https" || isProductionRuntime()) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (req.path && !req.path.startsWith("/embed.js") && !/\.(js|css|png|jpg|svg|ico)$/i.test(req.path)) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
}

/** In-memory sliding window rate limiter (per process). */
function createRateLimiter({ windowMs, max, keyFn, name, shouldCount }) {
  const hits = new Map();
  const label = name || "rate limit";
  const countFn = typeof shouldCount === "function" ? shouldCount : () => true;

  function prune(now) {
    if (hits.size < 4000) return;
    for (const [key, bucket] of hits) {
      if (now - bucket.start >= windowMs) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    try {
      const now = Date.now();
      prune(now);
      const key = String(keyFn(req) || clientIp(req));
      let bucket = hits.get(key);
      if (!bucket || now - bucket.start >= windowMs) {
        bucket = { start: now, count: 0 };
        hits.set(key, bucket);
      }
      const counts = countFn(req) !== false;
      if (counts) bucket.count += 1;
      const remaining = Math.max(0, max - bucket.count);
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      const retryAfterSec = Math.ceil((windowMs - (now - bucket.start)) / 1000);
      res.setHeader("X-RateLimit-Reset", String(retryAfterSec));
      if (counts && bucket.count > max) {
        res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
        return res.status(429).json({
          error: `Too many requests (${label}). Try again in ${Math.max(1, retryAfterSec)}s.`,
          code: "rate_limited",
          retryAfterSec: Math.max(1, retryAfterSec),
        });
      }
      next();
    } catch (e) {
      console.error("rateLimit error", e);
      next();
    }
  };
}

function remainingMs(untilIso) {
  if (!untilIso) return 0;
  const t = new Date(untilIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - Date.now());
}

function formatCooldown(ms) {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return sec + " second" + (sec === 1 ? "" : "s");
  const min = Math.ceil(sec / 60);
  if (min < 60) return min + " minute" + (min === 1 ? "" : "s");
  const hr = Math.ceil(min / 60);
  return hr + " hour" + (hr === 1 ? "" : "s");
}

async function getLockoutRow(supabase, subjectType, subjectHash) {
  try {
    const { data, error } = await supabase
      .from("auth_lockouts")
      .select("*")
      .eq("subject_type", subjectType)
      .eq("subject_hash", subjectHash)
      .maybeSingle();
    if (error) {
      console.error("auth_lockouts read failed", error.message);
      return getMemoryRow(subjectType, subjectHash);
    }
    if (data) {
      setMemoryRow(data);
      return data;
    }
    return getMemoryRow(subjectType, subjectHash);
  } catch (e) {
    console.error("auth_lockouts read exception", e.message);
    return getMemoryRow(subjectType, subjectHash);
  }
}

async function upsertLockout(supabase, row) {
  setMemoryRow(row);
  try {
    const { error } = await supabase.from("auth_lockouts").upsert(row, {
      onConflict: "subject_type,subject_hash",
    });
    if (error) console.error("auth_lockouts upsert failed", error.message);
  } catch (e) {
    console.error("auth_lockouts upsert exception", e.message);
  }
}

async function assertNotLocked(supabase, { email, ip }) {
  const checks = [];
  if (email) checks.push({ type: "email", hash: emailHash(email) });
  if (ip) checks.push({ type: "ip", hash: ipHash(ip) });

  let worstMs = 0;
  let failedCount = 0;
  for (const c of checks) {
    const row = await getLockoutRow(supabase, c.type, c.hash);
    if (!row) continue;
    failedCount = Math.max(failedCount, Number(row.failed_count) || 0);
    const ms = remainingMs(row.locked_until);
    if (ms > worstMs) worstMs = ms;
  }

  if (worstMs > 0) {
    return {
      ok: false,
      locked: true,
      retryAfterMs: worstMs,
      failedCount,
      message:
        "Too many failed sign-in attempts. Try again in " + formatCooldown(worstMs) + ".",
      code: "auth_locked",
    };
  }
  return { ok: true, locked: false, retryAfterMs: 0, failedCount };
}

async function recordAuthFailure(supabase, { email, ip }) {
  const now = new Date();
  const targets = [];
  if (email) targets.push({ type: "email", hash: emailHash(email) });
  if (ip) targets.push({ type: "ip", hash: ipHash(ip), ipMode: true });

  let emailLockedUntil = null;
  let emailFailures = 0;

  for (const t of targets) {
    const existing = await getLockoutRow(supabase, t.type, t.hash);
    let failed = Number(existing?.failed_count) || 0;
    const lastAt = existing?.last_attempt_at ? new Date(existing.last_attempt_at).getTime() : 0;
    const stillLocked = remainingMs(existing?.locked_until) > 0;
    if (!stillLocked && lastAt && Date.now() - lastAt > AUTH_FAILURE_WINDOW_MS) {
      failed = 0;
    }
    failed += 1;

    const lockThreshold = t.ipMode ? AUTH_MAX_FAILURES * 3 : AUTH_MAX_FAILURES;
    let lockedUntil = stillLocked ? existing.locked_until : null;
    if (failed >= lockThreshold) {
      lockedUntil = new Date(now.getTime() + AUTH_LOCKOUT_MS).toISOString();
    }

    await upsertLockout(supabase, {
      subject_type: t.type,
      subject_hash: t.hash,
      failed_count: failed,
      locked_until: lockedUntil,
      last_attempt_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (!t.ipMode) {
      emailFailures = failed;
      emailLockedUntil = lockedUntil;
    }
  }

  const retryAfterMs = remainingMs(emailLockedUntil);
  const remainingTries = Math.max(0, AUTH_MAX_FAILURES - emailFailures);
  return {
    failedCount: emailFailures,
    locked: retryAfterMs > 0,
    retryAfterMs,
    remainingTries,
    message:
      retryAfterMs > 0
        ? "Too many failed sign-in attempts. Try again in " + formatCooldown(retryAfterMs) + "."
        : remainingTries > 0
          ? "Incorrect email or password. " +
            remainingTries +
            " attempt" +
            (remainingTries === 1 ? "" : "s") +
            " left before a temporary lockout."
          : "Incorrect email or password.",
    code: retryAfterMs > 0 ? "auth_locked" : "auth_failed",
  };
}

async function clearAuthFailures(supabase, { email, ip }) {
  const now = new Date().toISOString();
  const targets = [];
  if (email) targets.push({ type: "email", hash: emailHash(email) });
  if (ip) targets.push({ type: "ip", hash: ipHash(ip) });
  for (const t of targets) {
    await upsertLockout(supabase, {
      subject_type: t.type,
      subject_hash: t.hash,
      failed_count: 0,
      locked_until: null,
      last_attempt_at: now,
      updated_at: now,
    });
  }
}

module.exports = {
  AUTH_MAX_FAILURES,
  AUTH_LOCKOUT_MS,
  clientIp,
  normalizeEmail,
  createRateLimiter,
  applySecurityHeaders,
  isProductionRuntime,
  assertNotLocked,
  recordAuthFailure,
  clearAuthFailures,
  formatCooldown,
  remainingMs,
};
