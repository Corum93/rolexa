(() => {
  if (window.__rolexaCandidateMessagingInbox) return;
  window.__rolexaCandidateMessagingInbox = true;

  const URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client, user, activeThread = '';
  let messages = [], applications = [], jobs = [], interviewSlots = [];
  let employerProfiles = new Map();

  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const time = value => value ? new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
  const initials = value => String(value || 'Company').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'C';

  function loadUnreadBadges(){
    if (document.querySelector('script[src*="message-unread-badges.js"]')) return;
    const script = document.createElement('script');
    script.src = 'message-unread-badges.js?v=2';
    script.defer = true;
    document.body.appendChild(script);
  }

  function addInterviewStyles(){
    if ($('rxCandidateInterviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateInterviewStyles';
    style.textContent = `
      .rx-interview-card{align-self:flex-start;width:min(520px,92%);background:#fff;border:1px solid rgba(23,107,255,.18);border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(7,16,37,.06)}
      .rx-interview-card-head{display:flex;gap:11px;align-items:flex-start;margin-bottom:12px}.rx-interview-icon{width:38px;height:38px;border-radius:11px;background:#EEF3FF;color:#176BFF;display:flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto}.rx-interview-card h3{font-size:16px;margin:0;color:#071025}.rx-interview-card p{font-size:12.5px;color:#6B7280;line-height:1.45;margin:4px 0 0}.rx-interview-options{display:grid;gap:8px;margin-top:13px}.rx-interview-option{border:1px solid rgba(23,107,255,.18);background:#F7F9FF;color:#101F4A;border-radius:12px;padding:11px 12px;font-weight:800;font-size:13px}.rx-interview-option span{display:block;color:#6B7280;font-size:11.5px;font-weight:600;margin-top:3px}.rx-interview-note{font-size:11.5px;color:#6B7280;margin-top:11px;line-height:1.45}
      #messagesPage .rx-candidate-company-thread{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center}
      #messagesPage .rx-candidate-company-avatar{width:48px;height:48px;border-radius:13px;background:#071025;color:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:13px;font-weight:900;box-shadow:0 7px 18px rgba(7,16,37,.13)}
      #messagesPage .rx-candidate-company-avatar img{width:100%;height:100%;display:block;object-fit:contain;background:#071025}
      #messagesPage .rx-candidate-company-copy{min-width:0}
      #messagesPage .rx-candidate-company-copy b{display:block;margin:0 0 4px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #messagesPage .rx-candidate-company-copy p{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    `;
    document.head.appendChild(style);
  }

  function toast(text, good=false){
    let el = $('rolexaActivitySyncStatus');
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
    clearTimeout(window.__rxMessageToast);
    window.__rxMessageToast = setTimeout(() => el.remove(), 3000);
  }

  function loadSupabase(){
    return new Promise((resolve,reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => resolve(window.supabase);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureLayout(){
    const page = $('messagesPage');
    if (!page || $('rxLiveCandidateMessages')) return;
    const card = page.querySelector('.card');
    if (!card) return;
    card.innerHTML = `<div class="thread-wrap" id="rxLiveCandidateMessages">
      <div class="threads" id="threadList"></div>
      <div class="chat">
        <div class="chat-head"><b id="chatName">Messages</b><span class="mini" id="chatSub"></span></div>
        <div class="chat-body" id="chatBody"></div>
        <form class="chat-form" id="chatForm"><input id="chatInput" placeholder="Type a message..."><button class="small-btn primary-mini" type="submit">Send</button></form>
      </div>
    </div>`;
  }

  function applicationAndJob(threadKey){
    if (!threadKey.startsWith('application:')) return {app:null,job:null,profile:null};
    const id = threadKey.split(':')[1];
    const app = applications.find(a => String(a.id) === String(id));
    const job = app && jobs.find(j => String(j.id) === String(app.job_id));
    const profile = job?.employer_user_id ? employerProfiles.get(String(job.employer_user_id)) || null : null;
    return {app,job,profile};
  }

  function label(threadKey){
    if (threadKey === 'support') return {name:'Rolexa Support',sub:'Candidate support',logo:'',initials:'RS'};
    const {app,job,profile} = applicationAndJob(threadKey);
    if (app && job) {
      const name = profile?.company_name || job.company || 'Employer';
      return {
        name,
        sub:`${job.title || 'Application'} · ${app.status || 'Application'}`,
        logo:profile?.logo_url || '',
        initials:initials(name)
      };
    }
    return {name:'Employer',sub:'Application conversation',logo:'',initials:'E'};
  }

  function companyAvatar(info){
    return `<span class="rx-candidate-company-avatar">${info.logo ? `<img src="${safe(info.logo)}" alt="${safe(info.name)} logo">` : safe(info.initials)}</span>`;
  }

  function threadMessages(threadKey){
    return messages.filter(m => (m.thread_key || 'support') === threadKey);
  }

  function candidateCanReply(threadKey){
    const thread = threadMessages(threadKey);
    if (!thread.length) return false;
    const latest = thread[thread.length - 1];
    return latest.sender === 'employer';
  }

  function interviewCard(threadKey){
    if (!threadKey.startsWith('application:')) return '';
    const applicationId = threadKey.slice('application:'.length);
    const available = interviewSlots.filter(slot => String(slot.application_id) === String(applicationId));
    if (!available.length) return '';
    const type = available[0].meeting_type || 'Interview';
    const options = available.map(slot => {
      const start = new Date(slot.starts_at);
      const end = new Date(slot.ends_at);
      const minutes = Math.max(0,Math.round((end-start)/60000));
      const date = start.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      return `<div class="rx-interview-option">${safe(date)}<span>${safe(`${minutes} minutes · ${type}`)}</span></div>`;
    }).join('');
    return `<div class="rx-interview-card">
      <div class="rx-interview-card-head"><div class="rx-interview-icon">◫</div><div><h3>Interview invitation</h3><p>The employer has invited you to choose an interview time.</p></div></div>
      <div class="rx-interview-options">${options}</div>
      <div class="rx-interview-note">Times are shown in your current device timezone. Choosing a slot will be enabled in the next step.</div>
    </div>`;
  }

  function uniqueInterviewSlots(slots){
    const unique = new Map();
    for (const slot of slots || []) {
      const key = [slot.application_id,slot.starts_at,slot.ends_at,slot.meeting_type || 'Interview'].join('|');
      if (!unique.has(key)) unique.set(key,slot);
    }
    return [...unique.values()];
  }

  async function loadData(){
    const [m,a,j] = await Promise.all([
      client.from('candidate_messages').select('*').eq('user_id',user.id).order('created_at',{ascending:true}),
      client.from('candidate_applications').select('id,job_id,status').eq('user_id',user.id),
      client.from('jobs').select('id,title,company,employer_user_id')
    ]);
    if (m.error) throw m.error;
    messages = m.data || [];
    applications = a.data || [];
    jobs = j.error ? [] : (j.data || []);

    employerProfiles = new Map();
    const employerIds = [...new Set(jobs.map(job => job.employer_user_id).filter(Boolean).map(String))];
    if (employerIds.length) {
      const profilesResult = await client.from('employer_profiles').select('user_id,company_name,logo_url').in('user_id',employerIds);
      if (!profilesResult.error) {
        employerProfiles = new Map((profilesResult.data || []).map(profile => [String(profile.user_id),profile]));
      }
    }

    const slotsResult = await client.from('interview_slots')
      .select('id,application_id,starts_at,ends_at,meeting_type,status')
      .eq('candidate_user_id',user.id)
      .eq('status','available')
      .gte('starts_at',new Date().toISOString())
      .order('starts_at',{ascending:true});
    interviewSlots = slotsResult.error ? [] : uniqueInterviewSlots(slotsResult.data || []);
  }

  function render(){
    ensureLayout();
    const messageKeys = messages.map(m => m.thread_key || 'support');
    const slotKeys = interviewSlots.map(slot => `application:${slot.application_id}`);
    const keys = [...new Set([...messageKeys,...slotKeys])];
    const input = $('chatInput');
    const button = $('chatForm')?.querySelector('button');
    if (!keys.length) {
      $('threadList').innerHTML = '<div class="thread active"><b>No messages yet</b><p>Employer messages will appear here.</p></div>';
      $('chatName').textContent = 'Messages';
      $('chatSub').textContent = 'No active conversation';
      $('chatBody').innerHTML = '<div class="empty">No messages yet.</div>';
      if (input) { input.disabled = true; input.placeholder = 'Wait for an employer to message you'; }
      if (button) button.disabled = true;
      return;
    }
    if (!keys.includes(activeThread)) activeThread = keys[keys.length-1];

    const canReply = candidateCanReply(activeThread);
    if (input) {
      input.disabled = !canReply;
      input.placeholder = canReply ? 'Type your reply...' : 'Waiting for the employer to reply...';
      if (!canReply) input.value = '';
    }
    if (button) button.disabled = !canReply;

    $('threadList').innerHTML = keys.map(key => {
      const info = label(key);
      const latest = [...messages].reverse().find(m => (m.thread_key || 'support') === key);
      const hasInvite = interviewCard(key) !== '';
      const waiting = !candidateCanReply(key);
      const preview = latest ? safe(latest.body) : (hasInvite ? 'Interview invitation received' : 'Conversation');
      return `<div class="thread rx-candidate-company-thread ${key===activeThread?'active':''}" data-candidate-thread="${safe(key)}">${companyAvatar(info)}<div class="rx-candidate-company-copy"><b>${safe(info.name)}</b><p>${safe(info.sub)} · ${preview}${waiting?' · Waiting for employer':''}</p></div></div>`;
    }).join('');
    const info = label(activeThread);
    $('chatName').textContent = info.name;
    $('chatSub').textContent = canReply ? `${info.sub} · You can reply now` : `${info.sub} · Waiting for employer reply`;
    const messageHtml = threadMessages(activeThread).map(m => {
      const mine = m.sender === 'candidate';
      const employerName = info.name || 'Employer';
      return `<div class="bubble ${mine?'me':'them'}"><div style="font-size:11px;font-weight:900;opacity:.72;margin-bottom:4px">${safe(mine ? (m.sender_name || 'You') : employerName)} · ${safe(time(m.created_at))}</div>${safe(m.body)}</div>`;
    }).join('');
    $('chatBody').innerHTML = `${messageHtml}${interviewCard(activeThread)}`;
    $('chatBody').scrollTop = $('chatBody').scrollHeight;
  }

  async function refresh(){
    await loadData();
    render();
  }

  async function send(event){
    event.preventDefault();
    const input = $('chatInput');
    const button = event.target.querySelector('button');
    const body = input.value.trim();
    if (!body || !activeThread) return;
    if (!candidateCanReply(activeThread)) return toast('Please wait for the employer to reply before sending another message.');
    button.disabled = true;
    button.textContent = 'Sending...';
    const {error} = await client.from('candidate_messages').insert({
      user_id:user.id,
      thread_key:activeThread,
      sender:'candidate',
      sender_name:'Candidate',
      body
    });
    button.textContent = 'Send';
    if (error) { button.disabled = false; return toast(error.message || 'Could not send reply.'); }
    input.value = '';
    await refresh();
    toast('Reply sent. The employer can now respond.',true);
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    ensureLayout();
    addInterviewStyles();
    loadUnreadBadges();
    const lib = await loadSupabase();
    client = lib.createClient(URL,KEY);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    document.addEventListener('click',e => {
      const thread = e.target.closest?.('[data-candidate-thread]');
      if (!thread) return;
      activeThread = thread.dataset.candidateThread;
      render();
    });
    document.addEventListener('submit',e => { if (e.target.id === 'chatForm') send(e); });
    try { await refresh(); } catch(error) { toast(error.message || 'Could not load messages.'); }
    setInterval(() => refresh().catch(()=>{}),5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();