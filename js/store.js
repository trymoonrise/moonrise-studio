/**
 * Store — digital product actions (MVP+ includes Moonrise Store items).
 */
(function () {
  function isExternalProduct(article) {
    return !!article.querySelector(".ms-store-amount.is-link");
  }

  async function loadMvpPlus() {
    try {
      const session = await window.StudioAuth?.getSession?.();
      const userId = session?.user?.id;
      if (!userId || !window.supabase) return false;
      const { data, error } = await window.supabase
        .from("profiles")
        .select("mvp_plus")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return !!data?.mvp_plus;
    } catch (_) {
      return false;
    }
  }

  function applyMvpStoreUi(mvpPlus) {
    const note = document.getElementById("store-mvp-note");
    if (note) note.hidden = !!mvpPlus;

    document.querySelectorAll(".ms-store-product").forEach((article) => {
      if (isExternalProduct(article)) return;

      const price = article.querySelector(".ms-store-amount");
      const btn = article.querySelector(".ms-store-buy");
      article.classList.toggle("is-subscribed", mvpPlus);

      if (!mvpPlus) return;

      if (price) price.textContent = "Included";
      if (btn && btn.tagName === "BUTTON") {
        btn.textContent = "Included with MVP+";
        btn.disabled = true;
      }
    });
  }

  function bindBuys() {
    document.querySelectorAll("button.ms-store-buy[data-product]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const name = btn.getAttribute("data-product") || "this product";
        window.StudioToast?.info?.("Coming soon — " + name);
      });
    });
  }

  async function boot() {
    bindBuys();
    const mvpPlus = await loadMvpPlus();
    applyMvpStoreUi(mvpPlus);
  }

  if (document.body.dataset.msAuthFired === "1") boot();
  else document.addEventListener("ms:auth-ready", boot, { once: true });
})();
