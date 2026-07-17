(() => {
  const body = document.body;
  if (!body || body.querySelector('.dx-layer')) return;
  const title = document.title.replace(/^\d+\s*[—-]\s*/, '');
  const layer = document.createElement('div');
  layer.className = 'dx-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<span class="dx-shape"></span><span class="dx-noise"></span><span class="dx-label"></span>';
  const shape = layer.querySelector('.dx-shape');
  shape.dataset.text = title;
  layer.querySelector('.dx-label').textContent = body.dataset.dxLabel || title;
  body.appendChild(layer);

  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  const move = (event) => {
    tx = (event.clientX / window.innerWidth - 0.5) * 12;
    ty = (event.clientY / window.innerHeight - 0.5) * 12;
  };
  const tick = () => {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    layer.style.setProperty('--dx-x', cx.toFixed(2) + 'px');
    layer.style.setProperty('--dx-y', cy.toFixed(2) + 'px');
    layer.style.translate = `var(--dx-x) var(--dx-y)`;
    requestAnimationFrame(tick);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    addEventListener('pointermove', move, { passive: true });
    requestAnimationFrame(tick);
  }
})();
