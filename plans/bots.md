# Storyhaven Bot Generation System Plan (`bots.md`)

## 1. Executive Summary & Core Objectives

This plan specifies the architecture, data structures, and implementation roadmap for the autonomous **Bot Community System** on the `bots` branch.

The bot system is **strictly accessed from the Admin Console (`/app/admin`)**. It enables administrators to generate a lively, cozy, and authentic community of readers, listeners, and cinephiles who post in the forum, engage in threaded discussions, participate in community voting, appear in friend searches, showcase populated library catalogs, and respond conversationally to direct messages (DMs).

### Key Requirements & Non-Negotiable Directives
1. **Model**: Strictly use Google's **`gemma-4-31b-it`** model via the Gemini API.
2. **API Key**: Strictly loaded from the server's `.env` file (`GEMINI_API_KEY`). No UI input field.
3. **Few & Large Batch Prompts**: Avoid hundreds of micro-calls. All text generation is executed in 2–3 structured, bulk prompts.
4. **Strict Separation of Concerns**:
   - **LLM generates ONLY creative text**: Usernames, post titles/bodies, comment content, and DM replies.
   - **Server code handles ALL system orchestration**: Assigning usernames to posts/comments, generating nested comment trees (`parent_id`), calculating timestamps, logging catalog items, and simulating votes.
5. **Distinct Bot ID Standard (`b075...` UUIDs)**:
   - Bots MUST be clearly distinguishable from real users at the ID level.
   - Bot IDs use the dedicated prefix `b075` (e.g. `b075xxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx`), which spells "BOTS" in hexadecimal leetspeak.
   - The server must strictly check whether an ID belongs to a bot or a real user whenever querying, matching, or establishing relationships.
6. **Matching Exclusion Guarantee**: Bots are strictly **forbidden from participating in the Haven Match Drop** system (`/pages/friends` kindred spirit matching). Zero bots will ever be matched with users or other bots.
7. **Normal User Parity Everywhere Else**:
   - Bots appear like normal users in forum posts, comments, friend search (`searchFriendsAction`), direct messaging (DMs), and library catalogs.
   - **Auto-Accept Friend Requests**: When a real user sends a friend request to a bot, the server automatically accepts it immediately (`status: 'accepted'`).
   - **Automated DM Replies**: When a real user sends a direct message to a bot friend, the bot automatically generates and sends an in-character response via Gemma.
   - **Catalog Population**: Bots automatically record the media items they author into `book_logs`, `movie_logs`, and `album_logs`, allowing their shelves to show up populated in the unified `/pages/library` friends feed.
8. **Bot Reusability Strategy**:
   - Subsequent generations **always reuse existing bot profiles first**. If the existing bot pool is smaller than the requested count, the server prompts only for the delta.
9. **Admin Purge Button**:
   - The admin console includes a "Purge Bot Content" action that safely wipes all bot accounts, cascading to their posts, comments, votes, logs, and friendships without touching real user accounts.

---

## 2. Bot Identity Architecture (`b075...` UUIDs)

All foreign keys throughout Storyhaven (`forum_posts.profile_id`, `forum_comments.profile_id`, `friendships.requester_id`, `friendships.addressee_id`, `dm_messages.sender_id`, `book_logs.profile_id`, `movie_logs.profile_id`, `album_logs.profile_id`) reference `public.profiles(id)` as PostgreSQL `uuid` fields.

To achieve an unambiguous, server-wide identifier that is impossible for standard Auth0-generated users to receive while remaining 100% compliant with PostgreSQL's 128-bit `uuid` schema:

### 2.1. The `b075` Bot UUID Standard
- Every bot profile receives an ID formatted as:
  ```text
  b075xxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx
  ```
- Normal users receive randomly generated UUIDs from Auth0/Supabase (`gen_random_uuid()`). The chance of a normal user UUID starting with `b075` is $16^{-4} \approx 0.000015$ (and when paired with `auth0_sub: "bot|..."`, the collision chance is $0$).
- In addition, the Auth0 mock subject is set to:
  ```text
  auth0_sub: "bot|<uuid>"
  ```

### 2.2. Centralized Bot Utilities (`src/lib/bots.ts`)
A dedicated module provides unambiguous checks used across all server operations:

