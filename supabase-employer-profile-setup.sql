-- Rolexa employer company profiles and company logo storage
-- Run once in the Supabase SQL editor before testing the employer profile page.

create table if not exists public.employer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  industry text,
  company_size text,
  location text,
  website_url text,
  description text,
  contact_name text,
  contact_title text,
  linkedin_url text,
  social_url text,
  logo_url text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employer_profiles enable row level security;

drop policy if exists "Employers can read own company profile" on public.employer_profiles;
create policy "Employers can read own company profile"
on public.employer_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Employers can create own company profile" on public.employer_profiles;
create policy "Employers can create own company profile"
on public.employer_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Employers can update own company profile" on public.employer_profiles;
create policy "Employers can update own company profile"
on public.employer_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Employers can delete own company profile" on public.employer_profiles;
create policy "Employers can delete own company profile"
on public.employer_profiles for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Employers can upload own company logos" on storage.objects;
create policy "Employers can upload own company logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Employers can update own company logos" on storage.objects;
create policy "Employers can update own company logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Employers can delete own company logos" on storage.objects;
create policy "Employers can delete own company logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public bucket URLs are readable without a select policy. The write policies above
-- ensure employers can only manage files inside their own user-id folder.
