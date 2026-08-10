-- Rolexa candidate-controlled Career Passport sharing.
-- Run after supabase-career-passport-foundation.sql.

begin;

alter table public.evidence_disclosures
  add column if not exists recipient_application_id uuid
    references public.candidate_applications(id) on delete restrict;

alter table public.evidence_disclosures
  drop constraint if exists evidence_disclosures_unique_recipient;

create unique index if not exists evidence_disclosures_evidence_application_uidx
  on public.evidence_disclosures (evidence_id, recipient_application_id);

create index if not exists evidence_disclosures_candidate_application_idx
  on public.evidence_disclosures (candidate_user_id, recipient_application_id, disclosed_at desc);

create index if not exists evidence_disclosures_recipient_application_idx
  on public.evidence_disclosures (recipient_employer_user_id, recipient_application_id, disclosed_at desc)
  where revoked_at is null;

comment on column public.evidence_disclosures.recipient_application_id is
  'The candidate application through which this exact evidence item was shared with the job-owning employer.';

drop policy if exists "Candidates and authorised organisations can read evidence"
  on public.candidate_evidence;
create policy "Candidates and authorised organisations can read evidence"
  on public.candidate_evidence
  for select
  to authenticated
  using (
    candidate_user_id = auth.uid()
    or issuing_employer_user_id = auth.uid()
    or exists (
      select 1
      from public.evidence_disclosures as disclosure
      join public.candidate_applications as recipient_application
        on recipient_application.id = disclosure.recipient_application_id
      join public.jobs as recipient_job
        on recipient_job.id = recipient_application.job_id
      where disclosure.evidence_id = candidate_evidence.id
        and disclosure.recipient_employer_user_id = auth.uid()
        and disclosure.revoked_at is null
        and recipient_application.user_id = candidate_evidence.candidate_user_id
        and recipient_job.employer_user_id = auth.uid()
        and lower(coalesce(recipient_application.status, '')) not in (
          'withdrawn',
          'rejected',
          'hired'
        )
        and candidate_evidence.candidate_status = 'accepted'
        and candidate_evidence.revoked_at is null
        and (
          candidate_evidence.expires_at is null
          or candidate_evidence.expires_at > now()
        )
    )
  );

drop policy if exists "Candidates and recipients can read disclosures"
  on public.evidence_disclosures;
create policy "Candidates and recipients can read disclosures"
  on public.evidence_disclosures
  for select
  to authenticated
  using (
    candidate_user_id = auth.uid()
    or (
      recipient_employer_user_id = auth.uid()
      and revoked_at is null
      and exists (
        select 1
        from public.candidate_applications as recipient_application
        join public.jobs as recipient_job
          on recipient_job.id = recipient_application.job_id
        where recipient_application.id = evidence_disclosures.recipient_application_id
          and recipient_application.user_id = evidence_disclosures.candidate_user_id
          and recipient_job.employer_user_id = auth.uid()
          and lower(coalesce(recipient_application.status, '')) not in (
            'withdrawn',
            'rejected',
            'hired'
          )
      )
    )
  );

