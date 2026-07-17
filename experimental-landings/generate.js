const fs = require("fs");
const path = require("path");
const ROOT = __dirname;

const TEMPLATES = [
  [28,"violet-haze","Haze","mist drift","#0c0614","#f3eef8","#a89bb8","#a78bfa","Sora","Outfit","center","soft studio",0],
  [29,"neon-ink","Neon","scanline","#050508","#e8ffe8","#6b8f6b","#39ff14","IBM Plex Sans","Space Grotesk","split","night market",0],
  [30,"sand-umber","Dune","grain wipe","#1a140f","#f6efe4","#b5a48c","#d4a373","Literata","Fraunces","stack","desert atelier",0],
  [31,"ice-volt","Voltice","shatter reveal","#061018","#e8f4ff","#7a9ab0","#22d3ee","Manrope","Syne","asymm","cold lab",0],
  [32,"berry-noir","Noir","curtain rise","#10060c","#fce8f0","#b0899a","#f472b6","Inter","Playfair Display","center","midnight salon",0],
  [33,"chartreuse-void","Chart","orbit dots","#0a0c06","#f2ffe0","#8a9a6e","#bef264","DM Sans","Syne","split","bio lab",0],
  [34,"cinnamon-fog","Spice","steam rise","#16100c","#fff4ea","#b59a86","#ea580c","Source Sans 3","Libre Baskerville","stack","warm kitchen",0],
  [35,"cobalt-snow","Snowline","flake fall","#071428","#f0f6ff","#8aa0c0","#60a5fa","Nunito Sans","Bricolage Grotesque","center","alpine brand",0],
  [36,"lilac-carbon","Lilac","ribbon draw","#0e0c12","#f5f0ff","#9d95b0","#c4b5fd","Work Sans","Cormorant Garamond","asymm","gallery soft",0],
  [37,"mango-slate","Mango","bounce pop","#12151a","#fff8ef","#a8a094","#fb923c","Plus Jakarta Sans","Outfit","split","sunny product",0],
  [38,"seafoam-ink","Seafoam","wave lap","#061412","#e8fff8","#7aa89a","#2dd4bf","Figtree","Fraunces","stack","coast spa",0],
  [39,"burgundy-cream","Burgundy","ink bleed","#1a0a10","#faf3eb","#b898a0","#be123c","Lora","Bodoni Moda","center","editorial wine",0],
  [40,"laser-graphite","Laser","beam sweep","#0c0e12","#eef2ff","#8890a4","#818cf8","Inter","Space Grotesk","asymm","tech brief",0],
  [41,"peach-coal","Peach","soft bloom","#14100e","#fff5ee","#b0a090","#fdba74","Karla","Fraunces","split","gentle commerce",0],
  [42,"mint-obsidian","Mint","ripple","#070d0b","#eafff4","#7a9a8c","#34d399","Outfit","Syne","stack","fresh fintech",0],
  [43,"saffron-night","Saffron","flare spin","#120e06","#fff8e8","#b0a070","#fbbf24","DM Sans","Bebas Neue","center","festival light",0],
  [44,"orchid-steel","Orchid","petal float","#0e0c14","#faf0ff","#a090b0","#e879f9","Mulish","Playfair Display","asymm","botanical luxe",0],
  [45,"tide-charcoal","Tide","horizon pan","#0a1014","#eaf4f8","#8098a8","#38bdf8","Inter","Instrument Serif","split","harbor studio",0],
  [46,"ember-fog","Emberfog","ash drift","#140c08","#fff0e6","#b09080","#f97316","Barlow","Oswald","stack","forge craft",0],
  [47,"jade-paper","Jade","fold open","#f4f1ea","#0f1a14","#5a6e62","#059669","Source Serif 4","Fraunces","center","print garden",1],
  [48,"ultraviolet-sand","UV","prism split","#0a0618","#f0e8ff","#9080b0","#7c3aed","Sora","Unbounded","asymm","club night",0],
  [49,"terracotta-mist","Terra","clay smear","#16100c","#f8efe6","#a89080","#c2410c","Newsreader","Libre Franklin","split","clay house",0],
  [50,"aqua-void","Aqua","depth dive","#030c12","#e0f7ff","#6a90a0","#06b6d4","Manrope","Syne","stack","deep ocean",0],
  [51,"rose-graphite","Roseg","blur clarify","#121014","#fff0f4","#a898a0","#fb7185","Plus Jakarta Sans","Cormorant Garamond","center","soft brand",0],
  [52,"lemon-ink","Lemon","flash cut","#0e0e08","#ffffee","#a0a070","#eab308","DM Sans","Archivo Black","asymm","loud studio",0],
  [53,"pine-bone","Pine","needle sway","#f7f4ee","#14201a","#5c6b60","#166534","Lora","Fraunces","split","cabin quiet",1],
  [54,"magenta-slate","Mag","glitch hop","#100818","#ffe8f8","#a08098","#d946ef","Space Grotesk","Syne","stack","pop lab",0],
  [55,"bronze-fog","Bronze","patina wipe","#12100c","#f5efe4","#a89878","#b45309","Libre Baskerville","Cinzel","center","heritage craft",0],
  [56,"sky-espresso","Skypress","cloud slide","#0c1018","#eef4ff","#8898b0","#93c5fd","Figtree","Instrument Serif","asymm","calm SaaS",0],
  [57,"vermillion-ash","Vermil","hot pulse","#140808","#fff0ec","#b08880","#ef4444","Barlow Condensed","Bebas Neue","split","urgent brand",0],
  [58,"opal-night","Opal","iridescent shift","#0a0c14","#f0f4ff","#9098b0","#a5b4fc","Outfit","Playfair Display","stack","jewel gallery",0],
  [59,"khaki-indigo","Khaki","field pan","#f3efe4","#1a1830","#6a6478","#4338ca","Source Sans 3","Fraunces","center","travel field",1],
  [60,"cerulean-coal","Cerulean","ink wash","#060c14","#e8f4ff","#7890a8","#0284c7","Inter","Bricolage Grotesque","asymm","signal brand",0],
  [61,"plum-silk","Plum","silk fold","#120814","#fce8f8","#a888a0","#a21caf","Cormorant Garamond","Bodoni Moda","split","couture soft",0],
  [62,"acid-paper","Acid","stamp smash","#fafaf0","#14140a","#6a6a50","#84cc16","IBM Plex Mono","Space Grotesk","stack","zine print",1],
  [63,"coral-void","Corvoid","orbit ring","#0c0808","#fff0ec","#a89088","#fb7185","Sora","Syne","center","startup pulse",0],
  [64,"steel-amber","Steelamb","gear turn","#0e1014","#f0f2f6","#8a909c","#f59e0b","Barlow","Oswald","asymm","industrial tool",0],
  [65,"lavender-ink","Lavink","page turn","#f6f2fa","#1a1024","#6e6480","#7c3aed","Literata","Fraunces","split","book house",1],
  [66,"oxblood-fog","Oxblood","veil lift","#10060a","#f8ecee","#a88890","#9f1239","Newsreader","Playfair Display","stack","quiet luxury",0],
  [67,"aurora-coal","Aurora","poly aurora","#060810","#eef6ff","#8898b0","#34d399","Manrope","Unbounded","center","north signal",0]
].map(r => ({
  n:r[0], slug:r[1], name:r[2], motion:r[3], bg:r[4], text:r[5], muted:r[6], accent:r[7],
  font:r[8], display:r[9], layout:r[10], vibe:r[11], light:!!r[12]
}));

