(() => {
  if (window.__rolexaCandidateActivitySync) return;
  window.__rolexaCandidateActivitySync = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let syncedJobs = [];
  let syncedSaved = [];
  let syncedApplications = [];
  let syncedMessages = [];
  let syncedHiringStages = [];
  let activeThread = 'support';

  function byId(id){ return document.getElementById(id); }
  function safe(text){ return String(text ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

  function addTimelineStyles(){
    if (byId('rxCandidateTimelineStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateTimelineStyles';
    style.textContent = `.rx-app-card-live{grid-template-columns:45px minmax(0,1fr) auto;align-items:flex-start}.rx-app-card-live .rx-app-body{min-width:0}.rx-updated{font-size:12px;color:#6B7280;margin-top:3px}.rx-timeline{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:11px}.rx-step{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:900;color:#9AA4B8}.rx-dot{width:10px;height:10px;border-radius:50%;background:#D8E4FB;box-shadow:0 0 0 3px #F5F7FC}.rx-step.done{color:#176B49}.rx-step.done .rx-dot{background:#22A06B}.rx-step.current{color:#2946C7}.rx-step.current .rx-dot{background:#176BFF}.rx-step.rejected{color:#A33327}.rx-step.rejected .rx-dot{background:#E0533F}.rx-step.withdrawn{color:#6B7280}.rx-step.withdrawn .rx-dot{background:#6B7280}.rx-line{width:22px;height:2px;background:#D8E4FB;border-radius:999px}.rx-line.done{background:#22A06B}.rx-candidate-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.rx-withdraw-btn{border:1px solid rgba(224,83,63,.24);background:#FFF8F6;color:#A33327;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}.rx-withdraw-btn:disabled,.small-btn:disabled{opacity:.6;cursor:not-allowed}.rx-internal-candidate-notice{grid-column:1/-1;border:1px solid rgba(23,107,255,.18);background:#f6f9ff;border-radius:13px;padding:10px 12px;margin-top:10px;display:grid;gap:3px}.rx-internal-candidate-notice small{color:#2946c7;font-size:10px;font-weight:900;letter-spacing:.045em;text-transform:uppercase}.rx-internal-candidate-notice b{color:#101f4a;font-size:12.5px;line-height:1.45}.rx-internal-candidate-notice.legacy{border-color:rgba(138,86,0,.2);background:#fff9eb}.rx-internal-candidate-notice.legacy small{color:#8a5600}@media(max-width:760px){.rx-app-card-live{grid-template-columns:42px 1fr}.rx-app-card-live > .rx-candidate-actions{grid-column:2;justify-content:flex-start}.rx-line{width:14px}}`;
    document.head.appendChild(style);
  }

  function showStatus(kind, text){
    let el = document.getElementById('rolexaActivitySyncStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rolexaActivitySyncStatus';
      el.style.cssText = 'position:fixed;left:50%;bottom:66px;transform:translateX(-50%);z-index:9998;padding:11px 15px;border-radius:999px;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    if (kind === 'good') { el.style.background = '#E1F6EB'; el.style.color = '#176B49'; el.style.border = '1px solid rgba(34,160,107,.22)'; }
    else if (kind === 'bad') { el.style.background = '#FBE4E1'; el.style.color = '#A33327'; el.style.border = '1px solid rgba(224,83,63,.22)'; }
    else { el.style.background = '#EEF3FF'; el.style.color = '#2946C7'; el.style.border = '1px solid rgba(76,116,255,.22)'; }
    clearTimeout(window.__rolexaActivityStatusTimer);
    window.__rolexaActivityStatusTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => resolve(window.supabase);
      s.onerror = () => reject(new Error('Connection could not be established'));
      document.head.appendChild(s);
    });
  }

  function mapJob(row){
    return {
      id: row.id,
      logo: row.logo || (row.company || '?').slice(0,1).toUpperCase(),
      cls: row.logo_class || '',
      title: row.title,
      company: row.company,
      location: row.location || 'UK',
      style: row.work_style || 'Hybrid',
      salary: row.salary_range || '',
      tag: row.tag || 'Rolexa',
      desc: row.description || '',
      applicationCount: Math.max(0, Number(row.application_count) || 0),
      applicationLimit: Math.max(1, Number(row.application_limit) || 100),
      internalCandidateStatus: row.internal_candidate_status || ''
    };
  }

  function orderedStages(stages){
    return [...stages].sort((left, right) =>
      Number(left.stage_order || 0) - Number(right.stage_order || 0)
    );
  }

  function stagesForApplication(application){
    return orderedStages(syncedHiringStages.filter(stage => String(stage.job_id) === String(application.job_id)));
  }

  function currentStageFor(application, stages = stagesForApplication(application)){
    return stages.find(stage => String(stage.id) === String(application.current_hiring_stage_id || '')) || stages[0] || null;
  }

  function statusClass(application, stage){
    const status = String(application.status || 'Applied');
    if (status === 'Hired') return 'tag';
    if (status === 'Rejected') return 'tag bad';
    if (status === 'Withdrawn') return 'tag blue';
    if (['interview','assessment','offer'].includes(String(stage?.stage_type || '').toLowerCase())) return 'tag warn';
    if (String(stage?.stage_type || '').toLowerCase() === 'shortlist') return 'tag';
    return 'tag blue';
  }

  function displayStageName(application, current){
    const status = String(application.status || 'Applied');
    if (['Hired','Rejected','Withdrawn'].includes(status)) return status;
    return current?.stage_name || status;
  }

  function statusMessage(application, current, next){
    const status = String(application.status || 'Applied');
    if (status === 'Hired') return 'Congratulations. You have been marked as hired.';
    if (status === 'Rejected') return 'This application is no longer progressing.';
    if (status === 'Withdrawn') return 'You withdrew this application.';
    if (!current) return 'Application received by the employer.';
    return next
      ? `Current stage: ${current.stage_name}. Next stage: ${next.stage_name}.`
      : `Current stage: ${current.stage_name}. This is the final configured stage.`;
  }

  function formatDateTime(value){
    try {
      if (!value) return 'Not updated yet';
      return new Date(value).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch(e) { return 'Not updated yet'; }
  }

  function timelineHtml(application, stages){
    const status = String(application.status || 'Applied');
    const terminal = ['Hired','Rejected','Withdrawn'].includes(status) ? status : '';
    const configured = stages.length ? stages : [{ id:'fallback', stage_name:status, stage_order:1 }];
    const current = currentStageFor(application, configured);
    const currentIndex = Math.max(0, configured.findIndex(stage => stage === current || String(stage.id) === String(current?.id)));
    const process = configured.map((stage, index) => {
      const reached = index < currentIndex || (terminal && index === currentIndex);
      const state = reached ? 'done' : index === currentIndex ? 'current' : '';
      const lineDone = index < currentIndex || (terminal && index === currentIndex);
      const line = index < configured.length - 1 || terminal ? `<span class="rx-line ${lineDone ? 'done' : ''}"></span>` : '';
      return `<span class="rx-step ${state}"><span class="rx-dot"></span>${safe(stage.stage_name)}</span>${line}`;
    }).join('');
    const terminalStep = terminal
      ? `<span class="rx-step ${terminal.toLowerCase()} current"><span class="rx-dot"></span>${safe(terminal)}</span>`
      : '';
    return `<div class="rx-timeline">${process}${terminalStep}</div>`;
  }

  function isSaved(id){ return syncedSaved.some(x => x.job_id === id); }
  function appliedRecord(id){ return syncedApplications.find(x => x.job_id === id); }

  function jobCard(j, context){
    const saved = isSaved(j.id);
    const applied = appliedRecord(j.id);
    const applicationsClosed = !applied && j.applicationCount >= j.applicationLimit;
    const applyLabel = applied ? 'Applied' : applicationsClosed ? 'Applications closed' : 'Apply';
    const applyState = applied || applicationsClosed ? ' disabled aria-disabled="true"' : '';
    const actions = context === 'saved'
      ? `<button class="small-btn" onclick="removeSaved('${safe(j.id)}')">Remove</button><button class="small-btn primary-mini" onclick="applyJob('${safe(j.id)}')"${applyState}>${applyLabel}</button>`
      : `<button class="small-btn" onclick="saveJob('${safe(j.id)}')">${saved ? 'Saved' : 'Save'}</button><button class="small-btn primary-mini" onclick="applyJob('${safe(j.id)}')"${applyState}>${applyLabel}</button>`;
    const disclosureLabels = {
      none: 'No internal candidates are currently being considered',
      may_apply: 'Internal employees may apply, but none are currently progressing',
      in_process: 'One or more internal candidates are already in the hiring process',
      preferred: 'An internal candidate is currently preferred for this position'
    };
    const disclosure = disclosureLabels[j.internalCandidateStatus] || 'This role was published before Rolexa introduced mandatory internal-candidate disclosure.';
    const disclosureClass = disclosureLabels[j.internalCandidateStatus] ? '' : ' legacy';
    return `<div class="job"><div class="logo ${safe(j.cls)}">${safe(j.logo)}</div><div><div class="item-title">${safe(j.title)}</div><div class="item-sub">${safe(j.company)}, ${safe(j.location)}, ${safe(j.style)}, ${safe(j.salary)}</div><div class="item-sub">${safe(j.desc)}</div><div class="rx-internal-candidate-notice${disclosureClass}"><small>Internal candidate disclosure</small><b>${safe(disclosure)}</b></div></div><div class="job-actions"><span class="tag">${safe(j.tag)}</span>${actions}</div></div>`;
  }

  async function loadData(){
    const [jobsRes, savedRes, appsRes, msgRes, stagesRes] = await Promise.all([
      client.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      client.from('candidate_saved_jobs').select('job_id, created_at').eq('user_id', user.id),
      client.from('candidate_applications').select('id,job_id,status,applied_at,updated_at,current_hiring_stage_id,hiring_stage_updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
      client.from('candidate_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      client.from('job_hiring_stages').select('id,job_id,stage_order,stage_name,stage_type').order('stage_order', { ascending: true })
    ]);
    if (jobsRes.error || savedRes.error || appsRes.error || msgRes.error || stagesRes.error) {
      console.warn('Rolexa activity load error', jobsRes.error || savedRes.error || appsRes.error || msgRes.error || stagesRes.error);
      showStatus('bad', 'Could not load your activity.');
      return false;
    }
    syncedJobs = (jobsRes.data || []).map(mapJob);
    syncedSaved = savedRes.data || [];
    syncedApplications = appsRes.data || [];
    syncedMessages = msgRes.data || [];
    syncedHiringStages = stagesRes.data || [];
    return true;
  }

  function renderJobSearch(){
    const q = (byId('jobQuery')?.value || byId('globalSearch')?.value || '').toLowerCase();
    const loc = byId('jobLocation')?.value || '';
    const style = byId('jobStyle')?.value || '';
    const results = syncedJobs.filter(j => (!q || (j.title + j.company + j.desc).toLowerCase().includes(q)) && (!loc || j.location === loc) && (!style || j.style === style));
    if (byId('jobResults')) byId('jobResults').innerHTML = results.length ? results.map(j => jobCard(j, 'search')).join('') : '<div class="empty">No matching jobs found. Try removing a filter.</div>';
  }

  function renderApplications(){
    if (!byId('applicationsList')) return;
    if (!syncedApplications.length) {
      byId('applicationsList').innerHTML = '<div class="empty">You have not applied to any jobs yet. Go to Job Search and click Apply on a role.</div>';
      return;
    }
    byId('applicationsList').innerHTML = syncedApplications.map(a => {
      const j = syncedJobs.find(x => x.id === a.job_id) || { title: a.job_id, company: 'Rolexa', logo: 'R', cls: 'blue' };
      const date = a.applied_at ? new Date(a.applied_at).toLocaleDateString('en-GB') : '';
      const stages = stagesForApplication(a);
      const current = currentStageFor(a, stages);
      const currentIndex = Math.max(0, stages.findIndex(stage => String(stage.id) === String(current?.id)));
      const next = stages[currentIndex + 1] || null;
      const statusLabel = displayStageName(a, current);
      const canWithdraw = a.status === 'Applied' && currentIndex === 0;
      const actions = canWithdraw
        ? `<div class="rx-candidate-actions"><span class="${statusClass(a, current)}">${safe(statusLabel)}</span><button class="rx-withdraw-btn" type="button" onclick="withdrawApplication('${safe(a.job_id)}')">Withdraw</button></div>`
        : `<span class="${statusClass(a, current)}">${safe(statusLabel)}</span>`;
      return `<div class="application rx-app-card-live"><div class="logo ${safe(j.cls)}">${safe(j.logo)}</div><div class="rx-app-body"><div class="item-title">${safe(j.title)}</div><div class="item-sub">${safe(j.company)}${date ? ', applied ' + date : ''}</div><div class="item-sub">${safe(statusMessage(a, current, next))}</div><div class="rx-updated">Last updated: ${safe(formatDateTime(a.hiring_stage_updated_at || a.updated_at || a.applied_at))}</div>${timelineHtml(a, stages)}</div>${actions}</div>`;
    }).join('');
  }

  function renderSaved(){
    if (!byId('savedJobsList')) return;
    const savedJobs = syncedSaved.map(s => syncedJobs.find(j => j.id === s.job_id)).filter(Boolean);
    byId('savedJobsList').innerHTML = savedJobs.length ? savedJobs.map(j => jobCard(j, 'saved')).join('') : '<div class="empty">No saved jobs yet. Use Job Search and click Save on roles you like.</div>';
  }

  function renderTracker(){
    if (!byId('trackerRows')) return;
    const counts = {
      Applied: syncedApplications.filter(a => a.status === 'Applied').length,
      Shortlisted: syncedApplications.filter(a => a.status === 'Shortlisted').length,
      Interview: syncedApplications.filter(a => a.status === 'Interview').length,
      Offer: syncedApplications.filter(a => a.status === 'Offer').length,
      Hired: syncedApplications.filter(a => a.status === 'Hired').length,
      Rejected: syncedApplications.filter(a => a.status === 'Rejected').length
    };
    byId('trackerRows').innerHTML = [
      ['Applied','Jobs you have applied for','save'],
      ['Shortlisted','Applications moving forward','good'],
      ['Interview','Interviews in progress','warn'],
      ['Offer','Offers received','warn'],
      ['Hired','Successful applications','good'],
      ['Rejected','Not a match this time','bad']
    ].map(r => `<div class="status-row"><div><b class="${r[2]}">${r[0]}</b><span>${r[1]}</span></div><div class="count">${counts[r[0]] || 0}</div></div>`).join('');
  }

  function renderRecommended(){
    if (!byId('recommendedJobs')) return;
    const profileText = (document.getElementById('targetRole')?.value || '').toLowerCase();
    const firstWord = profileText.split(' ')[0];
    const rec = syncedJobs.filter(j => !firstWord || j.title.toLowerCase().includes(firstWord) || j.desc.toLowerCase().includes(firstWord)).slice(0,3);
    byId('recommendedJobs').innerHTML = (rec.length ? rec : syncedJobs.slice(0,3)).map(j => jobCard(j, 'search')).join('');
  }

  function threadLabel(key){
    if (key === 'support') return { name: 'Rolexa Support', sub: 'Candidate support' };
    if (String(key || '').startsWith('application:')) {
      const applicationId = String(key).slice('application:'.length);
      const application = syncedApplications.find(item => String(item.id) === applicationId);
      const job = application && syncedJobs.find(item => String(item.id) === String(application.job_id));
      const currentStage = application ? currentStageFor(application) : null;
      return {
        name: job?.company || 'Employer',
        sub: `${job?.title || 'Application'} · ${currentStage?.stage_name || application?.status || 'Application conversation'}`
      };
    }
    if (key === 'proxima') return { name: 'Laura Harrison', sub: 'Proxima Labs' };
    if (key === 'northbridge') return { name: 'Michael Chen', sub: 'Northbridge Digital' };
    return { name: 'Employer', sub: 'Application conversation' };
  }

  async function ensureStarterMessages(){
    if (syncedMessages.length) return;
    const starter = [
      { user_id: user.id, thread_key: 'support', sender: 'support', sender_name: 'Rolexa Support', body: 'Welcome to your Rolexa candidate dashboard.' }
    ];
    await client.from('candidate_messages').insert(starter);
    await loadData();
  }

  function renderMessages(){
    if (!byId('threadList') || !byId('chatBody')) return;
    const keys = [...new Set(syncedMessages.map(m => m.thread_key))];
    if (!keys.includes(activeThread)) activeThread = keys[0] || 'support';
    byId('threadList').innerHTML = keys.map(key => {
      const label = threadLabel(key);
      const latest = [...syncedMessages].reverse().find(m => m.thread_key === key);
      return `<div class="thread ${key === activeThread ? 'active' : ''}" onclick="window.rolexaSetThread('${safe(key)}')"><b>${safe(label.name)}</b><p>${safe(latest ? latest.body : '')}</p></div>`;
    }).join('');
    const label = threadLabel(activeThread);
    byId('chatName').textContent = label.name;
    byId('chatSub').textContent = label.sub;
    byId('chatBody').innerHTML = syncedMessages.filter(m => m.thread_key === activeThread).map(m => `<div class="bubble ${m.sender === 'candidate' ? 'me' : 'them'}">${safe(m.body)}</div>`).join('');
  }

  function renderAllSynced(){
    addTimelineStyles();
    renderRecommended();
    renderTracker();
    renderJobSearch();
    renderApplications();
    renderSaved();
    renderMessages();
  }

  window.saveJob = async function(id){
    if (!client || !user) return;
    const { error } = await client.from('candidate_saved_jobs').upsert({ user_id: user.id, job_id: id }, { onConflict: 'user_id,job_id' });
    if (error) { console.warn(error); showStatus('bad', 'Could not save job.'); return; }
    await loadData(); renderAllSynced(); showStatus('good', 'Job saved.');
  };

  window.removeSaved = async function(id){
    if (!client || !user) return;
    const { error } = await client.from('candidate_saved_jobs').delete().eq('user_id', user.id).eq('job_id', id);
    if (error) { console.warn(error); showStatus('bad', 'Could not remove saved job.'); return; }
    await loadData(); renderAllSynced(); showStatus('good', 'Saved job removed.');
  };

  window.withdrawApplication = async function(id){
    if (!client || !user || !id) return;
    const confirmed = window.confirm('Withdraw this application? You can apply again later if the role is still active.');
    if (!confirmed) return;
    const { error } = await client
      .from('candidate_applications')
      .update({ status: 'Withdrawn', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('job_id', id)
      .eq('status', 'Applied');
    if (error) {
      console.warn(error);
      showStatus('bad', error.message || 'Could not withdraw application.');
      return;
    }
    await loadData();
    renderAllSynced();
    showStatus('good', 'Application withdrawn.');
  };

  window.applyJob = async function(id){
    if (!client || !user) return;
    const job = syncedJobs.find(item => item.id === id);
    if (job && !appliedRecord(id) && job.applicationCount >= job.applicationLimit) {
      showStatus('info', 'Applications closed. This role has reached its 100 application limit.');
      renderJobSearch();
      renderSaved();
      return;
    }
    const { error } = await client.from('candidate_applications').upsert({ user_id: user.id, job_id: id, status: 'Applied', updated_at: new Date().toISOString() }, { onConflict: 'user_id,job_id' });
    if (error) {
      console.warn(error);
      const message = String(error.message || '');
      if (message.includes('APPLICATION_LIMIT_REACHED')) {
        await loadData();
        renderAllSynced();
        showStatus('info', 'Applications closed. This role has reached its 100 application limit.');
        return;
      }
      if (message.includes('APPLICATIONS_CLOSED')) {
        showStatus('info', 'Applications are closed for this role.');
        return;
      }
      showStatus('bad', 'Could not apply to job.');
      return;
    }
    await loadData(); renderAllSynced(); if (typeof window.showView === 'function') window.showView('applications'); showStatus('good', 'Application saved.');
  };

  window.renderJobSearch = renderJobSearch;
  window.renderApplications = renderApplications;
  window.renderSaved = renderSaved;
  window.renderMessages = renderMessages;
  window.renderTracker = renderTracker;
  window.rolexaSetThread = function(key){ activeThread = key; renderMessages(); };
  window.sendMessage = async function(e){
    e.preventDefault();
    const input = byId('chatInput');
    const text = input ? input.value.trim() : '';
    if (!text || !client || !user) return;
    input.value = '';
    const { error } = await client.from('candidate_messages').insert({ user_id: user.id, thread_key: activeThread || 'support', sender: 'candidate', sender_name: 'Candidate', body: text });
    if (error) { console.warn(error); showStatus('bad', 'Could not send message.'); return; }
    await loadData(); renderMessages(); showStatus('good', 'Message sent.');
  };

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    addTimelineStyles();
    let lib;
    try { lib = await loadSupabase(); } catch(e) { console.warn(e); return; }
    client = lib.createClient(CONFIG.url, CONFIG.key);
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData || !sessionData.session || !sessionData.session.user) {
      showStatus('info', 'Login to save jobs, applications and messages.');
      return;
    }
    user = sessionData.session.user;
    const ok = await loadData();
    if (!ok) return;
    await ensureStarterMessages();
    renderAllSynced();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
