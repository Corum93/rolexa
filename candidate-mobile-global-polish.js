(() => {
  if (!/candidate-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaCandidateMobileGlobalPolish) return;
  window.__rolexaCandidateMobileGlobalPolish = true;

  const style = document.createElement('style');
  style.id = 'rxCandidateMobileGlobalPolishStyles';
  style.textContent = `
    @media(max-width:760px){
      html,body{max-width:100%;overflow-x:hidden}
      body *{box-sizing:border-box}
      .main,.content,.page,.card,.form-card,.setup,.setup-hero,.thread-wrap,.chat,.threads{min-width:0;max-width:100%}
      .content{padding:20px 18px 34px!important}
      .page-head{margin-bottom:16px!important}
      .page-head h1{font-size:29px!important;line-height:1.14!important;overflow-wrap:anywhere}
      .page-head p{font-size:14px!important;line-height:1.55!important;max-width:100%}
      .card,.form-card{padding:18px!important;border-radius:19px!important}
      .card h2{font-size:18px!important;line-height:1.25!important;margin-bottom:12px!important}
      .grid,.two,.list,.tracker{gap:12px!important}
      .item-title{font-size:14px!important;line-height:1.35!important;overflow-wrap:anywhere;word-break:normal}
      .item-sub,.mini,.note,.rx-updated{line-height:1.5!important;overflow-wrap:anywhere;word-break:normal}
      .tag{max-width:100%;white-space:normal!important;text-align:center;line-height:1.25!important}
      .small-btn,.primary,.secondary,.danger{min-height:42px;display:inline-flex;align-items:center;justify-content:center}
      .job,.msg,.event,.application{width:100%;max-width:100%;min-width:0}
      .job>div,.msg>div,.event>div,.application>div{min-width:0}
      .profile-card{gap:16px!important}
      .profile-card li,.clean-list li{align-items:flex-start;overflow-wrap:anywhere}
      .profile-card li span,.profile-card li b,.clean-list li span,.clean-list li b{min-width:0;overflow-wrap:anywhere}
      .status-row{padding:12px!important;align-items:flex-start!important}
      .status-row>div:first-child{min-width:0}
      .status-row b{line-height:1.3}
      .status-row span{line-height:1.45}
      .filters input,.filters select,.field input,.field textarea,.field select{font-size:16px!important;max-width:100%}
      .setup-hero{padding:24px 20px!important;border-radius:22px!important}
      .setup-hero h1{font-size:30px!important;line-height:1.1!important}
      .setup-hero p{font-size:14.5px!important;line-height:1.6!important}
      .salary-big{font-size:31px!important;overflow-wrap:anywhere}
      .bars{gap:5px!important}
      .rx-chat-launcher{max-width:calc(100vw - 28px)}
    }

    @media(max-width:420px){
      .content{padding:18px 14px 30px!important}
      .page-head h1{font-size:27px!important}
      .card,.form-card{padding:16px!important;border-radius:17px!important}
      .setup-hero{padding:22px 17px!important}
      .setup-hero h1{font-size:28px!important}
      .grid,.two,.list,.tracker{gap:10px!important}
      .small-btn,.primary,.secondary,.danger{font-size:12px!important;padding-left:12px!important;padding-right:12px!important}
    }
  `;
  document.head.appendChild(style);
})();
