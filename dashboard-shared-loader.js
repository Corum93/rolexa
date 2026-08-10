(() => {
  if (window.__rolexaDashboardSharedLoaderV9) return;
  window.__rolexaDashboardSharedLoaderV9 = true;

  const isDashboard = /(?:candidate|employer)-dashboard\.html$/.test(location.pathname);
  if (!isDashboard) return;

  const load = (src, marker, onload) => {
    if (window[marker] || document.querySelector(`script[data-rx-loader="${marker}"]`)) {
      if (typeof onload === 'function') onload();
      return;
    }
    window[marker] = true;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.rxLoader = marker;
    if (typeof onload === 'function') script.addEventListener('load',onload,{once:true});
    document.head.appendChild(script);
  };

  load(
    'dashboard-mobile-menu.js?v=4',
    '__rolexaCurrentDashboardMenuRequestedV4',
    () => load('dashboard-messages-layout.js?v=3','__rolexaMessagesLayoutRequestedV3')
  );
})();