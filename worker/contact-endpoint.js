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
};
