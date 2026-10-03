-- Trait d'Épice — Supabase Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
('spices','spices',true,5242880,array['image/jpeg','image/png','image/webp']),
('displays','displays',true,5242880,array['image/jpeg','image/png','image/webp']),
('recipes','recipes',true,5242880,array['image/jpeg','image/png','image/webp']),
('site','site',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml']),
('catalogs','catalogs',true,15728640,array['application/pdf'])
on conflict (id) do nothing;

create policy "public read trait epice media" on storage.objects
for select to anon, authenticated
using (bucket_id in ('spices','displays','recipes','site','catalogs'));

create policy "admins insert trait epice media" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('spices','displays','recipes','site','catalogs')
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy "admins update trait epice media" on storage.objects
for update to authenticated
using (
  bucket_id in ('spices','displays','recipes','site','catalogs')
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id in ('spices','displays','recipes','site','catalogs')
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

create policy "admins delete trait epice media" on storage.objects
for delete to authenticated
using (
  bucket_id in ('spices','displays','recipes','site','catalogs')
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
