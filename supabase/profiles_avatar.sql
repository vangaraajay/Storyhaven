-- Run in Supabase SQL Editor BEFORE deploying the character creator.
-- Stores the character-creator choices (see src/lib/avatar/types.ts).
alter table public.profiles
  add column if not exists avatar jsonb;
