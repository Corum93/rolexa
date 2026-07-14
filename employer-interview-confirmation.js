(() => {
  if (window.__rolexaEmployerInterviewConfirmation) return;
  window.__rolexaEmployerInterviewConfirmation = true;
  if (!/employer-dashboard\.html$/.test(location.pathname)) return;

  let client = null;
  let user = null;
  let bookings = [];
  let observer = null;
  let rendering = false;

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const dateLabel = value => new Date(value).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

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
    for (const file of ['employer-job-sync.js?v=2','candidate-profile-sync.js']) {
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
    if (document.getElementById('rxEmployerInterviewConfirmationStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerInterviewConfirmationStyles';
    style.textContent = `
      .rx-employer-interview-confirmed{align-self:flex-start;width:min(520px,92%);background:#FBFFFD;border:1px solid rgba(34,160,107,.28);border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(7,16,37,.06);margin-top:4px}
      .rx-employer-interview-head{display:flex;gap:11px;align-items:flex-start}.rx-employer-interview-icon{width:38px;height:38px;border-radius:11px;background:#E1F6EB;color:#176B49;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;flex:0 0 auto}.rx-employer-interview-confirmed h3{font-size:16px;margin:0;color:#071025}.rx-employer-interview-confirmed p{font-size:12.5px;color:#6B7280;line-height:1.45;margin:4px 0 0}
      .rx-employer-interview-detail{margin-top:13px;border:1px solid rgba(34,160,107,.20);background:#fff;border-radius:12px;padding:12px;color:#101F4A;font-size:13px;font-weight:900}.rx-employer-interview-detail span{display:block;color:#6B7280;font-size:11.5px;font-weight:600;margin-top:4px}.rx-employer-interview-pill{display:inline-flex;background:#E1F6EB;color:#176B49;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;margin-top:11px}
    `;
    document.head.appendChild(style);
  }

  function activeApplicationId(){
    const key = document.querySelector('[data-employer-thread].active')?.getAttribute('data-employer-thread') || '';
    return key.startsWith('application:') ? key.slice('application:'.length) : '';
  }

  async function loadBookings(){
    if (!client || !user) return;
    const bookingResult = await client.from('interview_bookings')
      .select('id,slot_id,application_id,status,booked_at')
      .eq('employer_user_id',user.id)
      .eq('status','confirmed')
      .order('booked_at',{ascending:false});
    if (bookingResult.error) { bookings = []; return; }

    const rows = bookingResult.data || [];
    const slotIds = [...new Set(rows.map(row => row.slot_id).filter(Boolean))];
    let slots = [];
    if (slotIds.length) {
      const slotResult = await client.from('interview_slots')
        .select('id,starts_at,ends_at,meeting_type,status')
        .in('id',slotIds);
      if (!slotResult.error) slots = slotResult.data || [];
    }
    bookings = rows.map(booking => ({
      ...booking,
      interview_slot: slots.find(slot => String(slot.id) === String(booking.slot_id)) || null
    }));
  }

  function render(){
    if (rendering) return;
    const body = document.getElementById('rxEmployerChatBody');
    const applicationId = activeApplicationId();
    if (!body || !applicationId) return;
    const existing = body.querySelector('.rx-employer-interview-confirmed');
    const booking = bookings.find(item => String(item.application_id) === String(applicationId));
    if (!booking) { existing?.remove(); return; }
    const slot = booking.interview_slot || {};
    if (!slot.starts_at) return;
    const minutes = Math.max(0,Math.round((new Date(slot.ends_at)-new Date(slot.starts_at))/60000));
    const html = `<div class="rx-employer-interview-head"><div class="rx-employer-interview-icon">✓</div><div><h3>Interview confirmed</h3><p>The candidate has selected and confirmed this interview time.</p></div></div><div class="rx-employer-interview-detail">${safe(dateLabel(slot.starts_at))}<span>${safe(`${minutes} minutes · ${slot.meeting_type || 'Interview'}`)}</span></div><div class="rx-employer-interview-pill">Confirmed</div>`;
    rendering = true;
    if (existing) existing.innerHTML = html;
    else {
      const card = document.createElement('div');
      card.className = 'rx-employer-interview-confirmed';
      card.innerHTML = html;
      body.appendChild(card);
      body.scrollTop = body.scrollHeight;
    }
    rendering = false;
  }

  function watchChat(){
    const body = document.getElementById('rxEmployerChatBody');
    if (!body || observer) return;
    observer = new MutationObserver(() => { if (!rendering) queueMicrotask(render); });
    observer.observe(body,{childList:true});
  }

  async function refresh(){
    await loadBookings();
    watchChat();
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
    document.addEventListener('click',event => {
      if (event.target.closest?.('[data-employer-thread]')) setTimeout(render,60);
    });
    await refresh();
    setInterval(() => refresh().catch(()=>{}),5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();