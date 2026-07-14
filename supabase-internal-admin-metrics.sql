-- Rolexa Step 3: secure headline platform metrics
-- Run once in the Supabase SQL editor after the staff security setup.

create or replace function public.get_rolexa_admin_headline_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  total_users_count bigint := 0;
  candidates_count bigint := 0;
  employers_count bigint := 0;
  applications_count bigint := 0;
  jobs_count bigint := 0;
  live_jobs_count bigint := 0;
  active_employers_count bigint := 0;
begin
  if not public.is_rolexa_staff(array['owner','admin','employee','analyst']) then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  select count(*) into total_users_count from auth.users;

  if to_regclass('public.candidate_profiles') is not null then
    execute 'select count(*) from public.candidate_profiles' into candidates_count;
  end if;

  if to_regclass('public.employer_profiles') is not null then
    execute 'select count(*) from public.employer_profiles' into employers_count;
  end if;

  if to_regclass('public.applications') is not null then
    execute 'select count(*) from public.applications' into applications_count;
  end if;

  if to_regclass('public.jobs') is not null then
    execute 'select count(*) from public.jobs' into jobs_count;
    execute 'select count(*) from public.jobs where is_active = true' into live_jobs_count;
    execute 'select count(distinct employer_user_id) from public.jobs where is_active = true and employer_user_id is not null' into active_employers_count;
  end if;

  return jsonb_build_object(
    'total_users', total_users_count,
    'candidates', candidates_count,
    'employers', employers_count,
    'applications', applications_count,
    'jobs', jobs_count,
    'live_jobs', live_jobs_count,
    'active_employers', active_employers_count,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_rolexa_admin_headline_metrics() from public;
grant execute on function public.get_rolexa_admin_headline_metrics() to authenticated;

comment on function public.get_rolexa_admin_headline_metrics() is
'Returns aggregated Rolexa platform metrics only to approved active internal staff.';
