(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumSalaryExplorer) return;
  window.__rolexaPremiumSalaryExplorer = true;

  const style = document.createElement('style');
  style.textContent = `
    #explorer{position:relative;padding:52px 0 54px!important;background:linear-gradient(180deg,#f5f7fc 0%,#f1f5ff 100%)}
    #explorer .sec-head{align-items:flex-start;margin-bottom:24px}
    #explorer .sec-head>div{max-width:720px}
    #explorer .sec-head:before{content:'UK salary guidance';display:inline-flex;align-items:center;width:max-content;background:#e9edff;color:#2946c7;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;margin-bottom:13px}
    #explorer .sec-head h2{font-size:36px;line-height:1.08;color:#0a0e1a}
    #explorer .sec-head p{font-size:15px;line-height:1.65;color:#5a647a;max-width:680px}
    #explorer .explorer{position:relative;overflow:hidden;border:1px solid rgba(23,107,255,.12);border-radius:28px;padding:28px;background:rgba(255,255,255,.92);box-shadow:0 24px 65px rgba(7,16,37,.09)}
    #explorer .explorer:before{content:'';position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#176bff,#4c74ff,#8b5cf6)}
    .rx-salary-summary{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px;padding:17px 18px;border-radius:18px;background:linear-gradient(135deg,#071025,#142657);color:#fff}
    .rx-salary-summary-copy{min-width:0}
    .rx-salary-summary-kicker{font-size:10.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#9eb5ff;margin-bottom:5px}
    .rx-salary-summary-title{font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:700}
    .rx-salary-summary-note{font-size:12.5px;line-height:1.45;color:#c7d3ff;margin-top:4px}
    .rx-salary-summary-badge{flex:0 0 auto;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.1);border-radius:999px;padding:9px 13px;font-size:12px;font-weight:900;color:#fff}
    #explorer .explorer-controls{display:flex;gap:9px;flex-wrap:wrap;margin:0 0 24px;padding-bottom:22px;border-bottom:1px solid rgba(7,16,37,.08)}
    #explorer .chip{border:1px solid rgba(7,16,37,.09);background:#f5f7fc;color:#24345f;border-radius:999px;padding:10px 16px;font-size:12.5px;font-weight:800;transition:transform .16s ease,box-shadow .16s ease,background .16s ease,color .16s ease}
    #explorer .chip:hover{transform:translateY(-1px);border-color:rgba(23,107,255,.28);box-shadow:0 7px 18px rgba(23,107,255,.08)}
    #explorer .chip.active{background:#071025;color:#fff;border-color:#071025;box-shadow:0 10px 24px rgba(7,16,37,.18)}
    #explorer .bracket-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}
    #explorer .bracket-card{position:relative;overflow:hidden;background:linear-gradient(180deg,#fff,#f7f9ff);border:1px solid rgba(7,16,37,.08);border-radius:18px;padding:20px;min-height:112px;display:flex;flex-direction:column;justify-content:center;box-shadow:0 10px 25px rgba(7,16,37,.045);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
    #explorer .bracket-card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#176bff;opacity:.85}
    #explorer .bracket-card:nth-child(2):before{background:#2fae7a}
    #explorer .bracket-card:nth-child(3):before{background:#8b5cf6}
    #explorer .bracket-card:nth-child(4):before{background:#e58a00}
    #explorer .bracket-card:nth-child(5):before{background:#0ea5e9}
    #explorer .bracket-card:nth-child(6):before{background:#ec4899}
    #explorer .bracket-card:nth-child(7):before{background:#071025}
    #explorer .bracket-card:hover{transform:translateY(-2px);box-shadow:0 17px 34px rgba(7,16,37,.08);border-color:rgba(23,107,255,.2)}
    #explorer .bracket-card .lvl{font-size:10.5px;font-weight:900;letter-spacing:.075em;color:#5871cf;margin-bottom:8px}
    #explorer .bracket-card .rng{font-size:22px;line-height:1.15;color:#071025;letter-spacing:-.025em}
    #explorer .bracket-note{margin-top:22px;padding:14px 16px;border-radius:14px;background:#f6f8fd;color:#77829b;font-size:11.8px;line-height:1.55}
    @media(max-width:1000px){
      #explorer .bracket-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media(max-width:760px){
      #explorer{padding:36px 0 38px!important}
      #explorer .wrap{padding-left:18px!important;padding-right:18px!important}
      #explorer .sec-head{margin-bottom:19px}
      #explorer .sec-head:before{font-size:10px;padding:6px 10px;margin-bottom:10px}
      #explorer .sec-head h2{font-size:29px}
      #explorer .sec-head p{font-size:14px;line-height:1.55}
      #explorer .explorer{padding:20px 18px;border-radius:22px}
      .rx-salary-summary{display:block;padding:16px;margin-bottom:17px}
      .rx-salary-summary-title{font-size:17px}
      .rx-salary-summary-badge{display:inline-flex;margin-top:12px;padding:8px 11px}
      #explorer .explorer-controls{display:flex;flex-wrap:nowrap;overflow-x:auto;margin-left:-2px;margin-right:-2px;padding:0 2px 17px;scrollbar-width:none}
      #explorer .explorer-controls::-webkit-scrollbar{display:none}
      #explorer .chip{flex:0 0 auto;padding:10px 14px}
      #explorer .bracket-grid{grid-template-columns:1fr;gap:10px}
      #explorer .bracket-card{min-height:auto;padding:17px 18px;border-radius:16px}
      #explorer .bracket-card .rng{font-size:20px}
      #explorer .bracket-note{font-size:11.5px;margin-top:17px;padding:13px}
    }
    @media(max-width:420px){
      #explorer .wrap{padding-left:14px!important;padding-right:14px!important}
      #explorer .explorer{padding:18px 15px}
      #explorer .sec-head h2{font-size:27px}
    }
  `;
  document.head.appendChild(style);

  function updateSummary(){
    const explorer = document.querySelector('#explorer .explorer');
    const controls = document.getElementById('region-chips');
    if (!explorer || !controls) return;
    let summary = explorer.querySelector('.rx-salary-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'rx-salary-summary';
      explorer.insertBefore(summary, controls);
    }
    const active = controls.querySelector('.chip.active')?.textContent?.trim() || 'London';
    summary.innerHTML = `<div class="rx-salary-summary-copy"><div class="rx-salary-summary-kicker">Selected market</div><div class="rx-salary-summary-title">${active} salary outlook</div><div class="rx-salary-summary-note">Indicative full-time annual pay guidance across seven career stages.</div></div><div class="rx-salary-summary-badge">Entry level → C-suite</div>`;
  }

  const originalSelectRegion = window.selectRegion;
  if (typeof originalSelectRegion === 'function') {
    window.selectRegion = function(name){
      originalSelectRegion(name);
      updateSummary();
    };
  }

  function init(){
    const section = document.getElementById('explorer');
    if (!section) return;
    const paragraph = section.querySelector('.sec-head p');
    if (paragraph) paragraph.textContent = 'Explore indicative UK salary ranges by region and career level. Select a market to compare how pay guidance changes from entry level through to executive leadership.';
    updateSummary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();