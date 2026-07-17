'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.marq-track{animation:none!important}}';

const tickDHMS = (days = 7) =>
  `const end=Date.now()+${days}*864e5+12*36e5+34*6e4+56e3;const $=id=>document.getElementById(id);function tick(){let t=Math.max(0,end-Date.now());const D=String(Math.floor(t/864e5)).padStart(2,'0'),H=String(Math.floor(t/36e5%24)).padStart(2,'0'),M=String(Math.floor(t/6e4%60)).padStart(2,'0'),S=String(Math.floor(t/1e3%60)).padStart(2,'0');$('d')&&($('d').textContent=D);$('h')&&($('h').textContent=H);$('m')&&($('m').textContent=M);$('s')&&($('s').textContent=S);}tick();setInterval(tick,1000);`;

const flipScript = `const end=Date.now()+5*864e5+8*36e5+21*6e4+45e3;
function pad(n){return String(n).padStart(2,'0');}
function setFlip(el,val){if(!el||el.dataset.v===val)return;el.dataset.v=val;const cur=el.querySelector('.curr'),next=el.querySelector('.next');next.textContent=val;el.classList.remove('is-flipping');void el.offsetWidth;el.classList.add('is-flipping');setTimeout(()=>{cur.textContent=val;el.classList.remove('is-flipping');},600);}
function tick(){let t=Math.max(0,end-Date.now());setFlip(document.getElementById('fd'),pad(Math.floor(t/864e5)));setFlip(document.getElementById('fh'),pad(Math.floor(t/36e5%24)));setFlip(document.getElementById('fm'),pad(Math.floor(t/6e4%60)));setFlip(document.getElementById('fs'),pad(Math.floor(t/1e3%60)));}
tick();setInterval(tick,1000);`;

