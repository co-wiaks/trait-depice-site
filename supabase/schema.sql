-- Trait d'Épice — schéma Supabase de référence
-- La base de production est déjà configurée. Ce fichier sert à documenter/recréer
-- la structure sur un projet neuf. Toutes les tables publiques utilisent RLS.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  image_url text,
  color text not null default '#C9A66B',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  family_id uuid references public.families(id) on delete set null,
  origin text not null default '',
  description text not null default '',
  short_description text not null default '',
  usage text not null default '',
  aromatic_profile jsonb not null default '[]'::jsonb,
  formats jsonb not null default '[]'::jsonb,
  main_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  accent_color text not null default '#C9A66B',
  halal boolean not null default false,
  kosher boolean not null default false,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  seo_title text not null default '',
  seo_description text not null default '',
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.displays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  capacity integer,
  dimensions text not null default '',
  description text not null default '',
  main_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  technical_sheet_url text,
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  main_image_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_spices (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  spice_id uuid not null references public.spices(id) on delete cascade,
  primary key (recipe_id, spice_id)
);

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'Trait d''Épice',
  slogan text not null default 'VOYAGE · SAVEURS · PASSION',
  email text not null default 'contact@traitdepice.fr',
  phone text not null default '',
  address text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  linkedin_url text not null default '',
  catalog_url text,
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null default '',
  email text not null,
  phone text not null default '',
  subject text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','done','archived'))
);

create index if not exists spices_family_id_idx on public.spices(family_id);
create index if not exists spices_published_idx on public.spices(is_published);
create index if not exists families_active_order_idx on public.families(is_active, display_order);
create index if not exists displays_published_order_idx on public.displays(is_published, display_order);
create index if not exists recipes_published_idx on public.recipes(is_published);
create index if not exists recipe_spices_spice_id_idx on public.recipe_spices(spice_id);
create index if not exists contact_requests_status_created_idx on public.contact_requests(status, created_at desc);

insert into public.site_settings (id) values (1) on conflict do nothing;
insert into public.site_pages (page_key, title) values
  ('home', 'Accueil'), ('history', 'Notre histoire'),
  ('professionals', 'Professionnels'), ('contact', 'Contact')
on conflict (page_key) do nothing;

alter table public.admin_users enable row level security;
alter table public.families enable row level security;
alter table public.spices enable row level security;
alter table public.displays enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_spices enable row level security;
alter table public.site_pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_requests enable row level security;

grant select on public.families, public.spices, public.displays, public.recipes,
  public.recipe_spices, public.site_pages, public.site_settings to anon;
grant select on public.families, public.spices, public.displays, public.recipes,
  public.recipe_spices, public.site_pages, public.site_settings, public.admin_users to authenticated;
grant insert, update, delete on public.families, public.spices, public.displays,
  public.recipes, public.recipe_spices, public.site_pages, public.site_settings,
  public.contact_requests to authenticated;

create policy "read own admin membership" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

create policy "public active families" on public.families
for select to anon using (is_active = true);
create policy "authenticated families" on public.families
for select to authenticated using (
  is_active = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "admins insert families" on public.families for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins update families" on public.families for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins delete families" on public.families for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public published spices" on public.spices
for select to anon using (is_published = true);
create policy "authenticated spices" on public.spices
for select to authenticated using (
  is_published = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "admins insert spices" on public.spices for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins update spices" on public.spices for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins delete spices" on public.spices for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public published displays" on public.displays for select to anon using (is_published = true);
create policy "authenticated displays" on public.displays for select to authenticated using (
  is_published = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "admins insert displays" on public.displays for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins update displays" on public.displays for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins delete displays" on public.displays for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public published recipes" on public.recipes for select to anon using (is_published = true);
create policy "authenticated recipes" on public.recipes for select to authenticated using (
  is_published = true or exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
create policy "admins manage recipes insert" on public.recipes for insert to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins manage recipes update" on public.recipes for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins manage recipes delete" on public.recipes for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public site pages" on public.site_pages for select to anon, authenticated using (true);
create policy "public site settings" on public.site_settings for select to anon, authenticated using (true);

create policy "admins read contact requests" on public.contact_requests for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins update contact requests" on public.contact_requests for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admins delete contact requests" on public.contact_requests for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Les formulaires publics écrivent via l'Edge Function contact-submit,
-- et non directement dans contact_requests.
