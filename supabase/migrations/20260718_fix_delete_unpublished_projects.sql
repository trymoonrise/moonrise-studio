-- Allow deleting any creator-owned project that has not been paid for (watermark still on).
-- Unpublished / draft / preview sites must be deletable even if status was once "published" or "paid".

drop policy if exists "projects_delete_own_unpaid" on public.projects;

create policy "projects_delete_own_unpaid"
  on public.projects
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce(watermark_enabled, true) = true
  );
