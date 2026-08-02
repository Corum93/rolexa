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
  auth_accounts_count bigint := 0;
  marketplace_users_count bigint := 0;
  internal_staff_count bigint := 0;
  candidates_count bigint := 0;
  employers_count bigint := 0;
  applications_count bigint := 0;
  applications_today_count bigint := 0;
  applications_this_month_count bigint := 0;
  current_interviews_count bigint := 0;
  current_offers_count bigint := 0;
  successful_hires_count bigint := 0;
  jobs_count bigint := 0;
  live_jobs_count bigint := 0;
  draft_jobs_count bigint := 0;
  active_employers_count bigint := 0;
  roadmap_completion numeric := 0;
  open_bugs_count bigint := 0;
  open_improvements_count bigint := 0;
  application_statuses jsonb := '{}'::jsonb;
begin
  if not public.is_rolexa_staff(array['owner','admin','employee','analyst']) then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  select count(*) into auth_accounts_count from auth.users;

  if to_regclass('public.rolexa_staff_users') is not null then
    execute 'select count(distinct user_id) from public.rolexa_staff_users where is_active is true and user_id is not null'
      into internal_staff_count;
  end if;

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

  -- Marketplace users are deduplicated across candidate and employer identities.
  -- Raw Auth accounts and Rolexa staff are deliberately not used as this KPI.
  if to_regclass('public.candidate_profiles') is not null
     and to_regclass('public.employer_profiles') is not null
     and to_regclass('public.jobs') is not null then
    execute $metric$
      select count(*)
      from (
        select user_id from public.candidate_profiles where user_id is not null
        union
        select user_id from public.employer_profiles where user_id is not null
        union
        select employer_user_id from public.jobs where employer_user_id is not null
      ) marketplace_users
    $metric$ into marketplace_users_count;
  else
    marketplace_users_count := candidates_count + employers_count;
  end if;

  -- Rolexa stores real candidate applications in candidate_applications.
  if to_regclass('public.candidate_applications') is not null then
    execute 'select count(*) from public.candidate_applications'
      into applications_count;

    execute $metric$
      select
        count(*) filter (where coalesce(applied_at, updated_at)::date = current_date),
        count(*) filter (
          where coalesce(applied_at, updated_at) >= date_trunc('month', current_date)::timestamptz
            and coalesce(applied_at, updated_at) < (date_trunc('month', current_date) + interval '1 month')::timestamptz
        ),
        count(*) filter (where lower(trim(coalesce(status, ''))) in ('interview', 'interviewing', 'interview_scheduled', 'interview scheduled')),
        count(*) filter (where lower(trim(coalesce(status, ''))) in ('offer', 'offered')),
        count(*) filter (where lower(trim(coalesce(status, ''))) in ('hired', 'successful hire'))
      from public.candidate_applications
    $metric$
      into applications_today_count,
           applications_this_month_count,
           current_interviews_count,
           current_offers_count,
           successful_hires_count;

    execute $metric$
      select coalesce(jsonb_object_agg(status_name, status_count order by status_name), '{}'::jsonb)
      from (
        select
          coalesce(nullif(lower(trim(status)), ''), 'unknown') as status_name,
          count(*)::bigint as status_count
        from public.candidate_applications
        group by coalesce(nullif(lower(trim(status)), ''), 'unknown')
      ) statuses
    $metric$ into application_statuses;
  end if;

  if to_regclass('public.jobs') is not null then
    execute 'select count(*) from public.jobs' into jobs_count;
    execute 'select count(*) from public.jobs where is_active = true' into live_jobs_count;
    execute $metric$
      select count(*)
      from public.jobs
      where lower(trim(coalesce(lifecycle_status, ''))) = 'draft'
    $metric$ into draft_jobs_count;
    execute 'select count(distinct employer_user_id) from public.jobs where is_active = true and employer_user_id is not null'
      into active_employers_count;
  end if;

  if to_regclass('public.product_roadmap_summary') is not null then
    execute 'select coalesce(overall_completion_percentage, 0) from public.product_roadmap_summary limit 1'
      into roadmap_completion;
  end if;

  if to_regclass('public.product_feature_work_items') is not null then
    execute $metric$
      select
        count(*) filter (where lower(trim(coalesce(item_type, ''))) = 'bug'),
        count(*) filter (where lower(trim(coalesce(item_type, ''))) = 'improvement')
      from public.product_feature_work_items
      where lower(trim(coalesce(status, ''))) not in ('resolved', 'closed', 'cancelled')
    $metric$ into open_bugs_count, open_improvements_count;
  end if;

  return jsonb_build_object(
    -- total_users remains for backwards compatibility with the existing UI,
    -- but now correctly means marketplace users rather than raw Auth rows.
    'total_users', marketplace_users_count,
    'marketplace_users', marketplace_users_count,
    'internal_staff', internal_staff_count,
    'auth_accounts', auth_accounts_count,
    'candidates', candidates_count,
    'employers', employers_count,
    'applications', applications_count,
    'applications_today', applications_today_count,
    'applications_this_month', applications_this_month_count,
    'current_interviews', current_interviews_count,
    'current_offers', current_offers_count,
    'successful_hires', successful_hires_count,
    'application_statuses', application_statuses,
    'jobs', jobs_count,
    'live_jobs', live_jobs_count,
    'draft_jobs', draft_jobs_count,
    'active_employers', active_employers_count,
    'roadmap_completion', roadmap_completion,
    'open_bugs', open_bugs_count,
    'open_improvements', open_improvements_count,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_rolexa_admin_headline_metrics() from public;
grant execute on function public.get_rolexa_admin_headline_metrics() to authenticated;

comment on function public.get_rolexa_admin_headline_metrics() is
'Returns secure Phase 5 executive metrics to approved active internal staff, including marketplace activity, job lifecycle, roadmap completion and open product work.';
