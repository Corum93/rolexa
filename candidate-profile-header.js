(() => {
  if (window.__rolexaCandidateProfileHeader) return;
  window.__rolexaCandidateProfileHeader = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  function esc(value) {
    return String(value || '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  }

  function profileData() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('rolexa_candidate_profile_v2') || '{}'); } catch (_) {}
    const name = document.getElementById('profileName')?.textContent?.trim() || stored.fullName || 'Candidate';
    const metaText = document.getElementById('profileMeta')?.textContent?.trim() || '';
    const role = stored.targetRole || metaText.split(',')[0]?.trim() || 'Professional';
    const location = stored.location || metaText.split(',')[1]?.trim() || '';
    const style = stored.workStyle || metaText.split(',')[2]?.trim() || '';
    const summary = document.getElementById('profileSummary')?.textContent?.trim() || stored.summary || '';
    return { name, role, location, style, summary };
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
      .rx-profile-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#071025 0%,#0A1738 58%,#176BFF 140%);color:#fff;border-radius:24px;padding:28px;display:grid;grid-template-columns:112px minmax(0,1fr) auto;gap:22px;align-items:center;margin-bottom:18px;box-shadow:0 18px 50px rgba(7,16,37,.16)}
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
      #profilePage.rx-profile-enhanced>.page-head{margin-bottom:14px}
      #profilePage.rx-profile-enhanced .two>article:first-child>h2:first-child,
      #profilePage.rx-profile-enhanced #profileMeta{display:none}
      #profilePage.rx-profile-enhanced .two>article:first-child:before{content:'About';display:block;font-family:'Space Grotesk',Inter,sans-serif;font-size:20px;font-weight:800;margin-bottom:10px;color:#071025}
      @media(max-width:760px){
        .rx-profile-hero{grid-template-columns:82px minmax(0,1fr);padding:20px 18px;gap:15px;border-radius:20px}
        .rx-profile-photo{width:80px;height:80px;border-radius:20px;border-width:3px;font-size:23px}
        .rx-profile-name{font-size:25px}
        .rx-profile-role{font-size:14px}
        .rx-profile-intro{grid-column:1/-1;margin-top:0}
        .rx-profile-actions{grid-column:1/-1;justify-content:flex-start}
        .rx-profile-action{flex:1;text-align:center;min-width:130px}
      }
      @media(max-width:420px){
        .rx-profile-hero{grid-template-columns:68px minmax(0,1fr);padding:18px 15px}
        .rx-profile-photo{width:66px;height:66px;border-radius:17px}
        .rx-profile-name{font-size:22px}
        .rx-profile-kicker{font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    const page = document.getElementById('profilePage');
    if (!page) return;
    addStyles();
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
    hero.querySelector('#rxProfileEdit')?.addEventListener('click', () => window.editProfile?.());
    hero.querySelector('#rxProfileCv')?.addEventListener('click', () => {
      const existing = Array.from(document.querySelectorAll('button,a')).find(el => /view my cv/i.test(el.textContent || '') && !hero.contains(el));
      if (existing) existing.click();
    });
  }

  function scheduleRender() { setTimeout(render, 80); }
  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-view="profile"],.rx-mobile-menu-link[data-view="profile"]');
    if (target) scheduleRender();
  });
  const observer = new MutationObserver(() => {
    const page = document.getElementById('profilePage');
    if (page?.classList.contains('active')) scheduleRender();
  });
  observer.observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRender);
  else scheduleRender();
})();
