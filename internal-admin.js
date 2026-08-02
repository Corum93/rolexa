(() => {
  if (window.__rolexaInternalAdminLoader) return;
  window.__rolexaInternalAdminLoader = true;

  const load = (src, marker, onload) => {
    if (window[marker] || document.querySelector(`script[data-loader="${marker}"]`)) {
      if (typeof onload === 'function') onload();
      return;
    }
    window[marker] = true;
    const script = document.createElement('script');
    script.src = src;
    script.dataset.loader = marker;
    script.onload = () => typeof onload === 'function' && onload();
    script.onerror = () => console.error(`Rolexa could not load ${src}`);
    document.body.appendChild(script);
  };

  load(
    'https://cdn.jsdelivr.net/gh/Corum93/rolexa@8294255716dc69dcd3fe45ba8107fbd7292798b8/internal-admin.js',
    '__rolexaStableInternalAdminRequested',
    () => load(
      'internal-product-roadmap.js?v=1',
      '__rolexaInternalProductRoadmapRequested',
      () => load(
        'internal-product-feature-details.js?v=1',
        '__rolexaInternalProductFeatureDetailsRequested',
        () => load(
          'internal-product-feature-copy-polish.js?v=1',
          '__rolexaInternalProductFeatureCopyPolishRequested',
          () => load(
            'internal-product-feature-editor.js?v=1',
            '__rolexaInternalProductFeatureEditorRequested',
            () => load(
              'internal-product-feature-checklist.js?v=1',
              '__rolexaInternalProductFeatureChecklistRequested',
              () => load(
                'internal-product-feature-dependencies.js?v=1',
                '__rolexaInternalProductFeatureDependenciesRequested',
                () => load(
                  'internal-product-feature-work-items.js?v=1',
                  '__rolexaInternalProductFeatureWorkItemsRequested',
                  () => load(
                    'internal-product-feature-activity.js?v=1',
                    '__rolexaInternalProductFeatureActivityRequested'
                  )
                )
              )
            )
          )
        )
      )
    )
  );
})();