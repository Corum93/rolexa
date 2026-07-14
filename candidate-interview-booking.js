(() => {
  if (window.__rolexaCandidateInterviewBooking) return;
  window.__rolexaCandidateInterviewBooking = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  let client = null;
  let user = null;
  let selectedSlotId = '';
  let slots = [];
  let bookings = [];
  let busy = false;
  let chatObserver = null;

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const dateLabel = value => new Date(value).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

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
    const response = await fetch('candidate-profile-sync.js',{cache:'no-store'});
    const text = await response.text();
    const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
    const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
    if (!url || !key) throw new Error('Supabase config unavailable');
    return {url,key};
  }

  function activeApplicationId(){
    const key = document.querySelector('[data-candidate-thread].active')?.getAttribute('data-candidate-thread') || '';
    return key.startsWith('application:') ? key.slice('application:'.length) : '';
  }

  function uniqueSlots(rows){
    const map = new Map();
    for (const slot of rows || []) {
      const key = [slot.application_id,slot.starts_at,slot.ends_at,slot.meeting_type || 'Interview'].join('|');
      if (!map.has(key)) map.set(key,slot);
    }
    return [...map.values()];
  }

  function toast(text,good=false){
    let el = document.getElementById('rolexaActivitySyncStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rolexaActivitySyncStatus';
      el.style.cssText = 'position:fixed;left:50%;bottom:66px;transform:translateX(-50%);z-index:9998;padding:11px 15px;border-radius:999px;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2)';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = good ? '#E1F6EB' : '#FBE4E1';
    el.style.color = good ? '#176B49' : '#A33327';
    el.style.border = good ? '1px solid rgba(34,160,107,.22)' : '1px solid rgba(224,83,63,.22)';
    clearTimeout(window.__rxBookingToast);
    window.__rxBookingToast = setTimeout(() => el.remove(),3500);
  }

  function addStyles(){
    if (document.getElementById('rxInterviewBookingStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxInterviewBookingStyles';
    style.textContent = `
      .rx-booking-option{width:100%;display:flex;gap:10px;align-items:flex-start;text-align:left;cursor:pointer}.rx-booking-option:hover{border-color:#176BFF}.rx-booking-option.selected{border-color:#176BFF;background:#EAF1FF;box-shadow:0 0 0 2px rgba(23,107,255,.10)}
      .rx-booking-radio{width:18px;height:18px;border-radius:50%;border:2px solid #9DB8EE;display:flex;align-items:center;justify-content:center;flex:0 0 auto;margin-top:1px}.rx-booking-option.selected .rx-booking-radio{background:#176BFF;border-color:#176BFF;color:#fff}.rx-booking-copy{min-width:0}.rx-booking-copy span{display:block;color:#6B7280;font-size:11.5px;font-weight:600;margin-top:3px}
      .rx-booking-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px}.rx-booking-selection{font-size:11.5px;color:#6B7280}.rx-booking-confirm{border:0;background:#176BFF;color:#fff;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:900}.rx-booking-confirm:disabled{opacity:.45;cursor:not-allowed}.rx-booking-confirmed{border-color:rgba(34,160,107,.28)!important;background:#FBFFFD!important}.rx-booking-pill{display:inline-flex;background:#E1F6EB;color:#176B49;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;margin-top:10px}
    `;
    document.head.appendChild(style);
  }

  async function loadData(){
    if (!client || !user) return;
    const [slotResult,bookingResult] = await Promise.all([
      client.from('interview_slots').select('id,application_id,starts_at,ends_at,meeting_type,status').eq('candidate_user_id',user.id).in('status',['available','booked']).order('starts_at',{ascending:true}),
      client.from('interview_bookings').select('id,slot_id,application_id,status,booked_at').eq('candidate_user_id',user.id).eq('status','confirmed').order('booked_at',{ascending:false})
    ]);
    slots = slotResult.error ? [] : uniqueSlots(slotResult.data || []);
    bookings = bookingResult.error ? [] : (bookingResult.data || []).map(booking => ({
      ...booking,
      interview_slot: slots.find(slot => String(slot.id) === String(booking.slot_id)) || null
    }));
    if (selectedSlotId && !slots.some(slot => String(slot.id) === String(selectedSlotId) && slot.status === 'available')) selectedSlotId = '';
  }

  function ensureCard(){
    const body = document.getElementById('chatBody');
    if (!body) return null;
    let card = body.querySelector('.rx-interview-card');
    if (!card) {
      card = document.createElement('div');
      card.className = 'rx-interview-card';
      body.appendChild(card);
    }
    return card;
  }

  function render(){
    const applicationId = activeApplicationId();
    if (!applicationId) return;
    const booking = bookings.find(item => String(item.application_id) === String(applicationId) && item.status === 'confirmed');
    let card = document.querySelector('#chatBody .rx-interview-card');
    if (booking && !card) card = ensureCard();
    if (!card) return;
    if (card.classList.contains('rx-booking-enhanced') && !busy) return;
    card.classList.add('rx-booking-enhanced');

    if (booking) {
      const slot = booking.interview_slot || {};
      if (!slot.starts_at) return;
      const minutes = Math.max(0,Math.round((new Date(slot.ends_at)-new Date(slot.starts_at))/60000));
      card.classList.add('rx-booking-confirmed');
      card.innerHTML = `<div class="rx-interview-card-head"><div class="rx-interview-icon">✓</div><div><h3>Interview confirmed</h3><p>Your interview time has been booked successfully.</p></div></div><div class="rx-interview-option selected" style="cursor:default"><b>${safe(dateLabel(slot.starts_at))}</b><span>${safe(`${minutes} minutes · ${slot.meeting_type || 'Interview'}`)}</span></div><div class="rx-booking-pill">Confirmed</div>`;
      return;
    }

    const available = slots.filter(slot => String(slot.application_id) === String(applicationId) && slot.status === 'available');
    if (!available.length) { card.remove(); return; }
    const type = available[0].meeting_type || 'Interview';
    const selected = available.find(slot => String(slot.id) === String(selectedSlotId));
    card.classList.remove('rx-booking-confirmed');
    card.innerHTML = `<div class="rx-interview-card-head"><div class="rx-interview-icon">◫</div><div><h3>Interview invitation</h3><p>The employer has invited you to choose an interview time.</p></div></div><div class="rx-interview-options">${available.map(slot => {
      const minutes = Math.max(0,Math.round((new Date(slot.ends_at)-new Date(slot.starts_at))/60000));
      const isSelected = String(slot.id) === String(selectedSlotId);
      return `<button class="rx-interview-option rx-booking-option ${isSelected?'selected':''}" type="button" data-booking-slot="${safe(slot.id)}"><span class="rx-booking-radio">${isSelected?'✓':''}</span><span class="rx-booking-copy"><b>${safe(dateLabel(slot.starts_at))}</b><span>${safe(`${minutes} minutes · ${type}`)}</span></span></button>`;
    }).join('')}</div><div class="rx-booking-actions"><div class="rx-booking-selection">${selected?`Selected: <b>${safe(dateLabel(selected.starts_at))}</b>`:'Select one available time.'}</div><button class="rx-booking-confirm" type="button" data-booking-confirm ${selected?'':'disabled'}>Confirm interview</button></div><div class="rx-interview-note">Times are shown in your current device timezone. Nothing is booked until you confirm.</div>`;
  }

  async function confirmBooking(){
    if (!selectedSlotId || busy) return;
    const chosen = slots.find(slot => String(slot.id) === String(selectedSlotId));
    if (!chosen) return;
    busy = true;
    const button = document.querySelector('[data-booking-confirm]');
    if (button) { button.disabled = true; button.textContent = 'Confirming...'; }
    const result = await client.rpc('book_interview_slot',{p_slot_id:selectedSlotId});
    if (result.error) {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'Confirm interview'; }
      toast(result.error.message || 'Could not confirm this interview time.');
      return;
    }

    const minutes = Math.max(0,Math.round((new Date(chosen.ends_at)-new Date(chosen.starts_at))/60000));
    await client.from('candidate_messages').insert({
      user_id:user.id,
      thread_key:`application:${chosen.application_id}`,
      sender:'candidate',
      sender_name:'Candidate',
      body:`Interview confirmed: ${dateLabel(chosen.starts_at)} · ${minutes} minutes · ${chosen.meeting_type || 'Interview'}`
    });

    selectedSlotId = '';
    busy = false;
    await loadData();
    const card = document.querySelector('#chatBody .rx-interview-card');
    card?.classList.remove('rx-booking-enhanced');
    render();
    toast('Interview confirmed.',true);
  }

  function bind(){
    document.addEventListener('click',event => {
      const slot = event.target.closest?.('[data-booking-slot]');
      if (slot) {
        selectedSlotId = slot.getAttribute('data-booking-slot') || '';
        const card = document.querySelector('#chatBody .rx-interview-card');
        card?.classList.remove('rx-booking-enhanced');
        render();
        return;
      }
      if (event.target.closest?.('[data-booking-confirm]')) confirmBooking();
    });
  }

  function watchCard(){
    const body = document.getElementById('chatBody');
    if (!body || chatObserver) return;
    chatObserver = new MutationObserver(() => {
      const card = body.querySelector('.rx-interview-card');
      if ((card && !card.classList.contains('rx-booking-enhanced')) || (!card && bookings.some(item => String(item.application_id) === String(activeApplicationId())))) render();
    });
    chatObserver.observe(body,{childList:true});
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
    bind();
    await loadData();
    watchCard();
    document.addEventListener('click',event => {
      if (event.target.closest?.('[data-candidate-thread]')) {
        setTimeout(() => {
          const card = document.querySelector('#chatBody .rx-interview-card');
          card?.classList.remove('rx-booking-enhanced');
          render();
        },0);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();