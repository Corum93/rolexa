(() => {
  if (window.__rolexaProfessionalLinksEditor) return;
  window.__rolexaProfessionalLinksEditor = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const PROFILE_KEY = 'rolexa_candidate_profile_v2';

  function byId(id) { return document.getElementById(id); }

  function addStyles() {
    if (byId('rxProfessionalLinksEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxProfessionalLinksEditorStyles';
    style.textContent = `
      .rx-professional-links-field{grid-column:1/-1;border-top:1px solid rgba(7,16,37,.09);padding-top:18px;margin-top:4px}
      .rx-professional-links-heading{font-family:'Space Grotesk',Inter,sans-serif;font-size:20px;font-weight:800;color:#071025;margin-bottom:5px}
      .rx-professional-links-copy{font-size:12.5px;color:#6B7280;line-height:1.45;margin-bottom:14px}
      .rx-professional-links-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .rx-professional-links-grid .field{min-width:0}
      @media(max-width:760px){.rx-professional-links-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function normaliseUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  function isValidUrl(value) {
    if (!value) return true;
    try {
      const parsed = new URL(normaliseUrl(value));
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (_) {
      return false;
    }
  }

  function addFields() {
    if (byId('rxProfessionalLinksField')) return true;
    const form = byId('profileForm');
    const summary = byId('summary');
    const summaryField = summary?.closest('.field');
    if (!form || !summaryField) return false;

    addStyles();
    const section = document.createElement('section');
    section.id = 'rxProfessionalLinksField';
    section.className = 'rx-professional-links-field';
    section.innerHTML = `
      <div class="rx-professional-links-heading">Professional links</div>
      <div class="rx-professional-links-copy">Optional links that help employers understand your professional background. Empty fields will remain hidden from your profile.</div>
      <div class="rx-professional-links-grid">
        <div class="field"><label for="linkedinUrl">LinkedIn URL</label><input id="linkedinUrl" type="text" inputmode="url" autocomplete="url" placeholder="linkedin.com/in/your-name"></div>
        <div class="field"><label for="portfolioUrl">Portfolio URL</label><input id="portfolioUrl" type="text" inputmode="url" autocomplete="url" placeholder="yourportfolio.com"></div>
        <div class="field"><label for="websiteUrl">Personal website</label><input id="websiteUrl" type="text" inputmode="url" autocomplete="url" placeholder="yourwebsite.com"></div>
        <div class="field"><label for="githubUrl">GitHub URL</label><input id="githubUrl" type="text" inputmode="url" autocomplete="url" placeholder="github.com/your-name"></div>
      </div>
    `;
    summaryField.insertAdjacentElement('afterend', section);
    return true;
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-links-supabase],script[src*="@supabase/supabase-js"]');
      if (existing) {
        if (window.supabase?.createClient) return resolve(window.supabase);
        existing.addEventListener('load', () => resolve(window.supabase), { once:true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxLinksSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  function fillFields(data) {
    const values = {
      linkedinUrl: data?.linkedin_url || '',
      portfolioUrl: data?.portfolio_url || '',
      websiteUrl: data?.website_url || '',
      githubUrl: data?.github_url || ''
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = byId(id);
      if (input) input.value = value;
    });
  }

  function payloadFromFields(userId) {
    const values = {
      user_id: userId,
      linkedin_url: normaliseUrl(byId('linkedinUrl')?.value),
      portfolio_url: normaliseUrl(byId('portfolioUrl')?.value),
      website_url: normaliseUrl(byId('websiteUrl')?.value),
      github_url: normaliseUrl(byId('githubUrl')?.value),
      updated_at: new Date().toISOString()
    };
    Object.keys(values).forEach(key => {
      if (key !== 'user_id' && key !== 'updated_at' && !values[key]) values[key] = null;
    });
    return values;
  }

  function updateLocalProfile(payload) {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch (_) {}
    profile.linkedinUrl = payload.linkedin_url || '';
    profile.portfolioUrl = payload.portfolio_url || '';
    profile.websiteUrl = payload.website_url || '';
    profile.githubUrl = payload.github_url || '';
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  async function init() {
    if (!addFields()) return;

    let lib;
    try { lib = await loadSupabase(); }
    catch (error) { console.warn('Rolexa professional links load error', error); return; }

    const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const { data, error } = await client
      .from('candidate_profiles')
      .select('linkedin_url,portfolio_url,website_url,github_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) console.warn('Rolexa professional links fetch error', error);
    else fillFields(data);

    const form = byId('profileForm');
    if (!form || form.dataset.professionalLinksAttached) return;
    form.dataset.professionalLinksAttached = 'true';

    form.addEventListener('submit', async event => {
      const rawValues = ['linkedinUrl','portfolioUrl','websiteUrl','githubUrl'].map(id => byId(id)?.value || '');
      if (rawValues.some(value => !isValidUrl(value))) {
        event.preventDefault();
        alert('Please check your professional links. Each link should be a valid website address.');
        return;
      }

      const payload = payloadFromFields(user.id);
      const { error: saveError } = await client
        .from('candidate_profiles')
        .upsert(payload, { onConflict:'user_id' });

      if (saveError) {
        console.warn('Rolexa professional links save error', saveError);
        return;
      }

      fillFields(payload);
      updateLocalProfile(payload);
      window.dispatchEvent(new CustomEvent('rolexa:candidate-links-updated', { detail: payload }));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();