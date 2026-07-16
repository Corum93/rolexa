(() => {
  if (window.__rolexaPremiumHonestySection) return;
  window.__rolexaPremiumHonestySection = true;
  if (!/\/(index\.html)?$/.test(location.pathname)) return;

  const findSection = () => {
    const heading = [...document.querySelectorAll('h1,h2,h3')].find(el =>
      /Built for a job market that needs more honesty/i.test(el.textContent || '')
    );
    return heading?.closest('section') || heading?.parentElement?.parentElement || null;
  };

  const enhance = () => {
    const section = findSection();
    if (!section || section.dataset.rxHonestyPremium === 'true') return false;
    section.dataset.rxHonestyPremium = 'true';
    section.classList.add('rx-honesty-premium');

    const heading = [...section.querySelectorAll('h1,h2,h3')].find(el =>
      /Built for a job market that needs more honesty/i.test(el.textContent || '')
    );
    const intro = heading?.nextElementSibling;
    const cards = [...section.querySelectorAll('article, .card')].filter(card =>
      /STATUS CLARITY|PAY TRANSPARENCY|DIRECT CONTACT|WHOLE CAREER/i.test(card.textContent || '')
    );

    if (heading) heading.classList.add('rx-honesty-title');
    if (intro) intro.classList.add('rx-honesty-intro');

    const meta = [
      ['01','Application clarity','◉','blue'],
      ['02','Pay transparency','£','green'],
      ['03','Direct contact','↔','purple'],
      ['04','Whole career','↗','orange']
    ];

    cards.slice(0,4).forEach((card,index) => {
      card.classList.add('rx-honesty-card', `rx-honesty-${meta[index][3]}`);
      const kicker = [...card.querySelectorAll('*')].find(el =>
        el.children.length === 0 && /STATUS CLARITY|PAY TRANSPARENCY|DIRECT CONTACT|WHOLE CAREER/i.test(el.textContent || '')
      );
      if (kicker) kicker.classList.add('rx-honesty-kicker');
      if (!card.querySelector('.rx-honesty-card-top')) {
        const top = document.createElement('div');
        top.className = 'rx-honesty-card-top';
        top.innerHTML = `<span class="rx-honesty-icon">${meta[index][2]}</span><span class="rx-honesty-number">${meta[index][0]}</span>`;
        card.prepend(top);
      }
    });
    return true;
  };

  const style = document.createElement('style');
  style.id = 'rxPremiumHonestyStyles';
  style.textContent = `
    .rx-honesty-premium{padding-top:58px!important;padding-bottom:54px!important;background:linear-gradient(180deg,#f7f9fe 0%,#f2f5fc 100%)!important}
    .rx-honesty-premium .rx-honesty-title{font-family:'Space Grotesk',Inter,sans-serif!important;font-size:42px!important;line-height:1.08!important;letter-spacing:-.035em!important;margin-bottom:12px!important;color:#071025!important}
    .rx-honesty-premium .rx-honesty-intro{max-width:760px!important;font-size:17px!important;line-height:1.65!important;color:#626b80!important;margin-bottom:34px!important}
    .rx-honesty-premium .rx-honesty-card{position:relative!important;overflow:hidden!important;border:1px solid rgba(7,16,37,.08)!important;border-radius:24px!important;padding:26px 25px 28px!important;background:#fff!important;box-shadow:0 18px 50px rgba(7,16,37,.07)!important;transition:transform .18s ease,box-shadow .18s ease!important;min-height:290px!important}
    .rx-honesty-premium .rx-honesty-card:before{content:'';position:absolute;inset:0 0 auto;height:4px;background:#176bff}
    .rx-honesty-premium .rx-honesty-green:before{background:#22a06b}
    .rx-honesty-premium .rx-honesty-purple:before{background:#7657ff}
    .rx-honesty-premium .rx-honesty-orange:before{background:#e58a00}
    .rx-honesty-premium .rx-honesty-card:hover{transform:translateY(-4px);box-shadow:0 24px 60px rgba(7,16,37,.11)!important}
    .rx-honesty-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
    .rx-honesty-icon{width:46px;height:46px;border-radius:15px;display:inline-flex;align-items:center;justify-content:center;background:#eaf0ff;color:#176bff;font-size:19px;font-weight:900}
    .rx-honesty-green .rx-honesty-icon{background:#e4f7ee;color:#178457}
    .rx-honesty-purple .rx-honesty-icon{background:#eeeaff;color:#6846e8}
    .rx-honesty-orange .rx-honesty-icon{background:#fff2dc;color:#b66b00}
    .rx-honesty-number{font-family:'Space Grotesk',Inter,sans-serif;color:#a5aec4;font-size:13px;font-weight:900;letter-spacing:.08em}
    .rx-honesty-premium .rx-honesty-kicker{font-size:11px!important;font-weight:900!important;letter-spacing:.09em!important;text-transform:uppercase!important;color:#176bff!important;margin-bottom:12px!important}
    .rx-honesty-premium .rx-honesty-green .rx-honesty-kicker{color:#178457!important}
    .rx-honesty-premium .rx-honesty-purple .rx-honesty-kicker{color:#6846e8!important}
    .rx-honesty-premium .rx-honesty-orange .rx-honesty-kicker{color:#b66b00!important}
    .rx-honesty-premium .rx-honesty-card h3,.rx-honesty-premium .rx-honesty-card h2{font-family:'Space Grotesk',Inter,sans-serif!important;font-size:22px!important;line-height:1.18!important;letter-spacing:-.025em!important;color:#071025!important;margin-bottom:13px!important}
    .rx-honesty-premium .rx-honesty-card p{font-size:14.5px!important;line-height:1.65!important;color:#626b80!important}
    @media(max-width:1100px){
      .rx-honesty-premium .wrap>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    }
    @media(max-width:760px){
      .rx-honesty-premium{padding-top:40px!important;padding-bottom:40px!important}
      .rx-honesty-premium .wrap{padding-left:18px!important;padding-right:18px!important}
      .rx-honesty-premium .rx-honesty-title{font-size:31px!important}
      .rx-honesty-premium .rx-honesty-intro{font-size:15px!important;margin-bottom:24px!important}
      .rx-honesty-premium .wrap>div:last-child{grid-template-columns:1fr!important;gap:15px!important}
      .rx-honesty-premium .rx-honesty-card{min-height:auto!important;padding:22px 20px 24px!important;border-radius:20px!important}
      .rx-honesty-card-top{margin-bottom:17px}
      .rx-honesty-icon{width:42px;height:42px;border-radius:13px}
    }
    @media(max-width:420px){
      .rx-honesty-premium .wrap{padding-left:14px!important;padding-right:14px!important}
      .rx-honesty-premium .rx-honesty-title{font-size:28px!important}
      .rx-honesty-premium .rx-honesty-card{padding:20px 18px 22px!important}
    }
  `;
  document.head.appendChild(style);

  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),10000);
  }
})();