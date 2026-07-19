-- Rolexa Step 5: secure internal user directory
-- Run in Supabase SQL Editor after the internal staff security setup.

create or replace function public.get_rolexa_admin_users(
  page_number integer default 1,
  page_size integer default 20,
  account_filter text default 'all',
  search_text text default ''
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  safe_page integer := greatest(coalesce(page_number, 1), 1);
  safe_size integer := greatest(5, least(coalesce(page_size, 20), 50));
  safe_filter text := case
    when lower(coalesce(account_filter, 'all')) in ('candidate','employer','staff','incomplete')
      then lower(account_filter)
    else 'all'
  end;
  safe_search text := left(trim(coalesce(search_text, '')), 120);
  result jsonb;
begin
  if not public.is_rolexa_staff(array['owner','admin','employee','analyst']) then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  with candidate_activity as (
    select user_id, count(*)::bigint as applications
    from public.candidate_applications
    where user_id is not null
    group by user_id
  ),
  employer_activity as (
    select employer_user_id as user_id, count(*)::bigint as jobs
    from public.jobs
    where employer_user_id is not null
    group by employer_user_id
  ),
  base_users as (
    select
      u.id as user_id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      case
        when staff.user_id is not null then 'staff'
        when cp.user_id is not null then 'candidate'
        when ep.user_id is not null or ea.user_id is not null then 'employer'
        else 'incomplete'
      end as account_type,
      coalesce(
        nullif(staff.full_name, ''),
        nullif(cp.full_name, ''),
        nullif(ep.contact_name, ''),
        nullif(ep.company_name, ''),
        nullif(split_part(u.email, '@', 1), ''),
        'Rolexa user'
      ) as display_name,
      ep.company_name as organisation,
      case
        when staff.user_id is not null then true
        when cp.user_id is not null then true
        when ep.user_id is not null then true
        else false
      end as profile_complete,
      coalesce(ca.applications, 0) as applications,
      coalesce(ea.jobs, 0) as jobs
    from auth.users u
    left join public.rolexa_staff_users staff on staff.user_id = u.id and staff.is_active = true
    left join public.candidate_profiles cp on cp.user_id = u.id
    left join public.employer_profiles ep on ep.user_id = u.id
    left join candidate_activity ca on ca.user_id = u.id
    left join employer_activity ea on ea.user_id = u.id
  ),
  filtered_users as (
    select *
    from base_users
    where (safe_filter = 'all' or account_type = safe_filter)
      and (
        safe_search = ''
        or coalesce(display_name, '') ilike '%' || safe_search || '%'
        or coalesce(email, '') ilike '%' || safe_search || '%'
        or coalesce(organisation, '') ilike '%' || safe_search || '%'
      )
  ),
  page_rows as (
    select *
    from filtered_users
    order by created_at desc, user_id
    limit safe_size
    offset (safe_page - 1) * safe_size
  ),
  timeline_days as (
    select generate_series(current_date - 29, current_date, interval '1 day')::date as day
  ),
  registration_timeline as (
    select
      d.day,
      count(u.user_id)::bigint as registrations
    from timeline_days d
    left join base_users u on u.created_at::date = d.day
    group by d.day
    order by d.day
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total', (select count(*) from base_users),
      'today', (select count(*) from base_users where created_at::date = current_date),
      'last_7_days', (select count(*) from base_users where created_at >= now() - interval '7 days'),
      'last_30_days', (select count(*) from base_users where created_at >= now() - interval '30 days'),
      'candidates', (select count(*) from base_users where account_type = 'candidate'),
      'employers', (select count(*) from base_users where account_type = 'employer'),
      'staff', (select count(*) from base_users where account_type = 'staff'),
      'incomplete', (select count(*) from base_users where account_type = 'incomplete')
    ),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(day, 'YYYY-MM-DD'),
        'registrations', registrations
      ) order by day)
      from registration_timeline
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', user_id,
        'display_name', display_name,
        'email', email,
        'account_type', account_type,
        'organisation', organisation,
        'profile_complete', profile_complete,
        'joined_at', created_at,
        'last_sign_in_at', last_sign_in_at,
        'email_confirmed', email_confirmed_at is not null,
        'applications', applications,
        'jobs', jobs
      ) order by created_at desc, user_id)
      from page_rows
    ), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', safe_page,
      'page_size', safe_size,
      'total_results', (select count(*) from filtered_users),
      'total_pages', greatest(1, ceil((select count(*) from filtered_users)::numeric / safe_size)::integer)
    ),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_rolexa_admin_users(integer, integer, text, text) from public;
grant execute on function public.get_rolexa_admin_users(integer, integer, text, text) to authenticated;

comment on function public.get_rolexa_admin_users(integer, integer, text, text) is
'Returns a paginated Rolexa user directory and registration summary only to approved active internal staff. It never returns passwords, CVs or private messages.';
