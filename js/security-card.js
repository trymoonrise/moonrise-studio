/**
 * Creator payout card — Stripe Elements $1 confirm + refund.
 */
(function (global) {
  let stripe = null;
  let elements = null;
  let cardElement = null;
  let mountedHost = null;

  function workerUrl() {
    const cloud = String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
    try {
      if (typeof location !== "undefined" && cloud) {
        const cloudOrigin = new URL(cloud).origin;
        if (location.origin === cloudOrigin) return location.origin;
      }
    } catch (_) {
      /* keep cloud fallback */
    }
    if (typeof global.resolveWorkerUrl === "function") {
      const resolved = String(global.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    return cloud;
  }

  function friendlyFetchError(err, fallback) {
    const raw = String(err?.message || err || "").trim();
    const lower = raw.toLowerCase();
    const defaultMsg =
      fallback ||
      "Can't load payout card setup right now. Check your connection and try again.";

    if (
      !raw ||
      lower === "failed to fetch" ||
      lower.includes("networkerror") ||
      lower.includes("load failed") ||
      lower.includes("network request failed")
    ) {
      if (global.isLocalDevHost?.()) {
        return "Can't reach the Moonrise API. If you're testing locally, start the worker or use the live site.";
      }
      return defaultMsg;
    }
    if (lower.includes("timed out") || lower.includes("timeout")) {
      return "Connecting your payout card timed out. Please try again.";
    }
    return raw || defaultMsg;
  }

  function apiErrorMessage(res, payload, fallback) {
    if (res?.status === 404) {
      return "Payout card setup is not available yet — the latest update may still be deploying. Refresh and try again.";
    }
    if (res?.status === 401 || res?.status === 403) {
      return "Your session expired. Sign in again, then return to this step.";
    }
    if (res?.status >= 500) {
      return payload?.error || "Payout card setup is temporarily unavailable. Try again in a moment.";
    }
    return payload?.error || fallback || "Could not load payout card setup.";
  }

  async function authHeaders() {
    const session = await global.StudioAuth.getSession();
    if (!session?.access_token) throw new Error("Sign in required");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  async function workerFetch(path, init, opts) {
    const base = workerUrl();
    if (!base) throw new Error("Worker URL is not configured.");
    const retries = Math.max(0, Number(opts?.retries) || 0);
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(base + path, init);
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }
    throw new Error(
      friendlyFetchError(
        lastErr,
        "Can't load payout card setup right now. Check your connection and try again."
      )
    );
  }

  function formatCardLabel(card) {
    if (!card) return "";
    const brand = String(card.brand || "Card").replace(/^\w/, (c) => c.toUpperCase());
    const last4 = String(card.last4 || "").trim();
    return last4 ? brand + " ·••• " + last4 : brand;
  }

  async function loadStripe(publishableKey) {
    const key =
      String(publishableKey || "").trim() ||
      String(global.SITE_CONFIG?.stripePublishableKey || "").trim();
    if (!key) {
      throw new Error(
        "Stripe is not configured for payout cards. Add STRIPE_PUBLISHABLE_KEY on the worker."
      );
    }
    if (!global.Stripe) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]');
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Could not load Stripe")), {
            once: true,
          });
          if (global.Stripe) resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://js.stripe.com/v3/";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Could not load Stripe"));
        document.head.appendChild(s);
      });
    }
    if (!global.Stripe) throw new Error("Stripe.js failed to load");
    stripe = global.Stripe(key);
    return stripe;
  }

  function unmountCard() {
    if (cardElement) {
      try {
        cardElement.unmount();
      } catch (_) {
        /* ignore */
      }
    }
    cardElement = null;
    elements = null;
    if (mountedHost) mountedHost.innerHTML = "";
    mountedHost = null;
  }

  async function mountCard(hostEl, opts) {
    if (!hostEl) return;
    unmountCard();
    mountedHost = hostEl;
    hostEl.innerHTML = "";

    const configRes = await workerFetch("/security-card/config", { headers: await authHeaders() }, { retries: 1 });
    const config = await configRes.json().catch(() => ({}));
    if (!configRes.ok) {
      throw new Error(apiErrorMessage(configRes, config, "Could not load payout card settings"));
    }

    await loadStripe(config.publishableKey);

    const wrap = document.createElement("div");
    wrap.className = "ms-sec-card-element-wrap";
    const mountPoint = document.createElement("div");
    mountPoint.id = opts?.elementId || "ms-sec-card-element";
    mountPoint.className = "ms-sec-card-element";
    wrap.appendChild(mountPoint);
    hostEl.appendChild(wrap);

    elements = stripe.elements({
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#2563eb",
          borderRadius: "10px",
          fontFamily: '"DM Sans", system-ui, sans-serif',
        },
      },
    });
    cardElement = elements.create("card", {
      hidePostalCode: false,
      style: {
        base: {
          fontSize: "16px",
          color: "#0f172a",
          "::placeholder": { color: "#94a3b8" },
        },
        invalid: { color: "#dc2626" },
      },
    });
    cardElement.mount("#" + mountPoint.id);
    return config;
  }

  async function verifyCard(opts) {
    if (!workerUrl()) throw new Error("Worker URL is not configured.");
    if (!stripe || !cardElement) throw new Error("Add your card details first.");

    const email = String(opts?.email || "").trim();
    const startRes = await workerFetch(
      "/security-card/start",
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email: email || undefined }),
      },
      { retries: 1 }
    );
    const startData = await startRes.json().catch(() => ({}));
    if (!startRes.ok) {
      throw new Error(apiErrorMessage(startRes, startData, "Could not connect payout card"));
    }
    if (!startData.clientSecret) throw new Error("Missing Stripe client secret");

    const result = await stripe.confirmCardPayment(startData.clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: email ? { email } : undefined,
      },
    });

    if (result.error) {
      throw new Error(result.error.message || "Could not connect payout card");
    }

    const paymentIntentId = result.paymentIntent?.id || startData.paymentIntentId;
    const completeRes = await workerFetch(
      "/security-card/complete",
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ paymentIntentId }),
      },
      { retries: 1 }
    );
    const completeData = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) {
      throw new Error(apiErrorMessage(completeRes, completeData, "Could not save payout card"));
    }

    unmountCard();
    return completeData.securityCard || completeData;
  }

  async function fetchStatus() {
    const base = workerUrl();
    if (!base) return { verified: false, securityCard: null };
    try {
      const res = await workerFetch("/security-card/status", { headers: await authHeaders() }, { retries: 1 });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { verified: false, securityCard: null };
      return data;
    } catch (_) {
      return { verified: false, securityCard: null };
    }
  }

  global.MoonriseSecurityCard = {
    mountCard,
    unmountCard,
    verifyCard,
    fetchStatus,
    formatCardLabel,
  };
})(window);
