-- Run in Supabase SQL Editor.
-- Three logging tables linked to public.profiles

create extension if not exists pgcrypto;

-- Shared updated_at helper (safe if it already exists from profiles)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== BOOKS ==========
create table if not exists public.book_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  cover_url text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  started_date date,
  finished_date date,
  liked boolean not null default false,
  review text,
  status text check (status is null or status in ('want', 'reading', 'finished', 'dropped')),
  pages integer check (pages is null or pages >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_logs_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists book_logs_profile_id_idx on public.book_logs (profile_id);

drop trigger if exists book_logs_set_updated_at on public.book_logs;
create trigger book_logs_set_updated_at
before update on public.book_logs
for each row
execute function public.set_updated_at();

-- ========== MOVIES ==========
create table if not exists public.movie_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  cover_url text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  finished_date date,
  liked boolean not null default false,
  review text,
  runtime integer check (runtime is null or runtime >= 0), -- minutes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movie_logs_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists movie_logs_profile_id_idx on public.movie_logs (profile_id);

drop trigger if exists movie_logs_set_updated_at on public.movie_logs;
create trigger movie_logs_set_updated_at
before update on public.movie_logs
for each row
execute function public.set_updated_at();

-- ========== MUSIC (ALBUMS) ==========
create table if not exists public.album_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  cover_url text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  finished_date date,
  liked boolean not null default false,
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint album_logs_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists album_logs_profile_id_idx on public.album_logs (profile_id);

drop trigger if exists album_logs_set_updated_at on public.album_logs;
create trigger album_logs_set_updated_at
before update on public.album_logs
for each row
execute function public.set_updated_at();

-- RLS: block direct anon/authenticated API access.
-- App uses service role on the server after Auth0 checks.
alter table public.book_logs enable row level security;
alter table public.movie_logs enable row level security;
alter table public.album_logs enable row level security;

revoke all on table public.book_logs from anon, authenticated;
revoke all on table public.movie_logs from anon, authenticated;
revoke all on table public.album_logs from anon, authenticated;
