(() => {
  if (!/employer-dashboard\.html$/i.test(location.pathname)) return;
  if (window.__rolexaVerifiedJobsSaveRepair) return;
  window.__rolexaVerifiedJobsSaveRepair = true;

  const SUPABASE_URL = 'https://hndzomiigjjyyconeqpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bHyw-HOLRFv_7FDAI1amhQ_MX-Sjocd';
  const PENDING_KEY = 'rolexa_pending_verified_job_v2';
  const byId = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function readPending() {
    try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); }
    catch { return null; }
  }

  function writePending(value) {
    if (value) sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDING_KEY);
  }

  function valuesFromForm() {
    return {
      title: byId('jobTitle')?.value.trim() || '',
      company: byId('company')?.value.trim() || '',
      salary: byId('salaryRange')?.value.trim() || '',
      hiring_owner_name: byId('rxSafeOwnerName')?.value.trim() || '',
      hiring_owner_email: byId('rxSafeOwnerEmail')?.value.trim() || '',
      first_review_commitment: byId('rxSafeReview')?.value || '',
      expected_hiring_date: byId('rxSafeHiringDate')?.value || '',
      role_exists: !!byId('rxSafeRoleExists')?.checked,
      budget_approved: !!byId('rxSafeBudget')?.checked,
      applications_actively_reviewed: !!byId('rxSafeReviewed')?.checked,
      final_outcome_promised: !!byId('rxSafeOutcome')?.checked
    };
  }

  function complete(v) {
    return Boolean(v && v.title && v.company && v.salary && v.hiring_owner_name && v.hiring_owner_email && v.first_review_commitment && v.expected_hiring_date && v.role_exists && v.budget_approved && v.applications_actively_reviewed && v.final_outcome_promised);
  }

  async function getClientAndUser() {
    let lib = window.supabase;
    if (!lib?.createClient) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-rx-repair-supabase]');
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.dataset.rxRepairSupabase = 'true';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      lib = window.supabase;
    }
    const client = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user) throw new Error('Employer session was not available for verification save.');
    return { client, user };
  }

  async function findJob(client, user, pending) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await wait(attempt === 0 ? 900 : 400);
      const { data, error } = await client
        .from('jobs')
        .select('id,title,company,updated_at')
        .eq('employer_user_id', user.id)
        .eq('title', pending.title)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const exact = (data || []).find(job => String(job.company || '').toLowerCase() === pending.company.toLowerCase());
      if (exact) return exact;
      if ((data || [])[0]) return data[0];
    }
    return null;
  }

  async function savePending() {
    const pending = readPending();
    if (!complete(pending)) return;
    try {
      const { client, user } = await getClientAndUser();
      const job = await findJob(client, user, pending);
      if (!job) throw new Error('The published job could not be matched to its verification details.');
      const now = new Date();
      const payload = {
        job_id: String(job.id),
        hiring_owner_name: pending.hiring_owner_name,
        hiring_owner_email: pending.hiring_owner_email,
        first_review_commitment: pending.first_review_commitment,
        expected_hiring_date: pending.expected_hiring_date,
        role_exists: true,
        budget_approved: true,
        applications_actively_reviewed: true,
        final_outcome_promised: true,
        verification_status: 'verified',
        verified_at: now.toISOString(),
        last_confirmed_at: now.toISOString(),
        reconfirm_by: new Date(now.getTime() + 30 * 86400000).toISOString(),
        updated_at: now.toISOString()
      };
      const { error } = await client.from('job_verifications').upsert(payload, { onConflict: 'job_id' });
      if (error) throw error;
      writePending(null);
      const bar = byId('statusBar');
      if (bar) {
        bar.className = 'statusbar show good';
        bar.textContent = 'Job and verification details saved securely to Supabase.';
      }
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      console.warn('[Rolexa] Verified job repair save failed', error);
      const bar = byId('statusBar');
      if (bar) {
        bar.className = 'statusbar show bad';
        bar.textContent = error.message || 'The job saved, but verification details could not be saved.';
      }
    }
  }

  function attach() {
    const form = byId('jobForm');
    if (!form || form.dataset.rxVerifiedRepairAttached === 'true') return;
    form.dataset.rxVerifiedRepairAttached = 'true';
    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      const values = valuesFromForm();
      if (!complete(values)) return;
      writePending(values);
      setTimeout(savePending, 1200);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attach();
      setTimeout(() => { attach(); savePending(); }, 800);
    }, { once: true });
  } else {
    attach();
    setTimeout(() => { attach(); savePending(); }, 800);
  }
})();