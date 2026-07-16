(() => {
  if (window.__rolexaEmployerMessagingSync) return;
  window.__rolexaEmployerMessagingSync = true;

  let client = null;
  let currentUser = null;
  let appMap = new Map();
  let inboxMessages = [];
  let activeThread = '';

  const MESSAGE_ENABLED_STATUSES = new Set(['Shortlisted','Interview','Offer','Hired']);
  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const shortId = value => String(value || 'candidate').slice(0,8);
  const timeText = value => { try { return value ? new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''; } catch(e){ return ''; } };
  const initials = value => String(value || 'Candidate').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'C';

  function candidatePhoto(profile = {}){
    const value = profile.photo_url || profile.avatar_url || profile.profile_photo_url || profile.image_url || profile.photo || profile.avatar || '';
    if (!value) return '';
    try {
      const url = new URL(String(value), location.href);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function avatarHtml(label,size='normal'){
    const photo = candidatePhoto(label.profile);
    const name = label.name || 'Candidate';
    const sizeClass = size === 'small' ? ' small' : '';
    return `<span class="rx-candidate-avatar${sizeClass}">${photo ? `<img src="${safe(photo)}" alt="${safe(name)} profile photo">` : safe(initials(name))}</span>`;
  }

  function loadUnreadBadges(){
    if (document.querySelector('script[src*="message-unread-badges.js"]')) return;
    const script = document.createElement('script');
    script.src = 'message-unread-badges.js?v=1';
    script.defer = true;
    document.body.appendChild(script);
  }

  function showStatus(message,type='info'){
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => { if (bar.textContent === message) bar.className = 'statusbar'; },4200);
  }

  function addStyles(){
    if (byId('rxEmployerMessagingStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerMessagingStyles';
    style.textContent = `
      .rx-message-box{display:grid;gap:10px}.rx-message-box textarea{width:100%;min-height:135px;border:1px solid var(--line);border-radius:14px;background:#F5F7FC;padding:13px 14px;font-size:14px;color:#071025;outline:none;resize:vertical}.rx-message-box textarea:focus{background:#fff;border-color:var(--blue)}.rx-message-note{font-size:12.5px;color:#6B7280;line-height:1.45}.rx-message-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
      .rx-employer-inbox{display:grid;grid-template-columns:300px 1fr;min-height:520px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}.rx-employer-threads{border-right:1px solid var(--line);background:#FBFCFF;overflow:auto}.rx-employer-thread{padding:14px 15px;border-bottom:1px solid var(--line);cursor:pointer;display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;align-items:center}.rx-employer-thread:hover,.rx-employer-thread.active{background:#EEF3FF}.rx-employer-thread-copy{min-width:0}.rx-employer-thread b{display:block;font-size:14px;margin-bottom:4px}.rx-employer-thread p{margin:0;color:var(--muted);font-size:12px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rx-candidate-avatar{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#176BFF,#7C9BFF);color:#fff;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;font-size:13px;font-weight:900;flex:0 0 auto;box-shadow:0 6px 16px rgba(23,107,255,.18)}.rx-candidate-avatar.small{width:38px;height:38px;border-radius:12px;font-size:12px}.rx-candidate-avatar img{width:100%;height:100%;object-fit:cover;display:block}
      .rx-employer-chat{display:grid;grid-template-rows:auto 1fr auto;min-width:0}.rx-employer-chat-head{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}.rx-employer-chat-head-copy{min-width:0}.rx-employer-chat-head b{display:block;font-size:16px}.rx-employer-chat-head span{display:block;color:var(--muted);font-size:12px;margin-top:3px}.rx-employer-chat-body{padding:18px;overflow:auto;background:#F8FAFF;display:flex;flex-direction:column;gap:10px}.rx-employer-bubble{max-width:76%;padding:11px 13px;border-radius:15px;font-size:13.5px;line-height:1.45;white-space:pre-wrap}.rx-employer-bubble.employer{align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:5px}.rx-employer-bubble.candidate{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:5px}.rx-employer-bubble-meta{font-size:10.5px;font-weight:900;opacity:.72;margin-bottom:4px}
      .rx-employer-chat-form{padding:12px;border-top:1px solid var(--line);display:flex;gap:8px;background:#fff}.rx-employer-chat-form input{flex:1;border:1px solid var(--line);border-radius:999px;padding:11px 14px;background:#F5F7FC;color:var(--ink);outline:none}.rx-employer-chat-form input:focus{background:#fff;border-color:var(--blue)}
      @media(max-width:820px){.rx-employer-inbox{grid-template-columns:1fr}.rx-employer-threads{border-right:0;border-bottom:1px solid var(--line);max-height:210px}.rx-employer-chat{min-height:430px}}
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

  async function loadApplications(){
    appMap = new Map();
    const jobsResult = await client.from('jobs').select('id,title,company').eq('employer_user_id',currentUser.id);
    if (jobsResult.error) throw jobsResult.error;
    const jobs = jobsResult.data || [];
    const jobIds = jobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) return;

    const appsResult = await client.from('candidate_applications').select('id,user_id,job_id,status').in('job_id',jobIds);
    if (appsResult.error) throw appsResult.error;
    const apps = appsResult.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const profilesResult = await client.from('candidate_profiles').select('*').in('user_id',userIds);
      if (!profilesResult.error) profiles = profilesResult.data || [];
    }

    const jobMap = new Map(jobs.map(job => [job.id,job]));
    const profileMap = new Map(profiles.map(profile => [profile.user_id,profile]));
    apps.forEach(app => appMap.set(app.id,{app,job:jobMap.get(app.job_id)||{},profile:profileMap.get(app.user_id)||{}}));
  }

  function decorateApplicationCards(){
    document.querySelectorAll('[data-review-profile]').forEach(profileButton => {
      const appId = profileButton.getAttribute('data-review-profile');
      if (!appId || profileButton.parentElement.querySelector(`[data-message-app="${CSS.escape(appId)}"]`)) return;
      const row = appMap.get(appId);
      if (!row || !MESSAGE_ENABLED_STATUSES.has(row.app.status)) return;
      const button = document.createElement('button');
      button.className = 'rx-status-btn primary';
      button.type = 'button';
      button.textContent = 'Message';
      button.dataset.messageApp = appId;
      profileButton.parentElement.insertBefore(button,profileButton.nextSibling);
    });
  }

  function ensureInbox(){
    const page = byId('messagesPage');
    if (!page) return false;
    const description = page.querySelector('.page-head p');
    if (description) description.textContent = 'Continue conversations with candidates connected to your roles.';
    if (byId('rxEmployerInbox')) return true;
    const card = page.querySelector('.card');
    if (!card) return false;
    card.innerHTML = `<div class="rx-employer-inbox" id="rxEmployerInbox">
      <div class="rx-employer-threads" id="rxEmployerThreadList"><div class="rx-employer-thread active"><div class="rx-employer-thread-copy"><b>Loading conversations...</b><p>Checking messages.</p></div></div></div>
      <div class="rx-employer-chat">
        <div class="rx-employer-chat-head" id="rxEmployerChatHead"><div class="rx-employer-chat-head-copy"><b id="rxEmployerChatName">Messages</b><span id="rxEmployerChatSub">Loading inbox...</span></div></div>
        <div class="rx-employer-chat-body" id="rxEmployerChatBody"><div class="empty">Loading conversations...</div></div>
        <form class="rx-employer-chat-form" id="rxEmployerChatForm"><input id="rxEmployerChatInput" placeholder="Type a message..."><button class="small-btn primary-mini" id="rxEmployerChatSend" type="submit">Send</button></form>
      </div></div>`;
    return true;
  }

  function rowForThread(threadKey){
    const appId = String(threadKey || '').startsWith('application:') ? String(threadKey).split(':')[1] : '';
    return appMap.get(appId) || null;
  }

  function threadLabel(threadKey){
    const row = rowForThread(threadKey);
    if (!row) return {name:'Candidate conversation',sub:'Application thread',profile:{}};
    const name = row.profile.full_name || row.profile.email || `Candidate ${shortId(row.app.user_id)}`;
    return {name,sub:`${row.job.title || 'Application'} · ${row.app.status || 'Application'}`,profile:row.profile || {}};
  }

  async function loadMessages(){
    ensureInbox();
    const keys = [...appMap.keys()].map(id => `application:${id}`);
    if (!keys.length) { inboxMessages = []; renderInbox(); return; }
    const result = await client.from('candidate_messages').select('*').in('thread_key',keys).order('created_at',{ascending:true});
    if (result.error) throw result.error;
    inboxMessages = result.data || [];
    renderInbox();
  }

  function renderInbox(){
    ensureInbox();
    const list = byId('rxEmployerThreadList');
    const body = byId('rxEmployerChatBody');
    const head = byId('rxEmployerChatHead');
    const name = byId('rxEmployerChatName');
    const sub = byId('rxEmployerChatSub');
    const input = byId('rxEmployerChatInput');
    const send = byId('rxEmployerChatSend');
    if (!list || !body || !name || !sub || !head) return;

    const keys = [...new Set(inboxMessages.map(message => message.thread_key).filter(Boolean))];
    if (!keys.length) {
      list.innerHTML = '<div class="rx-employer-thread active"><div class="rx-employer-thread-copy"><b>No conversations yet</b><p>Messages started from an application will appear here.</p></div></div>';
      name.textContent = 'Messages';
      sub.textContent = 'No active conversation';
      head.querySelector('.rx-candidate-avatar')?.remove();
      body.innerHTML = '<div class="empty">No conversations yet. Open an eligible application and select Message to start one.</div>';
      if (input) input.disabled = true;
      if (send) send.disabled = true;
      return;
    }

    keys.sort((a,b) => {
      const aLatest = [...inboxMessages].reverse().find(message => message.thread_key === a)?.created_at || '';
      const bLatest = [...inboxMessages].reverse().find(message => message.thread_key === b)?.created_at || '';
      return String(bLatest).localeCompare(String(aLatest));
    });
    if (!activeThread || !keys.includes(activeThread)) activeThread = keys[0];
    if (input) { input.disabled = false; input.placeholder = 'Type a message...'; }
    if (send) send.disabled = false;

    list.innerHTML = keys.map(key => {
      const label = threadLabel(key);
      const latest = [...inboxMessages].reverse().find(message => message.thread_key === key);
      return `<div class="rx-employer-thread ${key===activeThread?'active':''}" data-employer-thread="${safe(key)}">${avatarHtml(label,'small')}<div class="rx-employer-thread-copy"><b>${safe(label.name)}</b><p>${safe(label.sub)}${latest?.body?' · '+safe(latest.body):''}</p></div></div>`;
    }).join('');

    const label = threadLabel(activeThread);
    head.querySelector('.rx-candidate-avatar')?.remove();
    head.insertAdjacentHTML('afterbegin',avatarHtml(label));
    name.textContent = label.name;
    sub.textContent = label.sub;
    body.innerHTML = inboxMessages.filter(message => message.thread_key === activeThread).map(message => {
      const side = message.sender === 'employer' ? 'employer' : 'candidate';
      const sender = message.sender_name || (side === 'employer' ? 'You' : 'Candidate');
      return `<div class="rx-employer-bubble ${side}"><div class="rx-employer-bubble-meta">${safe(sender)}${message.created_at?' · '+safe(timeText(message.created_at)):''}</div>${safe(message.body)}</div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  async function insertEmployerMessage(row,text,button){
    if (!row || !text) return;
    const previous = button?.textContent || 'Send';
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    const result = await client.from('candidate_messages').insert({
      user_id:row.app.user_id,
      thread_key:`application:${row.app.id}`,
      sender:'employer',
      sender_name:row.job.company || currentUser.email || 'Employer',
      body:text
    });
    if (button) { button.disabled = false; button.textContent = previous; }
    if (result.error) { showStatus(result.error.message || 'Could not send message.','bad'); return false; }
    await loadMessages();
    return true;
  }

  function messageModal(appId){
    const row = appMap.get(appId);
    if (!row) return showStatus('Could not find this application for messaging.','bad');
    const name = row.profile.full_name || row.profile.email || `Candidate ${shortId(row.app.user_id)}`;
    const defaultMessage = row.app.status === 'Shortlisted'
      ? `Hi ${name}, thanks for applying for ${row.job.title || 'this role'}. We have shortlisted your application and would like to speak with you about next steps.`
      : `Hi ${name}, I wanted to follow up about your application for ${row.job.title || 'this role'}.`;
    document.body.insertAdjacentHTML('beforeend',`<div class="rx-modal-backdrop" id="rxMessageModal"><div class="rx-modal"><div class="rx-modal-head"><div><h2>Message ${safe(name)}</h2><p>${safe(row.job.title || row.app.job_id)} · ${safe(row.app.status || 'Application')}</p></div><button class="rx-modal-close" type="button" data-close-message-modal>Close</button></div><div class="rx-modal-body"><div class="rx-message-box"><textarea id="rxEmployerMessageText">${safe(defaultMessage)}</textarea><div class="rx-message-note">This will save the message to the candidate's Rolexa message inbox.</div><div class="rx-message-actions"><button class="rx-status-btn" type="button" data-close-message-modal>Cancel</button><button class="rx-status-btn primary" type="button" data-send-message-app="${safe(appId)}">Send message</button></div></div></div></div></div>`);
  }

  async function sendFromModal(appId,button){
    const row = appMap.get(appId);
    const text = byId('rxEmployerMessageText')?.value.trim() || '';
    if (!row) return showStatus('Could not find this application for messaging.','bad');
    if (!text) return showStatus('Write a message before sending.','bad');
    const ok = await insertEmployerMessage(row,text,button);
    if (ok) {
      byId('rxMessageModal')?.remove();
      showStatus('Message sent to candidate.','good');
    }
  }

  async function sendFromInbox(event){
    event.preventDefault();
    const row = rowForThread(activeThread);
    const input = byId('rxEmployerChatInput');
    const button = byId('rxEmployerChatSend');
    const text = input?.value.trim() || '';
    if (!row || !text) return;
    const ok = await insertEmployerMessage(row,text,button);
    if (ok) {
      input.value = '';
      showStatus('Reply sent to candidate.','good');
    }
  }

  async function refresh(){
    await loadApplications();
    decorateApplicationCards();
    await loadMessages();
  }

  async function init(){
    addStyles();
    ensureInbox();
    loadUnreadBadges();
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url,config.key);
      const session = await client.auth.getSession();
      currentUser = session.data?.session?.user;
      if (!currentUser) return;

      document.addEventListener('click',event => {
        const thread = event.target.closest?.('[data-employer-thread]');
        if (thread) { activeThread = thread.dataset.employerThread; renderInbox(); return; }
        const messageButton = event.target.closest?.('[data-message-app]');
        if (messageButton) { messageModal(messageButton.dataset.messageApp); return; }
        const sendButton = event.target.closest?.('[data-send-message-app]');
        if (sendButton) { sendFromModal(sendButton.dataset.sendMessageApp,sendButton); return; }
        if (event.target.matches?.('[data-close-message-modal]') || event.target.id === 'rxMessageModal') byId('rxMessageModal')?.remove();
      });
      document.addEventListener('submit',event => { if (event.target.id === 'rxEmployerChatForm') sendFromInbox(event); });

      await refresh();
      setInterval(() => refresh().catch(()=>{}),5000);
    } catch(error) {
      console.warn('Rolexa employer messaging failed',error);
      showStatus(error.message || 'Could not load employer messages.','bad');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();