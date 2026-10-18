# Haven Match Drop & Password-Gated Admin Console — Architecture & Implementation Plan

**Branch:** `matching`  
**Routes:**  
- `/pages/friends` (Countdown timer, Match Drop reveal card, mutual opt-in connect, pass option, & 1-click DM)  
- `/admin` (Secure, password-gated admin console to trigger drops, dry-run pairings, and manage rounds)  
**Target Files:**  
- `src/app/admin/page.tsx` (New: Independent password-gated admin console page)  
- `src/app/admin/actions.ts` (New: Password-verified server actions for admin triggers & dry-runs)  
- `src/app/admin/admin.css` (New: Terminal/Lounge Rosé Pine admin styling)  
- `src/app/pages/friends/MatchDropCard.tsx` (New: Live countdown + mutual opt-in connect card)  
- `src/app/pages/friends/match-drop.css` (New: Countdown, pulse animations, and kindred spirit card styles)  
- `src/app/pages/friends/page.tsx` & `src/app/pages/friends/FriendsShell.tsx` (Mount MatchDropCard above MatchPanel & wire `draft` searchParam)  
- `src/app/pages/friends/ChatPanel.tsx` (Accept optional initial `draft` prop for 1-click icebreaker sending)  
- `src/lib/match-drop.ts` (New: Similarity matching engine, concurrency-safe opt-in, icebreaker generator, and DB queries)  
- `supabase/periodic_matches.sql` (New: Database migration for periodic match records with RLS & canonical ordering)  
**Status:** Planning only — do not implement until instructed.  
**Version:** V4 (Deep Scrutiny: Canonical constraints, RLS security, odd-user-out handling, atomic lock race guard, URL chat pre-fill, and dismiss UX)

---

## 1. Overview & Core Mechanics

**Haven Match** brings the excitement of **YakMatch / Lunchclub** into Storyhaven's cozy reading lounge:

1. **The Anticipation (Live Countdown):**
   - A live countdown timer displayed at the top of `/pages/friends`:  
     `⏱️ Next Haven Match Drop in: 3d 14h 22m 10s`
   - Fixed to a global UTC anchor (every Monday at 00:00:00 UTC) so all users are in sync.
   - In dev mode, when the countdown hits zero, it **gracefully resets** to the next weekly target (+7 days) without needing background worker daemons or crashing.

2. **Relaxed "Any Similarities" Pairing Engine:**
   - Evaluates active users' catalogs across Books, Movies, and Music Albums.
   - Pairs users who share **any** common media (e.g., both logged *Piranesi*, or both favorited *Inception*).
   - If a user has no exact overlap, pairs them with an active reader as a "Curated Discovery" match.
   - Excludes users who are already accepted friends and avoids repeating the previous round's match.

3. **Double Opt-In "Connect" Flow (Confirmed by User):**
   - Neither user is subjected to uninvited DMs until **both** agree.
   - **Step 1:** User A clicks `[ Connect 👋 ]`.
     - User A's card changes to: `⏳ Waiting for Alice to connect back…`
     - Alice's card updates to: `✨ Ajay clicked Connect! Click below to unlock your chat.`
   - **Step 2:** User B (Alice) also clicks `[ Connect 👋 ]`.
     - System safely creates or upgrades the `accepted` row in `public.friendships`.
     - Both cards update to: `[ Open Chat 💬 ]` linking directly to `/pages/friends?with={otherId}&draft={icebreaker}`.
     - The chat composer automatically pre-fills with the personalized icebreaker ready to send!

4. **Independent Password-Gated Admin Console (`/admin`):**
   - Hosted at the top-level route `/admin`.
   - **Mandatory Password Gate:** Prompts for an admin password on load before any functionality or controls are accessible.
   - **Server-Side Verification:** Every admin action requires the password to be passed to the server, verifying against `process.env.ADMIN_PASSWORD`.
   - **Zero Client Bundle Leak:** The initial HTML contains zero participant or pairing data; data is only retrieved via authenticated server action after password entry.

