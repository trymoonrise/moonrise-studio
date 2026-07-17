const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'presets');
let fixed = 0;

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.html')) continue;
  const id = parseInt(f.split('-')[0], 10);
  if (id < 396) continue;

  const fp = path.join(dir, f);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;

  // Repair partial quotes from earlier fix: src="../stock/media/16-9" Aspect Ratio(video).mp4
  html = html.replace(
    /src="(\.\.\/stock\/media\/[^"]+)"\s+(Aspect Ratio\([^)]+\)\.(?:png|mp4))/g,
    'src="$1 $2"'
  );

  // Quote unquoted full media paths
  html = html.replace(
    /\bsrc=(\.\.\/stock\/media\/(?:\d+-\d+\s+)?Aspect Ratio\([^)]+\)\.(?:png|mp4))/g,
    'src="$1"'
  );

  if (html !== before) {
    fs.writeFileSync(fp, html);
    fixed++;
  }
}

console.log(`Fixed ${fixed} files`);
