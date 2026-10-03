-- Trait d'Épice — Supabase schema
-- Exécuter dans l'éditeur SQL Supabase sur un projet neuf.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text default '',
  image_url text default '',
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
  origin text default '',
  description text default '',
  short_description text default '',
  aromatic_profile jsonb not null default '[]'::jsonb,
  formats jsonb not null default '[]'::jsonb,
  main_image_url text default '',
  gallery jsonb not null default '[]'::jsonb,
  accent_color text default '#C9A66B',
  halal boolean not null default false,
  kosher boolean not null default false,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  seo_title text default '',
  seo_description text default '',
  og_image_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.displays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  capacity integer,
  dimensions text default '',
  description text default '',
  main_image_url text default '',
  gallery jsonb not null default '[]'::jsonb,
  technical_sheet_url text default '',
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text default '',
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  main_image_url text default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_spices (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  spice_id uuid not null references public.spices(id) on delete cascade,
  primary key (recipe_id, spice_id)
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'Trait d''Épice',
  slogan text not null default 'VOYAGE · SAVEURS · PASSION',
  email text default 'contact@traitdepice.fr',
  phone text default '',
  address text default '',
  instagram_url text default '',
  facebook_url text default '',
  linkedin_url text default '',
  catalogue_url text default '',
  logo_url text default '',
  favicon_url text default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings(id) values (1) on conflict do nothing;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text default '',
  email text not null,
  phone text default '',
  subject text default '',
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','done','archived'))
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
alter table public.families enable row level security;
alter table public.spices enable row level security;
alter table public.displays enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_spices enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_requests enable row level security;

create policy "admins can read admin_users" on public.admin_users for select using (public.is_admin());

create policy "public reads active families" on public.families for select using (is_active or public.is_admin());
create policy "admins manage families" on public.families for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads published spices" on public.spices for select using (is_published or public.is_admin());
create policy "admins manage spices" on public.spices for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads published displays" on public.displays for select using (is_published or public.is_admin());
create policy "admins manage displays" on public.displays for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads published recipes" on public.recipes for select using (is_published or public.is_admin());
create policy "admins manage recipes" on public.recipes for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads recipe spice links" on public.recipe_spices for select using (true);
create policy "admins manage recipe spice links" on public.recipe_spices for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads site settings" on public.site_settings for select using (true);
create policy "admins manage site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "public creates contact requests" on public.contact_requests for insert with check (
  char_length(name) between 2 and 120
  and char_length(email) between 3 and 254
  and char_length(message) between 5 and 5000
);
create policy "admins read contact requests" on public.contact_requests for select using (public.is_admin());
create policy "admins update contact requests" on public.contact_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete contact requests" on public.contact_requests for delete using (public.is_admin());

-- Après avoir créé votre premier utilisateur dans Supabase Auth, ajoutez-le comme admin :
-- insert into public.admin_users(user_id) values ('UUID-DE-L-UTILISATEUR');
