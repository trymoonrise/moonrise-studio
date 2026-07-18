-- Site owner (handle moonrise) can read all paid-client data for Admin My clients.
-- Regular creators keep select on their own rows only.

create or replace function public.is_site_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(regexp_replace(coalesce(p.handle, ''), '^@', '')) = any (
        array['moonrise']::text[]
      )
  );
$$;

revoke all on function public.is_site_owner() from public;
grant execute on function public.is_site_owner() to authenticated;

drop policy if exists "payments_select_owner_all" on public.payments;
create policy "payments_select_owner_all"
  on public.payments
  for select
  to authenticated
  using (public.is_site_owner());

drop policy if exists "projects_select_owner_all" on public.projects;
create policy "projects_select_owner_all"
  on public.projects
  for select
  to authenticated
  using (public.is_site_owner());

drop policy if exists "profiles_select_owner_all" on public.profiles;
create policy "profiles_select_owner_all"
  on public.profiles
  for select
  to authenticated
  using (public.is_site_owner());
