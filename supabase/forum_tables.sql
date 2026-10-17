-- Run in Supabase SQL Editor.
-- Forum tables for Storyhaven: posts, nested comments, votes, triggers, and RLS.

create extension if not exists pgcrypto;

-- ========== 1. FORUM POSTS ==========
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 300),
  content text not null check (char_length(trim(content)) > 0),
  media_type text not null check (media_type in ('book', 'movie', 'album', 'general')) default 'general',
  media_title text, -- Case-preserved title, e.g. "Piranesi"
  score integer not null default 0,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  comments_count integer not null default 0,
  random_bucket smallint not null default floor(random() * 100)::smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_created_at_idx on public.forum_posts (created_at desc);
create index if not exists forum_posts_score_idx on public.forum_posts (score desc, created_at desc);
create index if not exists forum_posts_media_type_idx on public.forum_posts (media_type);
create index if not exists forum_posts_bucket_cursor_idx on public.forum_posts (random_bucket, id);
create index if not exists forum_posts_book_title_idx on public.forum_posts (lower(trim(media_title)), created_at desc);

-- Trigger: auto-update updated_at on forum_posts
drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
before update on public.forum_posts
for each row execute function public.set_updated_at();

-- ========== 2. FORUM COMMENTS (NESTED) ==========
create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  parent_id uuid references public.forum_comments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  score integer not null default 0,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_comments_post_id_idx on public.forum_comments (post_id);
create index if not exists forum_comments_parent_id_idx on public.forum_comments (parent_id);

-- Trigger: auto-update updated_at on forum_comments
drop trigger if exists forum_comments_set_updated_at on public.forum_comments;
create trigger forum_comments_set_updated_at
before update on public.forum_comments
for each row execute function public.set_updated_at();

-- ========== 3. FORUM VOTES (CASCADING FOREIGN KEYS) ==========
create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.forum_posts (id) on delete cascade,
  comment_id uuid references public.forum_comments (id) on delete cascade,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default now(),
  constraint forum_votes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint forum_votes_profile_post_unique unique (profile_id, post_id),
  constraint forum_votes_profile_comment_unique unique (profile_id, comment_id)
);

-- Drop obsolete partial indexes if migrating from earlier schema
drop index if exists public.forum_votes_user_post_idx;
drop index if exists public.forum_votes_user_comment_idx;

-- Ensure constraints exist when re-running on an already-created table
alter table public.forum_votes
  drop constraint if exists forum_votes_profile_post_unique,
  add constraint forum_votes_profile_post_unique unique (profile_id, post_id);

alter table public.forum_votes
  drop constraint if exists forum_votes_profile_comment_unique,
  add constraint forum_votes_profile_comment_unique unique (profile_id, comment_id);

create index if not exists forum_votes_post_idx on public.forum_votes (post_id);
create index if not exists forum_votes_comment_idx on public.forum_votes (comment_id);

-- ========== 4. AUTOMATED SCORE & COUNT TRIGGERS ==========

-- Auto-update comments_count on forum_posts
create or replace function public.update_forum_comments_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.forum_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.forum_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_comments_count_trigger on public.forum_comments;
create trigger forum_comments_count_trigger
after insert or delete on public.forum_comments
for each row execute function public.update_forum_comments_count();

-- Auto-update vote scores on forum_posts and forum_comments
create or replace function public.update_forum_vote_score()
returns trigger language plpgsql as $$
declare
  v_post_id uuid;
  v_comment_id uuid;
  v_upvotes integer;
  v_downvotes integer;
begin
  if (TG_OP = 'DELETE') then
    v_post_id := old.post_id;
    v_comment_id := old.comment_id;
  else
    v_post_id := new.post_id;
    v_comment_id := new.comment_id;
  end if;

  if (v_post_id is not null) then
    select
      coalesce(count(*) filter (where vote_value = 1), 0),
      coalesce(count(*) filter (where vote_value = -1), 0)
    into v_upvotes, v_downvotes
    from public.forum_votes
    where post_id = v_post_id;

    update public.forum_posts
    set upvotes = v_upvotes, downvotes = v_downvotes, score = v_upvotes - v_downvotes
    where id = v_post_id;

  elsif (v_comment_id is not null) then
    select
      coalesce(count(*) filter (where vote_value = 1), 0),
      coalesce(count(*) filter (where vote_value = -1), 0)
    into v_upvotes, v_downvotes
    from public.forum_votes
    where comment_id = v_comment_id;

    update public.forum_comments
    set upvotes = v_upvotes, downvotes = v_downvotes, score = v_upvotes - v_downvotes
    where id = v_comment_id;
  end if;

  return null;
end;
$$;

drop trigger if exists forum_votes_score_trigger on public.forum_votes;
create trigger forum_votes_score_trigger
after insert or update or delete on public.forum_votes
for each row execute function public.update_forum_vote_score();

-- ========== 5. RLS SECURITY ==========
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_votes enable row level security;

-- Server uses service role only after Auth0 authentication (BFF pattern)
revoke all on table public.forum_posts from anon, authenticated;
revoke all on table public.forum_comments from anon, authenticated;
revoke all on table public.forum_votes from anon, authenticated;
