/**

 * Full donation leaderboard page.

 */

(function () {

  const LB = window.MoonriseDonateLeaderboard;

  if (!LB) return;



  function refs() {

    return {

      podiumEl: document.getElementById("leaderboard-podium"),

      podiumEmptyEl: document.getElementById("leaderboard-podium-empty"),

      listEl: document.getElementById("leaderboard-full-list"),

      countEl: document.getElementById("leaderboard-stat-count"),

      totalEl: document.getElementById("leaderboard-stat-total"),

    };

  }



  function setError(msg) {

    const el = document.getElementById("leaderboard-error");

    if (!el) return;

    el.hidden = !msg;

    el.textContent = msg || "";

  }



  async function boot() {

    try {

      await window.StudioAuth?.requireAuth?.();

    } catch (_) {

      location.href = "login.html?next=leaderboard.html";

      return;

    }



    const ui = refs();

    LB.renderFullPageLoading(ui);

    setError("");



    try {

      const entries = await LB.fetchEntries(100);

      LB.renderFullPage(ui, entries, { showPlaceholder: true });

    } catch (e) {

      if (ui.podiumEl) {

        ui.podiumEl.hidden = true;

        ui.podiumEl.innerHTML = "";

      }

      if (ui.podiumEmptyEl) ui.podiumEmptyEl.hidden = true;

      LB.clearLoading(ui.listEl);

      if (ui.listEl) {

        ui.listEl.innerHTML =

          '<li class="ms-lb-empty">Leaderboard unavailable right now. Try again in a moment.</li>';

      }

      if (ui.countEl) ui.countEl.textContent = "—";

      if (ui.totalEl) ui.totalEl.textContent = "—";

      setError(e.message || "Could not load leaderboard");

    }

  }



  if (document.body.dataset.msAuthFired === "1") boot();

  else document.addEventListener("ms:auth-ready", boot, { once: true });

})();

