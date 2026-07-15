(() => {
  if (window.__rolexaCandidateMobileUi || !/candidate-dashboard\.html$/.test(location.pathname)) return;
  window.__rolexaCandidateMobileUi = true;

  const style = document.createElement('style');
  style.id = 'rxCandidateMobileUiStyles';
  style.textContent = `
    .rx-mobile-drawer,.rx-mobile-drawer-backdrop{display:none}
    @media(max-width:1100px){
      body.rx-mobile-menu-open{overflow:hidden}
      .mobile-top{position:sticky;top:0;z-index:120;padding:12px 16px;min-height:68px;box-shadow:0 8px 28px rgba(7,16,37,.18)}
      .mobile-top .brand{gap:9px;min-width:0}.mobile-top .brand-mark{width:39px;height:30px}.mobile-top .brand-word{font-size:25px}
      .mobile-top .menu-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 13px;border-radius:12px;font-size:13px}
      .rx-mobile-drawer-backdrop{position:fixed;inset:0;background:rgba(7,16,37,.55);z-index:125}
      .rx-mobile-drawer-backdrop.open{display:block}
      .rx-mobile-drawer{display:flex;position:fixed;top:0;right:0;width:min(86vw,340px);height:100dvh;background:linear-gradient(180deg,#071025,#091A42);color:#fff;z-index:130;padding:20px 16px 24px;flex-direction:column;transform:translateX(105%);transition:transform .22s ease;box-shadow:-24px 0 60px rgba(7,16,37,.28);overflow:auto}
      .rx-mobile-drawer.open{transform:translateX(0)}
      .rx-mobile-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 4px 18px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:14px}
      .rx-mobile-drawer-title{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:800}.rx-mobile-close{width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-size:22px}
      .rx-mobile-nav{display:grid;gap:7px}.rx-mobile-nav button{width:100%;border:0;background:transparent;color:#C7D3FF;border-radius:13px;padding:13px 14px;font-size:14px;font-weight:800;text-align:left}.rx-mobile-nav button.active{background:#176BFF;color:#fff}.rx-mobile-nav button:hover{background:rgba(255,255,255,.08);color:#fff}
      .rx-mobile-drawer-footer{margin-top:auto;padding-top:20px}.rx-mobile-home{display:flex;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:13px;padding:12px;color:#fff;font-weight:800}
      .topbar{position:relative!important;padding:14px 16px!important;display:grid!important;grid-template-columns:1fr!important;gap:12px!important}
      .topbar .search{margin:0!important;max-width:none}.topbar .user{justify-content:space-between;flex-wrap:wrap;gap:10px}.topbar .user>div:nth-child(2){flex:1;min-width:0}.topbar .user b{overflow-wrap:anywhere}
      .content{padding:20px 16px 96px!important}.page-head h1{font-size:clamp(28px,8vw,38px)!important}.page-head p{font-size:14px!important}.head-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:9px!important}.head-actions button{width:100%}
      .card,.form-card{border-radius:18px!important;padding:17px!important}.grid,.two{gap:13px!important}.profile-card{gap:16px!important}.profile-card .ring{width:132px;height:132px}.profile-card .ring:after{width:96px;height:96px}
      .job,.msg,.event,.application{padding:12px!important;gap:10px!important}.job-actions{grid-column:1/-1!important;margin-top:4px}.job-actions .small-btn{flex:1;min-width:110px;text-align:center}
      .thread-wrap{gap:12px!important}.threads{max-height:220px;overflow:auto}.chat{min-height:480px!important}.chat-body{padding:14px!important}.bubble{max-width:88%!important}.chat-form{padding:10px!important}.chat-form input{min-width:0}
      .rx-chat-launcher{right:12px!important;bottom:12px!important;padding:12px 14px!important}
    }
    @media(max-width:520px){
      .mobile-top{padding:11px 13px}.mobile-top .brand-word{font-size:23px}.content{padding-left:13px!important;padding-right:13px!important}
      .topbar{padding:12px 13px!important}.topbar .user{display:grid!important;grid-template-columns:auto 1fr auto!important}.topbar .avatar{width:42px;height:42px}
      .head-actions{grid-template-columns:1fr!important}.page-head{margin-bottom:14px!important}.page-head h1{font-size:31px!important;line-height:1.08!important}
      .card{padding:15px!important}.profile-card{grid-template-columns:1fr!important}.profile-card>div:first-child{justify-self:center}.profile-card h2{text-align:left}
      .status-row{padding:11px!important}.salary-big{font-size:31px!important}.filters button,.filters input,.filters select{width:100%}
      .chat{min-height:430px!important}.bubble{max-width:94%!important;font-size:13px!important}.rx-interview-card{width:100%!important;padding:14px!important}
    }
  `;
  document.head.appendChild(style);

  function buildMenu(){
    const top = document.querySelector('.mobile-top');
    const desktopNav = document.querySelector('.side .nav');
    if (!top || !desktopNav || document.querySelector('.rx-mobile-drawer')) return;
    const existing = top.querySelector('.menu-btn');
    if (existing) {
      existing.href = '#';
      existing.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';
      existing.setAttribute('aria-expanded','false');
      existing.setAttribute('aria-controls','rxCandidateMobileDrawer');
    }
    const backdrop = document.createElement('div');
    backdrop.className = 'rx-mobile-drawer-backdrop';
    const drawer = document.createElement('aside');
    drawer.className = 'rx-mobile-drawer';
    drawer.id = 'rxCandidateMobileDrawer';
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML = '<div class="rx-mobile-drawer-head"><div class="rx-mobile-drawer-title">Candidate menu</div><button class="rx-mobile-close" type="button" aria-label="Close menu">×</button></div><nav class="rx-mobile-nav"></nav><div class="rx-mobile-drawer-footer"><a class="rx-mobile-home" href="index.html">Return to homepage</a></div>';
    const mobileNav = drawer.querySelector('.rx-mobile-nav');
    desktopNav.querySelectorAll('button').forEach(source => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = source.textContent.trim();
      if (source.dataset.view) button.dataset.view = source.dataset.view;
      if (source.classList.contains('active')) button.classList.add('active');
      button.addEventListener('click',() => {
        if (source.dataset.view && typeof window.showView === 'function') window.showView(source.dataset.view);
        else source.click();
        closeMenu();
        syncActive();
      });
      mobileNav.appendChild(button);
    });
    document.body.append(backdrop,drawer);

    function openMenu(){document.body.classList.add('rx-mobile-menu-open');drawer.classList.add('open');backdrop.classList.add('open');drawer.setAttribute('aria-hidden','false');existing?.setAttribute('aria-expanded','true')}
    function closeMenu(){document.body.classList.remove('rx-mobile-menu-open');drawer.classList.remove('open');backdrop.classList.remove('open');drawer.setAttribute('aria-hidden','true');existing?.setAttribute('aria-expanded','false')}
    function syncActive(){const active=document.querySelector('.side .nav .nav-btn.active')?.dataset.view;mobileNav.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===active))}
    existing?.addEventListener('click',event=>{event.preventDefault();drawer.classList.contains('open')?closeMenu():openMenu()});
    backdrop.addEventListener('click',closeMenu);drawer.querySelector('.rx-mobile-close').addEventListener('click',closeMenu);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
    document.addEventListener('click',event=>{if(event.target.closest?.('.nav-btn'))setTimeout(syncActive,0)});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',buildMenu);
  else buildMenu();
})();
