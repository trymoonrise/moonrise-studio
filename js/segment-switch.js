/**
 * Sliding highlight for multi-way segment controls (filters, toggles, playtest radios).
 */
(function (global) {
  const INDICATOR_CLASS = "seg-switch-indicator";
  const TRACK_CLASS = "seg-switch";
  const READY_CLASS = "is-ready";
  const ANIM_MS = 420;

  const PRESETS = [
    {
      track: ".ms-auth-tabs",
      items: ":scope > .ms-auth-tab",
      activeClass: "is-active",
      tone: "surface",
    },
    {
      track: ".ms-lb-mode",
      items: ":scope > .ms-lb-mode-btn",
      activeClass: "is-active",
      tone: "surface",
    },
    {
      track: ".ms-lb-viewports",
      items: ":scope > .ms-lb-icon-btn.is-vp",
      activeClass: "is-active",
      tone: "surface",
    },
    {
      track: ".ms-lf-website-seg",
      items: ":scope > .ms-lf-website-btn",
      activeClass: "is-active",
      tone: "soft",
    },
    {
      track: ".lf-website-toggle",
      items: ":scope > .lf-toggle-btn",
      activeClass: "active",
      tone: "primary",
    },
    {
      track: ".lf-advanced-pills",
      items: ":scope > .lf-toggle-btn",
      activeClass: "active",
      tone: "surface",
    },
    {
      track: ".settings-segment",
      items: ":scope > .settings-segment-btn",
      activeClass: "active",
      tone: "surface",
    },
  ];

  /** @type {WeakMap<Element, object>} */
  const controllers = new WeakMap();

  function prefersReducedMotion() {
    return (
      document.documentElement.getAttribute("data-reduce-motion") === "1" ||
      global.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function itemSelector(preset) {
    return preset.items.replace(/:scope > /g, "");
  }

  function measureEl(item, preset) {
    if (preset.measure === "span") {
      const span = item.querySelector(":scope > span");
      if (span) return span;
    }
    return item;
  }

  function findActive(items, activeClass) {
    return items.find((el) => el.classList.contains(activeClass)) || items[0] || null;
  }

  function relativeBox(track, el) {
    const width = el.offsetWidth || Math.round(el.getBoundingClientRect().width);
    const height = el.offsetHeight || Math.round(el.getBoundingClientRect().height);

    // Prefer layout offsets — getBoundingClientRect drifts with zoom / subpixels
    // and was shifting the pill off the active segment.
    let left = 0;
    let top = 0;
    let node = el;
    while (node && node !== track) {
      left += node.offsetLeft;
      top += node.offsetTop;
      const parent = node.offsetParent;
      if (parent === track) break;
      if (!parent || !track.contains(parent)) {
        const trackRect = track.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return {
          left: Math.round(elRect.left - trackRect.left - track.clientLeft + track.scrollLeft),
          top: Math.round(elRect.top - trackRect.top - track.clientTop + track.scrollTop),
          width: Math.round(width),
          height: Math.round(height),
        };
      }
      node = parent;
    }

    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function applyBox(indicator, box) {
    indicator.style.width = box.width + "px";
    indicator.style.height = box.height + "px";
    indicator.style.transform = "translate(" + box.left + "px, " + box.top + "px)";
  }

  function moveIndicator(ctrl, target, animate) {
    const track = ctrl.track;
    const indicator = ctrl.indicator;
    if (!track || !indicator || !target) return;

    const reduce = prefersReducedMotion();
    const box = relativeBox(track, target);
    const canSlide =
      !!animate &&
      !reduce &&
      track.classList.contains(READY_CLASS) &&
      Number(indicator.offsetWidth) > 0;

    if (!canSlide) {
      indicator.style.transition = "none";
      applyBox(indicator, box);
      void indicator.offsetWidth;
      indicator.style.transition = "";
    } else {
      indicator.style.transition = "";
      // Double-rAF so the browser commits the previous frame before sliding.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          applyBox(indicator, box);
        });
      });
      ctrl.ignoreResizeUntil = Date.now() + ANIM_MS;
    }

    ctrl.lastBox = box;
  }

  function ensureIndicator(track) {
    let indicator = track.querySelector(":scope > ." + INDICATOR_CLASS);
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = INDICATOR_CLASS;
      indicator.setAttribute("aria-hidden", "true");
      track.insertBefore(indicator, track.firstChild);
    }
    return indicator;
  }

  function collectItems(track, preset) {
    return [...track.querySelectorAll(preset.items)];
  }

  function bindResizeObserver(ctrl) {
    if (typeof ResizeObserver === "undefined") return;
    if (ctrl.resizeObserver) ctrl.resizeObserver.disconnect();

    const ro = new ResizeObserver(function () {
      if (Date.now() < (ctrl.ignoreResizeUntil || 0)) return;
      ctrl.sync(false);
    });
    ro.observe(ctrl.track);
    collectItems(ctrl.track, ctrl.preset).forEach(function (item) {
      ro.observe(measureEl(item, ctrl.preset));
    });
    ctrl.resizeObserver = ro;
  }

  function enhanceTrack(track, preset) {
    if (!track || track.closest(".legal-page-segment")) return null;

    const items = collectItems(track, preset);
    if (items.length < 2) {
      track.classList.remove(TRACK_CLASS, READY_CLASS);
      return null;
    }

    let ctrl = controllers.get(track);
    const isNew = !ctrl;
    if (!ctrl) {
      ctrl = {
        track: track,
        preset: preset,
        resizeObserver: null,
        ignoreResizeUntil: 0,
        lastBox: null,
      };
      controllers.set(track, ctrl);
    } else {
      ctrl.preset = preset;
      ctrl.track = track;
    }

    track.classList.add(TRACK_CLASS);
    track.setAttribute("data-seg-tone", preset.tone || "surface");
    ctrl.indicator = ensureIndicator(track);

    function sync(animate) {
      const currentItems = collectItems(track, preset);
      if (currentItems.length < 2) {
        track.classList.remove(READY_CLASS);
        return;
      }
      ctrl.indicator = ensureIndicator(track);
      const active = findActive(currentItems, preset.activeClass);
      if (!active) return;
      const target = measureEl(active, preset);
      moveIndicator(ctrl, target, !!animate);
      const box = ctrl.lastBox;
      if (box && box.width > 2 && box.height > 2) {
        track.classList.add(READY_CLASS);
      } else {
        track.classList.remove(READY_CLASS);
        requestAnimationFrame(function () {
          ctrl.sync(false);
        });
      }
    }

    ctrl.sync = sync;
    bindResizeObserver(ctrl);

    // Only snap on first enhance — later updates must keep the pill where it is
    // so sync(true) can slide to the new active item.
    if (isNew) {
      sync(false);
      requestAnimationFrame(function () {
        sync(false);
      });
    }

    return ctrl;
  }

  function tracksIn(scope, preset) {
    const root = scope && scope.querySelectorAll ? scope : document;
    const list = [...root.querySelectorAll(preset.track)];
    if (root !== document && root.matches?.(preset.track)) list.unshift(root);
    return list;
  }

  function scan(root) {
    PRESETS.forEach(function (preset) {
      tracksIn(root, preset).forEach(function (track) {
        enhanceTrack(track, preset);
      });
    });
  }

  function refresh(root, animate) {
    const shouldAnimate = !!animate;
    PRESETS.forEach(function (preset) {
      tracksIn(root, preset).forEach(function (track) {
        const wasReady = track.classList.contains(READY_CLASS);
        const ctrl = enhanceTrack(track, preset);
        if (!ctrl) return;
        // New tracks already snapped inside enhanceTrack.
        if (wasReady) ctrl.sync(shouldAnimate);
      });
    });
  }

  function presetForTrack(track) {
    for (let i = 0; i < PRESETS.length; i++) {
      if (track.matches(PRESETS[i].track)) return PRESETS[i];
    }
    return null;
  }

  function onMutations(mutations) {
    const animateTracks = new Set();
    let needsScan = false;

    mutations.forEach(function (m) {
      if (m.type === "childList") {
        const nodes = [...(m.addedNodes || []), ...(m.removedNodes || [])];
        const onlyIndicator =
          nodes.length > 0 &&
          nodes.every(function (n) {
            return n.nodeType === 1 && n.classList?.contains(INDICATOR_CLASS);
          });
        if (!onlyIndicator) needsScan = true;
        return;
      }
      if (m.type !== "attributes" || m.attributeName !== "class") return;
      const el = m.target;
      if (!(el instanceof Element)) return;

      for (let i = 0; i < PRESETS.length; i++) {
        const preset = PRESETS[i];
        if (!el.matches(itemSelector(preset))) continue;
        const track = el.closest(preset.track);
        if (!track) continue;
        if (!controllers.get(track)) {
          needsScan = true;
          continue;
        }
        const nowActive = el.classList.contains(preset.activeClass);
        const wasActive = (m.oldValue || "").split(/\s+/).includes(preset.activeClass);
        if (nowActive !== wasActive) animateTracks.add(track);
      }
    });

    if (needsScan) scan(document);

    animateTracks.forEach(function (track) {
      let ctrl = controllers.get(track);
      if (!ctrl?.sync) {
        const preset = presetForTrack(track);
        if (preset) ctrl = enhanceTrack(track, preset);
      }
      ctrl?.sync?.(true);
    });
  }

  function boot() {
    if (!document.body) return;
    scan(document);

    const mo = new MutationObserver(onMutations);
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });

    global.addEventListener("resize", function () {
      refresh(document, false);
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(function () {
        refresh(document, false);
      });
    }

    global.addEventListener("site-app-ready", function () {
      refresh(document, false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.SegmentSwitch = {
    refresh: function (root, animate) {
      refresh(root || document, animate === true);
    },
    scan: scan,
  };
})(window);
