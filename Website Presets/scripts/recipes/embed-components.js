'use strict';

const E = require('../lib/embeds');
const M = require('../lib/media');

const { CSS, DEMO, mapIframe, youtubeBlock, iframe, mapHelpers } = E;
const base = CSS.base;
const reduced = CSS.reduced;
const embedCss = `${CSS.responsive} ${CSS.ratio169} ${CSS.ratio916} ${CSS.ratio45} ${CSS.mapFill}`;

const RECIPES = {
  // ── Maps ──────────────────────────────────────────────────────────────
  'static-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.panel{width:min(100%,520px);border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.1);background:#fff}.head{padding:1rem 1.15rem .25rem}.head h2{font-size:1.05rem;font-weight:800;letter-spacing:-.02em;color:#111827}.head p{font-size:.82rem;color:#6b7280;margin-top:.2rem}.map-stage{position:relative;height:280px;background:#e5e7eb}`,
    body: `<div class="panel"><header class="head"><h2>Visit us</h2><p>Live map embed — no static image placeholder.</p></header><div class="map-stage">${mapIframe(DEMO.maps, 15, 'Office location')}</div></div>`,
  }),

  'marker-card': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.wrap{position:relative;width:min(100%,380px);height:280px;border-radius:18px;overflow:hidden;background:#e5e7eb;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.12)}.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(15,23,42,.42));pointer-events:none;z-index:1}.card{position:absolute;left:.85rem;right:.85rem;bottom:.85rem;display:flex;align-items:center;gap:.75rem;padding:.85rem .95rem;border-radius:14px;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.8);box-shadow:0 10px 30px rgba(15,23,42,.14);z-index:2}.card h4{font-size:.92rem;font-weight:700;color:#111827}.card p{font-size:.8rem;color:#6b7280}`,
    body: `<div class="wrap">${mapIframe(DEMO.maps, 15, 'Office HQ')}<div class="shade" aria-hidden="true"></div><div class="card"><div><h4>Office HQ</h4><p>123 Main St, New York, NY</p></div></div></div>`,
  }),
  'location-list': () => locationList(),
  'interactive-map': () => interactiveMap(),

  'dark-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0a0a0c;color:#f3f4f6;${base}}${reduced}${embedCss}.wrap{width:min(100%,480px)}.eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6cffb8;margin-bottom:.35rem}.wrap h2{font-size:1.2rem;font-weight:800;margin-bottom:1rem}.map-stage{position:relative;height:300px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 60px rgba(0,0,0,.45)}`,
    body: `<div class="wrap"><div class="eyebrow">Maps</div><h2>Dark frame embed</h2><div class="map-stage">${mapIframe('Brooklyn, New York', 12, 'Brooklyn map')}</div></div>`,
  }),

  'minimal-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#fff;${base}}${reduced}${embedCss}.map-stage{position:relative;width:min(100%,440px);height:260px;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8}`,
    body: `<div class="map-stage">${mapIframe(DEMO.maps, 14, 'Minimal map')}</div>`,
  }),

  'card-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.card{width:min(100%,400px);border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 16px 40px rgba(15,23,42,.08)}.map-stage{position:relative;height:220px}.body{padding:1rem 1.1rem 1.15rem}h3{font-size:.95rem;font-weight:700;margin-bottom:.2rem;color:#111827}p{font-size:.82rem;color:#6b7280}`,
    body: `<article class="card"><div class="map-stage">${mapIframe('San Francisco, CA', 12, 'San Francisco')}</div><div class="body"><h3>West Coast office</h3><p>Embedded Google Maps in a card layout.</p></div></article>`,
  }),

  'split-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#fafafa;${base}}${reduced}${embedCss}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);width:min(100%,760px);min-height:320px;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.08)}.copy{padding:2rem;display:flex;flex-direction:column;justify-content:center;background:#fff}.copy h2{font-size:1.35rem;font-weight:800;letter-spacing:-.02em;margin-bottom:.5rem;color:#111827}.copy p{font-size:.88rem;color:#6b7280;line-height:1.55}.map-stage{position:relative;min-height:280px;background:#e5e7eb}@media(max-width:640px){.layout{grid-template-columns:1fr}}`,
    body: `<div class="layout"><div class="copy"><h2>Find the studio</h2><p>Split layout pairs copy with a live map embed instead of a screenshot.</p></div><div class="map-stage">${mapIframe('London, UK', 11, 'London map')}</div></div>`,
  }),

  'pin-cluster': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0f1117;color:#f3f4f6;${base}}${reduced}${embedCss}.wrap{width:min(100%,540px)}.head{margin-bottom:1rem}.head h2{font-size:1.15rem;font-weight:800}.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}.chip{padding:.4rem .75rem;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#d1d5db;font-size:.78rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s,border-color .2s,color .2s}.chip.is-active{background:rgba(108,255,184,.14);border-color:rgba(108,255,184,.35);color:#6cffb8}.map-stage{position:relative;height:280px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}`,
    body: `<div class="wrap"><header class="head"><h2>Regional offices</h2></header><div class="chips" id="chips"></div><div class="map-stage">${mapIframe('United States', 4, 'Regional map', 'map-embed')}</div></div>`,
    script: `${mapHelpers}const spots=[{label:'US',query:'United States',z:4},{label:'NYC',query:'New York, NY',z:10},{label:'LA',query:'Los Angeles, CA',z:10},{label:'Chicago',query:'Chicago, IL',z:10}];const chips=document.getElementById('chips'),map=document.querySelector('.map-embed');spots.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='chip'+(i===0?' is-active':'');b.textContent=s.label;b.onclick=()=>{map.src=embedUrl(s.query,s.z);chips.querySelectorAll('.chip').forEach(c=>c.classList.remove('is-active'));b.classList.add('is-active');};chips.appendChild(b);});`,
  }),

  'route-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.panel{width:min(100%,560px);border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.1)}.bar{display:flex;gap:.65rem;padding:1rem 1.1rem;border-bottom:1px solid #f0f2f5}.field{flex:1;padding:.65rem .8rem;border-radius:10px;border:1px solid #e5e7eb;font-size:.84rem;font-family:inherit}.go{padding:.65rem 1rem;border:none;border-radius:10px;background:#111827;color:#fff;font-weight:700;font-size:.82rem;cursor:pointer}.map-stage{position:relative;height:300px}`,
    body: `<div class="panel"><div class="bar"><input class="field" id="from" value="Times Square, New York" aria-label="From"><input class="field" id="to" value="Central Park, New York" aria-label="To"><button class="go" id="go" type="button">Route</button></div><div class="map-stage">${mapIframe('Times Square to Central Park, New York', 13, 'Route map', 'map-embed')}</div></div>`,
    script: `${mapHelpers}document.getElementById('go').onclick=()=>{const from=document.getElementById('from').value.trim(),to=document.getElementById('to').value.trim();document.querySelector('.map-embed').src=embedUrl(from+' to '+to,13);};`,
  }),

  'compact-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#fff;${base}}${reduced}${embedCss}.widget{width:min(100%,300px);border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,.08)}.map-stage{position:relative;height:180px}.cap{padding:.75rem .85rem;font-size:.8rem;color:#6b7280}.cap strong{display:block;color:#111827;font-size:.88rem;margin-bottom:.15rem}`,
    body: `<div class="widget"><div class="map-stage">${mapIframe(DEMO.maps, 15, 'Compact map')}</div><div class="cap"><strong>Office HQ</strong>123 Main St, New York</div></div>`,
  }),

  'gradient-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:radial-gradient(circle at 20% 18%,rgba(108,140,255,.18),transparent 34%),radial-gradient(circle at 82% 82%,rgba(108,255,184,.14),transparent 36%),#0d0d0f;color:#fff;${base}}${reduced}${embedCss}.wrap{width:min(100%,500px);padding:1.1rem;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);box-shadow:0 28px 80px rgba(0,0,0,.38)}.map-stage{position:relative;height:260px;border-radius:16px;overflow:hidden}`,
    body: `<div class="wrap"><div class="map-stage">${mapIframe('Paris, France', 12, 'Paris map')}</div></div>`,
  }),

  'sidebar-map': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);width:min(100%,700px);min-height:340px;border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.1)}.side{padding:1.1rem;border-right:1px solid #f0f2f5}.side h3{font-size:.95rem;font-weight:800;margin-bottom:.75rem}.item{display:block;width:100%;padding:.65rem .7rem;margin-bottom:.35rem;border:none;border-radius:10px;background:transparent;text-align:left;font-family:inherit;font-size:.82rem;color:#4b5563;cursor:pointer}.item.is-active{background:#f0f4ff;color:#4f6ef7;font-weight:700}.map-stage{position:relative;min-height:280px}@media(max-width:640px){.layout{grid-template-columns:1fr}.side{display:flex;gap:.35rem;overflow-x:auto;border-right:none;border-bottom:1px solid #f0f2f5}.item{white-space:nowrap}}`,
    body: `<div class="layout"><aside class="side" id="side"><h3>Stores</h3></aside><div class="map-stage">${mapIframe(DEMO.maps, 14, 'Store map', 'map-embed')}</div></div>`,
    script: `${mapHelpers}const stores=[{name:'SoHo',query:'SoHo, New York, NY',z:15},{name:'Williamsburg',query:'Williamsburg, Brooklyn, NY',z:14},{name:'Midtown',query:'Midtown Manhattan, NY',z:14}];const side=document.getElementById('side'),map=document.querySelector('.map-embed');stores.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='item'+(i===0?' is-active':'');b.textContent=s.name;b.onclick=()=>{map.src=embedUrl(s.query,s.z);side.querySelectorAll('.item').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');};side.appendChild(b);});`,
  }),

  // ── Video embeds ────────────────────────────────────────────────────────
  'video-controls': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0d0d0f;color:#fff;${base}}${reduced}${embedCss}.wrap{width:min(92vw,560px)}.eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6c8cff;margin-bottom:.5rem;text-align:center}h2{font-size:1.2rem;font-weight:800;text-align:center;margin-bottom:1.25rem}.embed{border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08)}`,
    body: `<div class="wrap"><div class="eyebrow">Embed</div><h2>YouTube player</h2>${youtubeBlock(DEMO.youtube, { controls: true, mute: false }, 'embed--16x9', 'YouTube video')}</div>`,
  }),

  'hero-video': () => ({
    style: `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Manrope:wght@500;600&display=swap');*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#000;color:#fff;font-family:Manrope,sans-serif;${base}}${reduced}.stage{position:relative;width:100%;min-height:100vh;display:grid;place-items:center;overflow:hidden}.stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.overlay{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.15) 40%,rgba(0,0,0,.72) 100%)}.copy{position:relative;z-index:2;text-align:center;padding:2rem 1.5rem;max-width:18ch}.kicker{margin:0 0 .85rem;font-size:.7rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55)}h1{margin:0;font-family:Syne,sans-serif;font-size:clamp(2.4rem,8vw,4.75rem);font-weight:800;letter-spacing:-.045em;line-height:.95}.sub{margin:1rem 0 0;font-size:.95rem;font-weight:500;color:rgba(255,255,255,.62)}@media(prefers-reduced-motion:reduce){.stage video{display:none}.stage{background:url('${M.IMG169}') center/cover}}`,
    body: `<section class="stage"><video src="${M.VID169}" autoplay muted loop playsinline aria-hidden="true"></video><div class="overlay" aria-hidden="true"></div><div class="copy"><p class="kicker">Local hero</p><h1>Full-bleed film</h1><p class="sub">Stock video, no embed</p></div></section>`,
  }),

  'card-video': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.card{width:min(100%,380px);border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 16px 40px rgba(15,23,42,.1)}.body{padding:1rem 1.1rem 1.15rem}h3{font-size:.95rem;font-weight:700;margin-bottom:.2rem;color:#111827}p{font-size:.82rem;color:#6b7280}`,
    body: `<article class="card">${youtubeBlock(DEMO.youtube, { controls: true, mute: false }, 'embed--16x9', 'Video card')}<div class="body"><h3>Product walkthrough</h3><p>Hosted via YouTube embed.</p></div></article>`,
  }),

  'pip-video': () => ({
    style: `@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}body{min-height:100vh;margin:0;overflow:hidden;background:#f1f0eb;color:#0b0b0b;font-family:'DM Mono',monospace;${base}}${reduced}${embedCss}.page{position:relative;min-height:100vh;padding:clamp(1.25rem,3vw,2.5rem)}.topline{display:flex;justify-content:space-between;align-items:center;padding-bottom:.8rem;border-bottom:1px solid #0b0b0b;font-size:.66rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase}.status{display:inline-flex;align-items:center;gap:.45rem}.status::before{content:'';width:7px;height:7px;border-radius:50%;background:#ff3b30;animation:pulse 1.6s ease-in-out infinite}h1{position:absolute;left:clamp(1.25rem,3vw,2.5rem);bottom:clamp(1rem,2vw,2rem);margin:0;font-family:'Archivo Black',sans-serif;font-size:clamp(5rem,22vw,18rem);font-weight:400;line-height:.72;letter-spacing:-.075em;text-transform:uppercase}.index{position:absolute;right:clamp(1.25rem,3vw,2.5rem);top:50%;margin:0;transform:translateY(-50%) rotate(90deg);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase}.pip{position:fixed;top:50%;left:50%;z-index:10;width:min(30vw,300px);min-width:210px;padding:7px;background:#0b0b0b;transform:translate(-50%,-58%) rotate(-2deg);box-shadow:14px 14px 0 #ff3b30;transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .45s cubic-bezier(.22,1,.36,1)}.pip:hover{transform:translate(-50%,-58%) rotate(0) scale(1.06);box-shadow:7px 7px 0 #ff3b30}.pip__caption{display:flex;justify-content:space-between;padding:.55rem .2rem .05rem;color:#fff;font-size:.58rem;letter-spacing:.12em;text-transform:uppercase}@keyframes pulse{50%{opacity:.25;transform:scale(.7)}}@media(max-width:600px){h1{font-size:clamp(4.25rem,25vw,8rem)}.pip{width:min(68vw,280px)}.index{display:none}}`,
    body: `<main class="page"><header class="topline"><span>Picture in picture</span><span class="status">Playing</span></header><h1>Watch</h1><p class="index">Video study / 09</p></main><div class="pip">${youtubeBlock(DEMO.youtube, { controls: true }, 'embed--16x9', 'Floating player')}<div class="pip__caption"><span>Now viewing</span><span>16:9</span></div></div>`,
  }),

  'vertical-video': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#111;color:#fff;${base}}${reduced}${embedCss}.phone{width:min(72vw,280px);padding:.55rem;border-radius:28px;background:#1a1a1a;border:1px solid #333;box-shadow:0 24px 60px rgba(0,0,0,.5)}.embed{border-radius:22px}`,
    body: `<div class="phone">${youtubeBlock('ARfX5KchNao', { controls: true }, 'embed--9x16', 'Vertical video')}</div>`,
  }),

  'overlay-video': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0a0a0c;color:#fff;${base}}${reduced}${embedCss}.stage{position:relative;width:min(92vw,640px)}.embed{border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}.copy{position:absolute;left:1.25rem;bottom:1.25rem;z-index:2;pointer-events:none}.copy h2{font-size:1.15rem;font-weight:800}.copy p{font-size:.82rem;color:rgba(255,255,255,.72);margin-top:.2rem}.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,.75));pointer-events:none;z-index:1;border-radius:18px}`,
    body: `<div class="stage"><div class="embed embed--16x9">${iframe(E.youtubeEmbed(DEMO.youtube, { controls: true }), { className: 'embed__frame', title: 'Video with overlay' })}</div><div class="shade"></div><div class="copy"><h2>Launch film</h2><p>Caption over an embedded player.</p></div></div>`,
  }),

  'gallery-video': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0d0d0f;color:#fff;${base}}${reduced}${embedCss}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:min(100%,640px)}.main{grid-column:span 2}.embed{border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}`,
    body: `<div class="grid"><div class="main">${youtubeBlock(DEMO.youtube, { controls: true }, 'embed--16x9', 'Featured video')}</div>${youtubeBlock(DEMO.youtubeLoop, { controls: true }, 'embed--16x9', 'Gallery video 2')}${youtubeBlock(DEMO.youtube, { controls: true }, 'embed--16x9', 'Gallery video 3')}</div>`,
  }),

  'muted-video': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#000;${base}}${reduced}${embedCss}.embed{width:min(92vw,720px);border-radius:16px;overflow:hidden;opacity:.92}`,
    body: youtubeBlock(DEMO.youtubeLoop, { autoplay: true, mute: true, controls: false, loop: true }, 'embed--16x9', 'Muted loop embed'),
  }),

  'vimeo-embed': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0d0d0f;color:#fff;${base}}${reduced}${embedCss}.wrap{width:min(92vw,560px);text-align:center}h2{font-size:1.2rem;font-weight:800;margin-bottom:1rem}.embed{border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}`,
    body: `<div class="wrap"><h2>Vimeo embed</h2><div class="embed embed--16x9">${iframe(E.vimeoEmbed(DEMO.vimeo), { className: 'embed__frame', title: 'Vimeo video' })}</div></div>`,
  }),

  // ── Calendar embed ──────────────────────────────────────────────────────
  'agenda-view': () => ({
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.panel{width:min(100%,720px);border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.1)}.head{padding:1.1rem 1.15rem .85rem;border-bottom:1px solid #f0f2f5}.head h2{font-size:1.05rem;font-weight:800}.head p{font-size:.82rem;color:#6b7280;margin-top:.2rem}.cal{position:relative;height:420px}`,
    body: `<div class="panel"><header class="head"><h2>Team agenda</h2><p>Live Google Calendar embed — no custom grid stub.</p></header><div class="cal">${iframe(DEMO.calendar, { className: 'map-embed', title: 'Google Calendar' })}</div></div>`,
  }),

  // ── Hero embed player ───────────────────────────────────────────────────
  'embedded-player': () => ({
    style: `body{min-height:100vh;background:#111;color:#fff;display:grid;place-items:center;padding:3rem 2rem;text-align:center;${base}}${reduced}${embedCss}h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:800;margin-bottom:.75rem}.sub{color:#888;margin-bottom:2.5rem}.player{width:min(720px,100%);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);border:1px solid #333}`,
    body: `<h1>Watch the keynote</h1><p class="sub">Lead with an embedded player — YouTube, no local file required.</p><div class="player">${youtubeBlock(DEMO.youtube, { controls: true, mute: false }, 'embed--16x9', 'Keynote video')}</div>`,
  }),
};

