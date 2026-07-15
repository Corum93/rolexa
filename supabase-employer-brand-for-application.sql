-- Rolexa employer brand lookup for candidate-facing application views.
-- Run in the Supabase SQL editor before testing company identity in candidate messages.

create or replace function public.get_employer_brand_for_application(
  p_application_id uuid
)
returns table (
  company_name text,
  logo_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in'
      using errcode = '42501';
  end if;

  return query
  select
    coalesce(ep.company_name, j.company, 'Employer')::text,
    ep.logo_url::text
  from public.candidate_applications ca
  join public.jobs j
    on j.id = ca.job_id
  left join public.employer_profiles ep
    on ep.user_id = j.employer_user_id
  where ca.id = p_application_id
    and (
      ca.user_id = auth.uid()
      or j.employer_user_id = auth.uid()
      or public.is_rolexa_staff(array['owner','admin','employee'])
    )
  limit 1;
end;
$function$;

revoke execute
on function public.get_employer_brand_for_application(uuid)
from public, anon;

grant execute
on function public.get_employer_brand_for_application(uuid)
to authenticated, service_role;

comment on function public.get_employer_brand_for_application(uuid) is
'Returns only the company name and public logo for an application when the signed-in user owns the application, owns the associated job, or is approved Rolexa staff.';
