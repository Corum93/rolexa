(() => {
  const load = (src, marker) => {
    if (window[marker] || document.querySelector(`script[data-loader="${marker}"]`)) return;
    window[marker] = true;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.loader = marker;
    document.body.appendChild(script);
  };

  if (/candidate-dashboard\.html$/.test(location.pathname)) {
    load('candidate-messaging-inbox.js?v=2', '__rolexaCandidateInboxRequested');
    load('candidate-career-direction.js?v=1', '__rolexaCandidateCareerDirectionRequestedV1');
    load('candidate-career-direction-refinements.js?v=2', '__rolexaCandidateCareerDirectionRefinementsRequestedV2');
    load('candidate-career-direction-sync.js?v=1', '__rolexaCandidateCareerDirectionSyncRequestedV1');
    load('candidate-verified-jobs.js?v=1', '__rolexaCandidateVerifiedJobsRequestedV1');
    load('candidate-verified-jobs-filter.js?v=1', '__rolexaVerifiedJobsFilterRequestedV1');
    load('candidate-mobile-messages-polish.js?v=1', '__rolexaCandidateMobileMessagesPolishRequestedV1');
    load('candidate-mobile-applications-polish.js?v=1', '__rolexaCandidateMobileApplicationsPolishRequestedV1');
    load('candidate-mobile-job-search-polish.js?v=1', '__rolexaCandidateMobileJobSearchPolishRequestedV1');
    load('candidate-mobile-global-polish.js?v=1', '__rolexaCandidateMobileGlobalPolishRequestedV1');
  }

  load('https://cdn.jsdelivr.net/gh/Corum93/rolexa@0a18c2700ff73aa46920c8906d347e66b7ac04e6/rolexa-support-chat.js', '__rolexaStableSupportRequested');
  load('demo-experience.js?v=2', '__rolexaDemoExperienceRequestedV2');
  load('homepage-improvements-premium.js?v=2', '__rolexaHomepageImprovementsPremiumRequestedV2');
  load('premium-homepage-hero.js?v=2', '__rolexaPremiumHomepageHeroRequestedV2');
  load('premium-career-progression.js?v=1', '__rolexaPremiumCareerProgressionRequested');
  load('premium-honesty-section.js?v=2', '__rolexaPremiumHonestySectionRequestedV2');
  load('premium-salary-explorer.js?v=1', '__rolexaPremiumSalaryExplorerRequested');
  load('premium-comparison-section.js?v=4', '__rolexaPremiumComparisonSectionRequestedV4');
  load('premium-early-access-section.js?v=1', '__rolexaPremiumAccessSectionRequested');
  load('premium-footer-copy.js?v=2', '__rolexaPremiumFooterCopyRequestedV2');
  load('premium-section-spacing.js?v=1', '__rolexaPremiumSectionSpacingRequested');
  load('product-feedback.js?v=1', '__rolexaProductFeedbackRequested');
  load('support-feedback-integration.js?v=1', '__rolexaSupportFeedbackIntegrationRequested');
})();
