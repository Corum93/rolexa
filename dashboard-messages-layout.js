(() => {
  if (window.__rolexaDashboardMessagesLayout) return;
  window.__rolexaDashboardMessagesLayout = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  const style = document.createElement('style');
  style.id = 'rxDashboardMessagesLayoutStyles';
  style.textContent = `
    /* Isolated messaging workspace. No global body or navigation rules. */
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
    #messagesPage .rx-stable-company-logo{width:45px;height:45px;border-radius:12px;object-fit:cover;display:block;flex:0 0 auto;background:#071025}
  `;
  document.head.appendChild(style);

  /* Candidate inboxes may be re-rendered by live profile/message refreshes. Cache the
     resolved company image and restore it immediately into each new thread node. */
  if (isCandidate) {
    const logoCache = new Map();

    const threadKey = thread => {
      const title = thread.querySelector('b,.item-title,strong')?.textContent?.trim();
      return title || thread.textContent.trim().slice(0,80);
    };

    const stabilizeLogos = root => {
      root.querySelectorAll('.thread').forEach(thread => {
        const key = threadKey(thread);
        const image = thread.querySelector('img');
        const validSrc = image?.currentSrc || image?.src || '';
        if (validSrc && !validSrc.startsWith('data:')) logoCache.set(key,validSrc);
        const cached = logoCache.get(key);
        if (!cached) return;

        let stable = thread.querySelector('.rx-stable-company-logo');
        if (!stable) {
          stable = document.createElement('img');
          stable.className = 'rx-stable-company-logo';
          stable.alt = `${key} logo`;
          const first = thread.firstElementChild;
          if (first && (first.matches('img,.logo') || first.querySelector?.('img'))) first.replaceWith(stable);
          else thread.prepend(stable);
        }
        if (stable.src !== cached) stable.src = cached;
      });
    };

    const attach = () => {
      const root = document.getElementById('threadList') || document.querySelector('#messagesPage .threads');
      if (!root || root.dataset.rxLogoStabilizer === 'true') return false;
      root.dataset.rxLogoStabilizer = 'true';
      stabilizeLogos(root);
      new MutationObserver(() => stabilizeLogos(root)).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
      return true;
    };

    if (!attach()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (attach() || attempts > 40) clearInterval(timer);
      },250);
    }
  }
})();