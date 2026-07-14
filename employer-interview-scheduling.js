(() => {
  if (window.__rolexaEmployerInterviewScheduling) return;
  window.__rolexaEmployerInterviewScheduling = true;
  if (!/employer-dashboard\.html$/.test(location.pathname)) return;

  let client = null;
  let user = null;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  function addStyles(){
    if (byId('rxInterviewSchedulingStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxInterviewSchedulingStyles';
    style.textContent = `
      .rx-chat-head-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.rx-interview-btn{border:1px solid rgba(23,107,255,.22);background:#EEF3FF;color:#2946C7;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;white-space:nowrap}.rx-interview-btn:hover{background:#E2EAFF}
      .rx-interview-backdrop{position:fixed;inset:0;background:rgba(7,16,37,.62);display:flex;align-items:center;justify-content:center;padding:22px;z-index:10050}.rx-interview-modal{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 90px rgba(7,16,37,.3)}.rx-interview-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid rgba(7,16,37,.1)}.rx-interview-head h2{font-size:24px}.rx-interview-head p{margin:5px 0 0;color:#6B7280;font-size:13px;line-height:1.45}.rx-interview-close{border:1px solid rgba(7,16,37,.1);background:#fff;border-radius:999px;padding:8px 12px;font-weight:900}.rx-interview-body{padding:22px 24px;display:grid;gap:16px}.rx-slot-list{display:grid;gap:10px}.rx-slot-row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center}.rx-slot-row input,.rx-interview-body select{width:100%;border:1px solid rgba(7,16,37,.12);border-radius:12px;background:#F5F7FC;padding:12px 13px;font-size:14px;color:#071025}.rx-slot-remove{border:1px solid rgba(224,83,63,.22);background:#fff;color:#A33327;border-radius:11px;padding:11px 12px;font-weight:900}.rx-interview-note{font-size:12.5px;color:#6B7280;line-height:1.5}.rx-interview-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.rx-interview-actions-right{display:flex;gap:8px;flex-wrap:wrap}.rx-interview-secondary{border:1px solid rgba(7,16,37,.12);background:#fff;color:#071025;border-radius:999px;padding:10px 14px;font-weight:900}.rx-interview-primary{border:0;background:#176BFF;color:#fff;border-radius:999px;padding:10px 16px;font-weight:900}.rx-interview-primary:disabled{opacity:.55;cursor:not-allowed}
      @media(max-width:620px){.rx-slot-row{grid-template-columns:1fr}.rx-chat-head-row{align-items:flex-start;flex-direction:column}.rx-interview-actions{display:grid}.rx-interview-actions-right{display:grid}}
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase(){
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  async function readConfig(){
    for (const file of ['candidate-profile-sync.js','employer-job-sync.js?v=2']) {
      try {
        const response = await fetch(file,{cache:'no-store'});
        const text = await response.text();
        const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
        const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
        if (url && key) return {url,key};
      } catch(error) {}
    }
    throw new Error('Supabase config could not be found.');
  }

  function showStatus(message,type='info'){
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => { if (bar.textContent === message) bar.className = 'statusbar'; },4500);
  }

  function activeApplicationId(){
    const thread = document.querySelector('[data-employer-thread].active')?.getAttribute('data-employer-thread') || '';
    return thread.startsWith('application:') ? thread.slice('application:'.length) : '';
  }

  function localInputValue(date){
    const pad = n => String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function defaultSlots(){
    const base = new Date();
    base.setSeconds(0,0);
    base.setMinutes(base.getMinutes() < 30 ? 30 : 60);
    base.setDate(base.getDate()+1);
    base.setHours(10,0,0,0);
    return [0,1,2].map(offset => {
      const d = new Date(base);
      d.setDate(base.getDate()+offset);
      return localInputValue(d);
    });
  }

  function slotRow(value=''){
    return `<div class="rx-slot-row"><input class="rx-slot-input" type="datetime-local" value="${safe(value)}" required><button class="rx-slot-remove" type="button">Remove</button></div>`;
  }

  async function applicationContext(applicationId){
    const application = await client.from('candidate_applications').select('id,user_id,job_id,status').eq('id',applicationId).single();
    if (application.error) throw application.error;
    const job = await client.from('jobs').select('id,title,company,employer_user_id').eq('id',application.data.job_id).single();
    if (job.error) throw job.error;
    if (job.data.employer_user_id !== user.id) throw new Error('You do not have access to schedule this interview.');
    return {application:application.data,job:job.data};
  }

  async function openModal(){
    const applicationId = activeApplicationId();
    if (!applicationId) return showStatus('Open a candidate conversation before proposing interview times.','bad');
    let context;
    try { context = await applicationContext(applicationId); }
    catch(error){ return showStatus(error.message || 'Could not load this application.','bad'); }

    const defaults = defaultSlots();
    document.body.insertAdjacentHTML('beforeend',`<div class="rx-interview-backdrop" id="rxInterviewModal">
      <div class="rx-interview-modal" role="dialog" aria-modal="true" aria-labelledby="rxInterviewTitle">
        <div class="rx-interview-head"><div><h2 id="rxInterviewTitle">Propose interview times</h2><p>${safe(context.job.title || 'Application')} at ${safe(context.job.company || 'Employer')} · Times use your current device timezone</p></div><button class="rx-interview-close" type="button" data-close-interview>Close</button></div>
        <div class="rx-interview-body">
          <div><label style="font-size:12px;font-weight:900;color:#101F4A;text-transform:uppercase;letter-spacing:.04em">Choose interview options</label><div class="rx-slot-list" id="rxSlotList">${defaults.map(slotRow).join('')}</div></div>
          <button class="rx-interview-secondary" id="rxAddSlot" type="button">+ Add another time</button>
          <div><label style="font-size:12px;font-weight:900;color:#101F4A;text-transform:uppercase;letter-spacing:.04em">Interview duration</label><select id="rxInterviewDuration"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
          <div><label style="font-size:12px;font-weight:900;color:#101F4A;text-transform:uppercase;letter-spacing:.04em">Interview type</label><select id="rxInterviewType"><option value="Video interview">Video interview</option><option value="Phone call">Phone call</option><option value="In person">In person</option></select></div>
          <div class="rx-interview-note">Choose between 2 and 5 future options. The candidate will see these as an interview invitation inside Rolexa.</div>
          <div class="rx-interview-actions"><span></span><div class="rx-interview-actions-right"><button class="rx-interview-secondary" type="button" data-close-interview>Cancel</button><button class="rx-interview-primary" id="rxSaveInterviewSlots" type="button" data-application-id="${safe(applicationId)}">Save proposed times</button></div></div>
        </div>
      </div></div>`);
  }

  function closeModal(){ byId('rxInterviewModal')?.remove(); }

  async function saveSlots(button){
    const applicationId = button.getAttribute('data-application-id');
    const inputs = [...document.querySelectorAll('.rx-slot-input')];
    const values = [...new Set(inputs.map(input => input.value).filter(Boolean))];
    if (values.length < 2 || values.length > 5) return showStatus('Please provide between 2 and 5 different interview times.','bad');

    const starts = values.map(value => new Date(value));
    if (starts.some(date => Number.isNaN(date.getTime()) || date <= new Date())) return showStatus('Every proposed time must be in the future.','bad');

    let context;
    try { context = await applicationContext(applicationId); }
    catch(error){ return showStatus(error.message || 'Could not load this application.','bad'); }

    const duration = Number(byId('rxInterviewDuration')?.value || 30);
    const meetingType = byId('rxInterviewType')?.value || 'Video interview';
    const rows = starts.map(start => ({
      application_id:context.application.id,
      employer_user_id:user.id,
      candidate_user_id:context.application.user_id,
      starts_at:start.toISOString(),
      ends_at:new Date(start.getTime()+duration*60000).toISOString(),
      meeting_type:meetingType,
      status:'available'
    }));

    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    const result = await client.from('interview_slots').insert(rows);
    button.disabled = false;
    button.textContent = previous;
    if (result.error) return showStatus(result.error.message || 'Could not save interview times.','bad');
    closeModal();
    showStatus(`${rows.length} ${meetingType.toLowerCase()} times saved for the candidate.`, 'good');
  }

  function ensureButton(){
    const head = byId('rxEmployerChatName')?.parentElement;
    if (!head || byId('rxProposeInterviewTimes')) return;
    const existingName = byId('rxEmployerChatName');
    const existingSub = byId('rxEmployerChatSub');
    const textWrap = document.createElement('div');
    existingName.before(textWrap);
    textWrap.append(existingName,existingSub);
    head.classList.add('rx-chat-head-row');
    const button = document.createElement('button');
    button.id = 'rxProposeInterviewTimes';
    button.className = 'rx-interview-btn';
    button.type = 'button';
    button.textContent = 'Propose interview times';
    head.appendChild(button);
  }

  function bind(){
    document.addEventListener('click',event => {
      if (event.target.closest?.('#rxProposeInterviewTimes')) openModal();
      if (event.target.closest?.('[data-close-interview]') || event.target.id === 'rxInterviewModal') closeModal();
      if (event.target.closest?.('#rxAddSlot')) {
        const list = byId('rxSlotList');
        if (!list) return;
        if (list.children.length >= 5) return showStatus('You can propose a maximum of 5 times.','bad');
        list.insertAdjacentHTML('beforeend',slotRow(''));
      }
      const remove = event.target.closest?.('.rx-slot-remove');
      if (remove) {
        const list = byId('rxSlotList');
        if (list?.children.length <= 2) return showStatus('Keep at least 2 interview options.','bad');
        remove.closest('.rx-slot-row')?.remove();
      }
      const save = event.target.closest?.('#rxSaveInterviewSlots');
      if (save) saveSlots(save);
    });
  }

  async function init(){
    addStyles();
    bind();
    const lib = await loadSupabase();
    const config = await readConfig();
    client = lib.createClient(config.url,config.key);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    const observer = new MutationObserver(ensureButton);
    observer.observe(document.body,{childList:true,subtree:true});
    ensureButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();