/**
 * Settings — profile, password, payments, session.
 */
(async function () {
  const BUCKET = "studio-avatars";
  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  const err = document.getElementById("set-error");
  const ok = document.getElementById("set-ok");
  const fileInput = document.getElementById("set-avatar-file");
  const imgEl = document.getElementById("set-avatar-img");
  const initialsEl = document.getElementById("set-avatar-initials");
  const removeBtn = document.getElementById("set-avatar-remove");
  const wrapEl = document.getElementById("set-avatar-wrap");

  let avatarUrl = "";
  let started = false;

  function defaultAvatar() {
    return (window.SITE_CONFIG && window.SITE_CONFIG.defaultAvatarUrl) || "doc/pfp.png";
  }

  function setError(msg) {
    if (ok) ok.hidden = true;
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    if (!msg) {
      window.StudioToast?.clear?.();
      return;
    }
    window.StudioToast?.error?.(msg);
  }

  function setOk(msg) {
    setError("");
    if (!ok) return;
    ok.hidden = !msg;
    ok.textContent = msg || "Saved.";
  }

  function initialsFrom(name) {
    const parts = String(name || "")
      .trim()
      .replace(/^@/, "")
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function refreshPreview() {
    const handle = document.getElementById("set-handle")?.value || "";
    const display = document.getElementById("set-display")?.value || "";
    const label = display || handle || "?";
    const hasCustom = !!String(avatarUrl || "").trim();
    const displayUrl = hasCustom ? avatarUrl : defaultAvatar();

    if (initialsEl) {
      initialsEl.textContent = initialsFrom(label);
      initialsEl.hidden = true;
    }
    if (removeBtn) removeBtn.hidden = !hasCustom;
    if (!imgEl) return;

    imgEl.hidden = false;
    imgEl.alt = label + " profile picture";
    imgEl.decoding = "async";
    imgEl.setAttribute("fetchpriority", "high");

    const clearBusy = () => {
      if (!wrapEl) return;
      window.clearTimeout(wrapEl._msRevealTimer);
      wrapEl.classList.remove("is-busy");
      wrapEl.classList.add("is-avatar-ready");
      wrapEl._msRevealTimer = window.setTimeout(() => {
        wrapEl.classList.remove("is-avatar-ready");
      }, 700);
    };

    if (imgEl.getAttribute("src") === displayUrl && imgEl.complete && imgEl.naturalWidth > 0) {
      clearBusy();
      return;
    }

    if (wrapEl) wrapEl.classList.add("is-busy");

    const onLoad = async () => {
      imgEl.removeEventListener("load", onLoad);
      imgEl.removeEventListener("error", onError);
      try {
        await imgEl.decode?.();
      } catch (_) {
        /* load event is sufficient if decode() is unavailable */
      }
      clearBusy();
    };
    const onError = () => {
      imgEl.removeEventListener("load", onLoad);
      imgEl.removeEventListener("error", onError);
      clearBusy();
      if (displayUrl !== defaultAvatar() && imgEl.getAttribute("src") !== defaultAvatar()) {
        imgEl.src = defaultAvatar();
        return;
      }
      imgEl.hidden = true;
      if (initialsEl) initialsEl.hidden = false;
    };

    imgEl.addEventListener("load", onLoad);
    imgEl.addEventListener("error", onError);
    imgEl.src = displayUrl;
    if (imgEl.complete && imgEl.naturalWidth > 0) void onLoad();
  }

  function notifyShell(handle, url) {
    const clean = String(handle || "").replace(/^@/, "").trim();
    const nameEl = document.getElementById("ms-user-name");
    if (nameEl && clean) nameEl.textContent = clean;
    document.dispatchEvent(
      new CustomEvent("ms:avatar-changed", { detail: { url: url || "", handle: clean } })
    );
  }

  function syncFinanceSetupLink() {
    const link = document.getElementById("set-finance-onboarding-link");
    if (!link) return;
    const complete = window.StudioAuth.financeProfileComplete({
      payout_profile: payoutProfile,
    });
    link.textContent = complete ? "View full payout profile →" : "Resume payout setup →";
    link.href = complete ? "finance.html" : "finance.html?onboarding=1&next=settings.html";
  }

  function extForType(type) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    return "jpg";
  }

  function validateFile(file) {
    if (!file) return "Choose an image first.";
    if (!ALLOWED.has(file.type)) return "Use JPG, PNG, WebP, or GIF.";
    if (file.size > MAX_BYTES) return "Image must be 2 MB or smaller.";
    return "";
  }

  async function uploadAvatar(file, userId) {
    const invalid = validateFile(file);
    if (invalid) throw new Error(invalid);

    const client = window.SiteSupabase.getClient();
    const path = userId + "/avatar." + extForType(file.type);
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;

    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    const url = String(data?.publicUrl || "").trim();
    if (!url) throw new Error("Upload succeeded but URL is missing.");
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  const PAYOUT_ICON_FILES = {
    cashapp: "Cashapp.png",
    venmo: "Venmo.png",
    paypal: "PayPal.png",
    zelle: "Zelle.png",
    applepay: "ApplePay.png",
    googlepay: "GooglePay.png",
    stripe: "Stripe.png",
    crypto: "Bitcoin.png",
  };

  const PAYOUT_METHODS = [
    {
      id: "cashapp",
      label: "Cash App",
      placeholder: "$cashtag",
      hint: "Type your $cashtag, or paste your Cash App link",
      fieldLabel: "Cash App username or link",
    },
    {
      id: "venmo",
      label: "Venmo",
      placeholder: "@username",
      hint: "Type your @username, or paste your Venmo link",
      fieldLabel: "Venmo username or link",
    },
    {
      id: "paypal",
      label: "PayPal",
      placeholder: "@username",
      hint: "Type your PayPal.me username, or paste your link",
      fieldLabel: "PayPal username or link",
    },
    {
      id: "zelle",
      label: "Zelle",
      placeholder: "you@email.com or (555) 123-4567",
      hint: "Paste the email or phone you use for Zelle",
      fieldLabel: "Zelle email or phone",
    },
    {
      id: "applepay",
      label: "Apple Pay",
      placeholder: "(555) 123-4567 or Apple ID email",
      hint: "Paste the phone number or email linked to your Apple Pay",
      fieldLabel: "Apple Pay details",
    },
    {
      id: "googlepay",
      label: "Google Pay",
      placeholder: "you@gmail.com or phone",
      hint: "Paste the email or phone you use for Google Pay",
      fieldLabel: "Google Pay details",
    },
    {
      id: "stripe",
      label: "Stripe",
      placeholder: "buy.stripe.com/your-link",
      hint: "Paste your Stripe Payment Link",
      fieldLabel: "Stripe payment link",
    },
    {
      id: "crypto",
      label: "Crypto",
      placeholder: "Wallet address or payment link",
      hint: "Paste your crypto wallet address or payment link",
      fieldLabel: "Crypto payout details",
    },
    {
      id: "other",
      label: "Other",
      placeholder: "Payment link or phone number",
      hint: "Paste a payment link or phone number",
      fieldLabel: "Other payout details",
    },
  ];

  let payoutProfile = {};
  let selectedPayoutMethod = null;
  let payoutBusy = false;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function payoutMeta(id) {
    return PAYOUT_METHODS.find((m) => m.id === id) || null;
  }

  function payoutIconUrl(id) {
    const file = PAYOUT_ICON_FILES[id];
    return file ? "doc/" + file : "";
  }

  function enabledPayoutList(profile) {
    const methods = (profile && profile.methods) || {};
    return PAYOUT_METHODS.map((m) => {
      const row = methods[m.id] || {};
      if (!row.enabled || !String(row.handle || "").trim()) return null;
      return { id: m.id, label: m.label, handle: String(row.handle || "").trim() };
    }).filter(Boolean);
  }

  function setPayoutError(msg) {
    const el = document.getElementById("set-payout-error");
    const okEl = document.getElementById("set-payout-ok");
    if (okEl) okEl.hidden = true;
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    if (!msg) return;
    window.StudioToast?.error?.(msg);
  }

  function setPayoutOk(msg) {
    setPayoutError("");
    const el = document.getElementById("set-payout-ok");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function renderPayoutMethodButtons() {
    const host = document.getElementById("set-payout-methods");
    if (!host) return;
    host.innerHTML = PAYOUT_METHODS.map((m) => {
      const src = payoutIconUrl(m.id);
      const icon = src
        ? '<img class="ms-payout-method-icon" src="' +
          src +
          '" alt="" width="28" height="28" loading="lazy">'
        : '<span class="ms-payout-method-fallback">' +
          escapeHtml(m.label.charAt(0)) +
          "</span>";
      return (
        '<button type="button" class="ms-payout-method-btn" data-method="' +
        m.id +
        '" aria-pressed="false">' +
        icon +
        '<span class="ms-payout-method-label">' +
        escapeHtml(m.label) +
        "</span></button>"
      );
    }).join("");
  }

  function renderPayoutList() {
    const listEl = document.getElementById("set-payout-list");
    const emptyEl = document.getElementById("set-payout-empty");
    if (!listEl) return;
    const rows = enabledPayoutList(payoutProfile);
    if (!rows.length) {
      listEl.hidden = true;
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = rows
      .map((row, index) => {
        const src = payoutIconUrl(row.id);
        const icon = src
          ? '<img class="ms-payout-item-icon" src="' +
            src +
            '" alt="" width="36" height="36" loading="lazy">'
          : '<span class="ms-payout-item-fallback">' +
            escapeHtml(row.label.charAt(0)) +
            "</span>";
        const badge =
          index === 0
            ? '<span class="ms-payout-default-badge">Default</span>'
            : "";
        return (
          '<li class="ms-payout-item' +
          (index === 0 ? " is-default" : "") +
          '" data-method="' +
          escapeHtml(row.id) +
          '">' +
          '<div class="ms-payout-item-main">' +
          icon +
          '<div class="ms-payout-item-copy">' +
          '<div class="ms-payout-item-title">' +
          escapeHtml(row.label) +
          badge +
          "</div>" +
          '<div class="ms-payout-item-handle">' +
          escapeHtml(row.handle) +
          "</div></div></div>" +
          '<button type="button" class="ms-payout-remove" data-remove-method="' +
          escapeHtml(row.id) +
          '" aria-label="Remove ' +
          escapeHtml(row.label) +
          '">×</button></li>'
        );
      })
      .join("");
  }

  function closePayoutAddPanel() {
    selectedPayoutMethod = null;
    const addPanel = document.getElementById("set-payout-add-panel");
    const inputPanel = document.getElementById("set-payout-input-panel");
    const toolbar = document.getElementById("set-payout-toolbar");
    const handle = document.getElementById("set-payout-handle");
    if (addPanel) addPanel.hidden = true;
    if (inputPanel) inputPanel.hidden = true;
    if (toolbar) toolbar.hidden = false;
    if (handle) handle.value = "";
    document.querySelectorAll(".ms-payout-method-btn").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function openPayoutAddPanel() {
    const addPanel = document.getElementById("set-payout-add-panel");
    const inputPanel = document.getElementById("set-payout-input-panel");
    const toolbar = document.getElementById("set-payout-toolbar");
    renderPayoutMethodButtons();
    if (addPanel) addPanel.hidden = false;
    if (inputPanel) inputPanel.hidden = true;
    if (toolbar) toolbar.hidden = true;
    selectedPayoutMethod = null;
    setPayoutError("");
    setPayoutOk("");
  }

  function selectPayoutMethod(id) {
    const meta = payoutMeta(id);
    if (!meta) return;
    selectedPayoutMethod = id;
    const methods = (payoutProfile.methods || {})[id] || {};
    const inputPanel = document.getElementById("set-payout-input-panel");
    const fieldLabel = document.getElementById("set-payout-field-label");
    const hint = document.getElementById("set-payout-hint");
    const handle = document.getElementById("set-payout-handle");
    if (fieldLabel) fieldLabel.textContent = meta.fieldLabel;
    if (hint) hint.textContent = meta.hint;
    if (handle) {
      handle.placeholder = meta.placeholder;
      handle.value = String(methods.handle || "").trim();
      handle.focus();
    }
    if (inputPanel) inputPanel.hidden = false;
    document.querySelectorAll(".ms-payout-method-btn").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-method") === id ? "true" : "false"
      );
    });
  }

  async function savePayoutProfile(nextProfile) {
    const user = await window.StudioAuth.getUser();
    if (!user) throw new Error("Not signed in");
    await window.StudioAuth.ensureProfile?.(user);
    const client = window.SiteSupabase.getClient();
    if (!client) throw new Error("Could not connect to the database.");

    const payload = {
      payout_profile: nextProfile,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("payout_profile")
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const handle =
        String(user.user_metadata?.handle || "")
          .replace(/^@/, "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 18) || "user";
      const upsert = await client
        .from("profiles")
        .upsert(
          {
            id: user.id,
            handle: handle + "_" + String(user.id).replace(/-/g, "").slice(0, 6),
            display_name: handle,
            ...payload,
          },
          { onConflict: "id" }
        )
        .select("payout_profile")
        .maybeSingle();
      if (upsert.error) throw upsert.error;
      data = upsert.data;
    }

    if (!data) throw new Error("Save did not stick. Refresh and try again.");
    payoutProfile =
      data.payout_profile && typeof data.payout_profile === "object"
        ? data.payout_profile
        : nextProfile;
  }

  async function saveSelectedPayoutMethod() {
    if (payoutBusy) return;
    const id = selectedPayoutMethod;
    const meta = payoutMeta(id);
    const handle = String(document.getElementById("set-payout-handle")?.value || "").trim();
    if (!meta) {
      setPayoutError("Choose a payment app first.");
      return;
    }
    if (!handle) {
      setPayoutError("Enter your payout details.");
      document.getElementById("set-payout-handle")?.focus();
      return;
    }
    payoutBusy = true;
    const saveBtn = document.getElementById("set-payout-save");
    if (saveBtn) saveBtn.disabled = true;
    setPayoutError("");
    try {
      const next = {
        ...(payoutProfile || {}),
        methods: { ...((payoutProfile && payoutProfile.methods) || {}) },
      };
      next.methods[id] = { enabled: true, handle };
      await savePayoutProfile(next);
      closePayoutAddPanel();
      renderPayoutList();
      syncFinanceSetupLink();
      setPayoutOk(meta.label + " saved.");
    } catch (e) {
      setPayoutError(e.message || "Could not save payment method.");
    } finally {
      payoutBusy = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function removePayoutMethod(id) {
    if (payoutBusy || !id) return;
    payoutBusy = true;
    setPayoutError("");
    try {
      const next = {
        ...(payoutProfile || {}),
        methods: { ...((payoutProfile && payoutProfile.methods) || {}) },
      };
      next.methods[id] = { enabled: false, handle: "" };
      await savePayoutProfile(next);
      renderPayoutList();
      syncFinanceSetupLink();
      setPayoutOk("Payment method removed.");
    } catch (e) {
      setPayoutError(e.message || "Could not remove payment method.");
    } finally {
      payoutBusy = false;
    }
  }

  function bindPayoutUi() {
    document.getElementById("set-payout-add")?.addEventListener("click", () => {
      openPayoutAddPanel();
    });
    document.getElementById("set-payout-cancel")?.addEventListener("click", () => {
      closePayoutAddPanel();
      setPayoutOk("");
    });
    document.getElementById("set-payout-save")?.addEventListener("click", () => {
      void saveSelectedPayoutMethod();
    });
    document.getElementById("set-payout-methods")?.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".ms-payout-method-btn[data-method]");
      if (!btn) return;
      selectPayoutMethod(btn.getAttribute("data-method"));
    });
    document.getElementById("set-payout-list")?.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-remove-method]");
      if (!btn) return;
      void removePayoutMethod(btn.getAttribute("data-remove-method"));
    });
    document.getElementById("set-payout-handle")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void saveSelectedPayoutMethod();
      }
    });
  }

  async function load() {
    const user = await window.StudioAuth.getUser();
    if (!user) {
      setError("Sign in to manage settings.");
      payoutProfile = {};
      renderPayoutList();
      return;
    }

    await window.StudioAuth.ensureProfile?.(user);

    let profile = await window.StudioAuth.getProfile();
    if (!profile) {
      await window.StudioAuth.ensureProfile?.(user);
      profile = await window.StudioAuth.getProfile();
    }

    if (profile) {
      document.getElementById("set-handle").value = String(profile.handle || "")
        .replace(/^@/, "");
      document.getElementById("set-display").value = profile.display_name || "";
      document.getElementById("set-email-notif").checked =
        profile.notification_prefs?.email !== false;
      avatarUrl = String(profile.avatar_url || "").trim();
      payoutProfile =
        profile.payout_profile && typeof profile.payout_profile === "object"
          ? profile.payout_profile
          : {};
    } else {
      const fallback =
        user.user_metadata?.handle ||
        user.email?.split("@")[0] ||
        "moonrise";
      document.getElementById("set-handle").value = String(fallback)
        .replace(/^@/, "");
      document.getElementById("set-display").value = "";
      document.getElementById("set-email-notif").checked = true;
      avatarUrl = "";
      payoutProfile = {};
    }
    refreshPreview();
    renderPayoutList();
    syncFinanceSetupLink();
  }

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    setError("");
    wrapEl?.classList.add("is-busy");
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) throw new Error("Not signed in");
      const url = await uploadAvatar(file, user.id);
      avatarUrl = url;
      const { error } = await window.SiteSupabase.getClient()
        .from("profiles")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      refreshPreview();
      setOk("Photo updated.");
      notifyShell(document.getElementById("set-handle")?.value, url);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      wrapEl?.classList.remove("is-busy");
    }
  });

  removeBtn?.addEventListener("click", async () => {
    setError("");
    wrapEl?.classList.add("is-busy");
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) throw new Error("Not signed in");
      avatarUrl = "";
      const { error } = await window.SiteSupabase.getClient()
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      refreshPreview();
      setOk("Photo removed.");
      notifyShell(document.getElementById("set-handle")?.value, "");
    } catch (e) {
      setError(e.message || "Could not remove photo");
    } finally {
      wrapEl?.classList.remove("is-busy");
    }
  });

  document.getElementById("set-handle")?.addEventListener("input", refreshPreview);
  document.getElementById("set-display")?.addEventListener("input", refreshPreview);

  document.getElementById("set-save")?.addEventListener("click", async () => {
    const btn = document.getElementById("set-save");
    setError("");
    if (btn) btn.disabled = true;
    try {
      const user = await window.StudioAuth.getUser();
      if (!user) throw new Error("Not signed in");
      const current = await window.StudioAuth.getProfile();
      const handle = window.StudioAuth.assertHandleAllowed(
        document.getElementById("set-handle").value,
        { existingHandle: current?.handle || "" }
      );
      const payload = {
        id: user.id,
        handle,
        display_name: document.getElementById("set-display").value.trim() || null,
        avatar_url: avatarUrl || null,
        notification_prefs: {
          email: document.getElementById("set-email-notif").checked,
        },
        updated_at: new Date().toISOString(),
      };
      const { error } = await window.SiteSupabase.getClient()
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
      document.getElementById("set-handle").value = payload.handle;
      refreshPreview();
      setOk("Profile saved.");
      notifyShell(payload.handle, avatarUrl);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  const pwErr = document.getElementById("set-pw-error");
  const pwOk = document.getElementById("set-pw-ok");

  function setPwError(msg) {
    if (pwOk) pwOk.hidden = true;
    if (pwErr) {
      pwErr.hidden = true;
      pwErr.textContent = "";
    }
    if (!msg) return;
    window.StudioToast?.error?.(msg);
  }

  function setPwOk(msg) {
    setPwError("");
    if (!pwOk) return;
    pwOk.hidden = !msg;
    pwOk.textContent = msg || "Password updated.";
  }

  document.getElementById("set-pw-save")?.addEventListener("click", async () => {
    const btn = document.getElementById("set-pw-save");
    const current = document.getElementById("set-pw-current")?.value || "";
    const next = document.getElementById("set-pw-new")?.value || "";
    const confirm = document.getElementById("set-pw-confirm")?.value || "";
    setPwError("");
    if (!current || !next || !confirm) {
      setPwError("Fill in all password fields.");
      return;
    }
    if (next !== confirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (btn) btn.disabled = true;
    try {
      await window.StudioAuth.changePassword(current, next);
      document.getElementById("set-pw-current").value = "";
      document.getElementById("set-pw-new").value = "";
      document.getElementById("set-pw-confirm").value = "";
      setPwOk("Password updated.");
    } catch (e) {
      setPwError(e.message || "Could not update password");
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById("set-sign-out")?.addEventListener("click", async () => {
    try {
      await window.StudioAuth.signOut();
    } catch (_) {
      /* ignore */
    }
    location.href = "index.html";
  });

  bindPayoutUi();

  async function start() {
    if (started) return;
    started = true;
    try {
      await load();
    } catch (e) {
      console.warn(e);
      setError(e.message || "Could not load settings");
    }
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();
