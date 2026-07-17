/**
 * Store — digital product actions (subscriptions live on Pricing).
 */
(function () {
  function bindBuys() {
    document.querySelectorAll("button.ms-store-buy[data-product]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-product") || "this product";
        window.StudioToast?.info?.("Coming soon - " + name);
      });
    });
  }

  function boot() {
    bindBuys();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
