(() => {
  if (window.__rolexaEmployerMessagingSync) return;
  window.__rolexaEmployerMessagingSync = true;

  let client = null;
  let currentUser = null;
  let appMap = new Map();
  let inboxMessages = [];
  let activeThread = '';

  const MESSAGE_ENABLED_STATUSES = new Set(['Shortlisted', 'Interview', 'Offer', 'Hired']);

  function byId(id){ return document.getElementById(id); }
  function safe(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
  function shortId(value){ return String(value || 'candidate').slice(0,8); }
  function timeText(value){
    try {
      return value ? new Date(value).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
    } catch(e){ return ''; }
  }

  function showStatus(message, type = 'info') {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4500);
  }

  function addStyles(){
    if (byId('rxEmployerMessagingStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerMessagingStyles';
    style.textContent = `
      .rx-message-box{display:grid;gap:10px}
      .rx-message-box textarea{width:100%;min-height:135px;border:1px solid var(--line);border-radius:14px;background:#F5F7FC;padding:13px 14px;font-size:14px;color:#071025;outline:none;resize:vertical}
      .rx-message-box textarea:focus{background:#fff;border-color:var(--blue)}
      .rx-message-note{font-size:12.5px;color:#6B7280;line-height:1.45}
      .rx-message-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
      .rx-employer-inbox{display:grid;grid-template-columns:300px 1fr;min-height:520px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}
      .rx-employer-threads{border-right:1px solid var(--line);background:#FBFCFF;overflow:auto}
      .rx-employer-thread{padding:15px;border-bottom:1px solid var(--line);cursor:pointer}
      .rx-employer-thread:hover,.rx-employer-thread.active{background:#EEF3FF}
      .rx-employer-thread b{display:block;font-size:14px;margin-bottom:4px}
      .rx-employer-thread p{margin:0;color:var(--muted);font-size:12px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rx-employer-chat{display:grid;grid-template-rows:auto 1fr auto;min-width:0}
      .rx-employer-chat-head{padding:16px 18px;border-bottom:1px solid var(--line)}
      .rx-employer-chat-head b{display:block;font-size:16px}
      .rx-employer-chat-head span{display:block;color:var(--muted);font-size:12px;margin-top:3px}
      .rx-employer-chat-body{padding:18px;overflow:auto;background:#F8FAFF;display:flex;flex-direction:column;gap:10px}
      .rx-employer-bubble{max-width:76%;padding:11px 13px;border-radius:15px;font-size:13.5px;line-height:1.45;white-space:pre-wrap}
      .rx-employer-bubble.employer{align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:5px}
      .rx-employer-bubble.candidate{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:5px}
      .rx-employer-bubble-meta{font-size:10.5px;font-weight:900;opacity:.72;margin-bottom:4px}
      .rx-employer-chat-form{padding:12px;border-top:1px solid var(--line);display:flex;gap:8px;background:#fff}
      .rx-employer-chat-form input{flex:1;border:1px solid var(--line);border-radius:999px;padding:11px 14px;background:#F5F7FC;color:var(--ink)}
      .rx-employer-chat-form input:disabled{opacity:.7}
      @media(max-width:820px){.rx-employer-inbox{grid-template-columns:1fr}.rx-employer-threads{border-right:0;border-bottom:1px solid var(--line);max-height:180px}.rx-employer-chat{min-height:430px}}
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase(){
    if (window.supabase && window.supabase.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.supabase;
  }

  async function readConfig(){
    const files = ['candidate-profile-sync.js', 'employer-job-sync.js?v=2'];
    for (const file of files) {
      try {
        const res = await fetch(file, { cache: 'no-store' });
        const text = await res.text();
        const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
        const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
        if (url && key) return { url, key };
      } catch(e) {}
    }
    throw new Error('Supabase config could not be found.');
  }

  async function loadMessagingApplications(){
    appMap = new Map();
    if (!client || !currentUser) return;

    const jobsRes = await client.from('jobs').select('id,title,company').eq('employer_user_id', currentUser.id);
    if (jobsRes.error) return;
    const jobs = jobsRes.data || [];
    const jobIds = jobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) return;

    const appsRes = await client.from('candidate_applications').select('id,user_id,job_id,status').in('job_id', jobIds);
    if (appsRes.error) return;
    const apps = appsRes.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const profilesRes = await client.from('candidate_profiles').select('user_id,full_name,email').in('user_id', userIds);
      if (!profilesRes.error) profiles = profilesRes.data || [];
    }

    const jobMap = new Map(jobs.map(job => [job.id, job]));
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
    apps.forEach(app => {
      appMap.set(app.id, { app, job: jobMap.get(app.job_id) || {}, profile: profileMap.get(app.user_id) || {} });
    });
  }

  function decorateApplicationCards(){
    document.querySelectorAll('[data-review-profile]').forEach(profileButton => {
      const appId = profileButton.getAttribute('data-review-profile');
      if (!appId || profileButton.parentElement.querySelector(`[data-message-app="${CSS.escape(appId)}"]`)) return;
      const row = appMap.get(appId);
      if (!row || !MESSAGE_ENABLED_STATUSES.has(row.app.status)) return;
      const btn = document.createElement('button');
      btn.className = 'rx-status-btn primary';
      btn.type = 'button';
      btn.textContent = 'Message';
      btn.setAttribute('data-message-app', appId);
      profileButton.parentElement.insertBefore(btn, profileButton.nextSibling);
    });
  }

  function ensureInboxLayout(){
    const page = byId('messagesPage');
    if (!page) return false;
    const paragraph = page.querySelector('.page-head p');
    if (paragraph) paragraph.textContent = 'Continue conversations with candidates connected to your roles.';
    let inbox = byId('rxEmployerInbox');
    if (inbox) return true;
    const card = page.querySelector('.card');
    if (!card) return false;
    card.innerHTML = `
      <div class="rx-employer-inbox" id="rxEmployerInbox">
        <div class="rx-employer-threads" id="rxEmployerThreadList"><div class="rx-employer-thread active"><b>Loading conversations...</b><p>Checking Supabase messages.</p></div></div>
        <div class="rx-employer-chat">
          <div class="rx-employer-chat-head"><b id="rxEmployerChatName">Messages</b><span id="rxEmployerChatSub">Loading inbox...</span></div>
          <div class="rx-employer-chat-body" id="rxEmployerChatBody"><div class="empty">Loading conversations...</div></div>
          <div class="rx-employer-chat-form"><input placeholder="Employer replies are the next step..." disabled><button class="small-btn primary-mini" type="button" disabled>Send</button></div>
        </div>
      </div>`;
    return true;
  }

  function rowForThread(threadKey){
    const appId = String(threadKey || '').startsWith('application:') ? String(threadKey).split(':')[1] : '';
    return appMap.get(appId) || null;
  }

  function threadLabel(threadKey){
    const row = rowForThread(threadKey);
    if (!row) return { name:'Candidate conversation', sub:'Application thread' };
    const name = row.profile.full_name || row.profile.email || `Candidate ${shortId(row.app.user_id)}`;
    return { name, sub:`${row.job.title || 'Application'} · ${row.app.status || 'Application'}` };
  }

  async function loadInboxMessages(){
    ensureInboxLayout();
    const allowedThreadKeys = [...appMap.keys()].map(id => `application:${id}`);
    if (!allowedThreadKeys.length) { inboxMessages = []; renderInbox(); return; }

    const result = await client.from('candidate_messages').select('*').in('thread_key', allowedThreadKeys).order('created_at', { ascending:true });
    if (result.error) {
      const body = byId('rxEmployerChatBody');
      if (body) body.innerHTML = `<div class="empty">${safe(result.error.message || 'Could not load conversations.')}</div>`;
      showStatus(result.error.message || 'Could not load employer messages.', 'bad');
      return;
    }
    inboxMessages = result.data || [];
    renderInbox();
  }

  function renderInbox(){
    ensureInboxLayout();
    const list = byId('rxEmployerThreadList');
    const body = byId('rxEmployerChatBody');
    const name = byId('rxEmployerChatName');
    const sub = byId('rxEmployerChatSub');
    if (!list || !body || !name || !sub) return;

    const keys = [...new Set(inboxMessages.map(message => message.thread_key).filter(Boolean))];
    if (!keys.length) {
      list.innerHTML = '<div class="rx-employer-thread active"><b>No conversations yet</b><p>Messages started from an application will appear here.</p></div>';
      name.textContent = 'Messages';
      sub.textContent = 'No active conversation';
      body.innerHTML = '<div class="empty">No conversations yet. Open an eligible application and select Message to start one.</div>';
      return;
    }

    if (!activeThread || !keys.includes(activeThread)) activeThread = keys[keys.length - 1];
    list.innerHTML = keys.map(key => {
      const label = threadLabel(key);
      const latest = [...inboxMessages].reverse().find(message => message.thread_key === key);
      return `<div class="rx-employer-thread ${key === activeThread ? 'active' : ''}" data-employer-thread="${safe(key)}"><b>${safe(label.name)}</b><p>${safe(label.sub)}${latest && latest.body ? ' · ' + safe(latest.body) : ''}</p></div>`;
    }).join('');

    const label = threadLabel(activeThread);
    name.textContent = label.name;
    sub.textContent = label.sub;
    body.innerHTML = inboxMessages.filter(message => message.thread_key === activeThread).map(message => {
      const side = message.sender === 'employer' ? 'employer' : 'candidate';
      const sender = message.sender_name || (side === 'employer' ? 'You' : 'Candidate');
      return `<div class="rx-employer-bubble ${side}"><div class="rx-employer-bubble-meta">${safe(sender)}${message.created_at ? ' · ' + safe(timeText(message.created_at)) : ''}</div>${safe(message.body)}</div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  async function refreshMessaging(){
    await loadMessagingApplications();
    decorateApplicationCards();
    await loadInboxMessages();
  }

  function messageModal(appId){
    const row = appMap.get(appId);
    if (!row) { showStatus('Could not find this application for messaging.', 'bad'); return; }
    const profile = row.profile || {};
    const job = row.job || {};
    const app = row.app || {};
    const name = profile.full_name || profile.email || `Candidate ${shortId(app.user_id)}`;
    const defaultMessage = app.status === 'Shortlisted'
      ? `Hi ${name}, thanks for applying for ${job.title || 'this role'}. We have shortlisted your application and would like to speak with you about next steps.`
      : `Hi ${name}, I wanted to follow up about your application for ${job.title || 'this role'}.`;
    const html = `<div class="rx-modal-backdrop" id="rxMessageModal"><div class="rx-modal"><div class="rx-modal-head"><div><h2>Message ${safe(name)}</h2><p>${safe(job.title || app.job_id)} · ${safe(app.status || 'Application')}</p></div><button class="rx-modal-close" type="button" data-close-message-modal>Close</button></div><div class="rx-modal-body"><div class="rx-message-box"><textarea id="rxEmployerMessageText">${safe(defaultMessage)}</textarea><div class="rx-message-note">This will save the message to the candidate's Rolexa message inbox.</div><div class="rx-message-actions"><button class="rx-status-btn" type="button" data-close-message-modal>Cancel</button><button class="rx-status-btn primary" type="button" data-send-message-app="${safe(appId)}">Send message</button></div></div></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function closeMessageModal(){ const modal = byId('rxMessageModal'); if (modal) modal.remove(); }

  async function sendMessage(appId, button){
    const row = appMap.get(appId);
    const text = byId('rxEmployerMessageText') ? byId('rxEmployerMessageText').value.trim() : '';
    if (!row) { showStatus('Could not find this application for messaging.', 'bad'); return; }
    if (!text) { showStatus('Write a message before sending.', 'bad'); return; }
    const previousText = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    const job = row.job || {};
    const app = row.app || {};
    const { error } = await client.from('candidate_messages').insert({
      user_id: app.user_id,
      thread_key: `application:${app.id}`,
      sender: 'employer',
      sender_name: job.company || currentUser.email || 'Employer',
      body: text
    });
    if (button) { button.disabled = false; button.textContent = previousText; }
    if (error) { showStatus(error.message || 'Could not send message.', 'bad'); return; }
    closeMessageModal();
    showStatus('Message sent to candidate.', 'good');
    await loadInboxMessages();
  }

  async function init(){
    addStyles();
    ensureInboxLayout();
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url, config.key);
      const sessionRes = await client.auth.getSession();
      currentUser = sessionRes.data && sessionRes.data.session && sessionRes.data.session.user;
      if (!currentUser) return;

      document.addEventListener('click', event => {
        const thread = event.target && event.target.closest('[data-employer-thread]');
        if (thread) { activeThread = thread.getAttribute('data-employer-thread'); renderInbox(); return; }
        const messageBtn = event.target && event.target.closest('[data-message-app]');
        if (messageBtn) { messageModal(messageBtn.getAttribute('data-message-app')); return; }
        const sendBtn = event.target && event.target.closest('[data-send-message-app]');
        if (sendBtn) { sendMessage(sendBtn.getAttribute('data-send-message-app'), sendBtn); return; }
        if (event.target && (event.target.matches('[data-close-message-modal]') || event.target.id === 'rxMessageModal')) closeMessageModal();
      });

      await refreshMessaging();
      setInterval(refreshMessaging, 5000);
    } catch (error) {
      console.warn('Rolexa employer messaging init failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();