(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureDependencies) return;
  window.__rolexaInternalProductFeatureDependencies = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let currentFeature = null;
  let availableFeatures = [];
  let busy = false;

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const humanize = value => String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

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
    if (document.getElementById('rxDependencyManagerStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxDependencyManagerStyles';
    style.textContent = `
      .rx-dependency-manager{margin-top:12px;padding-top:12px;border-top:1px solid rgba(7,16,37,.08)}
      .rx-dependency-row{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(120px,.65fr);gap:8px}
      .rx-dependency-manager select,.rx-dependency-manager input{width:100%;min-height:42px;border:1px solid rgba(7,16,37,.14);border-radius:12px;background:#fff;color:#071025;padding:9px 11px;font:inherit;font-size:11px}
      .rx-dependency-note{margin-top:8px}.rx-dependency-actions{display:flex;align-items:center;gap:8px;margin-top:8px}
      .rx-dependency-add{border:0;border-radius:12px;background:#176bff;color:#fff;padding:10px 14px;font-weight:900;font-size:11px}.rx-dependency-add:disabled{opacity:.55;cursor:not-allowed}
      .rx-dependency-message{min-height:16px;color:#176b49;font-size:10.5px}.rx-dependency-message.error{color:#a33327}
      .rx-dependency-existing{display:grid;gap:8px}.rx-dependency-existing-item{position:relative;padding-right:42px}.rx-dependency-remove{position:absolute;right:9px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:1px solid rgba(163,51,39,.18);border-radius:9px;background:#fff5f3;color:#a33327;font-size:18px;font-weight:900;line-height:1}.rx-dependency-remove:disabled{opacity:.5}
      @media(max-width:700px){.rx-dependency-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function findDependenciesCard() {
    return [...document.querySelectorAll('#rxFeatureDetailContent .rx-feature-card')]
      .find(card => card.querySelector('h3')?.textContent?.trim() === 'Dependencies');
  }

  function currentTitle() {
    return document.getElementById('rxFeatureDetailTitle')?.textContent?.trim() || '';
  }

  function renderExisting(card) {
    if (!currentFeature) return;
    let list = card.querySelector('.rx-feature-list');
    if (!list) {
      list = document.createElement('div');
      list.className = 'rx-feature-list';
      card.appendChild(list);
    }
    const dependencies = Array.isArray(currentFeature.dependencies) ? currentFeature.dependencies : [];
    list.classList.add('rx-dependency-existing');
    list.innerHTML = dependencies.length
      ? dependencies.map(item => `
        <div class="rx-feature-list-item rx-dependency-existing-item">
          <b>${safe(item.title)}</b>
          <small>${safe(humanize(item.dependency_type))}${item.notes ? ` · ${safe(item.notes)}` : ''}</small>
          <button type="button" class="rx-dependency-remove" data-dependency-id="${safe(item.dependency_id)}" aria-label="Remove dependency on ${safe(item.title)}">×</button>
        </div>`).join('')
      : '<div class="rx-feature-empty">No dependencies recorded.</div>';
  }

  function renderManager(card) {
    card.querySelector('.rx-dependency-manager')?.remove();
    const existingIds = new Set((currentFeature?.dependencies || []).map(item => item.feature_id));
    const options = availableFeatures
      .filter(feature => feature.id !== currentFeature?.id && !existingIds.has(feature.id))
      .map(feature => `<option value="${safe(feature.id)}">${safe(feature.title)} · ${safe(humanize(feature.status))}</option>`)
      .join('');

    const manager = document.createElement('div');
    manager.className = 'rx-dependency-manager';
    manager.innerHTML = `
      <div class="rx-dependency-row">
        <select class="rx-dependency-feature" aria-label="Select roadmap feature">
          <option value="">Select a feature…</option>${options}
        </select>
        <select class="rx-dependency-type" aria-label="Dependency type">
          <option value="required">Required</option>
          <option value="recommended">Recommended</option>
          <option value="blocks">Blocks</option>
          <option value="related">Related</option>
        </select>
      </div>
      <input class="rx-dependency-note" type="text" maxlength="300" placeholder="Optional dependency note…" aria-label="Dependency note">
      <div class="rx-dependency-actions">
        <button type="button" class="rx-dependency-add" ${options ? '' : 'disabled'}>Add dependency</button>
        <span class="rx-dependency-message">${options ? '' : 'All available features are already linked.'}</span>
      </div>`;
    card.appendChild(manager);
  }

  async function loadContext() {
    const title = currentTitle();
    const card = findDependenciesCard();
    if (!title || !card || card.dataset.dependencyManagerLoading === 'true') return;
    if (card.dataset.dependencyManagerTitle === title) return;

    card.dataset.dependencyManagerLoading = 'true';
    try {
      const supabase = await getClient();
      const [{ data: feature, error: featureError }, { data: features, error: featuresError }] = await Promise.all([
        supabase.from('product_feature_details').select('*').eq('title', title).single(),
        supabase.from('product_features').select('id,title,status,epic_id').order('title', { ascending: true })
      ]);
      if (featureError) throw featureError;
      if (featuresError) throw featuresError;
      currentFeature = feature;
      availableFeatures = features || [];
      renderExisting(card);
      renderManager(card);
      card.dataset.dependencyManagerTitle = title;
    } catch (error) {
      console.error('Rolexa dependency manager failed', error);
      const message = card.querySelector('.rx-dependency-message');
      if (message) {
        message.textContent = error.message || 'Dependencies could not load.';
        message.classList.add('error');
      }
    } finally {
      delete card.dataset.dependencyManagerLoading;
    }
  }

  async function refreshFeature() {
    if (!currentFeature) return;
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('product_feature_details')
      .select('*')
      .eq('id', currentFeature.id)
      .single();
    if (error) throw error;
    currentFeature = data;
    const card = findDependenciesCard();
    if (card) {
      renderExisting(card);
      renderManager(card);
      card.dataset.dependencyManagerTitle = currentTitle();
    }
  }

  async function addDependency(button) {
    if (busy || !currentFeature) return;
    const card = findDependenciesCard();
    const featureId = card?.querySelector('.rx-dependency-feature')?.value;
    const dependencyType = card?.querySelector('.rx-dependency-type')?.value || 'required';
    const note = card?.querySelector('.rx-dependency-note')?.value?.trim() || null;
    const message = card?.querySelector('.rx-dependency-message');
    if (!featureId) {
      if (message) {
        message.textContent = 'Choose a feature first.';
        message.classList.add('error');
      }
      return;
    }

    busy = true;
    button.disabled = true;
    if (message) {
      message.textContent = 'Adding dependency…';
      message.classList.remove('error');
    }
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('product_feature_dependencies').insert({
        feature_id: currentFeature.id,
        depends_on_feature_id: featureId,
        dependency_type: dependencyType,
        notes: note
      });
      if (error) throw error;
      await refreshFeature();
      const refreshedMessage = findDependenciesCard()?.querySelector('.rx-dependency-message');
      if (refreshedMessage) refreshedMessage.textContent = 'Dependency added.';
    } catch (error) {
      console.error('Rolexa dependency add failed', error);
      if (message) {
        message.textContent = error.message || 'Dependency could not be added.';
        message.classList.add('error');
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  async function removeDependency(button) {
    const dependencyId = button.dataset.dependencyId;
    if (busy || !dependencyId) return;
    busy = true;
    button.disabled = true;
    try {
      const supabase = await getClient();
      const { error } = await supabase
        .from('product_feature_dependencies')
        .delete()
        .eq('id', dependencyId);
      if (error) throw error;
      await refreshFeature();
      const message = findDependenciesCard()?.querySelector('.rx-dependency-message');
      if (message) message.textContent = 'Dependency removed.';
    } catch (error) {
      console.error('Rolexa dependency remove failed', error);
      const message = findDependenciesCard()?.querySelector('.rx-dependency-message');
      if (message) {
        message.textContent = error.message || 'Dependency could not be removed.';
        message.classList.add('error');
      }
      button.disabled = false;
    } finally {
      busy = false;
    }
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const addButton = event.target.closest('.rx-dependency-add');
      if (addButton) {
        addDependency(addButton);
        return;
      }
      const removeButton = event.target.closest('.rx-dependency-remove');
      if (removeButton) removeDependency(removeButton);
    });
  }

  function init() {
    addStyles();
    bindEvents();
    const observer = new MutationObserver(() => {
      if (document.getElementById('rxFeatureDetailTitle') && findDependenciesCard()) loadContext();
      else {
        currentFeature = null;
        availableFeatures = [];
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    loadContext();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();