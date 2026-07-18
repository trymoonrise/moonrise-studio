/**
 * Settings — Download / install app section.
 */
(function () {
  if (document.body?.dataset?.page !== "settings") return;

  function installApi() {
    return window.MoonriseInstall || null;
  }

  function statusCopy(install) {
    if (install.canPrompt()) return "Ready to install on this device";
    if (install.isIos()) return "Add Moonrise to your Home Screen";
    if (install.isDesktop()) return "Install from your browser menu";
    return "Install from your browser menu";
  }

  function syncInstallUi() {
    const install = installApi();
    const panel = document.getElementById("set-install-panel");
    const done = document.getElementById("set-install-done");
    const btn = document.getElementById("set-install-btn");
    const instructions = document.getElementById("set-install-instructions");
    const status = document.getElementById("set-install-status");
    const icon = document.getElementById("set-install-icon");
    const title = document.getElementById("set-install-title");

    if (!panel || !install) return;

    const iconUrl = install.getIconUrl();
    if (icon && iconUrl) {
      icon.src = iconUrl;
      icon.alt = install.appTitle + " app icon";
    }
    if (title) title.textContent = install.appTitle || "Moonrise";

    if (install.isStandalone()) {
      panel.hidden = true;
      if (done) done.hidden = false;
      return;
    }

    panel.hidden = false;
    if (done) done.hidden = true;

    if (instructions) {
      instructions.innerHTML = install.getInstructionsHtml();
    }
    if (status) status.textContent = statusCopy(install);

    const canPrompt = install.canPrompt();
    if (btn) {
      btn.hidden = !canPrompt;
      btn.disabled = false;
      btn.textContent = install.isDesktop() ? "Install app" : "Install Moonrise";
    }
  }

  function bindInstallUi() {
    document.getElementById("set-install-btn")?.addEventListener("click", async () => {
      const install = installApi();
      const btn = document.getElementById("set-install-btn");
      if (!install?.canPrompt()) return;
      if (btn) btn.disabled = true;
      await install.promptInstall();
      syncInstallUi();
    });

    window.addEventListener("ms:install-state-changed", syncInstallUi);
  }

  function init() {
    bindInstallUi();
    syncInstallUi();
    window.setTimeout(syncInstallUi, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
