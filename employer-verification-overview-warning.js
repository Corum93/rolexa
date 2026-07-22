(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerificationOverviewWarning) return;
  window.__rolexaVerificationOverviewWarning = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let warningRows = [];
  let refreshTimer = null;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function addStyles() {
    if (document.getElementById('rxVerificationOverviewWarningStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerificationOverviewWarningStyles';
    style.textContent = `
      .rx-verification-overview-alert{margin:0 0 18px;padding:16px 18px;border-radius:18px;border:1px solid #f0c36a;background:#fff8e8;box-shadow:0 10px 30px rgba(7,16,37,.05)}
      .rx-verification-overview-alert.expired{border-color:#efaaa0;background:#fff3f1}
      .rx-verification-overview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:10px}
      .rx-verification-overview-head h2{font-size:18px;margin:0;color:#6b4200}.rx-verification-overview-alert.expired h2{color:#9f2f23}
      .rx-verification-overview-head p{font-size:13px;line-height:1.45;color:#6b5a32;margin:4px 0 0}.rx-verification-overview-alert.expired p{color:#7d4942}
      .rx-verification-warning-list{display:grid;gap:8px}.rx-verification-warning-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px;border-radius:13px;background:rgba(255,255,255,.76);border:1px solid rgba(7,16,37,.07)}
      .rx-verification-warning-title{font-size:13px;font-weight:900;color:#0a1738}.rx-verification-warning-meta{font-size:12px;color:#6b7280;margin-top:3px}
      .rx-verification-reconfirm{border:0;background:#176bff;color:#fff;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:900;white-space:nowrap}.rx-verification-reconfirm:disabled{opacity:.65;cursor:not-allowed}
      @media(max-width:760px){.rx-verification-overview-head,.rx-verification-warning-row{display:block}.rx-verification-reconfirm{margin-top:10px;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-verification-overview-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxVerificationOverviewSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function daysRemaining(value) {
    if (!value) return null;
    const difference = new Date(value).getTime() - Date.now();
    return Math.ceil(difference / 86400000);
  }

  function render() {
    const overview = document.getElementById('overviewPage');
    if (!overview) return;
    overview.querySelector('#rxVerificationOverviewAlert')?.remove();
    if (!warningRows.length) return;

    const hasExpired = warningRows.some(row => row.days <= 0);
    const alert = document.createElement('section');
    alert.id = 'rxVerificationOverviewAlert';
    alert.className = `rx-verification-overview-alert${hasExpired ? ' expired' : ''}`;
    alert.innerHTML = `
      <div class="rx-verification-overview-head">
        <div>
          <h2>${hasExpired ? 'Verified vacancy requires attention' : 'Verification expiry approaching'}</h2>
          <p>${hasExpired ? 'One or more vacancies are no longer shown to candidates as verified. Reconfirm them to restore the trust badge.' : 'Reconfirm these vacancies before their verification expires.'}</p>
        </div>
      </div>
      <div class="rx-verification-warning-list">
        ${warningRows.map(row => `<div class="rx-verification-warning-row"><div><div class="rx-verification-warning-title">${safe(row.title || 'Vacancy')}</div><div class="rx-verification-warning-meta">${row.days <= 0 ? 'Verification expired' : `${row.days} day${row.days === 1 ? '' : 's'} remaining`}</div></div><button class="rx-verification-reconfirm" type="button" data-job-id="${safe(row.job_id)}">Reconfirm now</button></div>`).join('')}
      </div>`;

    const pageHead = overview.querySelector('.page-head');
    if (pageHead) pageHead.insertAdjacentElement('afterend', alert);
    else overview.prepend(alert);
  }

  async function loadWarnings() {
    if (!client || !user) return;
    const { data: verifications, error } = await client
      .from('job_verifications')
      .select('job_id,verification_status,reconfirm_by')
      .in('verification_status', ['verified', 'expired']);
    if (error) throw error;

    const candidates = (verifications || [])
      .map(row => ({ ...row, days: daysRemaining(row.reconfirm_by) }))
      .filter(row => row.days !== null && row.days <= 7);

    if (!candidates.length) {
      warningRows = [];
      render();
      return;
    }

    const ids = candidates.map(row => row.job_id);
    const { data: jobs, error: jobsError } = await client
      .from('jobs')
      .select('id,title')
      .in('id', ids);
    if (jobsError) throw jobsError;
    const titleMap = new Map((jobs || []).map(job => [String(job.id), job.title]));
    warningRows = candidates
      .map(row => ({ ...row, title: titleMap.get(String(row.job_id)) || 'Vacancy' }))
      .sort((a, b) => a.days - b.days);
    render();
  }

  async function reconfirm(jobId, button) {
    const row = warningRows.find(item => String(item.job_id) === String(jobId));
    if (!row) return;
    const confirmed = window.confirm(`Reconfirm ${row.title}?\n\nPlease confirm the vacancy still exists, the budget remains approved, applications are actively reviewed, and every applicant will receive a final outcome.`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Reconfirming…';
    const now = new Date();
    const reconfirmBy = new Date(now.getTime() + 30 * 86400000).toISOString();
    const { error } = await client
      .from('job_verifications')
      .update({
        verification_status: 'verified',
        role_exists: true,
        budget_approved: true,
        applications_actively_reviewed: true,
        final_outcome_promised: true,
        last_confirmed_at: now.toISOString(),
        reconfirm_by: reconfirmBy,
        updated_at: now.toISOString()
      })
      .eq('job_id', jobId);

    if (error) {
      console.warn('[Rolexa] Overview reconfirmation failed', error);
      button.disabled = false;
      button.textContent = 'Try again';
      window.alert('Rolexa could not reconfirm this vacancy. Please try again.');
      return;
    }

    await loadWarnings();
    window.alert('Vacancy reconfirmed for another 30 days.');
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('.rx-verification-reconfirm');
      if (button) {
        event.preventDefault();
        reconfirm(button.dataset.jobId, button);
        return;
      }
      const overviewTrigger = event.target.closest?.('[data-view="overview"]');
      if (overviewTrigger) setTimeout(() => { render(); loadWarnings().catch(console.warn); }, 120);
    });
  }

  function boundedInitialRender() {
    clearInterval(refreshTimer);
    let attempts = 0;
    render();
    refreshTimer = setInterval(() => {
      render();
      attempts += 1;
      if (attempts >= 8) clearInterval(refreshTimer);
    }, 350);
  }

  async function init() {
    addStyles();
    bindEvents();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const { data } = await client.auth.getSession();
      user = data?.session?.user || null;
      if (!user) return;
      await loadWarnings();
      boundedInitialRender();
    } catch (error) {
      console.warn('[Rolexa] Verification overview warning could not load', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
