(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCandidateMobileMessagesPolish) return;
  window.__rolexaCandidateMobileMessagesPolish = true;

  const style = document.createElement('style');
  style.id = 'rxCandidateMobileMessagesPolish';
  style.textContent = `
    @media (max-width: 760px) {
      html, body { overflow-x: hidden !important; }
      #messagesPage,
      #messagesPage .card,
      #messagesPage .thread-wrap,
      #messagesPage .threads,
      #messagesPage .chat { min-width: 0 !important; max-width: 100% !important; }

      #messagesPage .page-head { margin-bottom: 16px !important; }
      #messagesPage .page-head h1 { font-size: 34px !important; line-height: 1.08 !important; }
      #messagesPage .page-head p { font-size: 15px !important; line-height: 1.5 !important; margin-top: 8px !important; }
      #messagesPage > .card { padding: 0 !important; border-radius: 18px !important; overflow: visible !important; }

      #messagesPage .thread-wrap { display: grid !important; grid-template-columns: 1fr !important; gap: 14px !important; }
      #messagesPage .threads { border-radius: 17px !important; overflow: hidden !important; }
      #messagesPage .thread { padding: 14px !important; }
      #messagesPage .rx-candidate-company-thread { grid-template-columns: 44px minmax(0, 1fr) !important; gap: 11px !important; }
      #messagesPage .rx-candidate-company-avatar { width: 44px !important; height: 44px !important; border-radius: 12px !important; }
      #messagesPage .rx-candidate-company-copy b { font-size: 15px !important; line-height: 1.25 !important; white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
      #messagesPage .rx-candidate-company-copy p { font-size: 12.5px !important; line-height: 1.42 !important; white-space: normal !important; overflow: hidden !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow-wrap: anywhere !important; }

      #messagesPage .chat { min-height: 560px !important; border-radius: 18px !important; overflow: hidden !important; }
      #messagesPage .chat-head { padding: 14px 15px !important; }
      #messagesPage .chat-head b { font-size: 17px !important; line-height: 1.25 !important; overflow-wrap: anywhere !important; }
      #messagesPage .chat-head .mini { display: block !important; margin-top: 5px !important; font-size: 12px !important; line-height: 1.4 !important; white-space: normal !important; overflow-wrap: anywhere !important; }
      #messagesPage .chat-body { padding: 15px !important; gap: 12px !important; min-width: 0 !important; overflow-x: hidden !important; }
      #messagesPage .bubble { max-width: 84% !important; padding: 11px 13px !important; font-size: 14.5px !important; line-height: 1.48 !important; overflow-wrap: anywhere !important; word-break: normal !important; }
      #messagesPage .bubble > div { font-size: 10.5px !important; line-height: 1.3 !important; margin-bottom: 5px !important; }
      #messagesPage .rx-interview-card { width: 100% !important; max-width: 100% !important; }

      #messagesPage .chat-form { position: sticky !important; bottom: 0 !important; z-index: 3 !important; display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; align-items: center !important; gap: 8px !important; padding: 11px 12px calc(11px + env(safe-area-inset-bottom)) !important; background: #fff !important; }
      #messagesPage .chat-form input { min-width: 0 !important; width: 100% !important; height: 46px !important; padding: 11px 14px !important; font-size: 16px !important; }
      #messagesPage .chat-form button { min-height: 46px !important; padding: 0 17px !important; white-space: nowrap !important; }

      body.rx-candidate-messages-open .rx-chat-launcher { right: 12px !important; bottom: calc(84px + env(safe-area-inset-bottom)) !important; padding: 11px 14px !important; font-size: 13px !important; opacity: .92 !important; }
    }

    @media (max-width: 390px) {
      #messagesPage .page-head h1 { font-size: 31px !important; }
      #messagesPage .bubble { max-width: 88% !important; font-size: 14px !important; }
      #messagesPage .chat-body { padding: 12px !important; }
      #messagesPage .chat-form { padding-left: 10px !important; padding-right: 10px !important; }
      #messagesPage .chat-form button { padding: 0 14px !important; }
      body.rx-candidate-messages-open .rx-chat-launcher span:last-child { display: none !important; }
      body.rx-candidate-messages-open .rx-chat-launcher { width: 46px !important; height: 46px !important; padding: 0 !important; justify-content: center !important; }
    }
  `;
  document.head.appendChild(style);

  function syncMessagesState() {
    const page = document.getElementById('messagesPage');
    document.body.classList.toggle('rx-candidate-messages-open', !!page?.classList.contains('active'));
  }

  syncMessagesState();
  const page = document.getElementById('messagesPage');
  if (page) new MutationObserver(syncMessagesState).observe(page, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', () => requestAnimationFrame(syncMessagesState), true);
})();