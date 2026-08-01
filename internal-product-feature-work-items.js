(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureWorkItems) return;
  window.__rolexaInternalProductFeatureWorkItems = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let activeFeature = null;
  let staff = [];

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const humanize = value => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

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

  function addStyles() {
    if (document.getElementById('rxWorkItemStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxWorkItemStyles';
    style.textContent = `
      .rx-work-card{margin-top:16px}.rx-work-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.rx-work-counts{display:flex;gap:6px;flex-wrap:wrap}.rx-work-count{padding:6px 9px;border-radius:999px;background:#eef2f8;color:#62708b;font-size:9.5px;font-weight:900}.rx-work-count.alert{background:#fbe4e1;color:#a33327}
      .rx-work-list{display:grid;gap:9px}.rx-work-item{padding:13px;border:1px solid rgba(7,16,37,.08);border-radius:14px;background:#f8faff}.rx-work-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rx-work-item-title{font-size:12px;font-weight:900}.rx-work-item-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.rx-work-pill{padding:5px 7px;border-radius:999px;background:#edf2ff;color:#2946c7;font-size:9px;font-weight:900}.rx-work-pill.bug,.rx-work-pill.critical{background:#fbe4e1;color:#a33327}.rx-work-pill.improvement{background:#e5f6ef;color:#176b49}.rx-work-pill.idea{background:#fff1d6;color:#8c5a00}.rx-work-pill.technical_debt{background:#eee9ff;color:#6345b8}.rx-work-desc{margin-top:8px;color:#6f7b91;font-size:10.5px;line-height:1.45}.rx-work-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.rx-work-actions button{border:1px solid rgba(7,16,37,.1);background:#fff;border-radius:999px;padding:7px 10px;font-size:9.5px;font-weight:900}.rx-work-actions button.primary{background:#176bff;color:#fff;border-color:#176bff}.rx-work-actions button.danger{color:#a33327;border-color:#f1c2bb}
      .rx-work-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(7,16,37,.08)}.rx-work-form .full{grid-column:1/-1}.rx-work-form input,.rx-work-form select,.rx-work-form textarea{width:100%;border:1px solid rgba(7,16,37,.12);border-radius:12px;background:#f8faff;padding:11px 12px;font:inherit;font-size:11px}.rx-work-form textarea{min-height:82px;resize:vertical}.rx-work-submit{grid-column:1/-1;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rx-work-submit button{border:0;border-radius:999px;background:#176bff;color:#fff;padding:10px 14px;font-weight:900}.rx-work-message{font-size:10px;color:#176b49}.rx-work-empty{padding:16px;border:1px dashed rgba(7,16,37,.14);border-radius:13px;text-align:center;color:#7c879b;font-size:11px;background:#fafbfe}
      @media(max-width:700px){.rx-work-form{grid-template-columns:1fr}.rx-work-form .full,.rx-work-submit{grid-column:1}}
    `;
    document.head.appendChild(style);
  }

  function ownerOptions(selected) {
    return `<option value="">Unassigned</option>${staff.map(person => `<option value="${safe(person.user_id)}" ${person.user_id === selected ? 'selected' : ''}>${safe(person.full_name)}${person.job_title ? ` — ${safe(person.job_title)}` : ''}</option>`).join('')}`;
  }

  function itemHtml(item) {
    return `<article class="rx-work-item" data-work-id="${safe(item.id)}">
      <div class="rx-work-item-top"><div><div class="rx-work-item-title">${safe(item.title)}</div><div class="rx-work-item-meta">
        <span class="rx-work-pill ${safe(item.item_type)}">${safe(humanize(item.item_type))}</span>
        <span class="rx-work-pill ${safe(item.priority)}">${safe(humanize(item.priority))}</span>
        <span class="rx-work-pill">${safe(humanize(item.status))}</span>
        ${item.severity ? `<span class="rx-work-pill ${safe(item.severity)}">Severity: ${safe(humanize(item.severity))}</span>` : ''}
      </div></div></div>
      ${item.description ? `<div class="rx-work-desc">${safe(item.description)}</div>` : ''}
      <div class="rx-work-desc">${item.owner_name ? `Owner: ${safe(item.owner_name)}` : 'Unassigned'}${item.target_date ? ` · Target: ${safe(formatDate(item.target_date))}` : ''}</div>
      <div class="rx-work-actions">
        ${!['resolved','closed'].includes(item.status) ? `<button type="button" class="primary" data-work-action="resolve">Resolve</button>` : `<button type="button" data-work-action="reopen">Reopen</button>`}
        <button type="button" data-work-action="delete" class="danger">Delete</button>
      </div>
    </article>`;
  }

  async function resolveFeature() {
    const title = document.getElementById('rxFeatureDetailTitle')?.textContent?.trim();
    if (!title) return null;
    const supabase = await getClient();
    const { data, error } = await supabase.from('product_features').select('id,title').eq('title', title).single();
    if (error) throw error;
    activeFeature = data;
    return data;
  }

  async function loadStaff() {
    if (staff.length) return staff;
    const supabase = await getClient();
    const { data, error } = await supabase.from('rolexa_staff_users').select('user_id,full_name,job_title,is_active').eq('is_active', true).order('full_name');
    if (!error) staff = data || [];
    return staff;
  }

  async function loadWorkItems() {
    const feature = await resolveFeature();
    if (!feature) return;
    await loadStaff();
    const supabase = await getClient();
    const [{ data: items, error }, { data: counts }] = await Promise.all([
      supabase.from('product_feature_work_item_details').select('*').eq('feature_id', feature.id).order('created_at', { ascending: false }),
      supabase.from('product_feature_work_item_counts').select('*').eq('feature_id', feature.id).maybeSingle()
    ]);
    if (error) throw error;
    render(items || [], counts || {});
  }

  function render(items, counts) {
    const content = document.getElementById('rxFeatureDetailContent');
    if (!content) return;
    let card = document.getElementById('rxFeatureWorkItemsCard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'rxFeatureWorkItemsCard';
      card.className = 'rx-feature-card rx-work-card';
      content.appendChild(card);
    }
    card.innerHTML = `
      <div class="rx-work-head"><h3>Bugs & improvements</h3><div class="rx-work-counts">
        <span class="rx-work-count ${Number(counts.open_bugs || 0) ? 'alert' : ''}">${Number(counts.open_bugs || 0)} bugs</span>
        <span class="rx-work-count">${Number(counts.open_improvements || 0)} improvements</span>
        <span class="rx-work-count">${Number(counts.open_ideas || 0)} ideas</span>
        <span class="rx-work-count">${Number(counts.open_technical_debt || 0)} tech debt</span>
      </div></div>
      <div class="rx-work-list">${items.length ? items.map(itemHtml).join('') : '<div class="rx-work-empty">No bugs, improvements, ideas or technical debt recorded.</div>'}</div>
      <form class="rx-work-form" id="rxWorkItemForm">
        <select name="item_type" required><option value="bug">Bug</option><option value="improvement" selected>Improvement</option><option value="idea">Idea</option><option value="technical_debt">Technical debt</option></select>
        <select name="priority" required><option value="low">Low priority</option><option value="medium" selected>Medium priority</option><option value="high">High priority</option><option value="critical">Critical priority</option></select>
        <input class="full" name="title" maxlength="180" placeholder="Title" required>
        <textarea class="full" name="description" placeholder="Describe the issue, improvement or idea..."></textarea>
        <select name="status"><option value="backlog">Backlog</option><option value="open" selected>Open</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option></select>
        <select name="severity"><option value="">No severity</option><option value="low">Low severity</option><option value="medium">Medium severity</option><option value="high">High severity</option><option value="critical">Critical severity</option></select>
        <select name="owner_user_id">${ownerOptions('')}</select>
        <input type="date" name="target_date">
        <div class="rx-work-submit"><button type="submit">Add work item</button><span class="rx-work-message" id="rxWorkItemMessage"></span></div>
      </form>`;
  }

  async function createItem(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = {
      feature_id: activeFeature.id,
      item_type: values.item_type,
      title: String(values.title || '').trim(),
      description: String(values.description || '').trim() || null,
      status: values.status,
      priority: values.priority,
      severity: values.severity || null,
      owner_user_id: values.owner_user_id || null,
      target_date: values.target_date || null
    };
    const supabase = await getClient();
    const { error } = await supabase.from('product_feature_work_items').insert(payload);
    if (error) throw error;
    form.reset();
    document.getElementById('rxWorkItemMessage').textContent = 'Work item added.';
    await loadWorkItems();
  }

  async function updateStatus(id, status) {
    const supabase = await getClient();
    const { error } = await supabase.from('product_feature_work_items').update({ status }).eq('id', id);
    if (error) throw error;
    await loadWorkItems();
  }

  async function deleteItem(id) {
    const supabase = await getClient();
    const { error } = await supabase.from('product_feature_work_items').delete().eq('id', id);
    if (error) throw error;
    await loadWorkItems();
  }

  function bindEvents() {
    document.addEventListener('submit', event => {
      if (!event.target.matches('#rxWorkItemForm')) return;
      event.preventDefault();
      createItem(event.target).catch(error => {
        const message = document.getElementById('rxWorkItemMessage');
        if (message) message.textContent = error.message || 'Could not add work item.';
      });
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-work-action]');
      if (!button) return;
      const item = button.closest('[data-work-id]');
      const id = item?.dataset.workId;
      if (!id) return;
      const action = button.dataset.workAction;
      if (action === 'resolve') updateStatus(id, 'resolved').catch(console.error);
      if (action === 'reopen') updateStatus(id, 'open').catch(console.error);
      if (action === 'delete' && confirm('Delete this work item?')) deleteItem(id).catch(console.error);
    });
  }

  function observePanel() {
    const observer = new MutationObserver(() => {
      const title = document.getElementById('rxFeatureDetailTitle');
      if (!title) return;
      const current = title.textContent?.trim();
      if (!current || current === activeFeature?.title) return;
      activeFeature = null;
      setTimeout(() => loadWorkItems().catch(console.error), 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    addStyles();
    bindEvents();
    observePanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();