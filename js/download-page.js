/**
 * Download page - install / add to home screen instructions.
 */
(function () {
  if (document.body?.dataset?.page !== "download") return;

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
    const panel = document.getElementById("download-install-panel");
    const done = document.getElementById("download-install-done");
    const btn = document.getElementById("download-install-btn");
    const instructions = document.getElementById("download-install-instructions");
    const status = document.getElementById("download-install-status");
    const icon = document.getElementById("download-install-icon");
    const title = document.getElementById("download-install-title");
    const brandIcon = document.getElementById("download-icon");
    const brandTitle = document.getElementById("download-title");

    if (!panel || !install) return;

    const iconUrl = install.getIconUrl();
    const appTitle = install.appTitle || "Moonrise";

    if (icon && iconUrl) {
      icon.src = iconUrl;
      icon.alt = appTitle + " app icon";
    }
    if (brandIcon && iconUrl) {
      brandIcon.src = iconUrl;
      brandIcon.alt = "";
    }
    if (title) title.textContent = appTitle;
    if (brandTitle) brandTitle.textContent = appTitle;

    if (install.isStandalone()) {
      panel.hidden = true;
      if (done) done.hidden = false;
      return;
    }

    panel.hidden = false;
    if (done) done.hidden = true;

    if (instructions) instructions.innerHTML = install.getInstructionsHtml();
    if (status) status.textContent = statusCopy(install);

    const canPrompt = install.canPrompt();
    if (btn) {
      btn.hidden = !canPrompt;
      btn.disabled = false;
      btn.textContent = install.isDesktop() ? "Install app" : "Install Moonrise";
    }
  }

  function bindInstallUi() {
    document.getElementById("download-install-btn")?.addEventListener("click", async () => {
      const install = installApi();
      const btn = document.getElementById("download-install-btn");
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
