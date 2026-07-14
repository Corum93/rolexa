(() => {
  if (window.__rolexaCandidateMessagingInbox) return;
  window.__rolexaCandidateMessagingInbox = true;

  const URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client, user, activeThread = '';
  let messages = [], applications = [], jobs = [];

  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const time = value => value ? new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

  function loadUnreadBadges(){
    if (document.querySelector('script[src*="message-unread-badges.js"]')) return;
    const script = document.createElement('script');
    script.src = 'message-unread-badges.js?v=2';
    script.defer = true;
    document.body.appendChild(script);
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

  function label(threadKey){
    if (threadKey === 'support') return {name:'Rolexa Support',sub:'Candidate support'};
    if (threadKey.startsWith('application:')) {
      const id = threadKey.split(':')[1];
      const app = applications.find(a => a.id === id);
      const job = app && jobs.find(j => j.id === app.job_id);
      return {name: job?.company || 'Employer', sub: job ? `${job.title} · ${app.status}` : 'Application conversation'};
    }
    return {name:'Message thread',sub:'Conversation'};
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

  async function loadData(){
    const [m,a,j] = await Promise.all([
      client.from('candidate_messages').select('*').eq('user_id',user.id).order('created_at',{ascending:true}),
      client.from('candidate_applications').select('id,job_id,status').eq('user_id',user.id),
      client.from('jobs').select('id,title,company')
    ]);
    if (m.error) throw m.error;
    messages = m.data || [];
    applications = a.data || [];
    jobs = j.data || [];
  }

  function render(){
    ensureLayout();
    const keys = [...new Set(messages.map(m => m.thread_key || 'support'))];
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
      const waiting = !candidateCanReply(key);
      return `<div class="thread ${key===activeThread?'active':''}" data-candidate-thread="${safe(key)}"><b>${safe(info.name)}</b><p>${safe(info.sub)}${latest?' · '+safe(latest.body):''}${waiting?' · Waiting for employer':''}</p></div>`;
    }).join('');
    const info = label(activeThread);
    $('chatName').textContent = info.name;
    $('chatSub').textContent = canReply ? `${info.sub} · You can reply now` : `${info.sub} · Waiting for employer reply`;
    $('chatBody').innerHTML = threadMessages(activeThread).map(m => {
      const mine = m.sender === 'candidate';
      return `<div class="bubble ${mine?'me':'them'}"><div style="font-size:11px;font-weight:900;opacity:.72;margin-bottom:4px">${safe(m.sender_name || (mine?'You':'Employer'))} · ${safe(time(m.created_at))}</div>${safe(m.body)}</div>`;
    }).join('');
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