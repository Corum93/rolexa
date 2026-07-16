(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaDemoExperience) return;
  window.__rolexaDemoExperience = true;

  const style = document.createElement('style');
  style.textContent = `
    #role-demo-explorer{padding:54px 0 28px;background:#f5f7fc}
    .rx-demo-head{text-align:center;max-width:720px;margin:0 auto 28px}
    .rx-demo-eyebrow{display:inline-flex;background:#e9edff;color:#2946c7;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;margin-bottom:12px}
    .rx-demo-head h2{font-family:'Space Grotesk',sans-serif;font-size:34px;margin:0;color:#0a0e1a}
    .rx-demo-head p{font-size:15px;line-height:1.6;color:#5a5f73;margin:10px auto 0}
    .rx-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .rx-demo-card{position:relative;overflow:hidden;background:#fff;border:1px solid rgba(10,14,26,.09);border-radius:24px;padding:28px;box-shadow:0 18px 48px rgba(10,14,26,.06);display:flex;flex-direction:column;min-height:340px}
    .rx-demo-card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:#4c74ff}
    .rx-demo-card.employer:before{background:#2fae7a}
    .rx-demo-icon{width:52px;height:52px;border-radius:16px;background:#e9edff;color:#2946c7;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;margin-bottom:20px}
    .rx-demo-card.employer .rx-demo-icon{background:#e1f6eb;color:#176b49}
    .rx-demo-card h3{font-family:'Space Grotesk',sans-serif;font-size:23px;margin:0 0 10px}
    .rx-demo-card p{font-size:14px;line-height:1.6;color:#5a5f73;margin:0 0 20px}
    .rx-demo-points{list-style:none;margin:0 0 24px;padding:0;display:grid;gap:9px}
    .rx-demo-points li{font-size:13px;color:#26324c;display:flex;gap:9px;align-items:flex-start}
    .rx-demo-points li:before{content:'✓';color:#2fae7a;font-weight:900}
    .rx-demo-action{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:14px}
    .rx-demo-button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#0a0e1a;color:#fff;padding:12px 18px;font-size:14px;font-weight:800;text-decoration:none}
    .rx-demo-button:hover{background:#4c74ff}
    .rx-demo-note{font-size:11.5px;color:#8892b0;line-height:1.4;text-align:right}
    .rx-demo-trust{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin-top:22px;color:#5a5f73;font-size:12.5px;font-weight:700}
    .rx-account-next{padding:22px 0 58px;background:#f5f7fc}
    .rx-account-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .rx-account-card{position:relative;overflow:hidden;border-radius:24px;padding:34px;color:#fff;box-shadow:0 20px 48px rgba(10,14,26,.13)}
    .rx-account-card.candidate{background:linear-gradient(145deg,#0a0e1a,#1a275c)}
    .rx-account-card.employer{background:linear-gradient(145deg,#4c74ff,#2946c7)}
    .rx-account-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.72;margin-bottom:12px}
    .rx-account-card h3{font-family:'Space Grotesk',sans-serif;font-size:25px;line-height:1.2;margin:0 0 11px;color:#fff}
    .rx-account-card p{max-width:500px;margin:0 0 24px;font-size:14px;line-height:1.65;color:rgba(255,255,255,.82)}
    .rx-account-button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:12px 19px;font-size:14px;font-weight:850;text-decoration:none;background:#fff;color:#0a0e1a;border:1px solid rgba(255,255,255,.35)}
    .rx-account-card.candidate .rx-account-button{color:#0a0e1a}
    .rx-account-card.employer .rx-account-button{color:#2946c7}
    .rx-account-button:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(0,0,0,.14)}
    @media(max-width:760px){
      #role-demo-explorer{padding:34px 0 22px}
      #role-demo-explorer .wrap,.rx-account-next .wrap{padding-left:18px!important;padding-right:18px!important}
      .rx-demo-head{margin-bottom:22px;text-align:left}
      .rx-demo-head h2{font-size:29px;line-height:1.15}
      .rx-demo-head p{font-size:14.5px;line-height:1.55}
      .rx-demo-grid,.rx-account-grid{grid-template-columns:1fr}
      .rx-demo-card{padding:23px;min-height:auto;border-radius:21px}
      .rx-demo-icon{width:48px;height:48px;margin-bottom:16px}
      .rx-demo-card h3{font-size:22px}
      .rx-demo-card p{font-size:14px}
      .rx-demo-points{margin-bottom:20px}
      .rx-demo-action{display:grid;gap:10px}
      .rx-demo-button,.rx-account-button{width:100%}
      .rx-demo-note{text-align:left}
      .rx-demo-trust{justify-content:flex-start;display:grid;gap:8px;margin-top:18px;padding:0 2px}
      .rx-account-next{padding:14px 0 38px}
      .rx-account-card{padding:27px 24px;border-radius:21px}
      .rx-account-card h3{font-size:23px}
    }
    @media(max-width:420px){
      #role-demo-explorer .wrap,.rx-account-next .wrap{padding-left:14px!important;padding-right:14px!important}
      .rx-demo-card,.rx-account-card{padding:21px 18px}
      .rx-demo-head h2{font-size:27px}
      .rx-demo-card h3{font-size:21px}
      .rx-account-card h3{font-size:22px}
      .rx-demo-button,.rx-account-button{font-size:13.5px;padding:12px 14px}
    }
  `;
  document.head.appendChild(style);

  const oldCandidate = document.getElementById('candidate-dashboard');
  const oldEmployers = document.getElementById('employers');
  const oldEmployerView = document.getElementById('view-employer');
  const jobs = document.getElementById('jobs');
  if (!jobs || !oldCandidate) return;

  const section = document.createElement('section');
  section.id = 'role-demo-explorer';
  section.innerHTML = `<div class="wrap"><div class="rx-demo-head"><span class="rx-demo-eyebrow">Interactive product tour</span><h2>Explore Rolexa</h2><p>Choose a workspace and see how Rolexa supports both sides of hiring. No account is required and no real data will be changed.</p></div><div class="rx-demo-grid"><article class="rx-demo-card candidate"><div class="rx-demo-icon">C</div><h3>Explore as a candidate</h3><p>See how candidates discover relevant roles, track every application and communicate directly with employers.</p><ul class="rx-demo-points"><li>Track application status clearly</li><li>Review saved jobs and profile strength</li><li>See employer messages in one place</li></ul><div class="rx-demo-action"><a class="rx-demo-button" href="candidate-demo.html">Preview candidate dashboard</a><span class="rx-demo-note">Demo only<br>No application submitted</span></div></article><article class="rx-demo-card employer"><div class="rx-demo-icon">E</div><h3>Explore as an employer</h3><p>See how employers publish roles, review applicants and manage their hiring pipeline from one workspace.</p><ul class="rx-demo-points"><li>Review roles and real hiring signals</li><li>See Role Health and Rolexa Suggestions</li><li>Manage applications and messages</li></ul><div class="rx-demo-action"><a class="rx-demo-button" href="employer-demo.html">Preview employer dashboard</a><span class="rx-demo-note">Demo only<br>No role or message created</span></div></article></div><div class="rx-demo-trust"><span>✓ No account required</span><span>✓ No real data changed</span><span>✓ Takes less than two minutes</span></div></div>`;

  const accountSection = document.createElement('section');
  accountSection.className = 'rx-account-next';
  accountSection.innerHTML = `<div class="wrap"><div class="rx-account-grid"><article class="rx-account-card candidate"><div class="rx-account-kicker">Looking for your next role?</div><h3>Create your candidate account</h3><p>Build your profile, discover relevant opportunities, track applications clearly and speak directly with employers from one place.</p><a class="rx-account-button" href="candidate-login.html">Create candidate account</a></article><article class="rx-account-card employer"><div class="rx-account-kicker">Hiring talent?</div><h3>Create your employer account</h3><p>Publish roles, review real applicants, shortlist candidates and manage your hiring pipeline through the live Rolexa workspace.</p><a class="rx-account-button" href="employer-login.html">Start hiring with Rolexa</a></article></div></div>`;

  jobs.insertAdjacentElement('afterend', section);
  section.insertAdjacentElement('afterend', accountSection);
  oldCandidate.hidden = true;
  if (oldEmployers) oldEmployers.hidden = true;
  if (oldEmployerView) oldEmployerView.hidden = true;

  document.querySelectorAll('a').forEach(link => {
    const text = link.textContent.trim().toLowerCase();
    if (text.includes('candidate demo') || text.includes('preview candidate')) {
      link.href = 'candidate-demo.html';
      link.removeAttribute('onclick');
    }
    if (text.includes('employer demo') || text.includes('preview employer')) {
      link.href = 'employer-demo.html';
      link.removeAttribute('onclick');
    }
  });
})();