---

## 2. Deep Scrutiny & Architectural Edge Cases Handled

### 1. Database Integrity & Canonical Representation
- **Problem:** If Alice (`UUID 1`) and Bob (`UUID 2`) are matched, inserting them in reverse order (`user_a = Bob, user_b = Alice`) in another round or query could cause lookup anomalies and duplicate pairings.
- **Solution:** Enforce canonical lexicographical ordering in the database constraint:
  `constraint user_canonical_order check (user_a < user_b)`.
  The matching engine automatically sorts `[u1, u2].sort()` before insertion.
- **Constraint on Unique Matches per Round:**
  A unique constraint `unique (round_id, user_a, user_b)` guarantees that the exact same pair cannot be duplicated within a round.

### 2. Row Level Security (RLS) & Privacy
- **Problem:** If RLS is omitted, client-side Supabase queries could inspect other users' match drops.
- **Solution:** Explicit RLS policies on `periodic_matches`:
  - `SELECT`: Only participants (`auth.uid() = user_a or auth.uid() = user_b`) can read their own row.
  - `UPDATE`: Only participants can update their own connection flag (`user_a_connected` or `user_b_connected`) or dismiss the match.
  - Admin operations bypass RLS securely via `createServiceSupabaseClient()`.
  - Added to `supabase_realtime` so connection changes sync across active tabs.

### 3. Odd Number of Active Users (The "Leftover" Problem)
- **Scenario:** 5 active users exist in Storyhaven. 2 pairs (4 users) are created. 1 user is left over.
- **Solution ("Haven Scout" State):**
  - The odd user out is recorded with a special status or given a cozy waiting card:
    `🏕️ You're our Haven Scout for this cycle! All other kindred spirits are currently paired up, but you're first in line for the next drop.`
  - The live countdown timer remains active.
  - The pairing engine prioritizes leftover users at the top of the queue in the subsequent round.

### 4. Small / All-Connected Community Fallback
- **Scenario:** All active readers in the database are already mutual accepted friends.
- **Solution:**
  - If no unacquainted pairs exist, the engine halts with a clear status:
    `{ success: false, reason: "All active members are already connected! Invite new friends to expand the lounge." }`
  - The admin console clearly reports this state with recommendations.

### 5. Double Opt-In Concurrency Race Condition Guard
- **Scenario:** User A and User B both click "Connect" at the exact same millisecond.
- **Solution:** Use an atomic state transition in Supabase:
  ```sql
  -- Step 1: Update the user's connection flag
  update periodic_matches
  set user_a_connected = true -- (or user_b_connected)
  where id = match_id
  returning *;
  ```
  ```sql
  -- Step 2: Atomic lock to transition to 'connected'
  update periodic_matches
  set status = 'connected'
  where id = match_id
    and status = 'pending'
    and user_a_connected = true
    and user_b_connected = true
  returning id;
  ```
  - Only the single execution thread that successfully transitions `status` from `'pending'` to `'connected'` creates the `friendships` row.
  - The second thread sees 0 rows returned from Step 2 and returns safely without duplicate key violations.

### 6. Seamless Icebreaker Pre-Fill (Zero-Storage URL Param)
- **Problem:** How to get the personalized icebreaker from the match card into the `ChatPanel` message input without messy global state or fragile `localStorage`.
- **Solution:**
  - Link directly to `/pages/friends?with={other.id}&draft={encodeURIComponent(icebreaker)}`.
  - `src/app/pages/friends/page.tsx` reads `searchParams.draft` and passes it as `initialDraft` to `FriendsShell` -> `ChatPanel`.
  - `ChatPanel` initializes the message input value to `initialDraft`.
  - The user lands on the chat, sees their icebreaker ready to send, edits if desired, and presses Enter!

### 7. Discreet "Pass / Dismiss" Option
- **Scenario:** A user does not wish to connect with the suggested match.
- **Solution:**
  - Provide a discreet `[ Pass on this match ]` button.
  - Clicking it updates `status = 'dismissed'`.
  - The user's view reverts to the cozy waiting card with the countdown to the next drop, avoiding an unwanted prompt sitting on their screen all week.

