/**
 * Moonrise floating watermark — from watermark/moonrise-watermark.html
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
  const AVATAR =
    "https://github.com/trymoonrise/dashboard/blob/main/doc/MoonriseLogo.png?raw=true";
  const SITE_HOST = "trymoonrise.com";
  const SITE_URL = "https://trymoonrise.com";
  const STYLE_ID = "mr-wm-embed-style";
  const DEFAULT_URGENCY_MS = 96 * 3600000;

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
#mr-wm-overlay-root{position:fixed;inset:0;z-index:2147483646;pointer-events:none}
.mr-wm-overlay{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:1rem;background:rgba(15,23,42,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s ease,visibility .22s ease;font-family:var(--mr-font)}
.mr-wm-overlay.is-open{opacity:1;visibility:visible;pointer-events:auto}
.mr-wm-panel{width:min(420px,100%);max-height:min(90vh,640px);display:flex;flex-direction:column;overflow:auto;background:#fff;border:1px solid var(--mr-line,#e8edf3);border-radius:16px;box-shadow:0 20px 48px rgba(15,23,42,.22);transform:translateY(12px) scale(.985);opacity:.96;transition:transform .28s cubic-bezier(.22,1,.36,1),opacity .22s ease}
.mr-wm-overlay.is-open .mr-wm-panel{transform:none;opacity:1}
.mr-wm-head{display:flex;align-items:flex-start;gap:.85rem;padding:1.15rem 1.2rem 1rem;border-bottom:1px solid var(--mr-line,#e8edf3);flex-shrink:0}
.mr-wm-head img{width:40px;height:40px;border-radius:12px;object-fit:cover;flex-shrink:0}
.mr-wm-head h2{margin:0;font-family:var(--mr-font);font-size:1.15rem;font-weight:700;letter-spacing:-.03em;line-height:1.15;color:var(--mr-ink,#0f172a)}
.mr-wm-head p{margin:.3rem 0 0;color:var(--mr-muted,#64748b);font-size:.9rem;line-height:1.4}
.mr-wm-close{appearance:none;margin-left:auto;width:34px;height:34px;border:1px solid var(--mr-line,#e8edf3);border-radius:10px;background:#fff;color:#94a3b8;font-size:1.15rem;line-height:1;cursor:pointer;flex-shrink:0}
.mr-wm-close:hover{background:#f8fafc;color:#64748b}
.mr-wm-body{padding:1.15rem 1.2rem 1.35rem;display:flex;flex-direction:column;gap:1.25rem}
.mr-wm-offer{display:flex;flex-direction:column;gap:.75rem}
.mr-wm-timer{margin:0;padding:0;text-align:center;font-family:var(--mr-font);font-size:.85rem;font-weight:650;letter-spacing:-.01em;color:#2563eb}
.mr-wm-pay{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:3.75rem;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),linear-gradient(135deg,#60a5fa 0%,#3b82f6 48%,#2563eb 100%);color:#fff;font:inherit;font-family:var(--mr-font);font-size:1.05rem;font-weight:600;letter-spacing:-.01em;cursor:pointer;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 -1px 0 rgba(15,23,42,.12) inset,0 8px 18px rgba(37,99,235,.28),0 2px 4px rgba(37,99,235,.18)}
.mr-wm-pay:hover:not(:disabled){filter:brightness(1.03);transform:translateY(-.5px)}
.mr-wm-pay:disabled{opacity:.55;cursor:not-allowed}
.mr-wm-note{margin:0;text-align:center;font-size:.78rem;color:#94a3b8;line-height:1.4}
.mr-wm-error{margin:0;color:#b91c1c;font-size:.85rem;font-weight:600;line-height:1.4}
.mr-wm-faq{display:grid;gap:0;margin:0;border-top:1px solid var(--mr-line,#e8edf3)}
.mr-wm-faq details{border:0;border-bottom:1px solid var(--mr-line,#e8edf3);background:transparent}
.mr-wm-faq summary{list-style:none;cursor:pointer;padding:.85rem 0;font-size:.92rem;font-weight:600;color:var(--mr-ink,#0f172a);display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.mr-wm-faq summary::-webkit-details-marker{display:none}
.mr-wm-faq summary::after{content:"+";width:1.4rem;height:1.4rem;flex-shrink:0;display:grid;place-items:center;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:.95rem;font-weight:600;line-height:1;transition:transform .25s ease,background-color .2s ease,color .2s ease}
.mr-wm-faq details.is-open summary::after{content:"–";background:#e8f1ff;color:#2563eb}
.mr-wm-faq-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.22,1,.36,1)}
.mr-wm-faq details.is-open .mr-wm-faq-panel{grid-template-rows:1fr}
.mr-wm-faq-panel-inner{overflow:hidden;min-height:0}
.mr-wm-faq details p{margin:0;padding:0 0 .9rem;color:var(--mr-muted,#64748b);font-size:.88rem;line-height:1.5;opacity:0;transform:translateY(-4px);transition:opacity .24s ease,transform .24s ease}
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

  function faqHtml() {
    const wrap = (q, a) =>
      "<details><summary>" +
      q +
      '</summary><div class="mr-wm-faq-panel"><div class="mr-wm-faq-panel-inner"><p>' +
      a +
      "</p></div></div></details>";
    return [
      wrap("Do I have to sign up?", "You can sign in or create an account when you locate your order."),
      wrap(
        "What do I get?",
        "Stripe confirms instantly. The watermark is removed and publishing unlocks for this site."
      ),
      wrap(
        "Do I get to own the website?",
        'The website stays managed by <a href="mailto:trymoonrise@gmail.com">@trymoonrise</a> instead of being handed off as code. We handle the technical work and include ongoing updates and unlimited redesigns, so your site can keep evolving with your business.'
      ),
      wrap(
        "Need help or changes?",
        'Message the <a href="mailto:trymoonrise@gmail.com">Moonrise</a> to make any changes such as uploading photos, changing hours, services, colors, infinite redesigns and so much more!'
      ),
    ].join("");
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

  function mount(opts) {
    opts = opts || {};
    unmount();
    ensureStyle();

    const projectId = String(opts.projectId || "").trim();
    const workerUrl = String(opts.workerUrl || "http://127.0.0.1:8787").replace(/\/$/, "");
    const paymentLink = String(opts.paymentLink || "").trim();
    const host = opts.host || null;
    const urgencyEndsAt = resolveUrgencyEndsAt(opts.urgencyEndsAt);

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
      '<span><a href="' +
      SITE_URL +
      '" target="_blank" rel="noopener noreferrer">' +
      SITE_HOST +
      "</a></span></span></button></div>";

    // Overlay always on document.body so it covers builder chrome / native UI bleed.
    const overlayRoot = document.createElement("div");
    overlayRoot.id = "mr-wm-overlay-root";
    overlayRoot.innerHTML =
      '<div class="mr-wm-overlay" id="mr-wm-overlay" aria-hidden="true">' +
      '<div class="mr-wm-panel" role="dialog" aria-modal="true" aria-labelledby="mr-wm-title">' +
      '<header class="mr-wm-head"><img src="' +
      AVATAR +
      '" alt="" width="40" height="40" />' +
      '<div><h2 id="mr-wm-title">Complete your order</h2>' +
      "<p>Pay once to remove the watermark and unlock this website.</p></div>" +
      '<button type="button" class="mr-wm-close" id="mr-wm-close" aria-label="Close">×</button></header>' +
      '<div class="mr-wm-body"><div class="mr-wm-offer">' +
      '<p class="mr-wm-timer" id="mr-wm-timer" aria-live="polite"></p>' +
      '<button type="button" class="mr-wm-pay" id="mr-wm-pay">Pay with Stripe</button>' +
      '<p class="mr-wm-error" id="mr-wm-error" hidden></p>' +
      '<p class="mr-wm-note">Upfront site fee plus $4/mo hosting &amp; maintenance · secure Stripe checkout</p></div>' +
      '<div class="mr-wm-faq" id="mr-wm-faq">' +
      faqHtml() +
      "</div></div></div></div>";

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
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      startTimer();
    }

    function closePanel() {
      chip?.classList.remove("is-hidden");
      document.body.classList.remove("mr-wm-open");
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      stopTimer();
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

  function autoMountFromScript() {
    const script = document.currentScript;
    if (!script?.src) return;
    const projectId = script.getAttribute("data-project-id") || "";
    if (!projectId) return;
    mount({
      projectId,
      workerUrl: script.getAttribute("data-worker") || "",
      paymentLink: script.getAttribute("data-payment-link") || "",
      urgencyEndsAt: script.getAttribute("data-urgency-ends-at") || "",
    });
  }

  global.MoonriseWatermarkEmbed = { mount, unmount, AVATAR, SITE_URL };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMountFromScript);
  } else {
    autoMountFromScript();
  }
})(typeof window !== "undefined" ? window : globalThis);
