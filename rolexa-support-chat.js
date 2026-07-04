(() => {
  if (window.__rolexaSupportLoaded) return;
  window.__rolexaSupportLoaded = true;

  const CONFIG = {
    llmEndpoint: null,
    storageKey: 'rolexa_support_chat_v1'
  };

  const style = document.createElement('style');
  style.textContent = `
    .rx-chat-launcher{position:fixed;right:22px;bottom:22px;z-index:9999;border:0;border-radius:999px;background:#4C74FF;color:#fff;box-shadow:0 18px 40px rgba(10,14,26,.28);padding:14px 18px;font:700 14px Inter,system-ui,sans-serif;display:flex;align-items:center;gap:10px;cursor:pointer;}
    .rx-chat-launcher:hover{background:#8CA6FF;}
    .rx-chat-dot{width:9px;height:9px;border-radius:50%;background:#2FAE7A;box-shadow:0 0 0 4px rgba(47,174,122,.18);}
    .rx-chat-panel{position:fixed;right:22px;bottom:82px;z-index:9999;width:370px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border:1px solid rgba(10,14,26,.10);border-radius:22px;box-shadow:0 24px 70px rgba(10,14,26,.32);overflow:hidden;display:none;flex-direction:column;font-family:Inter,system-ui,sans-serif;color:#0A0E1A;}
    .rx-chat-panel.open{display:flex;}
    .rx-chat-head{background:linear-gradient(180deg,#1A275C,#0A0E1A);color:#fff;padding:18px 18px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
    .rx-chat-title{font-weight:800;font-size:15px;line-height:1.2;}
    .rx-chat-sub{color:#C7D3FF;font-size:12px;line-height:1.35;margin-top:4px;}
    .rx-chat-close{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:999px;width:30px;height:30px;cursor:pointer;font-size:18px;line-height:1;}
    .rx-chat-body{flex:1;background:#F5F7FC;padding:16px;overflow:auto;display:flex;flex-direction:column;gap:10px;}
    .rx-msg{max-width:86%;padding:10px 12px;border-radius:15px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;}
    .rx-msg.bot{background:#fff;border:1px solid rgba(10,14,26,.08);align-self:flex-start;border-bottom-left-radius:5px;}
    .rx-msg.user{background:#4C74FF;color:#fff;align-self:flex-end;border-bottom-right-radius:5px;}
    .rx-chat-quick{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;}
    .rx-chip{border:1px solid rgba(10,14,26,.10);background:#fff;color:#1A275C;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer;}
    .rx-chip:hover{border-color:#4C74FF;color:#2946C7;}
    .rx-typing{display:none;align-self:flex-start;background:#fff;border:1px solid rgba(10,14,26,.08);border-radius:15px;border-bottom-left-radius:5px;padding:10px 12px;color:#8892B0;font-size:13px;}
    .rx-typing.show{display:block;}
    .rx-chat-form{border-top:1px solid rgba(10,14,26,.08);background:#fff;padding:12px;display:flex;gap:8px;}
    .rx-chat-input{flex:1;border:1px solid rgba(10,14,26,.12);border-radius:999px;padding:11px 13px;font-size:13.5px;outline:none;}
    .rx-chat-input:focus{border-color:#4C74FF;}
    .rx-chat-send{border:0;border-radius:999px;background:#0A0E1A;color:#fff;font-weight:800;font-size:13px;padding:0 15px;cursor:pointer;}
    .rx-chat-send:hover{background:#4C74FF;}
    .rx-chat-small{font-size:11.5px;color:#8892B0;line-height:1.4;padding:0 14px 12px;background:#fff;}
    @media(max-width:780px){.rx-chat-launcher{right:14px;bottom:14px;padding:13px 15px;}.rx-chat-panel{right:14px;bottom:74px;width:calc(100vw - 28px);height:500px;max-height:calc(100vh - 94px);}.rx-msg{max-width:92%;}}
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.className = 'rx-chat-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open Rolexa support chat');
  launcher.innerHTML = '<span class="rx-chat-dot"></span><span>Need help?</span>';

  const panel = document.createElement('section');
  panel.className = 'rx-chat-panel';
  panel.setAttribute('aria-label', 'Rolexa support chat');
  panel.innerHTML = `
    <div class="rx-chat-head">
      <div>
        <div class="rx-chat-title">Rolexa support</div>
        <div class="rx-chat-sub">Ask about early access, candidates, employers or the demo.</div>
      </div>
      <button class="rx-chat-close" type="button" aria-label="Close support chat">×</button>
    </div>
    <div class="rx-chat-body" id="rxChatBody"></div>
    <div class="rx-typing" id="rxTyping">Rolexa support is typing...</div>
    <form class="rx-chat-form" id="rxChatForm">
      <input class="rx-chat-input" id="rxChatInput" autocomplete="off" placeholder="Type your question...">
      <button class="rx-chat-send" type="submit">Send</button>
    </form>
    <div class="rx-chat-small">Prototype assistant. It helps with Rolexa questions but does not create accounts or guarantee hiring outcomes.</div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  const body = panel.querySelector('#rxChatBody');
  const form = panel.querySelector('#rxChatForm');
  const input = panel.querySelector('#rxChatInput');
  const typing = panel.querySelector('#rxTyping');
  const close = panel.querySelector('.rx-chat-close');

  const quickQuestions = [
    'Is Rolexa live yet?',
    'I’m a candidate',
    'I’m an employer',
    'What happens after I join?'
  ];

  function escapeHtml(text){
    return String(text).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  }

  function addMessage(text, from='bot'){
    const msg = document.createElement('div');
    msg.className = `rx-msg ${from}`;
    msg.innerHTML = escapeHtml(text);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    saveHistory();
  }

  function addQuickChips(){
    const holder = document.createElement('div');
    holder.className = 'rx-chat-quick';
    quickQuestions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'rx-chip';
      btn.type = 'button';
      btn.textContent = q;
      btn.addEventListener('click', () => handleUser(q));
      holder.appendChild(btn);
    });
    body.appendChild(holder);
    body.scrollTop = body.scrollHeight;
  }

  function replyFor(text){
    const t = text.toLowerCase();
    if (t.includes('live') || t.includes('launch') || t.includes('ready')) {
      return 'Rolexa is not fully live yet. Right now you can join early access as a candidate or employer, and the team will use the waitlist to invite people before launch.';
    }
    if (t.includes('candidate') || t.includes('job') || t.includes('work') || t.includes('role')) {
      return 'For candidates, Rolexa is being built to help you create one profile, track applications, see clearer salary guidance and message employers once shortlisted. You can join the candidate waitlist from the early access page.';
    }
    if (t.includes('employer') || t.includes('hire') || t.includes('hiring') || t.includes('company')) {
      return 'For employers, Rolexa will support job posting, candidate review, shortlisting, pipeline tracking and in-app messages. Employer access is waitlist only while the platform is being built.';
    }
    if (t.includes('account') || t.includes('login') || t.includes('sign in')) {
      return 'There are no live Rolexa accounts yet. The early access form adds you to the waitlist. When accounts open, Rolexa can contact people from that list first.';
    }
    if (t.includes('duplicate') || t.includes('already') || t.includes('email')) {
      return 'If your email is already on the list, you do not need to submit again. You can still join the other waitlist type separately, for example candidate and employer.';
    }
    if (t.includes('salary') || t.includes('pay')) {
      return 'The salary explorer is a prototype guide using indicative UK pay bands by region and level. It is there to show the direction of the product, not to guarantee live market salary data yet.';
    }
    if (t.includes('price') || t.includes('pricing') || t.includes('cost') || t.includes('subscription')) {
      return 'Employer pricing is still being finalised for launch. At the moment, the main action is to join employer early access so Rolexa can contact interested companies first.';
    }
    if (t.includes('human') || t.includes('contact') || t.includes('support')) {
      return 'The fastest next step is to join early access and leave your details. This assistant can help with basic Rolexa questions, but it is not a live human agent yet.';
    }
    return 'I can help with Rolexa early access, candidate signups, employer access, the dashboard demo, salary explorer, or what happens after you join the waitlist. What would you like to know?';
  }

  async function getReply(text){
    if (CONFIG.llmEndpoint) {
      try {
        const res = await fetch(CONFIG.llmEndpoint, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({message:text, page:location.pathname})
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) return data.reply;
        }
      } catch (e) {}
    }
    return replyFor(text);
  }

  async function handleUser(text){
    const clean = text.trim();
    if (!clean) return;
    addMessage(clean, 'user');
    input.value = '';
    typing.classList.add('show');
    body.scrollTop = body.scrollHeight;
    const reply = await getReply(clean);
    setTimeout(() => {
      typing.classList.remove('show');
      addMessage(reply, 'bot');
    }, Math.min(900 + reply.length * 7, 1800));
  }

  function saveHistory(){
    const items = Array.from(body.querySelectorAll('.rx-msg')).slice(-16).map(el => ({from:el.classList.contains('user')?'user':'bot', text:el.textContent}));
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(items)); } catch(e) {}
  }

  function loadHistory(){
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      if (saved.length) {
        saved.forEach(m => addMessage(m.text, m.from));
        return true;
      }
    } catch(e) {}
    return false;
  }

  launcher.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) setTimeout(() => input.focus(), 80);
  });
  close.addEventListener('click', () => panel.classList.remove('open'));
  form.addEventListener('submit', e => { e.preventDefault(); handleUser(input.value); });

  if (!loadHistory()) {
    addMessage('Hi, I’m the Rolexa support assistant. I can help with early access, candidate signups, employer access and the demo.');
    addQuickChips();
  }
})();
