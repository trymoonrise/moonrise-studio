/**
 * Moonrise floating watermark — inject into a generated preview page.
 *
 * Usage:
 *   <script src="…/watermark/embed.js"
 *     data-project-id="…"
 *     data-worker="https://worker.example.com"
 *     data-payment-link=""
 *     defer></script>
 *
 * Or: MoonriseWatermarkEmbed.mount({ projectId, workerUrl, paymentLink })
 */
(function (global) {
  const AVATAR =
    "https://github.com/trymoonrise/dashboard/blob/main/doc/MoonriseLogo.png?raw=true";
  const SITE_HOST = "trymoonrise.com";
  const SITE_URL = "https://trymoonrise.com";

  const STYLE_ID = "mr-wm-embed-style";

  function css() {
    return `
@import url("https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap");
.mr-wm{position:fixed;bottom:max(1.75rem,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;font-family:"DM Sans",system-ui,sans-serif}
.mr-wm-chip{pointer-events:auto;appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:1.1rem;max-width:min(calc(100vw - 1.5rem),36rem);margin:0;padding:1.15rem 1.65rem 1.15rem 1.15rem;border:0;border-radius:18px;color:#fff;cursor:pointer;text-align:left;background:#3b82f6;box-shadow:0 18px 48px rgba(59,130,246,.4),0 6px 18px rgba(15,23,42,.14);transition:filter .18s ease,transform .18s ease,box-shadow .18s ease;animation:mr-widget-in .5s cubic-bezier(.22,1,.36,1) both}
.mr-wm-chip:hover{filter:brightness(1.05);transform:translateY(-3px);box-shadow:0 22px 56px rgba(59,130,246,.46),0 8px 22px rgba(15,23,42,.16)}
.mr-wm-chip:focus-visible{outline:2px solid #fff;outline-offset:3px}
.mr-wm-avatar{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#fff;flex-shrink:0;box-shadow:0 0 0 1px rgba(15,23,42,.06)}
.mr-wm-copy{display:grid;gap:.12rem;min-width:0;line-height:1.2;text-align:left}
.mr-wm-copy strong{font-size:1.28rem;font-weight:650;letter-spacing:-.02em;line-height:1.15;white-space:nowrap;color:#fff}
.mr-wm-copy span{font-size:.98rem;font-weight:500;color:rgba(255,255,255,.8)}
.mr-wm-copy a{color:inherit;text-decoration:none;pointer-events:none}
@keyframes mr-widget-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:520px){.mr-wm-chip{padding:.95rem 1.25rem .95rem .95rem;gap:.9rem;border-radius:16px}.mr-wm-avatar{width:48px;height:48px;border-radius:12px}.mr-wm-copy strong{font-size:1.1rem}.mr-wm-copy span{font-size:.86rem}}
@media (prefers-reduced-motion:reduce){.mr-wm-chip{animation:none}}
.mr-wm-overlay{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;padding:1rem;background:rgba(8,10,14,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s ease,visibility .28s ease;font-family:"DM Sans",system-ui,sans-serif}
.mr-wm-overlay.is-open{opacity:1;visibility:visible;pointer-events:auto}
.mr-wm-panel{width:min(920px,100%);max-height:min(90vh,680px);display:flex;flex-direction:column;overflow:hidden;background:#faf9f7;border:1px solid rgba(255,255,255,.5);border-radius:22px;box-shadow:0 32px 80px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.06);transform:translateY(18px) scale(.98);opacity:.9;transition:transform .4s cubic-bezier(.22,1,.36,1),opacity .28s ease}
.mr-wm-overlay.is-open .mr-wm-panel{transform:none;opacity:1}
.mr-wm-head{display:flex;align-items:center;gap:1rem;padding:1.15rem 1.35rem;background:#fff;border-bottom:1px solid #ece8e2;flex-shrink:0}
.mr-wm-head img{width:44px;height:44px;border-radius:14px;object-fit:cover;background:#f3ebe0;border:1px solid #ece8e2;flex-shrink:0}
.mr-wm-head h2{margin:0;font-family:Syne,"DM Sans",sans-serif;font-size:1.28rem;font-weight:800;letter-spacing:-.03em;line-height:1.15;color:#0a0a0a}
.mr-wm-head p{margin:.28rem 0 0;color:#6b6560;font-size:.86rem;line-height:1.4}
.mr-wm-close{appearance:none;margin-left:auto;width:36px;height:36px;border:0;border-radius:10px;background:#f4f1ec;color:#94a3b8;font-size:1.2rem;cursor:pointer;flex-shrink:0}
.mr-wm-close:hover{background:#ebe6df;color:#64748b}
.mr-wm-split{display:grid;grid-template-columns:1.15fr .85fr;min-height:0;flex:1;overflow:hidden}
.mr-wm-faq-col{min-height:0;overflow:auto;padding:1.15rem 1.25rem 1.35rem;border-right:1px solid #ece8e2;background:#fff}
.mr-wm-faq-label{margin:0 0 .75rem;font-family:Syne,"DM Sans",sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#a89f94}
.mr-wm-faq{display:grid;gap:.35rem;margin:0}
.mr-wm-faq details{border:0;border-radius:12px;background:#faf9f7;overflow:hidden;transition:background .28s ease}
.mr-wm-faq details.is-open{background:#f3ebe0}
.mr-wm-faq summary{list-style:none;cursor:pointer;padding:.85rem .95rem;font-size:.9rem;font-weight:650;letter-spacing:-.015em;display:flex;align-items:center;justify-content:space-between;gap:.75rem;color:#0a0a0a}
.mr-wm-faq summary::-webkit-details-marker{display:none}
.mr-wm-faq summary::after{content:"";width:18px;height:18px;flex-shrink:0;border-radius:50%;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10' fill='none'%3E%3Cpath d='M5 2v6M2 5h6' stroke='%230a0a0a' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E") center/10px no-repeat;box-shadow:0 0 0 1px #ece8e2;transition:transform .28s ease,background-color .28s ease}
.mr-wm-faq details.is-open summary::after{transform:rotate(45deg);background-color:#0a0a0a;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10' fill='none'%3E%3Cpath d='M2 5h6' stroke='%23f3ebe0' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E")}
.mr-wm-faq-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.mr-wm-faq details.is-open .mr-wm-faq-panel{grid-template-rows:1fr}
.mr-wm-faq-panel-inner{overflow:hidden;min-height:0}
.mr-wm-faq details p{margin:0;padding:0 .95rem .9rem;color:#6b6560;font-size:.84rem;line-height:1.55}
.mr-wm-faq details a{color:#0a0a0a;font-weight:600}
.mr-wm-checkout{display:flex;flex-direction:column;gap:1.1rem;padding:1.6rem 1.5rem 1.45rem;background:linear-gradient(160deg,#4f8ff7 0%,#3b82f6 55%,#3275df 100%);color:#fff;overflow:auto}
.mr-wm-price{display:flex;align-items:baseline;gap:.65rem;flex-wrap:wrap;padding:0;margin:0;border:0;background:transparent}
.mr-wm-price strong{font-family:"DM Sans",sans-serif;font-size:clamp(3.25rem,8vw,4.25rem);font-weight:700;letter-spacing:-.05em;line-height:.95;color:#fff}
.mr-wm-checkout-copy{margin:0;max-width:27ch;font-size:.9rem;line-height:1.5;color:rgba(255,255,255,.8)}
.mr-wm-actions{display:grid;gap:.55rem;margin-top:auto}
.mr-wm-pay{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:3.75rem;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),linear-gradient(135deg,#60a5fa 0%,#3b82f6 48%,#2563eb 100%);color:#fff;font:inherit;font-family:"DM Sans",system-ui,sans-serif;font-size:1.05rem;font-weight:600;letter-spacing:-.01em;cursor:pointer;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 -1px 0 rgba(15,23,42,.12) inset,0 8px 18px rgba(37,99,235,.28),0 2px 4px rgba(37,99,235,.18)}
.mr-wm-pay:hover:not(:disabled){filter:brightness(1.03);transform:translateY(-.5px)}
.mr-wm-pay:disabled{opacity:.55;cursor:not-allowed}
.mr-wm-secondary{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:2.55rem;border:1px solid rgba(243,235,224,.18);border-radius:14px;background:transparent;color:#f3ebe0;font:inherit;font-size:.86rem;font-weight:600;text-decoration:none;cursor:pointer}
.mr-wm-secondary:hover{background:rgba(243,235,224,.06);border-color:rgba(243,235,224,.3)}
.mr-wm-note{margin:0;text-align:left;font-size:.72rem;color:rgba(243,235,224,.45);line-height:1.4}
.mr-wm-error{margin:0;color:#f5a896;font-size:.8rem;font-weight:600;line-height:1.4}
@media (max-width:760px){.mr-wm-panel{max-height:min(92vh,900px);border-radius:18px}.mr-wm-split{grid-template-columns:1fr;overflow:auto}.mr-wm-faq-col{border-right:0;border-top:1px solid #ece8e2;order:2}.mr-wm-checkout{order:1}}
`;
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
        "Do I have to sign up?",
        "You can sign in or create an account when you locate your order."
      ),
      wrap(
        "How does this work?",
        "Moonrise builds a polished preview of your business website. The floating watermark marks the site as unpaid. When you complete checkout, the watermark is removed and your site can go live."
      ),
      wrap(
        "How do I pay?",
        'Click <strong>Pay with Stripe</strong> below. You’ll complete a secure one-time payment on Stripe’s checkout page.'
      ),
      wrap(
        "What do I get?",
        "Stripe confirms instantly. The watermark is removed and publishing unlocks for this site."
      ),
      wrap(
        "Need help or changes?",
        'Message the <a href="mailto:trymoonrise@gmail.com">Moonrise</a> to make any changes such as uploading photos, changing hours, services, colors, infinite redesigns and so much more!'
      ),
      wrap(
        "How do I contact someone?",
        'Reach Moonrise at <a href="' +
          SITE_URL +
          '" target="_blank" rel="noopener noreferrer">' +
          SITE_HOST +
          '</a>, email <a href="mailto:trymoonrise@gmail.com">trymoonrise@gmail.com</a>, or call <a href="tel:+14013000957">(401) 300-0957</a>. If a freelancer showed you this preview, contact them first.'
      ),
      wrap(
        "Will the watermark disappear?",
        "Yes. After successful payment, the watermark overlay is removed and will not appear on the published site."
      ),
      wrap(
        "How long until my site goes live?",
        "Unlock is instant after Stripe confirms payment. Custom domain / DNS may take a few minutes to a few hours."
      ),
      wrap(
        "Do I get to own the website?",
        'The website stays managed by <a href="mailto:trymoonrise@gmail.com">@trymoonrise</a> instead of being handed off as code. We handle the technical work and include ongoing updates and unlimited redesigns, so your site can keep evolving with your business.'
      ),
    ].join("");
  }

  function bindExclusiveFaq(root) {
    if (!root) return;
    const items = Array.from(root.querySelectorAll("details"));
    function closeItem(details) {
      if (!details.classList.contains("is-open")) return;
      details.classList.remove("is-open");
      const panel = details.querySelector(".mr-wm-faq-panel");
      const finish = () => {
        details.open = false;
        panel?.removeEventListener("transitionend", finish);
      };
      if (panel) panel.addEventListener("transitionend", finish);
      else details.open = false;
      setTimeout(finish, 400);
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

  function ensureFonts() {
    if (document.getElementById("mr-wm-font")) return;
    const link = document.createElement("link");
    link.id = "mr-wm-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css();
    document.head.appendChild(style);
  }

  function mount(opts) {
    opts = opts || {};
    if (document.getElementById("mr-wm-root")) return;

    ensureFonts();
    ensureStyle();

    const projectId = opts.projectId || "";
    const workerUrl = String(opts.workerUrl || "http://127.0.0.1:8787").replace(/\/$/, "");
    const paymentLink = opts.paymentLink || "";

    const root = document.createElement("div");
    root.id = "mr-wm-root";
    root.innerHTML =
      '<div class="mr-wm" data-moonrise-watermark>' +
      '<button type="button" class="mr-wm-chip" id="mr-wm-open" aria-haspopup="dialog" aria-controls="mr-wm-overlay">' +
      '<img class="mr-wm-avatar" src="' +
      AVATAR +
      '" alt="Moonrise" width="48" height="48" decoding="async" />' +
      '<span class="mr-wm-copy"><strong>Complete your order</strong>' +
      '<span><a href="' +
      SITE_URL +
      '" target="_blank" rel="noopener noreferrer">' +
      SITE_HOST +
      "</a></span></span></button></div>" +
      '<div class="mr-wm-overlay" id="mr-wm-overlay" aria-hidden="true">' +
      '<div class="mr-wm-panel" role="dialog" aria-modal="true" aria-labelledby="mr-wm-title">' +
      '<header class="mr-wm-head"><img src="' +
      AVATAR +
      '" alt="" width="48" height="48" />' +
      "<div><h2 id=\"mr-wm-title\">Complete your order</h2>" +
      "<p>Remove the Moonrise watermark and unlock your live website.</p></div>" +
      '<button type="button" class="mr-wm-close" id="mr-wm-close" aria-label="Close">×</button></header>' +
      '<div class="mr-wm-split"><div class="mr-wm-faq-col"><p class="mr-wm-faq-label">Questions</p>' +
      '<div class="mr-wm-faq">' +
      faqHtml() +
      "</div></div>" +
      '<aside class="mr-wm-checkout">' +
      '<p class="mr-wm-checkout-copy">Unlock go-live and remove the watermark from this preview.</p>' +
      '<div class="mr-wm-actions">' +
      '<button type="button" class="mr-wm-pay" id="mr-wm-pay">Pay with Stripe</button>' +
      '<a class="mr-wm-secondary" href="' +
      SITE_URL +
      '" target="_blank" rel="noopener noreferrer">Visit ' +
      SITE_HOST +
      "</a></div>" +
      '<p class="mr-wm-error" id="mr-wm-error" hidden></p>' +
      '<p class="mr-wm-note">Payments are processed securely by Stripe. You’ll return here after checkout.</p>' +
      "</aside></div></div></div>";

    document.body.appendChild(root);

    const overlay = document.getElementById("mr-wm-overlay");
    const openBtn = document.getElementById("mr-wm-open");
    const closeBtn = document.getElementById("mr-wm-close");
    const payBtn = document.getElementById("mr-wm-pay");
    const errEl = document.getElementById("mr-wm-error");

    function openPanel() {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    }
    function closePanel() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
    function showError(msg) {
      if (!errEl) return;
      errEl.hidden = !msg;
      errEl.textContent = msg || "";
    }

    openBtn.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openPanel();
    });
    closeBtn.addEventListener("click", closePanel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closePanel();
    });

    bindExclusiveFaq(root.querySelector(".mr-wm-faq"));

    payBtn.addEventListener("click", async () => {
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
        // The business owner on a live site is not signed in — use the public,
        // unauthenticated checkout keyed by project id.
        const res = await fetch(workerUrl + "/public-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Checkout failed");
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

    return { open: openPanel, close: closePanel };
  }

  function autoMountFromScript() {
    const script = document.currentScript;
    if (!script || !script.src) return;
    mount({
      projectId: script.getAttribute("data-project-id") || "",
      workerUrl: script.getAttribute("data-worker") || "",
      paymentLink: script.getAttribute("data-payment-link") || "",
      priceLabel: script.getAttribute("data-price") || "",
    });
  }

  global.MoonriseWatermarkEmbed = { mount, AVATAR, SITE_URL };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMountFromScript);
  } else {
    autoMountFromScript();
  }
})(typeof window !== "undefined" ? window : globalThis);
