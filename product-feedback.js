(() => {
  if (window.__rolexaProductFeedback) return;
  window.__rolexaProductFeedback = true;

  const path = location.pathname.split('/').pop() || 'index.html';
  const context = (() => {
    if (path === 'candidate-dashboard.html') return { accountType: 'candidate', source: 'candidate_dashboard' };
    if (path === 'employer-dashboard.html') return { accountType: 'employer', source: 'employer_dashboard' };
    if (path === 'candidate-demo.html') return { accountType: 'candidate_demo', source: 'candidate_demo' };
    if (path === 'employer-demo.html') return { accountType: 'employer_demo', source: 'employer_demo' };
    return { accountType: 'visitor', source: 'homepage' };
  })();

  let clientPromise = null;
  let activeRating = 0;

  const safe = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[ch]));

  function loadSupabase(){
    return new Promise((resolve,reject) => {
      if (window.supabase?.createClient) return resolve(window.supabase);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Could not load feedback service'));
      document.head.appendChild(script);
    });
  }

  async function readConfig(){
    const files = ['candidate-profile-sync.js','employer-job-sync.js?v=3'];
    for (const file of files) {
      try {
        const response = await fetch(file,{cache:'no-store'});
        const text = await response.text();
        const url = (text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
        const key = (text.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
        if (url && key) return {url,key};
      } catch(error) {}
    }
    throw new Error('Feedback configuration unavailable');
  }

  async function getClient(){
    if (!clientPromise) {
      clientPromise = Promise.all([loadSupabase(),readConfig()]).then(([lib,config]) => lib.createClient(config.url,config.key));
    }
    return clientPromise;
  }

  function addStyles(){
    if (document.getElementById('rxFeedbackStyles')) return;
    const style = document.createElement('style');
    style.id = 'rxFeedbackStyles';
    style.textContent = `
      .rx-feedback-trigger{position:fixed;right:20px;bottom:92px;z-index:890;display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(23,107,255,.18);background:#fff;color:#0a1738;border-radius:999px;padding:12px 16px;font:800 13px Inter,sans-serif;box-shadow:0 16px 38px rgba(7,16,37,.15);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
      .rx-feedback-trigger:hover{transform:translateY(-2px);box-shadow:0 20px 46px rgba(7,16,37,.2)}
      .rx-feedback-trigger span{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#eaf0ff;color:#176bff;font-size:14px}
      .rx-feedback-backdrop{position:fixed;inset:0;z-index:990;background:rgba(4,10,27,.58);backdrop-filter:blur(4px);display:none;padding:22px;overflow:auto}
      .rx-feedback-backdrop.open{display:grid;place-items:center}
      .rx-feedback-modal{width:min(100%,570px);background:#fff;border:1px solid rgba(7,16,37,.09);border-radius:25px;box-shadow:0 28px 90px rgba(2,8,24,.28);overflow:hidden;font-family:Inter,sans-serif}
      .rx-feedback-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:24px 25px 18px;background:linear-gradient(145deg,#f7f9ff,#eef3ff)}
      .rx-feedback-kicker{font-size:10.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#176bff;margin-bottom:7px}
      .rx-feedback-head h2{font:700 27px/1.15 'Space Grotesk',Inter,sans-serif;color:#071025;margin:0}
      .rx-feedback-head p{font-size:13.5px;line-height:1.5;color:#667085;margin:7px 0 0;max-width:430px}
      .rx-feedback-close{width:39px;height:39px;flex:0 0 auto;border:1px solid rgba(7,16,37,.1);border-radius:50%;background:#fff;color:#071025;font-size:23px;line-height:1;cursor:pointer}
      .rx-feedback-form{padding:22px 25px 25px;display:grid;gap:16px}
      .rx-feedback-field{display:grid;gap:7px}
      .rx-feedback-field label,.rx-feedback-rating-label{font-size:11.5px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#142044}
      .rx-feedback-field select,.rx-feedback-field textarea,.rx-feedback-field input{width:100%;border:1px solid rgba(7,16,37,.11);border-radius:13px;background:#f7f9fc;color:#071025;padding:12px 13px;font:500 14px Inter,sans-serif;outline:none}
      .rx-feedback-field textarea{min-height:116px;resize:vertical;line-height:1.5}
      .rx-feedback-field select:focus,.rx-feedback-field textarea:focus,.rx-feedback-field input:focus{background:#fff;border-color:#176bff;box-shadow:0 0 0 3px rgba(23,107,255,.09)}
      .rx-feedback-rating{display:flex;gap:8px;flex-wrap:wrap}
      .rx-feedback-rate{width:43px;height:43px;border:1px solid rgba(7,16,37,.1);border-radius:12px;background:#fff;color:#516078;font-weight:900;cursor:pointer}
      .rx-feedback-rate.active{background:#176bff;border-color:#176bff;color:#fff;box-shadow:0 8px 20px rgba(23,107,255,.22)}
      .rx-feedback-meta{font-size:11.5px;color:#8490a8;line-height:1.45}
      .rx-feedback-actions{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .rx-feedback-submit{border:0;border-radius:999px;background:#176bff;color:#fff;padding:12px 19px;font:900 13.5px Inter,sans-serif;cursor:pointer;white-space:nowrap}
      .rx-feedback-submit:disabled{opacity:.58;cursor:not-allowed}
      .rx-feedback-status{font-size:12.5px;line-height:1.4;color:#667085;min-height:18px}
      .rx-feedback-status.good{color:#176b49;font-weight:800}.rx-feedback-status.bad{color:#a33327;font-weight:800}
      @media(max-width:760px){
        .rx-feedback-trigger{right:14px;bottom:82px;padding:11px 14px}
        .rx-feedback-backdrop{padding:12px;align-items:end}
        .rx-feedback-modal{border-radius:23px 23px 16px 16px;max-height:92dvh;overflow:auto}
        .rx-feedback-head{padding:21px 19px 16px}.rx-feedback-head h2{font-size:24px}
        .rx-feedback-form{padding:19px;gap:14px}.rx-feedback-actions{align-items:stretch;flex-direction:column}.rx-feedback-submit{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function build(){
    if (document.getElementById('rxFeedbackTrigger')) return;
    addStyles();
    const trigger = document.createElement('button');
    trigger.id = 'rxFeedbackTrigger';
    trigger.className = 'rx-feedback-trigger';
    trigger.type = 'button';
    trigger.innerHTML = '<span>✦</span> Give feedback';
    trigger.setAttribute('aria-haspopup','dialog');

    const backdrop = document.createElement('div');
    backdrop.className = 'rx-feedback-backdrop';
    backdrop.id = 'rxFeedbackBackdrop';
    backdrop.innerHTML = `<section class="rx-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="rxFeedbackTitle"><header class="rx-feedback-head"><div><div class="rx-feedback-kicker">Help shape Rolexa</div><h2 id="rxFeedbackTitle">What would you like to share?</h2><p>Tell us what is useful, what feels unclear or what would make Rolexa work better for you.</p></div><button class="rx-feedback-close" type="button" aria-label="Close feedback form">×</button></header><form class="rx-feedback-form" id="rxFeedbackForm"><div class="rx-feedback-field"><label for="rxFeedbackCategory">Feedback type</label><select id="rxFeedbackCategory" required><option value="">Choose a category</option><option value="improvement">Suggest an improvement</option><option value="technical_issue">Something is not working</option><option value="matching_quality">Matching quality</option><option value="candidate_experience">Candidate experience</option><option value="employer_experience">Employer experience</option><option value="general">General feedback</option></select></div><div><div class="rx-feedback-rating-label">How would you rate this experience? <span style="font-weight:500;text-transform:none;color:#8a94aa">(optional)</span></div><div class="rx-feedback-rating" aria-label="Feedback rating">${[1,2,3,4,5].map(n => `<button class="rx-feedback-rate" type="button" data-rating="${n}" aria-label="${n} out of 5">${n}</button>`).join('')}</div></div><div class="rx-feedback-field"><label for="rxFeedbackMessage">Your feedback</label><textarea id="rxFeedbackMessage" required maxlength="1500" placeholder="What happened, what did you expect, or what should we improve?"></textarea></div><div class="rx-feedback-field"><label for="rxFeedbackEmail">Email for a reply <span style="font-weight:500;text-transform:none;color:#8a94aa">(optional)</span></label><input id="rxFeedbackEmail" type="email" maxlength="180" placeholder="you@example.com"></div><div class="rx-feedback-meta">The page and workspace you are using will be attached automatically. Please do not include passwords, financial information or confidential CV details.</div><div class="rx-feedback-actions"><div class="rx-feedback-status" id="rxFeedbackStatus" aria-live="polite"></div><button class="rx-feedback-submit" type="submit">Send feedback</button></div></form></section>`;
    document.body.append(trigger,backdrop);

    const form = backdrop.querySelector('#rxFeedbackForm');
    const status = backdrop.querySelector('#rxFeedbackStatus');
    const submit = backdrop.querySelector('.rx-feedback-submit');
    const close = () => { backdrop.classList.remove('open'); document.body.style.overflow = ''; trigger.focus(); };
    const open = () => { backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(() => backdrop.querySelector('#rxFeedbackCategory')?.focus(),40); };

    trigger.addEventListener('click',open);
    backdrop.querySelector('.rx-feedback-close').addEventListener('click',close);
    backdrop.addEventListener('click',event => { if (event.target === backdrop) close(); });
    document.addEventListener('keydown',event => { if (event.key === 'Escape' && backdrop.classList.contains('open')) close(); });
    backdrop.querySelectorAll('.rx-feedback-rate').forEach(button => button.addEventListener('click',() => {
      activeRating = Number(button.dataset.rating || 0);
      backdrop.querySelectorAll('.rx-feedback-rate').forEach(item => item.classList.toggle('active',Number(item.dataset.rating) === activeRating));
    }));

    form.addEventListener('submit',async event => {
      event.preventDefault();
      const category = backdrop.querySelector('#rxFeedbackCategory').value;
      const message = backdrop.querySelector('#rxFeedbackMessage').value.trim();
      const email = backdrop.querySelector('#rxFeedbackEmail').value.trim();
      if (!category || message.length < 5) {
        status.className = 'rx-feedback-status bad';
        status.textContent = 'Choose a category and add a little more detail.';
        return;
      }
      const lastSent = Number(localStorage.getItem('rolexa_feedback_last_sent') || 0);
      if (Date.now() - lastSent < 30000) {
        status.className = 'rx-feedback-status bad';
        status.textContent = 'Please wait a moment before sending another response.';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.className = 'rx-feedback-status';
      status.textContent = '';
      try {
        const client = await getClient();
        const sessionResult = await client.auth.getSession();
        const user = sessionResult.data?.session?.user || null;
        const result = await client.from('product_feedback').insert({
          user_id: user?.id || null,
          account_type: context.accountType,
          category,
          rating: activeRating || null,
          message,
          email: email || user?.email || null,
          page_path: `${location.pathname}${location.hash || ''}`,
          source: context.source,
          metadata: {
            page_title: document.title,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            user_agent_group: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
          }
        });
        if (result.error) throw result.error;
        localStorage.setItem('rolexa_feedback_last_sent',String(Date.now()));
        status.className = 'rx-feedback-status good';
        status.textContent = 'Thank you — your feedback has been received.';
        form.reset();
        activeRating = 0;
        backdrop.querySelectorAll('.rx-feedback-rate').forEach(item => item.classList.remove('active'));
        setTimeout(close,1400);
      } catch(error) {
        console.error('Rolexa feedback submission failed',error);
        status.className = 'rx-feedback-status bad';
        status.textContent = 'Feedback could not be sent right now. Please try again.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Send feedback';
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
})();