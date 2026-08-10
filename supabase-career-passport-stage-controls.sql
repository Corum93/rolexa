begin;

create or replace function public.issue_candidate_evidence(
  p_application_id uuid,
  p_definition_code text,
  p_demonstrated_level text,
  p_evidence_source text,
  p_factual_note text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  application_row record;
  definition_id uuid;
  created_id uuid;
  normalised_source text := lower(btrim(coalesce(p_evidence_source, '')));
  current_stage_order integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_application_id is null then
    raise exception using errcode = '22023', message = 'APPLICATION_REQUIRED';
  end if;

  select
    application.id,
    application.user_id as candidate_user_id,
    application.job_id,
    application.status,
    application.current_hiring_stage_id,
    job.employer_user_id
  into application_row
  from public.candidate_applications as application
  join public.jobs as job on job.id = application.job_id
  where application.id = p_application_id;

  if application_row.id is null or application_row.employer_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'APPLICATION_NOT_OWNED_BY_EMPLOYER';
  end if;

  if application_row.candidate_user_id = actor_id then
    raise exception using errcode = '42501', message = 'EMPLOYER_CANNOT_ISSUE_EVIDENCE_TO_SELF';
  end if;

  if lower(coalesce(application_row.status, '')) = 'withdrawn' then
    raise exception using errcode = '22023', message = 'WITHDRAWN_APPLICATION_CANNOT_RECEIVE_EVIDENCE';
  end if;

  select definition.id
  into definition_id
  from public.evidence_definitions as definition
  where definition.code = lower(btrim(p_definition_code))
    and definition.is_active = true;

  if definition_id is null then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_DEFINITION';
  end if;

  if lower(coalesce(btrim(p_demonstrated_level), '')) not in ('demonstrated', 'strong', 'advanced') then
    raise exception using errcode = '22023', message = 'INVALID_DEMONSTRATED_LEVEL';
  end if;

  if normalised_source not in (
    'application_review',
    'screening',
    'interview',
    'case_presentation',
    'role_specific_task',
    'reference_check',
    'employment_verification'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_SOURCE';
  end if;

  select stage.stage_order
  into current_stage_order
  from public.job_hiring_stages as stage
  where stage.job_id = application_row.job_id
    and (
      application_row.current_hiring_stage_id is null
      or stage.id = application_row.current_hiring_stage_id
    )
  order by stage.stage_order
  limit 1;

  if normalised_source = 'interview'
     and not exists (
       select 1
       from public.job_hiring_stages as reached
       where reached.job_id = application_row.job_id
         and current_stage_order is not null
         and reached.stage_order <= current_stage_order
         and (
           reached.stage_type = 'interview'
           or lower(coalesce(reached.stage_name, '')) ~ '(interview|(^|[^a-z])round([^a-z]|$)|phone screen|screening call)'
         )
     ) then
    raise exception using errcode = '22023', message = 'EVIDENCE_SOURCE_NOT_REACHED';
  end if;

  if normalised_source in ('case_presentation', 'role_specific_task')
     and not exists (
       select 1
       from public.job_hiring_stages as reached
       where reached.job_id = application_row.job_id
         and current_stage_order is not null
         and reached.stage_order <= current_stage_order
         and (
           reached.stage_type = 'assessment'
           or lower(coalesce(reached.stage_name, '')) ~ '(assessment|task|case|presentation|test|exercise)'
         )
     ) then
    raise exception using errcode = '22023', message = 'EVIDENCE_SOURCE_NOT_REACHED';
  end if;

  if normalised_source in ('reference_check', 'employment_verification')
     and not exists (
       select 1
       from public.job_hiring_stages as reached
       where reached.job_id = application_row.job_id
         and current_stage_order is not null
         and reached.stage_order <= current_stage_order
         and (
           reached.stage_type = 'offer'
           or lower(coalesce(reached.stage_name, '')) ~ '(offer|reference|employment verification)'
         )
     ) then
    raise exception using errcode = '22023', message = 'EVIDENCE_SOURCE_NOT_REACHED';
  end if;

  if p_factual_note is not null
     and char_length(btrim(p_factual_note)) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'FACTUAL_NOTE_LENGTH_INVALID';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'EXPIRY_MUST_BE_IN_THE_FUTURE';
  end if;

  insert into public.candidate_evidence (
    candidate_user_id,
    application_id,
    job_id,
    issuing_employer_user_id,
    evidence_definition_id,
    demonstrated_level,
    evidence_source,
    factual_note,
    expires_at
  )
  values (
    application_row.candidate_user_id,
    application_row.id,
    application_row.job_id,
    actor_id,
    definition_id,
    lower(btrim(p_demonstrated_level)),
    normalised_source,
    nullif(btrim(p_factual_note), ''),
    p_expires_at
  )
  returning id into created_id;

  insert into public.career_passport_audit_events (
    evidence_id,
    candidate_user_id,
    actor_user_id,
    event_type,
    event_data
  )
  values (
    created_id,
    application_row.candidate_user_id,
    actor_id,
    'evidence_issued',
    jsonb_build_object(
      'application_id', application_row.id,
      'job_id', application_row.job_id,
      'definition_code', lower(btrim(p_definition_code))
    )
  );

  return created_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'EVIDENCE_ALREADY_ISSUED_FOR_APPLICATION';
end;
$function$;

revoke all on function public.issue_candidate_evidence(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz
) from public, anon;

grant execute on function public.issue_candidate_evidence(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz
) to authenticated;

comment on function public.issue_candidate_evidence(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz
) is
  'Allows the job-owning employer to issue controlled positive evidence only from hiring stages the application has reached.';

commit;
