(() => {
  if (window.RolexaEmployerTermsAccess) return;

  const CURRENT_TABLE = 'employer_terms_current';
  const VERSIONS_TABLE = 'employer_terms_versions';

  async function getCurrentTerms(client) {
    const pointerResult = await client
      .from(CURRENT_TABLE)
      .select('terms_version_id')
      .eq('singleton', true)
      .maybeSingle();

    if (pointerResult.error) throw pointerResult.error;
    if (!pointerResult.data?.terms_version_id) return null;

    const now = new Date().toISOString();
    const termsResult = await client
      .from(VERSIONS_TABLE)
      .select('id,version_code,title,terms_text,terms_sha256,currency,monthly_subscription_pence,placement_fee_basis_points,placement_fee_basis,vat_treatment,rebate_days_1_to_30,rebate_days_31_to_60,rebate_days_61_to_90,rebate_after_day_90,effective_from,published_at')
      .eq('id', pointerResult.data.terms_version_id)
      .lte('published_at', now)
      .lte('effective_from', now)
      .maybeSingle();

    if (termsResult.error) throw termsResult.error;
    return termsResult.data || null;
  }

  function appliesToUser(user, terms) {
    if (!user || !terms) return false;
    const accountCreatedAt = Date.parse(user.created_at || '');
    const effectiveFrom = Date.parse(terms.effective_from || '');
    if (!Number.isFinite(effectiveFrom)) return false;
    if (!Number.isFinite(accountCreatedAt)) return true;
    return accountCreatedAt >= effectiveFrom;
  }

  async function getStatus(client, user) {
    const terms = await getCurrentTerms(client);
    if (!terms) return { published: false, required: false, accepted: false, terms: null };

    const required = appliesToUser(user, terms);
    if (!required) return { published: true, required: false, accepted: false, terms };

    const acceptanceResult = await client.rpc('has_current_employer_terms');
    if (acceptanceResult.error) throw acceptanceResult.error;
    return { published: true, required: true, accepted: acceptanceResult.data === true, terms };
  }

  window.RolexaEmployerTermsAccess = { getCurrentTerms, getStatus, appliesToUser };
})();
