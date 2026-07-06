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
    { id: 'c1', name: 'James Walker', role: 'Product Manager', location: 'London', style: 'Hybrid', skills: 'product, operations, customer experience, analytics', score: 88 },
    { id: 'c2', name: 'Maya Patel', role: 'Business Analyst', location: 'Birmingham', style: 'Hybrid', skills: 'reporting, requirements, stakeholder management', score: 81 },
    { id: 'c3', name: 'Daniel Kim', role: 'Data Analyst', location: 'Leeds', style: 'Remote', skills: 'sql, dashboards, commercial data, analysis', score: 76 }
  ];

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch])); }
  function getJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; } }
  function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function initial(text) { return (text || 'R').slice(0, 1).toUpperCase(); }

  function showStatus(kind, message) {
    const el = byId('statusBar');
    if (!el) return;
    el.className = 'statusbar show ' + kind;
    el.textContent = message;
    clearTimeout(window.__rolexaEmployerStatusTimer);
    window.__rolexaEmployerStatusTimer = setTimeout(() => { el.className = 'statusbar'; }, 3600);
  }

  function addRoleHealthStyles() {
    if (byId('rolexaRoleHealthStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaRoleHealthStyles';
    style.textContent = `
      .rx-health-wrap{display:grid;grid-template-columns:.85fr 1.15fr;gap:16px;margin-top:16px;}
      .rx-health-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;}
      .rx-health-score{font-family:'Space Grotesk',Inter,sans-serif;font-size:44px;line-height:1;font-weight:800;letter-spacing:-.045em;color:#176BFF;}
      .rx-health-label{display:inline-flex;border-radius:999px;background:#E9EDFF;color:#2946C7;padding:6px 10px;font-size:12px;font-weight:900;white-space:nowrap;}
      .rx-health-role{font-size:13px;font-weight:900;color:#101F4A;margin-bottom:5px;}
      .rx-health-summary{font-size:13.5px;color:#6B7280;line-height:1.55;margin:0 0 14px;}
      .rx-health-list{display:grid;gap:8px;margin:0;padding:0;list-style:none;}
      .rx-health-list li{border:1px solid rgba(7,16,37,.08);background:#F5F7FC;border-radius:13px;padding:10px 11px;font-size:13px;line-height:1.4;color:#26324C;}
      .rx-health-list li b{color:#071025;}
      .rx-suggestion-list{display:grid;gap:9px;margin:0;padding:0;list-style:none;}
      .rx-suggestion-list li{border:1px solid rgba(23,107,255,.12);background:#F8FAFF;border-radius:14px;padding:11px 12px;font-size:13px;line-height:1.45;color:#26324C;}
      .rx-suggestion-list li:before{content:'Rolexa';display:inline-flex;margin-right:8px;background:#176BFF;color:#fff;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;vertical-align:1px;}
      @media(max-width:900px){.rx-health-wrap{grid-template-columns:1fr}.rx-health-score{font-size:38px;}}
    `;
    document.head.appendChild(style);
  }

  function ensureRoleHealthPanel() {
    addRoleHealthStyles();
    if (byId('roleHealthPanel')) return;
    const grid = document.querySelector('#overviewPage .grid');
    if (!grid) return;
    grid.insertAdjacentHTML('afterend', `
      <div class="rx-health-wrap" id="roleHealthPanel">
        <article class="card">
          <div class="rx-health-head">
            <div>
              <h2>Role Health Score</h2>
              <div class="rx-health-role" id="roleHealthRole">No role posted yet</div>
            </div>
            <span class="rx-health-label" id="roleHealthLabel">Waiting for role</span>
          </div>
          <div class="rx-health-score" id="roleHealthScore">--</div>
          <p class="rx-health-summary" id="roleHealthSummary">Post your first role and Rolexa will score how attractive it is to candidates before it goes live.</p>
          <ul class="rx-health-list" id="roleHealthStrengths"></ul>
        </article>
        <article class="card">
          <h2>Rolexa Suggestions</h2>
          <p class="rx-health-summary">Practical recommendations to improve candidate interest and match quality.</p>
          <ul class="rx-suggestion-list" id="roleSuggestionsList"></ul>
        </article>
      </div>`);
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

  function showView(view) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const page = byId(view + 'Page');
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
  }

  function mapJob(row) {
    return {
      id: row.id,
      title: row.title || '',
      company: row.company || '',
      location: row.location || 'UK',
      style: row.work_style || 'Hybrid',
      salary: row.salary_range || '',
      skills: row.required_skills || '',
      description: row.description || '',
      status: row.is_active ? 'Live' : 'Draft'
    };
  }

  async function loadJobs() {
    if (!db || !currentUser) return;
    const { data, error } = await db
      .from('jobs')
      .select('*')
      .eq('employer_user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Employer job load error', error);
      employerJobs = [];
      showStatus('bad', 'Could not load employer jobs from Supabase.');
      return;
    }
    employerJobs = (data || []).map(mapJob);
  }

  function roleHealth(job) {
    if (!job) {
      return {
        score: null,
        label: 'Waiting for role',
        summary: 'Post your first role and Rolexa will score how attractive it is to candidates before it goes live.',
        strengths: ['No live employer role has been posted from this account yet.'],
        suggestions: [
          'Post a role with salary, location, work style, required skills and a clear description.',
          'Use 3 to 7 required skills so the match engine has enough signal without becoming too narrow.',
          'Add day-to-day responsibilities so candidates understand what the job actually involves.'
        ]
      };
    }

    let score = 0;
    const strengths = [];
    const suggestions = [];
    const title = (job.title || '').trim();
    const company = (job.company || '').trim();
    const location = (job.location || '').trim();
    const style = (job.style || '').trim();
    const salary = (job.salary || '').trim();
    const skills = (job.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    const description = (job.description || '').trim();
    const seniorityText = `${title} ${description}`.toLowerCase();

    if (title.length >= 4) { score += 10; strengths.push('The role title is clear enough to start matching candidates.'); }
    else suggestions.push('Add a clearer job title so candidates immediately understand the role.');

    if (company.length >= 2) { score += 5; strengths.push('The company name is visible on the role.'); }

    if (location.length >= 2) { score += 10; strengths.push('Location is included, which helps candidates judge fit quickly.'); }
    else suggestions.push('Add a location or mark the role as remote so candidates know where it sits.');

    if (style) { score += 10; strengths.push(`${style} work style is included.`); }
    if (/hybrid|remote|flexible/i.test(style)) strengths.push('Flexible work style can help improve candidate interest.');
    if (/on-site/i.test(style)) suggestions.push('If possible, explain why the role is on-site or whether any flexibility exists.');

    if (/\d/.test(salary) && /£|k|to|-|–/i.test(salary)) { score += 20; strengths.push('Salary range is visible, which improves candidate trust.'); }
    else if (salary) { score += 10; suggestions.push('Make the salary clearer, for example “£45k to £55k”.'); }
    else suggestions.push('Add a salary range. Visible salary is one of the strongest trust signals for candidates.');

    if (skills.length >= 3 && skills.length <= 7) { score += 20; strengths.push('Required skills are focused and useful for matching.'); }
    else if (skills.length > 7) { score += 12; suggestions.push('The skills list may be too broad. Separate must-have skills from nice-to-have skills.'); }
    else if (skills.length > 0) { score += 10; suggestions.push('Add a few more must-have skills so Rolexa can match candidates more accurately.'); }
    else suggestions.push('Add 3 to 7 required skills to improve match quality.');

    if (description.length >= 180) { score += 20; strengths.push('The description gives candidates enough context to understand the role.'); }
    else if (description.length >= 80) { score += 12; suggestions.push('Add more detail on day-to-day responsibilities and success measures.'); }
    else suggestions.push('Write a fuller job description with responsibilities, expectations and what success looks like.');

    if (/senior|junior|lead|manager|director|entry|associate|head|mid-level|mid level/i.test(seniorityText)) {
      score += 5;
      strengths.push('Seniority expectations are visible.');
    } else {
      suggestions.push('Mention seniority level so candidates know whether the role fits their experience.');
    }

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

  function roleHealthTag(score) {
    if (score >= 85) return 'Strong';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Improve';
    return 'Needs work';
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
    const healthText = health.score === null ? '' : `<span class="tag blue">Health ${health.score}</span>`;
    return `
      <div class="item">
        <div class="logo blue">${esc(initial(job.company))}</div>
        <div>
          <div class="item-title">${esc(job.title)}</div>
          <div class="item-sub">${esc(job.company)}, ${esc(job.location)}, ${esc(job.style)}, ${esc(job.salary)}</div>
          <div class="item-sub">Skills: ${esc(job.skills || 'Not set')}</div>
        </div>
        <div class="actions">
          <span class="tag blue">${esc(job.status)}</span>
          ${healthText}
          <button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShowView('matches')">View matches</button>
        </div>
      </div>`;
  }

  function candidateCard(candidate) {
    const shortlisted = getJSON(SHORTLIST_KEY, []).includes(candidate.id);
    const initials = candidate.name.split(' ').map(part => part[0]).join('').slice(0, 2);
    return `
      <div class="item">
        <div class="logo green">${esc(initials)}</div>
        <div>
          <div class="item-title">${esc(candidate.name)} <span class="tag blue">${candidate.score}% match</span></div>
          <div class="item-sub">${esc(candidate.role)}, ${esc(candidate.location)}, ${esc(candidate.style)}</div>
          <div class="item-sub">Skills: ${esc(candidate.skills)}</div>
        </div>
        <div class="actions">
          <span class="tag">Smart match</span>
          <button class="small-btn primary-mini" type="button" onclick="window.rolexaEmployerShortlist('${esc(candidate.id)}')">${shortlisted ? 'Shortlisted' : 'Shortlist'}</button>
        </div>
      </div>`;
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

  function descriptionWithSkills(description, skills) {
    const desc = description || '';
    if (!skills) return desc;
    if (desc.toLowerCase().includes('required skills')) return desc;
    return `${desc}\n\nRequired skills: ${skills}`.trim();
  }

  async function saveJob(event) {
    event.preventDefault();
    if (!db || !currentUser) {
      showStatus('bad', 'You need to be logged in to post a job.');
      return;
    }

    const button = byId('saveJobBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Publishing...';
    }

    const title = byId('jobTitle').value.trim();
    const company = byId('company').value.trim();
    const location = byId('jobLocation').value.trim() || 'UK';
    const style = byId('jobStyle').value;
    const salary = byId('salaryRange').value.trim();
    const skills = byId('requiredSkills').value.trim();
    const description = byId('jobDescription').value.trim();

    const payload = {
      id: 'emp-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
      employer_user_id: currentUser.id,
      title,
      company,
      location,
      work_style: style,
      salary_range: salary,
      required_skills: skills,
      description: descriptionWithSkills(description, skills),
      logo: initial(company),
      logo_class: 'blue',
      tag: 'Employer posted',
      is_active: true,
      updated_at: new Date().toISOString()
    };

    const { error } = await db.from('jobs').insert(payload);

    if (button) {
      button.disabled = false;
      button.textContent = 'Publish job to Supabase';
    }

    if (error) {
      console.warn('Employer job save error', error);
      showStatus('bad', error.message || 'Could not publish job to Supabase.');
      return;
    }

    event.target.reset();
    await loadJobs();
    renderAll();
    showView('jobs');
    showStatus('good', 'Job published to Supabase. Role Health has been updated.');
  }

  async function protect() {
    let supabaseLib;
    try {
      supabaseLib = await loadSupabase();
    } catch (error) {
      console.warn(error);
      showStatus('bad', 'Could not load Supabase.');
      return;
    }

    db = supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await db.auth.getSession();
    const session = data && data.session;

    if (!session || !session.user) {
      location.replace('employer-login.html?next=employer-dashboard.html');
      return;
    }

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
  window.rolexaEmployerSignOut = async function() {
    if (db) await db.auth.signOut();
    location.href = 'employer-login.html';
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });
    const form = byId('jobForm');
    if (form) form.addEventListener('submit', saveJob);
    ensureRoleHealthPanel();
    protect();
  });
})();
