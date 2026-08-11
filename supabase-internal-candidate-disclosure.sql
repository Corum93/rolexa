-- Rolexa mandatory internal-candidate transparency disclosure.
-- Run this entire script once in the Supabase SQL Editor before relying on the new publishing UI.
-- Existing live jobs remain live. New jobs and republished jobs must carry a valid disclosure.

begin;

alter table public.jobs
  add column if not exists internal_candidate_disclosure_required boolean not null default false,
  add column if not exists internal_candidate_status text,
  add column if not exists internal_candidate_disclosure_confirmed boolean not null default false,
  add column if not exists internal_candidate_disclosure_confirmed_at timestamptz,
  add column if not exists internal_candidate_disclosure_confirmed_by uuid references auth.users(id) on delete restrict,
  add column if not exists internal_candidate_disclosure_updated_at timestamptz;

alter table public.jobs
  alter column internal_candidate_disclosure_required set default true;

alter table public.jobs
  drop constraint if exists jobs_internal_candidate_status_check;

alter table public.jobs
  add constraint jobs_internal_candidate_status_check
  check (
    internal_candidate_status is null
    or internal_candidate_status in ('none', 'may_apply', 'in_process', 'preferred')
  );

create table if not exists public.job_internal_candidate_disclosure_history (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.jobs(id) on delete restrict,
  employer_user_id uuid not null references auth.users(id) on delete restrict,
  disclosure_status text not null check (disclosure_status in ('none', 'may_apply', 'in_process', 'preferred')),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists job_internal_candidate_disclosure_history_job_idx
  on public.job_internal_candidate_disclosure_history (job_id, recorded_at desc);

alter table public.job_internal_candidate_disclosure_history enable row level security;

drop policy if exists "Employers can read own internal candidate disclosure history"
on public.job_internal_candidate_disclosure_history;

create policy "Employers can read own internal candidate disclosure history"
on public.job_internal_candidate_disclosure_history
for select
to authenticated
using (auth.uid() = employer_user_id);

revoke all on table public.job_internal_candidate_disclosure_history from public, anon, authenticated;
grant select on table public.job_internal_candidate_disclosure_history to authenticated;
grant all on table public.job_internal_candidate_disclosure_history to service_role;

create or replace function public.enforce_internal_candidate_disclosure_for_live_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  disclosure_is_required boolean := false;
begin
  if tg_op = 'INSERT' then
    disclosure_is_required := true;
  else
    disclosure_is_required := coalesce(new.internal_candidate_disclosure_required, false)
      or coalesce(old.internal_candidate_disclosure_required, false)
      or new.internal_candidate_status is not null
      or old.internal_candidate_status is not null
      or coalesce(new.internal_candidate_disclosure_confirmed, false)
      or coalesce(old.internal_candidate_disclosure_confirmed, false)
      or (not coalesce(old.is_active, false) and coalesce(new.is_active, false));
  end if;

  if coalesce(new.is_active, false) and disclosure_is_required then
    if new.internal_candidate_status is null
       or new.internal_candidate_status not in ('none', 'may_apply', 'in_process', 'preferred') then
      raise exception using
        errcode = '22023',
        message = 'INTERNAL_CANDIDATE_DISCLOSURE_REQUIRED',
        detail = 'Select the current internal-candidate position before publishing this job.';
    end if;

    if not coalesce(new.internal_candidate_disclosure_confirmed, false) then
      raise exception using
        errcode = '22023',
        message = 'INTERNAL_CANDIDATE_DISCLOSURE_CONFIRMATION_REQUIRED',
        detail = 'Confirm that the internal-candidate disclosure is accurate before publishing this job.';
    end if;

    if auth.uid() is null
       or new.employer_user_id is null
       or auth.uid() <> new.employer_user_id then
      raise exception using
        errcode = '42501',
        message = 'INTERNAL_CANDIDATE_DISCLOSURE_EMPLOYER_REQUIRED';
    end if;

    new.internal_candidate_disclosure_required := true;
    new.internal_candidate_disclosure_confirmed := true;
    new.internal_candidate_disclosure_confirmed_by := auth.uid();
    new.internal_candidate_disclosure_confirmed_at := now();
    new.internal_candidate_disclosure_updated_at := now();
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_internal_candidate_disclosure_for_live_job()
from public, anon, authenticated;

drop trigger if exists enforce_internal_candidate_disclosure_for_live_job_trigger
on public.jobs;

create trigger enforce_internal_candidate_disclosure_for_live_job_trigger
before insert or update of
  is_active,
  employer_user_id,
  internal_candidate_disclosure_required,
  internal_candidate_status,
  internal_candidate_disclosure_confirmed
on public.jobs
for each row
execute function public.enforce_internal_candidate_disclosure_for_live_job();

create or replace function public.record_internal_candidate_disclosure_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  should_record boolean := false;
begin
  if tg_op = 'INSERT' then
    should_record := true;
  else
    should_record := old.internal_candidate_status is distinct from new.internal_candidate_status
      or old.internal_candidate_disclosure_confirmed_at is distinct from new.internal_candidate_disclosure_confirmed_at;
  end if;

  if new.internal_candidate_disclosure_required
     and new.internal_candidate_disclosure_confirmed
     and new.internal_candidate_status in ('none', 'may_apply', 'in_process', 'preferred')
     and should_record then
    insert into public.job_internal_candidate_disclosure_history (
      job_id,
      employer_user_id,
      disclosure_status,
      confirmed_by,
      confirmed_at
    ) values (
      new.id,
      new.employer_user_id,
      new.internal_candidate_status,
      new.internal_candidate_disclosure_confirmed_by,
      new.internal_candidate_disclosure_confirmed_at
    );
  end if;
  return new;
end;
$function$;

revoke all on function public.record_internal_candidate_disclosure_history()
from public, anon, authenticated;

create or replace function public.prevent_internal_candidate_disclosure_history_changes()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'IMMUTABLE_INTERNAL_CANDIDATE_DISCLOSURE_HISTORY';
end;
$function$;

revoke all on function public.prevent_internal_candidate_disclosure_history_changes()
from public, anon, authenticated;

drop trigger if exists protect_internal_candidate_disclosure_history_trigger
on public.job_internal_candidate_disclosure_history;

create trigger protect_internal_candidate_disclosure_history_trigger
before update or delete on public.job_internal_candidate_disclosure_history
for each row
execute function public.prevent_internal_candidate_disclosure_history_changes();

drop trigger if exists record_internal_candidate_disclosure_history_trigger
on public.jobs;

create trigger record_internal_candidate_disclosure_history_trigger
after insert or update of
  internal_candidate_status,
  internal_candidate_disclosure_confirmed,
  internal_candidate_disclosure_confirmed_at
on public.jobs
for each row
execute function public.record_internal_candidate_disclosure_history();

comment on column public.jobs.internal_candidate_status is
  'Mandatory candidate-facing disclosure for newly published or republished jobs: none, may_apply, in_process, or preferred.';

comment on table public.job_internal_candidate_disclosure_history is
  'Server-recorded audit history of employer internal-candidate disclosures. Existing live jobs are grandfathered until republished.';

commit;

-- Optional read-only verification:
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'jobs'
--   and column_name like 'internal_candidate%'
-- order by column_name;
