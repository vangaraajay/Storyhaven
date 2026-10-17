# INTEGRATION.md — Story Haven pre-pixel-UI audit

Read-only audit; no code was changed. Paths are relative to the repo root. Line numbers are as of commit `ca1a3b4`.

## 0. Where the brief doesn't match the repo

| Assumption | Reality |
|---|---|
| Tailwind | **Not installed.** No `tailwindcss`/`postcss` in `package.json`, no config files. Styling is plain CSS (section 4). The Tailwind-looking classes in `src/components/forum/MarkdownRenderer.tsx:87,96` (`mb-2 last:mb-0 leading-relaxed break-words`, `text-sm`) do nothing. |
| Shared Button/Input/Tab/Toast/Avatar/Icon components | **None exist.** Every button/input is a raw element plus a CSS class (or nothing). Only 3 files live in `src/components/`. |
| Pixel art not yet in the app | ~91 PNGs are already in `public/` (avatar parts, hair, eyes, clothes, `tab`, `tab_active`, `toast`, `input_field`, `input_field_focus`, `Button*`, `frame`, `star_empty/full`, `upvote`, `badge`, `Trophy`, `chest*`, …) but **no code references any of them**. The Phaser scene draws rects/Graphics and loads no images. |
| Stories + story comments | Daily Story is a hard-coded file (`src/app/pages/daily-story/story.ts`). There is no story table and **no story-comment feature**. |
| `profiles`, shelves, unlocks | `profiles` DDL is **not in the repo** (no SQL file). No avatar/unlock/shelf tables exist (section 5). |

## 1. Routes

| URL | File | Shows |
|---|---|---|
| `/` | `src/app/page.tsx` (+ `haven/HavenHome.tsx`, `phaser/PhaserGame.tsx`) | Auth gate, then the Phaser "haven" world; walking onto a zone navigates to the pages below. |
| `/pages/login` | `src/app/pages/login/page.tsx` | Log in / Sign up links (Auth0). |
| `/pages/profile` | `src/app/pages/profile/page.tsx` | Create-profile form (display name, avatar URL); redirects to `/` if already complete. |
| `/pages/library` | `src/app/pages/library/page.tsx` | Create/edit/delete book, movie and album logs. |
| `/pages/daily-story` | `src/app/pages/daily-story/page.tsx` | Static daily story text (login required). |
| `/pages/friends` | `src/app/pages/friends/page.tsx` | Match candidates, friend requests, DMs, group chats. |
| `/pages/forum` | `src/app/pages/forum/page.tsx` | Forum feed (Discover/Top/New, category filter, per-book hubs, create-post modal). |
| `/pages/forum/[postId]` | `src/app/pages/forum/[postId]/page.tsx` | Thread view with nested comments, votes, reply forms. |
| `/auth/*` | `src/proxy.ts` (Auth0 middleware) | Login/logout/callback; no page file. |

Layout: `src/app/layout.tsx` (dark `color-scheme`, imports `globals.css`). No other layouts.

## 2. Shared UI inventory

"Importers" = distinct files that import the component.

### Under `src/components/forum/`
| Component | Role | Props | Importers |
|---|---|---|---|
| `VoteControls.tsx` | button pair + score, inline SVG arrows | `targetType: "post"\|"comment"`, `targetId`, `initialScore`, `initialUserVote`, `isLoggedIn`, `layout?: "vertical"\|"horizontal"` | 3 — `forum/PostCard.tsx`, `forum/[postId]/CommentItem.tsx`, `forum/[postId]/ThreadView.tsx` |
| `MediaBadge.tsx` | badge (pill, emoji icon, per-type colors) | `type: MediaType`, `title?`, `className?`, `onClick?` | 2 — `PostCard.tsx`, `ThreadView.tsx` |
| `MarkdownRenderer.tsx` | text/spoiler/blockquote renderer (inline styles) | `content`, `className?` | 3 — `PostCard.tsx`, `CommentItem.tsx`, `ThreadView.tsx` |

