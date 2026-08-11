-- Rolexa company verification and candidate trust foundation
-- Run after supabase-internal-admin-security.sql and supabase-employer-profile-setup.sql.

alter table public.employer_profiles
  add column if not exists verification_status text not null default 'not_started',
  add column if not exists verified_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references auth.users(id),
  add column if not exists verification_review_note text;

alter table public.employer_profiles drop constraint if exists employer_profiles_verification_status_check;
alter table public.employer_profiles add constraint employer_profiles_verification_status_check
  check (verification_status in ('not_started','submitted','under_review','verified','changes_required','rejected','suspended'));

create table if not exists public.company_verification_submissions (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  legal_company_name text not null check (char_length(legal_company_name) between 2 and 160),
  company_number text not null check (char_length(company_number) between 2 and 40),
  registered_office text not null check (char_length(registered_office) between 5 and 300),
  website_url text not null,
  representative_name text not null check (char_length(representative_name) between 2 and 120),
  representative_title text not null check (char_length(representative_title) between 2 and 120),
  work_email text not null,
  authority_confirmed boolean not null default false,
  information_confirmed boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted','under_review','verified','changes_required','rejected','suspended')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_verification_one_current_submission
  on public.company_verification_submissions(employer_user_id);
create index if not exists company_verification_review_queue
  on public.company_verification_submissions(status, submitted_at desc);

create table if not exists public.company_safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  employer_user_id uuid references auth.users(id) on delete set null,
  job_id text,
  company_name text not null,
  reason text not null check (reason in ('identity_concern','misleading_job','payment_request','suspicious_contact','discrimination','other')),
  details text check (details is null or char_length(details) <= 1500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.company_verification_submissions enable row level security;
alter table public.company_safety_reports enable row level security;

drop policy if exists "Employers read own company verification" on public.company_verification_submissions;
create policy "Employers read own company verification" on public.company_verification_submissions
  for select to authenticated using (employer_user_id = auth.uid());
drop policy if exists "Employers submit own company verification" on public.company_verification_submissions;
create policy "Employers submit own company verification" on public.company_verification_submissions
  for insert to authenticated with check (employer_user_id = auth.uid() and status = 'submitted');
drop policy if exists "Employers update own returned verification" on public.company_verification_submissions;
create policy "Employers update own returned verification" on public.company_verification_submissions
  for update to authenticated
  using (employer_user_id = auth.uid() and status in ('submitted','changes_required'))
  with check (employer_user_id = auth.uid() and status = 'submitted' and reviewed_by is null and reviewed_at is null);

drop policy if exists "Verification staff read submissions" on public.company_verification_submissions;
create policy "Verification staff read submissions" on public.company_verification_submissions
  for select to authenticated using (public.is_rolexa_staff(array['owner','admin']));
drop policy if exists "Verification staff update submissions" on public.company_verification_submissions;
create policy "Verification staff update submissions" on public.company_verification_submissions
  for update to authenticated using (public.is_rolexa_staff(array['owner','admin']))
  with check (public.is_rolexa_staff(array['owner','admin']));

drop policy if exists "Candidates create company safety reports" on public.company_safety_reports;
create policy "Candidates create company safety reports" on public.company_safety_reports
  for insert to authenticated with check (reporter_user_id = auth.uid() and status = 'open');
drop policy if exists "Candidates read own company safety reports" on public.company_safety_reports;
create policy "Candidates read own company safety reports" on public.company_safety_reports
  for select to authenticated using (reporter_user_id = auth.uid());
drop policy if exists "Verification staff manage company safety reports" on public.company_safety_reports;
create policy "Verification staff manage company safety reports" on public.company_safety_reports
  for all to authenticated using (public.is_rolexa_staff(array['owner','admin']))
  with check (public.is_rolexa_staff(array['owner','admin']));

-- Employers may edit public profile fields, but review fields are database-controlled.
revoke insert, update on public.employer_profiles from authenticated;
grant insert (
  user_id, company_name, industry, company_size, location, website_url, description,
  contact_name, contact_title, linkedin_url, social_url, logo_url, logo_path, created_at, updated_at
) on public.employer_profiles to authenticated;
grant update (
  company_name, industry, company_size, location, website_url, description,
  contact_name, contact_title, linkedin_url, social_url, logo_url, logo_path, updated_at
) on public.employer_profiles to authenticated;

-- A job may exist as a private draft, but only a verified company can activate it.
create or replace function public.require_verified_company_for_live_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_active, false) and not exists (
    select 1 from public.employer_profiles p
    where p.user_id = new.employer_user_id and p.verification_status = 'verified'
  ) then
    raise exception 'Company verification is required before a job can be published' using errcode = '42501';
  end if;
  return new;
end; $$;
drop trigger if exists require_verified_company_for_live_job_trigger on public.jobs;
create trigger require_verified_company_for_live_job_trigger before insert or update of is_active, employer_user_id on public.jobs
for each row execute function public.require_verified_company_for_live_job();

create or replace function public.submit_company_verification(
  legal_name text, registration_number text, registered_address text, company_website text,
  representative text, representative_job_title text, representative_email text,
  confirms_authority boolean, confirms_information boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare result_row public.company_verification_submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not coalesce(confirms_authority,false) or not coalesce(confirms_information,false) then
    raise exception 'Both declarations must be confirmed' using errcode = '22023';
  end if;
  if company_website !~* '^https?://' then raise exception 'A valid company website is required' using errcode = '22023'; end if;
  if representative_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid work email is required' using errcode = '22023'; end if;

  insert into public.company_verification_submissions (
    employer_user_id, legal_company_name, company_number, registered_office, website_url,
    representative_name, representative_title, work_email, authority_confirmed, information_confirmed,
    status, review_note, reviewed_by, reviewed_at, submitted_at, updated_at
  ) values (
    auth.uid(), trim(legal_name), upper(trim(registration_number)), trim(registered_address), trim(company_website),
    trim(representative), trim(representative_job_title), lower(trim(representative_email)), true, true,
    'submitted', null, null, null, now(), now()
  ) on conflict (employer_user_id) do update set
    legal_company_name=excluded.legal_company_name, company_number=excluded.company_number,
    registered_office=excluded.registered_office, website_url=excluded.website_url,
    representative_name=excluded.representative_name, representative_title=excluded.representative_title,
    work_email=excluded.work_email, authority_confirmed=true, information_confirmed=true,
    status='submitted', review_note=null, reviewed_by=null, reviewed_at=null, submitted_at=now(), updated_at=now()
  returning * into result_row;

  insert into public.employer_profiles (
    user_id, company_name, website_url, contact_name, contact_title,
    verification_status, verification_review_note, updated_at
  ) values (
    auth.uid(), trim(legal_name), trim(company_website), trim(representative), trim(representative_job_title),
    'submitted', null, now()
  ) on conflict (user_id) do update set
    verification_status='submitted', verification_review_note=null, updated_at=now();
  return jsonb_build_object('id',result_row.id,'status',result_row.status,'submitted_at',result_row.submitted_at);
end; $$;
revoke all on function public.submit_company_verification(text,text,text,text,text,text,text,boolean,boolean) from public;
grant execute on function public.submit_company_verification(text,text,text,text,text,text,text,boolean,boolean) to authenticated;

create or replace function public.review_company_verification(target_employer uuid, decision text, reviewer_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare approved_at timestamptz;
begin
  if not public.is_rolexa_staff(array['owner','admin']) then raise exception 'Verification reviewer access required' using errcode='42501'; end if;
  if decision not in ('under_review','verified','changes_required','rejected','suspended') then raise exception 'Invalid verification decision' using errcode='22023'; end if;
  approved_at := case when decision='verified' then now() else null end;
  update public.company_verification_submissions set status=decision, review_note=nullif(trim(reviewer_note),''), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
  where employer_user_id=target_employer;
  if not found then raise exception 'Verification submission not found' using errcode='P0002'; end if;
  update public.employer_profiles set verification_status=decision, verified_at=approved_at,
    verification_review_note=nullif(trim(reviewer_note),''), verification_reviewed_by=auth.uid(), verification_reviewed_at=now(), updated_at=now()
  where user_id=target_employer;
  if decision in ('rejected','suspended','changes_required') then update public.jobs set is_active=false, updated_at=now() where employer_user_id=target_employer and is_active=true; end if;
  insert into public.rolexa_admin_audit_log(staff_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'company_verification_'||decision,'employer_profile',target_employer,jsonb_build_object('note',nullif(trim(reviewer_note),'')));
  return jsonb_build_object('employer_user_id',target_employer,'status',decision,'reviewed_at',now());
end; $$;
revoke all on function public.review_company_verification(uuid,text,text) from public;
grant execute on function public.review_company_verification(uuid,text,text) to authenticated;

create or replace function public.get_public_company_trust()
returns table(employer_user_id uuid, company_name text, verification_status text, verified_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.user_id,p.company_name,p.verification_status,p.verified_at
  from public.employer_profiles p where p.verification_status='verified';
$$;
revoke all on function public.get_public_company_trust() from public;
grant execute on function public.get_public_company_trust() to anon, authenticated;

create or replace function public.get_company_verification_queue()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_rolexa_staff(array['owner','admin']) then raise exception 'Verification reviewer access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'submissions',coalesce((select jsonb_agg(jsonb_build_object(
      'employer_user_id',s.employer_user_id,'company_name',coalesce(p.company_name,s.legal_company_name),
      'legal_company_name',s.legal_company_name,'company_number',s.company_number,'registered_office',s.registered_office,
      'website_url',s.website_url,'representative_name',s.representative_name,'representative_title',s.representative_title,
      'work_email',s.work_email,'status',s.status,'review_note',s.review_note,'submitted_at',s.submitted_at
    ) order by s.submitted_at desc) from public.company_verification_submissions s left join public.employer_profiles p on p.user_id=s.employer_user_id),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.company_safety_reports r where r.status in ('open','reviewing')),'[]'::jsonb)
  );
end; $$;
revoke all on function public.get_company_verification_queue() from public;
grant execute on function public.get_company_verification_queue() to authenticated;
