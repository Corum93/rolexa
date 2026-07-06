(() => {
  if (window.__rolexaEmployerJobSync) return;
  window.__rolexaEmployerJobSync = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const SHORTLIST_KEY = 'rolexa_employer_shortlist_v1';

  let db = null;
  let currentUser = null;
  let employerJobs = [];
  let employerApplications = [];
  let applicationLoadError = '';
  let editingJobId = null;

  const sampleCandidates = [
    { id: 'c1', name: 'James Walker', role: 'Product Manager', location: 'London', style: 'Hybrid', skills: 'product, operations, customer experience, analytics', score: 88 },
    { id: 'c2', name: 'Maya Patel', role: 'Business Analyst', location: 'Birmingham', style: 'Hybrid', skills: 'reporting, requirements, stakeholder management', score: 81 },
    { id: 'c3', name: 'Daniel Kim', role: 'Data Analyst', location: 'Leeds', style: 'Remote', skills: 'sql, dashboards, commercial data, analysis', score: 76 }
  ];

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch])); }
  function getJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; } }
  function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function initial(text) { return (text || 'R').slice(0, 1).toUpperCase(); }
  function skillItems(text) { return String(text || '').split(',').map(s => s.trim()).filter(Boolean); }
  function shortUser(id) { return String(id || 'candidate').slice(0, 8); }

  function showStatus(kind, message) {
    const el = byId('statusBar');
    if (!el) return;
    el.className = 'statusbar show ' + kind;
    el.textContent = message;
    clearTimeout(window.__rolexaEmployerStatusTimer);
    window.__rolexaEmployerStatusTimer = setTimeout(() => { el.className = 'statusbar'; }, 4200);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function addExtraStyles() {
    if (byId('rolexaEmployerExtraStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaEmployerExtraStyles';
    style.textContent = `
      .rx-health-wrap{display:grid;grid-template-columns:.85fr 1.15fr;gap:16px;margin-top:16px;}
      .rx-health-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;}
      .rx-health-score{font-family:'Space Grotesk',Inter,sans-serif;font-size:44px;line-height:1;font-weight:800;letter-spacing:-.045em;color:#176BFF;}
      .rx-health-label{display:inline-flex;border-radius:999px;background:#E9EDFF;color:#2946C7;padding:6px 10px;font-size:12px;font-weight:900;white-space:nowrap;}
      .rx-health-role{font-size:13px;font-weight:900;color:#101F4A;margin-bottom:5px;}
      .rx-health-summary{font-size:13.5px;color:#6B7280;line-height:1.55;margin:0 0 14px;}
      .rx-health-list,.rx-suggestion-list{display:grid;gap:9px;margin:0;padding:0;list-style:none;}
      .rx-health-list li{border:1px solid rgba(7,16,37,.08);background:#F5F7FC;border-radius:13px;padding:10px 11px;font-size:13px;line-height:1.4;color:#26324C;}
      .rx-suggestion-list li{border:1px solid rgba(23,107,255,.12);background:#F8FAFF;border-radius:14px;padding:11px 12px;font-size:13px;line-height:1.45;color:#26324C;}
      .rx-suggestion-list li:before{content:'Rolexa';display:inline-flex;margin-right:8px;background:#176BFF;color:#fff;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;vertical-align:1px;}
      .rx-field-note{font-size:12.5px;color:#6B7280;line-height:1.45;margin-top:-2px;}
      .rx-skill-helper{grid-column:1/-1;border:1px solid rgba(23,107,255,.14);background:#F8FAFF;border-radius:14px;padding:12px 13px;font-size:13px;line-height:1.45;color:#26324C;}
      .rx-skill-helper b{color:#071025;}
      .rx-job-insight{grid-column:1/-1;border:1px solid rgba(23,107,255,.12);background:#F8FAFF;border-radius:13px;padding:10px 11px;font-size:12.8px;line-height:1.45;color:#26324C;margin-top:3px;}
      .rx-job-insight b{color:#071025;}
      .rx-warning-row{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;}
      .rx-warning-chip{display:inline-flex;align-items:center;border-radius:999px;background:#FFF3D6;color:#8A5600;padding:5px 8px;font-size:11.5px;font-weight:900;}
      .rx-warning-chip.good{background:#E1F6EB;color:#176B49;}
      .rx-job-card{align-items:flex-start;}
      .rx-job-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
      .rx-danger-btn{border:1px solid rgba(224,83,63,.22);background:#fff;color:#A33327;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;}
      .rx-candidate-card{grid-template-columns:52px minmax(0,1fr) auto;gap:16px;align-items:center;padding:16px;}
      .rx-candidate-main{min-width:0;display:grid;gap:7px;}
      .rx-candidate-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:15px;font-weight:900;color:#071025;}
      .rx-match-score{display:inline-flex;background:#E9EDFF;color:#2946C7;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:900;}
      .rx-candidate-meta,.rx-candidate-skills{font-size:13px;line-height:1.45;color:#6B7280;}
      .rx-candidate-skills b{color:#26324C;}
      .rx-candidate-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
      .rx-app-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
      .rx-app-stat{background:#fff;border:1px solid rgba(7,16,37,.1);border-radius:18px;padding:15px;}
      .rx-app-stat b{display:block;font-family:'Space Grotesk',Inter,sans-serif;font-size:26px;color:#176BFF;margin-bottom:4px;}
      .rx-app-stat span{font-size:12.5px;color:#6B7280;font-weight:800;}
      .rx-app-card{grid-template-columns:52px minmax(0,1fr) auto;gap:16px;align-items:flex-start;padding:16px;}
      .rx-app-main{display:grid;gap:7px;min-width:0;}
      .rx-app-title{font-size:15px;font-weight:900;color:#071025;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      .rx-app-meta{font-size:13px;color:#6B7280;line-height:1.45;}
      .rx-app-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
      .rx-app-note{grid-column:1/-1;border:1px solid rgba(23,107,255,.12);background:#F8FAFF;border-radius:13px;padding:10px 11px;font-size:12.8px;line-height:1.45;color:#26324C;}
      @media(max-width:900px){.rx-health-wrap{grid-template-columns:1fr}.rx-health-score{font-size:38px}.rx-candidate-card,.rx-app-card{grid-template-columns:48px 1fr}.rx-candidate-actions,.rx-app-actions{grid-column:2;justify-content:flex-start}.rx-job-actions{justify-content:flex-start}.rx-app-stats{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function enhanceSkillsForm() {
    const mustInput = byId('requiredSkills');
    const form = byId('jobForm');
    if (!mustInput || !form || byId('niceToHaveSkills')) return;
    addExtraStyles();
    const mustField = mustInput.closest('.field');
    if (!mustField) return;
    const mustLabel = mustField.querySelector('label');
    if (mustLabel) mustLabel.textContent = 'Must-have skills';
    mustInput.placeholder = 'Product discovery, stakeholder management, analytics';
    mustInput.setAttribute('aria-label', 'Must-have skills');
    const note = document.createElement('div');
    note.className = 'rx-field-note';
    note.textContent = 'Keep this focused. These are the skills a candidate really needs to do the role.';
    mustField.appendChild(note);
    const niceField = document.createElement('div');
    niceField.className = 'field';
    niceField.innerHTML = '<label for="niceToHaveSkills">Nice-to-have skills</label><input id="niceToHaveSkills" placeholder="SQL, SaaS, marketplace experience"><div class="rx-field-note">Optional extras. These should not block otherwise strong candidates.</div>';
    mustField.insertAdjacentElement('afterend', niceField);
    const helper = document.createElement('div');
    helper.className = 'rx-skill-helper';
    helper.innerHTML = '<b>Rolexa tip:</b> Use must-have skills for essentials only. Put bonus skills into nice-to-have so the role does not become too narrow.';
    niceField.insertAdjacentElement('afterend', helper);
  }

  function ensureApplicationsView() {
    addExtraStyles();
    const nav = document.querySelector('.side .nav');
    if (nav && !nav.querySelector('[data-view="applications"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.type = 'button';
      btn.dataset.view = 'applications';
      btn.textContent = 'Applications';
      const matches = nav.querySelector('[data-view="matches"]');
      nav.insertBefore(btn, matches || null);
    }
    if (byId('applicationsPage')) return;
    const jobsPage = byId('jobsPage');
    if (!jobsPage) return;
    jobsPage.insertAdjacentHTML('afterend', `
      <section class="page" id="applicationsPage">
        <div class="page-head"><div><h1>Applications</h1><p>Review candidates who have applied to jobs owned by this employer account.</p></div></div>
        <div class="rx-app-stats">
          <div class="rx-app-stat"><b id="appsTotalCount">0</b><span>Total applications</span></div>
          <div class="rx-app-stat"><b id="appsNewCount">0</b><span>New</span></div>
          <div class="rx-app-stat"><b id="appsShortlistedCount">0</b><span>Shortlisted</span></div>
          <div class="rx-app-stat"><b id="appsInterviewCount">0</b><span>Interviewing</span></div>
        </div>
        <div class="card"><div class="list" id="applicationsList"></div></div>
      </section>`);
  }

  function ensureRoleHealthPanel() {
    addExtraStyles();
    if (byId('roleHealthPanel')) return;
    const grid = document.querySelector('#overviewPage .grid');
    if (!grid) return;
    grid.insertAdjacentHTML('afterend', `
      <div class="rx-health-wrap" id="roleHealthPanel">
        <article class="card"><div class="rx-health-head"><div><h2>Role Health Score</h2><div class="rx-health-role" id="roleHealthRole">No role posted yet</div></div><span class="rx-health-label" id="roleHealthLabel">Waiting for role</span></div><div class="rx-health-score" id="roleHealthScore">--</div><p class="rx-health-summary" id="roleHealthSummary">Post your first role and Rolexa will score how attractive it is to candidates before it goes live.</p><ul class="rx-health-list" id="roleHealthStrengths"></ul></article>
        <article class="card"><h2>Rolexa Suggestions</h2><p class="rx-health-summary">Practical recommendations to improve candidate interest and match quality.</p><ul class="rx-suggestion-list" id="roleSuggestionsList"></ul></article>
      </div>`);
  }

  function showView(view) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const page = byId(view + 'Page');
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
  }

  function mapJob(row) {
    return { id: row.id, title: row.title || '', company: row.company || '', location: row.location || 'UK', style: row.work_style || 'Hybrid', salary: row.salary_range || '', skills: row.required_skills || '', description: row.description || '', status: row.is_active ? 'Live' : 'Closed', active: !!row.is_active };
  }

  async function loadJobs() {
    if (!db || !currentUser) return;
    const { data, error } = await db.from('jobs').select('*').eq('employer_user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) { console.warn('Employer job load error', error); employerJobs = []; showStatus('bad', 'Could not load employer jobs from Supabase.'); return; }
    employerJobs = (data || []).map(mapJob);
  }

  async function loadApplications() {
    employerApplications = [];
    applicationLoadError = '';
    if (!db || !currentUser || !employerJobs.length) return;
    const jobIds = employerJobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) return;

    const appRes = await db.from('candidate_applications').select('*').in('job_id', jobIds).order('applied_at', { ascending: false });
    if (appRes.error) {
      console.warn('Employer applications load error', appRes.error);
      applicationLoadError = appRes.error.message || 'Could not load applications from Supabase.';
      return;
    }

    const apps = appRes.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const profileRes = await db.from('candidate_profiles').select('user_id, full_name, email, target_role, location, work_style, skills, current_level, cv_file_name, has_cv').in('user_id', userIds);
      if (!profileRes.error) profiles = profileRes.data || [];
      else console.warn('Employer candidate profile load warning', profileRes.error);
    }
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
    employerApplications = apps.map(app => {
      const job = employerJobs.find(item => item.id === app.job_id) || {};
      const profile = profileMap.get(app.user_id) || {};
      return { app, job, profile };
    });
  }

  async function refreshEmployerData() {
    await loadJobs();
    await loadApplications();
    renderAll();
  }

  function roleHealth(job) {
    if (!job) return { score: null, label: 'Waiting for role', summary: 'Post your first role and Rolexa will score how attractive it is to candidates before it goes live.', strengths: ['No live employer role has been posted from this account yet.'], suggestions: ['Post a role with salary, location, work style, must-have skills, nice-to-have skills and a clear description.', 'Use must-have skills for essentials only so the role does not become too narrow.', 'Put bonus experience into nice-to-have so good candidates are not filtered out too early.'] };
    let score = 0;
    const strengths = [];
    const suggestions = [];
    const title = (job.title || '').trim();
    const company = (job.company || '').trim();
    const location = (job.location || '').trim();
    const style = (job.style || '').trim();
    const salary = (job.salary || '').trim();
    const mustSkills = skillItems(job.skills || '');
    const description = (job.description || '').trim();
    const hasNice = /nice-to-have skills:/i.test(description);
    const seniorityText = `${title} ${description}`.toLowerCase();
    if (title.length >= 4) { score += 10; strengths.push('The role title is clear enough to start matching candidates.'); } else suggestions.push('Add a clearer job title so candidates immediately understand the role.');
    if (company.length >= 2) { score += 5; strengths.push('The company name is visible on the role.'); }
    if (location.length >= 2) { score += 10; strengths.push('Location is included, which helps candidates judge fit quickly.'); } else suggestions.push('Add a location or mark the role as remote so candidates know where it sits.');
    if (style) { score += 10; strengths.push(`${style} work style is included.`); }
    if (/hybrid|remote|flexible/i.test(style)) strengths.push('Flexible work style can help improve candidate interest.');
    if (/on-site/i.test(style)) suggestions.push('If possible, explain why the role is on-site or whether any flexibility exists.');
    if (/\d/.test(salary) && /£|k|to|-|–/i.test(salary)) { score += 20; strengths.push('Salary range is visible, which improves candidate trust.'); } else if (salary) { score += 10; suggestions.push('Make the salary clearer, for example “£45k to £55k”.'); } else suggestions.push('Add a salary range. Visible salary is one of the strongest trust signals for candidates.');
    if (mustSkills.length >= 3 && mustSkills.length <= 5) { score += 20; strengths.push('Must-have skills are focused and useful for matching.'); } else if (mustSkills.length > 5) { score += 12; suggestions.push('The must-have skills list may be too broad. Move bonus requirements into nice-to-have.'); } else if (mustSkills.length > 0) { score += 10; suggestions.push('Add a few more must-have skills so Rolexa can match candidates more accurately.'); } else suggestions.push('Add 3 to 5 must-have skills to improve match quality.');
    if (hasNice) { score += 5; strengths.push('Nice-to-have skills are separated, which keeps the role more candidate-friendly.'); } else suggestions.push('Add nice-to-have skills so bonus experience is captured without narrowing the pool too much.');
    if (description.length >= 180) { score += 15; strengths.push('The description gives candidates enough context to understand the role.'); } else if (description.length >= 80) { score += 8; suggestions.push('Add more detail on day-to-day responsibilities and success measures.'); } else suggestions.push('Write a fuller job description with responsibilities, expectations and what success looks like.');
    if (/senior|junior|lead|manager|director|entry|associate|head|mid-level|mid level/i.test(seniorityText)) { score += 5; strengths.push('Seniority expectations are visible.'); } else suggestions.push('Mention seniority level so candidates know whether the role fits their experience.');
    score = Math.max(0, Math.min(100, score));
    let label = 'Needs work';
    let summary = 'This role needs more detail before it is likely to perform well with candidates.';
    if (score >= 85) { label = 'Strong role'; summary = 'This role looks attractive and gives Rolexa useful matching signals.'; }
    else if (score >= 70) { label = 'Good role'; summary = 'This role has a strong base, but a few improvements could increase candidate interest.'; }
    else if (score >= 50) { label = 'Can improve'; summary = 'This role has some useful information, but it needs more clarity to stand out.'; }
    if (!suggestions.length) suggestions.push('This role looks strong. Next, add screening questions and employer response targets.');
    if (!strengths.length) strengths.push('Rolexa has enough information to begin reviewing this role.');
    return { score, label, summary, strengths: strengths.slice(0, 4), suggestions: suggestions.slice(0, 5) };
  }

  function jobRiskWarnings(job) {
    const warnings = [];
    const mustSkills = skillItems(job.skills || '');
    const description = (job.description || '').trim();
    const titleText = `${job.title || ''} ${description}`.toLowerCase();
    if (!job.active) warnings.push('Closed role');
    if (!/\d/.test(job.salary || '')) warnings.push('Salary missing');
    if (mustSkills.length > 5) warnings.push('Too many must-have skills');
    if (!/nice-to-have skills:/i.test(description)) warnings.push('No nice-to-have skills');
    if (description.length < 120) warnings.push('Description short');
    if (!/senior|junior|lead|manager|director|entry|associate|head|mid-level|mid level/i.test(titleText)) warnings.push('Seniority unclear');
    if (/on-site/i.test(job.style || '')) warnings.push('On-site reach risk');
    if (!warnings.length) warnings.push('Role looks healthy');
    return warnings.slice(0, 4);
  }

  function nextBestAction(job) {
    const mustSkills = skillItems(job.skills || '');
    const description = (job.description || '').trim();
    const titleText = `${job.title || ''} ${description}`.toLowerCase();
    if (!job.active) return 'This role is closed. Reopen it if hiring starts again.';
    if (!/\d/.test(job.salary || '')) return 'Add a clear salary range to increase trust and candidate interest.';
    if (mustSkills.length > 5) return 'Move bonus requirements from must-have into nice-to-have to widen the pool.';
    if (!/nice-to-have skills:/i.test(description)) return 'Add nice-to-have skills so bonus experience is captured without making the role too strict.';
    if (description.length < 120) return 'Strengthen the description with day-to-day responsibilities and success measures.';
    if (!/senior|junior|lead|manager|director|entry|associate|head|mid-level|mid level/i.test(titleText)) return 'Add seniority level so candidates know whether the role fits their experience.';
    if (/on-site/i.test(job.style || '')) return 'Explain why the role is on-site and whether any flexibility is available.';
    return 'Review applications and move strong candidates to shortlist or interview.';
  }

  function renderRoleHealth() {
    ensureRoleHealthPanel();
    const activeJobs = employerJobs.filter(job => job.active);
    const job = activeJobs[0] || employerJobs[0];
    const health = roleHealth(job);
    if (byId('roleHealthRole')) byId('roleHealthRole').textContent = job ? `${job.title || 'Untitled role'} at ${job.company || 'Company'}` : 'No role posted yet';
    if (byId('roleHealthScore')) byId('roleHealthScore').textContent = health.score === null ? '--' : `${health.score}/100`;
    if (byId('roleHealthLabel')) byId('roleHealthLabel').textContent = health.label;
    if (byId('roleHealthSummary')) byId('roleHealthSummary').textContent = health.summary;
    if (byId('roleHealthStrengths')) byId('roleHealthStrengths').innerHTML = health.strengths.map(item => `<li><b>Working:</b> ${esc(item)}</li>`).join('');
    if (byId('roleSuggestionsList')) byId('roleSuggestionsList').innerHTML = health.suggestions.map(item => `<li>${esc(item)}</li>`).join('');
  }

  function jobCard(job) {
    const health = roleHealth(job);
    const warnings = jobRiskWarnings(job);
    const warningHtml = warnings.map(w => `<span class="rx-warning-chip ${w === 'Role looks healthy' ? 'good' : ''}">${esc(w)}</span>`).join('');
    const healthText = health.score === null ? '' : `<span class="tag blue">Health ${health.score}</span>`;
    const closeText = job.active ? 'Close role' : 'Reopen role';
    return `<div class="item rx-job-card"><div class="logo blue">${esc(initial(job.company))}</div><div><div class="item-title">${esc(job.title)}</div><div class="item-sub">${esc(job.company)}, ${esc(job.location)}, ${esc(job.style)}, ${esc(job.salary || 'Salary not set')}</div><div class="item-sub">Must-have skills: ${esc(job.skills || 'Not set')}</div></div><div class="rx-job-actions"><span class="tag blue">${esc(job.status)}</span>${healthText}<button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShowView('applications')">Applications</button><button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShowView('matches')">View matches</button><button class="small-btn" type="button" onclick="window.rolexaEmployerEditJob('${esc(job.id)}')">Edit</button><button class="small-btn" type="button" onclick="window.rolexaEmployerToggleJob('${esc(job.id)}')">${closeText}</button><button class="rx-danger-btn" type="button" onclick="window.rolexaEmployerDeleteJob('${esc(job.id)}')">Delete</button></div><div class="rx-job-insight"><b>Next best action:</b> ${esc(nextBestAction(job))}</div><div class="rx-warning-row">${warningHtml}</div></div>`;
  }

  function candidateCard(candidate) {
    const shortlisted = getJSON(SHORTLIST_KEY, []).includes(candidate.id);
    const initials = candidate.name.split(' ').map(part => part[0]).join('').slice(0, 2);
    return `<div class="item rx-candidate-card"><div class="logo green">${esc(initials)}</div><div class="rx-candidate-main"><div class="rx-candidate-head"><span>${esc(candidate.name)}</span><span class="rx-match-score">${candidate.score}% match</span><span class="tag blue">Demo match</span></div><div class="rx-candidate-meta">${esc(candidate.role)} · ${esc(candidate.location)} · ${esc(candidate.style)}</div><div class="rx-candidate-skills"><b>Skills:</b> ${esc(candidate.skills)}</div></div><div class="rx-candidate-actions"><span class="tag">Smart match</span><button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShortlist('${esc(candidate.id)}')">${shortlisted ? 'Shortlisted' : 'Shortlist'}</button></div></div>`;
  }

  function appStatusClass(status) {
    if (status === 'Shortlisted' || status === 'Hired') return 'tag';
    if (status === 'Interviewing') return 'tag warn';
    if (status === 'Rejected') return 'tag bad';
    return 'tag blue';
  }

  function applicationCard(row) {
    const app = row.app || {};
    const job = row.job || {};
    const profile = row.profile || {};
    const candidateName = profile.full_name || profile.email || `Candidate ${shortUser(app.user_id)}`;
    const role = profile.target_role || profile.current_level || 'Candidate profile';
    const location = profile.location || 'Location not set';
    const workStyle = profile.work_style || 'Work style not set';
    const skills = profile.skills || 'Skills not available yet';
    const applied = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : 'date not available';
    const cv = profile.has_cv || profile.cv_file_name ? 'CV uploaded' : 'No CV uploaded yet';
    const initials = candidateName.split(' ').map(part => part[0]).join('').slice(0, 2) || 'C';
    return `<div class="item rx-app-card"><div class="logo green">${esc(initials)}</div><div class="rx-app-main"><div class="rx-app-title">${esc(candidateName)} <span class="${appStatusClass(app.status)}">${esc(app.status || 'Applied')}</span></div><div class="rx-app-meta">Applied for <b>${esc(job.title || app.job_id)}</b> · ${esc(job.company || 'Rolexa')} · ${esc(applied)}</div><div class="rx-app-meta">${esc(role)} · ${esc(location)} · ${esc(workStyle)}</div><div class="rx-app-meta"><b>Skills:</b> ${esc(skills)}</div><div class="rx-app-meta"><b>Candidate file:</b> ${esc(cv)}</div></div><div class="rx-app-actions"><button class="small-btn" type="button" onclick="window.rolexaEmployerUpdateApplication('${esc(app.user_id)}','${esc(app.job_id)}','Reviewed')">Review</button><button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerUpdateApplication('${esc(app.user_id)}','${esc(app.job_id)}','Shortlisted')">Shortlist</button><button class="small-btn" type="button" onclick="window.rolexaEmployerUpdateApplication('${esc(app.user_id)}','${esc(app.job_id)}','Interviewing')">Interview</button><button class="small-btn" type="button" onclick="window.rolexaEmployerUpdateApplication('${esc(app.user_id)}','${esc(app.job_id)}','Hired')">Hired</button><button class="rx-danger-btn" type="button" onclick="window.rolexaEmployerUpdateApplication('${esc(app.user_id)}','${esc(app.job_id)}','Rejected')">Reject</button></div><div class="rx-app-note"><b>Employer note:</b> Updating this status should also update what the candidate sees in their application tracker.</div></div>`;
  }

  function renderApplications() {
    ensureApplicationsView();
    const total = employerApplications.length;
    const newCount = employerApplications.filter(row => !row.app.status || row.app.status === 'Applied').length;
    const shortlisted = employerApplications.filter(row => row.app.status === 'Shortlisted').length;
    const interviewing = employerApplications.filter(row => row.app.status === 'Interviewing').length;
    if (byId('appsTotalCount')) byId('appsTotalCount').textContent = total;
    if (byId('appsNewCount')) byId('appsNewCount').textContent = newCount;
    if (byId('appsShortlistedCount')) byId('appsShortlistedCount').textContent = shortlisted;
    if (byId('appsInterviewCount')) byId('appsInterviewCount').textContent = interviewing;
    const list = byId('applicationsList');
    if (!list) return;
    if (applicationLoadError) {
      list.innerHTML = `<div class="empty">Rolexa could not load employer applications yet. Supabase may need an employer read policy for candidate_applications.<br><br>${esc(applicationLoadError)}</div>`;
      return;
    }
    if (!employerJobs.length) {
      list.innerHTML = '<div class="empty">Post a job first. Applications will appear here once candidates apply.</div>';
      return;
    }
    if (!employerApplications.length) {
      list.innerHTML = '<div class="empty">No applications yet. Once candidates apply to your active jobs, they will appear here.</div>';
      return;
    }
    list.innerHTML = employerApplications.map(applicationCard).join('');
  }

  function renderAll() {
    const shortlisted = getJSON(SHORTLIST_KEY, []);
    const activeJobs = employerJobs.filter(job => job.active);
    if (byId('openRolesCount')) byId('openRolesCount').textContent = activeJobs.length;
    if (byId('matchCount')) byId('matchCount').textContent = activeJobs.length ? sampleCandidates.length : 0;
    if (byId('shortlistCount')) byId('shortlistCount').textContent = shortlisted.length;
    const emptyJobs = '<div class="empty">No employer jobs in Supabase yet. Post your first role.</div>';
    const emptyMatches = '<div class="empty">Post a job first, then candidate matches will appear here.</div>';
    if (byId('overviewJobs')) byId('overviewJobs').innerHTML = employerJobs.length ? employerJobs.slice(0, 3).map(jobCard).join('') : emptyJobs;
    if (byId('jobsList')) byId('jobsList').innerHTML = employerJobs.length ? employerJobs.map(jobCard).join('') : emptyJobs;
    if (byId('overviewMatches')) byId('overviewMatches').innerHTML = activeJobs.length ? sampleCandidates.slice(0, 3).map(candidateCard).join('') : emptyMatches;
    if (byId('matchesList')) byId('matchesList').innerHTML = activeJobs.length ? sampleCandidates.map(candidateCard).join('') : emptyMatches;
    renderApplications();
    renderRoleHealth();
  }

  function niceFromDescription(description) {
    const match = String(description || '').match(/nice-to-have skills:\s*([^\n]+)/i);
    return match ? match[1].trim() : '';
  }

  function cleanDescription(description) {
    return String(description || '').replace(/\n\nMust-have skills:[\s\S]*$/i, '').replace(/\n\nNice-to-have skills:[\s\S]*$/i, '').trim();
  }

  function descriptionWithSkills(description, must, nice) {
    const parts = [];
    const clean = (description || '').trim();
    if (clean) parts.push(clean);
    if (must && !/must-have skills:/i.test(clean)) parts.push(`Must-have skills: ${must}`);
    if (nice && !/nice-to-have skills:/i.test(clean)) parts.push(`Nice-to-have skills: ${nice}`);
    return parts.join('\n\n').trim();
  }

  async function saveJob(event) {
    event.preventDefault();
    if (!db || !currentUser) { showStatus('bad', 'You need to be logged in to post a job.'); return; }
    const wasEditing = !!editingJobId;
    const button = byId('saveJobBtn');
    if (button) { button.disabled = true; button.textContent = wasEditing ? 'Saving...' : 'Publishing...'; }
    const title = byId('jobTitle').value.trim();
    const company = byId('company').value.trim();
    const location = byId('jobLocation').value.trim() || 'UK';
    const style = byId('jobStyle').value;
    const salary = byId('salaryRange').value.trim();
    const must = byId('requiredSkills').value.trim();
    const nice = byId('niceToHaveSkills') ? byId('niceToHaveSkills').value.trim() : '';
    const description = byId('jobDescription').value.trim();
    const payload = { employer_user_id: currentUser.id, title, company, location, work_style: style, salary_range: salary, required_skills: must, description: descriptionWithSkills(description, must, nice), logo: initial(company), logo_class: 'blue', tag: 'Employer posted', is_active: true, updated_at: new Date().toISOString() };
    let error;
    if (editingJobId) {
      const result = await db.from('jobs').update(payload).eq('id', editingJobId).eq('employer_user_id', currentUser.id);
      error = result.error;
    } else {
      payload.id = 'emp-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
      const result = await db.from('jobs').insert(payload);
      error = result.error;
    }
    if (button) { button.disabled = false; button.textContent = 'Publish job to Supabase'; }
    if (error) { console.warn('Employer job save error', error); showStatus('bad', error.message || 'Could not save job to Supabase.'); return; }
    editingJobId = null;
    event.target.reset();
    await refreshEmployerData();
    showView('jobs');
    showStatus('good', wasEditing ? 'Job updated.' : 'Job saved.');
  }

  async function protect() {
    let supabaseLib;
    try { supabaseLib = await loadSupabase(); } catch (error) { console.warn(error); showStatus('bad', 'Could not load Supabase.'); return; }
    db = supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await db.auth.getSession();
    const session = data && data.session;
    if (!session || !session.user) { location.replace('employer-login.html?next=employer-dashboard.html'); return; }
    currentUser = session.user;
    const email = currentUser.email || 'Employer';
    if (byId('topName')) byId('topName').textContent = email;
    if (byId('topAvatar')) byId('topAvatar').textContent = email.slice(0, 1).toUpperCase();
    showStatus('info', 'Loading employer dashboard from Supabase...');
    await refreshEmployerData();
    showStatus('good', 'Employer dashboard connected to Supabase.');
  }

  window.rolexaEmployerShowView = showView;
  window.rolexaEmployerEditJob = function(id) {
    const job = employerJobs.find(item => item.id === id);
    if (!job) { showStatus('bad', 'Could not find that job.'); return; }
    editingJobId = id;
    byId('jobTitle').value = job.title || '';
    byId('company').value = job.company || '';
    byId('jobLocation').value = job.location || '';
    byId('jobStyle').value = job.style || 'Hybrid';
    byId('salaryRange').value = job.salary || '';
    byId('requiredSkills').value = job.skills || '';
    if (byId('niceToHaveSkills')) byId('niceToHaveSkills').value = niceFromDescription(job.description);
    byId('jobDescription').value = cleanDescription(job.description);
    if (byId('saveJobBtn')) byId('saveJobBtn').textContent = 'Save job changes';
    showView('postJob');
    showStatus('info', 'Editing existing job. Save changes when ready.');
  };

  window.rolexaEmployerToggleJob = async function(id) {
    const job = employerJobs.find(item => item.id === id);
    if (!job || !db || !currentUser) return;
    const nextActive = !job.active;
    const { error } = await db.from('jobs').update({ is_active: nextActive, updated_at: new Date().toISOString() }).eq('id', id).eq('employer_user_id', currentUser.id);
    if (error) { showStatus('bad', error.message || 'Could not update role.'); return; }
    await refreshEmployerData();
    showStatus('good', nextActive ? 'Role reopened.' : 'Role closed. Candidates will no longer see it as active.');
  };

  window.rolexaEmployerDeleteJob = async function(id) {
    if (!db || !currentUser) return;
    if (!confirm('Delete this role? If Supabase blocks deletion, Rolexa will close the role instead.')) return;
    const result = await db.from('jobs').delete().eq('id', id).eq('employer_user_id', currentUser.id);
    if (result.error) {
      const fallback = await db.from('jobs').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).eq('employer_user_id', currentUser.id);
      if (fallback.error) { showStatus('bad', fallback.error.message || 'Could not delete or close role.'); return; }
      await refreshEmployerData();
      showStatus('good', 'Supabase blocked delete, so the role was closed instead.');
      return;
    }
    await refreshEmployerData();
    showStatus('good', 'Role deleted.');
  };

  window.rolexaEmployerUpdateApplication = async function(userId, jobId, status) {
    if (!db || !currentUser || !userId || !jobId) return;
    const { error } = await db.from('candidate_applications').update({ status, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('job_id', jobId);
    if (error) { showStatus('bad', error.message || 'Could not update application status.'); return; }
    await loadApplications();
    renderAll();
    showStatus('good', `Application moved to ${status}.`);
  };

  window.rolexaEmployerShortlist = function(id) {
    const items = getJSON(SHORTLIST_KEY, []);
    if (!items.includes(id)) items.push(id);
    setJSON(SHORTLIST_KEY, items);
    renderAll();
    showStatus('good', 'Candidate shortlisted in this prototype.');
  };
  window.rolexaEmployerSignOut = async function() { if (db) await db.auth.signOut(); location.href = 'employer-login.html'; };

  document.addEventListener('DOMContentLoaded', () => {
    enhanceSkillsForm();
    ensureApplicationsView();
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    const form = byId('jobForm');
    if (form) form.addEventListener('submit', saveJob);
    ensureRoleHealthPanel();
    protect();
  });
})();