const RECIPES = {
  'flip-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
    .marq{position:fixed;top:0;left:0;right:0;overflow:hidden;border-bottom:1px solid #1a1a1a;padding:.55rem 0;background:#050505;z-index:2}
    .marq-track{display:flex;gap:2.5rem;width:max-content;animation:scroll 28s linear infinite;font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#444;font-weight:600}
    @keyframes scroll{to{transform:translateX(-50%)}}
    .stage{text-align:center;position:relative;z-index:1}
    h1{margin:0 0 2rem;${display};font-size:clamp(1.4rem,3vw,1.8rem);font-weight:800;letter-spacing:-.04em}
    .cd{display:flex;gap:10px;justify-content:center}
    .unit{text-align:center}
    .unit-flip{position:relative;width:72px;height:88px;perspective:400px;background:#111;border:1px solid #222;overflow:hidden}
    .unit-flip .curr,.unit-flip .next{position:absolute;inset:0;display:grid;place-items:center;${display};font-size:2.2rem;font-weight:800;letter-spacing:-.04em;backface-visibility:hidden}
    .unit-flip .next{transform:rotateX(-90deg);transform-origin:bottom;background:#161616}
    .unit-flip.is-flipping .curr{animation:out .6s cubic-bezier(.22,1,.36,1) forwards;transform-origin:top}
    .unit-flip.is-flipping .next{animation:in .6s cubic-bezier(.22,1,.36,1) forwards}
    @keyframes out{to{transform:rotateX(90deg)}}
    @keyframes in{to{transform:rotateX(0)}}
    .lbl{margin-top:.55rem;font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:#555}`,
    body: `<div class="marq" aria-hidden="true"><div class="marq-track"><span>T-MINUS · FLIP CLOCK · COUNTDOWN · LAUNCH WINDOW · T-MINUS · FLIP CLOCK · COUNTDOWN · LAUNCH WINDOW · </span><span>T-MINUS · FLIP CLOCK · COUNTDOWN · LAUNCH WINDOW · T-MINUS · FLIP CLOCK · COUNTDOWN · LAUNCH WINDOW · </span></div></div>
    <div class="stage"><h1>Flip clock</h1><div class="cd">
      <div class="unit"><div class="unit-flip" id="fd" data-v="05"><span class="curr">05</span><span class="next">05</span></div><div class="lbl">Days</div></div>
      <div class="unit"><div class="unit-flip" id="fh" data-v="08"><span class="curr">08</span><span class="next">08</span></div><div class="lbl">Hours</div></div>
      <div class="unit"><div class="unit-flip" id="fm" data-v="21"><span class="curr">21</span><span class="next">21</span></div><div class="lbl">Min</div></div>
      <div class="unit"><div class="unit-flip" id="fs" data-v="45"><span class="curr">45</span><span class="next">45</span></div><div class="lbl">Sec</div></div>
    </div></div>`,
    script: flipScript,
  }),

  'simple-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f4;color:#111;${base};padding:2rem;overflow:hidden}${reduced}
    .wrap{text-align:center;width:min(100%,640px)}
    .kicker{margin:0 0 1rem;font-size:.62rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#888}
    .time{${display};font-size:clamp(3.5rem,14vw,7rem);font-weight:800;letter-spacing:-.08em;font-variant-numeric:tabular-nums;line-height:1}
    .marq{margin-top:2rem;overflow:hidden;border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:.7rem 0}
    .marq-track{display:flex;gap:2rem;width:max-content;animation:scroll 22s linear infinite;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:#999;font-weight:600}
    @keyframes scroll{to{transform:translateX(-50%)}}`,
    body: `<div class="wrap"><p class="kicker">Launching in</p><div class="time" id="t">10:00</div>
    <div class="marq" aria-hidden="true"><div class="marq-track"><span>Simple · Precise · Inevitable · Simple · Precise · Inevitable · </span><span>Simple · Precise · Inevitable · Simple · Precise · Inevitable · </span></div></div></div>`,
    script: `let s=600;const el=document.getElementById('t');function draw(){el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}draw();setInterval(()=>{s=Math.max(0,s-1);draw();},1000);`,
  }),

  'event-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .card{width:min(100%,380px);border:1.5px solid #111;position:relative;overflow:hidden}
    .marq{overflow:hidden;background:#111;color:#fff;padding:.45rem 0}
    .marq-track{display:flex;gap:1.5rem;width:max-content;animation:scroll 18s linear infinite;font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;font-weight:600}
    @keyframes scroll{to{transform:translateX(-50%)}}
    .body{padding:1.75rem 1.5rem 1.5rem;text-align:center}
    h3{margin:0;${display};font-size:1.6rem;font-weight:800;letter-spacing:-.04em}
    .date{margin:.4rem 0 1.5rem;font-size:.78rem;color:#888}
    .nums{display:flex;justify-content:center;gap:1.25rem}
    .n .v{${display};font-size:2rem;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
    .n .l{font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:#999;margin-top:.25rem}`,
    body: `<div class="card"><div class="marq" aria-hidden="true"><div class="marq-track"><span>Event · Doors open soon · Limited seats · Event · Doors open soon · Limited seats · </span><span>Event · Doors open soon · Limited seats · Event · Doors open soon · Limited seats · </span></div></div>
    <div class="body"><h3>Product Launch</h3><div class="date">July 30, 2026</div>
    <div class="nums"><div class="n"><div class="v" id="d">09</div><div class="l">Days</div></div><div class="n"><div class="v" id="h">05</div><div class="l">Hrs</div></div><div class="n"><div class="v" id="m">22</div><div class="l">Min</div></div><div class="n"><div class="v" id="s">00</div><div class="l">Sec</div></div></div></div></div>`,
    script: tickDHMS(9),
  }),

  'ring-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;${base};padding:2rem}${reduced}
    .wrap{position:relative;width:200px;height:200px}
    svg{transform:rotate(-90deg);display:block;overflow:visible}
    circle{fill:none;stroke-width:3}
    .bg{stroke:rgba(255,255,255,.08)}
    .fg{stroke:#fff;stroke-linecap:square;stroke-dasharray:565;stroke-dashoffset:0;transition:stroke-dashoffset 1s linear}
    .txt{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
    .txt b{${display};font-size:3.2rem;font-weight:800;letter-spacing:-.06em;font-variant-numeric:tabular-nums;line-height:1}
    .txt span{font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:#555;margin-top:.35rem}
    .marq{position:fixed;bottom:0;left:0;right:0;overflow:hidden;border-top:1px solid #1a1a1a;padding:.5rem 0}
    .marq-track{display:flex;gap:2rem;width:max-content;animation:scroll 26s linear infinite;font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:#333;font-weight:600}
    @keyframes scroll{to{transform:translateX(-50%)}}`,
    body: `<div class="wrap"><svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true"><circle class="bg" cx="100" cy="100" r="90"/><circle class="fg" id="ring" cx="100" cy="100" r="90"/></svg>
    <div class="txt"><div><b id="n">30</b><span>seconds</span></div></div></div>
    <div class="marq" aria-hidden="true"><div class="marq-track"><span>Ring · Orbit · Decay · Ring · Orbit · Decay · </span><span>Ring · Orbit · Decay · Ring · Orbit · Decay · </span></div></div>`,
    script: `const TOTAL=30;let s=TOTAL;const ring=document.getElementById('ring'),n=document.getElementById('n'),C=2*Math.PI*90;
ring.style.strokeDasharray=C;function draw(){n.textContent=String(s);ring.style.strokeDashoffset=C*(1-s/TOTAL);}draw();
const iv=setInterval(()=>{s--;if(s<0){clearInterval(iv);n.textContent='0';return;}draw();},1000);`,
  }),

  'card-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eee;color:#111;${base};padding:2rem}${reduced}
    .stack{display:flex;gap:12px}
    .card{width:90px;background:#fff;border:1px solid #111;box-shadow:4px 4px 0 #111;padding:1rem .5rem;text-align:center;transition:transform .3s cubic-bezier(.22,1,.36,1)}
    .card:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #111}
    .card .v{${display};font-size:2rem;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
    .card .l{margin-top:.4rem;font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:#888}
    .head{text-align:center;margin-bottom:1.75rem}
    .head h2{margin:0;${display};font-size:1.5rem;font-weight:800;letter-spacing:-.04em}
    .head p{margin:.4rem 0 0;font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:#999}`,
    body: `<div><div class="head"><h2>Card stack</h2><p>Offset shadows · hard edges</p></div>
    <div class="stack">
      <div class="card"><div class="v" id="d">07</div><div class="l">Days</div></div>
      <div class="card"><div class="v" id="h">12</div><div class="l">Hours</div></div>
      <div class="card"><div class="v" id="m">30</div><div class="l">Min</div></div>
      <div class="card"><div class="v" id="s">45</div><div class="l">Sec</div></div>
    </div></div>`,
    script: tickDHMS(),
  }),

  'dark-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;background:#000;color:#fff;${base};overflow:hidden}${reduced}
    .marq{overflow:hidden;padding:1rem 0;opacity:.25}
    .marq-track{display:flex;gap:3rem;width:max-content;animation:scroll 40s linear infinite;${display};font-size:clamp(2rem,6vw,4rem);font-weight:800;letter-spacing:-.06em;white-space:nowrap}
    .marq--2 .marq-track{animation-direction:reverse;animation-duration:50s;opacity:.5}
    @keyframes scroll{to{transform:translateX(-50%)}}
    .center{text-align:center;padding:2rem;position:relative;z-index:1}
    .center .kicker{font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#555;margin-bottom:1rem}
    .center .time{${display};font-size:clamp(3rem,12vw,6.5rem);font-weight:800;letter-spacing:-.08em;font-variant-numeric:tabular-nums}`,
    body: `<div class="marq" aria-hidden="true"><div class="marq-track"><span>00:00:00 · DARK · VOID · 00:00:00 · DARK · VOID · </span><span>00:00:00 · DARK · VOID · 00:00:00 · DARK · VOID · </span></div></div>
    <div class="center"><p class="kicker">Until blackout</p><div class="time" id="t">48:00:00</div></div>
    <div class="marq marq--2" aria-hidden="true"><div class="marq-track"><span>COUNTING · DOWN · COUNTING · DOWN · </span><span>COUNTING · DOWN · COUNTING · DOWN · </span></div></div>`,
    script: `let s=48*3600;const el=document.getElementById('t');function draw(){const h=String(Math.floor(s/3600)).padStart(2,'0'),m=String(Math.floor(s%3600/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');el.textContent=h+':'+m+':'+sec;}draw();setInterval(()=>{s=Math.max(0,s-1);draw();},1000);`,
  }),

  'minimal-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem}${reduced}
    .row{display:flex;align-items:baseline;gap:clamp(.5rem,2vw,1.25rem);${display};font-weight:800;letter-spacing:-.06em;font-variant-numeric:tabular-nums}
    .row .v{font-size:clamp(2.5rem,10vw,5.5rem);line-height:1}
    .row .sep{font-size:clamp(1.5rem,5vw,2.5rem);color:#ccc;font-weight:600}
    .row .u{font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:#aaa;font-family:"DM Sans",sans-serif;font-weight:600;align-self:flex-end;margin-bottom:.55rem}
    .line{width:100%;max-width:420px;height:1px;background:#e5e5e5;margin:1.5rem auto 0;position:relative;overflow:hidden}
    .line i{position:absolute;left:0;top:0;height:100%;width:40%;background:#111;animation:sweep 3s ease-in-out infinite}
    @keyframes sweep{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`,
    body: `<div><div class="row">
      <span class="v" id="d">07</span><span class="u">d</span>
      <span class="sep">:</span>
      <span class="v" id="h">12</span><span class="u">h</span>
      <span class="sep">:</span>
      <span class="v" id="m">30</span><span class="u">m</span>
      <span class="sep">:</span>
      <span class="v" id="s">00</span><span class="u">s</span>
    </div><div class="line" aria-hidden="true"><i></i></div></div>`,
    script: tickDHMS(),
  }),

  'gradient-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0c;color:#fff;${base};padding:2rem;overflow:hidden;position:relative}${reduced}
    .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.4;animation:drift 16s ease-in-out infinite}
    .orb--1{width:50vmax;height:50vmax;background:#3a3a3a;top:-20%;left:-10%}
    .orb--2{width:40vmax;height:40vmax;background:#1a1a1a;bottom:-25%;right:-10%;animation-direction:reverse}
    @keyframes drift{50%{transform:translate(6%,-4%)}}
    .stage{position:relative;z-index:1;text-align:center}
    .stage h2{margin:0 0 1.25rem;${display};font-size:1.2rem;font-weight:700;letter-spacing:-.03em;opacity:.6}
    .nums{display:flex;gap:1rem;justify-content:center}
    .n{min-width:70px}
    .n .v{display:block;${display};font-size:clamp(2rem,6vw,3.2rem);font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
    .n .l{font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:#666}`,
    body: `<div class="orb orb--1" aria-hidden="true"></div><div class="orb orb--2" aria-hidden="true"></div>
    <div class="stage"><h2>Gradient field</h2><div class="nums">
      <div class="n"><span class="v" id="d">03</span><span class="l">Days</span></div>
      <div class="n"><span class="v" id="h">14</span><span class="l">Hrs</span></div>
      <div class="n"><span class="v" id="m">22</span><span class="l">Min</span></div>
      <div class="n"><span class="v" id="s">08</span><span class="l">Sec</span></div>
    </div></div>`,
    script: tickDHMS(3),
  }),

  'block-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;${base};padding:2rem}${reduced}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(100%,480px)}
    .block{aspect-ratio:1;border:2px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transform:translateY(20px);animation:up .6s cubic-bezier(.22,1,.36,1) forwards}
    .block:nth-child(1){animation-delay:.05s}.block:nth-child(2){animation-delay:.12s}.block:nth-child(3){animation-delay:.19s}.block:nth-child(4){animation-delay:.26s}
    .block:nth-child(odd){background:#fff;color:#111}
    .block .v{${display};font-size:clamp(1.8rem,5vw,2.8rem);font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
    .block .l{font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;margin-top:.25rem;opacity:.5}
    @keyframes up{to{opacity:1;transform:none}}
    .marq{margin-top:1.5rem;overflow:hidden;width:min(100%,480px)}
    .marq-track{display:flex;gap:1.5rem;width:max-content;animation:scroll 16s linear infinite;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:#444;font-weight:700}
    @keyframes scroll{to{transform:translateX(-50%)}}`,
    body: `<div><div class="grid">
      <div class="block"><span class="v" id="d">02</span><span class="l">Days</span></div>
      <div class="block"><span class="v" id="h">18</span><span class="l">Hrs</span></div>
      <div class="block"><span class="v" id="m">44</span><span class="l">Min</span></div>
      <div class="block"><span class="v" id="s">11</span><span class="l">Sec</span></div>
    </div>
    <div class="marq" aria-hidden="true"><div class="marq-track"><span>Block · Brutal · Grid · Block · Brutal · Grid · </span><span>Block · Brutal · Grid · Block · Brutal · Grid · </span></div></div></div>`,
    script: tickDHMS(2),
  }),

  'inline-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .line{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.65rem 1rem;font-size:clamp(1rem,2.5vw,1.25rem);max-width:36ch;text-align:center;line-height:1.5}
    .line strong{${display};font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;border-bottom:2px solid #111;padding:0 2px}
    .ticker{margin-top:2.5rem;overflow:hidden;width:min(100%,520px);border-top:1px solid #eee;padding-top:1rem}
    .marq-track{display:flex;gap:2rem;width:max-content;animation:scroll 20s linear infinite;font-size:.65rem;letter-spacing:.16em;text-transform:uppercase;color:#aaa;font-weight:600}
    @keyframes scroll{to{transform:translateX(-50%)}}`,
    body: `<div><p class="line">Sale ends in <strong id="d">04</strong> days <strong id="h">06</strong> hrs <strong id="m">12</strong> min <strong id="s">30</strong> sec</p>
    <div class="ticker" aria-hidden="true"><div class="marq-track"><span>Inline · Sentence time · Inline · Sentence time · </span><span>Inline · Sentence time · Inline · Sentence time · </span></div></div></div>`,
    script: tickDHMS(4),
  }),

  'hero-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};padding:clamp(1.5rem,4vw,3rem);overflow:hidden;position:relative}${reduced}
    .brand{${display};font-size:clamp(3rem,12vw,7rem);font-weight:800;letter-spacing:-.08em;line-height:.85;text-align:center;margin:0 0 1.5rem}
    .sub{text-align:center;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#555;margin:0 0 2.5rem}
    .nums{display:flex;justify-content:center;gap:clamp(.75rem,3vw,2rem)}
    .n{text-align:center}
    .n .v{display:block;${display};font-size:clamp(2rem,7vw,4rem);font-weight:800;letter-spacing:-.06em;font-variant-numeric:tabular-nums}
    .n .l{font-size:.55rem;letter-spacing:.18em;text-transform:uppercase;color:#444}
    .marq{position:absolute;bottom:8%;left:0;right:0;overflow:hidden;opacity:.35}
    .marq-track{display:flex;gap:2.5rem;width:max-content;animation:scroll 32s linear infinite;${display};font-size:clamp(1.2rem,4vw,2rem);font-weight:800;letter-spacing:-.04em;white-space:nowrap}
    @keyframes scroll{to{transform:translateX(-50%)}}`,
    body: `<div><h1 class="brand">Drop</h1><p class="sub">Hero countdown</p>
    <div class="nums">
      <div class="n"><span class="v" id="d">12</span><span class="l">Days</span></div>
      <div class="n"><span class="v" id="h">08</span><span class="l">Hrs</span></div>
      <div class="n"><span class="v" id="m">45</span><span class="l">Min</span></div>
      <div class="n"><span class="v" id="s">20</span><span class="l">Sec</span></div>
    </div></div>
    <div class="marq" aria-hidden="true"><div class="marq-track"><span>COMING SOON · COMING SOON · COMING SOON · </span><span>COMING SOON · COMING SOON · COMING SOON · </span></div></div>`,
    script: tickDHMS(12),
  }),

  'compact-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f0f0f0;color:#111;${base};padding:2rem}${reduced}
    .dock{display:inline-flex;align-items:center;gap:.75rem;padding:.55rem .55rem .55rem 1rem;background:#111;color:#fff;border:1px solid #222}
    .dock .lbl{font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:#888;white-space:nowrap}
    .dock .time{${display};font-size:1.1rem;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
    .dock .pill{padding:.45rem .85rem;background:#fff;color:#111;font-size:.72rem;font-weight:700;letter-spacing:.04em}`,
    body: `<div class="dock"><span class="lbl">Ends in</span><span class="time" id="t">02:14:36</span><span class="pill">Live</span></div>`,
    script: `let s=2*3600+14*60+36;const el=document.getElementById('t');function draw(){const h=String(Math.floor(s/3600)).padStart(2,'0'),m=String(Math.floor(s%3600/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');el.textContent=h+':'+m+':'+sec;}draw();setInterval(()=>{s=Math.max(0,s-1);draw();},1000);`,
  }),

  'animated-countdown': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
    .stage{text-align:center}
    .pulse{${display};font-size:clamp(4rem,18vw,9rem);font-weight:800;letter-spacing:-.1em;font-variant-numeric:tabular-nums;line-height:1;animation:beat 1s cubic-bezier(.22,1,.36,1) infinite}
    @keyframes beat{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
    .meta{margin-top:1rem;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .orbit{position:fixed;inset:0;pointer-events:none;overflow:hidden}
    .orbit span{position:absolute;white-space:nowrap;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#222;font-weight:700;animation:orbit 20s linear infinite}
    .orbit span:nth-child(1){top:18%;animation-duration:24s}
    .orbit span:nth-child(2){top:72%;animation-duration:30s;animation-direction:reverse}
    @keyframes orbit{from{transform:translateX(-20%)}to{transform:translateX(100%)}}`,
    body: `<div class="orbit" aria-hidden="true"><span>Animated · Pulse · Tick · Animated · Pulse · Tick · Animated · Pulse · Tick · </span><span>Seconds collapse · Seconds collapse · Seconds collapse · </span></div>
    <div class="stage"><div class="pulse" id="n">60</div><p class="meta">Seconds remaining</p></div>`,
    script: `let s=60;const el=document.getElementById('n');const iv=setInterval(()=>{s--;el.textContent=String(Math.max(0,s));if(s<=0)clearInterval(iv);},1000);`,
  }),
};

function extractCountdownDesc(slug) {
  if (!slug.startsWith('countdown-')) return null;
  return slug.replace(/^countdown-/, '').replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractCountdownDesc };
