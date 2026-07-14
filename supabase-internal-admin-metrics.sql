-- Rolexa Step 3: secure headline platform metrics
-- Re-run in the Supabase SQL editor whenever this definition changes.

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
    execute 'select count(distinct user_id) from public.candidate_profiles where user_id is not null'
      into candidates_count;
  end if;

  -- An employer counts once they have either created a company profile or posted a job.
  -- This avoids reporting zero for genuine employer accounts that began hiring before
  -- the editable employer profile feature existed.
  if to_regclass('public.employer_profiles') is not null
     and to_regclass('public.jobs') is not null then
    execute $metric$
      select count(*)
      from (
        select user_id as employer_user_id
        from public.employer_profiles
        where user_id is not null
        union
        select employer_user_id
        from public.jobs
        where employer_user_id is not null
      ) employers
    $metric$ into employers_count;
  elsif to_regclass('public.employer_profiles') is not null then
    execute 'select count(distinct user_id) from public.employer_profiles where user_id is not null'
      into employers_count;
  elsif to_regclass('public.jobs') is not null then
    execute 'select count(distinct employer_user_id) from public.jobs where employer_user_id is not null'
      into employers_count;
  end if;

  -- Rolexa stores real candidate applications in candidate_applications.
  if to_regclass('public.candidate_applications') is not null then
    execute 'select count(*) from public.candidate_applications'
      into applications_count;
  end if;

  if to_regclass('public.jobs') is not null then
    execute 'select count(*) from public.jobs' into jobs_count;
    execute 'select count(*) from public.jobs where is_active = true' into live_jobs_count;
    execute 'select count(distinct employer_user_id) from public.jobs where is_active = true and employer_user_id is not null'
      into active_employers_count;
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
'Returns aggregated Rolexa platform metrics only to approved active internal staff. Employers are deduplicated across employer profiles and job ownership; applications come from candidate_applications.';
