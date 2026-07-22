(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerifiedJobBadges) return;
  window.__rolexaVerifiedJobBadges = true;

  const STATUS_KEY = 'rolexa_verified_job_status_v1';
  const DRAFT_KEY = 'rolexa_verified_job_draft_v1';
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  const write = (key,value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function addStyles(){
    if (document.getElementById('rxVerifiedJobBadgeStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerifiedJobBadgeStyles';
    style.textContent = `
      .rx-job-verified-badge{display:inline-flex;align-items:center;gap:6px;background:#e1f6eb;color:#176b49;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900}
      .rx-job-verified-badge:before{content:'✓';display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;border-radius:50%;background:#22a06b;color:#fff;font-size:10px}
      .rx-job-verification-details{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border:1px solid rgba(34,160,107,.16);background:linear-gradient(135deg,#effaf5,#fbfffd);border-radius:14px;padding:11px 12px;margin-top:2px}
      .rx-job-verification-detail{min-width:0}.rx-job-verification-detail small{display:block;color:#667085;font-size:10px;font-weight:900;letter-spacing:.045em;text-transform:uppercase;margin-bottom:3px}.rx-job-verification-detail b{display:block;color:#176b49;font-size:12px;line-height:1.35;overflow-wrap:anywhere}
      @media(max-width:760px){.rx-job-verification-details{grid-template-columns:1fr}.rx-job-verified-badge{font-size:10.5px}}
    `;
    document.head.appendChild(style);
  }

  function rememberJobMetadata(){
    const form = document.getElementById('jobForm');
    if (!form || form.dataset.rxVerifiedMetadataAttached === 'true') return;
    form.dataset.rxVerifiedMetadataAttached = 'true';
    form.addEventListener('submit', () => {
      setTimeout(() => {
        const status = read(STATUS_KEY);
        if (!status.status) return;
        status.jobTitle = document.getElementById('jobTitle')?.value?.trim() || status.jobTitle || '';
        status.company = document.getElementById('company')?.value?.trim() || status.company || '';
        status.salary = document.getElementById('salaryRange')?.value?.trim() || status.salary || '';
        write(STATUS_KEY,status);
        decorateCards();
      }, 80);
    }, true);
  }

  function cardTitle(card){
    return card.querySelector('.item-title')?.textContent?.trim() || '';
  }

  function decorateCard(card,status){
    if (!card || card.dataset.rxVerifiedDecorated === 'true') return;
    card.dataset.rxVerifiedDecorated = 'true';

    const actions = card.querySelector('.rx-job-actions, .actions');
    if (actions && !actions.querySelector('.rx-job-verified-badge')) {
      actions.insertAdjacentHTML('afterbegin','<span class="rx-job-verified-badge">Verified active</span>');
    }

    if (!card.querySelector('.rx-job-verification-details')) {
      const draft = read(DRAFT_KEY);
      const owner = status.owner || draft.rxHiringOwner || 'Named hiring owner';
      const review = status.review || draft.rxReviewDays || 'Review timeframe confirmed';
      const hiringDate = status.hiringDate || draft.rxHiringDate || 'Hiring date confirmed';
      card.insertAdjacentHTML('beforeend', `<div class="rx-job-verification-details"><div class="rx-job-verification-detail"><small>Hiring owner</small><b>${esc(owner)}</b></div><div class="rx-job-verification-detail"><small>Candidate review promise</small><b>${esc(review)}</b></div><div class="rx-job-verification-detail"><small>Expected hiring date</small><b>${esc(hiringDate)}</b></div></div>`);
    }
  }

  function decorateCards(){
    const status = read(STATUS_KEY);
    if (!/verified/i.test(status.status || '')) return;
    const cards = [...document.querySelectorAll('#jobsList .rx-job-card, #overviewJobs .rx-job-card')];
    if (!cards.length) return;

    let matches = cards;
    if (status.jobTitle) {
      const exact = cards.filter(card => cardTitle(card).toLowerCase() === String(status.jobTitle).toLowerCase());
      if (exact.length) matches = exact;
    } else {
      matches = cards.slice(0,1);
    }
    matches.forEach(card => decorateCard(card,status));
  }

  addStyles();
  rememberJobMetadata();
  const observer = new MutationObserver(() => { rememberJobMetadata(); decorateCards(); });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  decorateCards();
})();