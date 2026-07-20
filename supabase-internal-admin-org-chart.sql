-- Rolexa Step 8: internal organisation chart
-- Run once in Supabase SQL Editor after the People & HR SQL.
-- Returns only the minimum reporting-line information to active Rolexa staff.

create or replace function public.get_rolexa_org_chart()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_rolexa_staff(array['owner','admin','hr','employee','analyst']) then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'people', coalesce(jsonb_agg(
      jsonb_build_object(
        'user_id', s.user_id,
        'full_name', coalesce(nullif(trim(s.full_name), ''), 'Rolexa team member'),
        'job_title', s.job_title,
        'department', p.department,
        'manager_user_id', p.manager_user_id,
        'employment_status', coalesce(p.employment_status, 'preboarding')
      )
      order by
        case when p.manager_user_id is null then 0 else 1 end,
        coalesce(nullif(trim(s.full_name), ''), s.user_id::text)
    ), '[]'::jsonb),
    'generated_at', now()
  )
  into result
  from public.rolexa_staff_users s
  left join public.rolexa_employee_profiles p on p.user_id = s.user_id
  where s.is_active = true
    and coalesce(p.employment_status, 'preboarding') <> 'ended';

  return result;
end;
$$;

revoke all on function public.get_rolexa_org_chart() from public;
grant execute on function public.get_rolexa_org_chart() to authenticated;

comment on function public.get_rolexa_org_chart() is
'Returns names, job titles, departments and reporting lines to active Rolexa staff without exposing emails, employee numbers or HR documents.';

