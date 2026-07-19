/**
 * Top-of-screen error banner - ease in / ease out.
 * StudioToast.error(msg) · StudioToast.clear()
 * Also adopts inline .ms-error / dialog error text so all errors share one surface.
 */
(function (global) {
  const HOST_ID = "ms-toast-host";
  const SHOW_MS = 4200;
  const SHOW_MS_LONG = 10000;
  const LONG_MSG_CHARS = 90;
  const EXIT_MS = 320;
  let hideTimer = 0;
  let exitTimer = 0;
  let lastMsg = "";
  let lastAt = 0;
  const seenInline = new WeakMap();

  function prefersReducedMotion() {
    return (
      document.documentElement.getAttribute("data-reduce-motion") === "1" ||
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;
    host = document.createElement("div");
    host.id = HOST_ID;
    host.className = "ms-toast-host";
    host.setAttribute("aria-live", "assertive");
    host.setAttribute("aria-relevant", "additions text");
    host.innerHTML =
      '<div class="ms-toast ms-toast--error" id="ms-toast" role="alert" hidden>' +
      '<div class="ms-toast-inner">' +
      '<span class="ms-toast-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>' +
      "</span>" +
      '<p class="ms-toast-msg" id="ms-toast-msg"></p>' +
      '<button type="button" class="ms-toast-close" id="ms-toast-close" aria-label="Dismiss">&times;</button>' +
      "</div></div>";
    document.body.appendChild(host);
    document.getElementById("ms-toast-close")?.addEventListener("click", function () {
      clear();
    });
    return host;
  }

  function clearTimers() {
    global.clearTimeout(hideTimer);
    global.clearTimeout(exitTimer);
    hideTimer = 0;
    exitTimer = 0;
  }

  function clear() {
    clearTimers();
    const toast = document.getElementById("ms-toast");
    if (!toast) return;
    toast.classList.remove("is-in", "ms-toast--error", "ms-toast--success", "ms-toast--info");
    toast.classList.add("is-out");
    const finish = function () {
      toast.hidden = true;
      toast.classList.remove("is-out", "is-in", "ms-toast--error", "ms-toast--success", "ms-toast--info");
      const msg = document.getElementById("ms-toast-msg");
      if (msg) msg.textContent = "";
      lastMsg = "";
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    exitTimer = global.setTimeout(finish, EXIT_MS);
  }

  function show(kind, msg) {
    const text = String(msg || "").trim();
    if (!text) {
      clear();
      return;
    }
    const now = Date.now();
    if (text === lastMsg && now - lastAt < 450) return;
    lastMsg = text;
    lastAt = now;

    ensureHost();
    const toast = document.getElementById("ms-toast");
    const msgEl = document.getElementById("ms-toast-msg");
    if (!toast || !msgEl) return;

    clearTimers();
    toast.classList.remove("ms-toast--error", "ms-toast--success", "ms-toast--info");
    toast.classList.add("ms-toast--" + (kind || "error"));
    msgEl.textContent = text;
    toast.hidden = false;
    toast.classList.remove("is-out");
    void toast.offsetWidth;
    toast.classList.add("is-in");

    hideTimer = global.setTimeout(clear, text.length > LONG_MSG_CHARS ? SHOW_MS_LONG : SHOW_MS);
  }

  function error(msg) {
    show("error", msg);
  }

  function success(msg) {
    show("success", msg);
  }

  function info(msg) {
    show("info", msg);
  }

  function adoptInlineError(el) {
    if (!el || el.id === "ms-toast" || el.closest?.("#" + HOST_ID)) return;
    const isErrorSurface =
      el.classList.contains("ms-error") ||
      el.classList.contains("ms-clients-dialog-error") ||
      (el.classList.contains("is-error") && el.getAttribute("role") === "status");
    if (!isErrorSurface) return;

    const text = String(el.textContent || "").trim();
    const visible = !el.hidden && el.getAttribute("aria-hidden") !== "true" && !!text;
    if (!visible) {
      seenInline.delete(el);
      return;
    }
    if (seenInline.get(el) === text) return;
    seenInline.set(el, text);
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    error(text);
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll?.(
      ".ms-error, .ms-clients-dialog-error, [role='status'].is-error"
    ).forEach(adoptInlineError);
    if (root?.classList) adoptInlineError(root);
  }

  function bootWatcher() {
    if (!document.body || document.body.dataset.msToastWatch === "1") return;
    document.body.dataset.msToastWatch = "1";
    ensureHost();
    scan(document);

    const obs = new MutationObserver(function (mutations) {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === "characterData") {
          const parent = m.target.parentElement;
          if (parent) adoptInlineError(parent.closest?.(".ms-error, .ms-clients-dialog-error, [role='status'].is-error") || parent);
          continue;
        }
        if (m.type === "attributes") {
          adoptInlineError(m.target);
          continue;
        }
        if (m.type === "childList") {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            scan(node);
          });
          if (m.target?.classList) adoptInlineError(m.target);
        }
      }
    });

    obs.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "aria-hidden"],
    });
  }

  function boot() {
    if (!document.body) return;
    bootWatcher();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.StudioToast = {
    error: error,
    success: success,
    info: info,
    clear: clear,
    showError: error,
  };
})(window);
