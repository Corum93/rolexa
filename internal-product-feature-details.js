(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureDetails) return;
  window.__rolexaInternalProductFeatureDetails = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let currentRequest = 0;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const humanize = value => String(value || 'Not set')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  const formatDate = value => {
    if (!value) return 'Not set';
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  function addStyles() {
    if (document.getElementById('rxFeatureDetailStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxFeatureDetailStyles';
    style.textContent = `
      .rx-roadmap-feature{cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.rx-roadmap-feature:hover{transform:translateY(-2px);border-color:rgba(36,107,253,.28);box-shadow:0 14px 30px rgba(7,28,74,.09)}.rx-roadmap-feature:focus-visible{outline:3px solid rgba(36,107,253,.28);outline-offset:3px}
      .rx-feature-overlay{position:fixed;inset:0;z-index:9999;display:none;background:rgba(4,12,31,.52);backdrop-filter:blur(8px)}.rx-feature-overlay.open{display:block}.rx-feature-panel{position:absolute;top:0;right:0;width:min(620px,100%);height:100%;overflow:auto;background:#f7f9fd;box-shadow:-28px 0 80px rgba(4,12,31,.25);animation:rxFeatureIn .22s ease both}.rx-feature-panel-inner{padding:28px}.rx-feature-close{position:sticky;top:0;z-index:2;float:right;width:42px;height:42px;border:1px solid rgba(7,16,37,.1);border-radius:13px;background:#fff;color:#071025;font-size:20px;font-weight:800;box-shadow:0 10px 26px rgba(7,16,37,.09)}
      .rx-feature-kicker{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#5271c7;margin-bottom:8px}.rx-feature-title{padding-right:58px;font-family:'Space Grotesk',sans-serif;font-size:34px;line-height:1.05;letter-spacing:-.035em}.rx-feature-description{margin:12px 0 20px;color:#66728a;line-height:1.6;font-size:14px}.rx-feature-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}.rx-feature-badge{display:inline-flex;padding:7px 10px;border-radius:999px;background:#eaf0ff;color:#2946c7;font-size:10px;font-weight:900}.rx-feature-badge.complete{background:#e1f6eb;color:#176b49}.rx-feature-badge.in_progress{background:#e9edff;color:#2946c7}.rx-feature-badge.planned{background:#f0f2f6;color:#65718a}.rx-feature-badge.critical{background:#fbe4e1;color:#a33327}.rx-feature-badge.high{background:#fff1d6;color:#8c5a00}
      .rx-feature-progress-card{padding:20px;border-radius:20px;background:linear-gradient(135deg,#081a40,#12357f);color:#fff;box-shadow:0 18px 42px rgba(7,28,74,.16);margin-bottom:16px}.rx-feature-progress-head{display:flex;align-items:end;justify-content:space-between;gap:14px}.rx-feature-progress-head b{font-family:'Space Grotesk',sans-serif;font-size:36px}.rx-feature-progress-head span{font-size:11px;color:#c8d8fa}.rx-feature-progress-track{height:8px;margin-top:14px;border-radius:999px;background:rgba(255,255,255,.16);overflow:hidden}.rx-feature-progress-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#4f86ff,#9db7ff)}
      .rx-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.rx-feature-card{padding:17px;border:1px solid rgba(7,16,37,.09);border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(7,16,37,.045)}.rx-feature-card h3{font-size:14px;margin-bottom:12px}.rx-feature-field{display:grid;gap:4px;padding:10px 0;border-bottom:1px solid rgba(7,16,37,.07)}.rx-feature-field:last-child{border-bottom:0}.rx-feature-field span{font-size:9.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8792a8}.rx-feature-field b{font-size:12.5px;line-height:1.4}.rx-feature-state-list{display:grid;gap:8px}.rx-feature-state{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border-radius:12px;background:#f6f8fc}.rx-feature-state b{font-size:11px}.rx-feature-state span{font-size:10px;font-weight:900;color:#65718a}.rx-feature-state span.complete{color:#176b49}.rx-feature-state span.in_progress{color:#2946c7}
      .rx-feature-list{display:grid;gap:8px}.rx-feature-list-item{padding:11px 12px;border-radius:13px;background:#f6f8fc;border:1px solid rgba(7,16,37,.06)}.rx-feature-list-item b{display:block;font-size:11.5px}.rx-feature-list-item small{display:block;margin-top:4px;color:#758198;font-size:10.5px;line-height:1.45}.rx-feature-empty{padding:15px;border:1px dashed rgba(7,16,37,.14);border-radius:13px;color:#7c879b;font-size:11px;text-align:center;background:#fafbfe}.rx-feature-loading{min-height:360px;display:grid;place-items:center;color:#6e7a90;font-weight:800}.rx-feature-error{padding:18px;border-radius:16px;background:#fbe4e1;color:#a33327;font-weight:800;line-height:1.5}
      @keyframes rxFeatureIn{from{transform:translateX(24px);opacity:.5}to{transform:translateX(0);opacity:1}}
      @media(max-width:700px){.rx-feature-panel-inner{padding:20px}.rx-feature-title{font-size:28px}.rx-feature-grid{grid-template-columns:1fr}.rx-feature-panel{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let overlay = document.getElementById('rxFeatureDetailOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'rxFeatureDetailOverlay';
    overlay.className = 'rx-feature-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<aside class="rx-feature-panel" role="dialog" aria-modal="true" aria-labelledby="rxFeatureDetailTitle"><div class="rx-feature-panel-inner"><button class="rx-feature-close" type="button" aria-label="Close feature details">×</button><div id="rxFeatureDetailContent" class="rx-feature-loading">Select a roadmap feature to view details.</div></div></aside>`;
    document.body.appendChild(overlay);
    return overlay;
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

  function openPanel() {
    const overlay = ensurePanel();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.rx-feature-close')?.focus();
  }

  function closePanel() {
    const overlay = ensurePanel();
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function field(label, value) {
    return `<div class="rx-feature-field"><span>${safe(label)}</span><b>${safe(value || 'Not set')}</b></div>`;
  }

  function stateItem(label, value) {
    return `<div class="rx-feature-state"><b>${safe(label)}</b><span class="${safe(value)}">${safe(humanize(value))}</span></div>`;
  }

  function renderDetails(feature) {
    const target = document.getElementById('rxFeatureDetailContent');
    if (!target) return;
    const dependencies = Array.isArray(feature.dependencies) ? feature.dependencies : [];
    const checklist = Array.isArray(feature.checklist) ? feature.checklist : [];
    const progress = Math.max(0, Math.min(100, Number(feature.progress_percentage || 0)));

    target.className = '';
    target.innerHTML = `
      <div class="rx-feature-kicker">${safe(feature.epic_title || 'Product Roadmap')}</div>
      <h2 class="rx-feature-title" id="rxFeatureDetailTitle">${safe(feature.title)}</h2>
      <p class="rx-feature-description">${safe(feature.description || 'No description has been added yet.')}</p>
      <div class="rx-feature-badges">
        <span class="rx-feature-badge ${safe(feature.status)}">${safe(humanize(feature.status))}</span>
        <span class="rx-feature-badge ${safe(feature.priority)}">${safe(humanize(feature.priority))}</span>
        ${feature.target_release ? `<span class="rx-feature-badge">${safe(feature.target_release)}</span>` : ''}
      </div>
      <section class="rx-feature-progress-card"><div class="rx-feature-progress-head"><div><span>Feature progress</span><br><b>${progress}%</b></div><span>${Number(feature.checklist_completed || 0)} of ${Number(feature.checklist_total || 0)} checklist items complete</span></div><div class="rx-feature-progress-track"><span style="width:${progress}%"></span></div></section>
      <div class="rx-feature-grid">
        <section class="rx-feature-card"><h3>Ownership and delivery</h3>
          ${field('Owner', feature.owner_name || 'Unassigned')}
          ${field('Role', feature.owner_job_title || 'Not set')}
          ${field('Started', formatDate(feature.started_at))}
          ${field('Estimated completion', formatDate(feature.estimated_completion_date))}
          ${field('Completed', formatDate(feature.completed_at))}
        </section>
        <section class="rx-feature-card"><h3>Platform readiness</h3><div class="rx-feature-state-list">
          ${stateItem('Database', feature.database_state)}
          ${stateItem('Frontend', feature.frontend_state)}
          ${stateItem('Desktop', feature.desktop_state)}
          ${stateItem('iPad', feature.ipad_state)}
          ${stateItem('Mobile', feature.mobile_state)}
        </div></section>
      </div>
      <div class="rx-feature-grid">
        <section class="rx-feature-card"><h3>Dependencies</h3><div class="rx-feature-list">${dependencies.length ? dependencies.map(item => `<div class="rx-feature-list-item"><b>${safe(item.title)}</b><small>${safe(humanize(item.dependency_type))}${item.notes ? ` · ${safe(item.notes)}` : ''}</small></div>`).join('') : '<div class="rx-feature-empty">No dependencies recorded.</div>'}</div></section>
        <section class="rx-feature-card"><h3>Checklist</h3><div class="rx-feature-list">${checklist.length ? checklist.map(item => `<div class="rx-feature-list-item"><b>${item.is_complete ? '✓' : '○'} ${safe(item.title)}</b>${item.description ? `<small>${safe(item.description)}</small>` : ''}</div>`).join('') : '<div class="rx-feature-empty">No checklist items added yet.</div>'}</div></section>
      </div>
      <section class="rx-feature-card"><h3>Planning notes</h3>
        ${field('Success criteria', feature.success_criteria || 'Not added yet')}
        ${field('Notes', feature.notes || 'No notes added yet')}
        ${field('Last updated', formatDate(feature.updated_at))}
      </section>`;
  }

  async function loadFeature(title) {
    const requestId = ++currentRequest;
    const target = document.getElementById('rxFeatureDetailContent');
    if (target) {
      target.className = 'rx-feature-loading';
      target.textContent = 'Loading feature details…';
    }
    openPanel();
    try {
      const supabase = await getClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) throw new Error('Sign in with an active Rolexa staff account.');
      const { data, error } = await supabase
        .from('product_feature_details')
        .select('*')
        .eq('title', title)
        .single();
      if (error) throw error;
      if (requestId !== currentRequest) return;
      renderDetails(data || {});
    } catch (error) {
      console.error('Rolexa feature details failed', error);
      if (requestId !== currentRequest) return;
      const content = document.getElementById('rxFeatureDetailContent');
      if (content) {
        content.className = 'rx-feature-error';
        content.textContent = error?.message || 'Feature details could not load.';
      }
    }
  }

  function decorateFeatureCards() {
    document.querySelectorAll('.rx-roadmap-feature').forEach(card => {
      if (card.dataset.featureDetailsReady === 'true') return;
      const title = card.querySelector('b')?.textContent?.trim();
      if (!title) return;
      card.dataset.featureDetailsReady = 'true';
      card.dataset.featureTitle = title;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open details for ${title}`);
    });
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const featureCard = event.target.closest('.rx-roadmap-feature[data-feature-title]');
      if (featureCard) {
        loadFeature(featureCard.dataset.featureTitle);
        return;
      }
      if (event.target.closest('.rx-feature-close')) {
        closePanel();
        return;
      }
      const overlay = event.target.closest('#rxFeatureDetailOverlay');
      if (overlay && event.target === overlay) closePanel();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanel();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.rx-roadmap-feature[data-feature-title]')) {
        event.preventDefault();
        loadFeature(event.target.dataset.featureTitle);
      }
    });
  }

  function init() {
    addStyles();
    ensurePanel();
    bindEvents();
    decorateFeatureCards();
    const observer = new MutationObserver(decorateFeatureCards);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();