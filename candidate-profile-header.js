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

      #overviewPage.rx-overview-premium .rx-quality-card{position:relative;overflow:hidden;padding:26px;background:linear-gradient(155deg,#071025 0%,#0b1c45 70%,#176bff 150%);color:#fff;border-color:rgba(255,255,255,.08)}
      #overviewPage.rx-overview-premium .rx-quality-card:after{content:'';position:absolute;width:260px;height:260px;border-radius:50%;right:-145px;bottom:-165px;background:rgba(255,255,255,.055);pointer-events:none}
      #overviewPage.rx-overview-premium .rx-quality-card h2{font-size:22px;color:#fff;margin-bottom:6px}
      #overviewPage.rx-overview-premium .rx-quality-label{font-size:12px;line-height:1.45;color:#b9c8eb;margin-bottom:18px}
      #overviewPage.rx-overview-premium .rx-quality-card .progress-line{height:9px;background:rgba(255,255,255,.13);margin:10px 0 17px}
      #overviewPage.rx-overview-premium .rx-quality-card .progress-line span{background:linear-gradient(90deg,#4c85ff,#8fb0ff);box-shadow:0 0 18px rgba(76,133,255,.45)}
      #overviewPage.rx-overview-premium .rx-quality-card .salary-big{font-size:48px;color:#fff;line-height:1}
      #overviewPage.rx-overview-premium .rx-quality-card #strengthText{color:#c9d5f3;margin-top:8px}
      #overviewPage.rx-overview-premium .rx-quality-card .clean-list{position:relative;margin-top:20px!important;gap:10px}
      #overviewPage.rx-overview-premium .rx-quality-card .clean-list li{padding:12px 13px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.065);color:#e8eeff}
      #overviewPage.rx-overview-premium .rx-quality-card .save{color:#8fb0ff}
      #overviewPage.rx-overview-premium .rx-quality-note{position:relative;margin-top:18px;padding-top:15px;border-top:1px solid rgba(255,255,255,.1);font-size:11.5px;line-height:1.5;color:#9fb0d7}

      @media(max-width:1180px){
        #overviewPage.rx-overview-premium>.grid{grid-template-columns:1fr 1fr}
        #overviewPage.rx-overview-premium .rx-quality-card{grid-column:1/-1}
      }
      @media(max-width:760px){
        #overviewPage.rx-overview-premium .page-head{margin-bottom:17px}
        #overviewPage.rx-overview-premium .page-head h1{font-size:30px}
        #overviewPage.rx-overview-premium>.grid{grid-template-columns:1fr;gap:14px}
        #overviewPage.rx-overview-premium .rx-quality-card{grid-column:auto}
        #overviewPage.rx-overview-premium>.grid>.profile-card{grid-template-columns:1fr;padding:21px 18px}
        #overviewPage.rx-overview-premium .profile-card .ring{width:138px;height:138px;margin:2px auto 6px}
        #overviewPage.rx-overview-premium .profile-card .ring:after{width:101px;height:101px}
        #overviewPage.rx-overview-premium .rx-tracker-card,#overviewPage.rx-overview-premium .rx-quality-card{padding:21px 18px}
        #overviewPage.rx-overview-premium .status-row{min-height:66px;padding-left:55px}
        #overviewPage.rx-overview-premium .status-row:hover{transform:none}
        #overviewPage.rx-overview-premium .rx-quality-card .salary-big{font-size:43px}
      }
      @media(max-width:420px){
        #overviewPage.rx-overview-premium .page-head h1{font-size:27px}
        #overviewPage.rx-overview-premium>.grid>.card{border-radius:20px}
        #overviewPage.rx-overview-premium>.grid>.profile-card,#overviewPage.rx-overview-premium .rx-tracker-card,#overviewPage.rx-overview-premium .rx-quality-card{padding:19px 15px}
      }
    `;
    document.head.appendChild(style);
  };

  const enhance = () => {
    const page = document.getElementById('overviewPage');
    if (!page) return false;
    page.classList.add('rx-overview-premium');

    const directCards = [...page.querySelectorAll(':scope > .grid > .card')];
    const trackerCard = directCards.find(card => /Application tracker/i.test(card.querySelector('h2')?.textContent || ''));
    const qualityCard = directCards.find(card => /Profile strength|Profile quality/i.test(card.querySelector('h2')?.textContent || ''));

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