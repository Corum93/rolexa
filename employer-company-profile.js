(() => {
  if (window.__rolexaEmployerCompanyProfile) return;
  window.__rolexaEmployerCompanyProfile = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const PROFILE_TABLE = 'employer_profiles';
  const LOGO_BUCKET = 'company-logos';
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;
  const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

  let client = null;
  let currentUser = null;
  let currentProfile = null;
  let selectedLogo = null;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]));
  const initials = value => String(value || 'Company').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'C';

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

  function notify(message, kind = 'info') {
    const local = byId('companyProfileStatus');
    if (local) {
      local.className = `rx-company-status show ${kind}`;
      local.textContent = message;
    }
    const global = byId('statusBar');
    if (global) {
      global.className = `statusbar show ${kind}`;
      global.textContent = message;
    }
  }

  function clearNotification() {
    const local = byId('companyProfileStatus');
    if (local) local.className = 'rx-company-status';
  }

  function addStyles() {
    if (byId('rxCompanyProfileStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCompanyProfileStyles';
    style.textContent = `
      .rx-company-layout{display:grid;grid-template-columns:minmax(260px,.72fr) minmax(0,1.28fr);gap:16px;align-items:start}
      .rx-company-preview{position:sticky;top:96px;text-align:center}
      .rx-company-logo{width:132px;height:132px;margin:0 auto 16px;border-radius:28px;border:1px solid rgba(7,16,37,.1);background:#F5F7FC;display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:'Space Grotesk',Inter,sans-serif;font-size:38px;font-weight:900;color:#176BFF}
      .rx-company-logo img{width:100%;height:100%;object-fit:contain;background:#fff}
      .rx-company-preview h2{font-size:23px;margin:0 0 6px}.rx-company-preview p{margin:0;color:#6B7280;font-size:13.5px;line-height:1.5}
      .rx-company-completion{margin-top:18px;text-align:left;border-top:1px solid rgba(7,16,37,.08);padding-top:15px}.rx-company-completion-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:900;color:#26324C;margin-bottom:8px}.rx-company-progress{height:8px;background:#E8ECF5;border-radius:999px;overflow:hidden}.rx-company-progress span{display:block;height:100%;width:0;background:#176BFF;border-radius:inherit;transition:width .2s ease}
      .rx-company-upload{border:1px dashed rgba(23,107,255,.35);background:#F8FAFF;border-radius:16px;padding:15px;display:grid;gap:9px}.rx-company-upload-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rx-company-file{font-size:12px;color:#6B7280;line-height:1.4}.rx-company-secondary{border:1px solid rgba(7,16,37,.12);background:#fff;color:#071025;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:900}.rx-company-secondary.danger{color:#A33327;border-color:rgba(224,83,63,.25)}
      .rx-company-section{padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid rgba(7,16,37,.08)}.rx-company-section:last-child{border-bottom:0;margin-bottom:0;padding-bottom:0}.rx-company-section h2{margin-bottom:5px}.rx-company-section-note{margin:0 0 15px;color:#6B7280;font-size:13px;line-height:1.5}
      .rx-company-status{display:none;border-radius:13px;padding:11px 13px;font-size:13px;font-weight:800;line-height:1.45;margin-bottom:14px}.rx-company-status.show{display:block}.rx-company-status.good{background:#E1F6EB;color:#176B49}.rx-company-status.bad{background:#FBE4E1;color:#A33327}.rx-company-status.info{background:#EEF3FF;color:#2946C7}
      .rx-company-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px}.rx-company-help{font-size:12px;color:#6B7280;line-height:1.45}
      @media(max-width:900px){.rx-company-layout{grid-template-columns:1fr}.rx-company-preview{position:static}}
    `;
    document.head.appendChild(style);
  }

  function injectNavigation() {
    const nav = document.querySelector('.side .nav');
    if (!nav || nav.querySelector('[data-view="companyProfile"]')) return;
    const button = document.createElement('button');
    button.className = 'nav-btn';
    button.type = 'button';
    button.dataset.view = 'companyProfile';
    button.textContent = 'Company profile';
    nav.appendChild(button);
  }

  function injectPage() {
    if (byId('companyProfilePage')) return;
    const content = document.querySelector('.main .content');
    if (!content) return;
    content.insertAdjacentHTML('beforeend', `
      <section class="page" id="companyProfilePage">
        <div class="page-head"><div><h1>Company profile</h1><p>Manage the company information candidates see across Rolexa.</p></div></div>
        <div class="rx-company-layout">
          <aside class="card rx-company-preview">
            <div class="rx-company-logo" id="companyLogoPreview">C</div>
            <h2 id="companyNamePreview">Your company</h2>
            <p id="companyMetaPreview">Add your industry and location</p>
            <div class="rx-company-completion"><div class="rx-company-completion-row"><span>Profile completeness</span><span id="companyCompletionText">0%</span></div><div class="rx-company-progress"><span id="companyCompletionBar"></span></div></div>
          </aside>
          <div class="card">
            <div class="rx-company-status" id="companyProfileStatus"></div>
            <form id="companyProfileForm">
              <div class="rx-company-section"><h2>Company logo</h2><p class="rx-company-section-note">Upload a square PNG, JPG, WebP or SVG. Maximum file size: 2 MB.</p><div class="rx-company-upload"><input id="companyLogoInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden><div class="rx-company-upload-actions"><button class="rx-company-secondary" id="chooseCompanyLogo" type="button">Choose logo</button><button class="rx-company-secondary danger" id="removeCompanyLogo" type="button">Remove logo</button></div><div class="rx-company-file" id="companyLogoFileText">No new logo selected.</div></div></div>
              <div class="rx-company-section"><h2>Company details</h2><p class="rx-company-section-note">This information will later feed job cards, candidate views, interview details and messages.</p><div class="form-grid">
                <div class="field"><label for="companyProfileName">Company name</label><input id="companyProfileName" maxlength="120" required placeholder="Company name"></div>
                <div class="field"><label for="companyProfileIndustry">Industry</label><input id="companyProfileIndustry" maxlength="100" placeholder="Technology"></div>
                <div class="field"><label for="companyProfileSize">Company size</label><select id="companyProfileSize"><option value="">Select company size</option><option>1–10 employees</option><option>11–50 employees</option><option>51–200 employees</option><option>201–500 employees</option><option>501–1,000 employees</option><option>1,001–5,000 employees</option><option>5,001+ employees</option></select></div>
                <div class="field"><label for="companyProfileLocation">Headquarters / location</label><input id="companyProfileLocation" maxlength="160" placeholder="London, UK"></div>
                <div class="field full"><label for="companyProfileWebsite">Website</label><input id="companyProfileWebsite" type="url" maxlength="300" placeholder="https://example.com"></div>
                <div class="field full"><label for="companyProfileDescription">Company description</label><textarea id="companyProfileDescription" maxlength="1500" placeholder="Tell candidates what your company does, who you serve and why someone would want to join."></textarea></div>
              </div></div>
              <div class="rx-company-section"><h2>Employer contact</h2><p class="rx-company-section-note">Internal hiring contact details for this employer account.</p><div class="form-grid">
                <div class="field"><label for="companyContactName">Contact name</label><input id="companyContactName" maxlength="120" placeholder="Full name"></div>
                <div class="field"><label for="companyContactTitle">Job title</label><input id="companyContactTitle" maxlength="120" placeholder="Talent Lead"></div>
                <div class="field"><label for="companyLinkedIn">LinkedIn</label><input id="companyLinkedIn" type="url" maxlength="300" placeholder="https://linkedin.com/company/..."></div>
                <div class="field"><label for="companyXUrl">X / social link</label><input id="companyXUrl" type="url" maxlength="300" placeholder="https://x.com/..."></div>
              </div></div>
              <div class="rx-company-actions"><button class="primary" id="saveCompanyProfile" type="submit">Save company profile</button><span class="rx-company-help">Saved information is tied to the signed-in employer account.</span></div>
            </form>
          </div>
        </div>
      </section>`);
  }

  function profileValues() {
    return {
      company_name: byId('companyProfileName')?.value.trim() || '',
      industry: byId('companyProfileIndustry')?.value.trim() || '',
      company_size: byId('companyProfileSize')?.value || '',
      location: byId('companyProfileLocation')?.value.trim() || '',
      website_url: byId('companyProfileWebsite')?.value.trim() || '',
      description: byId('companyProfileDescription')?.value.trim() || '',
      contact_name: byId('companyContactName')?.value.trim() || '',
      contact_title: byId('companyContactTitle')?.value.trim() || '',
      linkedin_url: byId('companyLinkedIn')?.value.trim() || '',
      social_url: byId('companyXUrl')?.value.trim() || ''
    };
  }

  function validOptionalUrl(value) {
    if (!value) return true;
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch (_) { return false; }
  }

  function updatePreview(profile = profileValues()) {
    const name = profile.company_name || 'Your company';
    const meta = [profile.industry, profile.location].filter(Boolean).join(' · ') || 'Add your industry and location';
    const logo = profile.logo_url || currentProfile?.logo_url || '';
    const preview = byId('companyLogoPreview');
    if (preview) preview.innerHTML = logo ? `<img src="${safe(logo)}" alt="${safe(name)} logo">` : safe(initials(name));
    if (byId('companyNamePreview')) byId('companyNamePreview').textContent = name;
    if (byId('companyMetaPreview')) byId('companyMetaPreview').textContent = meta;
    const fields = [profile.company_name, profile.industry, profile.company_size, profile.location, profile.website_url, profile.description, profile.contact_name, profile.contact_title];
    const complete = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    if (byId('companyCompletionText')) byId('companyCompletionText').textContent = `${complete}%`;
    if (byId('companyCompletionBar')) byId('companyCompletionBar').style.width = `${complete}%`;
  }

  function populate(profile) {
    currentProfile = profile || {};
    const values = {
      companyProfileName: currentProfile.company_name,
      companyProfileIndustry: currentProfile.industry,
      companyProfileSize: currentProfile.company_size,
      companyProfileLocation: currentProfile.location,
      companyProfileWebsite: currentProfile.website_url,
      companyProfileDescription: currentProfile.description,
      companyContactName: currentProfile.contact_name,
      companyContactTitle: currentProfile.contact_title,
      companyLinkedIn: currentProfile.linkedin_url,
      companyXUrl: currentProfile.social_url
    };
    Object.entries(values).forEach(([id, value]) => { if (byId(id)) byId(id).value = value || ''; });
    updatePreview(currentProfile);
    syncTopbar(currentProfile);
  }

  function syncTopbar(profile) {
    const name = profile?.company_name || profile?.contact_name || currentUser?.email?.split('@')[0] || 'Employer';
    const topName = byId('topName');
    const topAvatar = byId('topAvatar');
    if (topName) topName.textContent = name;
    if (topAvatar) {
      if (profile?.logo_url) topAvatar.innerHTML = `<img src="${safe(profile.logo_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
      else topAvatar.textContent = initials(name).slice(0, 1);
    }
  }

  async function loadProfile() {
    const { data, error } = await client.from(PROFILE_TABLE).select('*').eq('user_id', currentUser.id).maybeSingle();
    if (error) {
      console.warn('Employer profile load error', error);
      notify(error.message?.includes('does not exist') ? 'The employer profile database setup still needs to be applied before this page can save.' : 'Could not load the company profile from Supabase.', 'bad');
      populate({});
      return;
    }
    populate(data || {});
  }

  async function uploadLogo() {
    if (!selectedLogo) return { logo_url: currentProfile?.logo_url || null, logo_path: currentProfile?.logo_path || null };
    const extension = (selectedLogo.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${currentUser.id}/company-logo-${Date.now()}.${extension}`;
    const { error } = await client.storage.from(LOGO_BUCKET).upload(path, selectedLogo, { cacheControl: '3600', upsert: false, contentType: selectedLogo.type });
    if (error) throw error;
    const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('The company logo URL could not be created.');
    if (currentProfile?.logo_path && currentProfile.logo_path !== path) client.storage.from(LOGO_BUCKET).remove([currentProfile.logo_path]).catch(() => {});
    return { logo_url: data.publicUrl, logo_path: path };
  }

  async function saveProfile(event) {
    event.preventDefault();
    clearNotification();
    const values = profileValues();
    if (!values.company_name) return notify('Add the company name before saving.', 'bad');
    for (const [label, url] of [['Website', values.website_url], ['LinkedIn', values.linkedin_url], ['Social link', values.social_url]]) {
      if (!validOptionalUrl(url)) return notify(`${label} must start with http:// or https://.`, 'bad');
    }
    const button = byId('saveCompanyProfile');
    if (button) { button.disabled = true; button.textContent = selectedLogo ? 'Uploading and saving…' : 'Saving…'; }
    try {
      const logo = await uploadLogo();
      const payload = { user_id: currentUser.id, ...values, ...logo, updated_at: new Date().toISOString() };
      const { data, error } = await client.from(PROFILE_TABLE).upsert(payload, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      selectedLogo = null;
      if (byId('companyLogoInput')) byId('companyLogoInput').value = '';
      if (byId('companyLogoFileText')) byId('companyLogoFileText').textContent = 'No new logo selected.';
      populate(data || payload);
      const companyJobField = byId('company');
      if (companyJobField && !companyJobField.value.trim()) companyJobField.value = values.company_name;
      notify('Company profile saved successfully.', 'good');
    } catch (error) {
      console.error('Employer company profile save error', error);
      notify(error?.message || 'The company profile could not be saved.', 'bad');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Save company profile'; }
    }
  }

  async function removeLogo() {
    selectedLogo = null;
    if (byId('companyLogoInput')) byId('companyLogoInput').value = '';
    if (!currentProfile?.logo_url) {
      if (byId('companyLogoFileText')) byId('companyLogoFileText').textContent = 'No logo is currently saved.';
      updatePreview({ ...profileValues(), logo_url: null });
      return;
    }
    const button = byId('removeCompanyLogo');
    if (button) button.disabled = true;
    try {
      if (currentProfile.logo_path) await client.storage.from(LOGO_BUCKET).remove([currentProfile.logo_path]);
      const { data, error } = await client.from(PROFILE_TABLE).update({ logo_url: null, logo_path: null, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id).select().single();
      if (error) throw error;
      populate(data || { ...currentProfile, logo_url: null, logo_path: null });
      if (byId('companyLogoFileText')) byId('companyLogoFileText').textContent = 'Company logo removed.';
      notify('Company logo removed.', 'good');
    } catch (error) {
      notify(error?.message || 'The company logo could not be removed.', 'bad');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bindEvents() {
    const form = byId('companyProfileForm');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', saveProfile);
      form.addEventListener('input', () => updatePreview());
    }
    byId('chooseCompanyLogo')?.addEventListener('click', () => byId('companyLogoInput')?.click());
    byId('removeCompanyLogo')?.addEventListener('click', removeLogo);
    byId('companyLogoInput')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!ALLOWED_LOGO_TYPES.includes(file.type)) { event.target.value = ''; return notify('Choose a PNG, JPG, WebP or SVG logo.', 'bad'); }
      if (file.size > MAX_LOGO_BYTES) { event.target.value = ''; return notify('The company logo must be 2 MB or smaller.', 'bad'); }
      selectedLogo = file;
      if (byId('companyLogoFileText')) byId('companyLogoFileText').textContent = `${file.name} selected. It will upload when you save.`;
      const reader = new FileReader();
      reader.onload = () => { const preview = byId('companyLogoPreview'); if (preview) preview.innerHTML = `<img src="${safe(reader.result)}" alt="Selected company logo preview">`; };
      reader.readAsDataURL(file);
    });
  }

  async function init() {
    addStyles();
    injectNavigation();
    injectPage();
    bindEvents();
    try {
      const supabase = await loadSupabase();
      client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return notify('Sign in as an employer to manage the company profile.', 'bad');
      currentUser = user;
      await loadProfile();
    } catch (error) {
      console.error('Employer company profile initialisation error', error);
      notify('Company profile could not connect to Supabase.', 'bad');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
