(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaDemoExperience) return;
  window.__rolexaDemoExperience = true;

  const style = document.createElement('style');
  style.textContent = `
    #role-demo-explorer{padding:54px 0;background:#f5f7fc}
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
    @media(max-width:760px){#role-demo-explorer{padding:34px 0}.rx-demo-head h2{font-size:29px}.rx-demo-grid{grid-template-columns:1fr}.rx-demo-card{padding:23px;min-height:auto}.rx-demo-action{display:grid}.rx-demo-button{width:100%}.rx-demo-note{text-align:left}}
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
  jobs.insertAdjacentElement('afterend', section);
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