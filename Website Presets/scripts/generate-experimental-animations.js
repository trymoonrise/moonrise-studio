'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { wrap, padId } = require('./lib/wrap');
const { PRESETS } = require('./recipes/experimental-animations');

const OUT = path.join(__dirname, '..', 'presets');

function nextId() {
  const files = fs.readdirSync(OUT).filter((f) => /^\d{3,4}-.+\.html$/.test(f));
  let max = 0;
  for (const f of files) {
    const n = parseInt(f.split('-')[0], 10);
    if (n > max) max = n;
  }
  return max + 1;
}

function main() {
  let id = nextId();
  let written = 0;

  for (const preset of PRESETS) {
    const fileId = padId(id);
    const file = `${fileId}-${preset.slug}.html`;
    const filePath = path.join(OUT, file);
    if (fs.existsSync(filePath)) {
      console.log(`skip existing ${file}`);
      id++;
      continue;
    }

    const built = preset.build();
    const html = wrap(
      {
        id: fileId,
        slug: preset.slug,
        title: preset.title,
        category: 'animation',
        tags: preset.tags,
      },
      preset.title,
      built.style,
      built.body,
      built.script || ''
    );
    fs.writeFileSync(filePath, html);
    console.log(`+ ${fileId} ${preset.title}`);
    id++;
    written++;
  }

  console.log(`Created ${written} experimental animations`);
  execSync(`node "${path.join(__dirname, 'generate-manifest.js')}"`, { stdio: 'inherit' });
}

main();
