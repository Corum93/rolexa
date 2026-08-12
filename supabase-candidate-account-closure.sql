-- Rolexa candidate account closure and controlled personal-data deletion.
-- Run this entire file once in the Supabase SQL Editor.
--
-- This workflow deliberately preserves minimal restricted audit evidence where
-- Rolexa has a live complaint, dispute, security investigation or legal duty.
-- Stored CV/photo objects, completion email delivery and Auth identity
-- anonymisation must be verified by a trusted service process before a request
-- can be marked completed.

begin;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create table if not exists public.candidate_account_closure_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_user_id uuid not null references auth.users(id) on delete restrict,
  request_mode text not null check (request_mode in ('close_now', 'after_applications')),
  status text not null check (status in (
    'waiting_for_applications',
    'pending_deletion',
    'legal_hold',
    'completed',
    'cancelled'
  )),
  active_application_count_at_request integer not null default 0 check (active_application_count_at_request >= 0),
  requested_at timestamptz not null default now(),
  activated_at timestamptz,
  deletion_due_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cv_file_path text,
  photo_file_path text,
  candidate_reported_cv_removed boolean,
  candidate_reported_photo_removed boolean,
  candidate_storage_cleanup_reported_at timestamptz,
  verified_storage_removed_at timestamptz,
  completion_email_sent_at timestamptz,
  auth_identity_anonymised_at timestamptz,
  legal_hold_reason text,
  deletion_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(deletion_summary) = 'object'),
  updated_at timestamptz not null default now()
);

create unique index if not exists candidate_account_closure_one_open_request
  on public.candidate_account_closure_requests (candidate_user_id)
  where status in ('waiting_for_applications', 'pending_deletion', 'legal_hold');

create index if not exists candidate_account_closure_due_queue
  on public.candidate_account_closure_requests (status, deletion_due_at)
  where status in ('pending_deletion', 'legal_hold');

alter table public.candidate_account_closure_requests enable row level security;

revoke all on table public.candidate_account_closure_requests
from public, anon, authenticated;

grant all on table public.candidate_account_closure_requests
to service_role;

create or replace function private.candidate_account_is_restricted(p_candidate_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.candidate_account_closure_requests as request
    where request.candidate_user_id = p_candidate_user_id
      and request.status in ('pending_deletion', 'legal_hold', 'completed')
  );
$function$;

revoke all on function private.candidate_account_is_restricted(uuid)
from public, anon;

grant execute on function private.candidate_account_is_restricted(uuid)
to authenticated, service_role;

create or replace function private.candidate_application_is_restricted(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.candidate_applications as application
    where application.id = p_application_id
      and private.candidate_account_is_restricted(application.user_id)
  );
$function$;

revoke all on function private.candidate_application_is_restricted(uuid)
from public, anon;

grant execute on function private.candidate_application_is_restricted(uuid)
to authenticated, service_role;

-- Restrictive policies are ANDed with Rolexa's existing permissive policies.
-- They prevent candidates, employers and ordinary internal users from reading
-- or changing candidate data once closure begins. service_role continues to
-- support the controlled deletion process.

alter table public.candidate_profiles enable row level security;
alter table public.candidate_applications enable row level security;
alter table public.candidate_saved_jobs enable row level security;
alter table public.candidate_messages enable row level security;
alter table public.interview_bookings enable row level security;
alter table public.interview_slots enable row level security;
alter table public.candidate_notifications enable row level security;
alter table public.candidate_career_directions enable row level security;
alter table public.application_activity enable row level security;
alter table public.company_safety_reports enable row level security;
alter table public.candidate_evidence enable row level security;
alter table public.evidence_disputes enable row level security;
alter table public.evidence_disclosures enable row level security;
alter table public.career_passport_audit_events enable row level security;

drop policy if exists "Restricted candidate profiles are inaccessible"
on public.candidate_profiles;
create policy "Restricted candidate profiles are inaccessible"
on public.candidate_profiles
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(user_id))
with check (not private.candidate_account_is_restricted(user_id));

