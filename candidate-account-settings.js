(() => {
  if (window.__rolexaCandidateAccountSettings) return;
  window.__rolexaCandidateAccountSettings = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd'
  };
  const LOCAL_KEYS = [
    'rolexa_candidate_profile_v2',
    'rolexa_candidate_career_direction_v1',
    'rolexa_saved_jobs_v1',
    'rolexa_applications_v1',
    'rolexa_last_auth_email'
  ];
  const SESSION_KEYS = [
    'rolexa_edit_career_direction_step',
    'rxCareerRemoteLoaded'
  ];

  let client = null;
  let user = null;
  let accountStatus = null;
  let busy = false;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function addStyles(){
    if (byId('rxCandidateAccountSettingsStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateAccountSettingsStyles';
    style.textContent = `
      .rx-account-settings-page{max-width:980px;margin:0 auto}
      .rx-account-settings-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:16px;align-items:start}
      .rx-account-card{background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:22px;padding:22px;box-shadow:0 16px 46px rgba(7,16,37,.05)}
      .rx-account-card h2{font-size:20px;margin:0 0 8px}
      .rx-account-card p{color:#6b7280;font-size:13.5px;line-height:1.58;margin:0}
      .rx-account-list{margin:16px 0 0;padding:0;list-style:none;display:grid;gap:10px}
      .rx-account-list li{display:flex;gap:9px;color:#26324c;font-size:13px;line-height:1.45}
      .rx-account-list li::before{content:'✓';color:#176bff;font-weight:900}
      .rx-account-danger{border-color:rgba(224,83,63,.22);background:linear-gradient(180deg,#fff,#fffaf9)}
      .rx-account-danger-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
      .rx-account-badge{white-space:nowrap;border-radius:999px;padding:6px 9px;background:#fbe4e1;color:#a33327;font-size:11px;font-weight:900}
      .rx-account-option{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;border:1px solid rgba(7,16,37,.1);border-radius:15px;padding:14px;margin-top:10px;background:#fff;cursor:pointer}
      .rx-account-option:has(input:checked){border-color:#176bff;box-shadow:0 0 0 3px rgba(23,107,255,.09)}
      .rx-account-option input{margin-top:3px;accent-color:#176bff}
      .rx-account-option b{display:block;color:#101f4a;font-size:13.5px}
      .rx-account-option span{display:block;color:#6b7280;font-size:12px;line-height:1.45;margin-top:3px}
      .rx-account-confirm{display:grid;gap:10px;margin-top:16px;border-top:1px solid rgba(7,16,37,.08);padding-top:16px}
      .rx-account-confirm label{font-size:12.5px;color:#26324c;font-weight:750;line-height:1.45}
      .rx-account-confirm input[type=text]{width:100%;border:1px solid rgba(7,16,37,.12);background:#f5f7fc;border-radius:12px;padding:12px 13px;font-size:14px;text-transform:uppercase}
      .rx-account-confirm-row{display:flex;align-items:flex-start;gap:9px}
      .rx-account-confirm-row input{margin-top:3px;accent-color:#176bff}
      .rx-account-close-btn,.rx-account-cancel-btn{border:0;border-radius:999px;padding:12px 16px;font-size:13px;font-weight:900}
      .rx-account-close-btn{background:#e0533f;color:#fff}
      .rx-account-close-btn:disabled,.rx-account-cancel-btn:disabled{opacity:.55;cursor:not-allowed}
      .rx-account-cancel-btn{background:#eef3ff;color:#2946c7}
      .rx-account-message{min-height:18px;margin-top:10px;font-size:12.5px;font-weight:800;line-height:1.45}
      .rx-account-message.bad{color:#a33327}.rx-account-message.good{color:#176b49}.rx-account-message.info{color:#2946c7}
      .rx-account-status{border:1px solid rgba(23,107,255,.17);background:#f6f9ff;border-radius:16px;padding:15px;margin-top:14px}
      .rx-account-status b{display:block;color:#101f4a;font-size:14px}
      .rx-account-status span{display:block;color:#52617e;font-size:12.5px;line-height:1.5;margin-top:4px}
      .rx-account-overlay{position:fixed;inset:0;z-index:10050;background:rgba(7,16,37,.76);backdrop-filter:blur(8px);display:grid;place-items:center;padding:22px}
      .rx-account-overlay-card{width:min(520px,100%);background:#fff;border-radius:24px;padding:28px;box-shadow:0 30px 80px rgba(7,16,37,.32)}
      .rx-account-overlay-card h1{font-size:27px;color:#071025;margin-bottom:10px}
      .rx-account-overlay-card p{color:#52617e;font-size:14px;line-height:1.6;margin:0 0 18px}
      .rx-account-overlay-card button{border:0;border-radius:999px;background:#176bff;color:#fff;padding:12px 17px;font-weight:900}
      .rx-account-loading{border:1px dashed rgba(7,16,37,.14);border-radius:15px;padding:18px;text-align:center;color:#6b7280;font-size:13px}
      @media(max-width:900px){.rx-account-settings-grid{grid-template-columns:1fr}}
      @media(max-width:760px){.rx-account-card{padding:17px;border-radius:18px}.rx-account-danger-head{display:grid}.rx-account-settings-page .page-head h1{font-size:29px}.rx-account-option{padding:12px}}
    `;
    document.head.appendChild(style);
  }

  function addPage(){
    if (byId('settingsPage')) return;
    const appView = byId('appView');
    if (!appView) return;
    const page = document.createElement('div');
    page.className = 'page rx-account-settings-page';
    page.id = 'settingsPage';
    page.innerHTML = `
      <div class="page-head"><div><h1>Account settings</h1><p>Manage your Rolexa candidate account and understand what happens to your information.</p></div></div>
      <div class="rx-account-settings-grid">
        <article class="rx-account-card">
          <h2>Your account and information</h2>
          <p>Closing your account stops employer access to your Rolexa profile and CV. Some minimal records may be retained where Rolexa must handle a live complaint, security issue, legal obligation or dispute.</p>
          <ul class="rx-account-list">
            <li>New employer access to your profile, CV and Career Passport sharing is blocked when closure begins.</li>
            <li>Your CV and profile are scheduled for deletion, including the stored files rather than only hiding them.</li>
            <li>Rolexa will send confirmation when the closure process is complete.</li>
            <li>Minimal restricted audit evidence may be retained only where it remains necessary.</li>
          </ul>
          <div id="rxAccountCurrentStatus"></div>
        </article>
        <article class="rx-account-card rx-account-danger">
          <div class="rx-account-danger-head"><div><h2>Close candidate account</h2><p id="rxAccountApplicationSummary">Checking your applications...</p></div><span class="rx-account-badge">Important</span></div>
          <div id="rxAccountClosureForm"><div class="rx-account-loading">Loading secure account options...</div></div>
          <div class="rx-account-message" id="rxAccountClosureMessage" role="status" aria-live="polite"></div>
        </article>
      </div>
    `;
    appView.appendChild(page);
  }

  function addEntryPoints(){
    const nav = document.querySelector('.side .nav');
    if (nav && !nav.querySelector('[data-rx-account-settings]')) {
      const button = document.createElement('button');
      button.className = 'nav-btn';
      button.type = 'button';
      button.dataset.rxAccountSettings = 'true';
      button.dataset.view = 'settings';
      button.textContent = 'Settings';
      const editButton = [...nav.querySelectorAll('button')].find(item => !item.classList.contains('nav-btn'));
      nav.insertBefore(button, editButton || null);
      button.addEventListener('click', openSettings);
    }

    const setupActions = document.querySelector('#profileForm .actions');
    if (setupActions && !setupActions.querySelector('[data-rx-account-settings]')) {
      const button = document.createElement('button');
      button.className = 'secondary';
      button.type = 'button';
      button.dataset.rxAccountSettings = 'true';
      button.textContent = 'Account settings';
      button.addEventListener('click', openSettings);
      const note = setupActions.querySelector('.note');
      setupActions.insertBefore(button, note || null);
    }
  }

  function openSettings(){
    addPage();
    const setup = byId('setupView');
    const app = byId('appView');
    if (setup) setup.style.display = 'none';
    if (app) app.style.display = 'block';
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    byId('settingsPage')?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'settings'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshStatus();
  }
  window.openCandidateSettings = openSettings;

  function setMessage(kind, text){
    const el = byId('rxAccountClosureMessage');
    if (!el) return;
    el.className = `rx-account-message ${kind || ''}`;
    el.textContent = text || '';
  }

  function formatDate(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  }

  function latestRequest(){
    return accountStatus && accountStatus.request ? accountStatus.request : null;
  }

  function renderStatus(){
    const form = byId('rxAccountClosureForm');
    const summary = byId('rxAccountApplicationSummary');
    const current = byId('rxAccountCurrentStatus');
    if (!form || !summary || !current) return;

    const activeCount = Number(accountStatus?.active_application_count || 0);
    const request = latestRequest();
    summary.textContent = activeCount === 1
      ? 'You currently have 1 live application.'
      : `You currently have ${activeCount} live applications.`;

    if (request && request.status === 'waiting_for_applications') {
      current.innerHTML = `<div class="rx-account-status"><b>Closure is waiting for your applications</b><span>Your account remains open until your live applications finish. You can cancel this request before closure begins.</span></div>`;
      form.innerHTML = `
        <div class="rx-account-status"><b>Request recorded ${safe(formatDate(request.requested_at))}</b><span>Rolexa will begin closure automatically when no live applications remain.</span></div>
        <button class="rx-account-cancel-btn" id="rxCancelAccountClosure" type="button">Cancel closure request</button>
      `;
      byId('rxCancelAccountClosure')?.addEventListener('click', cancelWaitingRequest);
      return;
    }

    if (request && ['pending_deletion','legal_hold','completed'].includes(request.status)) {
      const completed = request.status === 'completed';
      const held = request.status === 'legal_hold';
      const title = completed ? 'Account closure completed' : held ? 'Closure is under restricted review' : 'Account closure is in progress';
      const detail = completed
        ? 'Rolexa has completed the closure process and sent the completion confirmation.'
        : held
          ? 'Deletion is paused only for a live complaint, dispute, security investigation or legal obligation. Your candidate data remains inaccessible to employers.'
          : `Your candidate access is closed and deletion is due by ${safe(formatDate(request.deletion_due_at) || 'the recorded deadline')}.`;
      current.innerHTML = `<div class="rx-account-status"><b>${title}</b><span>${detail}</span></div>`;
      form.innerHTML = '<div class="rx-account-loading">No further action is required from you.</div>';
      return;
    }

    current.innerHTML = '';
    const waitOption = activeCount > 0 ? `
      <label class="rx-account-option">
        <input type="radio" name="rxAccountClosureMode" value="after_applications">
        <span><b>Keep my account until my applications finish</b><span>Your account remains available while live applications continue. Closure starts automatically afterwards.</span></span>
      </label>
    ` : '';
    form.innerHTML = `
      <label class="rx-account-option">
        <input type="radio" name="rxAccountClosureMode" value="close_now" ${activeCount === 0 ? 'checked' : ''}>
        <span><b>Close now${activeCount ? ' and withdraw my live applications' : ''}</b><span>Employer access is blocked and the deletion process begins immediately. This choice cannot be reversed.</span></span>
      </label>
      ${waitOption}
      <div class="rx-account-confirm">
        <label class="rx-account-confirm-row"><input id="rxAccountClosureAcknowledgement" type="checkbox"><span>I understand what will be removed, that minimal restricted records may be retained where legally necessary, and that closing now will withdraw live applications.</span></label>
        <label for="rxAccountClosurePhrase">Type <b>CLOSE</b> to confirm</label>
        <input id="rxAccountClosurePhrase" type="text" autocomplete="off" maxlength="5" placeholder="CLOSE">
        <button class="rx-account-close-btn" id="rxSubmitAccountClosure" type="button">Request account closure</button>
      </div>
    `;
    byId('rxSubmitAccountClosure')?.addEventListener('click', submitClosure);
  }

  async function refreshStatus(){
    if (!client || !user) return;
    const result = await client.rpc('get_candidate_account_closure_status');
    if (result.error) {
      setMessage('bad', 'Account closure is not available yet. Please contact Rolexa support.');
      const form = byId('rxAccountClosureForm');
      if (form) form.innerHTML = '<div class="rx-account-loading">The secure account service could not be loaded.</div>';
      return;
    }
    accountStatus = result.data || {};
    renderStatus();
    const request = latestRequest();
    if (request && ['pending_deletion','legal_hold','completed'].includes(request.status)) showClosureOverlay(request);
  }

  async function submitClosure(){
    if (busy || !client || !user) return;
    const mode = document.querySelector('input[name="rxAccountClosureMode"]:checked')?.value;
    const acknowledged = byId('rxAccountClosureAcknowledgement')?.checked;
    const phrase = String(byId('rxAccountClosurePhrase')?.value || '').trim().toUpperCase();
    if (!mode) return setMessage('bad', 'Choose when you want the account to close.');
    if (!acknowledged) return setMessage('bad', 'Confirm that you understand the account-closure process.');
    if (phrase !== 'CLOSE') return setMessage('bad', 'Type CLOSE exactly to confirm.');

    const activeCount = Number(accountStatus?.active_application_count || 0);
    const warning = mode === 'close_now' && activeCount
      ? `Close your account now and withdraw ${activeCount} live application${activeCount === 1 ? '' : 's'}?`
      : mode === 'close_now'
        ? 'Close your candidate account now?'
        : 'Keep your account open until all live applications finish, then begin closure automatically?';
    if (!window.confirm(warning)) return;

    busy = true;
    const button = byId('rxSubmitAccountClosure');
    if (button) { button.disabled = true; button.textContent = 'Recording request...'; }
    setMessage('info', 'Recording your request securely...');
    const result = await client.rpc('request_candidate_account_closure', { p_mode: mode });
    if (result.error) {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'Request account closure'; }
      setMessage('bad', result.error.message || 'Your closure request could not be recorded.');
      return;
    }

    accountStatus = result.data || {};
    const request = latestRequest();
    if (request && request.status === 'pending_deletion') {
      setMessage('info', 'Request recorded. Removing stored candidate files...');
      await removeCandidateStorage(request);
      clearCandidateBrowserData();
      await client.auth.signOut();
      showClosureOverlay(request);
      busy = false;
      return;
    }

    busy = false;
    setMessage('good', 'Your request has been recorded. Your account will stay open until your live applications finish.');
    renderStatus();
  }

  async function removeCandidateStorage(request){
    const results = { cv: !request.cv_file_path, photo: !request.photo_file_path };
    if (request.cv_file_path) {
      const response = await client.storage.from('candidate-cvs').remove([request.cv_file_path]);
      results.cv = !response.error;
    }
    if (request.photo_file_path) {
      const response = await client.storage.from('candidate-photos').remove([request.photo_file_path]);
      results.photo = !response.error;
    }
    await client.rpc('record_candidate_storage_cleanup_attempt', {
      p_request_id: request.id,
      p_cv_removed: results.cv,
      p_photo_removed: results.photo
    });
  }

  function clearCandidateBrowserData(){
    LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    SESSION_KEYS.forEach(key => sessionStorage.removeItem(key));
  }

  async function cancelWaitingRequest(){
    if (busy || !client || !user) return;
    if (!window.confirm('Cancel the pending account-closure request?')) return;
    busy = true;
    const result = await client.rpc('cancel_candidate_account_closure');
    busy = false;
    if (result.error) return setMessage('bad', result.error.message || 'The request could not be cancelled.');
    accountStatus = result.data || {};
    setMessage('good', 'Your closure request has been cancelled.');
    renderStatus();
  }

  function showClosureOverlay(request){
    if (byId('rxAccountClosureOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'rx-account-overlay';
    overlay.id = 'rxAccountClosureOverlay';
    const completed = request.status === 'completed';
    overlay.innerHTML = `
      <div class="rx-account-overlay-card">
        <h1>${completed ? 'Your account is closed' : 'Account closure requested'}</h1>
        <p>${completed
          ? 'The closure process is complete. Check your email for confirmation.'
          : `Your candidate dashboard is no longer available. Rolexa will complete deletion by ${safe(formatDate(request.deletion_due_at) || 'the recorded deadline')} unless a limited legal hold applies.`}</p>
        <button id="rxAccountClosureSignOut" type="button">Return to Rolexa</button>
      </div>
    `;
    document.body.appendChild(overlay);
    byId('rxAccountClosureSignOut')?.addEventListener('click', async () => {
      clearCandidateBrowserData();
      if (client) await client.auth.signOut();
      location.href = 'index.html?accountClosure=recorded';
    });
  }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Connection could not be established'));
      document.head.appendChild(script);
    });
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    addStyles();
    addPage();
    addEntryPoints();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const sessionResult = await client.auth.getSession();
      user = sessionResult.data?.session?.user || null;
      if (!user) return;
      await refreshStatus();
    } catch (error) {
      console.warn('Rolexa account settings could not initialise', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
