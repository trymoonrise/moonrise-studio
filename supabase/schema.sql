-- studio_profiles, projects, generation_jobs, payments
-- Run in Supabase SQL editor against the Moonrise project.

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null default 'moonrise',
  display_name text,
  avatar_url text,
  goal_target integer not null default 1000
    check (goal_target >= 1 and goal_target <= 1000000),
  mvp_plus boolean not null default false,
  branding_defaults jsonb not null default '{}'::jsonb,
  payout_profile jsonb not null default '{}'::jsonb,
  security_card_fingerprint text,
  notification_prefs jsonb not null default '{"email": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.mvp_plus is
  'MVP+ supporter: Builder code access, free Store items, and related perks while active.';

create index if not exists profiles_handle_idx on public.profiles (lower(handle));

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null default 'Untitled business',
  lead_id text,
  template_id text,
  html text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'preview', 'paid', 'published')),
  watermark_enabled boolean not null default true,
  price_cents integer not null default 50000
    check (price_cents >= 0 and price_cents <= 100000000),
  urgency_ends_at timestamptz,
  stripe_checkout_session_id text,
  vercel_url text,
  vercel_deployment_id text,
  business_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill for databases created before price_cents existed.
alter table public.projects
  add column if not exists price_cents integer not null default 50000;

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

-- Generation jobs (Render worker queue)
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  prompt jsonb not null default '{}'::jsonb,
  result_html text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_user_id_idx on public.generation_jobs (user_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs (status);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  stripe_session_id text,
  stripe_payment_intent text,
  amount_cents int,
  currency text default 'usd',
  kind text,
  donor_message text check (donor_message is null or char_length(donor_message) <= 120),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_stripe_session_unique'
  ) then
    alter table public.payments
      add constraint payments_stripe_session_unique unique (stripe_session_id);
  end if;
end $$;

-- Contact form leads (Auto mode email delivery + audit log)
create table if not exists public.contact_leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'auto' check (mode in ('auto', 'custom')),
  notification_email text,
  endpoint_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_leads_project_id_idx on public.contact_leads (project_id);
create index if not exists contact_leads_user_id_idx on public.contact_leads (user_id);
create index if not exists contact_leads_created_at_idx on public.contact_leads (created_at desc);

-- Auto-create profile on signup
create or replace function public.fold_handle_reserve(raw text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(lower(coalesce(raw, '')), '0134578@$!', 'oieastbasi'),
    '[^a-z]',
    '',
    'g'
  );
$$;

create or replace function public.handle_is_reserved(raw text)
returns boolean
language plpgsql
immutable
as $$
declare
  folded text;
  reserved text[] := array['moonrise', 'moonrisestudio'];
  r text;
begin
  folded := public.fold_handle_reserve(raw);
  if folded = '' then
    return false;
  end if;
  foreach r in array reserved loop
    if position(r in folded) > 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.profiles_reject_reserved_handle()
returns trigger
language plpgsql
as $$
begin
  -- Canonical owner may keep an unchanged exact reserved handle.
  if tg_op = 'UPDATE'
     and new.handle is not distinct from old.handle
     and lower(new.handle) = any (array['moonrise']) then
    return new;
  end if;

  if public.handle_is_reserved(new.handle) then
    raise exception 'That username is not allowed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_reserved_handle on public.profiles;
create trigger profiles_reserved_handle
  before insert or update of handle on public.profiles
  for each row execute function public.profiles_reject_reserved_handle();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  display text;
