-- Manual client entries + per-user hides for My Clients.
-- Paid project rows stay intact; remove only hides them from the viewer's list.

create table if not exists public.manual_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null,
  phone text,
  website text,
  price_cents integer
    check (price_cents is null or (price_cents >= 0 and price_cents <= 100000000)),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manual_clients_user_id_idx
  on public.manual_clients (user_id);

create index if not exists manual_clients_paid_at_idx
  on public.manual_clients (paid_at desc nulls last);

alter table public.manual_clients enable row level security;

drop policy if exists "manual_clients_select_own" on public.manual_clients;
create policy "manual_clients_select_own"
  on public.manual_clients
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "manual_clients_select_owner" on public.manual_clients;
create policy "manual_clients_select_owner"
  on public.manual_clients
  for select
  to authenticated
  using (public.is_site_owner());

drop policy if exists "manual_clients_insert_own" on public.manual_clients;
create policy "manual_clients_insert_own"
  on public.manual_clients
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "manual_clients_update_own" on public.manual_clients;
create policy "manual_clients_update_own"
  on public.manual_clients
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manual_clients_delete_own" on public.manual_clients;
create policy "manual_clients_delete_own"
  on public.manual_clients
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "manual_clients_delete_owner" on public.manual_clients;
create policy "manual_clients_delete_owner"
  on public.manual_clients
  for delete
  to authenticated
  using (public.is_site_owner());

grant select, insert, update, delete on table public.manual_clients to authenticated;

create or replace function public.touch_manual_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists manual_clients_touch_updated_at on public.manual_clients;
create trigger manual_clients_touch_updated_at
  before update on public.manual_clients
  for each row
  execute function public.touch_manual_clients_updated_at();

create table if not exists public.client_hides (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists client_hides_project_id_idx
  on public.client_hides (project_id);

alter table public.client_hides enable row level security;

drop policy if exists "client_hides_select_own" on public.client_hides;
create policy "client_hides_select_own"
  on public.client_hides
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "client_hides_insert_own" on public.client_hides;
create policy "client_hides_insert_own"
  on public.client_hides
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "client_hides_delete_own" on public.client_hides;
create policy "client_hides_delete_own"
  on public.client_hides
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.client_hides to authenticated;
