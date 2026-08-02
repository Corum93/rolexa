-- Rolexa: enforce a hard maximum of 100 applications per job.
-- Existing jobs are backfilled safely, and the count is maintained by triggers.

alter table public.jobs
  add column if not exists application_limit integer;

update public.jobs
set application_limit = 100
where application_limit is null;

alter table public.jobs
  alter column application_limit set default 100,
  alter column application_limit set not null;

alter table public.jobs
  add column if not exists application_count integer;

update public.jobs as job
set application_count = (
  select count(*)::integer
  from public.candidate_applications as application
  where application.job_id = job.id
);

alter table public.jobs
  alter column application_count set default 0,
  alter column application_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_application_limit_range'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_application_limit_range
      check (application_limit between 1 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_application_count_nonnegative'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_application_count_nonnegative
      check (application_count >= 0);
  end if;
end;
$$;

create or replace function public.enforce_job_application_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer := 0;
  job_limit integer := 100;
  job_is_active boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.job_id::text, 0));

  select application_limit, is_active
  into job_limit, job_is_active
  from public.jobs
  where id = new.job_id
  for update;

  if not found then
    return new;
  end if;

  if not coalesce(job_is_active, false) then
    raise exception using
      errcode = 'P0001',
      message = 'APPLICATIONS_CLOSED',
      detail = 'This job is not accepting applications.';
  end if;

  if exists (
    select 1
    from public.candidate_applications
    where job_id = new.job_id
      and user_id = new.user_id
  ) then
    return new;
  end if;

  select count(*)::integer
  into current_count
  from public.candidate_applications
  where job_id = new.job_id;

  if current_count >= job_limit then
    raise exception using
      errcode = 'P0001',
      message = 'APPLICATION_LIMIT_REACHED',
      detail = format('This role has reached %s applications.', job_limit),
      hint = 'Do not accept another application for this job.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_job_application_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_job_id public.candidate_applications.job_id%type;
begin
  affected_job_id := case when tg_op = 'DELETE' then old.job_id else new.job_id end;

  update public.jobs
  set application_count = (
    select count(*)::integer
    from public.candidate_applications
    where job_id = affected_job_id
  )
  where id = affected_job_id;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists enforce_job_application_limit_trigger
on public.candidate_applications;

create trigger enforce_job_application_limit_trigger
before insert on public.candidate_applications
for each row
execute function public.enforce_job_application_limit();

drop trigger if exists sync_job_application_count_trigger
on public.candidate_applications;

create trigger sync_job_application_count_trigger
after insert or delete on public.candidate_applications
for each row
execute function public.sync_job_application_count();

revoke all on function public.enforce_job_application_limit() from public;
revoke all on function public.enforce_job_application_limit() from anon;
revoke all on function public.enforce_job_application_limit() from authenticated;

revoke all on function public.sync_job_application_count() from public;
revoke all on function public.sync_job_application_count() from anon;
revoke all on function public.sync_job_application_count() from authenticated;

comment on column public.jobs.application_limit is
  'Maximum applications accepted for this job. Rolexa currently caps this at 100.';

comment on column public.jobs.application_count is
  'Database-maintained total number of applications received for this job.';

comment on function public.enforce_job_application_limit() is
  'Serialises applications per job and rejects a new application once the job limit is reached.';

comment on function public.sync_job_application_count() is
  'Keeps jobs.application_count aligned with candidate_applications.';
