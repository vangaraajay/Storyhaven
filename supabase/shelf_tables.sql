-- Run in Supabase SQL Editor. Shelf theme, unlocks and placed decorations.
-- Keys are profile_id (-> public.profiles.id) like every other table here,
-- not auth.users, because identity comes from Auth0.

alter table public.profiles
  add column if not exists shelf_theme text not null default 'oak'
    check (shelf_theme in ('oak', 'walnut', 'birch', 'rose'));

create table if not exists public.unlocks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, item_key)
);

create table if not exists public.shelf_items (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  slot integer not null check (slot >= 0),
  item_key text not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, slot)
);

-- RLS: same model as the other tables. The app reads/writes with the service
-- role after Auth0 checks; anon/authenticated roles get no direct access.
-- (Auth0 sessions are not Supabase JWTs, so per-user policies cannot match.)
alter table public.unlocks enable row level security;
alter table public.shelf_items enable row level security;

revoke all on table public.unlocks from anon, authenticated;
revoke all on table public.shelf_items from anon, authenticated;