```typescript
/**
 * Returns true if the provided UUID string belongs to a Storyhaven bot.
 */
export function isBotId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.toLowerCase().startsWith("b075");
}

/**
 * Generates a valid PostgreSQL UUID with the dedicated bot prefix.
 */
export function generateBotId(): string {
  const raw = crypto.randomUUID().toLowerCase();
  // Replace first 4 hex chars with 'b075'
  return `b075${raw.slice(4)}`;
}

/**
 * Checks if a profile object is a bot.
 */
export function isBotProfile(profile: { id?: string; auth0_sub?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  return isBotId(profile.id) || (profile.auth0_sub?.startsWith("bot|") ?? false);
}
```

---

## 3. Strict Matching Drop Exclusion (Zero Bot Matches)

Storyhaven's matching engine (`src/lib/match-drop.ts`) pairs kindred spirits based on logged media and cosine similarity. 

Bots **must never be paired** with human readers or other bots.

### Scrutinized Guard Touchpoints:
1. **`runMatchDrop()` in `src/lib/match-drop.ts`**:
   - Profile Query:
     ```typescript
     const profilesRes = await supabase
       .from("profiles")
       .select("id, display_name, avatar_url")
       .not("id", "like", "b075%");
     ```
   - In-memory Active User Filter:
     ```typescript
     const activeUserIds = Array.from(userMediaMap.keys()).filter(
       (id) => profileMap.has(id) && !isBotId(id),
     );
     ```
   - Candidate Pairing Guard:
     ```typescript
     if (isBotId(u1) || isBotId(u2)) continue;
     ```
   - Discovery Fallback Guard:
     ```typescript
     if (isBotId(leftoverProfile.id) || isBotId(discoveryPartner.id)) continue;
     ```
2. **`listMatchCandidates()` in `src/lib/friends.ts`**:
   - The `/pages/friends` "Closest matches" panel must exclude bots so human users only see real fellow travelers in recommendations:
     ```typescript
     const candidates = (data ?? [])
       .map((row) => publicProfile(row as Profile))
       .filter((p) => Boolean(p.display_name?.trim()) && !acceptedOtherIds.has(p.id) && !isBotId(p.id));
     ```
3. **`getAdminMatchStatus()` in `src/lib/match-drop.ts`**:
   - When reporting active readers in the admin dashboard, filter out `isBotId` so bot population doesn't artificially inflate human reader counts.

---

## 4. Normal Parity, Auto-Accept Friendships & Automated DM Replies

Outside of matching, bots behave like authentic community members:

### 4.1. Auto-Accepting Friend Requests
When a real user searches for a bot and clicks "Add friend", `sendFriendRequest` in `src/lib/friends.ts` intercepts:
```typescript
// src/lib/friends.ts -> sendFriendRequest
export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<Friendship> {
  if (requesterId === addresseeId) {
    throw new Error("You cannot friend yourself.");
  }

  // If the addressee is a bot, automatically accept the friendship immediately!
  const isTargetBot = isBotId(addresseeId);
  const initialStatus = isTargetBot ? "accepted" : "pending";
  const acceptedAt = isTargetBot ? new Date().toISOString() : null;

  const supabase = createServiceSupabaseClient();
  const existing = await findPairFriendship(requesterId, addresseeId);

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("You are already friends.");
    }
    const { data, error } = await supabase
      .from("friendships")
      .update({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: initialStatus,
        accepted_at: acceptedAt,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as Friendship;
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: initialStatus,
      accepted_at: acceptedAt,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Friendship;
}
```
**Outcome**:
- The real user immediately sees the bot in their "Friends" sidebar.
- The user can open a Direct Message (DM) chat thread with the bot.

### 4.2. Automated In-Character DM Replies
When a human friend sends a direct message to a bot in `sendDmMessage` (`src/lib/friends.ts`):
1. The human user's message is inserted into `public.dm_messages`.
2. The server detects that the recipient is a bot (`isBotId(recipientId)`).
3. The server calls `generateBotDmReply(botProfile, userMessage, recentChatHistory)` using `gemma-4-31b-it`.
4. Prompt Context:
   ```text
   You are {{botName}}, a quiet and thoughtful patron of Storyhaven, a cozy retro pixel library.
   You love {{botFavoriteMedia}} and enjoy discussing books, films, and music.
   A fellow reader in your haven circle just sent you this message:
   "{{userMessage}}"

   Reply warmly and conversationally in 1-3 cozy sentences. Maintain your persona. Do not break character.
   ```
5. The bot's reply is automatically inserted into `public.dm_messages` with `sender_id = botId`.
6. When the UI polling executes (`ChatPanel` polls every 2500ms via `pollChatMessagesAction`), the bot's response seamlessly appears in the conversation!

