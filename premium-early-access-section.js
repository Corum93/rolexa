(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumAccessSection) return;
  window.__rolexaPremiumAccessSection = true;

  const section = document.getElementById('jobs');
  if (!section) return;

  const style = document.createElement('style');
  style.textContent = `
    #jobs{position:relative;padding:42px 0 46px!important;background:linear-gradient(180deg,#f7f9ff 0%,#f3f6ff 100%)}
    #jobs:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 15%,rgba(76,116,255,.09),transparent 34%),radial-gradient(circle at 86% 20%,rgba(47,174,122,.07),transparent 30%);pointer-events:none}
    #jobs .wrap{position:relative}
    #jobs .sec-head{margin-bottom:22px!important;align-items:flex-start}
    #jobs .sec-head>div{max-width:780px}
    #jobs .sec-head>div:before{content:'Start with Rolexa';display:inline-flex;align-items:center;border:1px solid rgba(76,116,255,.2);background:#fff;color:#2946c7;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px;box-shadow:0 8px 24px rgba(10,14,26,.05)}
    #jobs .sec-head h2{font-size:34px!important;line-height:1.15;letter-spacing:-.025em;margin-bottom:8px!important}
    #jobs .sec-head p{max-width:720px!important;font-size:15px!important;line-height:1.62!important;color:#626c82!important}
    #jobs .building-banner{position:relative;overflow:hidden;border:1px solid rgba(10,14,26,.08)!important;border-radius:26px!important;padding:34px!important;background:linear-gradient(145deg,#0b1228 0%,#17275b 58%,#274bc8 100%)!important;box-shadow:0 26px 70px rgba(10,14,26,.16)!important;text-align:left!important;color:#fff}
    #jobs .building-banner:before{content:'';position:absolute;width:360px;height:360px;border-radius:50%;right:-130px;top:-180px;background:rgba(255,255,255,.09)}
    #jobs .building-banner:after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;right:110px;bottom:-170px;background:rgba(76,116,255,.2)}
    #jobs .building-banner>*{position:relative;z-index:1}
    #jobs .building-badge{display:inline-flex!important;align-items:center!important;width:auto!important;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.2)!important;color:#dbe4ff!important;border-radius:999px!important;padding:7px 11px!important;font-size:10.5px!important;font-weight:900!important;letter-spacing:.075em!important;text-transform:uppercase!important;margin:0 0 16px!important}
    #jobs .building-banner h3{font-family:'Space Grotesk',sans-serif!important;font-size:31px!important;line-height:1.18!important;letter-spacing:-.02em!important;color:#fff!important;max-width:620px;margin:0 0 12px!important}
    #jobs .building-banner p{max-width:680px!important;color:rgba(255,255,255,.78)!important;font-size:15px!important;line-height:1.65!important;margin:0 0 24px!important}
    #jobs .rx-access-actions{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px}
    #jobs .rx-access-primary,#jobs .rx-access-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 19px;font-size:14px;font-weight:850;text-decoration:none;transition:.2s ease}
    #jobs .rx-access-primary{background:#fff;color:#0a0e1a;box-shadow:0 12px 28px rgba(0,0,0,.14)}
    #jobs .rx-access-secondary{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25)}
    #jobs .rx-access-primary:hover,#jobs .rx-access-secondary:hover{transform:translateY(-1px)}
    #jobs .rx-access-points{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:840px}
    #jobs .rx-access-point{display:flex;gap:9px;align-items:flex-start;padding:12px 13px;border-radius:14px;background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.11);font-size:12.5px;line-height:1.45;color:rgba(255,255,255,.84)}
    #jobs .rx-access-point:before{content:'✓';display:grid;place-items:center;flex:0 0 20px;width:20px;height:20px;border-radius:50%;background:#dff5ea;color:#168255;font-weight:900;font-size:11px;margin-top:1px}
    #jobs .mini-note{display:none!important}

    @media(max-width:780px){
      #jobs{padding:28px 0 34px!important}
      #jobs .wrap{padding-left:18px!important;padding-right:18px!important}
      #jobs .sec-head{margin-bottom:18px!important}
      #jobs .sec-head h2{font-size:29px!important}
      #jobs .sec-head p{font-size:14.5px!important;line-height:1.55!important}
      #jobs .building-banner{padding:26px 22px!important;border-radius:22px!important}
      #jobs .building-banner h3{font-size:27px!important}
      #jobs .building-banner p{font-size:14px!important}
      #jobs .rx-access-actions{display:grid;grid-template-columns:1fr;gap:10px}
      #jobs .rx-access-primary,#jobs .rx-access-secondary{width:100%}
      #jobs .rx-access-points{grid-template-columns:1fr;gap:8px}
    }
    @media(max-width:420px){
      #jobs .wrap{padding-left:14px!important;padding-right:14px!important}
      #jobs .building-banner{padding:23px 18px!important;border-radius:19px!important}
      #jobs .building-banner h3{font-size:25px!important}
      #jobs .rx-access-primary,#jobs .rx-access-secondary{font-size:13.5px;padding:12px 14px}
    }
  `;
  document.head.appendChild(style);

  const headTitle = section.querySelector('.sec-head h2');
  const headCopy = section.querySelector('.sec-head p');
  const banner = section.querySelector('.building-banner');
  if (!banner) return;

  if (headTitle) headTitle.textContent = 'Choose how you want to use Rolexa';
  if (headCopy) headCopy.textContent = 'Create a live account or explore the platform first. Candidate and employer journeys are kept separate so each side gets the right tools from the start.';

  banner.innerHTML = `
    <div class="building-badge">Live account access</div>
    <h3>Start building better hiring outcomes with Rolexa.</h3>
    <p>Create your candidate profile to discover and track opportunities, or open an employer workspace to publish roles and manage applicants in one place.</p>
    <div class="rx-access-actions">
      <a class="rx-access-primary" href="candidate-login.html">Create candidate account</a>
      <a class="rx-access-secondary" href="employer-login.html">Create employer account</a>
    </div>
    <div class="rx-access-points">
      <div class="rx-access-point">One profile for applications and career information</div>
      <div class="rx-access-point">Clear status updates and direct conversations</div>
      <div class="rx-access-point">Dedicated hiring tools for employers</div>
    </div>
  `;
})();