---

## 3. Database Schema (`supabase/periodic_matches.sql`)

```sql
-- Migration: Periodic Matches for Haven Match Drops
create extension if not exists pgcrypto;

create table if not exists public.periodic_matches (
  id uuid primary key default gen_random_uuid(),
  round_id text not null,                           -- e.g. 'round-20261017-2015' or '2026-W42'
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  user_a_connected boolean not null default false,
  user_b_connected boolean not null default false,
  user_a_dismissed boolean not null default false,
  user_b_dismissed boolean not null default false,
  friendship_id uuid references public.friendships(id) on delete set null,
  score integer not null default 1,                 -- count of shared titles / similarity weight
  shared_titles jsonb not null default '[]'::jsonb,  -- e.g. [{"name": "Piranesi", "type": "book"}]
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

-- Policy: Users can only view their own matches
create policy "Users can view their own periodic matches"
  on public.periodic_matches
  for select
  using (
    auth.uid() = user_a or auth.uid() = user_b
  );

-- Policy: Users can update their own connection or dismissal flags
create policy "Users can update their own match status"
  on public.periodic_matches
  for update
  using (
    auth.uid() = user_a or auth.uid() = user_b
  );

-- Realtime synchronization
alter publication supabase_realtime add table public.periodic_matches;
```

---

## 4. Admin Console Specification (`/admin`)

### Security Architecture & Gatekeeping

```
┌────────────────────────────────────────────────────────────────────────┐
│  Client (/admin)                     Server (actions.ts)               │
├────────────────────────────────────────────────────────────────────────┤
│  1. Initial Page Load            ──► Renders ONLY Password Input       │
│                                      (Zero admin/user data leaked)     │
│  2. Enters Password              ──► verifyAdminPasswordAction(pass)   │
│                                      Checks process.env.ADMIN_PASSWORD │
│                                      Uses timingSafeEqual + SHA-256    │
│  3. If Valid                     ──► getAdminStatusAction(pass)        │
│                                      Streams rounds, stats, & pairings │
│  4. Admin clicks "Dry Run"       ──► dryRunMatchDropAction(pass)       │
│     (Simulate pairings)              Returns pairing simulation log    │
│  5. Admin clicks "Trigger Drop"  ──► triggerMatchDropAction(pass)      │
│     (passes password with action)    Executes atomic runMatchDrop()    │
│  6. Admin clicks "Clear Matches" ──► clearActiveMatchesAction(pass)    │
│     (passes password with action)    Clears matches to test countdown  │
└────────────────────────────────────────────────────────────────────────┘
```

### Password Verification (Timing-Attack Safe)
```ts
import crypto from "crypto";

export function verifyAdminPassword(input: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass || typeof adminPass !== "string" || !adminPass.trim()) {
    return false;
  }
  const inputHash = crypto.createHash("sha256").update(input.trim()).digest();
  const targetHash = crypto.createHash("sha256").update(adminPass.trim()).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}
```

### Admin UI Features:
1. **Status Summary Cards:**
   - Active Round ID & Age.
   - Total Pairs Formed vs. Total Connected.
   - Total Eligible Media Loggers.
2. **Action Toolbar:**
   - `[ ⚡ Trigger Global Match Drop Now ]`: Runs pairing and persists to DB.
   - `[ 🧪 Simulate / Dry-Run Drop ]`: Previews pairs without modifying DB.
   - `[ 🗑️ Clear / Reset Active Matches ]`: Deletes active round matches so the system reverts to pre-drop countdown state for testing.
   - `[ 🔒 Lock Console ]`: Clears memory and locks screen immediately.
3. **Live Pairings Inspection Table:**
   - Shows User A, User B, Match Type (Shared Media vs. Curated Discovery), Status, and Connection Badges.

---

## 5. UI Components & Interactivity

