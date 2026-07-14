(() => {
  if (window.__candidateMessageSendLoaded) return;
  window.__candidateMessageSendLoaded = true;

  const supabaseUrl = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const supabaseKey = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';

  async function init() {
    if (!/candidate-dashboard\.html$/.test(location.pathname)) return;
    if (!window.supabase || !window.supabase.createClient) return;

    const client = window.supabase.createClient(supabaseUrl, supabaseKey);
    const sessionResult = await client.auth.getSession();
    const user = sessionResult.data?.session?.user;
    if (!user) return;

    document.addEventListener('submit', async event => {
      if (!event.target || event.target.id !== 'chatForm') return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const input = document.getElementById('chatInput');
      const button = event.target.querySelector('button');
      const thread = document.querySelector('[data-candidate-thread].active');
      const body = input?.value.trim() || '';
      const threadKey = thread?.getAttribute('data-candidate-thread') || '';

      if (!body || !threadKey) return;

      if (button) {
        button.disabled = true;
        button.textContent = 'Sending...';
      }

      const { error } = await client.from('candidate_messages').insert({
        user_id: user.id,
        thread_key: threadKey,
        sender: 'candidate',
        sender_name: 'Candidate',
        body
      });

      if (error) {
        if (button) {
          button.disabled = false;
          button.textContent = 'Send';
        }
        alert(error.message || 'Could not send reply.');
        return;
      }

      input.value = '';
      location.reload();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }
})();