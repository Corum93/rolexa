(() => {
  if (window.__rolexaCandidateProfileSync) return;
  window.__rolexaCandidateProfileSync = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd',
    profileKey: 'rolexa_candidate_profile_v2',
    bucket: 'candidate-cvs',
    maxCvBytes: 10 * 1024 * 1024,
    allowedCvTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  };

  function byId(id){ return document.getElementById(id); }
  function normaliseUrl(value){
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  function showSyncStatus(kind, text){
    let el = document.getElementById('rolexaProfileSyncStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rolexaProfileSyncStatus';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9998;padding:11px 15px;border-radius:999px;font:800 13px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    if (kind === 'good') {
      el.style.background = '#E1F6EB';
      el.style.color = '#176B49';
      el.style.border = '1px solid rgba(34,160,107,.22)';
    } else if (kind === 'bad') {
      el.style.background = '#FBE4E1';
      el.style.color = '#A33327';
      el.style.border = '1px solid rgba(224,83,63,.22)';
    } else {
      el.style.background = '#EEF3FF';
      el.style.color = '#2946C7';
      el.style.border = '1px solid rgba(76,116,255,.22)';
    }
    clearTimeout(window.__rolexaSyncStatusTimer);
    window.__rolexaSyncStatusTimer = setTimeout(() => { el.style.display = 'none'; }, 3400);
  }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => resolve(window.supabase);
      s.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(s);
    });
  }

  function dbToLocal(row){
    return {
      fullName: row.full_name || '',
      email: row.email || '',
      location: row.location || '',
      targetRole: row.target_role || '',
      level: row.current_level || 'Mid-level',
      workStyle: row.work_style || 'Hybrid',
      salary: row.minimum_salary || '',
      skills: row.skills || '',
      summary: row.profile_summary || '',
      linkedinUrl: row.linkedin_url || '',
      portfolioUrl: row.portfolio_url || '',
      websiteUrl: row.website_url || '',
      githubUrl: row.github_url || '',
      hasCv: !!row.has_cv || !!row.cv_file_path,
      cvFileName: row.cv_file_name || '',
      cvFilePath: row.cv_file_path || '',
      openToWork: row.open_to_work !== false,
      relocate: !!row.open_to_relocate,
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  function formToDb(user){
    return {
      user_id: user.id,
      email: user.email || (byId('email') ? byId('email').value.trim().toLowerCase() : ''),
      full_name: byId('fullName') ? byId('fullName').value.trim() : null,
      location: byId('location') ? byId('location').value.trim() : null,
      target_role: byId('targetRole') ? byId('targetRole').value.trim() : null,
      current_level: byId('level') ? byId('level').value : null,
      work_style: byId('workStyle') ? byId('workStyle').value : null,
      minimum_salary: byId('salary') ? byId('salary').value.trim() : null,
      skills: byId('skills') ? byId('skills').value.trim() : null,
      profile_summary: byId('summary') ? byId('summary').value.trim() : null,
      linkedin_url: normaliseUrl(byId('linkedinUrl')?.value),
      portfolio_url: normaliseUrl(byId('portfolioUrl')?.value),
      website_url: normaliseUrl(byId('websiteUrl')?.value),
      github_url: normaliseUrl(byId('githubUrl')?.value),
      has_cv: byId('hasCv') ? byId('hasCv').checked : false,
      open_to_work: byId('openToWork') ? byId('openToWork').checked : true,
      open_to_relocate: byId('relocate') ? byId('relocate').checked : false,
      updated_at: new Date().toISOString()
    };
  }

  function fillFormFromLocal(profile){
    if (!profile) return;
    const map = {
      fullName: 'fullName', email: 'email', location: 'location', targetRole: 'targetRole',
      level: 'level', workStyle: 'workStyle', salary: 'salary', skills: 'skills', summary: 'summary',
      linkedinUrl: 'linkedinUrl', portfolioUrl: 'portfolioUrl', websiteUrl: 'websiteUrl', githubUrl: 'githubUrl'
    };
    Object.entries(map).forEach(([key, id]) => { if (byId(id)) byId(id).value = profile[key] || ''; });
    if (byId('hasCv')) byId('hasCv').checked = !!profile.hasCv;
    if (byId('openToWork')) byId('openToWork').checked = profile.openToWork !== false;
    if (byId('relocate')) byId('relocate').checked = !!profile.relocate;
    updateCvStatus(profile.cvFileName || '', !!profile.cvFilePath);
  }

  function addCvUploadUI(){
    if (document.getElementById('cvUpload')) return;
    let cvCheckbox = byId('hasCv');
    if (!cvCheckbox) return;
    const checkWrapper = cvCheckbox.closest('.check');
    const checks = checkWrapper ? checkWrapper.closest('.checks') : null;
    if (!checks) return;

    checkWrapper.innerHTML = '<input id="hasCv" type="checkbox" disabled> <span>CV uploaded <small style="display:block;color:#6B7280;font-weight:700;margin-top:2px">updates after file upload</small></span>';
    checkWrapper.style.cursor = 'default';
    checkWrapper.title = 'This updates automatically after a real CV file is uploaded.';
    cvCheckbox = byId('hasCv');
    cvCheckbox.disabled = true;

    const field = document.createElement('div');
    field.className = 'field full';
    field.id = 'cvUploadField';
    field.innerHTML = `
      <label for="cvUpload">Upload CV</label>
      <input id="cvUpload" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
      <div class="note" id="cvUploadStatus">Upload a PDF, DOC or DOCX CV. Maximum file size 10MB.</div>
    `;
    checks.insertAdjacentElement('beforebegin', field);

    const input = byId('cvUpload');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const validType = CONFIG.allowedCvTypes.includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
      if (!validType) {
        input.value = '';
        updateCvStatus('Unsupported file type. Use PDF, DOC or DOCX.', false, true);
        return;
      }
      if (file.size > CONFIG.maxCvBytes) {
        input.value = '';
        updateCvStatus('File is too large. Maximum CV size is 10MB.', false, true);
        return;
      }
      updateCvStatus(`Ready to upload: ${file.name}`, false);
    });
  }

  function updateCvStatus(text, uploaded, isError){
    const status = byId('cvUploadStatus');
    const hasCv = byId('hasCv');
    if (hasCv) hasCv.checked = !!uploaded;
    if (!status) return;
    if (uploaded && text) {
      status.textContent = `Current CV: ${text}`;
      status.style.color = '#176B49';
    } else if (isError) {
      status.textContent = text;
      status.style.color = '#A33327';
    } else if (text) {
      status.textContent = text;
      status.style.color = '#2946C7';
    } else {
      status.textContent = 'Upload a PDF, DOC or DOCX CV. Maximum file size 10MB.';
      status.style.color = '#6B7280';
    }
  }

  function sanitiseFileName(name){
    return String(name || 'cv').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  }

  async function uploadCvIfSelected(client, user){
    const input = byId('cvUpload');
    const file = input && input.files && input.files[0];
    if (!file) return null;

    const validType = CONFIG.allowedCvTypes.includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
    if (!validType) throw new Error('Unsupported CV file type. Use PDF, DOC or DOCX.');
    if (file.size > CONFIG.maxCvBytes) throw new Error('CV file is too large. Maximum file size is 10MB.');

    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'cv';
    const path = `${user.id}/cv-${Date.now()}.${ext}`;
    const { error } = await client.storage.from(CONFIG.bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw error;
    return { path, name: sanitiseFileName(file.name), type: file.type || null };
  }

  function addSignOut(client){
    const userArea = document.querySelector('.topbar .user');
    if (!userArea || userArea.querySelector('.rx-profile-sync-signout')) return;
    const btn = document.createElement('button');
    btn.className = 'rx-profile-sync-signout';
    btn.textContent = 'Sign out';
    btn.type = 'button';
    btn.style.cssText = 'border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:8px 12px;font-weight:900;font-size:12px;';
    btn.addEventListener('click', async () => { await client.auth.signOut(); location.href = 'index.html?signedOut=1'; });
    userArea.appendChild(btn);
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    addCvUploadUI();
    let lib;
    try { lib = await loadSupabase(); } catch(e) { console.warn(e); location.replace('candidate-login.html'); return; }
    const client = lib.createClient(CONFIG.url, CONFIG.key);
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData && sessionData.session;

    if (!session || !session.user) {
      const next = encodeURIComponent('candidate-dashboard.html' + location.search);
      location.replace('candidate-login.html?next=' + next);
      return;
    }

    const user = session.user;
    localStorage.setItem('rolexa_last_auth_email', user.email || '');
    if (byId('email')) byId('email').value = user.email || '';
    addSignOut(client);

    const { data, error } = await client.from('candidate_profiles').select('*').eq('user_id', user.id).maybeSingle();

    if (error) {
      console.warn('Rolexa profile load error', error);
      showSyncStatus('bad', 'Could not load profile from Supabase.');
    } else if (data) {
      const localProfile = dbToLocal(data);
      localStorage.setItem(CONFIG.profileKey, JSON.stringify(localProfile));
      fillFormFromLocal(localProfile);
      window.dispatchEvent(new CustomEvent('rolexa:candidate-profile-updated', { detail: localProfile }));
      if (typeof window.showApp === 'function') window.showApp();
      else if (typeof window.renderAll === 'function') window.renderAll();
    } else {
      localStorage.removeItem(CONFIG.profileKey);
      if (typeof window.showSetup === 'function') window.showSetup();
      if (byId('email')) byId('email').value = user.email || '';
      updateCvStatus('', false);
      showSyncStatus('info', 'Create your profile to save it to Supabase.');
    }

    const form = byId('profileForm');
    if (!form || form.dataset.supabaseSyncAttached) return;
    form.dataset.supabaseSyncAttached = 'true';
    form.addEventListener('submit', async () => {
      try {
        showSyncStatus('info', 'Saving profile to Supabase...');
        const payload = formToDb(user);
        const cv = await uploadCvIfSelected(client, user);
        if (cv) {
          payload.has_cv = true;
          payload.cv_file_path = cv.path;
          payload.cv_file_name = cv.name;
          payload.cv_file_type = cv.type;
          payload.cv_uploaded_at = new Date().toISOString();
          updateCvStatus(cv.name, true);
        }
        const { error: saveError } = await client.from('candidate_profiles').upsert(payload, { onConflict: 'user_id' });
        if (saveError) {
          console.warn('Rolexa profile save error', saveError);
          showSyncStatus('bad', 'Profile saved locally, but Supabase save failed.');
          return;
        }
        const refreshed = dbToLocal({ ...payload, cv_file_path: payload.cv_file_path || storedCvPath(), cv_file_name: payload.cv_file_name || storedCvName() });
        localStorage.setItem(CONFIG.profileKey, JSON.stringify(refreshed));
        fillFormFromLocal(refreshed);
        window.dispatchEvent(new CustomEvent('rolexa:candidate-profile-updated', { detail: refreshed }));
        window.dispatchEvent(new CustomEvent('rolexa:candidate-links-updated', { detail: refreshed }));
        showSyncStatus('good', 'Profile saved to Supabase.');
      } catch (err) {
        console.warn('Rolexa profile sync error', err);
        showSyncStatus('bad', err.message || 'Could not save profile to Supabase.');
      }
    });
  }

  function storedCvPath(){
    try { return JSON.parse(localStorage.getItem(CONFIG.profileKey) || '{}').cvFilePath || ''; }
    catch (_) { return ''; }
  }
  function storedCvName(){
    try { return JSON.parse(localStorage.getItem(CONFIG.profileKey) || '{}').cvFileName || ''; }
    catch (_) { return ''; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
