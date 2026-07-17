(function () {
  if (window.__galleryLoop) return;
  window.__galleryLoop = true;

  const params = new URLSearchParams(location.search);
  const inGallery = params.has('gallery') || window.parent !== window;
  if (!inGallery) return;

  document.documentElement.classList.add('is-gallery-embed');

  const RESTART_MS = 7500;
  const RELOAD_MS = 22000;
  let startedAt = Date.now();

  function restartAnimations(root) {
    (root || document).querySelectorAll('*').forEach((el) => {
      const { animationName } = getComputedStyle(el);
      if (!animationName || animationName === 'none') return;
      const animation = el.style.animation;
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = animation;
    });
  }

  function ensureVideoLoops() {
    document.querySelectorAll('video').forEach((video) => {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if (video.paused) video.play().catch(() => {});
    });
  }

  function startScrollLoop() {
    const maxScroll = () =>
      Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        0
      );

    let max = maxScroll();
    if (max < 24) return;

    const period = 7000;
    let raf = 0;

    function frame(now) {
      max = maxScroll();
      if (max < 24) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const t = (now % (period * 2)) / period;
      const p = t <= 1 ? t : 2 - t;
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      window.scrollTo(0, eased * max);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    addEventListener('resize', () => {
      max = maxScroll();
    }, { passive: true });
  }

  function tick() {
    restartAnimations();
    ensureVideoLoops();
    document.dispatchEvent(new CustomEvent('gallery-loop'));
  }

  function maybeReload() {
    if (Date.now() - startedAt < RELOAD_MS) return;
    startedAt = Date.now();
    const url = new URL(location.href);
    url.searchParams.set('gallery', '1');
    url.searchParams.set('r', String(Date.now()));
    location.replace(url);
  }

  function init() {
    tick();
    startScrollLoop();
    setInterval(tick, RESTART_MS);
    setInterval(maybeReload, RELOAD_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
