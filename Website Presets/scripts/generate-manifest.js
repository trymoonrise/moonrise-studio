/**
 * Build Website Presets/presets/manifest.json from HTML @preset blocks,
 * enriched with AI-facing selection + adaptation metadata.
 */
const fs = require('fs');
const path = require('path');

const PRESETS_DIR = path.join(__dirname, '..', 'presets');

const CATEGORY_ALIASES = new Map([
  ['video', 'videos'],
  ['videos', 'videos'],
  ['image', 'images'],
  ['images', 'images'],
  ['heroes', 'hero'],
  ['card-shuffles', 'cards'],
  ['scroll', 'scroll'],
  ['scroll-animations', 'scroll'],
  ['scroll-areas', 'scroll'],
  ['scroll-effects', 'scroll'],
  ['scroll-horizontal', 'scroll'],
  ['scroll-progress', 'scroll'],
  ['scroll-sections', 'scroll'],
  ['scroll-stack', 'scroll'],
  ['rotate-scroll', 'scroll'],
  ['image-scroll', 'scroll'],
]);

/** Category → bone-structure / kit role (matches worker section ids). */
const CATEGORY_ROLE = new Map([
  ['navigation', 'navigation'],
  ['menus', 'navigation'],
  ['docks', 'navigation'],
  ['sidebars', 'navigation'],
  ['hero', 'hero'],
  ['features', 'services'],
  ['cards', 'services'],
  ['sections', 'services'],
  ['pricing', 'pricing'],
  ['testimonials', 'testimonials'],
  ['hooks', 'credibility'],
  ['announcements', 'credibility'],
  ['badges', 'credibility'],
  ['numbers', 'credibility'],
  ['bios', 'team'],
  ['profiles', 'team'],
  ['avatars', 'team'],
  ['galleries', 'gallery'],
  ['images', 'gallery'],
  ['stack-gallery', 'gallery'],
  ['carousels', 'gallery'],
  ['accordions', 'faq'],
  ['maps', 'map'],
  ['cta', 'cta_band'],
  ['buttons', 'cta_band'],
  ['forms', 'contact_form'],
  ['inputs', 'contact_form'],
  ['textareas', 'contact_form'],
  ['footers', 'footer'],
  ['text', 'ornament'],
  ['videos', 'hero'],
  ['backgrounds', 'accent'],
  ['effects', 'accent'],
  ['animation', 'accent'],
  ['ease-in', 'accent'],
  ['transitions', 'accent'],
  ['scroll', 'accent'],
  ['3d-effects', 'accent'],
  ['3d-mouse', 'accent'],
  ['cursor-trails', 'accent'],
  ['mouse-effects', 'accent'],
  ['experimental', 'ornament'],
  ['loading', 'ornament'],
  ['loaders', 'ornament'],
]);

/** Roles that can anchor a full landing-page section. */
const PAGE_READY_ROLES = new Set([
  'navigation',
  'hero',
  'services',
  'credibility',
  'testimonials',
  'pricing',
  'team',
  'gallery',
  'faq',
  'map',
  'cta_band',
  'contact_form',
  'footer',
  'about',
  'hours_location',
]);

const ORNAMENT_CATEGORIES = new Set([
  'animation',
  'ease-in',
  'transitions',
  'scroll',
  '3d-effects',
  '3d-mouse',
  'cursor-trails',
  'mouse-effects',
  'experimental',
  'loading',
  'loaders',
  'toggles',
  'pagination',
  'tooltips',
  'popovers',
  'notifications',
  'alerts',
  'toasts',
  'dialogs',
  'modals',
  'auth',
  'errors',
  'empty-states',
  'puzzles',
  'ai-chat',
  'date-pickers',
  'sliders',
  'file-uploads',
  'selects',
  'checkboxes',
  'radio-groups',
  'calendars',
  'tables',
  'tags',
  'borders',
  'links',
  'icons',
  'scrollbar',
  'dots',
  'reveals',
  'timers',
  'countdown',
  'clients',
  'folder-dropdown',
  'dropdowns',
  'comparisons',
]);

function parsePresetMeta(html) {
  const match = html.match(/<!--\s*@preset\s*([\s\S]*?)-->/);
  if (!match) return null;
  const meta = {};
  match[1].split('\n').forEach((line) => {
    const m = line.match(/^\s*(\w+):\s*(.+)/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      if (key === 'tags') {
        meta.tags = val.split(',').map((t) => t.trim()).filter(Boolean);
      } else {
        meta[key] = val;
      }
    }
  });
  return meta;
}

