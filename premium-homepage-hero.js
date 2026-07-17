(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumHomepageHero) return;
  window.__rolexaPremiumHomepageHero = true;

  if (!document.querySelector('link[data-rx-mobile-premium-sync]')) {
    const mobileSync = document.createElement('link');
    mobileSync.rel = 'stylesheet';
    mobileSync.href = 'mobile-premium-sync.css?v=1';
    mobileSync.dataset.rxMobilePremiumSync = 'true';
    document.head.appendChild(mobileSync);
  }

  const hero = document.querySelector('.hero');
  const wrap = hero?.querySelector('.wrap');
  if (!hero || !wrap) return;

  const style = document.createElement('style');
  style.id = 'rxPremiumHomepageHeroStyles';
  style.textContent = `
    .hero{position:relative;overflow:hidden;padding:72px 0 66px!important;background:radial-gradient(circle at 82% 20%,rgba(76,116,255,.24),transparent 34%),linear-gradient(145deg,#1a275c 0%,#0a0e1a 58%,#071025 100%)!important}
    .hero:before{content:'';position:absolute;width:520px;height:520px;border-radius:50%;right:-220px;bottom:-300px;background:rgba(255,255,255,.035);pointer-events:none}
    .rx-hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(360px,.88fr);gap:62px;align-items:center}
    .rx-hero-copy{min-width:0}
    .rx-hero-eyebrow{display:inline-flex;align-items:center;gap:8px;color:#a9bdff;font-size:12px;font-weight:850;letter-spacing:.095em;text-transform:uppercase;margin-bottom:18px}
    .rx-hero-eyebrow:before{content:'';width:30px;height:2px;border-radius:99px;background:#4c74ff}
    .rx-hero-copy h1{color:#fff;font-family:'Space Grotesk',sans-serif;font-size:58px;line-height:1.02;letter-spacing:-.045em;max-width:760px;margin:0}
    .rx-hero-copy h1 span{color:#8ca6ff}
    .rx-hero-copy>p{color:#c7d3ff;font-size:17px;line-height:1.68;max-width:680px;margin:22px 0 0}
    .rx-hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:30px}
    .rx-hero-primary,.rx-hero-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:14px 22px;font-size:14px;font-weight:850;text-decoration:none;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
    .rx-hero-primary{background:#4c74ff;color:#fff;box-shadow:0 16px 34px rgba(76,116,255,.27)}
    .rx-hero-primary:hover{background:#6f8eff;transform:translateY(-1px)}
    .rx-hero-secondary{background:rgba(255,255,255,.07);color:#fff;border:1px solid rgba(255,255,255,.2)}
    .rx-hero-secondary:hover{background:rgba(255,255,255,.12);transform:translateY(-1px)}
    .rx-hero-demo-link{display:inline-flex;align-items:center;gap:7px;color:#c7d3ff;font-size:13px;font-weight:750;text-decoration:none;margin-top:17px}
    .rx-hero-demo-link:hover{color:#fff}
    .rx-hero-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:34px;max-width:760px}
    .rx-hero-proof-item{border-top:1px solid rgba(255,255,255,.14);padding-top:14px}
    .rx-hero-proof-item b{display:block;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:15px;line-height:1.2}
    .rx-hero-proof-item span{display:block;color:#94a3c8;font-size:12px;line-height:1.45;margin-top:5px}
    .rx-journey-card{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.13),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.16);border-radius:28px;padding:24px;box-shadow:0 28px 70px rgba(0,0,0,.3);backdrop-filter:blur(18px)}
    .rx-journey-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:20px}
    .rx-journey-title{color:#fff;font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:750}
    .rx-journey-pill{display:inline-flex;border-radius:999px;background:rgba(47,174,122,.18);color:#78e1b6;border:1px solid rgba(120,225,182,.22);padding:6px 10px;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}
    .rx-journey-list{display:grid;gap:10px}
    .rx-journey-step{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;background:rgba(7,16,37,.48);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:13px}
    .rx-journey-icon{width:42px;height:42px;border-radius:13px;background:#4c74ff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900}
    .rx-journey-step:nth-child(2) .rx-journey-icon{background:#6d5ce7}
    .rx-journey-step:nth-child(3) .rx-journey-icon{background:#2fae7a}
    .rx-journey-step:nth-child(4) .rx-journey-icon{background:#e58a00}
    .rx-journey-copy b{display:block;color:#fff;font-size:13.5px}
    .rx-journey-copy span{display:block;color:#aab6d8;font-size:11.5px;line-height:1.4;margin-top:3px}
    .rx-journey-status{font-size:10px;font-weight:850;color:#c7d3ff;white-space:nowrap}
    .rx-journey-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgba(255,255,255,.1);margin-top:18px;padding-top:16px;color:#aab6d8;font-size:11.5px}
    .rx-journey-match{display:inline-flex;align-items:center;gap:8px;color:#fff;font-weight:800}
    .rx-journey-match strong{font-family:'Space Grotesk',sans-serif;font-size:20px;color:#8ca6ff}
    @media(max-width:980px){
      .rx-hero-grid{grid-template-columns:1fr;gap:36px}
      .rx-hero-copy h1{font-size:50px;max-width:800px}
      .rx-journey-card{max-width:720px}
    }
    @media(max-width:760px){
      .hero{padding:44px 0 42px!important}
      .hero .wrap{padding-left:18px!important;padding-right:18px!important}
      .rx-hero-grid{gap:30px}
      .rx-hero-eyebrow{font-size:10.5px;margin-bottom:15px}
      .rx-hero-copy h1{font-size:40px;line-height:1.04}
      .rx-hero-copy>p{font-size:15px;line-height:1.6;margin-top:18px}
      .rx-hero-actions{display:grid;grid-template-columns:1fr;margin-top:24px}
      .rx-hero-primary,.rx-hero-secondary{width:100%;padding:14px 18px}
      .rx-hero-demo-link{margin-top:14px}
      .rx-hero-proof{grid-template-columns:1fr;gap:11px;margin-top:28px}
      .rx-hero-proof-item{display:grid;grid-template-columns:135px 1fr;gap:12px;align-items:start;padding-top:11px}
      .rx-hero-proof-item span{margin-top:0}
      .rx-journey-card{padding:18px;border-radius:22px}
      .rx-journey-step{grid-template-columns:38px minmax(0,1fr);padding:12px}
      .rx-journey-icon{width:38px;height:38px;border-radius:11px}
      .rx-journey-status{grid-column:2}
      .rx-journey-foot{align-items:flex-end}
    }
    @media(max-width:420px){
      .hero .wrap{padding-left:14px!important;padding-right:14px!important}
      .rx-hero-copy h1{font-size:35px}
      .rx-hero-copy>p{font-size:14.5px}
      .rx-hero-proof-item{grid-template-columns:1fr;gap:3px}
      .rx-journey-top{align-items:flex-start}
      .rx-journey-title{font-size:16px}
    }
  `;
  document.head.appendChild(style);

  wrap.innerHTML = `
    <div class="rx-hero-grid">
      <div class="rx-hero-copy">
        <div class="rx-hero-eyebrow">One transparent hiring platform</div>
        <h1>Find the right role. <span>Hire the right person.</span></h1>
        <p>Rolexa brings job discovery, intelligent matching, applications and direct communication into one clear hiring experience for candidates and employers across the UK.</p>
        <div class="rx-hero-actions">
          <a class="rx-hero-primary" href="candidate-login.html">Create candidate profile</a>
          <a class="rx-hero-secondary" href="employer-login.html">Hire with Rolexa</a>
        </div>
        <a class="rx-hero-demo-link" href="#role-demo-explorer">Explore the candidate and employer demos <span aria-hidden="true">→</span></a>
        <div class="rx-hero-proof">
          <div class="rx-hero-proof-item"><b>One profile</b><span>Build it once and use it across relevant applications.</span></div>
          <div class="rx-hero-proof-item"><b>Clear tracking</b><span>Know exactly where every application stands.</span></div>
          <div class="rx-hero-proof-item"><b>Direct conversations</b><span>Candidates and employers communicate in one place.</span></div>
        </div>
      </div>
      <aside class="rx-journey-card" aria-label="Rolexa hiring journey preview">
        <div class="rx-journey-top"><div class="rx-journey-title">Your Rolexa journey</div><span class="rx-journey-pill">Live platform</span></div>
        <div class="rx-journey-list">
          <div class="rx-journey-step"><div class="rx-journey-icon">01</div><div class="rx-journey-copy"><b>Match</b><span>Relevant roles and candidates surfaced through clearer hiring signals.</span></div><div class="rx-journey-status">Smart fit</div></div>
          <div class="rx-journey-step"><div class="rx-journey-icon">02</div><div class="rx-journey-copy"><b>Apply</b><span>Use one complete profile instead of starting again each time.</span></div><div class="rx-journey-status">One profile</div></div>
          <div class="rx-journey-step"><div class="rx-journey-icon">03</div><div class="rx-journey-copy"><b>Message</b><span>Keep candidate and employer conversations attached to the application.</span></div><div class="rx-journey-status">Direct chat</div></div>
          <div class="rx-journey-step"><div class="rx-journey-icon">04</div><div class="rx-journey-copy"><b>Interview</b><span>Move forward with clearer expectations and less wasted time.</span></div><div class="rx-journey-status">Next step</div></div>
        </div>
        <div class="rx-journey-foot"><span>Built for candidates and hiring teams</span><span class="rx-journey-match"><strong>1</strong> connected journey</span></div>
      </aside>
    </div>`;
})();