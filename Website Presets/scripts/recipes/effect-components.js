const IMG = '../stock/media/16-9 Aspect Ratio(image).png';
const VID = '../stock/media/16-9 Aspect Ratio(video).mp4';

module.exports = [
  // ── Effects (standalone) ──
  { slug: 'effects-rgb-split', title: 'RGB Split Glitch', category: 'effects', tags: ['effects', 'glitch', 'rgb'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;color:#fff}h1{font-size:clamp(3rem,10vw,6rem);font-weight:900;text-transform:uppercase;position:relative;animation:glitch 2.5s infinite}h1::before,h1::after{content:attr(data-t);position:absolute;inset:0}h1::before{color:#f0f;clip-path:inset(20% 0 55% 0);animation:shift 2s infinite}h1::after{color:#0ff;clip-path:inset(55% 0 15% 0);animation:shift 2.3s infinite reverse}@keyframes shift{33%{transform:translate(-4px,2px)}66%{transform:translate(4px,-2px)}}@keyframes glitch{0%,92%,100%{transform:none}94%{transform:skewX(-3deg)}96%{transform:skewX(3deg)}}`,
    body: `<h1 data-t="GLITCH">GLITCH</h1>` },

  { slug: 'effects-scanline-overlay', title: 'Scanline Overlay', category: 'effects', tags: ['effects', 'scanline', 'retro'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c;color:#6cffb8;font-family:monospace;position:relative}body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.15) 2px,rgba(0,0,0,.15) 4px);pointer-events:none;z-index:2}body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.4) 100%);pointer-events:none}h1{font-size:2.5rem;position:relative;z-index:1;text-shadow:0 0 20px rgba(108,255,184,.5)}`,
    body: `<h1>SCANLINES</h1>` },

  { slug: 'effects-chromatic-aberration', title: 'Chromatic Aberration', category: 'effects', tags: ['effects', 'chromatic', 'image'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111;padding:2rem}.wrap{position:relative;width:min(420px,90vw);border-radius:12px;overflow:hidden;animation:aberrate 3s ease-in-out infinite}img{width:100%;display:block}.wrap::before,.wrap::after{content:'';position:absolute;inset:0;background:url('${IMG}') center/cover;mix-blend-mode:screen;opacity:.5}.wrap::before{transform:translateX(-3px);filter:sepia(1) hue-rotate(200deg)}.wrap::after{transform:translateX(3px);filter:sepia(1) hue-rotate(-40deg)}@keyframes aberrate{0%,100%{filter:none}50%{filter:contrast(1.1)}}`,
    body: `<div class="wrap"><img src="${IMG}" alt=""></div>` },

  { slug: 'effects-noise-flicker', title: 'Noise Flicker', category: 'effects', tags: ['effects', 'noise', 'film'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#1a1a2e;color:#fff;position:relative}body::before{content:'';position:fixed;inset:0;opacity:.08;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:flicker .15s steps(2) infinite}h1{font-size:2.5rem;position:relative;z-index:1}@keyframes flicker{50%{opacity:.12}}`,
    body: `<h1>Film Grain</h1>` },

  { slug: 'effects-holographic-shine', title: 'Holographic Shine', category: 'effects', tags: ['effects', 'holographic', 'shine'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}.card{width:280px;height:160px;border-radius:16px;background:linear-gradient(135deg,#1a1a2e,#2a2a4e);position:relative;overflow:hidden;display:grid;place-items:center;color:#fff;font-weight:700}.card::before{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent,rgba(108,140,255,.4),rgba(255,108,176,.4),transparent);animation:spin 4s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`,
    body: `<div class="card"><span style="position:relative;z-index:1">Holographic</span></div>` },

  { slug: 'effects-liquid-distortion', title: 'Liquid Distortion', category: 'effects', tags: ['effects', 'liquid', 'svg'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;padding:2rem}.blob{width:min(320px,80vw);aspect-ratio:1;border-radius:40% 60% 70% 30%/40% 50% 60% 50%;background:linear-gradient(135deg,#6c8cff,#ff6cb0);filter:blur(0);animation:morph 6s ease-in-out infinite;display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.5rem}@keyframes morph{0%,100%{border-radius:40% 60% 70% 30%/40% 50% 60% 50%;transform:rotate(0deg)}50%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%;transform:rotate(180deg) scale(1.05)}}`,
    body: `<div class="blob">LIQUID</div>` },

  { slug: 'effects-pixelate-hover', title: 'Pixelate on Hover', category: 'effects', tags: ['effects', 'pixel', 'hover'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa;padding:2rem}.box{width:240px;height:160px;border-radius:12px;overflow:hidden;cursor:pointer}img{width:100%;height:100%;object-fit:cover;transition:filter .3s,transform .3s}.box:hover img{filter:pixelate(8);transform:scale(1.05)}@supports not (filter:pixelate(8)){.box:hover img{filter:blur(2px) contrast(1.4);image-rendering:pixelated}}`,
    body: `<div class="box"><img src="${IMG}" alt=""></div>` },

  { slug: 'effects-vhs-tracking', title: 'VHS Tracking', category: 'effects', tags: ['effects', 'vhs', 'retro'],
    style: `body{margin:0;min-height:100vh;background:#111;overflow:hidden;position:relative}video{width:100%;height:100vh;object-fit:cover;filter:saturate(.7) contrast(1.1)}.vhs{position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.1) 0 1px,transparent 1px 3px);animation:track 4s linear infinite}@keyframes track{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}`,
    body: `<video src="${VID}" autoplay muted loop playsinline></video><div class="vhs"></div>` },

  { slug: 'effects-spotlight-reveal', title: 'Spotlight Reveal', category: 'effects', tags: ['effects', 'spotlight', 'reveal'],
    style: `body{margin:0;min-height:100vh;background:#000;cursor:none}.bg{position:fixed;inset:0;background:url('${IMG}') center/cover;filter:brightness(.25)}.spot{position:fixed;width:200px;height:200px;border-radius:50%;background:url('${IMG}') center/cover;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 60px 20px rgba(0,0,0,.8)}`,
    body: `<div class="bg"></div><div class="spot" id="s"></div>`,
    script: `document.addEventListener('mousemove',e=>{const s=document.getElementById('s');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';});` },

  { slug: 'effects-wave-distort-text', title: 'Wave Distort Text', category: 'effects', tags: ['effects', 'wave', 'text'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#fff}h1{font-size:clamp(2rem,6vw,4rem);font-weight:800;display:flex;gap:2px}h1 span{display:inline-block;animation:wave 1.2s ease-in-out infinite}h1 span:nth-child(2){animation-delay:.1s}h1 span:nth-child(3){animation-delay:.2s}h1 span:nth-child(4){animation-delay:.3s}h1 span:nth-child(5){animation-delay:.4s}h1 span:nth-child(6){animation-delay:.5s}@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`,
    body: `<h1><span>W</span><span>A</span><span>V</span><span>E</span><span>!</span><span>!</span></h1>` },

  { slug: 'effects-prism-border', title: 'Prism Animated Border', category: 'effects', tags: ['effects', 'border', 'gradient'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c;padding:2rem}.box{position:relative;padding:2rem 3rem;border-radius:16px;background:#16161a;color:#fff;font-weight:600}.box::before{content:'';position:absolute;inset:-2px;border-radius:18px;background:linear-gradient(90deg,#6c8cff,#ff6cb0,#6cffb8,#6c8cff);background-size:300%;animation:prism 4s linear infinite;z-index:-1}@keyframes prism{to{background-position:300%}}`,
    body: `<div class="box">Prism Border</div>` },

  { slug: 'effects-matrix-rain-lite', title: 'Matrix Rain Lite', category: 'effects', tags: ['effects', 'matrix', 'canvas'],
    style: `body{margin:0;background:#000;overflow:hidden}canvas{display:block`,
    body: `<canvas id="c"></canvas>`,
    script: `const c=document.getElementById('c'),x=c.getContext('2d');function r(){c.width=innerWidth;c.height=innerHeight;}r();addEventListener('resize',r);const cols=Math.floor(c.width/16),y=Array(cols).fill(0);function d(){x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#0f0';x.font='14px monospace';y.forEach((v,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*16,v);if(v>c.height&&Math.random()>.975)y[i]=0;y[i]+=16;});requestAnimationFrame(d);}d();` },

  // ── Ease-in animations ──
  { slug: 'ease-in-slide-up-fade', title: 'Slide Up Fade Ease', category: 'ease-in', tags: ['ease-in', 'fade', 'slide'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa;padding:2rem}.item{opacity:0;transform:translateY(40px);animation:up .8s cubic-bezier(.16,1,.3,1) forwards;padding:1.5rem 2rem;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);font-size:1.2rem;font-weight:600}@keyframes up{to{opacity:1;transform:translateY(0)}}`,
    body: `<div class="item">Eased entrance</div>` },

  { slug: 'ease-in-rotate-scale', title: 'Rotate Scale Ease', category: 'ease-in', tags: ['ease-in', 'rotate', 'scale'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}.box{width:120px;height:120px;background:linear-gradient(135deg,#6c8cff,#ff6cb0);border-radius:16px;opacity:0;transform:rotate(-15deg) scale(.5);animation:rs .9s cubic-bezier(.34,1.56,.64,1) forwards}@keyframes rs{to{opacity:1;transform:none}}`,
    body: `<div class="box"></div>` },

  { slug: 'ease-in-stagger-list', title: 'Stagger List Ease', category: 'ease-in', tags: ['ease-in', 'stagger', 'list'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}.list{display:flex;flex-direction:column;gap:10px}.item{padding:12px 20px;background:#1a1a2e;border-radius:8px;color:#fff;font-size:.9rem;opacity:0;transform:translateX(-24px);animation:sl .5s cubic-bezier(.16,1,.3,1) forwards}.item:nth-child(1){animation-delay:.05s}.item:nth-child(2){animation-delay:.12s}.item:nth-child(3){animation-delay:.19s}.item:nth-child(4){animation-delay:.26s}.item:nth-child(5){animation-delay:.33s}@keyframes sl{to{opacity:1;transform:none}}`,
    body: `<div class="list"><div class="item">First item</div><div class="item">Second item</div><div class="item">Third item</div><div class="item">Fourth item</div><div class="item">Fifth item</div></div>` },

  { slug: 'ease-in-clip-circle', title: 'Circle Clip Reveal', category: 'ease-in', tags: ['ease-in', 'clip', 'reveal'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#eee}.reveal{width:280px;height:180px;border-radius:12px;background:linear-gradient(135deg,#6c8cff,#764ba2);display:grid;place-items:center;color:#fff;font-weight:700;font-size:1.2rem;clip-path:circle(0% at 50% 50%);animation:clip 1.2s cubic-bezier(.16,1,.3,1) forwards}@keyframes clip{to{clip-path:circle(75% at 50% 50%)}}`,
    body: `<div class="reveal">Revealed</div>` },

  { slug: 'ease-in-blur-stagger', title: 'Blur Stagger Ease', category: 'ease-in', tags: ['ease-in', 'blur', 'stagger'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;color:#fff}.words{display:flex;gap:1rem;font-size:2rem;font-weight:800}.w{opacity:0;filter:blur(12px);animation:bf .7s ease forwards}.w:nth-child(1){animation-delay:.1s}.w:nth-child(2){animation-delay:.25s}.w:nth-child(3){animation-delay:.4s}@keyframes bf{to{opacity:1;filter:blur(0)}}`,
    body: `<div class="words"><span class="w">Blur</span><span class="w">In</span><span class="w">Words</span></div>` },

  { slug: 'ease-in-bounce-cards', title: 'Bounce In Cards', category: 'ease-in', tags: ['ease-in', 'bounce', 'cards'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#f5f5f5;gap:12px;flex-wrap:wrap;padding:2rem}.card{width:100px;height:100px;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08);opacity:0;animation:bnc .6s cubic-bezier(.34,1.56,.64,1) forwards}.card:nth-child(1){animation-delay:.05s}.card:nth-child(2){animation-delay:.12s}.card:nth-child(3){animation-delay:.19s}@keyframes bnc{from{opacity:0;transform:scale(0) translateY(40px)}to{opacity:1;transform:none}}`,
    body: `<div style="display:flex;gap:12px"><div class="card"></div><div class="card"></div><div class="card"></div></div>` },

  { slug: 'ease-in-draw-line', title: 'Draw Line Ease', category: 'ease-in', tags: ['ease-in', 'svg', 'draw'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fff}svg{width:min(300px,80vw)}path{fill:none;stroke:#6c8cff;stroke-width:3;stroke-dasharray:400;stroke-dashoffset:400;animation:draw 2s ease forwards}@keyframes draw{to{stroke-dashoffset:0}}`,
    body: `<svg viewBox="0 0 300 100"><path d="M20,80 Q80,10 150,60 T280,30"/></svg>` },

  { slug: 'ease-in-flip-reveal', title: 'Flip Reveal Ease', category: 'ease-in', tags: ['ease-in', 'flip', '3d'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;perspective:800px}.card{width:200px;height:120px;background:linear-gradient(135deg,#6c8cff,#ff6cb0);border-radius:12px;display:grid;place-items:center;color:#fff;font-weight:700;transform:rotateX(90deg);opacity:0;animation:flip .8s cubic-bezier(.16,1,.3,1) .2s forwards}@keyframes flip{to{transform:none;opacity:1}}`,
    body: `<div class="card">Flip In</div>` },

  // ── Glitch buttons ──
  { slug: 'buttons-glitch-hover', title: 'Glitch Hover Button', category: 'buttons', tags: ['buttons', 'glitch', 'hover'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000}.btn{position:relative;padding:16px 40px;border:2px solid #0f0;background:transparent;color:#0f0;font-family:monospace;font-weight:700;font-size:1rem;cursor:pointer;text-transform:uppercase;overflow:hidden}.btn::before,.btn::after{content:attr(data-t);position:absolute;inset:0;display:grid;place-items:center;opacity:0}.btn:hover::before{color:#f0f;opacity:1;animation:gb .3s;clip-path:inset(30% 0 40% 0)}.btn:hover::after{color:#0ff;opacity:1;animation:gb .3s reverse;clip-path:inset(60% 0 10% 0)}@keyframes gb{0%,100%{transform:translate(0)}50%{transform:translate(-3px,2px)}}`,
    body: `<button class="btn" data-t="Execute">Execute</button>` },

  { slug: 'buttons-tilt-3d', title: '3D Tilt Button', category: 'buttons', tags: ['buttons', 'tilt', '3d'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;perspective:600px}.btn{padding:16px 36px;border:none;border-radius:12px;background:linear-gradient(135deg,#6c8cff,#4a6ae0);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;transition:transform .1s ease-out;box-shadow:0 8px 24px rgba(108,140,255,.3)}`,
    body: `<button class="btn" id="b">Tilt Me</button>`,
    script: `const b=document.getElementById('b');b.onmousemove=e=>{const r=b.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;b.style.transform='rotateY('+x*20+'deg) rotateX('+(-y*20)+'deg)';};b.onmouseleave=()=>b.style.transform='';` },

  { slug: 'buttons-magnetic-pull', title: 'Magnetic Pull Button', category: 'buttons', tags: ['buttons', 'magnetic', 'mouse'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa}.btn{padding:14px 32px;border:none;border-radius:99px;background:#111;color:#fff;font-weight:600;font-size:.95rem;cursor:pointer;transition:transform .15s ease-out}`,
    body: `<button class="btn" id="b">Magnetic</button>`,
    script: `const b=document.getElementById('b');document.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;const dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);if(d<120){b.style.transform='translate('+(dx*.2)+'px,'+(dy*.2)+'px)';}else b.style.transform='';});` },

  { slug: 'buttons-shine-sweep', title: 'Shine Sweep Button', category: 'buttons', tags: ['buttons', 'shine', 'sweep'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}.btn{position:relative;padding:16px 40px;border:none;border-radius:10px;background:#6c8cff;color:#fff;font-weight:700;font-size:1rem;cursor:pointer;overflow:hidden}.btn::after{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-20deg);animation:shine 3s infinite}@keyframes shine{0%{left:-60%}100%{left:140%}}`,
    body: `<button class="btn">Get Started</button>` },

  { slug: 'buttons-ripple-click', title: 'Ripple Click Button', category: 'buttons', tags: ['buttons', 'ripple', 'click'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}.btn{position:relative;padding:16px 36px;border:none;border-radius:8px;background:#1a1a2e;color:#fff;font-weight:600;font-size:1rem;cursor:pointer;overflow:hidden}.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.3);transform:scale(0);animation:rip .6s ease-out;pointer-events:none}@keyframes rip{to{transform:scale(4);opacity:0}}`,
    body: `<button class="btn" id="b">Click Me</button>`,
    script: `document.getElementById('b').onclick=function(e){const r=this.getBoundingClientRect();const d=document.createElement('span');d.className='ripple';d.style.width=d.style.height=Math.max(r.width,r.height)+'px';d.style.left=e.clientX-r.left-d.offsetWidth/2+'px';d.style.top=e.clientY-r.top-d.offsetHeight/2+'px';this.appendChild(d);setTimeout(()=>d.remove(),600);};` },

  { slug: 'buttons-neon-pulse', title: 'Neon Pulse Button', category: 'buttons', tags: ['buttons', 'neon', 'pulse'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c}.btn{padding:16px 40px;border:2px solid #ff6cb0;background:transparent;color:#ff6cb0;font-weight:700;font-size:1rem;cursor:pointer;border-radius:8px;animation:pulse 2s ease infinite;box-shadow:0 0 20px rgba(255,108,176,.3)}@keyframes pulse{0%,100%{box-shadow:0 0 20px rgba(255,108,176,.3)}50%{box-shadow:0 0 40px rgba(255,108,176,.6),0 0 60px rgba(255,108,176,.2)}}`,
    body: `<button class="btn">Neon Pulse</button>` },

  // ── Tilt cards ──
  { slug: 'cards-tilt-parallax', title: 'Tilt Parallax Card', category: 'cards', tags: ['cards', 'tilt', 'parallax'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;perspective:1000px;padding:2rem}.card{width:min(320px,90vw);padding:2rem;border-radius:20px;background:linear-gradient(145deg,#1a1a2e,#2a2a40);border:1px solid rgba(255,255,255,.08);color:#fff;transition:transform .12s ease-out;transform-style:preserve-3d}h3{font-size:1.3rem;margin-bottom:.5rem}.card p{color:#888;font-size:.9rem;transform:translateZ(20px)}`,
    body: `<div class="card" id="c"><h3>Tilt Card</h3><p>Move your cursor to tilt with depth.</p></div>`,
    script: `const c=document.getElementById('c');c.onmousemove=e=>{const r=c.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;c.style.transform='rotateY('+x*16+'deg) rotateX('+(-y*16)+'deg)';};c.onmouseleave=()=>c.style.transform='';` },

  { slug: 'cards-glitch-border', title: 'Glitch Border Card', category: 'cards', tags: ['cards', 'glitch', 'border'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;padding:2rem}.card{width:280px;padding:2rem;border-radius:4px;background:#111;color:#0f0;font-family:monospace;position:relative;border:1px solid #0f0;animation:gb 4s infinite}@keyframes gb{0%,95%,100%{box-shadow:none}96%{box-shadow:4px 0 #f0f,-4px 0 #0ff}98%{box-shadow:-4px 0 #f0f,4px 0 #0ff}}`,
    body: `<div class="card"><strong>SYSTEM</strong><p style="margin-top:.5rem;opacity:.7;font-size:.85rem">Glitching border card</p></div>` },

  { slug: 'cards-hover-lift-blur', title: 'Hover Lift Blur Card', category: 'cards', tags: ['cards', 'hover', 'blur'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#f0f4ff;padding:2rem}.card{width:280px;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.08);transition:transform .3s,box-shadow .3s;cursor:pointer}.card:hover{transform:translateY(-8px);box-shadow:0 20px 40px rgba(108,140,255,.15)}img{width:100%;aspect-ratio:16/10;object-fit:cover;transition:filter .3s}.card:hover img{filter:blur(2px) brightness(.9)}.body{padding:1rem}h3{font-size:1rem}`,
    body: `<div class="card"><img src="${IMG}" alt=""><div class="body"><h3>Lift & Blur</h3></div></div>` },

  { slug: 'cards-shine-flip', title: 'Shine Flip Card', category: 'cards', tags: ['cards', 'flip', 'shine'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111;perspective:800px}.card{width:240px;height:160px;position:relative;transform-style:preserve-3d;transition:transform .6s;cursor:pointer}.card:hover{transform:rotateY(180deg)}.face{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;display:grid;place-items:center;font-weight:700;color:#fff}.front{background:linear-gradient(135deg,#6c8cff,#764ba2)}.back{background:linear-gradient(135deg,#ff6cb0,#6cffb8);transform:rotateY(180deg)}`,
    body: `<div class="card"><div class="face front">Front</div><div class="face back">Back</div></div>` },

  { slug: 'cards-glass-tilt', title: 'Glass Tilt Card', category: 'cards', tags: ['cards', 'glass', 'tilt'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:url('${IMG}') center/cover;perspective:800px;padding:2rem}.card{width:280px;padding:2rem;border-radius:20px;background:rgba(255,255,255,.1);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.2);color:#fff;transition:transform .12s}h3{margin-bottom:.5rem}`,
    body: `<div class="card" id="c"><h3>Glass Tilt</h3><p style="opacity:.8;font-size:.9rem">Frosted glass with mouse tilt.</p></div>`,
    script: `const c=document.getElementById('c');c.onmousemove=e=>{const r=c.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;c.style.transform='rotateY('+x*12+'deg) rotateX('+(-y*12)+'deg)';};c.onmouseleave=()=>c.style.transform='';` },

  { slug: 'cards-rgb-glitch-image', title: 'RGB Glitch Image Card', category: 'cards', tags: ['cards', 'glitch', 'image'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}.card{width:min(300px,90vw);border-radius:12px;overflow:hidden;background:#1a1a2e;cursor:pointer}.thumb{position:relative;aspect-ratio:16/10;overflow:hidden}.thumb img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.card:hover .thumb img{animation:rgb .4s steps(2)}.card:hover .thumb::before,.card:hover .thumb::after{content:'';position:absolute;inset:0;background:url('${IMG}') center/cover;mix-blend-mode:screen;opacity:.6}.card:hover .thumb::before{transform:translateX(-4px);filter:hue-rotate(90deg)}.card:hover .thumb::after{transform:translateX(4px);filter:hue-rotate(-90deg)}@keyframes rgb{50%{transform:translateX(2px)}}.cap{padding:12px;color:#fff;font-size:.9rem;font-weight:600}`,
    body: `<div class="card"><div class="thumb"><img src="${IMG}" alt=""></div><div class="cap">RGB Glitch Hover</div></div>` },

  // ── Text effects ──
  { slug: 'text-glitch-flicker', title: 'Glitch Flicker Text', category: 'text', tags: ['text', 'glitch', 'flicker'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;color:#fff}h1{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;animation:flick 3s infinite}@keyframes flick{0%,97%,100%{opacity:1;text-shadow:none}98%{opacity:.8;text-shadow:2px 0 #f0f,-2px 0 #0ff}99%{opacity:1;text-shadow:-2px 0 #f0f,2px 0 #0ff}}`,
    body: `<h1>FLICKER</h1>` },

  { slug: 'text-scramble-decode', title: 'Scramble Decode Text', category: 'text', tags: ['text', 'scramble', 'decode'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#6c8cff;font-family:monospace;font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700}`,
    body: `<span id="t">DECODING...</span>`,
    script: `const target='HELLO WORLD',chars='!@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZ';let iter=0;const el=document.getElementById('t');const iv=setInterval(()=>{el.textContent=target.split('').map((c,i)=>i<iter?c:chars[Math.floor(Math.random()*chars.length)]).join('');if(++iter>target.length)clearInterval(iv);},50);` },

  { slug: 'text-gradient-animate', title: 'Animated Gradient Text', category: 'text', tags: ['text', 'gradient', 'animate'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c}h1{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;background:linear-gradient(90deg,#6c8cff,#ff6cb0,#6cffb8,#6c8cff);background-size:300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:grad 4s linear infinite}@keyframes grad{to{background-position:300%}}`,
    body: `<h1>Gradient Flow</h1>` },

  { slug: 'text-outline-draw', title: 'Outline Draw Text', category: 'text', tags: ['text', 'outline', 'svg'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}svg{width:min(400px,90vw)}text{fill:none;stroke:#6c8cff;stroke-width:1.5;font-size:48px;font-weight:900;font-family:system-ui,sans-serif;stroke-dasharray:300;stroke-dashoffset:300;animation:draw 2.5s ease forwards}@keyframes draw{to{stroke-dashoffset:0;fill:rgba(108,140,255,.15)}}`,
    body: `<svg viewBox="0 0 400 80"><text x="20" y="55">OUTLINE</text></svg>` },

  { slug: 'text-split-chars', title: 'Split Character Hover', category: 'text', tags: ['text', 'split', 'hover'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa}h1{font-size:3rem;font-weight:800;display:flex;gap:2px;cursor:default}h1 span{display:inline-block;transition:transform .3s cubic-bezier(.34,1.56,.64,1),color .3s}h1 span:hover{transform:translateY(-12px) scale(1.1);color:#6c8cff}`,
    body: `<h1>${'HOVER'.split('').map(c=>`<span>${c}</span>`).join('')}</h1>` },

  { slug: 'text-cursor-trail-words', title: 'Cursor Trail Words', category: 'text', tags: ['text', 'cursor', 'trail'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#fff;font-size:1.5rem;cursor:crosshair}`,
    body: `<p>Move cursor to leave words</p>`,
    script: `const words=['design','build','ship','create'];document.addEventListener('mousemove',e=>{if(Math.random()>.92){const s=document.createElement('span');s.textContent=words[Math.floor(Math.random()*words.length)];s.style.cssText='position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;color:#6c8cff;font-size:12px;font-weight:700;pointer-events:none;animation:fade 1s forwards';document.body.appendChild(s);setTimeout(()=>s.remove(),1000);}});const st=document.createElement('style');st.textContent='@keyframes fade{to{opacity:0;transform:translateY(-20px)}}';document.head.appendChild(st);` },

  // ── Background effects ──
  { slug: 'backgrounds-animated-mesh', title: 'Animated Mesh Background', category: 'backgrounds', tags: ['backgrounds', 'mesh', 'animate'],
    style: require('./backgrounds').RECIPES['animated-mesh']().style,
    body: require('./backgrounds').RECIPES['animated-mesh']().body },

  { slug: 'backgrounds-grid-pulse', title: 'Grid Pulse Background', category: 'backgrounds', tags: ['backgrounds', 'grid', 'pulse'],
    style: require('./backgrounds').RECIPES['grid-pulse']().style,
    body: require('./backgrounds').RECIPES['grid-pulse']().body },

  { slug: 'backgrounds-aurora-drift', title: 'Aurora Drift Background', category: 'backgrounds', tags: ['backgrounds', 'aurora', 'drift'],
    style: require('./backgrounds').RECIPES['aurora-drift']().style,
    body: require('./backgrounds').RECIPES['aurora-drift']().body },

  { slug: 'backgrounds-rain-effect', title: 'Rain Effect Background', category: 'backgrounds', tags: ['backgrounds', 'rain', 'canvas'],
    style: require('./backgrounds').RECIPES['rain-effect']().style,
    body: require('./backgrounds').RECIPES['rain-effect']().body,
    script: require('./backgrounds').RECIPES['rain-effect']().script },

  // ── Image / video effects ──
  { slug: 'images-tilt-depth', title: 'Image Tilt Depth', category: 'images', tags: ['images', 'tilt', 'depth'],
    style: `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;background:#0c0d10}.scene{position:relative;width:min(560px,90vw);aspect-ratio:16/10}.echo{position:absolute;inset:-8%;background:url('${IMG}') center/cover;filter:blur(28px) saturate(1.2);opacity:.45;animation:echo-drift 14s ease-in-out infinite alternate}.window{position:absolute;inset:0;border-radius:20px;overflow:hidden;isolation:isolate;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 30px 80px rgba(0,0,0,.55)}.photo{position:absolute;inset:-18%;background:url('${IMG}') center/cover;animation:ken 18s ease-in-out infinite alternate}.aperture{position:absolute;inset:0;pointer-events:none;z-index:2;animation:focus-wander 12s ease-in-out infinite}.sweep{position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.14) 48%,transparent 62%);background-size:220% 100%;animation:sweep 7s ease-in-out infinite;mix-blend-mode:soft-light;pointer-events:none;z-index:3}@keyframes ken{from{transform:scale(1.05) translate(-2%,1%)}to{transform:scale(1.18) translate(3%,-2%)}}@keyframes echo-drift{from{transform:scale(1.05) translate(-2%,0)}to{transform:scale(1.12) translate(2%,2%)}}@keyframes focus-wander{0%,100%{background:radial-gradient(circle 42% at 32% 38%,transparent 0%,transparent 38%,rgba(8,9,12,.55) 68%,rgba(8,9,12,.82) 100%)}33%{background:radial-gradient(circle 42% at 68% 42%,transparent 0%,transparent 38%,rgba(8,9,12,.55) 68%,rgba(8,9,12,.82) 100%)}66%{background:radial-gradient(circle 42% at 48% 62%,transparent 0%,transparent 38%,rgba(8,9,12,.55) 68%,rgba(8,9,12,.82) 100%)}}@keyframes sweep{0%,100%{background-position:140% 0;opacity:.3}50%{background-position:-40% 0;opacity:.7}}@media(prefers-reduced-motion:reduce){.photo,.echo,.aperture,.sweep{animation:none!important}.photo{transform:scale(1.08)}}`,
    body: `<div class="scene"><div class="echo" aria-hidden="true"></div><div class="window"><div class="photo" role="img" aria-label="Depth window image"></div><div class="aperture" aria-hidden="true"></div><div class="sweep" aria-hidden="true"></div></div></div>` },

  { slug: 'images-glitch-slice', title: 'Glitch Slice Image', category: 'images', tags: ['images', 'glitch', 'slice'],
    style: `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse 70% 55% at 50% 45%,#1a1c24,#07080a 70%);perspective:1100px}.stage{position:relative;width:min(520px,88vw);aspect-ratio:16/10;transform-style:preserve-3d;animation:orbit 10s ease-in-out infinite}.slice{position:absolute;inset:0;background-image:url('${IMG}');background-size:cover;background-position:center;transform-style:preserve-3d}.slice:nth-child(2){clip-path:inset(0 0 87.5% 0);animation:wave-1 5s ease-in-out infinite}.slice:nth-child(3){clip-path:inset(12.5% 0 75% 0);animation:wave-2 5s ease-in-out infinite}.slice:nth-child(4){clip-path:inset(25% 0 62.5% 0);animation:wave-3 5s ease-in-out infinite}.slice:nth-child(5){clip-path:inset(37.5% 0 50% 0);animation:wave-4 5s ease-in-out infinite}.slice:nth-child(6){clip-path:inset(50% 0 37.5% 0);animation:wave-5 5s ease-in-out infinite}.slice:nth-child(7){clip-path:inset(62.5% 0 25% 0);animation:wave-6 5s ease-in-out infinite}.slice:nth-child(8){clip-path:inset(75% 0 12.5% 0);animation:wave-7 5s ease-in-out infinite}.slice:nth-child(9){clip-path:inset(87.5% 0 0 0);animation:wave-8 5s ease-in-out infinite}.glow{position:absolute;inset:10% 5% -5%;background:radial-gradient(ellipse at 50% 100%,rgba(108,140,255,.22),transparent 65%);transform:rotateX(78deg) translateZ(-120px);filter:blur(28px);animation:glow-pulse 5s ease-in-out infinite}@keyframes orbit{0%,100%{transform:rotateY(-22deg) rotateX(12deg)}50%{transform:rotateY(22deg) rotateX(8deg)}}@keyframes wave-1{0%,100%{transform:translateZ(90px)}50%{transform:translateZ(130px) translateX(14px)}}@keyframes wave-2{0%,100%{transform:translateZ(65px)}50%{transform:translateZ(100px) translateX(-10px)}}@keyframes wave-3{0%,100%{transform:translateZ(40px)}50%{transform:translateZ(75px) translateX(12px)}}@keyframes wave-4{0%,100%{transform:translateZ(15px)}50%{transform:translateZ(45px) translateX(-8px)}}@keyframes wave-5{0%,100%{transform:translateZ(-10px)}50%{transform:translateZ(20px) translateX(10px)}}@keyframes wave-6{0%,100%{transform:translateZ(-35px)}50%{transform:translateZ(-5px) translateX(-12px)}}@keyframes wave-7{0%,100%{transform:translateZ(-60px)}50%{transform:translateZ(-30px) translateX(8px)}}@keyframes wave-8{0%,100%{transform:translateZ(-85px)}50%{transform:translateZ(-50px) translateX(-14px)}}@keyframes glow-pulse{0%,100%{opacity:.45}50%{opacity:.9}}@media(prefers-reduced-motion:reduce){.stage,.slice,.glow{animation:none!important}.stage{transform:rotateY(-12deg) rotateX(10deg)}}`,
    body: `<div class="stage" aria-label="3D sliced image"><div class="glow" aria-hidden="true"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div></div>` },

  { slug: 'videos-glitch-overlay', title: 'Glitch Video Overlay', category: 'videos', tags: ['videos', 'glitch', 'overlay'],
    style: `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse 70% 60% at 50% 45%,#14161d,#05060a 75%);perspective:1400px}.mosaic{--cols:6;--rows:4;position:relative;width:min(92vw,960px);aspect-ratio:16/9;display:grid;grid-template-columns:repeat(var(--cols),1fr);grid-template-rows:repeat(var(--rows),1fr);transform-style:preserve-3d;animation:mosaic-orbit 16s ease-in-out infinite;box-shadow:0 40px 120px rgba(0,0,0,.6)}.cell{position:relative;overflow:hidden;transform-style:preserve-3d;transform:translateZ(var(--z,0px));animation:cell-wave 6s ease-in-out infinite;animation-delay:var(--delay,0s);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}.cell video{position:absolute;left:calc(var(--c)*-100%);top:calc(var(--r)*-100%);width:calc(var(--cols)*100%);height:calc(var(--rows)*100%);object-fit:cover;display:block}.cell::after{content:'';position:absolute;inset:0;mix-blend-mode:color;background:var(--tint,transparent);opacity:.35;animation:tint-cycle 8s ease-in-out infinite;animation-delay:var(--delay,0s);pointer-events:none}.cell::before{content:'';position:absolute;inset:0;z-index:2;background:linear-gradient(120deg,transparent 40%,rgba(255,255,255,.5) 50%,transparent 60%);opacity:0;animation:sweep-pass 5s linear infinite;animation-delay:var(--sweep-delay,0s);pointer-events:none}.vignette{position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 55%,rgba(5,6,10,.55));transform:translateZ(60px)}@keyframes mosaic-orbit{0%,100%{transform:rotateX(9deg) rotateY(-12deg)}50%{transform:rotateX(6deg) rotateY(12deg)}}@keyframes cell-wave{0%,100%{transform:translateZ(0px)}50%{transform:translateZ(48px)}}@keyframes tint-cycle{0%,100%{background:rgba(255,0,110,0)}25%{background:rgba(0,240,255,.9)}50%{background:rgba(255,0,110,.9)}75%{background:rgba(124,255,107,.9)}}@keyframes sweep-pass{0%,12%{opacity:0;transform:translateX(-30%)}16%{opacity:.9}24%{opacity:0;transform:translateX(30%)}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.mosaic,.cell,.cell::after,.cell::before{animation:none!important}}`,
    body: `<div class="mosaic" id="mosaic" aria-label="Video time-echo mosaic"><div class="vignette" aria-hidden="true"></div></div>`,
    script: `const SRC='${VID}';const mosaic=document.getElementById('mosaic');const cols=6,rows=4;const tints=['rgba(0,240,255,1)','rgba(255,0,110,1)','rgba(124,255,107,1)','rgba(255,190,80,1)'];const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const cells=[];for(let r=0;r<rows;r+=1){for(let c=0;c<cols;c+=1){const diag=r+c;const cell=document.createElement('div');cell.className='cell';cell.style.setProperty('--c',c);cell.style.setProperty('--r',r);cell.style.setProperty('--z',(diag%4)*12+'px');cell.style.setProperty('--delay',(-diag*0.35)+'s');cell.style.setProperty('--sweep-delay',(diag*0.18)+'s');cell.style.setProperty('--tint',tints[diag%tints.length]);const video=document.createElement('video');video.src=SRC;video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.setAttribute('playsinline','');cell.appendChild(video);video.dataset.offset=(diag*0.14).toFixed(3);video.addEventListener('loadedmetadata',()=>{const off=parseFloat(video.dataset.offset);const d=video.duration||0;if(d>0){try{video.currentTime=(off%d);}catch(e){}}video.play().catch(()=>{});});cells.push(video);mosaic.insertBefore(cell,mosaic.querySelector('.vignette'));}}if(!reduced){setInterval(()=>{cells.forEach((video,i)=>{const d=video.duration||0;if(d>0){const off=(i*0.14)%d;try{video.currentTime=off;}catch(e){}}});},4000);}` },

  { slug: 'videos-ease-fade-in', title: 'Video Ease Fade In', category: 'videos', tags: ['videos', 'ease-in', 'fade'],
    style: `body{margin:0;min-height:100vh;background:#000}video{width:100%;height:100vh;object-fit:cover;opacity:0;animation:vin 1.5s cubic-bezier(.16,1,.3,1) forwards}@keyframes vin{to{opacity:1}}`,
    body: `<video src="${VID}" autoplay muted loop playsinline></video>` },

  // ── Experimental combos ──
  { slug: 'experimental-tilt-glitch-hero', title: 'Tilt Glitch Hero', category: 'experimental', tags: ['experimental', 'tilt', 'glitch'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#000;perspective:800px;padding:2rem}.hero{text-align:center;color:#fff;transition:transform .1s}h1{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;animation:gh 4s infinite}@keyframes gh{0%,94%,100%{text-shadow:none}95%{text-shadow:3px 0 #f0f,-3px 0 #0ff}97%{text-shadow:-3px 0 #f0f,3px 0 #0ff}}p{margin-top:1rem;color:#888}`,
    body: `<div class="hero" id="h"><h1>CHAOS</h1><p>Tilt + glitch combined</p></div>`,
    script: `const h=document.getElementById('h');h.onmousemove=e=>{const r=h.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;h.style.transform='rotateY('+x*10+'deg) rotateX('+(-y*10)+'deg)';};h.onmouseleave=()=>h.style.transform='';` },

  { slug: 'experimental-ease-morph-blob', title: 'Ease Morph Blob', category: 'experimental', tags: ['experimental', 'ease', 'blob'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}.blob{width:200px;height:200px;background:linear-gradient(135deg,#6c8cff,#ff6cb0);border-radius:30% 70% 70% 30%/30% 30% 70% 70%;animation:morph 4s cubic-bezier(.45,0,.55,1) infinite}@keyframes morph{0%,100%{border-radius:30% 70% 70% 30%/30% 30% 70% 70%;transform:rotate(0deg)}50%{border-radius:70% 30% 30% 70%/70% 70% 30% 30%;transform:rotate(180deg)}}`,
    body: `<div class="blob"></div>` },

  { slug: 'experimental-mouse-trail-blur', title: 'Mouse Trail Blur', category: 'experimental', tags: ['experimental', 'mouse', 'trail'],
    style: `body{margin:0;min-height:100vh;background:#0a0a0c;cursor:none;overflow:hidden}`,
    body: ``,
    script: `const trails=[];document.addEventListener('mousemove',e=>{const d=document.createElement('div');d.style.cssText='position:fixed;width:20px;height:20px;border-radius:50%;background:rgba(108,140,255,.5);filter:blur(4px);pointer-events:none;left:'+(e.clientX-10)+'px;top:'+(e.clientY-10)+'px;transition:opacity .6s,transform .6s';document.body.appendChild(d);trails.push(d);if(trails.length>20){const o=trails.shift();o.style.opacity=0;setTimeout(()=>o.remove(),600);}setTimeout(()=>{d.style.opacity=0;d.style.transform='scale(2)';setTimeout(()=>d.remove(),600);},50);});` },

  { slug: 'experimental-split-rgb-text', title: 'Split RGB Text', category: 'experimental', tags: ['experimental', 'rgb', 'text'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111;color:#fff}h1{font-size:4rem;font-weight:900;position:relative}h1::before,h1::after{content:'SPLIT';position:absolute;inset:0}.r{color:#f55;transform:translateX(-3px);mix-blend-mode:screen;position:absolute;inset:0}.b{color:#55f;transform:translateX(3px);mix-blend-mode:screen;position:absolute;inset:0}`,
    body: `<h1>SPLIT<span class="r" aria-hidden="true">SPLIT</span><span class="b" aria-hidden="true">SPLIT</span></h1>` },

  { slug: 'experimental-inertia-tilt-grid', title: 'Inertia Tilt Grid', category: 'experimental', tags: ['experimental', 'tilt', 'inertia'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;perspective:1000px;padding:2rem}.grid{display:grid;grid-template-columns:repeat(3,80px);gap:10px}.cell{aspect-ratio:1;background:linear-gradient(135deg,#1a1a2e,#2a2a40);border-radius:10px;border:1px solid rgba(108,140,255,.2);transition:transform .15s ease-out}`,
    body: `<div class="grid" id="g">${Array(9).fill('<div class="cell"></div>').join('')}</div>`,
    script: `const g=document.getElementById('g');let tx=0,ty=0,cx=0,cy=0;document.addEventListener('mousemove',e=>{tx=(e.clientX/innerWidth-.5)*20;ty=(e.clientY/innerHeight-.5)*20;});function a(){cx+=(tx-cx)*.08;cy+=(ty-cy)*.08;g.style.transform='rotateY('+cx+'deg) rotateX('+(-cy)+'deg)';requestAnimationFrame(a);}a();` },
];
