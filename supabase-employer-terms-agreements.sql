-- Rolexa employer onboarding and Employer Terms of Business acceptance.
-- Run once in the Supabase SQL editor before connecting the employer terms page.
-- Stripe and payment collection are deliberately outside this migration.

begin;

alter table public.employer_profiles
  add column if not exists legal_company_name text,
  add column if not exists company_registration_number text,
  add column if not exists registered_address text,
  add column if not exists registered_country text,
  add column if not exists authorised_signatory_name text,
  add column if not exists authorised_signatory_job_title text,
  add column if not exists current_terms_version text,
  add column if not exists terms_accepted_at timestamptz;

create table if not exists public.employer_terms_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  title text not null,
  terms_text text not null,
  terms_sha256 text generated always as (
    encode(digest(terms_text, 'sha256'), 'hex')
  ) stored,
  currency text not null default 'GBP' check (currency = 'GBP'),
  monthly_subscription_pence integer not null check (monthly_subscription_pence >= 0),
  placement_fee_basis_points integer not null check (placement_fee_basis_points between 0 and 10000),
  placement_fee_basis text not null,
  vat_treatment text not null,
  rebate_days_1_to_30 smallint not null default 100 check (rebate_days_1_to_30 between 0 and 100),
  rebate_days_31_to_60 smallint not null default 50 check (rebate_days_31_to_60 between 0 and 100),
  rebate_days_61_to_90 smallint not null default 25 check (rebate_days_61_to_90 between 0 and 100),
  rebate_after_day_90 smallint not null default 0 check (rebate_after_day_90 between 0 and 100),
  effective_from timestamptz not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.employer_terms_current (
  singleton boolean primary key default true check (singleton),
  terms_version_id uuid not null references public.employer_terms_versions(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.employer_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete restrict,
  terms_version_id uuid not null references public.employer_terms_versions(id) on delete restrict,
  account_email text not null,
  legal_company_name text not null,
  company_registration_number text,
  registered_address text not null,
  registered_country text not null default 'United Kingdom',
  signatory_name text not null,
  signatory_job_title text not null,
  electronic_signature text not null,
  authority_confirmed boolean not null check (authority_confirmed),
  terms_confirmed boolean not null check (terms_confirmed),
  privacy_notice_confirmed boolean not null check (privacy_notice_confirmed),
  currency text not null,
  monthly_subscription_pence integer not null,
  placement_fee_basis_points integer not null,
  placement_fee_basis text not null,
  vat_treatment text not null,
  rebate_days_1_to_30 smallint not null,
  rebate_days_31_to_60 smallint not null,
  rebate_days_61_to_90 smallint not null,
  rebate_after_day_90 smallint not null,
  terms_sha256 text not null,
  accepted_at timestamptz not null default now(),
  accepted_ip inet,
  user_agent text,
  unique (employer_user_id, terms_version_id)
);

create table if not exists public.employer_agreement_documents (
  id uuid primary key default gen_random_uuid(),
  acceptance_id uuid not null unique references public.employer_terms_acceptances(id) on delete restrict,
  employer_user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  document_sha256 text not null,
  generated_at timestamptz not null default now()
);

create index if not exists employer_terms_acceptances_owner_idx
  on public.employer_terms_acceptances (employer_user_id, accepted_at desc);

create index if not exists employer_terms_acceptances_version_idx
  on public.employer_terms_acceptances (terms_version_id, accepted_at desc);

create index if not exists employer_agreement_documents_owner_idx
  on public.employer_agreement_documents (employer_user_id, generated_at desc);

alter table public.employer_terms_versions enable row level security;
alter table public.employer_terms_current enable row level security;
alter table public.employer_terms_acceptances enable row level security;
alter table public.employer_agreement_documents enable row level security;

drop policy if exists "Authenticated users can read published employer terms"
on public.employer_terms_versions;

create policy "Authenticated users can read published employer terms"
on public.employer_terms_versions
for select
to authenticated
using (published_at <= now());

drop policy if exists "Authenticated users can read current employer terms pointer"
on public.employer_terms_current;

create policy "Authenticated users can read current employer terms pointer"
on public.employer_terms_current
for select
to authenticated
using (true);

drop policy if exists "Employers can read own terms acceptances"
on public.employer_terms_acceptances;

create policy "Employers can read own terms acceptances"
on public.employer_terms_acceptances
for select
to authenticated
using (auth.uid() = employer_user_id);

drop policy if exists "Employers can read own agreement documents"
on public.employer_agreement_documents;

create policy "Employers can read own agreement documents"
on public.employer_agreement_documents
for select
to authenticated
using (auth.uid() = employer_user_id);

revoke all on table public.employer_terms_versions from public, anon, authenticated;
revoke all on table public.employer_terms_current from public, anon, authenticated;
revoke all on table public.employer_terms_acceptances from public, anon, authenticated;
revoke all on table public.employer_agreement_documents from public, anon, authenticated;

grant select on table public.employer_terms_versions to authenticated;
grant select on table public.employer_terms_current to authenticated;
grant select on table public.employer_terms_acceptances to authenticated;
grant select on table public.employer_agreement_documents to authenticated;

grant all on table public.employer_terms_versions to service_role;
grant all on table public.employer_terms_current to service_role;
grant all on table public.employer_terms_acceptances to service_role;
grant all on table public.employer_agreement_documents to service_role;

create or replace function public.prevent_employer_legal_record_changes()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'IMMUTABLE_LEGAL_RECORD',
    detail = 'Published terms and accepted agreements cannot be changed or deleted.';
end;
$function$;

drop trigger if exists protect_employer_terms_versions
on public.employer_terms_versions;

create trigger protect_employer_terms_versions
before update or delete on public.employer_terms_versions
for each row
execute function public.prevent_employer_legal_record_changes();

drop trigger if exists protect_employer_terms_acceptances
on public.employer_terms_acceptances;

create trigger protect_employer_terms_acceptances
before update or delete on public.employer_terms_acceptances
for each row
execute function public.prevent_employer_legal_record_changes();

drop trigger if exists protect_employer_agreement_documents
on public.employer_agreement_documents;

create trigger protect_employer_agreement_documents
before update or delete on public.employer_agreement_documents
for each row
execute function public.prevent_employer_legal_record_changes();

revoke all on function public.prevent_employer_legal_record_changes()
from public, anon, authenticated;

create or replace function public.accept_current_employer_terms(
  p_terms_version_code text,
  p_legal_company_name text,
  p_company_registration_number text,
  p_registered_address text,
  p_registered_country text,
  p_signatory_name text,
  p_signatory_job_title text,
  p_electronic_signature text,
  p_authority_confirmed boolean,
  p_terms_confirmed boolean,
  p_privacy_notice_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  current_terms public.employer_terms_versions%rowtype;
  existing_acceptance_id uuid;
  created_acceptance_id uuid;
  request_headers jsonb := '{}'::jsonb;
  forwarded_ip text;
  captured_ip inet;
  captured_user_agent text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select lower(email)
  into actor_email
  from auth.users
  where id = actor_id;

  if actor_email is null then
    raise exception using errcode = '42501', message = 'ACCOUNT_EMAIL_REQUIRED';
  end if;

  select version.*
  into current_terms
  from public.employer_terms_current as current_pointer
  join public.employer_terms_versions as version
    on version.id = current_pointer.terms_version_id
  where current_pointer.singleton = true
    and version.published_at <= now()
    and version.effective_from <= now()
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'EMPLOYER_TERMS_NOT_AVAILABLE';
  end if;

  if nullif(btrim(p_terms_version_code), '') is null
     or p_terms_version_code <> current_terms.version_code then
    raise exception using errcode = 'P0001', message = 'EMPLOYER_TERMS_VERSION_CHANGED';
  end if;

  if nullif(btrim(p_legal_company_name), '') is null
     or char_length(btrim(p_legal_company_name)) > 160 then
    raise exception using errcode = '22023', message = 'LEGAL_COMPANY_NAME_REQUIRED';
  end if;

  if nullif(btrim(p_registered_address), '') is null
     or char_length(btrim(p_registered_address)) > 600 then
    raise exception using errcode = '22023', message = 'REGISTERED_ADDRESS_REQUIRED';
  end if;

  if nullif(btrim(p_registered_country), '') is null
     or char_length(btrim(p_registered_country)) > 100 then
    raise exception using errcode = '22023', message = 'REGISTERED_COUNTRY_REQUIRED';
  end if;

  if nullif(btrim(p_signatory_name), '') is null
     or char_length(btrim(p_signatory_name)) > 160 then
    raise exception using errcode = '22023', message = 'SIGNATORY_NAME_REQUIRED';
  end if;

  if nullif(btrim(p_signatory_job_title), '') is null
     or char_length(btrim(p_signatory_job_title)) > 160 then
    raise exception using errcode = '22023', message = 'SIGNATORY_JOB_TITLE_REQUIRED';
  end if;

  if nullif(btrim(p_electronic_signature), '') is null
     or lower(btrim(p_electronic_signature)) <> lower(btrim(p_signatory_name)) then
    raise exception using errcode = '22023', message = 'ELECTRONIC_SIGNATURE_MUST_MATCH_SIGNATORY';
  end if;

  if p_company_registration_number is not null
     and char_length(btrim(p_company_registration_number)) > 40 then
    raise exception using errcode = '22023', message = 'COMPANY_REGISTRATION_NUMBER_TOO_LONG';
  end if;

  if not coalesce(p_authority_confirmed, false)
     or not coalesce(p_terms_confirmed, false)
     or not coalesce(p_privacy_notice_confirmed, false) then
    raise exception using errcode = '22023', message = 'ALL_REQUIRED_CONFIRMATIONS_MUST_BE_ACCEPTED';
  end if;

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

  select acceptance.id
  into existing_acceptance_id
  from public.employer_terms_acceptances as acceptance
  where acceptance.employer_user_id = actor_id
    and acceptance.terms_version_id = current_terms.id;

  if existing_acceptance_id is not null then
    return existing_acceptance_id;
  end if;

  insert into public.employer_profiles (
    user_id,
    company_name,
    contact_name,
    contact_title,
    legal_company_name,
    company_registration_number,
    registered_address,
    registered_country,
    authorised_signatory_name,
    authorised_signatory_job_title,
    current_terms_version,
    terms_accepted_at
  )
  values (
    actor_id,
    btrim(p_legal_company_name),
    btrim(p_signatory_name),
    btrim(p_signatory_job_title),
    btrim(p_legal_company_name),
    nullif(btrim(p_company_registration_number), ''),
    btrim(p_registered_address),
    btrim(p_registered_country),
    btrim(p_signatory_name),
    btrim(p_signatory_job_title),
    current_terms.version_code,
    now()
  )
  on conflict (user_id) do update set
    legal_company_name = excluded.legal_company_name,
    company_registration_number = excluded.company_registration_number,
    registered_address = excluded.registered_address,
    registered_country = excluded.registered_country,
    authorised_signatory_name = excluded.authorised_signatory_name,
    authorised_signatory_job_title = excluded.authorised_signatory_job_title,
    contact_name = coalesce(nullif(public.employer_profiles.contact_name, ''), excluded.contact_name),
    contact_title = coalesce(nullif(public.employer_profiles.contact_title, ''), excluded.contact_title),
    current_terms_version = excluded.current_terms_version,
    terms_accepted_at = excluded.terms_accepted_at,
    updated_at = now();

  insert into public.employer_terms_acceptances (
    employer_user_id,
    terms_version_id,
    account_email,
    legal_company_name,
    company_registration_number,
    registered_address,
    registered_country,
    signatory_name,
    signatory_job_title,
    electronic_signature,
    authority_confirmed,
    terms_confirmed,
    privacy_notice_confirmed,
    currency,
    monthly_subscription_pence,
    placement_fee_basis_points,
    placement_fee_basis,
    vat_treatment,
    rebate_days_1_to_30,
    rebate_days_31_to_60,
    rebate_days_61_to_90,
    rebate_after_day_90,
    terms_sha256,
    accepted_ip,
    user_agent
  )
  values (
    actor_id,
    current_terms.id,
    actor_email,
    btrim(p_legal_company_name),
    nullif(btrim(p_company_registration_number), ''),
    btrim(p_registered_address),
    btrim(p_registered_country),
    btrim(p_signatory_name),
    btrim(p_signatory_job_title),
    btrim(p_electronic_signature),
    true,
    true,
    true,
    current_terms.currency,
    current_terms.monthly_subscription_pence,
    current_terms.placement_fee_basis_points,
    current_terms.placement_fee_basis,
    current_terms.vat_treatment,
    current_terms.rebate_days_1_to_30,
    current_terms.rebate_days_31_to_60,
    current_terms.rebate_days_61_to_90,
    current_terms.rebate_after_day_90,
    current_terms.terms_sha256,
    captured_ip,
    captured_user_agent
  )
  returning id into created_acceptance_id;

  return created_acceptance_id;
end;
$function$;

revoke all on function public.accept_current_employer_terms(
  text, text, text, text, text, text, text, text, boolean, boolean, boolean
)
from public, anon;

grant execute on function public.accept_current_employer_terms(
  text, text, text, text, text, text, text, text, boolean, boolean, boolean
)
to authenticated;

create or replace function public.has_current_employer_terms()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.employer_terms_current as current_pointer
    join public.employer_terms_acceptances as acceptance
      on acceptance.terms_version_id = current_pointer.terms_version_id
    where current_pointer.singleton = true
      and acceptance.employer_user_id = auth.uid()
  );
$function$;

revoke all on function public.has_current_employer_terms()
from public, anon;

grant execute on function public.has_current_employer_terms()
to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'employer-agreements',
  'employer-agreements',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Employers can read own signed agreement files"
on storage.objects;

create policy "Employers can read own signed agreement files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'employer-agreements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

comment on table public.employer_terms_versions is
  'Immutable published versions of Rolexa Employer Terms of Business.';

comment on table public.employer_terms_acceptances is
  'Immutable audit records of authenticated employer acceptance and electronic signature.';

comment on table public.employer_agreement_documents is
  'Generated PDF copies of accepted employer agreements in the private employer-agreements bucket.';

comment on function public.accept_current_employer_terms(
  text, text, text, text, text, text, text, text, boolean, boolean, boolean
) is
  'Validates and records acceptance of the current Employer Terms, including immutable commercial snapshots.';

comment on function public.has_current_employer_terms() is
  'Returns true only when the signed-in employer accepted the currently published Employer Terms version.';

commit;
