# Candidate UK work eligibility registration

This release adds a required candidate self-declaration to email/password account creation. It does not ask for nationality, visa type, passport files or share codes, and it does not represent an official right-to-work check.

## Publish order

1. Run `supabase-candidate-right-to-work-registration.sql` in the Supabase SQL Editor.
2. Confirm the four read-only verification values at the bottom of the script are `true`.
3. Publish `candidate-login.html` and `candidate-right-to-work-registration.js`.
4. Create a fictional candidate account and confirm one row appears in `public.candidate_work_eligibility_declarations`.

The database trigger rejects candidate registrations that omit the declaration or send inconsistent answers. Employer registrations are unaffected. Candidates can read only their own declaration; browser clients cannot insert, update or delete it.

The record remains explicitly unverified. A separate later-stage official right-to-work workflow is still required before employment, using the appropriate Home Office, document or approved digital-verification route.
