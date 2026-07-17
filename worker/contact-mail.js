/**
 * Send contact form leads via Resend (https://resend.com).
 */
function formatLeadPlain({ businessName, fields, projectId }) {
  const lines = [
    `New lead for ${businessName || "your website"}`,
    "",
    `Name: ${fields.name || "(not provided)"}`,
    `Phone: ${fields.phone || "(not provided)"}`,
    `Message: ${fields.message || "(not provided)"}`,
  ];

  const extras = fields.extras && typeof fields.extras === "object" ? fields.extras : {};
  for (const [key, value] of Object.entries(extras)) {
    if (value) lines.push(`${key}: ${value}`);
  }

  lines.push("", `Project: ${projectId || ""}`, "Sent by Moonrise Studio");
  return lines.join("\n");
}

function formatLeadHtml({ businessName, fields, projectId }) {
  const extras = fields.extras && typeof fields.extras === "object" ? fields.extras : {};
  const extraRows = Object.entries(extras)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-weight:600;">${escapeHtml(
          key
        )}</td><td style="padding:6px 0;">${escapeHtml(String(value))}</td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="font-family:DM Sans,system-ui,sans-serif;color:#0f172a;line-height:1.5;">
<p style="margin:0 0 16px;font-size:16px;"><strong>New lead for ${escapeHtml(
    businessName || "your website"
  )}</strong></p>
<table style="border-collapse:collapse;font-size:15px;">
<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-weight:600;">Name</td><td style="padding:6px 0;">${escapeHtml(
    fields.name || "(not provided)"
  )}</td></tr>
<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-weight:600;">Phone</td><td style="padding:6px 0;">${escapeHtml(
    fields.phone || "(not provided)"
  )}</td></tr>
<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-weight:600;vertical-align:top;">Message</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(
    fields.message || "(not provided)"
  )}</td></tr>
${extraRows}
</table>
<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Project ${escapeHtml(
    projectId || ""
  )} · Moonrise Studio</p>
</body></html>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendContactLeadEmail({ to, businessName, fields, projectId }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Email delivery is not configured (RESEND_API_KEY missing)");
  }

  const from =
    String(process.env.RESEND_FROM || "").trim() || "Moonrise Forms <onboarding@resend.dev>";
  const subject = `New lead for ${businessName || "your website"}`;
  const text = formatLeadPlain({ businessName, fields, projectId });
  const html = formatLeadHtml({ businessName, fields, projectId });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not send email");
  }
  return data;
}

module.exports = {
  sendContactLeadEmail,
  formatLeadPlain,
  formatLeadHtml,
};
