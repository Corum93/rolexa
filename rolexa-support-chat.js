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

  load('https://cdn.jsdelivr.net/gh/Corum93/rolexa@0a18c2700ff73aa46920c8906d347e66b7ac04e6/rolexa-support-chat.js', '__rolexaStableSupportRequested');
  load('demo-experience.js?v=1', '__rolexaDemoExperienceRequested');
})();