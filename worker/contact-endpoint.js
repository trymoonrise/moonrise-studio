/**
 * Detect contact form custom endpoint type from a pasted URL.
 */
function detectContactEndpoint(url) {
  const raw = String(url || "").trim();
  if (!raw) return { type: "invalid", url: "" };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return { type: "invalid", url: raw };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { type: "invalid", url: raw };
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (host.includes("formspree.io") && /\/f\/[a-z0-9]+/i.test(pathname)) {
    return { type: "formspree", url: raw };
  }

  if (
    (host.includes("discord.com") || host.includes("discordapp.com")) &&
    pathname.includes("/api/webhooks/")
  ) {
    return { type: "discord", url: raw };
  }

  if (host === "api.telegram.org" && pathname.includes("/sendmessage")) {
    const chatId = parsed.searchParams.get("chat_id");
    if (!chatId) {
      return { type: "telegram", url: raw, needsChatId: true };
    }
    return { type: "telegram", url: raw, chatId };
  }

  return { type: "webhook", url: raw };
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hasContactForm(html) {
  return /<form[\s>]/i.test(String(html || ""));
}

function withDefaultContactFormContext(ctx, existingContext) {
  const prior =
    existingContext?.contactForm && typeof existingContext.contactForm === "object"
      ? existingContext.contactForm
      : null;
  return {
    ...(ctx && typeof ctx === "object" ? ctx : {}),
    contactForm: prior || {
      enabled: true,
      mode: "auto",
      notificationEmail: "",
      endpointUrl: "",
      endpointType: "",
    },
  };
}

/**
 * Inject a standard contact section when generation omitted a <form>.
 */
function ensureContactFormHtml(html, meta) {
  const src = String(html || "");
  if (hasContactForm(src)) return src;

  const businessName = escapeHtmlText(
    String(meta?.businessName || meta?.business_name || "us").trim() || "us"
  );
  const phone = String(meta?.phone || "").trim();
  const phoneDigits = phone.replace(/[^\d+]/g, "");
  const phoneLink = phone
    ? `<p class="moonrise-contact-phone"><a href="tel:${escapeHtmlAttr(phoneDigits)}">${escapeHtmlText(phone)}</a></p>`
    : "";

  const section =
    `\n<section id="contact" class="moonrise-contact-section" aria-labelledby="moonrise-contact-heading">` +
    `<div class="moonrise-contact-inner">` +
    `<h2 id="moonrise-contact-heading">Get in touch</h2>` +
    `<p>Contact ${businessName} — we will get back to you shortly.</p>` +
    phoneLink +
    `<form class="moonrise-contact-form" method="post" action="#">` +
    `<div class="moonrise-contact-field"><label for="moonrise-contact-name">Name</label>` +
    `<input id="moonrise-contact-name" name="name" type="text" autocomplete="name" required placeholder="Your name"></div>` +
    `<div class="moonrise-contact-field"><label for="moonrise-contact-phone">Phone number</label>` +
    `<input id="moonrise-contact-phone" name="phone" type="tel" autocomplete="tel" required placeholder="(555) 123-4567"></div>` +
    `<div class="moonrise-contact-field"><label for="moonrise-contact-message">How can we help you?</label>` +
    `<textarea id="moonrise-contact-message" name="message" rows="4" required placeholder="Tell us what you need"></textarea></div>` +
    `<button type="submit" class="moonrise-contact-submit">Send message</button>` +
    `</form></div></section>` +
    `<style>` +
    `.moonrise-contact-section{padding:clamp(2.5rem,6vw,4rem) clamp(1rem,4vw,2rem);background:var(--surface,#fff);color:var(--ink,#0f172a)}` +
    `.moonrise-contact-inner{max-width:42rem;margin:0 auto;display:grid;gap:1rem}` +
    `.moonrise-contact-form{display:grid;gap:1rem;margin-top:.5rem}` +
    `.moonrise-contact-field{display:grid;gap:.35rem}` +
    `.moonrise-contact-field label{font-weight:600;font-size:.92rem}` +
    `.moonrise-contact-field input,.moonrise-contact-field textarea{width:100%;padding:.75rem 1rem;border:1px solid color-mix(in srgb,var(--ink,#0f172a) 18%,transparent);border-radius:.65rem;background:var(--bg,#f8fafc);color:inherit}` +
    `.moonrise-contact-submit{justify-self:start;min-height:2.75rem;padding:0 1.25rem;border:0;border-radius:999px;background:var(--accent,#2563eb);color:var(--btn-ink,#fff);font-weight:700;cursor:pointer}` +
    `.moonrise-contact-phone a{color:var(--accent,#2563eb);text-decoration:none;font-weight:600}` +
    `@media(max-width:640px){.moonrise-contact-submit{width:100%}}` +
    `</style>\n`;

  if (/<footer[\s>]/i.test(src)) {
    return src.replace(/<footer[\s>]/i, section + "<footer");
  }
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, section + "</body>");
  }
  return src + section;
}

function readContactFormConfig(project) {
  const ctx =
    project?.business_context && typeof project.business_context === "object"
      ? project.business_context
      : {};
  const raw = ctx.contactForm && typeof ctx.contactForm === "object" ? ctx.contactForm : null;
  if (!raw) return null;
  return {
    enabled: !!raw.enabled,
    mode: raw.mode === "custom" ? "custom" : "auto",
    notificationEmail: String(raw.notificationEmail || "").trim(),
    endpointUrl: String(raw.endpointUrl || "").trim(),
    endpointType: String(raw.endpointType || "").trim(),
  };
}

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

module.exports = {
  detectContactEndpoint,
  readContactFormConfig,
  escapeHtmlAttr,
  escapeHtmlText,
  hasContactForm,
  withDefaultContactFormContext,
  ensureContactFormHtml,
};
