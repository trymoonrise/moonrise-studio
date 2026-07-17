'use strict';

const fs = require('fs');
const path = require('path');
const { wrap } = require('./lib/wrap');
const { RECIPES } = require('./recipes/embed-components');

const MANIFEST = path.join(__dirname, '..', 'presets', 'manifest.json');
const PRESETS = path.join(__dirname, '..', 'presets');

const CATEGORIES = ['maps', 'videos', 'calendars'];

function extractDescriptor(entry) {
  const { slug, category } = entry;
  if (category === 'heroes' && slug === 'heroes-embedded-player') return 'embedded-player';
  if (!CATEGORIES.includes(category)) return null;
  const prefix = `${category}-`;
  if (!slug.startsWith(prefix)) return null;
  return slug.slice(prefix.length).replace(/-\d+$/, '');
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let count = 0;
  const missing = [];

  for (const entry of manifest) {
    const desc = extractDescriptor(entry);
    if (!desc || !RECIPES[desc]) continue;

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
  console.log(`Rewrote ${count} embed-based presets`);
}

main();
