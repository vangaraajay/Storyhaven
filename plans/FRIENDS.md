# Friends, Match & Chat — implementation plan

**Status:** implemented (v1). Run `supabase/friends_tables.sql` in the Supabase SQL Editor before using the page.  
**Related:** `plans/main.md` (app map), `plans/LOGGING.md` (library logs used for match scoring).  
**Route:** `/pages/friends` · **Code:** `src/app/pages/friends/` · `src/lib/friends.ts`

---

## 1. Goal

Build a **Friends** surface reached from the Phaser Friends landmark where a signed-in user can:

1. **See current friends** and open **1:1 chats** and **group chats** (left column).
2. **Find people to add** via:
   - **Match list** sorted by SQL similarity score (shared library logs), and
   - **Search** by display name (exact-ish text search).
3. **Send friend requests** and **accept / decline** incoming requests (“accept” is the word).
4. After friendship is accepted, **message** that friend (and participate in group chats).

Matching is **SQL / Postgres only** for v1 — no vector DB, no embeddings, no AI.

---

## 2. Non-goals (v1)

- Realtime WebSockets / Supabase Realtime (use refresh / revalidate after send; poll later if needed).
- Read receipts, typing indicators, reactions, attachments, voice.
- Blocking / reporting (note as follow-up).
- Vector or AI-based “taste” matching.
- Matching people with zero shared media into the ranked list (search can still find them).
- Putting chat UI inside Phaser (HTML page only).
- Exposing Supabase service role or anon write access from the browser.

---

## 3. User experience

### 3.1 Entry

| Step | Behavior |
|---|---|
| Guest | Redirect `/pages/login` |
| Logged in, no profile | Redirect `/pages/profile` |
| Logged in + profile | Show Friends page |
| Phaser Friends pad | Navigate to `/pages/friends` (stop sending to `/pages/library`) |

Back link: **← Back to Storyhaven** → `/` (same pattern as library / daily-story).

### 3.2 Page layout (two columns)

