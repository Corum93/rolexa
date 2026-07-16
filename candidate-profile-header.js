(() => {
  if (!/candidate-dashboard\.html$/.test(location.pathname)) return;

  /* Preserve the existing candidate profile-page enhancement from the last stable build. */
  if (!document.querySelector('script[data-rx-stable-profile-header]')) {
    const stable = document.createElement('script');
    stable.src = 'https://cdn.jsdelivr.net/gh/Corum93/rolexa@48139d443ab83184b7413f38618b300ceac56d62/candidate-profile-header.js';
    stable.defer = true;
    stable.dataset.rxStableProfileHeader = 'true';
    document.head.appendChild(stable);
  }

  if (window.__rolexaCandidateOverviewPremium) return;
  window.__rolexaCandidateOverviewPremium = true;

  const addStyles = () => {
    if (document.getElementById('rxCandidateOverviewPremiumStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxCandidateOverviewPremiumStyles';
    style.textContent = `
      #overviewPage.rx-overview-premium .page-head{margin-bottom:22px;align-items:center}
      #overviewPage.rx-overview-premium .page-head h1{font-size:38px;letter-spacing:-.045em}
      #overviewPage.rx-overview-premium .page-head p{font-size:15px;max-width:760px;color:#687187}
      #overviewPage.rx-overview-premium>.grid{grid-template-columns:1.18fr 1.22fr .98fr;gap:18px}
      #overviewPage.rx-overview-premium>.grid>.card{border:1px solid rgba(7,16,37,.08);border-radius:24px;box-shadow:0 18px 50px rgba(7,16,37,.065);background:rgba(255,255,255,.97)}

      #overviewPage.rx-overview-premium>.grid>.profile-card{position:relative;overflow:hidden;grid-template-columns:174px minmax(0,1fr);padding:26px;background:linear-gradient(145deg,#fff 0%,#f7f9ff 100%)}
      #overviewPage.rx-overview-premium>.grid>.profile-card:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#176bff,#79a0ff)}
      #overviewPage.rx-overview-premium>.grid>.profile-card:after{content:'';position:absolute;width:230px;height:230px;border-radius:50%;right:-155px;top:-145px;background:rgba(23,107,255,.055);pointer-events:none}
      #overviewPage.rx-overview-premium .profile-card .ring{width:150px;height:150px;box-shadow:0 14px 34px rgba(23,107,255,.16)}
      #overviewPage.rx-overview-premium .profile-card .ring:after{width:110px;height:110px;box-shadow:inset 0 0 0 1px rgba(23,107,255,.06)}
      #overviewPage.rx-overview-premium .profile-card h2{font-size:21px;margin-bottom:15px}
      #overviewPage.rx-overview-premium .profile-card h2:before{content:'PROFILE COMPLETENESS';display:block;margin-bottom:7px;color:#176bff;font-family:Inter,sans-serif;font-size:10px;font-weight:900;letter-spacing:.1em}
      #overviewPage.rx-overview-premium .profile-card li{padding:2px 0;font-size:13.5px}
      #overviewPage.rx-overview-premium .profile-card .primary{margin-top:18px!important;box-shadow:0 10px 24px rgba(23,107,255,.22)}

      #overviewPage.rx-overview-premium .rx-tracker-card{position:relative;padding:26px}
      #overviewPage.rx-overview-premium .rx-tracker-card h2{font-size:22px;margin-bottom:7px}
      #overviewPage.rx-overview-premium .rx-tracker-intro{font-size:12.5px;line-height:1.5;color:#7a8499;margin:0 0 17px}
      #overviewPage.rx-overview-premium .tracker{position:relative;gap:9px}
      #overviewPage.rx-overview-premium .tracker:before{content:'';position:absolute;left:24px;top:25px;bottom:25px;width:2px;background:linear-gradient(#176bff,#22a06b,#e58a00,#8b5cf6,#22a06b,#e0533f);opacity:.18}
      #overviewPage.rx-overview-premium .status-row{position:relative;min-height:69px;padding:12px 15px 12px 57px;border-color:rgba(7,16,37,.075);border-radius:16px;background:#fbfcff;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
      #overviewPage.rx-overview-premium .status-row:hover{transform:translateX(2px);border-color:rgba(23,107,255,.18);box-shadow:0 10px 24px rgba(7,16,37,.055)}
      #overviewPage.rx-overview-premium .status-row:before{position:absolute;left:12px;top:50%;transform:translateY(-50%);display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:10px;background:#eaf0ff;color:#176bff;font-size:13px;font-weight:900;z-index:1}
      #overviewPage.rx-overview-premium .status-row:nth-child(1):before{content:'1'}
      #overviewPage.rx-overview-premium .status-row:nth-child(2):before{content:'2';background:#e5f7ef;color:#16865a}
      #overviewPage.rx-overview-premium .status-row:nth-child(3):before{content:'3';background:#fff2dc;color:#b96b00}
      #overviewPage.rx-overview-premium .status-row:nth-child(4):before{content:'4';background:#f0ebff;color:#6846e8}
      #overviewPage.rx-overview-premium .status-row:nth-child(5):before{content:'5';background:#e5f7ef;color:#16865a}
      #overviewPage.rx-overview-premium .status-row:nth-child(6):before{content:'×';background:#fce9e6;color:#c74736}
      #overviewPage.rx-overview-premium .status-row b{font-size:14px}
      #overviewPage.rx-overview-premium .status-row span{font-size:11.5px}
      #overviewPage.rx-overview-premium .status-row .count{font-size:22px;color:#071025}

      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card{position:relative;overflow:hidden;padding:26px;background:linear-gradient(155deg,#071025 0%,#0b1c45 70%,#176bff 150%)!important;color:#fff!important;border-color:rgba(255,255,255,.08)!important;box-shadow:0 22px 55px rgba(7,16,37,.18)}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card:after{content:'';position:absolute;width:260px;height:260px;border-radius:50%;right:-145px;bottom:-165px;background:rgba(255,255,255,.055);pointer-events:none}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card h2{font-size:22px;color:#fff!important;margin-bottom:6px}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .rx-quality-label{font-size:12px;line-height:1.45;color:#b9c8eb!important;margin-bottom:18px}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .progress-line{height:9px;background:rgba(255,255,255,.13)!important;margin:10px 0 17px}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .progress-line span{background:linear-gradient(90deg,#4c85ff,#8fb0ff)!important;box-shadow:0 0 18px rgba(76,133,255,.45)}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .salary-big{font-size:48px;color:#fff!important;line-height:1}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card #strengthText{color:#c9d5f3!important;margin-top:8px}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .clean-list{position:relative;margin-top:20px!important;gap:10px}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .clean-list li{padding:12px 13px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.065);color:#e8eeff!important}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .clean-list li span{color:#e8eeff!important}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .save{color:#8fb0ff!important}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .rx-quality-note{position:relative;margin-top:18px;padding-top:15px;border-top:1px solid rgba(255,255,255,.1);font-size:11.5px;line-height:1.5;color:#9fb0d7!important}
      #overviewPage.rx-overview-premium>.grid>.card.rx-quality-card .rx-quality-note b{color:#dbe5ff}

      #overviewPage.rx-overview-premium>.grid>.card.rx-recommended-card{position:relative;padding:24px;overflow:hidden;background:linear-gradient(145deg,#fff 0%,#f8faff 100%)}
      #overviewPage.rx-overview-premium>.grid>.card.rx-recommended-card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#176bff,#6e8fff,#22a06b)}
      #overviewPage.rx-overview-premium .rx-recommended-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:17px}
      #overviewPage.rx-overview-premium .rx-recommended-head h2{font-size:22px;margin:0}
      #overviewPage.rx-overview-premium .rx-match-summary{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #dce5ff;border-radius:999px;background:#eef3ff;color:#2853c8;font-size:10.5px;font-weight:900;white-space:nowrap}
      #overviewPage.rx-overview-premium .rx-match-summary:before{content:'✦';font-size:11px}
      #overviewPage.rx-overview-premium .rx-recommended-card>.list>.empty,#overviewPage.rx-overview-premium .rx-recommended-card .list>.empty{padding:20px 22px;border-color:#dfe7f8;background:rgba(248,250,255,.82);text-align:left}
      #overviewPage.rx-overview-premium .rx-recommended-card .list{gap:12px}
      #overviewPage.rx-overview-premium .rx-recommended-card .job{position:relative;grid-template-columns:52px minmax(0,1fr) auto;gap:14px;padding:16px;border:1px solid rgba(7,16,37,.075);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(7,16,37,.035);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      #overviewPage.rx-overview-premium .rx-recommended-card .job:hover{transform:translateY(-2px);border-color:rgba(23,107,255,.18);box-shadow:0 14px 32px rgba(7,16,37,.07)}
      #overviewPage.rx-overview-premium .rx-recommended-card .job .logo{width:52px;height:52px;border-radius:15px;box-shadow:0 9px 20px rgba(7,16,37,.13)}
      #overviewPage.rx-overview-premium .rx-recommended-card .item-title{font-size:15px;letter-spacing:-.015em}
      #overviewPage.rx-overview-premium .rx-recommended-card .item-sub{line-height:1.38}
      #overviewPage.rx-overview-premium .rx-recommended-card .job-actions{align-items:center;gap:7px}
      #overviewPage.rx-overview-premium .rx-recommended-card .tag{padding:7px 10px;font-size:10.5px}
      #overviewPage.rx-overview-premium .rx-recommended-card .small-btn{padding:9px 12px;border-color:#dfe4ef;background:#fff;font-size:11px;box-shadow:none}
      #overviewPage.rx-overview-premium .rx-recommended-card .small-btn:hover{border-color:#b9c9ee;background:#f7f9ff}
      #overviewPage.rx-overview-premium .rx-recommended-card .small-btn.primary-mini{background:#176bff;border-color:#176bff;color:#fff;box-shadow:0 8px 18px rgba(23,107,255,.2)}
      #overviewPage.rx-overview-premium .rx-recommended-card .small-btn.rx-action-applied{background:#edf2ff;border-color:#dce6ff;color:#2b57cf;box-shadow:none}
      #overviewPage.rx-overview-premium .rx-match-reasons{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}
      #overviewPage.rx-overview-premium .rx-match-reasons-label{color:#667087;font-size:10.5px;font-weight:900}
      #overviewPage.rx-overview-premium .rx-match-reason{display:inline-flex;padding:4px 7px;border:1px solid #dfe7f8;border-radius:999px;background:#f5f8ff;color:#51617c;font-size:10px;font-weight:800}

      #overviewPage.rx-overview-premium>.grid>.card.rx-upcoming-card{position:relative;align-self:stretch;padding:24px;background:linear-gradient(180deg,#fff,#fbfcff)}
      #overviewPage.rx-overview-premium .rx-upcoming-card h2{font-size:22px;margin-bottom:17px}
      #overviewPage.rx-overview-premium .rx-upcoming-card .list{height:calc(100% - 40px)}
      #overviewPage.rx-overview-premium .rx-upcoming-empty{height:100%;min-height:245px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:25px 20px;border:1px dashed #ced9ef;border-radius:18px;background:linear-gradient(145deg,#f9fbff,#f3f7ff);text-align:center}
      #overviewPage.rx-overview-premium .rx-upcoming-icon{display:flex;width:48px;height:48px;align-items:center;justify-content:center;margin-bottom:14px;border-radius:15px;background:linear-gradient(135deg,#176bff,#6d8fff);color:#fff;font-size:20px;box-shadow:0 10px 24px rgba(23,107,255,.2)}
      #overviewPage.rx-overview-premium .rx-upcoming-empty strong{font-family:'Space Grotesk',sans-serif;font-size:16px;letter-spacing:-.02em}
      #overviewPage.rx-overview-premium .rx-upcoming-empty p{max-width:245px;margin:7px auto 15px;color:#727d94;font-size:11.5px;line-height:1.5}
      #overviewPage.rx-overview-premium .rx-upcoming-empty button{border:1px solid #d6e0f5;background:#fff;color:#173a91;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:900;box-shadow:0 7px 18px rgba(7,16,37,.055)}
      #overviewPage.rx-overview-premium .rx-upcoming-empty button:hover{border-color:#aac0f0;background:#f7f9ff}

      @media(max-width:1180px){
        #overviewPage.rx-overview-premium>.grid{grid-template-columns:1fr 1fr}
        #overviewPage.rx-overview-premium .rx-quality-card{grid-column:1/-1}
        #overviewPage.rx-overview-premium .rx-recommended-card{grid-column:1/-1}
      }
      @media(max-width:900px){
        #overviewPage.rx-overview-premium .rx-recommended-card .job{grid-template-columns:48px minmax(0,1fr)}
        #overviewPage.rx-overview-premium .rx-recommended-card .job-actions{grid-column:2;justify-content:flex-start}
      }
      @media(max-width:760px){
        #overviewPage.rx-overview-premium .page-head{margin-bottom:17px}
        #overviewPage.rx-overview-premium .page-head h1{font-size:30px}
        #overviewPage.rx-overview-premium>.grid{grid-template-columns:1fr;gap:14px}
        #overviewPage.rx-overview-premium .rx-quality-card,#overviewPage.rx-overview-premium .rx-recommended-card{grid-column:auto}
        #overviewPage.rx-overview-premium>.grid>.profile-card{grid-template-columns:1fr;padding:21px 18px}
        #overviewPage.rx-overview-premium .profile-card .ring{width:138px;height:138px;margin:2px auto 6px}
        #overviewPage.rx-overview-premium .profile-card .ring:after{width:101px;height:101px}
        #overviewPage.rx-overview-premium .rx-tracker-card,#overviewPage.rx-overview-premium .rx-quality-card,#overviewPage.rx-overview-premium>.grid>.card.rx-recommended-card,#overviewPage.rx-overview-premium>.grid>.card.rx-upcoming-card{padding:21px 18px}
        #overviewPage.rx-overview-premium .status-row{min-height:66px;padding-left:55px}
        #overviewPage.rx-overview-premium .status-row:hover,#overviewPage.rx-overview-premium .rx-recommended-card .job:hover{transform:none}
        #overviewPage.rx-overview-premium .rx-quality-card .salary-big{font-size:43px}
        #overviewPage.rx-overview-premium .rx-recommended-head{display:block}
        #overviewPage.rx-overview-premium .rx-match-summary{margin-top:9px}
        #overviewPage.rx-overview-premium .rx-upcoming-empty{min-height:210px}
      }
      @media(max-width:520px){
        #overviewPage.rx-overview-premium .rx-recommended-card .job{grid-template-columns:44px minmax(0,1fr);padding:14px 12px}
        #overviewPage.rx-overview-premium .rx-recommended-card .job .logo{width:44px;height:44px;border-radius:13px}
        #overviewPage.rx-overview-premium .rx-recommended-card .job-actions{grid-column:1/-1;padding-left:0}
      }
      @media(max-width:420px){
        #overviewPage.rx-overview-premium .page-head h1{font-size:27px}
        #overviewPage.rx-overview-premium>.grid>.card{border-radius:20px}
        #overviewPage.rx-overview-premium>.grid>.profile-card,#overviewPage.rx-overview-premium .rx-tracker-card,#overviewPage.rx-overview-premium .rx-quality-card,#overviewPage.rx-overview-premium>.grid>.card.rx-recommended-card,#overviewPage.rx-overview-premium>.grid>.card.rx-upcoming-card{padding:19px 15px}
      }
    `;
    document.head.appendChild(style);
  };

  const decorateRecommendedJobs = card => {
    if (!card) return;
    card.querySelectorAll('.job').forEach(job => {
      job.querySelectorAll('button').forEach(button => {
        const label = (button.textContent || '').trim().toLowerCase();
        button.classList.toggle('rx-action-applied',label === 'applied');
      });
      const reason = [...job.querySelectorAll('.item-sub,div,p')].find(node => /Why Rolexa matched this:/i.test(node.textContent || ''));
      if (!reason || reason.dataset.rxMatchDecorated === 'true') return;
      const raw = (reason.textContent || '').replace(/Why Rolexa matched this:/i,'').trim().replace(/\.$/,'');
      const reasons = raw.split(',').map(item => item.trim()).filter(Boolean).slice(0,4);
      reason.className = 'rx-match-reasons';
      reason.innerHTML = `<span class="rx-match-reasons-label">Why it matches</span>${reasons.map(item => `<span class="rx-match-reason">${item.replace(/\bfit\b/gi,'fit')}</span>`).join('')}`;
      reason.dataset.rxMatchDecorated = 'true';
    });
  };

  const enhance = () => {
    const page = document.getElementById('overviewPage');
    if (!page) return false;
    page.classList.add('rx-overview-premium');

    const directCards = [...page.querySelectorAll(':scope > .grid > .card')];
    const trackerCard = directCards.find(card => /Application tracker/i.test(card.querySelector('h2')?.textContent || ''));
    const qualityCard = directCards.find(card => /Profile strength|Profile quality/i.test(card.querySelector('h2')?.textContent || ''));
    const recommendedCard = directCards.find(card => /Recommended jobs for you/i.test(card.querySelector('h2')?.textContent || ''));
    const upcomingCard = directCards.find(card => /^Upcoming$/i.test((card.querySelector('h2')?.textContent || '').trim()));

    if (trackerCard) {
      trackerCard.classList.add('rx-tracker-card');
      const heading = trackerCard.querySelector('h2');
      if (heading && !trackerCard.querySelector('.rx-tracker-intro')) {
        heading.insertAdjacentHTML('afterend','<p class="rx-tracker-intro">Your application journey, from first submission through to a successful hire.</p>');
      }
    }

    if (qualityCard) {
      qualityCard.classList.add('rx-quality-card');
      const heading = qualityCard.querySelector('h2');
      if (heading) heading.textContent = 'Profile quality';
      if (heading && !qualityCard.querySelector('.rx-quality-label')) {
        heading.insertAdjacentHTML('afterend','<p class="rx-quality-label">How competitive and informative your completed profile is.</p>');
      }
      if (!qualityCard.querySelector('.rx-quality-note')) {
        qualityCard.insertAdjacentHTML('beforeend','<p class="rx-quality-note"><b>Completion</b> means every key section is filled in. <b>Quality</b> reflects how strong and detailed that information is.</p>');
      }
    }

    if (recommendedCard) {
      recommendedCard.classList.add('rx-recommended-card');
      const heading = recommendedCard.querySelector('h2');
      if (heading && !recommendedCard.querySelector('.rx-recommended-head')) {
        const head = document.createElement('div');
        head.className = 'rx-recommended-head';
        heading.parentNode.insertBefore(head,heading);
        head.appendChild(heading);
        head.insertAdjacentHTML('beforeend','<span class="rx-match-summary">Personalised matches</span>');
      }
      decorateRecommendedJobs(recommendedCard);
      const list = recommendedCard.querySelector('.list');
      if (list && !list.dataset.rxRecommendationObserver) {
        list.dataset.rxRecommendationObserver = 'true';
        new MutationObserver(() => decorateRecommendedJobs(recommendedCard)).observe(list,{childList:true,subtree:true});
      }
    }

    if (upcomingCard) {
      upcomingCard.classList.add('rx-upcoming-card');
      const empty = upcomingCard.querySelector('.empty');
      if (empty && /No confirmed upcoming interviews/i.test(empty.textContent || '') && !empty.classList.contains('rx-upcoming-empty')) {
        empty.className = 'rx-upcoming-empty';
        empty.innerHTML = '<span class="rx-upcoming-icon">◷</span><strong>No interviews booked yet</strong><p>When an employer confirms a time, it will appear here automatically.</p><button type="button" onclick="showView(\'applications\')">View applications</button>';
      }
    }
    return true;
  };

  addStyles();
  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),10000);
  }
})();