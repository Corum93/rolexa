(() => {
  if (window.__rolexaSupportFeedbackIntegration) return;
  window.__rolexaSupportFeedbackIntegration = true;

  const style = document.createElement('style');
  style.id = 'rxSupportFeedbackIntegrationStyles';
  style.textContent = `
    .rx-feedback-trigger{display:none!important}
    .rx-support-feedback-chip{border-color:rgba(23,107,255,.28)!important;background:#eef3ff!important;color:#2946c7!important}
    .rx-support-feedback-chip:before{content:'✦';margin-right:5px;color:#176bff}
  `;
  document.head.appendChild(style);

  const openFeedback = () => {
    const feedbackTrigger = document.getElementById('rxFeedbackTrigger');
    if (!feedbackTrigger) return false;
    const supportPanel = document.querySelector('.rx-chat-panel');
    if (supportPanel) supportPanel.classList.remove('open');
    feedbackTrigger.click();
    return true;
  };

  window.RolexaSupportFeedback = { open: openFeedback };

  const feedbackIntent = value => /\b(feedback|suggest(?:ion)?|improve(?:ment)?|feature request|report(?: a)? bug|bug report|not working|technical issue|complaint)\b/i.test(String(value || ''));

  const attach = () => {
    const panel = document.querySelector('.rx-chat-panel');
    const body = panel?.querySelector('.rx-chat-body');
    const form = panel?.querySelector('.rx-chat-form');
    const input = panel?.querySelector('.rx-chat-input');
    if (!panel || !body || !form || !input || !document.getElementById('rxFeedbackTrigger')) return false;

    if (!panel.querySelector('.rx-support-feedback-chip')) {
      let quickHolder = body.querySelector('.rx-chat-quick');
      if (!quickHolder) {
        quickHolder = document.createElement('div');
        quickHolder.className = 'rx-chat-quick';
        body.appendChild(quickHolder);
      }
      const button = document.createElement('button');
      button.className = 'rx-chip rx-support-feedback-chip';
      button.type = 'button';
      button.textContent = 'Give feedback';
      button.addEventListener('click', openFeedback);
      quickHolder.appendChild(button);
    }

    if (form.dataset.rxFeedbackIntent !== 'true') {
      form.dataset.rxFeedbackIntent = 'true';
      form.addEventListener('submit', event => {
        if (!feedbackIntent(input.value)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openFeedback();
      }, true);
    }

    return true;
  };

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (attach() || attempts > 80) clearInterval(timer);
  }, 150);

  if (document.readyState !== 'loading') attach();
  else document.addEventListener('DOMContentLoaded', attach, { once:true });
})();
