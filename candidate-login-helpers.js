(() => {
  if (window.__rolexaCandidateLoginHelpers) return;
  window.__rolexaCandidateLoginHelpers = true;

  function byId(id){ return document.getElementById(id); }
  function getDb(){ return typeof db !== 'undefined' ? db : null; }
  function show(kind, message){
    if (typeof showStatus === 'function') showStatus(kind, message);
    else alert(message);
  }
  function hide(el){ if (el) el.style.display = 'none'; }
  function showBlock(el){ if (el) el.style.display = 'block'; }

  function addHelperStyles(){
    if (byId('rolexaLoginHelperStyles')) return;
    const style = document.createElement('style');
    style.id = 'rolexaLoginHelperStyles';
    style.textContent = `
      .rx-login-row{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:12px;flex-wrap:wrap;}
      .rx-text-btn{border:0;background:transparent;color:#2946C7;font-size:13px;font-weight:900;padding:0;cursor:pointer;}
      .rx-text-btn:hover{text-decoration:underline;}
      .rx-reset-area{display:none;}
      .rx-account-note{margin-top:14px;background:#F5F7FC;border:1px solid rgba(7,16,37,.1);border-radius:14px;padding:12px 13px;font-size:12.5px;line-height:1.45;color:#6B7280;}
      .rx-account-note b{color:#071025;}
    `;
    document.head.appendChild(style);
  }

  function dashboardHref(){
    return typeof nextUrl !== 'undefined' ? nextUrl : 'candidate-dashboard.html?v=8';
  }

  function buildResetArea(){
    if (byId('resetArea')) return byId('resetArea');
    const card = document.querySelector('.card');
    const area = document.createElement('div');
    area.className = 'rx-reset-area';
    area.id = 'resetArea';
    area.innerHTML = `
      <h2>Set a new password</h2>
      <p>Enter a new password for your Rolexa candidate account.</p>
      <form id="resetForm">
        <div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters"></div>
        <div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Repeat new password"></div>
        <button class="primary" type="submit">Update password</button>
      </form>
      <div class="status" id="resetStatus"></div>
      <p class="small">After updating your password, you can continue to the dashboard or sign out and log in again.</p>
    `;
    if (card) card.appendChild(area);
    return area;
  }

  function showResetArea(){
    const resetArea = buildResetArea();
    hide(byId('formArea'));
    hide(byId('sessionArea'));
    showBlock(resetArea);
  }

  function addForgotPassword(){
    const form = byId('authForm');
    if (!form || byId('forgotPasswordBtn')) return;
    const row = document.createElement('div');
    row.className = 'rx-login-row';
    row.innerHTML = '<span class="small" style="margin:0!important">Forgotten your password?</span><button class="rx-text-btn" type="button" id="forgotPasswordBtn">Reset password</button>';
    form.insertAdjacentElement('afterend', row);
    byId('forgotPasswordBtn').addEventListener('click', async () => {
      const dbClient = getDb();
      const emailInput = byId('email');
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      if (!dbClient) { show('bad', 'Login system is still loading. Try again in a moment.'); return; }
      if (!email) { show('bad', 'Enter your email first, then click reset password.'); return; }
      try {
        const { error } = await dbClient.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        show('good', 'Password reset email sent. Check your inbox and follow the link.');
      } catch (err) {
        show('bad', err.message || 'Could not send password reset email.');
      }
    });
  }

  function addAccountNote(){
    const sessionArea = byId('sessionArea');
    if (!sessionArea || byId('accountDeleteNote')) return;
    const note = document.createElement('div');
    note.className = 'rx-account-note';
    note.id = 'accountDeleteNote';
    note.innerHTML = '<b>Account deletion note:</b> deleting profile rows in Supabase tables does not delete the login account. The real login account lives under Authentication → Users in Supabase.';
    sessionArea.appendChild(note);
  }

  function wireResetForm(){
    const form = byId('resetForm');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const dbClient = getDb();
      const p1 = byId('newPassword') ? byId('newPassword').value : '';
      const p2 = byId('confirmPassword') ? byId('confirmPassword').value : '';
      const status = byId('resetStatus');
      function resetStatus(kind, message){ if (status){ status.className = 'status ' + kind; status.textContent = message; } }
      if (!dbClient) { resetStatus('bad', 'Login system is still loading. Try again in a moment.'); return; }
      if (p1.length < 6) { resetStatus('bad', 'Password must be at least 6 characters.'); return; }
      if (p1 !== p2) { resetStatus('bad', 'Passwords do not match.'); return; }
      try {
        const { error } = await dbClient.auth.updateUser({ password: p1 });
        if (error) throw error;
        resetStatus('good', 'Password updated. You can now open the dashboard or sign out and log in again.');
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.innerHTML = `<a class="btn btn-primary" href="${dashboardHref()}">Open dashboard</a><button class="btn btn-light" type="button" id="resetSignOut">Sign out</button>`;
        if (!byId('resetSignOut')) form.insertAdjacentElement('afterend', actions);
        const signOutBtn = byId('resetSignOut');
        if (signOutBtn) signOutBtn.addEventListener('click', async () => { await dbClient.auth.signOut(); location.href = 'candidate-login.html'; });
      } catch (err) {
        resetStatus('bad', err.message || 'Could not update password.');
      }
    });
  }

  function isRecoveryLink(){
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(location.search);
    return hash.get('type') === 'recovery' || search.get('type') === 'recovery';
  }

  function init(){
    addHelperStyles();
    addForgotPassword();
    addAccountNote();
    buildResetArea();
    wireResetForm();
    if (isRecoveryLink()) {
      setTimeout(() => { showResetArea(); wireResetForm(); }, 350);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
