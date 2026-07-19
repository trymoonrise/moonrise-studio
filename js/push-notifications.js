/**
 * Client Web Push helpers for creator "My Clients" purchase alerts.
 */
(function (global) {
  const PREF_KEY = "clientPurchases";

  function workerBase() {
    if (typeof global.resolveWorkerUrl === "function") {
      const resolved = String(global.resolveWorkerUrl() || "").replace(/\/$/, "");
      if (resolved) return resolved;
    }
    return String(global.SITE_CONFIG?.workerUrl || "").replace(/\/$/, "");
  }

  function supported() {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function authHeaders() {
    const session = await global.StudioAuth?.getSession?.();
    if (!session?.access_token) throw new Error("Sign in to manage notifications.");
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
    };
  }

  async function fetchVapidPublicKey() {
    const base = workerBase();
    if (!base) throw new Error("Worker URL is not configured.");
    const res = await fetch(base + "/push/vapid-public-key", {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Push notifications are not available yet.");
    }
    const key = String(data.publicKey || "").trim();
    if (!key) throw new Error("Missing VAPID public key.");
    return key;
  }

  async function readyRegistration() {
    if (!supported()) throw new Error("Push notifications are not supported in this browser.");
    const reg = await navigator.serviceWorker.ready;
    if (!reg?.pushManager) throw new Error("Push manager is unavailable.");
    return reg;
  }

  async function currentSubscription() {
    try {
      const reg = await readyRegistration();
      return (await reg.pushManager.getSubscription()) || null;
    } catch (_) {
      return null;
    }
  }

  async function subscribe() {
    if (!supported()) {
      throw new Error("This browser does not support push notifications.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const publicKey = await fetchVapidPublicKey();
    const reg = await readyRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = sub.toJSON();
    const headers = await authHeaders();
    const base = workerBase();
    const res = await fetch(base + "/push/subscribe", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not save push subscription.");
    return { subscription: sub, data };
  }

  async function unsubscribe() {
    const sub = await currentSubscription();
    if (!sub) return { ok: true, skipped: true };

    try {
      const headers = await authHeaders();
      const base = workerBase();
      await fetch(base + "/push/unsubscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch (_) {
      /* still drop local subscription */
    }

    try {
      await sub.unsubscribe();
    } catch (_) {
      /* ignore */
    }
    return { ok: true };
  }

  function readPref(prefs) {
    if (!prefs || typeof prefs !== "object") return false;
    return prefs[PREF_KEY] === true || prefs.purchaseAlerts === true;
  }

  function withPref(prefs, enabled) {
    const next =
      prefs && typeof prefs === "object" && !Array.isArray(prefs) ? { ...prefs } : { email: true };
    next[PREF_KEY] = !!enabled;
    return next;
  }

  async function savePref(enabled) {
    const user = await global.StudioAuth?.getUser?.();
    if (!user) throw new Error("Not signed in");
    const profile = await global.StudioAuth?.getProfile?.();
    const notification_prefs = withPref(profile?.notification_prefs, enabled);
    const { error } = await global.SiteSupabase.getClient()
      .from("profiles")
      .update({
        notification_prefs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw error;
    return notification_prefs;
  }

  /**
   * Turn client-purchase alerts on or off: save pref + manage push subscription.
   */
  async function setClientPurchaseAlerts(enabled) {
    if (enabled) {
      await subscribe();
      await savePref(true);
      return { enabled: true };
    }
    await savePref(false);
    await unsubscribe();
    return { enabled: false };
  }

  global.MoonrisePush = {
    PREF_KEY,
    supported,
    readPref,
    currentSubscription,
    subscribe,
    unsubscribe,
    setClientPurchaseAlerts,
    savePref,
  };
})(window);
