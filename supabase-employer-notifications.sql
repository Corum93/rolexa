-- Rolexa employer notification centre.
-- Creates secure, persistent in-app alerts from real candidate actions.

create table if not exists public.employer_notifications (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.candidate_applications(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  candidate_user_id uuid references auth.users(id) on delete set null,
  notification_type text not null check (notification_type in (
    'new_application',
    'candidate_reply',
    'interview_confirmed',
    'application_withdrawn',
    'candidate_action_completed'
  )),
  title text not null,
  message text not null,
  action_target text not null default 'matches' check (action_target in ('matches', 'messages')),
  event_key text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  email_delivery_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employer_user_id, event_key)
);

create index if not exists employer_notifications_owner_created_idx
  on public.employer_notifications (employer_user_id, created_at desc);

create index if not exists employer_notifications_owner_unread_idx
  on public.employer_notifications (employer_user_id, is_read, created_at desc);

alter table public.employer_notifications enable row level security;

drop policy if exists "Employers can read own notifications"
on public.employer_notifications;

create policy "Employers can read own notifications"
on public.employer_notifications
for select
to authenticated
using (auth.uid() = employer_user_id);

drop policy if exists "Employers can update own notification read state"
on public.employer_notifications;

create policy "Employers can update own notification read state"
on public.employer_notifications
for update
to authenticated
using (auth.uid() = employer_user_id)
with check (auth.uid() = employer_user_id);

revoke all on table public.employer_notifications from public, anon, authenticated;
grant select on table public.employer_notifications to authenticated;
grant update (is_read, read_at) on table public.employer_notifications to authenticated;
grant all on table public.employer_notifications to service_role;

