-- Rolexa Step 7: private People & HR workspace
-- Run once in Supabase SQL Editor after the internal security and Team access SQL.
-- This migration adds the HR access role, employee records, a private document
-- bucket, least-privilege RLS policies and audited management functions.

-- Add HR as an internal access role without changing existing staff records.
alter table public.rolexa_staff_users
  drop constraint if exists rolexa_staff_users_role_check;

alter table public.rolexa_staff_users
  add constraint rolexa_staff_users_role_check
  check (role in ('owner','admin','hr','employee','analyst'));

create table if not exists public.rolexa_employee_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  employee_number text unique,
  department text,
  manager_user_id uuid references auth.users(id) on delete set null,
  employment_status text not null default 'preboarding'
    check (employment_status in ('preboarding','active','leave','ended')),
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','fixed_term','contractor','worker')),
  start_date date,
  end_date date,
  work_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.rolexa_employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid not null references auth.users(id) on delete restrict,
  document_type text not null
    check (document_type in ('employment_contract','written_particulars','right_to_work','employee_handbook','policy','other')),
  title text not null,
  storage_path text not null unique,
  visibility text not null default 'employee'
    check (visibility in ('employee','hr_only')),
  status text not null default 'issued'
    check (status in ('pending','issued','signed','acknowledged','expired','archived')),
  issued_at timestamptz,
  signed_at timestamptz,
  expires_at date,
  retention_until date,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rolexa_employee_documents_employee_idx
  on public.rolexa_employee_documents (employee_user_id, created_at desc);

alter table public.rolexa_employee_profiles enable row level security;
alter table public.rolexa_employee_documents enable row level security;

drop policy if exists "Employees can read own HR profile" on public.rolexa_employee_profiles;
create policy "Employees can read own HR profile"
on public.rolexa_employee_profiles
for select
to authenticated
using (
  (user_id = auth.uid() and public.is_rolexa_staff(null::text[]))
  or public.is_rolexa_staff(array['owner','hr'])
);

drop policy if exists "Owner and HR can create employee profiles" on public.rolexa_employee_profiles;
create policy "Owner and HR can create employee profiles"
on public.rolexa_employee_profiles
for insert
to authenticated
with check (public.is_rolexa_staff(array['owner','hr']));

drop policy if exists "Owner and HR can update employee profiles" on public.rolexa_employee_profiles;
create policy "Owner and HR can update employee profiles"
on public.rolexa_employee_profiles
for update
to authenticated
using (public.is_rolexa_staff(array['owner','hr']))
with check (public.is_rolexa_staff(array['owner','hr']));

drop policy if exists "Owner can delete employee profiles" on public.rolexa_employee_profiles;
create policy "Owner can delete employee profiles"
on public.rolexa_employee_profiles
for delete
to authenticated
using (public.is_rolexa_staff(array['owner']));

drop policy if exists "Employees can read own shared HR documents" on public.rolexa_employee_documents;
create policy "Employees can read own shared HR documents"
on public.rolexa_employee_documents
for select
to authenticated
using (
  public.is_rolexa_staff(array['owner','hr'])
  or (
    employee_user_id = auth.uid()
    and visibility = 'employee'
    and public.is_rolexa_staff(null::text[])
  )
);

drop policy if exists "Owner and HR can create HR documents" on public.rolexa_employee_documents;
create policy "Owner and HR can create HR documents"
on public.rolexa_employee_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_rolexa_staff(array['owner','hr'])
);

drop policy if exists "Owner and HR can update HR documents" on public.rolexa_employee_documents;
create policy "Owner and HR can update HR documents"
on public.rolexa_employee_documents
for update
to authenticated
using (public.is_rolexa_staff(array['owner','hr']))
with check (public.is_rolexa_staff(array['owner','hr']));

drop policy if exists "Owner can delete HR documents" on public.rolexa_employee_documents;
create policy "Owner can delete HR documents"
on public.rolexa_employee_documents
for delete
to authenticated
using (public.is_rolexa_staff(array['owner']));

-- HR actions use the existing immutable internal audit table.
drop policy if exists "Internal staff can read audit log" on public.rolexa_admin_audit_log;
create policy "Internal staff can read audit log"
on public.rolexa_admin_audit_log
for select
to authenticated
using (public.is_rolexa_staff(array['owner','admin','hr']));

drop policy if exists "Internal staff can create audit entries" on public.rolexa_admin_audit_log;
create policy "Internal staff can create audit entries"
on public.rolexa_admin_audit_log
for insert
to authenticated
with check (
  staff_user_id = auth.uid()
  and public.is_rolexa_staff(array['owner','admin','hr','employee','analyst'])
);

