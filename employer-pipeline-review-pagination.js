(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaEmployerReviewPagination) return;
  window.__rolexaEmployerReviewPagination = true;

  const PAGE_SIZE = 10;
  let applying = false;

  function addStyles() {
    if (document.getElementById('rxPipelineReviewPaginationStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxPipelineReviewPaginationStyles';
    style.textContent = `
      .rx-review-pagination{display:grid;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(7,16,37,.08)}
      .rx-review-pagination-copy{font-size:10.5px;color:#6B7280;font-weight:800;text-align:center}
      .rx-review-pagination-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}
      .rx-review-pagination-btn{border:1px solid rgba(7,16,37,.1);background:#fff;color:#0A1738;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900}
      .rx-review-pagination-btn.primary{background:#176BFF;border-color:#176BFF;color:#fff}
      @media(max-width:760px){.rx-review-pagination-actions{display:grid;grid-template-columns:1fr 1fr}.rx-review-pagination-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function isReviewColumn(column) {
    const title = column.querySelector('.rx-pipeline-column-head b')?.textContent?.trim().toLowerCase();
    return title === 'application review';
  }

  function applyToColumn(column) {
    if (!isReviewColumn(column)) return;
    const stack = column.querySelector('.rx-pipeline-stack');
    if (!stack) return;

    const cards = [...stack.children].filter(child => child.classList.contains('rx-pipeline-card'));
    stack.querySelector(':scope > .rx-review-pagination')?.remove();
    if (!cards.length) return;

    let visible = Number(column.dataset.rxReviewVisible || PAGE_SIZE);
    if (!Number.isFinite(visible) || visible < PAGE_SIZE) visible = PAGE_SIZE;
    visible = Math.min(visible, cards.length);
    column.dataset.rxReviewVisible = String(visible);

    cards.forEach((card, index) => { card.hidden = index >= visible; });
    if (cards.length <= PAGE_SIZE) return;

    const controls = document.createElement('div');
    controls.className = 'rx-review-pagination';
    controls.innerHTML = `
      <div class="rx-review-pagination-copy">Showing ${visible} of ${cards.length}</div>
      <div class="rx-review-pagination-actions">
        ${visible < cards.length ? `<button type="button" class="rx-review-pagination-btn primary" data-rx-review-load-more>Load 10 more</button><button type="button" class="rx-review-pagination-btn" data-rx-review-view-all>View all</button>` : `<button type="button" class="rx-review-pagination-btn" data-rx-review-show-less>Show first 10</button>`}
      </div>`;
    stack.appendChild(controls);
  }

  function applyAll() {
    if (applying) return;
    applying = true;
    document.querySelectorAll('.rx-pipeline-column').forEach(applyToColumn);
    applying = false;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-rx-review-load-more],[data-rx-review-view-all],[data-rx-review-show-less]');
    if (!button) return;
    const column = button.closest('.rx-pipeline-column');
    const cards = [...(column?.querySelectorAll('.rx-pipeline-stack > .rx-pipeline-card') || [])];
    if (!column || !cards.length) return;

    if (button.hasAttribute('data-rx-review-load-more')) {
      const current = Number(column.dataset.rxReviewVisible || PAGE_SIZE);
      column.dataset.rxReviewVisible = String(Math.min(current + PAGE_SIZE, cards.length));
    } else if (button.hasAttribute('data-rx-review-view-all')) {
      column.dataset.rxReviewVisible = String(cards.length);
    } else {
      column.dataset.rxReviewVisible = String(PAGE_SIZE);
    }
    applyToColumn(column);
  });

  const observer = new MutationObserver(() => {
    clearTimeout(window.__rxReviewPaginationTimer);
    window.__rxReviewPaginationTimer = setTimeout(applyAll, 40);
  });

  function init() {
    addStyles();
    const target = document.getElementById('rxEmployerPipelineView') || document.body;
    observer.observe(target, { childList: true, subtree: true });
    applyAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();