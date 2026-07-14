(() => {
  if (window.__rolexaCandidateInterviewInvitations) return;
  window.__rolexaCandidateInterviewInvitations = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  const URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;
  let user = null;
  let slots = [];

  const safe = value => String(value ?? '').replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

  function addStyles(){
    if (document.getElementById('rxCandidateInterviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateInterviewStyles';
    style.textContent = `
      .rx-interview-invite{align-self:flex-start;width:min(520px,92%);background:#fff;border:1px solid rgba(23,107,255,.18);border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(7,16,37,.06)}
      .rx-interview-invite-head{display:flex;gap:11px;align-items:flex-start;margin-bottom:12px}.rx-interview-calendar-icon{width:38px;height:38px;border-radius:11px;background:#EEF3FF;color:#176BFF;display:flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto}.rx-interview-invite h3{font-size:16px;margin:0;color:#071025}.rx-interview-invite p{font-size:12.5px;color:#6B7280;line-height:1.45;margin:4px 0 0}.rx-interview-options{display:grid;gap:8px;margin-top:13px}.rx-interview-option{width:100%;border:1px solid rgba(23,107,255,.18);background:#F7F9FF;color:#101F4A;border-radius:12px;padding:11px 12px;text-align:left;font-weight:800;font-size:13px}.rx-interview-option span{display:block;color:#6B7280;font-size:11.5px;font-weight:600;margin-top:3px}.rx-interview-invite-note{font-size:11.5px;color:#6B7280;margin-top:11px;line-height:1.45}
    `;
    document.head.appendChild(style);
  }

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

  function activeApplicationId(){
    const thread = document.querySelector('[data-candidate-thread].active')?.getAttribute('data-candidate-thread') || '';
    return thread.startsWith('application:') ? thread.slice('application:'.length) : '';
  }

  function dateLabel(value){
    try {
      return new Date(value).toLocaleString('en-GB',{
        weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
      });
    } catch(error){ return ''; }
  }

  function durationLabel(slot){
    const start = new Date(slot.starts_at).getTime();
    const end = new Date(slot.ends_at).getTime();
    const minutes = Math.max(0,Math.round((end-start)/60000));
    return `${minutes} minutes · ${slot.meeting_type || 'Interview'}`;
  }

  async function loadSlots(){
    if (!client || !user) return;
    const result = await client.from('interview_slots')
      .select('id,application_id,starts_at,ends_at,meeting_type,status,created_at')
      .eq('candidate_user_id',user.id)
      .eq('status','available')
      .gte('starts_at',new Date().toISOString())
      .order('starts_at',{ascending:true});
    if (!result.error) slots = result.data || [];
  }

  function render(){
    const body = document.getElementById('chatBody');
    if (!body) return;
    body.querySelector('#rxCandidateInterviewInvite')?.remove();
    const applicationId = activeApplicationId();
    if (!applicationId) return;
    const available = slots.filter(slot => String(slot.application_id) === String(applicationId));
    if (!available.length) return;
    const type = available[0].meeting_type || 'Interview';
    const options = available.map(slot => `<button class="rx-interview-option" type="button" disabled>${safe(dateLabel(slot.starts_at))}<span>${safe(durationLabel(slot))}</span></button>`).join('');
    body.insertAdjacentHTML('beforeend',`<div class="rx-interview-invite" id="rxCandidateInterviewInvite">
      <div class="rx-interview-invite-head"><div class="rx-interview-calendar-icon">◫</div><div><h3>Interview invitation</h3><p>The employer has invited you to choose a time for a ${safe(type.toLowerCase())}.</p></div></div>
      <div class="rx-interview-options">${options}</div>
      <div class="rx-interview-invite-note">Your timezone is used automatically. Selecting and confirming a time is the next scheduling step.</div>
    </div>`);
    body.scrollTop = body.scrollHeight;
  }

  async function refresh(){
    await loadSlots();
    render();
  }

  async function init(){
    addStyles();
    const lib = await loadSupabase();
    client = lib.createClient(URL,KEY);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    document.addEventListener('click',event => {
      if (event.target.closest?.('[data-candidate-thread]')) setTimeout(render,120);
    });
    const observer = new MutationObserver(() => render());
    observer.observe(document.body,{childList:true,subtree:true});
    await refresh();
    setInterval(() => refresh().catch(()=>{}),5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();