begin
  base_handle := coalesce(
    nullif(
      regexp_replace(
        lower(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1))),
        '[^a-z0-9_]',
        '',
        'g'
      ),
      ''
    ),
    'user'
  );
  if public.handle_is_reserved(base_handle) then
    base_handle := 'user';
  end if;
  final_handle := left(base_handle, 18) || '_' || left(replace(new.id::text, '-', ''), 6);
  display := coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1));
  if public.handle_is_reserved(display) then
    display := split_part(new.email, '@', 1);
    if public.handle_is_reserved(display) then
      display := 'User';
    end if;
  end if;
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    final_handle,
    display
  )
  on conflict (id) do nothing;
  perform public.ensure_credit_account(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_updated_at on public.generation_jobs;
create trigger generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.payments enable row level security;
alter table public.contact_leads enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists projects_all_own on public.projects;
create policy projects_all_own on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists generation_jobs_all_own on public.generation_jobs;
create policy generation_jobs_all_own on public.generation_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists contact_leads_select_own on public.contact_leads;
create policy contact_leads_select_own on public.contact_leads
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.contact_leads from anon, authenticated;
grant select on public.contact_leads to authenticated;
grant all on public.contact_leads to service_role;

-- Leads remain readable by authenticated users (existing table from LeadFinder)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'leads'
  ) then
    execute 'alter table public.leads enable row level security';
    execute 'drop policy if exists studio_leads_read on public.leads';
    execute 'create policy studio_leads_read on public.leads for select to authenticated using (true)';
  end if;
end $$;

-- Demo leads seed helper (only inserts if table empty and exists)
-- Skipped automatically when leads already populated by LeadFinder.

create table if not exists public.leads (
  id text primary key,
  imported_at timestamptz not null default now(),
  has_website boolean default false,
  maps_url text,
  business_name text,
  address text,
  phone text,
  website_url text,
  category text,
  category_group text
);

create or replace function public.sync_lead_has_website()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.has_website :=
    new.website_url is not null
    and btrim(new.website_url) ~* '^https?://'
    and btrim(new.website_url) !~*
      '^https?://([^/]*\.)?(google\.[^/]+/(maps|aclk|url)|gstatic\.com)(/|$)';
  return new;
end;
$$;

revoke all on function public.sync_lead_has_website() from public, anon, authenticated;

drop trigger if exists leads_sync_has_website on public.leads;
create trigger leads_sync_has_website
before insert or update of website_url, has_website
on public.leads
for each row
execute function public.sync_lead_has_website();

alter table public.leads enable row level security;
drop policy if exists studio_leads_read on public.leads;
create policy studio_leads_read on public.leads for select to authenticated using (true);

insert into public.leads (id, has_website, business_name, category_group, phone, address, website_url)
values
  ('demo-1', false, 'Sunset Barbers', 'Barbershop', '(555) 201-4400', '118 Main St, San Marcos, TX', null),
  ('demo-2', false, 'Oak & Stone Dental', 'Dentist', '(555) 882-1102', '44 Oak Ave, Austin, TX', null),
  ('demo-3', true, 'Bluebird Cafe', 'Cafe', '(555) 441-9090', '9 River Rd, New Braunfels, TX', 'https://example.com')
on conflict (id) do nothing;

-- Auth lockouts (worker / service_role only — no public policies)
create table if not exists public.auth_lockouts (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('email', 'ip')),
  subject_hash text not null,
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_hash)
);
create index if not exists auth_lockouts_locked_until_idx
  on public.auth_lockouts (locked_until)
  where locked_until is not null;
alter table public.auth_lockouts enable row level security;
revoke all on table public.auth_lockouts from anon, authenticated;
grant all on table public.auth_lockouts to service_role;

-- Storage: public profile avatars (path = {user_id}/avatar.*)
-- Bucket: studio-avatars (public, 2MB, image/jpeg|png|webp|gif)
-- Policies: public read; authenticated insert/update/delete own folder only.

-- Storage: site images for builder edit uploads
-- Bucket: site-images (public, 5MB, image/jpeg|png|webp|gif)
-- Path: {user_id}/{lead_id|project_id}/{timestamp}-{name}.{ext}
-- Policies: public read; authenticated insert/update/delete own folder only.
-- See supabase/migrations/20260720_site_images_storage.sql

-- Credit billing (see supabase/migrations/20260718_credit_billing.sql for full DDL + RPCs)
-- Tables: credit_accounts, credit_transactions
-- RPCs (service_role only): ensure_credit_account, credits_grant_subscription,
--   credits_grant_topup, credits_deduct, credits_refund, credits_deactivate_plan