### Forum-local (`src/app/pages/forum/`)
| Component | Role | Props | Importers |
|---|---|---|---|
| `FeedTabs.tsx` | **tab bar** (Discover/Top/New) | `currentSort`, `onChangeSort` | 1 — `ForumFeed.tsx` |
| `FeedModeToggle.tsx` | 2-button toggle (tab-like) | `mode`, `onChangeMode` | 1 — `ForumFeed.tsx` |
| `CategoryFilter.tsx` | chip bar (tab-like) | `currentFilter`, `onChangeFilter` | 1 — `ForumFeed.tsx` |
| `CreatePostModal.tsx` | **modal** (`forum-modal-backdrop/box/close`) | `isOpen`, `onClose`, … (225 lines) | 1 — `ForumFeed.tsx` |
| `DeleteControl.tsx` | danger button, uses `window.confirm` (`:26`) | union `{kind:"post",postId}` \| `{kind:"comment",commentId,postId}` | 3 — `PostCard.tsx`, `CommentItem.tsx`, `ThreadView.tsx` |
| `PostCard.tsx` | **card** (`forum-post-card`) | `post`, `isLoggedIn`, `currentProfileId`, `onSelectBook?` | 1 — `ForumFeed.tsx` |
| `BookDetailHeader.tsx` | banner panel | `bookTitle`, `postCount?`, `commentCount?`, `onClearBook` | 1 — `ForumFeed.tsx` |
| `BookHubSelector.tsx` | panel + search input + buttons | — | 1 — `ForumFeed.tsx` |
| `ForumFeed.tsx` | page body | — | 1 — `forum/page.tsx` |
| `[postId]/CommentForm.tsx` | textarea + buttons | — | 2 — `CommentItem.tsx`, `ThreadView.tsx` |
| `[postId]/CommentItem.tsx` | comment card | — | 1 — `CommentTree.tsx` |
| `[postId]/CommentTree.tsx` | list | — | 1 — `ThreadView.tsx` |
| `[postId]/ThreadView.tsx` | thread body | — | 1 — `[postId]/page.tsx` |

### Other pages (each used by exactly one parent, no reuse)
`friends/FriendsShell.tsx` (→ `friends/page.tsx`), `friends/ChatPanel.tsx`, `friends/MatchPanel.tsx`, `friends/NewGroupForm.tsx` (→ `FriendsShell.tsx`), `library/CreateLogForms.tsx`, `library/LibraryEntries.tsx` (→ `library/page.tsx`), `profile/ProfileForm.tsx` (→ `profile/page.tsx`).

### Categories requested
| Category | Shared component? | What exists |
|---|---|---|
| Button | **none** | Raw `<button>` in 17 files (~45 sites). Classes: `forum-btn-primary/secondary/ghost/danger`, `forum-modal-close`; friends buttons styled via `.friends-*` descendants in `globals.css`; library/profile buttons are unstyled browser defaults. |
| Card / panel | `PostCard` (forum only) | `.forum-post-card`, `.forum-empty-card`, `.forum-modal-box`, `.forum-book-banner`; friends bubbles `.friends-bubble`. |
| Input | **none** | ~75 raw `<input>/<select>/<textarea>` (CreateLogForms ≈26, LibraryEntries ≈27, MatchPanel 5, CreatePostModal 4, ChatPanel, NewGroupForm, CommentForm, BookHubSelector, ProfileForm). |
| Tab bar | `FeedTabs`, `CategoryFilter`, `FeedModeToggle` | Forum only. Library has no tabs (books/movies/albums are stacked sections). |
| Badge | `MediaBadge` | Plus `.friends-badge` (plain text span) and `.forum-book-banner-tag`. |
| Toast / notification | **none** | Errors are inline `<p>`/spans (`.friends-error`, `.forum-delete-error`, `ProfileForm.tsx:46`); loading is `⏳` emoji / `role="status"` divs (`app/page.tsx:41`, `HavenHome.tsx:8`, `forum/page.tsx:114`, `[postId]/page.tsx:59`). |
| Modal | `CreatePostModal` only | Hand-rolled backdrop (`forum.css:817`, `backdrop-filter: blur(8px)`), no focus trap. Delete uses native `window.confirm`. |
| Avatar / profile picture | **none** (CSS class only) | `.forum-avatar` (first-letter circle, `forum.css:619`) at `PostCard.tsx:61`, `CommentItem.tsx:64` (inline 20px override), `ThreadView.tsx:76`. `avatar_url` is edited in `ProfileForm.tsx:38-45` and selected in queries but **never rendered as an image**. Friends list/chat show names only. |
| Icon | **none** | Emoji everywhere: `FeedTabs` (🎲🔥✨), `CategoryFilter` (🌌📚🎬🎵☕), `FeedModeToggle` (🌐📖), `MediaBadge` (📚🎬🎵☕), `BookDetailHeader.tsx:22` (📖), `PostCard.tsx:97` (💬), `⏳`. Only real icons: 2 inline `<svg>` arrows in `VoteControls.tsx:98,121`. |

