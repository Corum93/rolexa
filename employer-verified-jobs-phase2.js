(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerifiedJobsPhase2) return;
  window.__rolexaVerifiedJobsPhase2 = true;

  const DRAFT_KEY = 'rolexa_verified_job_draft_v1';
  const STATUS_KEY = 'rolexa_verified_job_status_v1';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  const write = (key,value) => localStorage.setItem(key, JSON.stringify(value));

  function addStyles(){
    if (document.getElementById('rxVerifiedJobsPhase2Styles')) return;
    const style = document.createElement('style');
    style.id = 'rxVerifiedJobsPhase2Styles';
    style.textContent = `
      .rx-verified-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#071025,#17336f);color:#fff;border-radius:24px;padding:25px 26px;margin-bottom:16px;box-shadow:0 20px 55px rgba(7,16,37,.16)}
      .rx-verified-hero:after{content:'';position:absolute;width:210px;height:210px;border-radius:50%;right:-90px;bottom:-135px;background:rgba(76,116,255,.3)}
      .rx-verified-hero>*{position:relative;z-index:1}.rx-verified-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#a9bcff;margin-bottom:8px}.rx-verified-hero h2{font-size:25px;margin-bottom:8px}.rx-verified-hero p{max-width:760px;color:#d2dcfb;font-size:13.5px;line-height:1.55;margin:0}
      .rx-verification-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;grid-column:1/-1}.rx-verification-panel{border:1px solid rgba(23,107,255,.13);background:#f8faff;border-radius:17px;padding:17px}.rx-verification-panel h3{font-size:16px;margin-bottom:6px}.rx-verification-panel p{font-size:12.5px;color:#6b7280;line-height:1.5;margin:0 0 13px}
      .rx-check-grid{display:grid;gap:9px}.rx-verify-check{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(7,16,37,.08);background:#fff;border-radius:13px;padding:11px 12px;font-size:12.5px;font-weight:800;line-height:1.4;color:#26324c}.rx-verify-check input{margin-top:2px;accent-color:#176bff}
      .rx-field-help{font-size:11.5px;color:#7a849a;line-height:1.45;margin-top:-1px}.rx-required-badge{display:inline-flex;margin-left:6px;background:#e9edff;color:#2946c7;border-radius:999px;padding:3px 7px;font-size:9.5px;font-weight:900;vertical-align:1px}
      .rx-trust-preview{grid-column:1/-1;border:1px solid rgba(34,160,107,.16);background:linear-gradient(135deg,#effaf5,#f9fffc);border-radius:18px;padding:17px}.rx-trust-preview-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.rx-trust-preview h3{font-size:17px}.rx-live-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#e1f6eb;color:#176b49;padding:7px 10px;font-size:11px;font-weight:900}.rx-live-badge:before{content:'';width:7px;height:7px;border-radius:50%;background:#22a06b}.rx-trust-signals{display:flex;gap:8px;flex-wrap:wrap}.rx-trust-chip{border:1px solid rgba(34,160,107,.14);background:#fff;color:#176b49;border-radius:999px;padding:7px 9px;font-size:11px;font-weight:900}.rx-trust-chip.pending{border-color:#f0d08a;color:#8a5600;background:#fff9ea}
      .rx-verified-overview{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-top:16px}.rx-verified-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 16px 46px rgba(7,16,37,.05)}.rx-verified-card h2{font-size:19px;margin-bottom:8px}.rx-verified-card p{font-size:13px;line-height:1.5;color:#6b7280;margin:0 0 14px}.rx-status-list{display:grid;gap:9px}.rx-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--line);background:#f8faff;border-radius:13px;padding:11px 12px;font-size:12.5px}.rx-status-row b{color:#172753}.rx-status-pill{border-radius:999px;padding:5px 8px;font-size:10.5px;font-weight:900;background:#e9edff;color:#2946c7}
      @media(max-width:900px){.rx-verification-grid,.rx-verified-overview{grid-template-columns:1fr}}
      @media(max-width:760px){.rx-verified-hero{padding:21px 18px;border-radius:20px}.rx-verified-hero h2{font-size:22px}.rx-trust-preview-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function fieldHtml(label,id,type='text',placeholder='',options=[]){
    if(type==='select') return `<div class="field"><label for="${id}">${label}</label><select id="${id}"><option value="">Select an option</option>${options.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`;
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${esc(placeholder)}"></div>`;
  }

  function enhancePostJob(){
    const form = document.getElementById('jobForm');
    if(!form || form.dataset.rxVerifiedEnhanced==='true') return;
    form.dataset.rxVerifiedEnhanced='true';

    const pageHead = document.querySelector('#postJobPage .page-head');
    if(pageHead && !document.querySelector('.rx-verified-hero')){
      pageHead.insertAdjacentHTML('afterend', `<div class="rx-verified-hero"><div class="rx-verified-kicker">Phase 2 · Verified jobs</div><h2>Only publish roles that are real, funded and actively managed.</h2><p>Rolexa asks employers to confirm who owns the vacancy, when candidates can expect an update and whether the position is genuinely open before trust signals are shown to candidates.</p></div>`);
    }

    const salary = document.getElementById('salaryRange');
    if(salary){ salary.required = true; salary.placeholder = '£45,000 to £55,000'; const label=salary.closest('.field')?.querySelector('label'); if(label && !label.querySelector('.rx-required-badge')) label.insertAdjacentHTML('beforeend','<span class="rx-required-badge">Required</span>'); salary.closest('.field')?.insertAdjacentHTML('beforeend','<div class="rx-field-help">A clear salary range is required for a verified Rolexa vacancy.</div>'); }

    const description = document.getElementById('jobDescription')?.closest('.field');
    if(!description) return;
    const block = document.createElement('div');
    block.className = 'rx-verification-grid';
    block.innerHTML = `
      <div class="rx-verification-panel"><h3>Hiring ownership</h3><p>Every live vacancy must have a named person responsible for reviewing candidates and closing the process.</p><div class="form-grid">${fieldHtml('Hiring owner name','rxHiringOwner','text','Alex Morgan')}${fieldHtml('Hiring owner email','rxHiringEmail','email','alex@company.co.uk')}${fieldHtml('Expected first review','rxReviewDays','select','',['Within 2 working days','Within 5 working days','Within 7 working days','Within 10 working days'])}${fieldHtml('Expected hiring date','rxHiringDate','date','')}</div></div>
      <div class="rx-verification-panel"><h3>Vacancy confirmation</h3><p>These confirmations create the first version of Rolexa’s verified-active vacancy standard.</p><div class="rx-check-grid"><label class="rx-verify-check"><input id="rxRoleExists" type="checkbox"><span>This position genuinely exists and is approved to hire.</span></label><label class="rx-verify-check"><input id="rxRoleFunded" type="checkbox"><span>The salary or hiring budget has been approved.</span></label><label class="rx-verify-check"><input id="rxRoleReviewed" type="checkbox"><span>Applications will be actively reviewed by the named hiring owner.</span></label><label class="rx-verify-check"><input id="rxFinalOutcome" type="checkbox"><span>Every applicant will receive a visible final outcome.</span></label></div></div>
      <div class="rx-trust-preview"><div class="rx-trust-preview-head"><div><h3>Candidate trust preview</h3><div class="rx-field-help">These signals will appear on the job once all required checks are complete.</div></div><span class="rx-live-badge" id="rxVerificationBadge">Verification in progress</span></div><div class="rx-trust-signals" id="rxTrustSignals"></div></div>`;
    description.insertAdjacentElement('afterend',block);

    const button = document.getElementById('saveJobBtn');
    if(button){ button.textContent='Verify and publish job'; }

    const draft = read(DRAFT_KEY);
    ['rxHiringOwner','rxHiringEmail','rxReviewDays','rxHiringDate'].forEach(id=>{ const el=document.getElementById(id); if(el && draft[id]) el.value=draft[id]; });
    ['rxRoleExists','rxRoleFunded','rxRoleReviewed','rxFinalOutcome'].forEach(id=>{ const el=document.getElementById(id); if(el) el.checked=!!draft[id]; });

    form.addEventListener('input',()=>{ saveDraft(); updatePreview(); });
    form.addEventListener('change',()=>{ saveDraft(); updatePreview(); });
    form.addEventListener('submit',event=>{
      if(!verificationComplete()){
        event.preventDefault(); event.stopImmediatePropagation();
        document.getElementById('statusBar').className='statusbar show bad';
        document.getElementById('statusBar').textContent='Complete the hiring owner details, salary and all four verification confirmations before publishing.';
        block.scrollIntoView({behavior:'smooth',block:'center'});
      } else {
        write(STATUS_KEY,{status:'Verified and actively hiring',verifiedAt:new Date().toISOString(),owner:document.getElementById('rxHiringOwner').value.trim(),review:document.getElementById('rxReviewDays').value,hiringDate:document.getElementById('rxHiringDate').value});
      }
    },true);
    updatePreview();
  }

  function saveDraft(){
    const draft={};
    ['rxHiringOwner','rxHiringEmail','rxReviewDays','rxHiringDate'].forEach(id=>draft[id]=document.getElementById(id)?.value||'');
    ['rxRoleExists','rxRoleFunded','rxRoleReviewed','rxFinalOutcome'].forEach(id=>draft[id]=!!document.getElementById(id)?.checked);
    write(DRAFT_KEY,draft);
  }
  function verificationComplete(){
    const salary=String(document.getElementById('salaryRange')?.value||'').trim();
    const text=['rxHiringOwner','rxHiringEmail','rxReviewDays','rxHiringDate'].every(id=>String(document.getElementById(id)?.value||'').trim());
    const checks=['rxRoleExists','rxRoleFunded','rxRoleReviewed','rxFinalOutcome'].every(id=>document.getElementById(id)?.checked);
    return Boolean(salary && text && checks);
  }
  function updatePreview(){
    const badge=document.getElementById('rxVerificationBadge'); const signals=document.getElementById('rxTrustSignals'); if(!badge||!signals)return;
    const salary=String(document.getElementById('salaryRange')?.value||'').trim(); const review=document.getElementById('rxReviewDays')?.value; const owner=document.getElementById('rxHiringOwner')?.value.trim();
    const chips=[salary?['Salary disclosed',true]:['Salary required',false],owner?['Named hiring owner',true]:['Hiring owner required',false],review?[review,true]:['Response time required',false],document.getElementById('rxFinalOutcome')?.checked?['Final outcome promised',true]:['Outcome promise required',false]];
    signals.innerHTML=chips.map(([label,ok])=>`<span class="rx-trust-chip ${ok?'':'pending'}">${esc(label)}</span>`).join('');
    const complete=verificationComplete(); badge.textContent=complete?'Verified and actively hiring':'Verification in progress'; badge.style.background=complete?'#e1f6eb':'#fff3d6'; badge.style.color=complete?'#176b49':'#8a5600';
  }

  function addOverview(){
    const overview=document.getElementById('overviewPage'); if(!overview||overview.querySelector('.rx-verified-overview'))return;
    const status=read(STATUS_KEY);
    const anchor=overview.querySelector('.two');
    const wrap=document.createElement('div'); wrap.className='rx-verified-overview';
    wrap.innerHTML=`<article class="rx-verified-card"><h2>Verified vacancy standard</h2><p>Rolexa will only mark a vacancy as verified when salary, hiring ownership, review expectations and final-outcome commitments are complete.</p><div class="rx-status-list"><div class="rx-status-row"><b>Current status</b><span class="rx-status-pill">${esc(status.status||'No verified vacancy yet')}</span></div><div class="rx-status-row"><b>Hiring owner</b><span>${esc(status.owner||'Not assigned')}</span></div><div class="rx-status-row"><b>Candidate review promise</b><span>${esc(status.review||'Not set')}</span></div></div></article><article class="rx-verified-card"><h2>Why this matters</h2><p>Candidates should be able to tell whether a role is genuine, actively reviewed and likely to lead to a real hiring decision.</p><button class="primary" type="button" onclick="window.rolexaEmployerShowView('postJob')">Create a verified job</button></article>`;
    if(anchor) anchor.insertAdjacentElement('beforebegin',wrap); else overview.appendChild(wrap);
  }

  addStyles();
  const observer=new MutationObserver(()=>{enhancePostJob();addOverview();});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  enhancePostJob(); addOverview();
})();