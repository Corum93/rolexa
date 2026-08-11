-- Rolexa Website Terms & Conditions and Privacy Policy registration acceptance.
-- Run this entire script once in the Supabase SQL Editor before enabling new sign-ups.
-- This migration is deliberately separate from:
--   1. the Employer Company Agreement in supabase-employer-terms-agreements.sql; and
--   2. employer company verification in supabase-company-verification-trust.sql.

begin;

create table if not exists public.website_legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_key text not null check (document_key in ('website_terms', 'privacy_policy')),
  version_code text not null,
  title text not null,
  document_url text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  document_status text not null default 'draft' check (document_status in ('draft', 'final')),
  review_notice text not null,
  effective_from timestamptz not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (document_key, version_code)
);

create table if not exists public.website_legal_current (
  document_key text primary key check (document_key in ('website_terms', 'privacy_policy')),
  document_version_id uuid not null unique references public.website_legal_document_versions(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table if not exists public.website_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  registration_event_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  account_type text not null check (account_type in ('candidate', 'employer')),
  document_key text not null check (document_key in ('website_terms', 'privacy_policy')),
  document_version_id uuid not null references public.website_legal_document_versions(id) on delete restrict,
  document_version text not null,
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  acceptance_source text not null default 'website_registration',
  server_enforced boolean not null default true check (server_enforced),
  auth_provider text,
  accepted_at timestamptz not null default now(),
  accepted_ip inet,
  user_agent text,
  audit_information jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, document_version_id)
);

create index if not exists website_legal_acceptances_user_idx
  on public.website_legal_acceptances (user_id, accepted_at desc);

create index if not exists website_legal_acceptances_event_idx
  on public.website_legal_acceptances (registration_event_id);

alter table public.website_legal_document_versions enable row level security;
alter table public.website_legal_current enable row level security;
alter table public.website_legal_acceptances enable row level security;

drop policy if exists "Users can read own website legal acceptances"
on public.website_legal_acceptances;

create policy "Users can read own website legal acceptances"
on public.website_legal_acceptances
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.website_legal_document_versions from public, anon, authenticated;
revoke all on table public.website_legal_current from public, anon, authenticated;
revoke all on table public.website_legal_acceptances from public, anon, authenticated;

grant select on table public.website_legal_acceptances to authenticated;
grant all on table public.website_legal_document_versions to service_role;
grant all on table public.website_legal_current to service_role;
grant all on table public.website_legal_acceptances to service_role;

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
values
  (
    'website_terms',
    '2026-08-11-draft-1',
    'Website Terms & Conditions',
    'website-terms.html',
    '5c3603f8bdf5e73079abdf44640bb86f0eed89f87b70d1f9eaf2741cc59b09c1',
    'draft',
    'Pre-launch draft requiring professional legal review. Final Rolexa company and policy details are not yet confirmed.',
    '2026-08-11 00:00:00+00',
    '2026-08-11 00:00:00+00'
  ),
  (
    'privacy_policy',
    '2026-08-11-draft-1',
    'Privacy Policy',
    'privacy-policy.html',
    '170435022ad516bc64c0e9ea862b48db08f01831d170eec3b06f5707e07ab10e',
    'draft',
    'Pre-launch draft requiring professional legal review. Final Rolexa company and policy details are not yet confirmed.',
    '2026-08-11 00:00:00+00',
    '2026-08-11 00:00:00+00'
  )
on conflict (document_key, version_code) do nothing;

insert into public.website_legal_current (document_key, document_version_id)
select document_key, id
from public.website_legal_document_versions
where (document_key, version_code) in (
  ('website_terms', '2026-08-11-draft-1'),
  ('privacy_policy', '2026-08-11-draft-1')
)
on conflict (document_key) do update set
  document_version_id = excluded.document_version_id,
  updated_at = now();

