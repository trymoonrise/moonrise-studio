/**
 * Rewrite near-duplicate presets into unique experimental variants.
 * Preserves @preset id/slug/title/category from existing files when possible.
 */
const fs = require('fs');
const path = require('path');
const { wrap } = require('./lib/wrap');

const OUT = path.join(__dirname, '..', 'presets');

function metaFromFile(file, overrides = {}) {
  const html = fs.readFileSync(path.join(OUT, file), 'utf8');
  const get = (k) => {
    const m = html.match(new RegExp(`${k}:\\s*(.+)`));
    return m ? m[1].trim() : '';
  };
  return {
    id: overrides.id || get('id'),
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
  const html = wrap(m, m.title, style, body, script);
  fs.writeFileSync(path.join(OUT, m.file), html);
  console.log('rewrote', m.file);
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=Outfit:wght@400;500;600&display=swap');`;

const recipes = [
  // ——— Docks (differentiate from 0134–0137) ———
  {
    file: '0597-docks-mac-dock-01.html',
    title: 'Spotlight Shelf Dock',
    tags: ['docks', 'spotlight', 'shelf'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:end center;background:#0a0b10;padding-bottom:2.5rem;font-family:Outfit,sans-serif;overflow:hidden}
.shelf{position:relative;padding:1rem}
.glow{position:absolute;left:50%;bottom:8px;width:120px;height:40px;translate:-50% 0;background:radial-gradient(ellipse,rgba(255,200,120,.45),transparent 70%);filter:blur(12px);pointer-events:none;transition:left .35s cubic-bezier(.22,1,.36,1),opacity .3s}
.dock{display:flex;gap:8px;padding:10px 14px;background:#12141c;border:1px solid #2a2d3a;border-radius:18px;position:relative;z-index:1}
.icon{width:48px;height:48px;border:none;border-radius:14px;cursor:pointer;background:linear-gradient(160deg,var(--a),var(--b));box-shadow:inset 0 1px 0 rgba(255,255,255,.25);transition:transform .35s cubic-bezier(.22,1,.36,1),filter .3s;transform-origin:50% 100%}
.icon:hover{transform:translateY(-14px) scale(1.12);filter:brightness(1.1)}
.icon.on{outline:2px solid #ffc878;outline-offset:3px}`,
    body: `<div class="shelf">
  <div class="glow" id="glow"></div>
  <nav class="dock" id="dock" aria-label="Spotlight dock">
    <button class="icon on" style="--a:#ff9f43;--b:#e67e22" aria-label="Apps"></button>
    <button class="icon" style="--a:#54a0ff;--b:#2e86de" aria-label="Browse"></button>
    <button class="icon" style="--a:#5f27cd;--b:#341f97" aria-label="Create"></button>
    <button class="icon" style="--a:#01a3a4;--b:#10ac84" aria-label="Music"></button>
    <button class="icon" style="--a:#ee5a24;--b:#c23616" aria-label="Photos"></button>
  </nav>
</div>`,
    script: `const dock=document.getElementById('dock'),glow=document.getElementById('glow'),icons=[...dock.querySelectorAll('.icon')];
function spot(el){const r=dock.getBoundingClientRect(),ir=el.getBoundingClientRect();glow.style.left=(ir.left-r.left+ir.width/2)+'px'}
icons.forEach(i=>{i.addEventListener('mouseenter',()=>spot(i));i.addEventListener('click',()=>{icons.forEach(x=>x.classList.remove('on'));i.classList.add('on');spot(i)})});
spot(icons[0]);`,
  },
  {
    file: '0598-docks-bottom-nav-02.html',
    title: 'Notch Tab Dock',
    tags: ['docks', 'notch', 'tabs'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:end center;background:#e8e6e1;padding-bottom:2rem;font-family:Outfit,sans-serif}
.phone{width:min(340px,92vw);background:#111;border-radius:36px;padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.25)}
.screen{background:#faf9f6;border-radius:28px;height:420px;position:relative;overflow:hidden;display:flex;flex-direction:column}
.content{flex:1;display:grid;place-items:center;font-family:Syne,sans-serif;font-size:1.4rem;color:#111;transition:opacity .3s}
.nav{position:relative;display:flex;padding:10px 8px 14px;background:#fff;border-top:1px solid #eee}
.tab{flex:1;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;color:#999;font:500 .65rem Outfit,sans-serif;letter-spacing:.04em;transition:color .3s;position:relative;z-index:1}
.tab svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8}
.tab.on{color:#111}
.notch{position:absolute;top:6px;width:56px;height:40px;border-radius:14px;background:#111;transition:left .45s cubic-bezier(.22,1,.36,1);pointer-events:none}
.tab.on{color:#fff}`,
    body: `<div class="phone"><div class="screen">
  <div class="content" id="c">Home</div>
  <nav class="nav" aria-label="Notch tabs">
    <div class="notch" id="notch"></div>
    <button class="tab on" data-t="Home"><svg viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V20h-5v-5H9v5H4z"/></svg>Home</button>
    <button class="tab" data-t="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>Search</button>
    <button class="tab" data-t="Create"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Create</button>
    <button class="tab" data-t="You"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>You</button>
  </nav>
</div></div>`,
    script: `const tabs=[...document.querySelectorAll('.tab')],notch=document.getElementById('notch'),c=document.getElementById('c');
function go(t){tabs.forEach(x=>x.classList.remove('on'));t.classList.add('on');const r=t.getBoundingClientRect(),p=t.parentElement.getBoundingClientRect();notch.style.left=(r.left-p.left+(r.width-56)/2)+'px';c.style.opacity=0;setTimeout(()=>{c.textContent=t.dataset.t;c.style.opacity=1},150)}
tabs.forEach(t=>t.onclick=()=>go(t));go(tabs[0]);`,
  },
  {
    file: '0599-docks-floating-dock-03.html',
    title: 'Radial Burst Dock',
    tags: ['docks', 'radial', 'fab'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e14;font-family:Outfit,sans-serif}
.fab-wrap{position:relative;width:220px;height:220px}
.fab{position:absolute;left:50%;top:50%;translate:-50% -50%;width:58px;height:58px;border-radius:50%;border:none;background:#fff;color:#111;font-size:1.4rem;cursor:pointer;z-index:2;box-shadow:0 12px 40px rgba(0,0,0,.4);transition:transform .35s cubic-bezier(.22,1,.36,1)}
.fab.open{transform:rotate(45deg)}
.arm{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px;border-radius:50%;border:none;background:#1a1e2a;color:#fff;cursor:pointer;display:grid;place-items:center;opacity:0;scale:.5;transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .3s,scale .45s;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.arm svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8}
.fab-wrap.open .arm{opacity:1;scale:1}
.arm:nth-child(1){--a:-90deg}.arm:nth-child(2){--a:-30deg}.arm:nth-child(3){--a:30deg}.arm:nth-child(4){--a:90deg}.arm:nth-child(5){--a:150deg}.arm:nth-child(6){--a:210deg}
.fab-wrap.open .arm{transform:rotate(var(--a)) translateY(-78px) rotate(calc(-1*var(--a)))}
.arm:hover{background:#6c8cff}`,
    body: `<div class="fab-wrap" id="wrap">
  <button class="arm" aria-label="Home"><svg viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V20h-5v-5H9v5H4z"/></svg></button>
  <button class="arm" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg></button>
  <button class="arm" aria-label="Heart"><svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg></button>
  <button class="arm" aria-label="Mail"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></button>
  <button class="arm" aria-label="User"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></button>
  <button class="arm" aria-label="Settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg></button>
  <button class="fab" id="fab" aria-label="Open menu">+</button>
</div>`,
    script: `const wrap=document.getElementById('wrap'),fab=document.getElementById('fab');
fab.onclick=()=>{wrap.classList.toggle('open');fab.classList.toggle('open')};`,
  },
  {
    file: '0600-docks-vertical-dock-04.html',
    title: 'Command Rail Dock',
    tags: ['docks', 'command', 'rail'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0e1016;font-family:Outfit,sans-serif;display:flex}
.rail{width:72px;background:#14161f;border-right:1px solid #222532;display:flex;flex-direction:column;align-items:center;padding:1rem .5rem;gap:.5rem;animation:in .6s cubic-bezier(.22,1,.36,1) both}
.logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7ee0c3,#3d8b7a);margin-bottom:.75rem}
.btn{width:44px;height:44px;border:none;border-radius:12px;background:transparent;color:#666;cursor:pointer;display:grid;place-items:center;position:relative;transition:background .3s,color .3s}
.btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8}
.btn:hover{color:#ccc;background:#1c1f2a}
.btn.on{color:#7ee0c3;background:#1a2420}
.btn .tip{position:absolute;left:calc(100% + 12px);top:50%;translate:0 -50%;background:#fff;color:#111;padding:.3rem .55rem;border-radius:6px;font-size:.7rem;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .25s,translate .25s;translate:-4px -50%}
.btn:hover .tip{opacity:1;translate:0 -50%}
.main{flex:1;display:grid;place-items:center;color:#4a5060;font-family:Syne,sans-serif;font-size:1.5rem}
@keyframes in{from{opacity:0;translate:-20px 0}to{opacity:1;translate:0 0}}`,
    body: `<nav class="rail" aria-label="Command rail">
  <div class="logo" aria-hidden="true"></div>
  <button class="btn on"><svg viewBox="0 0 24 24"><path d="M4 10.5L12 4l8 6.5V20h-5v-5H9v5H4z"/></svg><span class="tip">Home</span></button>
  <button class="btn"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg><span class="tip">Search</span></button>
  <button class="btn"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h14"/></svg><span class="tip">Inbox</span></button>
  <button class="btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg><span class="tip">Profile</span></button>
</nav>
<div class="main" id="main">Home</div>`,
    script: `const labels=['Home','Search','Inbox','Profile'];
[...document.querySelectorAll('.btn')].forEach((b,i)=>b.onclick=()=>{document.querySelectorAll('.btn').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.getElementById('main').textContent=labels[i]});`,
  },

  // ——— Timelines ———
  {
    file: '1496-timeline-pro-horizontal.html',
    title: 'Zigzag Era Timeline',
    tags: ['timeline', 'zigzag', 'eras'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#090b10;color:#fff;font-family:Outfit,sans-serif;padding:3rem 1.5rem;display:grid;place-items:center}
.wrap{width:min(640px,100%)}
h2{font-family:Syne,sans-serif;text-align:center;margin:0 0 2.5rem;font-size:1.6rem;letter-spacing:-.02em}
.path{position:relative}
.row{display:grid;grid-template-columns:1fr 24px 1fr;gap:.75rem;align-items:center;margin-bottom:1.5rem;opacity:0;animation:in .6s cubic-bezier(.22,1,.36,1) both}
.row:nth-child(1){animation-delay:.05s}.row:nth-child(2){animation-delay:.15s}.row:nth-child(3){animation-delay:.25s}.row:nth-child(4){animation-delay:.35s}.row:nth-child(5){animation-delay:.45s}
.row:nth-child(odd) .left{text-align:right}.row:nth-child(even) .right{text-align:left}
.row:nth-child(odd) .right,.row:nth-child(even) .left{opacity:0;pointer-events:none}
.mid{width:14px;height:14px;border-radius:50%;background:#7ee0c3;margin:0 auto;box-shadow:0 0 0 6px rgba(126,224,195,.15);position:relative}
.mid::before{content:"";position:absolute;left:50%;top:14px;width:2px;height:calc(1.5rem + 14px);background:#1e2430;translate:-50% 0}
.row:last-child .mid::before{display:none}
.yr{font-size:.7rem;color:#7ee0c3;letter-spacing:.12em;font-weight:600}
h4{margin:.2rem 0;font-size:1rem}.p{margin:0;color:#7a8090;font-size:.85rem}
@keyframes in{from{opacity:0;translate:0 16px}to{opacity:1;translate:0 0}}`,
    body: `<div class="wrap"><h2>Growth eras</h2><div class="path">
  <div class="row"><div class="left"><div class="yr">2022</div><h4>Ideation</h4><p class="p">Problem validated</p></div><div class="mid"></div><div class="right"></div></div>
  <div class="row"><div class="left"></div><div class="mid"></div><div class="right"><div class="yr">2023</div><h4>MVP</h4><p class="p">First paying users</p></div></div>
  <div class="row"><div class="left"><div class="yr">2024</div><h4>Growth</h4><p class="p">Series A closed</p></div><div class="mid"></div><div class="right"></div></div>
  <div class="row"><div class="left"></div><div class="mid"></div><div class="right"><div class="yr">2025</div><h4>Scale</h4><p class="p">Global expansion</p></div></div>
  <div class="row"><div class="left"><div class="yr">2026</div><h4>Leader</h4><p class="p">Category defining</p></div><div class="mid"></div><div class="right"></div></div>
</div></div>`,
  },
  {
    file: '1497-timeline-stepper-next.html',
    title: 'Chapter Flip Stepper',
    tags: ['timeline', 'chapters', 'stepper'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#14110e;display:grid;place-items:center;padding:2rem;font-family:Outfit,sans-serif;color:#f5ebe0}
.book{width:min(400px,94vw);perspective:1000px}
.page{background:#1e1a16;border:1px solid #3a3228;border-radius:4px 16px 16px 4px;padding:2rem 1.75rem;min-height:280px;box-shadow:12px 0 40px rgba(0,0,0,.4);transform-origin:left center;transition:transform .6s cubic-bezier(.22,1,.36,1);position:relative}
.page.flip{transform:rotateY(-12deg)}
.ch{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#c4a574;margin-bottom:1rem}
h3{font-family:Syne,sans-serif;font-size:1.5rem;margin:0 0 .75rem;letter-spacing:-.02em}
p{margin:0;color:#a89888;line-height:1.65;font-size:.95rem}
.spine{position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(#c4a574,#8a7048)}
.nav{display:flex;gap:.75rem;margin-top:1.25rem;justify-content:space-between}
.nav button{padding:.65rem 1.2rem;border-radius:999px;border:1px solid #3a3228;background:#1e1a16;color:#f5ebe0;font:600 .85rem Outfit,sans-serif;cursor:pointer}
.nav button:disabled{opacity:.35}`,
    body: `<div class="book">
  <div class="page" id="page"><div class="spine"></div><div class="ch" id="ch"></div><h3 id="t"></h3><p id="d"></p></div>
  <div class="nav"><button id="back">← Prev</button><button id="next">Next →</button></div>
</div>`,
    script: `const steps=[{c:'Chapter I',t:'Discovery',d:'Research user needs and define project scope.'},{c:'Chapter II',t:'Design',d:'Create wireframes, prototypes, and visual direction.'},{c:'Chapter III',t:'Development',d:'Build core features with performance in mind.'},{c:'Chapter IV',t:'Launch',d:'Ship to production and monitor key metrics.'}];
let i=0;const page=document.getElementById('page');
function render(){page.classList.add('flip');setTimeout(()=>{document.getElementById('ch').textContent=steps[i].c;document.getElementById('t').textContent=steps[i].t;document.getElementById('d').textContent=steps[i].d;page.classList.remove('flip');document.getElementById('back').disabled=i===0;document.getElementById('next').disabled=i===steps.length-1},200)}
document.getElementById('next').onclick=()=>{if(i<steps.length-1){i++;render()}};
document.getElementById('back').onclick=()=>{if(i>0){i--;render()}};
document.getElementById('ch').textContent=steps[0].c;document.getElementById('t').textContent=steps[0].t;document.getElementById('d').textContent=steps[0].d;`,
  },
  {
    file: '1500-timeline-interactive-dots.html',
    title: 'Clock Dial Timeline',
    tags: ['timeline', 'clock', 'dial'],
    style: `${FONTS}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#08090e;color:#fff;display:grid;place-items:center;font-family:Outfit,sans-serif;padding:2rem}
.dial{position:relative;width:min(320px,85vw);aspect-ratio:1;border-radius:50%;border:1px solid #222632;background:radial-gradient(circle at 50% 50%,#12141c,#08090e)}
.hand{position:absolute;left:50%;top:50%;width:3px;height:38%;background:linear-gradient(#7ee0c3,transparent);transform-origin:50% 100%;translate:-50% -100%;transition:transform .55s cubic-bezier(.22,1,.36,1);border-radius:2px}
.hub{position:absolute;left:50%;top:50%;width:14px;height:14px;border-radius:50%;background:#7ee0c3;translate:-50% -50%;box-shadow:0 0 20px rgba(126,224,195,.5)}
.mark{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px;border-radius:50%;border:none;background:#1a1d28;color:#889;font:700 .7rem Syne,sans-serif;cursor:pointer;transition:background .3s,color .3s,transform .3s,box-shadow .3s}
.mark.on{background:#7ee0c3;color:#08140f;transform:scale(1.15);box-shadow:0 0 24px rgba(126,224,195,.4)}
.info{margin-top:1.75rem;text-align:center;min-height:4rem}
.info h3{font-family:Syne,sans-serif;margin:0 0 .35rem;font-size:1.3rem}
.info p{margin:0;color:#7a8090;font-size:.9rem}`,
    body: `<div>
  <div class="dial" id="dial"><div class="hand" id="hand"></div><div class="hub"></div></div>
  <div class="info" id="info"></div>
</div>`,
    script: `const items=[{t:'Plan',d:'Define scope, timeline, and deliverables.'},{t:'Create',d:'Design and build the core experience.'},{t:'Test',d:'QA, user testing, and iteration.'},{t:'Ship',d:'Deploy and measure success.'}];
const dial=document.getElementById('dial'),hand=document.getElementById('hand'),info=document.getElementById('info');
let active=0;
items.forEach((it,i)=>{
  const a=(i/items.length)*Math.PI*2-Math.PI/2;
  const r=118;const m=document.createElement('button');
  m.className='mark'+(i===0?' on':'');m.textContent=String(i+1);
  m.style.left=\`calc(50% + \${Math.cos(a)*r}px)\`;
  m.style.top=\`calc(50% + \${Math.sin(a)*r}px)\`;
  m.onclick=()=>go(i);dial.appendChild(m);
});
function go(i){active=i;const ang=(i/items.length)*360;hand.style.transform=\`rotate(\${ang}deg)\`;
[...dial.querySelectorAll('.mark')].forEach((m,j)=>m.classList.toggle('on',j===i));
info.innerHTML=\`<h3>\${items[i].t}</h3><p>\${items[i].d}</p>\`}
go(0);`,
  },
];

module.exports = { recipes, metaFromFile, write, FONTS };

if (require.main === module) {
  console.log('Partial recipe file — run dedupe-near-clones-run.js');
}
