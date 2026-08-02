(() => {
  if (window.__rolexaInternalPeople) return;
  window.__rolexaInternalPeople = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  let client = null;

  const byId = id => document.getElementById(id);
  const show = id => byId(id)?.classList.remove('hidden');
  const hide = id => byId(id)?.classList.add('hidden');

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function setError(message) {
    const error = byId('peopleLoginError');
    if (!error) return;
    error.textContent = message;
    error.classList.toggle('show', Boolean(message));
  }

  async function verifyStaff(user) {
    if (!user) return null;
    const { data, error } = await client
      .from('rolexa_staff_users')
      .select('user_id,role,is_active,full_name,job_title')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      console.error('Rolexa People staff verification failed', error);
      return null;
    }
    return data || null;
  }

  function closeMobileNavigation() {
    byId('peopleSidebar')?.classList.remove('is-open');
    byId('peopleNavOverlay')?.classList.remove('is-open');
    byId('peopleMenuToggle')?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('people-nav-open');
  }

  function openSection(sectionId, updateHash = true) {
    const sections = [...document.querySelectorAll('[data-people-section]')];
    const buttons = [...document.querySelectorAll('[data-people-target]')];
    const selected = byId(sectionId) || byId('peopleOverview');
    sections.forEach(section => section.classList.toggle('hidden', section !== selected));
    buttons.forEach(button => button.classList.toggle('active', button.dataset.peopleTarget === selected.id));
    if (updateHash) history.replaceState(null, '', selected.id === 'peopleOverview' ? '#overview' : `#${selected.id.replace(/^people/, '').toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileNavigation();
  }

  function sectionFromHash() {
    const key = location.hash.slice(1).toLowerCase();
    const map = {
      overview: 'peopleOverview', people: 'peopleDirectory', directory: 'peopleDirectory', teamaccess: 'peopleTeamAccess',
      organisationchart: 'peopleOrganisationChart', employmentrecords: 'peopleEmploymentRecords',
      documents: 'peopleDocuments', onboarding: 'peopleOnboarding'
    };
    return map[key] || 'peopleOverview';
  }

  function wireNavigation() {
    document.querySelectorAll('[data-people-target]').forEach(button => {
      button.addEventListener('click', () => openSection(button.dataset.peopleTarget));
    });
    byId('peopleMenuToggle')?.addEventListener('click', () => {
      const opening = !byId('peopleSidebar')?.classList.contains('is-open');
      byId('peopleSidebar')?.classList.toggle('is-open', opening);
      byId('peopleNavOverlay')?.classList.toggle('is-open', opening);
      byId('peopleMenuToggle')?.setAttribute('aria-expanded', String(opening));
      document.body.classList.toggle('people-nav-open', opening);
    });
    byId('peopleNavOverlay')?.addEventListener('click', closeMobileNavigation);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMobileNavigation(); });
    window.addEventListener('hashchange', () => openSection(sectionFromHash(), false));
    openSection(sectionFromHash(), false);
  }

  async function routeSession() {
    hide('peopleLoginGate');
    hide('peopleDeniedGate');
    hide('peopleApp');
    show('peopleLoadingGate');
    const { data: { user }, error } = await client.auth.getUser();
    hide('peopleLoadingGate');
    if (error || !user) {
      show('peopleLoginGate');
      return;
    }
    const staff = await verifyStaff(user);
    if (!staff) {
      show('peopleDeniedGate');
      return;
    }
    byId('peopleStaffName').textContent = staff.full_name || user.email || 'Rolexa staff';
    byId('peopleStaffRole').textContent = [staff.job_title, staff.role].filter(Boolean).join(' · ');
    show('peopleApp');
  }

  async function signIn(event) {
    event.preventDefault();
    setError('');
    const button = byId('peopleLoginButton');
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: byId('peopleEmail').value.trim(),
        password: byId('peoplePassword').value
      });
      if (error || !data.user) throw error || new Error('Sign-in failed.');
      const staff = await verifyStaff(data.user);
      if (!staff) {
        await client.auth.signOut();
        throw new Error('This account is not approved for Rolexa internal access.');
      }
      await routeSession();
    } catch (error) {
      setError(error?.message || 'Could not sign in.');
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in securely';
    }
  }

  async function signOut() {
    await client.auth.signOut();
    hide('peopleApp');
    hide('peopleDeniedGate');
    show('peopleLoginGate');
  }

  async function init() {
    wireNavigation();
    try {
      const supabase = await loadSupabase();
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      byId('peopleLoginForm')?.addEventListener('submit', signIn);
      byId('peopleSignOut')?.addEventListener('click', signOut);
      byId('peopleDeniedSignOut')?.addEventListener('click', signOut);
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
        const appIsVisible = !byId('peopleApp')?.classList.contains('hidden');
        if (event === 'SIGNED_IN' && session?.user && appIsVisible) return;
        if (event === 'SIGNED_OUT') {
          hide('peopleLoadingGate');
          hide('peopleDeniedGate');
          hide('peopleApp');
          show('peopleLoginGate');
          return;
        }
        setTimeout(routeSession, 0);
      });
      await routeSession();
    } catch (error) {
      console.error('Rolexa People startup error', error);
      hide('peopleLoadingGate');
      show('peopleLoginGate');
      setError('The internal dashboard could not connect securely.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
