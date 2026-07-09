(() => {
  if (window.__rolexaEmployerMessagingSync) return;
  window.__rolexaEmployerMessagingSync = true;

  let client = null;
  let currentUser = null;
  let appMap = new Map();

  const MESSAGE_ENABLED_STATUSES = new Set(['Shortlisted', 'Interview', 'Offer', 'Hired']);

  function byId(id){ return document.getElementById(id); }
  function safe(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
  function shortId(value){ return String(value || 'candidate').slice(0,8); }

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
    style.textContent = `.rx-message-box{display:grid;gap:10px}.rx-message-box textarea{width:100%;min-height:135px;border:1px solid var(--line);border-radius:14px;background:#F5F7FC;padding:13px 14px;font-size:14px;color:#071025;outline:none;resize:vertical}.rx-message-box textarea:focus{background:#fff;border-color:var(--blue)}.rx-message-note{font-size:12.5px;color:#6B7280;line-height:1.45}.rx-message-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}`;
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

    const jobsRes = await client
      .from('jobs')
      .select('id,title,company')
      .eq('employer_user_id', currentUser.id);
    if (jobsRes.error) return;

    const jobs = jobsRes.data || [];
    const jobIds = jobs.map(job => job.id).filter(Boolean);
    if (!jobIds.length) return;

    const appsRes = await client
      .from('candidate_applications')
      .select('id,user_id,job_id,status')
      .in('job_id', jobIds);
    if (appsRes.error) return;

    const apps = appsRes.data || [];
    const userIds = [...new Set(apps.map(app => app.user_id).filter(Boolean))];
    let profiles = [];
    if (userIds.length) {
      const profilesRes = await client
        .from('candidate_profiles')
        .select('user_id,full_name,email')
        .in('user_id', userIds);
      if (!profilesRes.error) profiles = profilesRes.data || [];
    }

    const jobMap = new Map(jobs.map(job => [job.id, job]));
    const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));

    apps.forEach(app => {
      appMap.set(app.id, {
        app,
        job: jobMap.get(app.job_id) || {},
        profile: profileMap.get(app.user_id) || {}
      });
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

  async function refreshMessaging(){
    await loadMessagingApplications();
    decorateApplicationCards();
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

  function closeMessageModal(){
    const modal = byId('rxMessageModal');
    if (modal) modal.remove();
  }

  async function sendMessage(appId, button){
    const row = appMap.get(appId);
    const text = byId('rxEmployerMessageText') ? byId('rxEmployerMessageText').value.trim() : '';
    if (!row) { showStatus('Could not find this application for messaging.', 'bad'); return; }
    if (!text) { showStatus('Write a message before sending.', 'bad'); return; }

    const previousText = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }

    const job = row.job || {};
    const app = row.app || {};
    const senderName = job.company || currentUser.email || 'Employer';
    const threadKey = `application:${app.id}`;

    const { error } = await client.from('candidate_messages').insert({
      user_id: app.user_id,
      thread_key: threadKey,
      sender: 'employer',
      sender_name: senderName,
      body: text
    });

    if (button) { button.disabled = false; button.textContent = previousText; }

    if (error) {
      showStatus(error.message || 'Could not send message. Supabase may need an employer messaging policy.', 'bad');
      return;
    }

    closeMessageModal();
    showStatus('Message sent to candidate.', 'good');
  }

  async function init(){
    addStyles();
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url, config.key);
      const sessionRes = await client.auth.getSession();
      currentUser = sessionRes.data && sessionRes.data.session && sessionRes.data.session.user;
      if (!currentUser) return;

      document.addEventListener('click', event => {
        const messageBtn = event.target && event.target.closest('[data-message-app]');
        if (messageBtn) {
          messageModal(messageBtn.getAttribute('data-message-app'));
          return;
        }
        const sendBtn = event.target && event.target.closest('[data-send-message-app]');
        if (sendBtn) {
          sendMessage(sendBtn.getAttribute('data-send-message-app'), sendBtn);
          return;
        }
        if (event.target && (event.target.matches('[data-close-message-modal]') || event.target.id === 'rxMessageModal')) {
          closeMessageModal();
          return;
        }
      });

      await refreshMessaging();
      setInterval(refreshMessaging, 2500);
    } catch (error) {
      console.warn('Rolexa employer messaging init failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();