/**
 * Moonrise floating watermark - from watermark/moonrise-watermark.html
 *
 * Usage on live sites:
 *   <script src="…/embed.js"
 *     data-project-id="…"
 *     data-worker="https://worker.example.com"
 *     defer></script>
 *
 * Or: MoonriseWatermarkEmbed.mount({ projectId, workerUrl, host, urgencyEndsAt })
 */
(function (global) {
  const bootScriptEl = typeof document !== "undefined" ? document.currentScript : null;
  const AVATAR =
    "https://moonrise-studio.vercel.app/doc/MoonriseLogo.png";
  const SITE_URL = "https://trymoonrise.com";
  const STYLE_ID = "mr-wm-embed-style";
  const DEFAULT_URGENCY_MS = 96 * 3600000;
  const DEFAULT_HQ = {
    kind: "hq",
    name: "Moonrise",
    org: "Moonrise Studio",
    subtitle: "Headquarters · trymoonrise.com",
    email: "trymoonrise@gmail.com",
    phone: "+14013000957",
    phoneDisplay: "(401) 300-0957",
    url: "https://trymoonrise.com",
    discordUrl: "https://discord.gg/yFJajbBNj",
  };

  let timerId = null;
  let keydownBound = false;

  function css() {
    return `
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap");
.mr-wm{--mr-brand:#3b82f6;--mr-ink:#0f172a;--mr-muted:#64748b;--mr-line:#e8edf3;--mr-font:"DM Sans",system-ui,sans-serif;position:fixed;bottom:max(1.75rem,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;font-family:var(--mr-font)}
.mr-wm.mr-wm--hosted{position:absolute;width:max-content;max-width:calc(100% - 1.5rem)}
.mr-wm.is-hidden{visibility:hidden;opacity:0;pointer-events:none}
.mr-wm-chip{pointer-events:auto;appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:1.1rem;max-width:min(calc(100vw - 1.5rem),36rem);margin:0;padding:1.15rem 1.65rem 1.15rem 1.15rem;border:0;border-radius:18px;color:#fff;cursor:pointer;text-align:left;background:var(--mr-brand);box-shadow:0 18px 48px rgba(59,130,246,.4),0 6px 18px rgba(15,23,42,.14);transition:filter .18s ease,transform .18s ease,box-shadow .18s ease;animation:mr-widget-in .5s cubic-bezier(.22,1,.36,1) both}
.mr-wm-chip:hover{filter:brightness(1.05);transform:translateY(-3px);box-shadow:0 22px 56px rgba(59,130,246,.46),0 8px 22px rgba(15,23,42,.16)}
.mr-wm-chip:focus-visible{outline:2px solid #fff;outline-offset:3px}
.mr-wm-avatar{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#fff;flex-shrink:0;box-shadow:0 0 0 1px rgba(15,23,42,.06)}
.mr-wm-copy{display:grid;gap:.12rem;min-width:0;line-height:1.2;text-align:left}
.mr-wm-copy strong{font-size:1.28rem;font-weight:650;letter-spacing:-.02em;line-height:1.15;white-space:nowrap;color:#fff}
.mr-wm-copy span{font-size:.98rem;font-weight:500;color:rgba(255,255,255,.8)}
.mr-wm-copy a{color:inherit;text-decoration:none;pointer-events:none}
@keyframes mr-widget-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:520px){.mr-wm-chip{padding:.95rem 1.25rem .95rem .95rem;gap:.9rem;border-radius:16px}.mr-wm-avatar{width:48px;height:48px;border-radius:12px}.mr-wm-copy strong{font-size:1.1rem}.mr-wm-copy span{font-size:.86rem}}
#mr-wm-overlay-root{position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:none!important}
#mr-wm-overlay-root[data-open="1"]{display:block!important;pointer-events:auto}
.mr-wm-overlay{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease;font-family:var(--mr-font)}
.mr-wm-overlay.is-open{opacity:1;visibility:visible;pointer-events:auto}
.mr-wm-panel{width:min(440px,100%);max-height:min(92vh,720px);display:flex;flex-direction:column;overflow:auto;background:#fff;border:1px solid var(--mr-line,#e8edf3);border-radius:16px;box-shadow:0 20px 48px rgba(15,23,42,.22);transform:translateY(12px) scale(.985);opacity:.96;transition:transform .28s cubic-bezier(.22,1,.36,1),opacity .22s ease}
.mr-wm-overlay.is-open .mr-wm-panel{transform:none;opacity:1}
.mr-wm-head{display:flex;align-items:flex-start;gap:.85rem;padding:1.15rem 1.2rem 1rem;border-bottom:1px solid var(--mr-line,#e8edf3);flex-shrink:0}
.mr-wm-head img{width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0}
.mr-wm-head h2{margin:0;font-family:var(--mr-font);font-size:1.15rem;font-weight:700;letter-spacing:-.03em;line-height:1.15;color:var(--mr-ink,#0f172a)}
.mr-wm-head p{margin:.3rem 0 0;color:var(--mr-muted,#64748b);font-size:.9rem;line-height:1.4}
.mr-wm-close{appearance:none;margin-left:auto;width:34px;height:34px;border:1px solid var(--mr-line,#e8edf3);border-radius:10px;background:#fff;color:#94a3b8;font-size:1.15rem;line-height:1;cursor:pointer;flex-shrink:0}
.mr-wm-close:hover{background:#f8fafc;color:#64748b}
.mr-wm-body{padding:1.2rem 1.25rem 1.4rem;display:flex;flex-direction:column;gap:1rem}
.mr-wm-lead{margin:0;color:var(--mr-muted,#64748b);font-size:.95rem;line-height:1.5}
.mr-wm-offer{display:flex;flex-direction:column;gap:.7rem}
.mr-wm-timer{margin:0;padding:0;text-align:center;font-family:var(--mr-font);font-size:.85rem;font-weight:650;letter-spacing:-.01em;color:#2563eb}
.mr-wm-pay{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:3.5rem;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),linear-gradient(135deg,#60a5fa 0%,#3b82f6 48%,#2563eb 100%);color:#fff;font:inherit;font-family:var(--mr-font);font-size:1.05rem;font-weight:650;letter-spacing:-.01em;cursor:pointer;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 -1px 0 rgba(15,23,42,.12) inset,0 8px 18px rgba(37,99,235,.28),0 2px 4px rgba(37,99,235,.18)}
.mr-wm-pay:hover:not(:disabled){filter:brightness(1.03);transform:translateY(-.5px)}
.mr-wm-pay:disabled{opacity:.55;cursor:not-allowed}
.mr-wm-note{margin:0;text-align:center;font-size:.78rem;color:#94a3b8;line-height:1.4}
.mr-wm-error{margin:0;color:#b91c1c;font-size:.85rem;font-weight:600;line-height:1.4}
.mr-wm-contact-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:2.85rem;padding:.65rem 1rem;border:1px solid var(--mr-line,#e8edf3);border-radius:12px;background:#fff;color:var(--mr-ink,#0f172a);font:inherit;font-family:var(--mr-font);font-size:.92rem;font-weight:650;letter-spacing:-.01em;text-decoration:none;text-align:center;transition:border-color .15s ease,background .15s ease,color .15s ease}
.mr-wm-contact-btn:hover{border-color:#bfdbfe;background:#f8fbff;color:#1d4ed8}
.mr-wm-contact-btn--primary{background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),linear-gradient(135deg,#60a5fa 0%,#3b82f6 48%,#2563eb 100%);border-color:rgba(255,255,255,.18);color:#fff;box-shadow:0 8px 18px rgba(37,99,235,.24)}
.mr-wm-contact-btn--primary:hover{filter:brightness(1.03);color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 42%),linear-gradient(135deg,#60a5fa 0%,#3b82f6 48%,#2563eb 100%)}
.mr-wm-contact-btn--hq{align-self:start;width:auto;min-height:2rem;padding:.42rem .72rem;font-size:.78rem;font-weight:600;border-radius:10px;color:#64748b}
.mr-wm-contact-btn--hq:hover{color:#1d4ed8;background:#f8fafc}
.mr-wm-contacts{display:grid;gap:.55rem}
.mr-wm-contacts-label{margin:0;font-size:.78rem;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8}
.mr-wm-step[hidden]{display:none!important}
.mr-wm-vcard{display:grid;gap:.85rem}
.mr-wm-vcard-back{appearance:none;border:0;background:transparent;color:#64748b;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;padding:0;text-align:left}
.mr-wm-vcard-back:hover{color:#2563eb}
.mr-wm-vcard-card{border:1px solid var(--mr-line,#e8edf3);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.06)}
.mr-wm-vcard-hero{height:4.5rem;background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 55%,#f8fafc 100%)}
.mr-wm-vcard-body{padding:0 1rem 1rem;display:grid;gap:.85rem;margin-top:-2.1rem}
.mr-wm-vcard-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding-top:.15rem}
.mr-wm-vcard-brand{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
.mr-wm-vcard-avatar{width:4.5rem;height:4.5rem;border-radius:16px;display:grid;place-items:center;background:#fff;border:3px solid #fff;box-shadow:0 8px 18px rgba(15,23,42,.12);overflow:hidden;font-size:1.15rem;font-weight:700;color:#2563eb}
.mr-wm-vcard-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.mr-wm-vcard-name{margin:0;font-size:1.35rem;font-weight:700;letter-spacing:-.03em;color:var(--mr-ink,#0f172a)}
.mr-wm-vcard-role{margin:.2rem 0 0;color:var(--mr-muted,#64748b);font-size:.88rem;line-height:1.4}
.mr-wm-vcard-save{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;border:0;border-radius:12px;background:#0f172a;color:#fff;font:inherit;font-size:.92rem;font-weight:650;cursor:pointer}
.mr-wm-vcard-save:hover{filter:brightness(1.06)}
.mr-wm-vcard-links{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.mr-wm-vcard-link{display:flex;align-items:center;gap:.75rem;padding:.75rem .85rem;border:1px solid var(--mr-line,#e8edf3);border-radius:12px;text-decoration:none;color:var(--mr-ink,#0f172a);background:#fff;transition:border-color .15s ease,background .15s ease}
.mr-wm-vcard-link:hover{border-color:#bfdbfe;background:#f8fbff}
.mr-wm-vcard-icon{width:2.65rem;height:2.65rem;border-radius:.85rem;overflow:hidden;flex-shrink:0;background:#f8fafc}
.mr-wm-vcard-icon img{width:100%;height:100%;object-fit:cover;display:block}
.mr-wm-vcard-link-text{display:grid;gap:.08rem;min-width:0}
.mr-wm-vcard-link-text strong{font-size:.88rem;font-weight:700}
.mr-wm-vcard-link-text em{font-style:normal;font-size:.78rem;color:var(--mr-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mr-wm-faq{display:grid;gap:0;margin:.15rem 0 0;border-top:1px solid var(--mr-line,#e8edf3)}
.mr-wm-faq details{border:0;border-bottom:1px solid var(--mr-line,#e8edf3);background:transparent}
.mr-wm-faq summary{list-style:none;cursor:pointer;padding:.85rem 0;font-size:.9rem;font-weight:600;color:var(--mr-ink,#0f172a);display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.mr-wm-faq summary::-webkit-details-marker{display:none}
.mr-wm-faq summary::after{content:"+";width:1.4rem;height:1.4rem;flex-shrink:0;display:grid;place-items:center;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:.95rem;font-weight:600;line-height:1;transition:transform .25s ease,background-color .2s ease,color .2s ease}
.mr-wm-faq details.is-open summary::after{content:"–";background:#e8f1ff;color:#2563eb}
.mr-wm-faq-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.22,1,.36,1)}
.mr-wm-faq details.is-open .mr-wm-faq-panel{grid-template-rows:1fr}
.mr-wm-faq-panel-inner{overflow:hidden;min-height:0}
.mr-wm-faq details p{margin:0;padding:0 0 .9rem;color:var(--mr-muted,#64748b);font-size:.86rem;line-height:1.5;opacity:0;transform:translateY(-4px);transition:opacity .24s ease,transform .24s ease}
.mr-wm-faq details.is-open p{opacity:1;transform:none}
.mr-wm-faq details a{color:#2563eb;font-weight:600;text-decoration:none}
.mr-wm-faq details a:hover{text-decoration:underline}
body.mr-wm-open .ms-lb-price,
body.mr-wm-open .ms-lb-price-range,
body.mr-wm-open .ms-lb-price-marks,
body.mr-wm-open .ms-lb-side,
body.mr-wm-open .ms-lb-pane-resizer,
body.mr-wm-open .ms-lb-chrome,
body.mr-wm-open .ms-lb-fs-exit{visibility:hidden!important;pointer-events:none!important}
@media (prefers-reduced-motion:reduce){.mr-wm-chip,.mr-wm-overlay,.mr-wm-panel,.mr-wm-faq-panel,.mr-wm-faq details p,.mr-wm-faq summary::after{animation:none;transition:none}}
`;
  }

  function studioBaseUrl(workerUrl) {
    const base = String(workerUrl || "https://moonrise-studio.vercel.app").replace(/\/$/, "");
    return base || "https://moonrise-studio.vercel.app";
  }

  function contactPageUrl(workerUrl) {
    return studioBaseUrl(workerUrl) + "/contact.html";
  }

  function creatorContactPageUrl(workerUrl, projectId) {
    const base = studioBaseUrl(workerUrl);
    const id = String(projectId || "").trim();
    return id ? base + "/creator-contact.html?project=" + encodeURIComponent(id) : base + "/contact.html";
  }

  function decodeContactPayload(raw) {
    const token = String(raw || "").trim();
    if (!token) return null;
    try {
      const padded = token.replace(/-/g, "+").replace(/_/g, "/");
      const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
      const json = decodeURIComponent(
        Array.prototype.map
          .call(atob(padded + pad), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function readContactFromScript(script, attr) {
    if (!script) return null;
    return decodeContactPayload(script.getAttribute(attr));
  }

  function contactInitials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "CR";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildVcardHtml(contact, assetsBase, options) {
    const c = contact || {};
    const isHq = c.kind === "hq";
    const name = escapeHtml(c.name || (isHq ? "Moonrise" : "Creator"));
    const subtitle = escapeHtml(c.subtitle || (isHq ? "Headquarters" : "Website creator"));
    const email = String(c.email || "").trim();
    const phone = String(c.phone || "").trim();
    const phoneDisplay = escapeHtml(c.phoneDisplay || phone);
    const avatarHtml = isHq
      ? '<img src="' + escapeHtml(assetsBase + "/doc/MoonriseLogo.png") + '" alt="" width="72" height="72">'
      : escapeHtml(contactInitials(c.name));
    const brand = isHq ? "moonrise" : "creator";
    const links = [];
    if (phone) {
      links.push(
        '<li><a class="mr-wm-vcard-link" href="tel:' +
          escapeHtml(phone.replace(/\s/g, "")) +
          '"><span class="mr-wm-vcard-icon"><img src="' +
          escapeHtml(assetsBase + "/doc/iMessages.jpg") +
          '" alt="" width="46" height="46"></span><span class="mr-wm-vcard-link-text"><strong>Number</strong><em>' +
          phoneDisplay +
          "</em></span></a></li>"
      );
    }
    if (email) {
      links.push(
        '<li><a class="mr-wm-vcard-link" href="mailto:' +
          escapeHtml(email) +
          '"><span class="mr-wm-vcard-icon"><img src="' +
          escapeHtml(assetsBase + "/doc/Gmail.jpg") +
          '" alt="" width="46" height="46"></span><span class="mr-wm-vcard-link-text"><strong>Email</strong><em>' +
          escapeHtml(email) +
          "</em></span></a></li>"
      );
    }
    if (isHq && c.discordUrl) {
      links.push(
        '<li><a class="mr-wm-vcard-link" href="' +
          escapeHtml(c.discordUrl) +
          '" target="_blank" rel="noopener noreferrer"><span class="mr-wm-vcard-icon"><img src="' +
          escapeHtml(assetsBase + "/doc/Discord.jpg") +
          '" alt="" width="46" height="46"></span><span class="mr-wm-vcard-link-text"><strong>Discord</strong><em>Join the community</em></span></a></li>'
      );
    }
    const openPage =
      options && options.pageUrl
        ? '<a class="mr-wm-contact-btn" href="' +
          escapeHtml(options.pageUrl) +
          '" target="_blank" rel="noopener noreferrer">Open full contact card</a>'
        : "";
    return (
      '<div class="mr-wm-vcard">' +
      '<button type="button" class="mr-wm-vcard-back" data-mr-vcard-back>← Back</button>' +
      '<div class="mr-wm-vcard-card">' +
      '<div class="mr-wm-vcard-hero" aria-hidden="true"></div>' +
      '<div class="mr-wm-vcard-body">' +
      '<div class="mr-wm-vcard-top"><span class="mr-wm-vcard-brand">' +
      brand +
      "</span></div>" +
      '<div class="mr-wm-vcard-avatar">' +
      avatarHtml +
      "</div>" +
      "<h3 class=\"mr-wm-vcard-name\">" +
      name +
      "</h3>" +
      '<p class="mr-wm-vcard-role">' +
      subtitle +
      "</p>" +
      '<button type="button" class="mr-wm-vcard-save" data-mr-vcard-save>Save Contact</button>' +
      '<ul class="mr-wm-vcard-links">' +
      links.join("") +
      "</ul>" +
      openPage +
      "</div></div></div>"
    );
  }

  function buildVcardFile(contact) {
    const c = contact || {};
    const lines = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + String(c.name || "Contact")];
    if (c.org) lines.push("ORG:" + c.org);
    if (c.subtitle) lines.push("TITLE:" + c.subtitle);
    if (c.phone) lines.push("TEL;TYPE=CELL,VOICE:" + c.phone);
    if (c.email) lines.push("EMAIL;TYPE=INTERNET:" + c.email);
    if (c.url) lines.push("URL:" + c.url);
    lines.push("END:VCARD");
    return lines.join("\r\n");
  }

  function faqHtml() {
    const wrap = (q, a) =>
      "<details><summary>" +
      q +
      '</summary><div class="mr-wm-faq-panel"><div class="mr-wm-faq-panel-inner"><p>' +
      a +
      "</p></div></div></details>";
    return [
      wrap(
        "What is this?",
        "This is a Moonrise website preview. The watermark stays until you complete checkout - then it comes off and the site stays live."
      ),
      wrap(
        "What do I get?",
        "Stripe confirms instantly. The watermark is removed and your site stays published with hosting included."
      ),
      wrap(
        "Do I own the website?",
        'The site stays managed by <a href="mailto:trymoonrise@gmail.com">@trymoonrise</a>. We handle the technical work, updates, and redesigns so it can keep evolving with your business.'
      ),
      wrap(
        "Need changes?",
        "Contact your website creator first for photos, hours, services, and quick edits. Reach Moonrise headquarters for billing, hosting, and platform support."
      ),
    ].join("");
  }

  function panelBodyHtml(creatorContact, hqContact, workerUrl, projectId) {
    const creatorName = String(creatorContact?.name || "your creator").trim();
    const creatorBtn = creatorContact
      ? '<button type="button" class="mr-wm-contact-btn mr-wm-contact-btn--primary" id="mr-wm-contact-creator">Contact ' +
        escapeHtml(creatorName) +
        "</button>"
      : "";
    const hqBtn =
      '<button type="button" class="mr-wm-contact-btn mr-wm-contact-btn--hq" id="mr-wm-contact-hq">Contact Moonrise HQ</button>';
    return (
      '<div class="mr-wm-body" id="mr-wm-body">' +
      '<div class="mr-wm-step is-active" data-step="main">' +
      '<div class="mr-wm-offer">' +
      '<p class="mr-wm-timer" id="mr-wm-timer" aria-live="polite"></p>' +
      '<button type="button" class="mr-wm-pay" id="mr-wm-pay">Unlock site</button>' +
      '<p class="mr-wm-error" id="mr-wm-error" hidden></p>' +
      '<p class="mr-wm-note">Secure Stripe checkout · hosting included</p>' +
      "</div>" +
      '<div class="mr-wm-contacts">' +
      '<p class="mr-wm-contacts-label">Need a site change?</p>' +
      creatorBtn +
      hqBtn +
      "</div>" +
      '<div class="mr-wm-faq" id="mr-wm-faq">' +
      faqHtml() +
      "</div></div>" +
      '<div class="mr-wm-step" data-step="creator" hidden id="mr-wm-step-creator"></div>' +
      '<div class="mr-wm-step" data-step="hq" hidden id="mr-wm-step-hq"></div>' +
      "</div>"
    );
  }

  function bindExclusiveFaq(root) {
    if (!root) return;
    const items = Array.from(root.querySelectorAll("details"));

    function closeItem(details) {
      if (!details.classList.contains("is-open")) {
        details.open = false;
        return;
      }
      details.classList.remove("is-open");
      const panel = details.querySelector(".mr-wm-faq-panel");
      const finish = () => {
        details.open = false;
        panel?.removeEventListener("transitionend", finish);
      };
      if (panel) panel.addEventListener("transitionend", finish);
      else details.open = false;
      setTimeout(finish, 360);
    }

    function openItem(details) {
      items.forEach((other) => {
        if (other !== details) closeItem(other);
      });
      details.open = true;
      requestAnimationFrame(() => {
        details.classList.add("is-open");
      });
    }

    items.forEach((details) => {
      const summary = details.querySelector("summary");
      summary?.addEventListener("click", (e) => {
        e.preventDefault();
        if (details.classList.contains("is-open")) closeItem(details);
        else openItem(details);
      });
    });
  }

  function formatRemaining(endsAt) {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return "Offer expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return (
      "Ends in " +
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0")
    );
  }

  function resolveUrgencyEndsAt(raw) {
    if (raw) {
      const t = new Date(raw).getTime();
      if (Number.isFinite(t) && t > Date.now()) return new Date(t).toISOString();
    }
    return new Date(Date.now() + DEFAULT_URGENCY_MS).toISOString();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css();
    document.head.appendChild(style);
  }

  async function resolveAuthToken() {
    try {
      const session = await global.StudioAuth?.getSession?.();
      if (session?.access_token) return session.access_token;
    } catch (_) {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem("moonrise-studio-auth");
      const parsed = raw ? JSON.parse(raw) : null;
      return (
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        ""
      );
    } catch (_) {
      return "";
    }
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function unmount() {
    stopTimer();
    document.body.classList.remove("mr-wm-open");
    document.getElementById("mr-wm-chip-root")?.remove();
    document.getElementById("mr-wm-overlay-root")?.remove();
    document.getElementById("mr-wm-root")?.remove();
  }

  function bindContactSteps(root, creatorContact, hqContact, workerUrl, projectId) {
    if (!root) return;
    const assetsBase = studioBaseUrl(workerUrl);
    const steps = {
      main: root.querySelector('[data-step="main"]'),
      creator: root.querySelector('[data-step="creator"]'),
      hq: root.querySelector('[data-step="hq"]'),
    };

    function showStep(name) {
      Object.entries(steps).forEach(([key, el]) => {
        if (!el) return;
        const active = key === name;
        el.hidden = !active;
        el.classList.toggle("is-active", active);
      });
    }

    function bindVcard(stepEl, contact, pageUrl) {
      if (!stepEl || !contact) return;
      stepEl.innerHTML = buildVcardHtml(contact, assetsBase, { pageUrl });
      stepEl.querySelector("[data-mr-vcard-back]")?.addEventListener("click", () => showStep("main"));
      stepEl.querySelector("[data-mr-vcard-save]")?.addEventListener("click", () => {
        const blob = new Blob([buildVcardFile(contact)], { type: "text/vcard;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (String(contact.name || "contact").replace(/[^\w\-]+/g, "-") || "contact") + ".vcf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    bindVcard(
      steps.creator,
      creatorContact,
      creatorContactPageUrl(workerUrl, projectId)
    );
    bindVcard(steps.hq, hqContact, contactPageUrl(workerUrl));

    root.querySelector("#mr-wm-contact-creator")?.addEventListener("click", () => {
      if (!creatorContact) return;
      showStep("creator");
    });
    root.querySelector("#mr-wm-contact-hq")?.addEventListener("click", () => {
      showStep("hq");
    });
  }

  function mount(opts) {
    opts = opts || {};
    unmount();
    ensureStyle();

    const projectId = String(opts.projectId || "").trim();
    const workerUrl = String(
      opts.workerUrl || "https://moonrise-studio.vercel.app"
    ).replace(/\/$/, "");
    const paymentLink = String(opts.paymentLink || "").trim();
    const host = opts.host || null;
    const urgencyEndsAt = resolveUrgencyEndsAt(opts.urgencyEndsAt);
    const creatorContact = opts.creatorContact || null;
    const hqContact = { ...DEFAULT_HQ, ...(opts.hqContact || {}) };
    const chipHidden = opts.chipHidden === true;

    const chipRoot = document.createElement("div");
    chipRoot.id = "mr-wm-chip-root";
    chipRoot.innerHTML =
      '<div class="mr-wm' +
      (host ? " mr-wm--hosted" : "") +
      '" id="mr-wm" data-moonrise-watermark>' +
      '<button type="button" class="mr-wm-chip" id="mr-wm-open" aria-haspopup="dialog" aria-controls="mr-wm-overlay">' +
      '<img class="mr-wm-avatar" src="' +
      AVATAR +
      '" alt="Moonrise" width="48" height="48" decoding="async" />' +
      '<span class="mr-wm-copy"><strong>Complete your order</strong>' +
      "<span>Click here to remove watermark</span></span></button></div>";

    // Overlay always on document.body so it covers builder chrome / native UI bleed.
    const overlayRoot = document.createElement("div");
    overlayRoot.id = "mr-wm-overlay-root";
    overlayRoot.innerHTML =
      '<div class="mr-wm-overlay" id="mr-wm-overlay" aria-hidden="true">' +
      '<div class="mr-wm-panel" role="dialog" aria-modal="true" aria-labelledby="mr-wm-title">' +
      '<header class="mr-wm-head"><img src="' +
      AVATAR +
      '" alt="" width="40" height="40" />' +
      '<div><h2 id="mr-wm-title">Unlock your website</h2>' +
      '<p id="mr-wm-subtitle">Watermark removed automatically after payment. This is a preview of your new website. Go live today and start sharing your link with customers.</p></div>' +
      '<button type="button" class="mr-wm-close" id="mr-wm-close" aria-label="Close">×</button></header>' +
      panelBodyHtml(creatorContact, hqContact, workerUrl, projectId) +
      "</div></div>";

    const chipParent = host || document.body;
    if (host) host.innerHTML = "";
    chipParent.appendChild(chipRoot);
    document.body.appendChild(overlayRoot);

    const chip = document.getElementById("mr-wm");
    const overlay = document.getElementById("mr-wm-overlay");
    const openBtn = document.getElementById("mr-wm-open");
    const closeBtn = document.getElementById("mr-wm-close");
    const payBtn = document.getElementById("mr-wm-pay");
    const errEl = document.getElementById("mr-wm-error");
    const timerEl = document.getElementById("mr-wm-timer");

    if (chipHidden) {
      chip?.classList.add("is-hidden");
    }

    function revealChipIfAllowed() {
      if (!chipHidden) chip?.classList.remove("is-hidden");
    }

    function tickTimer() {
      if (timerEl) timerEl.textContent = formatRemaining(urgencyEndsAt);
    }

    function startTimer() {
      stopTimer();
      tickTimer();
      timerId = setInterval(tickTimer, 1000);
    }

    function openPanel() {
      chip?.classList.add("is-hidden");
      document.body.classList.add("mr-wm-open");
      overlayRoot.setAttribute("data-open", "1");
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      startTimer();
    }

    function closePanel() {
      revealChipIfAllowed();
      document.body.classList.remove("mr-wm-open");
      overlayRoot.removeAttribute("data-open");
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      stopTimer();
      const body = document.getElementById("mr-wm-body");
      body?.querySelectorAll(".mr-wm-step").forEach((step) => {
        const isMain = step.getAttribute("data-step") === "main";
        step.hidden = !isMain;
        step.classList.toggle("is-active", isMain);
      });
    }

    function showError(msg) {
      if (!errEl) return;
      errEl.hidden = !msg;
      errEl.textContent = msg || "";
    }

    openBtn?.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openPanel();
    });
    closeBtn?.addEventListener("click", closePanel);
    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) closePanel();
    });
    if (!keydownBound) {
      keydownBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const open = document.getElementById("mr-wm-overlay");
          if (open?.classList.contains("is-open")) closePanel();
        }
      });
    }

    bindExclusiveFaq(document.getElementById("mr-wm-faq"));
    bindContactSteps(
      document.getElementById("mr-wm-body"),
      creatorContact,
      hqContact,
      workerUrl,
      projectId
    );
    tickTimer();

    payBtn?.addEventListener("click", async () => {
      showError("");
      payBtn.disabled = true;
      try {
        if (paymentLink) {
          location.href = paymentLink;
          return;
        }
        if (!projectId) {
          showError(
            "Checkout is ready once this preview is linked to a project. Contact Moonrise or your seller to complete payment."
          );
          return;
        }

        const headers = { "Content-Type": "application/json" };
        let endpoint = workerUrl + "/public-checkout";
        const token = await resolveAuthToken();
        if (token) {
          headers.Authorization = "Bearer " + token;
          endpoint = workerUrl + "/checkout";
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Checkout failed");
        if (data.alreadyPaid && data.url) {
          location.href = data.url;
          return;
        }
        if (data.url) {
          location.href = data.url;
          return;
        }
        throw new Error("No checkout URL returned");
      } catch (e) {
        showError(e.message || "Checkout failed");
      } finally {
        payBtn.disabled = false;
      }
    });

    return { open: openPanel, close: closePanel, unmount };
  }

  function cleanPaidQueryFromUrl() {
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has("paid") && !url.searchParams.has("session_id")) return;
      url.searchParams.delete("paid");
      url.searchParams.delete("session_id");
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * After Stripe redirects back with ?paid=1&session_id=, verify + unlock
   * even if the webhook is delayed or misconfigured, then hard-reload so
   * the published HTML (without embed.js) replaces this watermarked page.
   */
  async function fulfillPaidReturn(projectId, workerUrl) {
    const params = new URLSearchParams(location.search);
    if (params.get("paid") !== "1") return false;
    const sessionId = String(params.get("session_id") || "").trim();
    const base = String(workerUrl || "").replace(/\/$/, "");
    if (!base || !sessionId.startsWith("cs_") || !projectId) {
      cleanPaidQueryFromUrl();
      return false;
    }
    try {
      const res = await fetch(base + "/fulfill-go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unlock failed");
      const next = data.url || location.href.split("?")[0];
      location.replace(next);
      return true;
    } catch (e) {
      console.warn("[Moonrise] fulfill-go-live failed:", e?.message || e);
      cleanPaidQueryFromUrl();
      return false;
    }
  }

  function autoMountFromScript() {
    // Capture at parse time - document.currentScript is null inside deferred
    // callbacks / DOMContentLoaded, which is how live sites load this file.
    const script =
      bootScriptEl ||
      document.currentScript ||
      document.querySelector("script[data-project-id][src*='embed.js']");
    if (!script) return;
    const projectId = script.getAttribute("data-project-id") || "";
    if (!projectId) return;
    const workerUrl = script.getAttribute("data-worker") || "";
    const creatorContact = readContactFromScript(script, "data-creator-contact");
    const hqContact = readContactFromScript(script, "data-hq-contact") || DEFAULT_HQ;
    void fulfillPaidReturn(projectId, workerUrl).then((handled) => {
      if (handled) return;
      mount({
        projectId,
        workerUrl,
        paymentLink: script.getAttribute("data-payment-link") || "",
        urgencyEndsAt: script.getAttribute("data-urgency-ends-at") || "",
        creatorContact,
        hqContact,
      });
    });
  }

  global.MoonriseWatermarkEmbed = { mount, unmount, AVATAR, SITE_URL };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoMountFromScript);
    } else {
      autoMountFromScript();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