-- Store HR documents in a private bucket. Phase one accepts PDF files only
-- and limits each document to 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rolexa-hr-documents', 'rolexa-hr-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_rolexa_hr_document(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_rolexa_staff(array['owner','hr'])
    or exists (
      select 1
      from public.rolexa_employee_documents d
      where d.storage_path = object_path
        and d.employee_user_id = auth.uid()
        and d.visibility = 'employee'
        and public.is_rolexa_staff(null::text[])
    );
$$;

revoke all on function public.can_access_rolexa_hr_document(text) from public;
grant execute on function public.can_access_rolexa_hr_document(text) to authenticated;

drop policy if exists "Authorised staff can read HR document files" on storage.objects;
create policy "Authorised staff can read HR document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rolexa-hr-documents'
  and public.can_access_rolexa_hr_document(name)
);

drop policy if exists "Owner and HR can upload HR document files" on storage.objects;
create policy "Owner and HR can upload HR document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rolexa-hr-documents'
  and public.is_rolexa_staff(array['owner','hr'])
);

drop policy if exists "Owner and HR can update HR document files" on storage.objects;
create policy "Owner and HR can update HR document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'rolexa-hr-documents'
  and public.is_rolexa_staff(array['owner','hr'])
)
with check (
  bucket_id = 'rolexa-hr-documents'
  and public.is_rolexa_staff(array['owner','hr'])
);

drop policy if exists "Owner and HR can remove HR document files" on storage.objects;
create policy "Owner and HR can remove HR document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rolexa-hr-documents'
  and public.is_rolexa_staff(array['owner','hr'])
);

-- Owner and HR receive the full employee directory. Every other approved
-- staff member receives only their own profile and employee-visible documents.
create or replace function public.get_rolexa_people_hr()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  caller_role text := public.current_rolexa_staff_role();
  can_manage boolean := caller_role in ('owner','hr');
  result jsonb;
begin
  if caller_role is null then
    raise exception 'Rolexa internal staff access required' using errcode = '42501';
  end if;

  with people as (
    select
      s.user_id,
      u.email,
      s.full_name,
      s.job_title,
      s.role as access_role,
      s.is_active as access_active,
      p.employee_number,
      p.department,
      p.manager_user_id,
      p.employment_status,
      p.employment_type,
      p.start_date,
      p.end_date,
      p.work_location,
      p.updated_at as profile_updated_at
    from public.rolexa_staff_users s
    join auth.users u on u.id = s.user_id
    left join public.rolexa_employee_profiles p on p.user_id = s.user_id
    where can_manage or s.user_id = auth.uid()
  )
  select jsonb_build_object(
    'scope', case when can_manage then 'all' else 'self' end,
    'can_manage', can_manage,
    'summary', jsonb_build_object(
      'total', (select count(*) from people),
      'active', (select count(*) from people where employment_status = 'active'),
      'preboarding', (select count(*) from people where employment_status = 'preboarding' or employment_status is null),
      'documents', (
        select count(*)
        from public.rolexa_employee_documents d
        join people p on p.user_id = d.employee_user_id
        where can_manage or d.visibility = 'employee'
      )
    ),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'email', p.email,
        'full_name', p.full_name,
        'job_title', p.job_title,
        'access_role', p.access_role,
        'access_active', p.access_active,
        'employee_number', p.employee_number,
        'department', p.department,
        'manager_user_id', p.manager_user_id,
        'employment_status', coalesce(p.employment_status, 'preboarding'),
        'employment_type', coalesce(p.employment_type, 'full_time'),
        'start_date', p.start_date,
        'end_date', p.end_date,
        'work_location', p.work_location,
        'profile_updated_at', p.profile_updated_at,
        'is_self', p.user_id = auth.uid(),
        'documents', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', d.id,
            'document_type', d.document_type,
            'title', d.title,
            'storage_path', d.storage_path,
            'visibility', d.visibility,
            'status', d.status,
            'issued_at', d.issued_at,
            'signed_at', d.signed_at,
            'expires_at', d.expires_at,
            'retention_until', d.retention_until,
            'created_at', d.created_at
          ) order by d.created_at desc)
          from public.rolexa_employee_documents d
          where d.employee_user_id = p.user_id
            and (can_manage or d.visibility = 'employee')
        ), '[]'::jsonb)
      ) order by
        case coalesce(p.employment_status, 'preboarding')
          when 'active' then 1 when 'preboarding' then 2 when 'leave' then 3 else 4
        end,
        coalesce(p.full_name, p.email)
      ) from people p
    ), '[]'::jsonb),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_rolexa_people_hr() from public;
