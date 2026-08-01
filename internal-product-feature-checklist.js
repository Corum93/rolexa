(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureChecklist) return;
  window.__rolexaInternalProductFeatureChecklist = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let activeFeature = null;
  let decorating = false;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function addStyles() {
    if (document.getElementById('rxFeatureChecklistStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxFeatureChecklistStyles';
    style.textContent = `
      .rx-checklist-manager{display:grid;gap:10px}
      .rx-checklist-items{display:grid;gap:8px}
      .rx-checklist-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:11px 12px;border:1px solid rgba(7,16,37,.07);border-radius:13px;background:#f6f8fc}
      .rx-checklist-row.complete .rx-checklist-copy b{text-decoration:line-through;color:#68748a}
      .rx-checklist-toggle{width:24px;height:24px;margin:0;border:1px solid #bac5d8;border-radius:8px;accent-color:#176bff;cursor:pointer}
      .rx-checklist-copy{min-width:0}.rx-checklist-copy b{display:block;font-size:11.5px;line-height:1.35}.rx-checklist-copy small{display:block;margin-top:3px;color:#758198;font-size:10px;line-height:1.4}
      .rx-checklist-delete{border:0;background:transparent;color:#a33327;font-size:18px;line-height:1;padding:2px 4px;cursor:pointer;border-radius:7px}.rx-checklist-delete:hover{background:#fbe4e1}
      .rx-checklist-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:4px}
      .rx-checklist-add input{min-width:0;border:1px solid rgba(7,16,37,.13);border-radius:11px;background:#fff;padding:10px 11px;color:#071025;font:inherit;font-size:11px;outline:none}.rx-checklist-add input:focus{border-color:#176bff;box-shadow:0 0 0 3px rgba(23,107,255,.12)}
      .rx-checklist-add button{border:0;border-radius:11px;background:#176bff;color:#fff;padding:10px 12px;font-size:10px;font-weight:900;cursor:pointer}.rx-checklist-add button:disabled,.rx-checklist-toggle:disabled,.rx-checklist-delete:disabled{opacity:.55;cursor:wait}
      .rx-checklist-message{min-height:14px;color:#6f7c92;font-size:9.5px}.rx-checklist-message.error{color:#a33327}.rx-checklist-message.success{color:#176b49}
      @media(max-width:520px){.rx-checklist-add{grid-template-columns:1fr}.rx-checklist-add button{width:100%}}
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

  function checklistCard() {
    return [...document.querySelectorAll('#rxFeatureDetailContent .rx-feature-card')]
      .find(card => card.querySelector('h3')?.textContent?.trim() === 'Checklist');
  }

  function currentTitle() {
    return document.getElementById('rxFeatureDetailTitle')?.textContent?.trim() || '';
  }

  function setMessage(text = '', type = '') {
    const target = document.querySelector('.rx-checklist-message');
    if (!target) return;
    target.textContent = text;
    target.className = `rx-checklist-message${type ? ` ${type}` : ''}`;
  }

  function renderManager(feature) {
    const card = checklistCard();
    if (!card) return;
    const checklist = Array.isArray(feature.checklist) ? feature.checklist : [];
    card.dataset.checklistFeatureId = feature.id;
    card.innerHTML = `
      <h3>Checklist</h3>
      <div class="rx-checklist-manager">
        <div class="rx-checklist-items">
          ${checklist.length ? checklist.map(item => `
            <div class="rx-checklist-row ${item.is_complete ? 'complete' : ''}" data-checklist-id="${safe(item.id)}">
              <input class="rx-checklist-toggle" type="checkbox" ${item.is_complete ? 'checked' : ''} aria-label="Mark ${safe(item.title)} ${item.is_complete ? 'incomplete' : 'complete'}">
              <div class="rx-checklist-copy"><b>${safe(item.title)}</b>${item.description ? `<small>${safe(item.description)}</small>` : ''}</div>
              <button class="rx-checklist-delete" type="button" aria-label="Delete ${safe(item.title)}">×</button>
            </div>`).join('') : '<div class="rx-feature-empty">No checklist items added yet.</div>'}
        </div>
        <form class="rx-checklist-add">
          <input name="title" maxlength="180" autocomplete="off" placeholder="Add a checklist item…" aria-label="Checklist item title" required>
          <button type="submit">Add item</button>
        </form>
        <div class="rx-checklist-message" aria-live="polite"></div>
      </div>`;
  }

  function updateProgress(feature) {
    const progress = Math.max(0, Math.min(100, Number(feature.progress_percentage || 0)));
    const card = document.querySelector('#rxFeatureDetailContent .rx-feature-progress-card');
    if (!card) return;
    const number = card.querySelector('.rx-feature-progress-head b');
    const summary = card.querySelector('.rx-feature-progress-head > span');
    const bar = card.querySelector('.rx-feature-progress-track span');
    if (number) number.textContent = `${progress}%`;
    if (summary) summary.textContent = `${Number(feature.checklist_completed || 0)} of ${Number(feature.checklist_total || 0)} checklist items complete`;
    if (bar) bar.style.width = `${progress}%`;
  }

  async function loadFeature(title, force = false) {
    if (!title) return;
    if (!force && activeFeature?.title === title && checklistCard()?.dataset.checklistFeatureId === activeFeature.id) return;
    try {
      const supabase = await getClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) return;
      const { data, error } = await supabase.from('product_feature_details').select('*').eq('title', title).single();
      if (error) throw error;
      if (currentTitle() !== title) return;
      activeFeature = data;
      renderManager(data);
      updateProgress(data);
    } catch (error) {
      console.error('Rolexa checklist load failed', error);
    }
  }

  async function refreshFeature() {
    const title = currentTitle();
    if (!title) return;
    await loadFeature(title, true);
    document.getElementById('rxRoadmapRefresh')?.click();
  }

  async function addItem(form) {
    if (!activeFeature?.id) return;
    const input = form.elements.title;
    const title = input.value.trim();
    if (!title) return;
    const button = form.querySelector('button');
    button.disabled = true;
    input.disabled = true;
    setMessage('Adding item…');
    try {
      const supabase = await getClient();
      const items = Array.isArray(activeFeature.checklist) ? activeFeature.checklist : [];
      const nextOrder = items.reduce((max, item) => Math.max(max, Number(item.sort_order || 0)), 0) + 10;
      const { error } = await supabase.from('product_feature_checklist').insert({
        feature_id: activeFeature.id,
        title,
        sort_order: nextOrder,
        is_complete: false
      });
      if (error) throw error;
      input.value = '';
      await refreshFeature();
      setMessage('Checklist item added.', 'success');
    } catch (error) {
      console.error('Rolexa checklist add failed', error);
      setMessage(error?.message || 'The checklist item could not be added.', 'error');
    } finally {
      button.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  async function toggleItem(row, checkbox) {
    const id = row.dataset.checklistId;
    if (!id) return;
    checkbox.disabled = true;
    setMessage('Updating checklist…');
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('product_feature_checklist').update({ is_complete: checkbox.checked }).eq('id', id);
      if (error) throw error;
      await refreshFeature();
      setMessage(checkbox.checked ? 'Item completed.' : 'Item reopened.', 'success');
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      console.error('Rolexa checklist update failed', error);
      setMessage(error?.message || 'The checklist item could not be updated.', 'error');
    } finally {
      checkbox.disabled = false;
    }
  }

  async function deleteItem(row, button) {
    const id = row.dataset.checklistId;
    const title = row.querySelector('.rx-checklist-copy b')?.textContent?.trim() || 'this item';
    if (!id || !window.confirm(`Delete “${title}” from this checklist?`)) return;
    button.disabled = true;
    setMessage('Deleting item…');
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('product_feature_checklist').delete().eq('id', id);
      if (error) throw error;
      await refreshFeature();
      setMessage('Checklist item deleted.', 'success');
    } catch (error) {
      console.error('Rolexa checklist delete failed', error);
      setMessage(error?.message || 'The checklist item could not be deleted.', 'error');
      button.disabled = false;
    }
  }

  function decorate() {
    if (decorating) return;
    const title = currentTitle();
    const card = checklistCard();
    if (!title || !card) return;
    if (card.querySelector('.rx-checklist-manager')) return;
    decorating = true;
    loadFeature(title).finally(() => { decorating = false; });
  }

  function bindEvents() {
    document.addEventListener('submit', event => {
      const form = event.target.closest('.rx-checklist-add');
      if (!form) return;
      event.preventDefault();
      addItem(form);
    });

    document.addEventListener('change', event => {
      const checkbox = event.target.closest('.rx-checklist-toggle');
      if (!checkbox) return;
      const row = checkbox.closest('.rx-checklist-row');
      if (row) toggleItem(row, checkbox);
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('.rx-checklist-delete');
      if (!button) return;
      const row = button.closest('.rx-checklist-row');
      if (row) deleteItem(row, button);
    });
  }

  function init() {
    addStyles();
    bindEvents();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    decorate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();