## 3. One-off UI (styled inline instead of via a shared component)

**Inline-styled buttons / link-buttons**
- `forum/BookDetailHeader.tsx:29-41` ("Switch Book"), `:55-60` (Link styled as `forum-btn-secondary` + inline color)
- `forum/CreatePostModal.tsx:174-185` (Preview/Write toggle), `:97` (inline-styled button), `:215` (opacity inline)
- `forum/[postId]/CommentForm.tsx:124-135`, `:153`
- `forum/[postId]/CommentItem.tsx:74-77` (collapse toggle)

**Unstyled / class-only raw buttons** (candidates for PixelButton)
- `friends/ChatPanel.tsx:139`; `friends/MatchPanel.tsx:59,73,87,97`; `friends/NewGroupForm.tsx:43`
- `library/CreateLogForms.tsx:83,129,171`; `library/LibraryEntries.tsx:40,45,149,152,176,181,262,265,288,293,364,367`
- `profile/ProfileForm.tsx:47`
- `forum/ForumFeed.tsx:189,259`; `forum/BookHubSelector.tsx:53,73,95`; `forum/CreatePostModal.tsx:71,85,204,211`; `forum/[postId]/CommentForm.tsx:72,140,149`; `forum/[postId]/CommentItem.tsx:102`; `forum/DeleteControl.tsx:59`
- Tab-like: `FeedTabs.tsx:22`, `CategoryFilter.tsx:27`, `FeedModeToggle.tsx:11,19`

**Inline-styled cards / panels / avatars**
- `forum/ForumFeed.tsx:170,239,247,283,292,298`; `forum/page.tsx:114-115`; `forum/[postId]/page.tsx:59-60`
- `forum/[postId]/CommentForm.tsx:67,69,86,88,94,109,123,138`; `CommentTree.tsx:21,22,30`
- `forum/[postId]/CommentItem.tsx:49,63,64 (avatar),67-69,86,90,121,138`; `ThreadView.tsx:48,52,81,84,101,108,119-125`
- `forum/PostCard.tsx:66,69`; `forum/BookHubSelector.tsx:64,65,89,90,103`
- `components/forum/MarkdownRenderer.tsx:20 (spoiler), :73 (blockquote), :96`; `components/forum/MediaBadge.tsx:44` (color tokens inline)

There are ~60 `style={{…}}` occurrences, all in `src/app/pages/forum/**` and `src/components/forum/**`, plus `app/layout.tsx:17`. Friends/library/profile/login use class names (or nothing) and have no inline styles.

## 4. Styling

- **Tailwind:** none. No `tailwind.config.*`, `postcss.config.*`. No CSS modules (`*.module.css`: none).
- **Files:** `src/app/globals.css` (~310 lines; `@import`s forum.css) and `src/app/pages/forum/forum.css` (1057 lines). Imported once from `layout.tsx`.
- **Colors (Rosé Pine dark):** CSS vars in `forum.css:10-33`:
  `--forum-bg-base #191724`, `-surface #232136`, `-overlay #2a273f`, `-subtle #1f1d2e`, `-highlight #3e2f42`; text `#e0def4 / #908caa / #6e6a86`; accents gold `#f6c177`, rose `#eb6f92`, foam `#9ccfd8`, iris `#c4a7e7`, pine `#31748f`; borders `rgba(235,188,186, .12/.2/.35)`. `globals.css` and Phaser (`src/phaser/constants/colors.ts`) hardcode the same hex values separately. Button gradient oranges `#e08b29/#bd6111/#f09b38/#cf6f1b` (`forum.css:134,151`) are off-palette.
- **Fonts:** `--forum-font-sans: Outfit`, `--forum-font-mono: JetBrains Mono`, loaded via a runtime Google Fonts `@import url(...)` at `forum.css:7` (not `next/font`). `globals.css` body uses `system-ui`. Phaser text uses `fontFamily: "monospace"` (`MainScene.ts:107,252,268`, `Furniture.ts:53`).
- **Theme inconsistency:** `globals.css` `main { background:#fff; color:#111 }` makes login/profile/library/friends/daily-story **light**; `main.forum-main` (forum only) is dark via `!important` overrides (`forum.css:36-42`). Body background is `#191724`. A pixel kit needs one theme decision.
- **Class families:** `.forum-*` in forum.css; `.friends-*`, `.daily-story*`, `.login-page`, `.haven-loading`, `.phaser-root` in globals.css. Library and profile pages have no styling at all.
- **Global resets:** `* {margin:0;padding:0}` in globals; `.forum-main button {border:none;background:none;…}` in forum.css (so forum buttons have no native look, others do).