drop policy if exists "Restricted candidate applications are inaccessible"
on public.candidate_applications;
create policy "Restricted candidate applications are inaccessible"
on public.candidate_applications
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(user_id))
with check (not private.candidate_account_is_restricted(user_id));

drop policy if exists "Restricted candidate saved jobs are inaccessible"
on public.candidate_saved_jobs;
create policy "Restricted candidate saved jobs are inaccessible"
on public.candidate_saved_jobs
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(user_id))
with check (not private.candidate_account_is_restricted(user_id));

drop policy if exists "Restricted candidate messages are inaccessible"
on public.candidate_messages;
create policy "Restricted candidate messages are inaccessible"
on public.candidate_messages
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(user_id))
with check (not private.candidate_account_is_restricted(user_id));

drop policy if exists "Restricted candidate interviews are inaccessible"
on public.interview_bookings;
create policy "Restricted candidate interviews are inaccessible"
on public.interview_bookings
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate interview slots are inaccessible"
on public.interview_slots;
create policy "Restricted candidate interview slots are inaccessible"
on public.interview_slots
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate notifications are inaccessible"
on public.candidate_notifications;
create policy "Restricted candidate notifications are inaccessible"
on public.candidate_notifications
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate career directions are inaccessible"
on public.candidate_career_directions;
create policy "Restricted candidate career directions are inaccessible"
on public.candidate_career_directions
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(user_id))
with check (not private.candidate_account_is_restricted(user_id));

drop policy if exists "Restricted candidate application activity is inaccessible"
on public.application_activity;
create policy "Restricted candidate application activity is inaccessible"
on public.application_activity
as restrictive
for all
to authenticated
using (not private.candidate_application_is_restricted(application_id))
with check (not private.candidate_application_is_restricted(application_id));

drop policy if exists "Restricted candidate safety reports are inaccessible"
on public.company_safety_reports;
create policy "Restricted candidate safety reports are inaccessible"
on public.company_safety_reports
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(reporter_user_id))
with check (not private.candidate_account_is_restricted(reporter_user_id));

drop policy if exists "Restricted candidate evidence is inaccessible"
on public.candidate_evidence;
create policy "Restricted candidate evidence is inaccessible"
on public.candidate_evidence
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate evidence disputes are inaccessible"
on public.evidence_disputes;
create policy "Restricted candidate evidence disputes are inaccessible"
on public.evidence_disputes
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate evidence disclosures are inaccessible"
on public.evidence_disclosures;
create policy "Restricted candidate evidence disclosures are inaccessible"
on public.evidence_disclosures
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate passport audit is inaccessible"
on public.career_passport_audit_events;
create policy "Restricted candidate passport audit is inaccessible"
on public.career_passport_audit_events
as restrictive
for all
to authenticated
using (not private.candidate_account_is_restricted(candidate_user_id))
with check (not private.candidate_account_is_restricted(candidate_user_id));

drop policy if exists "Restricted candidate files are inaccessible"
on storage.objects;
drop policy if exists "Restricted candidate files cannot be read"
on storage.objects;
drop policy if exists "Restricted candidate files cannot be created"
on storage.objects;
drop policy if exists "Restricted candidate files cannot be changed"
on storage.objects;

