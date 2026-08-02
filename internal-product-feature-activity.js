(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureActivity) return;
  window.__rolexaInternalProductFeatureActivity = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let activeFeatureTitle = '';
  let activeFeatureId = '';
  let requestNumber = 0;
  let renderTimer = null;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const humanize = value => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  function addStyles() {
    if (document.getElementById('rxFeatureActivityStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxFeatureActivityStyles';
    style.textContent = `
      .rx-feature-activity-card{margin-top:16px;padding:20px;border:1px solid rgba(7,16,37,.09);border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(7,16,37,.045)}
      .rx-feature-activity-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.rx-feature-activity-head h3{font-size:16px;margin:0}.rx-feature-activity-head p{margin:4px 0 0;color:#7a869c;font-size:11px;line-height:1.45}.rx-feature-activity-refresh{border:1px solid rgba(36,107,253,.2);border-radius:999px;background:#edf3ff;color:#1f5bd7;padding:8px 11px;font-size:10px;font-weight:900;cursor:pointer}
      .rx-feature-activity-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.rx-feature-activity-summary span{padding:7px 10px;border-radius:999px;background:#f2f5fa;color:#61708a;font-size:10px;font-weight:900}
      .rx-feature-activity-groups{display:grid;gap:18px}.rx-feature-activity-date{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#71809b;margin-bottom:8px}.rx-feature-activity-list{position:relative;display:grid;gap:0}.rx-feature-activity-list:before{content:'';position:absolute;left:8px;top:11px;bottom:11px;width:2px;background:#e5ebf6}.rx-feature-activity-item{position:relative;display:grid;grid-template-columns:18px 1fr auto;gap:11px;padding:8px 0}.rx-feature-activity-dot{position:relative;z-index:1;width:10px;height:10px;margin-top:5px;border-radius:50%;background:#2c6df6;box-shadow:0 0 0 4px #eaf1ff}.rx-feature-activity-dot.success{background:#24a36a;box-shadow:0 0 0 4px #e2f6ed}.rx-feature-activity-dot.warning{background:#d69314;box-shadow:0 0 0 4px #fff2d9}.rx-feature-activity-dot.danger{background:#c84a3d;box-shadow:0 0 0 4px #fde8e5}.rx-feature-activity-copy b{display:block;font-size:11.5px;line-height:1.45;color:#101a32}.rx-feature-activity-copy small{display:block;margin-top:3px;color:#7b879c;font-size:10px;line-height:1.45}.rx-feature-activity-time{padding-top:2px;color:#7d899e;font-size:9.5px;font-weight:800;white-space:nowrap}.rx-feature-activity-empty,.rx-feature-activity-loading,.rx-feature-activity-error{padding:20px;border:1px dashed rgba(7,16,37,.14);border-radius:14px;text-align:center;color:#778399;background:#fafbfe;font-size:11px}.rx-feature-activity-error{color:#a33327;background:#fff5f3;border-color:#f2c4bf}
      @media(max-width:700px){.rx-feature-activity-card{padding:17px}.rx-feature-activity-head{align-items:flex-start}.rx-feature-activity-item{grid-template-columns:18px 1fr}.rx-feature-activity-time{grid-column:2;padding-top:0}}
    `;
    document.head.appendChild(style);
  }

  async function getClient() {
    if (client) return client;
    const library = window.supabase?.createClient ? window.supabase : await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
    client = library.createClient(CONFIG.url, CONFIG.key);
    return client;
  }

  function getPanelContent() {
    return document.getElementById('rxFeatureDetailContent');
  }

  function getFeatureTitle() {
    return document.getElementById('rxFeatureDetailTitle')?.textContent?.trim() || '';
  }

  function ensureSection() {
    const content = getPanelContent();
    if (!content || !getFeatureTitle()) return null;
    let section = document.getElementById('rxFeatureActivitySection');
    if (section && content.contains(section)) return section;
    section = document.createElement('section');
    section.id = 'rxFeatureActivitySection';
    section.className = 'rx-feature-activity-card';
    section.innerHTML = `
      <div class="rx-feature-activity-head">
        <div><h3>Activity timeline</h3><p>A secure history of changes made to this feature.</p></div>
        <button class="rx-feature-activity-refresh" type="button">Refresh history</button>
      </div>
      <div id="rxFeatureActivityBody" class="rx-feature-activity-loading">Loading feature history…</div>`;
    content.appendChild(section);
    section.querySelector('.rx-feature-activity-refresh')?.addEventListener('click', () => loadActivity(true));
    return section;
  }

  function dateKey(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toISOString().slice(0, 10);
  }

  function dateLabel(key) {
    if (key === 'Unknown date') return key;
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    if (key === todayKey) return 'Today';
    if (key === yesterdayKey) return 'Yesterday';
    const date = new Date(`${key}T12:00:00`);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function timeLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function tone(type) {
    const value = String(type || '');
    if (/deleted|blocked|critical/.test(value)) return 'danger';
    if (/completed|resolved|created|added/.test(value)) return 'success';
    if (/reopened|priority|date|release/.test(value)) return 'warning';
    return '';
  }

  function actorText(item) {
    if (item.actor_name) return `${item.actor_name}${item.actor_job_title ? ` · ${item.actor_job_title}` : ''}`;
    return 'Recorded automatically by Rolexa';
  }

  function renderActivity(items) {
    const body = document.getElementById('rxFeatureActivityBody');
    if (!body) return;
    if (!items.length) {
      body.className = 'rx-feature-activity-empty';
      body.innerHTML = 'No activity has been recorded yet. Make a feature edit, add a checklist item, dependency, bug or improvement to begin the timeline.';
      return;
    }

    const groups = new Map();
    items.forEach(item => {
      const key = dateKey(item.created_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    body.className = '';
    body.innerHTML = `
      <div class="rx-feature-activity-summary"><span>${items.length} recent update${items.length === 1 ? '' : 's'}</span><span>Newest first</span></div>
      <div class="rx-feature-activity-groups">${Array.from(groups.entries()).map(([key, group]) => `
        <section>
          <div class="rx-feature-activity-date">${safe(dateLabel(key))}</div>
          <div class="rx-feature-activity-list">${group.map(item => `
            <article class="rx-feature-activity-item">
              <span class="rx-feature-activity-dot ${tone(item.activity_type)}"></span>
              <div class="rx-feature-activity-copy">
                <b>${safe(item.activity_message || humanize(item.activity_type))}</b>
                <small>${safe(actorText(item))} · ${safe(humanize(item.activity_type))}</small>
              </div>
              <time class="rx-feature-activity-time">${safe(timeLabel(item.created_at))}</time>
            </article>`).join('')}</div>
        </section>`).join('')}</div>`;
  }

  async function resolveFeatureId(title) {
    if (activeFeatureTitle === title && activeFeatureId) return activeFeatureId;
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('product_feature_details')
      .select('id,title')
      .eq('title', title)
      .single();
    if (error) throw error;
    activeFeatureTitle = title;
    activeFeatureId = data?.id || '';
    return activeFeatureId;
  }

  async function loadActivity(force = false) {
    const title = getFeatureTitle();
    const section = ensureSection();
    const body = document.getElementById('rxFeatureActivityBody');
    if (!title || !section || !body) return;
    if (!force && section.dataset.loadedFor === title) return;
    const requestId = ++requestNumber;
    body.className = 'rx-feature-activity-loading';
    body.textContent = 'Loading feature history…';
    try {
      const supabase = await getClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) throw new Error('Sign in with an active Rolexa staff account.');
      const featureId = await resolveFeatureId(title);
      if (!featureId) throw new Error('This feature could not be identified.');
      const { data, error } = await supabase
        .from('product_feature_activity_details')
        .select('*')
        .eq('feature_id', featureId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (requestId !== requestNumber) return;
      section.dataset.loadedFor = title;
      renderActivity(data || []);
    } catch (error) {
      console.error('Rolexa feature activity failed', error);
      if (requestId !== requestNumber) return;
      body.className = 'rx-feature-activity-error';
      body.textContent = error?.message || 'Feature history could not load.';
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const title = getFeatureTitle();
      if (!title) return;
      if (title !== activeFeatureTitle) {
        activeFeatureTitle = '';
        activeFeatureId = '';
      }
      ensureSection();
      loadActivity(false);
    }, 120);
  }

  addStyles();
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', event => {
    if (event.target.closest('.rx-check-add,.rx-check-toggle,.rx-check-delete,.rx-dependency-add,.rx-dependency-delete,.rx-work-add,.rx-work-action,.rx-feature-editor-save')) {
      setTimeout(() => {
        const section = document.getElementById('rxFeatureActivitySection');
        if (section) delete section.dataset.loadedFor;
        loadActivity(true);
      }, 900);
    }
  });
  scheduleRender();
})();