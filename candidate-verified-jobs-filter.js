(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerifiedJobsFilter) return;
  window.__rolexaVerifiedJobsFilter = true;

  let verifiedOnly = false;
  let refreshTimer = null;

  function addStyles() {
    if (document.getElementById('rxVerifiedJobsFilterStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerifiedJobsFilterStyles';
    style.textContent = `
      .rx-verified-filter{display:flex;align-items:center;gap:9px;border:1px solid rgba(34,160,107,.22);background:#f3fbf7;color:#176b49;border-radius:12px;padding:0 13px;min-height:43px;font-size:12px;font-weight:900;white-space:nowrap}
      .rx-verified-filter input{accent-color:#22a06b;width:16px;height:16px;margin:0}
      .rx-verified-explainer{display:flex;align-items:flex-start;gap:10px;margin:0 0 14px;padding:12px 14px;border:1px solid rgba(34,160,107,.18);background:#f3fbf7;border-radius:14px;color:#587064;font-size:12px;line-height:1.5}
      .rx-verified-explainer strong{display:block;color:#176b49;margin-bottom:2px}
      .rx-verified-explainer-icon{flex:0 0 auto;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#22a06b;color:#fff;font-weight:900}
      .rx-verified-empty{border:1px dashed rgba(34,160,107,.28);background:#f8fcfa;color:#587064;border-radius:15px;padding:24px;text-align:center;font-size:13px;line-height:1.5}
      @media(max-width:760px){.rx-verified-filter{width:100%;justify-content:center}.filters{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function addControls() {
    const filters = document.querySelector('#jobSearchPage .filters');
    if (!filters) return;

    if (!document.getElementById('rxVerifiedOnly')) {
      const control = document.createElement('label');
      control.className = 'rx-verified-filter';
      control.innerHTML = '<input id="rxVerifiedOnly" type="checkbox"><span>Verified jobs only</span>';
      filters.appendChild(control);
      control.querySelector('input').addEventListener('change', event => {
        verifiedOnly = event.target.checked;
        applyFilterAndRanking();
      });
    }

    if (!document.querySelector('.rx-verified-explainer')) {
      const explainer = document.createElement('div');
      explainer.className = 'rx-verified-explainer';
      explainer.innerHTML = '<span class="rx-verified-explainer-icon">✓</span><div><strong>What “Verified active” means</strong>Rolexa has confirmed the vacancy is active, has a disclosed salary, a clear review commitment, an expected hiring date and a promised candidate outcome. Verification expires unless the employer reconfirms it.</div>';
      filters.insertAdjacentElement('afterend', explainer);
    }
  }

  function isVerified(card) {
    return Boolean(card.dataset.rxVerifiedJob || card.querySelector('.rx-candidate-verified-badge'));
  }

  function sortContainer(container) {
    if (!container) return;
    const cards = [...container.querySelectorAll(':scope > .job')];
    cards.sort((a, b) => Number(isVerified(b)) - Number(isVerified(a)));
    cards.forEach(card => container.appendChild(card));
  }

  function applyFilterAndRanking() {
    const results = document.getElementById('jobResults');
    if (results) {
      const cards = [...results.querySelectorAll(':scope > .job')];
      cards.forEach(card => {
        card.style.display = verifiedOnly && !isVerified(card) ? 'none' : '';
      });
      sortContainer(results);

      let empty = results.querySelector('.rx-verified-empty');
      const visible = cards.filter(card => card.style.display !== 'none').length;
      if (verifiedOnly && !visible) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'rx-verified-empty';
          empty.textContent = 'No verified vacancies match your current search. Try changing a keyword, location or work-style filter.';
          results.appendChild(empty);
        }
      } else {
        empty?.remove();
      }
    }

    sortContainer(document.getElementById('recommendedJobs'));
    sortContainer(document.getElementById('savedJobsList'));
  }

  function boundedRefresh() {
    clearInterval(refreshTimer);
    let attempts = 0;
    addControls();
    applyFilterAndRanking();
    refreshTimer = setInterval(() => {
      addControls();
      applyFilterAndRanking();
      attempts += 1;
      if (attempts >= 10) clearInterval(refreshTimer);
    }, 350);
  }

  function bindRefreshes() {
    document.addEventListener('click', event => {
      const trigger = event.target.closest?.('[data-view="jobSearch"],[data-view="savedJobs"],button[onclick*="renderJobSearch"],button[onclick*="saveJob"],button[onclick*="removeSaved"]');
      if (trigger) setTimeout(boundedRefresh, 140);
    });
    document.getElementById('jobQuery')?.addEventListener('input', () => setTimeout(boundedRefresh, 100));
    document.getElementById('jobLocation')?.addEventListener('change', () => setTimeout(boundedRefresh, 100));
    document.getElementById('jobStyle')?.addEventListener('change', () => setTimeout(boundedRefresh, 100));
  }

  function init() {
    addStyles();
    addControls();
    bindRefreshes();
    boundedRefresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();