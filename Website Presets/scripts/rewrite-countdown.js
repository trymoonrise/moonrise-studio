'use strict';

const fs = require('fs');
const path = require('path');
const { wrap } = require('./lib/wrap');
const { RECIPES, extractCountdownDesc } = require('./recipes/countdown');

const MANIFEST = path.join(__dirname, '..', 'presets', 'manifest.json');
const PRESETS = path.join(__dirname, '..', 'presets');

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let count = 0;
  const missing = [];

  for (const entry of manifest) {
    if (entry.category !== 'countdown') continue;
    const desc = extractCountdownDesc(entry.slug);
    if (!desc || !RECIPES[desc]) {
      missing.push(`${entry.id} (${entry.slug} -> ${desc || 'none'})`);
      continue;
    }

    const { style, body, script } = RECIPES[desc]();
    const html = wrap(
      {
        id: entry.id,
        slug: entry.slug,
        title: entry.title,
        category: entry.category,
        tags: entry.tags || [],
      },
      entry.title,
      style,
      body,
      script || ''
    );

    fs.writeFileSync(path.join(PRESETS, entry.file), html);
    count++;
  }

  if (missing.length) console.warn('No recipe for:', missing.join(', '));
  console.log(`Rewrote ${count} countdown presets`);
}

main();
