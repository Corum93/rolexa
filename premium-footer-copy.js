(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumFooterCopyV2) return;
  window.__rolexaPremiumFooterCopyV2 = true;

  const footer = document.querySelector('footer');
  if (!footer) return;

  const oldCopy = 'UK job platform prototype · built for entry level to CEO, every field.';
  const newCopy = 'UK career platform · helping people move from their first roles into leadership and beyond.';

  const walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue?.includes(oldCopy)) continue;
    node.nodeValue = node.nodeValue.replace(oldCopy, newCopy);
    return;
  }

  const candidates = footer.querySelectorAll('p,span,small,div');
  for (const element of candidates) {
    if (element.children.length || !/UK job platform prototype|entry level to CEO/i.test(element.textContent || '')) continue;
    element.textContent = newCopy;
    return;
  }
})();