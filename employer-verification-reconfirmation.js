(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerificationReconfirmation) return;
  window.__rolexaVerificationReconfirmation = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let currentUser = null;
  let rows = new Map();
  let refreshTimer = null;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function addStyles() {
    if (byId('rxVerificationReconfirmationStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerificationReconfirmationStyles';
    style.textContent = `
      .rx-reconfirm-panel{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:14px;border-radius:13px;padding:11px 12px;margin-top:8px;border:1px solid rgba(23,107,255,.14);background:#f5f8ff}
      .rx-reconfirm-panel strong{display:block;color:#172753;font-size:12px;margin-bottom:3px}.rx-reconfirm-panel span{display:block;color:#667085;font-size:11px;line-height:1.4}
      .rx-reconfirm-panel.warning{background:#fff8e8;border-color:rgba(229,138,0,.22)}.rx-reconfirm-panel.warning strong{color:#8a5600}
      .rx-reconfirm-panel.expired{background:#fff3f1;border-color:rgba(224,83,63,.22)}.rx-reconfirm-panel.expired strong{color:#a33327}
      .rx-reconfirm-button{border:0;background:#176bff;color:#fff;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:900;white-space:nowrap}.rx-reconfirm-button:hover{background:#4c74ff}.rx-reconfirm-button:disabled{opacity:.6;cursor:not-allowed}
      .rx-reconfirm-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10.5px;font-weight:900;background:#e9edff;color:#2946c7;white-space:nowrap}
      .rx-reconfirm-pill.warning{background:#fff3d6;color:#8a5600}.rx-reconfirm-pill.expired{background:#fbe4e1;color:#a33327}
      @media(max-width:760px){.rx-reconfirm-panel{align-items:flex-start;flex-direction:column}.rx-reconfirm-button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function showStatus(kind, message) {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${kind}`;
    bar.textContent = message;
    clearTimeout(window.__rxReconfirmStatusTimer);
    window.__rxReconfirmStatusTimer = setTimeout(() => {
      if (bar.textContent === message) {
        bar.className = 'statusbar';
        bar.textContent = '';
      }
    }, 4500);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-reconfirmation-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxReconfirmationSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function jobIdFromCard(card) {
    const editButton = [...card.querySelectorAll('button')].find(button => /rolexaEmployerEditJob/.test(button.getAttribute('onclick') || ''));
    return (editButton?.getAttribute('onclick') || '').match(/rolexaEmployerEditJob\('([^']+)'\)/)?.[1] || '';
  }

  function daysRemaining(value) {
    if (!value) return null;
    const deadline = new Date(value).getTime();
    if (!Number.isFinite(deadline)) return null;
    return Math.ceil((deadline - Date.now()) / 86400000);
  }

  function stateFor(row) {
    const days = daysRemaining(row.reconfirm_by);
    if (days === null) return { type: 'warning', label: 'Reconfirmation date missing', detail: 'Reconfirm this vacancy to keep its trust signals current.' };
    if (days <= 0) return { type: 'expired', label: 'Verification expired', detail: 'Candidates can no longer see this role as verified until it is reconfirmed.' };
    if (days <= 7) return { type: 'warning', label: `Verification expires in ${days} day${days === 1 ? '' : 's'}`, detail: 'Reconfirm now to prevent the verified status from disappearing.' };
    return { type: 'active', label: `Verified for ${days} more days`, detail: 'Rolexa will ask you to reconfirm that this vacancy is still active, funded and being reviewed.' };
  }

  function decorateCard(card) {
    const jobId = jobIdFromCard(card);
    const row = rows.get(String(jobId));
    card.querySelectorAll('.rx-reconfirm-panel,.rx-reconfirm-pill').forEach(element => element.remove());
    if (!row) return;

    const state = stateFor(row);
    const actions = card.querySelector('.rx-job-actions,.actions');
    actions?.insertAdjacentHTML('afterbegin', `<span class="rx-reconfirm-pill ${state.type === 'active' ? '' : state.type}">${safe(state.label)}</span>`);

    const panel = document.createElement('div');
    panel.className = `rx-reconfirm-panel ${state.type === 'active' ? '' : state.type}`;
    panel.innerHTML = `<div><strong>${safe(state.label)}</strong><span>${safe(state.detail)}</span></div><button class="rx-reconfirm-button" type="button" data-rx-reconfirm-job="${safe(jobId)}">Reconfirm vacancy</button>`;
    card.appendChild(panel);
  }

  function decorateCards() {
    document.querySelectorAll('#jobsList .rx-job-card, #overviewJobs .rx-job-card').forEach(decorateCard);
  }

  function boundedRefresh() {
    clearInterval(refreshTimer);
    let attempts = 0;
    decorateCards();
    refreshTimer = setInterval(() => {
      decorateCards();
      attempts += 1;
      if (attempts >= 8) clearInterval(refreshTimer);
    }, 350);
  }

  async function loadRows() {
    if (!client || !currentUser) return;
    const { data, error } = await client.from('job_verifications').select('*');
    if (error) throw error;
    rows = new Map((data || []).map(row => [String(row.job_id), row]));
    boundedRefresh();
  }

  async function reconfirm(jobId, button) {
    const row = rows.get(String(jobId));
    if (!row) return;

    const confirmed = window.confirm(
      'Please confirm that this vacancy still exists, the hiring budget remains approved, applications are actively reviewed, and every applicant will receive a final outcome.'
    );
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Reconfirming...';
    const now = new Date();
    const nextDeadline = new Date(now.getTime() + 30 * 86400000);

    const { error } = await client
      .from('job_verifications')
      .update({
        role_exists: true,
        budget_approved: true,
        applications_actively_reviewed: true,
        final_outcome_promised: true,
        verification_status: 'verified',
        last_confirmed_at: now.toISOString(),
        reconfirm_by: nextDeadline.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('job_id', jobId);

    if (error) {
      button.disabled = false;
      button.textContent = 'Reconfirm vacancy';
      showStatus('bad', error.message || 'The vacancy could not be reconfirmed.');
      return;
    }

    await loadRows();
    showStatus('good', 'Vacancy reconfirmed for another 30 days.');
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-rx-reconfirm-job]');
      if (button) {
        event.preventDefault();
        reconfirm(button.dataset.rxReconfirmJob, button).catch(error => {
          button.disabled = false;
          button.textContent = 'Reconfirm vacancy';
          showStatus('bad', error.message || 'The vacancy could not be reconfirmed.');
        });
        return;
      }
      const viewTrigger = event.target.closest?.('[data-view="jobs"],[data-view="overview"]');
      if (viewTrigger) setTimeout(boundedRefresh, 120);
    });
  }

  async function init() {
    addStyles();
    bindEvents();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const { data } = await client.auth.getSession();
      currentUser = data?.session?.user || null;
      if (!currentUser) return;
      await loadRows();
    } catch (error) {
      console.warn('[Rolexa] Verification reconfirmation could not load', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();