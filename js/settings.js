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
    } catch (e) {
      console.warn(e);
      setError(friendlyMessage(e, "Could not load settings"));
    }
  }

  if (document.body.dataset.msAuthFired === "1") start();
  else document.addEventListener("ms:auth-ready", start, { once: true });
  setTimeout(() => {
    if (!started) start();
  }, 2500);
})();
