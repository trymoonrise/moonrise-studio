'use strict';

const V = {
  ocean: '../stock/media/heroes/ocean-archive.mp4',
  city: '../stock/media/heroes/city-16x9.mp4',
  forest: '../stock/media/heroes/forest-16x9.mp4',
  vert: '../stock/media/heroes/vertical-9x16.mp4',
  peaks: '../stock/media/heroes/mountains-16x9.mp4',
  abstract: '../stock/media/heroes/abstract-16x9.mp4',
};

const reduced =
  '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}video{animation:none!important}}';

const RECIPES = [
  {
    slug: 'heroes-video-fullbleed-ocean',
    title: 'Full Bleed Ocean Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'background'],
    style: `
    body{margin:0;min-height:100vh;position:relative;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    video.bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
    .shade{position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.72) 100%)}
    .wrap{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(2rem,5vw,4rem)}
    .eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:.75rem}
    h1{font-size:clamp(2.4rem,6vw,4rem);font-weight:900;line-height:1.02;letter-spacing:-.04em;max-width:12ch;margin-bottom:.75rem}
    p{max-width:38ch;color:rgba(255,255,255,.78);line-height:1.55;margin-bottom:1.5rem}
    .btn{padding:.7rem 1.25rem;border:none;border-radius:999px;background:#fff;color:#111827;font-weight:700;font-size:.86rem;cursor:pointer}
    ${reduced}`,
    body: `<video class="bg" src="${V.ocean}" autoplay muted loop playsinline aria-hidden="true"></video><div class="shade" aria-hidden="true"></div><div class="wrap"><span class="eyebrow">Documentary</span><h1>Depth below the surface</h1><p>Downloaded footage, locally hosted — full-bleed video with a calm editorial overlay.</p><button class="btn" type="button">Watch film</button></div>`,
  },
  {
    slug: 'heroes-video-cinematic-sintel',
    title: 'Cinematic Sintel Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'cinematic'],
    style: `
    body{margin:0;min-height:100vh;position:relative;color:#fff;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
    video.bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;filter:brightness(.82) saturate(1.08)}
    .grain{position:fixed;inset:0;z-index:-1;opacity:.08;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
    .vignette{position:fixed;inset:0;z-index:-1;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.55) 100%)}
    .wrap{min-height:100vh;display:grid;place-items:center;text-align:center;padding:2rem}
    h1{font-size:clamp(2.5rem,7vw,4.5rem);font-weight:900;letter-spacing:-.04em;text-transform:uppercase;line-height:.95}
  .sub{margin-top:1rem;font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55)}
    ${reduced}`,
    body: `<video class="bg" src="${V.forest}" autoplay muted loop playsinline aria-hidden="true"></video><div class="grain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div><div class="wrap"><h1>Epic<br>Motion</h1><p class="sub">Cinematic reel</p></div>`,
  },
  {
    slug: 'heroes-video-mask-scroll',
    title: 'Video Mask Scroll Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'experimental', 'scroll'],
    style: `
    body{margin:0;min-height:260vh;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-content:center;gap:.12em;text-align:center;overflow:hidden}
    video.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.22;transform:scale(var(--bg-scale,1.08))}
    .line{margin:0;padding:0 1rem;font-size:clamp(3rem,11vw,8rem);font-weight:900;text-transform:uppercase;line-height:.9;position:relative;z-index:1}
    .line--fill{background-image:linear-gradient(rgba(255,255,255,.15),rgba(255,255,255,.15));-webkit-background-clip:text;background-clip:text;color:transparent;transform:scale(var(--one-scale,.94));opacity:var(--one-opacity,.85)}
    .line--mask{background-image:url('${V.city}');background-size:cover;background-position:var(--mask-x,50%) var(--mask-y,50%);-webkit-background-clip:text;background-clip:text;color:transparent;clip-path:inset(var(--clip-top,100%) 0 0 0);transform:translateY(var(--two-y,16px))}
    .hint{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);opacity:var(--hint-opacity,0)}
    ${reduced}`,
    body: `<div class="stage" id="stage"><video class="bg" src="${V.city}" autoplay muted loop playsinline aria-hidden="true"></video><h1 class="line line--fill">Move</h1><h1 class="line line--mask">Forward</h1><p class="hint">Scroll to reveal</p></div>`,
    script: `const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function update(){if(reduced){stage.style.setProperty('--clip-top','0%');stage.style.setProperty('--hint-opacity','.7');return}const max=document.documentElement.scrollHeight-innerHeight,p=max>0?ease(Math.min(1,scrollY/max)):0,reveal=Math.min(1,Math.max(0,(p-.12)/.68));stage.style.setProperty('--one-scale',lerp(.94,1,p).toFixed(3));stage.style.setProperty('--one-opacity',lerp(.85,1,p).toFixed(3));stage.style.setProperty('--clip-top',lerp(100,0,reveal).toFixed(1)+'%');stage.style.setProperty('--two-y',lerp(16,0,reveal).toFixed(1)+'px');stage.style.setProperty('--mask-x',lerp(40,60,p).toFixed(1)+'%');stage.style.setProperty('--mask-y',lerp(35,65,p).toFixed(1)+'%');stage.style.setProperty('--bg-scale',lerp(1.08,1,p).toFixed(3));stage.style.setProperty('--hint-opacity',Math.max(0,(p-.45)/.55).toFixed(3))}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-video-split-demo',
    title: 'Split Demo Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'split'],
    style: `
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:clamp(2rem,4vw,3rem);background:#f8fafc;color:#111827;font-family:system-ui,-apple-system,sans-serif}
    .shell{width:min(1080px,100%)}
    .hero{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:clamp(2rem,4vw,3rem);align-items:center}
    .eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4f46e5;margin-bottom:.85rem}
    h1{font-size:clamp(2rem,3.8vw,2.8rem);font-weight:800;line-height:1.06;letter-spacing:-.04em;max-width:11ch;margin-bottom:.85rem}
    p{color:#6b7280;line-height:1.6;max-width:34ch;margin-bottom:1.5rem}
    .btn{padding:.68rem 1.15rem;border:none;border-radius:999px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
    .media{position:relative;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.12);border:1px solid rgba(17,24,39,.06)}
    .media video{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:#000}
    .badge{position:absolute;top:.85rem;left:.85rem;padding:.35rem .65rem;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    @media(max-width:820px){.hero{grid-template-columns:1fr}}
    ${reduced}`,
    body: `<div class="shell"><section class="hero"><div><span class="eyebrow">Product film</span><h1>See it in motion</h1><p>Split hero with a locally hosted demo reel beside your headline.</p><button class="btn" type="button">Get started</button></div><div class="media"><span class="badge">Live preview</span><video src="${V.city}" autoplay muted loop playsinline aria-label="Product demo"></video></div></section></div>`,
  },
  {
    slug: 'heroes-video-vertical-story',
    title: 'Vertical Story Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'vertical'],
    style: `
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:2rem;background:radial-gradient(circle at 80% 15%,rgba(99,102,241,.16),transparent 42%),#0a0a0c;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .hero{display:grid;grid-template-columns:1fr auto;gap:3rem;align-items:center;width:min(960px,100%)}
    h1{font-size:clamp(2rem,4vw,2.75rem);font-weight:800;letter-spacing:-.03em;line-height:1.08;margin-bottom:.85rem}
    p{color:#94a3b8;line-height:1.6;max-width:34ch;margin-bottom:1.5rem}
    .phone{padding:.55rem;border-radius:32px;background:linear-gradient(145deg,#2a2f3f,#12141c);border:1px solid rgba(255,255,255,.1);box-shadow:0 28px 70px rgba(0,0,0,.5)}
    .phone video{display:block;width:min(42vw,230px);aspect-ratio:9/16;object-fit:cover;border-radius:26px;background:#000}
    @media(max-width:760px){.hero{grid-template-columns:1fr;text-align:center}.phone{margin:0 auto}}
    ${reduced}`,
    body: `<section class="hero"><div><h1>Stories built for vertical</h1><p>Portrait footage downloaded and hosted locally — perfect for social-first launches.</p><button class="btn" type="button" style="padding:.65rem 1.1rem;border:none;border-radius:999px;background:#fff;color:#111;font-weight:700;cursor:pointer">Download app</button></div><div class="phone"><video src="${V.vert}" autoplay muted loop playsinline aria-label="Vertical story"></video></div></section>`,
  },
  {
    slug: 'heroes-video-duotone-drive',
    title: 'Duotone Drive Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'experimental'],
    style: `
    body{margin:0;min-height:100vh;position:relative;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stack{position:fixed;inset:0;z-index:-2}
    .stack video{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.15) brightness(.75)}
    .tint{position:fixed;inset:0;z-index:-1;background:linear-gradient(135deg,rgba(79,70,229,.55),rgba(236,72,153,.45));mix-blend-mode:color}
    .wrap{min-height:100vh;display:grid;place-items:center;text-align:center;padding:2rem}
    h1{font-size:clamp(2.5rem,7vw,4.2rem);font-weight:900;letter-spacing:-.04em;max-width:14ch}
    p{margin-top:1rem;color:rgba(255,255,255,.78);max-width:36ch}
    ${reduced}`,
    body: `<div class="stack"><video src="${V.peaks}" autoplay muted loop playsinline aria-hidden="true"></video></div><div class="tint" aria-hidden="true"></div><div class="wrap"><h1>Drive at dusk</h1><p>Duotone treatment over downloaded footage for a bold, editorial hero.</p></div>`,
  },
  {
    slug: 'heroes-video-scroll-zoom',
    title: 'Scroll Zoom Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'scroll', 'experimental'],
    style: `
    body{margin:0;min-height:220vh;background:#050505;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .stage{position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center}
    video.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(var(--zoom,1.18));filter:brightness(var(--bright,.72))}
    .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.65))}
    .copy{position:relative;text-align:center;padding:2rem;transform:translateY(var(--copy-y,24px));opacity:var(--copy-o,0)}
    h1{font-size:clamp(2.2rem,6vw,3.6rem);font-weight:900;letter-spacing:-.03em}
    p{margin-top:.75rem;color:rgba(255,255,255,.72);letter-spacing:.12em;text-transform:uppercase;font-size:.72rem}
    ${reduced}`,
    body: `<div class="stage" id="stage"><video class="bg" src="${V.abstract}" autoplay muted loop playsinline aria-hidden="true"></video><div class="shade" aria-hidden="true"></div><div class="copy"><h1>Pull focus</h1><p>Scroll to zoom out</p></div></div>`,
    script: `const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function update(){if(reduced){stage.style.setProperty('--zoom','1');stage.style.setProperty('--copy-o','1');stage.style.setProperty('--copy-y','0px');return}const max=document.documentElement.scrollHeight-innerHeight,p=max>0?ease(Math.min(1,scrollY/max)):0;stage.style.setProperty('--zoom',lerp(1.18,1,p).toFixed(3));stage.style.setProperty('--bright',lerp(.72,.92,p).toFixed(3));stage.style.setProperty('--copy-y',lerp(24,0,p).toFixed(1)+'px');stage.style.setProperty('--copy-o',Math.min(1,p*1.4).toFixed(3))}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-video-letterbox-premiere',
    title: 'Letterbox Premiere Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'cinematic'],
    style: `
    body{margin:0;min-height:100vh;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;padding:2rem}
    .frame{width:min(100%,920px);position:relative}
    .bars::before,.bars::after{content:'';display:block;height:clamp(28px,6vh,56px);background:#000}
    .screen{position:relative;overflow:hidden;border-radius:4px;background:#111}
    .screen video{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
    .meta{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1rem;font-size:.78rem;color:rgba(255,255,255,.55);letter-spacing:.08em;text-transform:uppercase}
    h1{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;letter-spacing:.18em;text-transform:uppercase;text-align:center;pointer-events:none;text-shadow:0 8px 32px rgba(0,0,0,.65)}
    ${reduced}`,
    body: `<div class="frame"><div class="bars"><div class="screen"><video src="${V.ocean}" autoplay muted loop playsinline aria-label="Premiere film"></video><h1>World premiere</h1></div></div><div class="meta"><span>Now streaming</span><span>4K · 24fps</span></div></div>`,
  },
];

module.exports = { RECIPES, V };
