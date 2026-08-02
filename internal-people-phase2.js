(() => {
  if (window.__rolexaInternalPeoplePhase2) return;
  window.__rolexaInternalPeoplePhase2 = true;

  let client = null;
  let currentStaffRole = '';
  let teamLoaded = false;
  let teamLoading = false;
  let teamCanManage = false;
  let peopleLoaded = false;
  let peopleLoading = false;
  let peopleData = null;
  let selectedPeopleUserId = '';
  let orgChartLoaded = false;
  let orgChartLoading = false;
  let orgChartData = null;

  const byId = id => document.getElementById(id);
  const number = value => new Intl.NumberFormat('en-GB').format(Number(value || 0));
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
    return clean ? clean.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : empty;
  }

  function initials(value) {
    return String(value || 'Rolexa user').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'RU';
  }

  function setMetric(id, value) {
    if (byId(id)) byId(id).textContent = number(value);
  }

  function setStatus(id, message, kind = '') {
    const element = byId(id);
    if (!element) return;
    element.textContent = message;
    element.className = `metrics-status ${kind}`.trim();
  }

  function setMessage(id, message, kind = '') {
    const element = byId(id);
    if (!element) return;
    element.textContent = message;
    element.className = id === 'teamFormMessage'
      ? (message ? `team-form-message show ${kind}`.trim() : 'team-form-message')
      : `people-form-message ${kind}`.trim();
  }

  function installOverview() {
    const cards = [...document.querySelectorAll('#peopleOverview .metric-card')];
    const definitions = [
      ['Total Employees','peopleOverviewTotal','All visible Rolexa people records.'],
      ['Active Employees','peopleOverviewActive','Currently employed by Rolexa.'],
      ['Departments','peopleOverviewDepartments','Departments in the current directory.'],
      ['New Starters','peopleOverviewStarters','Start dates within the last 30 days.'],
      ['Preboarding','peopleOverviewPreboarding','Employment setup in progress.'],
      ['Secure Documents','peopleOverviewDocuments','Private documents visible to your access level.'],
      ['Pending Access Requests','peopleOverviewAccessRequests','Access-request workflow is not configured yet.']
    ];
    definitions.forEach((definition, index) => {
      if (!cards[index]) return;
      cards[index].innerHTML = `<span class="metric-label">${definition[0]}</span><b class="metric-value" id="${definition[1]}">${index === 6 ? '0' : '—'}</b><span class="metric-note">${definition[2]}</span>${index === 6 ? '<span class="not-configured">Not configured</span>' : '<span class="not-configured people-live-tag">Secure data</span>'}`;
    });
    const readiness = document.querySelector('#peopleOverview .status-card');
    if (readiness) readiness.innerHTML = '<div class="section-title"><div><h2>People workspace is connected</h2><p>The approved internal people systems now run from Rolexa People using the existing secure data model.</p></div><span class="phase-pill">Phase 2</span></div><div class="readiness-list"><div class="readiness-item"><span class="readiness-mark">✓</span><div><b>People directory</b><small>Existing protected employee records</small></div></div><div class="readiness-item"><span class="readiness-mark">✓</span><div><b>Team access</b><small>Owner-controlled staff permissions</small></div></div><div class="readiness-item"><span class="readiness-mark">✓</span><div><b>Organisation chart</b><small>Existing manager reporting lines</small></div></div><div class="readiness-item"><span class="readiness-mark">✓</span><div><b>Employment and documents</b><small>Existing HR privacy rules retained</small></div></div></div>';
  }

  function installWorkspaceMarkup() {
    installOverview();
    const directory = byId('peopleDirectory');
    if (directory) directory.innerHTML = `
      <div class="page-head"><div><h1>People</h1><p>The secure directory for people who work directly for Rolexa.</p></div><span class="badge" id="peopleDirectoryScope">Protected staff data</span></div>
      <div class="people-summary-grid">
        <article class="card people-summary primary-summary"><span>People records</span><b id="peopleTotal">—</b><small>Visible within your access level</small></article>
        <article class="card people-summary"><span>Active employees</span><b id="peopleActive">—</b><small>Currently employed by Rolexa</small></article>
        <article class="card people-summary"><span>Preboarding</span><b id="peoplePreboarding">—</b><small>Employment setup in progress</small></article>
        <article class="card people-summary"><span>Secure documents</span><b id="peopleDocumentsMetric">—</b><small>PDF records you can access</small></article>
      </div>
      <div class="people-privacy-note"><div><b>Privacy by default</b>Owner and HR can view all employee records. Every other team member receives only their own record and employee-visible documents. HR-only files are never returned to ordinary employee accounts.</div></div>
      <section class="card people-directory-card"><div class="users-directory-head"><div><h2 id="peopleDirectoryTitle">Rolexa people</h2><p id="peopleDirectoryDescription">Select a team member to open their employment record.</p></div><button class="refresh" id="refreshPeople" type="button">Refresh</button></div><div class="people-directory-list" id="peopleDirectoryList"><div class="people-empty">Loading secure employee records…</div></div><div class="metrics-status" id="peopleStatus">Waiting for secure employee data…</div></section>`;

    const team = byId('peopleTeamAccess');
    if (team) team.innerHTML = `
      <div class="page-head"><div><h1>Team Access</h1><p>See who can access Rolexa’s internal workspaces, their role and exactly what that access allows.</p></div><span class="badge">Owner controlled</span></div>
      <div class="team-summary-grid"><article class="card team-summary primary-summary"><span>Total team</span><b id="teamTotal">—</b><small>All staff access records</small></article><article class="card team-summary"><span>Active access</span><b id="teamActive">—</b><small>Can currently sign in</small></article><article class="card team-summary"><span>HR access</span><b id="teamHr">—</b><small>People records and documents</small></article><article class="card team-summary"><span>Administrators</span><b id="teamAdmins">—</b><small>Operational administrators</small></article></div>
      <section class="card access-levels-card"><div class="users-directory-head"><div><h2>Role-based access</h2><p>Job titles describe a position. The system role controls permitted workspaces and actions.</p></div><span class="users-live-label">Protected</span></div><div class="access-level-grid"><article class="access-level owner"><b>Owner</b><p>Full platform, security and team-access control.</p></article><article class="access-level hr"><b>HR</b><p>All employee records and private HR documents.</p></article><article class="access-level admin"><b>Admin</b><p>Platform operations, users, employers, applications and analytics.</p></article><article class="access-level employee"><b>Employee</b><p>Standard operations plus only their own employment record.</p></article><article class="access-level analyst"><b>Analyst</b><p>Read-only analytics plus only their own employment record.</p></article></div></section>
      <div class="team-workspace-grid"><section class="card team-directory-card"><div class="users-directory-head"><div><h2>Internal team</h2><p>Current Rolexa staff roles, titles, access status and permissions.</p></div><button class="refresh" id="refreshTeam" type="button">Refresh team</button></div><div class="team-table-wrap"><table class="team-table"><thead><tr><th>Team member</th><th>Rolexa position</th><th>Access level</th><th>Status</th><th>Permissions</th><th></th></tr></thead><tbody id="teamTableBody"><tr><td colspan="6" class="users-empty">Loading staff permissions…</td></tr></tbody></table></div><div class="metrics-status" id="teamStatus">Waiting for secure team data…</div></section>
      <aside class="card team-manage-card" id="teamManagePanel"><div class="team-manage-head"><span class="team-lock">◆</span><div><h2 id="teamFormTitle">Grant team access</h2><p>Only an Owner can save access changes.</p></div></div><form id="teamAccessForm"><label>Email address<input id="teamEmail" type="email" required placeholder="person@rolexa.co.uk" autocomplete="off"></label><label>Full name<input id="teamFullName" type="text" placeholder="Team member name" maxlength="120"></label><label>Rolexa job title<input id="teamJobTitle" type="text" placeholder="e.g. Product Manager" maxlength="120"></label><label>System access<select id="teamAccessRole" required><option value="employee">Employee</option><option value="admin">Admin</option><option value="hr">HR</option><option value="analyst">Analyst</option></select></label><label>Access status<select id="teamAccessStatus"><option value="active">Active</option><option value="suspended">Suspended</option></select></label><div class="team-form-actions"><button class="team-save" id="teamSaveAccess" type="submit">Save access</button><button class="team-cancel" id="teamCancelEdit" type="button">Clear</button></div><div class="team-form-message" id="teamFormMessage"></div></form><div class="team-owner-note hidden" id="teamOwnerNote">You can view the team directory, but only a Rolexa Owner can change staff access.</div></aside></div>`;

    const organisation = byId('peopleOrganisationChart');
    if (organisation) organisation.innerHTML = `
      <div class="page-head"><div><h1>Organisation Chart</h1><p>The internal Rolexa structure showing who reports to whom as the company grows.</p></div><span class="badge">Visible to active staff</span></div>
      <section class="card people-org-card"><div class="people-section-title"><div><h2>Reporting structure</h2><p>Names, roles, departments and reporting lines are shown here. Private HR information is excluded.</p></div><div class="workspace-actions"><span class="people-org-meta" id="peopleOrgCount">Internal team</span><button class="refresh" id="refreshOrgChart" type="button">Refresh</button></div></div><div class="people-org-tree" id="peopleOrgChart"><div class="people-org-empty">Loading the secure organisation chart…</div></div><div class="metrics-status" id="peopleOrgStatus">Waiting for reporting lines…</div></section>`;

    const records = byId('peopleEmploymentRecords');
    if (records) records.innerHTML = `
      <div class="page-head"><div><h1>Employment Records</h1><p>Private employment details for people who work directly for Rolexa.</p></div><span class="badge" id="peopleScopeBadge">Secure employee records</span></div>
      <div class="people-privacy-note"><div><b>Access follows your staff role</b>HR can manage all employment records. Other staff can view only their own employment details.</div></div>
      <div class="people-record-grid"><aside class="card people-selector-card"><div class="people-section-title"><div><h2>Choose employee</h2><p>Select the record to review.</p></div></div><label>Employee<select id="employmentPersonSelect"><option value="">Loading secure people…</option></select></label><p class="people-selector-help">The available names are restricted to your access level.</p></aside>
      <section class="card people-detail-card"><div class="people-person-head"><div class="people-person-main"><span class="users-avatar" id="peopleSelectedAvatar">R</span><div><h2 id="peopleSelectedName">Select a person</h2><p id="peopleSelectedRole">Employment details will appear here.</p></div></div><span class="people-scope-badge" id="peopleSelectedStatus">Secure</span></div><div class="people-details-grid"><div class="people-detail"><span>Employee number</span><b id="peopleDetailNumber">Not set</b></div><div class="people-detail"><span>Department</span><b id="peopleDetailDepartment">Not set</b></div><div class="people-detail"><span>Employment type</span><b id="peopleDetailType">Not set</b></div><div class="people-detail"><span>Start date</span><b id="peopleDetailStart">Not set</b></div><div class="people-detail"><span>Work location</span><b id="peopleDetailLocation">Not set</b></div><div class="people-detail"><span>Account access</span><b id="peopleDetailAccess">Not set</b></div></div>
      <form class="people-profile-form hidden" id="peopleProfileForm"><div class="people-section-title"><div><h2>Update employment record</h2><p>Only HR can save these fields.</p></div></div><div class="people-profile-grid"><label>Employee number<input id="peopleEmployeeNumber" type="text" maxlength="40" placeholder="e.g. RLX-001"></label><label>Department<input id="peopleDepartment" type="text" maxlength="100" placeholder="e.g. Product"></label><label>Employment status<select id="peopleEmploymentStatus"><option value="preboarding">Preboarding</option><option value="active">Active</option><option value="leave">On leave</option><option value="ended">Employment ended</option></select></label><label>Employment type<select id="peopleEmploymentType"><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="fixed_term">Fixed term</option><option value="contractor">Contractor</option><option value="worker">Worker</option></select></label><label>Start date<input id="peopleStartDate" type="date"></label><label>End date<input id="peopleEndDate" type="date"></label><label>Work location<input id="peopleWorkLocation" type="text" maxlength="120" placeholder="e.g. Remote, UK"></label><label>Manager<select id="peopleManager"><option value="">No manager selected</option></select></label></div><div class="people-form-actions"><button class="people-save" id="peopleSaveProfile" type="submit">Save employment record</button><span class="people-form-message" id="peopleProfileMessage"></span></div></form></section></div>`;

    const documents = byId('peopleDocuments');
    if (documents) documents.innerHTML = `
      <div class="page-head"><div><h1>Documents</h1><p>Contracts, written particulars, policies and other protected employee documents.</p></div><span class="badge">Private storage</span></div>
      <div class="people-privacy-note"><div><b>Private by design</b>Documents remain securely stored in private internal storage. Existing employee and HR access controls remain unchanged.</div></div>
      <div class="people-documents-grid"><aside class="card people-selector-card"><div class="people-section-title"><div><h2>Choose employee</h2><p>Select whose accessible documents to view.</p></div></div><label>Employee<select id="documentsPersonSelect"><option value="">Loading secure people…</option></select></label><p class="people-selector-help">Ordinary employees receive only their own employee-visible documents.</p></aside>
      <section class="card people-documents-card"><div class="people-section-title"><div><h2 id="documentsPersonTitle">Employment documents</h2><p>Only files permitted for your staff role are returned.</p></div><span class="users-live-label">Private storage</span></div><div class="people-documents-wrap"><table class="people-documents-table"><thead><tr><th>Document</th><th>Status</th><th>Visibility</th><th>Added</th><th></th></tr></thead><tbody id="peopleDocumentsBody"><tr><td colspan="5" class="people-empty">Loading accessible documents…</td></tr></tbody></table></div>
      <form class="people-upload-form hidden" id="peopleUploadForm"><div class="people-section-title"><div><h2>Add a private PDF</h2><p>Maximum 10 MB. Files remain in the protected HR bucket.</p></div></div><div class="people-upload-grid"><label class="wide">Document title<input id="peopleDocumentTitle" type="text" maxlength="180" required placeholder="e.g. Signed employment contract"></label><label>Document type<select id="peopleDocumentType"><option value="employment_contract">Employment contract</option><option value="written_particulars">Written particulars</option><option value="right_to_work">Right-to-work evidence</option><option value="employee_handbook">Employee handbook</option><option value="policy">Company policy</option><option value="other">Other HR document</option></select></label><label>Status<select id="peopleDocumentStatus"><option value="issued">Issued</option><option value="signed">Signed</option><option value="acknowledged">Acknowledged</option><option value="pending">Pending</option></select></label><label>Visibility<select id="peopleDocumentVisibility"><option value="employee">Employee can view</option><option value="hr_only">HR and Owner only</option></select></label><label>Retention review date<input id="peopleRetentionUntil" type="date"></label><label class="wide">PDF file<input id="peopleDocumentFile" type="file" accept="application/pdf,.pdf" required></label></div><p class="people-upload-hint">Do not upload health, equality, banking or disciplinary information during this phase.</p><div class="people-form-actions"><button class="people-save" id="peopleUploadDocument" type="submit">Upload secure document</button><span class="people-form-message" id="peopleUploadMessage"></span></div></form></section></div>`;
  }

  function renderTeam(data) {
    const summary = data?.summary || {};
    setMetric('teamTotal', summary.total); setMetric('teamActive', summary.active); setMetric('teamHr', summary.hr); setMetric('teamAdmins', summary.admins);
    teamCanManage = !!data?.can_manage;
    byId('teamManagePanel')?.classList.toggle('read-only', !teamCanManage);
    byId('teamAccessForm')?.classList.toggle('hidden', !teamCanManage);
    byId('teamOwnerNote')?.classList.toggle('hidden', teamCanManage);
    const rows = Array.isArray(data?.team) ? data.team : [];
    const table = byId('teamTableBody');
    if (table) {
      table.innerHTML = rows.length ? rows.map(member => {
        const role = ['owner','admin','hr','employee','analyst'].includes(member.role) ? member.role : 'employee';
        const permissions = Array.isArray(member.permissions) ? member.permissions : [];
        const canEdit = teamCanManage && role !== 'owner';
        const name = member.full_name || member.email || 'Rolexa team member';
        const editData = encodeURIComponent(JSON.stringify({ email:member.email || '', fullName:member.full_name || '', jobTitle:member.job_title || '', role, active:!!member.is_active }));
        return `<tr><td><div class="users-person"><span class="users-avatar">${escapeHtml(initials(name))}</span><div><b>${escapeHtml(name)}</b><small>${escapeHtml(member.email || 'No email')}</small></div></div></td><td><span class="team-role-title">${escapeHtml(member.job_title || 'Rolexa team member')}</span><small class="team-role-sub">Last active ${escapeHtml(formatDateTime(member.last_sign_in_at))}</small></td><td><span class="team-access-badge ${role}">${escapeHtml(role)}</span></td><td><span class="team-status-badge ${member.is_active ? 'active' : 'suspended'}">${member.is_active ? 'Active' : 'Suspended'}</span></td><td><div class="team-permissions">${permissions.map(item => `<span class="team-permission">${escapeHtml(item)}</span>`).join('')}</div></td><td><button class="team-edit" type="button" data-team-edit="${editData}" ${canEdit ? '' : 'disabled'}>${role === 'owner' ? 'Protected' : 'Edit'}</button></td></tr>`;
      }).join('') : '<tr><td colspan="6" class="users-empty">No internal team access records were found.</td></tr>';
      table.querySelectorAll('[data-team-edit]:not(:disabled)').forEach(button => button.addEventListener('click', () => { try { fillTeamForm(JSON.parse(decodeURIComponent(button.dataset.teamEdit || ''))); } catch (_) {} }));
    }
    const generated = data?.generated_at ? new Date(data.generated_at) : new Date();
    setStatus('teamStatus', `${number(summary.active)} active team member${Number(summary.active) === 1 ? '' : 's'} · refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  function clearTeamForm() {
    byId('teamAccessForm')?.reset();
    if (byId('teamEmail')) byId('teamEmail').disabled = false;
    if (byId('teamFormTitle')) byId('teamFormTitle').textContent = 'Grant team access';
    setMessage('teamFormMessage', '');
  }

  function fillTeamForm(member) {
    if (!teamCanManage || currentStaffRole !== 'owner') return;
    if (byId('teamEmail')) { byId('teamEmail').value = member.email || ''; byId('teamEmail').disabled = true; }
    if (byId('teamFullName')) byId('teamFullName').value = member.fullName || '';
    if (byId('teamJobTitle')) byId('teamJobTitle').value = member.jobTitle || '';
    if (byId('teamAccessRole')) byId('teamAccessRole').value = member.role || 'employee';
    if (byId('teamAccessStatus')) byId('teamAccessStatus').value = member.active ? 'active' : 'suspended';
    if (byId('teamFormTitle')) byId('teamFormTitle').textContent = 'Update team access';
    setMessage('teamFormMessage', 'Editing this team member. Owner accounts remain protected.');
    byId('teamManagePanel')?.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function loadTeam(force = false) {
    if ((teamLoaded && !force) || teamLoading || !client) return;
    teamLoading = true;
    const refresh = byId('refreshTeam'); setStatus('teamStatus', 'Loading secure team access…');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try {
      const { data, error } = await client.rpc('get_rolexa_admin_team');
      if (error) throw error;
      renderTeam(data || {}); teamLoaded = true;
    } catch (error) {
      console.error('Rolexa People team access load failed', error);
      setStatus('teamStatus', error?.message || 'Could not load team access.', 'bad');
      if (byId('teamTableBody')) byId('teamTableBody').innerHTML = '<tr><td colspan="6" class="users-empty">The secure team directory is temporarily unavailable.</td></tr>';
    } finally { teamLoading = false; if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh team'; } }
  }

  async function saveTeamAccess(event) {
    event.preventDefault();
    if (!client || !teamCanManage || currentStaffRole !== 'owner') return;
    const button = byId('teamSaveAccess'); setMessage('teamFormMessage', 'Saving secure access…');
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const { error } = await client.rpc('manage_rolexa_staff_access', { target_email:byId('teamEmail')?.value.trim() || '', access_role:byId('teamAccessRole')?.value || 'employee', access_active:byId('teamAccessStatus')?.value !== 'suspended', staff_full_name:byId('teamFullName')?.value.trim() || null, staff_job_title:byId('teamJobTitle')?.value.trim() || null });
      if (error) throw error;
      setMessage('teamFormMessage', 'Team access saved successfully.', 'good'); teamLoaded = false; await loadTeam(true); window.setTimeout(clearTeamForm, 1200);
    } catch (error) { console.error('Rolexa People team access update failed', error); setMessage('teamFormMessage', error?.message || 'Could not update team access.', 'bad'); }
    finally { if (button) { button.disabled = false; button.textContent = 'Save access'; } }
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
    if (!people.some(person => person.user_id === selectedPeopleUserId)) selectedPeopleUserId = (people.find(person => person.is_self) || people[0] || {}).user_id || '';
    const departments = new Set(people.map(person => String(person.department || '').trim()).filter(Boolean));
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const starters = people.filter(person => { const date = person.start_date ? new Date(`${String(person.start_date).slice(0,10)}T12:00:00`) : null; return date && !Number.isNaN(date.getTime()) && date >= cutoff; }).length;
    setMetric('peopleTotal', summary.total); setMetric('peopleActive', summary.active); setMetric('peoplePreboarding', summary.preboarding); setMetric('peopleDocumentsMetric', summary.documents);
    setMetric('peopleOverviewTotal', summary.total); setMetric('peopleOverviewActive', summary.active); setMetric('peopleOverviewDepartments', departments.size); setMetric('peopleOverviewStarters', starters); setMetric('peopleOverviewPreboarding', summary.preboarding); setMetric('peopleOverviewDocuments', summary.documents);
    if (byId('peopleDirectoryScope')) byId('peopleDirectoryScope').textContent = canManage ? 'HR access' : 'Your record only';
    if (byId('peopleScopeBadge')) byId('peopleScopeBadge').textContent = canManage ? 'HR access' : 'Your record only';
    if (byId('peopleDirectoryTitle')) byId('peopleDirectoryTitle').textContent = canManage ? 'Rolexa people' : 'Your employee account';
    if (byId('peopleDirectoryDescription')) byId('peopleDirectoryDescription').textContent = canManage ? 'Select a team member to open their employment record.' : 'Only your own employment information is available.';
    const directory = byId('peopleDirectoryList');
    if (directory) {
      directory.innerHTML = people.length ? people.map(person => { const status = ['preboarding','active','leave','ended'].includes(person.employment_status) ? person.employment_status : 'preboarding'; const name = person.full_name || person.email || 'Rolexa team member'; return `<button class="people-directory-button ${person.user_id === selectedPeopleUserId ? 'active' : ''}" type="button" data-people-user="${escapeHtml(person.user_id)}"><span class="users-avatar">${escapeHtml(initials(name))}</span><span class="people-directory-copy"><b>${escapeHtml(name)}</b><small>${escapeHtml(person.job_title || person.email || 'Rolexa team member')}</small></span><span class="people-directory-state ${status}">${escapeHtml(humanize(status))}</span></button>`; }).join('') : '<div class="people-empty">No employee records are available.</div>';
      directory.querySelectorAll('[data-people-user]').forEach(button => button.addEventListener('click', () => { selectedPeopleUserId = button.dataset.peopleUser || ''; renderPeople(peopleData); document.querySelector('[data-people-target="peopleEmploymentRecords"]')?.click(); }));
    }
    const selectorOptions = people.map(person => `<option value="${escapeHtml(person.user_id)}">${escapeHtml(person.full_name || person.email || 'Rolexa team member')}</option>`).join('');
    ['employmentPersonSelect','documentsPersonSelect'].forEach(id => { const selector = byId(id); if (!selector) return; selector.innerHTML = selectorOptions || '<option value="">No employee records</option>'; selector.value = selectedPeopleUserId; });
    renderSelectedPerson(canManage);
    const generated = peopleData.generated_at ? new Date(peopleData.generated_at) : new Date();
    setStatus('peopleStatus', `${canManage ? number(summary.total) + ' visible people record' + (Number(summary.total) === 1 ? '' : 's') : 'Your private employment record'} · refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  function renderSelectedPerson(canManage) {
    const selected = findSelectedPerson();
    byId('peopleProfileForm')?.classList.toggle('hidden', !canManage || !selected);
    byId('peopleUploadForm')?.classList.toggle('hidden', !canManage || !selected);
    if (!selected) {
      if (byId('peopleSelectedName')) byId('peopleSelectedName').textContent = 'No employee selected';
      if (byId('peopleDocumentsBody')) byId('peopleDocumentsBody').innerHTML = '<tr><td colspan="5" class="people-empty">No accessible documents.</td></tr>';
      return;
    }
    const selectedName = selected.full_name || selected.email || 'Rolexa team member';
    if (byId('peopleSelectedAvatar')) byId('peopleSelectedAvatar').textContent = initials(selectedName);
    if (byId('peopleSelectedName')) byId('peopleSelectedName').textContent = selectedName;
    if (byId('peopleSelectedRole')) byId('peopleSelectedRole').textContent = [selected.job_title, selected.department, selected.email].filter(Boolean).join(' · ');
    if (byId('peopleSelectedStatus')) byId('peopleSelectedStatus').textContent = humanize(selected.employment_status || 'preboarding');
    if (byId('documentsPersonTitle')) byId('documentsPersonTitle').textContent = `${selectedName} · Documents`;
    const details = { peopleDetailNumber:selected.employee_number || 'Not set', peopleDetailDepartment:selected.department || 'Not set', peopleDetailType:humanize(selected.employment_type), peopleDetailStart:formatDate(selected.start_date), peopleDetailLocation:selected.work_location || 'Not set', peopleDetailAccess:`${humanize(selected.access_role)} · ${selected.access_active ? 'Active' : 'Suspended'}` };
    Object.entries(details).forEach(([id,value]) => { if (byId(id)) byId(id).textContent = value; });
    if (canManage) {
      const values = { peopleEmployeeNumber:selected.employee_number || '', peopleDepartment:selected.department || '', peopleEmploymentStatus:selected.employment_status || 'preboarding', peopleEmploymentType:selected.employment_type || 'full_time', peopleStartDate:selected.start_date || '', peopleEndDate:selected.end_date || '', peopleWorkLocation:selected.work_location || '' };
      Object.entries(values).forEach(([id,value]) => { if (byId(id)) byId(id).value = value; });
      const manager = byId('peopleManager');
      if (manager) { const people = Array.isArray(peopleData?.people) ? peopleData.people : []; manager.innerHTML = '<option value="">No manager selected</option>' + people.filter(person => person.user_id !== selected.user_id && person.access_active).map(person => `<option value="${escapeHtml(person.user_id)}">${escapeHtml(person.full_name || person.email || 'Rolexa team member')}</option>`).join(''); manager.value = selected.manager_user_id || ''; }
    }
    const documents = Array.isArray(selected.documents) ? selected.documents : [];
    const body = byId('peopleDocumentsBody');
    if (body) {
      body.innerHTML = documents.length ? documents.map(document => `<tr><td><span class="people-document-title">${escapeHtml(document.title || 'HR document')}</span><span class="people-document-type">${escapeHtml(humanize(document.document_type))}</span></td><td><span class="people-document-badge">${escapeHtml(humanize(document.status))}</span></td><td><span class="people-document-badge ${escapeHtml(document.visibility || '')}">${document.visibility === 'hr_only' ? 'HR & Owner' : 'Employee'}</span></td><td>${escapeHtml(formatDateTime(document.created_at, 'Unknown'))}</td><td><button class="people-download" type="button" data-people-document="${escapeHtml(document.id)}">Download</button></td></tr>`).join('') : '<tr><td colspan="5" class="people-empty">No accessible employment documents have been added.</td></tr>';
      body.querySelectorAll('[data-people-document]').forEach(button => button.addEventListener('click', () => downloadPeopleDocument(button.dataset.peopleDocument, button)));
    }
  }

  async function loadPeople(force = false) {
    if ((peopleLoaded && !force) || peopleLoading || !client) return;
    peopleLoading = true;
    const refresh = byId('refreshPeople'); setStatus('peopleStatus', 'Loading private employee records…');
    if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try { const { data, error } = await client.rpc('get_rolexa_people_hr'); if (error) throw error; renderPeople(data || {}); peopleLoaded = true; }
    catch (error) { console.error('Rolexa People employee records load failed', error); setStatus('peopleStatus', error?.message || 'Could not load employee records.', 'bad'); if (byId('peopleDirectoryList')) byId('peopleDirectoryList').innerHTML = '<div class="people-empty">The secure employee directory is temporarily unavailable.</div>'; }
    finally { peopleLoading = false; if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh'; } }
  }

  async function savePeopleProfile(event) {
    event.preventDefault(); const selected = findSelectedPerson();
    if (!client || !selected || !peopleData?.can_manage) return;
    const button = byId('peopleSaveProfile'); setMessage('peopleProfileMessage', 'Saving secure employment record…'); if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const { error } = await client.rpc('manage_rolexa_employee_profile', { target_user_id:selected.user_id, employee_number_value:byId('peopleEmployeeNumber')?.value.trim() || null, department_value:byId('peopleDepartment')?.value.trim() || null, manager_user_id_value:byId('peopleManager')?.value || null, employment_status_value:byId('peopleEmploymentStatus')?.value || 'preboarding', employment_type_value:byId('peopleEmploymentType')?.value || 'full_time', start_date_value:byId('peopleStartDate')?.value || null, end_date_value:byId('peopleEndDate')?.value || null, work_location_value:byId('peopleWorkLocation')?.value.trim() || null });
      if (error) throw error; setMessage('peopleProfileMessage', 'Employment record saved.', 'good'); peopleLoaded = false; orgChartLoaded = false; await Promise.all([loadPeople(true), loadOrgChart(true)]);
    } catch (error) { console.error('Rolexa People employment update failed', error); setMessage('peopleProfileMessage', error?.message || 'Could not save this employment record.', 'bad'); }
    finally { if (button) { button.disabled = false; button.textContent = 'Save employment record'; } }
  }

  async function uploadPeopleDocument(event) {
    event.preventDefault(); const selected = findSelectedPerson(); const file = byId('peopleDocumentFile')?.files?.[0];
    if (!client || !selected || !peopleData?.can_manage || !file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setMessage('peopleUploadMessage', 'Choose a PDF document.', 'bad'); return; }
    if (file.size > 10485760) { setMessage('peopleUploadMessage', 'The PDF must be 10 MB or smaller.', 'bad'); return; }
    const button = byId('peopleUploadDocument'); const uniqueId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; const objectPath = `${selected.user_id}/${uniqueId}.pdf`; let uploaded = false;
    setMessage('peopleUploadMessage', 'Encrypting and uploading to private storage…'); if (button) { button.disabled = true; button.textContent = 'Uploading…'; }
    try {
      const { error:uploadError } = await client.storage.from('rolexa-hr-documents').upload(objectPath, file, { contentType:'application/pdf', upsert:false }); if (uploadError) throw uploadError; uploaded = true;
      const { error } = await client.rpc('register_rolexa_hr_document', { target_user_id:selected.user_id, document_type_value:byId('peopleDocumentType')?.value || 'other', document_title:byId('peopleDocumentTitle')?.value.trim() || file.name.replace(/\.pdf$/i, ''), object_path:objectPath, visibility_value:byId('peopleDocumentVisibility')?.value || 'employee', status_value:byId('peopleDocumentStatus')?.value || 'issued', retention_until_value:byId('peopleRetentionUntil')?.value || null }); if (error) throw error;
      byId('peopleUploadForm')?.reset(); setMessage('peopleUploadMessage', 'Private document added successfully.', 'good'); peopleLoaded = false; await loadPeople(true);
    } catch (error) { if (uploaded) await client.storage.from('rolexa-hr-documents').remove([objectPath]); console.error('Rolexa People HR document upload failed', error); setMessage('peopleUploadMessage', error?.message || 'Could not upload this document.', 'bad'); }
    finally { if (button) { button.disabled = false; button.textContent = 'Upload secure document'; } }
  }

  async function downloadPeopleDocument(documentId, button) {
    if (!documentId || !client) return; const originalText = button?.textContent || 'Download'; if (button) { button.disabled = true; button.textContent = 'Preparing…'; }
    try { const { data:access, error:accessError } = await client.rpc('open_rolexa_hr_document', { target_document_id:documentId }); if (accessError) throw accessError; const { data, error } = await client.storage.from('rolexa-hr-documents').createSignedUrl(access.storage_path, 60, { download:access.title || true }); if (error || !data?.signedUrl) throw error || new Error('A secure download link could not be created.'); const link = document.createElement('a'); link.href = data.signedUrl; link.rel = 'noopener'; link.click(); }
    catch (error) { console.error('Rolexa People HR document download failed', error); setStatus('peopleStatus', error?.message || 'Could not download this private document.', 'bad'); }
    finally { if (button) { button.disabled = false; button.textContent = originalText; } }
  }

  function renderOrgChart(data) {
    orgChartData = data || {}; const people = (Array.isArray(orgChartData.people) ? orgChartData.people : []).filter(person => person?.user_id); const chart = byId('peopleOrgChart');
    if (byId('peopleOrgCount')) byId('peopleOrgCount').textContent = `${number(people.length)} team member${people.length === 1 ? '' : 's'}`;
    if (!chart) return;
    if (!people.length) { chart.innerHTML = '<div class="people-org-empty">No active Rolexa team members are available in the organisation chart yet.</div>'; setStatus('peopleOrgStatus', 'The secure organisation chart is ready for the first reporting line.', 'good'); return; }
    const peopleById = new Map(people.map(person => [String(person.user_id), person])); const childrenByManager = new Map();
    people.forEach(person => { const personId = String(person.user_id); const managerId = person.manager_user_id ? String(person.manager_user_id) : ''; if (!managerId || managerId === personId || !peopleById.has(managerId)) return; if (!childrenByManager.has(managerId)) childrenByManager.set(managerId, []); childrenByManager.get(managerId).push(person); });
    const sortPeople = rows => [...rows].sort((a,b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'en-GB'));
    const roots = sortPeople(people.filter(person => { const personId = String(person.user_id); const managerId = person.manager_user_id ? String(person.manager_user_id) : ''; return !managerId || managerId === personId || !peopleById.has(managerId); })); const visited = new Set();
    function renderNode(person, ancestry = new Set()) { const personId = String(person.user_id); if (ancestry.has(personId) || visited.has(personId)) return ''; visited.add(personId); const next = new Set(ancestry); next.add(personId); const name = person.full_name || 'Rolexa team member'; const role = person.job_title || 'Rolexa team member'; const tags = [person.department ? `<span class="people-org-tag">${escapeHtml(person.department)}</span>` : '', `<span class="people-org-tag">${escapeHtml(humanize(person.employment_status || 'preboarding'))}</span>`].filter(Boolean).join(''); const children = sortPeople(childrenByManager.get(personId) || []).map(child => renderNode(child, next)).filter(Boolean).join(''); return `<li><article class="people-org-person"><span class="users-avatar">${escapeHtml(initials(name))}</span><span class="people-org-copy"><b>${escapeHtml(name)}</b><small>${escapeHtml(role)}</small><span class="people-org-tags">${tags}</span></span></article>${children ? `<ul>${children}</ul>` : ''}</li>`; }
    const rendered = roots.map(person => renderNode(person)).filter(Boolean); sortPeople(people.filter(person => !visited.has(String(person.user_id)))).forEach(person => { const fallback = renderNode(person); if (fallback) rendered.push(fallback); }); chart.innerHTML = `<ul>${rendered.join('')}</ul>`;
    const generated = orgChartData.generated_at ? new Date(orgChartData.generated_at) : new Date(); setStatus('peopleOrgStatus', `Reporting lines refreshed ${generated.toLocaleString('en-GB')}.`, 'good');
  }

  async function loadOrgChart(force = false) {
    if ((orgChartLoaded && !force) || orgChartLoading || !client) return; orgChartLoading = true; const refresh = byId('refreshOrgChart'); setStatus('peopleOrgStatus', 'Loading the secure Rolexa organisation chart…'); if (refresh) { refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
    try { const { data, error } = await client.rpc('get_rolexa_org_chart'); if (error) throw error; renderOrgChart(data || {}); orgChartLoaded = true; }
    catch (error) { console.error('Rolexa People organisation chart load failed', error); setStatus('peopleOrgStatus', error?.message || 'Could not load the organisation chart.', 'bad'); if (byId('peopleOrgChart')) byId('peopleOrgChart').innerHTML = '<div class="people-org-empty">The reporting structure is temporarily unavailable.</div>'; }
    finally { orgChartLoading = false; if (refresh) { refresh.disabled = false; refresh.textContent = 'Refresh'; } }
  }

  function loadForSection(sectionId) {
    if (sectionId === 'peopleTeamAccess') loadTeam();
    if (sectionId === 'peopleOrganisationChart') loadOrgChart();
    if (['peopleOverview','peopleDirectory','peopleEmploymentRecords','peopleDocuments'].includes(sectionId)) loadPeople();
  }

  function receiveContext(detail) {
    client = detail?.client || window.RolexaPeopleContext?.client || client;
    currentStaffRole = detail?.staff?.role || window.RolexaPeopleContext?.staff?.role || currentStaffRole;
    const visible = document.querySelector('[data-people-section]:not(.hidden)');
    loadForSection(visible?.id || 'peopleOverview');
  }

  function wirePhase2() {
    byId('refreshTeam')?.addEventListener('click', () => { teamLoaded = false; loadTeam(true); });
    byId('refreshPeople')?.addEventListener('click', () => { peopleLoaded = false; loadPeople(true); });
    byId('refreshOrgChart')?.addEventListener('click', () => { orgChartLoaded = false; loadOrgChart(true); });
    byId('teamAccessForm')?.addEventListener('submit', saveTeamAccess); byId('teamCancelEdit')?.addEventListener('click', clearTeamForm);
    byId('peopleProfileForm')?.addEventListener('submit', savePeopleProfile); byId('peopleUploadForm')?.addEventListener('submit', uploadPeopleDocument);
    ['employmentPersonSelect','documentsPersonSelect'].forEach(id => byId(id)?.addEventListener('change', event => { selectedPeopleUserId = event.target.value || ''; renderPeople(peopleData || {}); }));
    document.addEventListener('rolexa:people-ready', event => receiveContext(event.detail));
    document.addEventListener('rolexa:people-section-opened', event => loadForSection(event.detail?.sectionId || ''));
    if (window.RolexaPeopleContext?.client && window.RolexaPeopleContext?.staff) receiveContext(window.RolexaPeopleContext);
  }

  installWorkspaceMarkup();
  wirePhase2();
})();
