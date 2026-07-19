const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'presets');
const IMG169 = '../stock/media/16-9 Aspect Ratio(image).png';
const VID169 = '../stock/media/16-9 Aspect Ratio(video).mp4';
const IMG45 = '../stock/media/4-5 Aspect Ratio(image).png';
const VID45 = '../stock/media/4-5 Aspect Ratio(video).mp4';
const IMG916 = '../stock/media/9-16 Aspect Ratio(image).png';
const VID916 = '../stock/media/9-16 Aspect Ratio(video).mp4';
const { RECIPES: navRecipes } = require('./recipes/navigation');
const { RECIPES: embedRecipes } = require('./recipes/embed-components');
const { RECIPES: bgRecipes } = require('./recipes/backgrounds');
const { RECIPES: staggerRecipes } = require('./recipes/staggered-grids');

function bgHtml(id, slug, title, tags, key) {
  const r = bgRecipes[key]();
  return wrap({ id, slug, title, category: 'backgrounds', tags }, title, r.style, r.body, r.script || '');
}

function staggerHtml(id, slug, title, tags, key) {
  const r = staggerRecipes[key]();
  return wrap({ id, slug, title, category: 'animation', tags }, title, r.style, r.body, r.script || '');
}

function embedHtml(id, slug, title, category, tags, key) {
  const r = embedRecipes[key]();
  return wrap({ id, slug, title, category, tags }, title, r.style, r.body, r.script || '');
}

function navHtml(id, slug, title, tags, key) {
  const r = navRecipes[key]();
  return wrap({ id, slug, title, category: 'navigation', tags }, title, r.style, r.body, r.script || '');
}

