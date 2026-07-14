# Employer company profile

The employer company profile is connected from the employer dashboard navigation.

## Supabase setup

`supabase-employer-profile-setup.sql` creates:

- `public.employer_profiles`
- the public `company-logos` storage bucket
- owner-only insert, update and delete policies
- per-employer profile row-level security

## Live test

1. Sign in with an employer account.
2. Open the employer dashboard.
3. Select **Company profile**.
4. Add company details and save.
5. Refresh and confirm all fields remain.
6. Upload a PNG, JPG, WebP or SVG logo under 2 MB and save.
7. Refresh, sign out and sign back in, then confirm the logo and details remain.
8. Confirm another employer account cannot overwrite the first employer's profile.

The existing jobs, applications, messaging and interview JavaScript modules were not changed by this feature.