### 1. `MatchDropCard.tsx` Two-State Server Machine

The server operates in two main modes:

#### State 1: `waiting` Mode (No active matches exist)
- **Condition:** No active rows in `periodic_matches` (initial state or cleared by admin).
- **Client Presentation:** Cozy lounge waiting card with **live countdown timer** counting down to the next drop:
  `🕯️ Haven Match Lounge`  
  `The Haven elders are consulting the archives. When the drop arrives, kindred spirits will be revealed!`  
  `⏱️ Next Drop in: 3d 14h 22m 10s`

#### State 2: `active` Mode (Match drop triggered)
- **Condition:** Active rows exist in `periodic_matches`. **NO countdown timer is displayed.**
- **Sub-state A (Matched User):** Displays kindred spirit profile, shared media badges, icebreaker preview, and mutual connect flow (`[ Connect 👋 ]` ➔ waiting pill ➔ celebration & 1-click DM).
- **Sub-state B (Unmatched Scout):** Displays reassuring lounge card without a timer:
  `🏕️ Haven Lounge Scout`  
  `"The library elders couldn't find an unacquainted kindred spirit for you in this drop, but your place is reserved at the front of the lounge for next week's gathering."`  
  `"All other active readers in Storyhaven are currently in your circle of friends. Explore the library catalogs or check back when new travelers arrive!"`
- **Resetting:** When matches are cleared (via `[ 🗑️ Clear Active Matches ]`), the server resets to `waiting` mode and clients immediately restore the countdown timer.

### 2. Live Countdown Timer with Dev Rollover
- Target calculation:
  ```ts
  export function getNextDropTarget(from = new Date()): Date {
    const target = new Date(from);
    // Find next Monday at 00:00:00 UTC
    const day = target.getUTCDay();
    const diff = (7 - day + 1) % 7 || 7; // days until next Monday
    target.setUTCDate(target.getUTCDate() + diff);
    target.setUTCHours(0, 0, 0, 0);
    return target;
  }
  ```
- Timer runs client-side ticker (`1000ms`).
- When difference reaches $\le 0$, smoothly resets to `nextTarget + 7 days` without throwing errors.

---

## 6. Implementation Checklist

- [x] **Step 1: Database Migration (`supabase/periodic_matches.sql`)**
  - Run SQL with canonical constraints, double opt-in columns, dismissal flags, RLS policies, and realtime publication.
- [x] **Step 2: Core Matching Engine (`src/lib/match-drop.ts`)**
  - `getActiveMatchForProfile(profileId)`
  - `runMatchDrop(roundId, dryRun = false)`
  - `clearActiveMatches()` (Admin helper to reset current matches)
  - `connectMatchAction(matchId)` with atomic status transition
  - `dismissMatchAction(matchId)`
  - `generateIcebreaker(sharedTitles, userA, userB)`
- [x] **Step 3: Password-Gated Admin Console (`/admin`)**
  - `src/app/admin/actions.ts` (Timing-safe password verification, get status, trigger drop, dry-run, clear matches)
  - `src/app/admin/page.tsx` (Password lock screen + dashboard tabs)
  - `src/app/admin/admin.css` (Rosé Pine terminal styling)
- [x] **Step 4: Friends Page & Chat Integration**
  - Update `src/app/pages/friends/page.tsx` to read `searchParams.draft` and pass to `FriendsShell`.
  - Update `src/app/pages/friends/ChatPanel.tsx` to accept `initialDraft` prop.
  - Create `src/app/pages/friends/MatchDropCard.tsx` and `match-drop.css`.
  - Mount `<MatchDropCard />` inside `FriendsShell.tsx` above `MatchPanel`.
- [x] **Step 5: Testing & Verification**
  - Test `/admin` with wrong password (denied) and correct password (unlocked).
  - Test dry-run pairing simulation.
  - Test manual drop trigger and clear active matches.
  - Test User A and User B mutual connect flow and chat pre-fill.
  - Test countdown rollover and lint/tsc verification.
