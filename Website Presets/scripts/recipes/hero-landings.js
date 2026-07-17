const IMG_169 = '../stock/media/16-9 Aspect Ratio(image).png';
const VID_169 = '../stock/media/16-9 Aspect Ratio(video).mp4';
const IMG_45 = '../stock/media/4-5 Aspect Ratio(image).png';
const VID_916 = '../stock/media/9-16 Aspect Ratio(video).mp4';

module.exports = [
  {
    slug: 'heroes-minimal-serif',
    title: 'Minimal Serif Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'simple', 'minimal'],
    style: `
    body{min-height:100vh;background:#faf8f5;color:#1a1a1a;display:grid;place-items:center;padding:3rem 2rem;text-align:center}
    .eyebrow{font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;color:#888;margin-bottom:1.5rem}
    h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.5rem,6vw,4.5rem);font-weight:400;line-height:1.15;max-width:14ch;margin:0 auto 1.5rem}
    p{font-size:1.1rem;color:#666;max-width:36ch;margin:0 auto 2.5rem}
    .btn{padding:14px 32px;border:1px solid #1a1a1a;background:transparent;color:#1a1a1a;font-size:.9rem;letter-spacing:.04em}
    .btn:hover{background:#1a1a1a;color:#faf8f5}`,
    body: `<div><p class="eyebrow">Studio Arc</p><h1>Craft with intention</h1><p>Thoughtful design for brands that value clarity over noise.</p><button class="btn">View work</button></div>`,
  },
  {
    slug: 'heroes-saas-nav',
    title: 'SaaS Nav Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'professional', 'saas'],
    style: `
    body{min-height:100vh;margin:0;background:radial-gradient(circle at 12% 0%,rgba(99,102,241,.08),transparent 42%),#fafafa;color:#111827;font-family:system-ui,sans-serif}
    .shell{width:min(1120px,100%);margin:0 auto;padding:1.25rem clamp(1.25rem,4vw,2rem) 4rem}
    .nav{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;margin-bottom:clamp(3rem,8vw,5rem)}
    .logo{font-size:1rem;font-weight:800;letter-spacing:-.03em}
    .nav-links{display:flex;gap:1.75rem;font-size:.9rem;color:#6b7280}
    .nav-cta{padding:.55rem 1rem;border:none;border-radius:999px;background:#111827;color:#fff;font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap}
    .hero{display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(2rem,5vw,4rem);align-items:center}
    .eyebrow{display:inline-block;margin-bottom:1rem;padding:.35rem .7rem;border-radius:999px;background:rgba(99,102,241,.1);color:#4f46e5;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    h1{font-size:clamp(2.4rem,4.8vw,3.5rem);font-weight:800;line-height:1.05;letter-spacing:-.04em;max-width:11ch;margin-bottom:1rem}
    .sub{color:#6b7280;font-size:1.05rem;line-height:1.6;max-width:36ch;margin-bottom:1.75rem}
    .actions{display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap}
    .btn{padding:.8rem 1.35rem;border:none;border-radius:999px;background:#4f46e5;color:#fff;font-family:inherit;font-size:.92rem;font-weight:600;cursor:pointer;box-shadow:0 12px 30px rgba(79,70,229,.22)}
    .link{color:#374151;font-size:.92rem;font-weight:600;text-decoration:none}
    .shot{margin:0;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 1px 0 rgba(17,24,39,.04),0 24px 60px rgba(17,24,39,.1);border:1px solid rgba(17,24,39,.06)}
    .shot img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
    @media(max-width:900px){.nav-links{display:none}.hero{grid-template-columns:1fr}h1{max-width:none}}`,
    body: `<div class="shell"><header class="nav"><div class="logo">Flowbase</div><nav class="nav-links" aria-label="Primary"><span>Product</span><span>Pricing</span></nav><button class="nav-cta" type="button">Get started</button></header><section class="hero"><div><span class="eyebrow">Product workspace</span><h1>Ship products your team is proud of</h1><p class="sub">One workspace for roadmaps, docs, and delivery — built for fast-moving teams.</p><div class="actions"><button class="btn" type="button">Start free trial</button><a class="link" href="#">Book demo →</a></div></div><figure class="shot"><img src="${IMG_169}" alt="Product preview"></figure></section></div>`,
  },
  {
    slug: 'heroes-corporate-dark',
    title: 'Corporate Dark Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'professional', 'dark'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:clamp(2rem,6vw,4rem);background:radial-gradient(circle at 50% 0%,rgba(59,130,246,.12),transparent 55%),#0a0e16;color:#e8edf5;font-family:system-ui,sans-serif;text-align:center}
    .hero{width:min(680px,100%)}
    .eyebrow{display:inline-block;margin-bottom:1.5rem;padding:.4rem .85rem;border-radius:999px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.25);color:#93c5fd;font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
    h1{font-size:clamp(2.4rem,5.5vw,3.8rem);font-weight:700;line-height:1.08;letter-spacing:-.03em;margin-bottom:1.1rem}
    p{color:#94a3b8;font-size:1.1rem;line-height:1.6;max-width:44ch;margin:0 auto 2.25rem}
    .actions{display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap}
    .cta{display:inline-flex;align-items:center;gap:.5rem;padding:.85rem 1.6rem;border:none;border-radius:999px;background:#3b82f6;color:#fff;font-family:inherit;font-size:.95rem;font-weight:600;cursor:pointer;box-shadow:0 14px 34px rgba(59,130,246,.32);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .cta:hover{transform:translateY(-2px)}
    .link{color:#cbd5e1;font-size:.95rem;font-weight:600;text-decoration:none}
    .link:hover{color:#fff}`,
    body: `<section class="hero"><span class="eyebrow">Enterprise Platform</span><h1>Scale operations with confidence</h1><p>Secure infrastructure, real-time analytics, and dedicated support for global teams.</p><div class="actions"><button class="cta" type="button">Request access →</button><a class="link" href="#">Talk to sales</a></div></section>`,
  },
  {
    slug: 'heroes-clean-left',
    title: 'Clean Left Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'simple', 'light'],
    style: `
    body{min-height:100vh;margin:0;display:grid;align-items:center;padding:clamp(2.5rem,8vw,5rem) clamp(1.5rem,6vw,4rem);background:radial-gradient(circle at 0% 0%,rgba(17,24,39,.04),transparent 45%),#fafafa;color:#111827;font-family:system-ui,sans-serif}
    .hero{width:min(640px,100%)}
    .eyebrow{display:inline-block;margin-bottom:1.25rem;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7280}
    h1{font-size:clamp(2.5rem,5.5vw,4rem);font-weight:800;line-height:1.02;letter-spacing:-.04em;max-width:11ch;margin-bottom:1.1rem}
    p{font-size:1.08rem;line-height:1.65;color:#6b7280;max-width:40ch;margin-bottom:2rem}
    .actions{display:flex;align-items:center;gap:1.35rem;flex-wrap:wrap}
    .btn{padding:.8rem 1.4rem;border:none;border-radius:999px;background:#111827;color:#fff;font-family:inherit;font-size:.92rem;font-weight:600;cursor:pointer;box-shadow:0 12px 28px rgba(17,24,39,.14);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-2px)}
    .link{color:#374151;font-size:.92rem;font-weight:600;text-decoration:none}
    .link:hover{color:#111827}`,
    body: `<section class="hero"><span class="eyebrow">Landing kits</span><h1>Build better landing pages</h1><p>Start with polished hero sections. Customize copy, swap media, and ship in minutes.</p><div class="actions"><button class="btn" type="button">Get started</button><a class="link" href="#">See examples →</a></div></section>`,
  },
  {
    slug: 'heroes-stats-bar',
    title: 'Stats Bar Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'professional', 'stats'],
    style: `
    body{min-height:100vh;background:#fff;color:#111;display:grid;place-items:center;padding:3rem 2rem;text-align:center}
    h1{font-size:clamp(2.2rem,5vw,3.5rem);font-weight:800;max-width:16ch;margin:0 auto 1rem}
    .lead{color:#666;max-width:48ch;margin:0 auto 3rem}
    .stats{display:flex;gap:clamp(2rem,6vw,5rem);justify-content:center;flex-wrap:wrap;padding-top:2rem;border-top:1px solid #eee;width:min(900px,100%)}
    .stat strong{display:block;font-size:2rem;font-weight:800}.stat span{font-size:.85rem;color:#888}`,
    body: `<div><h1>Trusted by teams worldwide</h1><p class="lead">From startups to enterprises — one platform for growth, support, and retention.</p><div class="stats"><div class="stat"><strong>12k+</strong><span>Active teams</span></div><div class="stat"><strong>99.9%</strong><span>Uptime SLA</span></div><div class="stat"><strong>4.9</strong><span>Average rating</span></div></div></div>`,
  },
  {
    slug: 'heroes-beta-badge',
    title: 'Beta Badge Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'simple', 'startup'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:2rem;background:radial-gradient(circle at 50% 0%,rgba(108,140,255,.14),transparent 52%),#0a0a0c;color:#fff;font-family:system-ui,sans-serif;text-align:center}
    .hero{width:min(460px,100%)}
    .badge{display:inline-flex;align-items:center;gap:.45rem;margin-bottom:1.35rem;padding:.32rem .7rem;border-radius:999px;background:rgba(108,140,255,.1);border:1px solid rgba(108,140,255,.22);color:#a5b8ff;font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
    .dot{width:6px;height:6px;border-radius:50%;background:#6c8cff;box-shadow:0 0 10px rgba(108,140,255,.8)}
    h1{font-size:clamp(2rem,5vw,3.1rem);font-weight:800;line-height:1.06;letter-spacing:-.04em;margin-bottom:.85rem}
    p{color:#8b8b95;font-size:.98rem;line-height:1.55;max-width:34ch;margin:0 auto 1.65rem}
    .btn{padding:.68rem 1.2rem;border:none;border-radius:999px;background:#6c8cff;color:#fff;font-family:inherit;font-size:.86rem;font-weight:600;cursor:pointer;box-shadow:0 10px 28px rgba(108,140,255,.28);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}`,
    body: `<section class="hero"><span class="badge"><span class="dot" aria-hidden="true"></span> Public beta</span><h1>AI that works beside you</h1><p>Automate repetitive tasks and focus on the work that actually matters.</p><button class="btn" type="button">Join waitlist</button></section>`,
  },
  {
    slug: 'heroes-law-elegant',
    title: 'Elegant Law Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'professional', 'elegant'],
    style: `
    body{min-height:100vh;background:#12100e;color:#f5f0e8;display:grid;place-items:center;padding:4rem 2rem;text-align:center}
    .rule{width:60px;height:1px;background:#c9a962;margin:0 auto 2rem}
    h1{font-family:Georgia,serif;font-size:clamp(2.2rem,5vw,3.8rem);font-weight:400;letter-spacing:.02em;margin-bottom:1rem}
    p{color:#a89f90;max-width:42ch;margin:0 auto 2.5rem;font-size:1.05rem}
    .btn{padding:12px 28px;background:transparent;border:1px solid #c9a962;color:#c9a962;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase}`,
    body: `<div><div class="rule"></div><h1>Counsel you can trust</h1><p>Discreet, strategic representation for complex matters across jurisdictions.</p><button class="btn">Schedule consultation</button></div>`,
  },
  {
    slug: 'heroes-trust-icons',
    title: 'Trust Icons Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'professional', 'healthcare'],
    style: `
    body{min-height:100vh;margin:0;padding:clamp(3rem,8vw,5rem) clamp(1.5rem,5vw,3rem);background:radial-gradient(circle at 100% 0%,rgba(14,165,233,.14),transparent 42%),radial-gradient(circle at 0% 100%,rgba(6,182,212,.1),transparent 40%),#f8fbff;color:#082f49;font-family:system-ui,sans-serif}
    .hero{width:min(920px,100%);margin:0 auto}
    .eyebrow{display:inline-block;margin-bottom:1rem;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0284c7}
    h1{font-size:clamp(2.4rem,5vw,3.6rem);font-weight:800;line-height:1.02;letter-spacing:-.04em;max-width:12ch;margin-bottom:1rem}
    .sub{color:#0369a1;font-size:1.08rem;line-height:1.6;max-width:42ch;margin-bottom:2.5rem}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
    .card{padding:1.5rem;border-radius:18px;background:#fff;border:1px solid rgba(8,47,73,.08);box-shadow:0 18px 50px rgba(8,47,73,.08)}
    .icon-wrap{display:grid;place-items:center;width:48px;height:48px;margin-bottom:1rem;border-radius:14px;background:linear-gradient(145deg,#0ea5e9,#0284c7);color:#fff;box-shadow:0 10px 24px rgba(14,165,233,.28)}
    .icon-wrap svg{width:22px;height:22px}
    .card h3{font-size:1.05rem;font-weight:800;letter-spacing:-.02em;margin-bottom:.4rem}
    .card p{font-size:.9rem;line-height:1.55;color:#64748b}
    @media(max-width:760px){.grid{grid-template-columns:1fr}h1{max-width:none}}`,
    body: `<section class="hero"><span class="eyebrow">Healthcare platform</span><h1>Care that puts patients first</h1><p class="sub">Board-certified specialists, same-week appointments, and transparent pricing.</p><div class="grid"><article class="card"><div class="icon-wrap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>Licensed experts</h3><p>Verified credentials on every profile.</p></article><article class="card"><div class="icon-wrap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><h3>Fast scheduling</h3><p>Book online in under two minutes.</p></article><article class="card"><div class="icon-wrap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><h3>HIPAA secure</h3><p>Your data stays private and protected.</p></article></div></section>`,
  },
  {
    slug: 'heroes-portfolio-intro',
    title: 'Portfolio Intro Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'simple', 'portfolio'],
    style: `
    body{min-height:100vh;background:#111;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(2rem,6vw,4rem)}
    .role{font-size:.85rem;color:#6c8cff;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.75rem}
    h1{font-size:clamp(3rem,10vw,7rem);font-weight:900;line-height:.9;letter-spacing:-.04em}
  `,
    body: `<p class="role">Product Designer</p><h1>Alex<br>Morgan</h1>`,
  },
  {
    slug: 'heroes-image-bg-zoom',
    title: 'Image BG Zoom Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'background'],
    style: `
    body{margin:0;min-height:100vh;position:relative;display:grid;place-items:center;padding:2rem;overflow:hidden;color:#fff;font-family:system-ui,sans-serif;text-align:center}
    .bg{position:fixed;inset:0;z-index:-2}.bg img{width:100%;height:100%;object-fit:cover;animation:zoom 24s ease-in-out infinite alternate;will-change:transform}
    .shade{position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.55) 100%),radial-gradient(circle at 50% 20%,rgba(0,0,0,.1),transparent 55%)}
    .hero{position:relative;width:min(480px,100%)}
    .eyebrow{display:inline-block;margin-bottom:1rem;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.72)}
    h1{font-size:clamp(2.1rem,5vw,3.2rem);font-weight:800;line-height:1.05;letter-spacing:-.04em;margin-bottom:.85rem}
    p{color:rgba(255,255,255,.78);font-size:.98rem;line-height:1.55;max-width:34ch;margin:0 auto 1.5rem}
    .btn{padding:.68rem 1.2rem;border:none;border-radius:999px;background:#fff;color:#111827;font-family:inherit;font-size:.86rem;font-weight:700;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.22);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}
    @keyframes zoom{from{transform:scale(1)}to{transform:scale(1.08)}}`,
    body: `<div class="bg" aria-hidden="true"><img src="${IMG_169}" alt=""></div><div class="shade" aria-hidden="true"></div><section class="hero"><span class="eyebrow">Travel experiences</span><h1>Explore without limits</h1><p>Discover destinations crafted for travelers who want more than a checklist.</p><button class="btn" type="button">Plan your trip</button></section>`,
  },
  {
    slug: 'heroes-video-cinematic',
    title: 'Cinematic Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'background'],
    style: `
    body{margin:0;min-height:100vh;position:relative;color:#fff;font-family:system-ui,sans-serif}
    video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
    .overlay{position:fixed;inset:0;z-index:-1;background:linear-gradient(0deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.18) 48%,rgba(0,0,0,.42) 100%)}
    .wrap{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(2rem,5vw,3.5rem) clamp(1.5rem,5vw,3rem)}
    .hero{width:min(520px,100%)}
    .eyebrow{display:inline-block;margin-bottom:.85rem;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.68)}
    h1{font-size:clamp(2.1rem,5vw,3.4rem);font-weight:800;line-height:1.04;letter-spacing:-.04em;max-width:11ch;margin-bottom:.75rem}
    p{color:rgba(255,255,255,.76);font-size:.98rem;line-height:1.55;max-width:36ch;margin-bottom:1.35rem}
    .actions{display:flex;align-items:center;gap:1.15rem;flex-wrap:wrap}
    .btn{padding:.68rem 1.15rem;border:none;border-radius:999px;background:#fff;color:#111827;font-family:inherit;font-size:.84rem;font-weight:700;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.24);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}
    .link{color:rgba(255,255,255,.82);font-size:.84rem;font-weight:600;text-decoration:none}
    .link:hover{color:#fff}`,
    body: `<video src="${VID_169}" autoplay muted loop playsinline aria-hidden="true"></video><div class="overlay" aria-hidden="true"></div><div class="wrap"><section class="hero"><span class="eyebrow">Cinematic reel</span><h1>Stories in motion</h1><p>Full-screen video backgrounds that set the tone before a single word is read.</p><div class="actions"><button class="btn" type="button">Watch reel</button><a class="link" href="#">Learn more →</a></div></section></div>`,
  },
  {
    slug: 'heroes-split-inline-video',
    title: 'Split Inline Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'split'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,2rem);background:radial-gradient(circle at 0% 0%,rgba(79,70,229,.06),transparent 42%),#f8fafc;color:#111827;font-family:system-ui,sans-serif}
    .shell{width:min(1040px,100%)}
    .hero{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:clamp(2rem,4vw,3rem);align-items:center}
    .eyebrow{display:inline-block;margin-bottom:.9rem;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4f46e5}
    h1{font-size:clamp(2rem,3.8vw,2.75rem);font-weight:800;line-height:1.06;letter-spacing:-.04em;max-width:11ch;margin-bottom:.85rem}
    p{color:#6b7280;font-size:.98rem;line-height:1.6;max-width:34ch;margin-bottom:1.5rem}
    .actions{display:flex;align-items:center;gap:1.15rem;flex-wrap:wrap}
    .btn{padding:.68rem 1.15rem;border:none;border-radius:999px;background:#111827;color:#fff;font-family:inherit;font-size:.84rem;font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(17,24,39,.14);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}
    .link{color:#374151;font-size:.84rem;font-weight:600;text-decoration:none}
    .link:hover{color:#111827}
    .media video{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:14px;border:1px solid rgba(17,24,39,.08);box-shadow:0 18px 50px rgba(15,23,42,.1);background:#fff}
    @media(max-width:820px){.hero{grid-template-columns:1fr}h1{max-width:none}}`,
    body: `<div class="shell"><section class="hero"><div class="copy"><span class="eyebrow">Product demo</span><h1>See the product in action</h1><p>A looping demo beside your headline keeps visitors engaged without leaving the hero.</p><div class="actions"><button class="btn" type="button">Start building</button><a class="link" href="#">Watch full demo →</a></div></div><div class="media"><video src="${VID_169}" autoplay muted loop playsinline aria-label="Product demo video"></video></div></section></div>`,
  },
  {
    slug: 'heroes-image-text-mask',
    title: 'Image Text Mask Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'experimental', 'scroll'],
    style: `
    body{margin:0;min-height:220vh;background:#000;color:#fff;font-family:system-ui,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    .bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;opacity:var(--bg-opacity,.28);transform:scale(var(--bg-scale,1.12))}
    .title{position:relative;z-index:1;margin:0;padding:0 1rem;font-size:clamp(4rem,14vw,11rem);font-weight:900;text-transform:uppercase;line-height:.85;text-align:center;background-image:url('${IMG_169}');background-size:cover;background-position:var(--mask-x,50%) var(--mask-y,50%);background-clip:text;-webkit-background-clip:text;color:transparent;transform:scale(var(--title-scale,.88));letter-spacing:var(--title-track,.08em)}
    .sub{position:absolute;bottom:3rem;left:50%;transform:translateX(-50%);font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;opacity:var(--sub-opacity,0);color:rgba(255,255,255,.72);white-space:nowrap}
    .hint{position:absolute;bottom:1.25rem;left:50%;transform:translateX(-50%);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.38);opacity:calc(1 - var(--sub-opacity,0))}
    @media(prefers-reduced-motion:reduce){body{min-height:100vh}.title,.bg img{transform:none!important}}`,
    body: `<div class="stage" id="stage"><div class="bg" aria-hidden="true"><img src="${IMG_169}" alt=""></div><h1 class="title" id="title">Wild</h1><p class="sub">Image-filled typography</p><span class="hint">Scroll</span></div>`,
    script: `const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function update(){if(reduced){stage.style.setProperty('--sub-opacity','0.7');stage.style.setProperty('--title-scale','1');return}const max=document.documentElement.scrollHeight-innerHeight,p=max>0?ease(Math.min(1,scrollY/max)):0;stage.style.setProperty('--title-scale',lerp(.88,1,p).toFixed(3));stage.style.setProperty('--title-track',lerp(.08,.02,p).toFixed(3)+'em');stage.style.setProperty('--mask-x',lerp(42,58,p).toFixed(1)+'%');stage.style.setProperty('--mask-y',lerp(38,62,p).toFixed(1)+'%');stage.style.setProperty('--bg-opacity',lerp(.28,.42,p).toFixed(3));stage.style.setProperty('--bg-scale',lerp(1.12,1,p).toFixed(3));stage.style.setProperty('--sub-opacity',Math.max(0,(p-.55)/.45).toFixed(3))}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-mask-stacked-scroll',
    title: 'Stacked Mask Scroll Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'experimental', 'scroll'],
    style: `
    body{margin:0;min-height:320vh;background:#000;color:#fff;font-family:system-ui,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    .bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;opacity:.22}
    .word{position:absolute;margin:0;padding:0 1rem;font-size:clamp(3.5rem,13vw,10rem);font-weight:900;text-transform:uppercase;line-height:.88;text-align:center;background-image:url('${IMG_169}');background-size:cover;background-clip:text;-webkit-background-clip:text;color:transparent;opacity:0;transform:scale(.92)}
    .word:nth-child(2){background-position:30% 40%}.word:nth-child(3){background-position:70% 55%}.word:nth-child(4){background-position:50% 75%}
    .label{position:absolute;bottom:2.75rem;left:50%;transform:translateX(-50%);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55)}
    @media(prefers-reduced-motion:reduce){body{min-height:100vh}.word{opacity:1;transform:none}.word:not(:first-of-type){display:none}}`,
    body: `<div class="stage" id="stage"><div class="bg" aria-hidden="true"><img src="${IMG_169}" alt=""></div><h2 class="word">Wild</h2><h2 class="word">Free</h2><h2 class="word">Lost</h2><span class="label" id="label">01 — Wild</span></div>`,
    script: `const stage=document.getElementById('stage'),words=[...document.querySelectorAll('.word')],label=document.getElementById('label'),labels=['01 — Wild','02 — Free','03 — Lost'],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function update(){if(reduced)return;const max=document.documentElement.scrollHeight-innerHeight,p=max>0?scrollY/max:0,segment=1/words.length;words.forEach((word,i)=>{const start=i*segment,local=Math.min(1,Math.max(0,(p-start)/segment)),enter=ease(Math.min(1,local/.45)),exit=i<words.length-1?ease(Math.min(1,Math.max(0,(local-.55)/.45))):0,opacity=Math.max(0,enter*(1-exit)),scale=.9+opacity*.1;word.style.opacity=opacity.toFixed(3);word.style.transform='scale('+scale.toFixed(3)+')'});label.textContent=labels[Math.min(words.length-1,Math.floor(p/segment+.001))]}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-mask-parallax-type',
    title: 'Parallax Mask Type Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'experimental', 'scroll'],
    style: `
    body{margin:0;min-height:240vh;background:#050505;color:#fff;font-family:system-ui,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    .title{margin:0;padding:0 1rem;font-size:clamp(4.5rem,16vw,12rem);font-weight:900;text-transform:uppercase;line-height:.82;letter-spacing:var(--track,.06em);text-align:center;background-image:url('${IMG_169}');background-size:140% 140%;background-position:var(--mask-x,50%) var(--mask-y,50%);background-clip:text;-webkit-background-clip:text;color:transparent;transform:translateY(var(--shift-y,12px))}
    .sub{position:absolute;bottom:3rem;left:50%;transform:translateX(-50%);font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);opacity:var(--sub-opacity,0)}
    .frame{position:absolute;inset:8%;border:1px solid rgba(255,255,255,.08);border-radius:24px;opacity:var(--frame-opacity,0);pointer-events:none}
    @media(prefers-reduced-motion:reduce){body{min-height:100vh}.title{transform:none}}`,
    body: `<div class="stage" id="stage"><div class="frame" aria-hidden="true"></div><h1 class="title">Drift</h1><p class="sub">Parallax image inside type</p></div>`,
    script: `const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function update(){if(reduced){stage.style.setProperty('--sub-opacity','0.7');return}const max=document.documentElement.scrollHeight-innerHeight,p=max>0?ease(Math.min(1,scrollY/max)):0;stage.style.setProperty('--mask-x',lerp(20,80,p).toFixed(1)+'%');stage.style.setProperty('--mask-y',lerp(25,75,p).toFixed(1)+'%');stage.style.setProperty('--track',lerp(.06,-.02,p).toFixed(3)+'em');stage.style.setProperty('--shift-y',lerp(12,-8,p).toFixed(1)+'px');stage.style.setProperty('--sub-opacity',Math.max(0,(p-.4)/.6).toFixed(3));stage.style.setProperty('--frame-opacity',Math.max(0,(p-.2)/.8).toFixed(3))}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-mask-lines-reveal',
    title: 'Mask Lines Reveal Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'experimental', 'scroll'],
    style: `
    body{margin:0;min-height:260vh;background:#000;color:#fff;font-family:system-ui,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-content:center;gap:.15em;text-align:center;overflow:hidden}
    .bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;opacity:.18}
    .line{margin:0;padding:0 1rem;font-size:clamp(3.2rem,11vw,8.5rem);font-weight:900;text-transform:uppercase;line-height:.9;background-image:url('${IMG_169}');background-size:cover;background-clip:text;-webkit-background-clip:text;color:transparent}
    .line--one{background-position:40% 35%;transform:scale(var(--line-one-scale,.94));opacity:var(--line-one-opacity,.85)}
    .line--two{background-position:60% 65%;clip-path:inset(var(--clip-top,100%) 0 0 0);transform:translateY(var(--line-two-y,16px))}
    .caption{position:absolute;bottom:2.75rem;left:50%;transform:translateX(-50%);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.5);opacity:var(--caption-opacity,0)}
    @media(prefers-reduced-motion:reduce){body{min-height:100vh}.line--two{clip-path:none;transform:none}}`,
    body: `<div class="stage" id="stage"><div class="bg" aria-hidden="true"><img src="${IMG_169}" alt=""></div><h1 class="line line--one">Stay</h1><h1 class="line line--two">Curious</h1><p class="caption">Scroll to reveal</p></div>`,
    script: `const stage=document.getElementById('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function lerp(a,b,t){return a+(b-a)*t}function update(){if(reduced){stage.style.setProperty('--clip-top','0%');stage.style.setProperty('--caption-opacity','0.7');return}const max=document.documentElement.scrollHeight-innerHeight,p=max>0?ease(Math.min(1,scrollY/max)):0,reveal=Math.min(1,Math.max(0,(p-.15)/.7));stage.style.setProperty('--line-one-scale',lerp(.94,1,p).toFixed(3));stage.style.setProperty('--line-one-opacity',lerp(.85,1,p).toFixed(3));stage.style.setProperty('--clip-top',lerp(100,0,reveal).toFixed(1)+'%');stage.style.setProperty('--line-two-y',lerp(16,0,reveal).toFixed(1)+'px');stage.style.setProperty('--caption-opacity',Math.max(0,(p-.5)/.5).toFixed(3))}let ticking=false;addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;update()})},{passive:true});addEventListener('resize',update,{passive:true});update();`,
  },
  {
    slug: 'heroes-diagonal-split',
    title: 'Diagonal Split Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'split'],
    style: `
    body{margin:0;min-height:100vh;display:grid;grid-template-columns:55% 45%;background:#111;color:#fff}
    .left{display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,6vw,5rem);clip-path:polygon(0 0,100% 0,88% 100%,0 100%)}
    h1{font-size:clamp(2.2rem,4vw,3.5rem);font-weight:800;margin-bottom:1rem}
    p{color:#aaa;max-width:36ch;margin-bottom:2rem}
    .btn{padding:12px 24px;background:#fff;color:#111;border:none;font-weight:700}
    .right img{width:100%;height:100vh;object-fit:cover}
    @media(max-width:800px){body{grid-template-columns:1fr}.left{clip-path:none}.right img{height:50vh}}`,
    body: `<div class="left"><h1>Angles that stand out</h1><p>Diagonal splits add energy to standard two-column hero layouts.</p><button class="btn">Explore</button></div><div class="right"><img src="${IMG_45}" alt=""></div>`,
  },
  {
    slug: 'heroes-image-collage',
    title: 'Image Collage Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'image', 'grid'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,2rem);background:radial-gradient(circle at 100% 0%,rgba(17,24,39,.05),transparent 40%),#f8fafc;color:#111827;font-family:system-ui,sans-serif}
    .shell{width:min(1080px,100%)}
    .hero{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:clamp(2rem,4vw,3.5rem);align-items:center}
    .eyebrow{display:inline-block;margin-bottom:.9rem;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7280}
    h1{font-size:clamp(2rem,3.8vw,2.85rem);font-weight:800;line-height:1.06;letter-spacing:-.04em;max-width:12ch;margin-bottom:.9rem}
    p{color:#6b7280;font-size:.98rem;line-height:1.65;max-width:36ch;margin-bottom:1.6rem}
    .btn{padding:.68rem 1.15rem;border:none;border-radius:999px;background:#111827;color:#fff;font-family:inherit;font-size:.84rem;font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(17,24,39,.14);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}
    .collage{display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:1fr 1fr;gap:.75rem}
    .tile{position:relative;overflow:hidden;border-radius:16px;background:#fff;border:1px solid rgba(17,24,39,.08);box-shadow:0 16px 40px rgba(15,23,42,.08)}
    .tile img{display:block;width:100%;height:100%;object-fit:cover}
    .tile--lead{grid-row:span 2;min-height:360px}
    .tile--sm{min-height:172px}
    .tag{position:absolute;left:.75rem;bottom:.75rem;padding:.32rem .6rem;border-radius:999px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#374151}
    @media(max-width:860px){.hero{grid-template-columns:1fr}h1{max-width:none}.tile--lead{min-height:300px}}`,
    body: `<div class="shell"><section class="hero"><div class="copy"><span class="eyebrow">Creative studio</span><h1>Built for creative teams</h1><p>Showcase multiple shots without leaving the hero — perfect for studios and agencies.</p><button class="btn" type="button">View portfolio</button></div><div class="collage" aria-label="Image collage"><figure class="tile tile--lead"><img src="${IMG_45}" alt="Featured project"><span class="tag">Featured</span></figure><figure class="tile tile--sm"><img src="${IMG_169}" alt="Project preview one"><span class="tag">Brand</span></figure><figure class="tile tile--sm"><img src="${IMG_169}" alt="Project preview two"><span class="tag">Campaign</span></figure></div></section></div>`,
  },
  {
    slug: 'heroes-vertical-video',
    title: 'Vertical Video Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'split'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,2rem);background:radial-gradient(circle at 85% 20%,rgba(99,102,241,.14),transparent 42%),radial-gradient(circle at 10% 80%,rgba(236,72,153,.08),transparent 38%),#0a0e16;color:#f8fafc;font-family:system-ui,sans-serif}
    .shell{width:min(1040px,100%)}
    .hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:clamp(2rem,4vw,3.5rem);align-items:center}
    .eyebrow{display:inline-block;margin-bottom:.9rem;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a5b4fc}
    h1{font-size:clamp(2rem,3.8vw,2.85rem);font-weight:800;line-height:1.06;letter-spacing:-.04em;max-width:11ch;margin-bottom:.9rem}
    p{color:#94a3b8;font-size:.98rem;line-height:1.65;max-width:36ch;margin-bottom:1.6rem}
    .actions{display:flex;align-items:center;gap:1.15rem;flex-wrap:wrap}
    .btn{padding:.68rem 1.15rem;border:none;border-radius:999px;background:#fff;color:#111827;font-family:inherit;font-size:.84rem;font-weight:700;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.28);transition:transform .2s cubic-bezier(.22,.61,.36,1)}
    .btn:hover{transform:translateY(-1px)}
    .link{color:#cbd5e1;font-size:.84rem;font-weight:600;text-decoration:none}
    .link:hover{color:#fff}
    .phone{position:relative;width:min(230px,42vw);padding:.55rem;border-radius:34px;background:linear-gradient(145deg,#2a2f3f,#141821);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08)}
    .phone::before{content:'';position:absolute;top:.7rem;left:50%;transform:translateX(-50%);width:72px;height:22px;border-radius:999px;background:#0a0e16;z-index:2}
    .phone video{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:28px;background:#000}
    @media(max-width:820px){.hero{grid-template-columns:1fr;text-align:center}h1{max-width:none}p{margin-left:auto;margin-right:auto}.actions{justify-content:center}.phone{margin:0 auto}}`,
    body: `<div class="shell"><section class="hero"><div class="copy"><span class="eyebrow">Mobile app</span><h1>Mobile-first stories</h1><p>Pair vertical video with bold copy for social-native product launches.</p><div class="actions"><button class="btn" type="button">Download app</button><a class="link" href="#">Watch demo →</a></div></div><div class="phone" aria-label="App preview"><video src="${VID_916}" autoplay muted loop playsinline></video></div></section></div>`,
  },
  {
    slug: 'heroes-embedded-player',
    title: 'Embedded Player Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'video', 'player'],
    style: `
    body{min-height:100vh;background:#111;color:#fff;display:grid;place-items:center;padding:3rem 2rem;text-align:center}
    h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:800;margin-bottom:.75rem}
    .sub{color:#888;margin-bottom:2.5rem}
    .player{width:min(720px,100%);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);border:1px solid #333}
    .embed{position:relative;aspect-ratio:16/9;background:#000}.embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}`,
    body: `<h1>Watch the keynote</h1><p class="sub">Lead with an embedded player — no local file required.</p><div class="player"><div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1" title="Keynote video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div>`,
  },
  {
    slug: 'heroes-rotating-words',
    title: 'Rotating Words Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'animation'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:2rem;background:radial-gradient(circle at 50% 0%,rgba(108,140,255,.12),transparent 52%),#0d0d0f;color:#fff;font-family:system-ui,sans-serif;text-align:center}
    .hero{width:min(640px,100%)}
    h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.15;letter-spacing:-.03em}
    .slot{display:inline-block;vertical-align:bottom;position:relative;height:1.14em;min-width:6.5ch;overflow:hidden;text-align:left}
    .slot::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0d0d0f 0%,transparent 28%,transparent 72%,#0d0d0f 100%);pointer-events:none}
    .track{display:flex;flex-direction:column;will-change:transform;transition:transform .7s cubic-bezier(.22,.61,.36,1)}
    .track.is-spring{transition:transform .85s cubic-bezier(.34,1.45,.64,1)}
    .track span{height:1.14em;line-height:1.14em;background:linear-gradient(135deg,#8aa4ff 0%,#6c8cff 45%,#6cffb8 100%);background-size:200% 200%;background-clip:text;-webkit-background-clip:text;color:transparent;animation:shimmer 4s ease-in-out infinite}
    .track span:nth-child(2){animation-delay:-1s}.track span:nth-child(3){animation-delay:-2s}.track span:nth-child(4){animation-delay:-3s}
    @keyframes shimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    p{margin-top:1.35rem;color:#8b8b95;font-size:.98rem;line-height:1.55}
    @media(prefers-reduced-motion:reduce){.slot::after{display:none}.track{transition:none}.track span{animation:none}}`,
    body: `<div class="hero"><h1>We help you <span class="slot" aria-live="polite"><span class="track" id="track"></span></span></h1><p>Cycling emphasis keeps the hero feeling alive.</p></div>`,
    script: `const words=['build','ship','scale','grow'],track=document.getElementById('track'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let index=0;track.innerHTML=words.map(word=>'<span>'+word+'</span>').join('');function go(next){index=next;track.style.transform='translateY(-'+(index*1.14)+'em)';track.classList.toggle('is-spring',index%2===0)}if(!reduced){setInterval(()=>go((index+1)%words.length),2600)}`,
  },
  {
    slug: 'heroes-glitch-landing',
    title: 'Glitch Landing Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'glitch'],
    style: `
    body{min-height:100vh;background:#000;color:#0f0;display:grid;place-items:center;padding:2rem;font-family:monospace;text-align:center}
    h1{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;text-transform:uppercase;position:relative;animation:glitch 3s infinite}
    h1::before,h1::after{content:attr(data-text);position:absolute;inset:0}
    h1::before{color:#f0f;clip-path:inset(20% 0 50% 0);animation:shift 2s infinite}
    h1::after{color:#0ff;clip-path:inset(60% 0 10% 0);animation:shift 2.5s infinite reverse}
    p{margin-top:1.5rem;color:#0a0;font-size:.9rem}
    @keyframes shift{0%,100%{transform:translate(0)}33%{transform:translate(-3px,2px)}66%{transform:translate(3px,-2px)}}
    @keyframes glitch{0%,90%,100%{transform:none}92%{transform:skewX(-2deg)}94%{transform:skewX(2deg)}}`,
    body: `<div><h1 data-text="SYSTEM">SYSTEM</h1><p>// experimental landing hero</p></div>`,
  },
  {
    slug: 'heroes-grain-brutalist',
    title: 'Grain Brutalist Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'brutalist'],
    style: `
    body{min-height:100vh;background:#e8ff00;color:#000;display:grid;place-items:center;padding:2rem;position:relative}
    body::before{content:'';position:fixed;inset:0;opacity:.12;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
    h1{font-size:clamp(3rem,12vw,8rem);font-weight:900;text-transform:uppercase;line-height:.85;border:6px solid #000;padding:1rem 1.5rem;background:#fff;box-shadow:8px 8px 0 #000}`,
    body: `<h1>Raw<br>Power</h1>`,
  },
  {
    slug: 'heroes-aurora-bg',
    title: 'Aurora Background Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'gradient'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:2rem;overflow:hidden;background:#070911;color:#fff;font-family:system-ui,sans-serif;text-align:center}
    .scene{position:fixed;inset:0;overflow:hidden;z-index:0}
    .orb{position:absolute;width:42vmax;aspect-ratio:1;border-radius:999px;filter:blur(44px);opacity:.42;mix-blend-mode:screen;animation:drift 12s ease-in-out infinite alternate}
    .orb:nth-child(1){left:-12vmax;top:-10vmax;background:#6c8cff}.orb:nth-child(2){right:-14vmax;top:16vh;background:#6cffb8;animation-delay:-4s}.orb:nth-child(3){left:28%;bottom:-22vmax;background:#ff6cb0;animation-delay:-8s;opacity:.28}
    .ring{position:absolute;inset:18%;border:1px solid rgba(255,255,255,.08);border-radius:40% 60% 55% 45%;transform:rotate(-8deg)}
    .content{position:relative;z-index:1;width:min(540px,100%)}
    .eyebrow{display:inline-block;margin-bottom:1rem;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.58)}
    h1{font-size:clamp(2.2rem,5.5vw,3.7rem);font-weight:800;line-height:1.04;letter-spacing:-.04em;margin-bottom:1rem}
    p{color:rgba(255,255,255,.68);font-size:1rem;line-height:1.6;max-width:36ch;margin:0 auto 1.65rem}
    .btn{padding:.7rem 1.2rem;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-family:inherit;font-size:.86rem;font-weight:700;cursor:pointer;backdrop-filter:blur(12px);transition:transform .2s cubic-bezier(.22,.61,.36,1),background .2s}
    .btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.12)}
    @keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(7vw,-5vh,0) scale(1.12)}}@media(prefers-reduced-motion:reduce){.orb{animation:none}}`,
    body: `<div class="scene" aria-hidden="true"><div class="orb"></div><div class="orb"></div><div class="orb"></div><div class="ring"></div></div><section class="content"><span class="eyebrow">Abstract interface</span><h1>Built for the future</h1><p>Soft motion, luminous gradients, and clean typography create depth without visual noise.</p><button class="btn" type="button">Launch now</button></section>`,
  },
  {
    slug: 'heroes-typewriter',
    title: 'Typewriter Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'animation'],
    style: `
    body{min-height:100vh;background:#0c0c0c;color:#d4d4d4;display:grid;place-items:center;padding:2rem;font-family:ui-monospace,monospace}
    .line{font-size:clamp(1.2rem,3vw,1.8rem)}.prompt{color:#6c8cff;margin-right:.5rem}
    .cursor{display:inline-block;width:2px;height:1.1em;background:#6c8cff;margin-left:2px;animation:blink 1s step-end infinite;vertical-align:text-bottom}
    @keyframes blink{50%{opacity:0}}`,
    body: `<div class="line"><span class="prompt">&gt;</span><span id="t"></span><span class="cursor"></span></div>`,
    script: `const phrases=['Hello, world.','We ship fast.','Your idea, live.'];let pi=0,ci=0,del=false;const el=document.getElementById('t');function tick(){const p=phrases[pi];if(!del){el.textContent=p.slice(0,++ci);if(ci===p.length){del=true;setTimeout(tick,1800);return}}else{el.textContent=p.slice(0,--ci);if(ci===0){del=false;pi=(pi+1)%phrases.length}}setTimeout(tick,del?40:70)}tick();`,
  },
  {
    slug: 'heroes-mega-type',
    title: 'Mega Type Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'typography', 'scroll'],
    style: `
    body{margin:0;min-height:260vh;background:#fff;color:#000;font-family:system-ui,sans-serif}
    .stage{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}
    .stack{position:relative;width:100%;height:min(52vh,420px)}
    .word{position:absolute;left:50%;top:50%;margin:0;font-size:clamp(4rem,18vw,13rem);font-weight:900;line-height:.82;letter-spacing:-.06em;text-transform:uppercase;white-space:nowrap;transform:translate(-50%,-50%);will-change:transform,opacity,letter-spacing}
    .trail{pointer-events:none;z-index:1}
    .trail:nth-child(1){color:rgba(255,108,176,.22);z-index:1}.trail:nth-child(2){color:rgba(108,140,255,.28);z-index:2}.trail:nth-child(3){color:rgba(108,255,184,.2);z-index:3}.trail:nth-child(4){color:rgba(17,24,39,.14);z-index:4}
    .main{z-index:5;color:#000}
    .hint{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(0,0,0,.32);opacity:var(--hint-opacity,1);transition:opacity .4s ease}
    @media(prefers-reduced-motion:reduce){body{min-height:100vh}.trail{display:none}.hint{display:none}}`,
    body: `<div class="stage" id="stage"><div class="stack"><p class="word trail" data-trail="0">CREATE</p><p class="word trail" data-trail="1">CREATE</p><p class="word trail" data-trail="2">CREATE</p><p class="word trail" data-trail="3">CREATE</p><h1 class="word main" id="main">CREATE</h1></div><span class="hint">Scroll</span></div>`,
    script: `const stage=document.getElementById('stage'),main=document.getElementById('main'),trails=[...document.querySelectorAll('.trail')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,lag=[0,0,0,0],speeds=[.14,.1,.07,.05],trailWeight=[.2,.26,.18,.12];let lastScrollAt=0,target=0;function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}function getProgress(){const max=document.documentElement.scrollHeight-innerHeight;return max>0?ease(Math.min(1,scrollY/max)):0}function trailStrength(){const elapsed=performance.now()-lastScrollAt;if(elapsed<140)return 1;return Math.max(0,1-(elapsed-140)/420)}function applyWord(el,progress,offsetY,offsetX,strength,weight){const scale=.86+progress*.2,track=-.06+progress*.03,opacity=strength*weight;el.style.opacity=opacity.toFixed(3);el.style.letterSpacing=track+'em';el.style.transform='translate(calc(-50% + '+offsetX+'px), calc(-50% + '+offsetY+'px)) scale('+scale.toFixed(3)+')'}function tick(){if(reduced){main.style.letterSpacing='-.04em';return}target+=(getProgress()-target)*.22;const strength=trailStrength();lag.forEach((_,i)=>{lag[i]+=(target-lag[i])*speeds[i]});applyWord(main,target,0,0,1,1);stage.style.setProperty('--hint-opacity',strength>.05?'0':'1');trails.forEach((el,i)=>{const delta=target-lag[i];applyWord(el,lag[i],delta*160,delta*-36,strength,trailWeight[i])});requestAnimationFrame(tick)}addEventListener('scroll',()=>{lastScrollAt=performance.now()},{passive:true});tick();`,
  },
  {
    slug: 'heroes-grid-lines',
    title: 'Grid Lines Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'grid'],
    style: `
    body{min-height:100vh;margin:0;background:#050507;color:#fff;position:relative;display:grid;place-items:center;padding:2rem;text-align:center;font-family:system-ui,sans-serif;overflow:hidden}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at center,black 22%,transparent 70%);opacity:.9}
    body::after{content:'';position:fixed;inset:-20%;background:radial-gradient(circle at 50% 0%,rgba(108,140,255,.14),transparent 55%);filter:blur(30px);opacity:.75;z-index:0;pointer-events:none}
    .wrap{position:relative;z-index:1}
    h1{font-size:clamp(1.6rem,3.6vw,2.4rem);font-weight:700;letter-spacing:-.03em;opacity:.95}
    p{margin-top:.9rem;color:rgba(255,255,255,.5);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase}`,
    body: `<div class="wrap"><h1>Precision built</h1><p>grid overlay</p></div>`,
  },
  {
    slug: 'heroes-blob-morph',
    title: 'Morphing Blob Hero',
    category: 'heroes',
    tags: ['heroes', 'landing', 'experimental', 'light'],
    style: `
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:2rem;overflow:hidden;background:#050508;color:#fff;font-family:system-ui,sans-serif;text-align:center}
    .lights{position:fixed;inset:0;z-index:0;pointer-events:none}
    .glow{position:absolute;border-radius:50%;filter:blur(60px);mix-blend-mode:screen;animation:pulse 7s ease-in-out infinite alternate}
    .glow--core{width:50vmax;height:50vmax;left:50%;top:42%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(140,170,255,.55) 0%,rgba(108,140,255,.2) 38%,transparent 68%)}
    .glow--left{width:34vmax;height:34vmax;left:-8vmax;top:18%;background:radial-gradient(circle,rgba(108,255,184,.35),transparent 68%);animation-delay:-2s}
    .glow--right{width:30vmax;height:30vmax;right:-6vmax;bottom:10%;background:radial-gradient(circle,rgba(255,140,200,.32),transparent 70%);animation-delay:-4s}
    .beam{position:absolute;inset:-30%;opacity:.35;filter:blur(28px);mix-blend-mode:screen;animation:sweep 14s ease-in-out infinite alternate}
    .beam--a{background:conic-gradient(from 200deg at 50% 40%,transparent 0deg,rgba(108,140,255,.5) 42deg,transparent 84deg,transparent 360deg)}
    .beam--b{background:conic-gradient(from 20deg at 58% 62%,transparent 0deg,rgba(108,255,184,.28) 36deg,transparent 72deg,transparent 360deg);animation-delay:-7s;opacity:.28}
    .haze{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.06),transparent 52%)}
    .content{position:relative;z-index:1;width:min(520px,100%)}
    .eyebrow{display:inline-block;margin-bottom:1rem;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
    h1{font-size:clamp(2.2rem,5.5vw,3.6rem);font-weight:800;line-height:1.04;letter-spacing:-.04em;margin-bottom:1rem;text-shadow:0 0 40px rgba(108,140,255,.25)}
    p{color:rgba(255,255,255,.62);font-size:.98rem;line-height:1.6;max-width:34ch;margin:0 auto}
    @keyframes pulse{from{opacity:.72;transform:translate(-50%,-50%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
    .glow--left,.glow--right{animation-name:drift}
    @keyframes drift{from{transform:translate3d(0,0,0) scale(1);opacity:.7}to{transform:translate3d(4vw,-3vh,0) scale(1.08);opacity:1}}
    @keyframes sweep{from{transform:rotate(-6deg) scale(1)}to{transform:rotate(8deg) scale(1.05)}}
    @media(prefers-reduced-motion:reduce){.glow,.beam{animation:none}}`,
    body: `<div class="lights" aria-hidden="true"><div class="beam beam--a"></div><div class="beam beam--b"></div><div class="glow glow--core"></div><div class="glow glow--left"></div><div class="glow glow--right"></div><div class="haze"></div></div><section class="content"><span class="eyebrow">Luminous surface</span><h1>Lit from within</h1><p>Soft beams and glowing haze replace heavy shapes with pure light and atmosphere.</p></section>`,
  },
];
