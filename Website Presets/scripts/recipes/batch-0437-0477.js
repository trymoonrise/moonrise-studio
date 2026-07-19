const IMG = '../stock/media/16-9 Aspect Ratio(image).png';

const scrollProg = (sel) =>
  `const _el=document.querySelector('${sel}');function prog(){const r=_el.getBoundingClientRect();return Math.min(1,Math.max(0,-r.top/(r.height-innerHeight)));}`;

const reduced = `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

const RECIPES = {
  'reveal-on-scroll': () => ({
    style: `body{margin:0;background:#07070a;color:#eaeaf2;font-family:system-ui,-apple-system,sans-serif}${reduced}.hero{position:sticky;top:0;height:55vh;display:grid;place-items:center;background:radial-gradient(900px circle at 40% 20%,rgba(255,108,176,.25),transparent 60%),radial-gradient(900px circle at 60% 70%,rgba(108,140,255,.22),transparent 65%),#07070a}h1{font-size:clamp(2.1rem,6vw,3.8rem);font-weight:900;letter-spacing:-.04em}.grid{max-width:1000px;margin:0 auto;padding:4rem 1.25rem 8rem;display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.card{grid-column:span 6;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:1.25rem;min-height:140px;opacity:0;transform:translateY(20px) scale(.98);filter:blur(6px);transition:transform .8s cubic-bezier(.2,.8,.2,1),opacity .8s,filter .8s}.card.on{opacity:1;transform:none;filter:none}.card:nth-child(3),.card:nth-child(6){grid-column:span 12}.k{color:#ff6cb0;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem}p{color:rgba(234,234,242,.72);margin-top:.55rem;line-height:1.5}`,
    body: `<section class="hero"><div style="text-align:center;padding:2rem"><div class="k">Reveal</div><h1>Make motion feel<br>earned.</h1></div></section><section class="grid" id="g">${[1,2,3,4,5,6].map(i=>`<article class="card"><div class="k">Block ${i}</div><p>IntersectionObserver reveals each card with blur to crisp.</p></article>`).join('')}</section>`,
    script: `const obs=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('on')),{threshold:.18});document.querySelectorAll('.card').forEach(c=>obs.observe(c));`,
  }),

  'pin-fade-section': () => ({
    style: `body{margin:0;background:#0b0b0f;color:#fff;font-family:ui-sans-serif,system-ui}.track{height:240vh}.pin{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.ring{position:absolute;inset:-40vh;opacity:.55;background:conic-gradient(from 90deg,rgba(56,189,248,0),rgba(56,189,248,.25),rgba(255,108,176,.22),rgba(56,189,248,0));filter:blur(30px);transform:rotate(var(--rot,0deg))}.title{position:relative;text-align:center;max-width:22ch}.title h1{font-size:clamp(2.2rem,7vw,4.6rem);letter-spacing:-.05em;line-height:1.02;opacity:var(--o,1);transform:translateY(var(--y,0px))}.title p{color:rgba(255,255,255,.7);margin-top:1rem}`,
    body: `<div class="track" id="t"><div class="pin"><div class="ring" id="r"></div><div class="title"><h1 id="h">Pinned, then dissolves.</h1><p>Scroll to fade and drift.</p></div></div></div>`,
    script: scrollProg('#t') + `const h=document.getElementById('h'),r=document.getElementById('r');addEventListener('scroll',()=>{const p=prog();h.style.setProperty('--o',String(1-p));h.style.setProperty('--y',p*26+'px');r.style.setProperty('--rot',p*540+'deg');},{passive:true});`,
  }),

  'horizontal-scrub': () => ({
    style: `body{margin:0;background:#05070b;color:#e6f3ff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;overflow:hidden}.rail{display:flex;gap:18px;padding:0 10vw;transform:translateX(var(--x,0px));will-change:transform}.tile{width:min(70vw,460px);aspect-ratio:16/10;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.10);background:#0b1220;box-shadow:0 16px 60px rgba(0,0,0,.45)}.tile img{width:100%;height:100%;object-fit:cover;filter:saturate(1.15) contrast(1.05)}.cap{position:fixed;left:24px;top:20px;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(230,243,255,.62)}`,
    body: `<div class="cap">Horizontal scrub</div><div class="track" id="t"><div class="sticky"><div class="rail" id="rail">${Array.from({length:6},()=>`<figure class="tile"><img src="${IMG}" alt=""></figure>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const rail=document.getElementById('rail');addEventListener('scroll',()=>{const p=prog();const max=rail.scrollWidth-innerWidth+innerWidth*.1;rail.style.setProperty('--x',-p*max+'px');},{passive:true});`,
  }),

  'stacked-cards-unroll': () => ({
    style: `body{margin:0;background:#f6f2ea;color:#1a1712;font-family:ui-serif,Georgia,serif}.track{height:260vh;padding:14vh 0}.stack{position:sticky;top:12vh;height:76vh;display:grid;place-items:center}.card{position:absolute;width:min(86vw,520px);border-radius:22px;padding:28px;background:#fff;box-shadow:0 18px 60px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.06);transform:translateY(calc(var(--i)*12px)) rotate(calc(var(--i)*-2deg)) scale(calc(1 - var(--i)*.03))}.card h3{font-size:1.45rem;letter-spacing:-.02em}.card p{color:rgba(26,23,18,.72);margin-top:.6rem;line-height:1.5}.hint{position:fixed;left:22px;bottom:18px;font-size:.9rem;color:rgba(26,23,18,.55)}`,
    body: `<div class="hint">Scroll to unroll the stack</div><div class="track" id="t"><div class="stack">${[0,1,2,3,4,5].map(i=>`<article class="card" style="--i:${i}"><h3>Chapter ${i+1}</h3><p>Cards peel away with scroll and depth.</p></article>`).join('')}</div></div>`,
    script: scrollProg('#t') + `const cards=[...document.querySelectorAll('.card')];addEventListener('scroll',()=>{const p=prog();cards.forEach((c,i)=>{const t=Math.min(1,Math.max(0,p*1.15-i*.11));c.style.transform='translateY('+(i*12-t*140)+'px) rotate('+(-i*2+t*10)+'deg) scale('+(1-i*.03+t*.02)+')';c.style.opacity=String(1-t*.85);});},{passive:true});`,
  }),

  'parallax-blocks': () => ({
    style: `body{margin:0;background:#07141a;color:#d9fbff;font-family:system-ui}.track{height:260vh}.scene{position:sticky;top:0;height:100vh;overflow:hidden}.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(217,251,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(217,251,255,.08) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle at 50% 40%,#000 0%,transparent 70%)}.blk{position:absolute;width:240px;height:140px;border-radius:18px;filter:drop-shadow(0 20px 60px rgba(0,0,0,.45));transform:translate3d(var(--x,0),var(--y,0),0) rotate(var(--r,0deg));will-change:transform}.a{background:linear-gradient(135deg,#38bdf8,#60a5fa)}.b{background:linear-gradient(135deg,#34d399,#a7f3d0)}.c{background:linear-gradient(135deg,#fb7185,#f97316)}.label{position:relative;z-index:1;display:grid;place-items:center;height:100vh;text-align:center}.label h1{font-size:clamp(2.2rem,7vw,4.2rem);letter-spacing:-.05em}.label p{color:rgba(217,251,255,.65);margin-top:.75rem}`,
    body: `<div class="track" id="t"><div class="scene"><div class="grid"></div><div class="blk a" id="a"></div><div class="blk b" id="b"></div><div class="blk c" id="c"></div><div class="label"><div><h1>Parallax Blocks</h1><p>Depth without 3D libraries.</p></div></div></div></div>`,
    script: scrollProg('#t') + `const a=document.getElementById('a'),b=document.getElementById('b'),c=document.getElementById('c');addEventListener('scroll',()=>{const p=prog();a.style.setProperty('--x',-220+p*520+'px');a.style.setProperty('--y',120-p*220+'px');a.style.setProperty('--r',-18+p*40+'deg');b.style.setProperty('--x',180-p*380+'px');b.style.setProperty('--y',220-p*340+'px');b.style.setProperty('--r',14-p*28+'deg');c.style.setProperty('--x',-20+Math.sin(p*Math.PI)*160+'px');c.style.setProperty('--y',340-p*460+'px');c.style.setProperty('--r',p*60+'deg');},{passive:true});`,
  }),

  'scale-on-scroll': () => ({
    style: `body{margin:0;background:#0a0a0c;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.frame{width:min(90vw,780px);aspect-ratio:16/10;border-radius:26px;overflow:hidden;border:1px solid rgba(255,255,255,.12);transform:scale(var(--s,1)) rotate(var(--r,0deg));filter:saturate(1.1) contrast(1.05)}.frame img{width:100%;height:100%;object-fit:cover;transform:scale(1.12)}.tag{position:fixed;left:22px;top:18px;color:rgba(255,255,255,.6);letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}`,
    body: `<div class="tag">Scale on scroll</div><div class="track" id="t"><div class="sticky"><div class="frame" id="f"><img src="${IMG}" alt=""></div></div></div>`,
    script: scrollProg('#t') + `const f=document.getElementById('f');addEventListener('scroll',()=>{const p=prog();f.style.setProperty('--s',String(1+p*.45));f.style.setProperty('--r',-2+p*5+'deg');},{passive:true});`,
  }),

  'text-split-reveal': () => ({
    style: `body{margin:0;background:#060d14;color:#d8eeff;font-family:system-ui}.track{height:220vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.word{font-size:clamp(2.6rem,8vw,6rem);font-weight:950;letter-spacing:-.04em;line-height:1}.top,.bot{display:block;overflow:hidden}.top span{display:inline-block;transform:translateY(calc((1 - var(--p,0))*120%)) skewY(-8deg)}.bot span{display:inline-block;transform:translateY(calc((1 - var(--p,0))*-120%)) skewY(8deg)}.sub{margin-top:1rem;color:rgba(216,238,255,.65)}`,
    body: `<div class="track" id="t"><div class="sticky"><div style="text-align:center"><div class="word" id="w"><span class="top"><span>SPLIT</span></span><span class="bot"><span>REVEAL</span></span></div><div class="sub">Two halves meet in the middle.</div></div></div></div>`,
    script: scrollProg('#t') + `const w=document.getElementById('w');addEventListener('scroll',()=>w.style.setProperty('--p',String(prog())),{passive:true});`,
  }),

  'sticky-counter': () => ({
    style: `body{margin:0;background:#0c0c10;color:#fff;font-family:system-ui}.track{height:260vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.n{font-variant-numeric:tabular-nums;font-size:clamp(3.5rem,12vw,8rem);font-weight:950;letter-spacing:-.06em}.meter{width:min(70vw,520px);height:10px;border-radius:99px;background:rgba(255,255,255,.10);overflow:hidden;margin:18px auto 0}.meter i{display:block;height:100%;width:calc(var(--p,0)*100%);background:linear-gradient(90deg,#ff6cb0,#6c8cff)}.lbl{color:rgba(255,255,255,.65);text-align:center;margin-top:.75rem}`,
    body: `<div class="track" id="t"><div class="sticky"><div style="text-align:center"><div class="n" id="n">000</div><div class="meter"><i id="m"></i></div><div class="lbl">Sticky counter mapped to scroll</div></div></div></div>`,
    script: scrollProg('#t') + `const n=document.getElementById('n'),m=document.getElementById('m');addEventListener('scroll',()=>{const p=prog();n.textContent=String(Math.round(p*987)).padStart(3,'0');m.style.setProperty('--p',String(p));},{passive:true});`,
  }),

  'image-zoom-scroll': () => ({
    style: `body{margin:0;background:#000;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;overflow:hidden}.bg{position:absolute;inset:0;background:url('${IMG}') center/cover;transform:scale(var(--s,1));filter:brightness(.6) saturate(1.2)}.shade{position:absolute;inset:0;background:radial-gradient(600px circle at 50% 40%,transparent 0%,rgba(0,0,0,.82) 70%)}.copy{position:relative;z-index:1;height:100%;display:grid;place-items:center;text-align:center;padding:2rem}h1{font-size:clamp(2.2rem,7vw,4.5rem);letter-spacing:-.05em}p{color:rgba(255,255,255,.7);margin-top:.75rem}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="bg" id="bg"></div><div class="shade"></div><div class="copy"><div><h1>Zoom.</h1><p>Scroll drives the camera.</p></div></div></div></div>`,
    script: scrollProg('#t') + `const bg=document.getElementById('bg');addEventListener('scroll',()=>{const p=prog();bg.style.setProperty('--s',String(1+p*.65));},{passive:true});`,
  }),

  'progress-fill': () => ({
    style: `body{margin:0;background:#0b1210;color:#e0f0e8;font-family:system-ui}.track{height:240vh}.hud{position:fixed;inset:auto 22px 18px 22px;display:flex;align-items:center;gap:14px;z-index:5}.bar{flex:1;height:12px;border-radius:99px;background:rgba(224,240,232,.12);overflow:hidden}.bar i{display:block;height:100%;width:calc(var(--p,0)*100%);background:linear-gradient(90deg,#6cffb8,#38bdf8)}.pct{min-width:64px;text-align:right;font-variant-numeric:tabular-nums;color:rgba(224,240,232,.7)}.copy{height:240vh;display:grid;place-items:center;text-align:center;padding:2rem}h1{font-size:clamp(2.2rem,7vw,4.4rem);letter-spacing:-.05em}`,
    body: `<div class="copy" id="t"><div><h1>Progress Fill</h1><p style="color:rgba(224,240,232,.7);margin-top:.75rem">The bar is the UI.</p></div></div><div class="hud"><div class="bar"><i id="i"></i></div><div class="pct" id="p">0%</div></div>`,
    script: scrollProg('#t') + `const i=document.getElementById('i'),pEl=document.getElementById('p');addEventListener('scroll',()=>{const p=prog();i.style.setProperty('--p',String(p));pEl.textContent=Math.round(p*100)+'%';},{passive:true});`,
  }),

  'skew-scroll': () => ({
    style: `body{margin:0;background:#0a0a0c;color:#fff;font-family:system-ui}${reduced}section{min-height:100vh;display:grid;place-items:center;transform:skewY(var(--sk,0deg))}.a{background:linear-gradient(135deg,#111118,#0a0a0c)}.b{background:linear-gradient(135deg,#1c0f18,#0a0a0c)}.c{background:linear-gradient(135deg,#0c1824,#0a0a0c)}h1{font-size:clamp(2.2rem,7vw,4.8rem);letter-spacing:-.05em}`,
    body: `<section class="a"><h1>Skew</h1></section><section class="b"><h1>by Velocity</h1></section><section class="c"><h1>Not Position</h1></section>`,
    script: `let last=scrollY,v=0;function tick(){const now=scrollY;const dv=now-last;last=now;v=v*.85+dv*.15;const sk=matchMedia('(prefers-reduced-motion:reduce)').matches?0:Math.max(-14,Math.min(14,-v*.06));document.documentElement.style.setProperty('--sk',sk+'deg');requestAnimationFrame(tick);}tick();`,
  }),

  'color-shift': () => ({
    style: `body{margin:0;min-height:240vh;background:hsl(var(--h,210) 70% 6%);color:#fff;font-family:system-ui}.center{position:sticky;top:0;height:100vh;display:grid;place-items:center;text-align:center;padding:2rem}h1{font-size:clamp(2.2rem,7vw,4.6rem);letter-spacing:-.05em}p{color:rgba(255,255,255,.7);margin-top:.75rem}`,
    body: `<div id="t" style="height:240vh"><div class="center"><div><h1>Color Shift</h1><p>Hue rotates as you scroll.</p></div></div></div>`,
    script: scrollProg('#t') + `addEventListener('scroll',()=>{const p=prog();document.body.style.setProperty('--h',String(210+p*420));},{passive:true});`,
  }),

  'line-draw': () => ({
    style: `body{margin:0;background:#060d14;color:#d8eeff;font-family:system-ui}.track{height:220vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}svg{width:min(92vw,760px);height:auto}path{fill:none;stroke:#38bdf8;stroke-width:10;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 12px 40px rgba(56,189,248,.25))}.cap{position:fixed;left:22px;top:18px;color:rgba(216,238,255,.6);letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}`,
    body: `<div class="cap">Line draw</div><div class="track" id="t"><div class="sticky"><svg viewBox="0 0 800 300" aria-hidden="true"><path id="p" d="M70 220 C 180 40, 320 40, 430 220 S 680 400, 730 120"></path></svg></div></div>`,
    script: scrollProg('#t') + `const pth=document.getElementById('p');const len=pth.getTotalLength();pth.style.strokeDasharray=len;pth.style.strokeDashoffset=len;addEventListener('scroll',()=>{const p=prog();pth.style.strokeDashoffset=String((1-p)*len);},{passive:true});`,
  }),

  'clip-path-scroll': () => ({
    style: `body{margin:0;background:#0a0a0c;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;overflow:hidden}.img{position:absolute;inset:0;background:url('${IMG}') center/cover;filter:saturate(1.15)}.mask{position:absolute;inset:0;background:#0a0a0c;clip-path:circle(calc(var(--r,0)*1%) at 50% 50%)}.copy{position:relative;z-index:1;height:100%;display:grid;place-items:center;text-align:center;padding:2rem}h1{font-size:clamp(2.2rem,7vw,4.8rem);letter-spacing:-.05em}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="img"></div><div class="mask" id="m"></div><div class="copy"><h1>Clip Reveal</h1></div></div></div>`,
    script: scrollProg('#t') + `const m=document.getElementById('m');addEventListener('scroll',()=>{const p=prog();m.style.setProperty('--r',String(10+p*90));},{passive:true});`,
  }),

  'vertical-stack': () => ({
    style: `body{margin:0;background:#0d0d0f;color:#e8e8ed;font-family:system-ui}.wrap{max-width:960px;margin:0 auto;padding:18vh 1.25rem 22vh}.shot{position:relative;margin:0 auto 18vh;width:min(90vw,760px);aspect-ratio:16/9;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.12);transform:translateY(var(--y,0px));opacity:var(--o,1)}.shot img{width:100%;height:100%;object-fit:cover;transform:scale(1.08)}.shot::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.45))}h1{position:fixed;left:22px;top:18px;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(232,232,237,.6)}`,
    body: `<h1>Vertical stack</h1><div class="wrap">${Array.from({length:5},()=>`<figure class="shot"><img src="${IMG}" alt=""></figure>`).join('')}</div>`,
    script: `const shots=[...document.querySelectorAll('.shot')];function tick(){shots.forEach(s=>{const r=s.getBoundingClientRect();const p=Math.min(1,Math.max(0,1-(r.top+r.height*.3)/innerHeight));s.style.setProperty('--y',(1-p)*40+'px');s.style.setProperty('--o',String(.35+p*.65));});requestAnimationFrame(tick);}tick();`,
  }),

  'horizontal-strip': () => ({
    style: `body{margin:0;background:#05070b;color:#e6f3ff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;overflow:hidden}.strip{display:flex;gap:16px;padding:0 12vw;transform:translateX(var(--x,0px));will-change:transform}.img{width:min(62vw,420px);aspect-ratio:9/12;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#0b1220}.img img{width:100%;height:100%;object-fit:cover;filter:contrast(1.05) saturate(1.2)}.cap{position:fixed;left:22px;top:18px;color:rgba(230,243,255,.6);letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}`,
    body: `<div class="cap">Horizontal strip</div><div class="track" id="t"><div class="sticky"><div class="strip" id="s">${Array.from({length:8},()=>`<div class="img"><img src="${IMG}" alt=""></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const s=document.getElementById('s');addEventListener('scroll',()=>{const p=prog();const max=s.scrollWidth-innerWidth+innerWidth*.1;s.style.setProperty('--x',-p*max+'px');},{passive:true});`,
  }),

  'parallax-layers': () => ({
    style: `body{margin:0;background:#0a0a0c;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;overflow:hidden}.l{position:absolute;inset:-12vh;background:url('${IMG}') center/cover;filter:brightness(.7) saturate(1.2);transform:translateY(calc(var(--p,0)*-60px)) scale(1.12)}.l2{mix-blend-mode:screen;opacity:.8;filter:hue-rotate(30deg);transform:translateY(calc(var(--p,0)*-120px)) scale(1.16)}.l3{opacity:.5;filter:hue-rotate(210deg) blur(1px);transform:translateY(calc(var(--p,0)*-200px)) scale(1.2)}.copy{position:relative;z-index:1;height:100%;display:grid;place-items:center;text-align:center;padding:2rem}h1{font-size:clamp(2.2rem,7vw,4.8rem);letter-spacing:-.05em;text-shadow:0 18px 60px rgba(0,0,0,.65)}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="l"></div><div class="l l2"></div><div class="l l3"></div><div class="copy"><h1>Parallax layers</h1></div></div></div>`,
    script: scrollProg('#t') + `addEventListener('scroll',()=>document.documentElement.style.setProperty('--p',String(prog())),{passive:true});`,
  }),

  'fade-sequence': () => ({
    style: `body{margin:0;background:#1a1410;color:#f5ebe0;font-family:Georgia,serif}.stage{min-height:100vh;display:grid;place-items:center;padding:2rem}.frame{position:fixed;inset:0;display:grid;place-items:center;opacity:var(--o,0);transition:opacity .6s ease;pointer-events:none}.frame.on{opacity:1;pointer-events:auto}.frame img{width:min(88vw,720px);aspect-ratio:16/10;object-fit:cover;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.5)}.cap{position:fixed;left:24px;bottom:24px;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,235,224,.5)}.spacer{height:400vh}`,
    body: `<div class="stage"><p style="opacity:.6">Scroll through the sequence</p></div>${[0,1,2,3].map(i=>`<div class="frame" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}<div class="spacer" id="t"></div><div class="cap" id="cap">01 / 04</div>`,
    script: scrollProg('#t') + `const frames=[...document.querySelectorAll('.frame')],cap=document.getElementById('cap');addEventListener('scroll',()=>{const p=prog();const i=Math.min(frames.length-1,Math.floor(p*frames.length));frames.forEach((f,j)=>f.classList.toggle('on',j===i));cap.textContent=String(i+1).padStart(2,'0')+' / '+String(frames.length).padStart(2,'0');},{passive:true});`,
  }),

  'zoom-pan': () => ({
    style: `body{margin:0;background:#000;color:#fff;font-family:system-ui}.track{height:280vh}.sticky{position:sticky;top:0;height:100vh;overflow:hidden}.viewport{width:100%;height:100%;overflow:hidden}.img{width:120%;height:120%;object-fit:cover;transform:scale(var(--s,1.2)) translate(var(--x,0),var(--y,0));will-change:transform}.hud{position:fixed;right:22px;top:22px;font-family:monospace;font-size:.75rem;color:rgba(255,255,255,.5);letter-spacing:.08em}`,
    body: `<div class="hud" id="hud">ZOOM 1.0</div><div class="track" id="t"><div class="sticky"><div class="viewport"><img class="img" id="img" src="${IMG}" alt=""></div></div></div>`,
    script: scrollProg('#t') + `const img=document.getElementById('img'),hud=document.getElementById('hud');addEventListener('scroll',()=>{const p=prog();const s=1.2+p*.8;img.style.setProperty('--s',String(s));img.style.setProperty('--x',-p*8+'%');img.style.setProperty('--y',-p*5+'%');hud.textContent='ZOOM '+s.toFixed(2);},{passive:true});`,
  }),

  'sticky-gallery': () => ({
    style: `body{margin:0;background:#f8f6f3;color:#1c1917;font-family:system-ui}.track{height:320vh}.sticky{position:sticky;top:0;height:100vh;display:grid;grid-template-columns:1fr 1fr;gap:0}.visual{position:relative;overflow:hidden;background:#111}.visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s}.visual img.on{opacity:1}.meta{display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,6vw,4rem)}.meta h2{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;letter-spacing:-.03em;margin-bottom:1rem}.meta p{color:#57534e;line-height:1.7;max-width:36ch}.idx{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:#a8a29e;margin-bottom:1.5rem}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="visual">${['Coast','Forest','Desert'].map((_,i)=>`<img src="${IMG}" alt="" data-i="${i}"${i?'':' class="on"'}>`).join('')}</div><div class="meta"><div class="idx" id="idx">01 - Coast</div><h2 id="title">Golden hour</h2><p id="desc">Light spills across the frame as you scroll through curated scenes.</p></div></div></div>`,
    script: scrollProg('#t') + `const data=[{t:'Golden hour',d:'Light spills across the frame.',l:'01 - Coast'},{t:'Deep canopy',d:'Shadow and mist in layered greens.',l:'02 - Forest'},{t:'Heat shimmer',d:'Warm tones and vast horizons.',l:'03 - Desert'}];const imgs=[...document.querySelectorAll('.visual img')];addEventListener('scroll',()=>{const p=prog();const i=Math.min(2,Math.floor(p*3));imgs.forEach((im,j)=>im.classList.toggle('on',j===i));document.getElementById('title').textContent=data[i].t;document.getElementById('desc').textContent=data[i].d;document.getElementById('idx').textContent=data[i].l;},{passive:true});`,
  }),

  'split-reveal': () => ({
    style: `body{margin:0;background:#0f0f12;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;grid-template-columns:1fr 1fr;overflow:hidden}.pane{position:relative;overflow:hidden}.pane img{width:120%;height:100%;object-fit:cover;will-change:transform}.left img{transform:translateX(calc(var(--p,0)*-30%))}.right img{transform:translateX(calc(var(--p,0)*30%))}.seam{position:absolute;left:50%;top:0;bottom:0;width:2px;background:linear-gradient(180deg,transparent,#fff,transparent);transform:translateX(-50%);z-index:2;opacity:var(--o,.3)}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="pane left"><img src="${IMG}" alt=""></div><div class="seam" id="seam"></div><div class="pane right"><img src="${IMG}" alt="" style="filter:hue-rotate(40deg)"></div></div></div>`,
    script: scrollProg('#t') + `const seam=document.getElementById('seam');addEventListener('scroll',()=>{const p=prog();document.documentElement.style.setProperty('--p',String(p));seam.style.setProperty('--o',String(.3+p*.7));},{passive:true});`,
  }),

  'mask-scroll': () => ({
    style: `body{margin:0;background:#0a1628;color:#b8d4f0;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.frame{width:min(90vw,700px);aspect-ratio:16/10;border-radius:20px;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(90deg,#000 calc(var(--w,0)*1%),transparent calc(var(--w,0)*1%));mask-image:linear-gradient(90deg,#000 calc(var(--w,0)*1%),transparent calc(var(--w,0)*1%))}.frame img{width:100%;height:100%;object-fit:cover}.label{margin-top:1.5rem;text-align:center;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(184,212,240,.6)}`,
    body: `<div class="track" id="t"><div class="sticky"><div><div class="frame" id="f"><img src="${IMG}" alt=""></div><div class="label">Mask wipe on scroll</div></div></div></div>`,
    script: scrollProg('#t') + `const f=document.getElementById('f');addEventListener('scroll',()=>{f.style.setProperty('--w',String(prog()*100));},{passive:true});`,
  }),

  'blur-focus': () => ({
    style: `body{margin:0;background:#111;color:#fff;font-family:system-ui;padding-bottom:40vh}.gallery{max-width:900px;margin:0 auto;padding:20vh 1.5rem;display:flex;flex-direction:column;gap:30vh}.item{opacity:.4;filter:blur(8px);transform:scale(.94);transition:opacity .6s,filter .6s,transform .6s}.item.focus{opacity:1;filter:none;transform:none}.item img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.4)}.item figcaption{margin-top:1rem;font-size:.85rem;color:rgba(255,255,255,.5);letter-spacing:.06em}`,
    body: `<div class="gallery">${['Dawn','Noon','Dusk','Night'].map(t=>`<figure class="item"><img src="${IMG}" alt=""><figcaption>${t}</figcaption></figure>`).join('')}</div>`,
    script: `const items=[...document.querySelectorAll('.item')];const obs=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('focus',e.isIntersecting)),{rootMargin:'-35% 0px -35% 0px',threshold:0});items.forEach(el=>obs.observe(el));`,
  }),

  'ken-burns': () => ({
    style: `body{margin:0;background:#000;color:#fff;font-family:Georgia,serif}.slides{position:relative;height:100vh;overflow:hidden}.slide{position:absolute;inset:0;opacity:0;transition:opacity 1s}.slide.on{opacity:1}.slide img{width:110%;height:110%;object-fit:cover;animation:kb 18s ease-in-out infinite alternate}@keyframes kb{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.15) translate(-3%,-2%)}}@media (prefers-reduced-motion:reduce){.slide img{animation:none}}.copy{position:absolute;bottom:3rem;left:3rem;z-index:2}.copy h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:400;font-style:italic}.dots{position:absolute;bottom:3rem;right:3rem;display:flex;gap:8px;z-index:2}.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3)}.dot.on{background:#fff}.spacer{height:300vh}`,
    body: `<div class="slides">${[0,1,2].map(i=>`<div class="slide${i?'':' on'}" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}<div class="copy"><h1 id="cap">Stillness in motion</h1></div><div class="dots" id="dots">${[0,1,2].map(i=>`<div class="dot${i?'':' on'}" data-i="${i}"></div>`).join('')}</div></div><div class="spacer" id="t"></div>`,
    script: scrollProg('#t') + `const slides=[...document.querySelectorAll('.slide')],dots=[...document.querySelectorAll('.dot')],caps=['Stillness in motion','Light finds form','Time unfolds'];addEventListener('scroll',()=>{const p=prog();const i=Math.min(2,Math.floor(p*3));slides.forEach((s,j)=>s.classList.toggle('on',j===i));dots.forEach((d,j)=>d.classList.toggle('on',j===i));document.getElementById('cap').textContent=caps[i];},{passive:true});`,
  }),

  'card-flip-scroll': () => ({
    style: `body{margin:0;background:linear-gradient(160deg,#1e1b4b,#312e81);color:#fff;font-family:system-ui;perspective:1200px}.track{height:280vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.card{width:min(80vw,340px);aspect-ratio:3/4;position:relative;transform-style:preserve-3d;transform:rotateY(var(--ry,0deg))}.face{position:absolute;inset:0;border-radius:20px;backface-visibility:hidden;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.45)}.face img{width:100%;height:100%;object-fit:cover}.back{transform:rotateY(180deg);background:linear-gradient(135deg,#6366f1,#a855f7);display:grid;place-items:center;padding:2rem;text-align:center}.back h2{font-size:1.5rem;font-weight:800}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="card" id="c"><div class="face front"><img src="${IMG}" alt=""></div><div class="face back"><h2>Behind<br>the frame</h2></div></div></div></div>`,
    script: scrollProg('#t') + `const c=document.getElementById('c');addEventListener('scroll',()=>c.style.setProperty('--ry',prog()*180+'deg'),{passive:true});`,
  }),

  'diagonal-drift': () => ({
    style: `body{margin:0;background:#fef3c7;color:#78350f;font-family:ui-serif,Georgia,serif;overflow-x:hidden}.wrap{padding:15vh 0 50vh}.row{display:flex;gap:20px;margin-bottom:24vh;will-change:transform}.row:nth-child(even){flex-direction:row-reverse}.tile{flex:0 0 min(55vw,380px);aspect-ratio:4/3;border-radius:14px;overflow:hidden;box-shadow:0 16px 50px rgba(120,53,15,.15)}.tile img{width:100%;height:100%;object-fit:cover}.head{text-align:center;padding:0 2rem 8vh}.head h1{font-size:clamp(2rem,6vw,3.5rem);font-weight:400;letter-spacing:-.02em}`,
    body: `<div class="head"><h1>Diagonal drift</h1></div><div class="wrap">${Array.from({length:4},(_,r)=>`<div class="row" data-r="${r}">${Array.from({length:3},()=>`<div class="tile"><img src="${IMG}" alt=""></div>`).join('')}</div>`).join('')}</div>`,
    script: `const rows=[...document.querySelectorAll('.row')];function tick(){rows.forEach((row,i)=>{const r=row.getBoundingClientRect();const p=1-Math.min(1,Math.max(0,(r.top+r.height*.5)/innerHeight));const dir=i%2?1:-1;row.style.transform='translateX('+dir*p*80+'px) translateY('+(1-p)*30+'px)';});requestAnimationFrame(tick);}tick();`,
  }),

  'grid-unfold': () => ({
    style: `body{margin:0;background:#0c0c0e;color:#fff;font-family:system-ui}.track{height:260vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;padding:2rem}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:min(92vw,720px)}.cell{aspect-ratio:1;border-radius:12px;overflow:hidden;opacity:var(--o,0);transform:scale(var(--s,.6)) rotate(var(--r,-8deg));transition:opacity .4s,transform .5s cubic-bezier(.2,.8,.2,1)}.cell img{width:100%;height:100%;object-fit:cover}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="grid" id="g">${Array.from({length:9},(_,i)=>`<div class="cell" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const cells=[...document.querySelectorAll('.cell')];addEventListener('scroll',()=>{const p=prog();cells.forEach((c,i)=>{const t=Math.min(1,Math.max(0,(p*1.4)-i*.08));c.style.setProperty('--o',String(t));c.style.setProperty('--s',String(.6+t*.4));c.style.setProperty('--r',(-8+t*8)+'deg');});},{passive:true});`,
  }),

  'spin-wheel': () => ({
    style: `body{margin:0;background:#0b0b10;color:#fff;font-family:system-ui}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.wheel{width:min(80vw,520px);aspect-ratio:1;border-radius:50%;border:1px solid rgba(255,255,255,.12);position:relative;transform:rotate(var(--r,0deg));background:radial-gradient(circle at 50% 50%,rgba(255,108,176,.12),transparent 60%),radial-gradient(circle at 30% 20%,rgba(108,140,255,.14),transparent 55%)}.spoke{position:absolute;left:50%;top:50%;width:14px;height:14px;border-radius:50%;background:#fff;transform-origin:center center;box-shadow:0 0 0 6px rgba(255,255,255,.08)}.label{position:absolute;inset:0;display:grid;place-items:center;text-align:center}h1{font-size:clamp(2.1rem,6vw,3.4rem);letter-spacing:-.05em}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="wheel" id="w">${[0,45,90,135,180,225,270,315].map(d=>`<div class="spoke" style="transform:translate(-50%,-50%) rotate(${d}deg) translateY(-46%)"></div>`).join('')}<div class="label"><h1>Spin wheel</h1><p style="opacity:.7;margin-top:.6rem">Scroll rotates the ring</p></div></div></div></div>`,
    script: scrollProg('#t') + `const w=document.getElementById('w');addEventListener('scroll',()=>w.style.setProperty('--r',prog()*1080+'deg'),{passive:true});`,
  }),

  'flip-cards': () => ({
    style: `body{margin:0;background:#18181b;color:#fafafa;font-family:system-ui;perspective:1000px}.track{height:280vh}.sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:clamp(12px,3vw,24px);padding:2rem;flex-wrap:wrap}.card{width:min(28vw,160px);aspect-ratio:3/4;position:relative;transform-style:preserve-3d;transform:rotateY(var(--ry,0deg))}.face{position:absolute;inset:0;border-radius:14px;backface-visibility:hidden;display:grid;place-items:center;font-weight:800;font-size:1.2rem}.front{background:linear-gradient(145deg,#3f3f46,#27272a);border:1px solid #52525b}.back{transform:rotateY(180deg);background:linear-gradient(145deg,#ec4899,#8b5cf6)}`,
    body: `<div class="track" id="t"><div class="sticky">${['A','B','C','D'].map((l,i)=>`<div class="card" style="--ry:0deg" data-i="${i}"><div class="face front">${l}</div><div class="face back">${i+1}</div></div>`).join('')}</div></div>`,
    script: scrollProg('#t') + `const cards=[...document.querySelectorAll('.card')];addEventListener('scroll',()=>{const p=prog();cards.forEach((c,i)=>{const t=Math.min(1,Math.max(0,(p*1.3)-i*.15));c.style.setProperty('--ry',t*180+'deg');});},{passive:true});`,
  }),

  'orbit-gallery': () => ({
    style: `body{margin:0;background:#030712;color:#e5e7eb;font-family:system-ui}.track{height:260vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.orbit{position:relative;width:min(90vw,500px);height:min(90vw,500px)}.item{position:absolute;left:50%;top:50%;width:100px;height:70px;margin:-35px -50px;border-radius:10px;overflow:hidden;border:2px solid rgba(255,255,255,.15);box-shadow:0 12px 40px rgba(0,0,0,.5);transform:rotate(var(--a,0deg)) translateY(-200px) rotate(calc(var(--a,0deg)*-1))}.item img{width:100%;height:100%;object-fit:cover}.core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#6c8cff,#4a5fd4);display:grid;place-items:center;font-weight:800;font-size:.75rem;letter-spacing:.08em}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="orbit" id="o">${Array.from({length:6},(_,i)=>`<div class="item" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}<div class="core">ORBIT</div></div></div></div>`,
    script: scrollProg('#t') + `const items=[...document.querySelectorAll('.item')];addEventListener('scroll',()=>{const base=prog()*360;items.forEach((el,i)=>el.style.setProperty('--a',base+i*60+'deg'));},{passive:true});`,
  }),

  'text-helix': () => ({
    style: `body{margin:0;background:#0f172a;color:#38bdf8;font-family:monospace;perspective:800px}.track{height:300vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.helix{position:relative;width:100%;height:400px;transform-style:preserve-3d}.ch{position:absolute;left:50%;font-size:clamp(2rem,6vw,4rem);font-weight:900;color:#fff;text-shadow:0 0 30px rgba(56,189,248,.5);transform:translateX(-50%) translateY(var(--y,0)) rotateY(var(--ry,0deg)) translateZ(var(--z,0px));opacity:var(--o,.3)}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="helix" id="h">${'HELIX'.split('').map((c,i)=>`<span class="ch" data-i="${i}">${c}</span>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const chs=[...document.querySelectorAll('.ch')];addEventListener('scroll',()=>{const p=prog();chs.forEach((el,i)=>{const ang=p*720+i*72;el.style.setProperty('--y',Math.sin(ang*Math.PI/180)*120+'px');el.style.setProperty('--ry',ang+'deg');el.style.setProperty('--z',Math.cos(ang*Math.PI/180)*80+'px');el.style.setProperty('--o',String(.3+Math.abs(Math.cos(ang*Math.PI/180))*.7));});},{passive:true});`,
  }),

  'cube-rotate': () => ({
    style: `body{margin:0;background:#05070b;color:#e6f3ff;font-family:system-ui;perspective:900px}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.cube{width:220px;height:220px;position:relative;transform-style:preserve-3d;transform:rotateX(var(--x,20deg)) rotateY(var(--y,30deg))}.f{position:absolute;inset:0;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.35);display:grid;place-items:center;font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:.75rem}.f:nth-child(1){transform:translateZ(110px)}.f:nth-child(2){transform:rotateY(90deg) translateZ(110px)}.f:nth-child(3){transform:rotateY(180deg) translateZ(110px)}.f:nth-child(4){transform:rotateY(-90deg) translateZ(110px)}.f:nth-child(5){transform:rotateX(90deg) translateZ(110px)}.f:nth-child(6){transform:rotateX(-90deg) translateZ(110px)}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="cube" id="c">${[1,2,3,4,5,6].map(i=>`<div class="f">Face ${i}</div>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const c=document.getElementById('c');addEventListener('scroll',()=>{const p=prog();c.style.setProperty('--x',20+p*320+'deg');c.style.setProperty('--y',30+p*420+'deg');},{passive:true});`,
  }),

  'spiral-path': () => ({
    style: `body{margin:0;background:#1c1917;color:#fcd34d;font-family:system-ui}.track{height:280vh}.sticky{position:sticky;top:0;height:100vh;overflow:hidden}.path{position:absolute;inset:0}.node{position:absolute;width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid #fcd34d;box-shadow:0 0 20px rgba(252,211,77,.3);transform:translate(-50%,-50%)}.node img{width:100%;height:100%;object-fit:cover}svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}path{fill:none;stroke:rgba(252,211,77,.2);stroke-width:2;stroke-dasharray:8 8}`,
    body: `<div class="track" id="t"><div class="sticky"><svg viewBox="0 0 400 400"><path d="M200 200 m-20 0 a 20 20 0 1 0 40 0 a 30 30 0 1 1 -60 0 a 50 50 0 1 0 100 0 a 80 80 0 1 1 -160 0"></path></svg><div class="path" id="path">${Array.from({length:8},(_,i)=>`<div class="node" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const nodes=[...document.querySelectorAll('.node')];const cx=innerWidth/2,cy=innerHeight/2;addEventListener('scroll',()=>{const p=prog();nodes.forEach((n,i)=>{const t=p*8+i*.4;const r=40+t*35;const a=t*1.2;const x=cx+Math.cos(a)*r;const y=cy+Math.sin(a)*r;n.style.left=x+'px';n.style.top=y+'px';n.style.opacity=String(Math.min(1,Math.max(0,p*1.5-i*.1)));});},{passive:true});`,
  }),

  '3d-carousel': () => ({
    style: `body{margin:0;background:#000;color:#fff;font-family:system-ui;perspective:1000px;overflow-x:hidden}.track{height:260vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.ring{position:relative;width:300px;height:200px;transform-style:preserve-3d;transform:rotateY(var(--ry,0deg))}.panel{position:absolute;left:50%;top:50%;width:200px;height:130px;margin:-65px -100px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.2);backface-visibility:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}.panel img{width:100%;height:100%;object-fit:cover}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="ring" id="r">${Array.from({length:6},(_,i)=>`<div class="panel" style="transform:rotateY(${i*60}deg) translateZ(280px)"><img src="${IMG}" alt=""></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t') + `const r=document.getElementById('r');addEventListener('scroll',()=>r.style.setProperty('--ry',prog()*360+'deg'),{passive:true});`,
  }),

  'rotate-text': () => ({
    style: `body{margin:0;background:#fafafa;color:#111;font-family:system-ui;overflow:hidden}.track{height:240vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.ring-text{position:relative;width:min(85vw,500px);height:min(85vw,500px)}.letter{position:absolute;left:50%;top:0;font-size:clamp(1.2rem,3vw,1.8rem);font-weight:900;transform-origin:0 250px;transform:rotate(var(--a,0deg))}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="ring-text" id="rt">${'CIRCULAR TYPE SCROLL'.split('').map((c,i)=>`<span class="letter" data-i="${i}">${c===' '?'&nbsp;':c}</span>`).join('')}</div></div></div>`,
    script: scrollProg('#t')+`const letters=[...document.querySelectorAll('.letter')];const step=360/letters.length;letters.forEach((l,i)=>l.style.setProperty('--a',i*step+'deg'));addEventListener('scroll',()=>{const rot=prog()*180;letters.forEach((l,i)=>l.style.setProperty('--a',i*step+rot+'deg'));},{passive:true});`,
  }),

  'pin-wheel': () => ({
    style: `body{margin:0;background:radial-gradient(circle at 50% 0%,#1e293b,#0f172a);color:#fff;font-family:system-ui}.track{height:300vh}.pin{position:sticky;top:0;height:100vh;display:grid;place-items:center}.wheel{width:min(75vw,440px);aspect-ratio:1;border-radius:50%;position:relative;border:3px solid rgba(148,163,184,.2)}.seg{position:absolute;inset:8%;border-radius:50%;clip-path:polygon(50% 50%,50% 0%,100% 0%,100% 100%,0% 100%,0% 0%,50% 0%);background:conic-gradient(from var(--base,0deg),#6366f1,#ec4899,#f59e0b,#22d3ee,#6366f1);transform:rotate(var(--r,0deg));mask:radial-gradient(circle,transparent 42%,#000 43%)}.hub{position:absolute;inset:35%;border-radius:50%;background:#0f172a;display:grid;place-items:center;font-weight:800;font-size:.85rem;letter-spacing:.1em;border:2px solid rgba(255,255,255,.1)}`,
    body: `<div class="track" id="t"><div class="pin"><div class="wheel"><div class="seg" id="seg"></div><div class="hub">PIN</div></div></div></div>`,
    script: scrollProg('#t')+`const seg=document.getElementById('seg');addEventListener('scroll',()=>seg.style.setProperty('--r',prog()*720+'deg'),{passive:true});`,
  }),

  'orbit-cards': () => ({
    style: `body{margin:0;background:#111827;color:#f9fafb;font-family:system-ui}.track{height:260vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center}.system{position:relative;width:min(95vw,560px);height:min(95vw,560px)}.card{position:absolute;left:50%;top:50%;width:140px;padding:1rem;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);transform:rotate(var(--a,0deg)) translateY(-220px) rotate(calc(var(--a,0deg)*-1));text-align:center}.card strong{display:block;font-size:1.1rem;margin-bottom:.25rem}.card span{font-size:.7rem;color:rgba(249,250,251,.6)}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="system">${['Alpha','Beta','Gamma','Delta','Epsilon'].map((n,i)=>`<div class="card" data-i="${i}"><strong>${n}</strong><span>Orbit ${i+1}</span></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t')+`const cards=[...document.querySelectorAll('.card')];addEventListener('scroll',()=>{const base=prog()*360;cards.forEach((c,i)=>c.style.setProperty('--a',base+i*72+'deg'));},{passive:true});`,
  }),

  'twist-columns': () => ({
    style: `body{margin:0;background:#0a0a0c;color:#fff;font-family:system-ui;perspective:1200px}.track{height:280vh}.sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:clamp(8px,2vw,20px);padding:2rem}.col{flex:1;max-width:180px;transform-style:preserve-3d;transform:rotateY(var(--ry,0deg))}.col img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.5)}.col:nth-child(2){transform:rotateY(var(--ry2,0deg))}.col:nth-child(3){transform:rotateY(var(--ry3,0deg))}`,
    body: `<div class="track" id="t"><div class="sticky">${[0,1,2].map(i=>`<div class="col" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}</div></div>`,
    script: scrollProg('#t')+`const cols=[...document.querySelectorAll('.col')];addEventListener('scroll',()=>{const p=prog();cols.forEach((c,i)=>{const ry=(i-1)*p*45;c.style.setProperty('--ry',ry+'deg');if(i===1)c.style.setProperty('--ry2',ry+'deg');if(i===2)c.style.setProperty('--ry3',ry+'deg');});},{passive:true});`,
  }),

  'revolve-badge': () => ({
    style: `body{margin:0;min-height:240vh;background:#fef2f2;color:#991b1b;font-family:system-ui;display:grid;place-items:center}.badge-wrap{position:sticky;top:30vh;width:200px;height:200px}.badge{position:absolute;inset:0;border-radius:50%;border:3px solid #dc2626;display:grid;place-items:center;transform:rotate(var(--r,0deg));background:#fff;box-shadow:0 12px 40px rgba(220,38,38,.2)}.badge svg{width:70%;height:70%}.badge text{font-size:11px;font-weight:800;letter-spacing:.15em;fill:#991b1b}.trail{position:absolute;inset:-20px;border-radius:50%;border:1px dashed rgba(220,38,38,.25);transform:rotate(calc(var(--r,0deg)*-1))}`,
    body: `<div id="t" style="height:240vh"><div class="badge-wrap"><div class="trail" id="trail"></div><div class="badge" id="badge"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" stroke-width="1"/><text x="50" y="54" text-anchor="middle">CERTIFIED</text></svg></div></div></div>`,
    script: scrollProg('#t')+`const b=document.getElementById('badge'),t=document.getElementById('trail');addEventListener('scroll',()=>{const r=prog()*360;b.style.setProperty('--r',r+'deg');t.style.setProperty('--r',r+'deg');},{passive:true});`,
  }),

  'helix-images': () => ({
    style: `body{margin:0;background:#020617;color:#fff;font-family:system-ui;perspective:1000px}.track{height:320vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.helix{position:relative;width:100%;height:500px;transform-style:preserve-3d}.img-wrap{position:absolute;left:50%;width:120px;height:80px;margin-left:-60px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.15);transform:translateY(var(--y,0)) rotateY(var(--ry,0deg)) translateZ(var(--z,0));box-shadow:0 12px 40px rgba(0,0,0,.5)}.img-wrap img{width:100%;height:100%;object-fit:cover}`,
    body: `<div class="track" id="t"><div class="sticky"><div class="helix" id="hx">${Array.from({length:10},(_,i)=>`<div class="img-wrap" data-i="${i}"><img src="${IMG}" alt=""></div>`).join('')}</div></div></div>`,
    script: scrollProg('#t')+`const wraps=[...document.querySelectorAll('.img-wrap')];addEventListener('scroll',()=>{const p=prog();wraps.forEach((w,i)=>{const ang=p*1080+i*36;const y=Math.sin(ang*Math.PI/180)*180;const z=Math.cos(ang*Math.PI/180)*100;w.style.setProperty('--y',y+'px');w.style.setProperty('--ry',ang+'deg');w.style.setProperty('--z',z+'px');});},{passive:true});`,
  }),

  'glass-card': () => ({
    style: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07070a;overflow:hidden;font-family:system-ui;color:#fff}${reduced}.orb{position:fixed;inset:auto;filter:blur(40px);opacity:.75;mix-blend-mode:screen;animation:drift 12s ease-in-out infinite alternate}.o1{width:420px;height:420px;left:-140px;top:10vh;background:radial-gradient(circle,#ff6cb0,transparent 60%)}.o2{width:520px;height:520px;right:-180px;bottom:6vh;background:radial-gradient(circle,#6c8cff,transparent 60%);animation-duration:14s}@keyframes drift{to{transform:translate(80px,-60px) scale(1.05)}}.card{position:relative;width:min(92vw,520px);padding:30px 26px;border-radius:24px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);backdrop-filter:blur(14px);box-shadow:0 24px 80px rgba(0,0,0,.55)}.card::before{content:'';position:absolute;inset:1px;border-radius:23px;background:linear-gradient(135deg,rgba(255,108,176,.28),rgba(108,140,255,.22));opacity:.55;pointer-events:none;mix-blend-mode:screen}h1{font-size:2rem;letter-spacing:-.03em;font-weight:900;position:relative}p{margin-top:.75rem;color:rgba(255,255,255,.72);line-height:1.5;position:relative}.btn{margin-top:1.25rem;display:inline-flex;gap:10px;align-items:center;padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:#fff;font-weight:650;position:relative;cursor:pointer}`,
    body: `<div class="orb o1"></div><div class="orb o2"></div><div class="card"><h1>Glass Card</h1><p>True glass: blur, soft gradients, and a bright edge.</p><span class="btn">Premium feel <span style="opacity:.65">→</span></span></div>`,
    script: '',
  }),
};

module.exports = { RECIPES, IMG, scrollProg };
