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
  let peopleLoaded = false;
  let peopleData = null;
  let selectedPeopleUserId = '';
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

  function formatDate(value, empty = 'Not set') {
    if (!value) return empty;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return empty;
    return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  function humanize(value, empty = 'Not set') {
    const clean = String(value || '').trim();
    if (!clean) return empty;
    return clean.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
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

  function setPeopleStatus(message, kind = '') {
    const el = byId('peopleStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `metrics-status team-status ${kind}`.trim();
  }

  function setPeopleMessage(id, message, kind = '') {
    const el = byId(id);
    if (!el) return;
    el.textContent = message;
    el.className = `people-form-message ${kind}`.trim();
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
    setMetric('teamHr', summary.hr);
    setMetric('teamAdmins', summary.admins);
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
        const role = ['owner','admin','hr','employee','analyst'].includes(member.role) ? member.role : 'employee';
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

  function findSelectedPerson() {
    const people = Array.isArray(peopleData?.people) ? peopleData.people : [];
    return people.find(person => person.user_id === selectedPeopleUserId) || people[0] || null;
  }

  function renderPeople(data) {
    peopleData = data || {};
    const summary = peopleData.summary || {};
    const people = Array.isArray(peopleData.people) ? peopleData.people : [];
    const canManage = !!peopleData.can_manage;
    setMetric('peopleTotal', summary.total);
    setMetric('peopleActive', summary.active);
    setMetric('peoplePreboarding', summary.preboarding);
    setMetric('peopleDocuments', summary.documents);

    if (!people.some(person => person.user_id === selectedPeopleUserId)) {
      selectedPeopleUserId = (people.find(person => person.is_self) || people[0] || {}).user_id || '';
    }

    if (byId('peopleScopeBadge')) byId('peopleScopeBadge').textContent = canManage ? 'Owner & HR access' : 'Your record only';
    if (byId('peopleDirectoryTitle')) byId('peopleDirectoryTitle').textContent = canManage ? 'Rolexa people' : 'Your employee account';
    if (byId('peopleDirectoryDescription')) byId('peopleDirectoryDescription').textContent = canManage
      ? 'Select a team member to review their employment record.'
      : 'Only your own employment information is available in this area.';

    const directory = byId('peopleDirectory');
    if (directory) {
      directory.innerHTML = people.length ? people.map(person => {
        const status = ['preboarding','active','leave','ended'].includes(person.employment_status) ? person.employment_status : 'preboarding';
        const name = person.full_name || person.email || 'Rolexa team member';
        return `<button class="people-directory-button ${person.user_id === selectedPeopleUserId ? 'active' : ''}" type="button" data-people-user="${escapeHtml(person.user_id)}"><span class="users-avatar">${escapeHtml(initials(name))}</span><span class="people-directory-copy"><b>${escapeHtml(name)}</b><small>${escapeHtml(person.job_title || person.email || 'Rolexa team member')}</small></span><span class="people-directory-state ${status}">${escapeHtml(humanize(status))}</span></button>`;
      }).join('') : '<div class="people-empty">No employee records are available.</div>';
      directory.querySelectorAll('[data-people-user]').forEach(button => button.addEventListener('click', () => {
        selectedPeopleUserId = button.dataset.peopleUser || '';
        renderPeople(peopleData);
      }));
    }

    const selected = findSelectedPerson();
    const profileForm = byId('peopleProfileForm');
    const uploadForm = byId('peopleUploadForm');
    profileForm?.classList.toggle('hidden', !canManage || !selected);
    uploadForm?.classList.toggle('hidden', !canManage || !selected);

    if (!selected) {
      if (byId('peopleSelectedName')) byId('peopleSelectedName').textContent = 'No employee selected';
      if (byId('peopleSelectedRole')) byId('peopleSelectedRole').textContent = 'Employment details are not available.';
      if (byId('peopleDocumentsBody')) byId('peopleDocumentsBody').innerHTML = '<tr><td colspan="5" class="people-empty">No accessible documents.</td></tr>';
      return;
    }

    const selectedName = selected.full_name || selected.email || 'Rolexa team member';
    if (byId('peopleSelectedAvatar')) byId('peopleSelectedAvatar').textContent = initials(selectedName);
    if (byId('peopleSelectedName')) byId('peopleSelectedName').textContent = selectedName;
    if (byId('peopleSelectedRole')) byId('peopleSelectedRole').textContent = [selected.job_title, selected.department, selected.email].filter(Boolean).join(' · ');
    if (byId('peopleSelectedStatus')) byId('peopleSelectedStatus').textContent = humanize(selected.employment_status || 'preboarding');
    if (byId('peopleDetailNumber')) byId('peopleDetailNumber').textContent = selected.employee_number || 'Not set';
    if (byId('peopleDetailDepartment')) byId('peopleDetailDepartment').textContent = selected.department || 'Not set';
    if (byId('peopleDetailType')) byId('peopleDetailType').textContent = humanize(selected.employment_type);
    if (byId('peopleDetailStart')) byId('peopleDetailStart').textContent = formatDate(selected.start_date);
    if (byId('peopleDetailLocation')) byId('peopleDetailLocation').textContent = selected.work_location || 'Not set';
    if (byId('peopleDetailAccess')) byId('peopleDetailAccess').textContent = `${humanize(selected.access_role)} · ${selected.access_active ? 'Active' : 'Suspended'}`;

    if (canManage) {
      if (byId('peopleEmployeeNumber')) byId('peopleEmployeeNumber').value = selected.employee_number || '';
      if (byId('peopleDepartment')) byId('peopleDepartment').value = selected.department || '';
      if (byId('peopleEmploymentStatus')) byId('peopleEmploymentStatus').value = selected.employment_status || 'preboarding';
      if (byId('peopleEmploymentType')) byId('peopleEmploymentType').value = selected.employment_type || 'full_time';
      if (byId('peopleStartDate')) byId('peopleStartDate').value = selected.start_date || '';
      if (byId('peopleEndDate')) byId('peopleEndDate').value = selected.end_date || '';
      if (byId('peopleWorkLocation')) byId('peopleWorkLocation').value = selected.work_location || '';
      const manager = byId('peopleManager');
      if (manager) {
        manager.innerHTML = '<option value="">No manager selected</option>' + people
          .filter(person => person.user_id !== selected.user_id && person.access_active)
          .map(person => `<option value="${escapeHtml(person.user_id)}">${escapeHtml(person.full_name || person.email || 'Rolexa team member')}</option>`).join('');
        manager.value = selected.manager_user_id || '';
      }
    }

    const documents = Array.isArray(selected.documents) ? selected.documents : [];
    const documentsBody = byId('peopleDocumentsBody');
    if (documentsBody) {
      documentsBody.innerHTML = documents.length ? documents.map(document => `<tr><td><span class="people-document-title">${escapeHtml(document.title || 'HR document')}</span><span class="people-document-type">${escapeHtml(humanize(document.document_type))}</span></td><td><span class="people-document-badge">${escapeHtml(humanize(document.status))}</span></td><td><span class="people-document-badge ${escapeHtml(document.visibility || '')}">${document.visibility === 'hr_only' ? 'HR & Owner' : 'Employee'}</span></td><td>${escapeHtml(formatDateTime(document.created_at, 'Unknown'))}</td><td><button class="people-download" type="button" data-people-document="${escapeHtml(document.id)}">Download</button></td></tr>`).join('') : '<tr><td colspan="5" class="people-empty">No accessible employment documents have been added.</td></tr>';
      documentsBody.querySelectorAll('[data-people-document]').forEach(button => button.addEventListener('click', () => downloadPeopleDocument(button.dataset.peopleDocument, button)));
    }

    const generated = peopleData.generated_at ? new Date(peopleData.generated_at) : new Date();
    setPeopleStatus(`${canManage ? number(summary.total) + ' visible people record' + (Number(summary.total) === 1 ? '' : 's') : 'Your private employment record'} · refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  async function loadPeople(force = false) {
    if (peopleLoaded && !force) return;
    if (!client) return;
    const refresh = byId('refreshPeople');
    setPeopleStatus('Loading private People & HR records…');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try {
      const { data, error } = await client.rpc('get_rolexa_people_hr');
      if (error) throw error;
      renderPeople(data || {});
      peopleLoaded = true;
    } catch (error) {
      console.error('Rolexa People & HR load failed', error);
      const missingFunction = /get_rolexa_people_hr|schema cache|function/i.test(error?.message || '');
      setPeopleStatus(missingFunction ? 'The People & HR Supabase SQL must be applied before secure employee records can load.' : (error?.message || 'Could not load People & HR records.'), 'bad');
      if (byId('peopleDirectory')) byId('peopleDirectory').innerHTML = `<div class="people-empty">${missingFunction ? 'Apply supabase-internal-admin-people-hr.sql, then press Refresh.' : 'The employee directory is temporarily unavailable.'}</div>`;
    } finally {
      if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh'; }
    }
  }

  async function savePeopleProfile(event) {
    event.preventDefault();
    const selected = findSelectedPerson();
    if (!selected || !peopleData?.can_manage) return;
    const button = byId('peopleSaveProfile');
    setPeopleMessage('peopleProfileMessage', 'Saving secure employment record…');
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const { error } = await client.rpc('manage_rolexa_employee_profile', {
        target_user_id: selected.user_id,
        employee_number_value: byId('peopleEmployeeNumber')?.value.trim() || null,
        department_value: byId('peopleDepartment')?.value.trim() || null,
        manager_user_id_value: byId('peopleManager')?.value || null,
        employment_status_value: byId('peopleEmploymentStatus')?.value || 'preboarding',
        employment_type_value: byId('peopleEmploymentType')?.value || 'full_time',
        start_date_value: byId('peopleStartDate')?.value || null,
        end_date_value: byId('peopleEndDate')?.value || null,
        work_location_value: byId('peopleWorkLocation')?.value.trim() || null
      });
      if (error) throw error;
      setPeopleMessage('peopleProfileMessage', 'Employment record saved.', 'good');
      peopleLoaded = false;
      await loadPeople(true);
    } catch (error) {
      console.error('Rolexa employee profile update failed', error);
      setPeopleMessage('peopleProfileMessage', error?.message || 'Could not save this employment record.', 'bad');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Save employment record'; }
    }
  }

  async function uploadPeopleDocument(event) {
    event.preventDefault();
    const selected = findSelectedPerson();
    const file = byId('peopleDocumentFile')?.files?.[0];
    if (!selected || !peopleData?.can_manage || !file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setPeopleMessage('peopleUploadMessage', 'Choose a PDF document.', 'bad'); return; }
    if (file.size > 10485760) { setPeopleMessage('peopleUploadMessage', 'The PDF must be 10 MB or smaller.', 'bad'); return; }

    const button = byId('peopleUploadDocument');
    const uniqueId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const objectPath = `${selected.user_id}/${uniqueId}.pdf`;
    let uploaded = false;
    setPeopleMessage('peopleUploadMessage', 'Encrypting and uploading to private storage…');
    if (button) { button.disabled = true; button.textContent = 'Uploading…'; }
    try {
      const { error: uploadError } = await client.storage.from('rolexa-hr-documents').upload(objectPath, file, { contentType:'application/pdf', upsert:false });
      if (uploadError) throw uploadError;
      uploaded = true;
      const { error } = await client.rpc('register_rolexa_hr_document', {
        target_user_id: selected.user_id,
        document_type_value: byId('peopleDocumentType')?.value || 'other',
        document_title: byId('peopleDocumentTitle')?.value.trim() || file.name.replace(/\.pdf$/i, ''),
        object_path: objectPath,
        visibility_value: byId('peopleDocumentVisibility')?.value || 'employee',
        status_value: byId('peopleDocumentStatus')?.value || 'issued',
        retention_until_value: byId('peopleRetentionUntil')?.value || null
      });
      if (error) throw error;
      byId('peopleUploadForm')?.reset();
      setPeopleMessage('peopleUploadMessage', 'Private document added successfully.', 'good');
      peopleLoaded = false;
      await loadPeople(true);
    } catch (error) {
      if (uploaded) await client.storage.from('rolexa-hr-documents').remove([objectPath]);
      console.error('Rolexa HR document upload failed', error);
      setPeopleMessage('peopleUploadMessage', error?.message || 'Could not upload this document.', 'bad');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Upload secure document'; }
    }
  }

  async function downloadPeopleDocument(documentId, button) {
    if (!documentId || !client) return;
    const originalText = button?.textContent || 'Download';
    if (button) { button.disabled = true; button.textContent = 'Preparing…'; }
    try {
      const { data: access, error: accessError } = await client.rpc('open_rolexa_hr_document', { target_document_id: documentId });
      if (accessError) throw accessError;
      const { data, error } = await client.storage.from('rolexa-hr-documents').createSignedUrl(access.storage_path, 60, { download: access.title || true });
      if (error || !data?.signedUrl) throw error || new Error('A secure download link could not be created.');
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.rel = 'noopener';
      link.click();
    } catch (error) {
      console.error('Rolexa HR document download failed', error);
      setPeopleStatus(error?.message || 'Could not download this private document.', 'bad');
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  }

  async function verifyStaff(user) {
    if (!user) return null;
    const { data, error } = await client.from('rolexa_staff_users').select('user_id,role,is_active,full_name,job_title').eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (error) { console.error('Rolexa staff verification failed', error); return null; }
    return data || null;
  }

  function applyStaffNavigation(role) {
    document.querySelectorAll('.side [data-admin-target],.side [data-admin-view]').forEach(button => {
      const isPeople = button.dataset.adminView === 'peopleView';
      button.classList.toggle('hidden', role === 'hr' && !isPeople);
    });
    document.querySelectorAll('.content [data-admin-target]').forEach(button => button.classList.toggle('hidden', role === 'hr'));
  }

  function clearLoadedState() {
    metricsLoaded = false;
    analyticsLoaded = false;
    usersLoaded = false;
    teamLoaded = false;
    peopleLoaded = false;
    peopleData = null;
    selectedPeopleUserId = '';
    [
      'metricTotalUsers','metricCandidates','metricEmployers','metricApplications','metricJobs','metricLiveJobs','metricActiveEmployers',
      'usersTotal','usersToday','usersSevenDays','usersThirtyDays','teamTotal','teamActive','teamHr','teamAdmins',
      'peopleTotal','peopleActive','peoplePreboarding','peopleDocuments'
    ].forEach(id => { if (byId(id)) byId(id).textContent = '—'; });
    if (byId('usersTableBody')) byId('usersTableBody').innerHTML = '<tr><td colspan="6" class="users-empty">Select Users to load the secure directory.</td></tr>';
    if (byId('teamTableBody')) byId('teamTableBody').innerHTML = '<tr><td colspan="6" class="users-empty">Select Team access to load staff permissions.</td></tr>';
    if (byId('peopleDirectory')) byId('peopleDirectory').innerHTML = '<div class="people-empty">Open People &amp; HR to load secure records.</div>';
    if (byId('peopleDocumentsBody')) byId('peopleDocumentsBody').innerHTML = '<tr><td colspan="5" class="people-empty">Select a person to view accessible documents.</td></tr>';
    if (byId('peopleSelectedName')) byId('peopleSelectedName').textContent = 'Select a person';
    if (byId('peopleSelectedRole')) byId('peopleSelectedRole').textContent = 'Employment details will appear here.';
    ['peopleDetailNumber','peopleDetailDepartment','peopleDetailType','peopleDetailStart','peopleDetailLocation','peopleDetailAccess'].forEach(id => { if (byId(id)) byId(id).textContent = 'Not set'; });
    byId('peopleProfileForm')?.classList.add('hidden');
    byId('peopleUploadForm')?.classList.add('hidden');
  }

  async function routeSession() {
    hide('loginGate'); hide('deniedGate'); hide('adminApp'); show('loadingGate');
    const { data: { user }, error } = await client.auth.getUser();
    hide('loadingGate');
    if (error || !user) { clearLoadedState(); currentStaffRole = ''; show('loginGate'); return; }
    const staff = await verifyStaff(user);
    if (!staff) { clearLoadedState(); currentStaffRole = ''; show('deniedGate'); return; }
    currentStaffRole = staff.role || '';
    applyStaffNavigation(currentStaffRole);
    byId('staffName').textContent = staff.full_name || user.email || 'Rolexa staff';
    byId('staffRole').textContent = [staff.job_title, staff.role].filter(Boolean).join(' · ');
    show('adminApp');
    if (currentStaffRole === 'hr') {
      document.querySelector('[data-admin-view="peopleView"]')?.click();
      await loadPeople();
      return;
    }
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
      clearLoadedState(); await routeSession();
    } catch (error) { setError(error?.message || 'Could not sign in.'); }
    finally { button.disabled = false; button.textContent = 'Sign in securely'; }
  }

  async function signOut() {
    await client.auth.signOut(); clearLoadedState(); currentStaffRole = '';
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
      byId('refreshPeople')?.addEventListener('click', () => { peopleLoaded = false; loadPeople(true); });
      byId('teamAccessForm')?.addEventListener('submit', saveTeamAccess);
      byId('teamCancelEdit')?.addEventListener('click', clearTeamForm);
      byId('peopleProfileForm')?.addEventListener('submit', savePeopleProfile);
      byId('peopleUploadForm')?.addEventListener('submit', uploadPeopleDocument);
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
        if (event.detail?.viewId === 'peopleView') loadPeople();
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
          clearLoadedState(); currentStaffRole = '';
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
