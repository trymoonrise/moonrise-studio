const IMG = '../stock/media/16-9 Aspect Ratio(image).png';

module.exports = [
  // ── Reveals & transitions ──
  { slug: 'reveal-iris-open', title: 'Iris Circle Reveal', category: 'reveals', tags: ['reveal', 'iris', 'circle'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;display:grid;place-items:center;background:url('${IMG}') center/cover}.scene h1{color:#fff;font-size:clamp(2rem,6vw,3.5rem);font-weight:900;text-shadow:0 4px 30px rgba(0,0,0,.6);z-index:1}.mask{position:absolute;inset:0;background:#0d0d0f;clip-path:circle(0% at 50% 50%);animation:iris 2s cubic-bezier(.22,.61,.36,1) forwards}@keyframes iris{to{clip-path:circle(150% at 50% 50%)}}@media (prefers-reduced-motion:reduce){.mask{display:none}}`,
    body: `<div class="scene"><div class="mask"></div><h1>Revealed</h1></div>` },

  { slug: 'reveal-horizontal-blinds', title: 'Horizontal Blinds Reveal', category: 'reveals', tags: ['reveal', 'blinds', 'horizontal'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;background:url('${IMG}') center/cover;display:grid;place-items:center}.scene h1{color:#fff;font-size:3rem;font-weight:800;z-index:2;text-shadow:0 2px 20px rgba(0,0,0,.5)}.blinds{position:absolute;inset:0;display:flex;flex-direction:column;z-index:1}.blind{flex:1;background:#111;transform:scaleY(1);transform-origin:top;animation:blind .8s cubic-bezier(.22,.61,.36,1) forwards}.blind:nth-child(1){animation-delay:0s}.blind:nth-child(2){animation-delay:.08s}.blind:nth-child(3){animation-delay:.16s}.blind:nth-child(4){animation-delay:.24s}.blind:nth-child(5){animation-delay:.32s}.blind:nth-child(6){animation-delay:.4s}@keyframes blind{to{transform:scaleY(0)}}`,
    body: `<div class="scene"><div class="blinds">${Array.from({length:6},()=>'<div class="blind"></div>').join('')}</div><h1>Blinds</h1></div>` },

  { slug: 'reveal-vertical-blinds', title: 'Vertical Blinds Reveal', category: 'reveals', tags: ['reveal', 'blinds', 'vertical'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;background:linear-gradient(135deg,#6c8cff,#764ba2);display:grid;place-items:center}.scene h1{color:#fff;font-size:3rem;font-weight:900;z-index:2}.blinds{position:absolute;inset:0;display:flex;z-index:1}.blind{flex:1;background:#0d0d0f;transform:scaleX(1);transform-origin:left;animation:vb .7s cubic-bezier(.22,.61,.36,1) forwards}.blind:nth-child(odd){transform-origin:right}@keyframes vb{to{transform:scaleX(0)}}.blind:nth-child(1){animation-delay:.05s}.blind:nth-child(2){animation-delay:.1s}.blind:nth-child(3){animation-delay:.15s}.blind:nth-child(4){animation-delay:.2s}.blind:nth-child(5){animation-delay:.25s}.blind:nth-child(6){animation-delay:.3s}.blind:nth-child(7){animation-delay:.35s}.blind:nth-child(8){animation-delay:.4s}`,
    body: `<div class="scene"><div class="blinds">${Array.from({length:8},()=>'<div class="blind"></div>').join('')}</div><h1>Open</h1></div>` },

  { slug: 'reveal-split-center', title: 'Center Split Reveal', category: 'reveals', tags: ['reveal', 'split', 'center'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;background:url('${IMG}') center/cover;display:grid;place-items:center}.scene h1{color:#fff;font-size:3rem;font-weight:800;z-index:1;text-shadow:0 2px 24px rgba(0,0,0,.6)}.half{position:absolute;top:0;bottom:0;width:50%;background:#111;animation:split 1.2s cubic-bezier(.22,.61,.36,1) forwards}.half--l{left:0;transform-origin:left}.half--r{right:0;transform-origin:right}@keyframes split{to{transform:scaleX(0)}}`,
    body: `<div class="scene"><div class="half half--l"></div><div class="half half--r"></div><h1>Split</h1></div>` },

  { slug: 'reveal-diagonal-wipe', title: 'Diagonal Wipe Reveal', category: 'reveals', tags: ['reveal', 'diagonal', 'wipe'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;background:url('${IMG}') center/cover;display:grid;place-items:center}.scene h1{color:#fff;font-size:3rem;font-weight:900;z-index:1}.wipe{position:absolute;inset:-50%;background:#0d0d0f;animation:diag 1.4s cubic-bezier(.22,.61,.36,1) forwards}@keyframes diag{from{transform:translateX(-30%) translateY(30%) rotate(-45deg)}to{transform:translateX(130%) translateY(-30%) rotate(-45deg)}}`,
    body: `<div class="scene"><div class="wipe"></div><h1>Wipe</h1></div>` },

  { slug: 'reveal-line-scan', title: 'Line Scan Reveal', category: 'reveals', tags: ['reveal', 'scan', 'line'],
    style: `body{margin:0;min-height:100vh;overflow:hidden;background:#000}.scene{position:relative;height:100vh}.bg{position:absolute;inset:0;background:url('${IMG}') center/cover;clip-path:inset(0 0 100% 0);animation:scan 2s cubic-bezier(.22,.61,.36,1) forwards}.scanline{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#6cffb8,transparent);box-shadow:0 0 20px #6cffb8;animation:move 2s cubic-bezier(.22,.61,.36,1) forwards;z-index:2}@keyframes scan{to{clip-path:inset(0)}}@keyframes move{to{top:100%}}.label{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:2.5rem;font-weight:800;z-index:1;opacity:0;animation:show .5s .8s forwards}@keyframes show{to{opacity:1}}`,
    body: `<div class="scene"><div class="bg"></div><div class="scanline"></div><h1 class="label">Scanned</h1></div>` },

  { slug: 'reveal-stagger-blocks', title: 'Stagger Block Reveal', category: 'reveals', tags: ['reveal', 'stagger', 'blocks'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.scene{position:relative;height:100vh;background:url('${IMG}') center/cover;display:grid;place-items:center}.scene h1{color:#fff;font-size:3rem;font-weight:900;z-index:2}.grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(4,1fr);z-index:1}.cell{background:#111;animation:cell .6s cubic-bezier(.22,.61,.36,1) forwards}.cell:nth-child(1){animation-delay:.02s}.cell:nth-child(2){animation-delay:.06s}.cell:nth-child(3){animation-delay:.1s}.cell:nth-child(4){animation-delay:.14s}.cell:nth-child(5){animation-delay:.18s}.cell:nth-child(6){animation-delay:.22s}.cell:nth-child(7){animation-delay:.08s}.cell:nth-child(8){animation-delay:.12s}.cell:nth-child(9){animation-delay:.16s}.cell:nth-child(10){animation-delay:.2s}.cell:nth-child(11){animation-delay:.24s}.cell:nth-child(12){animation-delay:.28s}.cell:nth-child(n+13){animation-delay:.32s}@keyframes cell{to{opacity:0;transform:scale(.8)}}`,
    body: `<div class="scene"><div class="grid">${Array.from({length:24},()=>'<div class="cell"></div>').join('')}</div><h1>Blocks</h1></div>` },

  { slug: 'reveal-clip-polygon', title: 'Polygon Clip Reveal', category: 'reveals', tags: ['reveal', 'clip', 'polygon'],
    style: `body{margin:0;min-height:100vh;background:#0d0d0f;display:grid;place-items:center;padding:2rem}.card{width:min(400px,90vw);aspect-ratio:16/10;border-radius:16px;overflow:hidden;position:relative}.card img{width:100%;height:100%;object-fit:cover;clip-path:polygon(50% 50%,50% 50%,50% 50%,50% 50%);animation:poly 1.6s cubic-bezier(.22,.61,.36,1) forwards}@keyframes poly{to{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}}`,
    body: `<div class="card"><img src="${IMG}" alt=""></div>` },

  { slug: 'reveal-slide-up-mask', title: 'Slide Up Mask Reveal', category: 'reveals', tags: ['reveal', 'slide', 'mask'],
    style: `body{margin:0;min-height:100vh;overflow:hidden}.wrap{position:relative;height:100vh}.content{position:absolute;inset:0;background:url('${IMG}') center/cover;display:grid;place-items:center}.content h1{color:#fff;font-size:3rem;font-weight:800;text-shadow:0 2px 20px rgba(0,0,0,.5)}.mask{position:absolute;inset:0;background:#6c8cff;transform:translateY(0);animation:up 1.2s cubic-bezier(.22,.61,.36,1) forwards}@keyframes up{to{transform:translateY(-100%)}}`,
    body: `<div class="wrap"><div class="content"><h1>Hello</h1></div><div class="mask"></div></div>` },

  { slug: 'reveal-blur-sharpen', title: 'Blur to Sharp Reveal', category: 'reveals', tags: ['reveal', 'blur', 'sharpen'],
    style: `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;padding:2rem}.frame{width:min(560px,95vw);border-radius:16px;overflow:hidden}.frame img{width:100%;display:block;filter:blur(20px) brightness(.5);animation:sharp 2s cubic-bezier(.22,.61,.36,1) forwards}@keyframes sharp{to{filter:blur(0) brightness(1)}}`,
    body: `<div class="frame"><img src="${IMG}" alt=""></div>` },

  { slug: 'transition-slide-push', title: 'Slide Push Transition', category: 'transitions', tags: ['transition', 'slide', 'push'],
    style: `body{margin:0;min-height:100vh;overflow:hidden;background:#111}.track{display:flex;width:300%;height:100vh;transition:transform .65s cubic-bezier(.22,.61,.36,1)}.page{flex:0 0 33.333%;height:100vh;display:grid;place-items:center;color:#fff;font-size:2.5rem;font-weight:800}.page:nth-child(1){background:#6c8cff}.page:nth-child(2){background:#ff6cb0}.page:nth-child(3){background:#6cffb8;color:#111}.ctrl{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:.5rem}.ctrl button{padding:10px 20px;border:none;border-radius:8px;background:#fff;color:#111;font-weight:600;cursor:pointer}`,
    body: `<div class="track" id="t"><div class="page">One</div><div class="page">Two</div><div class="page">Three</div></div><div class="ctrl"><button id="prev">←</button><button id="next">→</button></div>`,
    script: `let i=0;const t=document.getElementById('t');document.getElementById('next').onclick=()=>{i=Math.min(2,i+1);t.style.transform='translateX('+(-i*100/3)+'%)';};document.getElementById('prev').onclick=()=>{i=Math.max(0,i-1);t.style.transform='translateX('+(-i*100/3)+'%)';};` },

  { slug: 'transition-crossfade-blur', title: 'Crossfade Blur Transition', category: 'transitions', tags: ['transition', 'crossfade', 'blur'],
    style: `body{margin:0;min-height:100vh;overflow:hidden;position:relative}.slide{position:absolute;inset:0;display:grid;place-items:center;font-size:2.5rem;font-weight:800;color:#fff;opacity:0;filter:blur(12px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),filter .7s cubic-bezier(.22,.61,.36,1)}.slide.on{opacity:1;filter:blur(0);z-index:1}.slide:nth-child(1){background:linear-gradient(135deg,#1a1a2e,#6c8cff)}.slide:nth-child(2){background:linear-gradient(135deg,#2e1a2e,#ff6cb0)}.slide:nth-child(3){background:linear-gradient(135deg,#1a2e2a,#6cffb8);color:#111}.ctrl{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:5}.ctrl button{padding:10px 24px;border:none;border-radius:99px;background:rgba(255,255,255,.15);color:#fff;backdrop-filter:blur(8px);cursor:pointer;font-weight:600}`,
    body: `<div class="slide on">Alpha</div><div class="slide">Beta</div><div class="slide">Gamma</div><div class="ctrl"><button id="n">Next →</button></div>`,
    script: `const slides=[...document.querySelectorAll('.slide')];let i=0;document.getElementById('n').onclick=()=>{slides[i].classList.remove('on');i=(i+1)%slides.length;slides[i].classList.add('on');};` },

  { slug: 'transition-zoom-fade', title: 'Zoom Fade Transition', category: 'transitions', tags: ['transition', 'zoom', 'fade'],
    style: `body{margin:0;min-height:100vh;overflow:hidden;position:relative}.layer{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:3rem;font-weight:900;opacity:0;transform:scale(1.15);transition:opacity .6s,transform .6s cubic-bezier(.22,.61,.36,1)}.layer.on{opacity:1;transform:scale(1);z-index:1}.layer:nth-child(1){background:#111}.layer:nth-child(2){background:#6c8cff}.layer:nth-child(3){background:#ff6cb0}.tap{position:fixed;inset:0;z-index:10;cursor:pointer}`,
    body: `<div class="layer on">01</div><div class="layer">02</div><div class="layer">03</div><div class="tap" id="tap"></div>`,
    script: `const layers=[...document.querySelectorAll('.layer')];let i=0;document.getElementById('tap').onclick=()=>{layers[i].classList.remove('on');i=(i+1)%layers.length;layers[i].classList.add('on');};` },

  { slug: 'transition-flip-page', title: 'Flip Page Transition', category: 'transitions', tags: ['transition', 'flip', '3d'],
    style: `body{margin:0;min-height:100vh;background:#0d0d0f;display:grid;place-items:center;perspective:1200px}.book{position:relative;width:min(320px,85vw);height:200px;transform-style:preserve-3d}.page{position:absolute;inset:0;border-radius:12px;display:grid;place-items:center;font-size:2rem;font-weight:800;color:#fff;backface-visibility:hidden}.page:nth-child(1){background:#6c8cff}.page:nth-child(2){background:#ff6cb0;transform:rotateY(180deg)}.book.flipped{transform:rotateY(180deg);transition:transform .8s cubic-bezier(.22,.61,.36,1)}.hint{position:fixed;bottom:2rem;color:#666;font-size:.85rem}`,
    body: `<div class="book" id="b"><div class="page">Front</div><div class="page">Back</div></div><p class="hint">Click to flip</p>`,
    script: `const b=document.getElementById('b');b.onclick=()=>b.classList.toggle('flipped');` },

  { slug: 'transition-stack-peel', title: 'Stack Peel Transition', category: 'transitions', tags: ['transition', 'stack', 'peel'],
    style: `body{margin:0;min-height:100vh;background:#f5f5f5;display:grid;place-items:center}.stack{position:relative;width:min(300px,85vw);height:200px;cursor:pointer}.sheet{position:absolute;inset:0;border-radius:14px;display:grid;place-items:center;font-size:1.5rem;font-weight:800;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);transition:transform .55s cubic-bezier(.22,.61,.36,1),opacity .4s}.sheet:nth-child(1){background:#6c8cff;z-index:3}.sheet:nth-child(2){background:#ff6cb0;z-index:2;transform:translateY(6px) scale(.97)}.sheet:nth-child(3){background:#6cffb8;color:#111;z-index:1;transform:translateY(12px) scale(.94)}.stack.peel .sheet:nth-child(1){transform:translateX(120px) rotate(12deg);opacity:0}`,
    body: `<div class="stack" id="s"><div class="sheet">A</div><div class="sheet">B</div><div class="sheet">C</div></div><p style="margin-top:1.5rem;color:#888;font-size:.85rem">Click to peel</p>`,
    script: `const s=document.getElementById('s');s.onclick=()=>{s.classList.add('peel');setTimeout(()=>s.classList.remove('peel'),600);};` },

  // ── Modern loading screens ──
  { slug: 'loader-dual-ring', title: 'Dual Ring Loader', category: 'loading', tags: ['loading', 'circle', 'ring'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c}.loader{position:relative;width:56px;height:56px}.ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent}.ring--a{border-top-color:#6c8cff;animation:spin 1s linear infinite}.ring--b{inset:8px;border-bottom-color:#ff6cb0;animation:spin 1.4s linear infinite reverse}@keyframes spin{to{transform:rotate(360deg)}}p{color:#555;margin-top:1.5rem;font-size:.85rem;letter-spacing:.05em}`,
    body: `<div style="text-align:center"><div class="loader"><div class="ring ring--a"></div><div class="ring ring--b"></div></div><p>Loading</p></div>` },

  { slug: 'loader-orbiting-dots', title: 'Orbiting Dots Loader', category: 'loading', tags: ['loading', 'circle', 'dots'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}.orbit{width:48px;height:48px;position:relative;animation:spin 1.2s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#6c8cff;top:0;left:50%;margin-left:-4px}.dot:nth-child(2){top:auto;bottom:0;background:#ff6cb0}.dot:nth-child(3){top:50%;left:0;margin:0;margin-top:-4px;background:#6cffb8}`,
    body: `<div class="orbit"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>` },

  { slug: 'loader-dash-circle', title: 'Dash Circle Loader', category: 'loading', tags: ['loading', 'circle', 'dash'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa}.ring{width:52px;height:52px;border-radius:50%;border:3px solid #eee;border-top-color:#6c8cff;border-right-color:#6c8cff;animation:spin .9s cubic-bezier(.5,0,.5,1) infinite}@keyframes spin{to{transform:rotate(360deg)}}`,
    body: `<div class="ring"></div>` },

  { slug: 'loader-segment-ring', title: 'Segment Ring Loader', category: 'loading', tags: ['loading', 'circle', 'segment'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}svg{width:56px;height:56px;animation:spin 1.4s linear infinite}circle{fill:none;stroke:#6c8cff;stroke-width:3;stroke-linecap:round;stroke-dasharray:80;stroke-dashoffset:60}@keyframes spin{to{transform:rotate(360deg)}}`,
    body: `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9"/></svg>` },

  { slug: 'loader-pulse-rings', title: 'Pulse Rings Loader', category: 'loading', tags: ['loading', 'circle', 'pulse'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}.rings{position:relative;width:64px;height:64px}.ring{position:absolute;inset:0;border-radius:50%;border:2px solid #6c8cff;animation:pulse 1.8s ease-out infinite}.ring:nth-child(2){animation-delay:.4s}.ring:nth-child(3){animation-delay:.8s}@keyframes pulse{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.2);opacity:0}}`,
    body: `<div class="rings"><div class="ring"></div><div class="ring"></div><div class="ring"></div></div>` },

  { slug: 'loader-line-indeterminate', title: 'Line Indeterminate Loader', category: 'loading', tags: ['loading', 'line', 'indeterminate'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fff;padding:2rem}.bar{width:min(320px,90vw);height:3px;background:#eee;border-radius:99px;overflow:hidden;position:relative}.fill{position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,#6c8cff,#ff6cb0);border-radius:99px;animation:slide 1.4s ease-in-out infinite}@keyframes slide{0%{left:-40%}100%{left:100%}}`,
    body: `<div class="bar"><div class="fill"></div></div>` },

  { slug: 'loader-line-progress', title: 'Line Progress Loader', category: 'loading', tags: ['loading', 'line', 'progress'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#fff;padding:2rem}.wrap{width:min(360px,90vw);text-align:center}.bar{height:4px;background:#222;border-radius:99px;overflow:hidden;margin:1.5rem 0}.fill{height:100%;width:0;background:linear-gradient(90deg,#6c8cff,#6cffb8);border-radius:99px;transition:width .15s}.pct{font-size:2.5rem;font-weight:800;font-variant-numeric:tabular-nums;color:#6c8cff}.label{font-size:.8rem;color:#666;margin-top:.5rem}`,
    body: `<div class="wrap"><div class="pct" id="p">0%</div><div class="bar"><div class="fill" id="f"></div></div><p class="label">Loading assets</p></div>`,
    script: `const f=document.getElementById('f'),p=document.getElementById('p');let v=0;const t=setInterval(()=>{v+=Math.random()*8+2;if(v>=100){v=100;clearInterval(t);}f.style.width=v+'%';p.textContent=Math.round(v)+'%';},120);` },

  { slug: 'loader-lines-wave', title: 'Wave Lines Loader', category: 'loading', tags: ['loading', 'lines', 'wave'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}.bars{display:flex;gap:4px;align-items:flex-end;height:40px}.bar{width:4px;background:#6c8cff;border-radius:99px;animation:wave 1s ease-in-out infinite}.bar:nth-child(1){animation-delay:0s;height:12px}.bar:nth-child(2){animation-delay:.1s;height:20px}.bar:nth-child(3){animation-delay:.2s;height:32px}.bar:nth-child(4){animation-delay:.3s;height:24px}.bar:nth-child(5){animation-delay:.4s;height:16px}@keyframes wave{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}`,
    body: `<div class="bars">${Array.from({length:5},()=>'<div class="bar"></div>').join('')}</div>` },

  { slug: 'loader-stacked-bars', title: 'Stacked Bars Loader', category: 'loading', tags: ['loading', 'stack', 'bars'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fafafa}.stack{display:flex;flex-direction:column-reverse;gap:4px;align-items:center}.bar{width:48px;height:6px;border-radius:3px;background:#ddd;animation:stack .9s ease-in-out infinite}.bar:nth-child(1){animation-delay:0s}.bar:nth-child(2){animation-delay:.12s}.bar:nth-child(3){animation-delay:.24s}.bar:nth-child(4){animation-delay:.36s}@keyframes stack{0%,100%{background:#ddd;transform:scaleX(.6)}50%{background:#6c8cff;transform:scaleX(1)}}`,
    body: `<div class="stack">${Array.from({length:4},()=>'<div class="bar"></div>').join('')}</div>` },

  { slug: 'loader-stack-squares', title: 'Stack Squares Loader', category: 'loading', tags: ['loading', 'stack', 'squares'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}.stack{position:relative;width:48px;height:48px}.sq{position:absolute;width:20px;height:20px;border-radius:4px;background:#6c8cff;animation:sq 1.2s ease-in-out infinite}.sq:nth-child(1){top:0;left:0;animation-delay:0s}.sq:nth-child(2){top:0;right:0;background:#ff6cb0;animation-delay:.15s}.sq:nth-child(3){bottom:0;left:0;background:#6cffb8;animation-delay:.3s}.sq:nth-child(4){bottom:0;right:0;background:#f59e0b;animation-delay:.45s}@keyframes sq{0%,100%{transform:scale(.8);opacity:.5}50%{transform:scale(1.1);opacity:1}}`,
    body: `<div class="stack"><div class="sq"></div><div class="sq"></div><div class="sq"></div><div class="sq"></div></div>` },

  { slug: 'loader-circle-stack', title: 'Circle Stack Loader', category: 'loading', tags: ['loading', 'stack', 'circles'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fff}.stack{position:relative;width:56px;height:56px}.c{position:absolute;border-radius:50%;border:2px solid #6c8cff;animation:cs 1.6s ease-in-out infinite}.c:nth-child(1){inset:0}.c:nth-child(2){inset:8px;animation-delay:.2s;border-color:#ff6cb0}.c:nth-child(3){inset:16px;animation-delay:.4s;border-color:#6cffb8}@keyframes cs{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.85);opacity:.4}}`,
    body: `<div class="stack"><div class="c"></div><div class="c"></div><div class="c"></div></div>` },

  { slug: 'loader-dots-chase', title: 'Chasing Dots Loader', category: 'loading', tags: ['loading', 'dots', 'chase'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0a0a0c}.dots{display:flex;gap:8px}.dot{width:10px;height:10px;border-radius:50%;background:#6c8cff;animation:chase .7s ease-in-out infinite alternate}.dot:nth-child(2){animation-delay:.15s;background:#ff6cb0}.dot:nth-child(3){animation-delay:.3s;background:#6cffb8}@keyframes chase{to{transform:translateY(-14px);opacity:.4}}`,
    body: `<div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>` },

  { slug: 'loader-dots-grid', title: 'Dot Grid Loader', category: 'loading', tags: ['loading', 'dots', 'grid'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dot{width:10px;height:10px;border-radius:50%;background:#6c8cff;animation:pop .9s ease-in-out infinite}.dot:nth-child(1){animation-delay:0s}.dot:nth-child(2){animation-delay:.1s}.dot:nth-child(3){animation-delay:.2s}.dot:nth-child(4){animation-delay:.15s}.dot:nth-child(5){animation-delay:.25s}.dot:nth-child(6){animation-delay:.35s}.dot:nth-child(7){animation-delay:.2s}.dot:nth-child(8){animation-delay:.3s}.dot:nth-child(9){animation-delay:.4s}@keyframes pop{0%,100%{transform:scale(.5);opacity:.3}50%{transform:scale(1);opacity:1}}`,
    body: `<div class="grid">${Array.from({length:9},()=>'<div class="dot"></div>').join('')}</div>` },

  { slug: 'loader-skeleton-screen', title: 'Skeleton Screen Loader', category: 'loading', tags: ['loading', 'skeleton', 'screen'],
    style: `body{margin:0;min-height:100vh;background:#fafafa;padding:2rem;font-family:system-ui,sans-serif}.card{max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,.06)}.sk{background:linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}.sk--avatar{width:48px;height:48px;border-radius:50%;margin-bottom:1rem}.sk--line{height:12px;margin-bottom:10px}.sk--line.short{width:60%}.sk--block{height:120px;margin-top:1rem;border-radius:12px}@keyframes shimmer{to{background-position:-200% 0}}`,
    body: `<div class="card"><div class="sk sk--avatar"></div><div class="sk sk--line"></div><div class="sk sk--line short"></div><div class="sk sk--block"></div></div>` },

  { slug: 'loader-minimal-brand', title: 'Minimal Brand Loader', category: 'loading', tags: ['loading', 'minimal', 'brand'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#fff;color:#111;text-align:center;font-family:system-ui,sans-serif}.logo{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6c8cff,#764ba2);margin:0 auto 1.5rem;animation:breathe 2s ease-in-out infinite}@keyframes breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.92);opacity:.7}}.name{font-size:1rem;font-weight:700;letter-spacing:.02em}.sub{font-size:.75rem;color:#999;margin-top:.35rem}`,
    body: `<div><div class="logo"></div><div class="name">Studio</div><p class="sub">Loading experience</p></div>` },

  { slug: 'loader-line-draw', title: 'Line Draw Loader', category: 'loading', tags: ['loading', 'line', 'draw'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f}svg{width:80px;height:80px}circle{fill:none;stroke:#6c8cff;stroke-width:2;stroke-dasharray:188;stroke-dashoffset:188;animation:draw 2s cubic-bezier(.22,.61,.36,1) infinite}@keyframes draw{0%{stroke-dashoffset:188}50%{stroke-dashoffset:0}100%{stroke-dashoffset:-188}}`,
    body: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/></svg>` },

  { slug: 'loader-morph-shapes', title: 'Morph Shapes Loader', category: 'loading', tags: ['loading', 'morph', 'shapes'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111}.shape{width:48px;height:48px;background:#6c8cff;animation:morph 2s ease-in-out infinite}@keyframes morph{0%,100%{border-radius:50%;transform:rotate(0deg)}25%{border-radius:0;transform:rotate(90deg)}50%{border-radius:30% 70% 70% 30%/30% 30% 70% 70%;background:#ff6cb0}75%{border-radius:0;transform:rotate(270deg);background:#6cffb8}}`,
    body: `<div class="shape"></div>` },

  { slug: 'loader-fullscreen-fade', title: 'Fullscreen Fade Loader', category: 'loading', tags: ['loading', 'fullscreen', 'fade'],
    style: `body{margin:0;min-height:100vh;background:#0d0d0f;color:#fff;font-family:system-ui,sans-serif}.screen{position:fixed;inset:0;display:grid;place-items:center;background:#0d0d0f;z-index:10;animation:exit 3s cubic-bezier(.22,.61,.36,1) forwards}@keyframes exit{0%,70%{opacity:1}100%{opacity:0;pointer-events:none}}.center{text-align:center}.ring{width:40px;height:40px;border:2px solid #333;border-top-color:#6c8cff;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1.5rem}@keyframes spin{to{transform:rotate(360deg)}}h2{font-size:1.1rem;font-weight:600}.content{min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#1a1a2e,#6c8cff);color:#fff;font-size:2rem;font-weight:800}`,
    body: `<div class="screen"><div class="center"><div class="ring"></div><h2>Loading</h2></div></div><div class="content">Welcome</div>` },

  { slug: 'loader-stacked-cards', title: 'Stacked Cards Loader', category: 'loading', tags: ['loading', 'stack', 'cards'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#f0f0f0}.deck{position:relative;width:80px;height:100px}.card{position:absolute;inset:0;border-radius:10px;background:#fff;border:1px solid #e5e5e5;box-shadow:0 4px 12px rgba(0,0,0,.08);animation:deck 1.4s ease-in-out infinite}.card:nth-child(1){animation-delay:0s;z-index:3}.card:nth-child(2){animation-delay:.15s;z-index:2}.card:nth-child(3){animation-delay:.3s;z-index:1}@keyframes deck{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-16px) rotate(3deg)}}`,
    body: `<div class="deck"><div class="card"></div><div class="card"></div><div class="card"></div></div>` },

  // ── Extra effects ──
  { slug: 'effect-shimmer-sweep', title: 'Shimmer Sweep Effect', category: 'effects', tags: ['effects', 'shimmer', 'sweep'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#111;padding:2rem}.card{position:relative;width:min(320px,90vw);padding:2rem;border-radius:16px;background:#1a1a2e;color:#fff;overflow:hidden}.card::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);animation:sweep 2.5s ease-in-out infinite}@keyframes sweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}h3{font-size:1.2rem;position:relative;z-index:1}`,
    body: `<div class="card"><h3>Shimmer card</h3></div>` },

  { slug: 'effect-text-reveal-mask', title: 'Text Mask Reveal', category: 'reveals', tags: ['reveal', 'text', 'mask'],
    style: `body{display:grid;place-items:center;min-height:100vh;background:#0d0d0f;color:#fff;padding:2rem}h1{font-size:clamp(2.5rem,8vw,5rem);font-weight:900;line-height:1.1;text-align:center}.line{display:block;overflow:hidden}.line span{display:block;transform:translateY(110%);animation:rise 1s cubic-bezier(.22,.61,.36,1) forwards}.line:nth-child(1) span{animation-delay:.1s}.line:nth-child(2) span{animation-delay:.25s}.line:nth-child(3) span{animation-delay:.4s}@keyframes rise{to{transform:translateY(0)}}`,
    body: `<h1><span class="line"><span>Modern</span></span><span class="line"><span>Reveal</span></span><span class="line"><span>Effect</span></span></h1>` },

  { slug: 'effect-fade-stagger-grid', title: 'Fade Stagger Grid Reveal', category: 'reveals', tags: ['reveal', 'grid', 'stagger'],
    style: `body{margin:0;min-height:100vh;background:#fafafa;display:grid;place-items:center;padding:2rem}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:400px}.cell{aspect-ratio:1;border-radius:12px;background:linear-gradient(135deg,#6c8cff,#764ba2);opacity:0;transform:scale(.8);animation:cell 0.6s cubic-bezier(.22,.61,.36,1) forwards}.cell:nth-child(1){animation-delay:.05s}.cell:nth-child(2){animation-delay:.1s}.cell:nth-child(3){animation-delay:.15s}.cell:nth-child(4){animation-delay:.2s}.cell:nth-child(5){animation-delay:.25s}.cell:nth-child(6){animation-delay:.3s}.cell:nth-child(7){animation-delay:.35s}.cell:nth-child(8){animation-delay:.4s}@keyframes cell{to{opacity:1;transform:scale(1)}}`,
    body: `<div class="grid">${Array.from({length:8},()=>'<div class="cell"></div>').join('')}</div>` },
];
