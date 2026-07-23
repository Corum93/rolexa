(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCareerDirectionRefinementsV1) return;
  window.__rolexaCareerDirectionRefinementsV1 = true;

  const STORAGE_KEY = 'rolexa_candidate_career_direction_v1';
  const EDIT_KEY = 'rolexa_edit_career_direction_step';

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveState(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function esc(value=''){
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function list(value){
    return String(value || '').split(/[,\n;]+/).map(v => v.trim()).filter(Boolean);
  }
  function naturalYears(value){
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/year|month/i.test(raw)) return raw;
    const n = Number(raw.replace(/[^0-9.]/g,''));
    if (!Number.isFinite(n)) return raw;
    return `${n} ${n === 1 ? 'year' : 'years'}`;
  }
  function progressionStep(state){
    const current = String(state.currentRole || '').toLowerCase();
    const target = String(state.targetRole || '').toLowerCase();
    const move = String(state.moveType || '').toLowerCase();

    if (move.includes('sideways')) return 'Transfer your existing strengths';
    if (move.includes('changing industry')) return 'Translate your experience into the new industry';
    if (move.includes('returning')) return 'Refresh your evidence and return confidently';
    if (move.includes('starting')) return 'Build practical entry-level experience';
    if (move.includes('stepping back')) return 'Move towards the right level and lifestyle';

    if (/manager|head|director|lead/.test(target)) {
      if (/assistant manager|deputy/.test(target)) return 'Build day-to-day leadership responsibility';
      if (/manager/.test(target) && !/manager|supervisor|lead/.test(current)) return 'Senior or supervisory responsibility';
      if (/head|director/.test(target) && !/head|director/.test(current)) return 'Lead a wider team, function or programme';
      if (/lead/.test(target) && !/lead|manager|supervisor/.test(current)) return 'Own projects and support others';
    }
    if (/senior/.test(target) && !/senior/.test(current)) return 'Take on broader ownership and complex work';
    return 'Strengthen the experience needed for your target role';
  }

  function addStyles(){
    if (document.getElementById('rxCareerDirectionRefinementStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCareerDirectionRefinementStyles';
    style.textContent = `
      #rxCareerDashboardCard{grid-column:1/-1!important;min-height:0!important;height:auto!important;padding:18px 20px!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;grid-template-areas:'title status action' 'route status action' 'progress status action'!important;column-gap:18px!important;row-gap:8px!important;align-items:center!important;align-self:start!important}
      #rxCareerDashboardCard:after{width:120px!important;height:120px!important;right:-58px!important;bottom:-76px!important}
      #rxCareerDashboardCard h2{grid-area:title;margin:0!important;font-size:18px!important;line-height:1.2!important}
      #rxCareerDashboardCard p{display:none!important}
      #rxCareerDashboardCard .rx-career-route{grid-area:route;margin:0!important;gap:7px!important}
      #rxCareerDashboardCard .rx-career-node{padding:6px 9px!important;font-size:10.5px!important}
      #rxCareerDashboardCard .rx-career-progress{grid-area:progress;margin:1px 0 0!important;max-width:none!important;height:6px!important;padding-right:0!important}
      #rxCareerDashboardCard .mini{grid-area:status;justify-self:end;align-self:end;margin:0 0 -1px!important;font-size:10.5px!important;white-space:nowrap}
      #rxCareerDashboardCard .primary{grid-area:action;margin:0!important;white-space:nowrap;padding:10px 15px!important;font-size:12.5px!important}
      .rx-summary-box{position:relative;padding-top:45px!important}.rx-summary-edit{position:absolute;right:14px;top:12px;border:1px solid rgba(23,107,255,.18);background:#f5f8ff;color:#2946c7;border-radius:999px;padding:7px 10px;font-size:10.5px;font-weight:900;cursor:pointer}
      .rx-summary-edit:hover{background:#e9efff}.rx-summary-skills{background:linear-gradient(180deg,#fff,#fafbff)}
      @media(max-width:900px){#rxCareerDashboardCard{grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:'title action' 'route route' 'progress status'!important}#rxCareerDashboardCard .mini{align-self:center;margin:0!important}.rx-summary-box{padding-top:43px!important}}
      @media(max-width:760px){#rxCareerDashboardCard{grid-template-columns:1fr!important;grid-template-areas:'title' 'route' 'progress' 'action'!important;padding:16px!important;row-gap:10px!important}#rxCareerDashboardCard .primary{justify-self:start!important;width:auto!important}#rxCareerDashboardCard .mini{display:none!important}#rxCareerDashboardCard .rx-career-progress{padding-right:0!important}#rxCareerDashboardCard .rx-career-route{gap:6px!important}#rxCareerDashboardCard .rx-career-node{font-size:10px!important;padding:6px 8px!important}}
    `;
    document.head.appendChild(style);
  }

  function compactDashboardCard(){
    const card = document.getElementById('rxCareerDashboardCard');
    if (!card || card.dataset.rxRefined === 'true') return;
    card.dataset.rxRefined = 'true';
    const mini = card.querySelector('.mini');
    const progress = card.querySelector('.rx-career-progress');
    if (mini && progress) progress.insertAdjacentElement('afterend', mini);
  }

  function refineSummary(){
    const grid = document.querySelector('#rxCareerWizard .rx-summary-grid');
    if (!grid || grid.dataset.rxRefined === 'true') return;
    grid.dataset.rxRefined = 'true';
    const state = loadState();
    const boxes = [...grid.querySelectorAll('.rx-summary-box')];

    const years = naturalYears(state.years);
    if (years && boxes[0]) {
      const firstP = boxes[0].querySelector('p');
      if (firstP) firstP.innerHTML = `<b>${esc(state.currentRole || 'Current role')}</b>${state.industry ? ` in ${esc(state.industry)}` : ''} · ${esc(years)}`;
    }

    const route = grid.querySelector('.rx-summary-route .rx-route-line');
    if (route) {
      const pills = route.querySelectorAll('.rx-route-pill');
      if (pills[1]) pills[1].textContent = progressionStep(state);
    }

    const skills = list(state.skills).slice(0,6);
    const qualifications = list(state.qualifications).slice(0,5);
    if ((skills.length || qualifications.length) && !grid.querySelector('.rx-summary-skills')) {
      const box = document.createElement('div');
      box.className = 'rx-summary-box rx-summary-skills';
      box.innerHTML = `<h3>Main skills and qualifications</h3>${skills.length ? `<p><b>Skills</b></p><ul>${skills.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}${qualifications.length ? `<p style="margin-top:${skills.length?'12':'0'}px"><b>Qualifications and training</b></p><ul>${qualifications.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
      const routeBox = grid.querySelector('.rx-summary-route');
      grid.insertBefore(box, routeBox || null);
    }

    const editable = [
      [boxes[0],1,'Edit current position'],
      [boxes[1],4,'Edit target'],
      [boxes[2],2,'Edit experience'],
      [boxes[3],5,'Edit development']
    ];
    const skillsBox = grid.querySelector('.rx-summary-skills');
    if (skillsBox) editable.push([skillsBox,3,'Edit skills']);
    editable.forEach(([box,step,label]) => {
      if (!box || box.querySelector('.rx-summary-edit')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rx-summary-edit';
      button.textContent = label;
      button.addEventListener('click', () => window.editCareerDirectionSection(step));
      box.appendChild(button);
    });
  }

  window.editCareerDirectionSection = step => {
    const state = loadState();
    state.lastStep = step;
    saveState(state);
    sessionStorage.setItem(EDIT_KEY, String(step));
    location.reload();
  };

  function reopenRequestedStep(){
    if (!sessionStorage.getItem(EDIT_KEY)) return;
    sessionStorage.removeItem(EDIT_KEY);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const button = document.querySelector('[data-view="careerDirection"]');
      if (button) {
        clearInterval(timer);
        button.click();
      } else if (attempts > 30) clearInterval(timer);
    },100);
  }

  addStyles();
  const observer = new MutationObserver(() => {
    compactDashboardCard();
    refineSummary();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  compactDashboardCard();
  refineSummary();
  reopenRequestedStep();
})();