-- Manual creator payout queue for @moonrise (site owner only).

create table if not exists public.creator_payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  project_id uuid not null references public.projects (id) on delete cascade,
  creator_user_id uuid not null references auth.users (id) on delete cascade,
  sale_cents integer not null default 0 check (sale_cents >= 0),
  creator_share_cents integer not null default 0 check (creator_share_cents >= 0),
  platform_share_cents integer not null default 0 check (platform_share_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  payout_method text,
  payout_handle text,
  payout_email text,
  payout_phone text,
  paid_out_at timestamptz,
  paid_out_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creator_payouts_project_id_uidx
  on public.creator_payouts (project_id);

create index if not exists creator_payouts_status_created_idx
  on public.creator_payouts (status, created_at desc);

create index if not exists creator_payouts_creator_user_id_idx
  on public.creator_payouts (creator_user_id);

alter table public.creator_payouts enable row level security;

drop policy if exists "creator_payouts_select_owner" on public.creator_payouts;
create policy "creator_payouts_select_owner"
  on public.creator_payouts
  for select
  to authenticated
  using (public.is_site_owner());

drop policy if exists "creator_payouts_insert_owner" on public.creator_payouts;
create policy "creator_payouts_insert_owner"
  on public.creator_payouts
  for insert
  to authenticated
  with check (public.is_site_owner());

drop policy if exists "creator_payouts_update_owner" on public.creator_payouts;
create policy "creator_payouts_update_owner"
  on public.creator_payouts
  for update
  to authenticated
  using (public.is_site_owner())
  with check (public.is_site_owner());

drop policy if exists "creator_payouts_delete_owner" on public.creator_payouts;
create policy "creator_payouts_delete_owner"
  on public.creator_payouts
  for delete
  to authenticated
  using (public.is_site_owner());

create or replace function public.touch_creator_payouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_payouts_touch_updated_at on public.creator_payouts;
create trigger creator_payouts_touch_updated_at
  before update on public.creator_payouts
  for each row
  execute function public.touch_creator_payouts_updated_at();
