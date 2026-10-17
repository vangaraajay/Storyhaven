# Haven Match: Periodic Taste-Based Friend Matching (Brainstorm)

**Status:** Brainstorming & Architecture Proposal  
**Inspiration:** YakMatch / Lunchclub for Bookworms, Cinephiles & Music Lovers  
**Date:** 2026-10-17  

---

## 1. Overview & Concept

Instead of a passive directory of match candidates, **Haven Match** introduces a periodic, synchronized "match drop" (e.g. every Monday morning or weekly round):

- **The Reveal:** A notification appears in Storyhaven (e.g., a glowing envelope at the Haven Lounge desk or an on-screen banner).
- **The Connection Hook:** Explains *why* the pair was matched:
  > *"Meet **Alice**! You both gave **Piranesi** 5 stars and have **Abbey Road** favorited."*
- **Dynamic Icebreaker:** An automatically generated prompt based on shared media:
  > *“Ask Alice what she thought of the labyrinth in Piranesi!”*
- **One-Click Connection:** Instantly opens a dedicated 1-on-1 direct message thread or sends a quick "Say Hello" ping.

---

## 2. Similarity & Pairing Engine

Building upon Storyhaven's existing bag-of-titles overlap scoring in `src/lib/friends.ts`:

```
[ Active / Opted-In Users ]
            │
            ▼
[ Pairwise Taste Matrix ] ─── (Title overlap + rating harmony + reading status)
            │
            ▼
[ Constraint Filters ] ────── (Exclude existing friends, declined users, recent 30d pairs)
            │
            ▼
[ Maximum-Weight Pairing ] ── (Greedy pairing from highest similarity score down)
            │
            ▼
[ Saved Match Round ] ─────── (Stored in DB with generated icebreaker & mutual highlights)
```

### A. Similarity Scoring
- **Shared Title:** +3 points
- **Mutual Favorite / Liked:** +2 points
- **Rating Harmony:** +2 points if ratings are within $\pm 0.5$ stars
- **Same Reading State:** +1 point if both are currently `reading` the same book

### B. Pairing Strategy (Maximum-Weight Matching)
- **Candidate Pool:** Users who have logged at least 2–3 media items and have been active in the last 14–30 days.
- **Constraints:**
  - Cannot match users who are already accepted friends.
  - Cannot match users who were paired in the previous 4 rounds (cooldown period).
  - Respects declined/blocked pairs.
- **Algorithm:**
  - Generate similarity scores for all valid pairs.
  - Greedily pair highest-scoring dyads until the pool is exhausted.
  - Any remaining odd user is matched with a designated community host or wildcard.

---

## 3. Database Schema (`supabase/periodic_matches.sql`)

```sql
create table if not exists public.periodic_matches (
  id uuid primary key default gen_random_uuid(),
  round_date date not null default current_date,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  score numeric(5,2) not null,
  shared_titles jsonb not null default '[]'::jsonb, -- e.g. [{"title": "Piranesi", "type": "book"}]
  icebreaker text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint unique_pair_per_round unique(round_date, user_a, user_b)
);

create index if not exists idx_periodic_matches_users 
  on public.periodic_matches(user_a, user_b, round_date);
```

---

## 4. Execution Strategies: Scheduled Cron vs. Lazy On-Demand

| Strategy | How it Works | Pros & Cons |
| :--- | :--- | :--- |
| **Option A: Scheduled Cron** *(Classic YakMatch)* | A Next.js API route `/api/cron/match` protected by a secret key, triggered once a week by Vercel Cron, Supabase `pg_cron`, or GitHub Actions. | **Pros:** Simultaneous community "drop" creates collective hype.<br>**Cons:** Requires external scheduler setup. |
| **Option B: Lazy On-Demand** *(Zero Infrastructure)* | When a user visits `/pages/friends`, if they don't have an active match for the current week, the system computes their best available match on the fly and persists it. | **Pros:** Zero cron infrastructure needed; works immediately in dev and production.<br>**Cons:** Asynchronous match reveal rather than a synchronized event. |

---

## 5. Effort Breakdown

### Tier 1: Minimum Viable Version (High ROI, Low Effort)
*Reuses ~80% of existing `friends.ts` logic + adds an interactive match card in `/pages/friends`.*
- **Time:** **~2.5 to 3.5 hours**
- **Tasks:**
  1. Add `periodic_matches` table migration.
  2. Write `generateLazyWeeklyMatch(profileId)` reusing the existing `scoreAgainst` bag scorer.
  3. Generate 1 dynamic icebreaker string (picking the top shared title).
  4. Add a cozy "Kindred Match of the Week" spotlight banner at the top of `/pages/friends` with a "Say Hello" button opening a direct chat.

### Tier 2: Full "YakMatch Drop" Experience (Polished & Social)
*Includes synchronized rounds, Phaser game world integration, and notifications.*
- **Time:** **~5 to 7 hours**
- **Tasks:**
  1. Everything from Tier 1.
  2. Scheduled runner (`/api/cron/match` or `pg_cron`).
  3. Interactive Mailbox / Hearth spot in the Phaser 2D world: an icon floats over the furniture when a new match is ready to be opened.
  4. Blind Reveal animation: card flips over to reveal your match and common interests.
  5. Automatic mutual DM creation with a pre-filled icebreaker prompt.
