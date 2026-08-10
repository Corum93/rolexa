begin;

create extension if not exists pgcrypto;

create table if not exists public.evidence_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint evidence_definitions_code_format
    check (code ~ '^[a-z0-9_]{3,60}$'),
  constraint evidence_definitions_category_check
    check (category in ('verification', 'hiring_stage', 'assessment', 'capability')),
  constraint evidence_definitions_name_length
    check (char_length(btrim(name)) between 2 and 100),
  constraint evidence_definitions_description_length
    check (char_length(btrim(description)) between 5 and 300)
);

create table if not exists public.candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_user_id uuid not null references auth.users(id) on delete restrict,
  application_id uuid not null references public.candidate_applications(id) on delete restrict,
  job_id uuid not null references public.jobs(id) on delete restrict,
  issuing_employer_user_id uuid not null references auth.users(id) on delete restrict,
  evidence_definition_id uuid not null references public.evidence_definitions(id) on delete restrict,
  demonstrated_level text not null default 'demonstrated',
  evidence_source text not null,
  factual_note text,
  candidate_status text not null default 'pending',
  sharing_scope text not null default 'private',
  issued_at timestamptz not null default now(),
  candidate_decided_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_evidence_unique_award
    unique (application_id, evidence_definition_id),
  constraint candidate_evidence_level_check
    check (demonstrated_level in ('demonstrated', 'strong', 'advanced')),
  constraint candidate_evidence_source_check
    check (evidence_source in (
      'application_review',
      'screening',
      'interview',
      'case_presentation',
      'role_specific_task',
      'reference_check',
      'employment_verification'
    )),
  constraint candidate_evidence_status_check
    check (candidate_status in ('pending', 'accepted', 'disputed', 'declined', 'revoked')),
  constraint candidate_evidence_sharing_check
    check (sharing_scope in ('private', 'application_only', 'verified_employers', 'partner_network')),
  constraint candidate_evidence_note_length
    check (factual_note is null or char_length(btrim(factual_note)) between 3 and 500),
  constraint candidate_evidence_expiry_check
    check (expires_at is null or expires_at > issued_at)
);

create table if not exists public.evidence_disputes (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.candidate_evidence(id) on delete restrict,
  candidate_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  status text not null default 'open',
  resolution_note text,
  raised_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete restrict,
  constraint evidence_disputes_one_open_per_item
    unique (evidence_id),
  constraint evidence_disputes_reason_length
    check (char_length(btrim(reason)) between 10 and 1000),
  constraint evidence_disputes_status_check
    check (status in ('open', 'upheld', 'corrected', 'rejected', 'withdrawn'))
);

create table if not exists public.evidence_disclosures (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.candidate_evidence(id) on delete restrict,
  candidate_user_id uuid not null references auth.users(id) on delete restrict,
  recipient_employer_user_id uuid not null references auth.users(id) on delete restrict,
  purpose text not null,
  consented_at timestamptz not null,
  disclosed_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint evidence_disclosures_unique_recipient
    unique (evidence_id, recipient_employer_user_id),
  constraint evidence_disclosures_purpose_length
    check (char_length(btrim(purpose)) between 3 and 300)
);

create table if not exists public.career_passport_audit_events (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid references public.candidate_evidence(id) on delete restrict,
  candidate_user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint career_passport_audit_event_type_check
    check (event_type in (
      'evidence_issued',
      'evidence_accepted',
      'evidence_declined',
      'evidence_disputed',
      'sharing_scope_changed',
      'evidence_disclosed',
      'disclosure_revoked',
      'evidence_revoked'
    )),
  constraint career_passport_audit_event_data_object
    check (jsonb_typeof(event_data) = 'object')
);

create index if not exists candidate_evidence_candidate_idx
  on public.candidate_evidence (candidate_user_id, issued_at desc);

create index if not exists candidate_evidence_issuer_idx
  on public.candidate_evidence (issuing_employer_user_id, issued_at desc);

create index if not exists candidate_evidence_application_idx
  on public.candidate_evidence (application_id, issued_at desc);

create index if not exists evidence_disclosures_recipient_idx
  on public.evidence_disclosures (recipient_employer_user_id, disclosed_at desc)
  where revoked_at is null;

create index if not exists career_passport_audit_candidate_idx
  on public.career_passport_audit_events (candidate_user_id, created_at desc);