const IMGS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
];

const HEADS = [
  ["Make the quiet part","impossible to miss."],
  ["Build brands that","feel inevitable."],
  ["Less noise.","More signal."],
  ["Ship the feeling,","not the filler."],
  ["Design for the","second glance."],
  ["Clarity is the","competitive edge."],
  ["Start with the","hardest sentence."],
  ["Motion with","a purpose."],
  ["A landing page","that earns trust."],
  ["Sparse. Sharp.","Unforgettable."]
];

function encFont(name) {
  const special = {
    "Bricolage Grotesque":"Bricolage+Grotesque:opsz,wght@12..96,500;700",
    "Fraunces":"Fraunces:opsz,wght@9..144,500;700",
    "Playfair Display":"Playfair+Display:wght@500;700",
    "Cormorant Garamond":"Cormorant+Garamond:wght@500;700",
    "Libre Baskerville":"Libre+Baskerville:wght@400;700",
    "Source Serif 4":"Source+Serif+4:opsz,wght@8..60,500;700",
    "Source Sans 3":"Source+Sans+3:wght@400;600",
    "IBM Plex Sans":"IBM+Plex+Sans:wght@400;600",
    "IBM Plex Mono":"IBM+Plex+Mono:wght@400;600",
    "Plus Jakarta Sans":"Plus+Jakarta+Sans:wght@400;600;700",
    "Space Grotesk":"Space+Grotesk:wght@500;700",
    "Nunito Sans":"Nunito+Sans:wght@400;700",
    "Work Sans":"Work+Sans:wght@400;600",
    "Newsreader":"Newsreader:opsz,wght@6..72,500;700",
    "Libre Franklin":"Libre+Franklin:wght@400;700",
    "Instrument Serif":"Instrument+Serif:ital@0;1",
    "Archivo Black":"Archivo+Black",
    "Bebas Neue":"Bebas+Neue",
    "Unbounded":"Unbounded:wght@500;700",
    "Bodoni Moda":"Bodoni+Moda:opsz,wght@6..96,500;700",
    "Barlow Condensed":"Barlow+Condensed:wght@500;700",
    "Cinzel":"Cinzel:wght@500;700",
    "Oswald":"Oswald:wght@500;700",
    "Mulish":"Mulish:wght@400;700",
    "Karla":"Karla:wght@400;700",
    "Literata":"Literata:opsz,wght@7..72,500;700",
    "Figtree":"Figtree:wght@400;600;700",
    "Barlow":"Barlow:wght@400;600;700",
    "Lora":"Lora:wght@500;700",
    "Sora":"Sora:wght@400;600;700",
    "Outfit":"Outfit:wght@400;600;700",
    "Syne":"Syne:wght@600;700",
    "Manrope":"Manrope:wght@400;600;700",
    "DM Sans":"DM+Sans:wght@400;500;700",
    "Inter":"Inter:wght@400;600;700"
  };
  return special[name] || (name.replace(/ /g,"+") + ":wght@400;600;700");
}

