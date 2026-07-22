(() => {
  if (window.__rolexaCandidateMobileJobSearchPolishV1) return;
  window.__rolexaCandidateMobileJobSearchPolishV1 = true;

  const style = document.createElement('style');
  style.id = 'rxCandidateMobileJobSearchPolishStylesV1';
  style.textContent = `
    @media (max-width:760px){
      #jobSearchPage{min-width:0;overflow-x:hidden}
      #jobSearchPage .page-head{margin-bottom:16px}
      #jobSearchPage .page-head h1{font-size:31px;line-height:1.08}
      #jobSearchPage .page-head p{font-size:14px;line-height:1.5;margin-top:8px}
      #jobSearchPage>.card{padding:16px;border-radius:20px;overflow:hidden}

      #jobSearchPage .filters{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin-bottom:14px!important;min-width:0}
      #jobSearchPage .filters input,
      #jobSearchPage .filters select,
      #jobSearchPage .filters button{width:100%;min-width:0;min-height:48px;font-size:14px}
      #jobSearchPage .filters .primary{justify-content:center;padding:13px 18px}
      #jobSearchPage .rx-verified-filter{width:100%;min-width:0;min-height:46px;justify-content:flex-start!important;gap:10px;padding:11px 13px;white-space:normal!important;overflow:hidden}
      #jobSearchPage .rx-verified-filter input{flex:0 0 18px;width:18px;height:18px}
      #jobSearchPage .rx-verified-filter span{display:block;min-width:0;line-height:1.3;overflow-wrap:anywhere}

      #jobSearchPage .rx-verified-explainer{gap:11px;margin:0 0 14px;padding:14px;border-radius:15px;font-size:12.5px;line-height:1.5;min-width:0}
      #jobSearchPage .rx-verified-explainer>div{min-width:0;overflow-wrap:anywhere}
      #jobSearchPage .rx-verified-explainer strong{font-size:13px;line-height:1.3;margin-bottom:4px}
      #jobSearchPage .rx-verified-explainer-icon{width:26px;height:26px;flex-basis:26px}

      #jobSearchPage #jobResults{display:grid;gap:12px;min-width:0}
      #jobSearchPage #jobResults>.job{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;gap:11px!important;align-items:start!important;padding:15px!important;border-radius:17px!important;min-width:0;overflow:hidden}
      #jobSearchPage #jobResults>.job>.logo{width:46px;height:46px;border-radius:12px;font-size:17px}
      #jobSearchPage #jobResults>.job>div:nth-child(2){min-width:0}
      #jobSearchPage #jobResults .item-title{font-size:15px;line-height:1.25;overflow-wrap:anywhere}
      #jobSearchPage #jobResults .item-sub{font-size:12.5px;line-height:1.45;margin-top:4px;white-space:normal;overflow-wrap:anywhere;word-break:normal}

      #jobSearchPage #jobResults .job-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important;justify-content:stretch!important;align-items:center;margin-top:2px;min-width:0}
      #jobSearchPage #jobResults .job-actions .tag,
      #jobSearchPage #jobResults .job-actions .rx-candidate-verified-badge{width:100%;min-width:0;justify-content:center;text-align:center;white-space:normal;line-height:1.2;padding:7px 8px}
      #jobSearchPage #jobResults .job-actions .small-btn{width:100%;min-height:40px;padding:9px 10px;text-align:center}

      #jobSearchPage #jobResults .rx-candidate-trust{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin-top:2px!important;padding:13px!important;border-radius:14px!important;min-width:0}
      #jobSearchPage #jobResults .rx-candidate-trust>div{min-width:0}
      #jobSearchPage #jobResults .rx-candidate-trust small{font-size:8.5px;line-height:1.25;margin-bottom:4px}
      #jobSearchPage #jobResults .rx-candidate-trust b{font-size:11.5px;line-height:1.35;overflow-wrap:anywhere}
      #jobSearchPage #jobResults .rx-candidate-trust-note{grid-column:1/-1!important;font-size:10.8px;line-height:1.45;padding-top:2px}

      body.rx-job-search-active .rx-chat-launcher{right:12px!important;bottom:82px!important;width:48px!important;height:48px!important;padding:0!important;justify-content:center!important;border-radius:50%!important}
      body.rx-job-search-active .rx-chat-launcher>span:last-child{display:none!important}
      body.rx-job-search-active .rx-chat-launcher .rx-chat-dot{width:11px;height:11px;margin:0}
    }

    @media (max-width:390px){
      #jobSearchPage>.card{padding:13px}
      #jobSearchPage #jobResults>.job{padding:13px!important;grid-template-columns:42px minmax(0,1fr)!important}
      #jobSearchPage #jobResults>.job>.logo{width:42px;height:42px}
      #jobSearchPage #jobResults .job-actions{grid-template-columns:1fr 1fr}
      #jobSearchPage #jobResults .rx-candidate-trust{grid-template-columns:1fr!important}
      #jobSearchPage #jobResults .rx-candidate-trust-note{grid-column:1!important}
    }
  `;
  document.head.appendChild(style);

  const syncViewClass = () => {
    const active = document.getElementById('jobSearchPage')?.classList.contains('active');
    document.body.classList.toggle('rx-job-search-active', Boolean(active));
  };

  const start = () => {
    syncViewClass();
    const page = document.getElementById('jobSearchPage');
    if (page) new MutationObserver(syncViewClass).observe(page, { attributes:true, attributeFilter:['class'] });
    document.addEventListener('click', () => setTimeout(syncViewClass, 0));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();