insert into public.evidence_definitions (
  code,
  name,
  category,
  description,
  sort_order
)
values
  ('identity_verified', 'Identity verified', 'verification', 'Identity was verified during a genuine hiring process.', 10),
  ('employment_history_verified', 'Employment history verified', 'verification', 'Relevant employment history was checked during the hiring process.', 20),
  ('screening_criteria_passed', 'Screening criteria passed', 'hiring_stage', 'The candidate met the disclosed screening criteria for the role.', 30),
  ('interview_completed', 'Interview completed', 'hiring_stage', 'The candidate completed a structured interview for the role.', 40),
  ('final_stage_candidate', 'Final-stage candidate', 'hiring_stage', 'The candidate progressed to the final disclosed stage of the process.', 50),
  ('presentation_completed', 'Presentation completed', 'assessment', 'The candidate completed a presentation or case-study discussion.', 60),
  ('role_task_completed', 'Role-specific task completed', 'assessment', 'The candidate completed a task relevant to the advertised role.', 70),
  ('reference_verified', 'Reference verified', 'verification', 'A professional reference was completed and verified.', 80),
  ('leadership', 'Leadership', 'capability', 'Positive leadership evidence was demonstrated in the hiring process.', 100),
  ('communication', 'Communication', 'capability', 'Clear communication was demonstrated in the hiring process.', 110),
  ('problem_solving', 'Problem-solving', 'capability', 'Structured problem-solving was demonstrated in the hiring process.', 120),
  ('commercial_awareness', 'Commercial awareness', 'capability', 'Commercial understanding was demonstrated in the hiring process.', 130),
  ('data_analysis', 'Data analysis', 'capability', 'Relevant data-analysis capability was demonstrated in the hiring process.', 140),
  ('stakeholder_management', 'Stakeholder management', 'capability', 'Stakeholder-management capability was demonstrated in the hiring process.', 150)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.evidence_definitions enable row level security;
alter table public.candidate_evidence enable row level security;
alter table public.evidence_disputes enable row level security;
alter table public.evidence_disclosures enable row level security;
alter table public.career_passport_audit_events enable row level security;

drop policy if exists "Authenticated users can read evidence definitions"
  on public.evidence_definitions;
create policy "Authenticated users can read evidence definitions"
  on public.evidence_definitions
  for select
  to authenticated
  using (is_active = true);

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
      where disclosure.evidence_id = candidate_evidence.id
        and disclosure.recipient_employer_user_id = auth.uid()
        and disclosure.revoked_at is null
        and candidate_evidence.candidate_status = 'accepted'
    )
  );

drop policy if exists "Candidates and issuers can read evidence disputes"
  on public.evidence_disputes;
