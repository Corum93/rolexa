(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerifiedJobsSafe) return;
  window.__rolexaVerifiedJobsSafe = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;
  let currentUser = null;
  let verificationMap = new Map();

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function showStatus(kind, message) {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${kind}`;
    bar.textContent = message;
    clearTimeout(window.__rxVerifiedSafeStatusTimer);
    window.__rxVerifiedSafeStatusTimer = setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4500);
  }

  function addStyles() {
    if (byId('rxVerifiedJobsSafeStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerifiedJobsSafeStyles';
    style.textContent = `
      .rx-safe-verified-hero{background:linear-gradient(135deg,#071025,#173b88);color:#fff;border-radius:22px;padding:22px 24px;margin-bottom:16px}
      .rx-safe-verified-hero small{display:block;color:#a9bcff;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}.rx-safe-verified-hero h2{font-size:23px;margin-bottom:7px}.rx-safe-verified-hero p{color:#d5def7;font-size:13px;line-height:1.55;margin:0;max-width:820px}
      .rx-safe-verification{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:14px;border:1px solid rgba(23,107,255,.14);background:#f8faff;border-radius:18px;padding:16px}
      .rx-safe-panel h3{font-size:16px;margin-bottom:5px}.rx-safe-panel p{font-size:12px;color:#6b7280;line-height:1.45;margin:0 0 11px}.rx-safe-checks{display:grid;gap:8px}.rx-safe-check{display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:12px;padding:10px;font-size:12px;font-weight:800;line-height:1.4}.rx-safe-check input{margin-top:2px;accent-color:#176bff}
      .rx-safe-trust-preview{grid-column:1/-1;background:#effaf5;border:1px solid rgba(34,160,107,.18);border-radius:14px;padding:12px 13px;display:flex;justify-content:space-between;gap:12px;align-items:center}.rx-safe-trust-preview b{color:#176b49}.rx-safe-trust-preview span{font-size:12px;color:#587064}
      .rx-safe-verified-badge{display:inline-flex;align-items:center;gap:5px;background:#e1f6eb;color:#176b49;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900}.rx-safe-verified-badge:before{content:'✓';display:inline-flex;width:15px;height:15px;border-radius:50%;background:#22a06b;color:#fff;align-items:center;justify-content:center;font-size:9px}
      .rx-safe-verification-details{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border:1px solid rgba(34,160,107,.16);background:#f3fbf7;border-radius:14px;padding:11px 12px}.rx-safe-verification-details small{display:block;color:#667085;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}.rx-safe-verification-details b{display:block;color:#176b49;font-size:12px;overflow-wrap:anywhere}
      .rx-safe-overview{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin:16px 0}.rx-safe-overview .card p{font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 12px}.rx-safe-status-list{display:grid;gap:8px}.rx-safe-status-row{display:flex;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:#f8faff;font-size:12px}.rx-safe-status-row b{color:#172753}
      @media(max-width:900px){.rx-safe-verification,.rx-safe-overview{grid-template-columns:1fr}}
      @media(max-width:760px){.rx-safe-verified-hero{padding:19px 17px}.rx-safe-verification-details{grid-template-columns:1fr}.rx-safe-trust-preview{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function addField(parent, label, id, type = 'text', options = []) {
    const field = document.createElement('div');
    field.className = 'field';
    if (type === 'select') {
      field.innerHTML = `<label for="${id}">${label}</label><select id="${id}"><option value="">Select an option</option>${options.map(option => `<option>${esc(option)}</option>`).join('')}</select>`;
    } else {
      field.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="${type}">`;
    }
    parent.appendChild(field);
  }

  function addInterface() {
    const form = byId('jobForm');
    if (!form || form.dataset.rxSafeVerifiedEnhanced === 'true') return false;
    form.dataset.rxSafeVerifiedEnhanced = 'true';

    const head = document.querySelector('#postJobPage .page-head');
    if (head && !document.querySelector('.rx-safe-verified-hero')) {
      head.insertAdjacentHTML('afterend', `<div class="rx-safe-verified-hero"><small>Phase 2 · Verified jobs</small><h2>Publish roles that are real, funded and actively managed.</h2><p>Assign a hiring owner, set a clear review promise and confirm that every candidate will receive an outcome.</p></div>`);
    }

    const salary = byId('salaryRange');
    if (salary) salary.required = true;

    const descriptionField = byId('jobDescription')?.closest('.field');
    if (!descriptionField) return false;

    const block = document.createElement('div');
    block.className = 'rx-safe-verification';
    block.innerHTML = `<div class="rx-safe-panel" id="rxSafeOwnerPanel"><h3>Hiring ownership</h3><p>Name the person responsible for reviewing applications and completing this hiring process.</p><div class="form-grid" id="rxSafeOwnerFields"></div></div><div class="rx-safe-panel"><h3>Vacancy confirmation</h3><p>All four confirmations are required before the vacancy is verified.</p><div class="rx-safe-checks"><label class="rx-safe-check"><input id="rxSafeRoleExists" type="checkbox"><span>The position genuinely exists and is approved to hire.</span></label><label class="rx-safe-check"><input id="rxSafeBudget" type="checkbox"><span>The salary or hiring budget is approved.</span></label><label class="rx-safe-check"><input id="rxSafeReviewed" type="checkbox"><span>Applications will be actively reviewed.</span></label><label class="rx-safe-check"><input id="rxSafeOutcome" type="checkbox"><span>Every applicant will receive a final outcome.</span></label></div></div><div class="rx-safe-trust-preview"><div><b id="rxSafePreviewTitle">Verification incomplete</b><br><span id="rxSafePreviewText">Complete the hiring details and confirmations.</span></div><span>Candidate trust preview</span></div>`;
    descriptionField.insertAdjacentElement('afterend', block);

    const ownerFields = byId('rxSafeOwnerFields');
    addField(ownerFields, 'Hiring owner name', 'rxSafeOwnerName');
    addField(ownerFields, 'Hiring owner email', 'rxSafeOwnerEmail', 'email');
    addField(ownerFields, 'Expected first review', 'rxSafeReview', 'select', ['Within 2 working days','Within 5 working days','Within 7 working days','Within 10 working days']);
    addField(ownerFields, 'Expected hiring date', 'rxSafeHiringDate', 'date');

    const saveButton = byId('saveJobBtn');
    if (saveButton) saveButton.textContent = 'Verify and publish job';

    ['input','change'].forEach(eventName => form.addEventListener(eventName, updatePreview));
    form.addEventListener('submit', handleSubmit, true);
    updatePreview();
    addOverview();
    return true;
  }

  function verificationValues() {
    return {
      title: byId('jobTitle')?.value.trim() || '',
      company: byId('company')?.value.trim() || '',
      salary: byId('salaryRange')?.value.trim() || '',
      hiring_owner_name: byId('rxSafeOwnerName')?.value.trim() || '',
      hiring_owner_email: byId('rxSafeOwnerEmail')?.value.trim() || '',
      first_review_commitment: byId('rxSafeReview')?.value || '',
      expected_hiring_date: byId('rxSafeHiringDate')?.value || '',
      role_exists: !!byId('rxSafeRoleExists')?.checked,
      budget_approved: !!byId('rxSafeBudget')?.checked,
      applications_actively_reviewed: !!byId('rxSafeReviewed')?.checked,
      final_outcome_promised: !!byId('rxSafeOutcome')?.checked
    };
  }

  function isComplete(values) {
    return Boolean(values.title && values.company && values.salary && values.hiring_owner_name && values.hiring_owner_email && values.first_review_commitment && values.expected_hiring_date && values.role_exists && values.budget_approved && values.applications_actively_reviewed && values.final_outcome_promised);
  }

  function updatePreview() {
    const values = verificationValues();
    const complete = isComplete(values);
    const title = byId('rxSafePreviewTitle');
    const text = byId('rxSafePreviewText');
    if (title) title.textContent = complete ? 'Verified and actively hiring' : 'Verification incomplete';
    if (text) text.textContent = complete ? `${values.first_review_commitment} · Named hiring owner · Final outcome promised` : 'Complete the salary, ownership details and all four confirmations.';
  }

  function handleSubmit(event) {
    const values = verificationValues();
    if (!isComplete(values)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showStatus('bad', 'Complete the salary, hiring owner details and all four confirmations before publishing.');
      document.querySelector('.rx-safe-verification')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    window.__rxPendingVerifiedSubmission = values;
    setTimeout(() => savePendingVerification(), 250);
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  async function loadVerifications() {
    if (!client || !currentUser) return;
    const { data, error } = await client.from('job_verifications').select('*');
    if (error) {
      console.warn('[Rolexa] Could not load job verifications', error);
      return;
    }
    verificationMap = new Map((data || []).map(row => [String(row.job_id), row]));
    decorateWithRetries();
    updateOverview();
  }

  async function findLatestJob(values) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await wait(attempt === 0 ? 650 : 350);
      const { data, error } = await client.from('jobs').select('id,title,company,updated_at').eq('employer_user_id', currentUser.id).eq('title', values.title).order('updated_at', { ascending: false }).limit(5);
      if (error) throw error;
      const match = (data || []).find(job => String(job.company || '').toLowerCase() === values.company.toLowerCase()) || (data || [])[0];
      if (match) return match;
    }
    return null;
  }

  async function savePendingVerification() {
    const values = window.__rxPendingVerifiedSubmission;
    window.__rxPendingVerifiedSubmission = null;
    if (!values || !client || !currentUser) return;
    try {
      const job = await findLatestJob(values);
      if (!job) throw new Error('The newly published job could not be matched to its verification record.');
      const now = new Date();
      const payload = {
        job_id: String(job.id),
        hiring_owner_name: values.hiring_owner_name,
        hiring_owner_email: values.hiring_owner_email,
        first_review_commitment: values.first_review_commitment,
        expected_hiring_date: values.expected_hiring_date,
        role_exists: true,
        budget_approved: true,
        applications_actively_reviewed: true,
        final_outcome_promised: true,
        verification_status: 'verified',
        verified_at: now.toISOString(),
        last_confirmed_at: now.toISOString(),
        reconfirm_by: new Date(now.getTime() + 30 * 86400000).toISOString(),
        updated_at: now.toISOString()
      };
      const { error } = await client.from('job_verifications').upsert(payload, { onConflict: 'job_id' });
      if (error) throw error;
      await loadVerifications();
      showStatus('good', 'Job and verification details saved securely to Supabase.');
    } catch (error) {
      console.warn('[Rolexa] Verification save failed', error);
      showStatus('bad', error.message || 'The job saved, but its verification details could not be saved.');
    }
  }

  function jobIdFromCard(card) {
    const button = [...card.querySelectorAll('button')].find(item => /rolexaEmployerEditJob/.test(item.getAttribute('onclick') || ''));
    return (button?.getAttribute('onclick') || '').match(/rolexaEmployerEditJob\('([^']+)'\)/)?.[1] || '';
  }

  function decorateCards() {
    const cards = document.querySelectorAll('#jobsList .rx-job-card, #overviewJobs .rx-job-card');
    cards.forEach(card => {
      const jobId = jobIdFromCard(card);
      const row = verificationMap.get(String(jobId));
      if (!row || row.verification_status !== 'verified' || card.dataset.rxSafeVerified === String(row.updated_at)) return;
      card.querySelectorAll('.rx-safe-verified-badge,.rx-safe-verification-details').forEach(element => element.remove());
      const actions = card.querySelector('.rx-job-actions,.actions');
      actions?.insertAdjacentHTML('afterbegin', '<span class="rx-safe-verified-badge">Verified active</span>');
      card.insertAdjacentHTML('beforeend', `<div class="rx-safe-verification-details"><div><small>Hiring owner</small><b>${esc(row.hiring_owner_name)}</b></div><div><small>Candidate review promise</small><b>${esc(row.first_review_commitment)}</b></div><div><small>Expected hiring date</small><b>${esc(row.expected_hiring_date)}</b></div></div>`);
      card.dataset.rxSafeVerified = String(row.updated_at);
    });
  }

  function decorateWithRetries() {
    let attempts = 0;
    const timer = setInterval(() => {
      decorateCards();
      attempts += 1;
      if (attempts >= 12) clearInterval(timer);
    }, 400);
  }

  function addOverview() {
    const overview = byId('overviewPage');
    if (!overview || overview.querySelector('.rx-safe-overview')) return;
    const anchor = overview.querySelector('.two');
    const section = document.createElement('div');
    section.className = 'rx-safe-overview';
    section.innerHTML = `<article class="card"><h2>Verified vacancy standard</h2><p>Each verified role has its own hiring owner, response commitment and expected hiring date stored securely in Supabase.</p><div class="rx-safe-status-list"><div class="rx-safe-status-row"><b>Verified vacancies</b><span id="rxSafeVerifiedCount">0</span></div><div class="rx-safe-status-row"><b>Latest hiring owner</b><span id="rxSafeLatestOwner">Not assigned</span></div><div class="rx-safe-status-row"><b>Latest review promise</b><span id="rxSafeLatestReview">Not set</span></div></div></article><article class="card"><h2>Candidate trust</h2><p>Verified signals help candidates see that a vacancy is genuine, actively reviewed and expected to reach a real outcome.</p><button class="primary" type="button" onclick="window.rolexaEmployerShowView('postJob')">Create a verified job</button></article>`;
    anchor?.insertAdjacentElement('beforebegin', section);
  }

  function updateOverview() {
    addOverview();
    const verified = [...verificationMap.values()].filter(row => row.verification_status === 'verified').sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    if (byId('rxSafeVerifiedCount')) byId('rxSafeVerifiedCount').textContent = String(verified.length);
    if (byId('rxSafeLatestOwner')) byId('rxSafeLatestOwner').textContent = verified[0]?.hiring_owner_name || 'Not assigned';
    if (byId('rxSafeLatestReview')) byId('rxSafeLatestReview').textContent = verified[0]?.first_review_commitment || 'Not set';
  }

  async function init() {
    addStyles();
    addInterface();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await client.auth.getSession();
      currentUser = data?.session?.user || null;
      if (!currentUser) return;
      await loadVerifications();
    } catch (error) {
      console.warn('[Rolexa] Safe verified jobs init failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();