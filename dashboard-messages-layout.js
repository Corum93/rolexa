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
    #messagesPage .rx-stable-company-logo{width:45px;height:45px;border-radius:12px;object-fit:cover;display:block;grid-column:1;grid-row:1 / span 2;align-self:center;background:#071025}
    #messagesPage .threads .thread.rx-stable-branding{display:grid!important;grid-template-columns:45px minmax(0,1fr)!important;column-gap:12px!important;row-gap:3px!important;align-items:center!important}
    #messagesPage .threads .thread.rx-stable-branding>b,
    #messagesPage .threads .thread.rx-stable-branding>strong,
    #messagesPage .threads .thread.rx-stable-branding>.item-title{grid-column:2;grid-row:1;min-width:0;margin:0!important}
    #messagesPage .threads .thread.rx-stable-branding>p,
    #messagesPage .threads .thread.rx-stable-branding>.item-sub{grid-column:2;grid-row:2;min-width:0;margin:0!important}
  `;
  document.head.appendChild(style);

  /* The candidate inbox is refreshed by more than one data source. The stable company
     profile state can briefly be replaced by a job-title fallback. Capture branding by
     conversation position, then restore both name and image after every list refresh. */
  if (isCandidate) {
    const brandingByPosition = new Map();
    let applying = false;
    let queued = false;

    const validImageSource = image => {
      const source = image?.currentSrc || image?.src || '';
      return source && !source.startsWith('data:') ? source : '';
    };

    const titleNode = thread => thread.querySelector(':scope > b,:scope > strong,:scope > .item-title') || thread.querySelector('b,strong,.item-title');

    const captureAndRestore = root => {
      if (applying) return;
      applying = true;
      try {
        [...root.querySelectorAll('.thread')].forEach((thread,index) => {
          const title = titleNode(thread);
          const image = thread.querySelector('img:not(.rx-stable-company-logo),.rx-stable-company-logo');
          const source = validImageSource(image);
          const visibleName = title?.textContent?.trim() || '';

          /* A real company image is the authoritative branding signal. */
          if (source && visibleName && !/^test$/i.test(visibleName)) {
            brandingByPosition.set(index,{src:source,name:visibleName});
          }

          const branding = brandingByPosition.get(index);
          if (!branding) return;

          thread.classList.add('rx-stable-branding');
          if (title && title.textContent.trim() !== branding.name) title.textContent = branding.name;

          let stable = thread.querySelector('.rx-stable-company-logo');
          if (!stable) {
            stable = document.createElement('img');
            stable.className = 'rx-stable-company-logo';
            stable.alt = `${branding.name} logo`;
            const directVisual = [...thread.children].find(child => child.matches?.('img,.logo') || child.classList?.contains('rx-stable-company-logo'));
            if (directVisual) directVisual.replaceWith(stable);
            else thread.prepend(stable);
          }
          if (stable.src !== branding.src) stable.src = branding.src;
          stable.alt = `${branding.name} logo`;
        });
      } finally {
        applying = false;
      }
    };

    const schedule = root => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        captureAndRestore(root);
      });
    };

    const attach = () => {
      const root = document.getElementById('threadList') || document.querySelector('#messagesPage .threads');
      if (!root || root.dataset.rxBrandStabilizer === 'true') return false;
      root.dataset.rxBrandStabilizer = 'true';
      captureAndRestore(root);
      new MutationObserver(() => schedule(root)).observe(root,{childList:true,subtree:true,characterData:true});
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