(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductRoadmap) return;
  window.__rolexaInternalProductRoadmap = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let loaded = false;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const humanize = value => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  const statusLabel = value => ({
    planned: 'Planned',
    in_progress: 'In progress',
    blocked: 'Blocked',
    on_hold: 'On hold',
    complete: 'Complete',
    cancelled: 'Cancelled'
  })[value] || humanize(value);

  function addStyles() {
    if (document.getElementById('rxInternalRoadmapStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxInternalRoadmapStyles';
    style.textContent = `
      .side button.rx-roadmap-nav:before{content:'◆'!important;background:rgba(96,165,250,.15)!important;color:#9dc4ff!important}
      .rx-roadmap-summary{display:grid;grid-template-columns:1.25fr repeat(4,minmax(0,1fr));gap:15px;margin-bottom:18px}
      .rx-roadmap-hero{position:relative;isolation:isolate;overflow:hidden;min-height:174px;padding:24px;border-radius:22px;background:linear-gradient(135deg,#081a40,#12357f);color:#fff;box-shadow:0 22px 48px rgba(7,28,74,.18)}
      .rx-roadmap-hero:after{content:'';position:absolute;z-index:-1;right:-45px;bottom:-70px;width:190px;height:190px;border-radius:50%;background:rgba(72,125,255,.32)}
      .rx-roadmap-eyebrow{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#9ebcff}
      .rx-roadmap-percent{font-family:'Space Grotesk',sans-serif;font-size:52px;font-weight:700;line-height:1;margin:13px 0 8px}
      .rx-roadmap-hero p{margin:0;color:#c9d8fa;font-size:13px;line-height:1.5}
      .rx-roadmap-progress{height:8px;margin-top:18px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}
      .rx-roadmap-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#3f7cff,#86a8ff)}
      .rx-roadmap-stat{min-height:174px;display:flex;flex-direction:column;justify-content:space-between}
      .rx-roadmap-stat span{color:#71809c;font-size:12px;font-weight:800}.rx-roadmap-stat b{font-family:'Space Grotesk',sans-serif;font-size:35px}.rx-roadmap-stat small{color:#8a95aa;font-size:11px;line-height:1.4}
      .rx-roadmap-status{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}
      .rx-roadmap-status p{margin:0;color:#6b7280;font-size:13px}.rx-roadmap-refresh{border:1px solid rgba(7,16,37,.1);background:#fff;color:#071025;border-radius:999px;padding:9px 13px;font-weight:900}.rx-roadmap-refresh:disabled{opacity:.55}
      .rx-roadmap-epics{display:grid;gap:15px}
      .rx-roadmap-epic{background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:22px;padding:20px;box-shadow:0 16px 44px rgba(7,16,37,.055)}
      .rx-roadmap-epic-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start;margin-bottom:15px}
      .rx-roadmap-epic h2{font-size:20px}.rx-roadmap-epic p{margin:6px 0 0;color:#6b7280;font-size:12.5px;line-height:1.5;max-width:760px}
      .rx-roadmap-epic-score{text-align:right}.rx-roadmap-epic-score b{display:block;font-family:'Space Grotesk',sans-serif;font-size:27px}.rx-roadmap-epic-score small{color:#74819b;font-size:10.5px;font-weight:800}
      .rx-roadmap-epic-bar{height:7px;border-radius:999px;background:#e9eef8;overflow:hidden;margin-bottom:16px}.rx-roadmap-epic-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#176bff,#6f8fff)}
      .rx-roadmap-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .rx-roadmap-feature{border:1px solid rgba(7,16,37,.08);border-radius:15px;padding:13px;background:#f9fbff;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}
      .rx-roadmap-feature b{font-size:12.5px}.rx-roadmap-feature p{font-size:11px;margin:4px 0 0;line-height:1.4}.rx-roadmap-feature-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .rx-roadmap-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:9.5px;font-weight:900;white-space:nowrap;background:#edf2ff;color:#2946c7}
      .rx-roadmap-pill.complete{background:#e1f6eb;color:#176b49}.rx-roadmap-pill.in_progress{background:#e9edff;color:#2946c7}.rx-roadmap-pill.planned{background:#f1f3f7;color:#63708a}.rx-roadmap-pill.blocked{background:#fbe4e1;color:#a33327}.rx-roadmap-pill.on_hold{background:#fff1d6;color:#8c5a00}.rx-roadmap-pill.critical{background:#fbe4e1;color:#a33327}.rx-roadmap-pill.high{background:#fff1d6;color:#8c5a00}
      .rx-roadmap-state{width:9px;height:9px;border-radius:50%;margin-top:4px;background:#c9d2e4}.rx-roadmap-state.complete{background:#22a06b}.rx-roadmap-state.in_progress{background:#176bff}.rx-roadmap-state.blocked{background:#e0533f}
      .rx-roadmap-empty{padding:30px;border:1px dashed rgba(7,16,37,.14);border-radius:20px;background:#fff;text-align:center;color:#6b7280}
      @media(max-width:1200px){.rx-roadmap-summary{grid-template-columns:1fr 1fr 1fr}.rx-roadmap-hero{grid-column:1/-1}.rx-roadmap-feature-grid{grid-template-columns:1fr}}
      @media(max-width:700px){.rx-roadmap-summary{grid-template-columns:1fr 1fr}.rx-roadmap-hero{grid-column:1/-1}.rx-roadmap-stat{min-height:130px}.rx-roadmap-epic-head{grid-template-columns:1fr}.rx-roadmap-epic-score{text-align:left}.rx-roadmap-feature{grid-template-columns:minmax(0,1fr) auto}}
    `;
    document.head.appendChild(style);
  }

  function ensureLayout() {
    const nav = document.querySelector('#adminApp .side nav');
    const content = document.querySelector('#adminApp .content');
    if (!nav || !content) return false;

    let button = document.getElementById('productRoadmapNavButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'productRoadmapNavButton';
      button.type = 'button';
      button.className = 'rx-roadmap-nav';
      button.dataset.roadmapView = 'roadmapView';
      button.textContent = 'Product Roadmap';
      nav.appendChild(button);
    }

    let view = document.getElementById('roadmapView');
    if (!view) {
      view = document.createElement('section');
      view.id = 'roadmapView';
      view.className = 'admin-view hidden';
      view.innerHTML = `
        <div class="page-head"><div><h1>Product Roadmap</h1><p>One source of truth for everything Rolexa has built and what comes next.</p></div><span class="badge">Live roadmap</span></div>
        <div id="rxRoadmapContent"><div class="rx-roadmap-empty">Open Product Roadmap to load the latest data.</div></div>`;
      content.appendChild(view);
    }
    return true;
  }

  function showRoadmap() {
    if (!ensureLayout()) return;
    document.querySelectorAll('.admin-view').forEach(view => view.classList.add('hidden'));
    document.getElementById('roadmapView')?.classList.remove('hidden');
    document.querySelectorAll('#adminApp .side button').forEach(button => button.classList.remove('active'));
    document.getElementById('productRoadmapNavButton')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadRoadmap();
  }

  function hideRoadmapForOtherNavigation(event) {
    const button = event.target.closest('#adminApp .side button');
    if (!button || button.id === 'productRoadmapNavButton') return;
    document.getElementById('roadmapView')?.classList.add('hidden');
  }

  function featureHtml(feature) {
    return `<article class="rx-roadmap-feature">
      <div><b>${safe(feature.title)}</b><p>${safe(feature.description || 'No description added yet.')}</p>
        <div class="rx-roadmap-feature-meta">
          <span class="rx-roadmap-pill ${safe(feature.status)}">${safe(statusLabel(feature.status))}</span>
          <span class="rx-roadmap-pill ${safe(feature.priority)}">${safe(humanize(feature.priority))}</span>
          ${feature.target_release ? `<span class="rx-roadmap-pill">${safe(feature.target_release)}</span>` : ''}
        </div>
      </div>
      <span class="rx-roadmap-state ${safe(feature.status)}" aria-hidden="true"></span>
    </article>`;
  }

  function epicHtml(epic, features) {
    const percent = Number(epic.completion_percentage || 0);
    return `<section class="rx-roadmap-epic">
      <div class="rx-roadmap-epic-head"><div><h2>${safe(epic.title)}</h2><p>${safe(epic.description || '')}</p></div>
        <div class="rx-roadmap-epic-score"><b>${percent}%</b><small>${Number(epic.completed_features || 0)} of ${Number(epic.total_features || 0)} complete</small></div></div>
      <div class="rx-roadmap-epic-bar"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>
      <div class="rx-roadmap-feature-grid">${features.length ? features.map(featureHtml).join('') : '<div class="rx-roadmap-empty">No features are assigned to this epic yet.</div>'}</div>
    </section>`;
  }

  function render(summary, epics, features) {
    const target = document.getElementById('rxRoadmapContent');
    if (!target) return;
    const groups = new Map();
    features.forEach(feature => {
      if (!groups.has(feature.epic_id)) groups.set(feature.epic_id, []);
      groups.get(feature.epic_id).push(feature);
    });
    const percent = Number(summary?.overall_completion_percentage || 0);
    target.innerHTML = `
      <div class="rx-roadmap-summary">
        <section class="rx-roadmap-hero"><div class="rx-roadmap-eyebrow">Overall Rolexa progress</div><div class="rx-roadmap-percent">${percent}%</div><p>${Number(summary?.completed_features || 0)} of ${Number(summary?.total_features || 0)} tracked features are complete.</p><div class="rx-roadmap-progress"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div></section>
        <article class="card rx-roadmap-stat"><span>Total features</span><b>${Number(summary?.total_features || 0)}</b><small>Everything currently tracked across the product.</small></article>
        <article class="card rx-roadmap-stat"><span>Complete</span><b>${Number(summary?.completed_features || 0)}</b><small>Released or fully implemented features.</small></article>
        <article class="card rx-roadmap-stat"><span>In progress</span><b>${Number(summary?.in_progress_features || 0)}</b><small>Features actively being built or polished.</small></article>
        <article class="card rx-roadmap-stat"><span>Planned</span><b>${Number(summary?.planned_features || 0)}</b><small>Approved work waiting in the roadmap.</small></article>
      </div>
      <div class="rx-roadmap-status"><p id="rxRoadmapStatus"></p><button class="rx-roadmap-refresh" id="rxRoadmapRefresh" type="button">Refresh roadmap</button></div>
      <div class="rx-roadmap-epics">${epics.map(epic => epicHtml(epic, groups.get(epic.id) || [])).join('')}</div>`;
  }

  async function loadRoadmap(force = false) {
    if (loaded && !force) return;
    const target = document.getElementById('rxRoadmapContent');
    if (target) target.innerHTML = '<div class="rx-roadmap-empty">Loading the Rolexa product roadmap…</div>';
    try {
      if (!client) {
        const library = window.supabase?.createClient ? window.supabase : await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.onload = () => resolve(window.supabase);
          script.onerror = () => reject(new Error('Supabase could not load'));
          document.head.appendChild(script);
        });
        client = library.createClient(CONFIG.url, CONFIG.key);
      }
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session?.user) throw new Error('Sign in with an active Rolexa staff account.');
      const [summaryResult, epicResult, featureResult] = await Promise.all([
        client.from('product_roadmap_summary').select('*').single(),
        client.from('product_epic_progress').select('*').order('sort_order', { ascending: true }),
        client.from('product_features').select('id,epic_id,title,description,status,priority,target_release,sort_order').order('sort_order', { ascending: true })
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (epicResult.error) throw epicResult.error;
      if (featureResult.error) throw featureResult.error;
      render(summaryResult.data || {}, epicResult.data || [], featureResult.data || []);
      loaded = true;
    } catch (error) {
      console.error('Rolexa roadmap load failed', error);
      if (target) target.innerHTML = `<div class="rx-roadmap-empty">The roadmap could not load.<br><br>${safe(error.message || error)}</div>`;
    }
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      if (event.target.closest('#productRoadmapNavButton')) {
        showRoadmap();
        return;
      }
      hideRoadmapForOtherNavigation(event);
      if (event.target.closest('#rxRoadmapRefresh')) {
        loaded = false;
        loadRoadmap(true);
      }
    });
  }

  function init() {
    addStyles();
    bindEvents();
    const attempt = () => {
      if (ensureLayout()) return;
      setTimeout(attempt, 250);
    };
    attempt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();