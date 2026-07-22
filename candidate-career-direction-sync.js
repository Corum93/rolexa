(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCareerDirectionSyncV1) return;
  window.__rolexaCareerDirectionSyncV1 = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd',
    table: 'candidate_career_directions',
    storageKey: 'rolexa_candidate_career_direction_v1'
  };

  let client = null;
  let user = null;
  let syncing = false;
  let saveTimer = null;

  function loadSupabase(){
    return new Promise((resolve,reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rolexa-supabase-lib="true"]');
      if (existing) {
        existing.addEventListener('load',()=>resolve(window.supabase),{once:true});
        existing.addEventListener('error',()=>reject(new Error('Supabase could not load')),{once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rolexaSupabaseLib = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function localState(){
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}') || {}; }
    catch { return {}; }
  }

  function hasMeaningfulData(state){
    return Boolean(
      state.currentRole || state.targetRole || state.skills || state.currentSummary ||
      (Array.isArray(state.experience) && state.experience.length) ||
      (Array.isArray(state.reasons) && state.reasons.length)
    );
  }

  function toDb(state){
    return {
      user_id: user.id,
      current_situation: state.situation || null,
      current_job_role: state.currentRole || null,
      current_industry: state.industry || null,
      current_level: state.currentLevel || null,
      years_experience: state.years || null,
      current_location: state.location || null,
      current_summary: state.currentSummary || null,
      experience_areas: Array.isArray(state.experience) ? state.experience : [],
      experience_evidence: state.evidence || null,
      skills: state.skills || null,
      qualifications: state.qualifications || null,
      other_evidence: state.otherEvidence || null,
      target_role: state.targetRole || null,
      secondary_roles: state.secondaryRoles || null,
      reasons_for_moving: Array.isArray(state.reasons) ? state.reasons : [],
      private_move_context: state.moveContext || null,
      move_type: state.moveType || null,
      role_priorities: Array.isArray(state.priorities) ? state.priorities : [],
      preferred_work_style: state.workStyle || null,
      minimum_salary: state.minSalary || null,
      preferred_location: state.preferredLocation || null,
      employment_type: state.employmentType || null,
      development_areas: Array.isArray(state.development) ? state.development : [],
      development_notes: state.developmentText || null,
      last_step: Math.max(1,Math.min(6,Number(state.lastStep || 1))),
      completed: Boolean(state.completed),
      updated_at: new Date().toISOString()
    };
  }

  function fromDb(row){
    return {
      situation: row.current_situation || '',
      currentRole: row.current_job_role || '',
      industry: row.current_industry || '',
      currentLevel: row.current_level || '',
      years: row.years_experience || '',
      location: row.current_location || '',
      currentSummary: row.current_summary || '',
      experience: Array.isArray(row.experience_areas) ? row.experience_areas : [],
      evidence: row.experience_evidence || '',
      skills: row.skills || '',
      qualifications: row.qualifications || '',
      otherEvidence: row.other_evidence || '',
      targetRole: row.target_role || '',
      secondaryRoles: row.secondary_roles || '',
      reasons: Array.isArray(row.reasons_for_moving) ? row.reasons_for_moving : [],
      moveContext: row.private_move_context || '',
      moveType: row.move_type || '',
      priorities: Array.isArray(row.role_priorities) ? row.role_priorities : [],
      workStyle: row.preferred_work_style || '',
      minSalary: row.minimum_salary || '',
      preferredLocation: row.preferred_location || '',
      employmentType: row.employment_type || '',
      development: Array.isArray(row.development_areas) ? row.development_areas : [],
      developmentText: row.development_notes || '',
      lastStep: row.last_step || 1,
      completed: Boolean(row.completed)
    };
  }

  function toast(kind,text){
    let el = document.getElementById('rxCareerSyncToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rxCareerSyncToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:11px 15px;border-radius:999px;font:800 12px Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(7,16,37,.2);display:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = kind === 'bad' ? '#FBE4E1' : kind === 'good' ? '#E1F6EB' : '#EEF3FF';
    el.style.color = kind === 'bad' ? '#A33327' : kind === 'good' ? '#176B49' : '#2946C7';
    clearTimeout(window.__rxCareerSyncToastTimer);
    window.__rxCareerSyncToastTimer = setTimeout(()=>{el.style.display='none';},2600);
  }

  async function saveNow(state,{quiet=false}={}){
    if (!client || !user || syncing || !hasMeaningfulData(state)) return;
    syncing = true;
    try {
      const { error } = await client.from(CONFIG.table).upsert(toDb(state),{onConflict:'user_id'});
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('rolexa:career-direction-saved',{detail:{userId:user.id}}));
      if (!quiet) toast('good','Career direction saved to your account.');
    } catch (error) {
      console.warn('Rolexa career direction save error',error);
      if (!quiet) toast('bad','Career direction could not be saved.');
    } finally {
      syncing = false;
    }
  }

  function queueSave(state){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>saveNow(state,{quiet:true}),500);
  }

  function observeLocalSaves(){
    const original = Storage.prototype.setItem;
    if (Storage.prototype.__rolexaCareerPatched) return;
    Storage.prototype.__rolexaCareerPatched = true;
    Storage.prototype.setItem = function(key,value){
      original.apply(this,arguments);
      if (this === localStorage && key === CONFIG.storageKey) {
        try { queueSave(JSON.parse(value || '{}') || {}); }
        catch {}
      }
    };
  }

  async function init(){
    observeLocalSaves();
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url,CONFIG.key);
      const { data: sessionData } = await client.auth.getSession();
      user = sessionData?.session?.user || null;
      if (!user) return;

      const local = localState();
      const { data,rowError } = await client.from(CONFIG.table).select('*').eq('user_id',user.id).maybeSingle();
      if (rowError) throw rowError;

      if (data) {
        const remote = fromDb(data);
        const remoteText = JSON.stringify(remote);
        const localText = JSON.stringify(local);
        if (remoteText !== localText) {
          localStorage.setItem(CONFIG.storageKey,remoteText);
          if (!sessionStorage.getItem('rxCareerRemoteLoaded')) {
            sessionStorage.setItem('rxCareerRemoteLoaded','1');
            location.reload();
            return;
          }
        }
      } else if (hasMeaningfulData(local)) {
        await saveNow(local,{quiet:false});
      }

      sessionStorage.removeItem('rxCareerRemoteLoaded');
    } catch (error) {
      console.warn('Rolexa career direction sync init error',error);
      toast('bad','Career direction sync is unavailable right now.');
    }
  }

  init();
})();