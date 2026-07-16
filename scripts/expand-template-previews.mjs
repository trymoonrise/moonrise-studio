/**
 * Expand stub template previews (08+) to full multi-section demos.
 * Also upgrades card-preview mode on all previews for animated panning.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "template-previews");

const CARD_PREVIEW_CSS = `
    html.is-card-preview,
    html.is-card-preview body {
      overflow: hidden;
    }
    html.is-card-preview .toggles {
      display: none;
    }
    html.is-card-preview .nav {
      position: relative;
    }
    html.is-card-preview .hero {
      min-height: 88vh;
    }
    @media (prefers-reduced-motion: no-preference) {
      html.is-card-preview body {
        animation: ms-preview-pan 18s ease-in-out infinite alternate;
      }
      .hero-content h1 {
        animation: ms-preview-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .gallery figure {
        animation: ms-preview-float 6s ease-in-out infinite alternate;
      }
      .gallery figure:nth-child(2) { animation-delay: 0.4s; }
      .gallery figure:nth-child(3) { animation-delay: 0.8s; }
      .gallery figure:nth-child(4) { animation-delay: 1.2s; }
      .gallery figure:nth-child(5) { animation-delay: 1.6s; }
      .gallery figure:nth-child(6) { animation-delay: 2s; }
    }
    @keyframes ms-preview-pan {
      from { transform: translateY(0); }
      to { transform: translateY(-52%); }
    }
    @keyframes ms-preview-rise {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ms-preview-float {
      from { transform: translateY(0); }
      to { transform: translateY(-4px); }
    }`;

const THEMES = {
  "08-local-service": {
    title: "Local",
    brand: "Local",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    bodyFont: '"DM Sans", sans-serif',
    headingFont: '"DM Sans", sans-serif',
    vars: {
      bg: "#0f766e",
      surface: "#134e4a",
      text: "#f8fafc",
      muted: "rgba(248,250,252,0.78)",
      accent: "#14b8a6",
      accent2: "#5eead4",
      line: "rgba(255,255,255,0.14)",
    },
    heroBg:
      "radial-gradient(ellipse 80% 60% at 80% 20%, rgba(20,184,166,.35), transparent), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(94,234,212,.14), transparent), var(--bg)",
    btnText: "#042f2e",
    sliderBg: "#115e59",
    headline: "Reliable work nearby.",
    subhead: "Clear quotes and fast booking for neighbors who need help today.",
    primaryCta: "Call now",
    ghostCta: "See services",
    about: "We show up on time, explain the work, and leave the job cleaner than we found it.",
    gallery: ["#0f766e,#134e4a", "#14b8a6,#0f766e", "#5eead4,#134e4a", "#134e4a,#14b8a6", "#042f2e,#0f766e", "#5eead4,#14b8a6"],
    services: [
      ["Emergency repairs", "Fast response when something breaks at the worst time."],
      ["Installations", "Clean installs with upfront pricing and no surprises."],
      ["Maintenance", "Seasonal tune-ups that prevent costly failures later."],
    ],
  },
  "09-cafe": {
    title: "Hearth",
    brand: "Hearth",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />',
    bodyFont: '"DM Sans", sans-serif',
    headingFont: '"Fraunces", serif',
    vars: {
      bg: "#fff8f1",
      surface: "#ffffff",
      text: "#3f2a1d",
      muted: "#9a3412",
      accent: "#9a3412",
      accent2: "#fdba74",
      line: "#fed7aa",
    },
    heroBg:
      "radial-gradient(circle at top left, rgba(253,186,116,.55), transparent 55%), radial-gradient(circle at 90% 20%, rgba(154,52,18,.08), transparent 40%), var(--bg)",
    btnText: "#fff8f1",
    sliderBg: "#fdba74",
    headline: "Warm plates daily.",
    subhead: "Fresh flavors, seasonal ingredients, and a room that feels like home.",
    primaryCta: "Reserve a table",
    ghostCta: "View menu",
    about: "From morning espresso to late dinner, every plate is made with care and local produce.",
    gallery: ["#fdba74,#9a3412", "#fff8f1,#fdba74", "#9a3412,#3f2a1d", "#fed7aa,#fdba74", "#3f2a1d,#9a3412", "#fff8f1,#fed7aa"],
    services: [
      ["House favorites", "Seasonal plates and drinks crafted daily."],
      ["Private events", "Intimate gatherings with a custom tasting menu."],
      ["Takeaway", "Order ahead and pick up on your schedule."],
    ],
  },
  "10-professional": {
    title: "Trust",
    brand: "Trust",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />',
    bodyFont: '"Inter", sans-serif',
    headingFont: '"Libre Baskerville", serif',
    vars: {
      bg: "#111827",
      surface: "#1f2937",
      text: "#f8fafc",
      muted: "rgba(248,250,252,0.72)",
      accent: "#1d4ed8",
      accent2: "#93c5fd",
      line: "rgba(255,255,255,0.1)",
    },
    heroBg:
      "linear-gradient(160deg, rgba(29,78,216,.28), transparent 45%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(147,197,253,.12), transparent), var(--bg)",
    btnText: "#f8fafc",
    sliderBg: "#374151",
    headline: "Care you can trust.",
    subhead: "Clear guidance and a polished experience from first consult to follow-up.",
    primaryCta: "Book consult",
    ghostCta: "Our approach",
    about: "We combine clinical rigor with a calm, human experience clients remember.",
    gallery: ["#1d4ed8,#111827", "#1f2937,#93c5fd", "#111827,#1d4ed8", "#374151,#93c5fd", "#1f2937,#111827", "#93c5fd,#1d4ed8"],
    services: [
      ["Consultations", "Thoughtful intake and a plan you can understand."],
      ["Ongoing care", "Consistent follow-through with clear communication."],
      ["Office visits", "A professional space designed to put clients at ease."],
    ],
  },
  "11-minimal": {
    title: "Pulse",
    brand: "Pulse",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    bodyFont: '"Inter", sans-serif',
    headingFont: '"Inter", sans-serif',
    vars: {
      bg: "#ecfeff",
      surface: "#ffffff",
      text: "#083344",
      muted: "#0e7490",
      accent: "#0891b2",
      accent2: "#a5f3fc",
      line: "#a5f3fc",
    },
    heroBg:
      "linear-gradient(180deg, #ecfeff 0%, #cffafe 100%), radial-gradient(circle at 80% 10%, rgba(8,145,178,.12), transparent 50%)",
    btnText: "#ffffff",
    sliderBg: "#a5f3fc",
    headline: "Simple and direct.",
    subhead: "One clear page. One clear next step. No clutter between you and action.",
    primaryCta: "Call us",
    ghostCta: "Learn more",
    about: "We strip away noise so visitors know exactly who you are and what to do next.",
    gallery: ["#0891b2,#ecfeff", "#cffafe,#0891b2", "#083344,#a5f3fc", "#ecfeff,#0e7490", "#0891b2,#cffafe", "#a5f3fc,#083344"],
    services: [
      ["Contact focus", "Phone, form, and location front and center."],
      ["Fast load", "Lightweight pages that feel instant on mobile."],
      ["Clear offer", "One headline, one promise, one conversion path."],
    ],
  },
  "12-sage-stone": {
    title: "Sage",
    brand: "Sage",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    bodyFont: '"DM Sans", sans-serif',
    headingFont: '"DM Sans", sans-serif',
    vars: {
      bg: "#f4f7f4",
      surface: "#ffffff",
      text: "#1c2b1e",
      muted: "#5f7263",
      accent: "#4d7c5a",
      accent2: "#dce8df",
      line: "#c9d8cc",
    },
    heroBg:
      "linear-gradient(145deg, rgba(220,232,223,.95) 0%, rgba(244,247,244,1) 55%), radial-gradient(circle at 85% 15%, rgba(77,124,90,.12), transparent 45%)",
    btnText: "#ffffff",
    sliderBg: "#dce8df",
    headline: "Quiet confidence.",
    subhead: "Soft sage tones for wellness, care, and grounded local brands.",
    primaryCta: "Book visit",
    ghostCta: "Our services",
    about: "Calm design that feels intentional — built for businesses people trust with their wellbeing.",
    gallery: ["#4d7c5a,#dce8df", "#f4f7f4,#4d7c5a", "#1c2b1e,#dce8df", "#dce8df,#5f7263", "#4d7c5a,#f4f7f4", "#5f7263,#4d7c5a"],
    services: [
      ["Wellness visits", "A soothing experience from booking to follow-up."],
      ["Local roots", "Proudly serving neighbors with thoughtful care."],
      ["Easy booking", "Simple scheduling without phone tag."],
    ],
  },
  "13-indigo-sand": {
    title: "Dune",
    brand: "Dune",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />',
    bodyFont: '"DM Sans", sans-serif',
    headingFont: '"Outfit", sans-serif',
    vars: {
      bg: "#312e81",
      surface: "#3730a3",
      text: "#f8fafc",
      muted: "rgba(248,250,252,0.78)",
      accent: "#4338ca",
      accent2: "#c4b5fd",
      line: "rgba(255,255,255,0.14)",
    },
    heroBg:
      "linear-gradient(145deg, rgba(67,56,202,.45) 0%, rgba(49,46,129,1) 55%), radial-gradient(circle at 15% 85%, rgba(196,181,253,.18), transparent 45%)",
    btnText: "#f8fafc",
    sliderBg: "#4338ca",
    headline: "Bold and clear.",
    subhead: "Indigo energy with warm sand contrast for modern product brands.",
    primaryCta: "Get started",
    ghostCta: "See work",
    about: "Strong hierarchy, confident color, and motion that feels premium without noise.",
    gallery: ["#4338ca,#312e81", "#c4b5fd,#4338ca", "#312e81,#c4b5fd", "#3730a3,#c4b5fd", "#4338ca,#3730a3", "#c4b5fd,#312e81"],
    services: [
      ["Brand launches", "Positioning and pages that feel unmistakably yours."],
      ["Product sites", "Clear storytelling with sharp visual rhythm."],
      ["Campaign landers", "Fast builds tuned for conversion."],
    ],
  },
  "14-rose-graphite": {
    title: "Rose",
    brand: "Rose",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet" />',
    bodyFont: '"Manrope", sans-serif',
    headingFont: '"Cormorant Garamond", serif',
    vars: {
      bg: "#1f1720",
      surface: "#3f2a33",
      text: "#faf7f8",
      muted: "rgba(250,247,248,0.72)",
      accent: "#be123c",
      accent2: "#fda4af",
      line: "rgba(255,255,255,0.1)",
    },
    heroBg:
      "linear-gradient(150deg, rgba(190,18,60,.32), transparent 42%), radial-gradient(circle at 85% 20%, rgba(253,164,175,.14), transparent 40%), var(--bg)",
    btnText: "#faf7f8",
    sliderBg: "#3f2a33",
    headline: "Polished presence.",
    subhead: "Rose accents on deep graphite for boutique studios and luxury services.",
    primaryCta: "Contact",
    ghostCta: "View lookbook",
    about: "Editorial typography and rich contrast that feels intimate and high-end.",
    gallery: ["#be123c,#1f1720", "#fda4af,#3f2a33", "#1f1720,#be123c", "#3f2a33,#fda4af", "#be123c,#3f2a33", "#fda4af,#1f1720"],
    services: [
      ["Lookbook layouts", "Photography-forward grids with editorial pacing."],
      ["Boutique services", "Pricing and booking flows that feel personal."],
      ["Brand polish", "Refined palettes with confident rose highlights."],
    ],
  },
  "15-forest-cream": {
    title: "Grove",
    brand: "Grove",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    bodyFont: '"DM Sans", sans-serif',
    headingFont: '"DM Sans", sans-serif',
    vars: {
      bg: "#14532d",
      surface: "#166534",
      text: "#f8fafc",
      muted: "rgba(248,250,252,0.78)",
      accent: "#166534",
      accent2: "#f8f5ef",
      line: "rgba(255,255,255,0.14)",
    },
    heroBg:
      "linear-gradient(145deg, rgba(22,101,52,.9) 0%, rgba(20,83,45,1) 55%), radial-gradient(circle at 90% 10%, rgba(248,245,239,.12), transparent 45%)",
    btnText: "#f8fafc",
    sliderBg: "#166534",
    headline: "Grounded and fresh.",
    subhead: "Forest greens on cream for outdoor, landscaping, and earthy local brands.",
    primaryCta: "Request quote",
    ghostCta: "Our projects",
    about: "Natural palettes and sturdy layout rhythms that feel dependable outdoors.",
    gallery: ["#166534,#14532d", "#f8f5ef,#166534", "#14532d,#f8f5ef", "#166534,#f8f5ef", "#14532d,#166534", "#f8f5ef,#14532d"],
    services: [
      ["Landscape design", "Plans that balance beauty with long-term maintenance."],
      ["Seasonal care", "Reliable crews and clear scheduling windows."],
      ["Outdoor builds", "Hardscaping and installs done right the first time."],
    ],
  },
  "16-sky-charcoal": {
    title: "Sky",
    brand: "Sky",
    fonts:
      '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />',
    bodyFont: '"Space Grotesk", sans-serif',
    headingFont: '"Space Grotesk", sans-serif',
    vars: {
      bg: "#0f172a",
      surface: "#1e293b",
      text: "#f8fafc",
      muted: "rgba(248,250,252,0.74)",
      accent: "#0284c7",
      accent2: "#7dd3fc",
      line: "rgba(255,255,255,0.1)",
    },
    heroBg:
      "linear-gradient(145deg, rgba(2,132,199,.35), transparent 42%), radial-gradient(circle at 12% 88%, rgba(125,211,252,.12), transparent 40%), var(--bg)",
    btnText: "#f8fafc",
    sliderBg: "#1e293b",
    headline: "Bright and sharp.",
    subhead: "Sky blue on charcoal structure for tech, SaaS, and modern service brands.",
    primaryCta: "Talk to us",
    ghostCta: "Explore features",
    about: "Crisp grids, luminous accents, and motion that feels engineered — not decorative.",
    gallery: ["#0284c7,#0f172a", "#7dd3fc,#1e293b", "#0f172a,#0284c7", "#1e293b,#7dd3fc", "#0284c7,#1e293b", "#7dd3fc,#0f172a"],
    services: [
      ["Product storytelling", "Feature sections with clean hierarchy and proof."],
      ["Support flows", "Help visitors find answers without hunting."],
      ["Launch pages", "Fast, credible pages for campaigns and releases."],
    ],
  },
};

function galleryCss(grads) {
  return grads
    .map((pair, i) => {
      const [a, b] = pair.split(",");
      return `.gallery figure:nth-child(${i + 1}) { background: linear-gradient(135deg, ${a}, ${b}); }`;
    })
    .join("\n    ");
}

function buildHtml(theme) {
  const v = theme.vars;
  const services = theme.services
    .map(([title, copy]) => `<div class="service"><h3>${title}</h3><p>${copy}</p></div>`)
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${theme.title} — Studio</title>
  <script>
    if (new URLSearchParams(location.search).get("preview") === "card") {
      document.documentElement.classList.add("is-card-preview");
    }
  </script>
  ${theme.fonts}
  <style>
    :root {
      --bg: ${v.bg};
      --surface: ${v.surface};
      --text: ${v.text};
      --muted: ${v.muted};
      --accent: ${v.accent};
      --accent-2: ${v.accent2};
      --line: ${v.line};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: ${theme.bodyFont}; background: var(--bg); color: var(--text); line-height: 1.6; }
    h1, h2, h3 { font-family: ${theme.headingFont}; line-height: 1.1; }
    a { color: inherit; text-decoration: none; }
    img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .wrap { width: min(1100px, 92%); margin-inline: auto; }
    .section { padding: 5rem 0; }
    .section h2 { font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 0.75rem; }
    .section p.lead { color: var(--muted); max-width: 36rem; margin-bottom: 2rem; }
    .hidden { display: none !important; }

    .toggles {
      position: fixed; bottom: 1rem; right: 1rem; z-index: 100;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 1rem; padding: 0.9rem 1rem; width: 13rem;
      box-shadow: 0 12px 40px rgba(0,0,0,.18);
    }
    .toggles h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.7rem; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin: 0.45rem 0; font-size: 0.85rem; }
    .switch { position: relative; width: 2.4rem; height: 1.35rem; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; cursor: pointer; background: ${theme.sliderBg}; border-radius: 999px; transition: .2s; }
    .slider::before { content: ""; position: absolute; height: 1rem; width: 1rem; left: 0.18rem; top: 0.175rem; background: white; border-radius: 50%; transition: .2s; }
    .switch input:checked + .slider { background: var(--accent); }
    .switch input:checked + .slider::before { transform: translateX(1.05rem); }

    .nav { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(12px); background: color-mix(in srgb, var(--bg) 85%, transparent); border-bottom: 1px solid var(--line); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; gap: 1rem; }
    .logo { font-family: ${theme.headingFont}; font-weight: 700; font-size: 1.25rem; color: var(--accent); }
    .nav-links { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .nav-links a { color: var(--muted); font-size: 0.9rem; }
    .nav-links a:hover { color: var(--text); }

    .hero {
      min-height: 88vh; display: grid; place-items: center;
      background: ${theme.heroBg};
    }
    .hero-content { padding: 4rem 0; }
    .hero h1 { font-size: clamp(3rem, 8vw, 5.5rem); max-width: 12ch; margin-bottom: 1rem; }
    .hero p { color: var(--muted); font-size: 1.15rem; max-width: 28rem; margin-bottom: 2rem; }
    .btn { display: inline-block; background: var(--accent); color: ${theme.btnText}; padding: 0.85rem 1.5rem; border-radius: 999px; font-weight: 600; border: none; cursor: pointer; }
    .btn:hover { filter: brightness(1.08); }
    .btn-ghost { background: transparent; color: var(--text); border: 1px solid var(--line); margin-left: 0.5rem; }

    .creds { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1.5rem; }
    .cred { text-align: center; padding: 1.5rem 1rem; border-top: 2px solid var(--accent); }
    .cred strong { display: block; font-family: ${theme.headingFont}; font-size: 2rem; }
    .cred span { color: var(--muted); font-size: 0.85rem; }

    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
    .service { padding: 1.75rem 0; border-bottom: 1px solid var(--line); }
    .service h3 { margin-bottom: 0.4rem; }
    .service p { color: var(--muted); font-size: 0.95rem; }

    .about-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 3rem; align-items: center; }
    .about-visual { aspect-ratio: 4/5; border-radius: 1.5rem; background: linear-gradient(145deg, var(--accent), var(--accent-2) 60%, var(--surface)); }
    @media (max-width: 760px) { .about-grid { grid-template-columns: 1fr; } .about-visual { aspect-ratio: 16/10; } }

    .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .gallery figure { aspect-ratio: 1; border-radius: 0.75rem; overflow: hidden; background: var(--surface); }
    ${galleryCss(theme.gallery)}
    @media (max-width: 600px) { .gallery { grid-template-columns: repeat(2, 1fr); } }

    .quotes { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .quote { padding: 1.5rem 0; border-left: 3px solid var(--accent); padding-left: 1.25rem; }
    .quote p { font-size: 1.05rem; margin-bottom: 0.75rem; }
    .quote cite { color: var(--muted); font-style: normal; font-size: 0.85rem; }

    form { display: grid; gap: 1rem; max-width: 32rem; }
    label { display: grid; gap: 0.35rem; font-size: 0.85rem; color: var(--muted); }
    input, textarea { background: var(--surface); border: 1px solid var(--line); color: var(--text); padding: 0.85rem 1rem; border-radius: 0.6rem; font: inherit; }
    input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

    footer { border-top: 1px solid var(--line); padding: 2.5rem 0; margin-top: 2rem; }
    .footer-inner { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; color: var(--muted); font-size: 0.9rem; }
    ${CARD_PREVIEW_CSS}
  </style>
</head>
<body>
  <div class="toggles" aria-label="Section toggles">
    <h4>Sections</h4>
    <div class="toggle-row"><span>Credibility</span><label class="switch"><input type="checkbox" data-target="credibility" checked /><span class="slider"></span></label></div>
    <div class="toggle-row"><span>Gallery</span><label class="switch"><input type="checkbox" data-target="gallery" checked /><span class="slider"></span></label></div>
    <div class="toggle-row"><span>Testimonials</span><label class="switch"><input type="checkbox" data-target="testimonials" checked /><span class="slider"></span></label></div>
    <div class="toggle-row"><span>Contact</span><label class="switch"><input type="checkbox" data-target="contact" checked /><span class="slider"></span></label></div>
  </div>

  <header class="nav">
    <div class="wrap nav-inner">
      <a class="logo" href="#">${theme.brand}</a>
      <nav class="nav-links">
        <a href="#services">Services</a>
        <a href="#about">About</a>
        <a href="#gallery">Work</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="wrap hero-content">
      <h1>${theme.headline}</h1>
      <p>${theme.subhead}</p>
      <a class="btn" href="#contact">${theme.primaryCta}</a>
      <a class="btn btn-ghost" href="#services">${theme.ghostCta}</a>
    </div>
  </section>

  <section class="section" id="credibility" data-section="credibility">
    <div class="wrap">
      <div class="creds">
        <div class="cred"><strong>120+</strong><span>Projects shipped</span></div>
        <div class="cred"><strong>14</strong><span>Years experience</span></div>
        <div class="cred"><strong>98%</strong><span>Client retention</span></div>
        <div class="cred"><strong>4.9</strong><span>Average rating</span></div>
      </div>
    </div>
  </section>

  <section class="section" id="services">
    <div class="wrap">
      <h2>Services</h2>
      <p class="lead">Focused offerings. No fluff.</p>
      <div class="services-grid">
        ${services}
      </div>
    </div>
  </section>

  <section class="section" id="about">
    <div class="wrap about-grid">
      <div class="about-visual" aria-hidden="true"></div>
      <div>
        <h2>About</h2>
        <p class="lead">${theme.about}</p>
        <p style="color:var(--muted)">Built for real businesses that need a site that looks premium on day one.</p>
      </div>
    </div>
  </section>

  <section class="section" id="gallery" data-section="gallery">
    <div class="wrap">
      <h2>Gallery</h2>
      <p class="lead">Selected frames from recent work.</p>
      <div class="gallery">
        <figure></figure><figure></figure><figure></figure>
        <figure></figure><figure></figure><figure></figure>
      </div>
    </div>
  </section>

  <section class="section" id="testimonials" data-section="testimonials">
    <div class="wrap">
      <h2>Testimonials</h2>
      <p class="lead">What partners say after launch.</p>
      <div class="quotes">
        <blockquote class="quote"><p>“They delivered exactly what we needed — fast, polished, and on-brand.”</p><cite>— Alex M., Owner</cite></blockquote>
        <blockquote class="quote"><p>“The site feels premium and our leads noticed immediately.”</p><cite>— Sam T., Director</cite></blockquote>
      </div>
    </div>
  </section>

  <section class="section" id="contact" data-section="contact">
    <div class="wrap">
      <h2>Contact</h2>
      <p class="lead">Tell us briefly what you need.</p>
      <form onsubmit="event.preventDefault(); alert('Thanks — message noted.'); this.reset();">
        <label>Name<input type="text" name="name" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Message<textarea name="message" rows="4" required></textarea></label>
        <button class="btn" type="submit">Send message</button>
      </form>
    </div>
  </section>

  <footer>
    <div class="wrap footer-inner">
      <span class="logo">${theme.brand}</span>
      <span>© 2026 ${theme.brand} Studio. All rights reserved.</span>
    </div>
  </footer>

  <script>
    document.querySelectorAll(".toggles input[type=checkbox]").forEach((input) => {
      input.addEventListener("change", () => {
        const el = document.querySelector(\`[data-section="\${input.dataset.target}"]\`);
        if (el) el.classList.toggle("hidden", !input.checked);
      });
    });
  </script>
</body>
</html>
`;
}

function upgradeCardPreviewCss(html) {
  const blockRe =
    /html\.is-card-preview[\s\S]*?html\.is-card-preview \.hero \{[\s\S]*?\}\s*/m;
  if (blockRe.test(html)) {
    return html.replace(blockRe, `${CARD_PREVIEW_CSS}\n`);
  }
  if (html.includes("html.is-card-preview, html.is-card-preview body { overflow: hidden; }")) {
    return html.replace(
      "html.is-card-preview, html.is-card-preview body { overflow: hidden; }",
      CARD_PREVIEW_CSS.trim()
    );
  }
  return html;
}

for (const [slug, theme] of Object.entries(THEMES)) {
  const dir = path.join(ROOT, slug);
  const file = path.join(dir, "index.html");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, buildHtml(theme), "utf8");
  console.log("wrote full preview:", slug);
}

for (const dir of fs.readdirSync(ROOT)) {
  const file = path.join(ROOT, dir, "index.html");
  if (!fs.existsSync(file) || THEMES[dir]) continue;
  const html = fs.readFileSync(file, "utf8");
  const next = upgradeCardPreviewCss(html);
  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    console.log("upgraded card preview css:", dir);
  }
}
