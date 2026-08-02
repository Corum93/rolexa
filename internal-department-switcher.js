(() => {
  if (window.__rolexaInternalDepartmentSwitcher) return;
  window.__rolexaInternalDepartmentSwitcher = true;

  const currentPage = location.pathname.split('/').pop() || 'internal-admin.html';
  const current = currentPage === 'internal-people.html' ? 'people' : 'operations';
  const departments = [
    { id: 'operations', label: 'Operations', href: 'internal-admin.html' },
    { id: 'people', label: 'People', href: 'internal-people.html' },
    { id: 'support', label: 'Support', comingSoon: true },
    { id: 'finance', label: 'Finance', comingSoon: true },
    { id: 'legal', label: 'Legal & Compliance', comingSoon: true }
  ];

  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function switcherMarkup(compact = false) {
    const selected = departments.find(item => item.id === current);
    return `<div class="internal-dept ${compact ? 'internal-dept--compact' : ''}" data-internal-dept>
      ${compact ? '' : '<span class="internal-dept__eyebrow">Rolexa Internal</span>'}
      <button class="internal-dept__trigger" type="button" aria-haspopup="menu" aria-expanded="false">
        <span class="internal-dept__mark" aria-hidden="true">${current === 'people' ? 'P' : 'O'}</span>
        <span class="internal-dept__label"><small>Department</small><strong>${escapeHtml(selected.label)}</strong></span>
        <span class="internal-dept__chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="internal-dept__menu" role="menu" hidden>
        <div class="internal-dept__menu-head">Switch department</div>
        ${departments.map(item => item.comingSoon
          ? `<span class="internal-dept__item is-disabled" role="menuitem" aria-disabled="true"><span>${escapeHtml(item.label)}</span><small>Coming Soon</small></span>`
          : `<a class="internal-dept__item ${item.id === current ? 'is-current' : ''}" role="menuitem" href="${item.href}" ${item.id === current ? 'aria-current="page"' : ''}><span>${escapeHtml(item.label)}</span>${item.id === current ? '<small>Current</small>' : '<small>Open</small>'}</a>`
        ).join('')}
      </div>
    </div>`;
  }

  function installStyles() {
    if (document.getElementById('rolexaInternalDepartmentStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaInternalDepartmentStyles';
    style.textContent = `
      .internal-dept{position:relative;z-index:40;margin:0 4px 22px;padding:0 2px 20px;border-bottom:1px solid rgba(255,255,255,.10);font-family:Inter,sans-serif}
      .internal-dept__eyebrow{display:block;margin:0 2px 9px;color:#7f95c4;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      .internal-dept__trigger{width:100%;min-height:55px;display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.07);color:#fff;text-align:left;cursor:pointer;box-shadow:0 12px 24px rgba(0,7,25,.16);transition:.18s ease}
      .internal-dept__trigger:hover,.internal-dept.is-open .internal-dept__trigger{border-color:rgba(124,164,255,.38);background:rgba(255,255,255,.11)}
      .internal-dept__mark{width:34px;height:34px;display:grid;place-items:center;flex:0 0 34px;border-radius:10px;background:linear-gradient(145deg,#176bff,#5554df);font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:900;box-shadow:0 8px 17px rgba(23,107,255,.27)}
      .internal-dept__label{display:flex;min-width:0;flex:1;flex-direction:column}.internal-dept__label small{color:#91a6d4;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.internal-dept__label strong{margin-top:3px;overflow:hidden;font-size:12px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}.internal-dept__chevron{color:#a9bbe2;font-size:16px;transition:transform .18s ease}.internal-dept.is-open .internal-dept__chevron{transform:rotate(180deg)}
      .internal-dept__menu{position:absolute;left:2px;right:2px;top:calc(100% - 12px);z-index:60;padding:8px;border:1px solid rgba(16,35,75,.12);border-radius:16px;background:#fff;box-shadow:0 24px 60px rgba(0,10,38,.28);color:#07132f}.internal-dept__menu[hidden]{display:none}.internal-dept__menu-head{padding:8px 9px 10px;color:#8794aa;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
      .internal-dept__item{min-height:43px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-radius:11px;color:#243654;font-size:11px;font-weight:800;text-decoration:none}.internal-dept__item:hover{background:#f1f5ff;color:#176bff}.internal-dept__item small{color:#8c99ae;font-size:8px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.internal-dept__item.is-current{background:#eaf1ff;color:#145edb}.internal-dept__item.is-current small{color:#145edb}.internal-dept__item.is-disabled{cursor:not-allowed;opacity:.58}.internal-dept__item.is-disabled:hover{background:transparent;color:#243654}
      .internal-dept-mobile-host{display:none;order:2;margin-left:auto;margin-right:10px}.internal-dept--compact{margin:0;padding:0;border:0}.internal-dept--compact .internal-dept__trigger{width:auto;min-width:154px;min-height:42px;padding:5px 8px;border-radius:12px}.internal-dept--compact .internal-dept__mark{width:30px;height:30px;flex-basis:30px}.internal-dept--compact .internal-dept__menu{left:auto;right:0;top:calc(100% + 8px);width:250px}.internal-dept--compact .internal-dept__label small{font-size:7px}.internal-dept--compact .internal-dept__label strong{font-size:11px}
      @media(max-width:900px){.side>.internal-dept{display:none}.internal-dept-mobile-host{display:block}.top>.internal-dept-mobile-host{order:2}.top>.signout{order:3}.top:after{display:none!important}}
      @media(max-width:560px){.internal-dept--compact .internal-dept__trigger{min-width:0}.internal-dept--compact .internal-dept__label small{display:none}.internal-dept--compact .internal-dept__label strong{max-width:78px}.internal-dept--compact .internal-dept__menu{position:fixed;left:12px;right:12px;top:70px;width:auto}.internal-dept-mobile-host{margin-right:6px}}
    `;
    document.head.appendChild(style);
  }

  function closeAll(except = null) {
    document.querySelectorAll('[data-internal-dept]').forEach(root => {
      if (root === except) return;
      root.classList.remove('is-open');
      root.querySelector('.internal-dept__trigger')?.setAttribute('aria-expanded', 'false');
      const menu = root.querySelector('.internal-dept__menu');
      if (menu) menu.hidden = true;
    });
  }

  function wire(root) {
    const trigger = root.querySelector('.internal-dept__trigger');
    const menu = root.querySelector('.internal-dept__menu');
    if (!trigger || !menu) return;
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      const opening = menu.hidden;
      closeAll(root);
      menu.hidden = !opening;
      root.classList.toggle('is-open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
    });
  }

  function install() {
    installStyles();
    const side = document.querySelector('.side');
    if (side && !side.querySelector('[data-internal-dept]')) {
      const host = document.createElement('div');
      host.innerHTML = switcherMarkup(false);
      const switcher = host.firstElementChild;
      const brand = side.querySelector('.brand');
      if (brand) brand.insertAdjacentElement('afterend', switcher); else side.prepend(switcher);
      wire(switcher);
    }
    const top = document.querySelector('.top');
    if (top && !top.querySelector('.internal-dept-mobile-host')) {
      const host = document.createElement('div');
      host.className = 'internal-dept-mobile-host';
      host.innerHTML = switcherMarkup(true);
      const signout = top.querySelector('.signout');
      if (signout) top.insertBefore(host, signout); else top.appendChild(host);
      wire(host.firstElementChild);
    }
    if (current === 'operations') {
      document.title = 'Rolexa | Operations';
      const sideSubtitle = document.querySelector('.side .brand-copy small');
      if (sideSubtitle) sideSubtitle.textContent = 'Rolexa Operations';
    }
    document.addEventListener('click', () => closeAll());
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAll(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
