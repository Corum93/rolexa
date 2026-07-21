(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumSectionSpacing) return;
  window.__rolexaPremiumSectionSpacing = true;

  const style = document.createElement('style');
  style.id = 'rxPremiumSectionSpacing';
  style.textContent = `
    /* Keep the lower homepage flowing with the tighter rhythm used above. */
    .rx-career-section{padding-top:64px!important;padding-bottom:48px!important}
    .rx-honesty-premium{padding-top:34px!important;padding-bottom:12px!important}
    #improvements{padding-top:30px!important;padding-bottom:28px!important}
    #explorer{padding-top:38px!important;padding-bottom:42px!important}
    #why{padding-top:34px!important;padding-bottom:30px!important}
    #jobs{padding-top:32px!important;padding-bottom:36px!important}

    /* Product-tour and late-page premium sections can otherwise inherit
       generous generic section padding, creating visible empty bands. */
    section:has(.rx-demo-choice-grid),
    section:has(.rx-product-tour),
    section:has([class*="demo-choice"]){padding-top:38px!important;padding-bottom:46px!important}

    @media(max-width:760px){
      .rx-career-section{padding-top:42px!important;padding-bottom:34px!important}
      .rx-honesty-premium{padding-top:28px!important;padding-bottom:8px!important}
      #improvements{padding-top:24px!important;padding-bottom:22px!important}
      #explorer{padding-top:30px!important;padding-bottom:32px!important}
      #why{padding-top:28px!important;padding-bottom:24px!important}
      #jobs{padding-top:26px!important;padding-bottom:30px!important}
      section:has(.rx-demo-choice-grid),
      section:has(.rx-product-tour),
      section:has([class*="demo-choice"]){padding-top:30px!important;padding-bottom:36px!important}
    }
  `;
  document.head.appendChild(style);
})();