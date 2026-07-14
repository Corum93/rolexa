(() => {
  if (window.__rolexaCandidateProfileCard) return;
  window.__rolexaCandidateProfileCard = true;

  const CONFIG = {
    url: 'https://hndzomiigjjyyconeqpc.supabase.co',
    key: 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd',
    photoBucket: 'candidate-photos',
    cvBucket: 'candidate-cvs'
  };

  let client = null;
  let user = null;
  let profile = null;
  let photoUrl = '';
  let cvUrl = '';

  function byId(id){ return document.getElementById(id); }
  function safe(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function initials(name){ return String(name || 'Candidate').trim().split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase(); }

  function loadSupabase(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function addStyles(){
    if (byId('rxProfileCardStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxProfileCardStyles';
    style.textContent = `
      .profile-card.rx-complete-card{display:block;padding:20px}
      .rx-profile-card-top{display:grid;grid-template-columns:82px 1fr;gap:14px;align-items:center;margin-bottom:18px}
      .rx-profile-card-photo{width:82px;height:82px;border-radius:20px;background:linear-gradient(135deg,#176BFF,#8CA6FF);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;background-size:cover;background-position:center;box-shadow:0 10px 24px rgba(23,107,255,.18)}
      .rx-profile-card-name{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;line-height:1.15}
      .rx-profile-card-meta{font-size:12.5px;color:#6B7280;line-height:1.45;margin-top:5px}
      .rx-profile-card-main{display:grid;grid-template-columns:142px 1fr;gap:18px;align-items:center}
      .rx-profile-card-summary{margin:16px 0 0;border-top:1px solid rgba(7,16,37,.08);padding-top:14px}
      .rx-profile-card-summary b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.045em;color:#101F4A;margin-bottom:6px}
      .rx-profile-card-summary p{margin:0;color:#26324C;font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      .rx-profile-card-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
      .rx-profile-card-actions .small-btn{padding:9px 12px}
      @media(max-width:760px){.rx-profile-card-main{grid-template-columns:1fr}.rx-profile-card-top{grid-template-columns:68px 1fr}.rx-profile-card-photo{width:68px;height:68px;border-radius:17px}.rx-profile-card-main .ring{margin:auto}}
    `;
    document.head.appendChild(style);
  }

  async function signedUrl(bucket, path, seconds){
    if (!path) return '';
    const result = await client.storage.from(bucket).createSignedUrl(path, seconds || 3600);
    return result.error || !result.data ? '' : result.data.signedUrl;
  }

  function render(){
    const card = document.querySelector('#overviewPage .profile-card');
    if (!card || !profile) return;
    addStyles();
    card.classList.add('rx-complete-card');

    const name = profile.full_name || 'Candidate';
    const role = profile.target_role || 'Target role not set';
    const location = profile.location || 'Location not set';
    const summary = profile.profile_summary || 'No profile summary added yet.';
    const photoStyle = photoUrl ? `style="background-image:url('${safe(photoUrl)}')"` : '';
    const photoContent = photoUrl ? '' : safe(initials(name));

    card.innerHTML = `
      <div class="rx-profile-card-top">
        <div class="rx-profile-card-photo" ${photoStyle}>${photoContent}</div>
        <div>
          <div class="rx-profile-card-name">${safe(name)}</div>
          <div class="rx-profile-card-meta">${safe(role)} · ${safe(location)}</div>
        </div>
      </div>
      <div class="rx-profile-card-main">
        <div class="ring" id="completionRing"><div><b id="completionPct">0%</b><span>Complete</span></div></div>
        <div><h2>Profile completion</h2><ul id="checkList"></ul></div>
      </div>
      <div class="rx-profile-card-summary"><b>Profile summary</b><p>${safe(summary)}</p></div>
      <div class="rx-profile-card-actions">
        <button class="small-btn primary-mini" type="button" id="rxViewMyCv" ${cvUrl ? '' : 'disabled'}>View my CV</button>
        <button class="small-btn" type="button" onclick="editProfile()">Edit profile</button>
      </div>`;

    const local = (() => { try { return JSON.parse(localStorage.getItem('rolexa_candidate_profile_v2') || '{}'); } catch(e){ return {}; } })();
    const checks = [
      ['Personal details', !!profile.full_name && !!profile.email],
      ['Location', !!profile.location],
      ['Target role', !!profile.target_role],
      ['Skills', !!profile.skills],
      ['Profile summary', !!profile.profile_summary],
      ['CV upload', !!profile.has_cv || !!profile.cv_file_path]
    ];
    const completeCount = checks.filter(item => item[1]).length;
    const pct = Math.round((completeCount / checks.length) * 100);
    byId('completionPct').textContent = pct + '%';
    byId('completionRing').style.setProperty('--pct', pct);
    byId('checkList').innerHTML = checks.map(item => `<li><span>${safe(item[0])}</span><b class="${item[1] ? 'tick' : 'todo'}">${item[1] ? '✓' : '○'}</b></li>`).join('');

    const viewCv = byId('rxViewMyCv');
    if (viewCv && cvUrl) viewCv.addEventListener('click', () => window.open(cvUrl, '_blank', 'noopener'));
  }

  async function refresh(){
    if (!client || !user) return;
    const result = await client.from('candidate_profiles').select('full_name,email,location,target_role,skills,profile_summary,has_cv,cv_file_path,photo_file_path').eq('user_id', user.id).maybeSingle();
    if (result.error || !result.data) return;
    profile = result.data;
    const urls = await Promise.all([
      signedUrl(CONFIG.photoBucket, profile.photo_file_path, 3600),
      signedUrl(CONFIG.cvBucket, profile.cv_file_path, 900)
    ]);
    photoUrl = urls[0];
    cvUrl = urls[1];
    render();
  }

  async function init(){
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    try {
      const lib = await loadSupabase();
      client = lib.createClient(CONFIG.url, CONFIG.key);
      const session = await client.auth.getSession();
      user = session.data && session.data.session && session.data.session.user;
      if (!user) return;
      await refresh();
      setTimeout(refresh, 1200);
    } catch(error){
      console.warn('Rolexa profile card failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();