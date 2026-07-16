(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaHomepageHonestyPremium) return;
  window.__rolexaHomepageHonestyPremium = true;

  const mission = document.getElementById('mission');
  const improvements = document.getElementById('improvements');
  if (!mission || !improvements) return;

  mission.classList.add('rx-honesty-premium');
  improvements.classList.add('rx-improvements-tight');

  const cards = [...mission.querySelectorAll('.mission-card')];
  const icons = ['✓', '£', '↔', '↑'];
  const labels = ['01', '02', '03', '04'];
  cards.forEach((card, index) => {
    if (card.querySelector('.rx-honesty-card-top')) return;
    const tag = card.querySelector('.tag');
    const top = document.createElement('div');
    top.className = 'rx-honesty-card-top';
    top.innerHTML = `<span class="rx-honesty-icon">${icons[index] || '✓'}</span><span class="rx-honesty-number">${labels[index] || ''}</span>`;
    card.insertBefore(top, card.firstChild);
    if (tag) tag.classList.add('rx-honesty-tag');
  });

  const style = document.createElement('style');
  style.id = 'rxHomepageHonestyPremiumStyles';
  style.textContent = `
    #mission.rx-honesty-premium{position:relative;padding:54px 0 24px;background:linear-gradient(180deg,#f5f7fc 0%,#f7f9fd 100%)}
    #mission.rx-honesty-premium:before{content:'';position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(76,116,255,.22),transparent)}
    #mission.rx-honesty-premium .sec-head{margin-bottom:24px;align-items:flex-start}
    #mission.rx-honesty-premium .sec-head h2{font-size:34px;line-height:1.14;letter-spacing:-.035em;max-width:820px}
    #mission.rx-honesty-premium .sec-head p{font-size:15.5px;line-height:1.6;max-width:680px;margin-top:10px;color:#626c84}
    #mission.rx-honesty-premium .mission-grid{gap:16px;align-items:stretch}
    #mission.rx-honesty-premium .mission-card{position:relative;overflow:hidden;min-height:242px;padding:24px;border-radius:22px;border:1px solid rgba(10,14,26,.08);box-shadow:0 14px 38px rgba(10,14,26,.045);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;background:linear-gradient(180deg,#fff,#fdfdff)}
    #mission.rx-honesty-premium .mission-card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:#4c74ff}
    #mission.rx-honesty-premium .mission-card:nth-child(2):before{background:#2fae7a}
    #mission.rx-honesty-premium .mission-card:nth-child(3):before{background:#6d5dfc}
    #mission.rx-honesty-premium .mission-card:nth-child(4):before{background:#e0a82e}
    #mission.rx-honesty-premium .mission-card:hover{transform:translateY(-3px);box-shadow:0 22px 46px rgba(10,14,26,.08);border-color:rgba(76,116,255,.18)}
    .rx-honesty-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
    .rx-honesty-icon{width:42px;height:42px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;background:#e9edff;color:#2946c7;font-size:17px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(76,116,255,.08)}
    #mission.rx-honesty-premium .mission-card:nth-child(2) .rx-honesty-icon{background:#e1f6eb;color:#176b49}
    #mission.rx-honesty-premium .mission-card:nth-child(3) .rx-honesty-icon{background:#eeeaff;color:#5b48d6}
    #mission.rx-honesty-premium .mission-card:nth-child(4) .rx-honesty-icon{background:#fff3d6;color:#8a5600}
    .rx-honesty-number{font-family:'Space Grotesk',sans-serif;color:#a2abc0;font-size:12px;font-weight:800;letter-spacing:.08em}
    #mission.rx-honesty-premium .rx-honesty-tag{font-size:10.5px;letter-spacing:.085em;margin-bottom:11px;color:#4c74ff}
    #mission.rx-honesty-premium .mission-card:nth-child(2) .rx-honesty-tag{color:#23835e}
    #mission.rx-honesty-premium .mission-card:nth-child(3) .rx-honesty-tag{color:#5b48d6}
    #mission.rx-honesty-premium .mission-card:nth-child(4) .rx-honesty-tag{color:#9b6a0d}
    #mission.rx-honesty-premium .mission-card h3{font-size:20px;line-height:1.25;margin-bottom:10px;letter-spacing:-.025em}
    #mission.rx-honesty-premium .mission-card p{font-size:13.5px;line-height:1.58;color:#626c84}
    #improvements.rx-improvements-tight{padding-top:20px!important}
    #improvements.rx-improvements-tight .sec-head{margin-bottom:22px}

    @media(max-width:980px){
      #mission.rx-honesty-premium .mission-grid{grid-template-columns:repeat(2,1fr)}
      #mission.rx-honesty-premium .mission-card{min-height:220px}
    }
    @media(max-width:760px){
      #mission.rx-honesty-premium{padding:36px 0 14px}
      #mission.rx-honesty-premium .wrap{padding-left:18px!important;padding-right:18px!important}
      #mission.rx-honesty-premium .sec-head{margin-bottom:18px}
      #mission.rx-honesty-premium .sec-head h2{font-size:29px;line-height:1.16}
      #mission.rx-honesty-premium .sec-head p{font-size:14.5px;line-height:1.55}
      #mission.rx-honesty-premium .mission-grid{grid-template-columns:1fr;gap:13px}
      #mission.rx-honesty-premium .mission-card{min-height:0;padding:21px;border-radius:19px}
      .rx-honesty-card-top{margin-bottom:15px}
      .rx-honesty-icon{width:40px;height:40px}
      #mission.rx-honesty-premium .mission-card h3{font-size:19px}
      #improvements.rx-improvements-tight{padding-top:14px!important}
    }
    @media(max-width:420px){
      #mission.rx-honesty-premium .wrap{padding-left:14px!important;padding-right:14px!important}
      #mission.rx-honesty-premium .sec-head h2{font-size:27px}
      #mission.rx-honesty-premium .mission-card{padding:19px 18px}
    }
  `;
  document.head.appendChild(style);
})();