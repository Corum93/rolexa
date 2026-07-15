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
    style.textContent = `
      .rx-app-card{grid-template-columns:45px minmax(0,1fr) auto;align-items:flex-start}
      .rx-app-main{min-width:0;display:grid;gap:5px}
      .rx-app-title{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px;font-weight:900;color:#071025}
      .rx-app-meta{font-size:12.5px;color:#6B7280;line-height:1.45}
      .rx-app-meta b{color:#26324C}
      .rx-app-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;max-width:420px}
      .rx-app-warning{grid-column:1/-1;border:1px solid rgba(224,83,63,.18);background:#FFF8F6;border-radius:13px;padding:10px 11px;font-size:12.8px;line-height:1.45;color:#A33327}
      .rx-status-btn{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}
      .rx-status-btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}
      .rx-status-btn.danger{border-color:rgba(224,83,63,.25);color:#A33327;background:#FFF8F6}
      .rx-status-btn:disabled{opacity:.6;cursor:not-allowed}
      .rx-modal-backdrop{position:fixed;inset:0;background:rgba(7,16,37,.58);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px}
      .rx-modal{width:min(760px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:24px;border:1px solid var(--line);box-shadow:0 30px 80px rgba(7,16,37,.35)}
      .rx-modal-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid var(--line)}
      .rx-candidate-head{display:grid;grid-template-columns:82px minmax(0,1fr);gap:16px;align-items:center;min-width:0}
      .rx-candidate-photo{width:82px;height:82px;border-radius:21px;background:linear-gradient(135deg,#176BFF,#8CA6FF);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:900;overflow:hidden;border:3px solid #fff;box-shadow:0 10px 24px rgba(7,16,37,.18)}
      .rx-candidate-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .rx-candidate-copy{min-width:0}
      .rx-candidate-copy h2{margin:0;font-size:25px;overflow-wrap:anywhere}
      .rx-candidate-role{font-size:14px;font-weight:800;color:#26324C;margin-top:5px}
      .rx-candidate-meta{font-size:12.5px;color:#6B7280;margin-top:5px;line-height:1.45;display:flex;gap:7px;flex-wrap:wrap}
      .rx-candidate-privacy{display:inline-flex;align-items:center;gap:6px;color:#176B49;background:#E1F6EB;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;margin-top:8px}
      .rx-modal-close{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 13px;font-weight:900;flex:0 0 auto}
      .rx-modal-body{padding:22px 24px;display:grid;gap:14px}
      .rx-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .rx-profile-field{border:1px solid var(--line);background:#F5F7FC;border-radius:14px;padding:13px}
      .rx-profile-field b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6B7280;margin-bottom:5px}
      .rx-profile-field span{font-size:14px;color:#071025;font-weight:800;line-height:1.4}
      .rx-profile-field.full{grid-column:1/-1}
      .rx-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
      @media(max-width:760px){
        .rx-app-card{grid-template-columns:42px 1fr}
        .rx-app-actions{grid-column:2;justify-content:flex-start}
        .rx-app-warning{grid-column:1/-1}
        .rx-profile-grid{grid-template-columns:1fr}
        .rx-modal-backdrop{padding:10px;align-items:flex-end}
        .rx-modal{max-height:92vh;border-radius:22px 22px 0 0}
        .rx-modal-head{padding:18px 16px;gap:10px}
        .rx-candidate-head{grid-template-columns:64px minmax(0,1fr);gap:12px}
        .rx-candidate-photo{width:64px;height:64px;border-radius:17px;font-size:19px}
        .rx-candidate-copy h2{font-size:21px}
        .rx-candidate-role{font-size:13px}
        .rx-candidate-meta{font-size:11.5px}
        .rx-modal-body{padding:16px}
      }
      @media(max-width:420px){
        .rx-modal-head{display:grid;grid-template-columns:1fr auto}
        .rx-candidate-head{grid-template-columns:56px minmax(0,1fr)}
        .rx-candidate-photo{width:56px;height:56px;border-radius:15px}
        .rx-modal-close{padding:8px 10px;font-size:12px}
      }
    `;
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
      const pRes = await client
        .from('candidate_profiles')
        .select('user_id,full_name,email,target_role,current_level,location,work_style,minimum_salary,skills,profile_summary,has_cv,cv_file_path,cv_file_name,cv_file_type,open_to_work,open_to_relocate,photo_file_path,photo_file_name,photo_file_type')
        .in('user_id', userIds);
      if (pRes.error) profileWarning = pRes.error.message || 'Candidate profile access blocked.';
      else profiles = pRes.data || [];
    }
    const jobMap = new Map(jobs.map(job => [job.id, job]));
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
    applications = apps.map(app => ({ app, job: jobMap.get(app.job_id) || {}, profile: profileMap.get(app.user_id) || {}, profileWarning }));
  }

  function reviewButtons(app, profile){
    const id = safe(app.id);
    const hasCv = Boolean(profile && (profile.cv_file_path || profile.cv_file_name || profile.has_cv));
    return [
      `<button class="rx-status-btn" type="button" data-review-profile="${id}">View profile</button>`,
      `<button class="rx-status-btn" type="button" data-review-cv="${id}" ${hasCv ? '' : 'disabled'}>View CV</button>`
    ].join('');
  }

  function actionButtons(app, profile){
    const id = safe(app.id);
    const status = app.status || 'Applied';
    const buttons = [reviewButtons(app, profile)];
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
    const level = profile.current_level || 'Level not added';
    const location = profile.location || 'Location not added';
    const style = profile.work_style || 'Work style not added';
    const skills = profile.skills || 'Skills not added yet';
    const cv = profile.has_cv || profile.cv_file_name ? (profile.cv_file_name || 'CV uploaded') : 'No CV uploaded yet';
    const warning = row.profileWarning ? `<div class="rx-app-warning"><b>Profile access warning:</b> ${safe(row.profileWarning)}. The application is real, but Supabase may still need profile read access for applicant names.</div>` : '';
    return `<div class="item rx-app-card"><div class="logo green">${safe(initials(name))}</div><div class="rx-app-main"><div class="rx-app-title">${safe(name)} <span class="tag blue">${safe(status)}</span></div><div class="rx-app-meta">Applied for <b>${safe(job.title || app.job_id)}</b>${job.company ? ' at ' + safe(job.company) : ''} · ${safe(dateText(app.applied_at || app.updated_at))}</div><div class="rx-app-meta">${safe(role)} · ${safe(level)} · ${safe(location)} · ${safe(style)}</div><div class="rx-app-meta"><b>Skills:</b> ${safe(skills)}</div><div class="rx-app-meta"><b>Candidate file:</b> ${safe(cv)}</div></div><div class="rx-app-actions">${actionButtons(app, profile)}</div>${warning}</div>`;
  }

  function findApplication(applicationId){
    return applications.find(row => row.app && row.app.id === applicationId);
  }

  function modalField(label, value, full = false){
    return `<div class="rx-profile-field ${full ? 'full' : ''}"><b>${safe(label)}</b><span>${safe(value || 'Not added')}</span></div>`;
  }

  async function candidatePhotoUrl(profile){
    if (!profile?.photo_file_path || !client) return '';
    const { data, error } = await client.storage.from('candidate-photos').createSignedUrl(profile.photo_file_path, 60 * 10);
    if (error || !data?.signedUrl) return '';
    return data.signedUrl;
  }

  async function showProfile(applicationId){
    const row = findApplication(applicationId);
    if (!row) { showStatus('Could not find candidate profile.', 'bad'); return; }
    const profile = row.profile || {};
    const job = row.job || {};
    const app = row.app || {};
    const name = profile.full_name || profile.email || `Candidate ${shortId(app.user_id)}`;
    const role = profile.target_role || 'Candidate profile';
    const locationBits = [profile.location, profile.work_style, profile.current_level].filter(Boolean);
    const html = `<div class="rx-modal-backdrop" id="rxProfileModal"><div class="rx-modal"><div class="rx-modal-head"><div class="rx-candidate-head"><div class="rx-candidate-photo" id="rxEmployerCandidatePhoto">${safe(initials(name))}</div><div class="rx-candidate-copy"><h2>${safe(name)}</h2><div class="rx-candidate-role">${safe(role)}</div>${locationBits.length ? `<div class="rx-candidate-meta">${locationBits.map(bit => `<span>${safe(bit)}</span>`).join('<span>•</span>')}</div>` : ''}<div class="rx-candidate-privacy"><span>✓</span><span>Contact protected by Rolexa</span></div><div class="rx-candidate-meta"><span>Applied for ${safe(job.title || app.job_id)}</span><span>•</span><span>${safe(app.status || 'Applied')}</span></div></div></div><button class="rx-modal-close" type="button" data-close-modal>Close</button></div><div class="rx-modal-body"><div class="rx-profile-grid">${modalField('Target role', profile.target_role)}${modalField('Current level', profile.current_level)}${modalField('Location', profile.location)}${modalField('Work style', profile.work_style)}${modalField('Minimum salary', profile.minimum_salary)}${modalField('Open to relocate', profile.open_to_relocate === true ? 'Yes' : profile.open_to_relocate === false ? 'No' : '')}${modalField('Skills', profile.skills, true)}${modalField('Profile summary', profile.profile_summary, true)}${modalField('CV', profile.cv_file_name || (profile.has_cv ? 'CV uploaded' : 'No CV uploaded yet'), true)}</div><div class="rx-modal-actions"><button class="rx-status-btn" type="button" data-review-cv="${safe(app.id)}" ${(profile.cv_file_path || profile.cv_file_name || profile.has_cv) ? '' : 'disabled'}>View CV</button></div></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const photoUrl = await candidatePhotoUrl(profile);
    const photo = byId('rxEmployerCandidatePhoto');
    if (photoUrl && photo && byId('rxProfileModal')) {
      photo.innerHTML = `<img src="${safe(photoUrl)}" alt="${safe(name)} profile photo">`;
    }
  }

  async function openCv(applicationId, button){
    const row = findApplication(applicationId);
    if (!row) { showStatus('Could not find candidate CV.', 'bad'); return; }
    const profile = row.profile || {};
    if (!profile.cv_file_path) {
      showStatus(profile.cv_file_name ? 'CV file name exists, but storage path is missing.' : 'No CV uploaded for this candidate.', 'bad');
      return;
    }
    const previousText = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Opening...'; }
    const { data, error } = await client.storage.from('candidate-cvs').createSignedUrl(profile.cv_file_path, 60 * 10);
    if (button) { button.disabled = false; button.textContent = previousText; }
    if (error || !data || !data.signedUrl) {
      showStatus((error && error.message) || 'Could not open CV from Supabase Storage.', 'bad');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  function closeModal(){
    const modal = byId('rxProfileModal');
    if (modal) modal.remove();
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
        const statusAction = event.target && event.target.closest('[data-app-id][data-next-status]');
        if (statusAction) {
          updateApplicationStatus(statusAction.getAttribute('data-app-id'), statusAction.getAttribute('data-next-status'), statusAction);
          return;
        }
        const profileAction = event.target && event.target.closest('[data-review-profile]');
        if (profileAction) {
          showProfile(profileAction.getAttribute('data-review-profile'));
          return;
        }
        const cvAction = event.target && event.target.closest('[data-review-cv]');
        if (cvAction) {
          openCv(cvAction.getAttribute('data-review-cv'), cvAction);
          return;
        }
        if (event.target && (event.target.matches('[data-close-modal]') || event.target.id === 'rxProfileModal')) {
          closeModal();
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