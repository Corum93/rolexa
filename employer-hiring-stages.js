(() => {
  if (window.__rolexaEmployerHiringStagesV1) return;
  window.__rolexaEmployerHiringStagesV1 = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const MIN_STAGES = 2;
  const MAX_STAGES = 8;
  const DEFAULT_STAGES = [
    { name: 'Application review', type: 'review' },
    { name: 'Shortlist', type: 'shortlist' },
    { name: 'Interview', type: 'interview' },
    { name: 'Offer', type: 'offer' }
  ];
  const TYPE_OPTIONS = [
    ['review', 'Application review'],
    ['shortlist', 'Shortlist'],
    ['assessment', 'Assessment or task'],
    ['interview', 'Interview'],
    ['offer', 'Offer'],
    ['custom', 'Other stage']
  ];

  let db = null;
  let currentUser = null;
  let editingJobId = null;
  let stages = DEFAULT_STAGES.map(stage => ({ ...stage }));
  let recommended = true;
  let pendingSave = false;

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));

  function addStyles() {
    if (byId('rxHiringStagesStylesV1')) return;
    const style = document.createElement('style');
    style.id = 'rxHiringStagesStylesV1';
    style.textContent = `
      .rx-hiring-process{grid-column:1/-1;border:1px solid rgba(23,107,255,.18);background:linear-gradient(180deg,#F8FAFF,#F3F7FF);border-radius:18px;padding:18px;display:grid;gap:16px}
      .rx-hiring-process-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
      .rx-hiring-process-head h2{font-size:18px;margin:0 0 5px;color:#071025}
      .rx-hiring-process-head p{font-size:13px;line-height:1.5;color:#6B7280;margin:0;max-width:720px}
      .rx-recommended-toggle{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(23,107,255,.18);background:#fff;border-radius:999px;padding:9px 12px;color:#16275A;font-size:12.5px;font-weight:900;cursor:pointer;white-space:nowrap}
      .rx-recommended-toggle input{width:17px;height:17px;margin:0;accent-color:#176BFF}
      .rx-stage-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .rx-stage-summary-item{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(7,16,37,.09);background:#fff;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:850;color:#24345E}
      .rx-stage-summary-number{display:inline-flex;width:20px;height:20px;border-radius:50%;align-items:center;justify-content:center;background:#176BFF;color:#fff;font-size:10px;font-weight:900}
      .rx-stage-arrow{color:#8CA6D8;font-weight:900}
      .rx-stage-builder{display:grid;gap:10px}
      .rx-stage-row{display:grid;grid-template-columns:38px minmax(180px,1fr) minmax(170px,.72fr) auto;gap:10px;align-items:center;border:1px solid rgba(7,16,37,.09);background:#fff;border-radius:14px;padding:10px}
      .rx-stage-index{width:30px;height:30px;border-radius:10px;background:#E9EDFF;color:#2946C7;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
      .rx-stage-row input,.rx-stage-row select{width:100%;min-width:0;border:1px solid rgba(7,16,37,.11);border-radius:10px;background:#F7F9FD;padding:10px 11px;color:#071025;font-size:13px;outline:none}
      .rx-stage-row input:focus,.rx-stage-row select:focus{background:#fff;border-color:#176BFF}
      .rx-stage-controls{display:flex;align-items:center;gap:6px;justify-content:flex-end}
      .rx-stage-control{width:32px;height:32px;border:1px solid rgba(7,16,37,.1);background:#fff;color:#172650;border-radius:9px;font-size:14px;font-weight:900;display:inline-flex;align-items:center;justify-content:center}
      .rx-stage-control:disabled{opacity:.35;cursor:not-allowed}
      .rx-stage-control.remove{color:#A33327;border-color:rgba(224,83,63,.2)}
      .rx-stage-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .rx-stage-count{font-size:12.5px;color:#536079;font-weight:750}
      .rx-add-stage{border:1px solid rgba(23,107,255,.22);background:#fff;color:#176BFF;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:900}
      .rx-add-stage:disabled{opacity:.45;cursor:not-allowed}
      .rx-stage-error{display:none;border:1px solid rgba(224,83,63,.22);background:#FBE4E1;color:#A33327;border-radius:12px;padding:10px 12px;font-size:12.5px;font-weight:800;line-height:1.45}
      .rx-stage-error.show{display:block}
      .rx-stage-save-note{font-size:12.5px;color:#536079;line-height:1.45}
      @media(max-width:900px){.rx-stage-row{grid-template-columns:36px minmax(0,1fr);align-items:start}.rx-stage-row select{grid-column:2}.rx-stage-controls{grid-column:2;justify-content:flex-start}}
      @media(max-width:600px){.rx-hiring-process{padding:15px;border-radius:16px}.rx-hiring-process-head{display:grid}.rx-recommended-toggle{white-space:normal;border-radius:13px}.rx-stage-summary{display:grid}.rx-stage-summary-item{border-radius:12px;justify-content:flex-start}.rx-stage-arrow{display:none}.rx-stage-row{padding:9px}.rx-stage-footer{align-items:stretch}.rx-add-stage{width:100%;min-height:42px}}
    `;
    document.head.appendChild(style);
  }

  function showStageError(message = '') {
    const error = byId('rxHiringStageError');
    if (!error) return;
    error.textContent = message;
    error.classList.toggle('show', Boolean(message));
  }

  function showDashboardStatus(kind, message) {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${kind}`;
    bar.textContent = message;
    clearTimeout(window.__rxHiringStagesStatusTimer);
    window.__rxHiringStagesStatusTimer = setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 6500);
  }

  function stageTypeOptions(selected) {
    return TYPE_OPTIONS.map(([value, label]) =>
      `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`
    ).join('');
  }

  function renderSummary() {
    const summary = byId('rxHiringStageSummary');
    if (!summary) return;
    summary.innerHTML = stages.map((stage, index) =>
      `${index ? '<span class="rx-stage-arrow">→</span>' : ''}<span class="rx-stage-summary-item"><span class="rx-stage-summary-number">${index + 1}</span>${esc(stage.name)}</span>`
    ).join('');
  }

  function renderBuilder() {
    const builder = byId('rxHiringStageBuilder');
    const footer = byId('rxHiringStageFooter');
    const count = byId('rxHiringStageCount');
    const add = byId('rxAddHiringStage');
    if (!builder || !footer || !count || !add) return;

    builder.hidden = recommended;
    footer.hidden = recommended;
    builder.innerHTML = stages.map((stage, index) => `
      <div class="rx-stage-row" data-stage-index="${index}">
        <div class="rx-stage-index">${index + 1}</div>
        <input class="rx-stage-name" maxlength="80" value="${esc(stage.name)}" aria-label="Stage ${index + 1} name">
        <select class="rx-stage-type" aria-label="Stage ${index + 1} type">${stageTypeOptions(stage.type)}</select>
        <div class="rx-stage-controls">
          <button class="rx-stage-control move-up" type="button" title="Move stage up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="rx-stage-control move-down" type="button" title="Move stage down" ${index === stages.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="rx-stage-control remove" type="button" title="Remove stage" ${stages.length <= MIN_STAGES ? 'disabled' : ''}>×</button>
        </div>
      </div>
    `).join('');
    count.textContent = `${stages.length} stages · minimum ${MIN_STAGES}, maximum ${MAX_STAGES}`;
    add.disabled = stages.length >= MAX_STAGES;
    renderSummary();
  }

  function setStages(nextStages, useRecommended = false) {
    stages = nextStages.map(stage => ({
      name: String(stage.name || '').trim() || 'New stage',
      type: String(stage.type || 'custom')
    })).slice(0, MAX_STAGES);
    if (stages.length < MIN_STAGES) stages = DEFAULT_STAGES.map(stage => ({ ...stage }));
    recommended = useRecommended;
    const toggle = byId('rxUseRecommendedStages');
    if (toggle) toggle.checked = recommended;
    showStageError('');
    renderBuilder();
  }

  function syncStageInputs() {
    document.querySelectorAll('#rxHiringStageBuilder .rx-stage-row').forEach(row => {
      const index = Number(row.dataset.stageIndex);
      if (!Number.isInteger(index) || !stages[index]) return;
      stages[index].name = row.querySelector('.rx-stage-name')?.value.trim() || '';
      stages[index].type = row.querySelector('.rx-stage-type')?.value || 'custom';
    });
    renderSummary();
  }

  function validateStages() {
    syncStageInputs();
    if (stages.length < MIN_STAGES || stages.length > MAX_STAGES) {
      return `Choose between ${MIN_STAGES} and ${MAX_STAGES} hiring stages.`;
    }
    const emptyIndex = stages.findIndex(stage => !stage.name || stage.name.length < 2);
    if (emptyIndex >= 0) return `Stage ${emptyIndex + 1} needs a clear name.`;
    const duplicateNames = stages.map(stage => stage.name.toLowerCase());
    if (new Set(duplicateNames).size !== duplicateNames.length) return 'Each hiring stage needs a different name.';
    if (stages[stages.length - 1].type !== 'offer') return 'The final hiring stage must be an Offer stage.';
    const offerCount = stages.filter(stage => stage.type === 'offer').length;
    if (offerCount !== 1) return 'Use one Offer stage, positioned at the end of the process.';
    return '';
  }

  function injectBuilder() {
    const form = byId('jobForm');
    const submitField = byId('saveJobBtn')?.closest('.field');
    if (!form || !submitField || byId('rxHiringProcess')) return false;
    addStyles();

    const section = document.createElement('section');
    section.id = 'rxHiringProcess';
    section.className = 'rx-hiring-process';
    section.innerHTML = `
      <div class="rx-hiring-process-head">
        <div>
          <h2>Hiring process</h2>
          <p>Show candidates exactly what happens after they apply. Choose the recommended process or create between two and eight stages for this role.</p>
        </div>
        <label class="rx-recommended-toggle"><input type="checkbox" id="rxUseRecommendedStages" checked> Use Rolexa recommended process</label>
      </div>
      <div class="rx-stage-summary" id="rxHiringStageSummary"></div>
      <div class="rx-stage-builder" id="rxHiringStageBuilder" hidden></div>
      <div class="rx-stage-footer" id="rxHiringStageFooter" hidden>
        <span class="rx-stage-count" id="rxHiringStageCount"></span>
        <button class="rx-add-stage" type="button" id="rxAddHiringStage">+ Add stage</button>
      </div>
      <div class="rx-stage-error" id="rxHiringStageError" role="alert"></div>
      <div class="rx-stage-save-note">Candidates will be able to see the number and order of stages before applying.</div>
    `;
    submitField.insertAdjacentElement('beforebegin', section);

    byId('rxUseRecommendedStages').addEventListener('change', event => {
      recommended = event.target.checked;
      if (recommended) stages = DEFAULT_STAGES.map(stage => ({ ...stage }));
      showStageError('');
      renderBuilder();
    });

    byId('rxAddHiringStage').addEventListener('click', () => {
      syncStageInputs();
      if (stages.length >= MAX_STAGES) return;
      const offerIndex = stages.findIndex(stage => stage.type === 'offer');
      const newStage = { name: 'New stage', type: 'custom' };
      if (offerIndex >= 0) stages.splice(offerIndex, 0, newStage);
      else stages.push(newStage);
      renderBuilder();
    });

    byId('rxHiringStageBuilder').addEventListener('input', syncStageInputs);
    byId('rxHiringStageBuilder').addEventListener('change', syncStageInputs);
    byId('rxHiringStageBuilder').addEventListener('click', event => {
      const row = event.target.closest('.rx-stage-row');
      if (!row) return;
      const index = Number(row.dataset.stageIndex);
      syncStageInputs();
      if (event.target.closest('.move-up') && index > 0) {
        [stages[index - 1], stages[index]] = [stages[index], stages[index - 1]];
      } else if (event.target.closest('.move-down') && index < stages.length - 1) {
        [stages[index + 1], stages[index]] = [stages[index], stages[index + 1]];
      } else if (event.target.closest('.remove') && stages.length > MIN_STAGES) {
        stages.splice(index, 1);
      } else return;
      renderBuilder();
    });

    renderBuilder();
    return true;
  }

  async function ensureSupabase() {
    if (db && currentUser) return true;
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
        if (existing) {
          const timer = setInterval(() => {
            if (window.supabase?.createClient) {
              clearInterval(timer);
              resolve();
            }
          }, 50);
          setTimeout(() => { clearInterval(timer); reject(new Error('Connection could not be established.')); }, 6000);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Connection could not be established.'));
        document.head.appendChild(script);
      });
    }
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await db.auth.getSession();
    if (error || !data?.session?.user) return false;
    currentUser = data.session.user;
    return true;
  }

  async function resolveSavedJobId(title, submittedAt) {
    if (editingJobId) return editingJobId;
    const { data, error } = await db
      .from('jobs')
      .select('id,title,updated_at')
      .eq('employer_user_id', currentUser.id)
      .eq('title', title)
      .gte('updated_at', new Date(submittedAt - 5000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.id || null;
  }

  async function saveStagesForJob(jobId, stageSnapshot) {
    const rows = stageSnapshot.map((stage, index) => ({
      job_id: jobId,
      stage_order: index + 1,
      stage_name: stage.name.trim(),
      stage_type: stage.type,
      stage_description: null,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await db
      .from('job_hiring_stages')
      .upsert(rows, { onConflict: 'job_id,stage_order' });
    if (upsertError) throw upsertError;

    const { error: deleteError } = await db
      .from('job_hiring_stages')
      .delete()
      .eq('job_id', jobId)
      .gt('stage_order', rows.length);
    if (deleteError) throw deleteError;
  }

  async function completePendingSave(context) {
    try {
      if (!await ensureSupabase()) throw new Error('Your employer session could not be confirmed.');
      let jobId = null;
      for (let attempt = 0; attempt < 16 && !jobId; attempt += 1) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, 250));
        jobId = await resolveSavedJobId(context.title, context.submittedAt);
      }
      if (!jobId) throw new Error('The job was saved, but Rolexa could not identify it to attach the hiring stages.');
      await saveStagesForJob(jobId, context.stages);
      editingJobId = null;
      setStages(DEFAULT_STAGES, true);
      showDashboardStatus('good', `${context.stages.length} hiring stages saved with this job.`);
    } catch (error) {
      console.warn('[Rolexa] Hiring stage save error', error);
      showDashboardStatus('bad', `${error.message || 'The hiring stages could not be saved.'} The job itself may still have been saved.`);
    } finally {
      pendingSave = false;
    }
  }

  function attachSubmitCapture() {
    const form = byId('jobForm');
    if (!form || form.dataset.rxHiringStagesSubmit === 'true') return;
    form.dataset.rxHiringStagesSubmit = 'true';
    form.addEventListener('submit', event => {
      const validationError = validateStages();
      if (validationError) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showStageError(validationError);
        byId('rxHiringProcess')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (pendingSave) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      pendingSave = true;
      showStageError('');
      const context = {
        title: byId('jobTitle')?.value.trim() || '',
        submittedAt: Date.now(),
        stages: stages.map(stage => ({ ...stage }))
      };
      setTimeout(() => completePendingSave(context), 250);
    }, true);
  }

  async function loadStagesForJob(jobId) {
    try {
      if (!await ensureSupabase()) return;
      const { data, error } = await db
        .from('job_hiring_stages')
        .select('stage_name,stage_type,stage_order')
        .eq('job_id', jobId)
        .order('stage_order');
      if (error) throw error;
      const loaded = (data || []).map(row => ({ name: row.stage_name, type: row.stage_type }));
      if (!loaded.length) {
        setStages(DEFAULT_STAGES, true);
        return;
      }
      const isDefault = loaded.length === DEFAULT_STAGES.length && loaded.every((stage, index) =>
        stage.name === DEFAULT_STAGES[index].name && stage.type === DEFAULT_STAGES[index].type
      );
      setStages(loaded, isDefault);
    } catch (error) {
      console.warn('[Rolexa] Hiring stage load error', error);
      showDashboardStatus('bad', 'The job opened, but its hiring stages could not be loaded.');
    }
  }

  function wrapEditAction() {
    const original = window.rolexaEmployerEditJob;
    if (typeof original !== 'function' || original.__rxHiringStagesWrapped) return false;
    const wrapped = function(jobId) {
      editingJobId = jobId;
      original.apply(this, arguments);
      loadStagesForJob(jobId);
    };
    wrapped.__rxHiringStagesWrapped = true;
    window.rolexaEmployerEditJob = wrapped;
    return true;
  }

  function initialise() {
    if (!injectBuilder()) return false;
    attachSubmitCapture();
    wrapEditAction();
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    initialise();
    if (wrapEditAction() && byId('rxHiringProcess')) clearInterval(timer);
    if (attempts >= 120) clearInterval(timer);
  }, 100);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
