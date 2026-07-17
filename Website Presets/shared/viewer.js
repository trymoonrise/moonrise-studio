(function () {
  const MANIFEST_URL = 'presets/manifest.json';
  const PRESETS_BASE = 'presets/';
  const CATEGORY_ORDER = [
    'hero',
    'text',
    'animation',
    'scroll',
    'transitions',
    '3d-effects',
    '3d-mouse',
    'experimental',
    'brutalist',
    'images',
    'videos',
    'galleries',
    'cards',
    'avatars',
    'badges',
    'alerts',
    'announcements',
    'navigation',
    'buttons',
    'inputs',
    'forms',
    'cta',
    'pricing',
    'testimonials',
    'tables',
    'tabs',
    'toggles',
    'tooltips',
    'toasts',
    'modals',
    'menus',
    'dropdowns',
    'sidebars',
    'sections',
    'features',
    'clients',
    'logos',
    'bios',
    'profiles',
    'auth',
    'errors',
    'empty-states',
    'notifications',
    'loaders',
    'effects',
    'backgrounds',
    'borders',
  ];
  const CATEGORY_LABELS = {
    '3d-effects': '3D Effects',
    '3d-mouse': '3D Mouse',
    'ai-chat': 'AI Chat',
    cta: 'CTA',
  };

  let allPresets = [];
  let filteredPresets = [];
  let allShuffleOrder = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let sortBy = 'id';
  let modalIndex = -1;
  let thumbObserver = null;
  let loadMoreObserver = null;
  let renderedCount = 0;

  const PAGE_SIZE = 24;
  const GALLERY_QUERY = 'gallery=1';
  const GALLERY_LOOP_SRC = 'shared/gallery-loop.js';

  const els = {
    categoryNav: document.getElementById('categoryNav'),
    previewGrid: document.getElementById('previewGrid'),
    searchInput: document.getElementById('searchInput'),
    breadcrumb: document.getElementById('breadcrumb'),
    resultCount: document.getElementById('resultCount'),
    sortSelect: document.getElementById('sortSelect'),
    modal: document.getElementById('modal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalFrame: document.getElementById('modalFrame'),
    modalTitle: document.getElementById('modalTitle'),
    modalId: document.getElementById('modalId'),
    modalCat: document.getElementById('modalCat'),
    modalFooter: document.getElementById('modalFooter'),
    modalOpen: document.getElementById('modalOpen'),
    modalRestart: document.getElementById('modalRestart'),
    modalClose: document.getElementById('modalClose'),
    modalPrev: document.getElementById('modalPrev'),
    modalNext: document.getElementById('modalNext'),
    navSidebar: document.getElementById('navSidebar'),
    menuBtn: document.getElementById('menuBtn'),
    sidebarClose: document.getElementById('sidebarClose'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    navStat: document.getElementById('navStat'),
  };

  async function init() {
    try {
      const res = await fetch(MANIFEST_URL);
      allPresets = await res.json();
      reshuffleAllOrder();
      buildCategoryNav();
      applyFilters();
      bindEvents();
      if (location.hash) openModalByHash(location.hash.slice(1));
    } catch (err) {
      els.previewGrid.innerHTML = '<p class="grid-empty">Failed to load presets.</p>';
      console.error(err);
    }
  }

  function reshuffleAllOrder() {
    allShuffleOrder = allPresets.map((p) => p.id);
    for (let i = allShuffleOrder.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = allShuffleOrder[i];
      allShuffleOrder[i] = allShuffleOrder[j];
      allShuffleOrder[j] = tmp;
    }
  }

  function formatCategoryLabel(category) {
    return CATEGORY_LABELS[category] || category.replace(/-/g, ' ');
  }

  function sortCategories(categories) {
    return [...categories].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        if (ia !== ib) return ia - ib;
      }
      return formatCategoryLabel(a).localeCompare(formatCategoryLabel(b));
    });
  }

  function buildCategoryNav() {
    const counts = {};
    allPresets.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const cats = sortCategories(Object.keys(counts));

    let html = `
      <div class="cat-section">
        <div class="cat-section__label">Featured</div>
        <button type="button" class="cat-item cat-item--featured active" data-cat="all">
          <span class="cat-item__label">All Presets</span>
          <span class="cat-item__count">${allPresets.length}</span>
        </button>
      </div>
      <div class="cat-section">
        <div class="cat-section__label">Categories</div>
        <div class="cat-list">`;

    cats.forEach((cat) => {
      const label = formatCategoryLabel(cat);
      html += `<button type="button" class="cat-item" data-cat="${cat}">
          <span class="cat-item__label">${label}</span>
          <span class="cat-item__count">${counts[cat]}</span>
        </button>`;
    });

    html += `</div></div>`;
    els.categoryNav.innerHTML = html;

    if (els.navStat) {
      els.navStat.textContent = `${allPresets.length} presets · ${cats.length} categories`;
    }

    els.categoryNav.querySelectorAll('.cat-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextCat = btn.dataset.cat;
        if (nextCat === 'all') reshuffleAllOrder();
        activeCategory = nextCat;
        els.categoryNav.querySelectorAll('.cat-item').forEach((b) => b.classList.toggle('active', b === btn));
        applyFilters();
        closeMobileSidebar();
      });
    });
  }

  function applyFilters() {
    const q = searchQuery.toLowerCase().trim();
    filteredPresets = allPresets.filter((p) => {
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      const hay = [p.id, p.title, p.slug, p.category, ...(p.tags || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (activeCategory === 'all' && sortBy !== 'title') {
      const rank = new Map(allShuffleOrder.map((id, index) => [id, index]));
      filteredPresets.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    } else if (sortBy === 'title') {
      filteredPresets.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filteredPresets.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    }

    const catLabel = activeCategory === 'all' ? 'All Presets' : formatCategoryLabel(activeCategory);
    els.breadcrumb.textContent = activeCategory === 'all' ? 'All Presets' : `Components / ${catLabel}`;
    els.resultCount.textContent = `${filteredPresets.length} preset${filteredPresets.length !== 1 ? 's' : ''}`;

    resetGrid();
  }

  function resetGrid() {
    if (thumbObserver) thumbObserver.disconnect();
    if (loadMoreObserver) {
      loadMoreObserver.disconnect();
      loadMoreObserver = null;
    }
    renderedCount = 0;
    els.previewGrid.innerHTML = '';

    if (filteredPresets.length === 0) {
      els.previewGrid.innerHTML = '<p class="grid-empty">No presets match your filters.</p>';
      return;
    }

    ensureThumbObserver();
    appendCards(PAGE_SIZE);
    setupLoadMore();
    els.previewGrid.scrollTop = 0;
  }

  function cardHtml(p, i) {
    return `
      <article class="preview-card" data-index="${i}" tabindex="0">
        <div class="preview-card__thumb">
          <div class="preview-card__frame-wrap">
            <iframe class="preview-card__frame" data-src="${p.file}" title="${p.title}" loading="lazy" tabindex="-1"></iframe>
          </div>
        </div>
        <div class="preview-card__info">
          <div class="preview-card__title">${p.title}</div>
          <div class="preview-card__meta">
            <span>${p.id}</span>
            <span class="preview-card__cat">${formatCategoryLabel(p.category)}</span>
          </div>
        </div>
      </article>`;
  }

  function appendCards(count) {
    const start = renderedCount;
    const end = Math.min(start + count, filteredPresets.length);
    if (start >= end) return;

    const sentinel = els.previewGrid.querySelector('.grid-sentinel');
    const chunk = filteredPresets
      .slice(start, end)
      .map((p, offset) => cardHtml(p, start + offset))
      .join('');

    if (sentinel) {
      sentinel.insertAdjacentHTML('beforebegin', chunk);
    } else {
      els.previewGrid.insertAdjacentHTML('beforeend', chunk);
    }

    renderedCount = end;
    updateGridFooter();

    els.previewGrid.querySelectorAll('.preview-card').forEach((card) => {
      const index = parseInt(card.dataset.index, 10);
      if (index >= start && index < end) thumbObserver.observe(card);
    });
  }

  function updateGridFooter() {
    let sentinel = els.previewGrid.querySelector('.grid-sentinel');
    let footer = els.previewGrid.querySelector('.grid-footer');

    if (renderedCount < filteredPresets.length) {
      if (!footer) {
        els.previewGrid.insertAdjacentHTML(
          'beforeend',
          '<div class="grid-footer"><span class="grid-footer__text"></span></div>'
        );
        footer = els.previewGrid.querySelector('.grid-footer');
      }
      footer.querySelector('.grid-footer__text').textContent =
        `Showing ${renderedCount} of ${filteredPresets.length} — scroll for more`;
      if (!sentinel) {
        els.previewGrid.insertAdjacentHTML('beforeend', '<div class="grid-sentinel" aria-hidden="true"></div>');
      }
    } else {
      if (loadMoreObserver) {
        loadMoreObserver.disconnect();
        loadMoreObserver = null;
      }
      footer?.remove();
      sentinel?.remove();
    }
  }

  function setupLoadMore() {
    const sentinel = els.previewGrid.querySelector('.grid-sentinel');
    if (!sentinel) return;

    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && renderedCount < filteredPresets.length) {
          appendCards(PAGE_SIZE);
        }
      },
      { root: els.previewGrid, rootMargin: '300px' }
    );
    loadMoreObserver.observe(sentinel);
  }

  function presetPreviewUrl(file, bust) {
    const url = PRESETS_BASE + file + '?' + GALLERY_QUERY;
    return bust ? url + '&r=' + Date.now() : url;
  }

  function injectGalleryLoop(iframe) {
    if (!iframe || iframe.src === 'about:blank') return;
    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.querySelector('script[data-gallery-loop]')) return;
      const script = doc.createElement('script');
      script.src = GALLERY_LOOP_SRC;
      script.dataset.galleryLoop = '1';
      doc.head.appendChild(script);
    } catch (_) {
      /* ignore */
    }
  }

  function loadPreviewFrame(iframe, bust) {
    const file = (iframe.dataset.src || iframe.dataset.file || '').replace(PRESETS_BASE, '');
    if (!file) return;
    const onLoad = () => {
      iframe.removeEventListener('load', onLoad);
      injectGalleryLoop(iframe);
    };
    iframe.addEventListener('load', onLoad);
    iframe.src = presetPreviewUrl(file, bust);
  }

  function ensureThumbObserver() {
    if (thumbObserver) return;
    thumbObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const iframe = entry.target.querySelector('.preview-card__frame');
          if (!iframe) return;
          if (entry.isIntersecting) {
            if (!iframe.src || iframe.src === 'about:blank') {
              loadPreviewFrame(iframe);
            }
          } else if (iframe.src && iframe.src !== 'about:blank') {
            iframe.src = 'about:blank';
          }
        });
      },
      { root: els.previewGrid, rootMargin: '120px' }
    );
  }

  function renderGrid() {
    resetGrid();
  }

  function openModal(index) {
    if (index < 0 || index >= filteredPresets.length) return;
    modalIndex = index;
    const p = filteredPresets[modalIndex];
    els.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    els.modalTitle.textContent = p.title;
    els.modalId.textContent = p.id;
    els.modalCat.textContent = formatCategoryLabel(p.category);
    els.modalFooter.textContent = `${modalIndex + 1} / ${filteredPresets.length} — ${p.title}`;
    els.modalOpen.href = PRESETS_BASE + p.file;
    els.modalFrame.dataset.file = p.file;
    loadPreviewFrame(els.modalFrame);
    history.replaceState(null, '', '#' + p.slug);
  }

  function closeModal() {
    els.modal.hidden = true;
    document.body.style.overflow = '';
    els.modalFrame.src = 'about:blank';
    modalIndex = -1;
    history.replaceState(null, '', location.pathname + location.search);
  }

  function openModalByHash(hash) {
    const idx = filteredPresets.findIndex((p) => p.slug === hash || p.file.replace('.html', '') === hash);
    if (idx >= 0) openModal(idx);
    else {
      const globalIdx = allPresets.findIndex((p) => p.slug === hash);
      if (globalIdx >= 0) {
        const p = allPresets[globalIdx];
        activeCategory = 'all';
        searchQuery = '';
        els.searchInput.value = '';
        els.categoryNav.querySelectorAll('.cat-item').forEach((b) => b.classList.toggle('active', b.dataset.cat === 'all'));
        applyFilters();
        const newIdx = filteredPresets.findIndex((x) => x.id === p.id);
        if (newIdx >= 0) openModal(newIdx);
      }
    }
  }

  function modalPrev() {
    if (modalIndex > 0) openModal(modalIndex - 1);
    else openModal(filteredPresets.length - 1);
  }

  function modalNext() {
    if (modalIndex < filteredPresets.length - 1) openModal(modalIndex + 1);
    else openModal(0);
  }

  function restartModalPreview() {
    if (modalIndex < 0) return;
    loadPreviewFrame(els.modalFrame, true);
  }

  function closeMobileSidebar() {
    els.navSidebar.classList.remove('open');
    els.sidebarOverlay.classList.remove('visible');
  }

  function bindEvents() {
    els.searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFilters();
    });

    els.sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      applyFilters();
    });

    els.modalClose.addEventListener('click', closeModal);
    els.modalBackdrop.addEventListener('click', closeModal);
    els.modalRestart.addEventListener('click', restartModalPreview);
    els.modalPrev.addEventListener('click', modalPrev);
    els.modalNext.addEventListener('click', modalNext);

    els.menuBtn.addEventListener('click', () => {
      els.navSidebar.classList.add('open');
      els.sidebarOverlay.classList.add('visible');
    });
    els.sidebarClose.addEventListener('click', closeMobileSidebar);
    els.sidebarOverlay.addEventListener('click', closeMobileSidebar);

    els.previewGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.preview-card');
      if (card) openModal(parseInt(card.dataset.index, 10));
    });

    els.previewGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.preview-card');
      if (card) openModal(parseInt(card.dataset.index, 10));
    });

    document.addEventListener('keydown', (e) => {
      if (e.target === els.searchInput && e.key === 'Escape') {
        els.searchInput.blur();
        return;
      }
      if (!els.modal.hidden) {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') modalPrev();
        if (e.key === 'ArrowRight') modalNext();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        els.searchInput.focus();
      }
    });

    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (!hash && !els.modal.hidden) closeModal();
      else if (hash) openModalByHash(hash);
    });
  }

  init();
})();
