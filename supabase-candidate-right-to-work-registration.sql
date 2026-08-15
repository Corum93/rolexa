-- Rolexa candidate right-to-work and job-eligibility self-declaration.
-- Run this entire file once in the Supabase SQL Editor before publishing the
-- matching candidate registration UI.
--
-- This stores a candidate's declaration only. It does not constitute an
-- official Home Office, document or Digital Verification Service check.
-- Prerequisites: supabase-website-legal-acceptance.sql and
-- supabase-candidate-account-closure.sql.

begin;

insert into public.website_legal_document_versions (
  document_key,
  version_code,
  title,
  document_url,
  content_sha256,
  document_status,
  review_notice,
  effective_from,
  published_at
)
values (
  'privacy_policy',
  '2026-08-15-draft-2',
  'Privacy Policy',
  'privacy-policy.html',
  'f6c7617b43ba6438b3b88b75a596327efdd019e517a5ef102d9bd39b8cac5ffe',
  'draft',
  'Pre-launch draft requiring professional legal review. Final Rolexa company and policy details are not yet confirmed.',
  '2026-08-15 00:00:00+00',
  '2026-08-15 00:00:00+00'
)
on conflict (document_key, version_code) do nothing;

insert into public.website_legal_current (document_key, document_version_id)
select document_key, id
from public.website_legal_document_versions
where document_key = 'privacy_policy'
  and version_code = '2026-08-15-draft-2'
on conflict (document_key) do update set
  document_version_id = excluded.document_version_id,
  updated_at = now();

create table if not exists public.candidate_work_eligibility_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_status text not null
    check (permission_status in ('yes', 'no', 'unsure')),
  restriction_type text not null
    check (restriction_type in (
      'none',
      'hours',
      'role_or_employer',
      'hours_and_role_or_employer',
      'unsure',
      'not_applicable'
    )),
  permission_expiry_status text not null
    check (permission_expiry_status in (
      'no_expiry',
      'expires',
      'unsure',
      'not_applicable'
    )),
  permission_expiry_date date,
  sponsorship_requirement text not null
    check (sponsorship_requirement in ('no', 'now', 'future', 'unsure')),
  declaration_confirmed boolean not null check (declaration_confirmed),
  declaration_version text not null,
  declaration_source text not null default 'candidate_registration'
    check (declaration_source in ('candidate_registration', 'candidate_reconfirmation')),
  verification_status text not null default 'not_verified'
    check (verification_status in ('not_verified', 'verification_required')),
  declared_at timestamptz not null default now(),
  server_recorded boolean not null default true check (server_recorded),
  created_at timestamptz not null default now(),
  check (
    (permission_expiry_status = 'expires' and permission_expiry_date is not null)
    or
    (permission_expiry_status <> 'expires' and permission_expiry_date is null)
  ),
  check (
    (permission_status = 'yes'
      and restriction_type not in ('not_applicable')
      and permission_expiry_status <> 'not_applicable')
    or
    (permission_status = 'no'
      and restriction_type = 'not_applicable'
      and permission_expiry_status = 'not_applicable')
    or
    (permission_status = 'unsure'
      and restriction_type = 'unsure'
      and permission_expiry_status = 'unsure')
  )
);

create index if not exists candidate_work_eligibility_user_declared_idx
  on public.candidate_work_eligibility_declarations (user_id, declared_at desc);

alter table public.candidate_work_eligibility_declarations enable row level security;

revoke all on table public.candidate_work_eligibility_declarations
from public, anon, authenticated;

grant select on table public.candidate_work_eligibility_declarations
to authenticated;

grant all on table public.candidate_work_eligibility_declarations
to service_role;

drop policy if exists "Candidates can read own work eligibility declarations"
on public.candidate_work_eligibility_declarations;

create policy "Candidates can read own work eligibility declarations"
on public.candidate_work_eligibility_declarations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Closed candidates cannot read work eligibility declarations"
on public.candidate_work_eligibility_declarations;

create policy "Closed candidates cannot read work eligibility declarations"
on public.candidate_work_eligibility_declarations
as restrictive
for select
to authenticated
using (not private.candidate_account_is_restricted(user_id));

create or replace function public.record_candidate_work_eligibility_at_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_type_value text;
  permission_status_value text;
  restriction_type_value text;
  expiry_status_value text;
  expiry_date_value date;
  sponsorship_value text;
  declaration_version_value text;