function normalizeCategory(category) {
  const key = String(category || '').trim().toLowerCase();
  if (!key) return 'uncategorized';
  return CATEGORY_ALIASES.get(key) || key;
}

function haystack(meta, category) {
  return [
    meta.title || '',
    meta.slug || '',
    category || '',
    ...(Array.isArray(meta.tags) ? meta.tags : []),
  ]
    .join(' ')
    .toLowerCase();
}

function analyzeStructure(html) {
  const raw = String(html || '');
  const hasGrid = /display:\s*grid|grid-template|\.grid\b/i.test(raw);
  const hasFlex = /display:\s*flex|flex-direction|\.flex\b/i.test(raw);
  const layout = hasGrid ? 'CSS grid' : hasFlex ? 'flex' : 'stack/block';
  const patterns = [];
  if (/card|tile|panel|surface|shell|\.cell\b/i.test(raw)) patterns.push('card surfaces');
  if (/button|\.btn|\.send|\.cta|<button\b/i.test(raw)) patterns.push('styled buttons');
  if (/border-radius|rounded/i.test(raw)) patterns.push('rounded corners');
  if (/box-shadow|shadow/i.test(raw)) patterns.push('shadows/elevation');
  if (/gradient|clip-path|backdrop-filter/i.test(raw)) patterns.push('accent fills/effects');
  if (/<video\b|<img\b/i.test(raw)) patterns.push('media frame');
  if (/<form\b|<fieldset\b|<input\b|<textarea\b/i.test(raw)) patterns.push('form fields');
  if (/marquee|infinite|@keyframes/i.test(raw)) patterns.push('motion');
  return {
    layout,
    patterns: patterns.length ? patterns : ['minimal styling'],
    hasMedia: /<video\b|<img\b/i.test(raw),
    hasForm: /<form\b|<fieldset\b|<input\b|<textarea\b/i.test(raw),
    hasGrid,
    hasFlex,
  };
}

function inferRole(category, hay) {
  if (CATEGORY_ROLE.has(category)) return CATEGORY_ROLE.get(category);
  if (/\bnav(igation)?\b|\bmenu\b|\bdock\b/.test(hay)) return 'navigation';
  if (/\bhero\b/.test(hay)) return 'hero';
  if (/\bfooter\b/.test(hay)) return 'footer';
  if (/\bform\b|\bcontact\b/.test(hay)) return 'contact_form';
  if (/\bcta\b|\bbutton\b/.test(hay)) return 'cta_band';
  if (/\btestimonial\b|\breview\b|\bquote\b/.test(hay)) return 'testimonials';
  if (/\bpric(e|ing)\b|\bplan\b|\btier\b/.test(hay)) return 'pricing';
  if (/\bgallery\b|\bcarousel\b/.test(hay)) return 'gallery';
  if (/\bfaq\b|\baccordion\b/.test(hay)) return 'faq';
  if (/\bteam\b|\bstaff\b|\bbio\b/.test(hay)) return 'team';
  if (/\bfeature\b|\bservice\b|\bcard\b/.test(hay)) return 'services';
  if (/\bmap\b/.test(hay)) return 'map';
  if (ORNAMENT_CATEGORIES.has(category)) return 'ornament';
  return 'ornament';
}

function inferLayout(hay, structure, role) {
  if (/\bbento\b/.test(hay)) return 'bento';
  if (/\bsplit\b|\bhalf\b|\bdiagonal\b/.test(hay)) return 'split-media';
  if (/\bcenter(ed)?\b|\bcentered\b/.test(hay)) return 'centered';
  if (/\bmulti[- ]?column\b|\bcolumns?\b/.test(hay)) return 'multi-column';
  if (/\bbanner\b|\bband\b|\bstrip\b/.test(hay)) return 'band';
  if (/\bmarquee\b/.test(hay)) return 'marquee';
  if (/\balternat\b|\bstagger\b/.test(hay)) return 'alternating';
  if (/\bnumber(ed)?\b|\blist\b/.test(hay)) return 'numbered-list';
  if (/\bgrid\b|\bicon[- ]?grid\b/.test(hay) || (structure.hasGrid && /card|feature|cell|tile/i.test(hay))) {
    return 'card-grid';
  }
  if (structure.hasMedia && (role === 'hero' || /\bsplit\b/.test(hay))) return 'split-media';
  if (structure.hasForm || role === 'contact_form') return 'form-stack';
  if (role === 'navigation') return 'nav-bar';
  if (role === 'footer') return structure.hasGrid || structure.hasFlex ? 'multi-column' : 'band';
  if (role === 'cta_band') return 'band';
  if (structure.hasGrid) return 'card-grid';
  if (structure.hasFlex) return 'flex-row';
  return 'stack';
}