```text
┌─────────────────────────────────────────────────────────────┐
│  Friends                                    [Back to haven] │
├──────────────────┬──────────────────────────────────────────┤
│ LEFT RAIL        │ MAIN PANEL                               │
│                  │                                          │
│ Friends          │ Default: Match & Add                     │
│  · Alice         │  - Incoming requests (Accept / Decline)  │
│  · Bob           │  - Search box                            │
│                  │  - Ranked matches (Add friend)           │
│ Group chats      │                                          │
│  · Book club     │ When a friend/group selected:            │
│  · [+ New group] │  - Chat thread + composer                │
│                  │                                          │
│ [Find friends]   │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

**Left rail (always visible on desktop; stacked on mobile):**

- Section **Friends** — accepted friendships only; click opens that 1:1 chat in the main panel.
- Section **Group chats** — groups the user belongs to; click opens group thread.
- Button / tab **Find friends** — switches main panel to Match & Add (does not leave the page).

**Main panel modes:**

| Mode | Trigger | Content |
|---|---|---|
| `match` | Default, or “Find friends” | Incoming requests + search + ranked match list |
| `dm` | Click a friend | 1:1 message history + send form |
| `group` | Click a group | Group message history + send form (+ optional member list) |

URL strategy (recommended):

- `/pages/friends` — match mode (default).
- `/pages/friends?with=<profileId>` — open DM with that friend (must be accepted).
- `/pages/friends?group=<groupId>` — open group chat.

Keeps one route folder; deep-linkable without nested App Router complexity.

### 3.3 Match & Add main panel (detail)

**A. Incoming requests**

- List where `addressee_id = me` and `status = pending`.
- Each row: avatar/name, optional match score vs requester, actions:
  - **Accept** → status `accepted`
  - **Decline** → status `declined` (or delete row; prefer status for audit)

Outgoing pending requests: show under a small **Sent** subsection (“Pending…”) with optional **Cancel**.

**B. Search**

- Text input: search `profiles.display_name` (case-insensitive `ilike %query%`).
- Exclude: self, already-accepted friends, blocked (N/A in v1).
- Results show: display name, avatar, match score if computable, relationship badge (`Add` / `Pending` / `Friends` / `Accept`).
- Empty query → do not dump all users; show the ranked match list instead.

**C. Ranked matches (“closest score”)**

- Candidates: other complete profiles who are **not** already accepted friends.
- Sort by **match score descending**, then display name.
- Limit (e.g. top 20–50) for v1.
- Each row shows:
  - Display name / avatar
  - Score
  - Short “why”: e.g. `3 books · 1 movie · 0 albums`
  - CTA based on relationship (see §5)

**D. Add friend button**

- Creates `friendships` row: `requester_id = me`, `addressee_id = them`, `status = pending`.
- Idempotent: if pending already exists either direction, don’t duplicate; if reverse pending exists, optionally auto-accept (nice UX; document as intentional).

---

## 4. Match scoring (SQL)

### 4.1 Title normalization

Shared titles must compare fairly despite casing / whitespace.

Define a normalizer used everywhere:

```sql
lower(trim(name))
```

Optional later: strip punctuation, collapse spaces. v1: `lower(trim(name))` only.

Consider a generated column or expression index later if slow; v1 can compute in queries or in the BFF after fetching logs.

### 4.2 Score formula (v1)

For viewer `A` and candidate `B`:

| Signal | Points |
|---|---|
| Shared book title (normalized) | +3 |
| Shared movie title | +3 |
| Shared album title | +3 |
| Same title **and** both `liked = true` | +1 extra |
| Same book title **and** same `status` (non-null) | +1 extra |

**Total score** = sum of the above.  
**Minimum to appear in ranked list:** score ≥ 1 (at least one shared title).  
People with score 0 still appear via **search**, not in the ranked match list.

### 4.3 How to compute (two acceptable approaches)

**Preferred for v1 (clear + debuggable):** BFF in `src/lib/friends.ts`

1. Load my book/movie/album names (+ liked/status) for profile A.
2. Build sets keyed by normalized title per media type.
3. Query candidate profiles (exclude self / accepted friends).
4. For each candidate (or batch-load their logs), compute score in TypeScript.
5. Sort and return top N with breakdown counts.

Fine while user count is small (hackathon / early). Easy to test and explain in UI.

**Later optimization:** single Postgres SQL / RPC that joins normalized titles and `group by profile_id` with `sum(...)`. Same formula — swap implementation without changing UI.

### 4.4 What we deliberately ignore in v1

- Fuzzy title matching (“HP” vs “Harry Potter”)
- Genre tags (don’t exist yet)
- Rating proximity
- Recency weighting

---

## 5. Relationship state machine

```text
none ──Add friend──► pending ──Accept──► accepted
                       │
                       └──Decline──► declined
                       └──Cancel (requester)──► none (delete or cancelled)

accepted ──(future) Unfriend──► none
```

| State | Viewer sees |
|---|---|
| none | **Add friend** |
| pending (I requested) | **Pending** (Cancel optional) |
| pending (they requested) | **Accept** / **Decline** |
| accepted | In left rail; chat enabled; badge **Friends** |
| declined | Treat as `none` for CTA (allow request again) **or** hide for a cooldown — recommend allow again for v1 |

**Canonical friendship row:** store one row per unordered pair.

Constraint approach:

- Always store `profile_low_id` / `profile_high_id` (ordered UUIDs) **or**
- Check both directions before insert and use a unique index on `least(requester, addressee), greatest(...)`.

Recommend columns:

- `requester_id`, `addressee_id` (who sent the request — needed for Accept UI)
- Unique on `(least(requester_id, addressee_id), greatest(...))` so A→B and B→A can’t both exist as separate friendships

---

## 6. Data model (Supabase SQL)

New file to run in SQL Editor (when implementing):  
`supabase/friends_tables.sql`

### 6.1 `friendships`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `requester_id` | uuid FK → `profiles.id` | ON DELETE CASCADE |
| `addressee_id` | uuid FK → `profiles.id` | ON DELETE CASCADE |
| `status` | text | `pending` \| `accepted` \| `declined` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | trigger `set_updated_at` |
| `accepted_at` | timestamptz | null until accepted |

Checks:

- `requester_id <> addressee_id`
- `status in (...)`
- Unique pair (ordered least/greatest)

Indexes:

- `(addressee_id, status)` — inbox of incoming requests
- `(requester_id, status)` — outgoing
- Partial index where `status = 'accepted'` for friends lists if useful

### 6.2 Direct messages — `dm_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `friendship_id` | uuid FK → `friendships.id` | only when `accepted` |
| `sender_id` | uuid FK → `profiles.id` | must be one of the two friends |
| `body` | text | non-blank, max length e.g. 4000 |
| `created_at` | timestamptz | |

