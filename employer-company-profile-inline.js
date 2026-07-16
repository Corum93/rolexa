(() => {
  if (window.__rolexaInlineCompanyProfileNavigation) return;
  window.__rolexaInlineCompanyProfileNavigation = true;

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
})();
