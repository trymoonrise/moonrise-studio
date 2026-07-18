-- Creators may delete their own projects only while unpaid.
-- Paid sites (business owner checkout) must remain for clients / records.

drop policy if exists "projects_all_own" on public.projects;

create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "projects_delete_own_unpaid"
  on public.projects
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and watermark_enabled is distinct from false
    and coalesce(status, '') <> 'paid'
  );
