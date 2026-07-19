(() => {
  if (window.__rolexaInternalAdmin) return;
  window.__rolexaInternalAdmin = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;
  let metricsLoaded = false;
  let analyticsLoaded = false;
  let analyticsDays = 90;
  let usersLoaded = false;
  let usersPage = 1;
  let usersTotalPages = 1;
  let usersSearch = '';
  let usersFilter = 'all';
  let usersSearchTimer = null;
  let teamLoaded = false;
  let currentStaffRole = '';

  const byId = id => document.getElementById(id);
  const show = id => byId(id)?.classList.remove('hidden');
  const hide = id => byId(id)?.classList.add('hidden');
  const number = value => new Intl.NumberFormat('en-GB').format(Number(value || 0));
  const decimal = value => Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 });
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));

  function formatDateTime(value, empty = 'Never') {
    if (!value) return empty;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return empty;
    return date.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function initials(value) {
    return String(value || 'Rolexa user').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'RU';
  }

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

  function setAnalyticsStatus(message, kind = '') {
    const el = byId('analyticsStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `metrics-status ${kind}`.trim();
  }

  function setUsersStatus(message, kind = '') {
    const el = byId('usersStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `metrics-status ${kind}`.trim();
  }

  function setTeamStatus(message, kind = '') {
    const el = byId('teamStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `metrics-status team-status ${kind}`.trim();
  }

  function setTeamFormMessage(message, kind = '') {
    const el = byId('teamFormMessage');
    if (!el) return;
    el.textContent = message;
    el.className = message ? `team-form-message show ${kind}`.trim() : 'team-form-message';
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
      setMetricsStatus(missingFunction ? 'The headline metrics Supabase SQL still needs to be applied.' : (error?.message || 'Could not load platform metrics.'), 'bad');
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh data'; }
    }
  }

  function aggregateTimeline(rows, targetPoints = 18) {
    const clean = Array.isArray(rows) ? rows : [];
    if (clean.length <= targetPoints) return clean;
    const bucketSize = Math.ceil(clean.length / targetPoints);
    const result = [];
    for (let i = 0; i < clean.length; i += bucketSize) {
      const bucket = clean.slice(i, i + bucketSize);
      result.push({
        date: bucket[bucket.length - 1]?.date,
        registrations: bucket.reduce((s, r) => s + Number(r.registrations || 0), 0),
        candidates: bucket.reduce((s, r) => s + Number(r.candidates || 0), 0),
        employers: bucket.reduce((s, r) => s + Number(r.employers || 0), 0),
        jobs: bucket.reduce((s, r) => s + Number(r.jobs || 0), 0),
        applications: bucket.reduce((s, r) => s + Number(r.applications || 0), 0)
      });
    }
    return result;
  }

  function lineChart(containerId, rows, series) {
    const container = byId(containerId);
    if (!container) return;
    const points = aggregateTimeline(rows);
    const totals = series.map(item => points.reduce((sum, row) => sum + Number(row[item.key] || 0), 0));
    if (!points.length || totals.every(total => total === 0)) {
      container.innerHTML = '<div class="chart-empty">No activity has been recorded in this period yet.</div>';
      return;
    }

    const width = 760, height = 245, left = 38, right = 12, top = 18, bottom = 34;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const maxValue = Math.max(1, ...series.flatMap(item => points.map(row => Number(row[item.key] || 0))));
    const x = index => left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = value => top + plotHeight - (Number(value || 0) / maxValue) * plotHeight;
    const gridLines = [0, .25, .5, .75, 1].map(step => {
      const gy = top + plotHeight - step * plotHeight;
      return `<line x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}" stroke="rgba(7,16,37,.08)"/><text class="chart-axis" x="2" y="${gy+3}">${Math.round(maxValue*step)}</text>`;
    }).join('');
    const paths = series.map(item => {
      const d = points.map((row, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(row[item.key]).toFixed(1)}`).join(' ');
      const dots = points.map((row, index) => Number(row[item.key] || 0) > 0 ? `<circle cx="${x(index)}" cy="${y(row[item.key])}" r="3" fill="${item.color}"><title>${item.label}: ${number(row[item.key])} on ${row.date}</title></circle>` : '').join('');
      return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join('');
    const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    const labels = labelIndexes.map(index => {
      const date = points[index]?.date ? new Date(`${points[index].date}T00:00:00`) : null;
      return `<text class="chart-axis" text-anchor="middle" x="${x(index)}" y="${height-8}">${date ? date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : ''}</text>`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Rolexa analytics line chart">${gridLines}${paths}${labels}</svg>`;
  }

  function renderAnalytics(data) {
    const ratios = data?.ratios || {};
    byId('ratioApplicationsPerJob').textContent = decimal(ratios.applications_per_job);
    byId('ratioCandidatesPerEmployer').textContent = decimal(ratios.candidates_per_employer);
    byId('ratioLiveJobsPerCandidate').textContent = decimal(ratios.live_jobs_per_candidate);
    const timeline = data?.timeline || [];
    lineChart('growthChart', timeline, [
      { key: 'registrations', label: 'Users', color: '#176BFF' },
      { key: 'candidates', label: 'Candidates', color: '#22A06B' },
      { key: 'employers', label: 'Employers', color: '#8B5CF6' }
    ]);
    lineChart('demandChart', timeline, [
      { key: 'jobs', label: 'Jobs', color: '#F59E0B' },
      { key: 'applications', label: 'Applications', color: '#E0533F' }
    ]);
  }

  async function loadAnalytics(force = false) {
    if (analyticsLoaded && !force) return;
    setAnalyticsStatus(`Loading ${analyticsDays}-day growth and demand analytics…`);
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_growth_analytics', { days_back: analyticsDays });
      if (error) throw error;
      renderAnalytics(data || {});
      const generated = data?.generated_at ? new Date(data.generated_at) : new Date();
      setAnalyticsStatus(`${analyticsDays}-day analytics refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
      analyticsLoaded = true;
    } catch (error) {
      console.error('Rolexa analytics load failed', error);
      const missingFunction = /get_rolexa_admin_growth_analytics|schema cache|function/i.test(error?.message || '');
      setAnalyticsStatus(missingFunction ? 'The growth analytics Supabase SQL still needs to be applied.' : (error?.message || 'Could not load growth analytics.'), 'bad');
      byId('growthChart').innerHTML = '<div class="chart-empty">Growth analytics are not available yet.</div>';
      byId('demandChart').innerHTML = '<div class="chart-empty">Demand analytics are not available yet.</div>';
    }
  }

  function renderUsers(data) {
    const summary = data?.summary || {};
    setMetric('usersTotal', summary.total);
    setMetric('usersToday', summary.today);
    setMetric('usersSevenDays', summary.last_7_days);
    setMetric('usersThirtyDays', summary.last_30_days);
    setMetric('usersCandidates', summary.candidates);
    setMetric('usersEmployers', summary.employers);
    setMetric('usersStaff', summary.staff);
    setMetric('usersIncomplete', summary.incomplete);

    lineChart('usersGrowthChart', data?.timeline || [], [
      { key: 'registrations', label: 'Registrations', color: '#176BFF' }
    ]);

    const rows = Array.isArray(data?.users) ? data.users : [];
    const table = byId('usersTableBody');
    if (table) {
      table.innerHTML = rows.length ? rows.map(user => {
        const type = ['candidate','employer','staff','incomplete'].includes(user.account_type) ? user.account_type : 'incomplete';
        const complete = !!user.profile_complete;
        const activity = type === 'candidate'
          ? `${number(user.applications)} application${Number(user.applications) === 1 ? '' : 's'}`
          : type === 'employer'
            ? `${number(user.jobs)} job${Number(user.jobs) === 1 ? '' : 's'}`
            : type === 'staff' ? 'Staff access' : 'No profile activity';
        const displayName = user.display_name || 'Rolexa user';
        return `<tr>
          <td><div class="users-person"><span class="users-avatar">${escapeHtml(initials(displayName))}</span><div><b>${escapeHtml(displayName)}</b><small>${escapeHtml(user.email || 'No email')}</small></div></div></td>
          <td><span class="users-type ${type}">${escapeHtml(type)}</span>${user.organisation ? `<small class="users-organisation">${escapeHtml(user.organisation)}</small>` : ''}</td>
          <td><span class="users-profile-state ${complete ? 'complete' : 'incomplete'}">${complete ? 'Complete' : 'Incomplete'}</span><small class="users-email-state">${user.email_confirmed ? 'Email confirmed' : 'Email unconfirmed'}</small></td>
          <td>${escapeHtml(formatDateTime(user.joined_at, 'Unknown'))}</td>
          <td>${escapeHtml(formatDateTime(user.last_sign_in_at))}</td>
          <td><span class="users-activity">${escapeHtml(activity)}</span></td>
        </tr>`;
      }).join('') : '<tr><td colspan="6" class="users-empty">No users match this search or filter.</td></tr>';
    }

    const pagination = data?.pagination || {};
    usersPage = Math.max(1, Number(pagination.page || usersPage));
    usersTotalPages = Math.max(1, Number(pagination.total_pages || 1));
    if (byId('usersPageLabel')) byId('usersPageLabel').textContent = `Page ${usersPage} of ${usersTotalPages}`;
    if (byId('usersPrevious')) byId('usersPrevious').disabled = usersPage <= 1;
    if (byId('usersNext')) byId('usersNext').disabled = usersPage >= usersTotalPages;
    const generated = data?.generated_at ? new Date(data.generated_at) : new Date();
    setUsersStatus(`${number(pagination.total_results)} matching account${Number(pagination.total_results) === 1 ? '' : 's'} · refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  async function loadUsers(force = false) {
    if (usersLoaded && !force) return;
    if (!client) return;
    const refresh = byId('refreshUsers');
    setUsersStatus('Loading the secure user directory…');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_users', {
        page_number: usersPage,
        page_size: 20,
        account_filter: usersFilter,
        search_text: usersSearch
      });
      if (error) throw error;
      renderUsers(data || {});
      usersLoaded = true;
    } catch (error) {
      console.error('Rolexa users directory load failed', error);
      const missingFunction = /get_rolexa_admin_users|schema cache|function/i.test(error?.message || '');
      setUsersStatus(missingFunction ? 'The secure Users SQL needs to be applied in Supabase before this directory can load.' : (error?.message || 'Could not load the secure user directory.'), 'bad');
      if (byId('usersTableBody')) byId('usersTableBody').innerHTML = `<tr><td colspan="6" class="users-empty">${missingFunction ? 'Apply supabase-internal-admin-users.sql, then press Refresh users.' : 'The user directory is temporarily unavailable.'}</td></tr>`;
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh users'; }
    }
  }

  function renderTeam(data) {
    const summary = data?.summary || {};
    setMetric('teamTotal', summary.total);
    setMetric('teamActive', summary.active);
    setMetric('teamAdmins', summary.admins);
    setMetric('teamAnalysts', summary.analysts);
    const canManage = !!data?.can_manage;
    const panel = byId('teamManagePanel');
    const form = byId('teamAccessForm');
    const note = byId('teamOwnerNote');
    if (panel) panel.classList.toggle('read-only', !canManage);
    if (form) form.classList.toggle('hidden', !canManage);
    if (note) note.classList.toggle('hidden', canManage);

    const rows = Array.isArray(data?.team) ? data.team : [];
    const table = byId('teamTableBody');
    if (table) {
      table.innerHTML = rows.length ? rows.map(member => {
        const role = ['owner','admin','employee','analyst'].includes(member.role) ? member.role : 'employee';
        const permissions = Array.isArray(member.permissions) ? member.permissions : [];
        const canEdit = canManage && role !== 'owner';
        const name = member.full_name || member.email || 'Rolexa team member';
        const editData = encodeURIComponent(JSON.stringify({
          email: member.email || '', fullName: member.full_name || '', jobTitle: member.job_title || '',
          role, active: !!member.is_active
        }));
        return `<tr>
          <td><div class="users-person"><span class="users-avatar">${escapeHtml(initials(name))}</span><div><b>${escapeHtml(name)}</b><small>${escapeHtml(member.email || 'No email')}</small></div></div></td>
          <td><span class="team-role-title">${escapeHtml(member.job_title || 'Rolexa team member')}</span><small class="team-role-sub">Last active ${escapeHtml(formatDateTime(member.last_sign_in_at))}</small></td>
          <td><span class="team-access-badge ${role}">${escapeHtml(role)}</span></td>
          <td><span class="team-status-badge ${member.is_active ? 'active' : 'suspended'}">${member.is_active ? 'Active' : 'Suspended'}</span></td>
          <td><div class="team-permissions">${permissions.map(item => `<span class="team-permission">${escapeHtml(item)}</span>`).join('')}</div></td>
          <td><button class="team-edit" type="button" data-team-edit="${editData}" ${canEdit ? '' : 'disabled'}>${role === 'owner' ? 'Protected' : 'Edit'}</button></td>
        </tr>`;
      }).join('') : '<tr><td colspan="6" class="users-empty">No internal team access records were found.</td></tr>';
      table.querySelectorAll('[data-team-edit]:not(:disabled)').forEach(button => button.addEventListener('click', () => {
        try { fillTeamForm(JSON.parse(decodeURIComponent(button.dataset.teamEdit || ''))); } catch (_) {}
      }));
    }
    const generated = data?.generated_at ? new Date(data.generated_at) : new Date();
    setTeamStatus(`${number(summary.active)} active team member${Number(summary.active) === 1 ? '' : 's'} · refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  function clearTeamForm() {
    byId('teamAccessForm')?.reset();
    if (byId('teamEmail')) byId('teamEmail').disabled = false;
    if (byId('teamFormTitle')) byId('teamFormTitle').textContent = 'Grant team access';
    setTeamFormMessage('');
  }

  function fillTeamForm(member) {
    if (currentStaffRole !== 'owner') return;
    if (byId('teamEmail')) { byId('teamEmail').value = member.email || ''; byId('teamEmail').disabled = true; }
    if (byId('teamFullName')) byId('teamFullName').value = member.fullName || '';
    if (byId('teamJobTitle')) byId('teamJobTitle').value = member.jobTitle || '';
    if (byId('teamAccessRole')) byId('teamAccessRole').value = member.role || 'employee';
    if (byId('teamAccessStatus')) byId('teamAccessStatus').value = member.active ? 'active' : 'suspended';
    if (byId('teamFormTitle')) byId('teamFormTitle').textContent = 'Update team access';
    setTeamFormMessage('Editing this team member. Owner accounts remain protected.');
    byId('teamManagePanel')?.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function loadTeam(force = false) {
    if (teamLoaded && !force) return;
    if (!client) return;
    const refresh = byId('refreshTeam');
    setTeamStatus('Loading secure team access…');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_team');
      if (error) throw error;
      renderTeam(data || {});
      teamLoaded = true;
    } catch (error) {
      console.error('Rolexa team access load failed', error);
      const missingFunction = /get_rolexa_admin_team|schema cache|function/i.test(error?.message || '');
      setTeamStatus(missingFunction ? 'The secure Team access SQL needs to be applied in Supabase.' : (error?.message || 'Could not load team access.'), 'bad');
      if (byId('teamTableBody')) byId('teamTableBody').innerHTML = `<tr><td colspan="6" class="users-empty">${missingFunction ? 'Apply supabase-internal-admin-team-access.sql, then press Refresh team.' : 'The team directory is temporarily unavailable.'}</td></tr>`;
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh team'; }
    }
  }

  async function saveTeamAccess(event) {
    event.preventDefault();
    if (currentStaffRole !== 'owner') return;
    const button = byId('teamSaveAccess');
    const email = byId('teamEmail')?.value.trim() || '';
    setTeamFormMessage('Saving secure access…');
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const { error } = await client.rpc('manage_rolexa_staff_access', {
        target_email: email,
        access_role: byId('teamAccessRole')?.value || 'employee',
        access_active: byId('teamAccessStatus')?.value !== 'suspended',
        staff_full_name: byId('teamFullName')?.value.trim() || null,
        staff_job_title: byId('teamJobTitle')?.value.trim() || null
      });
      if (error) throw error;
      setTeamFormMessage('Team access saved successfully.', 'good');
      teamLoaded = false;
      await loadTeam(true);
      window.setTimeout(clearTeamForm, 1200);
    } catch (error) {
      console.error('Rolexa team access update failed', error);
      setTeamFormMessage(error?.message || 'Could not update team access.', 'bad');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Save access'; }
    }
  }

  async function verifyStaff(user) {
    if (!user) return null;
    const { data, error } = await client.from('rolexa_staff_users').select('user_id,role,is_active,full_name,job_title').eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (error) { console.error('Rolexa staff verification failed', error); return null; }
    return data || null;
  }

  async function routeSession() {
    hide('loginGate'); hide('deniedGate'); hide('adminApp'); show('loadingGate');
    const { data: { user }, error } = await client.auth.getUser();
    hide('loadingGate');
    if (error || !user) { metricsLoaded = false; analyticsLoaded = false; usersLoaded = false; teamLoaded = false; currentStaffRole = ''; show('loginGate'); return; }
    const staff = await verifyStaff(user);
    if (!staff) { metricsLoaded = false; analyticsLoaded = false; usersLoaded = false; teamLoaded = false; currentStaffRole = ''; show('deniedGate'); return; }
    currentStaffRole = staff.role || '';
    byId('staffName').textContent = staff.full_name || user.email || 'Rolexa staff';
    byId('staffRole').textContent = [staff.job_title, staff.role].filter(Boolean).join(' · ');
    show('adminApp');
    await Promise.all([loadMetrics(), loadAnalytics()]);
  }

  async function signIn(event) {
    event.preventDefault(); clearError();
    const email = byId('adminEmail').value.trim();
    const password = byId('adminPassword').value;
    const button = byId('adminLoginButton');
    button.disabled = true; button.textContent = 'Signing in…';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error('Sign-in failed.');
      const staff = await verifyStaff(data.user);
      if (!staff) { await client.auth.signOut(); throw new Error('This account is not approved for Rolexa internal access.'); }
      metricsLoaded = false; analyticsLoaded = false; usersLoaded = false; teamLoaded = false; await routeSession();
    } catch (error) { setError(error?.message || 'Could not sign in.'); }
    finally { button.disabled = false; button.textContent = 'Sign in securely'; }
  }

  async function signOut() {
    await client.auth.signOut(); metricsLoaded = false; analyticsLoaded = false; usersLoaded = false; teamLoaded = false; currentStaffRole = '';
    hide('adminApp'); hide('deniedGate'); show('loginGate');
  }

  async function refreshAll() {
    metricsLoaded = false; analyticsLoaded = false;
    await Promise.all([loadMetrics(true), loadAnalytics(true)]);
  }

  async function init() {
    try {
      const supabase = await loadSupabase();
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      byId('adminLoginForm')?.addEventListener('submit', signIn);
      byId('adminSignOut')?.addEventListener('click', signOut);
      byId('deniedSignOut')?.addEventListener('click', signOut);
      byId('refreshMetrics')?.addEventListener('click', refreshAll);
      byId('refreshUsers')?.addEventListener('click', () => { usersLoaded = false; loadUsers(true); });
      byId('refreshTeam')?.addEventListener('click', () => { teamLoaded = false; loadTeam(true); });
      byId('teamAccessForm')?.addEventListener('submit', saveTeamAccess);
      byId('teamCancelEdit')?.addEventListener('click', clearTeamForm);
      byId('usersTypeFilter')?.addEventListener('change', event => {
        usersFilter = event.target.value || 'all'; usersPage = 1; usersLoaded = false; loadUsers(true);
      });
      byId('usersSearch')?.addEventListener('input', event => {
        clearTimeout(usersSearchTimer);
        usersSearchTimer = setTimeout(() => {
          usersSearch = event.target.value.trim(); usersPage = 1; usersLoaded = false; loadUsers(true);
        }, 350);
      });
      byId('usersPrevious')?.addEventListener('click', () => {
        if (usersPage <= 1) return; usersPage -= 1; usersLoaded = false; loadUsers(true);
      });
      byId('usersNext')?.addEventListener('click', () => {
        if (usersPage >= usersTotalPages) return; usersPage += 1; usersLoaded = false; loadUsers(true);
      });
      window.addEventListener('rolexa:admin-view-opened', event => {
        if (event.detail?.viewId === 'usersView') loadUsers();
        if (event.detail?.viewId === 'teamView') loadTeam();
      });
      document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', async () => {
        analyticsDays = Number(button.dataset.days || 90);
        document.querySelectorAll('[data-days]').forEach(item => item.classList.toggle('active', item === button));
        analyticsLoaded = false;
        await loadAnalytics(true);
      }));
      client.auth.onAuthStateChange((event, session) => {
        // Supabase commonly refreshes the access token when a background tab
        // becomes active again. That is not a logout and must not replace the
        // visible admin workspace with the login/loading gates.
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
        const appIsVisible = !byId('adminApp')?.classList.contains('hidden');
        if (event === 'SIGNED_IN' && session?.user && appIsVisible) return;
        if (event === 'SIGNED_OUT') {
          metricsLoaded = false; analyticsLoaded = false; usersLoaded = false; teamLoaded = false; currentStaffRole = '';
          hide('loadingGate'); hide('deniedGate'); hide('adminApp'); show('loginGate');
          return;
        }
        setTimeout(routeSession, 0);
      });
      await routeSession();
    } catch (error) {
      console.error('Internal admin startup error', error);
      hide('loadingGate'); show('loginGate'); setError('The internal dashboard could not connect securely.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
