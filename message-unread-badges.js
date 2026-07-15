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
  let employerProfile = null;
  const candidateBrands = new Map();

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const initials = value => String(value || 'Company').trim().split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase() || 'C';

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

  function loadScript(fragment,src,condition=true){
    if (!condition || document.querySelector(`script[src*="${fragment}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function loadRelatedFeatures(){
    loadScript('employer-interview-scheduling.js','employer-interview-scheduling.js?v=1',isEmployer);
    loadScript('employer-interview-confirmation.js','employer-interview-confirmation.js?v=2',isEmployer);
    loadScript('candidate-interview-booking.js','candidate-interview-booking.js?v=2',isCandidate);
    loadScript('rolexa-calendar-events.js','rolexa-calendar-events.js?v=2');
    loadScript('rolexa-interview-links.js','rolexa-interview-links.js?v=1');
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
      .rx-company-avatar{width:38px;height:38px;border-radius:11px;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;background:#0A1738;color:#fff;font-weight:900;font-size:13px;border:1px solid rgba(7,16,37,.1)}
      .rx-company-avatar img{width:100%;height:100%;object-fit:contain;background:#fff}
      .rx-candidate-brand-head{display:flex;align-items:center;gap:11px}
      .rx-candidate-brand-copy{min-width:0}.rx-candidate-brand-copy b{display:block}.rx-candidate-brand-copy span{display:block}
      .rx-thread-brand{display:grid!important;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center}
      .rx-thread-brand .rx-company-avatar{width:34px;height:34px;border-radius:9px;grid-row:1/3}
      .rx-thread-brand b,.rx-thread-brand p{grid-column:2;margin:0!important;min-width:0}
    `;
    document.head.appendChild(style);
  }

  function avatarHtml(profile){
    const name = profile?.company_name || 'Employer';
    return `<span class="rx-company-avatar">${profile?.logo_url ? `<img src="${safe(profile.logo_url)}" alt="${safe(name)} logo">` : safe(initials(name).slice(0,2))}</span>`;
  }

  async function loadEmployerIdentity(){
    if (!isEmployer) return;
    const result = await client.from('employer_profiles').select('company_name,logo_url').eq('user_id',user.id).maybeSingle();
    if (!result.error) employerProfile = result.data || null;
    applyEmployerIdentity();
  }

  function applyEmployerIdentity(){
    if (!employerProfile) return;
    const name = employerProfile.company_name || 'Employer';
    const topName = document.getElementById('topName');
    const topAvatar = document.getElementById('topAvatar');
    if (topName && topName.textContent !== name) topName.textContent = name;
    if (topAvatar && topAvatar.dataset.companyBrand !== name) {
      topAvatar.innerHTML = employerProfile.logo_url
        ? `<img src="${safe(employerProfile.logo_url)}" alt="${safe(name)} logo" style="width:100%;height:100%;object-fit:contain;background:#fff;border-radius:inherit">`
        : safe(initials(name).slice(0,1));
      topAvatar.dataset.companyBrand = name;
    }
  }

  async function loadCandidateBrands(){
    if (!isCandidate) return;
    const apps = await client.from('candidate_applications').select('id').eq('user_id',user.id);
    if (apps.error) return;
    await Promise.all((apps.data || []).map(async app => {
      const result = await client.rpc('get_employer_brand_for_application',{p_application_id:app.id});
      if (result.error) return;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) candidateBrands.set(String(app.id),row);
    }));
    applyCandidateIdentity();
  }

  function activeCandidateApplicationId(){
    const key = document.querySelector('[data-candidate-thread].active')?.getAttribute('data-candidate-thread') || '';
    return key.startsWith('application:') ? key.slice('application:'.length) : '';
  }

  function decorateCandidateChatHead(){
    const appId = activeCandidateApplicationId();
    const profile = candidateBrands.get(String(appId));
    const head = document.querySelector('#rxLiveCandidateMessages .chat-head');
    const name = document.getElementById('chatName');
    const sub = document.getElementById('chatSub');
    if (!head || !name || !profile) return;
    const company = profile.company_name || 'Employer';
    if (head.dataset.brandApplication === appId && name.textContent === company && head.querySelector('.rx-company-avatar')) return;
    if (name.textContent !== company) name.textContent = company;
    if (!head.classList.contains('rx-candidate-brand-head')) {
      const copy = document.createElement('div');
      copy.className = 'rx-candidate-brand-copy';
      name.parentNode.insertBefore(copy,name);
      copy.append(name);
      if (sub) copy.append(sub);
      head.insertAdjacentHTML('afterbegin',avatarHtml(profile));
      head.classList.add('rx-candidate-brand-head');
    } else {
      const avatar = head.querySelector('.rx-company-avatar');
      const desired = avatarHtml(profile);
      if (avatar && avatar.outerHTML !== desired) avatar.outerHTML = desired;
    }
    head.dataset.brandApplication = appId;
  }

  function decorateCandidateThreads(){
    document.querySelectorAll('[data-candidate-thread]').forEach(thread => {
      const key = thread.getAttribute('data-candidate-thread') || '';
      if (!key.startsWith('application:')) return;
      const appId = key.slice('application:'.length);
      const profile = candidateBrands.get(appId);
      if (!profile) return;
      const company = profile.company_name || 'Employer';
      const title = thread.querySelector('b');
      if (title && title.textContent !== company) title.textContent = company;
      if (!thread.classList.contains('rx-thread-brand')) {
        thread.insertAdjacentHTML('afterbegin',avatarHtml(profile));
        thread.classList.add('rx-thread-brand');
      }
    });
  }

  function decorateEmployerBubbleNames(){
    const profile = candidateBrands.get(String(activeCandidateApplicationId()));
    if (!profile) return;
    const company = profile.company_name || 'Employer';
    document.querySelectorAll('#chatBody .bubble.them > div:first-child').forEach(meta => {
      const parts = meta.textContent.split(' · ');
      const desired = parts.length > 1 ? `${company} · ${parts.slice(1).join(' · ')}` : company;
      if (meta.textContent !== desired) meta.textContent = desired;
    });
  }

  function applyCandidateIdentity(){
    if (!isCandidate) return;
    decorateCandidateChatHead();
    decorateCandidateThreads();
    decorateEmployerBubbleNames();
  }

  function messageNav(){ return document.querySelector('.nav [data-view="messages"]'); }

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
    badge.textContent = count ? (count > 99 ? '99+' : String(count)) : '';
    badge.classList.toggle('show',Boolean(count));
  }

  async function loadEmployerThreads(){
    const jobs = await client.from('jobs').select('id').eq('employer_user_id',user.id);
    if (jobs.error || !jobs.data?.length) return [];
    const apps = await client.from('candidate_applications').select('id').in('job_id',jobs.data.map(job => job.id));
    if (apps.error) return [];
    return (apps.data || []).map(app => `application:${app.id}`);
  }

  async function refreshBadge(){
    if (isCandidate) {
      const result = await client.from('candidate_messages').select('thread_key').eq('user_id',user.id).eq('sender','employer').is('read_at',null);
      if (!result.error) setBadge(new Set((result.data || []).map(row => row.thread_key).filter(Boolean)).size);
      return;
    }
    allowedThreads = await loadEmployerThreads();
    if (!allowedThreads.length) return setBadge(0);
    const result = await client.from('candidate_messages').select('thread_key').in('thread_key',allowedThreads).eq('sender','candidate').is('read_at',null);
    if (!result.error) setBadge(new Set((result.data || []).map(row => row.thread_key).filter(Boolean)).size);
  }

  async function markRead(threadKey){
    if (!threadKey || markingThread === threadKey) return;
    markingThread = threadKey;
    const reader = isCandidate ? 'candidate' : 'employer';
    const result = await client.rpc('mark_message_thread_read',{p_thread_key:threadKey,p_reader:reader});
    markingThread = '';
    if (!result.error) await refreshBadge();
  }

  function activeThreadKey(){
    return isCandidate
      ? document.querySelector('[data-candidate-thread].active')?.getAttribute('data-candidate-thread') || ''
      : document.querySelector('[data-employer-thread].active')?.getAttribute('data-employer-thread') || '';
  }

  function messagesPageIsOpen(){ return document.getElementById('messagesPage')?.classList.contains('active') || false; }

  async function refreshAndReadVisibleThread(){
    await refreshBadge();
    if (messagesPageIsOpen()) {
      const key = activeThreadKey();
      if (key) await markRead(key);
    }
    applyEmployerIdentity();
    applyCandidateIdentity();
  }

  function bindReading(){
    document.addEventListener('click',event => {
      const thread = isCandidate ? event.target.closest?.('[data-candidate-thread]') : event.target.closest?.('[data-employer-thread]');
      if (thread) {
        const key = isCandidate ? thread.getAttribute('data-candidate-thread') : thread.getAttribute('data-employer-thread');
        setTimeout(() => { markRead(key); applyCandidateIdentity(); },100);
        return;
      }
      const nav = event.target.closest?.('.nav [data-view="messages"]');
      if (nav) setTimeout(() => markRead(activeThreadKey()),350);
    });
    document.addEventListener('submit',event => {
      if (event.target?.id === 'chatForm' || event.target?.id === 'rxEmployerChatForm') setTimeout(() => markRead(activeThreadKey()),450);
    });
  }

  async function init(){
    addStyles();
    ensureBadge();
    loadRelatedFeatures();
    const lib = await loadSupabase();
    const config = await readConfig();
    client = lib.createClient(config.url,config.key);
    const session = await client.auth.getSession();
    user = session.data?.session?.user;
    if (!user) return;
    bindReading();
    if (isEmployer) await loadEmployerIdentity();
    if (isCandidate) await loadCandidateBrands();
    await refreshAndReadVisibleThread();
    setInterval(() => refreshAndReadVisibleThread().catch(()=>{}),3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
