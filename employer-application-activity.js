(() => {
  if (window.__rolexaEmployerApplicationActivity) return;
  window.__rolexaEmployerApplicationActivity = true;

  let client = null;
  let currentUser = null;
  let activityMap = new Map();
  let loading = false;
  let scheduled = null;

  const safe = value => String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));

  function addStyles(){
    if (document.getElementById('rxEmployerActivityStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerActivityStyles';
    style.textContent = `
      .rx-activity-panel{grid-column:1/-1;border-top:1px solid rgba(7,16,37,.08);padding-top:12px;margin-top:2px}
      .rx-activity-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
      .rx-activity-heading b{font-size:13px;color:#071025}
      .rx-activity-heading span{font-size:11.5px;color:#71809C;font-weight:800}
      .rx-activity-list{display:grid;gap:8px}
      .rx-activity-item{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:9px;align-items:start}
      .rx-activity-dot{width:9px;height:9px;border-radius:50%;background:#176BFF;margin-top:4px;box-shadow:0 0 0 4px #E9EDFF}
      .rx-activity-item:first-child .rx-activity-dot{background:#22A06B;box-shadow:0 0 0 4px #E1F6EB}
      .rx-activity-message{font-size:12.5px;font-weight:850;color:#26324C;line-height:1.35;overflow-wrap:anywhere}
      .rx-activity-role{display:block;margin-top:2px;color:#71809C;font-size:11px;font-weight:700;text-transform:capitalize}
      .rx-activity-time{font-size:11px;color:#71809C;font-weight:750;white-space:nowrap;text-align:right;line-height:1.35}
      .rx-activity-empty{font-size:12px;color:#71809C;line-height:1.4}
      @media(max-width:760px){
        .rx-activity-item{grid-template-columns:12px minmax(0,1fr)}
        .rx-activity-time{grid-column:2;text-align:left;white-space:normal;margin-top:-4px}
      }
      @media(max-width:420px){
        .rx-activity-heading{display:grid;gap:3px}
        .rx-activity-panel{padding-top:11px}
      }
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase(){
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  async function readConfig(){
    for (const file of ['candidate-profile-sync.js', 'employer-job-sync.js?v=2']) {
      try {
        const response = await fetch(file, { cache: 'no-store' });
        const text = await response.text();
        const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
        const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
        if (url && key) return { url, key };
      } catch (error) {}
    }
    throw new Error('Supabase config could not be found.');
  }

  function formatDate(value){
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    const day = date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    const time = date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    return `${day}<br>${time}`;
  }

  function roleLabel(role){
    if (role === 'historic_backfill' || role === 'system') return 'Recorded by Rolexa';
    if (role === 'employer') return 'Employer update';
    if (role === 'candidate') return 'Candidate update';
    if (role === 'admin') return 'Rolexa admin update';
    return 'Activity update';
  }

  function activityHtml(applicationId){
    const rows = activityMap.get(applicationId) || [];
    if (!rows.length) {
      return `<div class="rx-activity-panel" data-rx-activity-for="${safe(applicationId)}"><div class="rx-activity-heading"><b>Activity</b><span>No recorded changes yet</span></div><div class="rx-activity-empty">Future stage and status updates will appear here automatically.</div></div>`;
    }
    const visibleRows = rows.slice(0, 6);
    const items = visibleRows.map(row => `
      <div class="rx-activity-item">
        <span class="rx-activity-dot" aria-hidden="true"></span>
        <div><div class="rx-activity-message">${safe(row.activity_message || 'Application updated')}</div><span class="rx-activity-role">${safe(roleLabel(row.changed_by_role))}</span></div>
        <div class="rx-activity-time">${formatDate(row.created_at)}</div>
      </div>
    `).join('');
    const countLabel = rows.length === 1 ? '1 update' : `${rows.length} updates`;
    return `<div class="rx-activity-panel" data-rx-activity-for="${safe(applicationId)}"><div class="rx-activity-heading"><b>Activity</b><span>${safe(countLabel)}</span></div><div class="rx-activity-list">${items}</div></div>`;
  }

  function attachTimelines(){
    document.querySelectorAll('.rx-app-card').forEach(card => {
      const idSource = card.querySelector('[data-review-profile]');
      const applicationId = idSource?.getAttribute('data-review-profile');
      if (!applicationId) return;
      card.querySelectorAll('.rx-activity-panel').forEach(panel => panel.remove());
      const actions = card.querySelector('.rx-app-actions');
      if (actions) actions.insertAdjacentHTML('beforebegin', activityHtml(applicationId));
      else card.insertAdjacentHTML('beforeend', activityHtml(applicationId));
    });
  }

  async function loadActivity(){
    if (!client || !currentUser || loading) return;
    loading = true;
    try {
      const jobResult = await client.from('jobs').select('id').eq('employer_user_id', currentUser.id);
      if (jobResult.error) throw jobResult.error;
      const jobIds = (jobResult.data || []).map(job => job.id).filter(Boolean);
      if (!jobIds.length) {
        activityMap = new Map();
        attachTimelines();
        return;
      }
      const result = await client
        .from('application_activity')
        .select('application_id,event_type,activity_message,changed_by_role,created_at')
        .in('job_id', jobIds)
        .order('created_at', { ascending:false });
      if (result.error) throw result.error;
      const nextMap = new Map();
      (result.data || []).forEach(row => {
        if (!nextMap.has(row.application_id)) nextMap.set(row.application_id, []);
        nextMap.get(row.application_id).push(row);
      });
      activityMap = nextMap;
      attachTimelines();
    } catch (error) {
      console.warn('[Rolexa] Employer application activity could not load:', error?.message || error);
    } finally {
      loading = false;
    }
  }

  function scheduleAttach(reload = false){
    clearTimeout(scheduled);
    scheduled = setTimeout(async () => {
      if (reload) await loadActivity();
      else attachTimelines();
    }, 120);
  }

  async function init(){
    addStyles();
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url, config.key);
      const session = await client.auth.getSession();
      currentUser = session.data?.session?.user || null;
      if (!currentUser) return;
      await loadActivity();

      const targets = [document.getElementById('matchesList'), document.getElementById('overviewMatches')].filter(Boolean);
      targets.forEach(target => new MutationObserver(() => scheduleAttach(false)).observe(target, { childList:true, subtree:true }));

      document.addEventListener('click', event => {
        if (event.target?.closest('[data-stage-app-id], [data-app-id][data-next-status]')) {
          setTimeout(() => scheduleAttach(true), 900);
        }
        if (event.target?.closest('[data-view="matches"]')) scheduleAttach(true);
      });
    } catch (error) {
      console.warn('[Rolexa] Employer activity timeline could not initialise:', error?.message || error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
