/**
 * Watermark overlay + Stripe paywall UI (separate from generated HTML).
 */
(function (global) {
  let timerId = null;

  function workerUrl() {
    const configured = String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
    if (!configured || typeof location === "undefined") return configured;
    try {
      const pageHost = location.hostname;
      const worker = new URL(configured);
      const pageIsLocal =
        pageHost === "localhost" ||
        pageHost === "127.0.0.1" ||
        pageHost === "[::1]";
      const workerIsLoopback =
        worker.hostname === "localhost" ||
        worker.hostname === "127.0.0.1" ||
        worker.hostname === "[::1]";
      if (!pageIsLocal && workerIsLoopback && location.protocol.startsWith("http")) {
        worker.hostname = pageHost;
        return worker.origin;
      }
      if (pageIsLocal && workerIsLoopback && pageHost !== worker.hostname) {
        worker.hostname = pageHost;
        return worker.origin;
      }
    } catch (_) {
      /* keep configured */
    }
    return configured;
  }

  function formatRemaining(endsAt) {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return "Offer expired";
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

  function mount(host, opts) {
    if (!host) return;
    host.innerHTML = "";
    if (!opts?.enabled) return;

    const wrap = document.createElement("div");
    wrap.className = "ms-watermark";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ms-watermark-chip";
    btn.innerHTML =
      '<img src="' +
      (opts.avatarUrl ||
        (window.SITE_CONFIG && window.SITE_CONFIG.brandLogoUrl) ||
        "doc/MoonriseLogo.png") +
      '" alt="">' +
      '<span class="ms-watermark-text"><strong>Complete your order</strong>' +
      "<span>trymoonrise.com</span></span>";
    btn.addEventListener("click", () => openPaywall(opts));
    wrap.appendChild(btn);
    host.appendChild(wrap);
  }

  function openPaywall(opts) {
    const el = document.getElementById("paywall");
    const timer = document.getElementById("paywall-timer");
    const err = document.getElementById("paywall-error");
    if (!el) return;
    if (err) err.hidden = true;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");

    if (timerId) clearInterval(timerId);
    const tick = () => {
      if (timer) timer.textContent = formatRemaining(opts.urgencyEndsAt || Date.now() + 96 * 3600000);
    };
    tick();
    timerId = setInterval(tick, 1000);

    const checkoutBtn = document.getElementById("btn-checkout");
    if (checkoutBtn) {
      const dollars = Number(opts.priceCents) / 100;
      checkoutBtn.textContent = Number.isFinite(dollars) && dollars > 0
        ? "Pay $" + dollars.toLocaleString("en-US") + " with Stripe"
        : "Pay with Stripe";
      checkoutBtn.onclick = async () => {
        err.hidden = true;
        checkoutBtn.disabled = true;
        try {
          const session = await global.StudioAuth.getSession();
          if (!session) throw new Error("Sign in required");
          const res = await fetch(workerUrl() + "/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + session.access_token,
            },
            body: JSON.stringify({
              projectId: opts.projectId,
              amountCents: opts.priceCents,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Checkout failed");
          if (data.url) {
            location.href = data.url;
            return;
          }
          throw new Error("No checkout URL returned");
        } catch (e) {
          if (err) {
            err.textContent = e.message || "Checkout failed";
            err.hidden = false;
          }
        } finally {
          checkoutBtn.disabled = false;
        }
      };
    }
  }

  function closePaywall() {
    const el = document.getElementById("paywall");
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (timerId) clearInterval(timerId);
  }

  document.getElementById("btn-paywall-close")?.addEventListener("click", closePaywall);
  document.getElementById("paywall")?.addEventListener("click", (e) => {
    if (e.target?.id === "paywall") closePaywall();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const el = document.getElementById("paywall");
    if (el?.classList.contains("is-open")) closePaywall();
  });

  (function bindExclusiveFaq() {
    const root = document.getElementById("paywall-faq");
    if (!root) return;
    const items = Array.from(root.querySelectorAll("details"));
    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        items.forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  })();

  global.StudioWatermark = { mount, openPaywall, closePaywall };
})(window);
