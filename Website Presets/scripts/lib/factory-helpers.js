const M = require('./media');
const { getPalette } = require('./palettes');

const wc = (p, x = '') => `body{display:grid;place-items:center;min-height:100vh;background:${p.bg};color:${p.text};${x}}`;
const sec = (p, x = '') => `body{margin:0;min-height:100vh;background:${p.bg};color:${p.text};${x}}`;
const pad2 = (n) => String(n).padStart(2, '0');
const pick = (arr, i) => arr[i % arr.length];
const slug = (cat, name, series) => `${cat}-${name}-${pad2(series)}`;

function recipe(cat, series, name, title, tags, build) {
  const p = getPalette(series);
  const built = typeof build === 'function' ? build(p, series) : build;
  return {
    category: cat,
    slug: slug(cat, name, series),
    title,
    tags: [cat, ...tags],
    style: built.style || '',
    body: built.body || '',
    script: built.script || '',
  };
}

module.exports = { M, wc, sec, pad2, pick, slug, recipe, getPalette };
