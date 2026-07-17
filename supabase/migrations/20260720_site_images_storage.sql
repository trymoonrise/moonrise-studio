-- Site image uploads for builder edit mode.
-- Path layout: {user_id}/{lead_id|project_id}/{timestamp}-{name}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site_images_public_read" on storage.objects;
create policy "site_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'site-images');

drop policy if exists "site_images_owner_insert" on storage.objects;
create policy "site_images_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "site_images_owner_update" on storage.objects;
create policy "site_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'site-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'site-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "site_images_owner_delete" on storage.objects;
create policy "site_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'site-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