create or replace function public.set_candidate_passport_share(
  p_recipient_application_id uuid,
  p_evidence_ids uuid[],
  p_purpose text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  target_row record;
  selected_ids uuid[];
  eligible_count integer := 0;
  shared_count integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_recipient_application_id is null then
    raise exception using errcode = '22023', message = 'RECIPIENT_APPLICATION_REQUIRED';
  end if;

  select
    application.id,
    application.user_id as candidate_user_id,
    application.job_id,
    application.status,
    job.employer_user_id,
    coalesce(nullif(btrim(job.title), ''), 'this opportunity') as job_title,
    coalesce(
      nullif(btrim(profile.full_name), ''),
      nullif(btrim(profile.email), ''),
      'A candidate'
    ) as candidate_name
  into target_row
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  left join public.candidate_profiles as profile
    on profile.user_id = application.user_id
  where application.id = p_recipient_application_id;

  if target_row.id is null or target_row.candidate_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'APPLICATION_NOT_OWNED_BY_CANDIDATE';
  end if;

  if target_row.employer_user_id is null or target_row.employer_user_id = actor_id then
    raise exception using errcode = '22023', message = 'INVALID_RECIPIENT_EMPLOYER';
  end if;

  if lower(coalesce(target_row.status, '')) in ('withdrawn', 'rejected', 'hired') then
    raise exception using errcode = '22023', message = 'APPLICATION_NOT_ACTIVE_FOR_SHARING';
  end if;

  if char_length(btrim(coalesce(p_purpose, ''))) not between 3 and 300 then
    raise exception using errcode = '22023', message = 'SHARING_PURPOSE_LENGTH_INVALID';
  end if;

  select coalesce(array_agg(selected.evidence_id order by selected.evidence_id), '{}'::uuid[])
  into selected_ids
  from (
    select distinct item.evidence_id
    from unnest(coalesce(p_evidence_ids, '{}'::uuid[])) as item(evidence_id)
    where item.evidence_id is not null
  ) as selected;

  if cardinality(selected_ids) = 0 then
    raise exception using errcode = '22023', message = 'AT_LEAST_ONE_EVIDENCE_ITEM_REQUIRED';
  end if;

  if cardinality(selected_ids) > 30 then
    raise exception using errcode = '22023', message = 'TOO_MANY_EVIDENCE_ITEMS';
  end if;

  select count(*)
  into eligible_count
  from public.candidate_evidence as evidence
  where evidence.id = any(selected_ids)
    and evidence.candidate_user_id = actor_id
    and evidence.candidate_status = 'accepted'
    and evidence.revoked_at is null
    and (evidence.expires_at is null or evidence.expires_at > now());

  if eligible_count <> cardinality(selected_ids) then
    raise exception using errcode = '42501', message = 'EVIDENCE_NOT_ELIGIBLE_FOR_SHARING';
  end if;

  with revoked as (
    update public.evidence_disclosures as disclosure
    set revoked_at = now()
    where disclosure.candidate_user_id = actor_id
      and disclosure.recipient_application_id = p_recipient_application_id
      and disclosure.revoked_at is null
      and not (disclosure.evidence_id = any(selected_ids))
    returning disclosure.evidence_id
  )
  insert into public.career_passport_audit_events (
    evidence_id,
    candidate_user_id,
    actor_user_id,
    event_type,
    event_data
  )
  select
    revoked.evidence_id,
    actor_id,
    actor_id,
    'disclosure_revoked',
    jsonb_build_object(
      'recipient_application_id', p_recipient_application_id,
      'recipient_employer_user_id', target_row.employer_user_id,
      'reason', 'candidate_updated_selection'
    )
  from revoked;

  with disclosed as (
    insert into public.evidence_disclosures (
      evidence_id,
      candidate_user_id,
      recipient_employer_user_id,
      recipient_application_id,
      purpose,
      consented_at,
      disclosed_at,
      revoked_at
    )
    select
      evidence.id,
      actor_id,
      target_row.employer_user_id,
      p_recipient_application_id,
      btrim(p_purpose),
      now(),
      now(),
      null
    from public.candidate_evidence as evidence
    where evidence.id = any(selected_ids)
    on conflict (evidence_id, recipient_application_id) do update
    set recipient_employer_user_id = excluded.recipient_employer_user_id,
        purpose = excluded.purpose,
        consented_at = excluded.consented_at,
        disclosed_at = excluded.disclosed_at,
        revoked_at = null
    returning evidence_id
  ),
  audited as (
    insert into public.career_passport_audit_events (
      evidence_id,
      candidate_user_id,
      actor_user_id,
      event_type,
      event_data
    )
    select
      disclosed.evidence_id,
      actor_id,
      actor_id,
      'evidence_disclosed',
      jsonb_build_object(
        'recipient_application_id', p_recipient_application_id,
        'recipient_employer_user_id', target_row.employer_user_id,
        'purpose', btrim(p_purpose)
      )
    from disclosed
    returning 1
  )
  select count(*) into shared_count from audited;

  update public.candidate_evidence as evidence
  set sharing_scope = case
        when exists (
          select 1
          from public.evidence_disclosures as disclosure
          where disclosure.evidence_id = evidence.id
            and disclosure.revoked_at is null
        ) then 'application_only'
        else 'private'
      end,
      updated_at = now()
  where evidence.candidate_user_id = actor_id
    and evidence.candidate_status = 'accepted';

  if to_regclass('public.employer_notifications') is not null then
    execute $notification$
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
      values ($1, $2, $3, $4, 'candidate_action_completed', 'Career Passport shared', $5, 'matches', $6)
      on conflict (employer_user_id, event_key) do nothing
    $notification$
    using
      target_row.employer_user_id,
      p_recipient_application_id,
      target_row.job_id,
      actor_id,
      format(
        '%s shared %s verified evidence item%s for %s.',
        target_row.candidate_name,
        shared_count,
        case when shared_count = 1 then '' else 's' end,
        target_row.job_title
      ),
      format('passport:%s:%s', p_recipient_application_id, gen_random_uuid());
  end if;

  return shared_count;
end;
$function$;

create or replace function public.revoke_candidate_passport_share(
  p_recipient_application_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  target_row record;
  revoked_count integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select
    application.id,
    application.user_id as candidate_user_id,
    job.employer_user_id
  into target_row
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  where application.id = p_recipient_application_id;

  if target_row.id is null or target_row.candidate_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'APPLICATION_NOT_OWNED_BY_CANDIDATE';
  end if;

  with revoked as (
    update public.evidence_disclosures as disclosure
    set revoked_at = now()
    where disclosure.candidate_user_id = actor_id
      and disclosure.recipient_application_id = p_recipient_application_id
      and disclosure.revoked_at is null
    returning disclosure.evidence_id
  ),
  audited as (
    insert into public.career_passport_audit_events (
      evidence_id,
      candidate_user_id,
      actor_user_id,
      event_type,
      event_data
    )
    select
      revoked.evidence_id,
      actor_id,
      actor_id,
      'disclosure_revoked',
      jsonb_build_object(
        'recipient_application_id', p_recipient_application_id,
        'recipient_employer_user_id', target_row.employer_user_id,
        'reason', 'candidate_revoked_access'
      )
    from revoked
    returning 1
  )
  select count(*) into revoked_count from audited;

  update public.candidate_evidence as evidence
  set sharing_scope = case
        when exists (
          select 1
          from public.evidence_disclosures as disclosure
          where disclosure.evidence_id = evidence.id
            and disclosure.revoked_at is null
        ) then 'application_only'
        else 'private'
      end,
      updated_at = now()
  where evidence.candidate_user_id = actor_id
    and evidence.candidate_status = 'accepted';

  return revoked_count;
end;
$function$;

create or replace function public.get_shared_candidate_passport(
  p_recipient_application_id uuid
)
returns table (
  disclosure_id uuid,
  evidence_id uuid,
  candidate_name text,
  target_job_title text,
  definition_name text,
  definition_category text,
  definition_description text,
  demonstrated_level text,
  evidence_source text,
  factual_note text,
  issuing_company text,
  source_job_title text,
  issued_at timestamptz,
  disclosed_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  target_row record;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select
    application.id,
    application.user_id as candidate_user_id,
    application.status,
    job.employer_user_id,
    coalesce(nullif(btrim(job.title), ''), 'Rolexa application') as job_title
  into target_row
  from public.candidate_applications as application
  join public.jobs as job
    on job.id = application.job_id
  where application.id = p_recipient_application_id;

  if target_row.id is null or target_row.employer_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'APPLICATION_NOT_OWNED_BY_EMPLOYER';
  end if;

  if lower(coalesce(target_row.status, '')) in ('withdrawn', 'rejected', 'hired') then
    raise exception using errcode = '22023', message = 'APPLICATION_NOT_ACTIVE_FOR_SHARING';
  end if;

  return query
  select
    disclosure.id,
    evidence.id,
    coalesce(nullif(btrim(profile.full_name), ''), 'Candidate')::text,
    target_row.job_title::text,
    definition.name::text,
    definition.category::text,
    definition.description::text,
    evidence.demonstrated_level::text,
    evidence.evidence_source::text,
    evidence.factual_note::text,
    coalesce(nullif(btrim(source_job.company), ''), 'Verified Rolexa employer')::text,
    coalesce(nullif(btrim(source_job.title), ''), 'Rolexa application')::text,
    evidence.issued_at,
    disclosure.disclosed_at,
    evidence.expires_at
  from public.evidence_disclosures as disclosure
  join public.candidate_evidence as evidence
    on evidence.id = disclosure.evidence_id
  join public.evidence_definitions as definition
    on definition.id = evidence.evidence_definition_id
  join public.jobs as source_job
    on source_job.id = evidence.job_id
  left join public.candidate_profiles as profile
    on profile.user_id = evidence.candidate_user_id
  where disclosure.recipient_application_id = p_recipient_application_id
    and disclosure.recipient_employer_user_id = actor_id
    and disclosure.revoked_at is null
    and evidence.candidate_user_id = target_row.candidate_user_id
    and evidence.candidate_status = 'accepted'
    and evidence.revoked_at is null
    and (evidence.expires_at is null or evidence.expires_at > now())
  order by definition.sort_order, evidence.issued_at desc;
end;
$function$;

revoke all on function public.set_candidate_passport_share(uuid, uuid[], text)
  from public, anon;
revoke all on function public.revoke_candidate_passport_share(uuid)
  from public, anon;
revoke all on function public.get_shared_candidate_passport(uuid)
  from public, anon;

grant execute on function public.set_candidate_passport_share(uuid, uuid[], text)
  to authenticated;
grant execute on function public.revoke_candidate_passport_share(uuid)
  to authenticated;
grant execute on function public.get_shared_candidate_passport(uuid)
  to authenticated;

comment on function public.set_candidate_passport_share(uuid, uuid[], text) is
  'Lets a candidate disclose an exact accepted evidence selection to the employer owning one active application.';
comment on function public.revoke_candidate_passport_share(uuid) is
  'Immediately revokes every active Career Passport disclosure for one candidate application.';
comment on function public.get_shared_candidate_passport(uuid) is
  'Returns only the currently consented, non-expired evidence shared for an application owned by the authenticated employer.';

do $publication$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'evidence_disclosures'
  ) then
    alter publication supabase_realtime add table public.evidence_disclosures;
  end if;
end;
$publication$;

commit;
