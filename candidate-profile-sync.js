(() => {
  if (window.__rolexaCandidateProfileSync) return;
  window.__rolexaCandidateProfileSync = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd',
    profileKey: 'rolexa_candidate_profile_v2'
  };

  function byId(id){ return document.getElementById(id); }
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
    window.__rolexaSyncStatusTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
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
      hasCv: !!row.has_cv,
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
      has_cv: byId('hasCv') ? byId('hasCv').checked : false,
      open_to_work: byId('openToWork') ? byId('openToWork').checked : true,
      open_to_relocate: byId('relocate') ? byId('relocate').checked : false,
      updated_at: new Date().toISOString()
    };
  }

  function fillFormFromLocal(profile){
    if (!profile) return;
    const map = {
      fullName: 'fullName',
      email: 'email',
      location: 'location',
      targetRole: 'targetRole',
      level: 'level',
      workStyle: 'workStyle',
      salary: 'salary',
      skills: 'skills',
      summary: 'summary'
    };
    Object.entries(map).forEach(([key, id]) => { if (byId(id)) byId(id).value = profile[key] || ''; });
    if (byId('hasCv')) byId('hasCv').checked = !!profile.hasCv;
    if (byId('openToWork')) byId('openToWork').checked = profile.openToWork !== false;
    if (byId('relocate')) byId('relocate').checked = !!profile.relocate;
  }

  function addSignOut(client){
    const userArea = document.querySelector('.topbar .user');
    if (!userArea || userArea.querySelector('.rx-profile-sync-signout')) return;
    const btn = document.createElement('button');
    btn.className = 'rx-profile-sync-signout';
    btn.textContent = 'Sign out';
    btn.type = 'button';
    btn.style.cssText = 'border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:8px 12px;font-weight:900;font-size:12px;';
    btn.addEventListener('click', async () => {
      await client.auth.signOut();
      location.href = 'candidate-login.html';
    });
    userArea.appendChild(btn);
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    let lib;
    try { lib = await loadSupabase(); } catch(e) { console.warn(e); return; }
    const client = lib.createClient(CONFIG.url, CONFIG.key);
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData && sessionData.session;

    if (!session || !session.user) {
      showSyncStatus('info', 'Login to save your profile securely.');
      return;
    }

    const user = session.user;
    localStorage.setItem('rolexa_last_auth_email', user.email || '');
    if (byId('email')) byId('email').value = user.email || '';
    addSignOut(client);

    const { data, error } = await client
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Rolexa profile load error', error);
      showSyncStatus('bad', 'Could not load profile from Supabase.');
    } else if (data) {
      const localProfile = dbToLocal(data);
      localStorage.setItem(CONFIG.profileKey, JSON.stringify(localProfile));
      fillFormFromLocal(localProfile);
      if (typeof window.showApp === 'function') window.showApp();
      else if (typeof window.renderAll === 'function') window.renderAll();
      showSyncStatus('good', 'Profile loaded from Supabase.');
    } else {
      localStorage.removeItem(CONFIG.profileKey);
      if (typeof window.showSetup === 'function') window.showSetup();
      if (byId('email')) byId('email').value = user.email || '';
      showSyncStatus('info', 'Create your profile to save it to Supabase.');
    }

    const form = byId('profileForm');
    if (!form || form.dataset.supabaseSyncAttached) return;
    form.dataset.supabaseSyncAttached = 'true';
    form.addEventListener('submit', async () => {
      showSyncStatus('info', 'Saving profile to Supabase...');
      const payload = formToDb(user);
      const { error: saveError } = await client
        .from('candidate_profiles')
        .upsert(payload, { onConflict: 'user_id' });
      if (saveError) {
        console.warn('Rolexa profile save error', saveError);
        showSyncStatus('bad', 'Profile saved locally, but Supabase save failed.');
      } else {
        showSyncStatus('good', 'Profile saved to Supabase.');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