function inferSlots(role, layout, structure, hay) {
  const slots = new Set();
  if (role === 'navigation') {
    slots.add('wordmark');
    slots.add('nav-links');
    slots.add('cta');
  } else if (role === 'hero') {
    slots.add('headline');
    slots.add('subcopy');
    slots.add('cta');
    if (structure.hasMedia || /split|video|image|media/.test(hay) || layout === 'split-media') {
      slots.add('media');
    }
  } else if (role === 'services' || role === 'pricing' || role === 'team' || role === 'gallery') {
    slots.add('section-header');
    slots.add('cards');
    if (structure.hasMedia || role === 'gallery') slots.add('media');
  } else if (role === 'testimonials' || role === 'credibility') {
    slots.add('section-header');
    slots.add('proof-items');
  } else if (role === 'faq') {
    slots.add('section-header');
    slots.add('faq-items');
  } else if (role === 'cta_band') {
    slots.add('headline');
    slots.add('cta');
  } else if (role === 'contact_form') {
    slots.add('section-header');
    slots.add('form-fields');
    slots.add('cta');
  } else if (role === 'footer') {
    slots.add('wordmark');
    slots.add('links');
    slots.add('contact-facts');
  } else if (role === 'map') {
    slots.add('map');
    slots.add('contact-facts');
  } else if (role === 'about') {
    slots.add('section-header');
    slots.add('body-copy');
    if (structure.hasMedia) slots.add('media');
  } else {
    if (/h1|headline|title/i.test(hay) || structure.patterns.includes('styled buttons')) {
      slots.add('headline');
    }
    if (structure.hasMedia) slots.add('media');
    if (structure.hasForm) slots.add('form-fields');
    if (!slots.size) slots.add('visual');
  }
  return [...slots];
}

function inferMood(hay, structure, role) {
  const mood = new Set();
  if (/\bminimal\b|\bclean\b|\bsimple\b/.test(hay)) mood.add('minimal');
  if (/\bbold\b|\bbrutal\b|\bstrong\b/.test(hay)) mood.add('bold');
  if (/\bwarm\b|\bsoft\b|\bgentle\b/.test(hay)) mood.add('warm');
  if (/\beditorial\b|\bserif\b|\bmagazine\b/.test(hay)) mood.add('editorial');
  if (/\bmodern\b|\bsleek\b|\bsharp\b/.test(hay)) mood.add('modern');
  if (/\bplayful\b|\bfun\b|\bneon\b/.test(hay)) mood.add('playful');
  if (/\bluxury\b|\bpremium\b|\belegant\b/.test(hay)) mood.add('premium');
  if (structure.hasMedia || /media|image|video|split|gallery/.test(hay)) mood.add('media-forward');
  if (structure.patterns.includes('motion') || /animat|marquee|scroll|parallax|trail/.test(hay)) {
    mood.add('kinetic');
  }
  if (structure.patterns.includes('card surfaces') || layoutImpliesCards(hay)) mood.add('card-led');
  if (role === 'navigation' || role === 'footer') mood.add('structural');
  if (role === 'contact_form') mood.add('conversion');
  if (role === 'cta_band') mood.add('conversion');
  if (role === 'hero' && !mood.has('media-forward')) mood.add('bold');
  if (!mood.size) mood.add('modern');
  return [...mood].slice(0, 4);
}

function layoutImpliesCards(hay) {
  return /\bcard\b|\bgrid\b|\bbento\b|\btile\b/.test(hay);
}

function isPageReady(role, category, hay, structure) {
  if (!PAGE_READY_ROLES.has(role)) return false;
  if (ORNAMENT_CATEGORIES.has(category) && role !== 'cta_band') return false;
  // Pure effect / toy demos inside page categories
  if (
    /\b(cursor|trail|scramble|typewriter|magnetic|parallax|warp|helix|orbit|puzzle)\b/.test(hay) &&
    !/hero|feature|footer|form|nav|cta|testimonial|pricing|gallery/.test(category)
  ) {
    return false;
  }
  if (role === 'contact_form' && /login|subscribe|newsletter|sign-?up|multi-step|inline-form/.test(hay)) {
    return false;
  }
  if (role === 'hero' && structure.hasForm && !structure.hasMedia && /login|auth/.test(hay)) {
    return false;
  }
  return true;
}

