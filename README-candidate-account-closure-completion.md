# Candidate account-closure completion service

This service performs the trusted steps that a browser must not perform with elevated credentials.

## Completion order

1. Claim one pending request and block concurrent workers for 15 minutes.
2. Move requests with an open safety report or evidence dispute to restricted legal hold.
3. Remove every object under the candidate's folder in `candidate-cvs` and `candidate-photos`.
4. Re-list both folders and stop if any object remains.
5. Send the non-promotional closure confirmation email.
6. Soft-delete the Supabase Auth identity using the server-only service role.
7. Call `complete_candidate_account_closure` so the database deletion and redaction step runs.

Each successful stage is timestamped before the next stage starts. A failed request releases its processing claim and remains pending for the next hourly retry.

## Required deployment configuration

The Edge Function requires these Supabase Function secrets:

- `RESEND_API_KEY`
- `ROLEXA_EMAIL_MODE`, set to `test` for the fictional test and changed to `production` only after launch controls pass
- `ROLEXA_EMAIL_FROM`
- `ROLEXA_PRIVACY_EMAIL`, the monitored contact shown in the confirmation
- `ROLEXA_TEST_RECIPIENT`, required only in test mode

For a fictional test, use:

- `ROLEXA_EMAIL_MODE=test`
- `ROLEXA_EMAIL_FROM=Rolexa Test <onboarding@resend.dev>`
- `ROLEXA_PRIVACY_EMAIL=<the current monitored privacy inbox>`
- `ROLEXA_TEST_RECIPIENT=<the email address attached to the Resend account>`

Test mode redirects every completion email to the configured test recipient, regardless of the fictional candidate's Auth email. Production mode sends to the candidate's Auth email. A public-email address may be used as the monitored contact or test recipient, but the function rejects public-email domains such as Gmail as the sending address.

For production, use `ROLEXA_EMAIL_MODE=production` and a verified Rolexa-domain sender such as `Rolexa <privacy@your-domain>`. The function rejects the Resend test sender in production. Do not switch to production mode until the Rolexa domain and the supplier/DPA, security, retention/deletion and transfer reviews are complete.

Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never add any secret or service-role key to GitHub, browser JavaScript or SQL source.

Deploy `supabase/functions/complete-candidate-account-closure` with JWT verification disabled. The function verifies either a real candidate access token or a server-only key with Supabase Auth admin capability. The trusted key is never accepted from browser code.

## Database installation order

1. Do not rerun `supabase-candidate-account-closure.sql`; it is already installed.
2. Run `supabase-candidate-account-closure-completion.sql` once.
3. Deploy the Edge Function and set its secrets.
4. In Supabase Vault, create `rolexa_project_url` and `rolexa_service_role_key`.
5. Run `supabase-candidate-account-closure-schedule.sql` once.

The hourly schedule is a recovery route for requests that start after the candidate has left the dashboard, including the `after_applications` journey.

## Validation

Run the isolated workflow tests with:

```sh
node --experimental-strip-types --test supabase/functions/complete-candidate-account-closure/core.test.ts
```

Before genuine candidate onboarding, test a fictional candidate with:

- two historic CV objects and one current CV object;
- one profile photo;
- one live application followed by the `close_now` route;
- one `after_applications` request completed by the scheduled sweep;
- employer attempts to reopen the profile and signed URLs after closure;
- an open dispute to confirm legal hold prevents deletion;
- a forced email failure to confirm the request retries without soft-deleting Auth.
