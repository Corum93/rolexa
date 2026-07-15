(() => {
  if (window.__rolexaProfessionalLinksEditor) return;
  window.__rolexaProfessionalLinksEditor = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

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
    fillFromStoredProfile();
    return true;
  }

  function fillFromStoredProfile() {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch (_) {}
    const values = {
      linkedinUrl: profile.linkedinUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      websiteUrl: profile.websiteUrl || '',
      githubUrl: profile.githubUrl || ''
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = byId(id);
      if (input) input.value = value;
    });
  }

  function attachValidation() {
    const form = byId('profileForm');
    if (!form || form.dataset.professionalLinksValidationAttached) return;
    form.dataset.professionalLinksValidationAttached = 'true';
    form.addEventListener('submit', event => {
      const rawValues = ['linkedinUrl','portfolioUrl','websiteUrl','githubUrl'].map(id => byId(id)?.value || '');
      if (rawValues.some(value => !isValidUrl(value))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert('Please check your professional links. Each link should be a valid website address.');
      }
    }, true);
  }

  function init() {
    if (!addFields()) return;
    attachValidation();
  }

  window.addEventListener('rolexa:candidate-profile-updated', () => {
    if (addFields()) fillFromStoredProfile();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();