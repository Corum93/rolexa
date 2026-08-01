(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaInternalProductFeatureCopyPolish) return;
  window.__rolexaInternalProductFeatureCopyPolish = true;

  function polishEstimatedCompletionCopy() {
    document.querySelectorAll('.rx-feature-field').forEach(field => {
      const label = field.querySelector('span')?.textContent?.trim().toLowerCase();
      const value = field.querySelector('b');
      if (label === 'estimated completion' && value?.textContent?.trim() === 'Not set') {
        value.textContent = 'No target date';
      }
    });
  }

  polishEstimatedCompletionCopy();

  const observer = new MutationObserver(polishEstimatedCompletionCopy);
  observer.observe(document.body, { childList: true, subtree: true });
})();