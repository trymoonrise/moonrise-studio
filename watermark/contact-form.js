/**
 * Moonrise contact form handler for published sites.
 * Auto mode → POST /contact-submit (email via Resend).
 * Custom mode → Formspree, Discord, Telegram, or generic webhook.
 */
(function (global) {
  function parseFields(form) {
    const data = { name: "", phone: "", message: "", extras: {} };
    form.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.disabled) return;
      const type = String(el.type || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "hidden") return;
      const val = String(el.value || "").trim();
      if (!val) return;
      const key = String(el.name || el.id || el.placeholder || el.getAttribute("aria-label") || "")
        .toLowerCase()
        .trim();
      if (!data.name && /name|first|full/.test(key)) {
        data.name = val;
        return;
      }
      if (!data.phone && /phone|tel|mobile|cell/.test(key)) {
        data.phone = val;
        return;
      }
      if (!data.message && /message|help|comment|details|inquiry|question|notes/.test(key)) {
        data.message = val;
        return;
      }
      const label = el.name || key || "field";
      data.extras[label] = val;
    });
    return data;
  }

  function showStatus(form, message, ok) {
    let el = form.querySelector("[data-moonrise-form-status]");
    if (!el) {
      el = document.createElement("p");
      el.setAttribute("data-moonrise-form-status", "");
      el.style.marginTop = "0.75rem";
      el.style.fontSize = "0.92rem";
      el.style.fontWeight = "600";
      form.appendChild(el);
    }
    el.textContent = message;
    el.style.color = ok ? "#0f766e" : "#b91c1c";
  }

  function formatLeadText(fields) {
    const lines = [];
    if (fields.name) lines.push("Name: " + fields.name);
    if (fields.phone) lines.push("Phone: " + fields.phone);
    if (fields.message) lines.push("Message: " + fields.message);
    Object.entries(fields.extras || {}).forEach(([key, value]) => {
      if (value) lines.push(key + ": " + value);
    });
    return lines.join("\n");
  }

  async function submitAuto(worker, projectId, fields) {
    const base = String(worker || "").replace(/\/$/, "");
    const res = await fetch(base + "/contact-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        projectId,
        name: fields.name,
        phone: fields.phone,
        message: fields.message,
        extras: fields.extras,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not send message");
    return data;
  }

  async function submitFormspree(endpoint, fields) {
    const body = new URLSearchParams();
    body.set("name", fields.name || "");
    body.set("phone", fields.phone || "");
    body.set("message", fields.message || "");
    body.set("_subject", "New website lead");
    Object.entries(fields.extras || {}).forEach(([key, value]) => body.set(key, value));
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error("Formspree rejected the submission");
  }

  async function submitDiscord(endpoint, fields) {
    const content = ("**New website lead**\n\n" + formatLeadText(fields)).slice(0, 2000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok && res.status !== 204) throw new Error("Discord webhook failed");
  }

  async function submitTelegram(endpoint, fields) {
    const parsed = new URL(endpoint);
    const chatId = parsed.searchParams.get("chat_id");
    if (!chatId) throw new Error("Telegram URL must include ?chat_id=");
    const apiUrl = parsed.origin + parsed.pathname;
    const text = ("New website lead\n\n" + formatLeadText(fields)).slice(0, 4000);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.description || "Telegram send failed");
    }
  }

  async function submitWebhook(endpoint, fields, projectId) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: fields.name,
        phone: fields.phone,
        message: fields.message,
        extras: fields.extras,
        source: "moonrise",
        projectId,
        submittedAt: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error("Webhook returned " + res.status);
  }

  function wireForm(form, opts) {
    if (form.dataset.moonriseFormBound === "1") return;
    form.dataset.moonriseFormBound = "1";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      const fields = parseFields(form);
      if (submitBtn) submitBtn.disabled = true;
      showStatus(form, "Sending…", true);
      try {
        if (opts.mode === "auto") {
          await submitAuto(opts.worker, opts.projectId, fields);
        } else if (opts.endpointType === "formspree") {
          await submitFormspree(opts.endpoint, fields);
        } else if (opts.endpointType === "discord") {
          await submitDiscord(opts.endpoint, fields);
        } else if (opts.endpointType === "telegram") {
          await submitTelegram(opts.endpoint, fields);
        } else {
          await submitWebhook(opts.endpoint, fields, opts.projectId);
        }
        showStatus(form, "Thanks! We'll be in touch soon.", true);
        form.reset();
      } catch (err) {
        showStatus(form, err?.message || "Could not send. Try again.", false);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function scoreForm(form) {
    let score = 0;
    const text = form.innerHTML.toLowerCase();
    if (/#contact|id="contact"|contact-form|get in touch/.test(text)) score += 4;
    form.querySelectorAll("input, textarea").forEach((el) => {
      const key = String(el.name || el.id || el.placeholder || "").toLowerCase();
      if (/name/.test(key)) score += 2;
      if (/phone|tel/.test(key)) score += 2;
      if (/message|help/.test(key)) score += 2;
    });
    return score;
  }

  function findContactForm() {
    const forms = Array.from(document.querySelectorAll("form"));
    if (!forms.length) return null;
    let best = forms[0];
    let bestScore = scoreForm(best);
    forms.forEach((form) => {
      const next = scoreForm(form);
      if (next > bestScore) {
        best = form;
        bestScore = next;
      }
    });
    return bestScore > 0 ? best : forms[forms.length - 1];
  }

  function mountFromScript() {
    const script =
      document.currentScript || document.querySelector("script[src*='contact-form.js']");
    if (!script) return;

    const projectId = script.getAttribute("data-project-id") || "";
    const worker = script.getAttribute("data-worker") || "";
    const mode = script.getAttribute("data-mode") || "auto";
    const endpoint = script.getAttribute("data-endpoint") || "";
    const endpointType = script.getAttribute("data-endpoint-type") || "webhook";
    if (!projectId) return;

    const form = findContactForm();
    if (!form) return;

    wireForm(form, { mode, worker, projectId, endpoint, endpointType });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFromScript);
  } else {
    mountFromScript();
  }

  global.MoonriseContactForm = { wireForm, findContactForm, mountFromScript };
})(typeof window !== "undefined" ? window : global);
