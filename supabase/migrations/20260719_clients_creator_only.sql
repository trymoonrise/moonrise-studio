-- My Clients is creator-scoped only; remove site-owner read-all on client tables.
-- is_site_owner() remains for owner-only payout admin (pending payouts).

drop policy if exists "payments_select_owner_all" on public.payments;
drop policy if exists "projects_select_owner_all" on public.projects;
drop policy if exists "profiles_select_owner_all" on public.profiles;
