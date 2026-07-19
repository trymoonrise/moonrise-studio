/**
 * Apply all near-dup rewrites and regenerate manifest.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { wrap } = require('./lib/wrap');
const { recipes: baseRecipes, FONTS } = require('./dedupe-near-clones');

const OUT = path.join(__dirname, '..', 'presets');

function metaFrom(file, overrides = {}) {
  const html = fs.readFileSync(path.join(OUT, file), 'utf8');
  const get = (k) => {
    const m = html.match(new RegExp(`${k}:\\s*(.+)`));
    return m ? m[1].trim() : '';
  };
  return {
    id: get('id'),
    slug: overrides.slug || get('slug'),
    title: overrides.title || get('title'),
    category: overrides.category || get('category'),
    tags: (overrides.tags || get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    file,
  };
}

function write(m, style, body, script = '') {
  fs.writeFileSync(path.join(OUT, m.file), wrap(m, m.title, style, body, script));
  console.log('✓', m.id, m.title);
}

const more = [
  // Accordions
  {
    file: '0662-accordions-single-open-01.html',
    title: 'Editorial Focus Accordion',
    tags: ['accordions', 'editorial', 'focus'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3efe6;padding:2rem;font-family:Outfit,sans-serif;color:#1a1814}
.acc{width:min(520px,100%)}
.item{border-bottom:1px solid #d4cfc4;padding:.25rem 0}
.trigger{width:100%;display:flex;align-items:baseline;gap:1rem;padding:1.1rem 0;border:0;background:none;cursor:pointer;text-align:left;font:inherit;color:inherit}
.num{font-family:Syne,sans-serif;font-size:.75rem;color:#a89878;min-width:1.5rem}
.trigger span:nth-child(2){font-family:Syne,sans-serif;font-size:1.15rem;font-weight:600;letter-spacing:-.02em;transition:color .3s}
.item.open .trigger span:nth-child(2){color:#8a5a2b}
.panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.22,1,.36,1)}
.panel>div{overflow:hidden}
.panel p{margin:0;padding:0 0 1.1rem 2.5rem;color:#6a6458;line-height:1.65;font-size:.92rem}
.item.open .panel{grid-template-rows:1fr}`,
    body: `<div class="acc">
  <div class="item open"><button class="trigger"><span class="num">01</span><span>Only one idea open at a time</span></button><div class="panel"><div><p>Focus stays tight - opening a section gently closes the others.</p></div></div></div>
  <div class="item"><button class="trigger"><span class="num">02</span><span>Quiet typographic state</span></button><div class="panel"><div><p>No chrome cards - just type, rules, and measured motion.</p></div></div></div>
  <div class="item"><button class="trigger"><span class="num">03</span><span>Built for dense FAQ copy</span></button><div class="panel"><div><p>Editorial spacing keeps long answers readable without visual noise.</p></div></div></div>
</div>`,
    script: `document.querySelectorAll('.trigger').forEach(b=>b.onclick=()=>{const item=b.parentElement;document.querySelectorAll('.item').forEach(el=>el.classList.toggle('open',el===item?!el.classList.contains('open'):false))});`,
  },
  {
    file: '0663-accordions-icon-accordion-02.html',
    title: 'Tilt Glyph Accordion',
    tags: ['accordions', 'glyph', 'tilt'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0d12;padding:2rem;font-family:Outfit,sans-serif;color:#e8e8ea;perspective:800px}
.acc{width:min(480px,100%);display:flex;flex-direction:column;gap:.65rem}
.item{background:#14161f;border:1px solid #222532;border-radius:16px;overflow:hidden;transform:rotateX(0);transition:transform .4s,border-color .3s}
.item.open{border-color:#6c8cff;transform:rotateX(2deg) translateZ(8px);box-shadow:0 20px 50px rgba(0,0,0,.35)}
.trigger{width:100%;display:grid;grid-template-columns:48px 1fr auto;gap:.85rem;align-items:center;padding:1rem 1.1rem;border:0;background:none;color:inherit;cursor:pointer;font:600 .95rem Outfit,sans-serif;text-align:left}
.glyph{width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,#1e2440,#12141c);display:grid;place-items:center;font-family:Syne,sans-serif;font-size:.85rem;color:#6c8cff}
.chev{transition:transform .35s;opacity:.5}
.item.open .chev{transform:rotate(90deg);opacity:1}
.panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s cubic-bezier(.22,1,.36,1)}
.panel>div{overflow:hidden}
.panel p{margin:0;padding:0 1.1rem 1.1rem 4.2rem;color:#8a8a96;font-size:.88rem;line-height:1.6}
.item.open .panel{grid-template-rows:1fr}`,
    body: `<div class="acc">
  <div class="item open"><button class="trigger"><span class="glyph">Aa</span><span>Typography system</span><span class="chev">›</span></button><div class="panel"><div><p>Glyphs lead each section - identity before explanation.</p></div></div></div>
  <div class="item"><button class="trigger"><span class="glyph">◇</span><span>Motion language</span><span class="chev">›</span></button><div class="panel"><div><p>Subtle 3D tilt signals the active panel without loud chrome.</p></div></div></div>
  <div class="item"><button class="trigger"><span class="glyph">◈</span><span>Interaction rules</span><span class="chev">›</span></button><div class="panel"><div><p>Independent opens - explore multiple ideas side by side.</p></div></div></div>
</div>`,
    script: `document.querySelectorAll('.trigger').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));`,
  },
  {
    file: '0664-accordions-bordered-stack-03.html',
    title: 'Offset Paper Accordion',
    tags: ['accordions', 'paper', 'stack'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1520;padding:2rem;font-family:Outfit,sans-serif;color:#1a1814}
.stack{width:min(440px,100%);position:relative}
.item{background:#f7f2e8;border:1px solid #ddd4c4;border-radius:12px;margin-bottom:-8px;position:relative;transition:transform .45s cubic-bezier(.22,1,.36,1),margin .45s,box-shadow .45s;box-shadow:0 4px 0 #c8bda8}
.item:nth-child(1){transform:rotate(-1.2deg)}.item:nth-child(2){transform:rotate(.8deg)}.item:nth-child(3){transform:rotate(-.5deg)}
.item.open{transform:rotate(0) translateY(-6px)!important;margin-bottom:12px;z-index:2;box-shadow:0 16px 40px rgba(0,0,0,.25)}
.trigger{width:100%;padding:1.1rem 1.25rem;border:0;background:none;cursor:pointer;font:600 1rem Syne,sans-serif;text-align:left;display:flex;justify-content:space-between;color:inherit}
.panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s}
.panel>div{overflow:hidden}
.panel p{margin:0;padding:0 1.25rem 1.1rem;color:#6a6458;font-size:.9rem;line-height:1.6}
.item.open .panel{grid-template-rows:1fr}`,
    body: `<div class="stack">
  <div class="item open"><button class="trigger"><span>Brief</span><span>+</span></button><div class="panel"><div><p>Paper sheets offset like a desk stack - click to flatten and read.</p></div></div></div>
  <div class="item"><button class="trigger"><span>Research</span><span>+</span></button><div class="panel"><div><p>Notes from interviews and competitive audits live here.</p></div></div></div>
  <div class="item"><button class="trigger"><span>Decision</span><span>+</span></button><div class="panel"><div><p>Final call and rationale, pinned to the top of the pile.</p></div></div></div>
</div>`,
    script: `document.querySelectorAll('.trigger').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));`,
  },
  {
    file: '0665-accordions-animated-plus-04.html',
    title: 'Liquid Plus Accordion',
    tags: ['accordions', 'liquid', 'plus'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071018;padding:2rem;font-family:Outfit,sans-serif;color:#dff6ff}
.acc{width:min(460px,100%);display:flex;flex-direction:column;gap:.5rem}
.item{border-radius:16px;background:rgba(20,40,55,.6);border:1px solid rgba(100,200,255,.15);overflow:hidden}
.trigger{width:100%;padding:1rem 1.15rem;border:0;background:none;color:inherit;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font:600 .95rem Outfit,sans-serif}
.plus{width:28px;height:28px;border-radius:50%;background:#123;position:relative;transition:background .35s,transform .45s cubic-bezier(.22,1,.36,1)}
.plus::before,.plus::after{content:"";position:absolute;background:#7dd3fc;border-radius:2px;transition:transform .4s,opacity .3s}
.plus::before{width:12px;height:2px;left:8px;top:13px}
.plus::after{width:2px;height:12px;left:13px;top:8px}
.item.open .plus{background:#7dd3fc;transform:rotate(90deg)}
.item.open .plus::before,.item.open .plus::after{background:#071018}
.item.open .plus::after{opacity:0}
.panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.22,1,.36,1)}
.panel>div{overflow:hidden}
.panel p{margin:0;padding:0 1.15rem 1.1rem;color:#7aa8bc;font-size:.9rem;line-height:1.6}
.item.open .panel{grid-template-rows:1fr}`,
    body: `<div class="acc">
  <div class="item open"><button class="trigger"><span>Fluid expand</span><div class="plus"></div></button><div class="panel"><div><p>The plus liquefies into a minus as the panel opens.</p></div></div></div>
  <div class="item"><button class="trigger"><span>Cool cyan tone</span><div class="plus"></div></button><div class="panel"><div><p>Night-ocean palette - distinct from the classic white FAQ.</p></div></div></div>
  <div class="item"><button class="trigger"><span>Independent panels</span><div class="plus"></div></button><div class="panel"><div><p>Open several at once when comparing details.</p></div></div></div>
</div>`,
    script: `document.querySelectorAll('.trigger').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));`,
  },

  // Buttons
  {
    file: '1318-buttons-loading-button-04.html',
    title: 'Liquid Fill Loader',
    tags: ['buttons', 'liquid', 'loading'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060d14;font-family:Outfit,sans-serif}
.btn{position:relative;width:180px;height:52px;border:none;border-radius:999px;background:#0e1a24;color:#7dd3fc;font:600 .95rem Outfit,sans-serif;cursor:pointer;overflow:hidden;isolation:isolate}
.fill{position:absolute;inset:0;background:linear-gradient(90deg,#38bdf8,#22d3ee);transform:translateX(-100%);transition:none;z-index:0}
.btn.loading .fill{animation:fill 1.6s cubic-bezier(.22,1,.36,1) forwards}
.label{position:relative;z-index:1;transition:color .3s}
.btn.loading .label{color:#061018}
.btn.done{background:#22d3ee;color:#061018}
@keyframes fill{to{transform:translateX(0)}}`,
    body: `<button class="btn" id="b"><span class="fill"></span><span class="label">Submit</span></button>`,
    script: `const b=document.getElementById('b');
b.onclick=()=>{if(b.classList.contains('loading')||b.classList.contains('done'))return;b.classList.add('loading');b.querySelector('.label').textContent='Uploading…';setTimeout(()=>{b.classList.remove('loading');b.classList.add('done');b.querySelector('.label').textContent='Done';b.querySelector('.fill').style.transform='none'},1600)};`,
  },
  {
    file: '1319-buttons-press-3d-05.html',
    title: 'Mechanical Key Button',
    tags: ['buttons', 'mechanical', 'key'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#12141a;font-family:Outfit,sans-serif}
.key{position:relative;border:none;background:transparent;cursor:pointer;padding:0}
.cap{width:120px;height:120px;border-radius:18px;background:linear-gradient(160deg,#2a2e3a,#1a1e28);border:2px solid #3a4050;box-shadow:0 10px 0 #0a0c10,0 14px 30px rgba(0,0,0,.5);display:grid;place-items:center;font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:#e8e8ea;transition:transform .08s,box-shadow .08s;letter-spacing:.04em}
.key:active .cap,.key.down .cap{transform:translateY(8px);box-shadow:0 2px 0 #0a0c10,0 4px 12px rgba(0,0,0,.4)}
.legend{position:absolute;bottom:18px;font-size:.65rem;color:#6a7080;letter-spacing:.12em}`,
    body: `<button class="key" id="k" aria-label="Enter key"><div class="cap">ENTER<span class="legend">↵</span></div></button>`,
    script: `const k=document.getElementById('k');
k.addEventListener('pointerdown',()=>k.classList.add('down'));
k.addEventListener('pointerup',()=>k.classList.remove('down'));
k.addEventListener('pointerleave',()=>k.classList.remove('down'));`,
  },

  // Menu
  {
    file: '0636-menus-horizontal-nav-01.html',
    title: 'Magnetic Underline Nav',
    tags: ['menus', 'magnetic', 'underline'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0c0d10;font-family:Outfit,sans-serif}
nav{display:flex;align-items:center;gap:2rem;padding:1.25rem 2rem;border-bottom:1px solid #1e2028;position:relative}
.logo{font-family:Syne,sans-serif;font-weight:700;color:#fff;letter-spacing:-.02em;text-decoration:none}
.links{display:flex;gap:1.75rem;position:relative;margin-left:1rem}
.links a{color:#8a8a96;text-decoration:none;font-size:.9rem;font-weight:500;padding:.35rem 0;transition:color .25s}
.links a:hover,.links a.on{color:#fff}
.bar{position:absolute;bottom:-1px;height:2px;background:#7ee0c3;width:0;left:0;transition:left .4s cubic-bezier(.22,1,.36,1),width .4s cubic-bezier(.22,1,.36,1);border-radius:2px}
.cta{margin-left:auto;padding:.55rem 1.1rem;border-radius:999px;background:#fff;color:#111;text-decoration:none;font-size:.8rem;font-weight:600}`,
    body: `<nav>
  <a class="logo" href="#">North</a>
  <div class="links" id="links">
    <a class="on" href="#">Work</a>
    <a href="#">Studio</a>
    <a href="#">Journal</a>
    <div class="bar" id="bar"></div>
  </div>
  <a class="cta" href="#">Contact</a>
</nav>`,
    script: `const links=[...document.querySelectorAll('#links a')],bar=document.getElementById('bar'),wrap=document.getElementById('links');
function move(el){const r=el.getBoundingClientRect(),p=wrap.getBoundingClientRect();bar.style.left=(r.left-p.left)+'px';bar.style.width=r.width+'px'}
links.forEach(a=>{a.addEventListener('mouseenter',()=>move(a));a.addEventListener('click',e=>{e.preventDefault();links.forEach(x=>x.classList.remove('on'));a.classList.add('on');move(a)})});
move(links[0]);`,
  },

  // Pricing
  {
    file: '1091-pricing-three-tier-01.html',
    title: 'Stacked Ladder Pricing',
    tags: ['pricing', 'ladder', 'tiers'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0b0f;padding:2rem;font-family:Outfit,sans-serif;color:#e8e8ea}
.ladder{width:min(420px,100%);display:flex;flex-direction:column;gap:.65rem}
.tier{display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;padding:1.15rem 1.35rem;border-radius:16px;border:1px solid #22232c;background:#12131a;cursor:pointer;transition:border-color .3s,transform .35s,background .3s}
.tier:hover{transform:translateX(6px)}
.tier.on{border-color:#7ee0c3;background:#0f1a16;box-shadow:0 0 0 1px rgba(126,224,195,.2)}
.name{font-family:Syne,sans-serif;font-weight:700;font-size:1.05rem;margin:0 0 .2rem}
.desc{margin:0;font-size:.8rem;color:#7a8090}
.price{font-family:Syne,sans-serif;font-size:1.5rem;font-weight:700;color:#7ee0c3}
.price small{font-size:.7rem;color:#5a6068;font-weight:500}
.cta{margin-top:.75rem;width:100%;padding:.85rem;border:none;border-radius:12px;background:#7ee0c3;color:#08140f;font:600 .9rem Outfit,sans-serif;cursor:pointer;opacity:0;height:0;padding:0;overflow:hidden;transition:opacity .3s,height .35s,padding .35s,margin .35s}
.tier.on .cta{opacity:1;height:auto;padding:.85rem;margin-top:.75rem}
.tier.on{grid-template-columns:1fr;align-items:stretch}
.tier.on .price{margin-top:.35rem}`,
    body: `<div class="ladder">
  <div class="tier"><div><h3 class="name">Starter</h3><p class="desc">Solo makers shipping MVPs</p></div><div class="price">$12<small>/mo</small></div><button class="cta">Choose Starter</button></div>
  <div class="tier on"><div><h3 class="name">Studio</h3><p class="desc">Teams up to 8 seats</p></div><div class="price">$39<small>/mo</small></div><button class="cta">Choose Studio</button></div>
  <div class="tier"><div><h3 class="name">Scale</h3><p class="desc">Unlimited seats + SSO</p></div><div class="price">$99<small>/mo</small></div><button class="cta">Choose Scale</button></div>
</div>`,
    script: `document.querySelectorAll('.tier').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tier').forEach(x=>x.classList.remove('on'));t.classList.add('on')});`,
  },
];

// Card batch - each a distinct concept matching title intent
const cards = [
  {
    file: '1368-cards-basic-card-01.html',
    title: 'Inset Rule Card',
    tags: ['cards', 'minimal', 'rule'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f4ef;font-family:Outfit,sans-serif}.card{width:min(340px,90vw);padding:1.75rem;background:#fff;border:1px solid #e5e1d8;position:relative}.card::before{content:"";position:absolute;left:1.75rem;right:1.75rem;top:0;height:3px;background:#111}.kicker{font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:#8a8478;margin:0 0 .75rem}.card h3{font-family:Syne,sans-serif;margin:0 0 .5rem;font-size:1.25rem;letter-spacing:-.02em}.card p{margin:0;color:#6a6458;line-height:1.55;font-size:.92rem}`,
    body: `<article class="card"><p class="kicker">Note</p><h3>Inset rule card</h3><p>A quiet surface with a hard top rule - no hover circus.</p></article>`,
  },
  {
    file: '1369-cards-image-card-02.html',
    title: 'Bleed Photo Card',
    tags: ['cards', 'image', 'bleed'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1014;font-family:Outfit,sans-serif}.card{width:min(320px,90vw);overflow:hidden;border-radius:4px;background:#16181e;color:#fff}.media{height:200px;background:linear-gradient(145deg,#2a3344 0%,#1a2030 40%,#3d2a28 100%);position:relative}.media::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,200,120,.25),transparent 50%)}.body{padding:1.15rem 1.25rem 1.35rem}.body h3{font-family:Syne,sans-serif;margin:0 0 .35rem;font-size:1.1rem}.body p{margin:0;color:#8a90a0;font-size:.88rem;line-height:1.5}`,
    body: `<article class="card"><div class="media" role="img" aria-label="Abstract photo"></div><div class="body"><h3>Coastal study</h3><p>Full-bleed media with type anchored below - gallery ready.</p></div></article>`,
  },
  {
    file: '1370-cards-hover-lift-03.html',
    title: 'Shadow Peel Card',
    tags: ['cards', 'hover', 'peel'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eae7e1;font-family:Outfit,sans-serif}.card{width:min(300px,90vw);padding:1.5rem;background:#fff;border-radius:20px;box-shadow:0 2px 0 #d0cbc2;transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .45s;cursor:default}.card:hover{transform:translateY(-10px) rotate(-1deg);box-shadow:12px 24px 0 #111}.card h3{font-family:Syne,sans-serif;margin:0 0 .4rem}.card p{margin:0;color:#6a6458;font-size:.9rem;line-height:1.5}`,
    body: `<article class="card"><h3>Shadow peel</h3><p>Hover lifts the card and drops a hard offset shadow.</p></article>`,
  },
  {
    file: '1371-cards-bordered-card-04.html',
    title: 'Double Frame Card',
    tags: ['cards', 'bordered', 'frame'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;font-family:Outfit,sans-serif;color:#eee}.outer{padding:10px;border:1px solid #444;}.inner{padding:1.5rem;border:1px solid #888;}.inner h3{font-family:Syne,sans-serif;margin:0 0 .4rem;font-size:1.15rem}.inner p{margin:0;color:#999;font-size:.9rem;line-height:1.55}`,
    body: `<div class="outer"><article class="inner"><h3>Double frame</h3><p>Nested borders - museum label energy, no radius softener.</p></article></div>`,
  },
  {
    file: '1372-cards-glass-card-ui-05.html',
    title: 'Frost Panel Card',
    tags: ['cards', 'glass', 'frost'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Outfit,sans-serif;background:#1a1528;overflow:hidden}.orb{position:fixed;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#5eead4,#3b82f6);filter:blur(40px);opacity:.55;animation:drift 8s ease-in-out infinite alternate}.card{position:relative;z-index:1;width:min(320px,90vw);padding:1.5rem;border-radius:24px;background:rgba(255,255,255,.1);backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.28);color:#fff;box-shadow:0 20px 50px rgba(0,0,0,.3)}.card h3{font-family:Syne,sans-serif;margin:0 0 .4rem}.card p{margin:0;color:rgba(255,255,255,.7);font-size:.9rem;line-height:1.5}@keyframes drift{to{transform:translate(30px,-20px) scale(1.1)}}`,
    body: `<div class="orb" aria-hidden="true"></div><article class="card"><h3>Frost panel</h3><p>True glass over a drifting orb - not a flat tinted box.</p></article>`,
  },
  {
    file: '1373-cards-dark-card-06.html',
    title: 'OLED Spec Card',
    tags: ['cards', 'dark', 'spec'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;font-family:Outfit,sans-serif;color:#fff}.card{width:min(320px,90vw);padding:1.35rem;border:1px solid #1a1a1a;background:#050505}.row{display:flex;justify-content:space-between;padding:.55rem 0;border-bottom:1px solid #141414;font-size:.85rem}.row:last-child{border:0}.k{color:#555}.v{font-family:Syne,sans-serif;font-weight:600}.card h3{font-family:Syne,sans-serif;margin:0 0 1rem;font-size:1rem;letter-spacing:.08em;text-transform:uppercase;color:#333}`,
    body: `<article class="card"><h3>Spec</h3><div class="row"><span class="k">Latency</span><span class="v">12ms</span></div><div class="row"><span class="k">Throughput</span><span class="v">4.2k/s</span></div><div class="row"><span class="k">Uptime</span><span class="v">99.99%</span></div></article>`,
  },
  {
    file: '1374-cards-minimal-card-07.html',
    title: 'One Line Card',
    tags: ['cards', 'minimal', 'type'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;font-family:Outfit,sans-serif}.card{max-width:360px;text-align:center}.card h3{font-family:Syne,sans-serif;font-size:1.75rem;font-weight:700;letter-spacing:-.03em;margin:0 0 .75rem}.card p{margin:0;color:#888;font-size:.9rem}`,
    body: `<article class="card"><h3>Less, still loud.</h3><p>Minimal means type does the work.</p></article>`,
  },
  {
    file: '1375-cards-gradient-card-08.html',
    title: 'Mesh Wash Card',
    tags: ['cards', 'gradient', 'mesh'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0c;font-family:Outfit,sans-serif}.card{width:min(320px,90vw);padding:2rem 1.5rem;border-radius:28px;background:radial-gradient(at 20% 20%,#ff6b6b 0,transparent 40%),radial-gradient(at 80% 0%,#feca57 0,transparent 35%),radial-gradient(at 50% 80%,#48dbfb 0,transparent 45%),#111;color:#fff;animation:shift 10s ease-in-out infinite alternate}.card h3{font-family:Syne,sans-serif;margin:0 0 .4rem;font-size:1.3rem}.card p{margin:0;opacity:.85;font-size:.9rem}@keyframes shift{to{filter:hue-rotate(25deg)}}`,
    body: `<article class="card"><h3>Mesh wash</h3><p>Living multi-stop gradients, not a single purple strip.</p></article>`,
  },
  {
    file: '1376-cards-stat-card-09.html',
    title: 'Counter Stat Card',
    tags: ['cards', 'stat', 'counter'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1218;font-family:Outfit,sans-serif;color:#fff}.card{width:min(280px,90vw);padding:1.75rem;border-radius:20px;background:#171b24;border:1px solid #252a36;text-align:center}.num{font-family:Syne,sans-serif;font-size:3rem;font-weight:700;letter-spacing:-.04em;color:#7ee0c3;margin:0}.label{margin:.35rem 0 0;color:#7a8090;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase}`,
    body: `<article class="card"><p class="num" id="n">0</p><p class="label">Active teams</p></article>`,
    script: `const el=document.getElementById('n');let v=0;const target=1284;const t=setInterval(()=>{v+=Math.ceil((target-v)/12);el.textContent=v.toLocaleString();if(v>=target)clearInterval(t)},30);`,
  },
  {
    file: '1377-cards-profile-card-10.html',
    title: 'Avatar Orbit Card',
    tags: ['cards', 'profile', 'orbit'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101018;font-family:Outfit,sans-serif;color:#fff}.card{width:min(300px,90vw);padding:2rem 1.5rem;text-align:center;border-radius:24px;background:#161622;border:1px solid #2a2a3a}.avatar{width:72px;height:72px;border-radius:50%;margin:0 auto 1rem;background:linear-gradient(145deg,#7ee0c3,#3b82f6);position:relative;box-shadow:0 0 0 0 rgba(126,224,195,.4);animation:pulse 2.4s ease-out infinite}.card h3{font-family:Syne,sans-serif;margin:0 0 .25rem}.role{margin:0;color:#8a8a9a;font-size:.85rem}@keyframes pulse{70%{box-shadow:0 0 0 16px transparent}}`,
    body: `<article class="card"><div class="avatar" aria-hidden="true"></div><h3>Maya Chen</h3><p class="role">Product Design · SF</p></article>`,
  },
  {
    file: '1378-cards-pricing-card-11.html',
    title: 'Single Plan Card',
    tags: ['cards', 'pricing', 'plan'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e12;font-family:Outfit,sans-serif;color:#fff}.card{width:min(300px,90vw);padding:1.75rem;border-radius:20px;background:#141820;border:1px solid #2a303c}.plan{font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#7ee0c3;margin:0 0 .5rem}.price{font-family:Syne,sans-serif;font-size:2.4rem;margin:0;font-weight:700}.price span{font-size:.9rem;color:#6a7080;font-weight:500}.feats{list-style:none;padding:0;margin:1.25rem 0;display:flex;flex-direction:column;gap:.45rem}.feats li{font-size:.88rem;color:#a0a6b0;padding-left:1.1rem;position:relative}.feats li::before{content:"";position:absolute;left:0;top:.45em;width:6px;height:6px;border-radius:50%;background:#7ee0c3}.btn{width:100%;padding:.8rem;border:none;border-radius:12px;background:#fff;color:#111;font:600 .9rem Outfit,sans-serif;cursor:pointer}`,
    body: `<article class="card"><p class="plan">Pro</p><p class="price">$29<span>/mo</span></p><ul class="feats"><li>Unlimited projects</li><li>Priority support</li><li>Custom domains</li></ul><button class="btn">Start trial</button></article>`,
  },
  {
    file: '1379-cards-overlay-card-12.html',
    title: 'Caption Overlay Card',
    tags: ['cards', 'overlay', 'caption'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;font-family:Outfit,sans-serif}.card{width:min(320px,90vw);height:380px;border-radius:8px;position:relative;overflow:hidden;background:linear-gradient(160deg,#2c3e50,#1a252f 50%,#0d1117);cursor:pointer}.cap{position:absolute;left:0;right:0;bottom:0;padding:1.5rem;background:linear-gradient(transparent,rgba(0,0,0,.85));transform:translateY(40%);transition:transform .45s cubic-bezier(.22,1,.36,1)}.card:hover .cap{transform:translateY(0)}.cap h3{font-family:Syne,sans-serif;margin:0 0 .35rem;color:#fff}.cap p{margin:0;color:#aaa;font-size:.85rem;line-height:1.45}`,
    body: `<article class="card"><div class="cap"><h3>Night market</h3><p>Hover reveals the full caption from the bottom edge.</p></div></article>`,
  },
  {
    file: '1380-cards-stack-card-13.html',
    title: 'Layered Deck Card',
    tags: ['cards', 'stack', 'deck'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121018;font-family:Outfit,sans-serif;color:#fff}.deck{position:relative;width:min(280px,85vw);height:180px}.layer{position:absolute;inset:0;border-radius:16px;border:1px solid #333;background:#1c1824;padding:1.25rem;transition:transform .4s cubic-bezier(.22,1,.36,1)}.layer:nth-child(1){transform:rotate(-4deg) translate(-6px,8px);opacity:.5}.layer:nth-child(2){transform:rotate(3deg) translate(8px,4px);opacity:.7}.layer:nth-child(3){transform:none;z-index:2;background:#221e2e}.deck:hover .layer:nth-child(1){transform:rotate(-8deg) translate(-18px,12px)}.deck:hover .layer:nth-child(2){transform:rotate(7deg) translate(20px,8px)}.deck h3{font-family:Syne,sans-serif;margin:0 0 .35rem}.deck p{margin:0;color:#9088a0;font-size:.85rem}`,
    body: `<div class="deck" aria-label="Stacked cards"><div class="layer"></div><div class="layer"></div><div class="layer"><h3>Layered deck</h3><p>Hover fans the stack apart.</p></div></div>`,
  },
  {
    file: '1381-cards-animated-card-14.html',
    title: 'Breathing Border Card',
    tags: ['cards', 'animated', 'border'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c12;font-family:Outfit,sans-serif;color:#fff}.shell{padding:2px;border-radius:20px;background:conic-gradient(from var(--a,0deg),#7ee0c3,#6c8cff,#f472b6,#7ee0c3);animation:spin 4s linear infinite}.card{padding:1.5rem;border-radius:18px;background:#0b0c12}.card h3{font-family:Syne,sans-serif;margin:0 0 .4rem}.card p{margin:0;color:#8a90a0;font-size:.9rem;line-height:1.5}@property --a{syntax:'<angle>';inherits:false;initial-value:0deg}@keyframes spin{to{--a:360deg}}@media(prefers-reduced-motion:reduce){.shell{animation:none}}`,
    body: `<div class="shell"><article class="card"><h3>Breathing border</h3><p>Conic gradient orbit - the card stays still, the edge moves.</p></article></div>`,
  },
];

// Exact structural clone siblings
const clones = [
  {
    file: '0792-tooltips-hover-tip-01.html',
    title: 'Orbit Hover Tip',
    tags: ['tooltips', 'orbit', 'hover'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1016;font-family:Outfit,sans-serif}.wrap{position:relative}.btn{padding:.75rem 1.25rem;border-radius:999px;border:1px solid #2a2e3a;background:#161a24;color:#fff;font:600 .9rem Outfit,sans-serif;cursor:pointer}.tip{position:absolute;left:50%;bottom:calc(100% + 14px);translate:-50% 0;padding:.45rem .75rem;border-radius:8px;background:#7ee0c3;color:#08140f;font-size:.75rem;font-weight:600;white-space:nowrap;opacity:0;transform:translateY(8px) scale(.95);transition:opacity .3s,transform .35s cubic-bezier(.22,1,.36,1);pointer-events:none}.wrap:hover .tip{opacity:1;transform:translateY(0) scale(1)}`,
    body: `<div class="wrap"><span class="tip">Saved to library</span><button class="btn">Hover me</button></div>`,
  },
  {
    file: '0793-tooltips-click-tip-02.html',
    title: 'Pin Click Tip',
    tags: ['tooltips', 'click', 'pin'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f2ec;font-family:Outfit,sans-serif}.wrap{position:relative}.btn{padding:.7rem 1.2rem;border:1px solid #111;background:#111;color:#fff;font:600 .9rem Outfit,sans-serif;cursor:pointer;border-radius:4px}.tip{position:absolute;left:calc(100% + 12px);top:50%;translate:0 -50%;padding:.5rem .8rem;background:#fff;border:1px solid #111;font-size:.8rem;max-width:180px;opacity:0;pointer-events:none;transition:opacity .25s;box-shadow:4px 4px 0 #111}.tip.on{opacity:1}`,
    body: `<div class="wrap"><button class="btn" id="b">Click</button><div class="tip" id="t">Pinned - click again to dismiss.</div></div>`,
    script: `const t=document.getElementById('t');document.getElementById('b').onclick=()=>t.classList.toggle('on');`,
  },
  {
    file: '0794-tooltips-arrow-tip-03.html',
    title: 'Caret Beam Tip',
    tags: ['tooltips', 'arrow', 'beam'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0c12;font-family:Outfit,sans-serif}.wrap{position:relative}.btn{padding:.7rem 1.2rem;border:none;border-radius:10px;background:#6c8cff;color:#fff;font:600 .9rem Outfit,sans-serif;cursor:pointer}.tip{position:absolute;left:50%;bottom:calc(100% + 16px);translate:-50% 0;padding:.5rem .85rem;background:#1a1e2a;color:#c8d0ff;font-size:.78rem;border-radius:10px;border:1px solid #2a3050;opacity:0;transition:opacity .3s,translate .3s;pointer-events:none;white-space:nowrap}.tip::after{content:"";position:absolute;left:50%;top:100%;translate:-50% 0;border:7px solid transparent;border-top-color:#1a1e2a}.wrap:hover .tip{opacity:1;translate:-50% -4px}`,
    body: `<div class="wrap"><span class="tip">Beam locked on target</span><button class="btn">Aim</button></div>`,
  },
  {
    file: '0795-tooltips-multi-line-tip-04.html',
    title: 'Stack Detail Tip',
    tags: ['tooltips', 'multiline', 'stack'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;font-family:Outfit,sans-serif}.wrap{position:relative}.btn{width:48px;height:48px;border-radius:50%;border:1px solid #333;background:#1a1a1a;color:#fff;font-size:1.1rem;cursor:pointer}.tip{position:absolute;left:50%;bottom:calc(100% + 12px);translate:-50% 0;width:200px;padding:.85rem 1rem;background:#1e1e24;border:1px solid #333;border-radius:12px;opacity:0;pointer-events:none;transition:opacity .3s,transform .35s;transform:translateY(6px)}.tip strong{display:block;font-family:Syne,sans-serif;font-size:.85rem;color:#fff;margin-bottom:.35rem}.tip p{margin:0;font-size:.75rem;color:#888;line-height:1.45}.wrap:hover .tip{opacity:1;transform:none}`,
    body: `<div class="wrap"><div class="tip"><strong>Deploy status</strong><p>Last push succeeded 4m ago. 2 checks pending review.</p></div><button class="btn" aria-label="Info">i</button></div>`,
  },
  {
    file: '0910-tags-removable-tags-02.html',
    title: 'Chip Dissolve Tags',
    tags: ['tags', 'removable', 'dissolve'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1116;font-family:Outfit,sans-serif}.row{display:flex;flex-wrap:wrap;gap:.5rem;max-width:360px;justify-content:center}.tag{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .7rem .4rem .85rem;border-radius:999px;background:#1c2030;color:#c8d0e0;font-size:.85rem;border:1px solid #2a3050;transition:opacity .35s,transform .4s cubic-bezier(.22,1,.36,1),filter .35s}.tag.out{opacity:0;transform:scale(.8);filter:blur(4px)}.x{border:none;background:rgba(255,255,255,.08);color:#889;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:.7rem;line-height:1}`,
    body: `<div class="row" id="row"><span class="tag">Design <button class="x" aria-label="Remove">×</button></span><span class="tag">Motion <button class="x" aria-label="Remove">×</button></span><span class="tag">Brand <button class="x" aria-label="Remove">×</button></span><span class="tag">Systems <button class="x" aria-label="Remove">×</button></span></div>`,
    script: `document.querySelectorAll('.x').forEach(x=>x.onclick=()=>{const t=x.parentElement;t.classList.add('out');setTimeout(()=>t.remove(),400)});`,
  },
  {
    file: '0915-tags-input-tags-07.html',
    title: 'Typeahead Tag Field',
    tags: ['tags', 'input', 'typeahead'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f3ee;font-family:Outfit,sans-serif}.field{width:min(360px,90vw);min-height:48px;padding:.4rem .55rem;border:1px solid #ccc8bc;border-radius:12px;background:#fff;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}.chip{padding:.25rem .55rem;border-radius:6px;background:#111;color:#fff;font-size:.75rem;font-weight:600}.field input{border:0;outline:0;flex:1;min-width:80px;font:500 .9rem Outfit,sans-serif;background:transparent;padding:.35rem}`,
    body: `<div class="field" id="f"><span class="chip">react</span><input id="i" placeholder="Add tag…" aria-label="Add tag"></div>`,
    script: `const f=document.getElementById('f'),i=document.getElementById('i');
i.addEventListener('keydown',e=>{if(e.key==='Enter'&&i.value.trim()){e.preventDefault();const c=document.createElement('span');c.className='chip';c.textContent=i.value.trim();f.insertBefore(c,i);i.value=''}});`,
  },
  {
    file: '1044-cta-minimal-cta-06.html',
    title: 'Arrow Sweep CTA',
    tags: ['cta', 'minimal', 'arrow'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;font-family:Outfit,sans-serif}.cta{display:inline-flex;align-items:center;gap:.65rem;padding:0;border:0;background:none;color:#fff;font:600 1.1rem Syne,sans-serif;cursor:pointer;letter-spacing:-.02em}.cta span{display:inline-block;transition:transform .4s cubic-bezier(.22,1,.36,1)}.cta:hover span{transform:translateX(6px)}.line{width:40px;height:1px;background:#fff;transition:width .4s cubic-bezier(.22,1,.36,1)}.cta:hover .line{width:64px}`,
    body: `<button class="cta">View case study <i class="line" aria-hidden="true"></i><span>→</span></button>`,
  },
  {
    file: '1157-maps-marker-card-02.html',
    title: 'Pulse Pin Map',
    tags: ['maps', 'marker', 'pulse'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1218;font-family:Outfit,sans-serif}.map{width:min(360px,90vw);height:260px;border-radius:16px;background:linear-gradient(160deg,#1a2838,#0e1620);position:relative;overflow:hidden;border:1px solid #1e2a38}.pin{position:absolute;left:58%;top:42%;width:14px;height:14px;margin:-7px;border-radius:50%;background:#7ee0c3;box-shadow:0 0 0 0 rgba(126,224,195,.5);animation:pulse 2s ease-out infinite;cursor:pointer;border:0}.card{position:absolute;left:58%;top:42%;translate:-50% calc(-100% - 18px);padding:.75rem 1rem;background:#fff;color:#111;border-radius:10px;font-size:.8rem;width:160px;opacity:0;transform:translate(-50%,calc(-100% - 8px)) scale(.95);transition:opacity .3s,transform .35s;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.35)}.card strong{display:block;font-family:Syne,sans-serif;margin-bottom:.2rem}.map:has(.pin:hover) .card,.map.show .card{opacity:1;transform:translate(-50%,calc(-100% - 18px)) scale(1)}@keyframes pulse{70%{box-shadow:0 0 0 18px transparent}}`,
    body: `<div class="map" id="map"><button class="pin" aria-label="Location"></button><div class="card"><strong>Studio North</strong>Open until 6pm</div></div>`,
    script: `document.getElementById('map').onclick=()=>document.getElementById('map').classList.toggle('show');`,
  },
  {
    file: '1159-maps-interactive-map-04.html',
    title: 'Pan Grid Map',
    tags: ['maps', 'interactive', 'pan'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0c10;font-family:Outfit,sans-serif;color:#fff}.frame{width:min(400px,92vw);height:280px;border-radius:12px;overflow:hidden;border:1px solid #222;cursor:grab;position:relative}.grid{width:200%;height:200%;background:repeating-linear-gradient(0deg,#1a2836 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,#1a2836 0 1px,transparent 1px 40px),#0e141c;position:absolute;left:-25%;top:-25%;transition:none}.hint{position:absolute;bottom:10px;left:50%;translate:-50% 0;font-size:.7rem;color:#567;letter-spacing:.1em;text-transform:uppercase;pointer-events:none}`,
    body: `<div class="frame" id="f"><div class="grid" id="g"></div><div class="hint">Drag to pan</div></div>`,
    script: `const f=document.getElementById('f'),g=document.getElementById('g');let ox=0,oy=0,dx=0,dy=0,drag=false,sx,sy;
f.onpointerdown=e=>{drag=true;sx=e.clientX;sy=e.clientY;f.setPointerCapture(e.pointerId);f.style.cursor='grabbing'};
f.onpointermove=e=>{if(!drag)return;dx=ox+(e.clientX-sx);dy=oy+(e.clientY-sy);g.style.transform=\`translate(\${dx}px,\${dy}px)\`};
f.onpointerup=()=>{drag=false;ox=dx;oy=dy;f.style.cursor='grab'};`,
  },
  {
    file: '1222-videos-video-controls-02.html',
    title: 'Minimal Scrub Controls',
    tags: ['videos', 'controls', 'scrub'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;font-family:Outfit,sans-serif}.player{width:min(400px,92vw)}.stage{aspect-ratio:16/9;background:linear-gradient(135deg,#1a2030,#0d1118);border-radius:12px 12px 0 0;display:grid;place-items:center}.play{width:56px;height:56px;border-radius:50%;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:1.2rem;cursor:pointer;backdrop-filter:blur(8px)}.bar{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:#121212;border-radius:0 0 12px 12px}.scrub{flex:1;height:4px;border-radius:99px;background:#333;cursor:pointer;position:relative}.scrub i{position:absolute;left:0;top:0;bottom:0;width:35%;background:#7ee0c3;border-radius:99px;pointer-events:none}.t{font-size:.7rem;color:#666;font-variant-numeric:tabular-nums}`,
    body: `<div class="player"><div class="stage"><button class="play" id="p" aria-label="Play">▶</button></div><div class="bar"><span class="t">0:42</span><div class="scrub" id="s"><i id="fill"></i></div><span class="t">2:18</span></div></div>`,
    script: `let playing=false;document.getElementById('p').onclick=function(){playing=!playing;this.textContent=playing?'❚❚':'▶'};
document.getElementById('s').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();document.getElementById('fill').style.width=((e.clientX-r.left)/r.width*100)+'%'};`,
  },
  {
    file: '1289-borders-dashed-border-02.html',
    title: 'Marching Ants Border',
    tags: ['borders', 'dashed', 'ants'],
    style: `${FONTS}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1014;font-family:Outfit,sans-serif;color:#fff}.box{width:min(280px,80vw);padding:2rem;text-align:center;border:2px dashed #3a4050;border-radius:16px;animation:ants 20s linear infinite;font-family:Syne,sans-serif}.box p{margin:.5rem 0 0;font-family:Outfit,sans-serif;color:#7a8090;font-size:.85rem}@keyframes ants{to{border-color:#7ee0c3;background-position:40px 0}}`,
    body: `<div class="box"><strong>Selection</strong><p>Marching dashed edge - active region cue.</p></div>`,
  },
  {
    file: '1303-backgrounds-noise-bg-03.html',
    title: 'Grain Drift Background',
    tags: ['backgrounds', 'noise', 'grain'],
    style: `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1510;overflow:hidden;font-family:system-ui,sans-serif}.grain{position:fixed;inset:-50%;width:200%;height:200%;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");opacity:.18;animation:drift 8s steps(10) infinite;pointer-events:none;mix-blend-mode:overlay}.label{position:relative;z-index:1;color:#c4a574;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase}@keyframes drift{to{transform:translate(2%,3%)}}`,
    body: `<div class="grain" aria-hidden="true"></div><div class="label">Grain drift</div>`,
  },
];

const all = [...baseRecipes, ...more, ...cards, ...clones];

let n = 0;
for (const r of all) {
  if (!fs.existsSync(path.join(OUT, r.file))) {
    console.warn('missing', r.file);
    continue;
  }
  const m = metaFrom(r.file, { title: r.title, tags: (r.tags || []).join(', ') });
  // keep slug from file; update title in meta
  m.title = r.title;
  m.tags = r.tags || m.tags;
  write(m, r.style, r.body, r.script || '');
  n++;
}

console.log(`\\nRewrote ${n} near-duplicate presets`);
execSync(`node "${path.join(__dirname, 'generate-manifest.js')}"`, { stdio: 'inherit' });
