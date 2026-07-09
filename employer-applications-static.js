(() => {
  let client = null;
  let currentUser = null;
  let applications = [];
  let loadError = '';

  function byId(id){ return document.getElementById(id); }
  function safe(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
  function initials(name){ return String(name || 'Candidate').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0,2).toUpperCase() || 'C'; }
  function shortId(value){ return String(value || 'candidate').slice(0,8); }
  function dateText(value){ try { return value ? new Date(value).toLocaleDateString('en-GB') : 'Date not available'; } catch(e){ return 'Date not available'; } }

  function emptyHtml(){ return '<div class="empty">No real applications yet. When a candidate applies to one of your jobs, they will appear here. Demo candidates have been removed.</div>'; }

  function showStatus(message, type = 'info') {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4500);
  }

  function applyApplicationsLabels(){
    const nav = document.querySelector('[data-view="matches"]');
    if (nav) nav.textContent = 'Applications';
    const page = byId('matchesPage');
    if (page) {
      const h1 = page.querySelector('h1');
      const p = page.querySelector('.page-head p');
      if (h1) h1.textContent = 'Applications';
      if (p) p.textContent = 'Real candidates who have applied to jobs owned by this employer account.';
    }
    const stats = document.querySelectorAll('#overviewPage .stat');
    if (stats[1]) {
      const label = stats[1].querySelector('span:first-child');
      const note = stats[1].querySelector('span:last-child');
      if (label) label.textContent = 'Applications';
      if (note) note.textContent = 'Real applications from Supabase.';
    }
    const overviewCard = byId('overviewMatches')?.closest('.card');
    if (overviewCard) {
      const h2 = overviewCard.querySelector('h2');
      if (h2) h2.textContent = 'Latest applications';
    }
    const sideCopy = document.querySelector('.side-card p');
    if (sideCopy) sideCopy.textContent = 'Post a job, review real applications, shortlist profiles and start a conversation.';
    const search = byId('globalSearch');
    if (search) search.placeholder = 'Search jobs, applications, candidates...';
  }

  function addStyles(){
    if (byId('rxApplicationsLiveStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxApplicationsLiveStyles';
    style.textContent = `.rx-app-card{grid-template-columns:45px minmax(0,1fr) auto;align-items:flex-start}.rx-app-main{min-width:0;display:grid;gap:5px}.rx-app-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px;font-weight:900;color:#071025}.rx-app-meta{font-size:12.5px;color:#6B7280;line-height:1.45}.rx-app-meta b{color:#26324C}.rx-app-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.rx-app-warning{grid-column:1/-1;border:1px solid rgba(224,83,63,.18);background:#FFF8F6;border-radius:13px;padding:10px 11px;font-size:12.8px;line-height:1.45;color:#A33327}.rx-status-btn{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}.rx-status-btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}.rx-status-btn.danger{border-color:rgba(224,83,63,.25);color:#A33327;background:#FFF8F6}.rx-status-btn:disabled{opacity:.6;cursor:not-allowed}@media(max-width:760px){.rx-app-card{grid-template-columns:42px 1fr}.rx-app-actions{grid-column:2;justify-content:flex-start}.rx-app-warning{grid-column:1/-1}}`;
    document.head.appendChild(style);
  }

  async function loadSupabase(){
    if (window.supabase && window.supabase.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.supabase;
  }

  async function readConfig(){
    const files = ['candidate-profile-sync.js', 'employer-job-sync.js?v=2'];
    for (const file of files) {
      try {
        const res = await fetch(file, { cache: 'no-store' });
        const text = await res.text();
        const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
        const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
        if (url && key) return { url, key };
      } catch(e) {}
    }
    throw new Error('Supabase config could not be found.');
  }

  async function loadApplications(){
    applications = [];
    loadError = '';
    if (!client || !currentUser) return;
    const jobsRes = await client.from('jobs').select('id,title,company').eq('employer_user_id', currentUser.id).order('created_at', { ascending:false });
    if (jobsRes.error) { loadError = jobsRes.error.message || 'Could not load employer jobs.'; return; }
    const jobs = jobsRes.data || [];
    const jobIds = jobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) return;
    const appsRes = await client.from('candidate_applications').select('id,user_id,job_id,status,applied_at,updated_at').in('job_id', jobIds).order('applied_at', { ascending:false });
    if (appsRes.error) { loadError = appsRes.error.message || 'Could not load applications.'; return; }
    const apps = appsRes.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    let profileWarning = '';
    if (userIds.length) {
      const pRes = await client.from('candidate_profiles').select('user_id,full_name,email,target_role,location,work_style,skills,has_cv,cv_file_name').in('user_id', userIds);
      if (pRes.error) profileWarning = pRes.error.message || 'Candidate profile access blocked.';
      else profiles = pRes.data || [];
    }
    const jobMap = new Map(jobs.map(job => [job.id, job]));
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
    applications = apps.map(app => ({ app, job: jobMap.get(app.job_id) || {}, profile: profileMap.get(app.user_id) || {}, profileWarning }));
  }

  function actionButtons(app){
    const id = safe(app.id);
    const status = app.status || 'Applied';
    const buttons = [];
    if (status === 'Applied') {
      buttons.push(`<button class="rx-status-btn primary" type="button" data-app-id="${id}" data-next-status="Shortlisted">Shortlist</button>`);
      buttons.push(`<button class="rx-status-btn danger" type="button" data-app-id="${id}" data-next-status="Rejected">Reject</button>`);
    } else if (status === 'Shortlisted') {
      buttons.push(`<button class="rx-status-btn primary" type="button" data-app-id="${id}" data-next-status="Interview">Move to interview</button>`);
      buttons.push(`<button class="rx-status-btn danger" type="button" data-app-id="${id}" data-next-status="Rejected">Reject</button>`);
    } else if (status === 'Interview') {
      buttons.push(`<button class="rx-status-btn primary" type="button" data-app-id="${id}" data-next-status="Offer">Make offer</button>`);
      buttons.push(`<button class="rx-status-btn danger" type="button" data-app-id="${id}" data-next-status="Rejected">Reject</button>`);
    } else if (status === 'Offer') {
      buttons.push(`<button class="rx-status-btn primary" type="button" data-app-id="${id}" data-next-status="Hired">Mark hired</button>`);
      buttons.push(`<button class="rx-status-btn danger" type="button" data-app-id="${id}" data-next-status="Rejected">Reject</button>`);
    } else {
      buttons.push(`<span class="tag blue">${safe(status)}</span>`);
    }
    return buttons.join('');
  }

  function appCard(row){
    const app = row.app || {};
    const job = row.job || {};
    const profile = row.profile || {};
    const name = profile.full_name || profile.email || `Candidate ${shortId(app.user_id)}`;
    const status = app.status || 'Applied';
    const role = profile.target_role || 'Candidate profile';
    const location = profile.location || 'Location not added';
    const style = profile.work_style || 'Work style not added';
    const skills = profile.skills || 'Skills not added yet';
    const cv = profile.has_cv || profile.cv_file_name ? 'CV uploaded' : 'No CV uploaded yet';
    const warning = row.profileWarning ? `<div class="rx-app-warning"><b>Profile access warning:</b> ${safe(row.profileWarning)}. The application is real, but Supabase may still need profile read access for applicant names.</div>` : '';
    return `<div class="item rx-app-card"><div class="logo green">${safe(initials(name))}</div><div class="rx-app-main"><div class="rx-app-title">${safe(name)} <span class="tag blue">${safe(status)}</span></div><div class="rx-app-meta">Applied for <b>${safe(job.title || app.job_id)}</b>${job.company ? ' at ' + safe(job.company) : ''} · ${safe(dateText(app.applied_at || app.updated_at))}</div><div class="rx-app-meta">${safe(role)} · ${safe(location)} · ${safe(style)}</div><div class="rx-app-meta"><b>Skills:</b> ${safe(skills)}</div><div class="rx-app-meta"><b>Candidate file:</b> ${safe(cv)}</div></div><div class="rx-app-actions">${actionButtons(app)}</div>${warning}</div>`;
  }

  function renderApplications(){
    applyApplicationsLabels();
    const count = applications.length;
    const shortlisted = applications.filter(row => row.app.status === 'Shortlisted').length;
    if (byId('matchCount')) byId('matchCount').textContent = count;
    if (byId('shortlistCount')) byId('shortlistCount').textContent = shortlisted;
    const html = loadError ? `<div class="empty">Could not load real applications from Supabase.<br><br>${safe(loadError)}</div>` : (applications.length ? applications.map(appCard).join('') : emptyHtml());
    [byId('matchesList'), byId('overviewMatches')].filter(Boolean).forEach(target => { target.innerHTML = html; });
  }

  async function refreshApplications(){
    await loadApplications();
    renderApplications();
  }

  async function updateApplicationStatus(applicationId, nextStatus, button){
    if (!client || !currentUser || !applicationId || !nextStatus) return;
    const previousText = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Saving...'; }
    const { error } = await client
      .from('candidate_applications')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', applicationId);
    if (error) {
      if (button) { button.disabled = false; button.textContent = previousText; }
      showStatus(error.message || 'Could not update application status.', 'bad');
      return;
    }
    showStatus(`Application moved to ${nextStatus}.`, 'good');
    await refreshApplications();
  }

  async function init(){
    addStyles();
    applyApplicationsLabels();
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url, config.key);
      const sessionRes = await client.auth.getSession();
      currentUser = sessionRes.data && sessionRes.data.session && sessionRes.data.session.user;
      if (!currentUser) { renderApplications(); return; }
      const originalShowView = window.rolexaEmployerShowView;
      if (typeof originalShowView === 'function' && !window.__rxApplicationsShowWrapped) {
        window.__rxApplicationsShowWrapped = true;
        window.rolexaEmployerShowView = function(view){ originalShowView(view); setTimeout(renderApplications, 80); };
      }
      document.addEventListener('click', event => {
        const action = event.target && event.target.closest('[data-app-id][data-next-status]');
        if (action) {
          updateApplicationStatus(action.getAttribute('data-app-id'), action.getAttribute('data-next-status'), action);
          return;
        }
        if (event.target && event.target.matches('[data-view="matches"]')) setTimeout(refreshApplications, 100);
      });
      await refreshApplications();
      setTimeout(refreshApplications, 1200);
    } catch(e) {
      loadError = e.message || 'Applications could not be initialised.';
      renderApplications();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();