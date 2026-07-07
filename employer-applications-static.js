(() => {
  function emptyHtml(){
    return '<div class="empty">Real applications will appear here. Demo candidates have been removed.</div>';
  }

  function applyApplicationsLabels(){
    const nav = document.querySelector('[data-view="matches"]');
    if (nav) nav.textContent = 'Applications';

    const page = document.getElementById('matchesPage');
    if (page) {
      const h1 = page.querySelector('h1');
      const p = page.querySelector('.page-head p');
      if (h1) h1.textContent = 'Applications';
      if (p) p.textContent = 'Real candidates who have applied to jobs owned by this employer account.';
    }

    const stats = document.querySelectorAll('#overviewPage .stat');
    if (stats[1]) {
      const label = stats[1].querySelector('span:first-child');
      const note = stats[1].querySelector('span:last-child');
      if (label) label.textContent = 'Applications';
      if (note) note.textContent = 'Real applications from Supabase.';
    }

    const overviewCard = document.getElementById('overviewMatches')?.closest('.card');
    if (overviewCard) {
      const h2 = overviewCard.querySelector('h2');
      if (h2) h2.textContent = 'Latest applications';
    }

    const sideCopy = document.querySelector('.side-card p');
    if (sideCopy) sideCopy.textContent = 'Post a job, review real applications, shortlist profiles and start a conversation.';

    const search = document.getElementById('globalSearch');
    if (search) search.placeholder = 'Search jobs, applications, candidates...';
  }

  function removeDemoCandidates(){
    applyApplicationsLabels();
    const matches = document.getElementById('matchesList');
    const overview = document.getElementById('overviewMatches');
    if (matches) matches.innerHTML = emptyHtml();
    if (overview) overview.innerHTML = emptyHtml();
    const count = document.getElementById('matchCount');
    if (count) count.textContent = '0';
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(removeDemoCandidates, 300);
    setTimeout(removeDemoCandidates, 900);
    setTimeout(removeDemoCandidates, 1800);

    const originalShowView = window.rolexaEmployerShowView;
    if (typeof originalShowView === 'function') {
      window.rolexaEmployerShowView = function(view){
        originalShowView(view);
        setTimeout(removeDemoCandidates, 50);
      };
    }

    document.addEventListener('click', event => {
      if (event.target && event.target.matches('[data-view="matches"]')) {
        setTimeout(removeDemoCandidates, 80);
      }
    });
  });
})();
