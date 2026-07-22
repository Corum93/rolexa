(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaEmployerAccountabilityOverview) return;
  window.__rolexaEmployerAccountabilityOverview = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;

  function addStyles() {
    if (document.getElementById('rxEmployerAccountabilityStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerAccountabilityStyles';
    style.textContent = `
      .rx-accountability-card{margin-top:16px;padding:22px;border-radius:22px;background:linear-gradient(135deg,#071025 0%,#10255b 100%);color:#fff;box-shadow:0 18px 44px rgba(7,16,37,.12)}
      .rx-accountability-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:18px}
      .rx-accountability-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8ca6ff;margin-bottom:7px}
      .rx-accountability-head h2{margin:0 0 6px;font-size:22px;color:#fff}
      .rx-accountability-head p{margin:0;color:#c7d3ff;font-size:13px;line-height:1.5;max-width:680px}
      .rx-accountability-score{min-width:112px;text-align:right}
      .rx-accountability-score strong{display:block;font-family:'Space Grotesk',sans-serif;font-size:42px;line-height:1;color:#fff}
      .rx-accountability-score span{display:inline-flex;margin-top:7px;padding:5px 9px;border-radius:999px;background:rgba(140,166,255,.16);color:#dbe3ff;font-size:11px;font-weight:900}
      .rx-accountability-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .rx-accountability-metric{padding:13px 14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:14px;min-width:0}
      .rx-accountability-metric small{display:block;color:#aab6d8;font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px}
      .rx-accountability-metric b{display:block;color:#fff;font-size:14px;line-height:1.35;overflow-wrap:anywhere}
      .rx-accountability-note{margin-top:13px;color:#aab6d8;font-size:11px;line-height:1.45}
      @media(max-width:900px){.rx-accountability-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.rx-accountability-head{display:block}.rx-accountability-score{text-align:left;margin-top:16px}.rx-accountability-metrics{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-accountability-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxAccountabilitySupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function percent(part, total) {
    if (!Number(total)) return '100%';
    return `${Math.round((Number(part || 0) / Number(total)) * 100)}%`;
  }

  function render(summary) {
    const page = document.getElementById('overviewPage');
    if (!page) return;

    document.getElementById('rxEmployerAccountabilityCard')?.remove();

    const card = document.createElement('section');
    card.id = 'rxEmployerAccountabilityCard';
    card.className = 'rx-accountability-card';
    card.innerHTML = `
      <div class="rx-accountability-head">
        <div>
          <div class="rx-accountability-kicker">Phase 3 · Employer accountability</div>
          <h2>Your hiring accountability</h2>
          <p>This score reflects review commitments, candidate outcomes and how consistently verified vacancies are kept active.</p>
        </div>
        <div class="rx-accountability-score">
          <strong>${Number(summary.accountability_score || 0)}/100</strong>
          <span>${summary.score_confidence || 'Building data'}</span>
        </div>
      </div>
      <div class="rx-accountability-metrics">
        <div class="rx-accountability-metric"><small>Reviewed within commitment</small><b>${Number(summary.reviewed_within_commitment || 0)} of ${Number(summary.review_eligible_applications || 0)} · ${percent(summary.reviewed_within_commitment, summary.review_eligible_applications)}</b></div>
        <div class="rx-accountability-metric"><small>Overdue applications</small><b>${Number(summary.overdue_awaiting_review || 0)}</b></div>
        <div class="rx-accountability-metric"><small>Final outcome rate</small><b>${percent(summary.applications_given_final_outcome, summary.applications_due_final_outcome)}</b></div>
        <div class="rx-accountability-metric"><small>Currently verified vacancies</small><b>${Number(summary.currently_verified_jobs || 0)} of ${Number(summary.total_jobs || 0)}</b></div>
      </div>
      <div class="rx-accountability-note">Scores remain provisional until Rolexa has enough genuine application activity to establish a reliable pattern. Candidate withdrawals are excluded from penalties.</div>
    `;

    const statGrid = page.querySelector('.grid');
    if (statGrid) statGrid.insertAdjacentElement('afterend', card);
    else page.appendChild(card);
  }

  async function loadSummary() {
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const { data, error } = await client
      .from('employer_accountability_summary')
      .select('accountability_score,score_confidence,reviewed_within_commitment,review_eligible_applications,overdue_awaiting_review,applications_due_final_outcome,applications_given_final_outcome,currently_verified_jobs,total_jobs')
      .eq('employer_user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) render(data);
  }

  async function init() {
    addStyles();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      await loadSummary();
    } catch (error) {
      console.warn('[Rolexa] Employer accountability card could not load', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();