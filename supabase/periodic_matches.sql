-- Migration: Periodic Matches for Haven Match Drops
-- Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.periodic_matches (
  id uuid primary key default gen_random_uuid(),
  round_id text not null,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  user_a_connected boolean not null default false,
  user_b_connected boolean not null default false,
  user_a_dismissed boolean not null default false,
  user_b_dismissed boolean not null default false,
  friendship_id uuid references public.friendships(id) on delete set null,
  score integer not null default 1,
  shared_titles jsonb not null default '[]'::jsonb,
  icebreaker text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint user_canonical_order check (user_a < user_b),
  constraint unique_match_pair_per_round unique (round_id, user_a, user_b)
);

-- Fast lookup by participant and round
create index if not exists idx_periodic_matches_user_a on public.periodic_matches(user_a, created_at desc);
create index if not exists idx_periodic_matches_user_b on public.periodic_matches(user_b, created_at desc);
create index if not exists idx_periodic_matches_round on public.periodic_matches(round_id);

-- Row Level Security (RLS)
alter table public.periodic_matches enable row level security;

-- Policy: Users can view their own matches
drop policy if exists "Users can view their own periodic matches" on public.periodic_matches;
create policy "Users can view their own periodic matches"
  on public.periodic_matches
  for select
  using (
    auth.uid() = user_a or auth.uid() = user_b
  );

-- Policy: Users can update their own connection or dismissal flags
drop policy if exists "Users can update their own match status" on public.periodic_matches;
create policy "Users can update their own match status"
  on public.periodic_matches
  for update
  using (
    auth.uid() = user_a or auth.uid() = user_b
  );

-- Realtime synchronization
alter publication supabase_realtime add table public.periodic_matches;
