/**
 * Shared favicon + social preview tags for Moonrise Studio pages.
 * Values come from js/config.js (SITE_CONFIG).
 */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const logo =
    String(cfg.brandLogoUrl || "").trim() ||
    "https://github.com/trymoonrise/dashboard/raw/main/doc/MoonriseLogo.png";
  const embed =
    String(cfg.embedImageUrl || "").trim() ||
    "https://github.com/trymoonrise/dashboard/raw/main/doc/embed.png";
  const siteName = String(cfg.companyName || "Moonrise Studio").trim();
  const pageTitle = String(document.title || siteName).trim();
  const pageDesc =
    document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    "Build websites. Get paid. Moonrise Studio helps business owners and creators launch premium sites.";
  const canonical = String(window.location.href || "").split("#")[0];

  function upsertLink(rel, href, extra) {
    if (!href) return;
    let el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        if (value != null) el.setAttribute(key, value);
      });
    }
  }

  function upsertMeta(attr, key, content) {
    if (!content) return;
    let el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  upsertLink("icon", logo, { type: "image/png" });
  upsertLink("shortcut icon", logo, { type: "image/png" });
  upsertLink("apple-touch-icon", logo);

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:title", pageTitle);
  upsertMeta("property", "og:description", pageDesc);
  upsertMeta("property", "og:image", embed);
  upsertMeta("property", "og:url", canonical);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", pageTitle);
  upsertMeta("name", "twitter:description", pageDesc);
  upsertMeta("name", "twitter:image", embed);
})();
