/**
 * Full-screen bloom menu toggle (homepage + public pages).
 */
(function () {
  const orb = document.getElementById("ms-home-orb");
  const bloom = document.getElementById("ms-home-bloom");
  if (!orb || !bloom) return;

  function setOpen(on) {
    bloom.classList.toggle("is-open", on);
    orb.classList.toggle("is-open", on);
    orb.setAttribute("aria-expanded", String(on));
    orb.setAttribute("aria-label", on ? "Close menu" : "Open menu");
    bloom.setAttribute("aria-hidden", String(!on));
    document.body.classList.toggle("ms-home-menu-open", on);
  }

  orb.addEventListener("click", () => setOpen(!bloom.classList.contains("is-open")));
  bloom.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bloom.classList.contains("is-open")) setOpen(false);
  });
})();