## 5. Data (Supabase)

Server uses the service-role client only (`src/lib/supabase/server.ts`) after Auth0; every table has RLS enabled and anon/authenticated access revoked. SQL: `supabase/logging_tables.sql`, `forum_tables.sql`, `friends_tables.sql`.

| Area | Table | Columns |
|---|---|---|
| Profiles/avatars | `profiles` (**DDL not in repo**; shape from `src/lib/profiles.ts:5-13`) | `id`, `auth0_sub`, `email`, `display_name`, `avatar_url`, `created_at`, `updated_at` |
| Media logs | `book_logs` | `id`, `profile_id`, `name`, `cover_url`, `rating numeric(2,1) 0-5`, `started_date`, `finished_date`, `liked`, `review`, `status (want/reading/finished/dropped)`, `pages`, timestamps |
| | `movie_logs` | same minus `started_date/status/pages`, plus `runtime` |
| | `album_logs` | `id`, `profile_id`, `name`, `cover_url`, `rating`, `finished_date`, `liked`, `review`, timestamps |
| Forum | `forum_posts` | `id`, `profile_id`, `title`, `content`, `media_type (book/movie/album/general)`, `media_title`, `score/upvotes/downvotes/comments_count`, `random_bucket`, timestamps |
| | `forum_comments` | `id`, `post_id`, `parent_id`, `profile_id`, `content`, `score/upvotes/downvotes`, timestamps |
| | `forum_votes` | `id`, `profile_id`, `post_id`/`comment_id`, `vote_value ±1` (triggers maintain scores/counts) |
| Friends/chat | `friendships`, `dm_messages`, `chat_groups`, `chat_group_members`, `group_messages` | see `friends_tables.sql` |
| Shelves | — | **none** (the "bookshelf" is a Phaser landmark linking to `/pages/library`) |
| Unlocks/achievements | — | **none** |
| Stories | — | **none** (static `story.ts`; no story comments) |

**Missing vs the requested schema**
- `profiles.avatar jsonb` — missing. (`avatar_url text` exists; keep or deprecate.)
- `profiles.shelf_theme` — missing.
- `unlocks(user_id, item_key, unlocked_at)` — table missing.
- `shelf_items(user_id, slot, item_key)` — table missing.
- Naming: every FK in this repo is `profile_id` → `profiles.id`, never `user_id`. Recommend `profile_id` in new tables (and a PK/unique on `(profile_id,item_key)` and `(profile_id,slot)`). Also add RLS-enabled + `revoke` lines like the others, and add a `profiles` DDL file so the schema is reproducible.
- Code to change when columns are added: `Profile` type and `saveProfile` upsert (`src/lib/profiles.ts:5,36`), `profile/actions.ts`, `ProfileForm.tsx`. `getProfile` uses `select("*")`, so it picks up new columns automatically. Explicit `display_name, avatar_url` selects need `avatar` added to render avatars: `src/lib/forum.ts:8-10` (type) and `:153,191,230,301,326`; `src/lib/friends.ts:18,80-85` (types) and `:241,304,361,427,903`.

## 6. Events — where saves happen (hook points for unlock checks)

All are server-side; hook after the successful write and before returning.

| Event | Action (entry) | DB write |
|---|---|---|
| Log created (book/movie/album) | `createBookAction` / `createMovieAction` / `createAlbumAction` — `src/app/pages/library/actions.ts:87 / 105 / 123` | `createBookLog` / `createMovieLog` / `createAlbumLog` in `src/lib/logging.ts` |
| Review written | no separate event: `review` is a column on the log row. Counts on create (above) **or** edit: `updateBookAction` / `updateMovieAction` / `updateAlbumAction` — `library/actions.ts:141 / 160 / 179` → `updateBookLog` etc. | `book_logs`/`movie_logs`/`album_logs` update |
| Forum post | `createPostAction` — `src/app/pages/forum/actions.ts:38` | `forum_posts` insert (~`:66`) |
| Forum comment | `createCommentAction` — `forum/actions.ts:91` | `forum_comments` insert (~`:110`) |
| Forum vote | `voteAction` — `forum/actions.ts:134` → `castVote` `src/lib/forum.ts:418` | `forum_votes` upsert/delete |
| Match / friend request | `addFriendAction` — `src/app/pages/friends/actions.ts:49` → `sendFriendRequest` `src/lib/friends.ts:440` | `friendships` insert (`:487`) |
| Match accepted | `acceptRequestAction` — `friends/actions.ts:68` → `acceptFriendRequest` `friends.ts:522` | `friendships` update |
| DM / group message | `sendDmAction :144` → `sendDmMessage friends.ts:694`; `sendGroupMessageAction :164` → `sendGroupMessage :859`; `createGroupAction :220` → `createGroup :774` | `dm_messages`, `group_messages`, `chat_groups` |
| Profile created | `createProfileAction` (`profile/actions.ts:11`) → `saveProfile` (`lib/profiles.ts:36`) | `profiles` upsert |
| Story comment | **does not exist** — nothing to hook; needs a feature first | — |

