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

  let client = null;
  let currentUser = null;
  let evidenceRows = [];
  let sharingTargets = [];
  let disclosureRows = [];
  let sharingReady = false;
  let loading = false;
  let shareStep = 1;
  let shareApplicationId = '';
  let shareEvidenceIds = new Set();

  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;'
  }[character]));
  const titleCase = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  const dateText = value => value ? new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : 'Date not available';
  const activeAcceptedEvidence = () => evidenceRows.filter(row =>
    row.candidate_status === 'accepted'
    && !row.revoked_at
    && (!row.expires_at || new Date(row.expires_at) > new Date())
  );
  const shareableTargets = () => sharingTargets.filter(target => target.shareable);
  const activeDisclosures = () => disclosureRows.filter(row =>
    !row.revoked_at && targetFor(row.recipient_application_id)?.shareable
  );

  function addStyles() {
    if (byId('rxCareerPassportStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCareerPassportStyles';
    style.textContent = `
      .rx-passport-hero{background:linear-gradient(135deg,#071025 0%,#123C91 62%,#176BFF 100%);color:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 55px rgba(7,16,37,.16);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;margin-bottom:16px;overflow:hidden;position:relative}
      .rx-passport-hero:after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;right:-80px;top:-110px;background:rgba(255,255,255,.08)}
      .rx-passport-kicker{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);border-radius:999px;padding:7px 11px;font-size:11.5px;font-weight:900;color:#DCE5FF;margin-bottom:12px}
      .rx-passport-hero h2{font-size:30px;color:#fff;margin:0}.rx-passport-hero p{max-width:690px;color:#DCE5FF;line-height:1.55;font-size:14px;margin:9px 0 0}
      .rx-passport-hero-side{position:relative;z-index:1;display:grid;justify-items:center;gap:12px}.rx-passport-seal{width:104px;height:104px;border-radius:25px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);display:grid;place-items:center;text-align:center;transform:rotate(3deg)}
      .rx-passport-seal b{display:block;font-size:29px;line-height:1}.rx-passport-seal span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#DCE5FF;font-weight:900;margin-top:5px}
      .rx-passport-share-main{border:0;background:#fff;color:#123C91;border-radius:999px;padding:11px 15px;font-size:12px;font-weight:900;box-shadow:0 10px 24px rgba(7,16,37,.18);white-space:nowrap}.rx-passport-share-main:disabled{opacity:.55;cursor:not-allowed}
      .rx-passport-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.rx-passport-stat{background:#fff;border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:0 12px 30px rgba(7,16,37,.04)}
      .rx-passport-stat span{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.045em;color:#6B7280;font-weight:900}.rx-passport-stat b{display:block;font-family:'Space Grotesk',sans-serif;font-size:28px;color:#071025;margin-top:5px}
      .rx-passport-notice{border:1px solid rgba(23,107,255,.16);background:#EEF3FF;color:#2946C7;border-radius:15px;padding:12px 14px;font-size:12.5px;line-height:1.5;font-weight:750;margin-bottom:16px}
      .rx-passport-share-panel{background:#fff;border:1px solid var(--line);border-radius:19px;padding:18px;margin-bottom:16px;box-shadow:0 12px 32px rgba(7,16,37,.04)}.rx-passport-share-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.rx-passport-share-panel h2{font-size:18px;margin:0}.rx-passport-share-panel p{font-size:12.5px;color:#6B7280;line-height:1.5;margin:5px 0 0}
      .rx-active-shares{display:grid;gap:9px}.rx-active-share{border:1px solid rgba(7,16,37,.08);background:#F8FAFE;border-radius:14px;padding:12px 13px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}.rx-active-share b{display:block;color:#071025;font-size:13px}.rx-active-share span{display:block;color:#6B7280;font-size:11.5px;margin-top:4px;line-height:1.45}.rx-active-share-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .rx-passport-list{display:grid;gap:12px}.rx-evidence-card{background:#fff;border:1px solid var(--line);border-radius:19px;padding:18px;box-shadow:0 12px 32px rgba(7,16,37,.04);display:grid;gap:13px}
      .rx-evidence-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.rx-evidence-title{min-width:0}.rx-evidence-title h3{font-size:18px;margin:0;color:#071025}.rx-evidence-meta{font-size:12.5px;color:#6B7280;line-height:1.5;margin-top:5px}
      .rx-evidence-badge{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;background:#E1F6EB;color:#176B49}.rx-evidence-badge.pending{background:#FFF3D6;color:#8A5600}.rx-evidence-badge.disputed{background:#FBE4E1;color:#A33327}.rx-evidence-badge.muted{background:#EEF1F7;color:#61708C}
      .rx-evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.rx-evidence-detail{border:1px solid rgba(7,16,37,.08);background:#F8FAFE;border-radius:12px;padding:10px 11px}.rx-evidence-detail b{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.045em;color:#7A879F;margin-bottom:4px}.rx-evidence-detail span{font-size:12.5px;color:#26324C;font-weight:800;line-height:1.4}
      .rx-evidence-note{border-left:3px solid #176BFF;background:#F7F9FE;padding:10px 12px;border-radius:0 11px 11px 0;color:#34415B;font-size:12.5px;line-height:1.5}
      .rx-evidence-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.rx-evidence-btn{border:1px solid var(--line);background:#fff;color:#0A1738;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900}.rx-evidence-btn.primary{background:#176BFF;border-color:#176BFF;color:#fff}.rx-evidence-btn.danger{color:#A33327;border-color:rgba(224,83,63,.23);background:#FFF8F6}.rx-evidence-btn:disabled{opacity:.58;cursor:not-allowed}.rx-evidence-access{font-size:11.5px;font-weight:850;color:#51617F;background:#F3F6FC;border-radius:999px;padding:8px 10px}
      .rx-passport-empty{background:#fff;border:1px dashed rgba(23,107,255,.25);border-radius:19px;padding:34px;text-align:center}.rx-passport-empty b{display:block;font-size:18px;color:#071025}.rx-passport-empty p{max-width:560px;margin:8px auto 0;color:#6B7280;font-size:13px;line-height:1.55}
      .rx-share-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(7,16,37,.63);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:22px}.rx-share-modal{width:min(760px,100%);max-height:min(88vh,820px);background:#fff;border-radius:24px;box-shadow:0 34px 90px rgba(7,16,37,.32);overflow:hidden;display:flex;flex-direction:column}
      .rx-share-head{padding:23px 25px 18px;border-bottom:1px solid rgba(7,16,37,.08);display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.rx-share-head small{display:block;color:#176BFF;text-transform:uppercase;letter-spacing:.08em;font-size:10.5px;font-weight:900;margin-bottom:6px}.rx-share-head h2{font-size:24px}.rx-share-head p{color:#6B7280;font-size:12.5px;line-height:1.5;margin:6px 0 0}.rx-share-close{width:36px;height:36px;border:1px solid rgba(7,16,37,.1);background:#F7F9FD;color:#071025;border-radius:11px;font-size:22px;line-height:1}
      .rx-share-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:14px 25px 0}.rx-share-progress span{height:4px;border-radius:999px;background:#E7ECF5}.rx-share-progress span.active{background:#176BFF}.rx-share-body{padding:21px 25px;overflow:auto}.rx-share-body h3{font-size:17px;margin-bottom:5px}.rx-share-intro{font-size:12.5px;color:#6B7280;line-height:1.5;margin:0 0 15px}
      .rx-share-options{display:grid;gap:9px}.rx-share-target{width:100%;border:1px solid rgba(7,16,37,.1);background:#fff;border-radius:15px;padding:14px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:11px;align-items:center;text-align:left;color:#071025}.rx-share-target:hover{border-color:#176BFF;background:#F8FAFF}.rx-share-target-logo{width:42px;height:42px;border-radius:12px;background:#071025;color:#fff;display:grid;place-items:center;font-weight:900}.rx-share-target b{display:block;font-size:13px}.rx-share-target span{display:block;color:#6B7280;font-size:11.5px;margin-top:3px}.rx-share-target em{font-style:normal;color:#176BFF;font-size:11px;font-weight:900}
      .rx-share-check{border:1px solid rgba(7,16,37,.09);background:#F9FAFD;border-radius:15px;padding:13px;display:grid;grid-template-columns:20px minmax(0,1fr);gap:11px;align-items:flex-start}.rx-share-check input{width:17px;height:17px;margin:2px 0 0;accent-color:#176BFF}.rx-share-check b{display:block;font-size:13px;color:#071025}.rx-share-check span{display:block;font-size:11.5px;color:#6B7280;line-height:1.45;margin-top:4px}
      .rx-share-review-target{background:#071025;color:#fff;border-radius:16px;padding:15px;margin-bottom:12px}.rx-share-review-target small{display:block;color:#AFC4FF;text-transform:uppercase;font-size:10px;font-weight:900;letter-spacing:.06em}.rx-share-review-target b{display:block;font-size:16px;margin-top:5px}.rx-share-review-target span{display:block;color:#D4DEFB;font-size:11.5px;margin-top:4px}.rx-share-review-list{display:grid;gap:8px}.rx-share-review-item{border:1px solid rgba(7,16,37,.09);border-radius:14px;padding:12px 13px}.rx-share-review-item b{display:block;font-size:13px}.rx-share-review-item span{display:block;color:#6B7280;font-size:11.5px;line-height:1.45;margin-top:4px}.rx-share-review-item p{margin:8px 0 0;background:#F7F9FD;border-left:3px solid #176BFF;padding:8px 10px;color:#34415B;font-size:11.5px;line-height:1.45}
      .rx-share-consent{margin-top:14px;border:1px solid rgba(23,107,255,.18);background:#EEF3FF;border-radius:14px;padding:12px;display:grid;grid-template-columns:18px minmax(0,1fr);gap:9px;color:#2946C7;font-size:11.5px;font-weight:800;line-height:1.5}.rx-share-consent input{width:16px;height:16px;margin:1px 0 0;accent-color:#176BFF}
      .rx-share-actions{padding:16px 25px 20px;border-top:1px solid rgba(7,16,37,.08);display:flex;align-items:center;justify-content:space-between;gap:12px}.rx-share-actions-right{display:flex;gap:8px;margin-left:auto}.rx-share-secondary,.rx-share-primary{border-radius:999px;padding:10px 14px;font-size:12px;font-weight:900}.rx-share-secondary{border:1px solid rgba(7,16,37,.12);background:#fff;color:#071025}.rx-share-primary{border:1px solid #176BFF;background:#176BFF;color:#fff}.rx-share-primary:disabled{opacity:.5;cursor:not-allowed}
      @media(max-width:760px){.rx-passport-hero{grid-template-columns:1fr;padding:23px}.rx-passport-hero h2{font-size:25px}.rx-passport-hero-side{justify-items:start}.rx-passport-seal{display:none}.rx-passport-stats{grid-template-columns:1fr 1fr}.rx-evidence-grid{grid-template-columns:1fr}.rx-evidence-head{display:grid}.rx-evidence-badge{justify-self:start}.rx-active-share{grid-template-columns:1fr}.rx-active-share-actions{justify-content:flex-start}.rx-share-backdrop{padding:8px 8px 0;align-items:flex-end}.rx-share-modal{max-height:94vh;border-radius:24px 24px 0 0}.rx-share-head{padding:20px 18px 16px}.rx-share-progress{padding:13px 18px 0}.rx-share-body{padding:18px}.rx-share-target{grid-template-columns:40px minmax(0,1fr)}.rx-share-target em{grid-column:2}.rx-share-actions{padding:14px 18px calc(18px + env(safe-area-inset-bottom));flex-wrap:wrap}.rx-share-actions-right{width:100%}.rx-share-actions-right button{flex:1}}
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
      <div class="page-head"><div><h1>Verified Career Passport</h1><p>Keep positive evidence earned through genuine hiring activity and decide exactly who may see it.</p></div></div>
      <div class="rx-passport-hero">
        <div><span class="rx-passport-kicker">✓ Candidate-owned evidence</span><h2>A no should never send you back to zero.</h2><p>Employers can verify only predefined positive evidence from real Rolexa applications. Nothing is shared until you choose a specific opportunity, select the evidence and confirm your consent.</p></div>
        <div class="rx-passport-hero-side"><div class="rx-passport-seal"><div><b>RX</b><span>Verified evidence</span></div></div><button class="rx-passport-share-main" id="rxPassportShareButton" type="button" disabled>Share evidence</button></div>
      </div>
      <div class="rx-passport-stats" id="rxPassportStats"></div>
      <div class="rx-passport-notice">You remain in control. Employers can see only the evidence you explicitly select for their application, and you can revoke access at any time.</div>
      <section class="rx-passport-share-panel" id="rxPassportSharingPanel"></section>
      <div class="rx-passport-list" id="rxPassportList"><div class="rx-passport-empty"><b>Loading your Career Passport…</b></div></div>
    `;
    app.appendChild(page);

    button.addEventListener('click', () => {
      if (typeof window.showView === 'function') window.showView('careerPassport');
      else {
        document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
        page.classList.add('active');
      }
      refreshPassport();
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
      status.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10080;border-radius:999px;padding:11px 15px;font:850 12.5px Inter,sans-serif;box-shadow:0 14px 35px rgba(7,16,37,.2);';
      document.body.appendChild(status);
    }
    status.textContent = message;
    status.style.background = type === 'bad' ? '#FBE4E1' : type === 'good' ? '#E1F6EB' : '#EEF3FF';
    status.style.color = type === 'bad' ? '#A33327' : type === 'good' ? '#176B49' : '#2946C7';
    clearTimeout(window.__rxPassportMessageTimer);
    window.__rxPassportMessageTimer = setTimeout(() => status.remove(), 4200);
  }

  function targetFor(applicationId) {
    return sharingTargets.find(target => target.id === applicationId) || null;
  }

  function evidenceFor(evidenceId) {
    return evidenceRows.find(row => row.id === evidenceId) || null;
  }

  function renderStats() {
    const accepted = activeAcceptedEvidence();
    const pending = evidenceRows.filter(row => row.candidate_status === 'pending').length;
    const active = activeDisclosures();
    const sharedEvidence = new Set(active.map(row => row.evidence_id)).size;
    const sharedApplications = new Set(active.map(row => row.recipient_application_id)).size;
    byId('rxPassportStats').innerHTML = [
      ['Verified evidence', accepted.length],
      ['Needs your review', pending],
      ['Currently shared', sharedEvidence],
      ['Employer access', sharedApplications]
    ].map(([label, value]) => `<div class="rx-passport-stat"><span>${safe(label)}</span><b>${value}</b></div>`).join('');
  }

  function badgeFor(row) {
    if (row.candidate_status === 'pending') return '<span class="rx-evidence-badge pending">Awaiting your decision</span>';
    if (row.candidate_status === 'accepted') return '<span class="rx-evidence-badge">✓ Verified</span>';
    if (row.candidate_status === 'disputed') return '<span class="rx-evidence-badge disputed">Under review</span>';
    return `<span class="rx-evidence-badge muted">${safe(titleCase(row.candidate_status))}</span>`;
  }

  function actionsFor(row) {
    if (row.candidate_status === 'pending') {
      return `<div class="rx-evidence-actions">
        <button class="rx-evidence-btn primary" type="button" data-passport-decision="accept" data-evidence-id="${safe(row.id)}">Add to my Passport</button>
        <button class="rx-evidence-btn" type="button" data-passport-decision="dispute" data-evidence-id="${safe(row.id)}">Dispute</button>
        <button class="rx-evidence-btn danger" type="button" data-passport-decision="decline" data-evidence-id="${safe(row.id)}">Decline</button>
      </div>`;
    }
    if (row.candidate_status !== 'accepted') return '';
    const recipientCount = new Set(activeDisclosures().filter(item => item.evidence_id === row.id).map(item => item.recipient_application_id)).size;
    return `<div class="rx-evidence-actions"><span class="rx-evidence-access">${recipientCount ? `Shared with ${recipientCount} employer${recipientCount === 1 ? '' : 's'}` : 'Private'}</span><button class="rx-evidence-btn" type="button" data-open-passport-share>Manage sharing</button></div>`;
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

  function renderSharingPanel() {
    const panel = byId('rxPassportSharingPanel');
    if (!panel) return;
    if (!sharingReady) {
      panel.innerHTML = '<div class="rx-passport-share-panel-head"><div><h2>Evidence sharing</h2><p>Secure sharing is being connected. Your accepted evidence remains private.</p></div></div>';
      return;
    }
    const groups = new Map();
    activeDisclosures().forEach(disclosure => {
      const list = groups.get(disclosure.recipient_application_id) || [];
      list.push(disclosure);
      groups.set(disclosure.recipient_application_id, list);
    });
    const shares = [...groups.entries()].map(([applicationId, disclosures]) => {
      const target = targetFor(applicationId);
      if (!target) return '';
      return `<div class="rx-active-share"><div><b>${safe(target.company)} · ${safe(target.title)}</b><span>${disclosures.length} evidence item${disclosures.length === 1 ? '' : 's'} shared · Candidate-controlled access</span></div><div class="rx-active-share-actions"><button class="rx-evidence-btn" type="button" data-manage-passport-share="${safe(applicationId)}">Manage</button><button class="rx-evidence-btn danger" type="button" data-revoke-passport-share="${safe(applicationId)}">Revoke access</button></div></div>`;
    }).filter(Boolean).join('');
    panel.innerHTML = `<div class="rx-passport-share-panel-head"><div><h2>Employer access</h2><p>Every active share is tied to one of your applications. Access ends immediately when you revoke it.</p></div><button class="rx-evidence-btn primary" type="button" data-open-passport-share ${activeAcceptedEvidence().length && shareableTargets().length ? '' : 'disabled'}>Share evidence</button></div><div class="rx-active-shares">${shares || '<div class="rx-passport-empty"><b>No employer has access</b><p>Your accepted evidence is private until you complete the sharing review.</p></div>'}</div>`;
  }

  function renderEvidence(errorMessage = '') {
    renderStats();
    renderSharingPanel();
    const shareButton = byId('rxPassportShareButton');
    if (shareButton) shareButton.disabled = !sharingReady || !activeAcceptedEvidence().length || !shareableTargets().length;
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

  async function loadSharingData() {
    sharingReady = false;
    sharingTargets = [];
    disclosureRows = [];
    const applicationsResult = await client
      .from('candidate_applications')
      .select('id,job_id,status,applied_at')
      .eq('user_id', currentUser.id)
      .order('applied_at', { ascending: false });
    if (applicationsResult.error) return;

    const applications = applicationsResult.data || [];
    const jobIds = [...new Set(applications.map(application => application.job_id).filter(Boolean))];
    let jobs = [];
    if (jobIds.length) {
      const jobsResult = await client.from('jobs').select('id,title,company,employer_user_id').in('id', jobIds);
      if (jobsResult.error) return;
      jobs = jobsResult.data || [];
    }
    const jobsById = new Map(jobs.map(job => [job.id, job]));
    sharingTargets = applications
      .map(application => {
        const job = jobsById.get(application.job_id) || {};
        const shareable = !['withdrawn', 'rejected', 'hired'].includes(String(application.status || '').toLowerCase());
        return {
          id: application.id,
          job_id: application.job_id,
          status: application.status,
          title: job.title || 'Rolexa application',
          company: job.company || 'Rolexa employer',
          employer_user_id: job.employer_user_id || '',
          shareable
        };
      })
      .filter(target => target.employer_user_id && target.employer_user_id !== currentUser.id);

    const disclosureResult = await client
      .from('evidence_disclosures')
      .select('id,evidence_id,recipient_application_id,recipient_employer_user_id,purpose,consented_at,disclosed_at,revoked_at')
      .eq('candidate_user_id', currentUser.id)
      .order('disclosed_at', { ascending: false });
    if (disclosureResult.error) return;
    disclosureRows = disclosureResult.data || [];
    sharingReady = true;
  }

  async function refreshPassport() {
    if (loading || !client || !currentUser) return;
    loading = true;
    const result = await client
      .from('candidate_evidence')
      .select('id,application_id,job_id,demonstrated_level,evidence_source,factual_note,candidate_status,sharing_scope,issued_at,candidate_decided_at,expires_at,revoked_at,evidence_definition:evidence_definitions(code,name,category,description),job:jobs(title,company)')
      .eq('candidate_user_id', currentUser.id)
      .order('issued_at', { ascending: false });
    if (result.error) {
      evidenceRows = [];
      loading = false;
      renderEvidence('The secure Passport foundation has not been activated yet. Your existing candidate account is unaffected.');
      return;
    }
    evidenceRows = (result.data || []).sort((left, right) =>
      (STATUS_ORDER[left.candidate_status] ?? 9) - (STATUS_ORDER[right.candidate_status] ?? 9)
      || new Date(right.issued_at) - new Date(left.issued_at)
    );
    await loadSharingData();
    loading = false;
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
    await refreshPassport();
  }

  function closeShareModal() {
    byId('rxPassportShareModal')?.remove();
    shareStep = 1;
    shareApplicationId = '';
    shareEvidenceIds = new Set();
  }

  function shareProgress() {
    return `<div class="rx-share-progress" aria-label="Sharing progress"><span class="${shareStep >= 1 ? 'active' : ''}"></span><span class="${shareStep >= 2 ? 'active' : ''}"></span><span class="${shareStep >= 3 ? 'active' : ''}"></span></div>`;
  }

  function targetInitials(target) {
    return String(target.company || 'R').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R';
  }

  function renderTargetStep() {
    return `<h3>Choose the opportunity</h3><p class="rx-share-intro">Evidence is shared with the employer through one specific application, never with the marketplace generally.</p><div class="rx-share-options">${shareableTargets().map(target => {
      const existing = activeDisclosures().filter(row => row.recipient_application_id === target.id).length;
      return `<button class="rx-share-target" type="button" data-share-target="${safe(target.id)}"><span class="rx-share-target-logo">${safe(targetInitials(target))}</span><span><b>${safe(target.company)}</b><span>${safe(target.title)} · ${safe(target.status || 'Application active')}</span></span><em>${existing ? `${existing} currently shared` : 'Select'}</em></button>`;
    }).join('')}</div>`;
  }

  function renderEvidenceStep() {
    const target = targetFor(shareApplicationId);
    return `<h3>Select the exact evidence</h3><p class="rx-share-intro">Choose only what you want ${safe(target?.company || 'this employer')} to see for ${safe(target?.title || 'this application')}.</p><div class="rx-share-options">${activeAcceptedEvidence().map(row => {
      const definition = row.evidence_definition || {};
      const job = row.job || {};
      return `<label class="rx-share-check"><input type="checkbox" data-share-evidence="${safe(row.id)}" ${shareEvidenceIds.has(row.id) ? 'checked' : ''}><span><b>${safe(definition.name || 'Verified evidence')}</b><span>${safe(titleCase(row.demonstrated_level))} · Issued by ${safe(job.company || 'verified employer')} from ${safe(job.title || 'a Rolexa application')}</span></span></label>`;
    }).join('')}</div>`;
  }

  function renderReviewStep() {
    const target = targetFor(shareApplicationId);
    const selected = activeAcceptedEvidence().filter(row => shareEvidenceIds.has(row.id));
    return `<h3>Review what the employer will see</h3><p class="rx-share-intro">This is the complete disclosure. Nothing else from your Passport or private application history is included.</p><div class="rx-share-review-target"><small>Recipient</small><b>${safe(target?.company || 'Rolexa employer')}</b><span>${safe(target?.title || 'Rolexa application')}</span></div><div class="rx-share-review-list">${selected.map(row => {
      const definition = row.evidence_definition || {};
      const job = row.job || {};
      return `<div class="rx-share-review-item"><b>${safe(definition.name || 'Verified evidence')}</b><span>${safe(titleCase(definition.category || 'evidence'))} · ${safe(SOURCE_LABELS[row.evidence_source] || titleCase(row.evidence_source))} · ${safe(titleCase(row.demonstrated_level))}<br>Issued by ${safe(job.company || 'verified employer')} from ${safe(job.title || 'a Rolexa application')} on ${safe(dateText(row.issued_at))}</span>${row.factual_note ? `<p>${safe(row.factual_note)}</p>` : ''}</div>`;
    }).join('')}</div><label class="rx-share-consent"><input type="checkbox" id="rxPassportConsent"><span>I consent to Rolexa showing only the evidence listed above to ${safe(target?.company || 'this employer')} for my ${safe(target?.title || 'selected')} application. I understand I can revoke access at any time.</span></label>`;
  }

  function renderShareModal() {
    const modal = byId('rxPassportShareModal');
    if (!modal) return;
    const body = byId('rxPassportShareBody');
    const actions = byId('rxPassportShareActions');
    byId('rxPassportShareProgress').innerHTML = shareProgress();
    body.innerHTML = shareStep === 1 ? renderTargetStep() : shareStep === 2 ? renderEvidenceStep() : renderReviewStep();
    if (shareStep === 1) {
      actions.innerHTML = '<div class="rx-share-actions-right"><button class="rx-share-secondary" type="button" data-close-passport-share>Cancel</button></div>';
    } else if (shareStep === 2) {
      actions.innerHTML = `<button class="rx-share-secondary" type="button" data-share-back>Back</button><div class="rx-share-actions-right"><button class="rx-share-primary" type="button" data-share-next ${shareEvidenceIds.size ? '' : 'disabled'}>Review selection</button></div>`;
    } else {
      actions.innerHTML = '<button class="rx-share-secondary" type="button" data-share-back>Back</button><div class="rx-share-actions-right"><button class="rx-share-primary" type="button" data-confirm-passport-share disabled>Confirm and share</button></div>';
    }
  }

  function openShareModal(applicationId = '') {
    if (!sharingReady) {
      showMessage('Secure sharing is not available until the Supabase sharing update is active.', 'bad');
      return;
    }
    if (!activeAcceptedEvidence().length) {
      showMessage('Accept at least one verified evidence item before sharing.', 'bad');
      return;
    }
    if (!shareableTargets().length) {
      showMessage('You need an active application before evidence can be shared.', 'bad');
      return;
    }
    closeShareModal();
    shareApplicationId = applicationId && targetFor(applicationId) ? applicationId : '';
    shareStep = shareApplicationId ? 2 : 1;
    shareEvidenceIds = new Set(activeDisclosures()
      .filter(row => row.recipient_application_id === shareApplicationId)
      .map(row => row.evidence_id));
    document.body.insertAdjacentHTML('beforeend', `<div class="rx-share-backdrop" id="rxPassportShareModal"><section class="rx-share-modal" role="dialog" aria-modal="true" aria-labelledby="rxPassportShareTitle"><div class="rx-share-head"><div><small>Candidate-controlled disclosure</small><h2 id="rxPassportShareTitle">Share Career Passport evidence</h2><p>Choose the recipient, select evidence and confirm consent.</p></div><button class="rx-share-close" type="button" data-close-passport-share aria-label="Close sharing review">&times;</button></div><div id="rxPassportShareProgress"></div><div class="rx-share-body" id="rxPassportShareBody"></div><div class="rx-share-actions" id="rxPassportShareActions"></div></section></div>`);
    renderShareModal();
  }

  async function confirmShare(button) {
    const target = targetFor(shareApplicationId);
    if (!target || !shareEvidenceIds.size) return;
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Sharing securely…';
    const result = await client.rpc('set_candidate_passport_share', {
      p_recipient_application_id: shareApplicationId,
      p_evidence_ids: [...shareEvidenceIds],
      p_purpose: `Shared for ${target.title} application`
    });
    if (result.error) {
      button.disabled = false;
      button.textContent = previous;
      const raw = result.error.message || '';
      const message = raw.includes('APPLICATION_NOT_ACTIVE')
        ? 'This application is no longer active for evidence sharing.'
        : raw.includes('EVIDENCE_NOT_ELIGIBLE')
          ? 'One of the selected evidence items is no longer eligible to share.'
          : raw || 'Could not share this evidence.';
      showMessage(message, 'bad');
      return;
    }
    closeShareModal();
    showMessage(`${result.data || shareEvidenceIds.size} evidence item${Number(result.data) === 1 ? '' : 's'} shared with ${target.company}.`, 'good');
    await refreshPassport();
  }

  async function revokeShare(applicationId, button) {
    const target = targetFor(applicationId);
    if (!target || !window.confirm(`Revoke ${target.company}'s access to all shared Career Passport evidence for ${target.title}?`)) return;
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Revoking…';
    const result = await client.rpc('revoke_candidate_passport_share', {
      p_recipient_application_id: applicationId
    });
    button.disabled = false;
    button.textContent = previous;
    if (result.error) {
      showMessage(result.error.message || 'Could not revoke access.', 'bad');
      return;
    }
    showMessage(`Access revoked for ${target.company}.`, 'good');
    await refreshPassport();
  }

  async function init() {
    addStyles();
    addPage();
    document.addEventListener('click', event => {
      const decision = event.target.closest?.('[data-passport-decision][data-evidence-id]');
      if (decision) {
        decideEvidence(decision.dataset.evidenceId, decision.dataset.passportDecision, decision);
        return;
      }
      if (event.target.closest?.('[data-open-passport-share]') || event.target.id === 'rxPassportShareButton') {
        openShareModal();
        return;
      }
      const manage = event.target.closest?.('[data-manage-passport-share]');
      if (manage) {
        openShareModal(manage.dataset.managePassportShare);
        return;
      }
      const revoke = event.target.closest?.('[data-revoke-passport-share]');
      if (revoke) {
        revokeShare(revoke.dataset.revokePassportShare, revoke);
        return;
      }
      const target = event.target.closest?.('[data-share-target]');
      if (target) {
        shareApplicationId = target.dataset.shareTarget;
        shareEvidenceIds = new Set(activeDisclosures().filter(row => row.recipient_application_id === shareApplicationId).map(row => row.evidence_id));
        shareStep = 2;
        renderShareModal();
        return;
      }
      if (event.target.closest?.('[data-share-next]')) {
        if (!shareEvidenceIds.size) return;
        shareStep = 3;
        renderShareModal();
        return;
      }
      if (event.target.closest?.('[data-share-back]')) {
        shareStep = Math.max(1, shareStep - 1);
        if (shareStep === 1) {
          shareApplicationId = '';
          shareEvidenceIds = new Set();
        }
        renderShareModal();
        return;
      }
      const confirm = event.target.closest?.('[data-confirm-passport-share]');
      if (confirm) {
        confirmShare(confirm);
        return;
      }
      if (event.target.closest?.('[data-close-passport-share]') || event.target.id === 'rxPassportShareModal') closeShareModal();
    });
    document.addEventListener('change', event => {
      const evidence = event.target.closest?.('[data-share-evidence]');
      if (evidence) {
        if (evidence.checked) shareEvidenceIds.add(evidence.dataset.shareEvidence);
        else shareEvidenceIds.delete(evidence.dataset.shareEvidence);
        const next = document.querySelector('[data-share-next]');
        if (next) next.disabled = !shareEvidenceIds.size;
        return;
      }
      if (event.target.id === 'rxPassportConsent') {
        const confirm = document.querySelector('[data-confirm-passport-share]');
        if (confirm) confirm.disabled = !event.target.checked;
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && byId('rxPassportShareModal')) closeShareModal();
    });
    try {
      const library = await loadSupabase();
      client = library.createClient(SUPABASE_URL, SUPABASE_KEY);
      const sessionResult = await client.auth.getSession();
      currentUser = sessionResult.data?.session?.user || null;
      if (currentUser) await refreshPassport();
      else renderEvidence('Sign in to see candidate-owned verified evidence.');
    } catch (error) {
      renderEvidence('The Career Passport connection is not available right now.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
