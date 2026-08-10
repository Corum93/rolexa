(() => {
  if (window.__rolexaEmployerCareerEvidence) return;
  window.__rolexaEmployerCareerEvidence = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;
  let currentUser = null;
  let definitions = [];
  let issuedByApplication = new Map();
  let applicationContext = new Map();
  let decorating = false;

  const SOURCE_OPTIONS = [
    ['application_review', 'Application review'],
    ['screening', 'Screening'],
    ['interview', 'Interview'],
    ['case_presentation', 'Case presentation'],
    ['role_specific_task', 'Role-specific task'],
    ['reference_check', 'Reference check'],
    ['employment_verification', 'Employment verification']
  ];

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));
  const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

  function addStyles() {
    if (byId('rxCareerEvidenceStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCareerEvidenceStyles';
    style.textContent = `
      .rx-evidence-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;width:100%;margin-top:3px}
      .rx-evidence-issue-btn{border:1px solid rgba(23,107,255,.22);background:#EEF3FF;color:#2946C7;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;transition:background .18s ease,border-color .18s ease,transform .18s ease}
      .rx-evidence-issue-btn:hover{background:#E0E9FF;border-color:rgba(23,107,255,.35);transform:translateY(-1px)}
      .rx-evidence-count{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#E1F6EB;color:#176B49;padding:7px 9px;font-size:11px;font-weight:900}
      .rx-evidence-modal-backdrop{position:fixed;inset:0;background:rgba(5,13,32,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);z-index:10020;display:flex;align-items:center;justify-content:center;padding:24px}
      .rx-evidence-modal{position:relative;width:min(720px,100%);max-height:92vh;overflow:auto;background:#FBFCFF;border-radius:26px;border:1px solid rgba(255,255,255,.56);box-shadow:0 34px 100px rgba(2,10,30,.42),0 2px 8px rgba(2,10,30,.08);scrollbar-width:thin}
      .rx-evidence-modal:before{content:"";position:absolute;top:0;left:32px;right:32px;height:3px;border-radius:0 0 999px 999px;background:linear-gradient(90deg,#176BFF,#6C7BFF,#21B68B)}
      .rx-evidence-modal-head{padding:29px 30px 24px;border-bottom:1px solid #E9EDF5;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;background:linear-gradient(180deg,#FFFFFF 0%,#FCFDFF 100%)}
      .rx-evidence-title-wrap{display:flex;align-items:flex-start;gap:14px;min-width:0}
      .rx-evidence-title-icon{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border-radius:14px;color:#176BFF;background:linear-gradient(145deg,#E8F0FF,#F4F7FF);border:1px solid #DCE7FF;box-shadow:0 8px 22px rgba(23,107,255,.13)}
      .rx-evidence-title-icon svg{width:22px;height:22px}
      .rx-evidence-eyebrow{display:block;margin:0 0 5px;color:#176BFF;font-size:10.5px;font-weight:900;letter-spacing:.105em;text-transform:uppercase}
      .rx-evidence-modal-head h2{font-size:25px;line-height:1.16;letter-spacing:-.025em;color:#071025;margin:0}
      .rx-evidence-modal-head p{font-size:13px;color:#69758B;line-height:1.55;margin:7px 0 0;max-width:510px}
      .rx-evidence-modal-close{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:1px solid #E2E7F0;background:#fff;color:#526078;border-radius:12px;padding:0;font-size:21px;line-height:1;cursor:pointer;transition:color .18s ease,border-color .18s ease,background .18s ease}
      .rx-evidence-modal-close:hover{color:#071025;border-color:#C8D1E0;background:#F6F8FC}
      .rx-evidence-modal-body{display:block}
      .rx-evidence-modal-content{padding:22px 30px 24px;display:grid;gap:18px}
      .rx-evidence-principle{display:flex;align-items:flex-start;gap:11px;border:1px solid #DCE7FF;background:linear-gradient(135deg,#F0F5FF,#F7F9FF);color:#385177;border-radius:16px;padding:13px 14px;font-size:12px;line-height:1.55;font-weight:550}
      .rx-evidence-principle-icon{width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:9px;background:#fff;color:#176BFF;box-shadow:0 2px 8px rgba(23,107,255,.1)}
      .rx-evidence-principle-icon svg{width:14px;height:14px}
      .rx-evidence-principle b{display:block;color:#193966;font-weight:850;margin-bottom:1px}
      .rx-evidence-form-shell{border:1px solid #E4E9F2;background:#fff;border-radius:18px;padding:19px;box-shadow:0 7px 24px rgba(10,23,56,.045)}
      .rx-evidence-form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:14px;row-gap:17px}
      .rx-evidence-field{display:flex;flex-direction:column;align-self:start;gap:7px;min-width:0}
      .rx-evidence-field.full{grid-column:1/-1}
      .rx-evidence-field label{font-size:10.5px;text-transform:uppercase;letter-spacing:.065em;color:#465774;font-weight:900}
      .rx-evidence-field select,.rx-evidence-field textarea{box-sizing:border-box;width:100%;border:1px solid #D7DEEA;background:#F9FAFD;color:#071025;border-radius:12px;padding:12px 13px;font:inherit;font-size:13px;outline:none;box-shadow:0 1px 2px rgba(10,23,56,.025);transition:border-color .18s ease,background .18s ease,box-shadow .18s ease}
      .rx-evidence-field select{height:44px;appearance:auto}
      .rx-evidence-field textarea{min-height:98px;resize:vertical;line-height:1.5}
      .rx-evidence-field select:hover,.rx-evidence-field textarea:hover{border-color:#BEC9DA}
      .rx-evidence-field select:focus,.rx-evidence-field textarea:focus{border-color:#176BFF;background:#fff;box-shadow:0 0 0 3px rgba(23,107,255,.11)}
      .rx-evidence-help{font-size:11.5px;color:#7A879F;line-height:1.45}
      .rx-evidence-stage-help{display:flex;align-items:center;gap:6px;color:#687893}
      .rx-evidence-stage-dot{width:6px;height:6px;flex:0 0 6px;border-radius:999px;background:#21A679;box-shadow:0 0 0 3px rgba(33,166,121,.1)}
      .rx-evidence-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 30px 19px;border-top:1px solid #E9EDF5;background:#fff}
      .rx-evidence-approval-note{display:flex;align-items:center;gap:8px;color:#6C7890;font-size:11.5px;font-weight:650}
      .rx-evidence-approval-note svg{width:15px;height:15px;color:#526B98}
      .rx-evidence-submit{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;background:linear-gradient(135deg,#176BFF,#1D5FE8);color:#fff;border-radius:12px;padding:12px 17px;font-size:12.5px;font-weight:900;box-shadow:0 9px 20px rgba(23,107,255,.22);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
      .rx-evidence-submit:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(23,107,255,.27);filter:brightness(1.03)}
      .rx-evidence-submit svg{width:15px;height:15px}
      .rx-evidence-submit:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
      @media(max-width:700px){
        .rx-evidence-modal-backdrop{padding:8px 8px 0;align-items:flex-end}
        .rx-evidence-modal{max-height:94vh;border-radius:24px 24px 0 0}
        .rx-evidence-modal:before{left:24px;right:24px}
        .rx-evidence-modal-head{padding:24px 18px 20px}
        .rx-evidence-title-icon{width:40px;height:40px;flex-basis:40px;border-radius:13px}
        .rx-evidence-modal-head h2{font-size:22px}
        .rx-evidence-modal-content{padding:18px}
        .rx-evidence-form-shell{padding:16px}
        .rx-evidence-form-grid{grid-template-columns:1fr;row-gap:16px}
        .rx-evidence-field.full{grid-column:auto}
        .rx-evidence-modal-actions{align-items:stretch;flex-direction:column;padding:16px 18px calc(18px + env(safe-area-inset-bottom))}
        .rx-evidence-submit{width:100%}
      }
      @media(max-width:430px){.rx-evidence-title-icon{display:none}.rx-evidence-modal-head p{font-size:12.5px}.rx-evidence-principle{padding:12px}.rx-evidence-approval-note{justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not connect to verified evidence.'));
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  function showStatus(message, type = 'info') {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4800);
  }

  function applicationIdFromCard(card) {
    const direct = card.getAttribute('data-evidence-application-id');
    if (direct) return direct;
    const control = card.querySelector('[data-app-id], [data-stage-app-id], [data-review-profile], [data-review-cv]');
    return control?.getAttribute('data-app-id')
      || control?.getAttribute('data-stage-app-id')
      || control?.getAttribute('data-review-profile')
      || control?.getAttribute('data-review-cv')
      || '';
  }

  function orderedStages(stages) {
    return [...stages].sort((left, right) =>
      Number(left.stage_order || 0) - Number(right.stage_order || 0)
    );
  }

  function stageSupports(stage, capability) {
    const type = String(stage?.stage_type || '').toLowerCase();
    const name = String(stage?.stage_name || '').toLowerCase();
    if (capability === 'interview') return type === 'interview' || /interview|\bround\b|phone screen|screening call/.test(name);
    if (capability === 'assessment') return type === 'assessment' || /assessment|task|case|presentation|test|exercise/.test(name);
    if (capability === 'offer') return type === 'offer' || /offer|reference|employment verification/.test(name);
    return false;
  }

  function sourcesForApplication(application, stages) {
    const allowed = new Set(['application_review', 'screening']);
    if (!application || String(application.status || '').toLowerCase() === 'withdrawn') return [];
    const ordered = orderedStages(stages || []);
    let currentIndex = ordered.findIndex(stage => stage.id === application.current_hiring_stage_id);
    if (currentIndex < 0) currentIndex = 0;
    ordered.slice(0, currentIndex + 1).forEach(stage => {
      if (stageSupports(stage, 'interview')) allowed.add('interview');
      if (stageSupports(stage, 'assessment')) {
        allowed.add('case_presentation');
        allowed.add('role_specific_task');
      }
      if (stageSupports(stage, 'offer')) {
        allowed.add('reference_check');
        allowed.add('employment_verification');
      }
    });
    return SOURCE_OPTIONS.filter(([value]) => allowed.has(value));
  }

  async function loadFoundation() {
    if (!client || !currentUser) return false;
    const [definitionResult, issuedResult, jobsResult] = await Promise.all([
      client.from('evidence_definitions').select('code,name,category,description,sort_order').eq('is_active', true).order('sort_order'),
      client.from('candidate_evidence').select('id,application_id,candidate_status,evidence_definition:evidence_definitions(code,name)').eq('issuing_employer_user_id', currentUser.id),
      client.from('jobs').select('id').eq('employer_user_id', currentUser.id)
    ]);
    if (definitionResult.error || issuedResult.error || jobsResult.error) return false;
    definitions = definitionResult.data || [];
    issuedByApplication = new Map();
    (issuedResult.data || []).forEach(row => {
      const list = issuedByApplication.get(row.application_id) || [];
      list.push(row);
      issuedByApplication.set(row.application_id, list);
    });

    applicationContext = new Map();
    const jobIds = (jobsResult.data || []).map(job => job.id).filter(Boolean);
    if (jobIds.length) {
      const [applicationsResult, stagesResult] = await Promise.all([
        client.from('candidate_applications').select('id,job_id,status,current_hiring_stage_id').in('job_id', jobIds),
        client.from('job_hiring_stages').select('id,job_id,stage_order,stage_name,stage_type').in('job_id', jobIds).order('stage_order')
      ]);
      if (applicationsResult.error || stagesResult.error) return false;
      const stagesByJob = new Map();
      (stagesResult.data || []).forEach(stage => {
        const list = stagesByJob.get(stage.job_id) || [];
        list.push(stage);
        stagesByJob.set(stage.job_id, list);
      });
      (applicationsResult.data || []).forEach(application => {
        const stages = orderedStages(stagesByJob.get(application.job_id) || []);
        applicationContext.set(application.id, {
          application,
          stages,
          sources: sourcesForApplication(application, stages)
        });
      });
    }
    return true;
  }

  function decorateCards() {
    if (decorating || !definitions.length) return;
    decorating = true;
    try {
      document.querySelectorAll('.rx-app-card, .rx-pipeline-card').forEach(card => {
        const applicationId = applicationIdFromCard(card);
        const actions = card.querySelector('.rx-app-actions, .rx-pipeline-card-actions');
        if (!applicationId || !actions) return;
        const context = applicationContext.get(applicationId);
        const withdrawn = String(context?.application?.status || '').toLowerCase() === 'withdrawn';
        const count = (issuedByApplication.get(applicationId) || []).length;
        const existing = actions.querySelector('[data-evidence-actions-for]');
        if (withdrawn) {
          existing?.remove();
          return;
        }
        if (existing?.dataset.evidenceCount === String(count)) return;
        const html = `<span class="rx-evidence-actions" data-evidence-actions-for="${safe(applicationId)}" data-evidence-count="${count}"><button class="rx-evidence-issue-btn" type="button" data-issue-evidence="${safe(applicationId)}">Verify positive evidence</button>${count ? `<span class="rx-evidence-count">✓ ${count} issued</span>` : ''}</span>`;
        if (existing) existing.outerHTML = html;
        else actions.insertAdjacentHTML('beforeend', html);
      });
    } finally {
      decorating = false;
    }
  }

  function availableDefinitions(applicationId) {
    const used = new Set((issuedByApplication.get(applicationId) || []).map(row => row.evidence_definition?.code).filter(Boolean));
    return definitions.filter(definition => !used.has(definition.code));
  }

  async function openModal(applicationId) {
    if (!(await loadFoundation())) {
      showStatus('Verified evidence could not be refreshed. Please try again.', 'bad');
      return;
    }
    decorateCards();
    const context = applicationContext.get(applicationId);
    if (!context) {
      showStatus('This application could not be verified for evidence.', 'bad');
      return;
    }
    if (String(context.application.status || '').toLowerCase() === 'withdrawn') {
      showStatus('Evidence cannot be issued because the candidate withdrew this application.', 'bad');
      return;
    }
    closeModal();
    const available = availableDefinitions(applicationId);
    const sourceOptions = context.sources.map(([value, label]) => `<option value="${safe(value)}">${safe(label)}</option>`).join('');
    const currentStage = context.stages.find(stage => stage.id === context.application.current_hiring_stage_id) || context.stages[0];
    const definitionOptions = available.map(definition => `<option value="${safe(definition.code)}">${safe(definition.name)} · ${safe(titleCase(definition.category))}</option>`).join('');
    const disabled = available.length && context.sources.length ? '' : 'disabled';
    document.body.insertAdjacentHTML('beforeend', `<div class="rx-evidence-modal-backdrop" id="rxEvidenceModal"><div class="rx-evidence-modal" role="dialog" aria-modal="true" aria-labelledby="rxEvidenceModalTitle">
      <div class="rx-evidence-modal-head">
        <div class="rx-evidence-title-wrap">
          <span class="rx-evidence-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 19 6v5c0 4.6-2.8 8.1-7 10-4.2-1.9-7-5.4-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8.7 12 2.1 2.1 4.6-4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <div><span class="rx-evidence-eyebrow">Career Passport</span><h2 id="rxEvidenceModalTitle">Verify positive evidence</h2><p>Create a trusted record of what this candidate genuinely demonstrated during your hiring process.</p></div>
        </div>
        <button class="rx-evidence-modal-close" type="button" data-close-evidence-modal aria-label="Close verified evidence form">&times;</button>
      </div>
      <form class="rx-evidence-modal-body" id="rxEvidenceForm" data-application-id="${safe(applicationId)}">
        <div class="rx-evidence-modal-content">
          <div class="rx-evidence-principle">
            <span class="rx-evidence-principle-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 19 6v5c0 4.6-2.8 8.1-7 10-4.2-1.9-7-5.4-7-10V6l7-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></span>
            <span><b>Keep the record factual and positive</b>Do not include rejection reasons, personality judgements, health information, protected characteristics or confidential interview notes.</span>
          </div>
          ${available.length ? '' : '<div class="rx-evidence-principle"><span><b>All evidence types issued</b>Every current evidence type has already been issued for this application.</span></div>'}
          <div class="rx-evidence-form-shell">
            <div class="rx-evidence-form-grid">
              <div class="rx-evidence-field full"><label for="rxEvidenceDefinition">Evidence type</label><select id="rxEvidenceDefinition" required ${disabled}>${definitionOptions}</select><span class="rx-evidence-help" id="rxEvidenceDefinitionHelp"></span></div>
              <div class="rx-evidence-field"><label for="rxEvidenceSource">How it was demonstrated</label><select id="rxEvidenceSource" required ${disabled}>${sourceOptions}</select><span class="rx-evidence-help rx-evidence-stage-help"><span class="rx-evidence-stage-dot" aria-hidden="true"></span>Available at reached stage${currentStage ? `: ${safe(currentStage.stage_name)}` : ''}</span></div>
              <div class="rx-evidence-field"><label for="rxEvidenceLevel">Demonstrated level</label><select id="rxEvidenceLevel" required ${disabled}><option value="demonstrated">Demonstrated</option><option value="strong">Strong</option><option value="advanced">Advanced</option></select></div>
              <div class="rx-evidence-field full"><label for="rxEvidenceNote">Short factual note <span aria-hidden="true">·</span> Optional</label><textarea id="rxEvidenceNote" maxlength="500" placeholder="Example: Presented a clear 90-day operational plan and answered follow-up questions using measurable assumptions."></textarea><span class="rx-evidence-help">Describe what was observed, not an opinion about the person. Maximum 500 characters.</span></div>
            </div>
          </div>
        </div>
        <div class="rx-evidence-modal-actions">
          <span class="rx-evidence-approval-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Candidate approval is required</span>
          <button class="rx-evidence-submit" type="submit" ${disabled}>Send for approval <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </form>
    </div></div>`);
    updateDefinitionHelp();
    byId('rxEvidenceDefinition')?.focus();
  }

  function closeModal() {
    byId('rxEvidenceModal')?.remove();
  }

  function updateDefinitionHelp() {
    const select = byId('rxEvidenceDefinition');
    const help = byId('rxEvidenceDefinitionHelp');
    const definition = definitions.find(item => item.code === select?.value);
    if (help) help.textContent = definition?.description || '';
  }

  async function submitEvidence(form) {
    const button = form.querySelector('[type="submit"]');
    const applicationId = form.dataset.applicationId;
    const note = byId('rxEvidenceNote')?.value.trim() || null;
    if (note && note.length < 3) {
      showStatus('The factual note must contain at least 3 characters or be left blank.', 'bad');
      return;
    }
    const previous = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Sending…';
    const result = await client.rpc('issue_candidate_evidence', {
      p_application_id: applicationId,
      p_definition_code: byId('rxEvidenceDefinition').value,
      p_demonstrated_level: byId('rxEvidenceLevel').value,
      p_evidence_source: byId('rxEvidenceSource').value,
      p_factual_note: note,
      p_expires_at: null
    });
    button.disabled = false;
    button.innerHTML = previous;
    if (result.error) {
      const rawMessage = result.error.message || '';
      const message = rawMessage.includes('EVIDENCE_ALREADY_ISSUED')
        ? 'That evidence type has already been issued for this application.'
        : rawMessage.includes('EVIDENCE_SOURCE_NOT_REACHED')
          ? 'That evidence source is not available until the candidate reaches the matching hiring stage.'
          : rawMessage.includes('WITHDRAWN_APPLICATION')
            ? 'Evidence cannot be issued because the candidate withdrew this application.'
            : rawMessage.includes('EMPLOYER_CANNOT_ISSUE_EVIDENCE_TO_SELF')
              ? 'Use a separate candidate account to test evidence. An employer cannot issue evidence to its own account.'
              : rawMessage || 'Could not issue verified evidence.';
      showStatus(message, 'bad');
      return;
    }
    closeModal();
    showStatus('Positive evidence sent to the candidate for approval.', 'good');
    await loadFoundation();
    decorateCards();
  }

  async function init() {
    addStyles();
    try {
      const library = await loadSupabase();
      client = library.createClient(SUPABASE_URL, SUPABASE_KEY);
      const sessionResult = await client.auth.getSession();
      currentUser = sessionResult.data?.session?.user || null;
      if (!currentUser || !(await loadFoundation())) return;

      decorateCards();
      const observer = new MutationObserver(() => {
        clearTimeout(window.__rxEvidenceDecorateTimer);
        window.__rxEvidenceDecorateTimer = setTimeout(decorateCards, 90);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      document.addEventListener('click', async event => {
        const issueButton = event.target.closest?.('[data-issue-evidence]');
        if (issueButton) {
          event.preventDefault();
          const previous = issueButton.textContent;
          issueButton.disabled = true;
          issueButton.textContent = 'Checking…';
          await openModal(issueButton.dataset.issueEvidence);
          if (issueButton.isConnected) {
            issueButton.disabled = false;
            issueButton.textContent = previous;
          }
          return;
        }
        if (event.target.closest?.('[data-close-evidence-modal]') || event.target.id === 'rxEvidenceModal') closeModal();
      });
      document.addEventListener('change', event => {
        if (event.target.id === 'rxEvidenceDefinition') updateDefinitionHelp();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && byId('rxEvidenceModal')) closeModal();
      });
      document.addEventListener('submit', event => {
        if (event.target.id !== 'rxEvidenceForm') return;
        event.preventDefault();
        submitEvidence(event.target);
      });
    } catch (error) {
      console.warn('[Rolexa] Verified career evidence could not initialise.', error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