function motionCss(motion, accent) {
  const m = motion.toLowerCase();
  if (m.includes("scan") || m.includes("glitch") || m.includes("flash") || m.includes("stamp")) {
    return `.hero-media::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.06) 3px);animation:scan 4s linear infinite;opacity:.5}
@keyframes scan{to{transform:translateY(12px)}}
.hero-content h1{animation:glitch 3.6s steps(2) infinite}
@keyframes glitch{0%,90%,100%{text-shadow:none}92%{text-shadow:2px 0 ${accent},-2px 0 cyan}}
.reveal{animation:rise .85s ease both}@keyframes rise{from{opacity:0;transform:translateY(22px)}}`;
  }
  if (m.includes("mist") || m.includes("fog") || m.includes("steam") || m.includes("ash") || m.includes("veil") || m.includes("aurora") || m.includes("prism") || m.includes("iridescent")) {
    return `.hero-media::before{content:"";position:absolute;inset:-12%;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 30% 40%,${accent}40,transparent 55%),radial-gradient(ellipse at 70% 60%,${accent}28,transparent 50%);animation:mist 12s ease-in-out infinite alternate;filter:blur(28px);mix-blend-mode:screen}
@keyframes mist{from{transform:translate(-2%,-1%) scale(1)}to{transform:translate(3%,2%) scale(1.08)}}
.reveal{animation:fadeup .95s ease both}@keyframes fadeup{from{opacity:0;transform:translateY(18px)}}`;
  }
  if (m.includes("orbit") || m.includes("spin") || m.includes("gear") || m.includes("flare") || m.includes("ring")) {
    return `.hero::after{content:"";position:absolute;width:min(42vw,280px);height:min(42vw,280px);right:8%;top:18%;border:1px solid ${accent}66;border-radius:50%;animation:orbit 18s linear infinite;pointer-events:none;z-index:2}
@keyframes orbit{to{transform:rotate(360deg)}}
.reveal{animation:pop .75s cubic-bezier(.2,1.2,.2,1) both}@keyframes pop{from{opacity:0;transform:scale(.96)}}`;
  }
  if (m.includes("curtain") || m.includes("fold") || m.includes("page") || m.includes("silk") || m.includes("patina") || m.includes("clay") || m.includes("ink wash") || m.includes("grain")) {
    return `.hero-media{clip-path:inset(0 0 0 0);animation:unfold 1.35s cubic-bezier(.2,.8,.2,1) both}
@keyframes unfold{from{clip-path:inset(0 48% 0 48%)}}
.reveal{animation:fadeup .9s ease .15s both}@keyframes fadeup{from{opacity:0;transform:translateY(20px)}}`;
  }
  if (m.includes("wave") || m.includes("ripple") || m.includes("horizon") || m.includes("depth") || m.includes("cloud") || m.includes("field") || m.includes("needle") || m.includes("bloom") || m.includes("petal") || m.includes("float") || m.includes("sway")) {
    return `.hero-media img{animation:wave 14s ease-in-out infinite alternate}
@keyframes wave{from{transform:scale(1.1)}to{transform:scale(1.2) translateY(-2%)}}
.reveal{animation:soft .95s ease both}@keyframes soft{from{opacity:0;filter:blur(6px);transform:translateY(12px)}to{filter:blur(0)}}`;
  }
  if (m.includes("ribbon") || m.includes("draw") || m.includes("beam") || m.includes("bleed")) {
    return `.hero-content h1{position:relative}.hero-content h1::after{content:"";position:absolute;left:0;bottom:-.12em;height:3px;width:0;background:${accent};animation:draw 1.15s ease .35s forwards}
@keyframes draw{to{width:44%}}
.reveal{animation:fadeup .85s ease both}@keyframes fadeup{from{opacity:0;transform:translateY(18px)}}`;
  }
  return `.hero-media img{animation:slowzoom 16s ease-in-out infinite alternate}
@keyframes slowzoom{from{transform:scale(1.1)}to{transform:scale(1.2)}}
.reveal{animation:fadeup .9s ease both}@keyframes fadeup{from{opacity:0;transform:translateY(20px)}}`;
}

