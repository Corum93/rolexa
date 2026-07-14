-- Rolexa Step 4: secure growth and marketplace demand analytics
-- Run in Supabase SQL Editor after the internal staff security setup.

create or replace function public.get_rolexa_admin_growth_analytics(days_back integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  safe_days integer := greatest(7, least(coalesce(days_back, 90), 365));
  start_day date := current_date - (greatest(7, least(coalesce(days_back, 90), 365)) - 1);
  timeline jsonb;
  candidate_total bigint := 0;
  employer_total bigint := 0;
  application_total bigint := 0;
  job_total bigint := 0;
  live_job_total bigint := 0;
  applications_per_job numeric := 0;
  candidates_per_employer numeric := 0;
  live_jobs_per_candidate numeric := 0;
begin
  if not public.is_rolexa_staff(array['owner','admin','employee','analyst']) then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  if to_regclass('public.candidate_profiles') is not null then
    execute 'select count(distinct user_id) from public.candidate_profiles where user_id is not null'
      into candidate_total;
  end if;

  if to_regclass('public.candidate_applications') is not null then
    execute 'select count(*) from public.candidate_applications'
      into application_total;
  end if;

  if to_regclass('public.jobs') is not null then
    execute 'select count(*) from public.jobs' into job_total;
    execute 'select count(*) from public.jobs where is_active = true' into live_job_total;
  end if;

  if to_regclass('public.employer_profiles') is not null and to_regclass('public.jobs') is not null then
    execute $metric$
      select count(*) from (
        select user_id as employer_user_id from public.employer_profiles where user_id is not null
        union
        select employer_user_id from public.jobs where employer_user_id is not null
      ) e
    $metric$ into employer_total;
  elsif to_regclass('public.employer_profiles') is not null then
    execute 'select count(distinct user_id) from public.employer_profiles where user_id is not null'
      into employer_total;
  elsif to_regclass('public.jobs') is not null then
    execute 'select count(distinct employer_user_id) from public.jobs where employer_user_id is not null'
      into employer_total;
  end if;

  applications_per_job := case when job_total > 0 then round(application_total::numeric / job_total, 2) else 0 end;
  candidates_per_employer := case when employer_total > 0 then round(candidate_total::numeric / employer_total, 2) else 0 end;
  live_jobs_per_candidate := case when candidate_total > 0 then round(live_job_total::numeric / candidate_total, 2) else 0 end;

  with days as (
    select generate_series(start_day, current_date, interval '1 day')::date as day
  ),
  registrations as (
    select created_at::date as day, count(*)::bigint as value
    from auth.users
    where created_at::date >= start_day
    group by 1
  ),
  candidate_growth as (
    select created_at::date as day, count(distinct user_id)::bigint as value
    from public.candidate_profiles
    where created_at::date >= start_day
    group by 1
  ),
  job_growth as (
    select created_at::date as day, count(*)::bigint as value
    from public.jobs
    where created_at::date >= start_day
    group by 1
  ),
  application_growth as (
    select coalesce(applied_at, updated_at)::date as day, count(*)::bigint as value
    from public.candidate_applications
    where coalesce(applied_at, updated_at)::date >= start_day
    group by 1
  ),
  employer_first_activity as (
    select employer_user_id, min(created_at)::date as day
    from public.jobs
    where employer_user_id is not null
    group by employer_user_id
  ),
  employer_growth as (
    select day, count(*)::bigint as value
    from employer_first_activity
    where day >= start_day
    group by day
  )
  select jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'registrations', coalesce(r.value, 0),
      'candidates', coalesce(c.value, 0),
      'employers', coalesce(e.value, 0),
      'jobs', coalesce(j.value, 0),
      'applications', coalesce(a.value, 0)
    ) order by d.day
  )
  into timeline
  from days d
  left join registrations r on r.day = d.day
  left join candidate_growth c on c.day = d.day
  left join employer_growth e on e.day = d.day
  left join job_growth j on j.day = d.day
  left join application_growth a on a.day = d.day;

  return jsonb_build_object(
    'days_back', safe_days,
    'timeline', coalesce(timeline, '[]'::jsonb),
    'ratios', jsonb_build_object(
      'applications_per_job', applications_per_job,
      'candidates_per_employer', candidates_per_employer,
      'live_jobs_per_candidate', live_jobs_per_candidate
    ),
    'totals', jsonb_build_object(
      'candidates', candidate_total,
      'employers', employer_total,
      'applications', application_total,
      'jobs', job_total,
      'live_jobs', live_job_total
    ),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_rolexa_admin_growth_analytics(integer) from public;
grant execute on function public.get_rolexa_admin_growth_analytics(integer) to authenticated;

comment on function public.get_rolexa_admin_growth_analytics(integer) is
'Returns aggregated Rolexa growth, demand and marketplace ratio analytics only to approved internal staff.';
