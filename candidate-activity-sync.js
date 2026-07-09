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
  let activeThread = 'support';

  function byId(id){ return document.getElementById(id); }
  function safe(text){ return String(text ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

  function addTimelineStyles(){
    if (byId('rxCandidateTimelineStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateTimelineStyles';
    style.textContent = `.rx-app-card-live{grid-template-columns:45px minmax(0,1fr) auto;align-items:flex-start}.rx-app-card-live .rx-app-body{min-width:0}.rx-updated{font-size:12px;color:#6B7280;margin-top:3px}.rx-timeline{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:11px}.rx-step{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:900;color:#9AA4B8}.rx-dot{width:10px;height:10px;border-radius:50%;background:#D8E4FB;box-shadow:0 0 0 3px #F5F7FC}.rx-step.done{color:#176B49}.rx-step.done .rx-dot{background:#22A06B}.rx-step.current{color:#2946C7}.rx-step.current .rx-dot{background:#176BFF}.rx-step.rejected{color:#A33327}.rx-step.rejected .rx-dot{background:#E0533F}.rx-line{width:22px;height:2px;background:#D8E4FB;border-radius:999px}.rx-line.done{background:#22A06B}@media(max-width:760px){.rx-app-card-live{grid-template-columns:42px 1fr}.rx-app-card-live > span{grid-column:2;justify-self:flex-start}.rx-line{width:14px}}`;
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
      s.onerror = () => reject(new Error('Supabase could not load'));
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
      desc: row.description || ''
    };
  }

  function statusClass(s){
    if (s === 'Shortlisted' || s === 'Hired') return 'tag';
    if (s === 'Interview' || s === 'Offer') return 'tag warn';
    if (s === 'Rejected') return 'tag bad';
    return 'tag blue';
  }

  function statusMessage(s){
    const messages = {
      Applied: 'Application received by the employer.',
      Shortlisted: 'Good news — you have been shortlisted.',
      Interview: 'The employer has moved you to interview stage.',
      Offer: 'The employer has moved you to offer stage.',
      Hired: 'Congratulations — marked as hired.',
      Rejected: 'Not a match this time.'
    };
    return messages[s] || 'Application status updated.';
  }

  function formatDateTime(value){
    try {
      if (!value) return 'Not updated yet';
      return new Date(value).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch(e) { return 'Not updated yet'; }
  }

  function timelineHtml(status){
    if (status === 'Rejected') {
      return `<div class="rx-timeline"><span class="rx-step done"><span class="rx-dot"></span>Applied</span><span class="rx-line done"></span><span class="rx-step rejected current"><span class="rx-dot"></span>Rejected</span></div>`;
    }
    const stages = ['Applied','Shortlisted','Interview','Offer','Hired'];
    const currentIndex = Math.max(0, stages.indexOf(status || 'Applied'));
    return `<div class="rx-timeline">${stages.map((stage, index) => {
      const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : '';
      const line = index < stages.length - 1 ? `<span class="rx-line ${index < currentIndex ? 'done' : ''}"></span>` : '';
      return `<span class="rx-step ${state}"><span class="rx-dot"></span>${safe(stage)}</span>${line}`;
    }).join('')}</div>`;
  }

  function isSaved(id){ return syncedSaved.some(x => x.job_id === id); }
  function appliedRecord(id){ return syncedApplications.find(x => x.job_id === id); }

  function jobCard(j, context){
    const saved = isSaved(j.id);
    const applied = appliedRecord(j.id);
    const actions = context === 'saved'
      ? `<button class="small-btn" onclick="removeSaved('${safe(j.id)}')">Remove</button><button class="small-btn primary-mini" onclick="applyJob('${safe(j.id)}')">${applied ? 'Applied' : 'Apply'}</button>`
      : `<button class="small-btn" onclick="saveJob('${safe(j.id)}')">${saved ? 'Saved' : 'Save'}</button><button class="small-btn primary-mini" onclick="applyJob('${safe(j.id)}')">${applied ? 'Applied' : 'Apply'}</button>`;
    return `<div class="job"><div class="logo ${safe(j.cls)}">${safe(j.logo)}</div><div><div class="item-title">${safe(j.title)}</div><div class="item-sub">${safe(j.company)}, ${safe(j.location)}, ${safe(j.style)}, ${safe(j.salary)}</div><div class="item-sub">${safe(j.desc)}</div></div><div class="job-actions"><span class="tag">${safe(j.tag)}</span>${actions}</div></div>`;
  }

  async function loadData(){
    const [jobsRes, savedRes, appsRes, msgRes] = await Promise.all([
      client.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      client.from('candidate_saved_jobs').select('job_id, created_at').eq('user_id', user.id),
      client.from('candidate_applications').select('job_id, status, applied_at, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
      client.from('candidate_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    ]);
    if (jobsRes.error || savedRes.error || appsRes.error || msgRes.error) {
      console.warn('Rolexa activity load error', jobsRes.error || savedRes.error || appsRes.error || msgRes.error);
      showStatus('bad', 'Could not load activity from Supabase.');
      return false;
    }
    syncedJobs = (jobsRes.data || []).map(mapJob);
    syncedSaved = savedRes.data || [];
    syncedApplications = appsRes.data || [];
    syncedMessages = msgRes.data || [];
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
      return `<div class="application rx-app-card-live"><div class="logo ${safe(j.cls)}">${safe(j.logo)}</div><div class="rx-app-body"><div class="item-title">${safe(j.title)}</div><div class="item-sub">${safe(j.company)}${date ? ', applied ' + date : ''}</div><div class="item-sub">${safe(statusMessage(a.status))}</div><div class="rx-updated">Last updated: ${safe(formatDateTime(a.updated_at || a.applied_at))}</div>${timelineHtml(a.status)}</div><span class="${statusClass(a.status)}">${safe(a.status)}</span></div>`;
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
    if (key === 'proxima') return { name: 'Laura Harrison', sub: 'Proxima Labs' };
    if (key === 'northbridge') return { name: 'Michael Chen', sub: 'Northbridge Digital' };
    return { name: key, sub: 'Message thread' };
  }

  async function ensureStarterMessages(){
    if (syncedMessages.length) return;
    const starter = [
      { user_id: user.id, thread_key: 'support', sender: 'support', sender_name: 'Rolexa Support', body: 'Welcome to your Rolexa candidate dashboard. Your messages are now connected to Supabase.' }
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
    await loadData(); renderAllSynced(); showStatus('good', 'Job saved to Supabase.');
  };

  window.removeSaved = async function(id){
    if (!client || !user) return;
    const { error } = await client.from('candidate_saved_jobs').delete().eq('user_id', user.id).eq('job_id', id);
    if (error) { console.warn(error); showStatus('bad', 'Could not remove saved job.'); return; }
    await loadData(); renderAllSynced(); showStatus('good', 'Saved job removed.');
  };

  window.applyJob = async function(id){
    if (!client || !user) return;
    const { error } = await client.from('candidate_applications').upsert({ user_id: user.id, job_id: id, status: 'Applied', updated_at: new Date().toISOString() }, { onConflict: 'user_id,job_id' });
    if (error) { console.warn(error); showStatus('bad', 'Could not apply to job.'); return; }
    await loadData(); renderAllSynced(); if (typeof window.showView === 'function') window.showView('applications'); showStatus('good', 'Application saved to Supabase.');
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
    await loadData(); renderMessages(); showStatus('good', 'Message saved to Supabase.');
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
    showStatus('good', 'Jobs and activity loaded from Supabase.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();