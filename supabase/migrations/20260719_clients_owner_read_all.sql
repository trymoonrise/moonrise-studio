-- @moonrise (site owner) can read all paid-client rows for accumulated clients view.
-- Regular creators remain limited to their own rows via existing policies.

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
