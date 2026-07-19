/**
 * Apply Moonrise-branded Supabase Auth email templates + Resend SMTP.
 *
 * Usage (from moonrise-studio/worker):
 *   node scripts/apply-supabase-auth-email.js
 *
 * Reads SUPABASE_ACCESS_TOKEN, RESEND_API_KEY, RESEND_FROM from env or
 * ../../accesstokens.env (repo root, gitignored).
 */
const fs = require("fs");
const path = require("path");

const PROJECT_REF = "erfaxgmnzdropviormpj";
const SITE_URL = "https://trymoonrise.com";
const REDIRECT_ALLOW_LIST = [
  "https://trymoonrise.com/login.html",
  "https://trymoonrise.com/login.html**",
  "https://trymoonrise.com/**",
  "https://www.trymoonrise.com/login.html",
  "https://www.trymoonrise.com/login.html**",
  "https://www.trymoonrise.com/**",
  "http://localhost:3000/login.html",
  "http://localhost:3000/**",
  "http://127.0.0.1:3000/login.html",
  "http://127.0.0.1:3000/**",
  "http://127.0.0.1:5500/**",
  "http://127.0.0.1:8787/**",
].join(",");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

function parseFromAddress(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Moonrise", email: text || "onboarding@resend.dev" };
}

function emailShell({ title, bodyHtml, buttonLabel, buttonHref, finePrint }) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#0b1220;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111827;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 10px;text-align:center;">
              <div style="font-size:24px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;">Moonrise</div>
              <div style="font-size:13px;color:#94a3b8;margin-top:6px;">Build websites. Get paid.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:0 0 12px;font-family:Segoe UI,Arial,sans-serif;font-size:22px;line-height:1.35;color:#ffffff;">${title}</h1>
              <div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.65;color:#cbd5e1;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 8px;">
              <a href="${buttonHref}" style="display:inline-block;background:#6d5efc;color:#ffffff;text-decoration:none;font-family:Segoe UI,Arial,sans-serif;font-weight:650;font-size:15px;padding:12px 22px;border-radius:10px;">${buttonLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.55;color:#64748b;">
              ${finePrint}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #1e293b;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
              Moonrise · <a href="${SITE_URL}" style="color:#93c5fd;text-decoration:none;">trymoonrise.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTemplates() {
  const confirmation = emailShell({
    title: "Confirm your email",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">Welcome to Moonrise. Tap the button below to verify <strong>{{ .Email }}</strong> — you'll be signed in automatically.</p>",
    buttonLabel: "Confirm email",
    buttonHref: "{{ .ConfirmationURL }}",
    finePrint:
      "This link expires soon and can only be used once. If you did not create a Moonrise account, you can ignore this email.",
  });

  const recovery = emailShell({
    title: "Reset your password",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">We received a request to reset the password for your Moonrise account (<strong>{{ .Email }}</strong>).</p>",
    buttonLabel: "Reset password",
    buttonHref: "{{ .ConfirmationURL }}",
    finePrint:
      "If you did not request a password reset, you can safely ignore this email.",
  });

  const magicLink = emailShell({
    title: "Sign in to Moonrise",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">Use the button below to sign in to your Moonrise account. This link expires shortly.</p>",
    buttonLabel: "Sign in",
    buttonHref: "{{ .ConfirmationURL }}",
    finePrint: "If you did not try to sign in, you can ignore this email.",
  });

  const invite = emailShell({
    title: "You are invited to Moonrise",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">You have been invited to join Moonrise Studio. Accept the invite to create your account.</p>",
    buttonLabel: "Accept invite",
    buttonHref: "{{ .ConfirmationURL }}",
    finePrint: "If you were not expecting this invite, you can ignore this email.",
  });

  const emailChange = emailShell({
    title: "Confirm your new email",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">Confirm <strong>{{ .NewEmail }}</strong> as the new email for your Moonrise account.</p>",
    buttonLabel: "Confirm new email",
    buttonHref: "{{ .ConfirmationURL }}",
    finePrint: "If you did not request this change, you can ignore this email.",
  });

  const reauth = emailShell({
    title: "Your verification code",
    bodyHtml:
      "<p style=\"margin:0 0 12px;\">Enter this code to continue:</p><p style=\"margin:0;font-size:28px;font-weight:700;letter-spacing:0.18em;color:#ffffff;\">{{ .Token }}</p>",
    buttonLabel: "Open Moonrise",
    buttonHref: SITE_URL,
    finePrint: "This code expires shortly. Never share it with anyone.",
  });

  return {
    mailer_subjects_confirmation: "Confirm your Moonrise account",
    mailer_templates_confirmation_content: confirmation,
    mailer_subjects_recovery: "Reset your Moonrise password",
    mailer_templates_recovery_content: recovery,
    mailer_subjects_magic_link: "Your Moonrise sign-in link",
    mailer_templates_magic_link_content: magicLink,
    mailer_subjects_invite: "You are invited to Moonrise",
    mailer_templates_invite_content: invite,
    mailer_subjects_email_change: "Confirm your new Moonrise email",
    mailer_templates_email_change_content: emailChange,
    mailer_subjects_reauthentication: "Your Moonrise verification code",
    mailer_templates_reauthentication_content: reauth,
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", "..", "..", "accesstokens.env"));
  loadEnvFile(path.join(__dirname, "..", ".env"));

  const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = parseFromAddress(process.env.RESEND_FROM);

  if (!accessToken) {
    console.error("Missing SUPABASE_ACCESS_TOKEN");
    process.exit(1);
  }
  if (!resendKey) {
    console.error("Missing RESEND_API_KEY");
    process.exit(1);
  }

  const payload = {
    site_url: SITE_URL,
    uri_allow_list: REDIRECT_ALLOW_LIST,
    external_email_enabled: true,
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: resendKey,
    smtp_admin_email: from.email,
    smtp_sender_name: from.name || "Moonrise",
    rate_limit_email_sent: 100,
    ...buildTemplates(),
  };

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Auth config update failed:", res.status, text);
    process.exit(1);
  }

  console.log("Moonrise auth email branding applied.");
  console.log("- SMTP: Resend (" + from.email + ")");
  console.log("- Site URL:", SITE_URL);
  console.log("- Templates: confirmation, recovery, magic link, invite, email change, reauth");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
