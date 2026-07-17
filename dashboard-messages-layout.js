(() => {
  if (window.__rolexaDashboardMessagesLayoutV2) return;
  window.__rolexaDashboardMessagesLayoutV2 = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  const style = document.createElement('style');
  style.id = 'rxDashboardMessagesLayoutStylesV2';
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
      body:has(#messagesPage.active) .rx-chat-launcher{display:flex!important;visibility:visible!important;opacity:1!important;right:22px!important;top:154px!important;bottom:auto!important}
    }
    @media (max-width:1100px){
      #messagesPage.active .thread-wrap,#messagesPage.active .rx-employer-inbox{height:auto;max-height:none;min-height:0;overflow:visible}
      #messagesPage.active .threads,#messagesPage.active .rx-employer-threads{max-height:240px;overflow-y:auto;overscroll-behavior:contain}
      #messagesPage.active .chat,#messagesPage.active .rx-employer-chat{min-height:520px}
      #messagesPage.active .chat-body,#messagesPage.active .rx-employer-chat-body{max-height:58vh;overflow-y:auto;overscroll-behavior:contain}
      body:has(#messagesPage.active) .rx-feedback-trigger{right:14px!important;top:88px!important;bottom:auto!important}
      body:has(#messagesPage.active) .rx-chat-launcher{display:flex!important;visibility:visible!important;opacity:1!important;right:14px!important;top:146px!important;bottom:auto!important}
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
  `;
  document.head.appendChild(style);
})();