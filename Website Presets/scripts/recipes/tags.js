'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

const removeScript = `document.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{const t=b.closest('.tag');t.style.opacity='0';t.style.transform='scale(.85)';setTimeout(()=>t.remove(),220);}));`;

const RECIPES = {
  'basic-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f7;color:#111;${base};padding:2rem}${reduced}
    .stage{text-align:center}
    .kicker{margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{padding:8px 14px;border:1.5px solid #111;background:#fff;font-size:.8rem;font-weight:600;letter-spacing:.02em;opacity:0;transform:translateY(10px);animation:up .5s cubic-bezier(.22,1,.36,1) forwards}
    .tag:nth-child(1){animation-delay:.05s}.tag:nth-child(2){animation-delay:.12s}.tag:nth-child(3){animation-delay:.19s}.tag:nth-child(4){animation-delay:.26s}
    .tag:hover{background:#111;color:#fff}
    @keyframes up{to{opacity:1;transform:none}}`,
    body: `<div class="stage"><p class="kicker">Basic tags</p><div class="tags"><span class="tag">Design</span><span class="tag">Motion</span><span class="tag">Type</span><span class="tag">Grid</span></div></div>`,
  }),

  'removable-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:420px}
    .tag{display:inline-flex;align-items:center;gap:8px;padding:7px 8px 7px 14px;border:1.5px solid #111;background:#fff;font-size:.82rem;font-weight:600;transition:opacity .22s,transform .22s}
    .tag button{width:22px;height:22px;border:none;background:#111;color:#fff;cursor:pointer;font-size:.75rem;line-height:1;display:grid;place-items:center;transition:background .2s,color .2s}
    .tag button:hover{background:#fff;color:#111;outline:1px solid #111}`,
    body: `<div><p class="kicker">Removable</p><div class="tags" id="t"><span class="tag">Design <button type="button" data-r aria-label="Remove">×</button></span><span class="tag">React <button type="button" data-r aria-label="Remove">×</button></span><span class="tag">CSS <button type="button" data-r aria-label="Remove">×</button></span><span class="tag">Syne <button type="button" data-r aria-label="Remove">×</button></span></div></div>`,
    script: removeScript,
  }),

  'color-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{padding:7px 14px;font-size:.78rem;font-weight:700;letter-spacing:.04em;border:1px solid transparent}
    .tag--a{background:#fff;color:#0a0a0a}.tag--b{background:transparent;color:#fff;border-color:#333}.tag--c{background:#222;color:#fff}.tag--d{background:#eee;color:#111}`,
    body: `<div><p class="kicker">Tone variants</p><div class="tags"><span class="tag tag--a">Frontend</span><span class="tag tag--b">Design</span><span class="tag tag--c">Backend</span><span class="tag tag--d">Ops</span></div></div>`,
  }),

  'hash-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.75rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .tags{display:flex;gap:1.25rem;flex-wrap:wrap;justify-content:center}
    .tag{color:#111;font-size:1rem;font-weight:600;text-decoration:none;position:relative;padding-bottom:2px}
    .tag::before{content:'#';color:#bbb;font-weight:500;margin-right:1px}
    .tag::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1.5px;background:#111;transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.22,1,.36,1)}
    .tag:hover::after{transform:scaleX(1)}`,
    body: `<div><p class="kicker">Hash tags</p><div class="tags"><a class="tag" href="#">design</a><a class="tag" href="#">webdev</a><a class="tag" href="#">ui</a><a class="tag" href="#">css</a></div></div>`,
  }),

  'icon-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f4;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border:1.5px solid #111;background:#fff;font-size:.8rem;font-weight:600;cursor:default;transition:background .2s,color .2s}
    .tag svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
    .tag:hover{background:#111;color:#fff}`,
    body: `<div><p class="kicker">Icon tags</p><div class="tags">
      <span class="tag"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>Live</span>
      <span class="tag"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z"/></svg>Featured</span>
      <span class="tag"><svg viewBox="0 0 24 24"><path d="M20 7H4l2 12h12l2-12zM9 7V5a3 3 0 0 1 6 0v2"/></svg>Shop</span>
    </div></div>`,
  }),

  'pill-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{padding:8px 18px;border:1.5px solid #111;font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;background:#fff;transition:transform .25s cubic-bezier(.22,1,.36,1),background .25s,color .25s}
    .tag:hover{background:#111;color:#fff;transform:translateY(-3px)}`,
    body: `<div><p class="kicker">Pill row</p><div class="tags"><span class="tag">Alpha</span><span class="tag">Beta</span><span class="tag">Gamma</span><span class="tag">Delta</span></div></div>`,
  }),

  'grouped-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f0f0f0;color:#111;${base};padding:2rem}${reduced}
    .panel{width:min(100%,400px);background:#fff;border:1px solid #111;padding:1.5rem}
    .group{margin-bottom:1.25rem}.group:last-child{margin-bottom:0}
    .label{${display};font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0 0 .65rem;color:#888}
    .tags{display:flex;gap:6px;flex-wrap:wrap}
    .tag{padding:5px 11px;border:1px solid #ddd;font-size:.75rem;font-weight:600;background:#fafafa}
    .tag.on{border-color:#111;background:#111;color:#fff}`,
    body: `<div class="panel">
      <div class="group"><p class="label">Stack</p><div class="tags"><span class="tag on">React</span><span class="tag">Vue</span><span class="tag">Svelte</span></div></div>
      <div class="group"><p class="label">Role</p><div class="tags"><span class="tag">Design</span><span class="tag on">Engineering</span><span class="tag">Research</span></div></div>
    </div>`,
  }),

  'input-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f5;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.25rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .box{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px;border:1.5px solid #111;background:#fff;min-width:min(100%,320px);max-width:420px}
    .tag{display:inline-flex;align-items:center;gap:6px;padding:5px 8px 5px 10px;background:#111;color:#fff;font-size:.78rem;font-weight:600}
    .tag button{border:none;background:transparent;color:#fff;cursor:pointer;font-size:.8rem;opacity:.6;padding:0;line-height:1}
    .tag button:hover{opacity:1}
    input{border:none;outline:none;flex:1;min-width:100px;font:inherit;font-size:.88rem;background:transparent}`,
    body: `<div><p class="kicker">Tag input · Enter to add</p><div class="box" id="b"><span class="tag">motion <button type="button" data-r aria-label="Remove">×</button></span><input placeholder="Add tag…" id="i" autocomplete="off"></div></div>`,
    script: `const box=document.getElementById('b'),inp=document.getElementById('i');
function bind(b){b.addEventListener('click',()=>b.closest('.tag').remove());}
document.querySelectorAll('[data-r]').forEach(bind);
inp.addEventListener('keydown',e=>{if(e.key!=='Enter'||!inp.value.trim())return;e.preventDefault();const s=document.createElement('span');s.className='tag';s.innerHTML=inp.value.trim()+' <button type="button" data-r aria-label="Remove">×</button>';box.insertBefore(s,inp);bind(s.querySelector('[data-r]'));inp.value='';});`,
  }),

  'dark-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};padding:2rem;position:relative;overflow:hidden}${reduced}
    body::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
    .stage{position:relative;z-index:1;text-align:center}
    .kicker{margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{padding:8px 14px;border:1px solid #2a2a2a;background:#111;font-size:.8rem;font-weight:600;transition:border-color .25s,background .25s}
    .tag:hover{border-color:#fff;background:#1a1a1a}`,
    body: `<div class="stage"><p class="kicker">Dark surface</p><div class="tags"><span class="tag">Noir</span><span class="tag">Ink</span><span class="tag">Void</span><span class="tag">Signal</span></div></div>`,
  }),

  'minimal-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .line{font-size:1.05rem;line-height:1.8;max-width:34ch;text-align:center;color:#444}
    .tag{display:inline;border-bottom:1.5px solid #111;font-weight:600;color:#111;padding-bottom:1px;margin:0 .15em;cursor:default}
    .tag:hover{background:#111;color:#fff;border-color:transparent;box-shadow:0 -.15em 0 #111,0 .15em 0 #111}`,
    body: `<p class="line">Filed under <span class="tag">minimal</span>, <span class="tag">type</span>, and <span class="tag">quiet ui</span>.</p>`,
  }),

  'gradient-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0c;color:#fff;${base};padding:2rem;overflow:hidden;position:relative}${reduced}
    .orb{position:absolute;width:40vmax;height:40vmax;border-radius:50%;filter:blur(70px);opacity:.35;pointer-events:none}
    .orb--1{background:#333;top:-20%;left:-10%}.orb--2{background:#1a1a1a;bottom:-25%;right:-10%}
    .stage{position:relative;z-index:1;text-align:center}
    .kicker{margin:0 0 1.5rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#666}
    .tags{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
    .tag{padding:2px;background:linear-gradient(120deg,#fff,#666,#fff);background-size:200% 200%;animation:flow 4s ease infinite}
    .tag span{display:block;padding:7px 14px;background:#0c0c0c;font-size:.8rem;font-weight:600}
    @keyframes flow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}`,
    body: `<div class="orb orb--1" aria-hidden="true"></div><div class="orb orb--2" aria-hidden="true"></div>
    <div class="stage"><p class="kicker">Gradient edge</p><div class="tags"><div class="tag"><span>New</span></div><div class="tag"><span>Beta</span></div><div class="tag"><span>Sale</span></div><div class="tag"><span>Hot</span></div></div></div>`,
  }),

  'badge-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f5;color:#111;${base};padding:2rem}${reduced}
    .card{display:flex;align-items:center;gap:1rem;padding:1.15rem 1.35rem;background:#fff;border:1px solid #e5e5e5;min-width:280px}
    .card b{${display};font-size:1.05rem;font-weight:800;letter-spacing:-.03em;flex:1}
    .badge{padding:4px 9px;border:1px solid #111;font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .badge--fill{background:#111;color:#fff}`,
    body: `<div class="card"><b>Release 2.4</b><span class="badge">Docs</span><span class="badge badge--fill">New</span></div>`,
  }),

  'filter-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 1.25rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .filters{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:2rem}
    .f{padding:8px 16px;border:1.5px solid #ddd;background:#fff;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;transition:border-color .2s,background .2s,color .2s}
    .f.on,.f:hover{border-color:#111;background:#111;color:#fff}
    .results{display:grid;gap:8px;width:min(100%,320px)}
    .item{padding:12px 14px;border:1px solid #eee;background:#fff;font-size:.88rem;display:none}
    .item.show{display:block;animation:in .35s cubic-bezier(.22,1,.36,1)}
    @keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`,
    body: `<div><p class="kicker">Filter tags</p>
    <div class="filters" id="f"><button type="button" class="f on" data-f="all">All</button><button type="button" class="f" data-f="design">Design</button><button type="button" class="f" data-f="code">Code</button><button type="button" class="f" data-f="type">Type</button></div>
    <div class="results">
      <div class="item show" data-c="design">Editorial layout system</div>
      <div class="item show" data-c="code">Component API notes</div>
      <div class="item show" data-c="type">Syne specimen</div>
      <div class="item show" data-c="design">Grid studies</div>
      <div class="item show" data-c="code">Motion tokens</div>
    </div></div>`,
    script: `const btns=[...document.querySelectorAll('.f')],items=[...document.querySelectorAll('.item')];
btns.forEach(b=>b.addEventListener('click',()=>{btns.forEach(x=>x.classList.remove('on'));b.classList.add('on');const f=b.dataset.f;items.forEach(it=>{const show=f==='all'||it.dataset.c===f;it.classList.toggle('show',show);});});`,
  }),

  'animated-tags': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
    .kicker{text-align:center;margin:0 0 1.75rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .tag{padding:9px 16px;border:1px solid #2a2a2a;background:#111;font-size:.82rem;font-weight:600;opacity:0;transform:translateY(16px) scale(.94);animation:pop .55s cubic-bezier(.22,1,.36,1) forwards}
    .tag:nth-child(1){animation-delay:.05s}.tag:nth-child(2){animation-delay:.15s}.tag:nth-child(3){animation-delay:.25s}.tag:nth-child(4){animation-delay:.35s}.tag:nth-child(5){animation-delay:.45s}
    .tag::before{content:'';display:inline-block;width:6px;height:6px;background:#fff;margin-right:8px;vertical-align:middle;animation:blink 1.2s steps(1) infinite}
    .tag:nth-child(2)::before{animation-delay:.2s}.tag:nth-child(3)::before{animation-delay:.4s}
    @keyframes pop{to{opacity:1;transform:none}}
    @keyframes blink{50%{opacity:.2}}`,
    body: `<div><p class="kicker">Animated entry</p><div class="tags"><span class="tag">Pulse</span><span class="tag">Stagger</span><span class="tag">Signal</span><span class="tag">Live</span><span class="tag">Sync</span></div></div>`,
  }),
};

// Alias early slug colored-tags → color-tags recipe
RECIPES['colored-tags'] = RECIPES['color-tags'];

function extractTagDesc(slug) {
  if (!slug.startsWith('tags-')) return null;
  return slug.replace(/^tags-/, '').replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractTagDesc };
