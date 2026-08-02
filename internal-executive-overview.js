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
      renderPipeline(metrics.application_statuses, metrics.applications);

      const period = byId('executivePeriodLabel');
      if (period) period.textContent = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      if (metrics.marketplace_users === undefined) {
        const status = byId('metricsStatus');
        if (status && !status.classList.contains('bad')) {
          status.textContent = 'Core figures are live. Apply the Phase 4 executive metrics SQL to activate pipeline detail.';
        }
      }
    } catch (error) {
      console.error('Rolexa executive overview load failed', error);
      const container = byId('executivePipelineList');
      if (container) container.innerHTML = '<div class="pipeline-empty">Pipeline detail is temporarily unavailable.</div>';
    } finally {
      loading = false;
    }
  }

  async function initialise() {
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