function locationList() {
  return {
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f4f5f8;${base}}${reduced}${embedCss}.layout{display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);width:min(100%,720px);min-height:360px;border-radius:20px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(15,23,42,.1)}.list-head{padding:1.1rem 1.15rem .85rem;border-bottom:1px solid #f0f2f5}.list-head h2{font-size:1.05rem;font-weight:800}.list{list-style:none;margin:0;padding:.35rem 0}.item{display:block;width:100%;padding:.85rem 1.15rem;border:none;border-left:3px solid transparent;background:transparent;text-align:left;font-family:inherit;cursor:pointer;font-size:.88rem;color:#374151}.item.is-active{background:#f0f4ff;border-left-color:#4f6ef7;font-weight:700}.map-stage{position:relative;min-height:280px;background:#e5e7eb}@media(max-width:640px){.layout{grid-template-columns:1fr}}`,
    body: `<div class="layout"><div><header class="list-head"><h2>Our offices</h2></header><ul class="list" id="list"></ul></div><div class="map-stage">${mapIframe(DEMO.maps, 14, 'Selected office', 'map-embed')}</div></div>`,
    script: `${mapHelpers}const locations=[{title:'Headquarters',query:'123 Main Street, New York, NY 10001',z:14},{title:'West Office',query:'1 Market Street, San Francisco, CA 94105',z:14},{title:'EU Hub',query:'1 Canada Square, London E14 5AB, UK',z:14}];const list=document.getElementById('list'),map=document.querySelector('.map-embed');function select(i){const loc=locations[i];map.src=embedUrl(loc.query,loc.z);list.querySelectorAll('.item').forEach((b,j)=>b.classList.toggle('is-active',j===i));}locations.forEach((loc,i)=>{const b=document.createElement('button');b.type='button';b.className='item'+(i===0?' is-active':'');b.textContent=loc.title;b.onclick=()=>select(i);list.appendChild(b);});`,
  };
}

