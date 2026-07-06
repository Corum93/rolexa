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

  function jobCard(job) {
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
    showStatus('good', 'Job published to Supabase.');
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
    protect();
  });
})();
