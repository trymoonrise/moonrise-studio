const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { wrap, padId } = require('./lib/wrap');
const buildMegaRecipes = require('./recipes/mega-batch');

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
  const recipes = buildMegaRecipes();
  const startFrom = getExistingMaxId() + 1;
  let id = startFrom;
  let written = 0;
  let skipped = 0;

  console.log(`Mega batch: ${recipes.length} recipes, starting at ID ${padId(startFrom)}`);

  for (const recipe of recipes) {
    const file = `${padId(id)}-${recipe.slug}.html`;
    const filePath = path.join(OUT, file);

    if (fs.existsSync(filePath)) {
      skipped++;
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

    const built = typeof recipe.build === 'function' ? recipe.build() : recipe;
    const html = wrap(meta, recipe.title, built.style || '', built.body || '', built.script || '');
    fs.writeFileSync(filePath, html);
    written++;

    if (written % 100 === 0) {
      console.log(`  … ${written} written (current ID ${padId(id)})`);
    }

    id++;
  }

  console.log(`Done: ${written} written, ${skipped} skipped (IDs ${padId(startFrom)}–${padId(id - 1)})`);
  execSync(`node "${path.join(__dirname, 'generate-manifest.js')}"`, { stdio: 'inherit' });
}

main();
