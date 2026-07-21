(() => {
  if (!/\/(index\.html)?$/.test(location.pathname)) return;
  if (window.__rolexaPremiumCareerProgression) return;
  window.__rolexaPremiumCareerProgression = true;

  const hero = document.querySelector('.hero');
  if (!hero || document.getElementById('career-progression')) return;

  const style = document.createElement('style');
  style.id = 'rxPremiumCareerProgressionStyles';
  style.textContent = `
    .rx-career-section{position:relative;padding:78px 0 82px;background:linear-gradient(180deg,#f5f7fc 0%,#fff 100%);overflow:hidden}
    .rx-career-section:before{content:'';position:absolute;width:430px;height:430px;border-radius:50%;left:-270px;top:40px;background:rgba(76,116,255,.07);pointer-events:none}
    .rx-career-shell{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:0 32px}
    .rx-career-head{display:grid;grid-template-columns:minmax(0,.88fr) minmax(360px,1.12fr);gap:56px;align-items:end;margin-bottom:36px}
    .rx-career-kicker{display:inline-flex;align-items:center;gap:9px;color:#2946c7;font-size:11.5px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;margin-bottom:14px}
    .rx-career-kicker:before{content:'';width:30px;height:2px;border-radius:99px;background:#176bff}
    .rx-career-head h2{font-family:'Space Grotesk',sans-serif;font-size:43px;line-height:1.06;letter-spacing:-.04em;color:#071025;margin:0}
    .rx-career-head p{font-size:16px;line-height:1.7;color:#59627a;margin:0;max-width:650px}
    .rx-career-track{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;position:relative}
    .rx-career-track:before{content:'';position:absolute;left:8%;right:8%;top:43px;height:2px;background:linear-gradient(90deg,#176bff,#6d5ce7,#2fae7a,#e58a00);opacity:.26;z-index:0}
    .rx-career-stage{position:relative;z-index:1;background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:22px;padding:22px;min-height:245px;box-shadow:0 18px 46px rgba(7,16,37,.055)}
    .rx-career-stage-number{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#176bff;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:900;box-shadow:0 10px 24px rgba(23,107,255,.24)}
    .rx-career-stage:nth-child(2) .rx-career-stage-number{background:#6d5ce7;box-shadow:0 10px 24px rgba(109,92,231,.2)}
    .rx-career-stage:nth-child(3) .rx-career-stage-number{background:#2fae7a;box-shadow:0 10px 24px rgba(47,174,122,.2)}
    .rx-career-stage:nth-child(4) .rx-career-stage-number{background:#e58a00;box-shadow:0 10px 24px rgba(229,138,0,.2)}
    .rx-career-stage-label{display:block;margin-top:19px;color:#176bff;font-size:10.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
    .rx-career-stage:nth-child(2) .rx-career-stage-label{color:#5a48cc}
    .rx-career-stage:nth-child(3) .rx-career-stage-label{color:#1f815d}
    .rx-career-stage:nth-child(4) .rx-career-stage-label{color:#a35f00}
    .rx-career-stage h3{font-family:'Space Grotesk',sans-serif;font-size:20px;line-height:1.2;color:#071025;margin:8px 0 10px}
    .rx-career-stage p{font-size:13.5px;line-height:1.62;color:#687087;margin:0}
    .rx-career-foot{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:28px;padding:18px 21px;border:1px solid rgba(23,107,255,.12);border-radius:17px;background:#eef3ff;color:#2946c7}
    .rx-career-foot strong{font-family:'Space Grotesk',sans-serif;font-size:15px}
    .rx-career-foot span{font-size:12.5px;line-height:1.5;color:#5369ad}
    @media(max-width:980px){
      .rx-career-head{grid-template-columns:1fr;gap:16px}
      .rx-career-track{grid-template-columns:repeat(2,minmax(0,1fr))}
      .rx-career-track:before{display:none}
    }
    @media(max-width:760px){
      .rx-career-section{padding:48px 0 52px!important}
      .rx-career-shell{padding:0 16px}
      .rx-career-head{margin-bottom:24px}
      .rx-career-head h2{font-size:32px;line-height:1.08}
      .rx-career-head p{font-size:14.5px;line-height:1.62}
      .rx-career-track{grid-template-columns:1fr;gap:11px}
      .rx-career-stage{min-height:0;padding:19px;display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:13px}
      .rx-career-stage-number{grid-row:1/4}
      .rx-career-stage-label{margin-top:1px}
      .rx-career-stage h3{font-size:18px;margin:6px 0 7px}
      .rx-career-stage p{font-size:13px}
      .rx-career-foot{display:block;padding:17px;margin-top:18px}
      .rx-career-foot span{display:block;margin-top:6px}
    }
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.id = 'career-progression';
  section.className = 'rx-career-section';
  section.setAttribute('aria-labelledby','rxCareerProgressionTitle');
  section.innerHTML = `
    <div class="rx-career-shell">
      <div class="rx-career-head">
        <div>
          <div class="rx-career-kicker">A platform for your whole career</div>
          <h2 id="rxCareerProgressionTitle">Find the role that moves your career forward.</h2>
        </div>
        <p>Whether you’re starting your first job, stepping into leadership or going for senior management, Rolexa helps you understand your next move and find opportunities that match your growing skills and experience.</p>
      </div>
      <div class="rx-career-track">
        <article class="rx-career-stage">
          <div class="rx-career-stage-number">01</div>
          <span class="rx-career-stage-label">Build your foundations</span>
          <h3>Entry level</h3>
          <p>Gain practical experience, strengthen your core skills and build confidence in your chosen field.</p>
        </article>
        <article class="rx-career-stage">
          <div class="rx-career-stage-number">02</div>
          <span class="rx-career-stage-label">Take more responsibility</span>
          <h3>Team Leader or Supervisor</h3>
          <p>Support others, coordinate day-to-day work and begin developing the skills needed to lead.</p>
        </article>
        <article class="rx-career-stage">
          <div class="rx-career-stage-number">03</div>
          <span class="rx-career-stage-label">Lead people and performance</span>
          <h3>Assistant Manager or Manager</h3>
          <p>Manage teams, projects and results while building the broader experience required for senior roles.</p>
        </article>
        <article class="rx-career-stage">
          <div class="rx-career-stage-number">04</div>
          <span class="rx-career-stage-label">Shape the direction</span>
          <h3>Senior Leadership</h3>
          <p>Progress towards Head, Director or Executive opportunities as your expertise and impact grow.</p>
        </article>
      </div>
      <div class="rx-career-foot">
        <strong>Your career does not have to follow one fixed route.</strong>
        <span>Rolexa can support the next realistic move — upward, sideways into a new specialism, or into a different industry.</span>
      </div>
    </div>`;

  hero.insertAdjacentElement('afterend',section);
})();