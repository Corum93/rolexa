(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCareerDirectionV1) return;
  window.__rolexaCareerDirectionV1 = true;

  const STORAGE_KEY = 'rolexa_candidate_career_direction_v1';
  const state = loadState();
  let step = Math.max(1, Math.min(6, Number(state.lastStep || 1)));

  const situations = [
    'I am currently employed','I am unemployed and looking for work','I am returning to work after a break',
    'I am studying or recently graduated','I am changing careers','I am self-employed or freelance',
    'I have experience but I am unsure what suits me next','This would be my first job'
  ];
  const moveReasons = ['Career progression','Better salary','More responsibility','Better work-life balance','Remote or flexible working','A healthier work environment','A more secure position','A new industry','A role that uses more of my skills','Returning after a career break','Relocation','Redundancy or company changes','I want to leave management','I am unsure and need guidance'];
  const moveTypes = ['Moving upward','Moving sideways','Changing industry','Returning to work','Starting out','Stepping back or changing direction','I am not sure yet'];
  const priorities = ['Salary','Progression opportunities','Job security','Flexible hours','Remote or hybrid working','Location','Company culture','Training','Management responsibility','Meaningful work','Benefits','Work-life balance'];
  const experienceOptions = ['Managing people','Training or mentoring colleagues','Handling customers or clients','Resolving complaints','Meeting sales targets','Managing projects','Organising rotas or schedules','Working with budgets','Reporting performance','Using specialist systems or software','Working under pressure','Managing suppliers','Improving a process','Working independently','Leading meetings','Supporting vulnerable people','Working in regulated environments'];
  const developmentOptions = ['People management','Leadership','Communication','Project management','Data and reporting','Sales','Customer management','Budget management','Digital skills','Industry knowledge','Qualifications or certifications','Interview confidence','CV and profile presentation'];

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveState(){
    state.lastStep = step;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateDashboardCard();
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function arr(value){ return Array.isArray(value) ? value : []; }
  function selected(name,value){ return arr(state[name]).includes(value); }
  function currentRole(){ return state.currentRole || state.recentRole || 'Your current or most recent role'; }
  function targetRole(){ return state.targetRole || 'Your next target role'; }
  function completion(){
    const checks = [state.situation,state.currentRole,state.industry,arr(state.experience).length,state.skills,state.targetRole,arr(state.reasons).length,state.moveType,arr(state.priorities).length];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }

  function addStyles(){
    if (document.getElementById('rxCareerDirectionStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCareerDirectionStyles';
    style.textContent = `
      .rx-career-card{position:relative;overflow:hidden;background:linear-gradient(135deg,#071025,#18316f)!important;color:#fff;border:0!important;box-shadow:0 22px 55px rgba(7,16,37,.17)!important}
      .rx-career-card:after{content:'';position:absolute;width:210px;height:210px;border-radius:50%;right:-90px;bottom:-115px;background:rgba(76,116,255,.32)}
      .rx-career-card>*{position:relative;z-index:1}.rx-career-card h2{color:#fff!important;margin-bottom:8px!important}.rx-career-card p{color:#c7d3ff;font-size:13.5px;line-height:1.55;margin:0 0 16px}
      .rx-career-route{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0}.rx-career-node{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:7px 10px;font-size:11.5px;font-weight:900}.rx-career-arrow{color:#8ca6ff;font-weight:900}
      .rx-career-progress{height:7px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden;margin:13px 0 8px}.rx-career-progress span{height:100%;display:block;background:linear-gradient(90deg,#4c74ff,#8ca6ff);border-radius:999px}
      .rx-career-card .primary{background:#fff;color:#0a1738}.rx-career-card .primary:hover{background:#eef3ff}.rx-career-card .mini{color:#b9c8ef}
      .rx-career-shell{max-width:1040px;margin:0 auto}.rx-career-hero{background:linear-gradient(135deg,#071025,#176bff);color:#fff;border-radius:25px;padding:30px;margin-bottom:16px;box-shadow:0 20px 55px rgba(7,16,37,.16)}
      .rx-career-kicker{display:inline-flex;border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#dce5ff;margin-bottom:13px}
      .rx-career-hero h1{font-size:36px;line-height:1.08;color:#fff}.rx-career-hero p{max-width:730px;color:#dce5ff;line-height:1.6;margin:12px 0 0;font-size:14.5px}
      .rx-stepper{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}.rx-step{border:1px solid var(--line);background:#fff;border-radius:13px;padding:10px;text-align:center;color:#7a849a;font-size:11px;font-weight:900}.rx-step.active{background:#071025;color:#fff;border-color:#071025}.rx-step.done{background:#eaf7f1;color:#178457;border-color:#d5efe3}
      .rx-wizard{background:#fff;border:1px solid var(--line);border-radius:23px;padding:28px;box-shadow:0 17px 48px rgba(7,16,37,.055)}.rx-wizard-head{margin-bottom:22px}.rx-wizard-head h2{font-size:27px}.rx-wizard-head p{max-width:690px;color:var(--muted);line-height:1.55;font-size:14px;margin:7px 0 0}
      .rx-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rx-field{display:grid;gap:7px}.rx-field.full{grid-column:1/-1}.rx-field label{font-size:11.5px;font-weight:900;letter-spacing:.045em;text-transform:uppercase;color:#172753}.rx-field input,.rx-field select,.rx-field textarea{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:13px 14px;font-size:14px;color:var(--ink);outline:none}.rx-field textarea{min-height:105px;resize:vertical}.rx-field input:focus,.rx-field select:focus,.rx-field textarea:focus{border-color:var(--blue);background:#fff}
      .rx-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rx-choice{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--paper);font-size:12.5px;font-weight:800;color:#26324c;line-height:1.4;cursor:pointer}.rx-choice:has(input:checked){border-color:#176bff;background:#eef3ff;color:#183c9f}.rx-choice input{margin-top:2px;accent-color:#176bff}
      .rx-private{border:1px solid #dfe7f8;background:#f6f8fd;border-radius:13px;padding:11px 13px;font-size:12px;color:#657089;line-height:1.5;margin-top:14px}.rx-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}.rx-actions-right{display:flex;gap:10px}.rx-save-note{font-size:12px;color:var(--muted);font-weight:700}
      .rx-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rx-summary-box{border:1px solid var(--line);border-radius:17px;padding:18px;background:#fff}.rx-summary-box h3{font-size:17px;margin-bottom:10px}.rx-summary-box p{font-size:13.5px;line-height:1.55;color:#4d5870;margin:0}.rx-summary-box ul{margin:0;padding-left:18px;color:#4d5870;font-size:13px;line-height:1.65}.rx-summary-route{grid-column:1/-1;background:linear-gradient(135deg,#eef3ff,#f8faff);border-color:#dbe5ff}.rx-summary-route strong{display:block;color:#183c9f;margin-bottom:10px}.rx-route-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rx-route-pill{background:#fff;border:1px solid #d9e3ff;border-radius:999px;padding:8px 11px;color:#183c9f;font-size:12px;font-weight:900}
      @media(max-width:900px){.rx-stepper{grid-template-columns:repeat(3,1fr)}.rx-choice-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:760px){.rx-career-hero{padding:24px 20px;border-radius:20px}.rx-career-hero h1{font-size:29px}.rx-wizard{padding:21px 18px}.rx-form-grid,.rx-choice-grid,.rx-summary-grid{grid-template-columns:1fr}.rx-summary-route{grid-column:auto}.rx-stepper{grid-template-columns:repeat(2,1fr)}.rx-actions{align-items:stretch;flex-direction:column}.rx-actions-right{display:grid;grid-template-columns:1fr 1fr}.rx-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function addNavigation(){
    const nav = document.querySelector('.side .nav');
    if (!nav || nav.querySelector('[data-view="careerDirection"]')) return;
    const button = document.createElement('button');
    button.className = 'nav-btn';
    button.dataset.view = 'careerDirection';
    button.textContent = 'Career Direction';
    const first = nav.querySelector('[data-view="overview"]');
    first?.insertAdjacentElement('afterend', button);
  }

  function addPage(){
    const app = document.getElementById('appView');
    if (!app || document.getElementById('careerDirectionPage')) return;
    const page = document.createElement('div');
    page.className = 'page';
    page.id = 'careerDirectionPage';
    page.innerHTML = `<div class="rx-career-shell"><div class="rx-career-hero"><div class="rx-career-kicker">Phase 1 · Career direction</div><h1>Where are you now, and where do you want to go next?</h1><p>Rolexa looks beyond job titles and degrees. Tell us about your experience, practical strengths and goals so we can help you understand your next realistic career move.</p></div><div class="rx-stepper" id="rxCareerStepper"></div><div class="rx-wizard" id="rxCareerWizard"></div></div>`;
    app.appendChild(page);
  }

  function addDashboardCard(){
    const grid = document.querySelector('#overviewPage .grid');
    if (!grid || document.getElementById('rxCareerDashboardCard')) return;
    const card = document.createElement('article');
    card.className = 'card wide rx-career-card';
    card.id = 'rxCareerDashboardCard';
    grid.prepend(card);
    updateDashboardCard();
  }

  function updateDashboardCard(){
    const card = document.getElementById('rxCareerDashboardCard');
    if (!card) return;
    const pct = completion();
    const complete = Boolean(state.completed);
    card.innerHTML = `<h2>Your career direction</h2><p>${complete ? 'Your direction is ready. Keep it updated as your experience and goals change.' : 'Tell Rolexa what you have done, what matters to you and where you want to go next.'}</p><div class="rx-career-route"><span class="rx-career-node">${escapeHtml(currentRole())}</span><span class="rx-career-arrow">→</span><span class="rx-career-node">${escapeHtml(targetRole())}</span></div><div class="rx-career-progress"><span style="width:${pct}%"></span></div><div class="mini">${pct}% career direction complete</div><button class="primary" style="margin-top:15px" onclick="window.openCareerDirection()">${complete ? 'View or update direction' : pct ? 'Continue career direction' : 'Start career direction'}</button>`;
  }

  function stepper(){
    const labels = ['Where you are','Experience','Skills','Where next','Your move','Summary'];
    document.getElementById('rxCareerStepper').innerHTML = labels.map((label,index) => `<div class="rx-step ${index+1===step?'active':''} ${index+1<step?'done':''}">${index+1}. ${label}</div>`).join('');
  }
  function options(values,name,type='checkbox'){
    return `<div class="rx-choice-grid">${values.map(value => `<label class="rx-choice"><input type="${type}" name="${name}" value="${escapeHtml(value)}" ${type==='radio' ? state[name]===value?'checked':'' : selected(name,value)?'checked':''}><span>${escapeHtml(value)}</span></label>`).join('')}</div>`;
  }
  function field(label,id,value='',placeholder='',full=false,type='text'){
    return `<div class="rx-field ${full?'full':''}"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></div>`;
  }
  function textarea(label,id,value='',placeholder='',full=true){
    return `<div class="rx-field ${full?'full':''}"><label for="${id}">${label}</label><textarea id="${id}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></div>`;
  }
  function selectField(label,id,values,value='',full=false){
    return `<div class="rx-field ${full?'full':''}"><label for="${id}">${label}</label><select id="${id}"><option value="">Select an option</option>${values.map(v=>`<option ${value===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>`;
  }

  function render(){
    stepper();
    const wizard = document.getElementById('rxCareerWizard');
    const headers = [
      ['Where are you now?','Start with your current situation and your most recent experience. There is no wrong starting point.'],
      ['What have you actually done?','Choose the practical responsibilities you have experience with, then add a real example in your own words.'],
      ['Skills, qualifications and evidence','Experience, practical skills and qualifications all count. A degree is not required to show that you can do valuable work.'],
      ['Where do you want to go next?','Choose your main target and tell Rolexa why this move matters to you. Your private reasons are not automatically shared with employers.'],
      ['What type of move are you making?','Your next step may be upward, sideways, into a new industry, back into work or towards a different lifestyle.'],
      ['Your Career Direction Summary','This first summary uses clear information you provided. It is supportive, editable and never makes a hidden hiring decision.']
    ];
    let body = '';
    if(step===1){
      body = `<div class="rx-form-grid">${selectField('Current situation','rxSituation',situations,state.situation,'true')}${field('Current or most recent role','rxCurrentRole',state.currentRole,'Customer Service Adviser, Retail Supervisor...')}${field('Current or most recent industry','rxIndustry',state.industry,'Retail, hospitality, technology...')}${selectField('Current career level','rxCurrentLevel',['First job / entry level','Junior','Experienced individual contributor','Senior / specialist','Team Leader / Supervisor','Assistant Manager / Manager','Senior leadership'],state.currentLevel)}${field('Years of relevant experience','rxYears',state.years,'For example: 4 years')}${field('Current location','rxLocation',state.location,'London, Manchester, remote...')}${textarea('A short description of your current or most recent work','rxCurrentSummary',state.currentSummary,'What did you do day to day? What were you trusted to handle?')}</div>`;
    } else if(step===2){
      body = `${options(experienceOptions,'experience')}<div class="rx-form-grid" style="margin-top:16px">${textarea('Add one strong example','rxEvidence',state.evidence,'For example: I trained five new starters and supported them through onboarding.')}</div>`;
    } else if(step===3){
      body = `<div class="rx-form-grid">${textarea('Practical and professional skills','rxSkills',state.skills,'Customer service, team coaching, Excel, stock control, SQL...',true)}${textarea('Qualifications, licences, certifications or training','rxQualifications',state.qualifications,'Apprenticeships, licences, professional courses or formal qualifications...',true)}${textarea('Other evidence that matters','rxOtherEvidence',state.otherEvidence,'Portfolio links, volunteering, caring responsibilities, work examples or achievements...',true)}</div><div class="rx-private"><b>Rolexa principle:</b> experience and evidence are not treated as less valuable simply because they were gained outside university.</div>`;
    } else if(step===4){
      body = `<div class="rx-form-grid">${field('Main target role','rxTargetRole',state.targetRole,'Team Leader, Operations Manager, Data Analyst...')}${field('Also interested in','rxSecondaryRoles',state.secondaryRoles,'Optional alternative roles')}${textarea('Why would you like to move?','rxMoveContext',state.moveContext,'Optional private context about what is influencing your next move.')}</div><h3 style="font-size:17px;margin:20px 0 11px">Main reasons for moving</h3>${options(moveReasons,'reasons')}<div class="rx-private">Your detailed reason for moving stays private unless you choose to share it later.</div>`;
    } else if(step===5){
      body = `<h3 style="font-size:17px;margin:0 0 11px">Type of career move</h3>${options(moveTypes,'moveType','radio')}<h3 style="font-size:17px;margin:22px 0 11px">What matters most in your next role?</h3>${options(priorities,'priorities')}<div class="rx-form-grid" style="margin-top:17px">${selectField('Preferred work style','rxWorkStyle',['Remote','Hybrid','On-site','Open to all'],state.workStyle)}${field('Minimum preferred salary','rxMinSalary',state.minSalary,'For example: £35,000')}${field('Preferred location or travel area','rxPreferredLocation',state.preferredLocation,'Location, radius or UK-wide')}${selectField('Employment type','rxEmploymentType',['Full-time','Part-time','Temporary','Contract','Open to different options'],state.employmentType)}${textarea('What would you be willing to learn or strengthen?','rxDevelopmentText',state.developmentText,'Add anything else you would genuinely be open to developing.')}</div><h3 style="font-size:17px;margin:22px 0 11px">Development areas you are open to</h3>${options(developmentOptions,'development')}`;
    } else {
      body = summaryHtml();
    }
    wizard.innerHTML = `<div class="rx-wizard-head"><h2>${headers[step-1][0]}</h2><p>${headers[step-1][1]}</p></div>${body}<div class="rx-actions"><span class="rx-save-note">Your progress is saved in this browser during testing.</span><div class="rx-actions-right">${step>1?'<button class="secondary" type="button" id="rxBack">Back</button>':''}<button class="primary" type="button" id="rxNext">${step===6?'Save and return to dashboard':step===5?'Build my summary':'Save and continue'}</button></div></div>`;
    document.getElementById('rxBack')?.addEventListener('click',()=>{capture();step--;saveState();render();scrollCareerTop();});
    document.getElementById('rxNext')?.addEventListener('click',()=>{
      capture();
      if(step===6){state.completed=true;saveState();window.showDashboardPage?.('overview');document.querySelector('[data-view="overview"]')?.click();return;}
      step++; if(step===6) state.completed=true; saveState(); render(); scrollCareerTop();
    });
  }

  function capture(){
    const value = id => document.getElementById(id)?.value?.trim() || '';
    const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el=>el.value);
    if(step===1){Object.assign(state,{situation:value('rxSituation'),currentRole:value('rxCurrentRole'),industry:value('rxIndustry'),currentLevel:value('rxCurrentLevel'),years:value('rxYears'),location:value('rxLocation'),currentSummary:value('rxCurrentSummary')});}
    if(step===2){Object.assign(state,{experience:checked('experience'),evidence:value('rxEvidence')});}
    if(step===3){Object.assign(state,{skills:value('rxSkills'),qualifications:value('rxQualifications'),otherEvidence:value('rxOtherEvidence')});}
    if(step===4){Object.assign(state,{targetRole:value('rxTargetRole'),secondaryRoles:value('rxSecondaryRoles'),moveContext:value('rxMoveContext'),reasons:checked('reasons')});}
    if(step===5){Object.assign(state,{moveType:document.querySelector('input[name="moveType"]:checked')?.value||'',priorities:checked('priorities'),workStyle:value('rxWorkStyle'),minSalary:value('rxMinSalary'),preferredLocation:value('rxPreferredLocation'),employmentType:value('rxEmploymentType'),developmentText:value('rxDevelopmentText'),development:checked('development')});}
  }

  function summaryHtml(){
    const strengths = arr(state.experience).slice(0,5);
    const developments = arr(state.development).slice(0,5);
    const middle = state.moveType === 'Moving upward' ? 'A realistic progression step' : state.moveType || 'Your chosen career move';
    return `<div class="rx-summary-grid"><div class="rx-summary-box"><h3>Your current position</h3><p><b>${escapeHtml(currentRole())}</b>${state.industry?` in ${escapeHtml(state.industry)}`:''}${state.years?` · ${escapeHtml(state.years)}`:''}</p><p style="margin-top:8px">${escapeHtml(state.currentSummary || 'Add more detail about your current experience whenever you are ready.')}</p></div><div class="rx-summary-box"><h3>Your target</h3><p><b>${escapeHtml(targetRole())}</b></p><p style="margin-top:8px">${escapeHtml(state.moveType || 'Career move type not selected yet')}${arr(state.reasons).length?` · ${escapeHtml(arr(state.reasons).slice(0,3).join(', '))}`:''}</p></div><div class="rx-summary-box"><h3>What already supports your move</h3>${strengths.length?`<ul>${strengths.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}${state.evidence?`<li>${escapeHtml(state.evidence)}</li>`:''}</ul>`:'<p>Add responsibilities and evidence to strengthen this part of your direction.</p>'}</div><div class="rx-summary-box"><h3>What you are willing to strengthen</h3>${developments.length?`<ul>${developments.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p>No development areas selected yet. You can update this at any time.</p>'}</div><div class="rx-summary-box rx-summary-route"><strong>Your first Rolexa progression route</strong><div class="rx-route-line"><span class="rx-route-pill">${escapeHtml(currentRole())}</span><span class="rx-career-arrow">→</span><span class="rx-route-pill">${escapeHtml(middle)}</span><span class="rx-career-arrow">→</span><span class="rx-route-pill">${escapeHtml(targetRole())}</span></div><p style="margin-top:12px">This is a starting direction, not a fixed route. Later phases will connect it to verified jobs, transferable skills and alternative career paths.</p></div></div>`;
  }

  function scrollCareerTop(){ document.getElementById('careerDirectionPage')?.scrollIntoView({behavior:'smooth',block:'start'}); }

  function bindNavigation(){
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-view="careerDirection"]');
      if(!button) return;
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.getElementById('careerDirectionPage')?.classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      button.classList.add('active');
      render();
    });
    window.openCareerDirection = () => document.querySelector('[data-view="careerDirection"]')?.click();
  }

  addStyles(); addNavigation(); addPage(); addDashboardCard(); bindNavigation(); render();
})();