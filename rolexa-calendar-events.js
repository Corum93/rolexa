(() => {
  if (window.__rolexaCalendarEvents) return;
  window.__rolexaCalendarEvents = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  let client = null;
  let user = null;
  let rows = [];

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const dayNumber = value => new Date(value).toLocaleDateString('en-GB',{day:'2-digit'});
  const dateText = value => new Date(value).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const timeText = value => new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

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
    if (document.getElementById('rxCalendarEventStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCalendarEventStyles';
    style.textContent = `
      .rx-calendar-list{display:grid;gap:10px}.rx-calendar-event{border:1px solid rgba(7,16,37,.09);border-radius:15px;padding:13px;display:grid;grid-template-columns:45px 1fr auto;gap:12px;align-items:center;background:#fff}.rx-calendar-date{width:45px;height:45px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#176BFF;color:#fff;font-weight:900}.rx-calendar-title{font-size:14px;font-weight:900}.rx-calendar-sub{font-size:12.5px;color:#6B7280;margin-top:3px;line-height:1.4}.rx-calendar-tag{font-size:12px;font-weight:900;background:#E1F6EB;color:#176B49;border-radius:999px;padding:5px 9px;white-space:nowrap}.rx-calendar-empty{border:1px dashed rgba(7,16,37,.12);border-radius:15px;padding:22px;text-align:center;color:#6B7280;font-size:13px;line-height:1.5}.rx-employer-calendar-card{margin-top:16px}.rx-employer-calendar-card h2{font-size:19px;margin-bottom:14px}@media(max-width:760px){.rx-calendar-event{grid-template-columns:42px 1fr}.rx-calendar-tag{grid-column:2;justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  async function optionalMap(table,select,ids,keyField='id'){
    if (!ids.length) return new Map();
    try {
      const result = await client.from(table).select(select).in(keyField,ids);
      if (result.error) return new Map();
      return new Map((result.data || []).map(item => [String(item[keyField]),item]));
    } catch(error) { return new Map(); }
  }

  async function loadRows(){
    const bookingResult = await client.from('interview_bookings')
      .select('id,application_id,slot_id,status,booked_at')
      .eq(isCandidate?'candidate_user_id':'employer_user_id',user.id)
      .eq('status','confirmed')
      .order('booked_at',{ascending:false});
    if (bookingResult.error) throw bookingResult.error;
    const bookings = bookingResult.data || [];
    if (!bookings.length) return [];

    const slotIds = [...new Set(bookings.map(item => item.slot_id).filter(Boolean))];
    const slotResult = await client.from('interview_slots').select('id,starts_at,ends_at,meeting_type').in('id',slotIds);
    if (slotResult.error) throw slotResult.error;
    const slotMap = new Map((slotResult.data || []).map(item => [String(item.id),item]));

    const appIds = [...new Set(bookings.map(item => item.application_id).filter(Boolean))];
    const appMap = await optionalMap('candidate_applications','id,user_id,job_id',appIds);
    const applications = [...appMap.values()];
    const jobIds = [...new Set(applications.map(item => item.job_id).filter(Boolean))];
    const candidateIds = [...new Set(applications.map(item => item.user_id).filter(Boolean))];
    const jobMap = await optionalMap('jobs','id,title,company',jobIds);
    const profileMap = isEmployer ? await optionalMap('candidate_profiles','user_id,full_name,email',candidateIds,'user_id') : new Map();

    return bookings.map(booking => {
      const slot = slotMap.get(String(booking.slot_id)) || {};
      const application = appMap.get(String(booking.application_id)) || {};
      const job = jobMap.get(String(application.job_id)) || {};
      const profile = profileMap.get(String(application.user_id)) || {};
      return {booking,slot,application,job,profile};
    }).filter(row => row.slot.starts_at && new Date(row.slot.ends_at || row.slot.starts_at) >= new Date())
      .sort((a,b) => new Date(a.slot.starts_at)-new Date(b.slot.starts_at));
  }

  function eventHtml(row){
    const minutes = Math.max(0,Math.round((new Date(row.slot.ends_at)-new Date(row.slot.starts_at))/60000));
    const title = isCandidate ? `${row.job.title || 'Interview'} interview` : `${row.profile.full_name || row.profile.email || 'Candidate'} interview`;
    const secondary = isCandidate ? (row.job.company || 'Employer') : (row.job.title || 'Application');
    return `<div class="rx-calendar-event"><div class="rx-calendar-date">${safe(dayNumber(row.slot.starts_at))}</div><div><div class="rx-calendar-title">${safe(title)}</div><div class="rx-calendar-sub">${safe(dateText(row.slot.starts_at))} · ${safe(timeText(row.slot.starts_at))}<br>${safe(secondary)} · ${safe(`${minutes} minutes · ${row.slot.meeting_type || 'Interview'}`)}</div></div><span class="rx-calendar-tag">Confirmed</span></div>`;
  }

  function candidateContainer(){
    const heading = [...document.querySelectorAll('#overviewPage .card h2')].find(node => node.textContent.trim() === 'Upcoming');
    const card = heading?.closest('.card');
    if (!card) return null;
    let list = card.querySelector('.rx-calendar-list');
    if (!list) {
      list = document.createElement('div');
      list.className = 'rx-calendar-list';
      const old = card.querySelector('.list');
      if (old) old.replaceWith(list); else card.appendChild(list);
    }
    return list;
  }

  function employerContainer(){
    const overview = document.getElementById('overviewPage');
    if (!overview) return null;
    let card = document.getElementById('rxEmployerCalendarCard');
    if (!card) {
      card = document.createElement('article');
      card.id = 'rxEmployerCalendarCard';
      card.className = 'card rx-employer-calendar-card';
      card.innerHTML = '<h2>Upcoming interviews</h2><div class="rx-calendar-list"></div>';
      overview.appendChild(card);
    }
    return card.querySelector('.rx-calendar-list');
  }

  function render(){
    const container = isCandidate ? candidateContainer() : employerContainer();
    if (!container) return;
    container.innerHTML = rows.length ? rows.map(eventHtml).join('') : '<div class="rx-calendar-empty">No confirmed upcoming interviews yet.</div>';
  }

  async function refresh(){
    rows = await loadRows();
    render();
  }

  async function init(){
    addStyles();
    const lib = await loadSupabase();
    const config = await readConfig();
    client = lib.createClient(config.url,config.key);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    await refresh();
    setInterval(() => refresh().catch(()=>{}),5000);
    setInterval(render,1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();