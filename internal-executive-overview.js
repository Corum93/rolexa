(() => {
  if (window.__rolexaInternalExecutiveOverview) return;
  window.__rolexaInternalExecutiveOverview = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const byId = id => document.getElementById(id);
  const number = value => new Intl.NumberFormat('en-GB').format(Number(value || 0));
  let client = null;
  let loading = false;

  const setMetric = (id, value) => {
    const element = byId(id);
    if (element) element.textContent = number(value);
  };

  const setText = (id, value) => {
    const element = byId(id);
    if (element) element.textContent = String(value ?? '');
  };

  const statusColours = {
    applied: '#176bff',
    review: '#0891b2',
    shortlist: '#7c3aed',
    interview: '#e58a00',
    offer: '#d14b73',
    hired: '#22a06b',
    withdrawn: '#8490a5',
    rejected: '#d45a4b'
  };

  const humanize = value => String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  function normalizedStatuses(raw) {
    const result = {};
    if (Array.isArray(raw)) {
      raw.forEach(item => {
        const key = String(item?.status || 'unknown').trim().toLowerCase();
        result[key] = Number(item?.count || 0);
      });
    } else if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([key, value]) => {
        result[String(key).trim().toLowerCase()] = Number(value || 0);
      });
    }
    return result;
  }

  function renderPipeline(rawStatuses, totalApplications) {
    const container = byId('executivePipelineList');
    if (!container) return;
    const statuses = normalizedStatuses(rawStatuses);
    const canonical = ['applied', 'review', 'shortlist', 'interview', 'offer', 'hired', 'withdrawn', 'rejected'];
    const keys = [...canonical.filter(key => key in statuses), ...Object.keys(statuses).filter(key => !canonical.includes(key))];
    const visibleKeys = keys.length ? keys : ['applied', 'interview', 'offer', 'hired'];
    const total = Math.max(Number(totalApplications || 0), Object.values(statuses).reduce((sum, value) => sum + Number(value || 0), 0));
    container.innerHTML = visibleKeys.map(key => {
      const value = Number(statuses[key] || 0);
      const width = total > 0 ? Math.max(value > 0 ? 4 : 0, Math.round((value / total) * 100)) : 0;
      return `<div class="pipeline-row"><span>${humanize(key)}</span><div class="pipeline-track"><div class="pipeline-fill" style="width:${width}%;--pipeline-color:${statusColours[key] || '#176bff'}"></div></div><b>${number(value)}</b></div>`;
    }).join('');
  }

  function ensurePlatformHealth() {
    if (byId('platformHealthSection')) return;
    const pipeline = byId('pipelineSection');
    if (!pipeline) return;
    const section = document.createElement('section');
    section.className = 'executive-section nav-target';
    section.id = 'platformHealthSection';
    section.innerHTML = `
      <div class="executive-section-head">
        <div><h2>Operational position</h2><p>Live marketplace, product and delivery indicators from Rolexa's current records.</p></div>
        <span class="executive-section-label" id="metricPlatformStatus">Loading</span>
      </div>
      <div class="grid executive-grid">
        <div class="card stat"><span>Active hiring companies</span><b id="metricActiveEmployers"> </b><small>Employers with at least one live role</small></div>
        <div class="card stat"><span>Total jobs</span><b id="metricTotalJobs"> </b><small>Every job record across all lifecycle stages</small></div>
        <div class="card stat"><span>Draft jobs</span><b id="metricDraftJobs"> </b><small>Roles saved but not currently live</small></div>
        <div class="card stat"><span>Roadmap completion</span><b id="metricRoadmapCompletion"> </b><small>Completion across tracked product features</small></div>
        <div class="card stat"><span>Open bugs</span><b id="metricOpenBugs"> </b><small>Unresolved bugs recorded in the roadmap</small></div>
        <div class="card stat"><span>Open improvements</span><b id="metricOpenImprovements"> </b><small>Unresolved improvements recorded in the roadmap</small></div>
      </div>`;
    pipeline.insertAdjacentElement('afterend', section);
  }

  async function loadInternalStaffFallback() {
    const { data, error } = await client.rpc('get_rolexa_admin_users', {
      page_number: 1,
      page_size: 5,
      account_filter: 'all',
      search_text: ''
    });
    if (error) return null;
    return Number(data?.summary?.staff || 0);
  }

  async function loadExecutiveMetrics() {
    if (!client || loading || byId('adminApp')?.classList.contains('hidden')) return;
    loading = true;
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_headline_metrics');
      if (error) throw error;
      const metrics = data || {};
      const marketplaceUsers = metrics.marketplace_users ?? (Number(metrics.candidates || 0) + Number(metrics.employers || 0));
      let internalStaff = metrics.internal_staff;
      if (internalStaff === undefined || internalStaff === null) internalStaff = await loadInternalStaffFallback();

      setMetric('metricTotalUsers', marketplaceUsers);
      setMetric('metricInternalStaff', internalStaff ?? 0);
      setMetric('metricCurrentOffers', metrics.current_offers);
      setMetric('metricSuccessfulHires', metrics.successful_hires);
      setMetric('metricApplicationsToday', metrics.applications_today);
      setMetric('metricApplicationsMonth', metrics.applications_this_month);
      setMetric('metricCurrentInterviews', metrics.current_interviews);
      setMetric('metricActiveEmployers', metrics.active_employers);
      setMetric('metricTotalJobs', metrics.jobs);
      setMetric('metricDraftJobs', metrics.draft_jobs);
      setText('metricRoadmapCompletion', `${number(metrics.roadmap_completion)}%`);
      setMetric('metricOpenBugs', metrics.open_bugs);
      setMetric('metricOpenImprovements', metrics.open_improvements);
      setText('metricPlatformStatus', 'Live data');
      renderPipeline(metrics.application_statuses, metrics.applications);

      const period = byId('executivePeriodLabel');
      if (period) period.textContent = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      const phase5Ready = ['draft_jobs', 'roadmap_completion', 'open_bugs', 'open_improvements']
        .every(key => metrics[key] !== undefined);
      if (!phase5Ready) {
        const status = byId('metricsStatus');
        if (status && !status.classList.contains('bad')) {
          status.textContent = 'Core figures are live. Apply the Phase 5 KPI SQL to activate the full operational position.';
        }
      }
    } catch (error) {
      console.error('Rolexa executive overview load failed', error);
      const container = byId('executivePipelineList');
      if (container) container.innerHTML = '<div class="pipeline-empty">Pipeline detail is temporarily unavailable.</div>';
      setText('metricPlatformStatus', 'Unavailable');
    } finally {
      loading = false;
    }
  }

  async function initialise() {
    ensurePlatformHealth();
    for (let attempt = 0; attempt < 80 && !window.supabase?.createClient; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!window.supabase?.createClient) return;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const app = byId('adminApp');
    if (app) {
      new MutationObserver(() => {
        if (!app.classList.contains('hidden')) {
          window.setTimeout(loadExecutiveMetrics, 120);
          window.setTimeout(loadExecutiveMetrics, 900);
        }
      }).observe(app, { attributes: true, attributeFilter: ['class'] });
    }

    byId('refreshMetrics')?.addEventListener('click', () => {
      window.setTimeout(loadExecutiveMetrics, 120);
      window.setTimeout(loadExecutiveMetrics, 900);
    });
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') window.setTimeout(loadExecutiveMetrics, 160);
    });
    window.setTimeout(loadExecutiveMetrics, 160);
    window.setTimeout(loadExecutiveMetrics, 1200);
  }

  initialise();
})();