Notes: no shared "after write" function exists, so each action would call a new `checkUnlocks(profileId, event)`. Forum actions already call `revalidatePath`; there is no client toast channel, so newly unlocked items need a return value (add to the action result types, e.g. `{ error, postId, unlocked? }`) that a Toast can show. `library/actions.ts` delete/create actions return `void`/redirect-style results and would need the same treatment.

## 7. Risks for pixel art

1. **next/image:** not used anywhere (`<img>`/`next/image`: 0 hits). No optimizer problem today. When adding PNGs, either use plain `<img>`/CSS `background-image` with `image-rendering: pixelated` or set `images.unoptimized: true` in `next.config.ts` (currently no `images` config). Never let the optimizer resize/re-encode sprites to WebP/AVIF.
2. **No `image-rendering` anywhere**, so any scaled sprite will be bilinear-blurred. Phaser already has `pixelArt: true` (`phaser/game.ts:27`) but uses `Scale.FIT` on 800×600 (non-integer scaling → uneven pixels); consider integer zoom and `roundPixels`.
3. **Rounded corners:** `border-radius` ×27 in `forum.css` (lines 142,181,204,256,270,303,345,371,399,425,470,501,540,574,622,681,717,764,786,838,871,900,945,978,986,1011,1044; incl. 18–20px cards, 9999px pills, 50% avatar) and ×4 in `globals.css` (160,252,263,300).
4. **Shadows:** `box-shadow`/`drop-shadow` on ~28 lines of `forum.css` (143,144,147,153,160,167,190,258,288,296,306,392,405,433,476,518,562,577,579,585,791,798,842,905,914,946,1047,1056).
5. **Transitions/transforms:** ~31 lines (`forum.css` 147-1055) incl. hover `translateY(-2px)` on cards/buttons (`:152,583`), `scale(1.15)` (`:732,737`), `cubic-bezier` easing (`:579`), `@keyframes forumFadeIn` (`:830`). Sub-pixel translate/scale blurs pixel art; use `steps()` or none.
6. **Blur/gradients:** `backdrop-filter: blur(8px)` (`:822`), `filter: blur(4px)` on spoilers (`MarkdownRenderer.tsx:23`), 3 linear gradients (`:115,134,151`), `filter: brightness()` (`:154,778`).
7. **Fractional sizing & fonts:** rem/em sizes (0.725rem, 0.775rem…) and anti-aliased Outfit/JetBrains Mono. A pixel font needs integer px multiples and `font-smooth`/`-webkit-font-smoothing: none`.
8. **Emoji icons** (section 2) will not match sprite icons; replace via the Icon component.
9. **Light vs dark pages** (section 4) — frame/tab sprites are drawn for one palette.
10. **Asset hygiene in `public/`:** filenames with spaces/trailing space (`Button copy.png`, `Button copy 2.png`, `board .png`, `flat copy.png`, `record player.png`) and mixed case (`Button.png`, `Trophy.png`) — rename before referencing. Duplicates (`Button copy*`, `flat copy`) look like leftovers. Several states exist as separate files (`tab`/`tab_active`, `input_field`/`input_field_focus`, `chest`/`chest_open`/`chest_opening`, `eyes_*` ×4 directions) — decide sprite-sheet vs per-file loading.
11. **CSS specificity:** `forum.css` uses `!important` on `main.forum-main` and a `.forum-main button` reset, and globals style `.friends-* button` by descendant selector, so new `PixelButton` classes may lose specificity fights unless the old rules are removed first.
12. **Modal:** no focus trap / Esc handling; `window.confirm` in `DeleteControl.tsx:26` can't be themed.

## 8. Component → replacement → files touched