function interactiveMap() {
  return {
    style: `body{display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#0f1117;color:#f3f4f6;${base}}${reduced}${embedCss}.wrap{width:min(100%,520px)}.head h2{font-size:1.2rem;font-weight:800;margin-bottom:.25rem}.head p{font-size:.82rem;color:#9ca3af;margin-bottom:1rem}.map-stage{position:relative;height:300px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}.dot{position:absolute;width:14px;height:14px;background:#6cffb8;border-radius:50%;border:2px solid #fff;transform:translate(-50%,-50%);cursor:pointer;z-index:2}`,
    body: `<div class="wrap"><header class="head"><h2>Interactive map</h2><p>Click a dot to refocus the embedded map.</p></header><div class="map-stage">${mapIframe('United States', 4, 'Interactive map', 'map-embed')}<button type="button" class="dot" style="top:42%;left:82%" data-q="New York, NY" data-z="10" aria-label="New York"></button><button type="button" class="dot" style="top:45%;left:18%" data-q="San Francisco, CA" data-z="10" aria-label="San Francisco"></button></div></div>`,
    script: `${mapHelpers}const map=document.querySelector('.map-embed');document.querySelectorAll('.dot').forEach(d=>d.onclick=()=>{map.src=embedUrl(d.dataset.q,Number(d.dataset.z));});`,
  };
}

module.exports = { RECIPES };