begin
  -- Trusted administrative account creation can use the same server-only
  -- exemption already used by the legal-registration trigger.
  if lower(coalesce(new.raw_app_meta_data ->> 'registration_consent_exempt', 'false')) = 'true' then
    return new;
  end if;

  account_type_value := lower(coalesce(new.raw_user_meta_data ->> 'account_type', ''));
  if account_type_value <> 'candidate' then
    return new;
  end if;

  permission_status_value := lower(coalesce(
    new.raw_user_meta_data ->> 'uk_work_permission_status',
    ''
  ));
  restriction_type_value := lower(coalesce(
    new.raw_user_meta_data ->> 'uk_work_restriction_type',
    ''
  ));
  expiry_status_value := lower(coalesce(
    new.raw_user_meta_data ->> 'uk_work_permission_expiry_status',
    ''
  ));
  sponsorship_value := lower(coalesce(
    new.raw_user_meta_data ->> 'uk_work_sponsorship_requirement',
    ''
  ));
  declaration_version_value := coalesce(
    new.raw_user_meta_data ->> 'uk_work_declaration_version',
    ''
  );

  if permission_status_value not in ('yes', 'no', 'unsure') then
    raise exception using errcode = 'P0001', message = 'UK_WORK_PERMISSION_STATUS_REQUIRED';
  end if;

  if restriction_type_value not in (
    'none',
    'hours',
    'role_or_employer',
    'hours_and_role_or_employer',
    'unsure',
    'not_applicable'
  ) then
    raise exception using errcode = 'P0001', message = 'UK_WORK_RESTRICTION_REQUIRED';
  end if;

  if expiry_status_value not in ('no_expiry', 'expires', 'unsure', 'not_applicable') then
    raise exception using errcode = 'P0001', message = 'UK_WORK_PERMISSION_EXPIRY_STATUS_REQUIRED';
  end if;

  if sponsorship_value not in ('no', 'now', 'future', 'unsure') then
    raise exception using errcode = 'P0001', message = 'UK_WORK_SPONSORSHIP_ANSWER_REQUIRED';
  end if;

  if lower(coalesce(new.raw_user_meta_data ->> 'uk_work_declaration_confirmed', 'false')) <> 'true' then
    raise exception using errcode = 'P0001', message = 'UK_WORK_DECLARATION_CONFIRMATION_REQUIRED';
  end if;

  if declaration_version_value <> '2026-08-15-1' then
    raise exception using errcode = 'P0001', message = 'CURRENT_UK_WORK_DECLARATION_REQUIRED';
  end if;

  if permission_status_value = 'yes' then
    if restriction_type_value = 'not_applicable'
       or expiry_status_value = 'not_applicable' then
      raise exception using errcode = 'P0001', message = 'INCONSISTENT_UK_WORK_PERMISSION_ANSWERS';
    end if;
  elsif permission_status_value = 'no' then
    if restriction_type_value <> 'not_applicable'
       or expiry_status_value <> 'not_applicable' then
      raise exception using errcode = 'P0001', message = 'INCONSISTENT_UK_WORK_PERMISSION_ANSWERS';
    end if;
  elsif permission_status_value = 'unsure' then
    if restriction_type_value <> 'unsure'
       or expiry_status_value <> 'unsure' then
      raise exception using errcode = 'P0001', message = 'INCONSISTENT_UK_WORK_PERMISSION_ANSWERS';
    end if;
  end if;

  if expiry_status_value = 'expires' then
    begin
      expiry_date_value := nullif(
        new.raw_user_meta_data ->> 'uk_work_permission_expiry_date',
        ''
      )::date;
    exception when others then
      raise exception using errcode = 'P0001', message = 'VALID_UK_WORK_PERMISSION_EXPIRY_DATE_REQUIRED';
    end;

    if expiry_date_value is null or expiry_date_value < current_date then
      raise exception using errcode = 'P0001', message = 'CURRENT_UK_WORK_PERMISSION_REQUIRED';
    end if;
  else
    expiry_date_value := null;
  end if;

  insert into public.candidate_work_eligibility_declarations (
    user_id,
    permission_status,
    restriction_type,
    permission_expiry_status,
    permission_expiry_date,
    sponsorship_requirement,
    declaration_confirmed,
    declaration_version,
    declaration_source,
    verification_status,
    declared_at,
    server_recorded
  )
  values (
    new.id,
    permission_status_value,
    restriction_type_value,
    expiry_status_value,
    expiry_date_value,
    sponsorship_value,
    true,
    declaration_version_value,
    'candidate_registration',
    case
      when permission_status_value = 'yes' then 'not_verified'
      else 'verification_required'
    end,
    now(),
    true
  );

  return new;
end;
$function$;

revoke all on function public.record_candidate_work_eligibility_at_registration()
from public, anon, authenticated;

drop trigger if exists record_candidate_work_eligibility_at_registration
on auth.users;

create trigger record_candidate_work_eligibility_at_registration
after insert on auth.users
for each row
execute function public.record_candidate_work_eligibility_at_registration();

create or replace function public.remove_candidate_work_eligibility_after_closure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'completed'
     and old.status is distinct from new.status then
    delete from public.candidate_work_eligibility_declarations
    where user_id = new.candidate_user_id;
  end if;

  return new;
end;
$function$;

revoke all on function public.remove_candidate_work_eligibility_after_closure()
from public, anon, authenticated;

drop trigger if exists remove_candidate_work_eligibility_after_closure
on public.candidate_account_closure_requests;

create trigger remove_candidate_work_eligibility_after_closure
after update of status on public.candidate_account_closure_requests
for each row
execute function public.remove_candidate_work_eligibility_after_closure();

comment on table public.candidate_work_eligibility_declarations is
  'Candidate self-declarations recorded during registration. These are not official right-to-work checks and are removed when candidate account closure completes.';

comment on column public.candidate_work_eligibility_declarations.verification_status is
  'Self-declarations remain unverified until a separate official employer right-to-work process is completed.';

comment on function public.record_candidate_work_eligibility_at_registration() is
  'Server-enforces and records the current candidate UK work-eligibility declaration during public registration.';

select
  to_regclass('public.candidate_work_eligibility_declarations') is not null
    as declaration_table_ready,
  exists (
    select 1
    from pg_trigger
    where tgname = 'record_candidate_work_eligibility_at_registration'
      and not tgisinternal
  ) as registration_trigger_ready,
  exists (
    select 1
    from pg_trigger
    where tgname = 'remove_candidate_work_eligibility_after_closure'
      and not tgisinternal
  ) as closure_cleanup_trigger_ready,
  exists (
    select 1
    from public.website_legal_current as current_document
    join public.website_legal_document_versions as version
      on version.id = current_document.document_version_id
    where current_document.document_key = 'privacy_policy'
      and version.version_code = '2026-08-15-draft-2'
  ) as privacy_notice_version_ready;

commit;
