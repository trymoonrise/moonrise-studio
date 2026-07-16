/**
 * Store — product purchase actions.
 */
(function () {
  function scrollToHash() {
    const hash = String(location.hash || "").replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("is-spotlight");
      window.setTimeout(() => el.classList.remove("is-spotlight"), 1800);
    });
  }

  document.querySelectorAll("button.ms-store-buy[data-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-product") || "this product";
      btn.disabled = true;
      try {
        window.StudioToast?.success?.(
          "Thanks — reach us via Help or Telegram to complete your " + name + " purchase."
        );
      } finally {
        btn.disabled = false;
      }
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scrollToHash);
  } else {
    scrollToHash();
  }
})();
