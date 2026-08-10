(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaEmployerHiringPipeline) return;
  window.__rolexaEmployerHiringPipeline = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let rows = [];
  let activeView = 'pipeline';

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const initials = value => String(value || 'Candidate')
    .split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'C';

  function orderedStages(stages) {
    return [...stages].sort((left, right) =>
      Number(left.stage_order || 0) - Number(right.stage_order || 0)
    );
  }

  function addStyles() {
    if (document.getElementById('rxEmployerPipelineStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerPipelineStyles';
    style.textContent = `
      .rx-pipeline-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .rx-pipeline-toggle{border:1px solid rgba(7,16,37,.1);background:#fff;color:#0A1738;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:900}
      .rx-pipeline-toggle.active{background:#176BFF;border-color:#176BFF;color:#fff;box-shadow:0 8px 20px rgba(23,107,255,.18)}
      .rx-pipeline-shell{display:grid;gap:18px}
      .rx-pipeline-role{border:1px solid rgba(7,16,37,.09);border-radius:20px;background:#fff;padding:17px;box-shadow:0 12px 34px rgba(7,16,37,.04)}
      .rx-pipeline-role-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      .rx-pipeline-role-head h2{font-size:18px;margin:0}.rx-pipeline-role-head p{font-size:12px;color:#6B7280;margin:4px 0 0}
      .rx-pipeline-role-count{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:30px;padding:0 10px;border-radius:999px;background:#EEF3FF;color:#2946C7;font-size:11px;font-weight:900}
      .rx-pipeline-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(245px,1fr);gap:12px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x proximity}
      .rx-pipeline-column{scroll-snap-align:start;border:1px solid rgba(7,16,37,.08);background:#F5F7FC;border-radius:17px;padding:11px;min-height:180px}
      .rx-pipeline-column-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding:2px}
      .rx-pipeline-column-head b{font-size:12px;color:#101F4A}.rx-pipeline-column-head span{display:grid;place-items:center;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#fff;color:#51617F;font-size:10px;font-weight:900;border:1px solid rgba(7,16,37,.08)}
      .rx-pipeline-stack{display:grid;gap:9px}
      .rx-pipeline-card{background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:14px;padding:11px;box-shadow:0 6px 18px rgba(7,16,37,.04)}
      .rx-pipeline-candidate{display:grid;grid-template-columns:36px minmax(0,1fr);gap:9px;align-items:center}
      .rx-pipeline-avatar{width:36px;height:36px;border-radius:11px;background:#12805C;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:900}
      .rx-pipeline-name{font-size:12px;font-weight:900;color:#071025;overflow-wrap:anywhere}.rx-pipeline-meta{font-size:10.5px;color:#6B7280;margin-top:2px;line-height:1.35}
      .rx-pipeline-card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .rx-pipeline-action{border:1px solid rgba(7,16,37,.1);background:#fff;color:#0A1738;border-radius:999px;padding:7px 9px;font-size:10px;font-weight:900}
      .rx-pipeline-action.primary{background:#176BFF;border-color:#176BFF;color:#fff}.rx-pipeline-action:disabled{opacity:.6;cursor:not-allowed}
      .rx-pipeline-empty{border:1px dashed rgba(7,16,37,.12);border-radius:13px;padding:20px 10px;text-align:center;color:#7C88A2;font-size:11px;line-height:1.4;background:rgba(255,255,255,.55)}
      .rx-pipeline-loading{border:1px dashed rgba(7,16,37,.12);border-radius:18px;padding:28px;text-align:center;color:#6B7280;background:#fff}
      #rxEmployerPipelineView[hidden],#rxEmployerListView[hidden]{display:none!important}
      @media(max-width:760px){
        .rx-pipeline-role{padding:13px}.rx-pipeline-role-head{display:grid;grid-template-columns:1fr auto}.rx-pipeline-board{grid-auto-columns:minmax(82vw,1fr)}
        .rx-pipeline-controls{margin-top:12px}.rx-pipeline-toggle{flex:1;text-align:center}.rx-pipeline-role-head h2{font-size:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLayout() {
    const page = document.getElementById('matchesPage');
    const list = document.getElementById('matchesList');
    if (!page || !list) return false;

    const head = page.querySelector('.page-head');
    let controls = document.getElementById('rxEmployerPipelineControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'rxEmployerPipelineControls';
      controls.className = 'rx-pipeline-controls';
      controls.innerHTML = `
        <button type="button" class="rx-pipeline-toggle active" data-rx-pipeline-view="pipeline">Pipeline board</button>
        <button type="button" class="rx-pipeline-toggle" data-rx-pipeline-view="list">List view</button>`;
      if (head) {
        let actions = head.querySelector('.head-actions');
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'head-actions';
          head.appendChild(actions);
        }
        actions.appendChild(controls);
      }
    }

    const listCard = list.closest('.card');
    if (!listCard) return false;
    listCard.id = 'rxEmployerListView';

    let pipeline = document.getElementById('rxEmployerPipelineView');
    if (!pipeline) {
      pipeline = document.createElement('div');
      pipeline.id = 'rxEmployerPipelineView';
      pipeline.className = 'rx-pipeline-shell';
      listCard.insertAdjacentElement('beforebegin', pipeline);
    }

    applyView();
    return true;
  }

  function applyView() {
    const pipeline = document.getElementById('rxEmployerPipelineView');
    const list = document.getElementById('rxEmployerListView');
    if (pipeline) pipeline.hidden = activeView !== 'pipeline';
    if (list) list.hidden = activeView !== 'list';
    document.querySelectorAll('[data-rx-pipeline-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.rxPipelineView === activeView);
    });
  }

  async function loadData() {
    const jobsResult = await client.from('jobs')
      .select('*')
      .eq('employer_user_id', user.id)
      .order('created_at', { ascending: false });
    if (jobsResult.error) throw jobsResult.error;
    const jobs = jobsResult.data || [];
    const jobIds = jobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) { rows = []; return; }

    const [appsResult, stagesResult] = await Promise.all([
      client.from('candidate_applications')
        .select('id,user_id,job_id,status,applied_at,updated_at,current_hiring_stage_id,hiring_stage_updated_at')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false }),
      client.from('job_hiring_stages')
        .select('id,job_id,stage_order,stage_name,stage_type')
        .in('job_id', jobIds)
        .order('stage_order', { ascending: true })
    ]);
    if (appsResult.error) throw appsResult.error;
    if (stagesResult.error) throw stagesResult.error;

    const apps = appsResult.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const profileResult = await client.from('candidate_profiles')
        .select('user_id,full_name,email,target_role,current_level,location,work_style')
        .in('user_id', userIds);
      if (!profileResult.error) profiles = profileResult.data || [];
    }

    const appsByJob = new Map();
    apps.forEach(app => {
      if (!appsByJob.has(app.job_id)) appsByJob.set(app.job_id, []);
      appsByJob.get(app.job_id).push(app);
    });
    const stagesByJob = new Map();
    (stagesResult.data || []).forEach(stage => {
      if (!stagesByJob.has(stage.job_id)) stagesByJob.set(stage.job_id, []);
      stagesByJob.get(stage.job_id).push(stage);
    });
    stagesByJob.forEach((stages, jobId) => stagesByJob.set(jobId, orderedStages(stages)));
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));

    rows = jobs.map(job => ({
      job,
      stages: stagesByJob.get(job.id) || [],
      applications: (appsByJob.get(job.id) || []).map(app => ({ app, profile: profileMap.get(app.user_id) || {} }))
    })).filter(row => row.applications.length > 0);
  }

  function broadStatusFor(stage, fallback) {
    if (!stage) return fallback || 'Applied';
    if (stage.stage_type === 'review') return 'Applied';
    if (stage.stage_type === 'shortlist') return 'Shortlisted';
    if (['assessment', 'interview', 'custom'].includes(stage.stage_type)) return 'Interview';
    if (stage.stage_type === 'offer') return 'Offer';
    return fallback || 'Applied';
  }

  function currentStage(row, item) {
    const stages = row.stages || [];
    return stages.find(stage => stage.id === item.app.current_hiring_stage_id) || stages[0] || null;
  }

  function candidateCard(row, item, columnType) {
    const app = item.app;
    const profile = item.profile || {};
    const name = profile.full_name || profile.email || `Candidate ${String(app.user_id || '').slice(0, 8)}`;
    const role = profile.target_role || 'Candidate profile';
    const terminal = ['Hired', 'Rejected', 'Withdrawn'].includes(app.status);
    const current = currentStage(row, item);
    const currentIndex = row.stages.findIndex(stage => current && stage.id === current.id);
    const next = currentIndex >= 0 ? row.stages[currentIndex + 1] : row.stages[0];

    let action = '';
    if (!terminal && next) {
      action = `<button type="button" class="rx-pipeline-action primary" data-rx-pipeline-app="${safe(app.id)}" data-rx-pipeline-stage="${safe(next.id)}">Move to ${safe(next.stage_name)}</button>`;
    } else if (!terminal && (current?.stage_type === 'offer' || app.status === 'Offer')) {
      action = `<button type="button" class="rx-pipeline-action primary" data-rx-pipeline-hire="${safe(app.id)}">Mark hired</button>`;
    }

    return `<article class="rx-pipeline-card" data-evidence-application-id="${safe(app.id)}">
      <div class="rx-pipeline-candidate"><div class="rx-pipeline-avatar">${safe(initials(name))}</div><div><div class="rx-pipeline-name">${safe(name)}</div><div class="rx-pipeline-meta">${safe(role)}${profile.location ? ' · ' + safe(profile.location) : ''}</div></div></div>
      <div class="rx-pipeline-card-actions"><button type="button" class="rx-pipeline-action" data-rx-pipeline-open-list>Open in list</button>${action}</div>
    </article>`;
  }

  function columnHtml(row, stage, items, type = 'stage') {
    return `<section class="rx-pipeline-column"><div class="rx-pipeline-column-head"><b>${safe(stage.stage_name)}</b><span>${items.length}</span></div><div class="rx-pipeline-stack">${items.length ? items.map(item => candidateCard(row, item, type)).join('') : '<div class="rx-pipeline-empty">No candidates at this stage.</div>'}</div></section>`;
  }

  function roleHtml(row) {
    const activeApplications = row.applications.filter(item => !['Rejected', 'Withdrawn', 'Hired'].includes(item.app.status));
    const hired = row.applications.filter(item => item.app.status === 'Hired');
    const configured = row.stages.length ? row.stages : [{ id: 'fallback-review', stage_name: 'Application review', stage_order: 1, stage_type: 'review' }];
    const applicationLimit = Math.max(1, Number(row.job.application_limit) || 100);
    const applicationCount = Math.max(row.applications.length, Number(row.job.application_count) || 0);

    const columns = configured.map(stage => {
      const items = activeApplications.filter(item => {
        const current = currentStage(row, item);
        return current?.id === stage.id || (!item.app.current_hiring_stage_id && stage === configured[0]);
      });
      return columnHtml(row, stage, items);
    });

    columns.push(columnHtml(row, { stage_name: 'Hired' }, hired, 'hired'));

    return `<section class="rx-pipeline-role"><div class="rx-pipeline-role-head"><div><h2>${safe(row.job.title || 'Untitled role')}</h2><p>${safe(row.job.company || 'Employer')} · ${applicationCount} of ${applicationLimit} applications</p></div><span class="rx-pipeline-role-count">${applicationCount} / ${applicationLimit}</span></div><div class="rx-pipeline-board">${columns.join('')}</div></section>`;
  }

  function render() {
    if (!ensureLayout()) return;
    const target = document.getElementById('rxEmployerPipelineView');
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(roleHtml).join('') : '<div class="rx-pipeline-loading">No applications are available for the pipeline yet.</div>';
  }

  async function refresh() {
    const target = document.getElementById('rxEmployerPipelineView');
    if (target) target.innerHTML = '<div class="rx-pipeline-loading">Loading hiring pipeline…</div>';
    try {
      await loadData();
      render();
    } catch (error) {
      if (target) target.innerHTML = `<div class="rx-pipeline-loading">The hiring pipeline could not load.<br><br>${safe(error.message || error)}</div>`;
    }
  }

  function findStage(applicationId, stageId) {
    for (const row of rows) {
      const item = row.applications.find(candidate => candidate.app.id === applicationId);
      const stage = row.stages.find(candidateStage => candidateStage.id === stageId);
      if (item && stage) return { row, item, stage };
    }
    return null;
  }

  async function moveCandidate(applicationId, stageId, button) {
    const found = findStage(applicationId, stageId);
    if (!found) return;
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    const now = new Date().toISOString();
    const payload = {
      current_hiring_stage_id: found.stage.id,
      hiring_stage_updated_at: now,
      status: broadStatusFor(found.stage, found.item.app.status),
      updated_at: now
    };
    const { error } = await client.from('candidate_applications').update(payload).eq('id', applicationId);
    if (error) {
      button.disabled = false;
      button.textContent = previous;
      window.alert(error.message || 'Could not move this candidate.');
      return;
    }
    await refresh();
  }

  async function markHired(applicationId, button) {
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    const now = new Date().toISOString();
    const { error } = await client.from('candidate_applications').update({ status: 'Hired', updated_at: now }).eq('id', applicationId);
    if (error) {
      button.disabled = false;
      button.textContent = previous;
      window.alert(error.message || 'Could not mark this candidate as hired.');
      return;
    }
    await refresh();
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-rx-pipeline-view]');
      if (toggle) {
        activeView = toggle.dataset.rxPipelineView;
        applyView();
        if (activeView === 'pipeline') refresh();
        return;
      }

      const move = event.target.closest('[data-rx-pipeline-app][data-rx-pipeline-stage]');
      if (move) {
        moveCandidate(move.dataset.rxPipelineApp, move.dataset.rxPipelineStage, move);
        return;
      }

      const hire = event.target.closest('[data-rx-pipeline-hire]');
      if (hire) {
        markHired(hire.dataset.rxPipelineHire, hire);
        return;
      }

      if (event.target.closest('[data-rx-pipeline-open-list]')) {
        activeView = 'list';
        applyView();
        return;
      }

      if (event.target.closest('[data-view="matches"]')) setTimeout(refresh, 150);
    });
  }

  async function init() {
    addStyles();
    bindEvents();
    ensureLayout();
    try {
      const library = window.supabase?.createClient ? window.supabase : await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => resolve(window.supabase);
        script.onerror = () => reject(new Error('Connection could not be established'));
        document.head.appendChild(script);
      });
      client = library.createClient(CONFIG.url, CONFIG.key);
      const { data } = await client.auth.getSession();
      user = data?.session?.user;
      if (!user) return;
      await refresh();
    } catch (error) {
      const target = document.getElementById('rxEmployerPipelineView');
      if (target) target.innerHTML = `<div class="rx-pipeline-loading">The hiring pipeline could not initialise.<br><br>${safe(error.message || error)}</div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
