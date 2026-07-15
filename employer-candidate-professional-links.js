(() => {
  if (window.__rolexaEmployerCandidateProfessionalLinks) return;
  window.__rolexaEmployerCandidateProfessionalLinks = true;
  if (!/employer-dashboard\.html$/.test(location.pathname)) return;

  let clientPromise = null;

  function safe(value) {
    return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }

  function safeUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalised);
      return ['http:','https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function addStyles() {
    if (document.getElementById('rxEmployerCandidateLinksStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxEmployerCandidateLinksStyles';
    style.textContent = `
      .rx-employer-profile-links{border:1px solid rgba(7,16,37,.10);background:#fff;border-radius:16px;padding:14px 15px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
      .rx-employer-profile-links-title{font-family:'Space Grotesk',Inter,sans-serif;font-size:13px;font-weight:800;color:#596279;margin-right:2px}
      .rx-employer-profile-link{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;color:#071025;background:#F2F5FC;border:1px solid rgba(23,107,255,.15);border-radius:999px;padding:9px 13px;font-size:12.5px;font-weight:900;transition:transform .16s ease,background .16s ease,border-color .16s ease}
      .rx-employer-profile-link:hover{transform:translateY(-1px);background:#EAF0FF;border-color:rgba(23,107,255,.32)}
      .rx-employer-profile-link-icon{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border-radius:7px;background:#176BFF;color:#fff;font-size:10px;font-weight:900;line-height:1}
      .rx-profile-field.rx-skills-field{background:#fff}
      .rx-employer-skill-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
      .rx-employer-skill-pill{display:inline-flex;align-items:center;min-height:30px;border-radius:999px;padding:7px 11px;background:#EAF0FF;border:1px solid rgba(23,107,255,.14);color:#2345B8;font-size:12px;font-weight:900;line-height:1.15}
      @media(max-width:760px){
        .rx-employer-profile-links{display:grid;grid-template-columns:1fr;padding:13px;gap:8px}
        .rx-employer-profile-links-title{margin:0 0 2px}
        .rx-employer-profile-link{width:100%;min-height:44px}
        .rx-employer-skill-list{gap:7px}
        .rx-employer-skill-pill{font-size:11.5px;padding:7px 10px}
      }
    `;
    document.head.appendChild(style);
  }

  async function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
          if (existing) {
            existing.addEventListener('load', resolve, { once:true });
            existing.addEventListener('error', reject, { once:true });
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const files = ['candidate-profile-sync.js', 'employer-job-sync.js?v=2'];
      for (const file of files) {
        try {
          const response = await fetch(file, { cache:'no-store' });
          const text = await response.text();
          const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
          const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
          if (url && key) return window.supabase.createClient(url, key);
        } catch (_) {}
      }
      throw new Error('Supabase configuration could not be found.');
    })();
    return clientPromise;
  }

  function linksHtml(profile) {
    const links = [
      { label:'LinkedIn', url:profile.linkedin_url, icon:'in' },
      { label:'Portfolio', url:profile.portfolio_url, icon:'◫' },
      { label:'Website', url:profile.website_url, icon:'↗' },
      { label:'GitHub', url:profile.github_url, icon:'GH' }
    ].map(link => ({ ...link, url:safeUrl(link.url) })).filter(link => link.url);

    if (!links.length) return '';
    return `<section class="rx-employer-profile-links" id="rxEmployerCandidateProfessionalLinks"><span class="rx-employer-profile-links-title">Professional links</span>${links.map(link => `<a class="rx-employer-profile-link" href="${safe(link.url)}" target="_blank" rel="noopener noreferrer"><span class="rx-employer-profile-link-icon">${safe(link.icon)}</span><span>${safe(link.label)}</span></a>`).join('')}</section>`;
  }

  function enhanceSkills() {
    const modal = document.getElementById('rxProfileModal');
    if (!modal) return;
    const fields = [...modal.querySelectorAll('.rx-profile-field')];
    const skillsField = fields.find(field => field.querySelector('b')?.textContent?.trim().toLowerCase() === 'skills');
    if (!skillsField || skillsField.classList.contains('rx-skills-field')) return;

    const valueNode = skillsField.querySelector('span');
    const raw = valueNode?.textContent?.trim() || '';
    const skills = raw
      .split(/[,;\n]+/)
      .map(skill => skill.trim())
      .filter(Boolean);

    if (!skills.length || /^not added$/i.test(raw)) return;
    addStyles();
    skillsField.classList.add('rx-skills-field');
    valueNode.innerHTML = `<div class="rx-employer-skill-list">${skills.map(skill => `<span class="rx-employer-skill-pill">${safe(skill)}</span>`).join('')}</div>`;
  }

  async function render(applicationId) {
    const modal = document.getElementById('rxProfileModal');
    const body = modal?.querySelector('.rx-modal-body');
    if (!modal || !body) return;

    enhanceSkills();
    if (document.getElementById('rxEmployerCandidateProfessionalLinks')) return;

    try {
      const client = await getClient();
      const { data: application, error: applicationError } = await client
        .from('candidate_applications')
        .select('user_id')
        .eq('id', applicationId)
        .maybeSingle();
      if (applicationError || !application?.user_id) return;

      const { data: profile, error: profileError } = await client
        .from('candidate_profiles')
        .select('linkedin_url,portfolio_url,website_url,github_url')
        .eq('user_id', application.user_id)
        .maybeSingle();
      if (profileError || !profile || !document.getElementById('rxProfileModal')) return;

      const html = linksHtml(profile);
      if (!html) return;
      addStyles();
      body.insertAdjacentHTML('afterbegin', html);
    } catch (error) {
      console.warn('Rolexa employer candidate links error', error);
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-review-profile]');
    if (!trigger) return;
    const applicationId = trigger.getAttribute('data-review-profile');
    if (!applicationId) return;
    setTimeout(() => render(applicationId), 180);
  });
})();