create or replace function public.get_current_registration_documents()
returns table (
  document_key text,
  version_code text,
  title text,
  document_url text,
  document_status text,
  review_notice text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    version.document_key,
    version.version_code,
    version.title,
    version.document_url,
    version.document_status,
    version.review_notice
  from public.website_legal_current as current_document
  join public.website_legal_document_versions as version
    on version.id = current_document.document_version_id
  where version.effective_from <= now()
    and version.published_at <= now()
  order by version.document_key;
$function$;

revoke all on function public.get_current_registration_documents()
from public;

grant execute on function public.get_current_registration_documents()
to anon, authenticated, service_role;

create or replace function public.prevent_website_legal_record_changes()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'IMMUTABLE_WEBSITE_LEGAL_RECORD',
    detail = 'Published website legal versions and acceptance records cannot be changed or deleted.';
end;
$function$;

drop trigger if exists protect_website_legal_document_versions
on public.website_legal_document_versions;

create trigger protect_website_legal_document_versions
before update or delete on public.website_legal_document_versions
for each row
execute function public.prevent_website_legal_record_changes();

drop trigger if exists protect_website_legal_acceptances
on public.website_legal_acceptances;

create trigger protect_website_legal_acceptances
before update or delete on public.website_legal_acceptances
for each row
execute function public.prevent_website_legal_record_changes();

revoke all on function public.prevent_website_legal_record_changes()
from public, anon, authenticated;

create or replace function public.enforce_new_user_website_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  account_type_value text;
  website_terms public.website_legal_document_versions%rowtype;
  privacy_policy public.website_legal_document_versions%rowtype;
  registration_event uuid := gen_random_uuid();
  provider_value text;
  request_headers jsonb := '{}'::jsonb;
  forwarded_ip text;
  captured_ip inet;
  captured_user_agent text;
  user_agent_source text := 'not_available';
begin
  -- Trusted administrative account creation may opt out only through app_metadata.
  -- Public clients can set user_metadata but cannot set app_metadata.
  if lower(coalesce(new.raw_app_meta_data ->> 'registration_consent_exempt', 'false')) = 'true' then
    return new;
  end if;

  account_type_value := lower(coalesce(new.raw_user_meta_data ->> 'account_type', ''));
  if account_type_value not in ('candidate', 'employer') then
    raise exception using
      errcode = 'P0001',
      message = 'REGISTRATION_ACCOUNT_TYPE_REQUIRED',
      detail = 'New public accounts must use the consent-aware candidate or employer registration journey.';
  end if;

  select version.*
  into website_terms
  from public.website_legal_current as current_document
  join public.website_legal_document_versions as version
    on version.id = current_document.document_version_id
  where current_document.document_key = 'website_terms'
    and version.document_key = 'website_terms'
    and version.effective_from <= now()
    and version.published_at <= now()
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'WEBSITE_TERMS_NOT_AVAILABLE';
  end if;

  select version.*
  into privacy_policy
  from public.website_legal_current as current_document
  join public.website_legal_document_versions as version
    on version.id = current_document.document_version_id
  where current_document.document_key = 'privacy_policy'
    and version.document_key = 'privacy_policy'
    and version.effective_from <= now()
    and version.published_at <= now()
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'PRIVACY_POLICY_NOT_AVAILABLE';
  end if;

  if lower(coalesce(new.raw_user_meta_data ->> 'website_terms_accepted', 'false')) <> 'true'
     or coalesce(new.raw_user_meta_data ->> 'website_terms_version', '') <> website_terms.version_code then
    raise exception using
      errcode = 'P0001',
      message = 'CURRENT_WEBSITE_TERMS_ACCEPTANCE_REQUIRED';
  end if;

  if lower(coalesce(new.raw_user_meta_data ->> 'privacy_policy_acknowledged', 'false')) <> 'true'
     or coalesce(new.raw_user_meta_data ->> 'privacy_policy_version', '') <> privacy_policy.version_code then
    raise exception using
      errcode = 'P0001',
      message = 'CURRENT_PRIVACY_POLICY_ACKNOWLEDGEMENT_REQUIRED';
  end if;

  if coalesce(new.raw_user_meta_data ->> 'consent_source', '') <> 'website_registration' then
    raise exception using errcode = 'P0001', message = 'CONSENT_AWARE_REGISTRATION_REQUIRED';
  end if;

  provider_value := left(coalesce(
    new.raw_app_meta_data ->> 'provider',
    new.raw_user_meta_data ->> 'provider',
    'email'
  ), 100);

  begin
    request_headers := coalesce(
      nullif(current_setting('request.headers', true), ''),
      '{}'
    )::jsonb;
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  forwarded_ip := split_part(
    coalesce(
      nullif(request_headers ->> 'cf-connecting-ip', ''),
      nullif(request_headers ->> 'x-forwarded-for', ''),
      ''
    ),
    ',',
    1
  );

  begin
    captured_ip := nullif(btrim(forwarded_ip), '')::inet;
  exception when others then
    captured_ip := null;
  end;

  captured_user_agent := left(nullif(request_headers ->> 'user-agent', ''), 1000);
  if captured_user_agent is not null then
    user_agent_source := 'request_header';
  else
    captured_user_agent := left(nullif(new.raw_user_meta_data ->> 'consent_user_agent', ''), 1000);
    if captured_user_agent is not null then
      user_agent_source := 'client_reported';
    end if;
  end if;

  insert into public.website_legal_acceptances (
    registration_event_id,
    user_id,
    account_type,
    document_key,
    document_version_id,
    document_version,
    document_sha256,
    acceptance_source,
    server_enforced,
    auth_provider,
    accepted_ip,
    user_agent,
    audit_information
  )
  values
    (
      registration_event,
      new.id,
      account_type_value,
      'website_terms',
      website_terms.id,
      website_terms.version_code,
      website_terms.content_sha256,
      'website_registration',
      true,
      provider_value,
      captured_ip,
      captured_user_agent,
      jsonb_build_object(
        'recorded_by', 'auth.users_after_insert_trigger',
        'auth_created_at', new.created_at,
        'user_agent_source', user_agent_source,
        'document_status', website_terms.document_status
      )
    ),
    (
      registration_event,
      new.id,
      account_type_value,
      'privacy_policy',
      privacy_policy.id,
      privacy_policy.version_code,
      privacy_policy.content_sha256,
      'website_registration',
      true,
      provider_value,
      captured_ip,
      captured_user_agent,
      jsonb_build_object(
        'recorded_by', 'auth.users_after_insert_trigger',
        'auth_created_at', new.created_at,
        'user_agent_source', user_agent_source,
        'document_status', privacy_policy.document_status
      )
    );

  return new;
end;
$function$;

revoke all on function public.enforce_new_user_website_legal_acceptance()
from public, anon, authenticated;

drop trigger if exists enforce_new_user_website_legal_acceptance
on auth.users;

create trigger enforce_new_user_website_legal_acceptance
after insert on auth.users
for each row
execute function public.enforce_new_user_website_legal_acceptance();

comment on table public.website_legal_document_versions is
  'Immutable version catalogue for Rolexa Website Terms and Privacy Policy documents. Separate from Employer Terms of Business.';

comment on table public.website_legal_acceptances is
  'Immutable, server-created registration acceptance records. One Website Terms row and one Privacy Policy row are created per new public account.';

comment on function public.enforce_new_user_website_legal_acceptance() is
  'Rejects new public auth users unless current Website Terms and Privacy Policy metadata is present, then writes immutable audit records. Existing users are unaffected because the trigger runs only after insert.';

commit;

-- Optional read-only verification after the transaction succeeds:
-- select * from public.get_current_registration_documents();
-- select user_id, account_type, document_key, document_version, accepted_at, server_enforced
-- from public.website_legal_acceptances
-- order by accepted_at desc;
