(() => {
  if (window.__rolexaDashboardMobileMenu) return;
  window.__rolexaDashboardMobileMenu = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  const options = isCandidate
    ? [
        ['Dashboard','overview'],
        ['Job Search','jobSearch'],
        ['Applications','applications'],
        ['Saved Jobs','savedJobs'],
        ['Messages','messages'],
        ['Profile','profile'],
        ['Salary Insights','salary'],
        ['Edit profile','editProfile'],
        ['Sign out','signOut']
      ]
    : [
        ['Overview','overview'],
        ['Post a job','postJob'],
        ['Jobs','jobs'],
        ['Applications','matches'],
        ['Messages','messages'],
        ['Company profile','companyProfile'],
        ['Sign out','signOut']
      ];

  const style = document.createElement('style');
  style.id = 'rxDashboardMobileMenuStyles';
  style.textContent = `
    .rx-mobile-menu-button,.rx-mobile-dashboard-menu,.rx-mobile-dashboard-backdrop{display:none}
    @media(max-width:1100px){
      body.rx-dashboard-menu-open{overflow:hidden}
      .mobile-top{display:none!important}
      .topbar{position:sticky!important;top:0!important;z-index:130!important}
      .topbar .user{flex-wrap:wrap;justify-content:flex-end}
      .topbar .user>.signout,.topbar .user>.rx-profile-sync-signout{display:none!important}
      .rx-mobile-menu-button{width:54px;height:54px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;border-radius:50%;padding:0;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;flex:0 0 auto;box-shadow:0 8px 24px rgba(0,0,0,.16)}
      .rx-mobile-menu-button span{display:block;width:23px;height:3px;border-radius:999px;background:#fff;transition:transform .2s ease,opacity .2s ease}
      .rx-mobile-menu-button[aria-expanded="true"] span:nth-child(1){transform:translateY(8px) rotate(45deg)}
      .rx-mobile-menu-button[aria-expanded="true"] span:nth-child(2){opacity:0}
      .rx-mobile-menu-button[aria-expanded="true"] span:nth-child(3){transform:translateY(-8px) rotate(-45deg)}
      .rx-mobile-dashboard-backdrop{position:fixed;inset:0;z-index:998;background:rgba(2,8,24,.58);backdrop-filter:blur(2px)}
      .rx-mobile-dashboard-backdrop.open{display:block}
      .rx-mobile-dashboard-menu{position:fixed;z-index:999;top:0;right:0;width:min(88vw,360px);height:100dvh;background:linear-gradient(180deg,#071025,#091A42);color:#fff;padding:calc(20px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));box-shadow:-18px 0 60px rgba(0,0,0,.35);overflow:auto;transform:translateX(105%);transition:transform .22s ease;display:block}
      .rx-mobile-dashboard-menu.open{transform:translateX(0)}
      .rx-mobile-menu-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;padding:0 4px}
      .rx-mobile-menu-title{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800}
      .rx-mobile-menu-close{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-size:22px;line-height:1}
      .rx-mobile-menu-links{display:grid;gap:8px}
      .rx-mobile-menu-link{width:100%;border:0;background:transparent;color:#C7D3FF;border-radius:14px;padding:15px 16px;font-size:16px;font-weight:850;text-align:left}
      .rx-mobile-menu-link.active{background:#176BFF;color:#fff}
      .rx-mobile-menu-link:hover{background:rgba(255,255,255,.08);color:#fff}
      .rx-mobile-menu-link.sign-out{margin-top:10px;padding-top:18px;border-top:1px solid rgba(255,255,255,.14);border-radius:0;color:#FFCEC8}
      .rx-mobile-menu-link.sign-out:hover{background:transparent;color:#fff}

      .rx-mobile-dashboard-menu.employer-match{left:0;right:auto;width:100vw;max-width:none;padding:calc(28px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom));box-shadow:18px 0 60px rgba(0,0,0,.35);transform:translateX(-105%)}
      .rx-mobile-dashboard-menu.employer-match.open{transform:translateX(0)}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-head{margin-bottom:28px;padding:0 16px}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand{display:flex;align-items:center;gap:12px}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand-mark{width:58px;height:42px;display:block}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand-word{font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-.055em;line-height:1}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-links{gap:14px;padding:0}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-link{border-radius:22px;padding:20px 26px;font-size:20px;font-weight:800}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-link.active{box-shadow:0 12px 30px rgba(23,107,255,.25)}
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-link.sign-out{border-radius:0}
    }
    @media(max-width:760px){
      .topbar{padding:14px 16px!important}
      .topbar .user{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px!important}
      .topbar .user>div:nth-child(2){min-width:0}
      .topbar .user b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
      .rx-mobile-menu-button{grid-column:3;grid-row:1;width:52px;height:52px}
    }
  `;
  document.head.appendChild(style);

  const userArea = document.querySelector('.topbar .user');
  if (!userArea) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rx-mobile-menu-button';
  button.innerHTML = '<span></span><span></span><span></span>';
  button.setAttribute('aria-label','Open menu');
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','rxDashboardMobileMenu');
  userArea.appendChild(button);

  const backdrop = document.createElement('div');
  backdrop.className = 'rx-mobile-dashboard-backdrop';

  const menu = document.createElement('aside');
  menu.id = 'rxDashboardMobileMenu';
  menu.className = `rx-mobile-dashboard-menu${isEmployer ? ' employer-match' : ''}`;
  menu.setAttribute('aria-label',isCandidate ? 'Candidate dashboard navigation' : 'Employer dashboard navigation');

  const employerBrand = `<div class="rx-mobile-menu-brand"><svg class="rx-mobile-menu-brand-mark" viewBox="0 0 62 42" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rxEmployerMenu" x1="8" y1="6" x2="56" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#1D7BFF"/><stop offset="1" stop-color="#0057FF"/></linearGradient></defs><path d="M9 35V7h17.5c7.4 0 12.2 4.3 12.2 10.7S33.9 28.4 26.5 28.4H18" stroke="url(#rxEmployerMenu)" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.5 21c0-8.4 6.7-15.1 15.1-15.1S60.7 12.6 60.7 21 54 36.1 45.6 36.1 30.5 29.4 30.5 21Z" stroke="url(#rxEmployerMenu)" stroke-width="6.4"/><path d="M32.7 31.9 24.5 24" stroke="url(#rxEmployerMenu)" stroke-width="6.4" stroke-linecap="round"/></svg><span class="rx-mobile-menu-brand-word">Rolexa</span></div>`;

  menu.innerHTML = `<div class="rx-mobile-menu-head">${isEmployer ? employerBrand : `<div class="rx-mobile-menu-title">Candidate menu</div>`}<button class="rx-mobile-menu-close" type="button" aria-label="Close menu">×</button></div><nav class="rx-mobile-menu-links"></nav>`;
  document.body.append(backdrop,menu);

  const links = menu.querySelector('.rx-mobile-menu-links');
  options.forEach(([label,view],index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'rx-mobile-menu-link' + (index === 0 ? ' active' : '') + (view === 'signOut' ? ' sign-out' : '');
    item.textContent = label;
    item.dataset.view = view;
    item.addEventListener('click',async () => {
      if (view === 'signOut') {
        closeMenu();
        if (isEmployer && typeof window.rolexaEmployerSignOut === 'function') {
          await window.rolexaEmployerSignOut();
          return;
        }
        const existing = document.querySelector('.topbar .rx-profile-sync-signout, .topbar .signout');
        if (existing) {
          existing.click();
          return;
        }
        location.href = isCandidate ? 'candidate-login.html' : 'employer-login.html';
        return;
      }
      if (view === 'companyProfile') {
        location.href = 'employer-company-profile.html';
        return;
      }
      if (view === 'editProfile') {
        if (typeof window.editProfile === 'function') window.editProfile();
      } else if (isCandidate && typeof window.showView === 'function') {
        window.showView(view);
      } else if (isEmployer && typeof window.rolexaEmployerShowView === 'function') {
        window.rolexaEmployerShowView(view);
      } else {
        const original = document.querySelector(`.side .nav [data-view="${view}"]`);
        original?.click();
      }
      setActive(view);
      closeMenu();
      window.scrollTo({top:0,behavior:'smooth'});
    });
    links.appendChild(item);
  });

  function setActive(view){
    menu.querySelectorAll('.rx-mobile-menu-link:not(.sign-out)').forEach(item => item.classList.toggle('active',item.dataset.view === view));
  }
  function openMenu(){
    menu.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('rx-dashboard-menu-open');
    button.setAttribute('aria-expanded','true');
    button.setAttribute('aria-label','Close menu');
  }
  function closeMenu(){
    menu.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('rx-dashboard-menu-open');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Open menu');
  }

  button.addEventListener('click',() => menu.classList.contains('open') ? closeMenu() : openMenu());
  backdrop.addEventListener('click',closeMenu);
  menu.querySelector('.rx-mobile-menu-close').addEventListener('click',closeMenu);
  document.addEventListener('keydown',event => { if (event.key === 'Escape') closeMenu(); });

  document.addEventListener('click',event => {
    const original = event.target.closest?.('.side .nav [data-view]');
    if (original) setActive(original.dataset.view);
  });

  if (isCandidate && !document.querySelector('script[data-rx-profile-header]')) {
    const profileScript = document.createElement('script');
    profileScript.src = 'candidate-profile-header.js?v=1';
    profileScript.defer = true;
    profileScript.dataset.rxProfileHeader = 'true';
    document.head.appendChild(profileScript);
  }

  if (isEmployer && !document.querySelector('script[data-rx-employer-candidate-links]')) {
    const linksScript = document.createElement('script');
    linksScript.src = 'employer-candidate-professional-links.js?v=1';
    linksScript.defer = true;
    linksScript.dataset.rxEmployerCandidateLinks = 'true';
    document.head.appendChild(linksScript);
  }

  if (isEmployer && !document.querySelector('script[data-rx-employer-role-match]')) {
    const matchScript = document.createElement('script');
    matchScript.src = 'employer-candidate-match.js?v=1';
    matchScript.defer = true;
    matchScript.dataset.rxEmployerRoleMatch = 'true';
    document.head.appendChild(matchScript);
  }
})();