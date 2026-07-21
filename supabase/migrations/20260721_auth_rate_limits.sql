-- Distributed API rate-limit buckets (service-role only; worker writes via service role)
create table if not exists public.auth_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists auth_rate_limits_updated_at_idx
  on public.auth_rate_limits (updated_at);

comment on table public.auth_rate_limits is
  'Fixed-window rate limit counters for the worker. Service role only.';

alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from anon, authenticated;
grant all on table public.auth_rate_limits to service_role;