function wrap(meta, title, style, body, script = '') {
  const tags = meta.tags.join(', ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!--
    @preset
    id: ${meta.id}
    slug: ${meta.slug}
    title: ${meta.title}
    category: ${meta.category}
    tags: ${tags}
  -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.id} - ${title}</title>
  <style>
    @import url('../shared/preset-reset.css');
    ${style}
  </style>
</head>
<body>
${body}
${script ? `<script>${script}</script>` : ''}
</body>
</html>
`;
}

const presets = [
  // TEXT 001-008
  { id:'001', slug:'hero-text-reveal', title:'Hero Text Reveal', category:'text', tags:['hero','animation','typography'],
    html: wrap({id:'001',slug:'hero-text-reveal',title:'Hero Text Reveal',category:'text',tags:['hero','animation','typography']},'Hero Text Reveal',`
    body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c;color:#fff;overflow:hidden}
    .hero{font-size:clamp(2.5rem,8vw,6rem);font-weight:800;letter-spacing:-0.03em;text-align:center;padding:2rem}
    .hero span{display:inline-block;opacity:0;transform:translateY(60px);animation:reveal .8s cubic-bezier(.16,1,.3,1) forwards}
    .hero span:nth-child(1){animation-delay:.1s}.hero span:nth-child(2){animation-delay:.25s}.hero span:nth-child(3){animation-delay:.4s}
    @keyframes reveal{to{opacity:1;transform:translateY(0)}}
    `,`<div class="hero"><span>Design</span> <span>Beyond</span> <span>Limits</span></div>`) },

  { id:'002', slug:'animated-gradient-text', title:'Animated Gradient Text', category:'text', tags:['gradient','animation'],
    html: wrap({id:'002',slug:'animated-gradient-text',title:'Animated Gradient Text',category:'text',tags:['gradient','animation']},'Animated Gradient Text',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}
    h1{font-size:clamp(3rem,10vw,7rem);font-weight:900;background:linear-gradient(90deg,#6c8cff,#ff6cb0,#6cffb8,#6c8cff);background-size:300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shift 4s ease infinite}
    @keyframes shift{0%,100%{background-position:0%}50%{background-position:100%}}
    `,`<h1>GRADIENT</h1>`) },

  { id:'003', slug:'typewriter-effect', title:'Typewriter Effect', category:'text', tags:['typewriter','animation'],
    html: fs.readFileSync(path.join(OUT, '003-typewriter-effect.html'), 'utf8') },

  { id:'004', slug:'split-line-stagger', title:'Split Line Stagger', category:'text', tags:['stagger','typography'],
    html: wrap({id:'004',slug:'split-line-stagger',title:'Split Line Stagger',category:'text',tags:['stagger','typography']},'Split Line Stagger',`
    body{display:grid;place-items:center;min-height:100vh;background:#fafafa;color:#111}
    .lines{font-size:clamp(2rem,6vw,4.5rem);font-weight:700;line-height:1.15;text-align:center}
    .line{overflow:hidden;line-height:1.15;padding:.12em 0}
    .line span{display:block;transform:translateY(110%);animation:up .7s cubic-bezier(.16,1,.3,1) forwards}
    .line:nth-child(1) span{animation-delay:.1s}.line:nth-child(2) span{animation-delay:.25s}.line:nth-child(3) span{animation-delay:.4s}
    @keyframes up{to{transform:translateY(0)}}
    `,`<div class="lines"><div class="line"><span>Think</span></div><div class="line"><span>Bigger</span></div><div class="line"><span>Together</span></div></div>`) },

  { id:'005', slug:'scramble-decode', title:'Scramble Decode', category:'text', tags:['scramble','interactive'],
    html: wrap({id:'005',slug:'scramble-decode',title:'Scramble Decode',category:'text',tags:['scramble','interactive']},'Scramble Decode',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#fff}
    h1{font-size:clamp(2rem,6vw,4rem);font-family:monospace;letter-spacing:.1em;cursor:default}
    `,`<h1 id="t">PRESET LIBRARY</h1>`,`const chars='!@#$%&*ABCDEFGHIJKLMNOPQRSTUVWXYZ';const el=document.getElementById('t');const target='PRESET LIBRARY';let frame=0;const tick=52;function scramble(){let out='';for(let i=0;i<target.length;i++){if(target[i]===' '){out+=' ';continue}out+=frame>i*3?target[i]:chars[Math.floor(Math.random()*chars.length)]}el.textContent=out;if(frame<target.length*3+10)setTimeout(()=>{frame++;scramble()},tick);}setTimeout(scramble,380);`) },

  { id:'006', slug:'outlined-hover-fill', title:'Outlined Hover Fill', category:'text', tags:['hover','outline'],
    html: fs.readFileSync(path.join(OUT, '006-outlined-hover-fill.html'), 'utf8') },

  { id:'007', slug:'infinite-marquee', title:'Infinite Marquee', category:'text', tags:['marquee','banner'],
    html: fs.readFileSync(path.join(OUT, '007-infinite-marquee.html'), 'utf8') },

  // ANIMATION 009-015
  { id:'009', slug:'fade-in-on-scroll', title:'Fade In On Scroll', category:'animation', tags:['scroll','fade'],
    html: fs.readFileSync(path.join(OUT, '009-fade-in-on-scroll.html'), 'utf8') },

  { id:'010', slug:'staggered-grid', title:'Staggered Grid', category:'animation', tags:['grid','stagger'],
    html: staggerHtml('010','staggered-grid','Staggered Grid',['grid','stagger'],'staggered-grid') },

  { id:'011', slug:'counting-numbers', title:'Counting Numbers', category:'animation', tags:['counter','numbers'],
    html: wrap({id:'011',slug:'counting-numbers',title:'Counting Numbers',category:'animation',tags:['counter','numbers']},'Counting Numbers',`
    @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#000;font-family:system-ui,-apple-system,sans-serif}
    .stat{text-align:center;padding:2rem}.num{font-family:'Anton',sans-serif;font-size:clamp(5rem,20vw,10rem);font-weight:400;line-height:.92;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
    .label{margin-top:1.1rem;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.42)}
    `,`<div class="stat"><div class="num" id="n">0</div><div class="label">Presets &amp; growing</div></div>`,`
    const el=document.getElementById('n'),target=100,duration=2200;const ease=t=>1-Math.pow(1-t,3);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=target;}else{const t0=performance.now();(function tick(now){const p=Math.min((now-t0)/duration,1);el.textContent=Math.round(ease(p)*target);if(p<1)requestAnimationFrame(tick);else el.textContent=target;})(t0);}
    `) },

  { id:'012', slug:'magnetic-button', title:'Magnetic Button', category:'animation', tags:['button','magnetic'],
    html: wrap({id:'012',slug:'magnetic-button',title:'Magnetic Button',category:'animation',tags:['button','magnetic']},'Magnetic Button',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}
    .wrap{padding:2rem}.btn{padding:16px 40px;border:none;border-radius:99px;background:#6c8cff;color:#fff;font-size:1rem;font-weight:600;transition:transform .15s ease-out}
    `,`<div class="wrap"><button class="btn" id="btn">Magnetic CTA</button></div>`,`
    const btn=document.getElementById('btn');const radius=Math.min(innerWidth,innerHeight)*.55;const strength=.42;
    function pull(x,y){const r=btn.getBoundingClientRect();const dx=x-(r.left+r.width/2);const dy=y-(r.top+r.height/2);const dist=Math.hypot(dx,dy);if(dist>radius){btn.style.transform='';return;}const f=(1-dist/radius)*strength;btn.style.transform='translate('+dx*f+'px,'+dy*f+'px)';}
    document.addEventListener('mousemove',e=>pull(e.clientX,e.clientY),{passive:true});
    document.addEventListener('mouseleave',()=>btn.style.transform='');
    `) },

  { id:'013', slug:'click-ripple', title:'Click Ripple', category:'animation', tags:['ripple','click'],
    html: fs.readFileSync(path.join(OUT, '013-click-ripple.html'), 'utf8') },

  { id:'015', slug:'svg-path-draw', title:'SVG Path Draw', category:'animation', tags:['svg','draw'],
    html: wrap({id:'015',slug:'svg-path-draw',title:'SVG Path Draw',category:'animation',tags:['svg','draw']},'SVG Path Draw',`
    body{margin:0;min-height:100vh;background:#000;overflow:hidden}
    body.done{background:#fff}
    .draw-stage{position:fixed;left:0;right:0;top:50%;height:2px;width:100%;transform:translateY(-50%);z-index:2;display:block}
    .line{stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-dasharray:50;stroke-dashoffset:50}
    .line.draw{animation:draw 1.5s ease forwards}@keyframes draw{to{stroke-dashoffset:0}}
    .expand-bar{position:fixed;inset:0;background:#fff;transform:scaleY(0);transform-origin:center;z-index:1;pointer-events:none}
    .expand-bar.go{animation:zoom 1.35s cubic-bezier(.76,0,.24,1) forwards}@keyframes zoom{to{transform:scaleY(1)}}
    @media (prefers-reduced-motion:reduce){.line.draw{animation:none;stroke-dashoffset:0}.expand-bar{transform:none}body{background:#fff}}
    `,`<svg class="draw-stage" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><line class="line" x1="50" y1="1" x2="0" y2="1"/><line class="line" x1="50" y1="1" x2="100" y2="1"/></svg><div class="expand-bar" id="bar"></div>`,`
    const lines=document.querySelectorAll('.line'),bar=document.getElementById('bar'),root=document.body;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){root.classList.add('done');}else{lines.forEach(l=>l.classList.add('draw'));lines[0].addEventListener('animationend',()=>{bar.classList.add('go');document.querySelector('.draw-stage').style.opacity='0';},{once:true});bar.addEventListener('animationend',()=>root.classList.add('done'),{once:true});}
    `) },

  // SCROLL 016-020
  { id:'016', slug:'parallax-hero-layers', title:'Parallax Hero Layers', category:'scroll', tags:['parallax','hero'],
    html: fs.readFileSync(path.join(OUT, '016-parallax-hero-layers.html'), 'utf8') },

  { id:'018', slug:'scroll-snap-gallery', title:'Scroll Snap Gallery', category:'scroll', tags:['snap','gallery'],
    html: wrap({id:'018',slug:'scroll-snap-gallery',title:'Scroll Snap Gallery',category:'scroll',tags:['snap','gallery']},'Scroll Snap Gallery',`
    body{margin:0;height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory;background:#000}
    .slide{height:100vh;scroll-snap-align:start;display:grid;place-items:center;font-size:3rem;font-weight:800;color:#fff}
    .slide:nth-child(1){background:linear-gradient(135deg,#6c8cff,#3a5ccc)}
    .slide:nth-child(2){background:linear-gradient(135deg,#ff6cb0,#cc3a7a)}
    .slide:nth-child(3){background:linear-gradient(135deg,#6cffb8,#3acc8a)}
  `,`${['One','Two','Three'].map(s=>`<section class="slide">${s}</section>`).join('')}`) },

  { id:'019', slug:'scroll-progress-indicator', title:'Scroll Progress Indicator', category:'scroll', tags:['progress','scroll'],
    html: wrap({id:'019',slug:'scroll-progress-indicator',title:'Scroll Progress Indicator',category:'scroll',tags:['progress','scroll']},'Scroll Progress Indicator',`
    body{background:#f5f5f5;color:#111}
    .bar{position:fixed;top:0;left:0;height:4px;background:#6c8cff;width:0;z-index:99;transition:width .1s}
    section{min-height:100vh;display:grid;place-items:center;font-size:2rem;padding:2rem}
    `,`<div class="bar" id="bar"></div>${[1,2,3,4].map(n=>`<section>Section ${n}</section>`).join('')}`,`
    const bar=document.getElementById('bar');
    window.addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-window.innerHeight;bar.style.width=(window.scrollY/h*100)+'%';});
    `) },

  { id:'020', slug:'sticky-section-headers', title:'Sticky Section Headers', category:'scroll', tags:['sticky','headers'],
    html: fs.readFileSync(path.join(OUT, '020-sticky-section-headers.html'), 'utf8') },
];