| Current component / pattern | Replaced by | Files touched |
|---|---|---|
| Raw `<button>` + `.forum-btn-primary/secondary/ghost/danger`, `.forum-modal-close`, `.friends-*` buttons, unstyled library/profile submit buttons | **PixelButton** | `ForumFeed.tsx`, `BookHubSelector.tsx`, `BookDetailHeader.tsx`, `CreatePostModal.tsx`, `DeleteControl.tsx`, `CommentForm.tsx`, `CommentItem.tsx`, `ChatPanel.tsx`, `MatchPanel.tsx`, `NewGroupForm.tsx`, `CreateLogForms.tsx`, `LibraryEntries.tsx`, `ProfileForm.tsx` (+ `VoteControls.tsx` arrows) — 14 files; CSS: `forum.css`, `globals.css` |
| `.forum-post-card`, `.forum-empty-card`, `.forum-modal-box`, `.forum-book-banner`, `.friends-bubble`, inline-styled panels (`ForumFeed.tsx:239,283`, `CommentForm.tsx:67,88`, `CommentTree.tsx:21`), library entry blocks | **PixelFrame** | `PostCard.tsx`, `ThreadView.tsx`, `CommentItem.tsx`, `CommentTree.tsx`, `CommentForm.tsx`, `CreatePostModal.tsx`, `BookDetailHeader.tsx`, `BookHubSelector.tsx`, `ForumFeed.tsx`, `forum/page.tsx`, `[postId]/page.tsx`, `ChatPanel.tsx`, `FriendsShell.tsx`, `MatchPanel.tsx`, `LibraryEntries.tsx`, `CreateLogForms.tsx` — 16 files |
| Raw `<input>/<select>/<textarea>` (~75) | **PixelInput** (uses `input_field(_focus).png`) | `CreateLogForms.tsx`, `LibraryEntries.tsx`, `MatchPanel.tsx`, `ChatPanel.tsx`, `NewGroupForm.tsx`, `CreatePostModal.tsx`, `CommentForm.tsx`, `BookHubSelector.tsx`, `ProfileForm.tsx` — 9 files |
| `FeedTabs`, `CategoryFilter`, `FeedModeToggle` (and Library section switching if added) | **PixelTabs** (`tab.png`/`tab_active.png`) | `FeedTabs.tsx`, `CategoryFilter.tsx`, `FeedModeToggle.tsx`, `ForumFeed.tsx` — 4 files |
| `MediaBadge`, `.forum-badge`, `.friends-badge`, `.forum-book-banner-tag` | **Badge** (`badge.png`) | `MediaBadge.tsx`, `PostCard.tsx`, `ThreadView.tsx`, `BookDetailHeader.tsx`, `MatchPanel.tsx`/`FriendsShell.tsx` (`friends-badge`) — 5 files |
| Inline errors/loading (`.friends-error`, `.forum-delete-error`, `ProfileForm.tsx:46`, `⏳` blocks, `window.confirm`) + new unlock notifications | **Toast** (`toast.png`) | `DeleteControl.tsx`, `ForumFeed.tsx`, `forum/page.tsx`, `[postId]/page.tsx`, `ProfileForm.tsx`, `ChatPanel.tsx`, `MatchPanel.tsx`, `NewGroupForm.tsx`, `layout.tsx` (toast host) + the server actions that return `unlocked` — ~9 files + 3 action files |
| `.forum-avatar` ×3, plain-text names in friends lists/chat, `avatar_url` field | **Avatar** (composited from avatar parts; needs `profiles.avatar`) | `PostCard.tsx:61`, `CommentItem.tsx:64`, `ThreadView.tsx:76`, `FriendsShell.tsx`, `MatchPanel.tsx`, `ChatPanel.tsx`, `ProfileForm.tsx`, `lib/forum.ts`, `lib/friends.ts`, `lib/profiles.ts`, `profile/actions.ts` — 11 files |
| Emoji icons + 2 inline SVGs | **Icon** | `FeedTabs.tsx`, `CategoryFilter.tsx`, `FeedModeToggle.tsx`, `MediaBadge.tsx`, `BookDetailHeader.tsx`, `PostCard.tsx`, `VoteControls.tsx`, `ForumFeed.tsx` (`⏳`), `forum/page.tsx`, `[postId]/page.tsx` — 10 files |

Foundational (not in the table): add `images` config or `<img>` with `image-rendering: pixelated`; one shared pixel CSS (tokens, no radius/shadow/transition); `next/font` pixel font; decide light vs dark theme for `main`; rename `public/` assets; add `profiles` DDL, `unlocks`, `shelf_items`, `profiles.avatar`, `profiles.shelf_theme`.
