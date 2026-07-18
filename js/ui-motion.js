/**
 * Motion helpers — button press + smooth expand/collapse.
 */
(function (global) {
  const PRESS_CLASS = "is-pressed";
  const PRESS_MS = 420;
  const EXPAND_MS = 380;
  const SELECTOR = [
    ".ms-btn:not(.ms-btn-secondary):not(.ms-btn-danger):not([disabled])",
    "a.ms-btn:not(.ms-btn-secondary):not(.ms-btn-danger)",
    ".ms-home-cta-primary",
    ".lf-action-builder:not(.is-disabled):not([disabled])",
    ".lf-advanced-dialog-actions .ms-btn:not(.ms-btn-secondary)",
    ".ms-lb-send:not([disabled])",
    "#btn-checkout:not([disabled])",
    ".ms-fin-next:not([disabled])",
    ".ms-fin-save:not([disabled])",
    ".ms-lf-find:not([disabled])",
    ".ms-onboard-next:not([disabled])",
    ".ms-onboard-actions .ms-btn:not([disabled])",
  ].join(",");

  function prefersReducedMotion() {
    return (
      document.documentElement.getAttribute("data-reduce-motion") === "1" ||
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function playPress(el) {
    if (!el || prefersReducedMotion()) return;
    if (el.getAttribute("aria-disabled") === "true" || el.disabled) return;
    el.classList.remove(PRESS_CLASS);
    void el.offsetWidth;
    el.classList.add(PRESS_CLASS);
    global.clearTimeout(el._msPressTimer);
    el._msPressTimer = global.setTimeout(function () {
      el.classList.remove(PRESS_CLASS);
    }, PRESS_MS);
  }

  function onPointer(e) {
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    const btn = e.target?.closest?.(SELECTOR);
    if (!btn) return;
    playPress(btn);
    if (e.type === "pointerdown" && e.pointerType !== "keyboard") {
      global.requestAnimationFrame(function () {
        if (document.activeElement === btn) btn.blur();
      });
    }
  }

  function shouldDelayNav(btn, e) {
    if (!btn || btn.tagName !== "A") return false;
    if (prefersReducedMotion()) return false;
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (btn.target && btn.target !== "_self") return false;
    if (btn.hasAttribute("download")) return false;
    const href = btn.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    try {
      const url = new URL(btn.href, global.location.href);
      if (url.origin !== global.location.origin) return false;
      if (
        url.pathname === global.location.pathname &&
        url.search === global.location.search &&
        url.hash
      ) {
        return false;
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  function onClick(e) {
    const btn = e.target?.closest?.(SELECTOR);
    if (!shouldDelayNav(btn, e)) return;
    e.preventDefault();
    if (!btn.classList.contains(PRESS_CLASS)) playPress(btn);
    const href = btn.href;
    global.clearTimeout(btn._msNavTimer);
    btn._msNavTimer = global.setTimeout(function () {
      global.location.assign(href);
    }, 220);
  }

  function waitMs(ms) {
    return new Promise(function (resolve) {
      global.setTimeout(resolve, ms);
    });
  }

  function ensureExpandInner(el) {
    if (!el) return null;
    if (el.classList.contains("ms-expand-inner")) return el;
    let inner = el.querySelector(":scope > .ms-expand-inner");
    if (inner) return inner;
    inner = document.createElement("div");
    inner.className = "ms-expand-inner";
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    return inner;
  }

  /**
   * Smoothly open/close an element using grid 0fr → 1fr.
   * opts.instant skips animation (initial hydrate).
   */
  function setOpen(el, open, opts) {
    if (!el) return Promise.resolve();
    const wantOpen = !!open;
    const instant = !!(opts && opts.instant) || prefersReducedMotion();

    el.classList.add("ms-expand");
    ensureExpandInner(el);
    el.setAttribute("aria-hidden", wantOpen ? "false" : "true");

    if (instant) {
      el.hidden = !wantOpen;
      el.classList.toggle("is-open", wantOpen);
      return Promise.resolve();
    }

    if (wantOpen) {
      el.hidden = false;
      void el.offsetHeight;
      el.classList.add("is-open");
      return waitMs(EXPAND_MS);
    }

    el.classList.remove("is-open");
    return waitMs(EXPAND_MS).then(function () {
      if (!el.classList.contains("is-open")) el.hidden = true;
    });
  }

  function showPanel(el) {
    if (!el) return Promise.resolve();
    if (prefersReducedMotion()) {
      el.hidden = false;
      el.classList.add("is-active", "is-visible");
      return Promise.resolve();
    }
    el.hidden = false;
    el.classList.add("ms-panel-anim");
    el.classList.remove("is-visible");
    void el.offsetWidth;
    el.classList.add("is-active", "is-visible");
    return waitMs(EXPAND_MS);
  }

  function hidePanel(el) {
    if (!el) return Promise.resolve();
    if (prefersReducedMotion()) {
      el.hidden = true;
      el.classList.remove("is-active", "is-visible");
      return Promise.resolve();
    }
    el.classList.add("ms-panel-anim");
    // Ensure we start from a visible state before fading out
    if (!el.classList.contains("is-visible") && !el.hidden) {
      el.classList.add("is-visible");
      void el.offsetWidth;
    }
    el.classList.remove("is-visible");
    return waitMs(260).then(function () {
      if (!el.classList.contains("is-visible")) {
        el.hidden = true;
        el.classList.remove("is-active");
      }
    });
  }

  function bootFaq() {
    document.querySelectorAll(".ms-home-faq details").forEach(function (details) {
      let body = details.querySelector(".ms-faq-body");
      if (!body) {
        body = document.createElement("div");
        body.className = "ms-faq-body";
        Array.from(details.childNodes).forEach(function (node) {
          if (node.nodeType === 1 && node.tagName === "SUMMARY") return;
          body.appendChild(node);
        });
        details.appendChild(body);
      }

      body.classList.add("ms-expand");
      ensureExpandInner(body);
      if (details.open) {
        body.hidden = false;
        body.classList.add("is-open");
      } else {
        body.hidden = true;
        body.classList.remove("is-open");
      }

      const summary = details.querySelector("summary");
      if (!summary || summary.dataset.msFaqBound === "1") return;
      summary.dataset.msFaqBound = "1";

      summary.addEventListener("click", function (e) {
        e.preventDefault();
        const next = !details.open;
        if (next) {
          details.open = true;
          setOpen(body, true);
        } else {
          setOpen(body, false).then(function () {
            details.open = false;
          });
        }
      });
    });
  }

  function boot() {
    if (!document.body || document.body.dataset.msMotion === "1") return;
    document.body.dataset.msMotion = "1";
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onPointer, true);
    document.addEventListener("click", onClick, true);
    bootFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.StudioMotion = {
    press: playPress,
    setOpen: setOpen,
    showPanel: showPanel,
    hidePanel: hidePanel,
    prefersReducedMotion: prefersReducedMotion,
  };
})(window);
