(() => {
  if (window.RolexaCandidateRightToWorkRegistration) return;

  const DECLARATION_VERSION = '2026-08-15-1';
  let currentMode = 'login';

  const byId = id => document.getElementById(id);

  function addStyles() {
    if (byId('candidateRightToWorkStyles')) return;
    const style = document.createElement('style');
    style.id = 'candidateRightToWorkStyles';
    style.textContent = `
      .rx-rtw-panel{display:none;margin:3px 0 15px;padding:15px;border:1px solid rgba(23,107,255,.18);border-radius:16px;background:#F7F9FF;}
      .rx-rtw-panel.show{display:block;}
      .rx-rtw-heading{margin:0;color:#101F4A;font-size:15px;font-weight:900;letter-spacing:-.01em;}
      .rx-rtw-intro{margin:5px 0 13px!important;color:#5E6880!important;font-size:12px!important;line-height:1.5!important;}
      .rx-rtw-field{display:grid;gap:6px;margin:0 0 11px;}
      .rx-rtw-field label{color:#101F4A;font-size:11.5px;font-weight:900;line-height:1.4;}
      .rx-rtw-field select,.rx-rtw-field input[type="date"]{width:100%;min-height:43px;border:1px solid #D6DCEA;background:#fff;border-radius:12px;padding:10px 12px;color:#101F4A;font:inherit;font-size:13px;outline:none;}
      .rx-rtw-field select:focus,.rx-rtw-field input[type="date"]:focus{border-color:#176BFF;box-shadow:0 0 0 3px rgba(23,107,255,.09);}
      .rx-rtw-field select:disabled{background:#EEF1F7;color:#69738A;}
      .rx-rtw-date{display:none;}
      .rx-rtw-date.show{display:grid;}
      .rx-rtw-confirm{display:flex;align-items:flex-start;gap:9px;margin:4px 0 0;color:#36415C;font-size:12px;line-height:1.5;cursor:pointer;}
      .rx-rtw-confirm input{flex:0 0 auto;width:17px;height:17px;margin:1px 0 0;accent-color:#176BFF;}
      .rx-rtw-note{margin:10px 0 0!important;padding-top:10px;border-top:1px solid #E2E7F1;color:#6B7280!important;font-size:11.5px!important;line-height:1.5!important;}
      @media(max-width:600px){.rx-rtw-panel{padding:13px 12px}.rx-rtw-field label,.rx-rtw-confirm{font-size:12px}.rx-rtw-confirm input{width:18px;height:18px}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    if (byId('candidateRightToWorkPanel')) return;
    const consentPanel = byId('websiteConsentPanel');
    const submit = byId('submitBtn');
    const anchor = consentPanel || submit;
    if (!anchor) return;
    anchor.insertAdjacentHTML('beforebegin', `
      <section class="rx-rtw-panel" id="candidateRightToWorkPanel" aria-labelledby="candidateRightToWorkHeading">
        <h3 class="rx-rtw-heading" id="candidateRightToWorkHeading">UK right to work and job eligibility</h3>
        <p class="rx-rtw-intro">Tell us about your current permission to work. This is a self-declaration and is not an official right-to-work check.</p>

        <div class="rx-rtw-field">
          <label for="ukWorkPermissionStatus">Do you currently have permission to work in the UK?</label>
          <select id="ukWorkPermissionStatus">
            <option value="">Select an answer</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unsure">I am not sure</option>
          </select>
        </div>

        <div class="rx-rtw-field">
          <label for="ukWorkRestrictionType">Does that permission limit your hours or the work you can do?</label>
          <select id="ukWorkRestrictionType">
            <option value="">Select an answer</option>
            <option value="none">No restrictions</option>
            <option value="hours">My working hours are limited</option>
            <option value="role_or_employer">My job, occupation or employer is restricted</option>
            <option value="hours_and_role_or_employer">Both hours and the work I can do are restricted</option>
            <option value="unsure">I am not sure</option>
            <option value="not_applicable">Not applicable because I cannot currently work in the UK</option>
          </select>
        </div>

        <div class="rx-rtw-field">
          <label for="ukWorkPermissionExpiryStatus">Does your current permission to work expire?</label>
          <select id="ukWorkPermissionExpiryStatus">
            <option value="">Select an answer</option>
            <option value="no_expiry">No, it does not expire</option>
            <option value="expires">Yes, it expires on a known date</option>
            <option value="unsure">I am not sure</option>
            <option value="not_applicable">Not applicable because I cannot currently work in the UK</option>
          </select>
        </div>

        <div class="rx-rtw-field rx-rtw-date" id="ukWorkPermissionExpiryDateField">
          <label for="ukWorkPermissionExpiryDate">Permission expiry date</label>
          <input id="ukWorkPermissionExpiryDate" type="date">
        </div>

        <div class="rx-rtw-field">
          <label for="ukWorkSponsorshipRequirement">Will you need employer sponsorship now or in the future?</label>
          <select id="ukWorkSponsorshipRequirement">
            <option value="">Select an answer</option>
            <option value="no">No</option>
            <option value="now">Yes, I need sponsorship now</option>
            <option value="future">Yes, I may need sponsorship in the future</option>
            <option value="unsure">I am not sure</option>
          </select>
        </div>

        <label class="rx-rtw-confirm">
          <input id="ukWorkDeclarationConfirmed" type="checkbox">
          <span>I confirm these answers are accurate to the best of my knowledge. I understand that I may need to provide official evidence before employment.</span>
        </label>
        <p class="rx-rtw-note">Do not upload a passport or identity document here. A hiring employer must complete the appropriate official check before employment begins.</p>
      </section>
    `);

    byId('ukWorkPermissionStatus')?.addEventListener('change', updateDependentFields);
    byId('ukWorkPermissionExpiryStatus')?.addEventListener('change', updateDependentFields);
  }

  function todayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  function updateDependentFields() {
    const permission = byId('ukWorkPermissionStatus');
    const restriction = byId('ukWorkRestrictionType');
    const expiry = byId('ukWorkPermissionExpiryStatus');
    const expiryDate = byId('ukWorkPermissionExpiryDate');
    const expiryDateField = byId('ukWorkPermissionExpiryDateField');
    if (!permission || !restriction || !expiry || !expiryDate) return;

    if (permission.value === 'no') {
      restriction.value = 'not_applicable';
      expiry.value = 'not_applicable';
      restriction.disabled = true;
      expiry.disabled = true;
    } else if (permission.value === 'unsure') {
      restriction.value = 'unsure';
      expiry.value = 'unsure';
      restriction.disabled = true;
      expiry.disabled = true;
    } else if (currentMode === 'signup') {
      const wasLocked = restriction.disabled || expiry.disabled;
      restriction.disabled = false;
      expiry.disabled = false;
      if (wasLocked) {
        restriction.value = '';
        expiry.value = '';
      }
    }

    const showDate = currentMode === 'signup' && expiry.value === 'expires';
    expiryDateField?.classList.toggle('show', showDate);
    expiryDate.required = showDate;
    expiryDate.disabled = !showDate;
    expiryDate.min = todayIso();
    if (!showDate) expiryDate.value = '';
  }

  function updateMode() {
    const signingUp = currentMode === 'signup';
    byId('candidateRightToWorkPanel')?.classList.toggle('show', signingUp);
    [
      'ukWorkPermissionStatus',
      'ukWorkRestrictionType',
      'ukWorkPermissionExpiryStatus',
      'ukWorkSponsorshipRequirement',
      'ukWorkDeclarationConfirmed'
    ].forEach(id => {
      const input = byId(id);
      if (!input) return;
      input.required = signingUp;
      input.disabled = !signingUp;
    });
    updateDependentFields();
  }

  function setMode(mode) {
    currentMode = mode === 'signup' ? 'signup' : 'login';
    updateMode();
  }

  function value(id) {
    return byId(id)?.value || '';
  }

  function getSignupData() {
    const form = byId('authForm');
    if (!form?.reportValidity()) {
      throw new Error('Complete every required right-to-work and eligibility question.');
    }

    const permissionStatus = value('ukWorkPermissionStatus');
    const restrictionType = value('ukWorkRestrictionType');
    const expiryStatus = value('ukWorkPermissionExpiryStatus');
    const expiryDate = value('ukWorkPermissionExpiryDate');
    const sponsorshipRequirement = value('ukWorkSponsorshipRequirement');
    const confirmed = Boolean(byId('ukWorkDeclarationConfirmed')?.checked);

    if (permissionStatus === 'yes' && ['not_applicable', ''].includes(restrictionType)) {
      throw new Error('Select the restrictions that apply to your current permission.');
    }
    if (permissionStatus === 'yes' && ['not_applicable', ''].includes(expiryStatus)) {
      throw new Error('Select whether your current permission expires.');
    }
    if (permissionStatus === 'no' && (restrictionType !== 'not_applicable' || expiryStatus !== 'not_applicable')) {
      throw new Error('The work-permission answers do not match. Please select them again.');
    }
    if (permissionStatus === 'unsure' && (restrictionType !== 'unsure' || expiryStatus !== 'unsure')) {
      throw new Error('The work-permission answers do not match. Please select them again.');
    }
    if (expiryStatus === 'expires' && (!expiryDate || expiryDate < todayIso())) {
      throw new Error('Enter a current or future permission expiry date.');
    }
    if (!confirmed) {
      throw new Error('Confirm that your right-to-work answers are accurate before creating your account.');
    }

    return {
      uk_work_permission_status: permissionStatus,
      uk_work_restriction_type: restrictionType,
      uk_work_permission_expiry_status: expiryStatus,
      uk_work_permission_expiry_date: expiryStatus === 'expires' ? expiryDate : null,
      uk_work_sponsorship_requirement: sponsorshipRequirement,
      uk_work_declaration_confirmed: true,
      uk_work_declaration_version: DECLARATION_VERSION
    };
  }

  function init() {
    addStyles();
    render();
    updateMode();
  }

  window.RolexaCandidateRightToWorkRegistration = {
    declarationVersion: DECLARATION_VERSION,
    getSignupData,
    init,
    setMode
  };
})();
