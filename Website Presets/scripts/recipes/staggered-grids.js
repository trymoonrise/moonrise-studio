'use strict';

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const base = 'font-family:"DM Sans",system-ui,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.tile,.cell,.brick,.module,.card,.panel{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}}';

/** Extreme modern staggered grids — experimental animation presets */
const RECIPES = {
  // ── Core / upgrades ──────────────────────────────────────────
  'staggered-grid': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#050505;color:#fff;${base};padding:clamp(1.25rem,4vw,3rem);overflow-x:hidden}${reduced}
    .stage{width:min(1120px,100%);margin:0 auto;position:relative}
    .intro{display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;margin-bottom:clamp(1.5rem,4vw,2.75rem)}
    h1{margin:0;${display};font-size:clamp(2.8rem,9vw,6.5rem);font-weight:800;letter-spacing:-.07em;line-height:.85;max-width:9ch}
    h1 span{display:inline-block;opacity:0;transform:translateY(40px);animation:up .7s cubic-bezier(.16,1,.3,1) forwards}
    h1 span:nth-child(1){animation-delay:.05s}h1 span:nth-child(2){animation-delay:.12s}h1 span:nth-child(3){animation-delay:.19s}
    .intro p{margin:0;max-width:22ch;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#666;opacity:0;animation:up .7s .35s forwards}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:clamp(64px,8vw,110px);gap:10px;perspective:1400px}
    .tile{position:relative;overflow:hidden;background:#111;border:1px solid #1a1a1a;opacity:0;transform:translateY(60px) rotateX(18deg) scale(.9);transform-origin:center bottom;animation:arrive .9s cubic-bezier(.16,1,.3,1) forwards;isolation:isolate}
    .tile::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent 50%);opacity:0;transition:opacity .4s;z-index:2;pointer-events:none}
    .tile::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.75));opacity:0;transition:opacity .4s;z-index:1;pointer-events:none}
    .tile img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) contrast(1.1);transform:scale(1.2);transition:transform 1s cubic-bezier(.16,1,.3,1),filter .5s}
    .meta{position:absolute;z-index:3;left:1rem;right:1rem;bottom:.85rem;display:flex;justify-content:space-between;align-items:end;opacity:0;transform:translateY(14px);transition:opacity .4s,transform .5s cubic-bezier(.16,1,.3,1)}
    .meta strong{${display};font-size:clamp(1rem,2vw,1.5rem);font-weight:700;letter-spacing:-.03em}
    .meta span{font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:#aaa}
    .tile:hover{z-index:4;border-color:#333}.tile:hover::before,.tile:hover::after{opacity:1}.tile:hover img{transform:scale(1);filter:grayscale(0) contrast(1)}.tile:hover .meta{opacity:1;transform:none}
    .tile:nth-child(1){grid-column:span 5;grid-row:span 3;animation-delay:.08s}
    .tile:nth-child(2){grid-column:span 3;grid-row:span 2;animation-delay:.16s}
    .tile:nth-child(3){grid-column:span 4;grid-row:span 3;animation-delay:.24s}
    .tile:nth-child(4){grid-column:span 3;grid-row:span 3;animation-delay:.32s}
    .tile:nth-child(5){grid-column:span 2;grid-row:span 2;animation-delay:.4s}
    .tile:nth-child(6){grid-column:span 4;grid-row:span 2;animation-delay:.48s}
    .tile:nth-child(7){grid-column:span 3;grid-row:span 3;animation-delay:.56s}
    .tile:nth-child(8){grid-column:span 5;grid-row:span 2;animation-delay:.64s}
    .tile:nth-child(9){grid-column:span 4;grid-row:span 3;animation-delay:.72s}
    .tile:nth-child(10){grid-column:span 3;grid-row:span 2;animation-delay:.8s}
    @keyframes up{to{opacity:1;transform:none}}
    @keyframes arrive{to{opacity:1;transform:none}}
    @media(max-width:720px){.intro{flex-direction:column;align-items:flex-start}.grid{grid-template-columns:1fr 1fr;grid-auto-rows:140px}.tile:nth-child(n){grid-column:span 1;grid-row:span 1}.tile:nth-child(1),.tile:nth-child(4),.tile:nth-child(9){grid-column:span 2}}`,
    body: `<div class="stage"><header class="intro"><h1><span>Visual</span> <span>rhythm</span><span>.</span></h1><p>Extreme stagger. Monochrome frames. Kinetic entry.</p></header>
    <main class="grid">
      <figure class="tile"><img src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80" alt=""><figcaption class="meta"><strong>Form</strong><span>01</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80" alt=""><figcaption class="meta"><strong>Still</strong><span>02</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=80" alt=""><figcaption class="meta"><strong>Edge</strong><span>03</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?auto=format&fit=crop&w=900&q=80" alt=""><figcaption class="meta"><strong>Rise</strong><span>04</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=700&q=80" alt=""><figcaption class="meta"><strong>Make</strong><span>05</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=80" alt=""><figcaption class="meta"><strong>Void</strong><span>06</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80" alt=""><figcaption class="meta"><strong>Grid</strong><span>07</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1100&q=80" alt=""><figcaption class="meta"><strong>Path</strong><span>08</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80" alt=""><figcaption class="meta"><strong>Space</strong><span>09</span></figcaption></figure>
      <figure class="tile"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80" alt=""><figcaption class="meta"><strong>Room</strong><span>10</span></figcaption></figure>
    </main></div>`,
  }),

  'staggered-grid-masonry-lift': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#0a0a0a;color:#fff;${base};padding:clamp(1.5rem,4vw,3rem)}${reduced}
    .wrap{width:min(1080px,100%);margin:0 auto}
    .head{display:flex;justify-content:space-between;align-items:end;gap:1.5rem;margin-bottom:2rem}
    h1{margin:0;${display};font-size:clamp(2.4rem,7vw,5.5rem);font-weight:800;letter-spacing:-.08em;line-height:.88}
    .head p{margin:0;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:#555;max-width:16ch;text-align:right}
    .grid{columns:4 200px;column-gap:14px}
    .brick{break-inside:avoid;margin:0 0 14px;min-height:var(--h);padding:1.25rem;background:var(--bg);color:var(--fg,#fff);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.06);opacity:0;transform:translateY(80px) scale(.88);filter:blur(8px);animation:lift .85s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*75ms);cursor:default;transition:transform .35s cubic-bezier(.16,1,.3,1)}
    .brick::before{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,.12),transparent 45%);pointer-events:none}
    .brick::after{content:attr(data-n);position:absolute;right:.9rem;top:.75rem;font-size:.6rem;letter-spacing:.14em;opacity:.35}
    .brick b{position:relative;${display};display:block;font-size:clamp(1.3rem,3vw,2.4rem);font-weight:800;letter-spacing:-.06em}
    .brick span{position:relative;display:block;margin-top:.4rem;font-size:.75rem;opacity:.5}
    .brick:hover{transform:translateY(-10px) scale(1.02)!important}
    @keyframes lift{to{opacity:1;transform:none;filter:none}}
    @media(max-width:640px){.grid{columns:2 140px}}`,
    body: `<main class="wrap"><div class="head"><h1>Masonry<br>lift</h1><p>Height variance. Blur rise. Hard stagger.</p></div>
    <section class="grid">
      <article class="brick" data-n="01" style="--i:1;--h:280px;--bg:#111"><b>North</b><span>Large story block</span></article>
      <article class="brick" data-n="02" style="--i:2;--h:160px;--bg:#fff;--fg:#111"><b>Heat</b><span>Short brief</span></article>
      <article class="brick" data-n="03" style="--i:3;--h:220px;--bg:#1a1a1a"><b>Field</b><span>Research</span></article>
      <article class="brick" data-n="04" style="--i:4;--h:320px;--bg:#222"><b>Ocean</b><span>Deep module</span></article>
      <article class="brick" data-n="05" style="--i:5;--h:180px;--bg:#e8e8e8;--fg:#111"><b>Paper</b><span>Light card</span></article>
      <article class="brick" data-n="06" style="--i:6;--h:250px;--bg:#0f0f0f"><b>Void</b><span>Negative space</span></article>
      <article class="brick" data-n="07" style="--i:7;--h:170px;--bg:#333"><b>Pulse</b><span>Accent note</span></article>
      <article class="brick" data-n="08" style="--i:8;--h:200px;--bg:#f5f5f5;--fg:#111"><b>Signal</b><span>White out</span></article>
    </section></main>`,
  }),

  'staggered-grid-command-center': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#030303;color:#eaeaea;${base};padding:clamp(1.25rem,3vw,2.5rem);display:grid;place-items:center}${reduced}
    .dash{width:min(1100px,100%);position:relative}
    .dash::before{content:'';position:absolute;inset:-1px;border:1px solid #1a1a1a;pointer-events:none;animation:frameIn .8s .2s both}
    .bar{display:flex;justify-content:space-between;align-items:center;padding:.85rem 1rem;border-bottom:1px solid #1a1a1a;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .bar .live{display:flex;align-items:center;gap:.4rem;color:#fff}
    .bar .live i{width:6px;height:6px;border-radius:50%;background:#fff;animation:blink 1.2s steps(1) infinite}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:78px;gap:8px;padding:1rem}
    .module{grid-column:span var(--c);grid-row:span var(--r);background:#0c0c0c;border:1px solid #1c1c1c;padding:1rem 1.1rem;position:relative;overflow:hidden;opacity:0;transform:scale(.92) translateY(20px);animation:boot .55s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*55ms)}
    .module.hot{background:#111;border-color:#333}
    .module b{display:block;${display};font-size:clamp(1.2rem,3vw,2.2rem);font-weight:800;letter-spacing:-.05em}
    .module span{display:block;margin-top:.3rem;color:#555;font-size:.72rem}
    .meter{position:absolute;left:1rem;right:1rem;bottom:.85rem;height:2px;background:#1a1a1a;overflow:hidden}
    .meter i{display:block;height:100%;width:0;background:#fff;animation:fill .9s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*55ms + .35s)}
    .scan{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#fff,transparent);opacity:.25;animation:scan 3s linear infinite;top:0;pointer-events:none}
    @keyframes boot{to{opacity:1;transform:none}}
    @keyframes fill{to{width:var(--w)}}
    @keyframes scan{to{top:100%}}
    @keyframes blink{50%{opacity:.2}}
    @keyframes frameIn{from{opacity:0}to{opacity:1}}
    @media(max-width:720px){.grid{grid-template-columns:1fr 1fr;grid-auto-rows:110px}.module{grid-column:span 1!important;grid-row:span 1!important}}`,
    body: `<main class="dash"><div class="bar"><span>Command // GRID-07</span><span class="live"><i></i> Systems live</span></div>
    <div class="scan" aria-hidden="true"></div>
    <section class="grid">
      <article class="module hot" style="--i:1;--c:5;--r:2;--w:82%"><b>Production</b><span>Global edge status</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:2;--c:3;--r:1;--w:64%"><b>CPU</b><span>Load avg</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:3;--c:4;--r:1;--w:91%"><b>Deploys</b><span>Pipeline</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:4;--c:2;--r:2;--w:45%"><b>Cache</b><span>Hit ratio</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:5;--c:5;--r:1;--w:76%"><b>Traffic</b><span>Normal curve</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:6;--c:5;--r:1;--w:58%"><b>Regions</b><span>19 online</span><div class="meter"><i></i></div></article>
      <article class="module hot" style="--i:7;--c:4;--r:1;--w:95%"><b>Latency</b><span>p99 · 42ms</span><div class="meter"><i></i></div></article>
      <article class="module" style="--i:8;--c:4;--r:1;--w:33%"><b>Errors</b><span>0.02%</span><div class="meter"><i></i></div></article>
    </section></main>`,
  }),

  'staggered-grid-luxury-cards': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#0c0c0c;color:#f2f2f2;${base};padding:clamp(1.5rem,4vw,3rem);display:grid;place-items:center}${reduced}
    .wrap{width:min(1040px,100%)}
    h1{margin:0 0 1.75rem;${display};font-size:clamp(2.8rem,8vw,6rem);font-weight:800;letter-spacing:-.08em;line-height:.85}
    h1 em{font-style:normal;color:#666}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;perspective:1200px}
    .card{min-height:250px;padding:1.4rem;background:#111;border:1px solid #222;position:relative;overflow:hidden;opacity:0;transform:translateY(50px) rotateX(14deg);animation:deal .85s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*95ms)}
    .card.wide{grid-column:span 2}
    .card.light{background:#f4f4f4;color:#111;border-color:#ddd}
    .card::before{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.15) 50%,transparent 70%);transform:translateX(-130%);animation:glint 1.1s ease-out forwards;animation-delay:calc(var(--i)*95ms + .4s)}
    .card::after{content:'';position:absolute;left:0;top:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,#fff,transparent);opacity:.2}
    .card b{position:relative;${display};display:block;font-size:clamp(1.5rem,4vw,2.8rem);font-weight:800;letter-spacing:-.05em;line-height:.95}
    .card span{position:absolute;left:1.4rem;bottom:1.25rem;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;opacity:.45}
    .card:hover{border-color:#555;transform:translateY(-6px)!important;transition:transform .3s,border-color .3s}
    @keyframes deal{to{opacity:1;transform:none}}
    @keyframes glint{to{transform:translateX(130%)}}
    @media(max-width:720px){.grid{grid-template-columns:1fr}.card.wide{grid-column:auto}}`,
    body: `<main class="wrap"><h1>Private<br><em>collection</em></h1>
    <section class="grid">
      <article class="card wide" style="--i:1"><b>Atelier</b><span>Limited edition</span></article>
      <article class="card light" style="--i:2"><b>No. 12</b><span>Material study</span></article>
      <article class="card" style="--i:3"><b>Maison</b><span>Archive</span></article>
      <article class="card" style="--i:4"><b>Reserve</b><span>Object index</span></article>
      <article class="card wide light" style="--i:5"><b>Signature</b><span>Foil reveal</span></article>
      <article class="card" style="--i:6"><b>Void</b><span>Negative</span></article>
    </section></main>`,
  }),

  'staggered-grid-magnetic-tiles': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;background:#060606;color:#fff;${base};padding:clamp(1rem,3vw,2rem)}${reduced}
    .wrap{width:min(960px,100%);position:relative}
    .head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}
    h1{margin:0;${display};font-size:clamp(2.2rem,7vw,5rem);font-weight:800;letter-spacing:-.07em;line-height:.88}
    .hint{margin:0;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:#555}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;perspective:1100px}
    .tile{position:relative;height:200px;overflow:hidden;background:#0e0e0e;border:1px solid #1c1c1c;transform-style:preserve-3d;
      transform:translate3d(var(--tx,0),var(--ty,0),var(--tz,0)) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
      opacity:0;animation:enter .7s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*60ms);will-change:transform}
    .tile::before{content:'';position:absolute;width:180px;height:180px;border-radius:50%;left:var(--gx,50%);top:var(--gy,50%);translate:-50% -50%;background:#fff;filter:blur(50px);opacity:var(--glow,.08);pointer-events:none}
    .idx{position:absolute;left:1rem;top:.85rem;font-size:.58rem;letter-spacing:.16em;color:#444;transform:translateZ(20px)}
    .label{position:absolute;left:1rem;bottom:.9rem;${display};font-size:clamp(1.1rem,2.5vw,1.5rem);font-weight:700;letter-spacing:-.03em;transform:translateZ(28px)}
    .dot{position:absolute;right:1rem;top:1rem;width:6px;height:6px;border-radius:50%;background:#fff;opacity:.5;transform:translateZ(20px)}
    @keyframes enter{to{opacity:1}}
    @media(max-width:640px){.grid{grid-template-columns:1fr 1fr}.tile{height:150px}}`,
    body: `<div class="wrap"><div class="head"><h1>Magnetic<br>field</h1><p class="hint">Move cursor</p></div>
    <section class="grid" id="g">
      ${['Polar','Drift','Force','Pull','Orbit','Charge','Flux','Spin','Core'].map((t,i)=>`<div class="tile" style="--i:${i+1}" data-i="${i}"><span class="idx">0${i+1}</span><span class="label">${t}</span><i class="dot"></i></div>`).join('')}
    </section></div>`,
    script: `const g=document.getElementById('g'),tiles=[...g.querySelectorAll('.tile')];let mx=innerWidth/2,my=innerHeight/2;
    addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
    function frame(){const gr=g.getBoundingClientRect(),cx=gr.left+gr.width/2,cy=gr.top+gr.height/2;
      tiles.forEach(t=>{const r=t.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2;
        const dx=(mx-tx)/gr.width,dy=(my-ty)/gr.height,dist=Math.hypot(mx-tx,my-ty),prox=Math.max(0,1-dist/420);
        t.style.setProperty('--tx',(dx*18*prox)+'px');t.style.setProperty('--ty',(dy*18*prox)+'px');
        t.style.setProperty('--tz',(prox*40)+'px');t.style.setProperty('--rx',(-dy*12*prox)+'deg');t.style.setProperty('--ry',(dx*14*prox)+'deg');
        t.style.setProperty('--gx',((mx-r.left)/r.width*100)+'%');t.style.setProperty('--gy',((my-r.top)/r.height*100)+'%');
        t.style.setProperty('--glow',(.08+prox*.22).toFixed(3));
      });requestAnimationFrame(frame);}frame();`,
  }),

  // ── New insane grids ─────────────────────────────────────────
  'staggered-grid-shatter-assemble': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#050505;color:#fff;${base};padding:2rem;display:grid;place-items:center;overflow:hidden}${reduced}
    .wrap{width:min(900px,100%)}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2.2rem,6vw,4.5rem);font-weight:800;letter-spacing:-.07em}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .cell{aspect-ratio:1;background:var(--bg,#151515);border:1px solid #222;display:grid;place-items:center;${display};font-size:clamp(1.2rem,3vw,2rem);font-weight:800;opacity:0;
      --sx:var(--ox,0px);--sy:var(--oy,0px);--sr:var(--or,0deg);
      transform:translate(var(--sx),var(--sy)) rotate(var(--sr)) scale(.4);filter:blur(6px);
      animation:snap .9s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*70ms)}
    .cell:nth-child(odd){--bg:#fff;color:#111}
    @keyframes snap{to{opacity:1;transform:none;filter:none}}
    @media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)}}`,
    body: `<main class="wrap"><h1>Shatter → assemble</h1><section class="grid" id="g"></section></main>`,
    script: `const g=document.getElementById('g'),labels=['A1','B2','C3','D4','E5','F6','G7','H8','I9','J0','K1','L2'];
    labels.forEach((t,i)=>{const el=document.createElement('div');el.className='cell';el.textContent=t;el.style.setProperty('--i',i+1);
      el.style.setProperty('--ox',((Math.random()-.5)*600)+'px');el.style.setProperty('--oy',((Math.random()-.5)*500)+'px');
      el.style.setProperty('--or',((Math.random()-.5)*120)+'deg');g.appendChild(el);});`,
  }),

  'staggered-grid-vortex-spiral': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#080808;color:#fff;${base};display:grid;place-items:center;overflow:hidden;padding:2rem}${reduced}
    .wrap{width:min(880px,100%);text-align:center}
    h1{margin:0 0 .4rem;${display};font-size:clamp(2rem,6vw,4rem);font-weight:800;letter-spacing:-.06em}
    p{margin:0 0 2rem;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:#555}
    .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;perspective:900px}
    .tile{aspect-ratio:1;background:#111;border:1px solid #1e1e1e;opacity:0;transform:rotate(var(--a)) translateY(var(--d)) scale(.2);animation:vortex .95s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*55ms)}
    .tile span{display:grid;place-items:center;height:100%;${display};font-weight:700;font-size:.85rem;opacity:.4}
    @keyframes vortex{to{opacity:1;transform:none}}
    @media(max-width:560px){.grid{grid-template-columns:repeat(3,1fr)}}`,
    body: `<main class="wrap"><h1>Vortex spiral</h1><p>From chaos orbit to grid lock</p><section class="grid" id="g"></section></main>`,
    script: `const g=document.getElementById('g');for(let i=0;i<15;i++){const t=document.createElement('div');t.className='tile';t.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span>';
      t.style.setProperty('--i',i+1);t.style.setProperty('--a',(i*48-180)+'deg');t.style.setProperty('--d',(180+i*12)+'px');g.appendChild(t);}`,
  }),

  'staggered-grid-glitch-slice': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#000;color:#fff;${base};padding:2rem;display:grid;place-items:center}${reduced}
    .wrap{width:min(920px,100%)}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2.2rem,6vw,4.2rem);font-weight:800;letter-spacing:-.06em;position:relative}
    h1::before,h1::after{content:attr(data-t);position:absolute;left:0;top:0;opacity:.5}
    h1::before{color:#fff;clip-path:inset(0 0 55% 0);transform:translate(-3px,0);animation:gl 2.5s infinite}
    h1::after{clip-path:inset(55% 0 0 0);transform:translate(3px,0);animation:gl 2.5s infinite reverse}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .panel{min-height:160px;background:#0d0d0d;border:1px solid #1a1a1a;padding:1.25rem;position:relative;overflow:hidden;opacity:0;clip-path:inset(50% 0 50% 0);animation:slice .7s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*80ms)}
    .panel::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.03) 2px,rgba(255,255,255,.03) 4px);pointer-events:none}
    .panel b{${display};font-size:1.4rem;font-weight:800;letter-spacing:-.03em}
    .panel span{display:block;margin-top:.4rem;font-size:.75rem;color:#666}
    @keyframes slice{to{opacity:1;clip-path:inset(0)}}
    @keyframes gl{0%,90%,100%{transform:translate(0)}92%{transform:translate(-4px,1px)}96%{transform:translate(3px,-1px)}}
    @media(max-width:560px){.grid{grid-template-columns:1fr}}`,
    body: `<main class="wrap"><h1 data-t="Glitch slice">Glitch slice</h1>
    <section class="grid">
      ${[['SYNC','Channel A'],['OFFSET','Channel B'],['NOISE','Channel C'],['FRAME','Drop'],['LOCK','Stabilized'],['RAW','Feed']].map((x,i)=>`<article class="panel" style="--i:${i+1}"><b>${x[0]}</b><span>${x[1]}</span></article>`).join('')}
    </section></main>`,
  }),

  'staggered-grid-elastic-rubber': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#f2f2f2;color:#111;${base};padding:2rem;display:grid;place-items:center}${reduced}
    .wrap{width:min(900px,100%)}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2.4rem,7vw,5rem);font-weight:800;letter-spacing:-.08em;line-height:.9}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .cell{aspect-ratio:1.1;background:#111;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding:1rem;opacity:0;transform:scale(0);animation:rubber .9s cubic-bezier(.34,1.56,.64,1) forwards;animation-delay:calc(var(--i)*70ms)}
    .cell:nth-child(3n){background:#fff;color:#111;border:2px solid #111}
    .cell b{${display};font-size:1.3rem;font-weight:800;letter-spacing:-.04em}
    .cell span{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;opacity:.5;margin-top:.25rem}
    @keyframes rubber{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
    @media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)}}`,
    body: `<main class="wrap"><h1>Elastic<br>rubber</h1>
    <section class="grid">
      ${['Snap','Stretch','Bounce','Spring','Pull','Release','Tension','Kick'].map((t,i)=>`<div class="cell" style="--i:${i+1}"><b>${t}</b><span>0${i+1}</span></div>`).join('')}
    </section></main>`,
  }),

  'staggered-grid-hypercube-warp': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#040404;color:#fff;${base};display:grid;place-items:center;overflow:hidden;padding:2rem}${reduced}
    .wrap{width:min(860px,100%);perspective:1400px}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2rem,6vw,3.8rem);font-weight:800;letter-spacing:-.06em;text-align:center}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;transform-style:preserve-3d;transform:rotateX(18deg) rotateY(-12deg);animation:settle 1.4s cubic-bezier(.16,1,.3,1) forwards}
    .face{min-height:150px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.12);padding:1.2rem;opacity:0;transform:translateZ(-120px) scale(.7);animation:pop .8s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*90ms);position:relative}
    .face b{${display};font-size:1.4rem;font-weight:800}
    .face span{display:block;margin-top:.35rem;font-size:.7rem;color:#666}
    .face::after{content:'';position:absolute;inset:0;border:1px solid rgba(255,255,255,.05);transform:translateZ(12px);pointer-events:none}
    @keyframes pop{to{opacity:1;transform:translateZ(0) scale(1)}}
    @keyframes settle{to{transform:rotateX(8deg) rotateY(-6deg)}}
    @media(max-width:560px){.grid{grid-template-columns:1fr;transform:none}}`,
    body: `<main class="wrap"><h1>Hypercube warp</h1>
    <section class="grid">
      ${[['X','Axis lock'],['Y','Depth fold'],['Z','Z-index'],['W','4th dim'],['UV','Map warp'],['QR','Code plane']].map((x,i)=>`<div class="face" style="--i:${i+1}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}
    </section></main>`,
  }),

  'staggered-grid-ink-flood': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#f7f7f7;color:#111;${base};padding:2rem;display:grid;place-items:center}${reduced}
    .wrap{width:min(940px,100%)}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2.4rem,7vw,5rem);font-weight:800;letter-spacing:-.08em}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .cell{min-height:180px;position:relative;overflow:hidden;border:1px solid #ddd;background:#fff}
    .fill{position:absolute;inset:0;background:#111;transform:scaleY(0);transform-origin:bottom;animation:flood .7s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*85ms)}
    .cell:nth-child(even) .fill{transform-origin:top;background:#222}
    .copy{position:relative;z-index:1;padding:1.25rem;height:100%;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;opacity:0;animation:fade .5s ease forwards;animation-delay:calc(var(--i)*85ms + .45s)}
    .copy b{${display};font-size:1.5rem;font-weight:800;letter-spacing:-.04em}
    .copy span{font-size:.7rem;opacity:.55;margin-top:.3rem}
    @keyframes flood{to{transform:scaleY(1)}}
    @keyframes fade{to{opacity:1}}
    @media(max-width:560px){.grid{grid-template-columns:1fr}}`,
    body: `<main class="wrap"><h1>Ink flood</h1>
    <section class="grid">
      ${[['Bleed','From the edge'],['Pool','Collects'],['Dry','Settles'],['Mark','Permanent'],['Spill','Overflow'],['Stain','Archive']].map((x,i)=>`<article class="cell" style="--i:${i+1}"><div class="fill" aria-hidden="true"></div><div class="copy"><b>${x[0]}</b><span>${x[1]}</span></div></article>`).join('')}
    </section></main>`,
  }),

  'staggered-grid-quantum-blink': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#030303;color:#fff;${base};padding:2rem;display:grid;place-items:center}${reduced}
    .wrap{width:min(880px,100%)}
    h1{margin:0 0 .5rem;${display};font-size:clamp(2.2rem,6vw,4.2rem);font-weight:800;letter-spacing:-.06em}
    p{margin:0 0 1.75rem;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#444}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .q{aspect-ratio:1;background:#101010;border:1px solid #1a1a1a;display:grid;place-items:center;${display};font-weight:800;font-size:clamp(1rem,2.5vw,1.6rem);opacity:0;filter:brightness(3);transform:scale(1.4);
      animation:blink .15s steps(1) calc(var(--i)*90ms) 3,hold .01s calc(var(--i)*90ms + .5s) forwards}
    @keyframes blink{0%{opacity:0}50%{opacity:1}100%{opacity:0}}
    @keyframes hold{to{opacity:1;filter:none;transform:none}}
    @media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)}}`,
    body: `<main class="wrap"><h1>Quantum blink</h1><p>Teleport into existence</p>
    <section class="grid">
      ${['Ψ','φ','λ','Ω','Δ','Σ','π','θ','μ','ρ','τ','ξ'].map((t,i)=>`<div class="q" style="--i:${i+1}">${t}</div>`).join('')}
    </section></main>`,
  }),

  'staggered-grid-kinetic-type': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#0a0a0a;color:#fff;${base};padding:2rem;display:grid;place-items:center;overflow:hidden}${reduced}
    .wrap{width:min(960px,100%)}
    .eyebrow{font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#555;margin-bottom:1rem}
    .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
    .letter{aspect-ratio:.75;background:#111;border:1px solid #1c1c1c;display:grid;place-items:center;${display};font-size:clamp(1.4rem,4vw,2.8rem);font-weight:800;letter-spacing:-.04em;
      opacity:0;transform:translateY(100%) rotateX(-90deg);transform-origin:bottom;animation:rise .65s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*55ms)}
    .letter.space{background:transparent;border:none}
    .letter.accent{background:#fff;color:#111}
    @keyframes rise{to{opacity:1;transform:none}}
    @media(max-width:560px){.grid{grid-template-columns:repeat(4,1fr)}}`,
    body: `<main class="wrap"><p class="eyebrow">Kinetic type matrix</p>
    <section class="grid" id="g"></section></main>`,
    script: `const word='EXTREME GRID';const g=document.getElementById('g');
    [...word].forEach((ch,i)=>{const el=document.createElement('div');el.className='letter'+(ch===' '?' space':'')+(i%5===0&&ch!==' '?' accent':'');
      el.textContent=ch===' '?'·':ch;el.style.setProperty('--i',i+1);g.appendChild(el);});`,
  }),

  'staggered-grid-zero-gravity': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#070707;color:#fff;${base};padding:2rem;display:grid;place-items:center;overflow:hidden}${reduced}
    .wrap{width:min(900px,100%)}
    h1{margin:0 0 1.5rem;${display};font-size:clamp(2.2rem,6vw,4rem);font-weight:800;letter-spacing:-.07em}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .float{min-height:170px;padding:1.25rem;background:#101010;border:1px solid #1e1e1e;opacity:0;
      transform:translate(var(--fx),var(--fy)) rotate(var(--fr)) scale(.85);
      animation:land 1.1s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i)*100ms)}
    .float b{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em}
    .float span{display:block;margin-top:.4rem;font-size:.75rem;color:#555}
    @keyframes land{0%{opacity:0}40%{opacity:1}100%{opacity:1;transform:none}}
    @media(max-width:560px){.grid{grid-template-columns:1fr}}`,
    body: `<main class="wrap"><h1>Zero gravity</h1>
    <section class="grid">
      <article class="float" style="--i:1;--fx:-40px;--fy:-60px;--fr:-8deg"><b>Drift</b><span>Free float entry</span></article>
      <article class="float" style="--i:2;--fx:50px;--fy:-30px;--fr:6deg"><b>Orbit</b><span>Soft settle</span></article>
      <article class="float" style="--i:3;--fx:20px;--fy:50px;--fr:-4deg"><b>Mass</b><span>Gravity returns</span></article>
      <article class="float" style="--i:4;--fx:-55px;--fy:20px;--fr:10deg"><b>Pull</b><span>Alignment lock</span></article>
      <article class="float" style="--i:5;--fx:35px;--fy:-45px;--fr:-12deg"><b>Dock</b><span>Final position</span></article>
      <article class="float" style="--i:6;--fx:-15px;--fy:40px;--fr:5deg"><b>Rest</b><span>Stillness</span></article>
    </section></main>`,
  }),
};

module.exports = { RECIPES };
