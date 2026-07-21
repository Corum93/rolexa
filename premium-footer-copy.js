(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumFooterCopy) return;
  window.__rolexaPremiumFooterCopy = true;

  const footer = document.querySelector('footer');
  if (!footer) return;

  const copy = footer.querySelector('p');
  if (copy) {
    copy.textContent = 'UK career platform · helping people move from their first roles into leadership and beyond.';
  }
})();
