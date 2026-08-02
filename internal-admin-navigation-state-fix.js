(() => {
  if (window.__rolexaInternalAdminNavigationStateFix) return;
  window.__rolexaInternalAdminNavigationStateFix = true;

  const roadmapButton = () => document.getElementById('productRoadmapNavButton');
  const roadmapView = () => document.getElementById('roadmapView');

  function syncRoadmapNavigationState() {
    const button = roadmapButton();
    const view = roadmapView();
    if (!button || !view) return;

    const roadmapIsVisible = !view.classList.contains('hidden');
    button.classList.toggle('active', roadmapIsVisible);
  }

  document.addEventListener('click', event => {
    const selectedButton = event.target.closest('#adminApp .side nav button');
    if (!selectedButton) return;

    if (selectedButton.id !== 'productRoadmapNavButton') {
      roadmapButton()?.classList.remove('active');
      roadmapView()?.classList.add('hidden');
    }

    requestAnimationFrame(syncRoadmapNavigationState);
  }, true);

  const observer = new MutationObserver(syncRoadmapNavigationState);

  function init() {
    const attempt = () => {
      const view = roadmapView();
      if (!view) {
        setTimeout(attempt, 250);
        return;
      }

      observer.observe(view, {
        attributes: true,
        attributeFilter: ['class']
      });
      syncRoadmapNavigationState();
    };

    attempt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
