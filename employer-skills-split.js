(() => {
  if (window.__rolexaEmployerSkillsSplit) return;
  window.__rolexaEmployerSkillsSplit = true;

  function byId(id) { return document.getElementById(id); }

  function addNoteStyles() {
    if (byId('rolexaSkillsSplitStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaSkillsSplitStyles';
    style.textContent = `
      .rx-field-note{font-size:12.5px;color:#6B7280;line-height:1.45;margin-top:-2px;}
      .rx-skill-helper{grid-column:1/-1;border:1px solid rgba(23,107,255,.14);background:#F8FAFF;border-radius:14px;padding:12px 13px;font-size:13px;line-height:1.45;color:#26324C;}
      .rx-skill-helper b{color:#071025;}
    `;
    document.head.appendChild(style);
  }

  function enhanceForm() {
    const mustInput = byId('requiredSkills');
    const form = byId('jobForm');
    if (!mustInput || !form || byId('niceToHaveSkills')) return;

    addNoteStyles();

    const mustField = mustInput.closest('.field');
    const mustLabel = mustField ? mustField.querySelector('label') : null;
    if (mustLabel) mustLabel.textContent = 'Must-have skills';
    mustInput.placeholder = 'Product discovery, stakeholder management, analytics';
    mustInput.setAttribute('aria-label', 'Must-have skills');

    const mustNote = document.createElement('div');
    mustNote.className = 'rx-field-note';
    mustNote.textContent = 'Keep this focused. These are the skills a candidate really needs to do the role.';
    mustField.appendChild(mustNote);

    const niceField = document.createElement('div');
    niceField.className = 'field';
    niceField.innerHTML = '<label for="niceToHaveSkills">Nice-to-have skills</label><input id="niceToHaveSkills" placeholder="SQL, SaaS, marketplace experience"><div class="rx-field-note">Optional extras. These should not block otherwise strong candidates.</div>';
    mustField.insertAdjacentElement('afterend', niceField);

    const helper = document.createElement('div');
    helper.className = 'rx-skill-helper';
    helper.innerHTML = '<b>Rolexa tip:</b> Use must-have skills for essentials only. Put bonus skills into nice-to-have so the role does not become too narrow.';
    niceField.insertAdjacentElement('afterend', helper);
  }

  function appendNiceToDescription() {
    const niceInput = byId('niceToHaveSkills');
    const desc = byId('jobDescription');
    if (!niceInput || !desc) return;
    const nice = niceInput.value.trim();
    if (!nice) return;
    const current = desc.value.trim();
    if (/nice-to-have skills:/i.test(current)) return;
    desc.value = (current + '\n\nNice-to-have skills: ' + nice).trim();
  }

  function init() {
    enhanceForm();
    const form = byId('jobForm');
    if (form && !form.dataset.skillsSplitAttached) {
      form.dataset.skillsSplitAttached = 'true';
      form.addEventListener('submit', appendNiceToDescription, true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
