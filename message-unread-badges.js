(() => {
  if (window.__rolexaUnreadMessageBadges) return;
  window.__rolexaUnreadMessageBadges = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  let client = null;
  let user = null;
  let allowedThreads = [];
  let markingThread = '';

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

  function loadEmployerScheduling(){
    if (!isEmployer || document.querySelector('script[src*="employer-interview-scheduling.js"]')) return;
    const script = document.createElement('script');
    script.src = 'employer-interview-scheduling.js?v=1';
    script.defer = true;
    document.body.appendChild(script);
  }

  function loadCandidateBooking(){
    if (!isCandidate || document.querySelector('script[src*="candidate-interview-booking.js"]')) return;
    const script = document.createElement('script');
    script.src = 'candidate-interview-booking.js?v=1';
    script.defer = true;
    document.body.appendChild(script);
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

  function addStyles(){
    if (document.getElementById('rxUnreadBadgeStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxUnreadBadgeStyles';
    style.textContent = `
      .rx-nav-message-label{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
      .rx-unread-badge{display:none;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:#F8C9C5;color:#8F251D;font-size:11px;font-weight:900;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 1px rgba(224,83,63,.18)}
      .rx-unread-badge.show{display:inline-flex}
    `;
    document.head.appendChild(style);
  }

  function messageNav(){
    return document.querySelector('.nav [data-view="messages"]');
  }

  function ensureBadge(){
    const nav = messageNav();
    if (!nav) return null;
    let badge = nav.querySelector('.rx-unread-badge');
    if (badge) return badge;
    const text = nav.textContent.trim() || 'Messages';
    nav.textContent = '';
    const wrap = document.createElement('span');
    wrap.className = 'rx-nav-message-label';
    const label = document.createElement('span');
    label.textContent = text;
    badge = document.createElement('span');
    badge.className = 'rx-unread-badge';
    badge.setAttribute('aria-label','Unread conversations');
    wrap.append(label,badge);
    nav.appendChild(wrap);
    return badge;
  }

  function setBadge(count){
    const badge = ensureBadge();
    if (!badge) return;
    if (!count) {
      badge.classList.remove('show');
      badge.textContent = '';
      return;
    }
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.add('show');
  }

  async function loadEmployerThreads(){
    const jobs = await client.from('jobs').select('id').eq('employer_user_id',user.id);
    if (jobs.error || !jobs.data?.length) return [];
    const apps = await client.from('candidate_applications').select('id').in('job_id',jobs.data.map(job => job.id));
    if (apps.error) return [];
    return (apps.data || []).map(app => `application:${app.id}`);
  }

  async function refreshBadge(){
    if (!client || !user) return;
    if (isCandidate) {
      const result = await client.from('candidate_messages').select('thread_key').eq('user_id',user.id).eq('sender','employer').is('read_at',null);
      if (result.error) return;
      setBadge(new Set((result.data || []).map(row => row.thread_key).filter(Boolean)).size);
      return;
    }

    allowedThreads = await loadEmployerThreads();
    if (!allowedThreads.length) { setBadge(0); return; }
    const result = await client.from('candidate_messages').select('thread_key').in('thread_key',allowedThreads).eq('sender','candidate').is('read_at',null);
    if (result.error) return;
    setBadge(new Set((result.data || []).map(row => row.thread_key).filter(Boolean)).size);
  }

  async function markRead(threadKey){
    if (!threadKey || !client || markingThread === threadKey) return;
    markingThread = threadKey;
    const reader = isCandidate ? 'candidate' : 'employer';
    const result = await client.rpc('mark_message_thread_read',{p_thread_key:threadKey,p_reader:reader});
    markingThread = '';
    if (!result.error) await refreshBadge();
  }

  function activeThreadKey(){
    if (isCandidate) return document.querySelector('[data-candidate-thread].active')?.getAttribute('data-candidate-thread') || '';
    return document.querySelector('[data-employer-thread].active')?.getAttribute('data-employer-thread') || '';
  }

  function messagesPageIsOpen(){
    return document.getElementById('messagesPage')?.classList.contains('active') || false;
  }

  async function refreshAndReadVisibleThread(){
    await refreshBadge();
    if (messagesPageIsOpen()) {
      const key = activeThreadKey();
      if (key) await markRead(key);
    }
  }

  function bindReading(){
    document.addEventListener('click',event => {
      const thread = isCandidate
        ? event.target.closest?.('[data-candidate-thread]')
        : event.target.closest?.('[data-employer-thread]');
      if (thread) {
        const key = isCandidate ? thread.getAttribute('data-candidate-thread') : thread.getAttribute('data-employer-thread');
        setTimeout(() => markRead(key),100);
        return;
      }
      const nav = event.target.closest?.('.nav [data-view="messages"]');
      if (nav) setTimeout(() => markRead(activeThreadKey()),350);
    });

    document.addEventListener('submit',event => {
      if (event.target?.id === 'chatForm' || event.target?.id === 'rxEmployerChatForm') {
        setTimeout(() => markRead(activeThreadKey()),450);
      }
    });
  }

  async function init(){
    addStyles();
    ensureBadge();
    loadEmployerScheduling();
    loadCandidateBooking();
    const lib = await loadSupabase();
    const config = await readConfig();
    client = lib.createClient(config.url,config.key);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    bindReading();
    await refreshAndReadVisibleThread();
    setInterval(() => refreshAndReadVisibleThread().catch(()=>{}),3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();