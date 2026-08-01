(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureEditor) return;
  window.__rolexaInternalProductFeatureEditor = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };

  let client = null;
  let currentFeature = null;
  let staff = [];

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

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
    if (document.getElementById('rxFeatureEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxFeatureEditorStyles';
    style.textContent = `
      .rx-feature-edit-button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:10px 14px;background:#176bff;color:#fff;font-weight:900;font-size:11px;box-shadow:0 10px 24px rgba(23,107,255,.22);margin:0 0 18px}.rx-feature-edit-button:hover{background:#0e59dd}
      .rx-feature-edit-form{display:grid;gap:16px}.rx-feature-edit-head{padding-right:58px}.rx-feature-edit-head h2{font-family:'Space Grotesk',sans-serif;font-size:30px;line-height:1.08}.rx-feature-edit-head p{margin:7px 0 0;color:#6d7890;font-size:12px;line-height:1.5}
      .rx-feature-edit-card{padding:18px;border:1px solid rgba(7,16,37,.09);border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(7,16,37,.045)}.rx-feature-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rx-feature-edit-field{display:grid;gap:7px}.rx-feature-edit-field.wide{grid-column:1/-1}.rx-feature-edit-field label{font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#7f8ba2}.rx-feature-edit-field input,.rx-feature-edit-field select,.rx-feature-edit-field textarea{width:100%;border:1px solid rgba(7,16,37,.12);border-radius:12px;background:#f8faff;color:#071025;padding:11px 12px;font:inherit;font-size:12px;outline:none}.rx-feature-edit-field textarea{min-height:100px;resize:vertical}.rx-feature-edit-field input:focus,.rx-feature-edit-field select:focus,.rx-feature-edit-field textarea:focus{border-color:#176bff;box-shadow:0 0 0 3px rgba(23,107,255,.12)}
      .rx-feature-edit-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:9px;padding:14px 0 2px;background:linear-gradient(transparent,#f7f9fd 24%)}.rx-feature-edit-actions button{border-radius:999px;padding:11px 16px;font-weight:900}.rx-feature-edit-cancel{border:1px solid rgba(7,16,37,.12);background:#fff;color:#071025}.rx-feature-edit-save{border:0;background:#176bff;color:#fff}.rx-feature-edit-save:disabled{opacity:.6}.rx-feature-edit-message{min-height:18px;font-size:11px;font-weight:800}.rx-feature-edit-message.good{color:#176b49}.rx-feature-edit-message.bad{color:#a33327}
      @media(max-width:700px){.rx-feature-edit-grid{grid-template-columns:1fr}.rx-feature-edit-field.wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function getPanelContent() {
    return document.getElementById('rxFeatureDetailContent');
  }

  function currentTitle() {
    return document.getElementById('rxFeatureDetailTitle')?.textContent?.trim() || '';
  }

  async function loadEditorData(title) {
    const supabase = await getClient();
    const [featureResult, staffResult] = await Promise.all([
      supabase.from('product_feature_details').select('*').eq('title', title).single(),
      supabase.from('rolexa_staff_users').select('user_id,full_name,job_title,role').eq('is_active', true).order('full_name')
    ]);
    if (featureResult.error) throw featureResult.error;
    if (staffResult.error) throw staffResult.error;
    currentFeature = featureResult.data;
    staff = staffResult.data || [];
  }

  const option = (value, label, selected) => `<option value="${safe(value)}"${value === selected ? ' selected' : ''}>${safe(label)}</option>`;

  function renderEditor() {
    const target = getPanelContent();
    if (!target || !currentFeature) return;
    const feature = currentFeature;
    target.className = '';
    target.innerHTML = `
      <form class="rx-feature-edit-form" id="rxFeatureEditForm">
        <div class="rx-feature-edit-head"><div class="rx-feature-kicker">Edit roadmap feature</div><h2>${safe(feature.title)}</h2><p>Changes save directly to the secure Rolexa product roadmap in Supabase.</p></div>
        <section class="rx-feature-edit-card"><div class="rx-feature-edit-grid">
          <div class="rx-feature-edit-field"><label for="rxEditOwner">Owner</label><select id="rxEditOwner"><option value="">Unassigned</option>${staff.map(person => option(person.user_id, `${person.full_name}${person.job_title ? ` — ${person.job_title}` : ''}`, feature.owner_user_id)).join('')}</select></div>
          <div class="rx-feature-edit-field"><label for="rxEditStatus">Status</label><select id="rxEditStatus">${[
            ['planned','Planned'],['in_progress','In progress'],['blocked','Blocked'],['on_hold','On hold'],['complete','Complete'],['cancelled','Cancelled']
          ].map(([value,label]) => option(value,label,feature.status)).join('')}</select></div>
          <div class="rx-feature-edit-field"><label for="rxEditPriority">Priority</label><select id="rxEditPriority">${[
            ['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']
          ].map(([value,label]) => option(value,label,feature.priority)).join('')}</select></div>
          <div class="rx-feature-edit-field"><label for="rxEditRelease">Target release</label><input id="rxEditRelease" value="${safe(feature.target_release || '')}" placeholder="Example: Version 1.1"></div>
          <div class="rx-feature-edit-field"><label for="rxEditEstimate">Estimated completion</label><input id="rxEditEstimate" type="date" value="${safe(feature.estimated_completion_date || '')}"></div>
          <div class="rx-feature-edit-field"><label for="rxEditStarted">Started date</label><input id="rxEditStarted" type="date" value="${safe(feature.started_at ? String(feature.started_at).slice(0,10) : '')}"></div>
          <div class="rx-feature-edit-field wide"><label for="rxEditCriteria">Success criteria</label><textarea id="rxEditCriteria" placeholder="What must be true for this feature to be considered successful?">${safe(feature.success_criteria || '')}</textarea></div>
          <div class="rx-feature-edit-field wide"><label for="rxEditNotes">Planning notes</label><textarea id="rxEditNotes" placeholder="Add decisions, delivery notes or context for the team.">${safe(feature.notes || '')}</textarea></div>
        </div></section>
        <div class="rx-feature-edit-message" id="rxFeatureEditMessage"></div>
        <div class="rx-feature-edit-actions"><button class="rx-feature-edit-cancel" type="button">Cancel</button><button class="rx-feature-edit-save" type="submit">Save changes</button></div>
      </form>`;
  }

  function setMessage(message, kind = '') {
    const element = document.getElementById('rxFeatureEditMessage');
    if (!element) return;
    element.textContent = message;
    element.className = `rx-feature-edit-message ${kind}`.trim();
  }

  async function openEditor() {
    const title = currentTitle();
    if (!title) return;
    const target = getPanelContent();
    if (target) {
      target.className = 'rx-feature-loading';
      target.textContent = 'Preparing feature editor…';
    }
    try {
      await loadEditorData(title);
      renderEditor();
    } catch (error) {
      console.error('Rolexa feature editor failed', error);
      if (target) {
        target.className = 'rx-feature-error';
        target.textContent = error?.message || 'The editor could not load.';
      }
    }
  }

  function reopenFeature(title) {
    const card = [...document.querySelectorAll('.rx-roadmap-feature[data-feature-title]')]
      .find(item => item.dataset.featureTitle === title);
    card?.click();
  }

  async function saveFeature(event) {
    event.preventDefault();
    if (!currentFeature?.id) return;
    const saveButton = event.currentTarget.querySelector('.rx-feature-edit-save');
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Saving…'; }
    setMessage('Saving changes…');
    const started = document.getElementById('rxEditStarted')?.value || null;
    const payload = {
      owner_user_id: document.getElementById('rxEditOwner')?.value || null,
      status: document.getElementById('rxEditStatus')?.value,
      priority: document.getElementById('rxEditPriority')?.value,
      target_release: document.getElementById('rxEditRelease')?.value.trim() || null,
      estimated_completion_date: document.getElementById('rxEditEstimate')?.value || null,
      started_at: started ? `${started}T12:00:00Z` : null,
      success_criteria: document.getElementById('rxEditCriteria')?.value.trim() || null,
      notes: document.getElementById('rxEditNotes')?.value.trim() || null
    };
    try {
      const supabase = await getClient();
      const { error } = await supabase.from('product_features').update(payload).eq('id', currentFeature.id);
      if (error) throw error;
      setMessage('Changes saved successfully.', 'good');
      const title = currentFeature.title;
      document.getElementById('rxRoadmapRefresh')?.click();
      setTimeout(() => reopenFeature(title), 450);
    } catch (error) {
      console.error('Rolexa feature save failed', error);
      setMessage(error?.message || 'Changes could not be saved.', 'bad');
      if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Save changes'; }
    }
  }

  function addEditButton() {
    const target = getPanelContent();
    if (!target || target.querySelector('.rx-feature-edit-button') || target.querySelector('#rxFeatureEditForm')) return;
    const title = target.querySelector('#rxFeatureDetailTitle');
    if (!title) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rx-feature-edit-button';
    button.textContent = 'Edit feature';
    const badges = target.querySelector('.rx-feature-badges');
    if (badges) badges.insertAdjacentElement('afterend', button);
    else title.insertAdjacentElement('afterend', button);
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      if (event.target.closest('.rx-feature-edit-button')) openEditor();
      if (event.target.closest('.rx-feature-edit-cancel') && currentFeature?.title) reopenFeature(currentFeature.title);
    });
    document.addEventListener('submit', event => {
      if (event.target.matches('#rxFeatureEditForm')) saveFeature(event);
    });
  }

  function init() {
    addStyles();
    bindEvents();
    addEditButton();
    new MutationObserver(addEditButton).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
