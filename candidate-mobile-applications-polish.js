(() => {
  if (window.__rolexaCandidateMobileApplicationsPolishV1) return;
  window.__rolexaCandidateMobileApplicationsPolishV1 = true;
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  const style = document.createElement('style');
  style.id = 'rxCandidateMobileApplicationsPolishStylesV1';
  style.textContent = `
    @media (max-width:760px){
      #applicationsPage .card{padding:14px!important;border-radius:18px!important;overflow:hidden}
      #applicationsPage #applicationsList{gap:14px!important}
      #applicationsPage .application.rx-app-card-live{
        display:grid!important;
        grid-template-columns:52px minmax(0,1fr)!important;
        gap:12px!important;
        align-items:start!important;
        width:100%!important;
        min-width:0!important;
        padding:16px!important;
        border-radius:18px!important;
        overflow:hidden!important;
      }
      #applicationsPage .rx-app-card-live .logo{
        width:52px!important;
        height:52px!important;
        border-radius:14px!important;
        font-size:18px!important;
      }
      #applicationsPage .rx-app-body{min-width:0!important;width:100%!important}
      #applicationsPage .item-title{font-size:16px!important;line-height:1.25!important;overflow-wrap:anywhere}
      #applicationsPage .item-sub{font-size:13px!important;line-height:1.45!important;margin-top:4px!important;overflow-wrap:anywhere}
      #applicationsPage .rx-updated{font-size:12px!important;line-height:1.4!important;margin-top:5px!important}
      #applicationsPage .rx-timeline{
        grid-column:1/-1!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;
        width:100%!important;
        margin-top:14px!important;
        align-items:stretch!important;
      }
      #applicationsPage .rx-step{
        min-width:0!important;
        width:100%!important;
        justify-content:center!important;
        gap:5px!important;
        padding:9px 7px!important;
        border:1px solid rgba(7,16,37,.09)!important;
        border-radius:13px!important;
        background:#fff!important;
        font-size:11px!important;
        line-height:1.15!important;
        text-align:center!important;
        white-space:nowrap!important;
      }
      #applicationsPage .rx-step.done{background:#EEF9F4!important;border-color:rgba(34,160,107,.18)!important}
      #applicationsPage .rx-step.current{background:#F0F4FF!important;border-color:rgba(23,107,255,.2)!important}
      #applicationsPage .rx-step.rejected{background:#FFF5F2!important;border-color:rgba(224,83,63,.2)!important}
      #applicationsPage .rx-step.withdrawn{background:#F5F7FC!important;border-color:rgba(107,114,128,.2)!important}
      #applicationsPage .rx-dot{width:9px!important;height:9px!important;flex:0 0 auto!important;box-shadow:0 0 0 3px rgba(216,228,251,.65)!important}
      #applicationsPage .rx-line{display:none!important}
      #applicationsPage .rx-candidate-actions{
        grid-column:1/-1!important;
        width:100%!important;
        justify-content:flex-start!important;
        margin-top:2px!important;
      }
      #applicationsPage .rx-withdraw-btn{
        min-height:42px!important;
        padding:10px 16px!important;
        font-size:13px!important;
      }
      #applicationsPage .rx-app-card-live > .tag{
        grid-column:1/-1!important;
        justify-self:start!important;
        margin-top:2px!important;
        white-space:normal!important;
      }
    }
    @media (max-width:420px){
      #applicationsPage .card{padding:10px!important}
      #applicationsPage .application.rx-app-card-live{grid-template-columns:46px minmax(0,1fr)!important;padding:14px 12px!important;gap:10px!important}
      #applicationsPage .rx-app-card-live .logo{width:46px!important;height:46px!important;border-radius:13px!important}
      #applicationsPage .rx-timeline{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
      #applicationsPage .rx-step{font-size:10.5px!important;padding:8px 6px!important}
    }
  `;
  document.head.appendChild(style);
})();