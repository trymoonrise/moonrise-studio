-- Auth lockouts / failed-attempt tracking (service-role only; no public policies)
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

comment on table public.auth_lockouts is
  'Failed sign-in tracking. Worker (service role) only — never expose to anon/authenticated.';

alter table public.auth_lockouts enable row level security;

-- Intentionally no policies: only service_role bypasses RLS.

revoke all on table public.auth_lockouts from anon, authenticated;
grant all on table public.auth_lockouts to service_role;
