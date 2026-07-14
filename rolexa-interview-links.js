(() => {
  if (window.__rolexaInterviewLinks) return;
  window.__rolexaInterviewLinks = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  let client = null;
  let user = null;
  let rows = [];
  let saving = false;

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));

  function loadSupabase(){
    return new Promise((resolve,reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
    throw new Error('Supabase config unavailable');
  }

  function addStyles(){
    if (document.getElementById('rxInterviewLinkStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxInterviewLinkStyles';
    style.textContent = `
      .rx-meeting-link-area{margin-top:12px;padding-top:12px;border-top:1px solid rgba(7,16,37,.09)}
      .rx-meeting-link-panel{margin-top:12px;padding:14px;border:1px solid rgba(23,107,255,.18);border-radius:14px;background:#F7F9FF}
      .rx-meeting-link-panel-title{font-size:13px;font-weight:900;margin-bottom:8px;color:#071025}
      .rx-meeting-link-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .rx-meeting-link-input{flex:1;min-width:220px;border:1px solid rgba(7,16,37,.14);border-radius:11px;padding:10px 12px;font:inherit;background:#fff}
      .rx-meeting-link-save,.rx-join-interview{border:0;border-radius:999px;padding:10px 15px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
      .rx-meeting-link-save,.rx-join-interview{background:#176BFF;color:#fff}
      .rx-meeting-link-save[disabled]{opacity:.55;cursor:not-allowed}
      .rx-meeting-pending{font-size:12.5px;color:#6B7280;font-weight:700}
      .rx-meeting-link-error{font-size:12px;color:#A33327;margin-top:7px;font-weight:700}
      .rx-calendar-event .rx-meeting-link-area{grid-column:2 / -1;margin-top:2px}
      @media(max-width:760px){.rx-meeting-link-form{align-items:stretch}.rx-meeting-link-input,.rx-meeting-link-save{width:100%}}
    `;
    document.head.appendChild(style);
  }

  async function loadRows(){
    const result = await client.from('interview_bookings')
      .select('id,application_id,slot_id,status,booked_at,meeting_url')
      .eq(isCandidate ? 'candidate_user_id' : 'employer_user_id',user.id)
      .eq('status','confirmed')
      .order('booked_at',{ascending:false});
    if (result.error) throw result.error;
    rows = result.data || [];
  }

  function activeApplicationId(){
    const attr = isCandidate ? 'data-candidate-thread' : 'data-employer-thread';
    const key = document.querySelector(`[${attr}].active`)?.getAttribute(attr) || '';
    return key.startsWith('application:') ? key.slice('application:'.length) : '';
  }

  function actionHtml(row){
    if (row.meeting_url) {
      return `<div class="rx-meeting-link-area"><a class="rx-join-interview" href="${safe(row.meeting_url)}" target="_blank" rel="noopener noreferrer">Join interview</a></div>`;
    }
    if (isCandidate) {
      return '<div class="rx-meeting-link-area"><span class="rx-meeting-pending">Meeting link will be added by the employer.</span></div>';
    }
    return `<div class="rx-meeting-link-area"><form class="rx-meeting-link-form" data-booking-id="${safe(row.id)}"><input class="rx-meeting-link-input" type="url" required placeholder="Paste Zoom, Google Meet or Teams link" aria-label="Interview meeting link"><button class="rx-meeting-link-save" type="submit">Save interview link</button></form><div class="rx-meeting-link-error" hidden></div></div>`;
  }

  function stableEmployerPanel(id,row,title){
    let panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = id;
      panel.className = 'rx-meeting-link-panel';
    }
    panel.innerHTML = `<div class="rx-meeting-link-panel-title">${safe(title)}</div>${actionHtml(row)}`;
    return panel;
  }

  function enhanceMessageCard(){
    const applicationId = activeApplicationId();
    if (!applicationId) return;
    const row = rows.find(item => String(item.application_id) === String(applicationId));
    if (!row) return;

    if (isEmployer) {
      const form = document.getElementById('rxEmployerChatForm');
      if (!form?.parentElement) return;
      const panel = stableEmployerPanel('rxEmployerMeetingLinkPanel',row,row.meeting_url ? 'Interview meeting link' : 'Add interview meeting link');
      if (!panel.isConnected) form.parentElement.insertBefore(panel,form);
      return;
    }

    const card = document.querySelector('#chatBody .rx-booking-confirmed');
    if (!card) return;
    let area = card.querySelector('.rx-meeting-link-area');
    const desired = actionHtml(row);
    if (!area) card.insertAdjacentHTML('beforeend',desired);
    else if (row.meeting_url && !area.querySelector('.rx-join-interview')) area.outerHTML = desired;
  }

  function enhanceCalendarCards(){
    if (isEmployer) {
      const card = document.getElementById('rxEmployerCalendarCard');
      const row = rows[0];
      if (!card || !row) return;
      const panel = stableEmployerPanel('rxEmployerCalendarMeetingLinkPanel',row,row.meeting_url ? 'Interview meeting link' : 'Add interview meeting link');
      if (!panel.isConnected) card.appendChild(panel);
      return;
    }

    const cards = [...document.querySelectorAll('.rx-calendar-event')];
    if (!cards.length) return;
    const ordered = [...rows].sort((a,b) => new Date(a.booked_at)-new Date(b.booked_at));
    cards.forEach((card,index) => {
      const row = ordered[index] || rows[index];
      if (!row) return;
      let area = card.querySelector('.rx-meeting-link-area');
      const desired = actionHtml(row);
      if (!area) card.insertAdjacentHTML('beforeend',desired);
      else if (row.meeting_url && !area.querySelector('.rx-join-interview')) area.outerHTML = desired;
    });
  }

  function render(){
    enhanceMessageCard();
    enhanceCalendarCards();
  }

  window.__rolexaInterviewLinksRender = render;

  async function saveLink(form){
    if (saving) return;
    const input = form.querySelector('.rx-meeting-link-input');
    const button = form.querySelector('.rx-meeting-link-save');
    const errorBox = form.parentElement.querySelector('.rx-meeting-link-error');
    const url = input.value.trim();
    if (!/^https:\/\/\S+$/i.test(url)) {
      errorBox.hidden = false;
      errorBox.textContent = 'Enter a valid HTTPS meeting link.';
      return;
    }
    saving = true;
    button.disabled = true;
    button.textContent = 'Saving…';
    errorBox.hidden = true;
    const result = await client.rpc('set_interview_meeting_url',{p_booking_id:form.dataset.bookingId,p_meeting_url:url});
    saving = false;
    button.disabled = false;
    button.textContent = 'Save interview link';
    if (result.error) {
      errorBox.hidden = false;
      errorBox.textContent = result.error.message || 'Could not save the interview link.';
      return;
    }
    await loadRows();
    document.querySelectorAll('.rx-meeting-link-panel,.rx-meeting-link-area').forEach(node => node.remove());
    render();
  }

  function bind(){
    document.addEventListener('submit',event => {
      const form = event.target.closest?.('.rx-meeting-link-form');
      if (!form) return;
      event.preventDefault();
      saveLink(form).catch(()=>{});
    });
  }

  async function refresh(){
    await loadRows();
    render();
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
    await refresh();
    setInterval(() => refresh().catch(()=>{}),5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();