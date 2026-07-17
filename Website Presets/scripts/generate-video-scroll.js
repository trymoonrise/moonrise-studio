'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { wrap, padId } = require('./lib/wrap');
const { RECIPES } = require('./recipes/video-scroll-effects');

const OUT = path.join(__dirname, '..', 'presets');

function getExistingMaxId() {
  const files = fs.readdirSync(OUT).filter((f) => /^\d{3,4}-.+\.html$/.test(f));
  let max = 0;
  for (const f of files) {
    const n = parseInt(f.split('-')[0], 10);
    if (n > max) max = n;
  }
  return max;
}

function main() {
  execSync(`node "${path.join(__dirname, 'download-hero-videos.js')}"`, { stdio: 'inherit' });

  let id = getExistingMaxId() + 1;
  let written = 0;

  for (const recipe of RECIPES) {
    const file = `${padId(id)}-${recipe.slug}.html`;
    const filePath = path.join(OUT, file);
    if (fs.existsSync(filePath)) {
      id++;
      continue;
    }
    const meta = {
      id: padId(id),
      slug: recipe.slug,
      title: recipe.title,
      category: recipe.category,
      tags: recipe.tags || [],
    };
    const html = wrap(meta, recipe.title, recipe.style || '', recipe.body || '', recipe.script || '');
    fs.writeFileSync(filePath, html);
    console.log('Wrote', file);
    written++;
    id++;
  }

  console.log(`\nWrote ${written} video scroll presets`);
  execSync(`node "${path.join(__dirname, 'generate-manifest.js')}"`, { stdio: 'inherit' });
}

main();
