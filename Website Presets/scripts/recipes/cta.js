'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}';

const RECIPES = {
  'centered-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem;overflow:hidden}${reduced}
    .stage{position:relative;text-align:center;max-width:520px}
    .ring{position:absolute;left:50%;top:50%;width:280px;height:280px;margin:-140px 0 0 -140px;border:1px solid #e5e5e5;border-radius:50%;animation:spin 18s linear infinite;pointer-events:none}
    .ring::after{content:'';position:absolute;inset:18px;border:1px dashed #ddd;border-radius:50%;animation:spin 28s linear infinite reverse}
    @keyframes spin{to{transform:rotate(360deg)}}
    .kicker{position:relative;font-size:.68rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#888;margin-bottom:1.1rem;opacity:0;animation:up .7s .1s cubic-bezier(.22,1,.36,1) forwards}
    h2{position:relative;${display};font-size:clamp(2.4rem,7vw,3.6rem);font-weight:800;letter-spacing:-.045em;line-height:1.02;margin:0 0 1rem;opacity:0;animation:up .8s .2s cubic-bezier(.22,1,.36,1) forwards}
    p{position:relative;color:#666;font-size:1rem;line-height:1.55;margin:0 0 1.75rem;opacity:0;animation:up .8s .35s cubic-bezier(.22,1,.36,1) forwards}
    .btn{position:relative;padding:14px 32px;border:1.5px solid #111;background:#111;color:#fff;${base};font-size:.88rem;font-weight:600;cursor:pointer;overflow:hidden;opacity:0;animation:up .8s .5s cubic-bezier(.22,1,.36,1) forwards}
    .btn span{position:relative;z-index:1;display:inline-block;transition:transform .35s cubic-bezier(.22,1,.36,1)}
    .btn::before{content:'';position:absolute;inset:0;background:#fff;transform:translateY(101%);transition:transform .4s cubic-bezier(.22,1,.36,1)}
    .btn:hover::before{transform:none}.btn:hover{color:#111}.btn:hover span{transform:translateX(2px)}
    @keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}`,
    body: `<div class="stage"><div class="ring" aria-hidden="true"></div><div class="kicker">Start here</div><h2>Ready when<br>you are</h2><p>One quiet move. Ship something sharp today.</p><button class="btn" type="button"><span>Get started →</span></button></div>`,
  }),

  'split-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .cta{display:grid;grid-template-columns:1fr 1fr;width:min(100%,720px);min-height:280px;border:1px solid #111;overflow:hidden}
    .copy{padding:2.25rem 2rem;display:flex;flex-direction:column;justify-content:center;gap:.85rem}
    .copy h2{${display};font-size:clamp(1.6rem,3.5vw,2.1rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:0}
    .copy p{margin:0;color:#666;font-size:.92rem;line-height:1.5;max-width:28ch}
    .btn{align-self:flex-start;margin-top:.35rem;padding:11px 22px;border:1.5px solid #111;background:transparent;color:#111;font:inherit;font-size:.84rem;font-weight:600;cursor:pointer;transition:background .3s,color .3s}
    .btn:hover{background:#111;color:#fff}
    .panel{position:relative;background:#111;overflow:hidden}
    .panel::before,.panel::after{content:'';position:absolute;background:#fff}
    .panel::before{width:2px;height:120%;left:50%;top:-10%;transform:translateX(-50%) rotate(18deg);animation:sweep 4.5s ease-in-out infinite}
    .panel::after{height:2px;width:120%;top:50%;left:-10%;transform:translateY(-50%) rotate(-12deg);animation:sweep 5.5s ease-in-out infinite reverse}
    @keyframes sweep{0%,100%{opacity:.15}50%{opacity:.55}}
    .mark{position:absolute;inset:0;display:grid;place-items:center;${display};font-size:clamp(3rem,8vw,5rem);font-weight:800;color:#fff;letter-spacing:-.06em;animation:pulse 3s ease-in-out infinite}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.04);opacity:1}}
    @media(max-width:640px){.cta{grid-template-columns:1fr}.panel{min-height:160px}}`,
    body: `<div class="cta"><div class="copy"><h2>Upgrade the work</h2><p>Clean tools. No noise. Just the next step.</p><button class="btn" type="button">Upgrade</button></div><div class="panel" aria-hidden="true"><span class="mark">02</span></div></div>`,
  }),

  'banner-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:flex;align-items:center;background:#f5f5f5;${base}}${reduced}
    .banner{width:100%;background:#111;color:#fff;padding:1.35rem clamp(1.25rem,4vw,3rem);display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;position:relative;overflow:hidden}
    .line{position:absolute;left:0;top:0;height:2px;width:0;background:#fff;animation:grow 1.2s .2s cubic-bezier(.22,1,.36,1) forwards}
    @keyframes grow{to{width:100%}}
    .text{${display};font-size:clamp(1.05rem,2.5vw,1.35rem);font-weight:700;letter-spacing:-.02em;opacity:0;animation:slide .7s .35s cubic-bezier(.22,1,.36,1) forwards}
    @keyframes slide{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
    .btn{padding:10px 22px;border:1px solid #fff;background:transparent;color:#fff;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap;opacity:0;animation:slide .7s .5s cubic-bezier(.22,1,.36,1) forwards;transition:background .25s,color .25s}
    .btn:hover{background:#fff;color:#111}`,
    body: `<div class="banner"><span class="line" aria-hidden="true"></span><p class="text">Start building today - free to try</p><button class="btn" type="button">Sign up</button></div>`,
  }),

  'card-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;${base};padding:2rem}${reduced}
    .card{width:min(100%,340px);padding:2rem 1.75rem;border:1px solid #2a2a2a;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;inset:-40% -20%;background:conic-gradient(from var(--a,0deg),transparent 60%,#fff 70%,transparent 80%);opacity:.12;animation:spin 6s linear infinite}
    @property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
    @keyframes spin{to{--a:360deg}}
    .inner{position:relative}
    .kicker{font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:#777;margin-bottom:1rem}
    h2{${display};font-size:1.65rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .65rem;line-height:1.15}
    p{margin:0 0 1.5rem;color:#999;font-size:.9rem;line-height:1.5}
    .btn{width:100%;padding:12px;border:none;background:#fff;color:#111;font:inherit;font-size:.86rem;font-weight:700;cursor:pointer;transition:transform .25s cubic-bezier(.22,1,.36,1)}
    .btn:hover{transform:translateY(-2px)}`,
    body: `<div class="card"><div class="inner"><div class="kicker">Limited</div><h2>Claim your seat</h2><p>A small room for focused builders.</p><button class="btn" type="button">Join waitlist</button></div></div>`,
  }),

  'gradient-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;${base};padding:2rem}${reduced}
    .wrap{text-align:center;max-width:480px}
    h2{${display};font-size:clamp(2.2rem,6vw,3.2rem);font-weight:800;letter-spacing:-.04em;line-height:1.05;margin:0 0 1rem;
      background:linear-gradient(90deg,#111 0%,#111 40%,#888 50%,#111 60%,#111 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 3.5s ease-in-out infinite}
    @keyframes shimmer{0%,100%{background-position:100% 0}50%{background-position:0% 0}}
    p{color:#666;margin:0 0 1.75rem;line-height:1.55}
    .btn{padding:13px 28px;border:none;background:#111;color:#fff;font:inherit;font-weight:600;font-size:.88rem;cursor:pointer;position:relative}
    .btn::after{content:'';position:absolute;inset:-3px;border:1px solid #111;opacity:0;transform:scale(.96);transition:opacity .3s,transform .3s}
    .btn:hover::after{opacity:1;transform:scale(1.04)}`,
    body: `<div class="wrap"><h2>Move faster<br>with less</h2><p>Strip the clutter. Keep the signal.</p><button class="btn" type="button">Try it free</button></div>`,
  }),

  'minimal-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;${base};padding:2rem}${reduced}
    .cta{max-width:380px;text-align:left}
    p{margin:0 0 1.25rem;font-size:1.15rem;line-height:1.45;color:#222;${display};font-weight:600;letter-spacing:-.02em;opacity:0;animation:fade .8s .15s forwards}
    @keyframes fade{to{opacity:1}}
    a{display:inline-flex;align-items:center;gap:.45rem;color:#111;font-weight:600;font-size:.92rem;text-decoration:none;border-bottom:1.5px solid #111;padding-bottom:2px;opacity:0;animation:fade .8s .4s forwards}
    a svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;transition:transform .3s cubic-bezier(.22,1,.36,1)}
    a:hover svg{transform:translateX(4px)}`,
    body: `<div class="cta"><p>Questions about the platform?</p><a href="#">Talk to the team <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>`,
  }),

  'dark-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};padding:2rem;overflow:hidden}${reduced}
    .grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 70%);animation:drift 20s linear infinite;pointer-events:none}
    @keyframes drift{to{background-position:48px 48px}}
    .wrap{position:relative;text-align:center;max-width:460px}
    h2{${display};font-size:clamp(2rem,5.5vw,2.8rem);font-weight:800;letter-spacing:-.04em;margin:0 0 .85rem;line-height:1.08}
    p{color:#888;margin:0 0 1.75rem;line-height:1.55}
    .row{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
    .btn{padding:12px 24px;border:1px solid #fff;background:#fff;color:#050505;font:inherit;font-size:.86rem;font-weight:700;cursor:pointer;transition:transform .25s}
    .btn:hover{transform:scale(1.03)}
    .ghost{background:transparent;color:#fff}
    .ghost:hover{background:rgba(255,255,255,.08);transform:none}`,
    body: `<div class="grid" aria-hidden="true"></div><div class="wrap"><h2>Build in the dark</h2><p>Monochrome focus. Motion that stays out of the way.</p><div class="row"><button class="btn" type="button">Begin</button><button class="btn ghost" type="button">Docs</button></div></div>`,
  }),

  'image-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eee;${base};padding:2rem}${reduced}
    .cta{position:relative;width:min(100%,420px);aspect-ratio:4/5;overflow:hidden;background:#111}
    .bars{position:absolute;inset:0;display:flex}
    .bar{flex:1;background:#1a1a1a;transform-origin:bottom;animation:rise 2.8s ease-in-out infinite}
    .bar:nth-child(1){animation-delay:0s;background:#111}.bar:nth-child(2){animation-delay:.15s;background:#1c1c1c}
    .bar:nth-child(3){animation-delay:.3s;background:#141414}.bar:nth-child(4){animation-delay:.45s;background:#222}
    .bar:nth-child(5){animation-delay:.6s;background:#181818}
    @keyframes rise{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
    .overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:1.75rem;background:linear-gradient(transparent 40%,rgba(0,0,0,.85))}
    h2{${display};color:#fff;font-size:1.7rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .5rem}
    p{color:rgba(255,255,255,.65);margin:0 0 1.15rem;font-size:.88rem}
    .btn{align-self:flex-start;padding:10px 20px;border:1px solid #fff;background:transparent;color:#fff;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .25s,color .25s}
    .btn:hover{background:#fff;color:#111}`,
    body: `<div class="cta"><div class="bars" aria-hidden="true">${'<div class="bar"></div>'.repeat(5)}</div><div class="overlay"><h2>See the work</h2><p>Motion as medium - not decoration.</p><button class="btn" type="button">View gallery</button></div></div>`,
  }),

  'stats-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .wrap{width:min(100%,520px);text-align:center}
    h2{${display};font-size:clamp(1.8rem,4vw,2.4rem);font-weight:800;letter-spacing:-.03em;margin:0 0 1.75rem}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem;border-top:1px solid #eee;border-bottom:1px solid #eee;padding:1.25rem 0}
    .stat strong{display:block;${display};font-size:clamp(1.6rem,4vw,2rem);font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
    .stat span{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#888}
    .btn{padding:12px 28px;border:none;background:#111;color:#fff;font:inherit;font-weight:600;font-size:.88rem;cursor:pointer;transition:letter-spacing .3s}
    .btn:hover{letter-spacing:.04em}`,
    body: `<div class="wrap"><h2>Trusted by teams who ship</h2><div class="stats"><div class="stat"><strong id="a">0</strong><span>Presets</span></div><div class="stat"><strong id="b">0</strong><span>Teams</span></div><div class="stat"><strong id="c">0</strong><span>Countries</span></div></div><button class="btn" type="button">Start free</button></div>`,
    script: `function count(el,to,ms){const t0=performance.now();function tick(now){const p=Math.min(1,(now-t0)/ms);el.textContent=Math.floor(to*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}count(document.getElementById('a'),1600,1400);count(document.getElementById('b'),420,1600);count(document.getElementById('c'),38,1200);`,
  }),

  'inline-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f7;${base};padding:2rem}${reduced}
    .line{display:flex;align-items:baseline;flex-wrap:wrap;gap:.55rem .75rem;max-width:560px;justify-content:center;${display};font-size:clamp(1.35rem,3.5vw,1.85rem);font-weight:700;letter-spacing:-.025em;color:#111;line-height:1.35}
    .line span{opacity:0;animation:pop .5s cubic-bezier(.22,1,.36,1) forwards}
    .line span:nth-child(1){animation-delay:.05s}.line span:nth-child(2){animation-delay:.15s}.line span:nth-child(3){animation-delay:.25s}
    @keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    a{color:#111;text-decoration:none;border-bottom:2px solid #111;padding-bottom:1px;transition:background .25s,box-shadow .25s;box-shadow:inset 0 0 0 #111}
    a:hover{background:#111;color:#fff;box-shadow:inset 0 -2.2em 0 #111;border-color:transparent}`,
    body: `<p class="line"><span>Ready to build?</span><span><a href="#">Get started</a></span><span>- it takes a minute.</span></p>`,
  }),

  'sticky-cta': () => ({
    style: `${fonts}body{margin:0;min-height:220vh;background:#fafafa;${base};color:#333}${reduced}
    .content{max-width:520px;margin:0 auto;padding:4rem 1.5rem 8rem}
    .content h1{${display};font-size:2rem;font-weight:800;letter-spacing:-.03em;color:#111;margin:0 0 1rem}
    .content p{line-height:1.65;margin:0 0 1rem;color:#666}
    .dock{position:fixed;left:50%;bottom:1.25rem;transform:translateX(-50%) translateY(120%);display:flex;align-items:center;gap:1rem;padding:.65rem .65rem .65rem 1.15rem;background:#111;color:#fff;border:1px solid #222;box-shadow:0 16px 40px rgba(0,0,0,.25);z-index:10;animation:dockIn .7s .6s cubic-bezier(.22,1,.36,1) forwards}
    @keyframes dockIn{to{transform:translateX(-50%) translateY(0)}}
    .dock span{font-size:.84rem;font-weight:500;white-space:nowrap}
    .btn{padding:9px 18px;border:none;background:#fff;color:#111;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;transition:transform .2s}
    .btn:hover{transform:scale(1.04)}`,
    body: `<div class="content"><h1>Keep scrolling</h1><p>The call stays with you - a sticky dock that never shouts.</p><p>Minimal chrome. One action. Always in reach.</p><p>Scroll the page to feel the layout breathe while the CTA holds the bottom edge.</p></div><div class="dock" role="region" aria-label="Call to action"><span>Ship your next layout</span><button class="btn" type="button">Continue</button></div>`,
  }),

  'video-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#fff;${base};padding:2rem}${reduced}
    .stage{width:min(100%,560px);text-align:center}
    .screen{position:relative;aspect-ratio:16/9;background:#161616;border:1px solid #2a2a2a;overflow:hidden;margin-bottom:1.5rem}
    .scan{position:absolute;left:0;right:0;height:40%;background:linear-gradient(transparent,rgba(255,255,255,.06),transparent);animation:scan 3.2s ease-in-out infinite}
    @keyframes scan{0%{top:-40%}100%{top:100%}}
    .play{position:absolute;inset:0;display:grid;place-items:center}
    .play button{width:56px;height:56px;border-radius:50%;border:1.5px solid #fff;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .25s,transform .25s}
    .play button:hover{background:rgba(255,255,255,.1);transform:scale(1.06)}
    .play svg{width:18px;height:18px;margin-left:2px;fill:currentColor}
    h2{${display};font-size:1.55rem;font-weight:800;letter-spacing:-.03em;margin:0 0 .5rem}
    p{color:#888;margin:0 0 1.25rem;font-size:.92rem}
    .btn{padding:11px 24px;border:none;background:#fff;color:#0d0d0d;font:inherit;font-weight:700;font-size:.84rem;cursor:pointer}`,
    body: `<div class="stage"><div class="screen"><div class="scan" aria-hidden="true"></div><div class="play"><button type="button" aria-label="Play preview"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div></div><h2>Watch the walkthrough</h2><p>Ninety seconds. Zero fluff.</p><button class="btn" type="button">Book a demo</button></div>`,
  }),

  'floating-cta': () => ({
    style: `${fonts}body{margin:0;min-height:100vh;background:#f0f0f0;${base};position:relative;overflow:hidden}${reduced}
    .orb{position:absolute;width:220px;height:220px;border:1px solid #ccc;border-radius:50%;left:12%;top:18%;animation:float 7s ease-in-out infinite;pointer-events:none}
    .orb2{position:absolute;width:140px;height:140px;border:1px dashed #bbb;border-radius:50%;right:15%;bottom:22%;animation:float 9s ease-in-out infinite reverse;pointer-events:none}
    @keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(12px,-18px)}}
    .fab{position:fixed;right:1.5rem;bottom:1.5rem;display:flex;align-items:center;gap:.65rem;padding:.55rem .55rem .55rem 1.1rem;background:#111;color:#fff;border:none;cursor:pointer;box-shadow:0 12px 36px rgba(0,0,0,.2);z-index:5;animation:enter .6s cubic-bezier(.22,1,.36,1) both}
    @keyframes enter{from{opacity:0;transform:translateY(24px) scale(.94)}to{opacity:1;transform:none}}
    .fab span{font-size:.84rem;font-weight:600}
    .fab i{display:grid;place-items:center;width:36px;height:36px;background:#fff;color:#111;font-style:normal;font-weight:800;font-size:1.1rem;transition:transform .35s cubic-bezier(.22,1,.36,1)}
    .fab:hover i{transform:rotate(90deg)}
    .hint{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);${display};font-size:clamp(1.8rem,5vw,2.6rem);font-weight:800;letter-spacing:-.04em;color:#bbb;text-align:center;pointer-events:none}`,
    body: `<div class="orb" aria-hidden="true"></div><div class="orb2" aria-hidden="true"></div><p class="hint">Look bottom-right</p><button class="fab" type="button"><span>New project</span><i>+</i></button>`,
  }),
};

function extractCtaDesc(slug) {
  if (!slug.startsWith('cta-')) return null;
  return slug.replace(/^cta-/, '').replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractCtaDesc };
