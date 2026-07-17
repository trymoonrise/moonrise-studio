'use strict';

const V = {
  ocean: '../stock/media/heroes/ocean-archive.mp4',
  city: '../stock/media/heroes/city-16x9.mp4',
  forest: '../stock/media/heroes/forest-16x9.mp4',
  steel: '../stock/media/heroes/steel-clip-16x9.mp4',
  spring: '../stock/media/heroes/spring-clip-16x9.mp4',
  cosmos: '../stock/media/heroes/cosmos-clip-16x9.mp4',
  sintel: '../stock/media/heroes/sintel-clip-16x9.mp4',
  peaks: '../stock/media/heroes/mountains-16x9.mp4',
};

const reduced =
  '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

const scrollBase = `function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function prog(track){const r=track.getBoundingClientRect();const h=r.height-innerHeight;return h>0?ease(Math.min(1,Math.max(0,-r.top/h))):0}function pageProg(){const max=document.documentElement.scrollHeight-innerHeight;return max>0?ease(Math.min(1,scrollY/max)):0}`;

const RECIPES = [
  {
    slug: 'scroll-video-scrub-timeline',
    title: 'Video Scrub Timeline',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'scrub', 'experimental'],
    style: `
    body{margin:0;background:#050505;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .track{height:320vh}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;padding:1.5rem}
    .frame{position:relative;width:min(92vw,900px);border-radius:18px;overflow:hidden;box-shadow:0 32px 90px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.08)}
    video{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#111}
    .hud{position:absolute;left:1rem;right:1rem;bottom:1rem;display:flex;justify-content:space-between;align-items:flex-end;pointer-events:none}
    .time{font-family:ui-monospace,monospace;font-size:.78rem;color:rgba(255,255,255,.85);text-shadow:0 2px 12px rgba(0,0,0,.8)}
    .label{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
    .bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.15)}
    .bar i{display:block;height:100%;width:var(--scrub,0%);background:#fff;box-shadow:0 0 12px rgba(255,255,255,.45)}
    ${reduced}`,
    body: `<div class="track" id="track"><div class="stage"><div class="frame"><video id="v" src="${V.steel}" muted playsinline preload="auto"></video><div class="hud"><span class="label">Scroll to scrub</span><span class="time" id="time">00:00</span></div><div class="bar" aria-hidden="true"><i id="bar"></i></div></div></div></div>`,
    script: `${scrollBase};const track=document.getElementById('track'),v=document.getElementById('v'),timeEl=document.getElementById('time'),bar=document.getElementById('bar'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let ready=false;function fmt(s){const m=Math.floor(s/60),sec=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')}function tick(){if(reduced||!ready||!v.duration)return;const p=prog(track);v.currentTime=Math.min(v.duration-0.05,p*v.duration);timeEl.textContent=fmt(v.currentTime);bar.style.setProperty('--scrub',(p*100).toFixed(1)+'%')}v.addEventListener('loadedmetadata',()=>{ready=true;tick()});let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});`,
  },
  {
    slug: 'scroll-video-pinch-frame',
    title: 'Video Pinch Frame',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'pinch', 'sticky'],
    style: `
    body{margin:0;background:#f4f5f8;color:#111;font-family:system-ui,-apple-system,sans-serif}
    .track{height:280vh}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;padding:2rem}
    .frame{width:100%;height:100%;border-radius:var(--radius,0px);overflow:hidden;transform:scale(var(--scale,1));box-shadow:0 var(--shadow,0px) 80px rgba(15,23,42,var(--shadow-o,.08));transition:box-shadow .2s}
    video{width:100%;height:100%;object-fit:cover;display:block}
    .copy{position:absolute;bottom:12%;left:50%;transform:translateX(-50%);text-align:center;opacity:var(--copy-o,0)}
    .copy h2{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;letter-spacing:-.03em;color:#fff;text-shadow:0 8px 32px rgba(0,0,0,.5)}
    ${reduced}`,
    body: `<div class="track" id="track"><div class="stage"><div class="frame"><video src="${V.spring}" autoplay muted loop playsinline aria-hidden="true"></video><div class="copy"><h2>Pinch into focus</h2></div></div></div></div>`,
    script: `${scrollBase};const track=document.getElementById('track'),frame=track.querySelector('.frame'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=prog(track);if(reduced){frame.style.setProperty('--scale','1');frame.style.setProperty('--radius','18px');return}frame.style.setProperty('--scale',lerp(1,.72,p).toFixed(3));frame.style.setProperty('--radius',lerp(0,22,p).toFixed(1)+'px');frame.style.setProperty('--shadow',lerp(0,28,p).toFixed(0)+'px');frame.style.setProperty('--shadow-o',lerp(.08,.22,p).toFixed(3));frame.style.setProperty('--copy-o',Math.max(0,(p-.55)/.45).toFixed(3))}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-circle-reveal',
    title: 'Video Circle Reveal',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'reveal', 'clip'],
    style: `
    body{margin:0;min-height:240vh;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    .clip{width:100%;height:100%;clip-path:circle(var(--r,8%) at 50% 50%);transition:clip-path .05s linear}
    video{width:100%;height:100%;object-fit:cover;display:block;transform:scale(var(--zoom,1.15))}
    .title{position:absolute;z-index:2;font-size:clamp(2rem,6vw,3.5rem);font-weight:900;letter-spacing:-.03em;opacity:var(--title-o,1);transform:translateY(var(--title-y,0px))}
    ${reduced}`,
    body: `<div class="stage" id="stage"><div class="clip"><video src="${V.cosmos}" autoplay muted loop playsinline aria-hidden="true"></video></div><h1 class="title">Expand</h1></div>`,
    script: `${scrollBase};const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=pageProg();if(reduced){stage.style.setProperty('--r','75%');stage.style.setProperty('--title-o','0');return}stage.style.setProperty('--r',lerp(8,75,p).toFixed(1)+'%');stage.style.setProperty('--zoom',lerp(1.15,1,p).toFixed(3));stage.style.setProperty('--title-o',lerp(1,0,Math.min(1,p/.35)).toFixed(3));stage.style.setProperty('--title-y',lerp(0,-24,p).toFixed(1)+'px')}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-blur-focus',
    title: 'Video Blur To Focus',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'blur', 'focus'],
    style: `
    body{margin:0;min-height:220vh;background:#0a0a0c;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;overflow:hidden}
    video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(var(--blur,18px)) brightness(var(--bright,.55));transform:scale(1.08)}
    .shade{position:absolute;inset:0;background:rgba(0,0,0,var(--shade,.45))}
    .copy{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(2rem,5vw,4rem);opacity:var(--copy-o,0);transform:translateY(var(--copy-y,28px))}
    h1{font-size:clamp(2.2rem,6vw,3.8rem);font-weight:900;letter-spacing:-.04em;max-width:12ch}
    p{margin-top:.75rem;color:rgba(255,255,255,.72);max-width:36ch;line-height:1.55}
    ${reduced}`,
    body: `<div class="stage" id="stage"><video src="${V.sintel}" autoplay muted loop playsinline aria-hidden="true"></video><div class="shade" aria-hidden="true"></div><div class="copy"><h1>Pull into focus</h1><p>Scroll sharpens the frame as the story comes into view.</p></div></div>`,
    script: `${scrollBase};const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=pageProg();if(reduced){stage.style.setProperty('--blur','0px');stage.style.setProperty('--copy-o','1');return}stage.style.setProperty('--blur',lerp(18,0,p).toFixed(1)+'px');stage.style.setProperty('--bright',lerp(.55,.92,p).toFixed(3));stage.style.setProperty('--shade',lerp(.45,.15,p).toFixed(3));stage.style.setProperty('--copy-o',Math.max(0,(p-.25)/.75).toFixed(3));stage.style.setProperty('--copy-y',lerp(28,0,p).toFixed(1)+'px')}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-parallax-panels',
    title: 'Video Parallax Panels',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'parallax', 'panels'],
    style: `
    body{margin:0;background:#111;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .bg{position:fixed;inset:0;z-index:-1}
    .bg video{width:100%;height:100%;object-fit:cover;transform:scale(1.1) translateY(var(--vid-y,0px))}
    .bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.75))}
    .panel{min-height:85vh;display:flex;align-items:center;padding:clamp(2rem,6vw,5rem);opacity:var(--o,0);transform:translateY(var(--y,40px))}
    .panel:nth-child(odd){justify-content:flex-start}.panel:nth-child(even){justify-content:flex-end;text-align:right}
    .card{max-width:min(420px,90vw);padding:1.5rem 1.6rem;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(14px)}
    .card h2{font-size:1.35rem;font-weight:800;letter-spacing:-.02em;margin-bottom:.45rem}
    .card p{font-size:.9rem;color:rgba(255,255,255,.72);line-height:1.55}
    ${reduced}`,
    body: `<div class="bg" id="bg"><video src="${V.forest}" autoplay muted loop playsinline aria-hidden="true"></video></div><section class="panel" style="--i:0"><div class="card"><h2>Scene one</h2><p>Fixed video drifts slowly while panels float over it.</p></div></section><section class="panel" style="--i:1"><div class="card"><h2>Scene two</h2><p>Each block fades and rises on its own scroll beat.</p></div></section><section class="panel" style="--i:2"><div class="card"><h2>Scene three</h2><p>Layered parallax without leaving the viewport.</p></div></section>`,
    script: `const bg=document.getElementById('bg'),panels=[...document.querySelectorAll('.panel')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function tick(){const p=scrollY/(document.documentElement.scrollHeight-innerHeight||1);bg.style.setProperty('--vid-y',(reduced?0:-p*80).toFixed(1)+'px');panels.forEach((panel,i)=>{const r=panel.getBoundingClientRect();const t=1-Math.min(1,Math.max(0,(r.top-innerHeight*.55)/(innerHeight*.45)));const e=ease(t);panel.style.setProperty('--o',e.toFixed(3));panel.style.setProperty('--y',((1-e)*40).toFixed(1)+'px')})}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-mask-type',
    title: 'Video Mask Typography',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'mask', 'typography'],
    style: `
    body{margin:0;min-height:260vh;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    video.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25;transform:scale(var(--bg-s,1.12))}
    h1{margin:0;font-size:clamp(3.5rem,14vw,10rem);font-weight:900;text-transform:uppercase;line-height:.88;text-align:center;background-image:url('${V.city}');background-size:cover;background-position:var(--pos,50% 50%);-webkit-background-clip:text;background-clip:text;color:transparent;transform:scale(var(--t-s,.9));letter-spacing:var(--track,.06em)}
    .hint{position:absolute;bottom:2.5rem;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4);opacity:var(--hint-o,1)}
    ${reduced}`,
    body: `<div class="stage" id="stage"><video class="bg" src="${V.city}" autoplay muted loop playsinline aria-hidden="true"></video><h1>Motion</h1><span class="hint">Scroll</span></div>`,
    script: `${scrollBase};const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=pageProg();if(reduced)return;stage.style.setProperty('--t-s',lerp(.9,1,p).toFixed(3));stage.style.setProperty('--bg-s',lerp(1.12,1,p).toFixed(3));stage.style.setProperty('--pos',lerp(40,60,p).toFixed(1)+'% '+lerp(35,65,p).toFixed(1)+'%');stage.style.setProperty('--track',lerp(.06,-.01,p).toFixed(3)+'em');stage.style.setProperty('--hint-o',lerp(1,0,p).toFixed(3))}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-wipe-rise',
    title: 'Video Wipe Rise',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'wipe', 'reveal'],
    style: `
    body{margin:0;min-height:240vh;background:#fafafa;color:#111;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;padding:2rem}
    .shell{width:min(92vw,820px);border-radius:22px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.12);clip-path:inset(var(--clip,100% 0 0 0) round 22px)}
    video{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;transform:translateY(var(--vid-y,12%)) scale(var(--vid-s,1.08))}
    .cap{margin-top:1.25rem;text-align:center;opacity:var(--cap-o,0);transform:translateY(var(--cap-y,16px))}
    .cap h2{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
    ${reduced}`,
    body: `<div class="stage" id="stage"><div><div class="shell"><video src="${V.ocean}" autoplay muted loop playsinline aria-hidden="true"></video></div><div class="cap"><h2>Rise into frame</h2></div></div></div>`,
    script: `${scrollBase};const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=pageProg();if(reduced){stage.style.setProperty('--clip','0% 0 0 0');stage.style.setProperty('--cap-o','1');return}stage.style.setProperty('--clip',lerp(100,0,p).toFixed(1)+'% 0 0 0');stage.style.setProperty('--vid-y',lerp(12,0,p).toFixed(1)+'%');stage.style.setProperty('--vid-s',lerp(1.08,1,p).toFixed(3));stage.style.setProperty('--cap-o',Math.max(0,(p-.5)/.5).toFixed(3));stage.style.setProperty('--cap-y',lerp(16,0,p).toFixed(1)+'px')}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
  {
    slug: 'scroll-video-ken-burns',
    title: 'Scroll Ken Burns Video',
    category: 'scroll-animations',
    tags: ['scroll', 'video', 'ken-burns', 'zoom'],
    style: `
    body{margin:0;min-height:300vh;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;overflow:hidden}
    video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(var(--s,1)) translate(var(--x,0%),var(--y,0%))}
    .grain{position:absolute;inset:0;opacity:.06;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
    .copy{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:2rem;opacity:var(--o,0)}
    h1{font-size:clamp(2.2rem,6vw,3.6rem);font-weight:900;letter-spacing:-.03em}
    ${reduced}`,
    body: `<div class="stage" id="stage"><video src="${V.peaks}" autoplay muted loop playsinline aria-hidden="true"></video><div class="grain" aria-hidden="true"></div><div class="copy"><h1>Drift &amp; scale</h1></div></div>`,
    script: `${scrollBase};const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function tick(){const p=pageProg();if(reduced)return;stage.style.setProperty('--s',lerp(1,1.22,p).toFixed(3));stage.style.setProperty('--x',lerp(0,-4,p).toFixed(1)+'%');stage.style.setProperty('--y',lerp(0,-6,p).toFixed(1)+'%');stage.style.setProperty('--o',Math.max(0,(p-.35)/.65).toFixed(3))}let raf=false;addEventListener('scroll',()=>{if(raf)return;raf=true;requestAnimationFrame(()=>{raf=false;tick()})},{passive:true});addEventListener('resize',tick,{passive:true});tick();`,
  },
];

module.exports = { RECIPES, V };
