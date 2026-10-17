-- Run in Supabase SQL Editor.
-- Friends, DMs, and group chats. Linked to public.profiles.
-- App uses service role on the server after Auth0 checks (same as logging).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== FRIENDSHIPS ==========
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- One row per unordered pair
create unique index if not exists friendships_pair_uidx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row
execute function public.set_updated_at();

-- ========== DIRECT MESSAGES ==========
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint dm_messages_body_not_blank check (char_length(trim(body)) > 0),
  constraint dm_messages_body_max check (char_length(body) <= 4000)
);

create index if not exists dm_messages_thread_idx
  on public.dm_messages (friendship_id, created_at);

-- ========== GROUP CHATS ==========
create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_groups_name_not_blank check (char_length(trim(name)) > 0)
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index if not exists chat_group_members_profile_idx
  on public.chat_group_members (profile_id);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint group_messages_body_not_blank check (char_length(trim(body)) > 0),
  constraint group_messages_body_max check (char_length(body) <= 4000)
);

create index if not exists group_messages_thread_idx
  on public.group_messages (group_id, created_at);

-- RLS: block direct anon/authenticated API access.
alter table public.friendships enable row level security;
alter table public.dm_messages enable row level security;
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;

revoke all on table public.friendships from anon, authenticated;
revoke all on table public.dm_messages from anon, authenticated;
revoke all on table public.chat_groups from anon, authenticated;
revoke all on table public.chat_group_members from anon, authenticated;
revoke all on table public.group_messages from anon, authenticated;
