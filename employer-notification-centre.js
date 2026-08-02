(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaEmployerNotificationCentre) return;
  window.__rolexaEmployerNotificationCentre = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let user = null;
  let notifications = [];
  let channel = null;
  let refreshTimer = null;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-employer-notification-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Connection could not be established')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxEmployerNotificationSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Connection could not be established'));
      document.head.appendChild(script);
    });
  }

  function addStyles() {
    if (document.getElementById('rxEmployerNotificationStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerNotificationStyles';
    style.textContent = `
      .rx-employer-top-actions{display:flex;align-items:center;gap:10px;min-width:0}
      .rx-employer-notification-wrap{position:relative;display:flex;align-items:center;flex:0 0 auto}
      .rx-employer-notification-bell{position:relative;width:42px;height:42px;border-radius:13px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;font-size:19px;font-weight:900}
      .rx-employer-notification-bell:hover{background:rgba(255,255,255,.14)}
      .rx-employer-notification-badge{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#E0533F;color:#fff;border:2px solid #071025;display:none;align-items:center;justify-content:center;font-size:10px;font-weight:900}
      .rx-employer-notification-badge.show{display:flex}
      .rx-employer-notification-panel{position:absolute;top:52px;right:0;width:min(410px,calc(100vw - 32px));max-height:590px;overflow:hidden;background:#fff;color:#071025;border:1px solid rgba(7,16,37,.1);border-radius:20px;box-shadow:0 24px 65px rgba(7,16,37,.24);z-index:10020;display:none}
      .rx-employer-notification-panel.open{display:block}
      .rx-employer-notification-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px 13px;border-bottom:1px solid rgba(7,16,37,.08)}
      .rx-employer-notification-head h3{font-size:18px;margin:0}.rx-employer-notification-head p{margin:3px 0 0;color:#6B7280;font-size:11.5px;line-height:1.4}
      .rx-employer-notification-mark-all{border:0;background:#EEF3FF;color:#2946C7;border-radius:999px;padding:8px 10px;font-size:10.5px;font-weight:900;white-space:nowrap}
      .rx-employer-notification-list{max-height:490px;overflow:auto;padding:8px}
      .rx-employer-notification-item{width:100%;border:0;border-radius:15px;padding:13px;display:grid;grid-template-columns:38px minmax(0,1fr);gap:11px;text-align:left;background:#fff;color:#071025}
      .rx-employer-notification-item:hover{background:#F5F7FC}.rx-employer-notification-item.unread{background:#EEF3FF}
      .rx-employer-notification-icon{width:38px;height:38px;border-radius:12px;background:#E9EDFF;color:#2946C7;display:grid;place-items:center;font-size:18px;font-weight:900}
      .rx-employer-notification-item.application .rx-employer-notification-icon{background:#E1F6EB;color:#176B49}
      .rx-employer-notification-item.interview .rx-employer-notification-icon{background:#FFF3D6;color:#8A5600}
      .rx-employer-notification-item.withdrawn .rx-employer-notification-icon{background:#FBE4E1;color:#A33327}
      .rx-employer-notification-copy{min-width:0}.rx-employer-notification-copy strong{display:block;font-size:12.5px;line-height:1.35}.rx-employer-notification-copy p{margin:4px 0 0;color:#4B5874;font-size:11.5px;line-height:1.45}.rx-employer-notification-copy time{display:block;margin-top:6px;color:#7C88A2;font-size:10px;font-weight:800}
      .rx-employer-notification-empty{padding:34px 20px;text-align:center;color:#6B7280;font-size:12.5px;line-height:1.5}
      @media(max-width:760px){
        .rx-employer-top-actions{justify-content:flex-end;margin-top:10px;width:100%}.rx-employer-notification-bell{width:40px;height:40px}
        .rx-employer-notification-panel{position:fixed;top:138px;left:12px;right:12px;width:auto;max-height:calc(100vh - 164px)}.rx-employer-notification-list{max-height:calc(100vh - 246px)}
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
    if (type === 'new_application') return '+';
    if (type === 'candidate_reply') return '↩';
    if (type === 'interview_confirmed') return '✓';
    if (type === 'application_withdrawn') return '×';
    return '↗';
  }

  function classFor(type) {
    if (type === 'new_application') return 'application';
    if (type === 'interview_confirmed') return 'interview';
    if (type === 'application_withdrawn') return 'withdrawn';
    return '';
  }

  function unreadCount() {
    return notifications.filter(item => !item.is_read).length;
  }

  function ensureUI() {
    if (document.getElementById('rxEmployerNotificationWrap')) return;
    const topbar = document.querySelector('.topbar');
    const topUser = topbar?.querySelector('.user');
    if (!topbar || !topUser) return;

    let actions = document.getElementById('rxEmployerTopActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'rxEmployerTopActions';
      actions.className = 'rx-employer-top-actions';
      topbar.insertBefore(actions, topUser);
      actions.appendChild(topUser);
    }

    const wrap = document.createElement('div');
    wrap.id = 'rxEmployerNotificationWrap';
    wrap.className = 'rx-employer-notification-wrap';
    wrap.innerHTML = `
      <button class="rx-employer-notification-bell" id="rxEmployerNotificationBell" type="button" aria-label="Open employer notifications" aria-expanded="false">♢<span class="rx-employer-notification-badge" id="rxEmployerNotificationBadge">0</span></button>
      <section class="rx-employer-notification-panel" id="rxEmployerNotificationPanel" aria-label="Employer notifications">
        <div class="rx-employer-notification-head"><div><h3>Notifications</h3><p>Candidate activity across your roles.</p></div><button class="rx-employer-notification-mark-all" id="rxEmployerMarkAll" type="button">Mark all read</button></div>
        <div class="rx-employer-notification-list" id="rxEmployerNotificationList"></div>
      </section>`;
    actions.insertBefore(wrap, topUser);

    const bell = document.getElementById('rxEmployerNotificationBell');
    const panel = document.getElementById('rxEmployerNotificationPanel');
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
    document.getElementById('rxEmployerMarkAll').addEventListener('click', markAllRead);
  }

  function openNotification(item) {
    const target = item.action_target === 'messages' ? 'messages' : 'matches';
    if (typeof window.rolexaEmployerShowView === 'function') {
      window.rolexaEmployerShowView(target);
    }
    if (target === 'matches' && item.application_id) {
      window.setTimeout(() => {
        const selector = `[data-app-id="${String(item.application_id).replace(/["\\]/g, '\\$&')}"]`;
        document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 220);
    }
  }

  function render() {
    ensureUI();
    const list = document.getElementById('rxEmployerNotificationList');
    const badge = document.getElementById('rxEmployerNotificationBadge');
    if (!list || !badge) return;

    const count = unreadCount();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('show', count > 0);

    if (!notifications.length) {
      list.innerHTML = '<div class="rx-employer-notification-empty"><strong>No notifications yet.</strong><br>New candidate activity will appear here.</div>';
      return;
    }

    list.innerHTML = notifications.map(item => `
      <button type="button" class="rx-employer-notification-item ${item.is_read ? '' : 'unread'} ${classFor(item.notification_type)}" data-employer-notification-id="${safe(item.id)}">
        <span class="rx-employer-notification-icon">${iconFor(item.notification_type)}</span>
        <span class="rx-employer-notification-copy"><strong>${safe(item.title)}</strong><p>${safe(item.message)}</p><time>${safe(formatDate(item.created_at))}</time></span>
      </button>`).join('');

    list.querySelectorAll('[data-employer-notification-id]').forEach(button => {
      button.addEventListener('click', async () => {
        const item = notifications.find(row => row.id === button.dataset.employerNotificationId);
        if (!item) return;
        await markRead(item.id);
        document.getElementById('rxEmployerNotificationPanel')?.classList.remove('open');
        openNotification(item);
      });
    });
  }

  async function loadNotifications() {
    const { data, error } = await client
      .from('employer_notifications')
      .select('id,application_id,job_id,candidate_user_id,notification_type,title,message,action_target,is_read,read_at,email_delivery_enabled,created_at')
      .eq('employer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(75);
    if (error) throw error;
    notifications = data || [];
    render();
  }

  async function markRead(id) {
    const item = notifications.find(row => row.id === id);
    if (!item || item.is_read) return;
    const now = new Date().toISOString();
    const { error } = await client
      .from('employer_notifications')
      .update({ is_read: true, read_at: now })
      .eq('id', id)
      .eq('employer_user_id', user.id);
    if (error) {
      console.warn('[Rolexa] Could not mark employer notification read', error);
      return;
    }
    item.is_read = true;
    item.read_at = now;
    render();
  }

  async function markAllRead() {
    if (!unreadCount()) return;
    const now = new Date().toISOString();
    const { error } = await client
      .from('employer_notifications')
      .update({ is_read: true, read_at: now })
      .eq('employer_user_id', user.id)
      .eq('is_read', false);
    if (error) {
      console.warn('[Rolexa] Could not mark all employer notifications read', error);
      return;
    }
    notifications.forEach(item => {
      if (!item.is_read) {
        item.is_read = true;
        item.read_at = now;
      }
    });
    render();
  }

  function subscribe() {
    channel = client
      .channel(`employer-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'employer_notifications', filter: `employer_user_id=eq.${user.id}`
      }, () => loadNotifications().catch(error => console.warn('[Rolexa] Employer notification refresh failed', error)))
      .subscribe();
    refreshTimer = window.setInterval(() => {
      loadNotifications().catch(() => {});
    }, 15000);
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
      console.warn('[Rolexa] Employer notification centre could not load', error);
    }
  }

  window.addEventListener('beforeunload', () => {
    if (client && channel) client.removeChannel(channel);
    if (refreshTimer) window.clearInterval(refreshTimer);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