### 4.3. Friend Search Parity
In `searchProfilesByName()` (`src/lib/friends.ts`):
- Bots **are intentionally included**. When a user types a query like "moss" or "tea", bots matching that display name appear with an "Add friend" button.

### 4.4. Unified Catalog Parity (`/pages/library`)
When a real user adds a bot as a friend, the bot appears in `listAcceptedFriends()`.
In `listCatalogFeed()` (`src/lib/catalog.ts`), logs from all accepted friends are fetched:
- By having bots automatically record the media items they author into `book_logs`, `movie_logs`, and `album_logs`, the bot's logs immediately appear with their custom display name and avatar in the user's "Friends Catalog" feed!

---

## 5. Bot Pool Reusability Strategy

To prevent database bloat when running multiple generations:
1. When the admin sets `botCount = N`:
   - Server queries:
     ```sql
     SELECT id, display_name, avatar, avatar_url 
     FROM public.profiles 
     WHERE id::text LIKE 'b075%' OR auth0_sub LIKE 'bot|%'
     ```
   - If `existingBots.length >= N`:
     - **Zero username API calls** are made.
     - The server samples $N$ bots from the existing pool.
   - If `existingBots.length < N`:
     - Calculate delta $M = N - \text{existingBots.length}$.
     - Prompt the Gemini API for **only** $M$ new usernames.
     - Insert $M$ new profiles with `generateBotId()` and randomized pixel avatars.
     - Combine with existing bots to form the full pool of $N$ bots.

---

## 6. Prompt Engineering & Batch Generation Strategy

All text generation uses **`gemma-4-31b-it`** with few, large prompts.

```
+-------------------------------------------------------------------------------+
| PHASE 1: Usernames (Only if delta M > 0)                                      |
| 1 API Call -> ["MossyPages", "ConstellationSeeker", "SpineAndNeedle", ...]    |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 2: Forum Posts                                                          |
| 1 API Call -> Batch of P complete posts (title, content, media_type, title)   |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 3: Threaded Comments & Replies                                          |
| 1 API Call -> Nested comment map for all generated posts ({post_0: [...]})    |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 4: Server-Side Orchestration (NO API CALLS)                             |
| Author assignment, catalog logs, topological comment insert, vote simulation  |
+-------------------------------------------------------------------------------+
```

### 6.1. Robust JSON Extraction (`src/lib/gemini.ts`)
Gemma models occasionally return markdown code fences (````json ... ````) or introductory prose. The client utilizes a hardened extractor:
```typescript
export function extractAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract substring between first [ / { and last ] / }
    const firstBracket = cleaned.search(/[\[\{]/);
    const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as T;
    }
    throw new Error(`Failed to parse JSON response from Gemma 4: ${rawText.slice(0, 100)}...`);
  }
}
```

### 6.2. Prompt 1: Username Delta Batch (LLM)
- **Trigger**: Only when $M = \text{requested} - \text{existing} > 0$.
- **Prompt**:
  ```text
  You are a naming engine for "Storyhaven", a cozy retro fantasy pixel library where readers, cinephiles, and vinyl listeners gather.
  Generate a JSON array of exactly {{M}} unique, creative, evocative usernames.
  Guidelines:
  - Themes: antique books, cozy tea, botany, vinyl grooves, cinema, constellations, quiet rain, late-night reading.
  - Formats: CamelCase or kebab-case or single words (e.g., "MossyFolio", "StarlightSpine", "TeaAndTolkien", "CinephileCat", "NocturneReader").
  - Output MUST be valid JSON only with no markdown formatting:
  ["Username1", "Username2", ...]
  ```

### 6.3. Prompt 2: Batch Forum Posts (LLM)
- **Prompt**:
  ```text
  You are community members posting on Storyhaven's cozy library forum. 
  Generate a JSON array of exactly {{postCount}} realistic forum posts.
  Categories to cover: 'book', 'movie', 'album', 'general'.
  Output MUST be valid JSON array of objects:
  [
    {
      "title": "Post title (max 200 chars, thoughtful or intriguing)",
      "content": "Post body in markdown (1 to 4 paragraphs)",
      "media_type": "book" | "movie" | "album" | "general",
      "media_title": "Optional exact title of work, or null"
    }
  ]
  ```

