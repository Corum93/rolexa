(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCandidateApplicationActivity) return;
  window.__rolexaCandidateApplicationActivity = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let currentUser = null;
  let applicationRows = [];
  let activityMap = new Map();
  let loading = false;
  let scheduled = null;

  const safe = value => String(value ?? '').replace(/[&<>"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[character]));

  function addStyles() {
    if (document.getElementById('rxCandidateApplicationActivityStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateApplicationActivityStyles';
    style.textContent = `
      .rx-candidate-activity{grid-column:1/-1;border-top:1px solid rgba(7,16,37,.08);margin-top:3px;padding-top:12px;min-width:0}
      .rx-candidate-activity-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
      .rx-candidate-activity-head b{font-size:13px;color:#071025}
      .rx-candidate-activity-head span{font-size:11.5px;color:#71809C;font-weight:800}
      .rx-candidate-activity-list{display:grid;gap:8px}
      .rx-candidate-activity-item{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:9px;align-items:start}
      .rx-candidate-activity-dot{width:9px;height:9px;border-radius:50%;background:#176BFF;margin-top:4px;box-shadow:0 0 0 4px #E9EDFF}
      .rx-candidate-activity-item:first-child .rx-candidate-activity-dot{background:#22A06B;box-shadow:0 0 0 4px #E1F6EB}
      .rx-candidate-activity-message{font-size:12.5px;font-weight:850;color:#26324C;line-height:1.35;overflow-wrap:anywhere}
      .rx-candidate-activity-source{display:block;margin-top:2px;color:#71809C;font-size:11px;font-weight:700}
      .rx-candidate-activity-time{font-size:11px;color:#71809C;font-weight:750;white-space:nowrap;text-align:right;line-height:1.35}
      .rx-candidate-activity-empty{font-size:12px;color:#71809C;line-height:1.45}
      @media(max-width:760px){
        .rx-candidate-activity{padding-top:11px}
        .rx-candidate-activity-item{grid-template-columns:12px minmax(0,1fr)}
        .rx-candidate-activity-time{grid-column:2;text-align:left;white-space:normal;margin-top:-4px}
      }
      @media(max-width:420px){
        .rx-candidate-activity-head{display:grid;gap:3px}
      }
    `;
    document.head.appendChild(style);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-candidate-activity-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxCandidateActivitySupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load.'));
      document.head.appendChild(script);
    });
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    const day = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const time = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${day}<br>${time}`;
  }

  function sourceLabel(role) {
    if (role === 'employer') return 'Updated by the employer';
    if (role === 'candidate') return 'Your update';
    if (role === 'admin') return 'Rolexa support update';
    return 'Recorded by Rolexa';
  }

  function activityHtml(applicationId) {
    const rows = activityMap.get(applicationId) || [];
    if (!rows.length) {
      return `
        <section class="rx-candidate-activity" data-rx-candidate-activity-for="${safe(applicationId)}">
          <div class="rx-candidate-activity-head"><b>Activity</b><span>No recorded changes yet</span></div>
          <div class="rx-candidate-activity-empty">Updates to this application will appear here automatically.</div>
        </section>
      `;
    }

    const visibleRows = rows.slice(0, 6);
    const items = visibleRows.map(row => `
      <div class="rx-candidate-activity-item">
        <span class="rx-candidate-activity-dot" aria-hidden="true"></span>
        <div>
          <div class="rx-candidate-activity-message">${safe(row.activity_message || 'Application updated')}</div>
          <span class="rx-candidate-activity-source">${safe(sourceLabel(row.changed_by_role))}</span>
        </div>
        <div class="rx-candidate-activity-time">${formatDate(row.created_at)}</div>
      </div>
    `).join('');
    const count = rows.length === 1 ? '1 update' : `${rows.length} updates`;

    return `
      <section class="rx-candidate-activity" data-rx-candidate-activity-for="${safe(applicationId)}">
        <div class="rx-candidate-activity-head"><b>Activity</b><span>${safe(count)}</span></div>
        <div class="rx-candidate-activity-list">${items}</div>
      </section>
    `;
  }

  function attachActivity() {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    const cards = [...container.querySelectorAll('.rx-app-card-live')];
    cards.forEach((card, index) => {
      const application = applicationRows[index];
      if (!application?.id) return;
      card.querySelectorAll('.rx-candidate-activity').forEach(panel => panel.remove());
      card.insertAdjacentHTML('beforeend', activityHtml(application.id));
    });
  }

  async function loadActivity() {
    if (!client || !currentUser || loading) return;
    loading = true;
    try {
      const applicationsResult = await client
        .from('candidate_applications')
        .select('id,job_id,status,updated_at,applied_at')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });
      if (applicationsResult.error) throw applicationsResult.error;

      applicationRows = applicationsResult.data || [];
      const applicationIds = applicationRows.map(application => application.id).filter(Boolean);
      if (!applicationIds.length) {
        activityMap = new Map();
        attachActivity();
        return;
      }

      const activityResult = await client
        .from('application_activity')
        .select('application_id,activity_message,changed_by_role,created_at')
        .in('application_id', applicationIds)
        .order('created_at', { ascending: false });
      if (activityResult.error) throw activityResult.error;

      const nextMap = new Map();
      (activityResult.data || []).forEach(row => {
        if (!nextMap.has(row.application_id)) nextMap.set(row.application_id, []);
        nextMap.get(row.application_id).push(row);
      });
      activityMap = nextMap;
      attachActivity();
    } catch (error) {
      console.warn('[Rolexa] Candidate application activity could not load:', error?.message || error);
    } finally {
      loading = false;
    }
  }

  function schedule(reload = false) {
    clearTimeout(scheduled);
    scheduled = setTimeout(async () => {
      if (reload) await loadActivity();
      else attachActivity();
    }, 140);
  }

  async function init() {
    addStyles();
    try {
      const library = await loadSupabase();
      client = library.createClient(CONFIG.url, CONFIG.key);
      const session = await client.auth.getSession();
      currentUser = session.data?.session?.user || null;
      if (!currentUser) return;
      await loadActivity();

      const container = document.getElementById('applicationsList');
      if (container) {
        new MutationObserver(() => schedule(false)).observe(container, {
          childList: true,
          subtree: true
        });
      }

      document.addEventListener('click', event => {
        if (event.target?.closest('[data-view="applications"]')) schedule(true);
      });
    } catch (error) {
      console.warn('[Rolexa] Candidate activity timeline could not initialise:', error?.message || error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
