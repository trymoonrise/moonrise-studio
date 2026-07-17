'use strict';

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

/** 10 extreme experimental animation presets — unique motion languages */
const PRESETS = [
  {
    slug: 'animation-letter-cascade',
    title: 'Letter Cascade Storm',
    tags: ['animation', 'type', 'cascade', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};overflow:hidden;padding:2rem}${reduced}
      .stage{text-align:center}
      .kicker{margin:0 0 1.5rem;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#555}
      .word{display:flex;justify-content:center;gap:.08em;${display};font-size:clamp(2.8rem,10vw,6rem);font-weight:800;letter-spacing:-.06em}
      .ch{display:inline-block;opacity:0;transform:translateY(-120vh) rotate(var(--r));animation:fall .9s cubic-bezier(.22,1,.36,1) forwards;animation-delay:calc(var(--i)*70ms)}
      @keyframes fall{to{opacity:1;transform:none}}
      .hint{margin-top:2rem;font-size:.7rem;color:#444;letter-spacing:.12em;text-transform:uppercase}`,
      body: `<div class="stage"><p class="kicker">Type cascade</p><div class="word" id="w"></div><p class="hint">Letters fall into lock</p></div>`,
      script: `const word='INSANE';const w=document.getElementById('w');[...word].forEach((ch,i)=>{const s=document.createElement('span');s.className='ch';s.textContent=ch;s.style.setProperty('--i',i);s.style.setProperty('--r',((Math.random()-.5)*40)+'deg');w.appendChild(s);});`,
    }),
  },
  {
    slug: 'animation-field-lines',
    title: 'Magnetic Field Lines',
    tags: ['animation', 'cursor', 'svg', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;background:#0a0a0a;color:#fff;${base};overflow:hidden;cursor:crosshair}${reduced}
      canvas{position:absolute;inset:0;width:100%;height:100%}
      .label{position:relative;z-index:1;min-height:100vh;display:grid;place-items:center;pointer-events:none;text-align:center}
      h1{margin:0;${display};font-size:clamp(2rem,6vw,3.5rem);font-weight:800;letter-spacing:-.05em}
      p{margin:.6rem 0 0;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#555}`,
      body: `<canvas id="c" aria-hidden="true"></canvas><div class="label"><div><h1>Field lines</h1><p>Move to bend space</p></div></div>`,
      script: `const c=document.getElementById('c'),x=c.getContext('2d');let mx=innerWidth/2,my=innerHeight/2,pts=[];
function resize(){c.width=innerWidth;c.height=innerHeight;pts=[];const cols=14,rows=10;for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++)pts.push({x:i/cols*c.width,y:j/rows*c.height,ox:i/cols*c.width,oy:j/rows*c.height});}
resize();addEventListener('resize',resize);addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
function frame(){x.clearRect(0,0,c.width,c.height);x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=1;
pts.forEach(p=>{const dx=p.ox-mx,dy=p.oy-my,d=Math.hypot(dx,dy)||1,f=Math.min(80,1800/d);p.x=p.ox+dx/d*f*.15;p.y=p.oy+dy/d*f*.15;});
for(let i=0;i<pts.length;i++){const p=pts[i];if(i%11!==10){const q=pts[i+1];if(q){x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke();}}
if(i+11<pts.length){const q=pts[i+11];x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke();}}
requestAnimationFrame(frame);}frame();`,
    }),
  },
  {
    slug: 'animation-chromatic-type',
    title: 'Chromatic Split Type',
    tags: ['animation', 'type', 'glitch', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
      .wrap{position:relative;text-align:center}
      h1{margin:0;${display};font-size:clamp(3rem,12vw,7rem);font-weight:800;letter-spacing:-.08em;line-height:.9;position:relative}
      h1::before,h1::after{content:attr(data-t);position:absolute;inset:0;mix-blend-mode:screen}
      h1::before{color:#fff;transform:translate(var(--rx,-2px),var(--ry,1px));opacity:.55;clip-path:inset(0 0 50% 0)}
      h1::after{color:#aaa;transform:translate(calc(var(--rx,2px)*-1),calc(var(--ry,-1px)*-1));opacity:.4;clip-path:inset(50% 0 0 0)}
      p{margin:1.25rem 0 0;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#444}`,
      body: `<div class="wrap"><h1 data-t="SPLIT" id="t">SPLIT</h1><p>Hover to shear channels</p></div>`,
      script: `const t=document.getElementById('t');addEventListener('mousemove',e=>{const x=(e.clientX/innerWidth-.5)*16,y=(e.clientY/innerHeight-.5)*10;t.style.setProperty('--rx',x+'px');t.style.setProperty('--ry',y+'px');});`,
    }),
  },
  {
    slug: 'animation-mask-morph',
    title: 'Morphing Mask Reveal',
    tags: ['animation', 'mask', 'morph', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f2f2;color:#111;${base};padding:2rem}${reduced}
      .frame{position:relative;width:min(90vw,420px);aspect-ratio:1;background:#111;overflow:hidden}
      .inner{position:absolute;inset:0;display:grid;place-items:center;color:#fff;${display};font-size:clamp(2rem,6vw,3.2rem);font-weight:800;letter-spacing:-.05em;clip-path:circle(0% at 50% 50%);animation:morph 4.5s cubic-bezier(.22,1,.36,1) infinite}
      @keyframes morph{0%{clip-path:circle(0% at 50% 50%)}35%{clip-path:circle(72% at 50% 50%)}55%{clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)}75%{clip-path:inset(8% 8% 8% 8%)}100%{clip-path:circle(0% at 70% 30%)}}
      .cap{margin-top:1.25rem;text-align:center;font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:#888}`,
      body: `<div><div class="frame"><div class="inner">MORPH</div></div><p class="cap">Clip-path language</p></div>`,
    }),
  },
  {
    slug: 'animation-zoom-tunnel',
    title: 'Infinite Zoom Tunnel',
    tags: ['animation', 'zoom', 'tunnel', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};overflow:hidden}${reduced}
      .tunnel{position:relative;width:min(80vw,360px);aspect-ratio:1}
      .ring{position:absolute;inset:0;border:1px solid rgba(255,255,255,.25);animation:zoom 4s linear infinite}
      .ring:nth-child(2){animation-delay:-1s}.ring:nth-child(3){animation-delay:-2s}.ring:nth-child(4){animation-delay:-3s}
      @keyframes zoom{0%{transform:scale(.15);opacity:0}15%{opacity:1}100%{transform:scale(2.4);opacity:0}}
      .core{position:absolute;inset:0;display:grid;place-items:center;${display};font-size:1.1rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;z-index:2}`,
      body: `<div class="tunnel"><div class="ring" aria-hidden="true"></div><div class="ring" aria-hidden="true"></div><div class="ring" aria-hidden="true"></div><div class="ring" aria-hidden="true"></div><div class="core">Tunnel</div></div>`,
    }),
  },
  {
    slug: 'animation-path-spring',
    title: 'Elastic Path Draw',
    tags: ['animation', 'svg', 'path', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
      .wrap{width:min(100%,480px);text-align:center}
      h1{margin:0 0 1.5rem;${display};font-size:clamp(1.8rem,5vw,2.6rem);font-weight:800;letter-spacing:-.04em}
      svg{width:100%;height:auto;overflow:visible}
      .path{fill:none;stroke:#111;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:900;stroke-dashoffset:900;animation:draw 2.2s cubic-bezier(.22,1,.36,1) forwards,.pulse 2s 2.2s ease-in-out infinite}
      @keyframes draw{to{stroke-dashoffset:0}}
      @keyframes pulse{0%,100%{stroke-width:2.5}50%{stroke-width:3.5}}
      p{margin:1.25rem 0 0;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:#999}`,
      body: `<div class="wrap"><h1>Elastic path</h1><svg viewBox="0 0 400 160" aria-hidden="true"><path class="path" d="M20,80 C60,20 100,140 140,80 S220,20 260,80 S340,140 380,80"/></svg><p>Spring draw · live stroke</p></div>`,
    }),
  },
  {
    slug: 'animation-pixel-rebuild',
    title: 'Pixel Dissolve Rebuild',
    tags: ['animation', 'pixel', 'dissolve', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#fff;${base};padding:2rem}${reduced}
      .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;width:min(90vw,320px)}
      .px{aspect-ratio:1;background:#fff;opacity:0;transform:scale(0);animation:pop .5s cubic-bezier(.34,1.56,.64,1) forwards}
      .cap{margin-top:1.5rem;text-align:center;${display};font-size:1.4rem;font-weight:800;letter-spacing:-.03em;opacity:0;animation:fade .6s 1.8s forwards}
      @keyframes pop{to{opacity:1;transform:scale(1)}}
      @keyframes fade{to{opacity:1}}`,
      body: `<div><div class="grid" id="g" aria-hidden="true"></div><p class="cap">Rebuild</p></div>`,
      script: `const g=document.getElementById('g');const order=[...Array(144).keys()].sort(()=>Math.random()-.5);
order.forEach((idx,i)=>{const d=document.createElement('div');d.className='px';d.style.animationDelay=(i*12)+'ms';d.style.opacity=idx%7===0?.35:1;g.appendChild(d);});`,
    }),
  },
  {
    slug: 'animation-orbit-captions',
    title: 'Orbiting Caption Rings',
    tags: ['animation', 'orbit', 'type', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080808;color:#fff;${base};overflow:hidden}${reduced}
      .sys{position:relative;width:min(80vw,340px);aspect-ratio:1}
      .hub{position:absolute;inset:32%;border:1px solid #222;display:grid;place-items:center;${display};font-size:1.1rem;font-weight:800;letter-spacing:-.03em}
      .ring{position:absolute;inset:0;animation:spin 18s linear infinite}
      .ring--2{inset:12%;animation-duration:12s;animation-direction:reverse}
      .ring span{position:absolute;left:50%;top:0;translate:-50% -50%;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:#666;white-space:nowrap}
      .ring--2 span{color:#999;font-size:.58rem}
      @keyframes spin{to{transform:rotate(360deg)}}`,
      body: `<div class="sys"><div class="ring" aria-hidden="true"><span>experimental · orbit · caption</span></div><div class="ring ring--2" aria-hidden="true"><span>professional · motion</span></div><div class="hub">CORE</div></div>`,
    }),
  },
  {
    slug: 'animation-gravity-stack',
    title: 'Gravity Stack Settle',
    tags: ['animation', 'physics', 'stack', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:end center;background:#f5f5f5;color:#111;${base};padding:0 2rem 12vh;overflow:hidden}${reduced}
      .stack{display:flex;flex-direction:column-reverse;gap:8px;width:min(100%,280px)}
      .bar{height:48px;background:#111;color:#fff;display:flex;align-items:center;padding:0 1rem;${display};font-weight:800;font-size:.95rem;letter-spacing:-.02em;opacity:0;transform:translateY(-100vh);animation:drop .7s cubic-bezier(.22,1,.36,1) forwards}
      .bar:nth-child(1){animation-delay:.1s;width:100%}.bar:nth-child(2){animation-delay:.28s;width:88%;background:#222}.bar:nth-child(3){animation-delay:.46s;width:72%;background:#333}.bar:nth-child(4){animation-delay:.64s;width:58%;background:#fff;color:#111;border:1.5px solid #111}.bar:nth-child(5){animation-delay:.82s;width:42%;background:#111}
      @keyframes drop{0%{opacity:0;transform:translateY(-100vh)}70%{opacity:1;transform:translateY(8px)}100%{opacity:1;transform:none}}
      .label{position:fixed;top:2rem;left:50%;translate:-50% 0;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:#999}`,
      body: `<p class="label">Gravity settle</p><div class="stack"><div class="bar">Base</div><div class="bar">Mass</div><div class="bar">Weight</div><div class="bar">Impact</div><div class="bar">Top</div></div>`,
    }),
  },
  {
    slug: 'animation-strobe-sequence',
    title: 'Strobe Type Sequence',
    tags: ['animation', 'strobe', 'type', 'experimental'],
    build: () => ({
      style: `${fonts}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;${base};padding:2rem}${reduced}
      .frame{${display};font-size:clamp(2.5rem,10vw,5.5rem);font-weight:800;letter-spacing:-.07em;min-height:1.1em;text-align:center}
      .meta{margin-top:1.5rem;text-align:center;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#444}
      .bar{width:120px;height:2px;background:#222;margin:1.25rem auto 0;overflow:hidden}
      .bar i{display:block;height:100%;width:0;background:#fff;animation:load 2.4s linear infinite}
      @keyframes load{to{width:100%}}`,
      body: `<div><div class="frame" id="f">BUILD</div><div class="bar" aria-hidden="true"><i></i></div><p class="meta">Frame sequence</p></div>`,
      script: `const words=['BUILD','BREAK','REMAKE','SHIP','REPEAT'];let i=0;const f=document.getElementById('f');
setInterval(()=>{i=(i+1)%words.length;f.style.opacity='0';setTimeout(()=>{f.textContent=words[i];f.style.opacity='1';},80);},800);`,
    }),
  },
];

module.exports = { PRESETS };