### 6.4. Prompt 3: Threaded Comments & Replies (LLM)
- **Prompt**:
  ```text
  Here is a list of {{postCount}} forum posts from Storyhaven:
  {{postsContextSummary}}

  Generate a total of {{commentCount}} thoughtful comments and replies.
  Requirements:
  1. Include both initial reactions (top-level) and conversational replies (subcomments).
  2. Target approximately {{nestedRatio}}% of comments to be replies to preceding comments.
  3. Reference preceding comments by temporary identifier ("temp_id") to establish parent-child relationships.
  Output MUST be a JSON object mapping each post index to its comments list:
  {
    "post_0": [
      {
        "temp_id": "c1",
        "content": "Comment text...",
        "parent_temp_id": null
      },
      {
        "temp_id": "c2",
        "content": "Reply to c1...",
        "parent_temp_id": "c1"
      }
    ]
  }
  ```

---

## 7. Server-Side Execution & Scrutiny Fixes

### 7.1. Topological Comment Insertion (Fixes Foreign Key Ordering)
Subcomments cannot be inserted until their parent comment exists in the database.
- **Algorithm**:
  1. For each post, divide comments into tiers based on parent dependency depth.
  2. Tier 0: Comments with `parent_temp_id === null`. Insert first; save returned `id` in `tempIdToDbId[temp_id]`.
  3. Tier 1: Comments whose `parent_temp_id` is in `tempIdToDbId`. Set `parent_id = tempIdToDbId[parent_temp_id]` and insert. Save their `id`s.
  4. Repeat until all comments are inserted. Any orphaned comment is inserted with `parent_id = null`.

### 7.2. Automatic Bot Catalog Population
When a bot authors a post referencing a `media_title`:
- If `media_type === "book"`: Server automatically inserts a record into `public.book_logs` (`profile_id: bot.id, name: media_title, liked: true, rating: 4.5, status: 'finished'`).
- If `media_type === "movie"`: Inserts into `public.movie_logs` (`profile_id: bot.id, name: media_title, liked: true, rating: 4.5, runtime: 110`).
- If `media_type === "album"`: Inserts into `public.album_logs` (`profile_id: bot.id, name: media_title, liked: true, rating: 4.5`).
- **Result**: The bot immediately has a genuine, populated personal shelf and catalog reflecting what they talk about!

### 7.3. Vote De-Duplication & Scoring
PostgreSQL enforces `unique (profile_id, post_id)` and `unique (profile_id, comment_id)`:
- Server maintains a tracking set `castVotes = new Set<string>()`.
- For each post/comment, samples a random subset of bot IDs from the pool.
- Validates `!castVotes.has(`${botId}:${targetId}`)`.
- Inserts with 90% upvotes (`vote_value = 1`) and 10% downvotes (`vote_value = -1`).
- The database trigger `update_forum_vote_score` automatically updates `score`, `upvotes`, and `downvotes`.

### 7.4. Staggered Timestamps
To avoid all posts having the exact same millisecond:
- Post timestamps are distributed across the configured time window (e.g. past 1–7 days).
- Comment timestamps are calculated as `post.created_at + randomDelay(10 minutes, 18 hours)`.
- Subcomment timestamps are calculated as `parent.created_at + randomDelay(5 minutes, 6 hours)`.

### 7.5. Pixel Character Generator
For each new bot inserted into `public.profiles`, the server generates an authentic avatar JSON structure:
- Samples randomly from `AVATAR_OPTIONS` (`skin`, `eyes`, `mouth`, `top`, `topColor`, `hair`, `hairColor`, `accessory`).
- Stored as `profiles.avatar (jsonb)`.
- Bots visually render with rich pixel art characters across forum posts, DMs, and friend lists.

---

## 8. Admin Console UI & Real-Time Progress Streaming

### 8.1. Timeout Avoidance via Server-Sent Events (SSE)
Because calling the Gemini API 2–3 times and inserting dozens of rows can take 15–30 seconds, running this inside a single blocking server action risks Vercel/Next.js request timeouts.
- **Solution**: A dedicated Route Handler `POST /api/admin/bots/generate`.
- Uses `TransformStream` to stream real-time JSON event packets to the Admin UI:
  ```json
  {"type": "progress", "step": 1, "totalSteps": 4, "message": "Reusing 8 existing bots; generating 2 new usernames..."}
  {"type": "progress", "step": 2, "totalSteps": 4, "message": "Generated 6 forum posts via Gemma 4 31B..."}
  {"type": "progress", "step": 3, "totalSteps": 4, "message": "Threaded 18 comments and replies..."}
  {"type": "progress", "step": 4, "totalSteps": 4, "message": "Simulated 45 community votes & populated catalogs..."}
  {"type": "complete", "summary": { "bots": 10, "posts": 6, "comments": 18, "votes": 45 }}
  ```

