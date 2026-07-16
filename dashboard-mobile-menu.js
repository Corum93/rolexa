(() => {
  if (window.__rolexaDashboardSharedLoaderV5) return;
  window.__rolexaDashboardSharedLoaderV5 = true;

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
    'https://cdn.jsdelivr.net/gh/Corum93/rolexa@459aa200372f11b2503cd0175b1f0392c6012757/dashboard-mobile-menu.js',
    '__rolexaStableDashboardMenuRequested',
    () => load('dashboard-messages-layout.js?v=1','__rolexaMessagesLayoutRequested')
  );
})();