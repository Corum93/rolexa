(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;

  const positionNotification = () => {
    const topbar = document.querySelector('.topbar');
    const user = topbar?.querySelector('.user');
    const notification = document.getElementById('rxCandidateNotificationWrap');
    if (!topbar || !user || !notification) return false;

    let actions = document.getElementById('rxCandidateTopActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'rxCandidateTopActions';
      actions.className = 'rx-candidate-top-actions';
      topbar.insertBefore(actions, user);
      actions.appendChild(user);
    }

    if (notification.parentElement !== actions) {
      actions.insertBefore(notification, user);
    }

    if (!document.getElementById('rxCandidateNotificationPositionStyles')) {
      const style = document.createElement('style');
      style.id = 'rxCandidateNotificationPositionStyles';
      style.textContent = `
        .rx-candidate-top-actions{
          margin-left:auto;
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:10px;
          flex:0 0 auto;
          min-width:0;
        }
        .rx-candidate-top-actions .rx-notification-wrap{margin:0!important;flex:0 0 auto}
        .rx-candidate-top-actions .user{flex:0 0 auto}
        @media(max-width:760px){
          .topbar{display:flex!important;flex-wrap:wrap;align-items:center!important;gap:10px!important}
          .topbar .search{flex:1 0 100%;margin-bottom:0!important}
          .rx-candidate-top-actions{width:100%;margin-left:0;justify-content:flex-end;gap:8px}
          .rx-candidate-top-actions .user{min-width:0}
        }
      `;
      document.head.appendChild(style);
    }

    return true;
  };

  const start = () => {
    if (positionNotification()) return;
    const observer = new MutationObserver(() => {
      if (positionNotification()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
