(() => {
  if (window.__rolexaInternalAdmin) return;
  window.__rolexaInternalAdmin = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;
  let metricsLoaded = false;

  const byId = id => document.getElementById(id);
  const show = id => byId(id)?.classList.remove('hidden');
  const hide = id => byId(id)?.classList.add('hidden');
  const number = value => new Intl.NumberFormat('en-GB').format(Number(value || 0));

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function setError(message) {
    const el = byId('adminLoginError');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
  }

  function clearError() {
    const el = byId('adminLoginError');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
  }

  function setMetric(id, value) {
    const el = byId(id);
    if (el) el.textContent = number(value);
  }

  function setMetricsStatus(message, kind = '') {
    const el = byId('metricsStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `metrics-status ${kind}`.trim();
  }

  async function loadMetrics(force = false) {
    if (metricsLoaded && !force) return;
    setMetricsStatus('Loading live platform metrics…');
    const refresh = byId('refreshMetrics');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_headline_metrics');
      if (error) throw error;
      const metrics = data || {};
      setMetric('metricTotalUsers', metrics.total_users);
      setMetric('metricCandidates', metrics.candidates);
      setMetric('metricEmployers', metrics.employers);
      setMetric('metricApplications', metrics.applications);
      setMetric('metricJobs', metrics.jobs);
      setMetric('metricLiveJobs', metrics.live_jobs);
      setMetric('metricActiveEmployers', metrics.active_employers);
      const generated = metrics.generated_at ? new Date(metrics.generated_at) : new Date();
      setMetricsStatus(`Live data refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
      metricsLoaded = true;
    } catch (error) {
      console.error('Rolexa metrics load failed', error);
      const missingFunction = /get_rolexa_admin_headline_metrics|schema cache|function/i.test(error?.message || '');
      setMetricsStatus(missingFunction ? 'The Step 3 Supabase metrics SQL still needs to be applied.' : (error?.message || 'Could not load platform metrics.'), 'bad');
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh data'; }
    }
  }

  async function verifyStaff(user) {
    if (!user) return null;
    const { data, error } = await client
      .from('rolexa_staff_users')
      .select('user_id,role,is_active,full_name,job_title')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      console.error('Rolexa staff verification failed', error);
      return null;
    }
    return data || null;
  }

  async function routeSession() {
    hide('loginGate');
    hide('deniedGate');
    hide('adminApp');
    show('loadingGate');

    const { data: { user }, error } = await client.auth.getUser();
    hide('loadingGate');

    if (error || !user) {
      metricsLoaded = false;
      show('loginGate');
      return;
    }

    const staff = await verifyStaff(user);
    if (!staff) {
      metricsLoaded = false;
      show('deniedGate');
      return;
    }

    byId('staffName').textContent = staff.full_name || user.email || 'Rolexa staff';
    byId('staffRole').textContent = [staff.job_title, staff.role].filter(Boolean).join(' · ');
    show('adminApp');
    await loadMetrics();
  }

  async function signIn(event) {
    event.preventDefault();
    clearError();
    const email = byId('adminEmail').value.trim();
    const password = byId('adminPassword').value;
    const button = byId('adminLoginButton');
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error('Sign-in failed.');
      const staff = await verifyStaff(data.user);
      if (!staff) {
        await client.auth.signOut();
        throw new Error('This account is not approved for Rolexa internal access.');
      }
      metricsLoaded = false;
      await routeSession();
    } catch (error) {
      setError(error?.message || 'Could not sign in.');
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in securely';
    }
  }

  async function signOut() {
    await client.auth.signOut();
    metricsLoaded = false;
    hide('adminApp');
    hide('deniedGate');
    show('loginGate');
  }

  async function init() {
    try {
      const supabase = await loadSupabase();
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      byId('adminLoginForm')?.addEventListener('submit', signIn);
      byId('adminSignOut')?.addEventListener('click', signOut);
      byId('deniedSignOut')?.addEventListener('click', signOut);
      byId('refreshMetrics')?.addEventListener('click', () => loadMetrics(true));
      client.auth.onAuthStateChange(() => setTimeout(routeSession, 0));
      await routeSession();
    } catch (error) {
      console.error('Internal admin startup error', error);
      hide('loadingGate');
      show('loginGate');
      setError('The internal dashboard could not connect securely.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
