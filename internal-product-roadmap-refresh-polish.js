(() => {
  if (!/internal-admin\.html$/i.test(location.pathname)) return;
  if (window.__rolexaRoadmapRefreshPolish) return;
  window.__rolexaRoadmapRefreshPolish = true;

  let refreshing = false;
  let savedScrollY = 0;
  let refreshStartedAt = 0;

  function addStyles() {
    if (document.getElementById('rxRoadmapRefreshPolishStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxRoadmapRefreshPolishStyles';
    style.textContent = `
      #rxRoadmapRefresh.rx-roadmap-refresh{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        min-height:42px;
        cursor:pointer;
        user-select:none;
        transition:transform .16s ease, box-shadow .16s ease, background-color .16s ease, border-color .16s ease, color .16s ease;
        box-shadow:0 5px 14px rgba(7,16,37,.07);
      }
      #rxRoadmapRefresh.rx-roadmap-refresh:hover{
        transform:translateY(-2px);
        background:#f3f7ff;
        border-color:rgba(23,107,255,.38);
        color:#155fd9;
        box-shadow:0 10px 22px rgba(23,107,255,.15);
      }
      #rxRoadmapRefresh.rx-roadmap-refresh:active{
        transform:translateY(0) scale(.98);
        box-shadow:0 4px 10px rgba(23,107,255,.12);
      }
      #rxRoadmapRefresh.rx-roadmap-refresh:focus-visible{
        outline:3px solid rgba(23,107,255,.25);
        outline-offset:3px;
      }
      #rxRoadmapRefresh.rx-roadmap-refresh[aria-busy="true"]{
        cursor:wait;
        opacity:.78;
        pointer-events:none;
      }
      #rxRoadmapRefresh.rx-roadmap-refresh[aria-busy="true"]::before{
        content:'';
        width:14px;
        height:14px;
        border:2px solid rgba(23,107,255,.25);
        border-top-color:#176bff;
        border-radius:50%;
        animation:rxRoadmapRefreshSpin .7s linear infinite;
      }
      #rxRoadmapContent.rx-roadmap-refreshing{
        position:relative;
        transition:opacity .16s ease;
      }
      #rxRoadmapContent.rx-roadmap-refreshing::after{
        content:'Updating roadmap…';
        position:absolute;
        inset:0;
        display:flex;
        align-items:flex-start;
        justify-content:center;
        padding-top:34px;
        border-radius:20px;
        background:rgba(244,247,253,.72);
        backdrop-filter:blur(2px);
        color:#33476f;
        font-size:13px;
        font-weight:900;
        letter-spacing:.01em;
        pointer-events:none;
        z-index:5;
      }
      @keyframes rxRoadmapRefreshSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){
        #rxRoadmapRefresh.rx-roadmap-refresh{transition:none}
        #rxRoadmapRefresh.rx-roadmap-refresh:hover,
        #rxRoadmapRefresh.rx-roadmap-refresh:active{transform:none}
      }
    `;
    document.head.appendChild(style);
  }

  function prepareButton(button) {
    if (!button) return;
    button.title = 'Reload the latest roadmap data from Supabase';
    button.setAttribute('aria-label', 'Refresh product roadmap');
  }

  function beginRefresh(button) {
    if (refreshing) return;
    const content = document.getElementById('rxRoadmapContent');
    refreshing = true;
    refreshStartedAt = Date.now();
    savedScrollY = window.scrollY;

    prepareButton(button);
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Refreshing…';

    if (content) {
      const height = Math.max(content.getBoundingClientRect().height, 280);
      content.style.minHeight = `${Math.round(height)}px`;
      content.classList.add('rx-roadmap-refreshing');
    }
  }

  function finishRefresh() {
    if (!refreshing) return;
    const button = document.getElementById('rxRoadmapRefresh');
    const content = document.getElementById('rxRoadmapContent');
    if (!button || !content || !content.querySelector('.rx-roadmap-epics')) return;

    const elapsed = Date.now() - refreshStartedAt;
    const delay = Math.max(0, 350 - elapsed);

    window.setTimeout(() => {
      prepareButton(button);
      button.removeAttribute('aria-busy');
      button.textContent = 'Refresh roadmap';
      content.classList.remove('rx-roadmap-refreshing');
      content.style.minHeight = '';

      const status = document.getElementById('rxRoadmapStatus');
      if (status) {
        status.setAttribute('aria-live', 'polite');
        status.textContent = `Roadmap refreshed just now · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      window.scrollTo({ top: savedScrollY, behavior: 'auto' });
      refreshing = false;
    }, delay);
  }

  function init() {
    addStyles();
    prepareButton(document.getElementById('rxRoadmapRefresh'));

    document.addEventListener('click', event => {
      const button = event.target.closest('#rxRoadmapRefresh');
      if (button) beginRefresh(button);
    }, true);

    const observer = new MutationObserver(() => {
      prepareButton(document.getElementById('rxRoadmapRefresh'));
      finishRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();