(() => {
  if (window.__rolexaEmployerApplicationHiringStages) return;
  window.__rolexaEmployerApplicationHiringStages = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const TERMINAL_STATUSES = new Set(['withdrawn', 'rejected', 'hired']);

  let db = null;
  let currentUser = null;
  let rowsByApplication = new Map();
  let decorating = false;

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));

  function addStyles() {
    if (document.getElementById('rxApplicationHiringStageStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxApplicationHiringStageStyles';
    style.textContent = `
      .rx-stage-panel{grid-column:1/-1;border:1px solid rgba(23,107,255,.14);background:#F8FAFF;border-radius:15px;padding:13px 14px;display:grid;gap:10px;margin-top:3px}
      .rx-stage-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .rx-stage-current{font-size:13px;font-weight:900;color:#071025}
      .rx-stage-current span{display:block;color:#6B7280;font-size:11.5px;font-weight:700;margin-top:3px}
      .rx-stage-count{display:inline-flex;align-items:center;border-radius:999px;background:#E9EDFF;color:#2946C7;padding:6px 9px;font-size:11.5px;font-weight:900;white-space:nowrap}
      .rx-stage-track{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:2px 0 5px;scrollbar-width:thin}
      .rx-stage-node{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(7,16,37,.1);background:#fff;border-radius:999px;padding:7px 9px;font-size:11.5px;font-weight:850;color:#6B7280;white-space:nowrap;flex:0 0 auto}
      .rx-stage-node:before{content:'';width:9px;height:9px;border-radius:50%;background:#DDE5F7;box-shadow:0 0 0 4px #F1F5FD}
      .rx-stage-node.done{border-color:rgba(34,160,107,.2);background:#F2FBF7;color:#176B49}
      .rx-stage-node.done:before{background:#22A06B;box-shadow:0 0 0 4px #DDF4E9}
      .rx-stage-node.current{border-color:rgba(23,107,255,.28);background:#EEF3FF;color:#2946C7}
      .rx-stage-node.current:before{background:#176BFF;box-shadow:0 0 0 4px #DDE8FF}
      .rx-stage-arrow{color:#AAB6D8;font-size:12px;flex:0 0 auto}
      .rx-next-stage-btn{border:0;background:#176BFF;color:#fff;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:900;min-height:36px}
      .rx-next-stage-btn:disabled{opacity:.62;cursor:not-allowed}
      .rx-stage-finished{font-size:12px;font-weight:850;color:#6B7280}
      .rx-stage-error{grid-column:1/-1;border:1px solid rgba(224,83,63,.18);background:#FFF8F6;color:#A33327;border-radius:13px;padding:10px 11px;font-size:12px;line-height:1.45}
      @media(max-width:760px){
        .rx-stage-panel{padding:12px;gap:9px}
        .rx-stage-panel-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center}
        .rx-stage-track{margin-right:-4px}
        .rx-next-stage-btn{width:100%;grid-column:1/-1;min-height:42px}
      }
      @media(max-width:420px){
        .rx-stage-panel-head{grid-template-columns:1fr}
        .rx-stage-count{justify-self:start}
        .rx-stage-node{font-size:11px;padding:7px 8px}
      }
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase() {
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

  function broadStatusFor(stage) {
    const type = String(stage?.stage_type || '').toLowerCase();
    if (type === 'review') return 'Applied';
    if (type === 'shortlist') return 'Shortlisted';
    if (type === 'offer') return 'Offer';
    if (type === 'assessment' || type === 'interview' || type === 'custom') return 'Interview';
    return 'Interview';
  }

  async function loadStageRows() {
    if (!db || !currentUser) return;

    const jobsResult = await db
      .from('jobs')
      .select('id')
      .eq('employer_user_id', currentUser.id);
    if (jobsResult.error) throw jobsResult.error;

    const jobIds = (jobsResult.data || []).map(job => job.id).filter(Boolean);
    if (!jobIds.length) {
      rowsByApplication = new Map();
      return;
    }

    const [applicationsResult, stagesResult] = await Promise.all([
      db.from('candidate_applications')
        .select('id,job_id,status,current_hiring_stage_id,hiring_stage_updated_at')
        .in('job_id', jobIds),
      db.from('job_hiring_stages')
        .select('id,job_id,stage_order,stage_name,stage_type,stage_description')
        .in('job_id', jobIds)
        .order('stage_order', { ascending: true })
    ]);

    if (applicationsResult.error) throw applicationsResult.error;
    if (stagesResult.error) throw stagesResult.error;

    const stagesByJob = new Map();
    (stagesResult.data || []).forEach(stage => {
      const list = stagesByJob.get(stage.job_id) || [];
      list.push(stage);
      stagesByJob.set(stage.job_id, list);
    });

    rowsByApplication = new Map((applicationsResult.data || []).map(application => [
      application.id,
      { application, stages: stagesByJob.get(application.job_id) || [] }
    ]));
  }

  function currentIndex(row) {
    const stages = row?.stages || [];
    if (!stages.length) return -1;
    const selected = stages.findIndex(stage => stage.id === row.application.current_hiring_stage_id);
    if (selected >= 0) return selected;

    const status = String(row.application.status || '').toLowerCase();
    const type = status === 'applied' ? 'review'
      : status === 'shortlisted' ? 'shortlist'
      : status === 'interview' ? 'interview'
      : status === 'offer' || status === 'hired' ? 'offer'
      : '';
    return type ? stages.findIndex(stage => stage.stage_type === type) : -1;
  }

  function trackHtml(stages, index) {
    return stages.map((stage, stageIndex) => {
      const state = stageIndex < index ? 'done' : stageIndex === index ? 'current' : '';
      const arrow = stageIndex < stages.length - 1 ? '<span class="rx-stage-arrow">→</span>' : '';
      return `<span class="rx-stage-node ${state}">${safe(stage.stage_name)}</span>${arrow}`;
    }).join('');
  }

  function panelHtml(applicationId, row) {
    const stages = row.stages || [];
    const status = String(row.application.status || 'Applied');
    const terminal = TERMINAL_STATUSES.has(status.toLowerCase());
    const index = currentIndex(row);
    const effectiveIndex = index >= 0 ? index : 0;
    const current = stages[effectiveIndex];
    const next = stages[effectiveIndex + 1];

    if (!stages.length) {
      return '<div class="rx-stage-error">This role does not have a hiring process yet. Edit the job and save its stages before moving this candidate.</div>';
    }

    let action = '';
    if (terminal) {
      action = `<span class="rx-stage-finished">This application is ${safe(status.toLowerCase())} and cannot be progressed.</span>`;
    } else if (next) {
      const label = next.stage_type === 'offer' ? `Move to ${next.stage_name}` : `Next stage: ${next.stage_name}`;
      action = `<button class="rx-next-stage-btn" type="button" data-rx-next-stage="${safe(applicationId)}">${safe(label)}</button>`;
    } else {
      action = '<span class="rx-stage-finished">Final hiring stage reached. Use Mark hired when the candidate accepts.</span>';
    }

    return `<div class="rx-stage-panel" data-rx-stage-panel="${safe(applicationId)}">
      <div class="rx-stage-panel-head">
        <div class="rx-stage-current">${safe(current?.stage_name || 'Application review')}<span>Current stage for this application</span></div>
        <span class="rx-stage-count">Stage ${Math.min(effectiveIndex + 1, stages.length)} of ${stages.length}</span>
        ${action}
      </div>
      <div class="rx-stage-track" aria-label="Hiring process">${trackHtml(stages, effectiveIndex)}</div>
    </div>`;
  }

  function applicationIdFromCard(card) {
    const control = card.querySelector('[data-app-id], [data-review-profile], [data-review-cv]');
    return control?.getAttribute('data-app-id')
      || control?.getAttribute('data-review-profile')
      || control?.getAttribute('data-review-cv')
      || '';
  }

  function hideFixedProgressionButtons(card) {
    card.querySelectorAll('[data-app-id][data-next-status]').forEach(button => {
      const next = String(button.getAttribute('data-next-status') || '').toLowerCase();
      if (!['rejected', 'hired'].includes(next)) button.remove();
    });
  }

  function decorateCards() {
    if (decorating) return;
    decorating = true;
    try {
      document.querySelectorAll('.rx-app-card').forEach(card => {
        const applicationId = applicationIdFromCard(card);
        if (!applicationId) return;
        const row = rowsByApplication.get(applicationId);
        if (!row) return;
        hideFixedProgressionButtons(card);
        card.querySelector(`[data-rx-stage-panel="${CSS.escape(applicationId)}"]`)?.remove();
        const actions = card.querySelector('.rx-app-actions');
        if (actions) actions.insertAdjacentHTML('afterend', panelHtml(applicationId, row));
      });
    } finally {
      decorating = false;
    }
  }

  function showStatus(message, type = 'info') {
    const bar = document.getElementById('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4800);
  }

  async function moveNext(applicationId, button) {
    const row = rowsByApplication.get(applicationId);
    if (!row || !db || !currentUser) return;

    const index = currentIndex(row);
    const next = row.stages[(index >= 0 ? index : 0) + 1];
    if (!next) return;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving next stage...';

    const update = {
      current_hiring_stage_id: next.id,
      hiring_stage_updated_at: new Date().toISOString(),
      status: broadStatusFor(next),
      updated_at: new Date().toISOString()
    };

    const result = await db
      .from('candidate_applications')
      .update(update)
      .eq('id', applicationId);

    if (result.error) {
      button.disabled = false;
      button.textContent = previousText;
      showStatus(result.error.message || 'Could not move this candidate to the next stage.', 'bad');
      return;
    }

    row.application.current_hiring_stage_id = next.id;
    row.application.hiring_stage_updated_at = update.hiring_stage_updated_at;
    row.application.status = update.status;
    showStatus(`Candidate moved to ${next.stage_name}.`, 'good');

    document.querySelectorAll('.rx-app-card').forEach(card => {
      if (applicationIdFromCard(card) !== applicationId) return;
      const tag = card.querySelector('.rx-app-title .tag');
      if (tag) tag.textContent = update.status;
    });
    decorateCards();
  }

  async function refresh() {
    try {
      await loadStageRows();
      decorateCards();
    } catch (error) {
      console.warn('[Rolexa] Hiring stage controls could not load.', error);
      showStatus(error.message || 'Hiring stages could not be loaded.', 'bad');
    }
  }

  async function init() {
    addStyles();
    try {
      const library = await loadSupabase();
      db = library.createClient(SUPABASE_URL, SUPABASE_KEY);
      const sessionResult = await db.auth.getSession();
      currentUser = sessionResult.data?.session?.user || null;
      if (!currentUser) return;
      await refresh();

      document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-rx-next-stage]');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        moveNext(button.getAttribute('data-rx-next-stage'), button);
      }, true);

      const observer = new MutationObserver(() => {
        clearTimeout(window.__rxHiringStageDecorateTimer);
        window.__rxHiringStageDecorateTimer = setTimeout(decorateCards, 80);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      document.addEventListener('click', event => {
        if (event.target.closest?.('[data-view="matches"]')) setTimeout(refresh, 180);
      });
    } catch (error) {
      console.warn('[Rolexa] Hiring stage controls failed to initialise.', error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();