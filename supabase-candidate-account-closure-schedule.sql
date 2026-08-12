-- Rolexa hourly recovery sweep for pending candidate account closures.
-- Prerequisites:
--   1. Deploy the complete-candidate-account-closure Edge Function.
--   2. Create Supabase Vault secrets named rolexa_project_url and
--      rolexa_service_role_key. Never store the service-role key in this file.

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $setup$
declare
  existing_job_id bigint;
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'rolexa_project_url'
  ) then
    raise exception 'Missing Vault secret: rolexa_project_url';
  end if;

  if not exists (
    select 1 from vault.decrypted_secrets where name = 'rolexa_service_role_key'
  ) then
    raise exception 'Missing Vault secret: rolexa_service_role_key';
  end if;

  for existing_job_id in
    select jobid from cron.job where jobname = 'rolexa-candidate-account-closure-sweep'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'rolexa-candidate-account-closure-sweep',
    '17 * * * *',
    $schedule$
      select net.http_post(
        url := rtrim(
          (select decrypted_secret from vault.decrypted_secrets where name = 'rolexa_project_url'),
          '/'
        ) || '/functions/v1/complete-candidate-account-closure',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'rolexa_service_role_key'
          ),
          'apikey', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'rolexa_service_role_key'
          )
        ),
        body := '{"source":"scheduled"}'::jsonb,
        timeout_milliseconds := 120000
      );
    $schedule$
  );
end;
$setup$;

commit;
