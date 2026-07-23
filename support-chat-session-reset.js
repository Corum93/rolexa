(() => {
  if (window.__rolexaSupportSessionResetV1) return;
  window.__rolexaSupportSessionResetV1 = true;

  const STORAGE_KEY = 'rolexa_support_chat_v1';
  const WELCOME = 'Hi, I’m the Rolexa support assistant. I can help with early access, candidate signups, employer access and the demo.';
  const QUICK_QUESTIONS = [
    'Is Rolexa live yet?',
    'I’m a candidate',
    'I’m an employer',
    'What happens after I join?'
  ];

  function clearStoredHistory() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
  }

  function addStyles() {
    if (document.getElementById('rxSupportSessionResetStylesV1')) return;
    const style = document.createElement('style');
    style.id = 'rxSupportSessionResetStylesV1';
    style.textContent = `
      .rx-chat-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .rx-chat-end{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.09);color:#fff;border-radius:999px;padding:7px 10px;font:800 11px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
      .rx-chat-end:hover{background:rgba(255,255,255,.16)}
      @media(max-width:420px){
        .rx-chat-head{padding:15px 14px 13px!important}
        .rx-chat-head-actions{gap:6px}
        .rx-chat-end{font-size:10px;padding:6px 8px}
      }
    `;
    document.head.appendChild(style);
  }

  function makeMessage(text, from = 'bot') {
    const message = document.createElement('div');
    message.className = `rx-msg ${from}`;
    message.textContent = text;
    return message;
  }

  function makeQuickQuestions(form, input) {
    const holder = document.createElement('div');
    holder.className = 'rx-chat-quick';
    QUICK_QUESTIONS.forEach(question => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rx-chip';
      button.textContent = question;
      button.addEventListener('click', () => {
        input.value = question;
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
      });
      holder.appendChild(button);
    });
    return holder;
  }

  function resetConversation({ closePanel = false } = {}) {
    const panel = document.querySelector('.rx-chat-panel');
    const body = panel?.querySelector('#rxChatBody');
    const form = panel?.querySelector('#rxChatForm');
    const input = panel?.querySelector('#rxChatInput');
    const typing = panel?.querySelector('#rxTyping');
    if (!panel || !body || !form || !input) return;

    clearStoredHistory();
    if (typing) typing.classList.remove('show');
    input.value = '';
    body.replaceChildren(makeMessage(WELCOME, 'bot'), makeQuickQuestions(form, input));
    body.scrollTop = 0;
    if (closePanel) panel.classList.remove('open');
  }

  function enhance() {
    const panel = document.querySelector('.rx-chat-panel');
    const head = panel?.querySelector('.rx-chat-head');
    const close = panel?.querySelector('.rx-chat-close');
    if (!panel || !head || !close) return false;
    if (panel.dataset.rxSessionResetReady === 'true') return true;
    panel.dataset.rxSessionResetReady = 'true';
    addStyles();

    let actions = head.querySelector('.rx-chat-head-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'rx-chat-head-actions';
      close.parentNode.insertBefore(actions, close);
      actions.appendChild(close);
    }

    const endButton = document.createElement('button');
    endButton.type = 'button';
    endButton.className = 'rx-chat-end';
    endButton.textContent = 'End conversation';
    endButton.addEventListener('click', () => {
      const confirmed = window.confirm('End this conversation? Your current messages will be cleared.');
      if (confirmed) resetConversation({ closePanel:true });
    });
    actions.insertBefore(endButton, close);

    close.addEventListener('click', () => resetConversation({ closePanel:true }), { capture:true });
    return true;
  }

  clearStoredHistory();

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (enhance() || attempts >= 80) clearInterval(timer);
  }, 50);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance, { once:true });
  } else {
    enhance();
  }
})();