// Continue with more presets in part 2 - I'll append image, video, cards, etc.
// For efficiency, write remaining presets inline below

const presets2 = [
  // IMAGE 021-025
  { id:'021', slug:'image-hover-zoom', title:'Image Hover Zoom', category:'image', tags:['hover','zoom'],
    html: wrap({id:'021',slug:'image-hover-zoom',title:'Image Hover Zoom',category:'image',tags:['hover','zoom']},'Image Hover Zoom',`
    body{display:grid;place-items:center;min-height:100vh;background:#111;padding:2rem}
    .frame{width:min(90vw,600px);aspect-ratio:16/9;border-radius:16px;overflow:hidden;cursor:pointer}
    .frame img{width:100%;height:100%;object-fit:cover;transition:transform 1s cubic-bezier(.16,1,.3,1)}
    .frame:hover img{transform:scale(1.12)}
    `,`<div class="frame"><img src="${IMG169}" alt="16:9"></div>`) },

  { id:'022', slug:'clip-path-reveal', title:'Clip Path Reveal', category:'image', tags:['clip-path','reveal'],
    html: wrap({id:'022',slug:'clip-path-reveal',title:'Clip Path Reveal',category:'image',tags:['clip-path','reveal']},'Clip Path Reveal',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}
    .img{width:min(80vw,400px);aspect-ratio:4/5;border-radius:8px;overflow:hidden}
    .img img{width:100%;height:100%;object-fit:cover;clip-path:inset(50% 0 50% 0);transform:scale(1.12);animation:reveal 2.4s cubic-bezier(.22,.61,.36,1) forwards}
    @keyframes reveal{to{clip-path:inset(0);transform:scale(1)}}
    @media (prefers-reduced-motion:reduce){.img img{clip-path:inset(0);transform:none;animation:none}}
    `,`<div class="img"><img src="${IMG45}" alt="4:5"></div>`) },

  { id:'024', slug:'before-after-slider', title:'Before After Slider', category:'image', tags:['slider','comparison'],
    html: wrap({id:'024',slug:'before-after-slider',title:'Before After Slider',category:'image',tags:['slider','comparison']},'Before After Slider',`
    body{display:grid;place-items:center;min-height:100vh;background:#111;padding:2rem}
    .compare{position:relative;width:min(90vw,500px);aspect-ratio:9/16;border-radius:12px;overflow:hidden;user-select:none}
    .compare img{width:100%;height:100%;object-fit:cover;display:block}
    .after{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
    .handle{position:absolute;top:0;bottom:0;left:50%;width:4px;background:#fff;transform:translateX(-50%);cursor:ew-resize}
    .handle::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:#fff;border:3px solid #6c8cff}
    `,`<div class="compare" id="c"><img src="${IMG916}" alt="before" style="filter:grayscale(1)"><div class="after"><img src="${IMG916}" alt="after"></div><div class="handle" id="h"></div></div>`,`
    const c=document.getElementById('c'),h=document.getElementById('h'),after=c.querySelector('.after');let drag=false;
  c.addEventListener('mousedown',()=>drag=true);window.addEventListener('mouseup',()=>drag=false);
  c.addEventListener('mousemove',e=>{if(!drag)return;const r=c.getBoundingClientRect();let x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));h.style.left=x+'%';after.style.clipPath='inset(0 '+(100-x)+'% 0 0)';});
    `) },

  { id:'025', slug:'duotone-filter', title:'Duotone Filter', category:'image', tags:['duotone','filter'],
    html: wrap({id:'025',slug:'duotone-filter',title:'Duotone Filter',category:'image',tags:['duotone','filter']},'Duotone Filter',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}
    .img{width:min(80vw,500px);aspect-ratio:16/9;border-radius:12px;overflow:hidden}
    .img img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.2);mix-blend-mode:luminosity}
    .img{background:linear-gradient(135deg,#6c8cff,#ff6cb0);position:relative}
    `,`<div class="img"><img src="${IMG169}" alt="duotone"></div>`) },

  // VIDEO 026-030
  { id:'026', slug:'video-hero-16x9', title:'Video Hero 16:9', category:'video', tags:['hero','16:9'],
    html: wrap({id:'026',slug:'video-hero-16x9',title:'Video Hero 16:9',category:'video',tags:['hero','16:9']},'Video Hero 16:9',`
    body{margin:0}.hero{position:relative;height:100vh;overflow:hidden;display:grid;place-items:center}
    video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .overlay{position:absolute;inset:0;background:rgba(0,0,0,.45)}
    .content{position:relative;z-index:1;text-align:center;color:#fff}
    h1{font-size:clamp(2rem,6vw,4rem);font-weight:800}
    `,`<section class="hero"><video src="${VID169}" autoplay muted loop playsinline></video><div class="overlay"></div><div class="content"><h1>Cinematic Hero</h1><p>16:9 video background</p></div></section>`) },

  { id:'027', slug:'portrait-video-9x16', title:'Portrait Video 9:16', category:'video', tags:['portrait','9:16'],
    html: wrap({id:'027',slug:'portrait-video-9x16',title:'Portrait Video 9:16',category:'video',tags:['portrait','9:16']},'Portrait Video 9:16',`
    body{display:grid;place-items:center;min-height:100vh;background:#111;padding:2rem;gap:2rem}
    .phone{width:min(70vw,280px);aspect-ratio:9/16;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);border:3px solid #333}
    .phone video{width:100%;height:100%;object-fit:cover}
  h2{color:#fff;font-size:1.2rem;text-align:center}
    `,`<div><div class="phone"><video src="${VID916}" autoplay muted loop playsinline></video></div><h2>9:16 Portrait Showcase</h2></div>`) },

  { id:'028', slug:'video-card-4x5', title:'Video Card 4:5', category:'video', tags:['card','4:5','embed'],
    html: embedHtml('028','video-card-4x5','Video Card 4:5','video',['card','4:5','embed'],'card-video') },

  { id:'029', slug:'hover-to-play-preview', title:'Hover To Play Preview', category:'video', tags:['hover','play'],
    html: wrap({id:'029',slug:'hover-to-play-preview',title:'Hover To Play Preview',category:'video',tags:['hover','play']},'Hover To Play Preview',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;padding:2rem}
    .thumb{position:relative;width:min(90vw,500px);aspect-ratio:16/9;border-radius:12px;overflow:hidden;cursor:pointer}
    .thumb img,.thumb video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .3s}
    .thumb video{opacity:0}.thumb:hover video{opacity:1}.thumb:hover img{opacity:0}
    .play{position:absolute;inset:0;display:grid;place-items:center;z-index:1;pointer-events:none}
    .play span{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.9);display:grid;place-items:center;font-size:1.5rem}
    `,`<div class="thumb" id="t"><img src="${IMG169}" alt=""><video src="${VID169}" muted loop playsinline></video><div class="play"><span>▶</span></div></div>`,`
    const t=document.getElementById('t'),v=t.querySelector('video');
    t.addEventListener('mouseenter',()=>v.play());t.addEventListener('mouseleave',()=>{v.pause();v.currentTime=0;});
    `) },

  { id:'030', slug:'muted-loop-grid', title:'Muted Loop Grid', category:'video', tags:['grid','loop'],
    html: fs.readFileSync(path.join(OUT, '030-muted-loop-grid.html'), 'utf8') },

  // CARDS 031-035
  { id:'031', slug:'flip-card-3d', title:'3D Flip Card', category:'cards', tags:['flip','3d'],
    html: wrap({id:'031',slug:'flip-card-3d',title:'3D Flip Card',category:'cards',tags:['flip','3d']},'3D Flip Card',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}
    .scene{width:280px;height:380px;perspective:1000px}
    .card{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.4,.2,.2,1);cursor:pointer;will-change:transform}
    .scene:hover .card{transform:rotateY(180deg)}
    .face{position:absolute;inset:0;border-radius:16px;-webkit-backface-visibility:hidden;backface-visibility:hidden;display:grid;place-items:center;font-size:1.5rem;font-weight:700;transform-style:preserve-3d}
    .front{background:linear-gradient(135deg,#6c8cff,#3a5ccc);color:#fff;transform:rotateY(0deg) translateZ(1px)}
    .back{background:linear-gradient(135deg,#ff6cb0,#cc3a7a);color:#fff;transform:rotateY(180deg) translateZ(1px)}
    `,`<div class="scene"><div class="card"><div class="face front">Front</div><div class="face back">Back Side</div></div></div>`) },

  { id:'032', slug:'hover-tilt-card', title:'Hover Tilt Card', category:'cards', tags:['tilt','hover'],
    html: wrap({id:'032',slug:'hover-tilt-card',title:'Hover Tilt Card',category:'cards',tags:['tilt','hover']},'Hover Tilt Card',`
    body{display:grid;place-items:center;min-height:100vh;background:#111;perspective:500px}
    .card{width:300px;padding:2rem;background:#1a1a2e;border-radius:16px;border:1px solid #2a2a40;color:#fff;transition:transform .12s ease-out;transform-style:preserve-3d;will-change:transform;box-shadow:0 20px 40px rgba(0,0,0,.35)}
    .card h3{font-size:1.3rem;margin-bottom:.5rem}.card p{color:#888;font-size:.9rem}
    `,`<div class="card" id="c"><h3>Tilt Card</h3><p>Move your mouse over this card</p></div>`,`
    const c=document.getElementById('c');
    const tilt=26;
    c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;const lift=Math.hypot(x,y)*12;c.style.transform='rotateY('+(x*tilt)+'deg) rotateX('+(-y*tilt)+'deg) translateZ('+lift+'px) scale(1.02)';});
    c.addEventListener('mouseleave',()=>c.style.transform='');
    `) },

  { id:'033', slug:'stacked-cards-spread', title:'Stacked Cards Spread', category:'cards', tags:['stack','spread'],
    html: wrap({id:'033',slug:'stacked-cards-spread',title:'Stacked Cards Spread',category:'cards',tags:['stack','spread']},'Stacked Cards Spread',`
    body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c;padding:2rem}
    .stack{position:relative;width:min(72vw,260px);aspect-ratio:3/4;cursor:pointer}
    .stack .card{position:absolute;inset:0;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 18px 50px rgba(0,0,0,.45);transition:transform .45s cubic-bezier(.16,1,.3,1)}
    .stack .card img{width:100%;height:100%;object-fit:cover;display:block}
    .stack .card:nth-child(1){z-index:3}.stack .card:nth-child(2){z-index:2;transform:translateY(10px) scale(.96)}
    .stack .card:nth-child(3){z-index:1;transform:translateY(20px) scale(.92)}
    .stack:hover .card:nth-child(1){transform:translateX(-64px) rotate(-8deg)}
    .stack:hover .card:nth-child(2){transform:translateY(-12px) scale(1.02)}
    .stack:hover .card:nth-child(3){transform:translateX(64px) rotate(8deg)}
    .hint{margin-top:2rem;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.35);text-align:center}
    @media (prefers-reduced-motion:reduce){.stack .card{transition:none}.stack:hover .card:nth-child(n){transform:none}}
    `,`<div><div class="stack">${[
      '',
      'hue-rotate(22deg) saturate(1.1)',
      'hue-rotate(-28deg) contrast(1.05)',
    ].map(f=>'<div class="card"><img src="'+IMG45+'" alt=""'+(f?' style="filter:'+f+'"':'')+'></div>').join('')}</div><p class="hint">Hover to spread</p></div>`) },
];

