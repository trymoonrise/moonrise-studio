'use strict';

const base = 'font-family:"DM Sans",system-ui,-apple-system,sans-serif';
const display = 'font-family:"Syne",system-ui,sans-serif';
const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;600;700&family=Syne:wght@600;700;800&display=swap');`;
const reduced = '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.tip,.pop{opacity:1!important;transform:none!important;visibility:visible!important}}';

const RECIPES = {
  'hover-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f7;color:#111;${base};padding:2rem}${reduced}
    .stage{text-align:center}
    .kicker{margin:0 0 1.75rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .wrap{position:relative;display:inline-block}
    .btn{padding:12px 28px;border:1.5px solid #111;background:#111;color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer;transition:background .25s,color .25s}
    .btn:hover{background:transparent;color:#111}
    .tip{position:absolute;bottom:calc(100% + 12px);left:50%;translate:-50% 6px;padding:8px 14px;background:#111;color:#fff;font-size:.78rem;font-weight:500;letter-spacing:.01em;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s cubic-bezier(.22,1,.36,1),translate .28s cubic-bezier(.22,1,.36,1),visibility .28s}
    .wrap:hover .tip,.wrap:focus-within .tip{opacity:1;visibility:visible;translate:-50% 0}`,
    body: `<div class="stage"><p class="kicker">Hover tooltip</p><div class="wrap"><button class="btn" type="button">Hover me</button><div class="tip" role="tooltip">Save to drafts</div></div></div>`,
  }),

  'click-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fff;${base};padding:2rem}${reduced}
    .stage{text-align:center}
    .kicker{margin:0 0 1.75rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#555}
    .wrap{position:relative;display:inline-block}
    .btn{padding:12px 28px;border:1px solid #333;background:transparent;color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer;transition:border-color .25s,background .25s}
    .btn:hover,.btn[aria-expanded=true]{border-color:#fff;background:#111}
    .tip{position:absolute;bottom:calc(100% + 12px);left:50%;translate:-50% 8px;min-width:160px;padding:10px 14px;background:#fff;color:#111;font-size:.8rem;font-weight:500;text-align:left;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s cubic-bezier(.22,1,.36,1),translate .3s cubic-bezier(.22,1,.36,1),visibility .3s}
    .tip.show{opacity:1;visibility:visible;translate:-50% 0;pointer-events:auto}
    .tip strong{display:block;${display};font-size:.82rem;font-weight:700;margin-bottom:.2rem}`,
    body: `<div class="stage"><p class="kicker">Click tooltip</p><div class="wrap"><button class="btn" type="button" id="b" aria-expanded="false">Click for tip</button><div class="tip" id="t" role="tooltip"><strong>Pinned note</strong>Click outside to dismiss.</div></div></div>`,
    script: `const b=document.getElementById('b'),t=document.getElementById('t');
b.addEventListener('click',e=>{e.stopPropagation();const on=!t.classList.contains('show');t.classList.toggle('show',on);b.setAttribute('aria-expanded',on);});
document.addEventListener('click',()=>{t.classList.remove('show');b.setAttribute('aria-expanded','false');});`,
  }),

  'arrow-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .stage{text-align:center}
    .kicker{margin:0 0 2rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .wrap{position:relative;display:inline-block}
    .btn{padding:11px 26px;border:1.5px solid #111;background:transparent;color:#111;${base};font-size:.86rem;font-weight:600;cursor:pointer}
    .tip{position:absolute;bottom:calc(100% + 14px);left:50%;translate:-50% 4px;padding:9px 16px;background:#111;color:#fff;font-size:.8rem;font-weight:500;white-space:nowrap;opacity:0;visibility:hidden;transition:opacity .28s,translate .28s cubic-bezier(.22,1,.36,1),visibility .28s}
    .tip::after{content:'';position:absolute;top:100%;left:50%;translate:-50% 0;border:7px solid transparent;border-top-color:#111}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}`,
    body: `<div class="stage"><p class="kicker">Arrow tooltip</p><div class="wrap"><button class="btn" type="button">Details</button><div class="tip" role="tooltip">Pointed edge · top</div></div></div>`,
  }),

  'multi-line-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem}${reduced}
    .row{display:flex;align-items:center;gap:1rem}
    .label{${display};font-size:1.15rem;font-weight:700;letter-spacing:-.03em}
    .wrap{position:relative}
    .icon{width:32px;height:32px;border:1.5px solid #111;background:#fff;color:#111;display:grid;place-items:center;cursor:help;font-weight:700;font-size:.85rem;transition:background .25s,color .25s}
    .wrap:hover .icon,.wrap:focus-within .icon{background:#111;color:#fff}
    .tip{position:absolute;left:calc(100% + 14px);top:50%;translate:6px -50%;width:200px;padding:12px 14px;background:#111;color:#fff;font-size:.8rem;line-height:1.5;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s,translate .3s cubic-bezier(.22,1,.36,1),visibility .3s}
    .tip::before{content:'';position:absolute;right:100%;top:50%;translate:0 -50%;border:6px solid transparent;border-right-color:#111}
    .tip strong{display:block;${display};font-size:.84rem;font-weight:700;margin-bottom:.35rem;letter-spacing:-.02em}
    .wrap:hover .tip,.wrap:focus-within .tip{opacity:1;visibility:visible;translate:0 -50%}`,
    body: `<div class="row"><span class="label">API key</span><div class="wrap"><button class="icon" type="button" aria-label="More info">?</button><div class="tip" role="tooltip"><strong>Keep this secret</strong>Used to authenticate requests. Rotate every 90 days.</div></div></div>`,
  }),

  'dark-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#fff;${base};padding:2rem;position:relative;overflow:hidden}${reduced}
    body::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
    .wrap{position:relative;z-index:1}
    .btn{padding:12px 28px;border:1px solid #2a2a2a;background:#111;color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer;transition:border-color .25s}
    .btn:hover{border-color:#666}
    .tip{position:absolute;bottom:calc(100% + 12px);left:50%;translate:-50% 6px;padding:8px 14px;background:#fff;color:#050505;font-size:.78rem;font-weight:600;letter-spacing:.02em;white-space:nowrap;opacity:0;visibility:hidden;box-shadow:0 12px 40px rgba(0,0,0,.45);transition:opacity .28s,translate .28s cubic-bezier(.22,1,.36,1),visibility .28s}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}`,
    body: `<div class="wrap"><button class="btn" type="button">Dark surface</button><div class="tip" role="tooltip">High-contrast tip</div></div>`,
  }),

  'icon-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .toolbar{display:flex;gap:4px;padding:6px;border:1px solid #e5e5e5;background:#fafafa}
    .wrap{position:relative}
    .ico{width:40px;height:40px;border:none;background:transparent;color:#111;cursor:pointer;display:grid;place-items:center;transition:background .2s}
    .ico:hover,.ico:focus-visible{background:#111;color:#fff}
    .ico svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
    .tip{position:absolute;bottom:calc(100% + 10px);left:50%;translate:-50% 4px;padding:6px 10px;background:#111;color:#fff;font-size:.7rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;opacity:0;visibility:hidden;transition:opacity .25s,translate .25s cubic-bezier(.22,1,.36,1),visibility .25s}
    .wrap:hover .tip,.wrap:focus-within .tip{opacity:1;visibility:visible;translate:-50% 0}`,
    body: `<div class="toolbar" role="toolbar">
      <div class="wrap"><button class="ico" type="button" aria-label="Bold"><svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg></button><div class="tip">Bold</div></div>
      <div class="wrap"><button class="ico" type="button" aria-label="Italic"><svg viewBox="0 0 24 24"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg></button><div class="tip">Italic</div></div>
      <div class="wrap"><button class="ico" type="button" aria-label="Link"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></svg></button><div class="tip">Link</div></div>
    </div>`,
  }),

  'card-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f0f0f0;color:#111;${base};padding:2rem}${reduced}
    .wrap{position:relative;display:inline-block}
    .btn{padding:12px 26px;border:1.5px solid #111;background:#fff;color:#111;${base};font-size:.86rem;font-weight:600;cursor:pointer;transition:background .25s,color .25s}
    .btn:hover{background:#111;color:#fff}
    .tip{position:absolute;bottom:calc(100% + 14px);left:50%;translate:-50% 10px;width:240px;padding:0;background:#fff;border:1px solid #111;opacity:0;visibility:hidden;pointer-events:none;box-shadow:6px 6px 0 #111;transition:opacity .35s,translate .35s cubic-bezier(.22,1,.36,1),visibility .35s;text-align:left;overflow:hidden}
    .tip .bar{height:3px;background:#111;transform:scaleX(0);transform-origin:left;transition:transform .4s .1s cubic-bezier(.22,1,.36,1)}
    .tip .body{padding:1rem 1.1rem}
    .tip h4{margin:0 0 .35rem;${display};font-size:.95rem;font-weight:800;letter-spacing:-.03em}
    .tip p{margin:0;font-size:.78rem;line-height:1.45;color:#555}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}
    .wrap:hover .tip .bar{transform:scaleX(1)}`,
    body: `<div class="wrap"><button class="btn" type="button">Plan details</button><div class="tip" role="tooltip"><div class="bar" aria-hidden="true"></div><div class="body"><h4>Pro workspace</h4><p>Unlimited projects, priority support, and shared libraries.</p></div></div></div>`,
  }),

  'animated-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#fff;${base};padding:2rem}${reduced}
    .wrap{position:relative;display:inline-block}
    .btn{padding:12px 28px;border:1px solid #fff;background:transparent;color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer;overflow:hidden;position:relative}
    .btn span{position:relative;z-index:1}
    .btn::before{content:'';position:absolute;inset:0;background:#fff;transform:translateY(101%);transition:transform .35s cubic-bezier(.22,1,.36,1)}
    .btn:hover{color:#0d0d0d}.btn:hover::before{transform:none}
    .tip{position:absolute;bottom:calc(100% + 14px);left:50%;translate:-50% 0;padding:9px 16px;background:#fff;color:#0d0d0d;font-size:.8rem;font-weight:600;white-space:nowrap;clip-path:inset(0 0 100% 0);opacity:0;transition:clip-path .4s cubic-bezier(.22,1,.36,1),opacity .3s}
    .wrap:hover .tip{clip-path:inset(0);opacity:1}`,
    body: `<div class="wrap"><button class="btn" type="button"><span>Reveal</span></button><div class="tip" role="tooltip">Wipe-in motion tip</div></div>`,
  }),

  'position-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#111;${base};padding:2rem}${reduced}
    .kicker{text-align:center;margin:0 0 2rem;font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
    .cluster{display:grid;grid-template-columns:repeat(3,auto);gap:2.5rem 3rem;align-items:center;justify-items:center}
    .wrap{position:relative}
    .dot{width:44px;height:44px;border:1.5px solid #111;background:#fff;cursor:default;display:grid;place-items:center;font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .wrap:hover .dot{background:#111;color:#fff}
    .tip{position:absolute;padding:7px 12px;background:#111;color:#fff;font-size:.72rem;font-weight:500;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility .25s,translate .25s cubic-bezier(.22,1,.36,1)}
    .tip.t{bottom:calc(100% + 10px);left:50%;translate:-50% 4px}.wrap:hover .tip.t{opacity:1;visibility:visible;translate:-50% 0}
    .tip.b{top:calc(100% + 10px);left:50%;translate:-50% -4px}.wrap:hover .tip.b{opacity:1;visibility:visible;translate:-50% 0}
    .tip.l{right:calc(100% + 10px);top:50%;translate:4px -50%}.wrap:hover .tip.l{opacity:1;visibility:visible;translate:0 -50%}
    .tip.r{left:calc(100% + 10px);top:50%;translate:-4px -50%}.wrap:hover .tip.r{opacity:1;visibility:visible;translate:0 -50%}`,
    body: `<div><p class="kicker">Position variants</p><div class="cluster">
      <div class="wrap"><button class="dot" type="button">TL</button><div class="tip t">Top</div></div>
      <div class="wrap"><button class="dot" type="button">T</button><div class="tip t">Above</div></div>
      <div class="wrap"><button class="dot" type="button">TR</button><div class="tip t">Top</div></div>
      <div class="wrap"><button class="dot" type="button">L</button><div class="tip l">Left</div></div>
      <div class="wrap"><button class="dot" type="button">·</button></div>
      <div class="wrap"><button class="dot" type="button">R</button><div class="tip r">Right</div></div>
      <div class="wrap"><button class="dot" type="button">BL</button><div class="tip b">Bottom</div></div>
      <div class="wrap"><button class="dot" type="button">B</button><div class="tip b">Below</div></div>
      <div class="wrap"><button class="dot" type="button">BR</button><div class="tip b">Bottom</div></div>
    </div></div>`,
  }),

  'rich-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;${base};padding:2rem}${reduced}
    .wrap{position:relative;display:inline-block}
    .btn{padding:12px 26px;border:1px solid #333;background:#1a1a1a;color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer;transition:border-color .25s}
    .btn:hover{border-color:#888}
    .tip{position:absolute;bottom:calc(100% + 14px);left:50%;translate:-50% 8px;width:260px;background:#fff;color:#111;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;transition:opacity .35s,translate .35s cubic-bezier(.22,1,.36,1),visibility .35s;text-align:left}
    .tip img{display:block;width:100%;height:100px;object-fit:cover;filter:grayscale(1);transition:filter .4s}
    .tip .body{padding:1rem}
    .tip h4{margin:0 0 .3rem;${display};font-size:.95rem;font-weight:800;letter-spacing:-.03em}
    .tip p{margin:0;font-size:.78rem;line-height:1.45;color:#555}
    .tip .meta{margin-top:.65rem;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:#999}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}
    .wrap:hover .tip img{filter:grayscale(0)}`,
    body: `<div class="wrap"><button class="btn" type="button">Preview asset</button><div class="tip" role="tooltip"><img src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=600&q=70" alt=""><div class="body"><h4>Structure study</h4><p>Concrete geometry from the form archive.</p><div class="meta">Image · 16:9</div></div></div></div>`,
  }),

  'minimal-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;${base};padding:2rem}${reduced}
    .line{font-size:1.05rem;line-height:1.7;max-width:32ch;text-align:center;color:#444}
    .wrap{position:relative;display:inline;border-bottom:1.5px solid #111;cursor:help;color:#111;font-weight:600}
    .tip{position:absolute;bottom:calc(100% + 8px);left:50%;translate:-50% 4px;padding:4px 0;font-size:.72rem;font-weight:500;letter-spacing:.04em;color:#888;white-space:nowrap;opacity:0;visibility:hidden;transition:opacity .25s,translate .25s,visibility .25s;border:none;background:transparent}
    .tip::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:#ccc;transform:scaleX(0);transition:transform .3s cubic-bezier(.22,1,.36,1)}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}
    .wrap:hover .tip::after{transform:scaleX(1)}`,
    body: `<p class="line">Use a <span class="wrap">hairline tip<span class="tip" role="tooltip">Almost invisible until needed</span></span> for quiet UI.</p>`,
  }),

  'glass-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121212;color:#fff;${base};padding:2rem;position:relative;overflow:hidden}${reduced}
    .blob{position:absolute;width:40vmax;height:40vmax;border-radius:50%;filter:blur(70px);pointer-events:none}
    .blob--a{background:#333;top:-15%;left:-10%}.blob--b{background:#1a1a1a;bottom:-20%;right:-10%}
    .wrap{position:relative;z-index:1}
    .btn{padding:12px 28px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);backdrop-filter:blur(12px);color:#fff;${base};font-size:.86rem;font-weight:600;cursor:pointer}
    .tip{position:absolute;bottom:calc(100% + 12px);left:50%;translate:-50% 6px;padding:10px 16px;background:rgba(255,255,255,.1);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:.8rem;font-weight:500;white-space:nowrap;opacity:0;visibility:hidden;transition:opacity .3s,translate .3s cubic-bezier(.22,1,.36,1),visibility .3s}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:-50% 0}`,
    body: `<div class="blob blob--a" aria-hidden="true"></div><div class="blob blob--b" aria-hidden="true"></div><div class="wrap"><button class="btn" type="button">Frosted</button><div class="tip" role="tooltip">Glass over soft motion</div></div>`,
  }),

  'badge-tip': () => ({
    style: `${fonts}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f5;color:#111;${base};padding:2rem}${reduced}
    .item{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;background:#fff;border:1px solid #e5e5e5;min-width:260px}
    .item b{${display};font-size:1rem;font-weight:700;letter-spacing:-.02em;flex:1}
    .wrap{position:relative}
    .badge{display:inline-flex;align-items:center;padding:3px 8px;border:1px solid #111;font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:help;background:#fff;transition:background .2s,color .2s}
    .wrap:hover .badge{background:#111;color:#fff}
    .tip{position:absolute;bottom:calc(100% + 10px);right:0;translate:0 4px;padding:8px 12px;background:#111;color:#fff;font-size:.75rem;line-height:1.4;width:170px;opacity:0;visibility:hidden;transition:opacity .28s,translate .28s cubic-bezier(.22,1,.36,1),visibility .28s}
    .wrap:hover .tip{opacity:1;visibility:visible;translate:0 0}`,
    body: `<div class="item"><b>Beta channel</b><div class="wrap"><span class="badge">New</span><div class="tip" role="tooltip">Ships weekly. Features may change without notice.</div></div></div>`,
  }),
};

function extractTipDesc(slug) {
  if (!slug.startsWith('tooltips-')) return null;
  return slug.replace(/^tooltips-/, '').replace(/-\d+$/, '');
}

module.exports = { RECIPES, extractTipDesc };
