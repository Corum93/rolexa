(() => {
  if (window.RolexaWebsiteRegistrationConsent) return;

  const DOCUMENTS = Object.freeze({
    website_terms: Object.freeze({
      version: '2026-08-15-draft-2',
      title: 'Website Terms & Conditions',
      url: 'website-terms.html'
    }),
    privacy_policy: Object.freeze({
      version: '2026-08-11-draft-1',
      title: 'Privacy Policy',
      url: 'privacy-policy.html'
    })
  });

  let client = null;
  let accountType = '';
  let currentMode = 'login';
  let setupPromise = null;
  let registrationReady = false;
  let setupError = '';

  const byId = id => document.getElementById(id);

  function addStyles() {
    if (byId('websiteConsentStyles')) return;
    const style = document.createElement('style');
    style.id = 'websiteConsentStyles';
    style.textContent = `
      .rx-website-consent{display:none;margin:4px 0 15px;padding:14px;border:1px solid rgba(23,107,255,.18);border-radius:16px;background:#F7F9FF;}
      .rx-website-consent.show{display:block;}
      .rx-consent-title{display:block;margin-bottom:9px;color:#101F4A;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.045em;}
      .rx-consent-check{display:flex;align-items:flex-start;gap:9px;margin:9px 0;color:#36415C;font-size:12.5px;line-height:1.45;cursor:pointer;}
      .rx-consent-check input{flex:0 0 auto;width:17px;height:17px;margin:1px 0 0;accent-color:#176BFF;}
      .rx-consent-check a{color:#2946C7;font-weight:900;text-decoration:underline;text-underline-offset:2px;}
      .rx-consent-note{margin:10px 0 0!important;color:#6B7280!important;font-size:11.5px!important;line-height:1.45!important;}
      .rx-consent-state{display:none;margin:10px 0 0;padding:9px 10px;border-radius:11px;font-size:11.5px;line-height:1.4;}
      .rx-consent-state.show{display:block;}
      .rx-consent-state.bad{background:#FBE4E1;color:#A33327;}
      .auth-signup-mode .candidate-google-login{display:none!important;}
      @media(max-width:600px){.rx-website-consent{padding:13px 12px}.rx-consent-check{font-size:12px;line-height:1.5}.rx-consent-check input{width:18px;height:18px}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    if (byId('websiteConsentPanel')) return;
    const submit = byId('submitBtn');
    if (!submit) return;
    submit.insertAdjacentHTML('beforebegin', `
      <div class="rx-website-consent" id="websiteConsentPanel" aria-live="polite">
        <span class="rx-consent-title">Required legal acknowledgements</span>
        <label class="rx-consent-check">
          <input id="websiteTermsAccepted" type="checkbox">
          <span>I have read and agree to the <a href="${DOCUMENTS.website_terms.url}" target="_blank" rel="noopener noreferrer">Website Terms &amp; Conditions</a> (version ${DOCUMENTS.website_terms.version}).</span>
        </label>
        <label class="rx-consent-check">
          <input id="privacyPolicyAcknowledged" type="checkbox">
          <span>I acknowledge that I have read the <a href="${DOCUMENTS.privacy_policy.url}" target="_blank" rel="noopener noreferrer">Privacy Policy</a> (version ${DOCUMENTS.privacy_policy.version}).</span>
        </label>
        <p class="rx-consent-note">Both documents are pre-launch drafts and require professional legal review. Rolexa's final company and policy details are still being confirmed.</p>
        <div class="rx-consent-state" id="websiteConsentState"></div>
      </div>
    `);
    ['websiteTermsAccepted', 'privacyPolicyAcknowledged'].forEach(id => {
      byId(id)?.addEventListener('change', () => {
        if (setupError) {
          setupPromise = null;
          ensureSetup();
        }
        updateSubmitState();
      });
    });
  }

  function showSetupError(message) {
    setupError = message;
    const state = byId('websiteConsentState');
    if (state) {
      state.className = 'rx-consent-state show bad';
      state.textContent = message;
    }
  }

  function normalizeRows(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.documents)) return data.documents;
    return [];
  }

  async function verifyServerSetup() {
    registrationReady = false;
    setupError = '';
    if (!client) throw new Error('Registration service is unavailable.');
    const result = await client.rpc('get_current_registration_documents');
    if (result.error) throw result.error;
    const rows = normalizeRows(result.data);
    for (const [key, expected] of Object.entries(DOCUMENTS)) {
      const row = rows.find(item => item.document_key === key);
      if (!row || row.version_code !== expected.version || row.document_url !== expected.url) {
        throw new Error('The published legal documents do not match this registration page.');
      }
    }
    setupError = '';
    const state = byId('websiteConsentState');
    if (state) {
      state.className = 'rx-consent-state';
      state.textContent = '';
    }
    registrationReady = true;
    return true;
  }

  function ensureSetup() {
    if (!setupPromise) {
      setupPromise = verifyServerSetup().catch(error => {
        console.warn('[Rolexa] Website registration consent setup is unavailable', error);
        showSetupError('New account registration is being prepared. Existing users can still log in normally.');
        return false;
      }).finally(updateSubmitState);
    }
    return setupPromise;
  }

  function checksAccepted() {
    return Boolean(byId('websiteTermsAccepted')?.checked && byId('privacyPolicyAcknowledged')?.checked);
  }

  function updateSubmitState() {
    const panel = byId('websiteConsentPanel');
    const submit = byId('submitBtn');
    const signingUp = currentMode === 'signup';
    ['websiteTermsAccepted', 'privacyPolicyAcknowledged'].forEach(id => {
      const input = byId(id);
      if (!input) return;
      input.required = signingUp;
      input.disabled = !signingUp;
    });
    panel?.classList.toggle('show', signingUp);
    document.body.classList.toggle('auth-signup-mode', signingUp);
    if (!submit) return;
    if (signingUp) submit.disabled = !(registrationReady && checksAccepted());
    else submit.disabled = false;
  }

  function setMode(mode) {
    currentMode = mode === 'signup' ? 'signup' : 'login';
    if (currentMode === 'signup') ensureSetup();
    updateSubmitState();
  }

  async function getSignupOptions(redirectTo) {
    setupPromise = null;
    const ready = await ensureSetup();
    if (!ready || !registrationReady) {
      throw new Error(setupError || 'Registration is not ready yet.');
    }
    if (!checksAccepted()) {
      throw new Error('Select both required legal acknowledgements before creating your account.');
    }
    return {
      emailRedirectTo: redirectTo,
      data: {
        account_type: accountType,
        website_terms_accepted: true,
        website_terms_version: DOCUMENTS.website_terms.version,
        privacy_policy_acknowledged: true,
        privacy_policy_version: DOCUMENTS.privacy_policy.version,
        consent_source: 'website_registration',
        consent_user_agent: navigator.userAgent.slice(0, 1000)
      }
    };
  }

  function init(options) {
    client = options.client;
    accountType = options.accountType;
    if (!['candidate', 'employer'].includes(accountType)) {
      throw new Error('A valid registration account type is required.');
    }
    addStyles();
    render();
    updateSubmitState();
  }

  window.RolexaWebsiteRegistrationConsent = {
    documents: DOCUMENTS,
    getSignupOptions,
    init,
    setMode
  };
})();
