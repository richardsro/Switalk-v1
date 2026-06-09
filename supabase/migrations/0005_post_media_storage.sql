-- Public bucket for post images. Paths are namespaced per user
-- ({user_id}/{uuid}.{ext}); the Meta APIs fetch media by public URL, so the
-- bucket must be public-read. Writes are restricted to the owner's folder.

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post media owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post media owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post media public read" on storage.objects
  for select using (bucket_id = 'post-media');
