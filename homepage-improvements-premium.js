(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaHomepageImprovementsPremiumV2) return;
  window.__rolexaHomepageImprovementsPremiumV2 = true;

  const section = document.getElementById('improvements');
  if (!section) return;

  section.classList.add('rx-improvements-premium');

  const cards = [...section.querySelectorAll('.improve-card')];
  const icons = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h5M8 16h7"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/><path d="M18 5h3M19.5 3.5v3"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m17.5 6.5 3-3M17.5 3.5h3v3"/></svg>'
  ];

  cards.forEach((card, index) => {
    card.dataset.accent = String(index + 1);
    const num = card.querySelector('.num');
    if (num && !num.querySelector('.rx-improve-icon')) {
      num.innerHTML = `<span class="rx-improve-icon">${icons[index] || icons[0]}</span><span>${num.textContent.trim()}</span>`;
    }
  });

  const style = document.createElement('style');
  style.id = 'rxHomepageImprovementsPremiumStylesV2';
  style.textContent = `
    #improvements.rx-improvements-premium{position:relative;padding:24px 0 60px;background:linear-gradient(180deg,#F2F5FC 0%,#EEF3FF 100%);overflow:hidden}
    #improvements.rx-improvements-premium:before{content:'';position:absolute;width:480px;height:480px;border-radius:50%;right:-240px;top:-260px;background:radial-gradient(circle,rgba(76,116,255,.12),rgba(76,116,255,0) 68%);pointer-events:none}
    #improvements.rx-improvements-premium .sec-head{position:relative;margin-bottom:26px;align-items:flex-end}
    #improvements.rx-improvements-premium .sec-head h2{font-size:34px;line-height:1.12;letter-spacing:-.035em}
    #improvements.rx-improvements-premium .sec-head p{font-size:15.5px;line-height:1.65;max-width:650px;color:#596279}
    #improvements.rx-improvements-premium .improve-grid{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
    #improvements.rx-improvements-premium .improve-card{position:relative;overflow:hidden;border:1px solid rgba(7,16,37,.08);border-radius:24px;padding:26px 26px 25px;background:rgba(255,255,255,.96);box-shadow:0 20px 50px rgba(7,16,37,.07);gap:0;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
    #improvements.rx-improvements-premium .improve-card:before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:#4C74FF}
    #improvements.rx-improvements-premium .improve-card[data-accent="2"]:before{background:#2FAE7A}
    #improvements.rx-improvements-premium .improve-card[data-accent="3"]:before{background:#7C5CFC}
    #improvements.rx-improvements-premium .improve-card:hover{transform:translateY(-4px);box-shadow:0 26px 64px rgba(7,16,37,.11);border-color:rgba(76,116,255,.2)}
    #improvements.rx-improvements-premium .num{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;font-size:13px;color:#8892B0}
    #improvements.rx-improvements-premium .rx-improve-icon{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:#E9EDFF;color:#2946C7}
    #improvements.rx-improvements-premium .improve-card[data-accent="2"] .rx-improve-icon{background:#E1F6EB;color:#176B49}
    #improvements.rx-improvements-premium .improve-card[data-accent="3"] .rx-improve-icon{background:#EEE9FF;color:#6040C9}
    #improvements.rx-improvements-premium .rx-improve-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #improvements.rx-improvements-premium .tag{display:inline-flex;align-items:center;width:max-content;margin-bottom:11px;font-size:10.5px;letter-spacing:.08em;background:#F0F4FF;color:#2946C7;border-radius:999px;padding:6px 9px}
    #improvements.rx-improvements-premium .improve-card[data-accent="2"] .tag{background:#EAF8F1;color:#176B49}
    #improvements.rx-improvements-premium .improve-card[data-accent="3"] .tag{background:#F1EDFF;color:#6040C9}
    #improvements.rx-improvements-premium .improve-card h3{font-size:22px;line-height:1.22;margin-bottom:12px;letter-spacing:-.025em}
    #improvements.rx-improvements-premium .improve-card>p{min-height:68px;font-size:14px;line-height:1.62;color:#596279;margin:0 0 18px}
    #improvements.rx-improvements-premium .improve-list{margin-top:auto;border-top:1px solid rgba(7,16,37,.08);padding-top:17px;gap:11px}
    #improvements.rx-improvements-premium .improve-list li{position:relative;padding-left:27px;display:block;font-size:13.5px;line-height:1.45;color:#26324C}
    #improvements.rx-improvements-premium .improve-list li:before{content:'✓';position:absolute;left:0;top:-1px;width:19px;height:19px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#E1F6EB;color:#176B49;font-size:11px;font-weight:900}
    @media(max-width:900px){#improvements.rx-improvements-premium .improve-grid{grid-template-columns:1fr}#improvements.rx-improvements-premium .improve-card>p{min-height:0}}
    @media(max-width:760px){
      #improvements.rx-improvements-premium{padding:18px 0 44px}
      #improvements.rx-improvements-premium .wrap{padding-left:18px!important;padding-right:18px!important}
      #improvements.rx-improvements-premium .sec-head{margin-bottom:22px}
      #improvements.rx-improvements-premium .sec-head h2{font-size:29px;line-height:1.14}
      #improvements.rx-improvements-premium .sec-head p{font-size:14.5px;line-height:1.58}
      #improvements.rx-improvements-premium .improve-grid{gap:14px}
      #improvements.rx-improvements-premium .improve-card{padding:22px 20px 21px;border-radius:21px}
      #improvements.rx-improvements-premium .improve-card:hover{transform:none}
      #improvements.rx-improvements-premium .num{margin-bottom:18px}
      #improvements.rx-improvements-premium .rx-improve-icon{width:44px;height:44px;border-radius:14px}
      #improvements.rx-improvements-premium .improve-card h3{font-size:21px}
      #improvements.rx-improvements-premium .improve-card>p{font-size:13.8px;margin-bottom:16px}
    }
    @media(max-width:420px){#improvements.rx-improvements-premium .wrap{padding-left:14px!important;padding-right:14px!important}#improvements.rx-improvements-premium .sec-head h2{font-size:27px}#improvements.rx-improvements-premium .improve-card{padding:20px 17px}#improvements.rx-improvements-premium .improve-list li{font-size:13px}}
  `;
  document.head.appendChild(style);
})();