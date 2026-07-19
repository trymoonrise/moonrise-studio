/**
 * Send transactional email via Resend (https://resend.com).
 * Used for contact-form leads and website purchase invoices.
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

async function sendResendEmail({ to, subject, text, html, attachments }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Email delivery is not configured (RESEND_API_KEY missing)");
  }

  const from =
    String(process.env.RESEND_FROM || "").trim() || "Moonrise Forms <onboarding@resend.dev>";

  const body = {
    from,
    to: [to],
    subject,
    text,
    html,
  };
  if (Array.isArray(attachments) && attachments.length) {
    body.attachments = attachments;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || "Could not send email");
  }
  return data;
}

async function sendContactLeadEmail({ to, businessName, fields, projectId }) {
  const subject = `New lead for ${businessName || "your website"}`;
  const text = formatLeadPlain({ businessName, fields, projectId });
  const html = formatLeadHtml({ businessName, fields, projectId });
  return sendResendEmail({ to, subject, text, html });
}

/**
 * Short payment email to the buyer with the Stripe invoice PDF attached.
 */
async function sendPurchaseInvoiceEmail({
  to,
  businessName,
  amountCents,
  siteUrl,
  pdfBase64,
  pdfFilename,
}) {
  const amount = Number.isFinite(Number(amountCents))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number(amountCents) / 100
      )
    : "";
  const name = String(businessName || "your website").trim() || "your website";
  const subject = `Invoice for ${name}`;
  const text = [
    `Thanks for your payment for ${name}.`,
    amount ? `Amount: ${amount}` : "",
    siteUrl ? `Your site: ${siteUrl}` : "",
    pdfBase64 ? "Your invoice PDF is attached." : "",
    "",
    "- Moonrise",
  ]
    .filter(Boolean)
    .join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5;">
<p style="margin:0 0 12px;">Thanks for your payment for <strong>${escapeHtml(name)}</strong>.</p>
${amount ? `<p style="margin:0 0 12px;">Amount: ${escapeHtml(amount)}</p>` : ""}
${
  siteUrl
    ? `<p style="margin:0 0 12px;">Your site: <a href="${escapeHtml(siteUrl)}">${escapeHtml(
        siteUrl
      )}</a></p>`
    : ""
}
${pdfBase64 ? `<p style="margin:0 0 12px;">Your invoice PDF is attached.</p>` : ""}
<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Moonrise</p>
</body></html>`;

  const attachments =
    pdfBase64
      ? [
          {
            filename: pdfFilename || "invoice.pdf",
            content: pdfBase64,
          },
        ]
      : undefined;

  return sendResendEmail({ to, subject, text, html, attachments });
}

module.exports = {
  sendContactLeadEmail,
  sendPurchaseInvoiceEmail,
  formatLeadPlain,
  formatLeadHtml,
};
