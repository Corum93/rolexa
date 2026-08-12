-- Rolexa trusted candidate account-closure completion queue.
-- Run once only after supabase-candidate-account-closure.sql has succeeded.

begin;

alter table public.candidate_account_closure_requests
  add column if not exists completion_processing_started_at timestamptz,
  add column if not exists completion_attempts integer not null default 0,
  add column if not exists completion_email_provider_id text,
  add column if not exists last_completion_error text,
  add column if not exists last_completion_error_at timestamptz;

create index if not exists candidate_account_closure_retry_queue
  on public.candidate_account_closure_requests (status, completion_processing_started_at, requested_at)
  where status = 'pending_deletion';

create or replace function public.claim_candidate_account_closure_completion(
  p_request_id uuid default null,
  p_candidate_user_id uuid default null,
  p_batch_size integer default 10
)
returns setof public.candidate_account_closure_requests
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if p_batch_size < 1 or p_batch_size > 25 then
    raise exception using errcode = '22023', message = 'INVALID_BATCH_SIZE';
  end if;

  update public.candidate_account_closure_requests as request
  set status = 'legal_hold',
      legal_hold_reason = concat_ws(
        '; ',
        case when exists (
          select 1 from public.company_safety_reports as report
          where report.reporter_user_id = request.candidate_user_id
            and report.status in ('open', 'reviewing')
        ) then 'Open safety report' end,
        case when exists (
          select 1 from public.evidence_disputes as dispute
          where dispute.candidate_user_id = request.candidate_user_id
            and dispute.status = 'open'
        ) then 'Open evidence dispute' end
      ),
      completion_processing_started_at = null,
      updated_at = now()
  where request.status = 'pending_deletion'
    and (p_request_id is null or request.id = p_request_id)
    and (p_candidate_user_id is null or request.candidate_user_id = p_candidate_user_id)
    and (
      exists (
        select 1 from public.company_safety_reports as report
        where report.reporter_user_id = request.candidate_user_id
          and report.status in ('open', 'reviewing')
      )
      or exists (
        select 1 from public.evidence_disputes as dispute
        where dispute.candidate_user_id = request.candidate_user_id
          and dispute.status = 'open'
      )
    );

  return query
  with claimable as (
    select request.id
    from public.candidate_account_closure_requests as request
    where request.status = 'pending_deletion'
      and (p_request_id is null or request.id = p_request_id)
      and (p_candidate_user_id is null or request.candidate_user_id = p_candidate_user_id)
      and (
        request.completion_processing_started_at is null
        or request.completion_processing_started_at < now() - interval '15 minutes'
      )
    order by request.requested_at
    limit p_batch_size
    for update skip locked
  )
  update public.candidate_account_closure_requests as request
  set completion_processing_started_at = now(),
      completion_attempts = request.completion_attempts + 1,
      last_completion_error = null,
      last_completion_error_at = null,
      updated_at = now()
  from claimable
  where request.id = claimable.id
  returning request.*;
end;
$function$;

revoke all on function public.claim_candidate_account_closure_completion(uuid, uuid, integer)
from public, anon, authenticated;

grant execute on function public.claim_candidate_account_closure_completion(uuid, uuid, integer)
to service_role;

comment on function public.claim_candidate_account_closure_completion(uuid, uuid, integer) is
  'Claims pending candidate closures for the trusted Edge Function, rejects concurrent workers and moves live safety/dispute cases to restricted legal hold before deletion begins.';

commit;
