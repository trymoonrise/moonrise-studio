'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

const label = (title, sub) =>
  `<div class="label"><p class="kicker">Background</p><h1>${title}</h1><p class="sub">${sub}</p></div>`;

const labelCss = `
.label{position:relative;z-index:2;text-align:center;padding:2rem;pointer-events:none}
.kicker{margin:0 0 .75rem;font-size:.65rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;opacity:.45}
h1{margin:0;${display};font-size:clamp(1.85rem,5vw,2.85rem);font-weight:800;letter-spacing:-.045em;line-height:1.05}
.sub{margin:.7rem 0 0;font-size:.9rem;opacity:.5;font-weight:400}`;

const RECIPES = {
  'animated-gradient-mesh': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0c0c0c;color:#fff;${base}}${reduced}
    .orb{position:absolute;border-radius:50%;filter:blur(72px);opacity:.55;animation:drift 14s ease-in-out infinite}
    .orb--1{width:55vmax;height:55vmax;background:#3a3a3a;top:-20%;left:-15%;animation-duration:16s}
    .orb--2{width:45vmax;height:45vmax;background:#1a1a1a;bottom:-25%;right:-10%;animation-duration:18s;animation-direction:reverse}
    .orb--3{width:35vmax;height:35vmax;background:#5a5a5a;top:30%;left:40%;animation-duration:12s}
    @keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(8%,-6%) scale(1.08)}66%{transform:translate(-6%,8%) scale(.94)}}
    .grain{position:absolute;inset:0;opacity:.06;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
    ${labelCss}`,
    body: `<div class="orb orb--1" aria-hidden="true"></div><div class="orb orb--2" aria-hidden="true"></div><div class="orb orb--3" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>${label('Gradient mesh', 'Soft orbs in slow drift.')}`,
  }),

  'moving-grid-lines': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#090909;color:#fff;${base}}${reduced}
    .grid{position:absolute;inset:-20%;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:48px 48px;animation:pan 22s linear infinite;transform:perspective(600px) rotateX(48deg) scale(1.6);transform-origin:center 40%;mask-image:linear-gradient(to bottom,transparent,#000 30%,#000 70%,transparent)}
    @keyframes pan{to{background-position:48px 48px}}
    .fade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 20%,#090909 72%);pointer-events:none}
    ${labelCss}`,
    body: `<div class="grid" aria-hidden="true"></div><div class="fade" aria-hidden="true"></div>${label('Moving grid', 'Perspective lines in motion.')}`,
  }),

  'noise-grain-overlay': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#161616;color:#fff;${base}}${reduced}
    .wash{position:absolute;inset:0;background:linear-gradient(125deg,#1e1e1e 0%,#0f0f0f 45%,#222 100%);animation:shift 10s ease-in-out infinite alternate}
    @keyframes shift{to{filter:brightness(1.12)}}
    .noise{position:absolute;inset:-50%;width:200%;height:200%;opacity:.12;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:grain 0.4s steps(4) infinite}
    @keyframes grain{0%,100%{transform:translate(0,0)}25%{transform:translate(-2%,3%)}50%{transform:translate(3%,-1%)}75%{transform:translate(-1%,-2%)}}
    ${labelCss}`,
    body: `<div class="wash" aria-hidden="true"></div><div class="noise" aria-hidden="true"></div>${label('Film grain', 'Living texture over tone.')}`,
  }),

  'floating-particle-dots': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;overflow:hidden;position:relative;background:#0a0a0a;color:#fff;${base};display:grid;place-items:center}${reduced}
    canvas{position:absolute;inset:0;width:100%;height:100%}
    ${labelCss}`,
    body: `<canvas id="c" aria-hidden="true"></canvas>${label('Particles', 'Dots float and connect.')}`,
    script: `const c=document.getElementById('c'),x=c.getContext('2d');let d=[],m={x:-999,y:-999};const N=70;function resize(){c.width=innerWidth;c.height=innerHeight;d=Array.from({length:N},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.8+.6}));}resize();addEventListener('resize',resize);addEventListener('mousemove',e=>{m.x=e.clientX;m.y=e.clientY;});function frame(){x.clearRect(0,0,c.width,c.height);for(let i=0;i<d.length;i++){const a=d[i];a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>c.width)a.vx*=-1;if(a.y<0||a.y>c.height)a.vy*=-1;x.beginPath();x.arc(a.x,a.y,a.r,0,Math.PI*2);x.fillStyle='rgba(255,255,255,.55)';x.fill();for(let j=i+1;j<d.length;j++){const b=d[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);if(dist<110){x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.strokeStyle='rgba(255,255,255,'+(0.18*(1-dist/110))+')';x.stroke();}}}requestAnimationFrame(frame);}frame();`,
  }),

  'mesh-gradient': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#f4f4f4;color:#111;${base}}${reduced}
    .mesh{position:absolute;inset:0;background:
      radial-gradient(ellipse 60% 50% at 15% 20%,rgba(0,0,0,.12),transparent),
      radial-gradient(ellipse 50% 60% at 85% 15%,rgba(0,0,0,.08),transparent),
      radial-gradient(ellipse 55% 45% at 70% 80%,rgba(0,0,0,.1),transparent),
      radial-gradient(ellipse 40% 40% at 25% 75%,rgba(0,0,0,.06),transparent),
      #f4f4f4;animation:mesh 18s ease-in-out infinite alternate}
    @keyframes mesh{to{background:
      radial-gradient(ellipse 55% 55% at 25% 30%,rgba(0,0,0,.14),transparent),
      radial-gradient(ellipse 45% 50% at 75% 25%,rgba(0,0,0,.09),transparent),
      radial-gradient(ellipse 60% 40% at 60% 70%,rgba(0,0,0,.11),transparent),
      radial-gradient(ellipse 35% 45% at 20% 65%,rgba(0,0,0,.07),transparent),
      #f4f4f4}}
    ${labelCss}`,
    body: `<div class="mesh" aria-hidden="true"></div>${label('Mesh gradient', 'Ink blooms on paper.')}`,
  }),

  'dot-pattern': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#fafafa;color:#111;${base}}${reduced}
    .dots{position:absolute;inset:0;background-image:radial-gradient(#bbb 1.2px,transparent 1.2px);background-size:22px 22px;animation:drift 30s linear infinite;mask-image:radial-gradient(ellipse at 50% 50%,#000 20%,transparent 70%)}
    @keyframes drift{to{background-position:22px 44px}}
    .panel{position:relative;z-index:2;padding:2rem 2.5rem;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(0,0,0,.06)}
    .panel .kicker,.panel h1,.panel .sub{opacity:1}
    .panel .kicker{opacity:.4}.panel .sub{opacity:.5}
    ${labelCss}`,
    body: `<div class="dots" aria-hidden="true"></div><div class="panel">${label('Dot field', 'Halftone drift beneath.')}</div>`,
  }),

  'noise-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#111;color:#fff;${base}}${reduced}
    .base{position:absolute;inset:0;background:linear-gradient(160deg,#1a1a1a,#0d0d0d 50%,#181818)}
    .noise{position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:tick .5s steps(2) infinite}
    @keyframes tick{to{transform:translate(1px,-1px)}}
    ${labelCss}`,
    body: `<div class="base" aria-hidden="true"></div><div class="noise" aria-hidden="true"></div>${label('Noise texture', 'Static as atmosphere.')}`,
  }),

  'grid-lines': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0b0b0b;color:#fff;${base}}${reduced}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:56px 56px}
    .scan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:scan 5s ease-in-out infinite;top:0}
    @keyframes scan{0%{top:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
    .cross{position:absolute;width:56px;height:56px;border:1px solid rgba(255,255,255,.2);animation:pulse 3s ease-in-out infinite;left:calc(50% - 28px);top:calc(50% - 28px)}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.8);opacity:.8}}
    ${labelCss}`,
    body: `<div class="grid" aria-hidden="true"></div><div class="scan" aria-hidden="true"></div><div class="cross" aria-hidden="true"></div>${label('Grid lines', 'Precision under a scan.')}`,
  }),

  'aurora-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#07070a;color:#fff;${base}}${reduced}
    .band{position:absolute;left:-20%;right:-20%;height:40%;filter:blur(60px);opacity:.45;animation:aurora 12s ease-in-out infinite alternate}
    .band--1{top:10%;background:linear-gradient(90deg,transparent,#c8c8d0 30%,#888 50%,#e8e8f0 70%,transparent);animation-duration:14s}
    .band--2{top:35%;background:linear-gradient(90deg,transparent,#666 25%,#aaa 55%,transparent);opacity:.3;animation-duration:18s;animation-direction:alternate-reverse}
    .band--3{top:55%;background:linear-gradient(90deg,transparent,#ddd 40%,#555 60%,transparent);opacity:.25;animation-duration:16s}
    @keyframes aurora{from{transform:translateX(-8%) skewX(-4deg)}to{transform:translateX(8%) skewX(4deg)}}
    ${labelCss}`,
    body: `<div class="band band--1" aria-hidden="true"></div><div class="band band--2" aria-hidden="true"></div><div class="band band--3" aria-hidden="true"></div>${label('Aurora', 'Pale curtains of light.')}`,
  }),

  'wave-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0e0e0e;color:#fff;${base}}${reduced}
    .waves{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end}
    .w{width:200%;height:120px;margin-left:-50%;background:transparent;border-radius:40%;border:1px solid rgba(255,255,255,.12);animation:wave 8s ease-in-out infinite}
    .w:nth-child(1){animation-duration:7s;opacity:.9}.w:nth-child(2){animation-duration:9s;animation-delay:-2s;opacity:.55}.w:nth-child(3){animation-duration:11s;animation-delay:-4s;opacity:.3}
    @keyframes wave{0%,100%{transform:translateX(0) translateY(0)}50%{transform:translateX(4%) translateY(-12px)}}
    ${labelCss}`,
    body: `<div class="waves" aria-hidden="true"><div class="w"></div><div class="w"></div><div class="w"></div></div>${label('Wave field', 'Stacked arcs in swell.')}`,
  }),

  'blob-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#f6f6f6;color:#111;${base}}${reduced}
    .blob{position:absolute;width:min(70vw,480px);height:min(70vw,480px);background:#111;opacity:.08;filter:blur(2px);animation:morph 10s ease-in-out infinite;left:50%;top:50%;translate:-50% -50%}
    .blob--2{width:min(50vw,340px);height:min(50vw,340px);opacity:.06;animation-duration:14s;animation-direction:reverse;background:#000}
    @keyframes morph{0%,100%{border-radius:42% 58% 60% 40%/45% 40% 60% 55%;transform:rotate(0deg)}50%{border-radius:60% 40% 35% 65%/55% 60% 40% 45%;transform:rotate(12deg)}}
    ${labelCss}`,
    body: `<div class="blob" aria-hidden="true"></div><div class="blob blob--2" aria-hidden="true"></div>${label('Blob morph', 'Ink shapes breathe.')}`,
  }),

  'stripe-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#111;color:#fff;${base}}${reduced}
    .stripes{position:absolute;inset:-50%;background:repeating-linear-gradient(-18deg,#111 0 14px,#1c1c1c 14px 28px);animation:slide 18s linear infinite}
    @keyframes slide{to{transform:translateX(56px) translateY(18px)}}
    .veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 10%,#111 75%);pointer-events:none}
    ${labelCss}`,
    body: `<div class="stripes" aria-hidden="true"></div><div class="veil" aria-hidden="true"></div>${label('Stripe field', 'Diagonal bands in crawl.')}`,
  }),

  'radial-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0a0a0a;color:#fff;${base}}${reduced}
    .rings{position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:1px solid rgba(255,255,255,.25);animation:expand 6s ease-out infinite}
    .rings:nth-child(2){animation-delay:1.5s}.rings:nth-child(3){animation-delay:3s}.rings:nth-child(4){animation-delay:4.5s}
    @keyframes expand{0%{transform:scale(1);opacity:.7}100%{transform:scale(40);opacity:0}}
    .core{position:absolute;width:8px;height:8px;border-radius:50%;background:#fff;left:50%;top:50%;margin:-4px;opacity:.6}
    ${labelCss}`,
    body: `<div class="rings" aria-hidden="true"></div><div class="rings" aria-hidden="true"></div><div class="rings" aria-hidden="true"></div><div class="rings" aria-hidden="true"></div><div class="core" aria-hidden="true"></div>${label('Radial pulse', 'Ripples from center.')}`,
  }),

  'dark-mesh': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#050505;color:#fff;${base}}${reduced}
    .m{position:absolute;border-radius:50%;filter:blur(80px);animation:float 20s ease-in-out infinite}
    .m--1{width:50vmax;height:50vmax;background:#2a2a2a;top:-15%;left:-10%}
    .m--2{width:40vmax;height:40vmax;background:#141414;bottom:-20%;right:-5%;animation-duration:24s;animation-direction:reverse}
    .m--3{width:30vmax;height:30vmax;background:#3d3d3d;top:40%;left:35%;opacity:.5;animation-duration:16s}
    @keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(5%,-8%)}}
    .vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,#050505 85%);pointer-events:none}
    ${labelCss}`,
    body: `<div class="m m--1" aria-hidden="true"></div><div class="m m--2" aria-hidden="true"></div><div class="m m--3" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>${label('Dark mesh', 'Depth without color.')}`,
  }),

  'minimal-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#fafafa;color:#111;${base}}${reduced}
    .hline{position:absolute;left:0;right:0;height:1px;background:#e5e5e5;top:33%}
    .hline--2{top:66%}
    .vline{position:absolute;top:0;bottom:0;width:1px;background:#e5e5e5;left:50%;animation:breathe 5s ease-in-out infinite}
    @keyframes breathe{0%,100%{opacity:.4}50%{opacity:1}}
    .mark{position:absolute;width:12px;height:12px;border:1px solid #111;left:calc(50% - 6px);top:calc(33% - 6px);animation:blink 4s steps(1) infinite}
    @keyframes blink{0%,90%{opacity:1}95%{opacity:0}}
    ${labelCss}`,
    body: `<div class="hline" aria-hidden="true"></div><div class="hline hline--2" aria-hidden="true"></div><div class="vline" aria-hidden="true"></div><div class="mark" aria-hidden="true"></div>${label('Minimal', 'Almost nothing. Almost.')}`,
  }),

  'animated-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0f0f0f;color:#fff;${base}}${reduced}
    .geo{position:absolute;border:1px solid rgba(255,255,255,.15);animation:spin 40s linear infinite}
    .geo--1{width:60vmax;height:60vmax;left:50%;top:50%;margin:-30vmax;border-radius:50%}
    .geo--2{width:42vmax;height:42vmax;left:50%;top:50%;margin:-21vmax;animation-direction:reverse;animation-duration:28s}
    .geo--3{width:24vmax;height:24vmax;left:50%;top:50%;margin:-12vmax;transform:rotate(45deg);animation-name:spinSq;animation-duration:20s}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes spinSq{to{transform:rotate(405deg)}}
    ${labelCss}`,
    body: `<div class="geo geo--1" aria-hidden="true"></div><div class="geo geo--2" aria-hidden="true"></div><div class="geo geo--3" aria-hidden="true"></div>${label('Animated', 'Geometry in orbit.')}`,
  }),

  'glass-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#121212;color:#fff;${base}}${reduced}
    .blob{position:absolute;width:40vmax;height:40vmax;border-radius:50%;filter:blur(60px);animation:move 15s ease-in-out infinite}
    .blob--a{background:#444;top:-10%;left:-5%}.blob--b{background:#222;bottom:-15%;right:-8%;animation-duration:18s;animation-direction:reverse}
    @keyframes move{0%,100%{transform:translate(0,0)}50%{transform:translate(12%,8%)}}
    .glass{position:relative;z-index:2;padding:2.5rem 3rem;background:rgba(255,255,255,.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 60px rgba(0,0,0,.3)}
    .glass .kicker{opacity:.5}.glass .sub{opacity:.55}
    ${labelCss}`,
    body: `<div class="blob blob--a" aria-hidden="true"></div><div class="blob blob--b" aria-hidden="true"></div><div class="glass">${label('Glass', 'Frost over soft motion.')}</div>`,
  }),

  'gradient-mesh-bg': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0d0d0d;color:#fff;${base}}${reduced}
    .layer{position:absolute;inset:-30%;background:
      radial-gradient(circle at 20% 30%,rgba(255,255,255,.12),transparent 40%),
      radial-gradient(circle at 80% 20%,rgba(255,255,255,.08),transparent 35%),
      radial-gradient(circle at 60% 80%,rgba(255,255,255,.1),transparent 45%),
      radial-gradient(circle at 10% 70%,rgba(255,255,255,.05),transparent 30%);
      animation:sway 20s ease-in-out infinite alternate;filter:blur(40px)}
    @keyframes sway{to{transform:rotate(8deg) scale(1.1)}}
    ${labelCss}`,
    body: `<div class="layer" aria-hidden="true"></div>${label('Gradient mesh', 'Layered light in sway.')}`,
  }),

  'animated-mesh': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#101010;color:#fff;${base}}${reduced}
    .node{position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);animation:orbit 12s ease-in-out infinite}
    .node:nth-child(1){left:10%;top:20%;animation-duration:14s}
    .node:nth-child(2){right:15%;top:30%;animation-duration:16s;animation-delay:-3s}
    .node:nth-child(3){left:30%;bottom:15%;animation-duration:18s;animation-delay:-6s}
    .node:nth-child(4){right:25%;bottom:25%;animation-duration:13s;animation-delay:-2s}
    @keyframes orbit{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-24px) scale(1.15)}}
    .lines{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:80px 80px;pointer-events:none}
    ${labelCss}`,
    body: `<div class="lines" aria-hidden="true"></div><div class="node" aria-hidden="true"></div><div class="node" aria-hidden="true"></div><div class="node" aria-hidden="true"></div><div class="node" aria-hidden="true"></div>${label('Animated mesh', 'Nodes drift on a lattice.')}`,
  }),

  'grid-pulse': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#080808;color:#fff;${base}}${reduced}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:40px 40px}
    .pulse{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;background:radial-gradient(circle,rgba(255,255,255,.25),transparent 70%);animation:boom 3.5s ease-out infinite;border-radius:50%}
    .pulse:nth-child(2){animation-delay:1.1s}.pulse:nth-child(3){animation-delay:2.2s}
    @keyframes boom{0%{transform:scale(1);opacity:.8}100%{transform:scale(18);opacity:0}}
    ${labelCss}`,
    body: `<div class="grid" aria-hidden="true"></div><div class="pulse" aria-hidden="true"></div><div class="pulse" aria-hidden="true"></div><div class="pulse" aria-hidden="true"></div>${label('Grid pulse', 'Shockwaves on a lattice.')}`,
  }),

  'aurora-drift': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#060608;color:#fff;${base}}${reduced}
    .sheet{position:absolute;width:140%;height:50%;left:-20%;filter:blur(50px);opacity:.4;animation:driftX 16s ease-in-out infinite alternate;background:linear-gradient(105deg,transparent 10%,rgba(200,200,210,.5) 35%,rgba(140,140,150,.35) 50%,rgba(220,220,230,.45) 65%,transparent 90%)}
    .sheet--1{top:5%;animation-duration:14s}
    .sheet--2{top:28%;opacity:.28;animation-duration:20s;animation-direction:alternate-reverse;transform:skewY(-3deg)}
    .sheet--3{top:48%;opacity:.2;animation-duration:18s;height:35%}
    @keyframes driftX{from{transform:translateX(-6%)}to{transform:translateX(6%)}}
    .stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 70%,#fff,transparent),radial-gradient(1px 1px at 85% 60%,#fff,transparent);opacity:.35;animation:twinkle 4s ease-in-out infinite alternate}
    @keyframes twinkle{to{opacity:.55}}
    ${labelCss}`,
    body: `<div class="stars" aria-hidden="true"></div><div class="sheet sheet--1" aria-hidden="true"></div><div class="sheet sheet--2" aria-hidden="true"></div><div class="sheet sheet--3" aria-hidden="true"></div>${label('Aurora drift', 'Night sky in soft motion.')}`,
  }),

  'rain-effect': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;overflow:hidden;position:relative;background:#0a0a0c;color:#fff;${base}}${reduced}
    canvas{position:absolute;inset:0;width:100%;height:100%}
    .mist{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(10,10,12,.6));pointer-events:none}
    ${labelCss}`,
    body: `<canvas id="rain" aria-hidden="true"></canvas><div class="mist" aria-hidden="true"></div>${label('Rain', 'Vertical silence.')}`,
    script: `const c=document.getElementById('rain'),x=c.getContext('2d');let drops=[];function resize(){c.width=innerWidth;c.height=innerHeight;const n=Math.floor(c.width/8);drops=Array.from({length:n},()=>({x:Math.random()*c.width,y:Math.random()*c.height,l:Math.random()*18+8,s:Math.random()*6+4,o:Math.random()*.35+.1}));}resize();addEventListener('resize',resize);function frame(){x.clearRect(0,0,c.width,c.height);for(const d of drops){x.beginPath();x.moveTo(d.x,d.y);x.lineTo(d.x,d.y+d.l);x.strokeStyle='rgba(255,255,255,'+d.o+')';x.lineWidth=1;x.stroke();d.y+=d.s;if(d.y>c.height){d.y=-d.l;d.x=Math.random()*c.width;}}requestAnimationFrame(frame);}frame();`,
  }),
};

function extractBgDesc(slug) {
  let s = slug;
  if (s.startsWith('backgrounds-')) s = s.slice('backgrounds-'.length);
  return s.replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractBgDesc };
