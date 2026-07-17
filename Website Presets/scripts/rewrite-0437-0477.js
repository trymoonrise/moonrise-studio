const fs = require('fs');
const path = require('path');
const { wrap } = require('./lib/wrap');
const { RECIPES } = require('./recipes/batch-0437-0477');

const MANIFEST = path.join(__dirname, '..', 'presets', 'manifest.json');
const PRESETS = path.join(__dirname, '..', 'presets');

function extractDescriptor(entry) {
  const { slug, category } = entry;
  if (category === 'scroll-animations') {
    return slug.replace(/^scroll-animations-/, '').replace(/-\d+$/, '');
  }
  if (category === 'image-scroll') {
    return slug.replace(/^image-scroll-/, '').replace(/-\d+$/, '');
  }
  if (category === 'rotate-scroll') {
    return slug.replace(/^rotate-scroll-/, '').replace(/-\d+$/, '');
  }
  if (category === 'effects') {
    return slug.replace(/^effects-/, '').replace(/-\d+$/, '');
  }
  return null;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let count = 0;

  for (const entry of manifest) {
    const id = parseInt(entry.id, 10);
    if (id < 437 || id > 477) continue;

    const desc = extractDescriptor(entry);
    if (!desc || !RECIPES[desc]) {
      console.warn(`No recipe for id ${entry.id} (${desc || 'unknown descriptor'})`);
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

  console.log(`Rewrote ${count} presets (IDs 0437–0477)`);
}

main();
