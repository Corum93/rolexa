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
        ['Edit profile','editProfile']
      ]
    : [
        ['Overview','overview'],
        ['Post a job','postJob'],
        ['Jobs','jobs'],
        ['Applications','matches'],
        ['Messages','messages'],
        ['Company profile','companyProfile']
      ];

  const style = document.createElement('style');
  style.id = 'rxDashboardMobileMenuStyles';
  style.textContent = `
    .rx-mobile-dashboard-menu,.rx-mobile-dashboard-backdrop{display:none}
    @media(max-width:1100px){
      body.rx-dashboard-menu-open{overflow:hidden}
      .mobile-top{display:none!important}
      .topbar{position:sticky!important;top:0!important;z-index:130!important}
      .topbar .user{flex-wrap:wrap;justify-content:flex-end}
      .rx-mobile-menu-button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:9px 13px;font-weight:900;font-size:12px;display:inline-flex;align-items:center;gap:7px}
      .rx-mobile-menu-button:after{content:'⌄';font-size:13px;line-height:1}
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
    }
    @media(max-width:760px){
      .topbar{padding:14px 16px!important}
      .topbar .user{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:10px!important}
      .topbar .user>div:nth-child(2){min-width:0}
      .topbar .user b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
      .rx-mobile-menu-button,.signout,.rx-profile-sync-signout{white-space:nowrap}
    }
    @media(max-width:520px){
      .topbar .user{grid-template-columns:auto minmax(0,1fr) auto!important}
      .rx-mobile-menu-button{grid-column:3;grid-row:1}
      .topbar .user .signout,.topbar .user .rx-profile-sync-signout{grid-column:3;grid-row:2;justify-self:end}
    }
  `;
  document.head.appendChild(style);

  const userArea = document.querySelector('.topbar .user');
  if (!userArea) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rx-mobile-menu-button';
  button.textContent = 'Menu';
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','rxDashboardMobileMenu');
  userArea.appendChild(button);

  const backdrop = document.createElement('div');
  backdrop.className = 'rx-mobile-dashboard-backdrop';

  const menu = document.createElement('aside');
  menu.id = 'rxDashboardMobileMenu';
  menu.className = 'rx-mobile-dashboard-menu';
  menu.setAttribute('aria-label',isCandidate ? 'Candidate dashboard navigation' : 'Employer dashboard navigation');
  menu.innerHTML = `<div class="rx-mobile-menu-head"><div class="rx-mobile-menu-title">${isCandidate ? 'Candidate menu' : 'Employer menu'}</div><button class="rx-mobile-menu-close" type="button" aria-label="Close menu">×</button></div><nav class="rx-mobile-menu-links"></nav>`;
  document.body.append(backdrop,menu);

  const links = menu.querySelector('.rx-mobile-menu-links');
  options.forEach(([label,view],index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'rx-mobile-menu-link' + (index === 0 ? ' active' : '');
    item.textContent = label;
    item.dataset.view = view;
    item.addEventListener('click',() => {
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
    menu.querySelectorAll('.rx-mobile-menu-link').forEach(item => item.classList.toggle('active',item.dataset.view === view));
  }
  function openMenu(){
    menu.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('rx-dashboard-menu-open');
    button.setAttribute('aria-expanded','true');
  }
  function closeMenu(){
    menu.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('rx-dashboard-menu-open');
    button.setAttribute('aria-expanded','false');
  }

  button.addEventListener('click',() => menu.classList.contains('open') ? closeMenu() : openMenu());
  backdrop.addEventListener('click',closeMenu);
  menu.querySelector('.rx-mobile-menu-close').addEventListener('click',closeMenu);
  document.addEventListener('keydown',event => { if (event.key === 'Escape') closeMenu(); });

  document.addEventListener('click',event => {
    const original = event.target.closest?.('.side .nav [data-view]');
    if (original) setActive(original.dataset.view);
  });
})();