Index: `(friendship_id, created_at)` for thread pagination.

Server must verify: friendship accepted AND sender is requester or addressee.

### 6.3 Group chats

**`chat_groups`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | non-blank |
| `created_by` | uuid FK → `profiles.id` | |
| `created_at` | timestamptz | |

**`chat_group_members`**

| Column | Type | Notes |
|---|---|---|
| `group_id` | uuid FK | CASCADE |
| `profile_id` | uuid FK | CASCADE |
| `role` | text | `owner` \| `member` (v1) |
| `joined_at` | timestamptz | |
| PK | `(group_id, profile_id)` | |

**`group_messages`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `group_id` | uuid FK | |
| `sender_id` | uuid FK → `profiles.id` | must be member |
| `body` | text | |
| `created_at` | timestamptz | |

Index: `(group_id, created_at)`.

**v1 group rules:**

- Creator is `owner` and a member.
- Owner can add **accepted friends only** to the group (keeps spam down).
- Any member can send messages.
- Leave group: delete membership (owner transfer out of scope; if owner leaves, promote oldest member or delete group — pick one and document; recommend: prevent owner leave until transfer, or auto-promote).

### 6.4 Security (same as logging)

- Enable RLS on all new tables.
- `REVOKE ALL` from `anon` / `authenticated`.
- App uses **service role** only after `auth0.getSession()` + profile resolution in server code.
- Never trust client-supplied “as user X” without verifying session → profile id.

---

## 7. App architecture

### 7.1 Routes & Phaser

| Item | Change |
|---|---|
| New route | `/pages/friends` |
| Zone `friends` in `src/phaser/constants/zones.ts` | `route: "/pages/friends"`, prompt e.g. “Friends — Match & chat” |
| `plans/main.md` + `plans/connect.md` | Update landmarks / directory / routes when implementing |

Forums landmark stays a placeholder (library or its own page later).

### 7.2 File layout (self-contained page folder)

```text
src/app/pages/friends/
  page.tsx                 # Auth + profile gate; load rail + panel data
  actions.ts               # Server actions: request/accept/decline, messages, groups
  FriendsShell.tsx         # Client layout: left rail + main panel switching
  FriendsRail.tsx          # Friends list + groups list + Find friends control
  MatchPanel.tsx           # Requests + search + ranked matches
  ChatPanel.tsx            # Shared thread UI for DM + group
  NewGroupForm.tsx         # Optional: create group + pick friend members

src/lib/friends.ts         # DB helpers: friendships, match scoring, messages, groups
supabase/friends_tables.sql
```

Shared types live in `src/lib/friends.ts` (mirror `logging.ts` style).

### 7.3 Page load data (server)

After session + complete profile:

1. Accepted friends (other profile’s id, display_name, avatar_url).
2. Groups I belong to (id, name).
3. Incoming pending requests (with requester profile + score).
4. Outgoing pending (optional).
5. Ranked matches (top N) — only needed for match mode; can defer if `?with=` / `?group=` set to keep first paint lighter.
6. If `?with=` / `?group=`: verify membership/friendship, load last K messages (e.g. 100).

### 7.4 Server actions (mirror library actions)

All: `requireProfileId()` pattern (session → profile → else redirect).

| Action | Behavior |
|---|---|
| `sendFriendRequest(addresseeId)` | Create pending; handle reverse-pending auto-accept |
| `acceptFriendRequest(friendshipId)` | Only addressee; set accepted |
| `declineFriendRequest(friendshipId)` | Only addressee |
| `cancelFriendRequest(friendshipId)` | Only requester while pending |
| `searchProfiles(query)` | Return matches + relationship + score |
| `listMatchCandidates()` | Ranked list (or used only on page load) |
| `sendDm(friendshipId, body)` | Verify accepted + membership |
| `sendGroupMessage(groupId, body)` | Verify membership |
| `createGroup(name, memberIds[])` | Creator + selected accepted friends |
| `addGroupMembers` / `leaveGroup` | v1 optional if time-boxed |

`revalidatePath("/pages/friends")` after mutations.

### 7.5 Auth gates

Same as library:

```text
no session → /pages/login
incomplete profile → /pages/profile
```

---

## 8. UI copy & empty states

