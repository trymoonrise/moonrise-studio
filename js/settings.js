/**
 * Settings - profile, password, notifications, session.
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
  const notifToggle = document.getElementById("set-client-purchase-notif");
  const notifHint = document.getElementById("set-notif-hint");
  const notifError = document.getElementById("set-notif-error");

  let avatarUrl = "";
  let started = false;
  let notifBusy = false;

  function defaultAvatar() {
    return (
      (window.SITE_CONFIG && window.SITE_CONFIG.defaultAvatarUrl) ||
      "doc/pfp.png"
    );
  }

  function friendlyMessage(err, fallback) {
    if (typeof window.StudioAuth?.friendlyNetworkMessage === "function") {
      return window.StudioAuth.friendlyNetworkMessage(err, fallback);
    }
    return String(err?.message || err || fallback || "Something went wrong.");
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
      new CustomEvent("ms:avatar-changed", {
        detail: { url: url || "", handle: clean },
      })
    );
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

  async function load() {
    const user = await window.StudioAuth.getUser();
    if (!user) {
      setError("Sign in to manage settings.");
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
      avatarUrl = String(profile.avatar_url || "").trim();
    } else {
      const fallback =
        user.user_metadata?.handle ||
        user.email?.split("@")[0] ||
        "moonrise";
      document.getElementById("set-handle").value = String(fallback)
        .replace(/^@/, "");
      document.getElementById("set-display").value = "";
      avatarUrl = "";
    }
    refreshPreview();
    syncNotificationToggle(profile);
  }

  function setNotifError(msg) {
    if (notifError) {
      notifError.hidden = !msg;
      notifError.textContent = msg || "";
    }
    if (msg) window.StudioToast?.error?.(msg);
  }

  function setNotifHint(msg) {
    if (notifHint) notifHint.textContent = msg || "";
  }

  function syncNotificationToggle(profile) {
    if (!notifToggle) return;
    const enabled = !!window.MoonrisePush?.readPref?.(profile?.notification_prefs);
    notifToggle.checked = enabled;

    if (!window.MoonrisePush?.supported?.()) {
      notifToggle.disabled = true;
      setNotifHint("Push alerts need a modern browser (and on iPhone, Add to Home Screen).");
      return;
    }

    notifToggle.disabled = false;
    if (enabled) {
      setNotifHint("On — you will get a notification when a client purchases their website.");
    } else {
      setNotifHint("Turn on to get a device notification for each new paid client.");
    }
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

  notifToggle?.addEventListener("change", async () => {
    if (notifBusy) return;
    const wantOn = !!notifToggle.checked;
    notifBusy = true;
    notifToggle.disabled = true;
    setNotifError("");
    try {
      if (!window.MoonrisePush?.setClientPurchaseAlerts) {
        throw new Error("Notification helper is not loaded.");
      }
      await window.MoonrisePush.setClientPurchaseAlerts(wantOn);
      notifToggle.checked = wantOn;
      if (wantOn) {
        setNotifHint("On — you will get a notification when a client purchases their website.");
        window.StudioToast?.success?.("Client purchase alerts enabled.");
      } else {
        setNotifHint("Turn on to get a device notification for each new paid client.");
        window.StudioToast?.success?.("Client purchase alerts turned off.");
      }
    } catch (e) {
      notifToggle.checked = !wantOn;
      setNotifError(e.message || "Could not update notifications");
    } finally {
      notifBusy = false;
      if (window.MoonrisePush?.supported?.()) notifToggle.disabled = false;
    }
  });

  const passkeySection = document.getElementById("settings-passkeys");
  const passkeyList = document.getElementById("set-passkey-list");
  const passkeyEmpty = document.getElementById("set-passkey-empty");
  const passkeyUnavailable = document.getElementById("set-passkey-unavailable");
  const passkeyActions = document.getElementById("set-passkey-actions");
  const passkeyAdd = document.getElementById("set-passkey-add");
  const passkeyChange = document.getElementById("set-passkey-change");
  const passkeyErr = document.getElementById("set-passkey-error");
  const passkeyOk = document.getElementById("set-passkey-ok");

  function setPasskeyError(msg) {
    if (passkeyOk) passkeyOk.hidden = true;
    if (!passkeyErr) return;
    passkeyErr.hidden = !msg;
    passkeyErr.textContent = msg || "";
  }

  function setPasskeyOk(msg) {
    setPasskeyError("");
    if (!passkeyOk) return;
    passkeyOk.hidden = !msg;
    passkeyOk.textContent = msg || "Passkey saved.";
  }

  function formatPasskeyWhen(iso) {
    try {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return "";
    }
  }

  function setPasskeyControlsEnabled(enabled) {
    if (passkeyActions) passkeyActions.hidden = !enabled;
    if (passkeyAdd) passkeyAdd.disabled = !enabled;
    if (passkeyChange) passkeyChange.disabled = !enabled;
  }

  async function refreshPasskeys() {
    if (!passkeySection) return;
    passkeySection.hidden = false;
    const usable = !!window.StudioAuth?.canUsePasskeys?.();
    if (passkeyUnavailable) passkeyUnavailable.hidden = usable;
    if (!usable) {
      if (passkeyList) passkeyList.innerHTML = "";
      if (passkeyEmpty) passkeyEmpty.hidden = true;
      if (passkeyChange) passkeyChange.hidden = true;
      setPasskeyControlsEnabled(false);
      return;
    }
    setPasskeyControlsEnabled(true);
    try {
      const items = await window.StudioAuth.listPasskeys();
      if (passkeyList) passkeyList.innerHTML = "";
      const hasAny = Array.isArray(items) && items.length > 0;
      if (passkeyChange) passkeyChange.hidden = !hasAny;
      if (passkeyAdd) passkeyAdd.textContent = hasAny ? "Add another" : "Add passkey";
      if (!hasAny) {
        if (passkeyEmpty) passkeyEmpty.hidden = false;
        return;
      }
      if (passkeyEmpty) passkeyEmpty.hidden = true;
      items.forEach((pk) => {
        const li = document.createElement("li");
        li.className = "ms-passkey-item";
        const copy = document.createElement("div");
        copy.className = "ms-passkey-item-copy";
        const title = document.createElement("strong");
        title.textContent = pk.friendly_name || "Passkey";
        const meta = document.createElement("span");
        const created = formatPasskeyWhen(pk.created_at);
        const used = formatPasskeyWhen(pk.last_used_at);
        meta.textContent = used
          ? `Last used ${used}`
          : created
            ? `Added ${created}`
            : "Saved on this account";
        copy.appendChild(title);
        copy.appendChild(meta);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ms-passkey-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Remove this passkey? You can still sign in with your password.")) {
            return;
          }
          remove.disabled = true;
          try {
            await window.StudioAuth.deletePasskey(pk.id);
            setPasskeyOk("Passkey removed.");
            await refreshPasskeys();
          } catch (e) {
            setPasskeyError(friendlyMessage(e, "Could not remove passkey"));
            remove.disabled = false;
          }
        });
        li.appendChild(copy);
        li.appendChild(remove);
        passkeyList?.appendChild(li);
      });
    } catch (e) {
      console.warn("passkeys", e);
      setPasskeyError(friendlyMessage(e, "Could not load passkeys"));
    }
  }

  passkeyAdd?.addEventListener("click", async () => {
    setPasskeyError("");
    passkeyAdd.disabled = true;
    if (passkeyChange) passkeyChange.disabled = true;
    try {
      await window.StudioAuth.registerPasskey();
      try {
        localStorage.removeItem("ms_passkey_offer_declined");
      } catch (_) {
        /* ignore */
      }
      setPasskeyOk("Passkey saved on this device.");
      window.StudioToast?.success?.("Passkey saved");
      await refreshPasskeys();
    } catch (e) {
      if (e?.code === "passkey_cancelled") {
        setPasskeyError("");
      } else {
        setPasskeyError(friendlyMessage(e, "Could not create passkey"));
      }
    } finally {
      passkeyAdd.disabled = false;
      if (passkeyChange) passkeyChange.disabled = false;
    }
  });

  passkeyChange?.addEventListener("click", async () => {
    setPasskeyError("");
    if (
      !window.confirm(
        "Create a new passkey on this device and remove your previous ones from this account?"
      )
    ) {
      return;
    }
    passkeyChange.disabled = true;
    if (passkeyAdd) passkeyAdd.disabled = true;
    const idle = passkeyChange.textContent;
    passkeyChange.textContent = "Waiting for passkey...";
    try {
      const run =
        window.StudioAuth.replacePasskey ||
        (async () => window.StudioAuth.registerPasskey());
      await run();
      try {
        localStorage.removeItem("ms_passkey_offer_declined");
      } catch (_) {
        /* ignore */
      }
      setPasskeyOk("Passkey updated on this device.");
      window.StudioToast?.success?.("Passkey changed");
      await refreshPasskeys();
    } catch (e) {
      if (e?.code === "passkey_cancelled") {
        setPasskeyError("");
      } else {
        setPasskeyError(friendlyMessage(e, "Could not change passkey"));
      }
    } finally {
      passkeyChange.disabled = false;
      passkeyChange.textContent = idle || "Change passkey";
      if (passkeyAdd) passkeyAdd.disabled = false;
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

  document.getElementById("set-replay-onboarding")?.addEventListener("click", async () => {
    const btn = document.getElementById("set-replay-onboarding");
    const errEl = document.getElementById("set-onboard-error");
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (btn) btn.disabled = true;
    const target =
      "onboarding.html?replay=1&next=" + encodeURIComponent("settings.html");
    try {
      window.StudioAuth.setForceOnboardingReplay?.(true);
      try {
        localStorage.removeItem("ms_studio_onboarding_draft_v1");
      } catch (_) {
        /* ignore */
      }
      // Clear DB flag when possible, but always navigate into the wizard.
      try {
        await window.StudioAuth.clearStudioOnboardingFlag?.();
      } catch (clearErr) {
        console.warn("clearStudioOnboardingFlag", clearErr);
      }
      location.assign(target);
    } catch (e) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = e.message || "Could not start onboarding replay.";
      }
      window.StudioToast?.error?.(e.message || "Could not start onboarding replay.");
      if (btn) btn.disabled = false;
    }
  });

  async function start() {
    if (started) return;
    started = true;
    try {
      await load();
      await refreshPasskeys();
    } catch (e) {
      console.warn(e);
      setError(friendlyMessage(e, "Could not load settings"));
    }
  }

  window.StudioBoot?.whenAuthReady?.(start) ?? start();
})();
