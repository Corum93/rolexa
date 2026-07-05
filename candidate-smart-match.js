(() => {
  if (window.__rolexaSmartMatch) return;
  window.__rolexaSmartMatch = true;

  function byId(id){ return document.getElementById(id); }
  function words(text){
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['and','the','for','with','role','manager'].includes(w));
  }
  function skills(){
    const raw = byId('skills') ? byId('skills').value : '';
    return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  function profile(){
    return {
      role: byId('targetRole') ? byId('targetRole').value : '',
      location: byId('location') ? byId('location').value : '',
      style: byId('workStyle') ? byId('workStyle').value : '',
      skills: skills()
    };
  }
  function scoreText(text, p){
    const lower = String(text || '').toLowerCase();
    let score = 44;
    const reasons = [];
    const roleHits = words(p.role).filter(w => lower.includes(w));
    if (roleHits.length) { score += 25; reasons.push('role fit'); }
    const skillHits = p.skills.filter(s => lower.includes(s));
    if (skillHits.length) { score += Math.min(24, skillHits.length * 8); reasons.push(`${skillHits.length} skill match${skillHits.length === 1 ? '' : 'es'}`); }
    const loc = String(p.location || '').toLowerCase().split(',')[0].trim();
    if (loc && lower.includes(loc)) { score += 10; reasons.push('location fit'); }
    const style = String(p.style || '').toLowerCase();
    if (style && lower.includes(style)) { score += 9; reasons.push('work style fit'); }
    score = Math.max(40, Math.min(97, score));
    if (!reasons.length) reasons.push('profile based match');
    return { score, reasons };
  }
  function addIntro(container){
    if (!container || byId('rxSmartMatchIntro')) return;
    const intro = document.createElement('div');
    intro.id = 'rxSmartMatchIntro';
    intro.className = 'empty';
    intro.style.marginBottom = '10px';
    intro.style.textAlign = 'left';
    const title = document.createElement('b');
    title.textContent = 'Rolexa smart matching';
    intro.appendChild(title);
    intro.appendChild(document.createElement('br'));
    intro.appendChild(document.createTextNode('Matches are based on your target role, skills, location and work style. Full AI CV parsing can come later.'));
    container.insertAdjacentElement('beforebegin', intro);
  }
  function enhanceCard(card, match){
    if (!card || card.dataset.smartMatched === 'true') return;
    card.dataset.smartMatched = 'true';
    card.dataset.matchScore = String(match.score);
    const details = card.children && card.children[1];
    if (details) {
      const note = document.createElement('div');
      note.className = 'item-sub';
      const strong = document.createElement('b');
      strong.textContent = 'Why Rolexa matched this: ';
      note.appendChild(strong);
      note.appendChild(document.createTextNode(match.reasons.slice(0, 3).join(', ') + '.'));
      details.appendChild(note);
    }
    const actions = card.querySelector('.job-actions');
    if (actions) {
      const badge = document.createElement('span');
      badge.className = 'tag blue';
      badge.textContent = match.score + '% match';
      actions.insertAdjacentElement('afterbegin', badge);
    }
  }
  function run(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    const container = byId('recommendedJobs');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.job'));
    if (!cards.length) return;
    const p = profile();
    addIntro(container);
    cards.forEach(card => enhanceCard(card, scoreText(card.textContent, p)));
    cards.sort((a,b) => Number(b.dataset.matchScore || 0) - Number(a.dataset.matchScore || 0));
    cards.forEach(card => container.appendChild(card));
  }
  setTimeout(run, 900);
  setTimeout(run, 1800);
  document.addEventListener('click', () => setTimeout(run, 450));
})();