| Situation | Copy |
|---|---|
| No friends yet | “No friends yet — Find friends to match by shared books, movies, and albums.” |
| No matches (score 0 for everyone) | “Log more in the Library to unlock better matches — or search by name.” |
| No incoming requests | Hide section or “No friend requests.” |
| Empty chat | “Say hello — you matched over shared media.” |
| Search &lt; 2 chars | Don’t query; hint “Type a name to search.” |

Use **Accept** / **Decline** (not “approve” / “receive”) in the UI.

---

## 9. Edge cases

- **Self-request:** reject.
- **Duplicate request:** unique constraint; return friendly error or no-op.
- **Already friends:** Add button hidden; opening `?with=` works.
- **Message before accept:** reject in action.
- **Removed friendship (future):** messages may remain orphaned or CASCADE with friendship — decide: soft-keep messages vs cascade delete. **v1 recommendation:** CASCADE DM messages with friendship for simplicity; groups independent.
- **Display name change:** chats key off profile id; name is join-time display.
- **Huge libraries:** cap per-user titles considered (e.g. last 200 logs) if needed.
- **Privacy:** only expose display_name, avatar, overlap counts — not other users’ full reviews in match rows (v1).

---

## 10. Implementation phases

Do in order; stop at a phase boundary if timeboxed.

### Phase A — Schema + helpers
1. Write & run `supabase/friends_tables.sql`.
2. Add `src/lib/friends.ts`: friendships CRUD, list friends, list incoming/outgoing, match scoring, search.
3. Unit-smoke via temporary scripts or manual SQL inserts (optional).

### Phase B — Match & requests UI (no chat yet)
1. `pages/friends` route + gate + left rail (friends list empty/ok) + Match panel.
2. Wire Add / Accept / Decline / Cancel / Search.
3. Point Phaser Friends zone to `/pages/friends`.
4. Update `plans/main.md` + `plans/connect.md`.

### Phase C — 1:1 chat
1. `dm_messages` usage + ChatPanel for `?with=`.
2. Click friend in rail → open DM.
3. Send message + revalidate.

### Phase D — Group chats
1. Create group form (name + multi-select friends).
2. Group list in rail + `?group=` thread.
3. Send group messages; basic member add if time allows.

### Phase E — Polish
1. Mobile layout (rail collapses / tabs).
2. Message pagination (“Load earlier”).
3. Optional light polling every N seconds while chat open.
4. Empty states + score breakdown tooltips.

---

## 11. Testing checklist (when implementing)

- [ ] Logged out → `/pages/friends` redirects to login  
- [ ] No profile → profile page  
- [ ] Ranked list excludes self and accepted friends  
- [ ] Shared book title increases score; liked/status bonuses apply  
- [ ] Search finds by display name; Add works  
- [ ] Incoming Accept → appears in left Friends; can DM  
- [ ] Decline → not friends; can request again  
- [ ] Cannot DM until accepted  
- [ ] Group create with friends; non-member cannot read/send  
- [ ] Phaser Friends pad lands on `/pages/friends`  
- [ ] Back to Storyhaven returns to Phaser  

---

## 12. Docs to update on implement

| Doc | Update |
|---|---|
| `plans/main.md` | Directory, routes, landmark Friends → `/pages/friends`, link this plan |
| `plans/connect.md` | Landmark table |
| `plans/FRIENDS.md` | Mark phases done / note deviations |
| Optional `plans/LOGGING.md` | One line: logs power friends match scoring |

---

## 13. Open decisions (resolve at implement time if still unclear)

1. **Auto-accept when reverse pending exists?** Recommendation: **yes**.
2. **Decline = status vs delete?** Recommendation: **status = declined**, allow new request later.
3. **Group owner leave policy?** Recommendation: auto-promote oldest remaining member; delete group if empty.
4. **Match compute in TS vs SQL RPC?** Recommendation: **TS in `lib/friends.ts` for Phase A–B**; SQL later if slow.
5. **URL query vs client-only selection?** Recommendation: **query params** for shareable DM/group links.

---

## 14. Summary

One page (`/pages/friends`), left rail for **friends + group chats**, main panel for **Accept requests + search + SQL-ranked matches**, then **DM / group messaging** after friendship. Data in Supabase (`friendships`, `dm_messages`, `chat_groups`, members, `group_messages`), accessed only through Auth0-gated server code — same trust model as library logging.
