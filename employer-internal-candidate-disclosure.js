(() => {
  if (window.__rolexaInternalCandidateDisclosure) return;
  window.__rolexaInternalCandidateDisclosure = true;

  const OPTIONS = [
    ['none', 'No internal candidates are currently being considered'],
    ['may_apply', 'Internal employees may apply, but none are currently progressing'],
    ['in_process', 'One or more internal candidates are already in the hiring process'],
    ['preferred', 'An internal candidate is currently preferred for this position']
  ];

  function byId(id) { return document.getElementById(id); }

  function addStyles() {
    if (byId('rxInternalCandidateDisclosureStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxInternalCandidateDisclosureStyles';
    style.textContent = `
      .rx-internal-disclosure{grid-column:1/-1;border:1px solid rgba(23,107,255,.2);background:linear-gradient(180deg,#f8faff,#f3f7ff);border-radius:18px;padding:17px;display:grid;gap:13px}
      .rx-internal-disclosure h3{font-size:17px;margin:0;color:#071025}.rx-internal-disclosure p{font-size:13px;line-height:1.5;color:#5f6b7f;margin:0;max-width:850px}
      .rx-internal-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rx-internal-option{display:flex;align-items:flex-start;gap:10px;background:#fff;border:1px solid rgba(7,16,37,.1);border-radius:13px;padding:11px 12px;font-size:12.5px;font-weight:800;line-height:1.45;color:#172753;cursor:pointer}.rx-internal-option:has(input:checked){border-color:#176bff;box-shadow:0 0 0 2px rgba(23,107,255,.1);background:#f8faff}.rx-internal-option input{margin-top:2px;accent-color:#176bff;flex:0 0 auto}
      .rx-internal-confirm{display:flex;align-items:flex-start;gap:10px;background:#fff;border:1px solid rgba(23,107,255,.18);border-radius:13px;padding:12px;font-size:12.5px;font-weight:900;line-height:1.45;color:#101f4a}.rx-internal-confirm input{margin-top:2px;accent-color:#176bff;flex:0 0 auto}
      .rx-internal-candidate-note{font-size:12px!important;color:#2946c7!important;font-weight:800}
      @media(max-width:760px){.rx-internal-disclosure{padding:14px}.rx-internal-options{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function addInterface() {
    const form = byId('jobForm');
    const descriptionField = byId('jobDescription')?.closest('.field');
    if (!form || !descriptionField || byId('rxInternalCandidateDisclosure')) return;
    addStyles();
    const section = document.createElement('section');
    section.id = 'rxInternalCandidateDisclosure';
    section.className = 'rx-internal-disclosure';
    section.setAttribute('aria-labelledby', 'rxInternalCandidateDisclosureTitle');
    section.innerHTML = `
      <div><h3 id="rxInternalCandidateDisclosureTitle">Internal candidate disclosure</h3><p>Tell candidates whether employees from within your organisation are being considered for this position. Your selection will be shown clearly before candidates apply.</p></div>
      <div class="rx-internal-options">
        ${OPTIONS.map(([value, label], index) => `<label class="rx-internal-option"><input type="radio" name="internalCandidateStatus" value="${value}"${index === 0 ? ' required' : ''}><span>${label}</span></label>`).join('')}
      </div>
      <label class="rx-internal-confirm"><input id="rxInternalCandidateConfirmed" type="checkbox" required><span>I confirm this information is accurate and understand that it will be shown to candidates.</span></label>
      <p class="rx-internal-candidate-note">If the situation changes, update this disclosure so candidates continue to receive accurate information.</p>`;
    descriptionField.insertAdjacentElement('afterend', section);
    form.addEventListener('reset', () => setTimeout(() => setValue('', false), 0));
  }

  function getValue() {
    return {
      status: document.querySelector('input[name="internalCandidateStatus"]:checked')?.value || '',
      confirmed: !!byId('rxInternalCandidateConfirmed')?.checked
    };
  }

  function setValue(status, confirmed = false) {
    document.querySelectorAll('input[name="internalCandidateStatus"]').forEach(input => {
      input.checked = input.value === String(status || '');
    });
    if (byId('rxInternalCandidateConfirmed')) byId('rxInternalCandidateConfirmed').checked = !!confirmed;
  }

  window.RolexaInternalCandidateDisclosure = { getValue, setValue, options: Object.fromEntries(OPTIONS) };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addInterface, { once: true });
  else addInterface();
})();
