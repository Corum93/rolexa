-- Rolexa Step 6: secure internal team directory and role management
-- Run in Supabase SQL Editor after supabase-internal-admin-security.sql.

create or replace function public.get_rolexa_admin_team()
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

  with team as (
    select
      s.user_id,
      u.email,
      s.full_name,
      s.job_title,
      s.role,
      s.is_active,
      s.created_at,
      s.updated_at,
      u.last_sign_in_at,
      case s.role
        when 'owner' then jsonb_build_array('Full platform access','Manage team access','View operational data','Configure security')
        when 'admin' then jsonb_build_array('Manage platform operations','View users and employers','View applications','View analytics')
        when 'hr' then jsonb_build_array('Manage People & HR','View all employee records','Manage HR documents','View HR audit history')
        when 'employee' then jsonb_build_array('Standard operational access','View users and employers','View applications')
        when 'analyst' then jsonb_build_array('Read-only platform access','View aggregated analytics','View operational reports')
        else '[]'::jsonb
      end as permissions
    from public.rolexa_staff_users s
    join auth.users u on u.id = s.user_id
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total', (select count(*) from team),
      'active', (select count(*) from team where is_active),
      'owners', (select count(*) from team where role = 'owner' and is_active),
      'admins', (select count(*) from team where role = 'admin' and is_active),
      'hr', (select count(*) from team where role = 'hr' and is_active),
      'employees', (select count(*) from team where role = 'employee' and is_active),
      'analysts', (select count(*) from team where role = 'analyst' and is_active)
    ),
    'can_manage', public.is_rolexa_staff(array['owner']),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'email', email,
        'full_name', full_name,
        'job_title', job_title,
        'role', role,
        'is_active', is_active,
        'permissions', permissions,
        'access_granted_at', created_at,
        'access_updated_at', updated_at,
        'last_sign_in_at', last_sign_in_at
      ) order by
        case role when 'owner' then 1 when 'hr' then 2 when 'admin' then 3 when 'employee' then 4 else 5 end,
        is_active desc,
        coalesce(full_name, email)
      ) from team
    ), '[]'::jsonb),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_rolexa_admin_team() from public;
grant execute on function public.get_rolexa_admin_team() to authenticated;

comment on function public.get_rolexa_admin_team() is
'Returns Rolexa staff roles, titles, status and role-derived permissions to approved internal staff.';

create or replace function public.manage_rolexa_staff_access(
  target_email text,
  access_role text,
  access_active boolean default true,
  staff_full_name text default null,
  staff_job_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user auth.users%rowtype;
  existing_staff public.rolexa_staff_users%rowtype;
  clean_email text := lower(trim(coalesce(target_email, '')));
  clean_role text := lower(trim(coalesce(access_role, '')));
begin
  if not public.is_rolexa_staff(array['owner']) then
    raise exception 'Only a Rolexa owner can manage internal access' using errcode = '42501';
  end if;

  if clean_email = '' then
    raise exception 'A staff email address is required' using errcode = '22023';
  end if;

  if clean_role not in ('admin','hr','employee','analyst') then
    raise exception 'Choose Admin, HR, Employee or Analyst access. Owner access cannot be assigned here.' using errcode = '22023';
  end if;

  select * into target_user
  from auth.users
  where lower(email) = clean_email
  limit 1;

  if target_user.id is null then
    raise exception 'This person must create a Rolexa account before staff access can be granted' using errcode = 'P0002';
  end if;

  select * into existing_staff
  from public.rolexa_staff_users
  where user_id = target_user.id;

  if existing_staff.user_id is not null and existing_staff.role = 'owner' then
    raise exception 'Owner access cannot be changed from the Team access screen' using errcode = '42501';
  end if;

  insert into public.rolexa_staff_users (
    user_id, role, is_active, full_name, job_title, created_at, updated_at
  ) values (
    target_user.id,
    clean_role,
    coalesce(access_active, true),
    nullif(trim(coalesce(staff_full_name, '')), ''),
    nullif(trim(coalesce(staff_job_title, '')), ''),
    now(),
    now()
  )
  on conflict (user_id) do update set
    role = excluded.role,
    is_active = excluded.is_active,
    full_name = excluded.full_name,
    job_title = excluded.job_title,
    updated_at = now();

  insert into public.rolexa_admin_audit_log (
    staff_user_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(),
    case
      when existing_staff.user_id is null then 'staff_access_granted'
      when coalesce(access_active, true) then 'staff_access_updated'
      else 'staff_access_suspended'
    end,
    'rolexa_staff_user',
    target_user.id::text,
    jsonb_build_object(
      'email', target_user.email,
      'previous_role', existing_staff.role,
      'new_role', clean_role,
      'is_active', coalesce(access_active, true),
      'job_title', nullif(trim(coalesce(staff_job_title, '')), '')
    )
  );

  return jsonb_build_object(
    'success', true,
    'user_id', target_user.id,
    'email', target_user.email,
    'role', clean_role,
    'is_active', coalesce(access_active, true),
    'updated_at', now()
  );
end;
$$;

revoke all on function public.manage_rolexa_staff_access(text, text, boolean, text, text) from public;
grant execute on function public.manage_rolexa_staff_access(text, text, boolean, text, text) to authenticated;

comment on function public.manage_rolexa_staff_access(text, text, boolean, text, text) is
'Allows Rolexa owners to grant, update, suspend or reactivate non-owner staff access and records every change in the admin audit log.';
