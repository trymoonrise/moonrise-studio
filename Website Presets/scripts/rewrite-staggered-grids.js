'use strict';

const fs = require('fs');
const path = require('path');
const { wrap, padId } = require('./lib/wrap');
const { RECIPES } = require('./recipes/staggered-grids');

const PRESETS = path.join(__dirname, '..', 'presets');

/** Existing files to rewrite (file may not match id due to historical numbering) */
const EXISTING = [
  { id: '010', file: '010-staggered-grid.html', slug: 'staggered-grid', title: 'Staggered Grid', recipe: 'staggered-grid', tags: ['grid', 'stagger'] },
  { id: '1756', file: '1726-staggered-grid-masonry-lift.html', slug: 'staggered-grid-masonry-lift', title: 'Masonry Lift Grid', recipe: 'staggered-grid-masonry-lift', tags: ['grid', 'stagger', 'masonry', 'experimental'] },
  { id: '1757', file: '1727-staggered-grid-command-center.html', slug: 'staggered-grid-command-center', title: 'Command Center Grid', recipe: 'staggered-grid-command-center', tags: ['grid', 'stagger', 'dashboard', 'experimental'] },
  { id: '1758', file: '1728-staggered-grid-luxury-cards.html', slug: 'staggered-grid-luxury-cards', title: 'Luxury Cards Grid', recipe: 'staggered-grid-luxury-cards', tags: ['grid', 'stagger', 'luxury', 'experimental'] },
  { id: '1762', file: '1732-staggered-grid-magnetic-tiles.html', slug: 'staggered-grid-magnetic-tiles', title: 'Magnetic Tiles Grid', recipe: 'staggered-grid-magnetic-tiles', tags: ['grid', 'stagger', 'magnetic', 'experimental'] },
];

const NEW = [
  { slug: 'staggered-grid-shatter-assemble', title: 'Shatter Assemble Grid', recipe: 'staggered-grid-shatter-assemble', tags: ['grid', 'stagger', 'shatter', 'experimental'] },
  { slug: 'staggered-grid-vortex-spiral', title: 'Vortex Spiral Grid', recipe: 'staggered-grid-vortex-spiral', tags: ['grid', 'stagger', 'vortex', 'experimental'] },
  { slug: 'staggered-grid-glitch-slice', title: 'Glitch Slice Grid', recipe: 'staggered-grid-glitch-slice', tags: ['grid', 'stagger', 'glitch', 'experimental'] },
  { slug: 'staggered-grid-elastic-rubber', title: 'Elastic Rubber Grid', recipe: 'staggered-grid-elastic-rubber', tags: ['grid', 'stagger', 'elastic', 'experimental'] },
  { slug: 'staggered-grid-hypercube-warp', title: 'Hypercube Warp Grid', recipe: 'staggered-grid-hypercube-warp', tags: ['grid', 'stagger', '3d', 'experimental'] },
  { slug: 'staggered-grid-ink-flood', title: 'Ink Flood Grid', recipe: 'staggered-grid-ink-flood', tags: ['grid', 'stagger', 'ink', 'experimental'] },
  { slug: 'staggered-grid-quantum-blink', title: 'Quantum Blink Grid', recipe: 'staggered-grid-quantum-blink', tags: ['grid', 'stagger', 'quantum', 'experimental'] },
  { slug: 'staggered-grid-kinetic-type', title: 'Kinetic Type Matrix', recipe: 'staggered-grid-kinetic-type', tags: ['grid', 'stagger', 'type', 'experimental'] },
  { slug: 'staggered-grid-zero-gravity', title: 'Zero Gravity Grid', recipe: 'staggered-grid-zero-gravity', tags: ['grid', 'stagger', 'float', 'experimental'] },
];

function writePreset(meta, recipeKey) {
  const built = RECIPES[recipeKey]();
  const html = wrap(
    { id: meta.id, slug: meta.slug, title: meta.title, category: 'animation', tags: meta.tags },
    meta.title,
    built.style,
    built.body,
    built.script || ''
  );
  fs.writeFileSync(path.join(PRESETS, meta.file), html);
}

function nextId() {
  const files = fs.readdirSync(PRESETS).filter((f) => /^\d{3,4}-.+\.html$/.test(f));
  let max = 0;
  for (const f of files) {
    const n = parseInt(f.split('-')[0], 10);
    if (n > max) max = n;
  }
  // Also check meta ids inside recently written files via filename only is enough for file naming
  return max + 1;
}

function main() {
  let rewritten = 0;
  for (const entry of EXISTING) {
    if (!RECIPES[entry.recipe]) throw new Error(`Missing recipe ${entry.recipe}`);
    writePreset(entry, entry.recipe);
    rewritten++;
  }
  console.log(`Rewrote ${rewritten} existing staggered grids`);

  let id = nextId();
  let created = 0;
  for (const entry of NEW) {
    if (!RECIPES[entry.recipe]) throw new Error(`Missing recipe ${entry.recipe}`);
    const fileId = padId(id);
    const file = `${fileId}-${entry.slug}.html`;
    writePreset(
      { id: fileId, file, slug: entry.slug, title: entry.title, tags: entry.tags },
      entry.recipe
    );
    console.log(`  + ${fileId} ${entry.title}`);
    id++;
    created++;
  }
  console.log(`Created ${created} new staggered grids`);
}

main();
