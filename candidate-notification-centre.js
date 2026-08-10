(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCandidateNotificationCentre) return;
  window.__rolexaCandidateNotificationCentre = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let notifications = [];
  let channel = null;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-candidate-notification-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Connection could not be established')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxCandidateNotificationSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Connection could not be established'));
      document.head.appendChild(script);
    });
  }

  function addStyles() {
    if (document.getElementById('rxCandidateNotificationStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateNotificationStyles';
    style.textContent = `
      .rx-notification-wrap{position:relative;display:flex;align-items:center}
      .rx-notification-bell{position:relative;width:42px;height:42px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.055));color:#EAF0FF;display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 20px rgba(0,0,0,.12);transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease,box-shadow .18s ease}
      .rx-notification-bell-icon{width:20px;height:20px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .rx-notification-bell:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.26);color:#fff;transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 10px 24px rgba(0,0,0,.18)}
      .rx-notification-bell:focus-visible{outline:3px solid rgba(103,145,255,.5);outline-offset:3px}
      .rx-notification-bell[aria-expanded="true"]{background:rgba(64,105,230,.28);border-color:rgba(133,164,255,.48);color:#fff}
      .rx-notification-badge{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E0533F;color:#fff;border:2px solid #071025;display:none;align-items:center;justify-content:center;font-size:10px;font-weight:900}
      .rx-notification-badge.show{display:flex}
      .rx-notification-panel{position:absolute;top:52px;right:0;width:min(390px,calc(100vw - 32px));max-height:580px;overflow:hidden;background:#fff;color:#071025;border:1px solid rgba(7,16,37,.1);border-radius:20px;box-shadow:0 24px 65px rgba(7,16,37,.24);z-index:10020;display:none}
      .rx-notification-panel.open{display:block}
      .rx-notification-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px 13px;border-bottom:1px solid rgba(7,16,37,.08)}
      .rx-notification-head h3{font-size:18px;margin:0}.rx-notification-head p{margin:3px 0 0;color:#6B7280;font-size:11.5px}
      .rx-notification-mark-all{border:0;background:#EEF3FF;color:#2946C7;border-radius:999px;padding:8px 10px;font-size:10.5px;font-weight:900;white-space:nowrap}
      .rx-notification-list{max-height:480px;overflow:auto;padding:8px}
      .rx-notification-item{width:100%;border:0;border-radius:15px;padding:13px;display:grid;grid-template-columns:38px minmax(0,1fr);gap:11px;text-align:left;background:#fff;color:#071025}
      .rx-notification-item:hover{background:#F5F7FC}.rx-notification-item.unread{background:#EEF3FF}
      .rx-notification-icon{width:38px;height:38px;border-radius:12px;background:#E1F6EB;color:#176B49;display:grid;place-items:center;font-size:18px}
      .rx-notification-item.offer .rx-notification-icon{background:#FFF3D6;color:#8A5600}.rx-notification-item.hired .rx-notification-icon{background:#E1F6EB;color:#176B49}.rx-notification-item.rejected .rx-notification-icon{background:#FBE4E1;color:#A33327}
      .rx-notification-copy{min-width:0}.rx-notification-copy strong{display:block;font-size:12.5px;line-height:1.35}.rx-notification-copy p{margin:4px 0 0;color:#4B5874;font-size:11.5px;line-height:1.45}.rx-notification-copy time{display:block;margin-top:6px;color:#7C88A2;font-size:10px;font-weight:800}
      .rx-notification-empty{padding:34px 20px;text-align:center;color:#6B7280;font-size:12.5px;line-height:1.5}
      .rx-candidate-alert{margin:0 0 18px;padding:16px 18px;border:1px solid rgba(76,116,255,.25);border-radius:18px;background:linear-gradient(135deg,#EEF3FF,#fff);display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:13px;align-items:center;box-shadow:0 12px 34px rgba(7,16,37,.05)}
      .rx-candidate-alert-icon{width:44px;height:44px;border-radius:14px;background:#176BFF;color:#fff;display:grid;place-items:center;font-size:20px}.rx-candidate-alert-copy{min-width:0}.rx-candidate-alert-copy small{display:block;color:#2946C7;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}.rx-candidate-alert-copy strong{display:block;font-size:14px}.rx-candidate-alert-copy p{margin:4px 0 0;color:#5B6780;font-size:12px;line-height:1.4}.rx-candidate-alert-button{border:0;background:#176BFF;color:#fff;border-radius:999px;padding:10px 14px;font-size:11.5px;font-weight:900;white-space:nowrap}
      @media(max-width:760px){
        .rx-notification-wrap{margin-right:8px}.rx-notification-bell{width:40px;height:40px}
        .rx-notification-panel{position:fixed;top:82px;left:12px;right:12px;width:auto;max-height:calc(100vh - 108px)}.rx-notification-list{max-height:calc(100vh - 190px)}
        .rx-candidate-alert{grid-template-columns:40px minmax(0,1fr);padding:14px;gap:11px}.rx-candidate-alert-icon{width:40px;height:40px}.rx-candidate-alert-button{grid-column:1/-1;width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return ''; }
  }

  function iconFor(type) {
    if (type === 'offer_received') return '★';
    if (type === 'candidate_hired') return '✓';
    if (type === 'application_rejected') return '×';
    return '↗';
  }

  function classFor(type) {
    if (type === 'offer_received') return 'offer';
    if (type === 'candidate_hired') return 'hired';
    if (type === 'application_rejected') return 'rejected';
    return '';
  }

  function unreadCount() {
    return notifications.filter(item => !item.is_read).length;
  }

  function ensureUI() {
    if (document.getElementById('rxCandidateNotificationWrap')) return;
    const topUser = document.querySelector('.topbar .user');
    if (!topUser) return;

    const wrap = document.createElement('div');
    wrap.id = 'rxCandidateNotificationWrap';
    wrap.className = 'rx-notification-wrap';
    wrap.innerHTML = `
      <button class="rx-notification-bell" id="rxCandidateNotificationBell" type="button" aria-label="Open notifications" aria-expanded="false"><svg class="rx-notification-bell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="rx-notification-badge" id="rxCandidateNotificationBadge">0</span></button>
      <section class="rx-notification-panel" id="rxCandidateNotificationPanel" aria-label="Candidate notifications">
        <div class="rx-notification-head"><div><h3>Notifications</h3><p>Updates about your applications.</p></div><button class="rx-notification-mark-all" id="rxCandidateMarkAll" type="button">Mark all read</button></div>
        <div class="rx-notification-list" id="rxCandidateNotificationList"></div>
      </section>`;
    topUser.parentNode.insertBefore(wrap, topUser);

    const bell = document.getElementById('rxCandidateNotificationBell');
    const panel = document.getElementById('rxCandidateNotificationPanel');
    bell.addEventListener('click', event => {
      event.stopPropagation();
      const open = panel.classList.toggle('open');
      bell.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => {
      panel.classList.remove('open');
      bell.setAttribute('aria-expanded', 'false');
    });
    document.getElementById('rxCandidateMarkAll').addEventListener('click', markAllRead);
  }

  function renderPanel() {
    ensureUI();
    const list = document.getElementById('rxCandidateNotificationList');
    const badge = document.getElementById('rxCandidateNotificationBadge');
    if (!list || !badge) return;

    const count = unreadCount();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('show', count > 0);

    if (!notifications.length) {
      list.innerHTML = '<div class="rx-notification-empty"><strong>No notifications yet</strong><br>Your application updates will appear here.</div>';
      return;
    }

    list.innerHTML = notifications.map(item => `
      <button type="button" class="rx-notification-item ${item.is_read ? '' : 'unread'} ${classFor(item.notification_type)}" data-notification-id="${safe(item.id)}" data-application-id="${safe(item.application_id)}">
        <span class="rx-notification-icon">${iconFor(item.notification_type)}</span>
        <span class="rx-notification-copy"><strong>${safe(item.title)}</strong><p>${safe(item.message)}</p><time>${safe(formatDate(item.created_at))}</time></span>
      </button>`).join('');

    list.querySelectorAll('[data-notification-id]').forEach(button => {
      button.addEventListener('click', async () => {
        await markRead(button.dataset.notificationId);
        document.getElementById('rxCandidateNotificationPanel')?.classList.remove('open');
        if (typeof window.showView === 'function') window.showView('applications');
      });
    });
  }

  function renderOverviewAlert() {
    document.getElementById('rxCandidateLatestAlert')?.remove();
    const latest = notifications.find(item => !item.is_read);
    if (!latest) return;
    const overview = document.getElementById('overviewPage');
    if (!overview) return;
    const head = overview.querySelector('.page-head');
    const alert = document.createElement('section');
    alert.id = 'rxCandidateLatestAlert';
    alert.className = 'rx-candidate-alert';
    alert.innerHTML = `<div class="rx-candidate-alert-icon">${iconFor(latest.notification_type)}</div><div class="rx-candidate-alert-copy"><small>New application update</small><strong>${safe(latest.title)}</strong><p>${safe(latest.message)}</p></div><button type="button" class="rx-candidate-alert-button">View application</button>`;
    alert.querySelector('button').addEventListener('click', async () => {
      await markRead(latest.id);
      if (typeof window.showView === 'function') window.showView('applications');
    });
    if (head) head.insertAdjacentElement('afterend', alert);
    else overview.prepend(alert);
  }

  function render() {
    renderPanel();
    renderOverviewAlert();
  }

  async function loadNotifications() {
    const { data, error } = await client
      .from('candidate_notifications')
      .select('id,application_id,job_id,notification_type,title,message,company_name,job_title,stage_name,is_read,read_at,email_delivery_enabled,created_at')
      .eq('candidate_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    notifications = data || [];
    render();
  }

  async function markRead(id) {
    const item = notifications.find(row => row.id === id);
    if (!item || item.is_read) return;
    const now = new Date().toISOString();
    const { error } = await client
      .from('candidate_notifications')
      .update({ is_read: true, read_at: now })
      .eq('id', id)
      .eq('candidate_user_id', user.id);
    if (error) { console.warn('[Rolexa] Could not mark notification read', error); return; }
    item.is_read = true;
    item.read_at = now;
    render();
  }

  async function markAllRead() {
    if (!unreadCount()) return;
    const now = new Date().toISOString();
    const { error } = await client
      .from('candidate_notifications')
      .update({ is_read: true, read_at: now })
      .eq('candidate_user_id', user.id)
      .eq('is_read', false);
    if (error) { console.warn('[Rolexa] Could not mark all notifications read', error); return; }
    notifications.forEach(item => { if (!item.is_read) { item.is_read = true; item.read_at = now; } });
    render();
  }

  function subscribe() {
    channel = client
      .channel(`candidate-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'candidate_notifications', filter: `candidate_user_id=eq.${user.id}`
      }, () => loadNotifications().catch(error => console.warn('[Rolexa] Notification refresh failed', error)))
      .subscribe();
  }

  async function init() {
    addStyles();
    ensureUI();
    try {
      const library = await loadSupabase();
      client = library.createClient(CONFIG.url, CONFIG.key);
      const { data } = await client.auth.getSession();
      user = data?.session?.user;
      if (!user) return;
      await loadNotifications();
      subscribe();
    } catch (error) {
      console.warn('[Rolexa] Candidate notification centre could not load', error);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (client && channel) client.removeChannel(channel);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