create policy "Restricted candidate files cannot be read"
on storage.objects
as restrictive
for select
to authenticated
using (
  bucket_id not in ('candidate-cvs', 'candidate-photos')
  or split_part(name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or not private.candidate_account_is_restricted(split_part(name, '/', 1)::uuid)
);

create policy "Restricted candidate files cannot be created"
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id not in ('candidate-cvs', 'candidate-photos')
  or split_part(name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or not private.candidate_account_is_restricted(split_part(name, '/', 1)::uuid)
);

create policy "Restricted candidate files cannot be changed"
on storage.objects
as restrictive
for update
to authenticated
using (
  bucket_id not in ('candidate-cvs', 'candidate-photos')
  or split_part(name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or not private.candidate_account_is_restricted(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id not in ('candidate-cvs', 'candidate-photos')
  or split_part(name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or not private.candidate_account_is_restricted(split_part(name, '/', 1)::uuid)
);

create or replace function private.candidate_live_application_count(p_candidate_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $function$
  select count(*)::integer
  from public.candidate_applications as application
  where application.user_id = p_candidate_user_id
    and lower(coalesce(application.status, 'applied')) not in (
      'withdrawn',
      'rejected',
      'hired',
      'declined',
      'closed',
      'unsuccessful'
    );
$function$;

revoke all on function private.candidate_live_application_count(uuid)
from public, anon, authenticated;

grant execute on function private.candidate_live_application_count(uuid)
to service_role;

create or replace function public.get_candidate_account_closure_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  request_row public.candidate_account_closure_requests%rowtype;
  active_count integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  active_count := private.candidate_live_application_count(actor_id);

  select request.*
  into request_row
  from public.candidate_account_closure_requests as request
  where request.candidate_user_id = actor_id
  order by request.requested_at desc
  limit 1;

  return jsonb_build_object(
    'active_application_count', active_count,
    'request', case when request_row.id is null then null else jsonb_build_object(
      'id', request_row.id,
      'request_mode', request_row.request_mode,
      'status', request_row.status,
      'requested_at', request_row.requested_at,
      'activated_at', request_row.activated_at,
      'deletion_due_at', request_row.deletion_due_at,
      'completed_at', request_row.completed_at,
      'cancelled_at', request_row.cancelled_at,
      'cv_file_path', request_row.cv_file_path,
      'photo_file_path', request_row.photo_file_path,
      'legal_hold_reason', request_row.legal_hold_reason
    ) end
  );
end;
$function$;

revoke all on function public.get_candidate_account_closure_status()
from public, anon;

grant execute on function public.get_candidate_account_closure_status()
to authenticated, service_role;

create or replace function private.activate_candidate_account_closure(
  p_candidate_user_id uuid,
  p_request_id uuid,
  p_withdraw_live_applications boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.candidate_account_closure_requests
  set status = 'pending_deletion',
      activated_at = coalesce(activated_at, now()),
      deletion_due_at = coalesce(deletion_due_at, now() + interval '30 days'),
      updated_at = now()
  where id = p_request_id
    and candidate_user_id = p_candidate_user_id
    and status in ('waiting_for_applications', 'pending_deletion');

  if not found then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_CLOSURE_REQUEST_NOT_ACTIVATABLE';
  end if;

  if p_withdraw_live_applications then
    update public.candidate_applications
    set status = 'Withdrawn',
        updated_at = now()
    where user_id = p_candidate_user_id
      and lower(coalesce(status, 'applied')) not in (
        'withdrawn', 'rejected', 'hired', 'declined', 'closed', 'unsuccessful'
      );
  end if;

  update public.candidate_profiles
  set open_to_work = false,
      updated_at = now()
  where user_id = p_candidate_user_id;

  update public.evidence_disclosures
  set revoked_at = coalesce(revoked_at, now())
  where candidate_user_id = p_candidate_user_id
    and revoked_at is null;

  update public.employer_notifications
  set candidate_user_id = null,
      title = case
        when notification_type = 'application_withdrawn' then 'Application withdrawn'
        else 'Candidate account closed'
      end,
      message = 'This candidate has closed their Rolexa account. Their profile and files are no longer available.'
  where candidate_user_id = p_candidate_user_id;
end;
$function$;

revoke all on function private.activate_candidate_account_closure(uuid, uuid, boolean)
from public, anon, authenticated;

create or replace function public.request_candidate_account_closure(p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalised_mode text := lower(coalesce(p_mode, ''));
  active_count integer := 0;
  new_status text;
  request_row public.candidate_account_closure_requests%rowtype;
  existing_request public.candidate_account_closure_requests%rowtype;
  cv_path text;
  photo_path text;
  account_type text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if normalised_mode not in ('close_now', 'after_applications') then
    raise exception using errcode = '22023', message = 'ACCOUNT_CLOSURE_MODE_REQUIRED';
  end if;

  select lower(coalesce(raw_user_meta_data ->> 'account_type', ''))
  into account_type
  from auth.users
  where id = actor_id;

  if account_type <> 'candidate' then
    raise exception using errcode = '42501', message = 'CANDIDATE_ACCOUNT_REQUIRED';
  end if;

  select request.*
  into existing_request
  from public.candidate_account_closure_requests as request
  where request.candidate_user_id = actor_id
    and request.status in ('waiting_for_applications', 'pending_deletion', 'legal_hold')
  order by request.requested_at desc
  limit 1;

  if existing_request.id is not null then
    return public.get_candidate_account_closure_status();
  end if;

  active_count := private.candidate_live_application_count(actor_id);
  new_status := case
    when normalised_mode = 'after_applications' and active_count > 0
      then 'waiting_for_applications'
    else 'pending_deletion'
  end;

  select profile.cv_file_path, profile.photo_file_path
  into cv_path, photo_path
  from public.candidate_profiles as profile
  where profile.user_id = actor_id
  limit 1;

  insert into public.candidate_account_closure_requests (
    candidate_user_id,
    request_mode,
    status,
    active_application_count_at_request,
    activated_at,
    deletion_due_at,
    cv_file_path,
    photo_file_path
  )
  values (
    actor_id,
    normalised_mode,
    new_status,
    active_count,
    case when new_status = 'pending_deletion' then now() end,
    case when new_status = 'pending_deletion' then now() + interval '30 days' end,
    cv_path,
    photo_path
  )
  returning * into request_row;

  if new_status = 'pending_deletion' then
    perform private.activate_candidate_account_closure(
      actor_id,
      request_row.id,
      normalised_mode = 'close_now' and active_count > 0
    );
  end if;

  return public.get_candidate_account_closure_status();
end;
$function$;

revoke all on function public.request_candidate_account_closure(text)
from public, anon;

grant execute on function public.request_candidate_account_closure(text)
to authenticated, service_role;

create or replace function public.record_candidate_storage_cleanup_attempt(
  p_request_id uuid,
  p_cv_removed boolean,
  p_photo_removed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  update public.candidate_account_closure_requests
  set candidate_reported_cv_removed = coalesce(p_cv_removed, false),
      candidate_reported_photo_removed = coalesce(p_photo_removed, false),
      candidate_storage_cleanup_reported_at = now(),
      updated_at = now()
  where id = p_request_id
    and candidate_user_id = actor_id
    and status in ('pending_deletion', 'legal_hold');

  if not found then
    raise exception using errcode = '42501', message = 'ACCOUNT_CLOSURE_REQUEST_NOT_AVAILABLE';
  end if;

  return public.get_candidate_account_closure_status();
end;
$function$;

revoke all on function public.record_candidate_storage_cleanup_attempt(uuid, boolean, boolean)
from public, anon;

grant execute on function public.record_candidate_storage_cleanup_attempt(uuid, boolean, boolean)
to authenticated, service_role;

create or replace function public.cancel_candidate_account_closure()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  update public.candidate_account_closure_requests
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where candidate_user_id = actor_id
    and status = 'waiting_for_applications';

  if not found then
    raise exception using errcode = 'P0001', message = 'WAITING_ACCOUNT_CLOSURE_REQUEST_NOT_FOUND';
  end if;

  return public.get_candidate_account_closure_status();
end;
$function$;

revoke all on function public.cancel_candidate_account_closure()
from public, anon;

grant execute on function public.cancel_candidate_account_closure()
to authenticated, service_role;

create or replace function public.activate_waiting_candidate_account_closure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  request_id uuid;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select request.id
  into request_id
  from public.candidate_account_closure_requests as request
  where request.candidate_user_id = new.user_id
    and request.status = 'waiting_for_applications'
  order by request.requested_at desc
  limit 1;

  if request_id is not null
     and private.candidate_live_application_count(new.user_id) = 0 then
    perform private.activate_candidate_account_closure(new.user_id, request_id, false);
  end if;

  return new;
end;
$function$;

revoke all on function public.activate_waiting_candidate_account_closure()
from public, anon, authenticated;

drop trigger if exists activate_waiting_candidate_account_closure_trigger
on public.candidate_applications;

create trigger activate_waiting_candidate_account_closure_trigger
after update of status
on public.candidate_applications
for each row
execute function public.activate_waiting_candidate_account_closure();

create or replace function public.complete_candidate_account_closure(
  p_request_id uuid,
  p_storage_objects_verified_removed boolean,
  p_completion_email_verified_sent boolean,
  p_auth_identity_verified_anonymised boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  request_row public.candidate_account_closure_requests%rowtype;
  open_safety_reports integer := 0;
  open_evidence_disputes integer := 0;
  saved_jobs_removed integer := 0;
  notifications_removed integer := 0;
  career_directions_removed integer := 0;
  interview_bookings_removed integer := 0;
  interview_slots_removed integer := 0;
  profile_rows_removed integer := 0;
  messages_redacted integer := 0;
  activities_redacted integer := 0;
begin
  select request.*
  into request_row
  from public.candidate_account_closure_requests as request
  where request.id = p_request_id
    and request.status in ('pending_deletion', 'legal_hold')
  for update;

  if request_row.id is null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_CLOSURE_REQUEST_NOT_COMPLETABLE';
  end if;

  select count(*)::integer
  into open_safety_reports
  from public.company_safety_reports
  where reporter_user_id = request_row.candidate_user_id
    and status in ('open', 'reviewing');

  select count(*)::integer
  into open_evidence_disputes
  from public.evidence_disputes
  where candidate_user_id = request_row.candidate_user_id
    and status = 'open';

  if open_safety_reports > 0 or open_evidence_disputes > 0 then
    update public.candidate_account_closure_requests
    set status = 'legal_hold',
        legal_hold_reason = concat_ws(
          '; ',
          case when open_safety_reports > 0 then format('%s open safety report(s)', open_safety_reports) end,
          case when open_evidence_disputes > 0 then format('%s open evidence dispute(s)', open_evidence_disputes) end
        ),
        updated_at = now()
    where id = request_row.id;

    return jsonb_build_object(
      'status', 'legal_hold',
      'request_id', request_row.id,
      'open_safety_reports', open_safety_reports,
      'open_evidence_disputes', open_evidence_disputes
    );
  end if;

  if not coalesce(p_storage_objects_verified_removed, false) then
    raise exception using errcode = 'P0001', message = 'STORAGE_REMOVAL_VERIFICATION_REQUIRED';
  end if;
  if not coalesce(p_completion_email_verified_sent, false) then
    raise exception using errcode = 'P0001', message = 'COMPLETION_EMAIL_VERIFICATION_REQUIRED';
  end if;
  if not coalesce(p_auth_identity_verified_anonymised, false) then
    raise exception using errcode = 'P0001', message = 'AUTH_IDENTITY_ANONYMISATION_VERIFICATION_REQUIRED';
  end if;

  delete from public.candidate_saved_jobs
  where user_id = request_row.candidate_user_id;
  get diagnostics saved_jobs_removed = row_count;

  delete from public.candidate_notifications
  where candidate_user_id = request_row.candidate_user_id;
  get diagnostics notifications_removed = row_count;

  delete from public.candidate_career_directions
  where user_id = request_row.candidate_user_id;
  get diagnostics career_directions_removed = row_count;

  delete from public.interview_bookings
  where candidate_user_id = request_row.candidate_user_id;
  get diagnostics interview_bookings_removed = row_count;

  delete from public.interview_slots
  where candidate_user_id = request_row.candidate_user_id;
  get diagnostics interview_slots_removed = row_count;

  update public.candidate_messages
  set sender_name = 'Former candidate',
      body = '[Removed following candidate account closure]'
  where user_id = request_row.candidate_user_id;
  get diagnostics messages_redacted = row_count;

  update public.application_activity as activity
  set activity_message = '[Personal detail removed following candidate account closure]'
  where exists (
    select 1
    from public.candidate_applications as application
    where application.id = activity.application_id
      and application.user_id = request_row.candidate_user_id
  );
  get diagnostics activities_redacted = row_count;

  update public.evidence_disclosures
  set revoked_at = coalesce(revoked_at, now())
  where candidate_user_id = request_row.candidate_user_id;

  update public.candidate_evidence
  set candidate_status = 'revoked',
      sharing_scope = 'private',
      factual_note = null,
      revoked_at = coalesce(revoked_at, now()),
      revoked_reason = 'Candidate account closed',
      updated_at = now()
  where candidate_user_id = request_row.candidate_user_id;

  update public.evidence_disputes
  set reason = '[Removed following candidate account closure]',
      resolution_note = null
  where candidate_user_id = request_row.candidate_user_id;

  update public.career_passport_audit_events
  set event_data = '{}'::jsonb
  where candidate_user_id = request_row.candidate_user_id;

  update public.company_safety_reports
  set details = null
  where reporter_user_id = request_row.candidate_user_id
    and status in ('resolved', 'dismissed');

  delete from public.candidate_profiles
  where user_id = request_row.candidate_user_id;
  get diagnostics profile_rows_removed = row_count;

  update public.candidate_account_closure_requests
  set status = 'completed',
      completed_at = now(),
      verified_storage_removed_at = now(),
      completion_email_sent_at = now(),
      auth_identity_anonymised_at = now(),
      cv_file_path = null,
      photo_file_path = null,
      legal_hold_reason = null,
      deletion_summary = jsonb_build_object(
        'saved_jobs_removed', saved_jobs_removed,
        'notifications_removed', notifications_removed,
        'career_directions_removed', career_directions_removed,
        'interview_bookings_removed', interview_bookings_removed,
        'interview_slots_removed', interview_slots_removed,
        'profile_rows_removed', profile_rows_removed,
        'messages_redacted', messages_redacted,
        'application_activities_redacted', activities_redacted,
        'minimal_application_audit_retained', true,
        'website_legal_acceptance_retained', true
      ),
      updated_at = now()
  where id = request_row.id;

  return jsonb_build_object(
    'status', 'completed',
    'request_id', request_row.id,
    'completed_at', now()
  );
end;
$function$;

revoke all on function public.complete_candidate_account_closure(uuid, boolean, boolean, boolean)
from public, anon, authenticated;

grant execute on function public.complete_candidate_account_closure(uuid, boolean, boolean, boolean)
to service_role;

comment on table public.candidate_account_closure_requests is
  'Candidate-requested account closure queue. Employer access is blocked when status becomes pending_deletion. Completion requires verified storage removal, email delivery and Auth identity anonymisation.';

comment on function public.request_candidate_account_closure(text) is
  'Records a candidate-controlled closure choice. close_now withdraws every live application; after_applications waits until the final live application reaches a terminal status.';

comment on function public.complete_candidate_account_closure(uuid, boolean, boolean, boolean) is
  'Trusted completion step. It refuses completion while a live safety report or evidence dispute requires a limited legal hold.';

-- Operational verification queue (run read-only after the transaction):
-- select id, candidate_user_id, status, requested_at, deletion_due_at,
--        candidate_reported_cv_removed, candidate_reported_photo_removed
-- from public.candidate_account_closure_requests
-- where status in ('pending_deletion', 'legal_hold')
-- order by deletion_due_at;

commit;
