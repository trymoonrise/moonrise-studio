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
        meta.tags = val.split(',').map((t) => t.trim());
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

function main() {
  const files = fs.readdirSync(PRESETS_DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
  const entries = [];

  for (const file of files.sort()) {
    const html = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf8');
    const meta = parsePresetMeta(html);
    if (!meta) {
      console.warn(`Skipping ${file} — no @preset meta block`);
      continue;
    }
    entries.push({
      id: meta.id,
      slug: meta.slug,
      file,
      title: meta.title,
      category: normalizeCategory(meta.category),
      tags: meta.tags || [],
    });
  }

  entries.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const out = path.join(PRESETS_DIR, 'manifest.json');
  fs.writeFileSync(out, JSON.stringify(entries, null, 2) + '\n');
  console.log(`Wrote ${entries.length} entries to manifest.json`);
}

main();