create policy "Candidates and issuers can read evidence disputes"
  on public.evidence_disputes
  for select
  to authenticated
  using (
    candidate_user_id = auth.uid()
    or exists (
      select 1
      from public.candidate_evidence as evidence
      where evidence.id = evidence_disputes.evidence_id
        and evidence.issuing_employer_user_id = auth.uid()
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
    or recipient_employer_user_id = auth.uid()
  );

drop policy if exists "Candidates and issuers can read passport audit events"
  on public.career_passport_audit_events;
create policy "Candidates and issuers can read passport audit events"
  on public.career_passport_audit_events
  for select
  to authenticated
  using (
    candidate_user_id = auth.uid()
    or actor_user_id = auth.uid()
    or exists (
      select 1
      from public.candidate_evidence as evidence
      where evidence.id = career_passport_audit_events.evidence_id
        and evidence.issuing_employer_user_id = auth.uid()
    )
  );

revoke all on public.evidence_definitions from public, anon;
revoke all on public.candidate_evidence from public, anon;
revoke all on public.evidence_disputes from public, anon;
revoke all on public.evidence_disclosures from public, anon;
revoke all on public.career_passport_audit_events from public, anon;

revoke insert, update, delete, truncate, references, trigger
  on public.evidence_definitions
  from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.candidate_evidence
  from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.evidence_disputes
  from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.evidence_disclosures
  from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.career_passport_audit_events
  from authenticated;

grant select on public.evidence_definitions to authenticated;
grant select on public.candidate_evidence to authenticated;
grant select on public.evidence_disputes to authenticated;
grant select on public.evidence_disclosures to authenticated;
grant select on public.career_passport_audit_events to authenticated;

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

  if lower(coalesce(application_row.status, '')) in ('withdrawn') then
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

  if lower(coalesce(btrim(p_evidence_source), '')) not in (
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
    lower(btrim(p_evidence_source)),
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

create or replace function public.candidate_decide_evidence(
  p_evidence_id uuid,
  p_decision text,
  p_dispute_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  evidence_row record;
  normalised_decision text := lower(btrim(coalesce(p_decision, '')));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select evidence.id, evidence.candidate_user_id, evidence.candidate_status
  into evidence_row
  from public.candidate_evidence as evidence
  where evidence.id = p_evidence_id
  for update;

  if evidence_row.id is null or evidence_row.candidate_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'EVIDENCE_NOT_OWNED_BY_CANDIDATE';
  end if;

  if evidence_row.candidate_status <> 'pending' then
    raise exception using errcode = '22023', message = 'EVIDENCE_ALREADY_DECIDED';
  end if;

  if normalised_decision = 'accept' then
    update public.candidate_evidence
    set candidate_status = 'accepted',
        sharing_scope = 'private',
        candidate_decided_at = now(),
        updated_at = now()
    where id = p_evidence_id;

    insert into public.career_passport_audit_events (
      evidence_id, candidate_user_id, actor_user_id, event_type, event_data
    ) values (
      p_evidence_id, actor_id, actor_id, 'evidence_accepted', '{"sharing_scope":"private"}'::jsonb
    );
  elsif normalised_decision = 'decline' then
    update public.candidate_evidence
    set candidate_status = 'declined',
        sharing_scope = 'private',
        candidate_decided_at = now(),
        updated_at = now()
    where id = p_evidence_id;

    insert into public.career_passport_audit_events (
      evidence_id, candidate_user_id, actor_user_id, event_type, event_data
    ) values (
      p_evidence_id, actor_id, actor_id, 'evidence_declined', '{}'::jsonb
    );
  elsif normalised_decision = 'dispute' then
    if char_length(btrim(coalesce(p_dispute_reason, ''))) not between 10 and 1000 then
      raise exception using errcode = '22023', message = 'DISPUTE_REASON_LENGTH_INVALID';
    end if;

    update public.candidate_evidence
    set candidate_status = 'disputed',
        sharing_scope = 'private',
        candidate_decided_at = now(),
        updated_at = now()
    where id = p_evidence_id;

    insert into public.evidence_disputes (
      evidence_id,
      candidate_user_id,
      reason
    ) values (
      p_evidence_id,
      actor_id,
      btrim(p_dispute_reason)
    );

    insert into public.career_passport_audit_events (
      evidence_id, candidate_user_id, actor_user_id, event_type, event_data
    ) values (
      p_evidence_id, actor_id, actor_id, 'evidence_disputed', '{}'::jsonb
    );
  else
    raise exception using errcode = '22023', message = 'INVALID_EVIDENCE_DECISION';
  end if;
end;
$function$;

create or replace function public.set_candidate_evidence_sharing(
  p_evidence_id uuid,
  p_sharing_scope text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  evidence_row record;
  normalised_scope text := lower(btrim(coalesce(p_sharing_scope, '')));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if normalised_scope not in ('private', 'application_only', 'verified_employers', 'partner_network') then
    raise exception using errcode = '22023', message = 'INVALID_SHARING_SCOPE';
  end if;

  select evidence.id, evidence.candidate_user_id, evidence.candidate_status, evidence.sharing_scope
  into evidence_row
  from public.candidate_evidence as evidence
  where evidence.id = p_evidence_id
  for update;

  if evidence_row.id is null or evidence_row.candidate_user_id <> actor_id then
    raise exception using errcode = '42501', message = 'EVIDENCE_NOT_OWNED_BY_CANDIDATE';
  end if;

  if evidence_row.candidate_status <> 'accepted' then
    raise exception using errcode = '22023', message = 'ONLY_ACCEPTED_EVIDENCE_CAN_BE_SHARED';
  end if;

  update public.candidate_evidence
  set sharing_scope = normalised_scope,
      updated_at = now()
  where id = p_evidence_id;

  insert into public.career_passport_audit_events (
    evidence_id,
    candidate_user_id,
    actor_user_id,
    event_type,
    event_data
  ) values (
    p_evidence_id,
    actor_id,
    actor_id,
    'sharing_scope_changed',
    jsonb_build_object(
      'from', evidence_row.sharing_scope,
      'to', normalised_scope
    )
  );
end;
$function$;

revoke all on function public.issue_candidate_evidence(
  uuid, text, text, text, text, timestamptz
) from public, anon;
revoke all on function public.candidate_decide_evidence(
  uuid, text, text
) from public, anon;
revoke all on function public.set_candidate_evidence_sharing(
  uuid, text
) from public, anon;

grant execute on function public.issue_candidate_evidence(
  uuid, text, text, text, text, timestamptz
) to authenticated;
grant execute on function public.candidate_decide_evidence(
  uuid, text, text
) to authenticated;
grant execute on function public.set_candidate_evidence_sharing(
  uuid, text
) to authenticated;

comment on table public.evidence_definitions is
  'Controlled positive evidence catalogue for the Rolexa Verified Career Passport.';
comment on table public.candidate_evidence is
  'Candidate-owned evidence issued from genuine Rolexa hiring applications.';
comment on table public.evidence_disclosures is
  'Exact disclosure record; sharing preferences alone never grant employer access.';
comment on function public.issue_candidate_evidence(uuid, text, text, text, text, timestamptz) is
  'Allows the job-owning employer to issue one controlled positive evidence item for an application.';
comment on function public.candidate_decide_evidence(uuid, text, text) is
  'Allows only the candidate to accept, decline or dispute pending evidence.';
comment on function public.set_candidate_evidence_sharing(uuid, text) is
  'Records the candidate sharing preference without creating a disclosure.';

commit;