function buildSummary(title, role, layout, structure) {
  const name = String(title || 'Component').trim();
  const roleLabel = String(role || 'component').replace(/_/g, ' ');
  const bits = [`${name}: ${roleLabel} section`];
  if (layout && layout !== 'stack') bits.push(`${layout} layout`);
  if (structure.hasMedia) bits.push('with media');
  if (structure.hasForm) bits.push('with form fields');
  if (structure.patterns.includes('card surfaces')) bits.push('card surfaces');
  // Keep one readable sentence
  const core = bits.slice(0, 3).join(', ');
  return `${core}.`;
}

function buildAdaptHint(role, layout, structure, slots) {
  const slotList = (slots || []).slice(0, 6).join(', ') || 'core content';
  const media = structure.hasMedia
    ? ' Map media frames to stock pack URLs.'
    : '';
  const form = structure.hasForm
    ? ' Keep field order; rewrite labels for this business; map submit to .btn--primary.'
    : '';

  switch (role) {
    case 'navigation':
      return `Reuse bar height, wordmark placement, link spacing, and CTA shape. Fill slots: ${slotList}.${media}`;
    case 'hero':
      return `Preserve ${layout} composition and headline/CTA hierarchy. Fill slots: ${slotList}.${media} Normalize buttons to shared .btn classes.`;
    case 'services':
    case 'pricing':
    case 'team':
      return `Keep the ${layout} card rhythm and section header. Fill slots: ${slotList}.${media} Remap cards to shared .card.`;
    case 'gallery':
      return `Preserve gallery grid/masonry and hover treatment. Fill slots: ${slotList}.${media}`;
    case 'testimonials':
    case 'credibility':
      return `Keep proof/quote card structure and spacing. Fill slots: ${slotList}. Never invent star ratings.`;
    case 'faq':
      return `Reuse accordion/item structure and header rhythm. Fill slots: ${slotList}.`;
    case 'cta_band':
      return `Keep contrast band + headline + primary button composition. Fill slots: ${slotList}.`;
    case 'contact_form':
      return `Preserve field layout and input styling.${form} Fill slots: ${slotList}.`;
    case 'footer':
      return `Reuse column/link grid and typography scale. Fill slots: ${slotList} with real NAP facts.`;
    case 'map':
      return `Keep map frame + adjacent contact facts. Fill slots: ${slotList}.`;
    case 'accent':
      return `Treat as a supporting visual accent only; do not replace a full page section. Extract useful motion/CSS tokens if cohesive.`;
    default:
      return `Adapt layout skeleton into the matching bone section. Fill slots: ${slotList}.${media} Recolor to palette; strip demo chrome.`;
  }
}

function enrichEntry(meta, file, html) {
  const category = normalizeCategory(meta.category);
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const hay = haystack(meta, category);
  const structureRaw = analyzeStructure(html);
  const role = inferRole(category, hay);
  const layout = inferLayout(hay, structureRaw, role);
  const slots = inferSlots(role, layout, structureRaw, hay);
  const mood = inferMood(hay, structureRaw, role);
  const pageReady = isPageReady(role, category, hay, structureRaw);
  const structure = {
    layout: structureRaw.layout,
    patterns: structureRaw.patterns,
    hasMedia: structureRaw.hasMedia,
    hasForm: structureRaw.hasForm,
  };

  return {
    id: meta.id,
    slug: meta.slug,
    file,
    title: meta.title,
    category,
    tags,
    role,
    pageReady,
    layout,
    summary: buildSummary(meta.title, role, layout, structureRaw),
    slots,
    mood,
    adaptHint: buildAdaptHint(role, layout, structureRaw, slots),
    structure,
  };
}

function main() {
  const files = fs.readdirSync(PRESETS_DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
  const entries = [];
  let pageReadyCount = 0;

  for (const file of files.sort()) {
    const html = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf8');
    const meta = parsePresetMeta(html);
    if (!meta) {
      console.warn(`Skipping ${file} - no @preset meta block`);
      continue;
    }
    const entry = enrichEntry(meta, file, html);
    if (entry.pageReady) pageReadyCount += 1;
    entries.push(entry);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const out = path.join(PRESETS_DIR, 'manifest.json');
  fs.writeFileSync(out, JSON.stringify(entries, null, 2) + '\n');
  console.log(`Wrote ${entries.length} entries to manifest.json (${pageReadyCount} pageReady)`);
}

main();
