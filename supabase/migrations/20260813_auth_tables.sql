-- Auth-Tabellen und -Hilfsfunktionen für den Zinco Angebotstool-Login.
-- Bereits in der produktiven Supabase-DB (veiciuhbpekaeabyvhpx) angewendet.
-- Datei dient als Referenz und für neue Umgebungen/Branches.

create extension if not exists pgcrypto;

-- App-Users: eigene Auth-Tabelle mit Rollen und feingranularen Rechten.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin','user')),
  can_view_margin boolean not null default false,
  is_active boolean not null default true,
  token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users
  drop constraint if exists app_users_email_domain_check;
alter table public.app_users
  add constraint app_users_email_domain_check
  check (
    lower(split_part(email, '@', 2)) like '%zinco%'
    or lower(split_part(email, '@', 2)) like '%holcim%'
  );

create index if not exists app_users_email_idx on public.app_users (lower(email));

-- Sessions: Server-seitige Session-IDs; token_version-Vergleich invalidiert
-- alte Sessions nach Passwortwechsel.
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_version integer not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  last_seen_at timestamptz not null default now()
);
create index if not exists app_sessions_user_idx on public.app_sessions (user_id);
create index if not exists app_sessions_expires_idx on public.app_sessions (expires_at);

-- RLS aktivieren: Zugriff nur über service_role (Server-Funktionen).
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

-- Hilfsfunktionen.
create or replace function public.bcrypt_hash(p_password text)
returns text language sql security definer
set search_path = public, extensions
as $$ select crypt(p_password, gen_salt('bf', 12)); $$;

create or replace function public.bcrypt_verify(p_password text, p_hash text)
returns boolean language sql security definer
set search_path = public, extensions
as $$ select crypt(p_password, p_hash) = p_hash; $$;

create or replace function public.bump_token_version(p_user_id uuid)
returns void language sql security definer
set search_path = public
as $$
  update public.app_users set token_version = token_version + 1, updated_at = now() where id = p_user_id;
  delete from public.app_sessions where user_id = p_user_id;
$$;

create or replace function public.verify_password(p_email text, p_password text)
returns table (
  id uuid, email text, password_hash text, role text,
  can_view_margin boolean, is_active boolean, token_version integer
) language sql security definer
set search_path = public, extensions
as $$
  select u.id, u.email, u.password_hash, u.role, u.can_view_margin, u.is_active, u.token_version
    from public.app_users u
    where lower(u.email) = lower(p_email)
      and u.is_active
      and crypt(p_password, u.password_hash) = u.password_hash
    limit 1;
$$;

-- Admin-Seed (idempotent). Passwort kann anschließend im Admin-Panel geändert
-- werden. Hier absichtlich als SQL, damit ein frischer Deploy sofort einen
-- Admin-Zugang hat.
-- HINWEIS: Kein Passwort im Code. Das Admin-Startpasswort wird beim Deploy
-- ueber den DB-Parameter app.seed_admin_password gesetzt, z.B.:
--   ALTER DATABASE postgres SET app.seed_admin_password = '<startpasswort>';
-- Ohne gesetzten Parameter wird 'CHANGE_ME_ON_FIRST_DEPLOY' verwendet und
-- MUSS im Admin-Panel sofort geaendert werden.
insert into public.app_users (email, password_hash, role, can_view_margin, is_active)
values (
  'pascal.wanner@zinco.de',
  public.bcrypt_hash(coalesce(current_setting('app.seed_admin_password', true), 'CHANGE_ME_ON_FIRST_DEPLOY')),
  'admin', true, true
)
on conflict (email) do nothing;
