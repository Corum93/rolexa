(() => {
  if (window.__rolexaEmployerJobSync) return;
  window.__rolexaEmployerJobSync = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const SHORTLIST_KEY = 'rolexa_employer_shortlist_v1';

  let db = null;
  let currentUser = null;
  let employerJobs = [];

  const sampleCandidates = [
    { id: 'c1', name: 'Candidate A', role: 'Product Manager', location: 'London', style: 'Hybrid', skills: 'product, operations, customer experience, analytics', score: 88 },
    { id: 'c2', name: 'Candidate B', role: 'Business Analyst', location: 'Birmingham', style: 'Hybrid', skills: 'reporting, requirements, stakeholder management', score: 81 },
    { id: 'c3', name: 'Candidate C', role: 'Data Analyst', location: 'Leeds', style: 'Remote', skills: 'sql, dashboards, commercial data, analysis', score: 76 }
  ];

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch])); }
  function getJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; } }
  function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function initial(text) { return (text || 'R').slice(0, 1).toUpperCase(); }
  function skillItems(text) { return String(text || '').split(',').map(s => s.trim()).filter(Boolean); }

  function showStatus(kind, message) {
    const el = byId('statusBar');
    if (!el) return;
    el.className = 'statusbar show ' + kind;
    el.textContent = message;
    clearTimeout(window.__rolexaEmployerStatusTimer);
    window.__rolexaEmployerStatusTimer = setTimeout(() => { el.className = 'statusbar'; }, 3600);
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
      @media(max-width:900px){.rx-health-wrap{grid-template-columns:1fr}.rx-health-score{font-size:38px;}}
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
    return { id: row.id, title: row.title || '', company: row.company || '', location: row.location || 'UK', style: row.work_style || 'Hybrid', salary: row.salary_range || '', skills: row.required_skills || '', description: row.description || '', status: row.is_active ? 'Live' : 'Draft' };
  }

  async function loadJobs() {
    if (!db || !currentUser) return;
    const { data, error } = await db.from('jobs').select('*').eq('employer_user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) { console.warn('Employer job load error', error); employerJobs = []; showStatus('bad', 'Could not load employer jobs from Supabase.'); return; }
    employerJobs = (data || []).map(mapJob);
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
    if (!/\d/.test(job.salary || '')) return 'Add a clear salary range to increase trust and candidate interest.';
    if (mustSkills.length > 5) return 'Move bonus requirements from must-have into nice-to-have to widen the pool.';
    if (!/nice-to-have skills:/i.test(description)) return 'Add nice-to-have skills so bonus experience is captured without making the role too strict.';
    if (description.length < 120) return 'Strengthen the description with day-to-day responsibilities and success measures.';
    if (!/senior|junior|lead|manager|director|entry|associate|head|mid-level|mid level/i.test(titleText)) return 'Add seniority level so candidates know whether the role fits their experience.';
    if (/on-site/i.test(job.style || '')) return 'Explain why the role is on-site and whether any flexibility is available.';
    return 'Review matched candidates and shortlist the strongest profiles.';
  }

  function renderRoleHealth() {
    ensureRoleHealthPanel();
    const job = employerJobs[0];
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
    return `<div class="item"><div class="logo blue">${esc(initial(job.company))}</div><div><div class="item-title">${esc(job.title)}</div><div class="item-sub">${esc(job.company)}, ${esc(job.location)}, ${esc(job.style)}, ${esc(job.salary)}</div><div class="item-sub">Must-have skills: ${esc(job.skills || 'Not set')}</div></div><div class="actions"><span class="tag blue">${esc(job.status)}</span>${healthText}<button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShowView('matches')">View matches</button></div><div class="rx-job-insight"><b>Next best action:</b> ${esc(nextBestAction(job))}</div><div class="rx-warning-row">${warningHtml}</div></div>`;
  }

  function candidateCard(candidate) {
    const shortlisted = getJSON(SHORTLIST_KEY, []).includes(candidate.id);
    const initials = candidate.name.split(' ').map(part => part[0]).join('').slice(0, 2);
    return `<div class="item"><div class="logo green">${esc(initials)}</div><div><div class="item-title">${esc(candidate.name)} <span class="tag blue">${candidate.score}% match</span></div><div class="item-sub">${esc(candidate.role)}, ${esc(candidate.location)}, ${esc(candidate.style)}</div><div class="item-sub">Skills: ${esc(candidate.skills)}</div></div><div class="actions"><span class="tag">Smart match</span><button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShortlist('${esc(candidate.id)}')">${shortlisted ? 'Shortlisted' : 'Shortlist'}</button></div></div>`;
  }

  function renderAll() {
    const shortlisted = getJSON(SHORTLIST_KEY, []);
    if (byId('openRolesCount')) byId('openRolesCount').textContent = employerJobs.length;
    if (byId('matchCount')) byId('matchCount').textContent = employerJobs.length ? sampleCandidates.length : 0;
    if (byId('shortlistCount')) byId('shortlistCount').textContent = shortlisted.length;
    const emptyJobs = '<div class="empty">No employer jobs in Supabase yet. Post your first role.</div>';
    const emptyMatches = '<div class="empty">Post a job first, then candidate matches will appear here.</div>';
    if (byId('overviewJobs')) byId('overviewJobs').innerHTML = employerJobs.length ? employerJobs.slice(0, 3).map(jobCard).join('') : emptyJobs;
    if (byId('jobsList')) byId('jobsList').innerHTML = employerJobs.length ? employerJobs.map(jobCard).join('') : emptyJobs;
    if (byId('overviewMatches')) byId('overviewMatches').innerHTML = employerJobs.length ? sampleCandidates.slice(0, 3).map(candidateCard).join('') : emptyMatches;
    if (byId('matchesList')) byId('matchesList').innerHTML = employerJobs.length ? sampleCandidates.map(candidateCard).join('') : emptyMatches;
    renderRoleHealth();
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
    const button = byId('saveJobBtn');
    if (button) { button.disabled = true; button.textContent = 'Publishing...'; }
    const title = byId('jobTitle').value.trim();
    const company = byId('company').value.trim();
    const location = byId('jobLocation').value.trim() || 'UK';
    const style = byId('jobStyle').value;
    const salary = byId('salaryRange').value.trim();
    const must = byId('requiredSkills').value.trim();
    const nice = byId('niceToHaveSkills') ? byId('niceToHaveSkills').value.trim() : '';
    const description = byId('jobDescription').value.trim();
    const payload = { id: 'emp-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8), employer_user_id: currentUser.id, title, company, location, work_style: style, salary_range: salary, required_skills: must, description: descriptionWithSkills(description, must, nice), logo: initial(company), logo_class: 'blue', tag: 'Employer posted', is_active: true, updated_at: new Date().toISOString() };
    const { error } = await db.from('jobs').insert(payload);
    if (button) { button.disabled = false; button.textContent = 'Publish job to Supabase'; }
    if (error) { console.warn('Employer job save error', error); showStatus('bad', error.message || 'Could not publish job to Supabase.'); return; }
    event.target.reset();
    await loadJobs();
    renderAll();
    showView('jobs');
    showStatus('good', 'Job published to Supabase. Next best action has been updated.');
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
    showStatus('info', 'Loading employer jobs from Supabase...');
    await loadJobs();
    renderAll();
    showStatus('good', 'Employer dashboard connected to Supabase.');
  }

  window.rolexaEmployerShowView = showView;
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
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    const form = byId('jobForm');
    if (form) form.addEventListener('submit', saveJob);
    ensureRoleHealthPanel();
    protect();
  });
})();
