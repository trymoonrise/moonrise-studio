/**
 * Runs synchronously in <head> on protected pages.
 * Hides the page until StudioAuth confirms the session, and redirects immediately
 * when there is no stored session (prevents a flash of private UI).
 */
(function () {
  var PUBLIC = {
    "": 1,
    "index.html": 1,
    "login.html": 1,
    "apply.html": 1,
    "orders.html": 1,
    "contact.html": 1,
    "privacy.html": 1,
    "terms.html": 1,
    "download.html": 1,
  };

  var file = location.pathname.split("/").pop() || "index.html";
  if (PUBLIC[file]) return;

  document.documentElement.classList.add("ms-auth-gating");

  var style = document.createElement("style");
  style.textContent = "html.ms-auth-gating body{visibility:hidden!important}";
  document.head.appendChild(style);

  function redirectToLogin() {
    var next = encodeURIComponent(file + location.search + location.hash);
    location.replace("login.html?next=" + next);
  }

  function hasStoredSession() {
    try {
      var raw = localStorage.getItem("moonrise-studio-auth");
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      var token =
        parsed?.access_token ||
        parsed?.session?.access_token ||
        parsed?.currentSession?.access_token;
      if (!token) return false;
      var exp =
        parsed?.expires_at ||
        parsed?.session?.expires_at ||
        parsed?.currentSession?.expires_at;
      if (exp && Number(exp) * 1000 < Date.now() - 60000) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  if (!hasStoredSession()) {
    redirectToLogin();
    return;
  }

  window.__msReleaseAuthGate = function () {
    document.documentElement.classList.remove("ms-auth-gating");
    document.documentElement.classList.add("ms-auth-ready");
  };
})();
