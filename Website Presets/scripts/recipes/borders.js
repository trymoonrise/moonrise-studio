'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

const RECIPES = {
  'gradient-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
    .frame{position:relative;width:min(100%,320px);padding:2px;border-radius:20px;background:linear-gradient(120deg,#fff,#888,#fff,#444);background-size:300% 300%;animation:flow 5s ease infinite}
    @keyframes flow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    .inner{padding:2.25rem 2rem;border-radius:18px;background:#0a0a0a;text-align:center;position:relative}
    .inner::before{content:'';position:absolute;inset:12px;border:1px solid rgba(255,255,255,.06);border-radius:12px;pointer-events:none}
    .tag{font-size:.65rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#666;margin-bottom:.9rem}
    h2{${display};font-size:clamp(1.5rem,4vw,2rem);font-weight:800;letter-spacing:-.04em;margin:0 0 .5rem}
    p{margin:0;color:#888;font-size:.9rem;line-height:1.5}`,
    body: `<div class="frame"><div class="inner"><div class="tag">Edge</div><h2>Gradient frame</h2><p>Monochrome spectrum in motion.</p></div></div>`,
  }),

  'dashed-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f7;${base};padding:2rem;color:#111}${reduced}
    .wrap{position:relative;width:min(100%,300px);aspect-ratio:4/3;display:grid;place-items:center}
    svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    .dash{fill:none;stroke:#111;stroke-width:2;stroke-dasharray:10 8;stroke-dashoffset:0;animation:march 12s linear infinite}
    @keyframes march{to{stroke-dashoffset:-180}}
    .box{position:relative;z-index:1;text-align:center;padding:1.5rem}
    h2{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem}
    p{margin:0;color:#666;font-size:.88rem}`,
    body: `<div class="wrap"><svg viewBox="0 0 300 225" aria-hidden="true"><rect class="dash" x="4" y="4" width="292" height="217" rx="2"/></svg><div class="box"><h2>Drop zone</h2><p>Dashed perimeter in march.</p></div></div>`,
  }),

  'double-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;${base};padding:2rem;color:#111}${reduced}
    .stack{position:relative;width:min(100%,280px)}
    .outer{padding:1.75rem;border:2px solid #111;position:relative;animation:settle .9s cubic-bezier(.22,1,.36,1) both}
    .outer::before{content:'';position:absolute;inset:-10px;border:1px solid #111;pointer-events:none;animation:breath 4s ease-in-out infinite}
    @keyframes breath{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.01)}}
    @keyframes settle{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    .inner{border-top:1px solid #ddd;padding-top:1.25rem;margin-top:.25rem}
    h2{${display};font-size:1.4rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .4rem}
    p{margin:0;color:#666;font-size:.88rem;line-height:1.5}`,
    body: `<div class="stack"><div class="outer"><h2>Double frame</h2><div class="inner"><p>Nested outlines. Quiet depth.</p></div></div></div>`,
  }),

  'animated-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;${base};padding:2rem;color:#fff}${reduced}
    .card{position:relative;width:min(100%,300px);padding:2.5rem 2rem;text-align:center;border-radius:2px;background:#141414;overflow:hidden}
    .card::before{content:'';position:absolute;inset:0;padding:2px;background:conic-gradient(from var(--a,0deg),#fff,#555,#fff,#222,#fff);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spin 4s linear infinite;border-radius:2px}
    @property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
    @keyframes spin{to{--a:360deg}}
    .num{${display};font-size:3rem;font-weight:800;letter-spacing:-.06em;line-height:1;margin-bottom:.5rem}
    p{margin:0;color:#888;font-size:.88rem}`,
    body: `<div class="card"><div class="num">04</div><p>Spinning conic edge.</p></div>`,
  }),

  'glow-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;${base};padding:2rem;color:#fff}${reduced}
    .panel{position:relative;width:min(100%,300px);padding:2rem 1.75rem;text-align:center;background:#0d0d0d;border:1px solid rgba(255,255,255,.12);box-shadow:0 0 0 1px rgba(255,255,255,.04),0 0 24px rgba(255,255,255,.08),0 0 48px rgba(255,255,255,.04);animation:glow 3s ease-in-out infinite}
    @keyframes glow{0%,100%{box-shadow:0 0 0 1px rgba(255,255,255,.04),0 0 20px rgba(255,255,255,.06),0 0 40px rgba(255,255,255,.03)}50%{box-shadow:0 0 0 1px rgba(255,255,255,.14),0 0 32px rgba(255,255,255,.14),0 0 64px rgba(255,255,255,.08)}}
    h2{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .4rem}
    p{margin:0;color:#777;font-size:.86rem}`,
    body: `<div class="panel"><h2>Soft glow</h2><p>Luminous edge, no color.</p></div>`,
  }),

  'corner-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;${base};padding:2rem;color:#111}${reduced}
    .frame{position:relative;width:min(100%,300px);padding:2.5rem 2rem;text-align:center}
    .c{position:absolute;width:28px;height:28px;border:2px solid #111;opacity:0;animation:corner .6s cubic-bezier(.22,1,.36,1) forwards}
    .c--tl{top:0;left:0;border-right:none;border-bottom:none;animation-delay:.1s}
    .c--tr{top:0;right:0;border-left:none;border-bottom:none;animation-delay:.2s}
    .c--bl{bottom:0;left:0;border-right:none;border-top:none;animation-delay:.3s}
    .c--br{bottom:0;right:0;border-left:none;border-top:none;animation-delay:.4s}
    @keyframes corner{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
    h2{${display};font-size:1.4rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem}
    p{margin:0;color:#666;font-size:.88rem}`,
    body: `<div class="frame"><span class="c c--tl" aria-hidden="true"></span><span class="c c--tr" aria-hidden="true"></span><span class="c c--bl" aria-hidden="true"></span><span class="c c--br" aria-hidden="true"></span><h2>Corner brackets</h2><p>Four anchors draw in.</p></div>`,
  }),

  'dotted-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;${base};padding:2rem;color:#111}${reduced}
    .box{position:relative;width:min(100%,280px);padding:2.25rem 2rem;text-align:center;background:#fff}
    .box::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,#111 1.5px,transparent 1.5px);background-size:12px 12px;animation:shift 8s linear infinite;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:2px}
    @keyframes shift{to{background-position:48px 0}}
    h2{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem;position:relative}
    p{margin:0;color:#666;font-size:.88rem;position:relative}`,
    body: `<div class="box"><h2>Dot perimeter</h2><p>Stippled edge in drift.</p></div>`,
  }),

  'thick-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eee;${base};padding:2rem;color:#111}${reduced}
    .block{position:relative;width:min(100%,280px);padding:2rem 1.75rem;background:#fff;border:8px solid #111;box-shadow:8px 8px 0 #111;transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s cubic-bezier(.22,1,.36,1);cursor:default}
    .block:hover{transform:translate(-4px,-4px);box-shadow:12px 12px 0 #111}
    h2{${display};font-size:1.5rem;font-weight:800;letter-spacing:-.04em;margin:0 0 .35rem;text-transform:uppercase}
    p{margin:0;color:#555;font-size:.86rem}`,
    body: `<div class="block"><h2>Thick</h2><p>Brutal weight. Hover shifts.</p></div>`,
  }),

  'neon-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;${base};padding:2rem;color:#fff}${reduced}
    .neon{position:relative;width:min(100%,300px);padding:2.25rem 2rem;text-align:center;background:#050505;border:2px solid #fff;box-shadow:0 0 8px #fff,0 0 20px rgba(255,255,255,.5),inset 0 0 12px rgba(255,255,255,.08);animation:flicker 4s ease-in-out infinite}
    @keyframes flicker{0%,100%{opacity:1;border-color:#fff}92%{opacity:1}93%{opacity:.85;border-color:#aaa}94%{opacity:1}96%{opacity:.9}97%{opacity:1}}
    h2{${display};font-size:1.4rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .35rem;text-shadow:0 0 12px rgba(255,255,255,.6)}
    p{margin:0;color:#999;font-size:.86rem}`,
    body: `<div class="neon"><h2>Neon wire</h2><p>White electric edge.</p></div>`,
  }),

  'minimal-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;${base};padding:2rem;color:#111}${reduced}
    .line-box{position:relative;width:min(100%,300px);padding:2.5rem 2rem;text-align:center}
    .line-box::before{content:'';position:absolute;inset:0;border:1px solid #ddd}
    .trace{position:absolute;background:#111;animation:trace 3s ease-in-out infinite}
    .trace--h{height:1px;width:40px;top:0;left:0;animation-name:traceH}
    .trace--v{width:1px;height:40px;top:0;right:0;animation-name:traceV;animation-delay:.75s}
    @keyframes traceH{0%,100%{left:0;top:0}25%{left:calc(100% - 40px);top:0}50%{left:calc(100% - 40px);top:calc(100% - 1px)}75%{left:0;top:calc(100% - 1px)}}
    @keyframes traceV{0%,100%{top:0;right:0}25%{top:calc(100% - 40px);right:0}50%{top:calc(100% - 40px);right:calc(100% - 1px)}75%{top:0;right:calc(100% - 1px)}}
    h2{${display};font-size:1.3rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .3rem}
    p{margin:0;color:#888;font-size:.86rem}`,
    body: `<div class="line-box"><span class="trace trace--h" aria-hidden="true"></span><span class="trace trace--v" aria-hidden="true"></span><h2>Hairline</h2><p>A single pixel travels.</p></div>`,
  }),

  'card-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f0f0f0;${base};padding:2rem;color:#111}${reduced}
    .card{position:relative;width:min(100%,300px);background:#fff;border:1px solid #111;box-shadow:4px 4px 0 #111;overflow:hidden;animation:lift .8s cubic-bezier(.22,1,.36,1) both}
    @keyframes lift{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .stripe{height:4px;background:#111;transform-origin:left;animation:grow .9s .2s cubic-bezier(.22,1,.36,1) both}
    @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .body{padding:1.75rem 1.5rem}
    .label{font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:.6rem}
    h2{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem}
    p{margin:0;color:#666;font-size:.88rem;line-height:1.5}`,
    body: `<article class="card"><div class="stripe" aria-hidden="true"></div><div class="body"><div class="label">Card</div><h2>Framed block</h2><p>Hard edge with accent stripe.</p></div></article>`,
  }),

  'wave-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;${base};padding:2rem;color:#fff}${reduced}
    .wrap{position:relative;width:min(100%,320px)}
    svg{display:block;width:100%;height:auto}
    .wave{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-dasharray:8 6;animation:wave 6s linear infinite}
    @keyframes wave{to{stroke-dashoffset:-56}}
    .content{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:2rem}
    h2{${display};font-size:1.35rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem}
    p{margin:0;color:#888;font-size:.86rem}`,
    body: `<div class="wrap"><svg viewBox="0 0 320 200" aria-hidden="true"><path class="wave" d="M8,24 C40,8 72,40 104,24 S168,8 200,24 S264,40 296,24 L312,24 L312,176 C280,192 248,160 216,176 S152,192 120,176 S56,160 24,176 L8,176 Z"/></svg><div class="content"><h2>Wave edge</h2><p>Organic SVG perimeter.</p></div></div>`,
  }),

  'offset-border': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;${base};padding:2rem;color:#111}${reduced}
    .offset{position:relative;width:min(100%,280px)}
    .ghost{position:absolute;inset:0;border:2px solid #111;transform:translate(10px,10px);animation:drift 5s ease-in-out infinite}
    @keyframes drift{0%,100%{transform:translate(10px,10px)}50%{transform:translate(14px,6px)}}
    .main{position:relative;padding:2rem 1.75rem;border:2px solid #111;background:#fff;z-index:1}
    h2{${display};font-size:1.4rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .35rem}
    p{margin:0;color:#666;font-size:.88rem}`,
    body: `<div class="offset"><div class="ghost" aria-hidden="true"></div><div class="main"><h2>Offset</h2><p>Shadow frame in motion.</p></div></div>`,
  }),
};

function extractBorderDesc(slug) {
  if (!slug.startsWith('borders-')) return null;
  return slug.replace(/^borders-/, '').replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractBorderDesc };
