(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaJobVerificationSupabase) return;
  window.__rolexaJobVerificationSupabase = true;

  const URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const STATUS_KEY = 'rolexa_verified_job_status_v1';
  const DRAFT_KEY = 'rolexa_verified_job_draft_v1';
  let client = null;
  let user = null;
  let verificationMap = new Map();
  let pendingSubmission = null;

  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function loadSupabase(){
    return new Promise((resolve,reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function showStatus(kind,text){
    const bar = document.getElementById('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${kind}`;
    bar.textContent = text;
    clearTimeout(window.__rxVerificationStatusTimer);
    window.__rxVerificationStatusTimer = setTimeout(() => { bar.className = 'statusbar'; }, 4200);
  }

  function formVerification(){
    return {
      title: document.getElementById('jobTitle')?.value?.trim() || '',
      company: document.getElementById('company')?.value?.trim() || '',
      hiring_owner_name: document.getElementById('rxHiringOwner')?.value?.trim() || '',
      hiring_owner_email: document.getElementById('rxHiringEmail')?.value?.trim() || '',
      first_review_commitment: document.getElementById('rxReviewDays')?.value || '',
      expected_hiring_date: document.getElementById('rxHiringDate')?.value || '',
      role_exists: !!document.getElementById('rxRoleExists')?.checked,
      budget_approved: !!document.getElementById('rxRoleFunded')?.checked,
      applications_actively_reviewed: !!document.getElementById('rxRoleReviewed')?.checked,
      final_outcome_promised: !!document.getElementById('rxFinalOutcome')?.checked
    };
  }

  function complete(v){
    return Boolean(v.title && v.hiring_owner_name && v.hiring_owner_email && v.first_review_commitment && v.expected_hiring_date && v.role_exists && v.budget_approved && v.applications_actively_reviewed && v.final_outcome_promised);
  }

  async function loadVerifications(){
    if (!client || !user) return;
    const { data,error } = await client.from('job_verifications').select('*');
    if (error) { console.warn('Verification load error',error); return; }
    verificationMap = new Map((data || []).map(row => [String(row.job_id),row]));
    decorateAll();
    updateOverview();
  }

  function jobIdFromCard(card){
    const button = [...card.querySelectorAll('button')].find(btn => /rolexaEmployerEditJob/.test(btn.getAttribute('onclick') || ''));
    const match = (button?.getAttribute('onclick') || '').match(/rolexaEmployerEditJob\('([^']+)'\)/);
    return match ? match[1] : '';
  }

  function resetDecorations(card){
    card.querySelectorAll('.rx-job-verified-badge,.rx-job-verification-details').forEach(el => el.remove());
    delete card.dataset.rxVerifiedDecorated;
  }

  function decorateCard(card,row){
    resetDecorations(card);
    if (!row || row.verification_status !== 'verified') return;
    const actions = card.querySelector('.rx-job-actions,.actions');
    if (actions) actions.insertAdjacentHTML('afterbegin','<span class="rx-job-verified-badge">Verified active</span>');
    card.insertAdjacentHTML('beforeend',`<div class="rx-job-verification-details"><div class="rx-job-verification-detail"><small>Hiring owner</small><b>${esc(row.hiring_owner_name)}</b></div><div class="rx-job-verification-detail"><small>Candidate review promise</small><b>${esc(row.first_review_commitment)}</b></div><div class="rx-job-verification-detail"><small>Expected hiring date</small><b>${esc(row.expected_hiring_date)}</b></div></div>`);
  }

  function decorateAll(){
    document.querySelectorAll('#jobsList .rx-job-card,#overviewJobs .rx-job-card').forEach(card => {
      const id = jobIdFromCard(card);
      decorateCard(card,verificationMap.get(String(id)));
    });
  }

  function updateOverview(){
    const rows = [...verificationMap.values()].filter(v => v.verification_status === 'verified').sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    const row = rows[0];
    const container = document.querySelector('.rx-verified-overview');
    if (!container) return;
    const statusRows = container.querySelectorAll('.rx-status-row');
    if (statusRows[0]) statusRows[0].querySelector('span').textContent = row ? 'Verified and actively hiring' : 'No verified vacancy yet';
    if (statusRows[1]) statusRows[1].querySelector('span').textContent = row?.hiring_owner_name || 'Not assigned';
    if (statusRows[2]) statusRows[2].querySelector('span').textContent = row?.first_review_commitment || 'Not set';
  }

  async function findSavedJob(submission){
    const { data,error } = await client.from('jobs').select('id,title,company,updated_at').eq('employer_user_id',user.id).eq('title',submission.title).order('updated_at',{ascending:false}).limit(5);
    if (error) throw error;
    const exact = (data || []).find(j => !submission.company || String(j.company || '').toLowerCase() === submission.company.toLowerCase());
    return exact || (data || [])[0] || null;
  }

  async function saveVerificationForSubmission(submission){
    if (!complete(submission) || !client || !user) return;
    let job = null;
    for (let attempt=0; attempt<8 && !job; attempt++) {
      await new Promise(r => setTimeout(r,attempt === 0 ? 700 : 350));
      job = await findSavedJob(submission);
    }
    if (!job) throw new Error('The newly saved job could not be found.');
    const now = new Date();
    const reconfirm = new Date(now.getTime() + 30*24*60*60*1000);
    const payload = {
      job_id: String(job.id),
      hiring_owner_name: submission.hiring_owner_name,
      hiring_owner_email: submission.hiring_owner_email,
      first_review_commitment: submission.first_review_commitment,
      expected_hiring_date: submission.expected_hiring_date,
      role_exists: true,
      budget_approved: true,
      applications_actively_reviewed: true,
      final_outcome_promised: true,
      verification_status: 'verified',
      verified_at: now.toISOString(),
      last_confirmed_at: now.toISOString(),
      reconfirm_by: reconfirm.toISOString(),
      updated_at: now.toISOString()
    };
    const { error } = await client.from('job_verifications').upsert(payload,{onConflict:'job_id'});
    if (error) throw error;
    await loadVerifications();
    showStatus('good','Job and verification details saved securely to Supabase.');
  }

  async function migrateExistingLocalVerification(){
    if (verificationMap.size) return;
    const status = read(STATUS_KEY);
    const draft = read(DRAFT_KEY);
    if (!/verified/i.test(status.status || '')) return;
    const submission = {
      title: status.jobTitle || '', company: status.company || '',
      hiring_owner_name: status.owner || draft.rxHiringOwner || '',
      hiring_owner_email: draft.rxHiringEmail || '',
      first_review_commitment: status.review || draft.rxReviewDays || '',
      expected_hiring_date: status.hiringDate || draft.rxHiringDate || '',
      role_exists: !!draft.rxRoleExists, budget_approved: !!draft.rxRoleFunded,
      applications_actively_reviewed: !!draft.rxRoleReviewed, final_outcome_promised: !!draft.rxFinalOutcome
    };
    if (!complete(submission)) return;
    try { await saveVerificationForSubmission(submission); }
    catch(error){ console.warn('Existing verification migration failed',error); }
  }

  function attachForm(){
    const form = document.getElementById('jobForm');
    if (!form || form.dataset.rxVerificationDbAttached) return;
    form.dataset.rxVerificationDbAttached = 'true';
    form.addEventListener('submit',event => {
      if (event.defaultPrevented) return;
      const submission = formVerification();
      if (!complete(submission)) return;
      pendingSubmission = submission;
      setTimeout(async () => {
        if (!pendingSubmission) return;
        const item = pendingSubmission;
        pendingSubmission = null;
        try { await saveVerificationForSubmission(item); }
        catch(error){ console.warn('Verification save error',error); showStatus('bad',error.message || 'Job saved, but verification details could not be saved.'); }
      },100);
    });
  }

  async function init(){
    try {
      const lib = await loadSupabase();
      client = lib.createClient(URL,KEY);
      const { data } = await client.auth.getSession();
      user = data?.session?.user || null;
      if (!user) return;
      await loadVerifications();
      await migrateExistingLocalVerification();
      attachForm();
      const observer = new MutationObserver(() => { attachForm(); decorateAll(); updateOverview(); });
      observer.observe(document.documentElement,{subtree:true,childList:true});
    } catch(error){ console.warn('Verified jobs Supabase init error',error); }
  }

  init();
})();