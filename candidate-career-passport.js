(() => {
  if (window.__rolexaCandidateCareerPassport) return;
  window.__rolexaCandidateCareerPassport = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const STATUS_ORDER = { pending: 0, accepted: 1, disputed: 2, declined: 3, revoked: 4 };
  const SOURCE_LABELS = {
    application_review: 'Application review',
    screening: 'Screening',
    interview: 'Interview',
    case_presentation: 'Case presentation',
    role_specific_task: 'Role-specific task',
    reference_check: 'Reference check',
    employment_verification: 'Employment verification'
  };
  const SCOPE_LABELS = {
    private: 'Private',
    application_only: 'This application only',
    verified_employers: 'Verified employers',
    partner_network: 'Approved partner network'
  };

  let client = null;
  let currentUser = null;
  let evidenceRows = [];
  let loading = false;

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));
  const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  const dateText = value => value ? new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : 'Date not available';

  function addStyles() {
    if (byId('rxCareerPassportStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCareerPassportStyles';
    style.textContent = `
      .rx-passport-hero{background:linear-gradient(135deg,#071025 0%,#123C91 62%,#176BFF 100%);color:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 55px rgba(7,16,37,.16);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;margin-bottom:16px;overflow:hidden;position:relative}
      .rx-passport-hero:after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;right:-80px;top:-110px;background:rgba(255,255,255,.08)}
      .rx-passport-kicker{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);border-radius:999px;padding:7px 11px;font-size:11.5px;font-weight:900;color:#DCE5FF;margin-bottom:12px}
      .rx-passport-hero h2{font-size:30px;color:#fff;margin:0}.rx-passport-hero p{max-width:690px;color:#DCE5FF;line-height:1.55;font-size:14px;margin:9px 0 0}
      .rx-passport-seal{position:relative;z-index:1;width:104px;height:104px;border-radius:25px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);display:grid;place-items:center;text-align:center;transform:rotate(3deg)}
      .rx-passport-seal b{display:block;font-size:29px;line-height:1}.rx-passport-seal span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#DCE5FF;font-weight:900;margin-top:5px}
      .rx-passport-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.rx-passport-stat{background:#fff;border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:0 12px 30px rgba(7,16,37,.04)}
      .rx-passport-stat span{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.045em;color:#6B7280;font-weight:900}.rx-passport-stat b{display:block;font-family:'Space Grotesk',sans-serif;font-size:28px;color:#071025;margin-top:5px}
      .rx-passport-notice{border:1px solid rgba(23,107,255,.16);background:#EEF3FF;color:#2946C7;border-radius:15px;padding:12px 14px;font-size:12.5px;line-height:1.5;font-weight:750;margin-bottom:16px}
      .rx-passport-list{display:grid;gap:12px}.rx-evidence-card{background:#fff;border:1px solid var(--line);border-radius:19px;padding:18px;box-shadow:0 12px 32px rgba(7,16,37,.04);display:grid;gap:13px}
      .rx-evidence-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.rx-evidence-title{min-width:0}.rx-evidence-title h3{font-size:18px;margin:0;color:#071025}.rx-evidence-meta{font-size:12.5px;color:#6B7280;line-height:1.5;margin-top:5px}
      .rx-evidence-badge{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;background:#E1F6EB;color:#176B49}.rx-evidence-badge.pending{background:#FFF3D6;color:#8A5600}.rx-evidence-badge.disputed{background:#FBE4E1;color:#A33327}.rx-evidence-badge.muted{background:#EEF1F7;color:#61708C}
      .rx-evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.rx-evidence-detail{border:1px solid rgba(7,16,37,.08);background:#F8FAFE;border-radius:12px;padding:10px 11px}.rx-evidence-detail b{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.045em;color:#7A879F;margin-bottom:4px}.rx-evidence-detail span{font-size:12.5px;color:#26324C;font-weight:800;line-height:1.4}
      .rx-evidence-note{border-left:3px solid #176BFF;background:#F7F9FE;padding:10px 12px;border-radius:0 11px 11px 0;color:#34415B;font-size:12.5px;line-height:1.5}
      .rx-evidence-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rx-evidence-btn{border:1px solid var(--line);background:#fff;color:#0A1738;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900}.rx-evidence-btn.primary{background:#176BFF;border-color:#176BFF;color:#fff}.rx-evidence-btn.danger{color:#A33327;border-color:rgba(224,83,63,.23);background:#FFF8F6}.rx-evidence-btn:disabled{opacity:.58;cursor:not-allowed}
      .rx-sharing-field{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rx-sharing-field label{font-size:11.5px;font-weight:900;color:#51617F}.rx-sharing-field select{border:1px solid var(--line);background:#fff;color:#0A1738;border-radius:999px;padding:8px 32px 8px 11px;font-size:12px;font-weight:850}
      .rx-passport-empty{background:#fff;border:1px dashed rgba(23,107,255,.25);border-radius:19px;padding:34px;text-align:center}.rx-passport-empty b{display:block;font-size:18px;color:#071025}.rx-passport-empty p{max-width:560px;margin:8px auto 0;color:#6B7280;font-size:13px;line-height:1.55}
      @media(max-width:760px){.rx-passport-hero{grid-template-columns:1fr;padding:23px}.rx-passport-hero h2{font-size:25px}.rx-passport-seal{display:none}.rx-passport-stats{grid-template-columns:1fr 1fr}.rx-evidence-grid{grid-template-columns:1fr}.rx-evidence-head{display:grid}.rx-evidence-badge{justify-self:start}.rx-sharing-field{width:100%}.rx-sharing-field select{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function addPage() {
    const nav = document.querySelector('.side .nav');
    const app = byId('appView');
    if (!nav || !app || byId('careerPassportPage')) return;

    const button = document.createElement('button');
    button.className = 'nav-btn';
    button.type = 'button';
    button.dataset.view = 'careerPassport';
    button.textContent = 'Career Passport';
    const applicationsButton = nav.querySelector('[data-view="applications"]');
    (applicationsButton?.nextSibling ? nav.insertBefore(button, applicationsButton.nextSibling) : nav.appendChild(button));

    const page = document.createElement('div');
    page.className = 'page';
    page.id = 'careerPassportPage';
    page.innerHTML = `
      <div class="page-head"><div><h1>Verified Career Passport</h1><p>Keep positive evidence earned through genuine hiring activity and control how it may be reused.</p></div></div>
      <div class="rx-passport-hero">
        <div><span class="rx-passport-kicker">✓ Candidate-owned evidence</span><h2>A no should never send you back to zero.</h2><p>Employers can verify only predefined positive evidence from real Rolexa applications. You decide whether it enters your Passport and who may be considered for future sharing.</p></div>
        <div class="rx-passport-seal"><div><b>RX</b><span>Verified evidence</span></div></div>
      </div>
      <div class="rx-passport-stats" id="rxPassportStats"></div>
      <div class="rx-passport-notice">Your sharing setting is a preference, not automatic permission. Rolexa will still show you the exact employer, opportunity and evidence before any future introduction is disclosed.</div>
      <div class="rx-passport-list" id="rxPassportList"><div class="rx-passport-empty"><b>Loading your Career Passport…</b></div></div>
    `;
    app.appendChild(page);

    button.addEventListener('click', () => {
      if (typeof window.showView === 'function') window.showView('careerPassport');
      else {
        document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
        page.classList.add('active');
      }
      loadEvidence();
    });
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return window.supabase;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not connect to the Career Passport service.'));
      document.head.appendChild(script);
    });
    return window.supabase;
  }

  function showMessage(message, type = 'info') {
    let status = byId('rxPassportMessage');
    if (!status) {
      status = document.createElement('div');
      status.id = 'rxPassportMessage';
      status.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;border-radius:999px;padding:11px 15px;font:850 12.5px Inter,sans-serif;box-shadow:0 14px 35px rgba(7,16,37,.2);';
      document.body.appendChild(status);
    }
    status.textContent = message;
    status.style.background = type === 'bad' ? '#FBE4E1' : type === 'good' ? '#E1F6EB' : '#EEF3FF';
    status.style.color = type === 'bad' ? '#A33327' : type === 'good' ? '#176B49' : '#2946C7';
    clearTimeout(window.__rxPassportMessageTimer);
    window.__rxPassportMessageTimer = setTimeout(() => status.remove(), 4200);
  }

  function renderStats() {
    const accepted = evidenceRows.filter(row => row.candidate_status === 'accepted').length;
    const pending = evidenceRows.filter(row => row.candidate_status === 'pending').length;
    const privateCount = evidenceRows.filter(row => row.candidate_status === 'accepted' && row.sharing_scope === 'private').length;
    const shareReady = evidenceRows.filter(row => row.candidate_status === 'accepted' && row.sharing_scope !== 'private').length;
    byId('rxPassportStats').innerHTML = [
      ['Verified evidence', accepted],
      ['Needs your review', pending],
      ['Kept private', privateCount],
      ['Ready for approval', shareReady]
    ].map(([label, value]) => `<div class="rx-passport-stat"><span>${safe(label)}</span><b>${value}</b></div>`).join('');
  }

  function badgeFor(row) {
    if (row.candidate_status === 'pending') return '<span class="rx-evidence-badge pending">Awaiting your decision</span>';
    if (row.candidate_status === 'accepted') return '<span class="rx-evidence-badge">✓ Verified</span>';
    if (row.candidate_status === 'disputed') return '<span class="rx-evidence-badge disputed">Under review</span>';
    return `<span class="rx-evidence-badge muted">${safe(titleCase(row.candidate_status))}</span>`;
  }

  function sharingControl(row) {
    if (row.candidate_status !== 'accepted') return '';
    const options = [
      ['private', 'Private'],
      ['application_only', 'This application only'],
      ['verified_employers', 'Verified employers (approval still required)'],
      ['partner_network', 'Approved partners (approval still required)']
    ].map(([value, label]) => `<option value="${value}" ${row.sharing_scope === value ? 'selected' : ''}>${safe(label)}</option>`).join('');
    return `<div class="rx-sharing-field"><label for="rx-sharing-${safe(row.id)}">Sharing preference</label><select id="rx-sharing-${safe(row.id)}" data-passport-sharing="${safe(row.id)}">${options}</select></div>`;
  }

  function actionsFor(row) {
    if (row.candidate_status === 'pending') {
      return `<div class="rx-evidence-actions">
        <button class="rx-evidence-btn primary" type="button" data-passport-decision="accept" data-evidence-id="${safe(row.id)}">Add to my Passport</button>
        <button class="rx-evidence-btn" type="button" data-passport-decision="dispute" data-evidence-id="${safe(row.id)}">Dispute</button>
        <button class="rx-evidence-btn danger" type="button" data-passport-decision="decline" data-evidence-id="${safe(row.id)}">Decline</button>
      </div>`;
    }
    return sharingControl(row);
  }

  function evidenceCard(row) {
    const definition = row.evidence_definition || {};
    const job = row.job || {};
    const company = job.company || 'Verified Rolexa employer';
    const role = job.title || 'Rolexa application';
    return `<article class="rx-evidence-card">
      <div class="rx-evidence-head"><div class="rx-evidence-title"><h3>${safe(definition.name || 'Verified evidence')}</h3><div class="rx-evidence-meta">Issued by ${safe(company)} from your ${safe(role)} application on ${safe(dateText(row.issued_at))}.</div></div>${badgeFor(row)}</div>
      <div class="rx-evidence-grid">
        <div class="rx-evidence-detail"><b>Category</b><span>${safe(titleCase(definition.category || 'evidence'))}</span></div>
        <div class="rx-evidence-detail"><b>Evidence source</b><span>${safe(SOURCE_LABELS[row.evidence_source] || titleCase(row.evidence_source))}</span></div>
        <div class="rx-evidence-detail"><b>Demonstrated level</b><span>${safe(titleCase(row.demonstrated_level))}</span></div>
      </div>
      ${row.factual_note ? `<div class="rx-evidence-note">${safe(row.factual_note)}</div>` : ''}
      ${actionsFor(row)}
    </article>`;
  }

  function renderEvidence(errorMessage = '') {
    renderStats();
    const list = byId('rxPassportList');
    if (!list) return;
    if (errorMessage) {
      list.innerHTML = `<div class="rx-passport-empty"><b>Career Passport is being prepared</b><p>${safe(errorMessage)}</p></div>`;
      return;
    }
    const visibleRows = evidenceRows.filter(row => !['declined', 'revoked'].includes(row.candidate_status));
    list.innerHTML = visibleRows.length
      ? visibleRows.map(evidenceCard).join('')
      : '<div class="rx-passport-empty"><b>Your Passport is ready for its first evidence</b><p>When you complete a meaningful hiring stage, the employer can award predefined positive evidence. Nothing appears publicly and you stay in control.</p></div>';
  }

  async function loadEvidence() {
    if (loading || !client || !currentUser) return;
    loading = true;
    const result = await client
      .from('candidate_evidence')
      .select('id,application_id,job_id,demonstrated_level,evidence_source,factual_note,candidate_status,sharing_scope,issued_at,candidate_decided_at,expires_at,evidence_definition:evidence_definitions(code,name,category,description),job:jobs(title,company)')
      .eq('candidate_user_id', currentUser.id)
      .order('issued_at', { ascending: false });
    loading = false;
    if (result.error) {
      evidenceRows = [];
      renderEvidence('The secure Passport foundation has not been activated yet. Your existing candidate account is unaffected.');
      return;
    }
    evidenceRows = (result.data || []).sort((left, right) =>
      (STATUS_ORDER[left.candidate_status] ?? 9) - (STATUS_ORDER[right.candidate_status] ?? 9)
      || new Date(right.issued_at) - new Date(left.issued_at)
    );
    renderEvidence();
  }

  async function decideEvidence(evidenceId, decision, button) {
    let disputeReason = null;
    if (decision === 'decline' && !window.confirm('Decline this evidence? It will remain in the secure audit history but will not appear in your Career Passport.')) return;
    if (decision === 'dispute') {
      disputeReason = window.prompt('Tell Rolexa what is inaccurate. Please provide at least 10 characters.');
      if (disputeReason === null) return;
      if (disputeReason.trim().length < 10) {
        showMessage('Please provide at least 10 characters so the dispute can be reviewed.', 'bad');
        return;
      }
    }
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    const result = await client.rpc('candidate_decide_evidence', {
      p_evidence_id: evidenceId,
      p_decision: decision,
      p_dispute_reason: disputeReason
    });
    button.disabled = false;
    button.textContent = previous;
    if (result.error) {
      showMessage(result.error.message || 'Could not save your decision.', 'bad');
      return;
    }
    showMessage(decision === 'accept' ? 'Evidence added privately to your Career Passport.' : 'Your decision has been saved.', 'good');
    await loadEvidence();
  }

  async function updateSharing(evidenceId, select) {
    select.disabled = true;
    const result = await client.rpc('set_candidate_evidence_sharing', {
      p_evidence_id: evidenceId,
      p_sharing_scope: select.value
    });
    select.disabled = false;
    if (result.error) {
      showMessage(result.error.message || 'Could not change the sharing preference.', 'bad');
      await loadEvidence();
      return;
    }
    showMessage(`${SCOPE_LABELS[select.value] || 'Sharing preference'} saved. No evidence has been disclosed.`, 'good');
    await loadEvidence();
  }

  async function init() {
    addStyles();
    addPage();
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-passport-decision][data-evidence-id]');
      if (!button) return;
      decideEvidence(button.dataset.evidenceId, button.dataset.passportDecision, button);
    });
    document.addEventListener('change', event => {
      const select = event.target.closest?.('[data-passport-sharing]');
      if (select) updateSharing(select.dataset.passportSharing, select);
    });
    try {
      const library = await loadSupabase();
      client = library.createClient(SUPABASE_URL, SUPABASE_KEY);
      const sessionResult = await client.auth.getSession();
      currentUser = sessionResult.data?.session?.user || null;
      if (currentUser) await loadEvidence();
      else renderEvidence('Sign in to see candidate-owned verified evidence.');
    } catch (error) {
      renderEvidence('The Career Passport connection is not available right now.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