function hero(t, img, lines) {
  const h1 = lines[0] + "<br />" + lines[1];
  if (t.layout === "split") {
    return `<section class="hero hero-split"><div class="hero-copy reveal"><p class="eyebrow">${t.vibe}</p><h1>${h1}</h1><p class="lede">Experimental landing for Moonrise — sparse copy, strong type, purposeful motion.</p><div class="cta-row"><a class="btn" href="#work">See the work</a><a class="btn ghost" href="#contact">Book a call</a></div></div><div class="hero-media"><img src="${img}" alt="" /></div></section>`;
  }
  if (t.layout === "asymm") {
    return `<section class="hero hero-asymm"><div class="hero-media"><img src="${img}" alt="" /></div><div class="hero-content reveal"><p class="eyebrow">${t.vibe}</p><h1>${h1}</h1><p class="lede">Full-site experiment linked from Test Templates and Website Presets.</p><div class="cta-row"><a class="btn" href="#work">Explore</a><a class="btn ghost" href="#about">About</a></div></div></section>`;
  }
  if (t.layout === "stack") {
    return `<section class="hero hero-stack"><div class="hero-content reveal"><p class="eyebrow">${t.vibe}</p><h1>${h1}</h1></div><div class="hero-media"><img src="${img}" alt="" /></div><div class="hero-foot reveal"><p class="lede">Motion: <strong>${t.motion}</strong> · Template ${String(t.n).padStart(2,"0")}</p><div class="cta-row"><a class="btn" href="#work">View projects</a><a class="btn ghost" href="#contact">Start</a></div></div></section>`;
  }
  return `<section class="hero hero-center"><div class="hero-media"><img src="${img}" alt="" /></div><div class="hero-content reveal"><p class="eyebrow">${t.vibe}</p><h1>${h1}</h1><p class="lede">Polished experimental page — reference for builder generation.</p><div class="cta-row"><a class="btn" href="#work">See work</a><a class="btn ghost" href="#contact">Talk to us</a></div></div></section>`;
}

function page(t) {
  const i = t.n - 28;
  const img = IMGS[i % IMGS.length];
  const img2 = IMGS[(i + 3) % IMGS.length];
  const img3 = IMGS[(i + 5) % IMGS.length];
  const lines = HEADS[i % HEADS.length];
  const light = t.light;
  const line = light ? "rgba(15,23,42,.12)" : "rgba(255,255,255,.12)";
  const overlay = light
    ? "linear-gradient(180deg, rgba(255,255,255,.2), rgba(244,241,234,.92))"
    : "linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,.16) 45%, rgba(0,0,0,.84) 100%)";
  const btnText = light ? "#fff" : "#0a0a0a";
  const fonts = `https://fonts.googleapis.com/css2?family=${encFont(t.display)}&family=${encFont(t.font)}&display=swap`;
  const nn = String(t.n).padStart(2, "0");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.name} · Experimental ${nn}</title>
