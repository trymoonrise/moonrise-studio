/**
 * Shared slide-to-complete physics (testslider.html + Business Finder).
 * Thumb is CSS-clamped inside the track; JS keeps --ms-lf-slide-x in [0, max].
 */
(function (global) {
  /** Complete while dragging once the thumb is nearly at the end. */
  const COMPLETE_RATIO = 0.92;
  /** On release, commit only if the thumb was dragged most of the way. */
  const RELEASE_COMMIT_RATIO = 0.88;
  const END_TOLERANCE_PX = 4;
  const RETURN_MS = 280;
  const COMPLETE_MS = 320;
  const FALLBACK_THUMB = 44;
  const FALLBACK_PAD = 4;

  function slidePad(track) {
    if (!track) return FALLBACK_PAD;
    const style = global.getComputedStyle(track);
    const pad = Number.parseFloat(style.paddingLeft);
    return Number.isFinite(pad) && pad >= 0 ? pad : FALLBACK_PAD;
  }

  function thumbSize(slide, thumb) {
    if (!thumb) {
      if (slide) {
        const raw = global.getComputedStyle(slide).getPropertyValue("--ms-lf-slide-thumb");
        const fromVar = Number.parseFloat(raw);
        if (Number.isFinite(fromVar) && fromVar > 8) return fromVar;
      }
      return FALLBACK_THUMB;
    }
    // Prefer the rendered box — CSS vars can lag after card resize.
    const rect = thumb.getBoundingClientRect();
    const w = rect.width || thumb.offsetWidth || 0;
    const h = rect.height || thumb.offsetHeight || 0;
    const size = Math.max(w, h);
    if (size > 8) return size;
    if (slide) {
      const raw = global.getComputedStyle(slide).getPropertyValue("--ms-lf-slide-thumb");
      const fromVar = Number.parseFloat(raw);
      if (Number.isFinite(fromVar) && fromVar > 8) return fromVar;
    }
    return FALLBACK_THUMB;
  }

  function trackInnerWidth(track) {
    if (!track) return 0;
    // Padding box width (absolute children are positioned against this).
    const viaClient = track.clientWidth || 0;
    if (viaClient > 0) return viaClient;
    const rect = track.getBoundingClientRect();
    const style = global.getComputedStyle(track);
    const borderL = Number.parseFloat(style.borderLeftWidth) || 0;
    const borderR = Number.parseFloat(style.borderRightWidth) || 0;
    return Math.max(0, (rect.width || 0) - borderL - borderR);
  }

  function metrics(slide, pass) {
    const track = slide?.querySelector(".ms-lf-slide-track");
    const thumb = slide?.querySelector(".ms-lf-slide-thumb");
    if (!track || !thumb) return null;

    void track.offsetWidth;
    void thumb.offsetWidth;
    void slide?.offsetWidth;

    const pad = slidePad(track);
    const thumbW = thumbSize(slide, thumb);
    const trackW = trackInnerWidth(track);
    const travel = trackW - pad * 2 - thumbW;
    const max = Math.max(0, Math.floor(travel * 1000) / 1000);

    if (max <= 0 && (pass || 0) < 8) {
      return metrics(slide, (pass || 0) + 1);
    }

    return { track, thumb, pad, thumbW, trackW, max };
  }

  function readX(slide) {
    const raw = slide?.style?.getPropertyValue("--ms-lf-slide-x");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setX(slide, x, m, opts) {
    if (!slide || !m) return 0;
    const max = Math.max(0, m.max);
    const clamped = Math.max(0, Math.min(max, x));
    const fillToEnd = opts && opts.fillToEnd;
    const fill = fillToEnd
      ? m.trackW || 9999
      : Math.min(m.trackW || Infinity, m.pad + clamped + m.thumbW);

    slide.style.setProperty("--ms-lf-slide-x", clamped + "px");
    slide.style.setProperty("--ms-lf-slide-max", max + "px");
    slide.style.setProperty("--ms-lf-slide-fill", fill + "px");
    slide.style.setProperty("--ms-lf-slide-thumb", m.thumbW + "px");
    return clamped;
  }

  function clearInline(slide) {
    if (!slide) return;
    slide.style.removeProperty("--ms-lf-slide-x");
    slide.style.removeProperty("--ms-lf-slide-max");
    slide.style.removeProperty("--ms-lf-slide-fill");
    slide.style.removeProperty("--ms-lf-slide-thumb");
  }

  function completes(current, max, ratio) {
    if (!(max > 0)) return false;
    const need = Number.isFinite(ratio) ? ratio : COMPLETE_RATIO;
    return current >= max * need || current >= max - END_TOLERANCE_PX;
  }

  function xFromPointer(track, clientX, max, grabOffsetX, m) {
    if (!track || max <= 0) return 0;
    const pad = m?.pad ?? slidePad(track);
    const rect = track.getBoundingClientRect();
    const style = global.getComputedStyle(track);
    const borderL = Number.parseFloat(style.borderLeftWidth) || 0;
    /* Thumb left edge follows pointer minus grab offset. */
    const raw = clientX - grabOffsetX - rect.left - borderL - pad;
    return Math.max(0, Math.min(max, raw));
  }

  function resetSlide(slide, animated) {
    if (!slide) return;
    const m = metrics(slide);
    if (!m) return;
    slide.classList.remove("is-dragging", "is-completing");
    if (animated) {
      slide.classList.add("is-returning");
      setX(slide, 0, m);
      global.setTimeout(function () {
        slide.classList.remove("is-returning");
        clearInline(slide);
      }, RETURN_MS);
      return;
    }
    slide.classList.remove("is-returning");
    clearInline(slide);
  }

  function completeSlide(slide, onComplete) {
    if (!slide || slide.classList.contains("is-completing")) return;
    const m = metrics(slide);
    if (!m || m.max <= 0) return;
    slide.classList.remove("is-dragging", "is-returning");
    slide.classList.add("is-completing");
    // Snap thumb + fill all the way to the end before firing the action.
    setX(slide, m.max, m, { fillToEnd: true });
    global.setTimeout(function () {
      slide.classList.remove("is-completing");
      if (typeof onComplete === "function") onComplete(slide);
    }, COMPLETE_MS);
  }

  function beginDrag(e, slide, hooks) {
    hooks = hooks || {};
    if (e.button != null && e.button !== 0) return false;
    if (typeof hooks.canInteract === "function" && !hooks.canInteract(slide, e)) return false;
    if (slide.classList.contains("is-completing") || slide.classList.contains("is-returning")) {
      return false;
    }
    if (slide.dataset.msLfSlideDragging === "1") return false;

    let m = metrics(slide);
    if (!m || m.max <= 2) {
      void slide.offsetWidth;
      m = metrics(slide);
    }
    if (!m || m.max <= 2) return false;
    const { track, thumb } = m;
    // Freeze travel for this gesture so layout thrash cannot shrink/inflate max.
    const gestureMetrics = {
      track: m.track,
      thumb: m.thumb,
      pad: m.pad,
      thumbW: m.thumbW,
      trackW: m.trackW,
      max: m.max,
    };
    const max = gestureMetrics.max;

    e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();

    const startX = e.clientX ?? 0;
    const onThumb = !!e.target.closest(".ms-lf-slide-thumb");
    const thumbRect = thumb.getBoundingClientRect();
    const grabOffsetX = onThumb ? startX - thumbRect.left : gestureMetrics.thumbW / 2;
    const startLeft = onThumb
      ? readX(slide)
      : xFromPointer(track, startX, max, grabOffsetX, gestureMetrics);
    let current = Math.max(0, Math.min(max, startLeft));
    let moved = current > 2;
    let finished = false;
    const pointerId = e.pointerId ?? 1;
    const usePointer = e.pointerId != null;

    slide.dataset.msLfSlideDragging = "1";
    slide.classList.add("is-dragging");
    global.document.body.classList.add("ms-lf-slide-dragging");
    setX(slide, current, gestureMetrics);

    if (usePointer) {
      try {
        thumb.setPointerCapture(pointerId);
      } catch (_) {
        try {
          track.setPointerCapture(pointerId);
        } catch (_) {
          /* ignore */
        }
      }
    }

    function clientX(ev) {
      if (ev.clientX != null) return ev.clientX;
      const touch = ev.changedTouches?.[0] || ev.touches?.[0];
      return touch ? touch.clientX : startX;
    }

    function finishDrag(ev, forceComplete) {
      if (finished) return;
      if (usePointer && ev?.pointerId != null && ev.pointerId !== pointerId) return;
      finished = true;
      delete slide.dataset.msLfSlideDragging;
      global.document.body.classList.remove("ms-lf-slide-dragging");
      if (usePointer) {
        global.removeEventListener("pointermove", onMove, true);
        global.removeEventListener("pointerup", onRelease, true);
        global.removeEventListener("pointercancel", onRelease, true);
      } else {
        global.removeEventListener("mousemove", onMove, true);
        global.removeEventListener("mouseup", onRelease, true);
        global.removeEventListener("touchmove", onMove, true);
        global.removeEventListener("touchend", onRelease, true);
        global.removeEventListener("touchcancel", onRelease, true);
      }
      if (usePointer) {
        try {
          thumb.releasePointerCapture(pointerId);
        } catch (_) {
          /* ignore */
        }
      }
      slide.classList.remove("is-dragging");
      current = setX(slide, current, gestureMetrics);
      const shouldComplete =
        forceComplete === true ||
        (moved && completes(current, max, COMPLETE_RATIO)) ||
        (moved && completes(current, max, RELEASE_COMMIT_RATIO));
      if (shouldComplete) {
        completeSlide(slide, hooks.onComplete);
      } else {
        resetSlide(slide, true);
      }
    }

    function onRelease(ev) {
      finishDrag(ev, false);
    }

    function onMove(ev) {
      if (finished) return;
      if (usePointer && ev.pointerId != null && ev.pointerId !== pointerId) return;
      ev.preventDefault();
      const cx = clientX(ev);
      if (Math.abs(cx - startX) >= 2) moved = true;
      current = setX(
        slide,
        xFromPointer(track, cx, max, grabOffsetX, gestureMetrics),
        gestureMetrics
      );
      if (moved && completes(current, max, COMPLETE_RATIO)) {
        finishDrag(ev, true);
      }
    }

    if (usePointer) {
      global.addEventListener("pointermove", onMove, true);
      global.addEventListener("pointerup", onRelease, true);
      global.addEventListener("pointercancel", onRelease, true);
    } else if (e.type === "touchstart") {
      global.addEventListener("touchmove", onMove, { capture: true, passive: false });
      global.addEventListener("touchend", onRelease, true);
      global.addEventListener("touchcancel", onRelease, true);
    } else {
      global.addEventListener("mousemove", onMove, true);
      global.addEventListener("mouseup", onRelease, true);
    }
    return true;
  }

  function bindTrack(track, hooks) {
    if (!track || track.dataset.msLfSlideBound === "1") return;
    track.dataset.msLfSlideBound = "1";

    function onStart(e) {
      const slide = track.closest(".ms-lf-slide");
      if (!slide) return;
      beginDrag(e, slide, hooks);
    }

    track.addEventListener("pointerdown", onStart, true);
    track.addEventListener(
      "touchstart",
      function (e) {
        if (typeof global.PointerEvent === "function") return;
        onStart(e);
      },
      { capture: true, passive: false }
    );
    track.addEventListener(
      "mousedown",
      function (e) {
        if (typeof global.PointerEvent === "function") return;
        onStart(e);
      },
      true
    );
  }

  function bindContainer(container, hooks) {
    if (!container || container.dataset.msLfSlideBound === "1") return;
    container.dataset.msLfSlideBound = "1";

    function onStart(e) {
      const track = e.target.closest(".ms-lf-slide-track");
      if (!track) return;
      const slide = track.closest(".ms-lf-slide");
      if (!slide) return;
      // Only consume the event if the drag actually starts (metrics ready).
      const started = beginDrag(e, slide, hooks);
      if (started) {
        e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
      }
    }

    container.addEventListener("pointerdown", onStart, true);
    container.addEventListener(
      "touchstart",
      function (e) {
        if (typeof global.PointerEvent === "function") return;
        onStart(e);
      },
      { capture: true, passive: false }
    );
    container.addEventListener(
      "mousedown",
      function (e) {
        if (typeof global.PointerEvent === "function") return;
        onStart(e);
      },
      true
    );
  }

  function prime(root) {
    root?.querySelectorAll(".ms-lf-slide").forEach(function (slide) {
      if (slide.classList.contains("is-done")) return;
      const attempt = function (n) {
        const m = metrics(slide, n);
        if (m && m.max > 0) {
          setX(slide, 0, m);
          return;
        }
        if (n < 8) {
          global.requestAnimationFrame(function () {
            attempt(n + 1);
          });
        }
      };
      attempt(0);
    });
  }

  global.MsLfSlide = {
    COMPLETE_RATIO,
    RELEASE_COMMIT_RATIO,
    END_TOLERANCE_PX,
    RETURN_MS,
    COMPLETE_MS,
    metrics,
    readX,
    setX,
    clearInline,
    completes,
    resetSlide,
    completeSlide,
    beginDrag,
    bindTrack,
    bindContainer,
    prime,
  };
})(window);
