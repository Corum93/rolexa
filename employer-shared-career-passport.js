(() => {
  if (window.__rolexaEmployerSharedCareerPassport) return;
  window.__rolexaEmployerSharedCareerPassport = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const SOURCE_LABELS = {
    application_review: 'Application review',
    screening: 'Screening',
    interview: 'Interview',
    case_presentation: 'Case presentation',
    role_specific_task: 'Role-specific task',
    reference_check: 'Reference check',
    employment_verification: 'Employment verification'
  };

  let client = null;
  let currentUser = null;
  let sharedByApplication = new Map();
  let decorating = false;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));
  const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  const dateText = value => value ? new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : 'Date not available';

  function addStyles() {
    if (byId('rxEmployerSharedPassportStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerSharedPassportStyles';
    style.textContent = `
      .rx-shared-passport-action{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(23,128,92,.2);background:#EAF8F1;color:#176B49;border-radius:999px;padding:8px 11px;font-size:11.5px;font-weight:900}.rx-shared-passport-action:hover{background:#DDF3E8}.rx-shared-passport-action span{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:999px;background:#176B49;color:#fff;font-size:10px}
      .rx-shared-passport-backdrop{position:fixed;inset:0;z-index:10060;background:rgba(7,16,37,.64);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:22px}.rx-shared-passport-modal{width:min(800px,100%);max-height:min(88vh,860px);background:#fff;border-radius:24px;box-shadow:0 34px 90px rgba(7,16,37,.34);overflow:hidden;display:flex;flex-direction:column}
      .rx-shared-passport-head{background:linear-gradient(135deg,#071025,#123C91);color:#fff;padding:25px 27px 22px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;position:relative;overflow:hidden}.rx-shared-passport-head:after{content:'';position:absolute;width:190px;height:190px;border-radius:50%;right:-65px;top:-90px;background:rgba(255,255,255,.07)}.rx-shared-passport-title{position:relative;z-index:1}.rx-shared-passport-title small{display:block;color:#AFC4FF;text-transform:uppercase;letter-spacing:.08em;font-size:10.5px;font-weight:900;margin-bottom:6px}.rx-shared-passport-title h2{font-size:25px;color:#fff}.rx-shared-passport-title p{color:#D4DEFB;font-size:12.5px;line-height:1.5;margin:6px 0 0}.rx-shared-passport-close{position:relative;z-index:2;width:37px;height:37px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:#fff;border-radius:11px;font-size:22px;line-height:1}
      .rx-shared-passport-trust{margin:18px 22px 0;border:1px solid rgba(23,107,255,.16);background:#EEF3FF;color:#2946C7;border-radius:14px;padding:12px 13px;font-size:11.5px;font-weight:750;line-height:1.5}.rx-shared-passport-list{padding:15px 22px 22px;overflow:auto;display:grid;gap:11px}.rx-shared-passport-card{border:1px solid rgba(7,16,37,.09);border-radius:17px;padding:15px;background:#fff;box-shadow:0 9px 26px rgba(7,16,37,.04);display:grid;gap:11px}.rx-shared-passport-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.rx-shared-passport-card h3{font-size:17px;margin:0}.rx-shared-passport-verified{flex:0 0 auto;border-radius:999px;padding:6px 9px;background:#E1F6EB;color:#176B49;font-size:10.5px;font-weight:900}.rx-shared-passport-meta{color:#6B7280;font-size:11.5px;line-height:1.5;margin-top:4px}
      .rx-shared-passport-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rx-shared-passport-detail{background:#F8FAFE;border:1px solid rgba(7,16,37,.07);border-radius:11px;padding:9px 10px}.rx-shared-passport-detail b{display:block;text-transform:uppercase;letter-spacing:.045em;font-size:9.5px;color:#7A879F;margin-bottom:4px}.rx-shared-passport-detail span{display:block;color:#26324C;font-size:11.5px;font-weight:850;line-height:1.4}.rx-shared-passport-note{border-left:3px solid #176BFF;background:#F7F9FE;border-radius:0 11px 11px 0;padding:9px 11px;color:#34415B;font-size:11.5px;line-height:1.5}.rx-shared-passport-foot{padding:14px 22px 19px;border-top:1px solid rgba(7,16,37,.08);display:flex;align-items:center;justify-content:space-between;gap:14px;color:#6B7280;font-size:10.5px;line-height:1.45}.rx-shared-passport-foot button{border:0;background:#071025;color:#fff;border-radius:999px;padding:10px 14px;font-size:11.5px;font-weight:900}
      .rx-shared-passport-empty{padding:35px;text-align:center;color:#6B7280;font-size:12.5px;line-height:1.5}.rx-shared-passport-empty b{display:block;color:#071025;font-size:17px;margin-bottom:6px}
      @media(max-width:700px){.rx-shared-passport-backdrop{padding:8px 8px 0;align-items:flex-end}.rx-shared-passport-modal{max-height:94vh;border-radius:24px 24px 0 0}.rx-shared-passport-head{padding:22px 18px 19px}.rx-shared-passport-title h2{font-size:22px}.rx-shared-passport-trust{margin:15px 16px 0}.rx-shared-passport-list{padding:13px 16px 18px}.rx-shared-passport-grid{grid-template-columns:1fr}.rx-shared-passport-card-head{display:grid}.rx-shared-passport-verified{justify-self:start}.rx-shared-passport-foot{padding:13px 16px calc(17px + env(safe-area-inset-bottom));align-items:flex-start;flex-direction:column}.rx-shared-passport-foot button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not connect to shared Career Passport evidence.'));
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  function showStatus(message, type = 'info') {
    const bar = byId('statusBar');
    if (!bar) return;
    bar.className = `statusbar show ${type}`;
    bar.textContent = message;
    setTimeout(() => {
      if (bar.textContent === message) bar.className = 'statusbar';
    }, 4800);
  }

  function applicationIdFromCard(card) {
    const direct = card.getAttribute('data-evidence-application-id');
    if (direct) return direct;
    const control = card.querySelector('[data-app-id], [data-stage-app-id], [data-review-profile], [data-review-cv]');
    return control?.getAttribute('data-app-id')
      || control?.getAttribute('data-stage-app-id')
      || control?.getAttribute('data-review-profile')
      || control?.getAttribute('data-review-cv')
      || '';
  }

  async function loadSharedApplications() {
    if (!client || !currentUser) return false;
    const result = await client
      .from('evidence_disclosures')
      .select('recipient_application_id,evidence_id')
      .eq('recipient_employer_user_id', currentUser.id)
      .is('revoked_at', null);
    if (result.error) return false;
    sharedByApplication = new Map();
    (result.data || []).forEach(row => {
      if (!row.recipient_application_id) return;
      const set = sharedByApplication.get(row.recipient_application_id) || new Set();
      set.add(row.evidence_id);
      sharedByApplication.set(row.recipient_application_id, set);
    });
    const openModal = byId('rxEmployerSharedPassportModal');
    const openApplicationId = openModal?.dataset.applicationId || '';
    if (openApplicationId && !sharedByApplication.has(openApplicationId)) {
      closeModal();
      showStatus('The candidate has revoked access to this Career Passport evidence.', 'info');
    }
    decorateCards();
    return true;
  }

  function decorateCards() {
    if (decorating) return;
    decorating = true;
    try {
      document.querySelectorAll('.rx-app-card, .rx-pipeline-card').forEach(card => {
        const applicationId = applicationIdFromCard(card);
        const actions = card.querySelector('.rx-app-actions, .rx-pipeline-card-actions');
        if (!applicationId || !actions) return;
        const count = sharedByApplication.get(applicationId)?.size || 0;
        const existing = actions.querySelector('[data-view-shared-passport]');
        if (!count) {
          existing?.remove();
          return;
        }
        const html = `<button class="rx-shared-passport-action" type="button" data-view-shared-passport="${safe(applicationId)}"><span>✓</span>View shared Career Passport · ${count}</button>`;
        if (existing) existing.outerHTML = html;
        else actions.insertAdjacentHTML('beforeend', html);
      });
    } finally {
      decorating = false;
    }
  }

  function closeModal() {
    byId('rxEmployerSharedPassportModal')?.remove();
  }

  function evidenceCard(row) {
    return `<article class="rx-shared-passport-card"><div class="rx-shared-passport-card-head"><div><h3>${safe(row.definition_name || 'Verified evidence')}</h3><div class="rx-shared-passport-meta">Issued by ${safe(row.issuing_company || 'Verified Rolexa employer')} from the ${safe(row.source_job_title || 'Rolexa')} hiring process on ${safe(dateText(row.issued_at))}.</div></div><span class="rx-shared-passport-verified">✓ Verified</span></div><div class="rx-shared-passport-grid"><div class="rx-shared-passport-detail"><b>Category</b><span>${safe(titleCase(row.definition_category))}</span></div><div class="rx-shared-passport-detail"><b>Evidence source</b><span>${safe(SOURCE_LABELS[row.evidence_source] || titleCase(row.evidence_source))}</span></div><div class="rx-shared-passport-detail"><b>Demonstrated level</b><span>${safe(titleCase(row.demonstrated_level))}</span></div></div>${row.factual_note ? `<div class="rx-shared-passport-note">${safe(row.factual_note)}</div>` : ''}</article>`;
  }

  async function openModal(applicationId, button) {
    const previous = button?.innerHTML;
    if (button) {
      button.disabled = true;
      button.textContent = 'Opening secure evidence…';
    }
    const result = await client.rpc('get_shared_candidate_passport', {
      p_recipient_application_id: applicationId
    });
    if (button) {
      button.disabled = false;
      button.innerHTML = previous;
    }
    if (result.error) {
      showStatus(result.error.message || 'Could not open the shared Career Passport.', 'bad');
      await loadSharedApplications();
      return;
    }
    const rows = result.data || [];
    if (!rows.length) {
      showStatus('The candidate has revoked or changed this Career Passport share.', 'info');
      await loadSharedApplications();
      return;
    }
    closeModal();
    const first = rows[0];
    document.body.insertAdjacentHTML('beforeend', `<div class="rx-shared-passport-backdrop" id="rxEmployerSharedPassportModal" data-application-id="${safe(applicationId)}"><section class="rx-shared-passport-modal" role="dialog" aria-modal="true" aria-labelledby="rxEmployerSharedPassportTitle"><div class="rx-shared-passport-head"><div class="rx-shared-passport-title"><small>Candidate-authorised evidence</small><h2 id="rxEmployerSharedPassportTitle">${safe(first.candidate_name)}'s Career Passport</h2><p>Shared specifically for the ${safe(first.target_job_title)} application.</p></div><button class="rx-shared-passport-close" type="button" data-close-shared-passport aria-label="Close shared Career Passport">&times;</button></div><div class="rx-shared-passport-trust">This view contains only the ${rows.length} evidence item${rows.length === 1 ? '' : 's'} the candidate selected. It does not grant access to their full Passport, private applications or declined evidence.</div><div class="rx-shared-passport-list">${rows.map(evidenceCard).join('')}</div><div class="rx-shared-passport-foot"><span>Access is candidate-controlled and may be revoked at any time. Shared ${safe(dateText(first.disclosed_at))}.</span><button type="button" data-close-shared-passport>Done</button></div></section></div>`);
    byId('rxEmployerSharedPassportModal')?.querySelector('[data-close-shared-passport]')?.focus();
  }

  async function init() {
    addStyles();
    try {
      const library = await loadSupabase();
      client = library.createClient(SUPABASE_URL, SUPABASE_KEY);
      const sessionResult = await client.auth.getSession();
      currentUser = sessionResult.data?.session?.user || null;
      if (!currentUser || !(await loadSharedApplications())) return;

      const observer = new MutationObserver(() => {
        clearTimeout(window.__rxSharedPassportDecorateTimer);
        window.__rxSharedPassportDecorateTimer = setTimeout(decorateCards, 90);
      });
      observer.observe(document.body, { childList: true, subtree: true });

      client.channel(`shared-passport-${currentUser.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'evidence_disclosures',
          filter: `recipient_employer_user_id=eq.${currentUser.id}`
        }, () => loadSharedApplications())
        .subscribe();

      window.setInterval(loadSharedApplications, 20000);
    } catch (error) {
      console.warn('[Rolexa] Shared Career Passport could not load', error);
    }
  }

  document.addEventListener('click', event => {
    const view = event.target.closest?.('[data-view-shared-passport]');
    if (view) {
      event.preventDefault();
      openModal(view.dataset.viewSharedPassport, view);
      return;
    }
    if (event.target.closest?.('[data-close-shared-passport]') || event.target.id === 'rxEmployerSharedPassportModal') closeModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && byId('rxEmployerSharedPassportModal')) closeModal();
  });
  document.addEventListener('DOMContentLoaded', init);
})();
