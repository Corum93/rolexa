(() => {
  if (window.__rolexaCandidateProfileHeader) return;
  window.__rolexaCandidateProfileHeader = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const CV_BUCKET = 'candidate-cvs';
  const PROFILE_KEY = 'rolexa_candidate_profile_v2';

  function esc(value) {
    return String(value || '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  }

  function storedProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function profileData() {
    const stored = storedProfile();
    const name = document.getElementById('profileName')?.textContent?.trim() || stored.fullName || 'Candidate';
    const metaText = document.getElementById('profileMeta')?.textContent?.trim() || '';
    const role = stored.targetRole || metaText.split(',')[0]?.trim() || 'Professional';
    const location = stored.location || metaText.split(',')[1]?.trim() || '';
    const style = stored.workStyle || metaText.split(',')[2]?.trim() || '';
    const summary = document.getElementById('profileSummary')?.textContent?.trim() || stored.summary || '';
    return { name, role, location, style, summary };
  }

  function professionalLinks() {
    const stored = storedProfile();
    return [
      { label:'LinkedIn', url:stored.linkedinUrl || '', icon:'in' },
      { label:'Portfolio', url:stored.portfolioUrl || '', icon:'◫' },
      { label:'Website', url:stored.websiteUrl || '', icon:'↗' },
      { label:'GitHub', url:stored.githubUrl || '', icon:'GH' }
    ].filter(link => link.url);
  }

  function safeUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalised);
      return ['http:','https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function avatarSource() {
    const top = document.getElementById('topAvatar');
    const img = top?.querySelector('img');
    if (img?.src) return img.src;
    const background = top ? getComputedStyle(top).backgroundImage : '';
    const match = background && background.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : '';
  }

  function initials(name) {
    return String(name || 'Candidate').split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase();
  }

  function addStyles() {
    if (document.getElementById('rxCandidateProfileHeaderStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateProfileHeaderStyles';
    style.textContent = `
      .rx-profile-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#071025 0%,#0A1738 58%,#176BFF 140%);color:#fff;border-radius:24px;padding:28px;display:grid;grid-template-columns:112px minmax(0,1fr) auto;gap:22px;align-items:center;margin-bottom:14px;box-shadow:0 18px 50px rgba(7,16,37,.16)}
      .rx-profile-hero:after{content:'';position:absolute;width:300px;height:300px;border-radius:50%;right:-120px;top:-170px;background:rgba(255,255,255,.06);pointer-events:none}
      .rx-profile-photo{position:relative;z-index:1;width:108px;height:108px;border-radius:24px;object-fit:cover;border:4px solid rgba(255,255,255,.9);box-shadow:0 12px 30px rgba(0,0,0,.28);background:#176BFF;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff;overflow:hidden}
      .rx-profile-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .rx-profile-copy{position:relative;z-index:1;min-width:0}
      .rx-profile-kicker{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#AFC4FF;margin-bottom:7px}
      .rx-profile-name{font-family:'Space Grotesk',Inter,sans-serif;font-size:32px;line-height:1.08;font-weight:800;letter-spacing:-.035em;margin:0}
      .rx-profile-role{font-size:16px;font-weight:800;color:#fff;margin-top:7px}
      .rx-profile-location{font-size:13px;color:#C7D3FF;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap}
      .rx-profile-intro{font-size:13.5px;line-height:1.55;color:#DCE5FF;margin:12px 0 0;max-width:720px}
      .rx-profile-actions{position:relative;z-index:1;display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
      .rx-profile-action{border-radius:999px;padding:11px 15px;font-size:13px;font-weight:900;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;white-space:nowrap}
      .rx-profile-action.primary{background:#fff;color:#071025;border-color:#fff}
      .rx-profile-action:disabled{opacity:.65;cursor:wait}
      .rx-profile-links{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid rgba(7,16,37,.1);border-radius:18px;padding:13px 16px;margin-bottom:18px;box-shadow:0 10px 30px rgba(7,16,37,.06)}
      .rx-profile-links-title{font-family:'Space Grotesk',Inter,sans-serif;font-size:13px;font-weight:800;color:#596279;margin-right:2px}
      .rx-profile-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#071025;background:#F2F5FC;border:1px solid rgba(23,107,255,.12);border-radius:999px;padding:9px 13px;font-size:12.5px;font-weight:900;transition:transform .16s ease,background .16s ease,border-color .16s ease}
      .rx-profile-link:hover{transform:translateY(-1px);background:#EAF0FF;border-color:rgba(23,107,255,.3)}
      .rx-profile-link-icon{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border-radius:7px;background:#176BFF;color:#fff;font-size:10px;font-weight:900;line-height:1}
      #profilePage.rx-profile-enhanced>.page-head{margin-bottom:14px}
      #profilePage.rx-profile-enhanced>.page-head .head-actions{display:none!important}
      #profilePage.rx-profile-enhanced .two>article:first-child>h2:first-child,
      #profilePage.rx-profile-enhanced #profileMeta{display:none}
      #profilePage.rx-profile-enhanced .two>article:first-child:before{content:'About';display:block;font-family:'Space Grotesk',Inter,sans-serif;font-size:20px;font-weight:800;margin-bottom:10px;color:#071025}
      .side .nav button[onclick*="editProfile"]{display:none!important}
      .rx-mobile-menu-link[data-view="editProfile"]{display:none!important}
      @media(max-width:760px){
        .rx-profile-hero{grid-template-columns:82px minmax(0,1fr);padding:20px 18px;gap:15px;border-radius:20px}
        .rx-profile-photo{width:80px;height:80px;border-radius:20px;border-width:3px;font-size:23px}
        .rx-profile-name{font-size:25px}
        .rx-profile-role{font-size:14px}
        .rx-profile-intro{grid-column:1/-1;margin-top:0}
        .rx-profile-actions{grid-column:1/-1;justify-content:flex-start}
        .rx-profile-action{flex:1;text-align:center;min-width:130px}
        .rx-profile-links{padding:13px;gap:8px}
        .rx-profile-links-title{width:100%;margin:0 0 2px}
        .rx-profile-link{flex:1;justify-content:center;min-width:130px}
      }
      @media(max-width:420px){
        .rx-profile-hero{grid-template-columns:68px minmax(0,1fr);padding:18px 15px}
        .rx-profile-photo{width:66px;height:66px;border-radius:17px}
        .rx-profile-name{font-size:22px}
        .rx-profile-kicker{font-size:10px}
        .rx-profile-link{min-width:calc(50% - 4px);padding:9px 10px}
      }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateEditLinks() {
    document.querySelectorAll('.side .nav button').forEach(button => {
      if (/edit profile/i.test(button.textContent || '')) button.remove();
    });
    document.querySelectorAll('.rx-mobile-menu-link[data-view="editProfile"]').forEach(button => button.remove());
  }

  function fillEditorFallback() {
    const p = storedProfile();
    const textFields = ['fullName','email','location','targetRole','level','workStyle','salary','skills','summary'];
    textFields.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = p[id] || '';
    });
    const hasCv = document.getElementById('hasCv');
    const openToWork = document.getElementById('openToWork');
    const relocate = document.getElementById('relocate');
    if (hasCv) hasCv.checked = !!p.hasCv;
    if (openToWork) openToWork.checked = !!p.openToWork;
    if (relocate) relocate.checked = !!p.relocate;
    const setup = document.getElementById('setupView');
    const app = document.getElementById('appView');
    if (setup) setup.style.display = 'block';
    if (app) app.style.display = 'none';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function openEditor() {
    if (typeof window.editProfile === 'function') {
      window.editProfile();
      return;
    }
    fillEditorFallback();
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const existing = document.querySelector('script[data-rx-cv-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once:true });
        existing.addEventListener('error', () => reject(new Error('Supabase could not load')), { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.dataset.rxCvSupabase = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase could not load'));
      document.head.appendChild(script);
    });
  }

  async function openCv(button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening CV…';
    const popup = window.open('', '_blank');
    try {
      const lib = await loadSupabase();
      const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error('Please sign in again to view your CV.');

      let path = storedProfile().cvFilePath || '';
      if (!path) {
        const { data, error } = await client.from('candidate_profiles').select('cv_file_path').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        path = data?.cv_file_path || '';
      }
      if (!path) throw new Error('No CV has been uploaded yet. Use Edit profile to upload one.');

      const { data: signed, error: signedError } = await client.storage.from(CV_BUCKET).createSignedUrl(path, 300);
      if (signedError) throw signedError;
      if (!signed?.signedUrl) throw new Error('The CV link could not be created.');

      if (popup) popup.location.href = signed.signedUrl;
      else window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (popup) popup.close();
      alert(error?.message || 'Your CV could not be opened. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function loadProfessionalLinksEditor() {
    if (document.querySelector('script[data-rx-professional-links-editor]')) return;
    const script = document.createElement('script');
    script.src = 'candidate-professional-links-editor.js?v=1';
    script.defer = true;
    script.dataset.rxProfessionalLinksEditor = 'true';
    document.head.appendChild(script);
  }

  function renderLinks(hero) {
    let container = document.getElementById('rxCandidateProfessionalLinks');
    const links = professionalLinks().map(link => ({ ...link, url:safeUrl(link.url) })).filter(link => link.url);

    if (!links.length) {
      container?.remove();
      return;
    }

    if (!container) {
      container = document.createElement('section');
      container.id = 'rxCandidateProfessionalLinks';
      container.className = 'rx-profile-links';
      hero.insertAdjacentElement('afterend', container);
    }

    container.innerHTML = `
      <span class="rx-profile-links-title">Professional links</span>
      ${links.map(link => `<a class="rx-profile-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer"><span class="rx-profile-link-icon">${esc(link.icon)}</span><span>${esc(link.label)}</span></a>`).join('')}
    `;
  }

  function render() {
    const page = document.getElementById('profilePage');
    if (!page) return;
    addStyles();
    removeDuplicateEditLinks();
    const data = profileData();
    const src = avatarSource();
    let hero = document.getElementById('rxCandidateProfileHero');
    if (!hero) {
      hero = document.createElement('section');
      hero.id = 'rxCandidateProfileHero';
      hero.className = 'rx-profile-hero';
      const head = page.querySelector('.page-head');
      head?.insertAdjacentElement('afterend', hero);
    }
    const locationBits = [data.location, data.style].filter(Boolean);
    hero.innerHTML = `
      <div class="rx-profile-photo">${src ? `<img src="${esc(src)}" alt="${esc(data.name)} profile photo">` : esc(initials(data.name))}</div>
      <div class="rx-profile-copy">
        <div class="rx-profile-kicker">Candidate profile</div>
        <h2 class="rx-profile-name">${esc(data.name)}</h2>
        <div class="rx-profile-role">${esc(data.role)}</div>
        ${locationBits.length ? `<div class="rx-profile-location">${locationBits.map(item => `<span>${esc(item)}</span>`).join('<span>•</span>')}</div>` : ''}
        ${data.summary ? `<p class="rx-profile-intro">${esc(data.summary)}</p>` : ''}
      </div>
      <div class="rx-profile-actions">
        <button type="button" class="rx-profile-action primary" id="rxProfileEdit">Edit profile</button>
        <button type="button" class="rx-profile-action" id="rxProfileCv">View my CV</button>
      </div>`;
    page.classList.add('rx-profile-enhanced');
    hero.querySelector('#rxProfileEdit')?.addEventListener('click', openEditor);
    const cvButton = hero.querySelector('#rxProfileCv');
    cvButton?.addEventListener('click', () => openCv(cvButton));
    renderLinks(hero);
  }

  function scheduleRender() { setTimeout(render, 80); }
  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-view="profile"],.rx-mobile-menu-link[data-view="profile"]');
    if (target) scheduleRender();
  });
  window.addEventListener('rolexa:candidate-profile-updated', scheduleRender);
  window.addEventListener('rolexa:candidate-links-updated', scheduleRender);
  loadProfessionalLinksEditor();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRender);
  else scheduleRender();
})();