(() => {
  if (window.__rolexaEmployerReplySync) return;
  window.__rolexaEmployerReplySync = true;

  let client = null;
  let user = null;

  function byId(id){ return document.getElementById(id); }

  function activeThread(){
    const el = document.querySelector('[data-employer-thread].active');
    return el ? el.getAttribute('data-employer-thread') : '';
  }

  function status(text, good = false){
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${good ? 'good' : 'bad'}`;
    bar.textContent = text;
    setTimeout(() => {
      if (bar.textContent === text) bar.className = 'statusbar';
    }, 4200);
  }

  async function loadSupabase(){
    if (window.supabase && window.supabase.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
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

  async function enableComposer(){
    const form = document.querySelector('.rx-employer-chat-form');
    if (!form) return;
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    if (!input || !button) return;

    input.disabled = false;
    button.disabled = false;
    input.placeholder = 'Type a message...';

    if (form.dataset.replyReady) return;
    form.dataset.replyReady = 'true';

    button.addEventListener('click', async () => {
      const threadKey = activeThread();
      const body = input.value.trim();
      if (!threadKey) return status('Open a conversation before replying.');
      if (!body) return status('Write a message before sending.');

      const appId = threadKey.startsWith('application:') ? threadKey.split(':')[1] : '';
      if (!appId) return status('Could not identify this application thread.');

      const appRes = await client.from('candidate_applications').select('user_id,job_id').eq('id', appId).maybeSingle();
      if (appRes.error || !appRes.data) return status(appRes.error?.message || 'Could not load this application.');

      let senderName = user.email || 'Employer';
      const jobRes = await client.from('jobs').select('company').eq('id', appRes.data.job_id).maybeSingle();
      if (!jobRes.error && jobRes.data?.company) senderName = jobRes.data.company;

      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = 'Sending...';

      const { error } = await client.from('candidate_messages').insert({
        user_id: appRes.data.user_id,
        thread_key: threadKey,
        sender: 'employer',
        sender_name: senderName,
        body
      });

      button.disabled = false;
      button.textContent = oldText;

      if (error) return status(error.message || 'Could not send employer reply.');
      input.value = '';
      status('Message sent.', true);
      setTimeout(() => location.reload(), 450);
    });
  }

  async function init(){
    if (!/employer-dashboard\.html$/.test(location.pathname)) return;
    try {
      const lib = await loadSupabase();
      const config = await readConfig();
      client = lib.createClient(config.url, config.key);
      const session = await client.auth.getSession();
      user = session.data && session.data.session && session.data.session.user;
      if (!user) return;
      const observer = new MutationObserver(enableComposer);
      observer.observe(document.body, { childList: true, subtree: true });
      enableComposer();
    } catch (error) {
      console.warn('Rolexa employer reply sync failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();