(() => {
  if (window.__rolexaCandidateMessagingInbox) return;
  window.__rolexaCandidateMessagingInbox = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let messages = [];
  let applications = [];
  let jobs = [];
  let activeThread = '';

  function byId(id){ return document.getElementById(id); }
  function safe(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
  function timeText(value){ try { return value ? new Date(value).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''; } catch(e){ return ''; } }

  function showStatus(kind, text){
    let el = document.getElementById('rolexaActivitySyncStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rolexaActivitySyncStatus';
      el.style.cssText = 'position:fixed;left:50%;bottom:66px;transform:translateX(-50%);z-index:9998;padding:11px 15px;border-radius:999px;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    if (kind === 'good') { el.style.background = '#E1F6EB'; el.style.color = '#176B49'; el.style.border = '1px solid rgba(34,160,107,.22)'; }
    else if (kind === 'bad') { el.style.background = '#FBE4E1'; el.style.color = '#A33327'; el.style.border = '1px solid rgba(224,83,63,.22)'; }
    else { el.style.background = '#EEF3FF'; el.style.color = '#2946C7'; el.style.border = '1px solid rgba(76,116,255,.22)'; }
    clearTimeout(window.__rolexaCandidateInboxStatusTimer);
    window.__rolexaCandidateInboxStatusTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
  }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function threadLabel(threadKey){
    if (threadKey === 'support') return { name: 'Rolexa Support', sub: 'Candidate support' };
    if (threadKey && threadKey.startsWith('application:')) {
      const applicationId = threadKey.split(':')[1];
      const app = applications.find(item => item.id === applicationId);
      const job = app ? jobs.find(item => item.id === app.job_id) : null;
      return {
        name: job ? job.company || 'Employer' : 'Employer message',
        sub: job ? `${job.title || 'Application'} · ${app.status || 'Application'}` : 'Application conversation'
      };
    }
    return { name: threadKey || 'Message thread', sub: 'Conversation' };
  }

  async function loadData(){
    if (!client || !user) return false;
    const [messagesRes, appsRes, jobsRes] = await Promise.all([
      client.from('candidate_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      client.from('candidate_applications').select('id,job_id,status').eq('user_id', user.id),
      client.from('jobs').select('id,title,company')
    ]);
    if (messagesRes.error) {
      showStatus('bad', messagesRes.error.message || 'Could not load candidate messages.');
      return false;
    }
    messages = messagesRes.data || [];
    applications = appsRes.error ? [] : (appsRes.data || []);
    jobs = jobsRes.error ? [] : (jobsRes.data || []);
    return true;
  }

  function renderMessages(){
    const threadList = byId('threadList');
    const chatBody = byId('chatBody');
    const chatName = byId('chatName');
    const chatSub = byId('chatSub');
    if (!threadList || !chatBody || !chatName || !chatSub) return;

    const keys = [...new Set(messages.map(message => message.thread_key || 'support'))];
    if (!keys.length) {
      threadList.innerHTML = '<div class="thread active"><b>No messages yet</b><p>Employer messages will appear here once you are shortlisted.</p></div>';
      chatName.textContent = 'Messages';
      chatSub.textContent = 'No active conversation';
      chatBody.innerHTML = '<div class="empty">No messages yet. When an employer contacts you, the conversation will appear here.</div>';
      return;
    }

    if (!activeThread || !keys.includes(activeThread)) activeThread = keys[keys.length - 1];

    threadList.innerHTML = keys.map(key => {
      const label = threadLabel(key);
      const latest = [...messages].reverse().find(message => (message.thread_key || 'support') === key);
      const latestText = latest ? latest.body : '';
      return `<div class="thread ${key === activeThread ? 'active' : ''}" data-candidate-thread="${safe(key)}"><b>${safe(label.name)}</b><p>${safe(label.sub)}${latestText ? ' · ' + safe(latestText) : ''}</p></div>`;
    }).join('');

    const label = threadLabel(activeThread);
    chatName.textContent = label.name;
    chatSub.textContent = label.sub;
    chatBody.innerHTML = messages
      .filter(message => (message.thread_key || 'support') === activeThread)
      .map(message => {
        const mine = message.sender === 'candidate';
        const meta = `${message.sender_name || (mine ? 'You' : 'Employer')} ${timeText(message.created_at) ? '· ' + timeText(message.created_at) : ''}`;
        return `<div class="bubble ${mine ? 'me' : 'them'}"><div style="font-size:11px;font-weight:900;opacity:.72;margin-bottom:4px">${safe(meta)}</div>${safe(message.body)}</div>`;
      })
      .join('');
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function refresh(){
    const ok = await loadData();
    if (ok) renderMessages();
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const sessionRes = await client.auth.getSession();
      user = sessionRes.data && sessionRes.data.session && sessionRes.data.session.user;
      if (!user) return;

      document.addEventListener('click', event => {
        const thread = event.target && event.target.closest('[data-candidate-thread]');
        if (thread) {
          activeThread = thread.getAttribute('data-candidate-thread');
          renderMessages();
        }
      });

      await refresh();
      setInterval(refresh, 5000);
    } catch (error) {
      console.warn('Rolexa candidate messaging inbox failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();