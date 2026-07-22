(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCandidateVerifiedJobs) return;
  window.__rolexaCandidateVerifiedJobs = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let verifiedJobs = [];
  let retryTimer = null;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalise = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function addStyles() {
    if (document.getElementById('rxCandidateVerifiedJobsStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateVerifiedJobsStyles';
    style.textContent = `
      .rx-candidate-verified-badge{display:inline-flex;align-items:center;gap:5px;background:#e1f6eb;color:#176b49;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;white-space:nowrap}
      .rx-candidate-verified-badge:before{content:'✓';display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:#22a06b;color:#fff;font-size:9px}
      .rx-candidate-trust{grid-column:2/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:2px;padding:11px 12px;border:1px solid rgba(34,160,107,.18);background:#f3fbf7;border-radius:13px}
      .rx-candidate-trust div{min-width:0}.rx-candidate-trust small{display:block;color:#667085;font-size:9px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;margin-bottom:3px}.rx-candidate-trust b{display:block;color:#176b49;font-size:11.5px;line-height:1.35;overflow-wrap:anywhere}
      .rx-candidate-trust-note{grid-column:1/-1;color:#587064;font-size:11px;line-height:1.4;padding-top:2px}
      @media(max-width:900px){.rx-candidate-trust{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.rx-candidate-trust{grid-column:1/-1;grid-template-columns:1fr 1fr}.rx-candidate-trust-note{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function formatDate(value) {
    if (!value) return 'Date not set';
    try {
      return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch {
      return value;
    }
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-candidate-verified-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxCandidateVerifiedSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function findMatchingVerification(card) {
    const title = normalise(card.querySelector('.item-title')?.textContent);
    const subtitle = normalise(card.querySelector('.item-sub')?.textContent);
    if (!title) return null;
    return verifiedJobs.find(job => normalise(job.title) === title && subtitle.includes(normalise(job.company))) || null;
  }

  function decorateCard(card) {
    const job = findMatchingVerification(card);
    card.querySelectorAll('.rx-candidate-verified-badge,.rx-candidate-trust').forEach(el => el.remove());
    delete card.dataset.rxVerifiedJob;
    if (!job) return;

    const actions = card.querySelector('.job-actions');
    actions?.insertAdjacentHTML('afterbegin', '<span class="rx-candidate-verified-badge">Verified active</span>');

    const trust = document.createElement('div');
    trust.className = 'rx-candidate-trust';
    trust.innerHTML = `
      <div><small>Salary transparency</small><b>${job.salary_range ? 'Salary disclosed' : 'Salary not shown'}</b></div>
      <div><small>Application review</small><b>${safe(job.first_review_commitment)}</b></div>
      <div><small>Expected hiring date</small><b>${safe(formatDate(job.expected_hiring_date))}</b></div>
      <div><small>Candidate outcome</small><b>${job.final_outcome_promised ? 'Final outcome promised' : 'Not confirmed'}</b></div>
      <div class="rx-candidate-trust-note">Rolexa has verified that this vacancy is active and currently within its confirmation period.</div>`;
    card.appendChild(trust);
    card.dataset.rxVerifiedJob = String(job.job_id);
  }

  function decorateVisibleCards() {
    document.querySelectorAll('#jobResults .job, #recommendedJobs .job, #savedJobsList .job').forEach(decorateCard);
  }

  function boundedRefresh() {
    clearInterval(retryTimer);
    let attempts = 0;
    decorateVisibleCards();
    retryTimer = setInterval(() => {
      decorateVisibleCards();
      attempts += 1;
      if (attempts >= 10) clearInterval(retryTimer);
    }, 350);
  }

  async function loadVerifiedJobs() {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) return;

    const { data: verifications, error: verificationError } = await client
      .from('candidate_verified_jobs')
      .select('job_id,first_review_commitment,expected_hiring_date,final_outcome_promised,verified_at,reconfirm_by');
    if (verificationError) throw verificationError;

    const ids = (verifications || []).map(row => row.job_id);
    if (!ids.length) {
      verifiedJobs = [];
      boundedRefresh();
      return;
    }

    const { data: jobs, error: jobsError } = await client
      .from('jobs')
      .select('id,title,company,salary_range')
      .in('id', ids);
    if (jobsError) throw jobsError;

    const jobMap = new Map((jobs || []).map(job => [String(job.id), job]));
    verifiedJobs = (verifications || []).map(row => ({ ...row, ...(jobMap.get(String(row.job_id)) || {}) }));
    boundedRefresh();
  }

  function bindSafeRefreshes() {
    document.addEventListener('click', event => {
      const trigger = event.target.closest?.('[data-view="jobSearch"],[data-view="savedJobs"],button[onclick*="renderJobSearch"],button[onclick*="saveJob"],button[onclick*="removeSaved"]');
      if (trigger) setTimeout(boundedRefresh, 120);
    });
    document.getElementById('jobQuery')?.addEventListener('input', () => setTimeout(boundedRefresh, 80));
    document.getElementById('jobLocation')?.addEventListener('change', () => setTimeout(boundedRefresh, 80));
    document.getElementById('jobStyle')?.addEventListener('change', () => setTimeout(boundedRefresh, 80));
  }

  async function init() {
    addStyles();
    bindSafeRefreshes();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      await loadVerifiedJobs();
    } catch (error) {
      console.warn('[Rolexa] Candidate verified jobs could not load', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();