create or replace function public.enqueue_employer_notification(
  p_employer_user_id uuid,
  p_application_id uuid,
  p_job_id uuid,
  p_candidate_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_action_target text,
  p_event_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  created_notification_id uuid;
begin
  if p_employer_user_id is null or nullif(btrim(p_event_key), '') is null then
    return null;
  end if;

  insert into public.employer_notifications (
    employer_user_id,
    application_id,
    job_id,
    candidate_user_id,
    notification_type,
    title,
    message,
    action_target,
    event_key
  )
  values (
    p_employer_user_id,
    p_application_id,
    p_job_id,
    p_candidate_user_id,
    p_notification_type,
    p_title,
    p_message,
    p_action_target,
    p_event_key
  )
  on conflict (employer_user_id, event_key) do nothing
  returning id into created_notification_id;

  return created_notification_id;
end;
$function$;

create or replace function public.notify_employer_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  employer_id uuid;
  job_title text;
  candidate_name text;
begin
  select
    job.employer_user_id,
    coalesce(nullif(btrim(job.title), ''), 'your role'),
    coalesce(nullif(btrim(profile.full_name), ''), nullif(btrim(profile.email), ''), 'A candidate')
  into employer_id, job_title, candidate_name
  from public.jobs as job
  left join public.candidate_profiles as profile
    on profile.user_id = new.user_id
  where job.id = new.job_id;

  perform public.enqueue_employer_notification(
    employer_id,
    new.id,
    new.job_id,
    new.user_id,
    'new_application',
    'New application received',
    format('%s applied for %s.', candidate_name, job_title),
    'matches',
    format('application:%s:new', new.id)
  );

  return new;
end;
$function$;

create or replace function public.notify_employer_application_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  employer_id uuid;
  job_title text;
  candidate_name text;
begin
  if lower(coalesce(new.status, '')) <> 'withdrawn'
     or lower(coalesce(old.status, '')) = 'withdrawn' then
    return new;
  end if;

  select
    job.employer_user_id,
    coalesce(nullif(btrim(job.title), ''), 'your role'),
    coalesce(nullif(btrim(profile.full_name), ''), nullif(btrim(profile.email), ''), 'A candidate')
  into employer_id, job_title, candidate_name
  from public.jobs as job
  left join public.candidate_profiles as profile
    on profile.user_id = new.user_id
  where job.id = new.job_id;

  perform public.enqueue_employer_notification(
    employer_id,
    new.id,
    new.job_id,
    new.user_id,
    'application_withdrawn',
    'Application withdrawn',
    format('%s withdrew their application for %s.', candidate_name, job_title),
    'matches',
    format('application:%s:withdrawn', new.id)
  );

  return new;
end;
$function$;

create or replace function public.notify_employer_candidate_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  employer_id uuid;
  application_id uuid;
  job_id uuid;
  job_title text;
  candidate_name text;
begin
  if lower(coalesce(new.sender, '')) <> 'candidate'
     or coalesce(new.thread_key, '') not like 'application:%' then
    return new;
  end if;

  select
    job.employer_user_id,
    application.id,
    application.job_id,
    coalesce(nullif(btrim(job.title), ''), 'your role'),
    coalesce(nullif(btrim(profile.full_name), ''), nullif(btrim(profile.email), ''), nullif(btrim(new.sender_name), ''), 'A candidate')
  into employer_id, application_id, job_id, job_title, candidate_name
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  left join public.candidate_profiles as profile
    on profile.user_id = application.user_id
  where application.id::text = split_part(new.thread_key, ':', 2)
    and application.user_id = new.user_id
  limit 1;

  perform public.enqueue_employer_notification(
    employer_id,
    application_id,
    job_id,
    new.user_id,
    'candidate_reply',
    'New candidate reply',
    format('%s replied about %s.', candidate_name, job_title),
    'messages',
    format('message:%s', new.id)
  );

  return new;
end;
$function$;

create or replace function public.notify_employer_interview_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  employer_id uuid;
  job_id uuid;
  job_title text;
  candidate_id uuid;
  candidate_name text;
begin
  if lower(coalesce(new.status, '')) <> 'confirmed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and lower(coalesce(old.status, '')) = 'confirmed' then
    return new;
  end if;

  select
    coalesce(new.employer_user_id, job.employer_user_id),
    application.job_id,
    coalesce(nullif(btrim(job.title), ''), 'your role'),
    application.user_id,
    coalesce(nullif(btrim(profile.full_name), ''), nullif(btrim(profile.email), ''), 'A candidate')
  into employer_id, job_id, job_title, candidate_id, candidate_name
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  left join public.candidate_profiles as profile
    on profile.user_id = application.user_id
  where application.id = new.application_id
  limit 1;

  perform public.enqueue_employer_notification(
    employer_id,
    new.application_id,
    job_id,
    candidate_id,
    'interview_confirmed',
    'Interview confirmed',
    format('%s confirmed an interview for %s.', candidate_name, job_title),
    'messages',
    format('booking:%s:confirmed', new.id)
  );

  return new;
end;
$function$;

create or replace function public.notify_employer_candidate_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  employer_id uuid;
  job_id uuid;
  job_title text;
  candidate_id uuid;
  candidate_name text;
  activity_type text := lower(coalesce(new.event_type, ''));
begin
  if lower(coalesce(new.changed_by_role, '')) <> 'candidate' then
    return new;
  end if;

  if activity_type like '%application%'
     or activity_type like '%message%'
     or activity_type like '%interview%'
     or activity_type like '%withdraw%'
     or activity_type like '%status%' then
    return new;
  end if;

  select
    job.employer_user_id,
    application.job_id,
    coalesce(nullif(btrim(job.title), ''), 'your role'),
    application.user_id,
    coalesce(nullif(btrim(profile.full_name), ''), nullif(btrim(profile.email), ''), 'A candidate')
  into employer_id, job_id, job_title, candidate_id, candidate_name
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  left join public.candidate_profiles as profile
    on profile.user_id = application.user_id
  where application.id = new.application_id
  limit 1;

  perform public.enqueue_employer_notification(
    employer_id,
    new.application_id,
    job_id,
    candidate_id,
    'candidate_action_completed',
    'Candidate action completed',
    coalesce(nullif(btrim(new.activity_message), ''), format('%s completed an action for %s.', candidate_name, job_title)),
    'matches',
    format('activity:%s', new.id)
  );

  return new;
end;
$function$;

drop trigger if exists notify_employer_new_application_trigger
on public.candidate_applications;

create trigger notify_employer_new_application_trigger
after insert on public.candidate_applications
for each row
execute function public.notify_employer_new_application();

drop trigger if exists notify_employer_application_withdrawal_trigger
on public.candidate_applications;

create trigger notify_employer_application_withdrawal_trigger
after update of status on public.candidate_applications
for each row
execute function public.notify_employer_application_withdrawal();

drop trigger if exists notify_employer_candidate_reply_trigger
on public.candidate_messages;

create trigger notify_employer_candidate_reply_trigger
after insert on public.candidate_messages
for each row
execute function public.notify_employer_candidate_reply();

drop trigger if exists notify_employer_interview_confirmation_trigger
on public.interview_bookings;

create trigger notify_employer_interview_confirmation_trigger
after insert or update of status on public.interview_bookings
for each row
execute function public.notify_employer_interview_confirmation();

drop trigger if exists notify_employer_candidate_activity_trigger
on public.application_activity;

create trigger notify_employer_candidate_activity_trigger
after insert on public.application_activity
for each row
execute function public.notify_employer_candidate_activity();

revoke all on function public.enqueue_employer_notification(uuid, uuid, uuid, uuid, text, text, text, text, text)
from public, anon, authenticated;

revoke all on function public.notify_employer_new_application()
from public, anon, authenticated;

revoke all on function public.notify_employer_application_withdrawal()
from public, anon, authenticated;

revoke all on function public.notify_employer_candidate_reply()
from public, anon, authenticated;

revoke all on function public.notify_employer_interview_confirmation()
from public, anon, authenticated;

revoke all on function public.notify_employer_candidate_activity()
from public, anon, authenticated;

do $publication$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'employer_notifications'
  ) then
    alter publication supabase_realtime add table public.employer_notifications;
  end if;
end;
$publication$;

comment on table public.employer_notifications is
  'Secure in-app alerts for employer-owned candidate activity across Rolexa jobs.';

comment on column public.employer_notifications.email_delivery_enabled is
  'Reserved for optional employer email alerts; in-app notifications are the current delivery channel.';

comment on function public.enqueue_employer_notification(uuid, uuid, uuid, uuid, text, text, text, text, text) is
  'Creates one idempotent employer notification for a real candidate event.';
