(() => {
  if (window.__rolexaDashboardMessagesLayout) return;
  window.__rolexaDashboardMessagesLayout = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  const style = document.createElement('style');
  style.id = 'rxDashboardMessagesLayoutStyles';
  style.textContent = `
    @media (min-width:1101px){
      #messagesPage.active .thread-wrap{height:calc(100vh - 190px);min-height:520px;max-height:760px;overflow:hidden;align-items:stretch}
      #messagesPage.active .thread-wrap>.threads{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
      #messagesPage.active .thread-wrap>.chat{height:100%;min-height:0}
      #messagesPage.active .thread-wrap>.chat>.chat-body{min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
      #messagesPage.active .thread-wrap>.chat>.chat-form{flex:0 0 auto;background:#fff;box-shadow:0 -10px 24px rgba(7,16,37,.045)}
      #messagesPage.active .rx-employer-inbox{height:calc(100vh - 190px);min-height:520px;max-height:760px;overflow:hidden}
      #messagesPage.active .rx-employer-threads{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
      #messagesPage.active .rx-employer-chat{height:100%;min-height:0}
      #messagesPage.active .rx-employer-chat-body{min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
      #messagesPage.active .rx-employer-chat-form{position:relative;z-index:2;background:#fff;box-shadow:0 -10px 24px rgba(7,16,37,.045)}
      body:has(#messagesPage.active) .rx-feedback-trigger{right:22px!important;top:94px!important;bottom:auto!important}
      body:has(#messagesPage.active) .rx-chat-launcher{right:22px!important;top:154px!important;bottom:auto!important}
    }
    @media (max-width:1100px){
      #messagesPage.active .thread-wrap,#messagesPage.active .rx-employer-inbox{height:auto;max-height:none;min-height:0;overflow:visible}
      #messagesPage.active .threads,#messagesPage.active .rx-employer-threads{max-height:240px;overflow-y:auto;overscroll-behavior:contain}
      #messagesPage.active .chat,#messagesPage.active .rx-employer-chat{min-height:520px}
      #messagesPage.active .chat-body,#messagesPage.active .rx-employer-chat-body{max-height:58vh;overflow-y:auto;overscroll-behavior:contain}
      body:has(#messagesPage.active) .rx-feedback-trigger{right:14px!important;top:88px!important;bottom:auto!important}
      body:has(#messagesPage.active) .rx-chat-launcher{right:14px!important;top:146px!important;bottom:auto!important}
    }
    @media (max-width:760px){
      #messagesPage.active .chat,#messagesPage.active .rx-employer-chat{min-height:460px}
      #messagesPage.active .chat-body,#messagesPage.active .rx-employer-chat-body{max-height:52vh}
      body:has(#messagesPage.active) .rx-feedback-trigger,body:has(#messagesPage.active) .rx-chat-launcher{width:46px!important;height:46px!important;min-width:46px!important;max-width:46px!important;padding:0!important;border-radius:50%!important;overflow:hidden!important;font-size:0!important;justify-content:center!important}
      body:has(#messagesPage.active) .rx-feedback-trigger{top:82px!important}
      body:has(#messagesPage.active) .rx-chat-launcher{top:136px!important}
      body:has(#messagesPage.active) .rx-feedback-trigger span{width:25px!important;height:25px!important;margin:0!important;font-size:14px!important}
      body:has(#messagesPage.active) .rx-chat-launcher .rx-chat-dot{width:10px!important;height:10px!important;margin:0!important}
    }

    /* Candidate conversation branding: exactly one logo, immediately before the company name. */
    #messagesPage .threads .thread.rx-brand-pending{visibility:hidden!important}
    #messagesPage .threads .thread.rx-stable-branding{
      display:grid!important;
      grid-template-columns:52px minmax(0,1fr)!important;
      column-gap:13px!important;
      align-items:center!important;
      padding:15px 16px!important;
    }
    #messagesPage .rx-stable-company-logo{
      width:52px;height:52px;border-radius:13px;object-fit:cover;display:block;
      grid-column:1;grid-row:1;background:#071025;box-shadow:0 5px 14px rgba(7,16,37,.14)
    }
    #messagesPage .rx-stable-company-copy{grid-column:2;grid-row:1;min-width:0;display:grid;gap:5px}
    #messagesPage .rx-stable-company-name{font-size:15px;font-weight:900;color:#071025;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #messagesPage .rx-stable-company-preview{font-size:12.5px;color:#6b7280;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  `;
  document.head.appendChild(style);

  if (!isCandidate) return;

  const CACHE_KEY = 'rolexa_candidate_message_company_branding_v1';
  let applying = false;
  let cached = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); }
    catch (_) { return null; }
  })();

  const saveCache = value => {
    cached = value;
    try { localStorage.setItem(CACHE_KEY,JSON.stringify(value)); } catch (_) {}
  };

  const validName = value => {
    const name = String(value || '').trim().replace(/\s+logo$/i,'');
    return name && !/^test$/i.test(name) && !/^role(?:xa)?$/i.test(name) ? name : '';
  };

  const validSrc = image => {
    const source = image?.currentSrc || image?.src || '';
    return source && !source.startsWith('data:') ? source : '';
  };

  const detectBranding = root => {
    const thread = root.querySelector('.thread');
    if (!thread) return cached;

    const images = [...thread.querySelectorAll('img')];
    const source = images.map(validSrc).find(Boolean) || cached?.src || '';
    const altName = images.map(image => validName(image.alt)).find(Boolean) || '';
    const visibleName = validName(thread.querySelector('b,strong,.item-title,.rx-stable-company-name')?.textContent);
    const bubbleName = [...document.querySelectorAll('#messagesPage .bubble.them')]
      .map(node => validName((node.textContent || '').match(/^([^·\n]+?)\s*·/)?.[1]))
      .find(Boolean) || '';
    const name = bubbleName || altName || visibleName || cached?.name || '';

    if (name || source) saveCache({name:name || cached?.name || 'Company',src:source || cached?.src || ''});
    return cached;
  };

  const rebuildRows = root => {
    if (applying) return;
    applying = true;
    try {
      const branding = detectBranding(root);
      [...root.querySelectorAll('.thread')].forEach(thread => {
        thread.classList.add('rx-brand-pending');
        const preview = thread.querySelector('p,.item-sub,.rx-stable-company-preview')?.textContent?.trim() || '';
        const name = branding?.name || 'Company';
        const src = branding?.src || '';

        thread.innerHTML = `${src ? `<img class="rx-stable-company-logo" src="${src}" alt="${name} logo">` : '<span class="rx-stable-company-logo"></span>'}<span class="rx-stable-company-copy"><b class="rx-stable-company-name">${name}</b><span class="rx-stable-company-preview">${preview}</span></span>`;
        thread.classList.add('rx-stable-branding');
        thread.classList.remove('rx-brand-pending');
      });
    } finally {
      applying = false;
    }
  };

  const attach = () => {
    const root = document.getElementById('threadList') || document.querySelector('#messagesPage .threads');
    if (!root) return false;

    root.querySelectorAll('.thread').forEach(thread => thread.classList.add('rx-brand-pending'));
    rebuildRows(root);

    if (root.dataset.rxBrandStabilizer !== 'true') {
      root.dataset.rxBrandStabilizer = 'true';
      new MutationObserver(() => {
        if (applying) return;
        root.querySelectorAll('.thread:not(.rx-stable-branding)').forEach(thread => thread.classList.add('rx-brand-pending'));
        rebuildRows(root);
      }).observe(root,{childList:true,subtree:false});
    }

    if (typeof window.renderMessages === 'function' && !window.renderMessages.__rxBrandWrapped) {
      const original = window.renderMessages;
      const wrapped = function(...args){
        const result = original.apply(this,args);
        root.querySelectorAll('.thread').forEach(thread => thread.classList.add('rx-brand-pending'));
        rebuildRows(root);
        return result;
      };
      wrapped.__rxBrandWrapped = true;
      window.renderMessages = wrapped;
    }
    return true;
  };

  if (!attach()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attach() || attempts > 40) clearInterval(timer);
    },250);
  }
})();