const presets3 = [
  // NAVIGATION
  { id:'040', slug:'transparent-scroll-nav', title:'Transparent Scroll Nav', category:'navigation', tags:['scroll','transparent'],
    html: navHtml('040','transparent-scroll-nav','Transparent Scroll Nav',['scroll','transparent'],'transparent-scroll-nav') },
  { id:'041', slug:'fullscreen-hamburger-menu', title:'Fullscreen Hamburger Menu', category:'navigation', tags:['hamburger','fullscreen'],
    html: navHtml('041','fullscreen-hamburger-menu','Fullscreen Hamburger Menu',['hamburger','fullscreen'],'fullscreen-hamburger-menu') },

  // TOGGLES 043-045
  { id:'043', slug:'ios-style-switch', title:'iOS Style Switch', category:'toggles', tags:['switch','ios'],
    html: wrap({id:'043',slug:'ios-style-switch',title:'iOS Style Switch',category:'toggles',tags:['switch','ios']},'iOS Style Switch',`
    body{display:grid;place-items:center;min-height:100vh;background:#f5f5f5;gap:2rem}
    .row{display:flex;align-items:center;gap:1rem;font-size:1rem;color:#333}
    .switch{width:52px;height:32px;border-radius:16px;background:#ccc;border:none;position:relative;cursor:pointer;transition:background .3s}
    .switch.on{background:#34c759}
    .switch::after{content:'';position:absolute;top:2px;left:2px;width:28px;height:28px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .3s}
    .switch.on::after{transform:translateX(20px)}
    `,`<div class="row"><span>Notifications</span><button class="switch on" onclick="this.classList.toggle('on')"></button></div><div class="row"><span>Dark Mode</span><button class="switch" onclick="this.classList.toggle('on')"></button></div>`) },

  { id:'044', slug:'dark-light-toggle', title:'Dark Light Toggle', category:'toggles', tags:['dark','light','theme'],
    html: wrap({id:'044',slug:'dark-light-toggle',title:'Dark Light Toggle',category:'toggles',tags:['dark','light','theme']},'Dark Light Toggle',`
    body{display:grid;place-items:center;min-height:100vh;transition:background .4s,color .4s;background:var(--bg);color:var(--text)}
    body.dark{--bg:#0d0d0f;--text:#e8e8ed;--track:#3a3a44;--knob:#ffffff}
    body.light{--bg:#f4f4f5;--text:#18181b;--track:#d4d4d8;--knob:#ffffff}
    .wrap{display:flex;flex-direction:column;align-items:center;gap:1.5rem}
    .toggle{width:56px;height:30px;border-radius:15px;border:none;background:var(--track);cursor:pointer;padding:3px;display:flex;align-items:center;color:inherit;transition:background .3s}
    body.dark .toggle{background:#6c8cff}
    .knob{width:24px;height:24px;border-radius:50%;background:var(--knob);box-shadow:0 1px 4px rgba(0,0,0,.3);transition:transform .3s cubic-bezier(.4,.2,.2,1);transform:translateX(0)}
    body.dark .knob{transform:translateX(26px)}
    h2{font-size:1.5rem;font-weight:600}
    `,`<div class="wrap"><button class="toggle" id="t" type="button" aria-label="Toggle theme"><div class="knob"></div></button><h2 id="label">Dark Mode</h2></div>`,`
    const btn=document.getElementById('t'),label=document.getElementById('label');
    function setTheme(isDark){document.body.classList.toggle('dark',isDark);document.body.classList.toggle('light',!isDark);label.textContent=isDark?'Dark Mode':'Light Mode';}
    document.body.classList.add('dark');
    btn.addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
    `) },

  { id:'045', slug:'pill-segment-control', title:'Pill Segment Control', category:'toggles', tags:['pill','segment'],
    html: wrap({id:'045',slug:'pill-segment-control',title:'Pill Segment Control',category:'toggles',tags:['pill','segment']},'Pill Segment Control',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}
    .seg{display:flex;background:#1a1a2e;border-radius:12px;padding:4px;position:relative}
    .seg button{padding:10px 24px;border:none;background:transparent;color:#888;font-size:.9rem;cursor:pointer;border-radius:8px;position:relative;z-index:1;transition:color .3s}
    .seg button.active{color:#fff}
    .pill{position:absolute;top:4px;bottom:4px;background:#6c8cff;border-radius:8px;transition:left .3s,width .3s}
    `,`<div class="seg" id="s">${['Day','Week','Month'].map((t,i)=>`<button class="${i===0?'active':''}" data-i="${i}">${t}</button>`).join('')}<div class="pill" id="p"></div></div>`,`
    const s=document.getElementById('s'),p=document.getElementById('p'),btns=s.querySelectorAll('button');
    function move(b){const r=b.getBoundingClientRect(),pr=s.getBoundingClientRect();p.style.left=(r.left-pr.left)+'px';p.style.width=r.width+'px';}
    move(btns[0]);btns.forEach(b=>b.addEventListener('click',()=>{btns.forEach(x=>x.classList.remove('active'));b.classList.add('active');move(b);}));
    `) },
];

const presets4 = [
  // BACKGROUNDS 046-049
  { id:'046', slug:'animated-gradient-mesh', title:'Animated Gradient Mesh', category:'backgrounds', tags:['gradient','mesh'],
    html: bgHtml('046','animated-gradient-mesh','Animated Gradient Mesh',['gradient','mesh'],'animated-gradient-mesh') },

  { id:'047', slug:'moving-grid-lines', title:'Moving Grid Lines', category:'backgrounds', tags:['grid','lines'],
    html: bgHtml('047','moving-grid-lines','Moving Grid Lines',['grid','lines'],'moving-grid-lines') },

  { id:'048', slug:'noise-grain-overlay', title:'Noise Grain Overlay', category:'backgrounds', tags:['noise','grain'],
    html: bgHtml('048','noise-grain-overlay','Noise Grain Overlay',['noise','grain'],'noise-grain-overlay') },

  { id:'049', slug:'floating-particle-dots', title:'Floating Particle Dots', category:'backgrounds', tags:['particles','dots'],
    html: bgHtml('049','floating-particle-dots','Floating Particle Dots',['particles','dots'],'floating-particle-dots') },

  // TRANSITIONS 050-052
  { id:'050', slug:'page-fade-transition', title:'Page Fade Transition', category:'transitions', tags:['fade','page'],
    html: fs.readFileSync(path.join(OUT, '050-page-fade-transition.html'), 'utf8') },

  { id:'051', slug:'slide-panel-transition', title:'Slide Panel Transition', category:'transitions', tags:['slide','panel'],
    html: wrap({id:'051',slug:'slide-panel-transition',title:'Slide Panel Transition',category:'transitions',tags:['slide','panel']},'Slide Panel Transition',`
    body{margin:0;min-height:100vh;background:#111;overflow:hidden;position:relative}
    .panel{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:2rem;font-weight:700;transform:translateX(100%);transition:transform .55s cubic-bezier(.16,1,.3,1)}
    .panel.active{transform:translateX(0)}.panel.exit{transform:translateX(-100%)}
    .panel:nth-child(1){background:#6c8cff}.panel:nth-child(2){background:#ff6cb0}.panel:nth-child(3){background:#6cffb8;color:#111}
    @media (prefers-reduced-motion:reduce){.panel{transition:none}.panel:not(.active){display:none}}
    `,`${['Slide A','Slide B','Slide C'].map((t,i)=>`<div class="panel${i===0?' active':''}">${t}</div>`).join('')}`,`
    const panels=[...document.querySelectorAll('.panel')];let cur=0;const dur=550;const gap=2200;
    function next(){panels[cur].classList.add('exit');panels[cur].classList.remove('active');const n=(cur+1)%panels.length;panels[n].classList.add('active');setTimeout(()=>panels[cur].classList.remove('exit'),dur);cur=n;}
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(next,gap);
    `) },

  { id:'052', slug:'curtain-wipe-reveal', title:'Curtain Wipe Reveal', category:'transitions', tags:['curtain','wipe'],
    html: wrap({id:'052',slug:'curtain-wipe-reveal',title:'Curtain Wipe Reveal',category:'transitions',tags:['curtain','wipe']},'Curtain Wipe Reveal',`
    body{margin:0;min-height:100vh;overflow:hidden}
    .scene{position:relative;height:100vh;display:grid;place-items:center;background:url('${IMG169}') center/cover}
    .scene h1{color:#fff;font-size:3rem;font-weight:800;text-shadow:0 2px 20px rgba(0,0,0,.5);z-index:1}
    .curtain{position:absolute;inset:0;background:#0d0d0f;transform-origin:left;animation:wipe 2s cubic-bezier(.16,1,.3,1) forwards}
    @keyframes wipe{to{transform:scaleX(0)}}
    `,`<div class="scene"><div class="curtain"></div><h1>Revealed</h1></div>`) },

  // LOADING 053-056
  { id:'053', slug:'spinner-loader', title:'Spinner Loader', category:'loading', tags:['spinner'],
    html: wrap({id:'053',slug:'spinner-loader',title:'Spinner Loader',category:'loading',tags:['spinner']},'Spinner Loader',`
    body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}
    .spinner{width:48px;height:48px;border:3px solid #2a2a32;border-top-color:#6c8cff;border-radius:50%;animation:spin .8s linear infinite}
    p{color:#888;margin-top:1.5rem;font-size:.9rem}
    @keyframes spin{to{transform:rotate(360deg)}}
    `,`<div style="text-align:center"><div class="spinner"></div><p>Loading...</p></div>`) },

  { id:'054', slug:'progress-bar-loader', title:'Progress Bar Loader', category:'loading', tags:['progress','bar'],
    html: wrap({id:'054',slug:'progress-bar-loader',title:'Progress Bar Loader',category:'loading',tags:['progress','bar']},'Progress Bar Loader',`
    body{display:grid;place-items:center;min-height:100vh;background:#111}
    .wrap{width:min(80vw,400px);text-align:center}
    .bar{height:4px;background:#2a2a32;border-radius:2px;overflow:hidden;margin-bottom:1rem}
    .fill{height:100%;background:#6c8cff;width:0;transition:width .1s;border-radius:2px}
    p{color:#888;font-size:.9rem}
    `,`<div class="wrap"><div class="bar"><div class="fill" id="f"></div></div><p id="t">0%</p></div>`,`
    const f=document.getElementById('f'),t=document.getElementById('t');let p=0;
    const iv=setInterval(()=>{p+=Math.random()*8;if(p>=100){p=100;clearInterval(iv)}f.style.width=p+'%';t.textContent=Math.floor(p)+'%';},200);
    `) },

  { id:'056', slug:'logo-pulse-loader', title:'Logo Pulse Loader', category:'loading', tags:['logo','pulse'],
    html: wrap({id:'056',slug:'logo-pulse-loader',title:'Logo Pulse Loader',category:'loading',tags:['logo','pulse']},'Logo Pulse Loader',`
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0c;font-family:system-ui,-apple-system,sans-serif}
    .stage{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem}
    .logo{width:92px;height:92px;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 16px 48px rgba(0,0,0,.45);animation:pulse 1.6s ease-in-out infinite}
    .logo img{width:100%;height:100%;object-fit:cover;display:block}
    .label{margin-top:1.35rem;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.38);animation:fade 1.6s ease-in-out infinite}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.72}}
    @keyframes fade{0%,100%{opacity:.35}50%{opacity:.85}}
    @media (prefers-reduced-motion:reduce){.logo,.label{animation:none}}
    `,`<div class="stage"><div class="logo"><img src="${IMG45}" alt=""></div><p class="label">Loading</p></div>`) },

  // EXPERIMENTAL 057-060
  { id:'059', slug:'split-screen-editorial', title:'Split Screen Editorial', category:'experimental', tags:['split','editorial'],
    html: wrap({id:'059',slug:'split-screen-editorial',title:'Split Screen Editorial',category:'experimental',tags:['split','editorial']},'Split Screen Editorial',`
    body{margin:0;min-height:100vh;display:grid;grid-template-columns:1fr 1fr}
    .left{background:#0d0d0f;display:grid;place-items:center;padding:3rem}
    .left h1{font-size:clamp(2rem,4vw,3.5rem);font-weight:900;color:#fff;line-height:1.1}
    .right{background:url('${IMG45}') center/cover;min-height:100vh}
    @media(max-width:768px){body{grid-template-columns:1fr}.right{min-height:50vh}}
    `,`<div class="left"><h1>Editorial<br>Split Layout</h1></div><div class="right"></div>`) },

  { id:'060', slug:'brutalist-typography', title:'Brutalist Typography', category:'experimental', tags:['brutalist','typography'],
    html: wrap({id:'060',slug:'brutalist-typography',title:'Brutalist Typography',category:'experimental',tags:['brutalist','typography']},'Brutalist Typography',`
    body{margin:0;min-height:100vh;background:#ff0;color:#000;font-family:monospace}
    .poster{padding:2rem;display:flex;flex-direction:column;justify-content:space-between;min-height:100vh;border:8px solid #000}
    h1{font-size:clamp(3rem,12vw,10rem);font-weight:900;line-height:.85;text-transform:uppercase;letter-spacing:-.05em}
    .bar{display:flex;justify-content:space-between;border-top:4px solid #000;padding-top:1rem;font-size:1rem;font-weight:700}
    `,`<div class="poster"><h1>RAW<br>TYPE</h1><div class="bar"><span>2026</span><span>BRUTAL</span><span>PRESET</span></div></div>`) },
];

const all = [...presets, ...presets2, ...presets3, ...presets4];

for (const p of all) {
  const file = path.join(OUT, `${p.id}-${p.slug}.html`);
  fs.writeFileSync(file, p.html);
  console.log('Wrote', file);
}

console.log(`\nGenerated ${all.length} presets.`);