### 8.2. Admin UI Component (`BotGeneratorPanel.tsx`)
- Placed inside `/app/admin/page.tsx` behind `ADMIN_PASSWORD` verification.
- **Controls**:
  - `Bot Count` (number input, 2–50)
  - `Post Count` (number input, 1–25)
  - `Comment Count` (number input, 2–80)
  - `Nested Reply Ratio` (slider, 0%–70%)
  - `Simulate Voting` (checkbox, default checked)
- **Live Community Stats Badge**:
  - Shows: `Active Bots: X | Bot Posts: Y | Bot Comments: Z`.
- **Action Buttons**:
  - `[Generate Bots & Content]`: Displays live progress stepper and animated status.
  - `[Purge All Bot Content]`: Red button with confirmation dialog.

---

## 9. Purge & Cleanup Safety

Because all bot accounts have `id LIKE 'b075%'` and `auth0_sub LIKE 'bot|%'`, and all related tables (`forum_posts`, `forum_comments`, `forum_votes`, `book_logs`, `movie_logs`, `album_logs`, `friendships`, `dm_messages`) have `ON DELETE CASCADE` foreign keys referencing `public.profiles(id)`:

```typescript
export async function purgeBots(password: string): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized." };
  }

  const supabase = createServiceSupabaseClient();
  const { data: deleted, error } = await supabase
    .from("profiles")
    .delete()
    .like("id", "b075%")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, count: deleted?.length ?? 0 };
}
```
Executing this single query instantly and atomically removes:
- All bot profiles
- All bot forum posts
- All bot comments
- All bot votes
- All bot catalog logs
- All bot friendships and direct messages
- Leaves human user profiles and content 100% untouched.

---

## 10. Step-by-Step Implementation Roadmap

- [ ] **Step 1: Bot Identity Module (`src/lib/bots.ts`)**
  - Implement `isBotId()`, `generateBotId()`, `isBotProfile()`, `generateRandomBotAvatar()`.
- [ ] **Step 2: Matching Exclusion Filters**
  - Update `src/lib/match-drop.ts` (`runMatchDrop`, `getActiveProfiles`, `getAdminMatchStatus`) to filter out `isBotId`.
  - Update `src/lib/friends.ts` (`listMatchCandidates`) to exclude `isBotId`.
- [ ] **Step 3: Friend Request Auto-Accept & Automated DM Replies**
  - In `src/lib/friends.ts` (`sendFriendRequest`), check `if (isBotId(addresseeId))`: automatically set `status: 'accepted'`.
  - In `src/lib/friends.ts` (`sendDmMessage`), check `if (isBotId(recipientId))`: generate automated in-character DM reply via Gemma 4 and save to `dm_messages`.
- [ ] **Step 4: Gemini Client (`src/lib/gemini.ts`)**
  - Implement API caller targeting `gemma-4-31b-it` using `process.env.GEMINI_API_KEY`.
  - Implement robust `extractAndParseJson()` with markdown code fence stripping.
  - Implement `generateDmReply()` for conversational one-on-one replies.
- [ ] **Step 5: Bot Generation Service (`src/lib/bot-generator.ts`)**
  - Implement pool query & delta username generation.
  - Implement post generation & automatic media catalog log population (`book_logs`, `movie_logs`, `album_logs`).
  - Implement topological comment insertion (Tier 0 root comments -> Tier 1 subcomments).
  - Implement vote simulation with de-duplication.
  - Implement purge function.
- [ ] **Step 6: Admin Route Handler & Actions (`src/app/api/admin/bots/generate/route.ts` & `src/app/admin/bot-actions.ts`)**
  - Implement SSE streaming route for live generation progress.
  - Implement `purgeBotsAction` and `getBotStatsAction`.
- [ ] **Step 7: Admin UI Panel (`src/app/admin/BotGeneratorPanel.tsx` & `page.tsx`)**
  - Build configuration controls, live progress stepper, stats banner, and purge modal.
- [ ] **Step 8: End-to-End Verification**
  - Run test generation with 4 bots, 2 posts, 6 comments.
  - Verify forum feed displays posts with author avatars and badges.
  - Verify comments and subcomments are nested properly.
  - Send friend request to bot -> verify instant auto-accept.
  - Send direct message to bot -> verify bot automatically replies in character.
  - Check Library page -> verify bot's catalog entries appear in Friends feed.
  - Run Match Drop dry-run -> verify 0 bots are matched.
  - Click "Purge Bot Content" -> verify complete, clean removal.
