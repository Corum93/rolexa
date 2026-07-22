(() => {
  if (window.__rolexaInlineCompanyProfileNavigation) return;
  window.__rolexaInlineCompanyProfileNavigation = true;

  const style = document.createElement('style');
  style.id = 'rxEmployerCompanyProfileMobilePolish';
  style.textContent = `
    @media(max-width:760px){
      #companyProfilePage .page-head{display:block!important;margin-bottom:16px!important}
      #companyProfilePage .page-head h1{font-size:30px!important;line-height:1.12!important}
      #companyProfilePage .page-head p{font-size:14px!important;line-height:1.5!important}
      #companyProfilePage .rx-company-profile-layout,
      #companyProfilePage .rx-company-profile-grid,
      #companyProfilePage .form-grid{grid-template-columns:1fr!important}
      #companyProfilePage .card{padding:17px!important;border-radius:18px!important}
      #companyProfilePage input,
      #companyProfilePage select,
      #companyProfilePage textarea{font-size:16px!important}
      #companyProfilePage .primary,
      #companyProfilePage .small-btn{min-height:44px}
    }
    @media(max-width:420px){
      #companyProfilePage .page-head h1{font-size:27px!important}
      #companyProfilePage .card{padding:15px!important}
    }
  `;
  document.head.appendChild(style);

  function hideInternalConnectionNotice() {
    const statusBar = document.getElementById('statusBar');
    if (!statusBar) return;
    const message = (statusBar.textContent || '').trim();
    if (/^Employer dashboard connected to Supabase\.?$/i.test(message)) {
      console.info('[Rolexa] Employer dashboard connected to Supabase.');
      statusBar.className = 'statusbar';
      statusBar.textContent = '';
    }
  }

  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    hideInternalConnectionNotice();
    new MutationObserver(hideInternalConnectionNotice).observe(statusBar, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function closeMobileMenu() {
    document.querySelector('.rx-mobile-dashboard-menu')?.classList.remove('open');
    document.querySelector('.rx-mobile-dashboard-backdrop')?.classList.remove('open');
    document.body.classList.remove('rx-dashboard-menu-open');
    const menuButton = document.querySelector('.rx-mobile-menu-button');
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
    }
  }

  document.addEventListener('click', event => {
    const companyProfileControl = event.target.closest?.(
      '.rx-mobile-menu-link[data-view="companyProfile"], .mobile-top .menu-btn[data-view="companyProfile"]'
    );
    if (!companyProfileControl) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (typeof window.rolexaEmployerShowView === 'function') {
      window.rolexaEmployerShowView('companyProfile');
      history.replaceState(null, '', '#companyProfile');
    }

    document.querySelectorAll('.rx-mobile-menu-link:not(.sign-out)').forEach(item => {
      item.classList.toggle('active', item.dataset.view === 'companyProfile');
    });
    closeMobileMenu();
  }, true);

  const load = (src, marker) => {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(marker,'true');
    document.body.appendChild(script);
  };

  load('product-feedback.js?v=1','data-rx-product-feedback');
  load('employer-verified-jobs-phase2.js?v=1','data-rx-verified-jobs');
  load('employer-verified-job-badges.js?v=1','data-rx-verified-job-badges');
})();