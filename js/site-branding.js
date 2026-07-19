/**
 * Shared favicon, SEO, social preview, and structured data for Moonrise Studio.
 * Values come from js/config.js (SITE_CONFIG).
 */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const siteUrl = String(cfg.siteUrl || "https://trymoonrise.com").replace(/\/$/, "");
  const siteName = String(cfg.siteName || cfg.companyName || "Moonrise Studio").trim();
  const logoPath = String(cfg.brandLogoUrl || "doc/MoonriseLogo.png").trim();
  const embedPath = String(cfg.embedImageUrl || "doc/embed.png").trim();
  const locale = String(cfg.locale || "en_US").trim();
  const supportEmail = String(cfg.supportEmail || "trymoonrise@gmail.com").trim();

  const PUBLIC_PAGES = {
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

  function absoluteUrl(pathOrUrl) {
    const raw = String(pathOrUrl || "").trim();
    if (!raw) return siteUrl + "/";
    if (/^https?:\/\//i.test(raw)) return raw.split("#")[0];
    if (raw.startsWith("//")) return (location.protocol || "https:") + raw;
    const base = siteUrl.replace(/\/$/, "");
    const path = raw.startsWith("/") ? raw : "/" + raw.replace(/^\.\//, "");
    return base + path;
  }

  function currentFile() {
    if (typeof location === "undefined") return "index.html";
    return location.pathname.split("/").pop() || "index.html";
  }

  function canonicalUrl() {
    if (typeof location === "undefined") return siteUrl + "/";
    const file = currentFile();
    if (file === "index.html" || file === "") return siteUrl + "/";
    return siteUrl + "/" + file;
  }

  function isPublicPage() {
    return !!PUBLIC_PAGES[currentFile()];
  }

  const pageTitle = String(document.title || siteName).trim();
  const pageDesc =
    document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
    String(cfg.siteDescription || "").trim() ||
    "Moonrise is an AI-powered platform that lets you create professional websites in minutes for local business owners, creators, and more.";

  const logoUrl = absoluteUrl(logoPath);
  const embedUrl = absoluteUrl(embedPath);
  const canonical = canonicalUrl();
  const page = document.body?.dataset?.page || "";
  const keywords = String(cfg.seoKeywords || "").trim();

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

  function injectJsonLd(id, data) {
    if (!data) return;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  upsertLink("icon", logoUrl, { type: "image/png" });
  upsertLink("shortcut icon", logoUrl, { type: "image/png" });
  upsertLink("apple-touch-icon", logoUrl);
  upsertLink("canonical", canonical);

  upsertMeta("name", "description", pageDesc);
  if (keywords) upsertMeta("name", "keywords", keywords);
  upsertMeta("name", "author", siteName);
  upsertMeta("name", "robots", isPublicPage() ? "index,follow,max-image-preview:large" : "noindex,nofollow");
  upsertMeta("name", "googlebot", isPublicPage() ? "index,follow" : "noindex,nofollow");
  upsertMeta("name", "theme-color", "#2563eb");

  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:title", pageTitle);
  upsertMeta("property", "og:description", pageDesc);
  upsertMeta("property", "og:image", embedUrl);
  upsertMeta("property", "og:image:alt", siteName + " — Build websites. Get paid.");
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:locale", locale);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", pageTitle);
  upsertMeta("name", "twitter:description", pageDesc);
  upsertMeta("name", "twitter:image", embedUrl);
  if (cfg.twitterSite) upsertMeta("name", "twitter:site", String(cfg.twitterSite));

  if (isPublicPage()) {
    upsertLink("sitemap", siteUrl + "/sitemap.xml", { type: "application/xml", title: "Sitemap" });
  }

  const sameAs = [cfg.discordUrl, cfg.telegramUrl].filter(Boolean).map(String);
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl + "/#organization",
    name: siteName,
    url: siteUrl + "/",
    logo: logoUrl,
    email: supportEmail,
    description: String(cfg.siteDescription || pageDesc).trim(),
    sameAs: sameAs.length ? sameAs : undefined,
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": page === "contact" ? "ContactPage" : "WebPage",
    "@id": canonical + "#webpage",
    url: canonical,
    name: pageTitle,
    description: pageDesc,
    isPartOf: { "@id": siteUrl + "/#website" },
    about: { "@id": siteUrl + "/#organization" },
    inLanguage: "en-US",
  };

  const graph = [organization, webPage];

  if (page === "home" || currentFile() === "index.html" || currentFile() === "") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": siteUrl + "/#website",
      url: siteUrl + "/",
      name: siteName,
      description: String(cfg.siteDescription || pageDesc).trim(),
      publisher: { "@id": siteUrl + "/#organization" },
      inLanguage: "en-US",
    });

    graph.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": siteUrl + "/#software",
      name: siteName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free to build and preview websites. Clients pay when they unlock the live site.",
      },
      description:
        "AI-powered website builder for creators who sell sites to local businesses. Find leads, build fast, and earn when clients go live.",
      url: siteUrl + "/",
      image: embedUrl,
      publisher: { "@id": siteUrl + "/#organization" },
    });

    const faqItems = Array.isArray(cfg.seoFaq) ? cfg.seoFaq : [];
    if (faqItems.length) {
      graph.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": siteUrl + "/#faq",
        mainEntity: faqItems.map(function (item) {
          return {
            "@type": "Question",
            name: String(item.q || item.question || "").trim(),
            acceptedAnswer: {
              "@type": "Answer",
              text: String(item.a || item.answer || "").trim(),
            },
          };
        }),
      });
    }
  }

  injectJsonLd("ms-jsonld-graph", { "@context": "https://schema.org", "@graph": graph });
})();
