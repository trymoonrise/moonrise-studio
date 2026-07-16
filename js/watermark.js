/**
 * Watermark overlay + Stripe paywall UI (separate from generated HTML).
 */
(function (global) {
  let timerId = null;

  function workerUrl() {
    return String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function formatRemaining(endsAt) {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return "Offer expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return (
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0") +
      " left to lock this price"
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
        (window.SITE_CONFIG && window.SITE_CONFIG.defaultAvatarUrl) ||
        "doc/pfp.png") +
      '" alt="">' +
      '<span class="ms-watermark-text"><strong>Pay to go live!</strong>' +
      "<span>@" +
      (opts.handle || "moonrise") +
      "</span></span>";
    btn.addEventListener("click", () => openPaywall(opts));
    wrap.appendChild(btn);
    host.appendChild(wrap);
  }

  function openPaywall(opts) {
    const el = document.getElementById("paywall");
    const price = document.getElementById("paywall-price");
    const timer = document.getElementById("paywall-timer");
    const err = document.getElementById("paywall-error");
    if (!el) return;
    if (price) price.textContent = global.SITE_CONFIG?.goLivePriceLabel || "$500";
    if (err) err.hidden = true;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");

    if (timerId) clearInterval(timerId);
    const tick = () => {
      if (timer) timer.textContent = formatRemaining(opts.urgencyEndsAt || Date.now() + 3600000);
    };
    tick();
    timerId = setInterval(tick, 1000);

    const checkoutBtn = document.getElementById("btn-checkout");
    if (checkoutBtn) {
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
            body: JSON.stringify({ projectId: opts.projectId }),
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

  global.StudioWatermark = { mount, openPaywall, closePaywall };
})(window);