<meta name="description" content="Moonrise experimental landing — ${t.vibe}. Motion: ${t.motion}." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${fonts}" rel="stylesheet" />
<style>
:root{--bg:${t.bg};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--line:${line}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:"${t.font}",system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.55;overflow-x:hidden}
h1,h2,h3{font-family:"${t.display}",Georgia,serif;line-height:.95;font-weight:700;letter-spacing:-.03em}
a{color:inherit;text-decoration:none}
img{display:block;width:100%;height:100%;object-fit:cover}
.nav{position:fixed;inset:0 0 auto;z-index:30;display:flex;justify-content:space-between;align-items:center;padding:1.25rem clamp(1.25rem,4vw,3rem);backdrop-filter:blur(8px);background:color-mix(in srgb,var(--bg) 72%,transparent);border-bottom:1px solid transparent}
.nav.is-scrolled{border-bottom-color:var(--line)}
.logo{font-family:"${t.display}",sans-serif;font-weight:700;font-size:1.15rem}
.nav-links{display:flex;gap:1.35rem;font-size:.84rem;color:var(--muted)}
.nav-links a:hover{color:var(--text)}
.nav-cta{padding:.45rem .85rem;border-radius:999px;background:var(--accent);color:${btnText};font-size:.8rem;font-weight:650}
.hero{position:relative;min-height:100vh;min-height:100dvh}
.hero-media{position:absolute;inset:0;overflow:hidden}
.hero-media::after{content:"";position:absolute;inset:0;background:${overlay}}
.hero-content,.hero-copy,.hero-foot{position:relative;z-index:2;padding:clamp(5rem,14vh,8rem) clamp(1.25rem,4vw,3rem) clamp(2.5rem,6vh,4rem);max-width:44rem}
.eyebrow{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:650;margin-bottom:1rem}
h1{font-size:clamp(2.8rem,9vw,5.2rem);margin-bottom:1.1rem}
.lede{color:var(--muted);max-width:36ch;font-size:1.05rem;margin-bottom:1.6rem}
.cta-row{display:flex;flex-wrap:wrap;gap:.7rem}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:.75rem 1.2rem;border-radius:999px;font-weight:650;font-size:.9rem;background:var(--accent);color:${btnText}}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
.hero-split{display:grid;grid-template-columns:1.05fr .95fr;align-items:stretch}
.hero-split .hero-media{position:relative;min-height:100vh}
.hero-split .hero-media::after{background:linear-gradient(90deg,var(--bg),transparent 40%)}
.hero-split .hero-copy{display:grid;align-content:center;padding-right:2rem}
.hero-asymm .hero-content{margin-left:auto;margin-right:clamp(1rem,6vw,4rem);text-align:right;max-width:38rem;padding-top:clamp(7rem,18vh,10rem)}
.hero-asymm .lede{margin-left:auto}.hero-asymm .cta-row{justify-content:flex-end}
.hero-stack{display:flex;flex-direction:column;justify-content:space-between;min-height:100vh}
.hero-stack .hero-media{position:relative;height:min(48vh,420px);margin:0 clamp(1.25rem,4vw,3rem);border-radius:1.25rem;border:1px solid var(--line)}
.hero-stack .hero-content{padding-bottom:1rem}.hero-stack .hero-foot{padding-top:1.5rem}
.hero-center{display:grid;place-items:end stretch}
.hero-center .hero-content{max-width:48rem;margin:0 auto;text-align:center;padding-bottom:clamp(3rem,10vh,5.5rem)}
.hero-center .lede{margin-inline:auto}.hero-center .cta-row{justify-content:center}
section.block{padding:clamp(3.5rem,9vh,6rem) clamp(1.25rem,4vw,3rem);border-top:1px solid var(--line)}
.block h2{font-size:clamp(2rem,5vw,3.2rem);margin-bottom:.75rem}
.block .sub{color:var(--muted);max-width:42ch;margin-bottom:2rem}
.grid-3{display:grid;gap:1rem;grid-template-columns:repeat(3,minmax(0,1fr))}
.card{border:1px solid var(--line);border-radius:1rem;padding:1.25rem 1.2rem;background:color-mix(in srgb,var(--text) 3%,transparent)}
.card h3{font-size:1.25rem;margin-bottom:.45rem}.card p{color:var(--muted);font-size:.92rem}
.about{display:grid;gap:2rem;grid-template-columns:1.1fr .9fr;align-items:center}
.about-media{aspect-ratio:4/5;border-radius:1.25rem;overflow:hidden;border:1px solid var(--line)}
.quotes{display:grid;gap:1rem;grid-template-columns:1fr 1fr}
.quote{border-left:3px solid var(--accent);padding:.4rem 0 .4rem 1rem}
.quote p{font-size:1.05rem;margin-bottom:.55rem}.quote span{color:var(--muted);font-size:.8rem}
.cta-band{text-align:center;padding:clamp(4rem,10vh,6.5rem) 1.25rem;background:radial-gradient(ellipse 60% 80% at 50% 100%,color-mix(in srgb,var(--accent) 28%,transparent),transparent),var(--bg);border-top:1px solid var(--line)}
.cta-band h2{font-size:clamp(2.2rem,6vw,3.6rem);margin-bottom:1rem}
footer{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;padding:1.5rem clamp(1.25rem,4vw,3rem) 2rem;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem}
footer a{color:var(--text);border-bottom:1px solid var(--line)}footer a:hover{color:var(--accent)}
.toggles{position:fixed;bottom:1rem;right:1rem;z-index:40;background:color-mix(in srgb,var(--bg) 90%,transparent);border:1px solid var(--line);border-radius:.85rem;padding:.85rem 1rem;width:12.5rem;backdrop-filter:blur(10px)}
.toggles h4{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:.55rem}
.toggle-row{display:flex;align-items:center;justify-content:space-between;margin:.35rem 0;font-size:.8rem}
.switch{position:relative;width:2.2rem;height:1.2rem}.switch input{opacity:0;width:0;height:0}
.slider{position:absolute;inset:0;cursor:pointer;background:color-mix(in srgb,var(--text) 18%,transparent);border-radius:999px}
.slider::before{content:"";position:absolute;height:.85rem;width:.85rem;left:.16rem;top:.175rem;background:#fff;border-radius:50%;transition:.2s}
.switch input:checked+.slider{background:var(--accent)}.switch input:checked+.slider::before{transform:translateX(.95rem)}
${motionCss(t.motion, t.accent)}
body.motion-off .hero-media img,body.motion-off .hero-media::before,body.motion-off .hero::after,body.motion-off .reveal,body.motion-off .hero-content h1,body.motion-off .hero-content h1::after{animation:none!important;filter:none!important}
@media(max-width:860px){.hero-split,.about,.grid-3,.quotes{grid-template-columns:1fr}.hero-split .hero-media{min-height:48vh;order:-1}.hero-asymm .hero-content{text-align:left;margin-left:0}.hero-asymm .lede,.hero-asymm .cta-row{margin-left:0;justify-content:flex-start}.nav-links{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style>
</head>
<body class="motion-on">
<header class="nav" id="nav"><a class="logo" href="#top">${t.name}</a><nav class="nav-links" aria-label="Primary"><a href="#about">About</a><a href="#work">Work</a><a href="#notes">Notes</a><a href="#contact">Contact</a></nav><a class="nav-cta" href="#contact">Start</a></header>
<main id="top">
${hero(t, img, lines)}
<section class="block" id="about"><div class="about"><div><h2>Built as a reference site</h2><p class="sub">Template ${nn} · ${t.slug}. Cross-check with Website Presets when shaping Moonrise generations.</p><div class="grid-3" style="grid-template-columns:1fr;gap:.75rem"><div class="card"><h3>Strategy</h3><p>Positioning that survives a boardroom and a feed.</p></div><div class="card"><h3>Identity</h3><p>Systems coherent from favicon to billboard.</p></div><div class="card"><h3>Sites</h3><p>Fast pages with one job: the next step.</p></div></div></div><div class="about-media"><img src="${img2}" alt="" /></div></div></section>
<section class="block" id="work"><h2>Selected frames</h2><p class="sub">Sparse gallery — three stills, one mood.</p><div class="grid-3"><div class="about-media" style="aspect-ratio:4/3"><img src="${img}" alt="" /></div><div class="about-media" style="aspect-ratio:4/3"><img src="${img2}" alt="" /></div><div class="about-media" style="aspect-ratio:4/3"><img src="${img3}" alt="" /></div></div></section>
<section class="block" id="notes"><h2>What people notice</h2><div class="quotes"><blockquote class="quote"><p>“The motion doesn’t fight the type — it proves hierarchy.”</p><span>— Studio partner</span></blockquote><blockquote class="quote"><p>“Feels like a real site, not a component dump.”</p><span>— Builder QA</span></blockquote></div></section>
<section class="cta-band" id="contact"><h2>Ready when you are.</h2><p class="sub" style="margin-inline:auto">Open from Experimental Landings, Test Templates, or Website Presets.</p><div class="cta-row" style="justify-content:center"><a class="btn" href="../index.html">All experiments</a><a class="btn ghost" href="../../Website%20Presets/index.html">Website Presets</a></div></section>
</main>
<footer><span>${nn} ${t.name} · ${t.motion}</span><span><a href="../index.html">Experimental landings</a> · <a href="../../testtemplates/index.html">Test templates</a> · <a href="../../Website%20Presets/index.html">Presets</a></span></footer>
<aside class="toggles" aria-label="Preview controls"><h4>Preview</h4><div class="toggle-row"><span>Motion</span><label class="switch"><input type="checkbox" id="tog-motion" checked /><span class="slider"></span></label></div></aside>
<script>
const nav=document.getElementById("nav");
const onScroll=()=>nav.classList.toggle("is-scrolled",window.scrollY>12);
window.addEventListener("scroll",onScroll,{passive:true});onScroll();
document.getElementById("tog-motion").addEventListener("change",e=>{document.body.classList.toggle("motion-on",e.target.checked);document.body.classList.toggle("motion-off",!e.target.checked);});
</script>
</body>
</html>`;
}

function indexHtml() {
  const links = TEMPLATES.map(t => {
    const nn = String(t.n).padStart(2,"0");
    return `    <a href="${nn}-${t.slug}/index.html"><strong>${nn} ${t.name}</strong><span>${t.motion}</span></a>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Experimental Landings</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
<style>
:root{--bg:#0b0c0e;--text:#eee;--muted:#7a7f88;--line:#22262c;--accent:#ff6a00}
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;font-family:"DM Sans",sans-serif;color:var(--text);background:radial-gradient(ellipse 80% 50% at 10% 0%,rgba(255,106,0,.12),transparent),radial-gradient(ellipse 60% 40% at 90% 100%,rgba(45,212,191,.08),transparent),var(--bg);padding:clamp(2rem,6vw,4rem)}
main{width:min(640px,100%)}
h1{font-family:"Syne",sans-serif;font-size:clamp(2rem,5vw,2.8rem);letter-spacing:-.03em;margin-bottom:.5rem}
.lede{color:var(--muted);margin-bottom:1.25rem;max-width:42ch;line-height:1.5}
.cross{display:flex;flex-wrap:wrap;gap:.65rem;margin-bottom:2rem}
.cross a{display:inline-flex;padding:.45rem .8rem;border-radius:999px;border:1px solid var(--line);color:var(--text);text-decoration:none;font-size:.82rem;font-weight:600}
.cross a:hover{border-color:var(--accent);color:var(--accent)}
.list a{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.9rem 0;color:var(--text);text-decoration:none;border-bottom:1px solid var(--line);font-size:1.02rem;transition:color .2s,padding-left .25s ease}
.list a:hover{color:var(--accent);padding-left:.4rem}
.list a strong{font-family:"Syne",sans-serif;font-weight:700}
.list span{color:var(--muted);font-size:.78rem;white-space:nowrap}
</style>
</head>
<body>
<main>
<h1>Experimental Landings</h1>
<p class="lede">40 full-site experiments (28–67) — motion studies, sparse copy, cross-linked with Website Presets and Test Templates.</p>
<div class="cross">
  <a href="../Website%20Presets/index.html">Website Presets ↗</a>
  <a href="../testtemplates/index.html">Test Templates ↗</a>
</div>
<div class="list">
${links}
</div>
</main>
</body>
</html>`;
}

for (const t of TEMPLATES) {
  const dir = path.join(ROOT, `${String(t.n).padStart(2,"0")}-${t.slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(t), "utf8");
  console.log("wrote", path.basename(dir));
}
fs.writeFileSync(path.join(ROOT, "index.html"), indexHtml(), "utf8");
console.log("done", TEMPLATES.length);
