/**
 * Shared slide-to-complete physics (testslider.html + Business Finder).
 * Thumb follows pointer 1:1; completes only at the far end (4px tolerance).
 */
(function (global) {
  const END_TOLERANCE_PX = 4;
  const RETURN_MS = 280;
  const COMPLETE_MS = 220;

  function slidePad(track) {
    if (!track) return 4;
    const style = global.getComputedStyle(track);
    return Number.parseFloat(style.paddingLeft) || 4;
  }

  function thumbWidth(thumb) {
    if (!thumb) return 44;
    const w = thumb.getBoundingClientRect().width || thumb.offsetWidth || 0;
    return w > 8 ? w : 44;
  }

  function metrics(slide, pass) {
    const track = slide?.querySelector(".ms-lf-slide-track");
    const thumb = slide?.querySelector(".ms-lf-slide-thumb");
    if (!track || !thumb) return null;
    const pad = slidePad(track);
    void track.offsetWidth;
    void thumb.offsetWidth;
    void slide?.offsetWidth;
    const thumbW = thumbWidth(thumb);
    const rect = track.getBoundingClientRect();
    const trackW = rect.width || track.offsetWidth || slide?.offsetWidth || 0;
    const max = Math.max(0, trackW - pad * 2 - thumbW);
    if (max <= 0 && (pass || 0) < 6) {
      return metrics(slide, (pass || 0) + 1);
    }
    return { track, thumb, pad, thumbW, max };
  }

  function readX(slide) {
    const raw = slide?.style?.getPropertyValue("--ms-lf-slide-x");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setX(slide, x, m) {
    if (!slide || !m) return 0;
    const max = m.max;
    const clamped = Math.max(0, Math.min(max, x));
    slide.style.setProperty("--ms-lf-slide-x", clamped + "px");
    slide.style.setProperty("--ms-lf-slide-max", max + "px");
    slide.style.setProperty("--ms-lf-slide-fill", m.pad + clamped + m.thumbW + "px");
    return clamped;
  }

  function clearInline(slide) {
    if (!slide) return;
    slide.style.removeProperty("--ms-lf-slide-x");
    slide.style.removeProperty("--ms-lf-slide-max");
    slide.style.removeProperty("--ms-lf-slide-fill");
  }

  function completes(current, max) {
    return max > 0 && current >= max - END_TOLERANCE_PX;
  }

  function xFromPointer(track, clientX, max, grabOffsetX) {
    const thumb = track.querySelector(".ms-lf-slide-thumb");
    if (!thumb || max <= 0) return 0;
    const pad = slidePad(track);
    const thumbW = thumbWidth(thumb);
    const rect = track.getBoundingClientRect();
    const raw = clientX - grabOffsetX - rect.left - pad - thumbW / 2;
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
    setX(slide, m.max, m);
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

    const m = metrics(slide);
    if (!m || m.max <= 8) return false;
    const { track, thumb, max } = m;

    e.preventDefault();

    const startX = e.clientX ?? 0;
    const onThumb = !!e.target.closest(".ms-lf-slide-thumb");
    const thumbRect = thumb.getBoundingClientRect();
    const grabOffsetX = onThumb
      ? startX - (thumbRect.left + thumbRect.width / 2)
      : m.thumbW / 2;
    const startLeft = onThumb ? readX(slide) : xFromPointer(track, startX, max, grabOffsetX);
    let current = Math.max(0, Math.min(max, startLeft));
    let moved = current > 2;
    let finished = false;
    const pointerId = e.pointerId ?? 1;
    const usePointer = e.pointerId != null;

    slide.dataset.msLfSlideDragging = "1";
    slide.classList.add("is-dragging");
    global.document.body.classList.add("ms-lf-slide-dragging");
    setX(slide, current, m);

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
      current = setX(slide, current, m);
      if (forceComplete === true || (moved && completes(current, max))) {
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
      current = setX(slide, xFromPointer(track, cx, max, grabOffsetX), m);
      if (moved && completes(current, max)) {
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
      e.preventDefault();
      beginDrag(e, slide, hooks);
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