grant execute on function public.get_rolexa_people_hr() to authenticated;

create or replace function public.manage_rolexa_employee_profile(
  target_user_id uuid,
  employee_number_value text default null,
  department_value text default null,
  manager_user_id_value uuid default null,
  employment_status_value text default 'preboarding',
  employment_type_value text default 'full_time',
  start_date_value date default null,
  end_date_value date default null,
  work_location_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  previous_profile public.rolexa_employee_profiles%rowtype;
  clean_status text := lower(trim(coalesce(employment_status_value, 'preboarding')));
  clean_type text := lower(trim(coalesce(employment_type_value, 'full_time')));
begin
  if not public.is_rolexa_staff(array['owner','hr']) then
    raise exception 'Only the Rolexa Owner or HR can manage employee records' using errcode = '42501';
  end if;

  if not exists (select 1 from public.rolexa_staff_users where user_id = target_user_id) then
    raise exception 'Create this person in Team access before creating their employee record' using errcode = 'P0002';
  end if;

  if clean_status not in ('preboarding','active','leave','ended') then
    raise exception 'Choose a valid employment status' using errcode = '22023';
  end if;

  if clean_type not in ('full_time','part_time','fixed_term','contractor','worker') then
    raise exception 'Choose a valid employment type' using errcode = '22023';
  end if;

  if end_date_value is not null and start_date_value is not null and end_date_value < start_date_value then
    raise exception 'The end date cannot be before the start date' using errcode = '22023';
  end if;

  if manager_user_id_value is not null
     and not exists (select 1 from public.rolexa_staff_users where user_id = manager_user_id_value) then
    raise exception 'The selected manager must be a Rolexa team member' using errcode = '22023';
  end if;

  select * into previous_profile
  from public.rolexa_employee_profiles
  where user_id = target_user_id;

  insert into public.rolexa_employee_profiles (
    user_id, employee_number, department, manager_user_id, employment_status,
    employment_type, start_date, end_date, work_location, created_at, updated_at
  ) values (
    target_user_id,
    nullif(trim(coalesce(employee_number_value, '')), ''),
    nullif(trim(coalesce(department_value, '')), ''),
    manager_user_id_value,
    clean_status,
    clean_type,
    start_date_value,
    end_date_value,
    nullif(trim(coalesce(work_location_value, '')), ''),
    now(),
    now()
  )
  on conflict (user_id) do update set
    employee_number = excluded.employee_number,
    department = excluded.department,
    manager_user_id = excluded.manager_user_id,
    employment_status = excluded.employment_status,
    employment_type = excluded.employment_type,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    work_location = excluded.work_location,
    updated_at = now();

  insert into public.rolexa_admin_audit_log (
    staff_user_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(),
    case when previous_profile.user_id is null then 'employee_profile_created' else 'employee_profile_updated' end,
    'rolexa_employee_profile',
    target_user_id::text,
    jsonb_build_object(
      'previous_status', previous_profile.employment_status,
      'new_status', clean_status,
      'employment_type', clean_type,
      'department', nullif(trim(coalesce(department_value, '')), '')
    )
  );

  return jsonb_build_object('success', true, 'user_id', target_user_id, 'updated_at', now());
end;
$$;

revoke all on function public.manage_rolexa_employee_profile(uuid,text,text,uuid,text,text,date,date,text) from public;
grant execute on function public.manage_rolexa_employee_profile(uuid,text,text,uuid,text,text,date,date,text) to authenticated;

create or replace function public.register_rolexa_hr_document(
  target_user_id uuid,
  document_type_value text,
  document_title text,
  object_path text,
  visibility_value text default 'employee',
  status_value text default 'issued',
  retention_until_value date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  document_id uuid;
  clean_type text := lower(trim(coalesce(document_type_value, '')));
  clean_visibility text := lower(trim(coalesce(visibility_value, 'employee')));
  clean_status text := lower(trim(coalesce(status_value, 'issued')));
begin
  if not public.is_rolexa_staff(array['owner','hr']) then
    raise exception 'Only the Rolexa Owner or HR can add employee documents' using errcode = '42501';
  end if;

  if not exists (select 1 from public.rolexa_staff_users where user_id = target_user_id) then
    raise exception 'The employee record does not exist' using errcode = 'P0002';
  end if;

  if clean_type not in ('employment_contract','written_particulars','right_to_work','employee_handbook','policy','other') then
    raise exception 'Choose a valid HR document type' using errcode = '22023';
  end if;

  if clean_visibility not in ('employee','hr_only') then
    raise exception 'Choose employee or HR-only visibility' using errcode = '22023';
  end if;

  if clean_status not in ('pending','issued','signed','acknowledged','expired','archived') then
    raise exception 'Choose a valid document status' using errcode = '22023';
  end if;

  if trim(coalesce(document_title, '')) = '' then
    raise exception 'A document title is required' using errcode = '22023';
  end if;

  if object_path not like (target_user_id::text || '/%') then
    raise exception 'The document path does not match the employee' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'rolexa-hr-documents' and name = object_path
  ) then
    raise exception 'Upload the private document before registering it' using errcode = 'P0002';
  end if;

  insert into public.rolexa_employee_documents (
    employee_user_id, document_type, title, storage_path, visibility, status,
    issued_at, signed_at, retention_until, uploaded_by
  ) values (
    target_user_id,
    clean_type,
    left(trim(document_title), 180),
    object_path,
    clean_visibility,
    clean_status,
    case when clean_status in ('issued','signed','acknowledged') then now() else null end,
    case when clean_status = 'signed' then now() else null end,
    retention_until_value,
    auth.uid()
  )
  returning id into document_id;

  insert into public.rolexa_admin_audit_log (
    staff_user_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(),
    'hr_document_added',
    'rolexa_employee_document',
    document_id::text,
    jsonb_build_object(
      'employee_user_id', target_user_id,
      'document_type', clean_type,
      'visibility', clean_visibility,
      'status', clean_status
    )
  );

  return jsonb_build_object('success', true, 'document_id', document_id, 'created_at', now());
end;
$$;

revoke all on function public.register_rolexa_hr_document(uuid,text,text,text,text,text,date) from public;
grant execute on function public.register_rolexa_hr_document(uuid,text,text,text,text,text,date) to authenticated;

create or replace function public.open_rolexa_hr_document(target_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  document_record public.rolexa_employee_documents%rowtype;
begin
  select * into document_record
  from public.rolexa_employee_documents
  where id = target_document_id;

  if document_record.id is null then
    raise exception 'The HR document was not found' using errcode = 'P0002';
  end if;

  if not public.is_rolexa_staff(array['owner','hr'])
     and not (
       document_record.employee_user_id = auth.uid()
       and document_record.visibility = 'employee'
       and public.is_rolexa_staff(null::text[])
     ) then
    raise exception 'You do not have access to this HR document' using errcode = '42501';
  end if;

  insert into public.rolexa_admin_audit_log (
    staff_user_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(),
    'hr_document_downloaded',
    'rolexa_employee_document',
    document_record.id::text,
    jsonb_build_object('employee_user_id', document_record.employee_user_id)
  );

  return jsonb_build_object(
    'storage_path', document_record.storage_path,
    'title', document_record.title
  );
end;
$$;

revoke all on function public.open_rolexa_hr_document(uuid) from public;
grant execute on function public.open_rolexa_hr_document(uuid) to authenticated;

-- Refresh the Team access functions so owners can assign HR access from the UI.
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

  select * into target_user from auth.users where lower(email) = clean_email limit 1;

  if target_user.id is null then
    raise exception 'This person must create a Rolexa account before staff access can be granted' using errcode = 'P0002';
  end if;

  select * into existing_staff from public.rolexa_staff_users where user_id = target_user.id;

  if existing_staff.user_id is not null and existing_staff.role = 'owner' then
    raise exception 'Owner access cannot be changed from the Team access screen' using errcode = '42501';
  end if;

  insert into public.rolexa_staff_users (
    user_id, role, is_active, full_name, job_title, created_at, updated_at
  ) values (
    target_user.id, clean_role, coalesce(access_active, true),
    nullif(trim(coalesce(staff_full_name, '')), ''),
    nullif(trim(coalesce(staff_job_title, '')), ''), now(), now()
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

revoke all on function public.manage_rolexa_staff_access(text,text,boolean,text,text) from public;
grant execute on function public.manage_rolexa_staff_access(text,text,boolean,text,text) to authenticated;

comment on table public.rolexa_employee_profiles is
'Minimal Rolexa employment records. Sensitive health, equality, banking and disciplinary data are intentionally excluded from phase one.';

comment on table public.rolexa_employee_documents is
'Metadata for private employee PDFs. File access is enforced separately by Storage RLS and logged by the document-open RPC.';
