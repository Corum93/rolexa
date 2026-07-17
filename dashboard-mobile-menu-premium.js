(() => {
  if (window.__rolexaPremiumMobileDashboardMenuV1) return;
  window.__rolexaPremiumMobileDashboardMenuV1 = true;

  const isCandidate = /candidate-dashboard\.html$/.test(location.pathname);
  const isEmployer = /employer-dashboard\.html$/.test(location.pathname);
  if (!isCandidate && !isEmployer) return;

  const icons = {
    overview: '⌂',
    jobSearch: '⌕',
    postJob: '+',
    jobs: '⌕',
    applications: '◎',
    matches: '◎',
    savedJobs: '◇',
    messages: '✉',
    profile: '○',
    companyProfile: '○',
    salary: '£',
    editProfile: '↗',
    signOut: '↪'
  };

  const style = document.createElement('style');
  style.id = 'rxPremiumMobileDashboardMenuStyles';
  style.textContent = `
    @media (max-width:1100px){
      .rx-mobile-dashboard-menu,
      .rx-mobile-dashboard-menu.employer-match{
        left:auto!important;
        right:0!important;
        width:min(92vw,390px)!important;
        max-width:390px!important;
        height:100dvh!important;
        padding:calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom))!important;
        overflow:hidden!important;
        transform:translateX(105%)!important;
        background:
          radial-gradient(circle at 85% 4%,rgba(45,112,255,.20),transparent 28%),
          linear-gradient(180deg,#071127 0%,#081a3f 58%,#07142f 100%)!important;
        border-left:1px solid rgba(255,255,255,.08)!important;
        box-shadow:-24px 0 70px rgba(2,8,24,.42)!important;
      }
      .rx-mobile-dashboard-menu.open,
      .rx-mobile-dashboard-menu.employer-match.open{transform:translateX(0)!important}
      .rx-mobile-dashboard-menu .rx-mobile-menu-head,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-head{
        margin:0 0 14px!important;
        padding:0 2px 14px!important;
        border-bottom:1px solid rgba(255,255,255,.08)!important;
      }
      .rx-mobile-dashboard-menu .rx-mobile-menu-brand,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand{gap:10px!important}
      .rx-mobile-dashboard-menu .rx-mobile-menu-brand-mark,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand-mark{width:44px!important;height:34px!important}
      .rx-mobile-dashboard-menu .rx-mobile-menu-brand-word,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-brand-word{font-size:29px!important}
      .rx-mobile-menu-title{font-size:21px!important}
      .rx-mobile-menu-close{
        width:40px!important;height:40px!important;flex:0 0 40px!important;
        border-color:rgba(255,255,255,.14)!important;
        background:rgba(255,255,255,.07)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important;
      }
      .rx-mobile-menu-account{
        display:grid;grid-template-columns:46px minmax(0,1fr);gap:11px;align-items:center;
        margin:0 0 14px;padding:12px;border:1px solid rgba(141,172,255,.16);border-radius:16px;
        background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.045));
        box-shadow:0 14px 30px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.04)
      }
      .rx-mobile-menu-account-avatar{
        width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;
        overflow:hidden;background:linear-gradient(135deg,#176bff,#789bff);color:#fff;font-weight:900;
        border:1px solid rgba(255,255,255,.18)
      }
      .rx-mobile-menu-account-avatar img{width:100%;height:100%;object-fit:cover}
      .rx-mobile-menu-account-copy{min-width:0}
      .rx-mobile-menu-account-copy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;color:#fff}
      .rx-mobile-menu-account-copy span{display:block;margin-top:3px;font-size:11px;color:#9fb0d7}
      .rx-mobile-menu-links-wrap{height:calc(100dvh - 190px - env(safe-area-inset-top) - env(safe-area-inset-bottom));display:flex;flex-direction:column;min-height:0}
      .rx-mobile-dashboard-menu .rx-mobile-menu-links,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-links{
        display:grid!important;gap:5px!important;padding:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;
        scrollbar-width:none!important;min-height:0!important
      }
      .rx-mobile-menu-links::-webkit-scrollbar{display:none}
      .rx-mobile-dashboard-menu .rx-mobile-menu-link,
      .rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-link{
        position:relative;display:grid!important;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center;
        min-height:48px!important;padding:8px 11px!important;border:1px solid transparent!important;border-radius:13px!important;
        color:#c4d0ed!important;font-size:14px!important;font-weight:800!important;line-height:1.2!important;
        transition:background .16s ease,border-color .16s ease,color .16s ease,transform .16s ease!important
      }
      .rx-mobile-menu-link::before{
        content:attr(data-icon);display:flex;width:34px;height:34px;align-items:center;justify-content:center;
        border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.045);
        color:#91a8e7;font-size:14px;font-weight:900
      }
      .rx-mobile-menu-link.active{
        background:linear-gradient(90deg,rgba(23,107,255,.38),rgba(23,107,255,.13))!important;
        border-color:rgba(111,154,255,.24)!important;color:#fff!important;
        box-shadow:inset 3px 0 0 #4b8aff,0 10px 22px rgba(0,72,211,.14)!important
      }
      .rx-mobile-menu-link.active::before{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.22);color:#fff}
      .rx-mobile-menu-link.sign-out{
        margin-top:8px!important;padding-top:8px!important;border-top:1px solid rgba(255,255,255,.1)!important;
        border-radius:13px!important;color:#ffbfb7!important
      }
      .rx-mobile-menu-link.sign-out::before{color:#ffaaa0;background:rgba(224,83,63,.09);border-color:rgba(224,83,63,.14)}
      .rx-mobile-menu-support-note{
        margin-top:auto;padding:11px 12px 0;color:#8191b8;font-size:10.5px;line-height:1.45;text-align:center
      }
      body.rx-dashboard-menu-open .rx-chat-launcher{display:none!important}
    }
    @media (max-width:420px){
      .rx-mobile-dashboard-menu,.rx-mobile-dashboard-menu.employer-match{width:100vw!important;max-width:none!important}
      .rx-mobile-menu-account{margin-bottom:10px}
      .rx-mobile-dashboard-menu .rx-mobile-menu-link,.rx-mobile-dashboard-menu.employer-match .rx-mobile-menu-link{min-height:46px!important}
    }
  `;
  document.head.appendChild(style);

  function enhanceMenu(){
    const menu = document.getElementById('rxDashboardMobileMenu');
    if (!menu || menu.dataset.rxPremiumReady === 'true') return false;
    menu.dataset.rxPremiumReady = 'true';

    const head = menu.querySelector('.rx-mobile-menu-head');
    const links = menu.querySelector('.rx-mobile-menu-links');
    if (!head || !links) return false;

    if (isCandidate && !head.querySelector('.rx-mobile-menu-brand')) {
      const title = head.querySelector('.rx-mobile-menu-title');
      if (title) title.textContent = 'Rolexa';
    }

    const user = document.querySelector('.topbar .user');
    const avatarSource = user?.querySelector('.avatar, .rx-profile-sync-avatar, img');
    const name = user?.querySelector('b')?.textContent?.trim() || (isEmployer ? 'Employer account' : 'Candidate account');
    const role = isEmployer ? 'Employer workspace' : 'Candidate workspace';

    const account = document.createElement('div');
    account.className = 'rx-mobile-menu-account';
    const avatar = document.createElement('div');
    avatar.className = 'rx-mobile-menu-account-avatar';
    const img = avatarSource?.tagName === 'IMG' ? avatarSource : avatarSource?.querySelector?.('img');
    if (img?.src) {
      const cloned = document.createElement('img');
      cloned.src = img.src;
      cloned.alt = '';
      avatar.appendChild(cloned);
    } else {
      avatar.textContent = name.split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase() || 'R';
    }
    const copy = document.createElement('div');
    copy.className = 'rx-mobile-menu-account-copy';
    copy.innerHTML = `<b>${name.replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]))}</b><span>${role}</span>`;
    account.append(avatar,copy);
    head.insertAdjacentElement('afterend',account);

    const wrap = document.createElement('div');
    wrap.className = 'rx-mobile-menu-links-wrap';
    links.parentNode.insertBefore(wrap,links);
    wrap.appendChild(links);

    links.querySelectorAll('.rx-mobile-menu-link').forEach(item => {
      item.dataset.icon = icons[item.dataset.view] || '•';
    });

    const note = document.createElement('div');
    note.className = 'rx-mobile-menu-support-note';
    note.textContent = 'Need assistance? Close this menu and use Need help?.';
    wrap.appendChild(note);
    return true;
  }

  if (!enhanceMenu()) {
    const observer = new MutationObserver(() => {
      if (enhanceMenu()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),10000);
  }
})();