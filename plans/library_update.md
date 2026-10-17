# Storyhaven Library Update — Architecture & Implementation Plan

**Branch:** `lib-update`  
**Route:** `/pages/library`  
**Target Files:**  
- `src/app/pages/library/page.tsx` (Pre-loads catalog Page 1; mounts CatalogSection above creation forms)  
- `src/app/pages/library/CreateLogForms.tsx` (Integrates CoverPreviewBox, hidden cover_url input, manual URL override, & submission reset)  
- `src/app/pages/library/CoverPreviewBox.tsx` (New: 72×108 preview rectangle, 1s debounce + onBlur, spinning loader, gray fallback, abort controller)  
- `src/app/pages/library/CatalogSection.tsx` (New: interactive catalog container with switch, filter pills, grid, pagination, & modal controller)  
- `src/app/pages/library/CatalogCard.tsx` (New: 2:3 aspect ratio cover, category badge, 2-line ellipsized title, friend attribution)  
- `src/app/pages/library/CatalogDetailModal.tsx` (New: centered dialog, scroll lock, backdrop blur, full metadata, owner edit/delete shortcuts, forum link)  
- `src/app/pages/library/catalog.css` (New: complete Rose-Pine stylesheet for catalog grid, preview box, modal, and library page elevation)  
- `src/lib/catalog.ts` (New: multi-media queries for self and friends+self unified timeline, profile hydration, and pagination)  
- `src/lib/media-search.ts` (New: public API cover image search engine for Open Library and iTunes with 5s timeout & 24h caching)  
- `src/app/pages/library/actions.ts` (Augment with `fetchMediaCoverAction` and `getCatalogFeedAction`)  
**Status:** Planning only — do not implement until instructed.  
**Version:** V4 (Comprehensive engineering plan: database querying, timeouts, blank/race guards, modal shortcuts, and Rose-Pine aesthetics)

---

## 1. Overview & Core Requirements

This update transforms `/pages/library` from a basic text list into a rich personal and social media catalog with two major features:

1. **Auto-Fetched Media Cover Preview (1s Debounce + onBlur):**
   - When typing a title into the Book, Movie, or Album creation forms, pausing typing for 1 second (or clicking/tabbing out to another form field) queries a free public API for that title's cover image.
   - An adjacent **72px × 108px (2:3 aspect ratio)** cover preview rectangle is **always visible** next to the title field.
   - **Idle state:** Neutral dark gray rectangle (`#232136`) with a subtle category watermark icon.
   - **Loading state:** Gray rectangle with a centered spinning progress wheel (`#eb6f92` rose accent).
   - **Success state:** Displays the fetched cover image (`object-fit: cover`) and syncs the URL to a hidden `cover_url` input.
   - **Failure / Not Found state:** Reverts cleanly to the neutral gray rectangle without jarring layout shift.
   - **Manual Override:** A small toggle allows pasting a custom URL if the search returns no result or an undesired edition.

2. **Interactive Media Catalog (Positioned Above Creation Forms):**
   - Positioned at the top of the Library page, directly above the log creation forms.
   - **Mode Switch:**
     - `[ 👥 Friends Catalog ]` (**Default on page load**) — Consolidated social feed interleaving logged items across all accepted friends + the user's own logs chronologically (`created_at DESC`).
     - `[ 👤 My Catalog ]` — Personal catalog containing strictly the user's logged media.
   - **Media Scope & Category Filter Pills:**
     - Displays all logged media types (Books, Movies, and Albums) in a unified feed.
     - Filter pills underneath the switch allow instant category narrowing:  
       `[ All ]` `[ 📚 Books ]` `[ 🎬 Movies ]` `[ 🎵 Albums ]`.
   - **Uniform Card Presentation:**
     - 2:3 aspect ratio cover image with a category micro-badge in the corner.
     - Title underneath clamped to 2 lines with native ellipsis (`text-overflow: ellipsis`) and hover tooltip.
     - Friend attribution tag on friends mode (`👤 Alice`, `👤 Bob`, or `👤 You`).
   - **Pagination:** Clean pageable navigation (`PAGE_SIZE = 12` items per page, `← Previous`, `Page X of Y`, `Next →`).
   - **Detail Pop-up Modal:** Clicking any card opens a centered pop-up modal displaying full entry details (rating stars, status, notes/review, pages/runtime, dates, and direct action shortcuts).

---

## 2. Component Architecture & Page Layout

### Visual Layout of `/pages/library`

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ ← Back to Storyhaven ]       📚 Storyhaven Library   (👤 Logged as Ajay)│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  === CATALOG SECTION ===                                               │
│  MODE:   [ (•) 👥 Friends Catalog (Default) ]   [ ( ) 👤 My Catalog ]  │
│  FILTER: [ All (18) ]   [ 📚 Books (9) ]   [ 🎬 Movies (5) ]  [ 🎵 Albums (4) ] │
│                                                                        │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │  Cover  │   │  Cover  │   │  Gray   │   │  Cover  │   │  Cover  │   │
│  │  Image  │   │  Image  │   │ (Icon)  │   │  Image  │   │  Image  │   │
│  │ 📚 Book │   │ 🎬 Movie│   │ 📚 Book │   │ 🎵 Album│   │ 📚 Book │   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│   Piranesi      Dune: Part…   Norwegian…    Blue          Crying in…   │
│   👤 Alice      👤 Bob        👤 You        👤 Charlie    👤 Alice     │
│                                                                        │
│  [ ← Previous ]                 Page 1 of 3                 [ Next → ] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  === LOGGING CREATION SECTION ===                                      │
│  [ 📚 Log a Book ]   [ 🎬 Log a Movie ]   [ 🎵 Log an Album ]          │
│                                                                        │
│  Title: [ Piranesi               ]   ┌──────────┐                      │
│  Cover: (Auto-filled) [Edit URL]     │ 🔄 (Spin)│ ← Always visible     │
│  Rating: [ ★ ★ ★ ★ ☆ ]               │ 72 × 108 │   preview rectangle  │
│  Status: [ Finished        ▼ ]       │ 2:3 ratio│                      │
│  Review: [ Brilliant and poetic. ]   └──────────┘                      │
│  [ Save to Catalog ]                                                   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  === DETAILED ENTRY MANAGEMENT (Bottom List) ===                       │
│  (Existing LibraryEntries kept intact for quick inline editing)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature 1: Public Cover Fetcher & Preview Specification

### Public API Strategy (Keyless, Free, Highly Reliable)

| Media Type | Recommended Public API | Advantages | Response Parsing |
| :--- | :--- | :--- | :--- |
| **Book** | **Open Library Search API**<br>`https://openlibrary.org/search.json?title={title}&limit=1` | Free, keyless, comprehensive book archive | Extracts `cover_i` → `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg` |
| **Movie** | **iTunes Search API**<br>`https://itunes.apple.com/search?term={title}&entity=movie&limit=1` | Free, keyless, official high-res poster art | Extracts `artworkUrl100` → transforms to `600x600bb.jpg` |
| **Album** | **iTunes Search API**<br>`https://itunes.apple.com/search?term={title}&entity=album&limit=1` | Free, keyless, official album art | Extracts `artworkUrl100` → transforms to `600x600bb.jpg` |

*(Note: IMDb requires AWS RapidAPI keys with strict paid quotas and does not support books or music. Open Library and iTunes provide 100% free, keyless coverage across all three categories).*

### Edge Cases & Guardrails

1. **5-Second Timeout Guard:**
   - Open Library occasionally slows under heavy load. The server fetch uses `AbortSignal.timeout(5000)` so that searches fail fast to idle gray rather than spinning forever.
2. **Race Condition Prevention:**
   - When the user types quickly (e.g., "Dune", then continues typing "Dune Messiah"), each lookup increments an internal `requestId` counter. If a response arrives for an outdated `requestId`, it is ignored.
3. **Empty / Blank Input Handling:**
   - If the user backspaces or clears the title field, any active debounce timer is cancelled, in-flight searches are aborted, the preview immediately returns to idle gray, and `cover_url` is cleared.
4. **No Re-fetch on Identical Blur:**
   - Switching form fields (`onBlur`) only triggers a lookup if the trimmed title has actually changed since the last fetch.
5. **Form Submission Reset:**
   - Once a log is saved via `createBookAction`, `CreateLogForms` clears the input and resets `CoverPreviewBox` back to its idle gray state via a reset key or callback.
6. **Next.js Image Whitelist Bypass:**
   - CDN images from Open Library (`covers.openlibrary.org`) and Apple (`is1-ssl.mzstatic.com` / `is2-ssl.mzstatic.com`) are displayed using standard HTML `<img>` tags with `loading="lazy"` and `referrerPolicy="no-referrer"` to prevent domain whitelist runtime crashes.

### Server Implementation (`src/lib/media-search.ts`)

```ts
export async function searchMediaCover(
  type: "book" | "movie" | "album",
  title: string
): Promise<string | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  try {
    if (type === "book") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=1`,
        {
          signal: controller.signal,
          next: { revalidate: 86400 }, // Cache identical queries for 24 hours
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    }

    if (type === "movie" || type === "album") {
      const entity = type === "movie" ? "movie" : "album";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=${entity}&limit=1`,
        {
          signal: controller.signal,
          next: { revalidate: 86400 },
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      const artwork = data?.results?.[0]?.artworkUrl100;
      return artwork ? artwork.replace("100x100bb.jpg", "600x600bb.jpg") : null;
    }
  } catch (err) {
    // Graceful fallback to null on abort or network error
    return null;
  }
  return null;
}
```

### Preview Component Contract (`CoverPreviewBox.tsx`)

```tsx
type CoverPreviewBoxProps = {
  type: "book" | "movie" | "album";
  title: string;
  onCoverResolved: (url: string | null) => void;
  resetSignal?: number; // increments on form submit to reset state
};
```
- **Dimensions:** Fixed `width: 72px; height: 108px; border-radius: 8px; flex-shrink: 0;`
- **Internal State:** `previewUrl: string | null`, `isLoading: boolean`, `lastSearchedTitle: string`.
- **UI Elements:**
  - When `isLoading`: Centered spinning wheel:
    ```css
    .preview-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(235, 188, 186, 0.2);
      border-top-color: #eb6f92;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    ```
  - When `previewUrl` is present: `<img src={previewUrl} alt="Cover preview" className="preview-img" />` with subtle fade-in.
  - When idle / error: Neutral background `#232136` with a muted icon (`📚` / `🎬` / `🎵`) at 30% opacity.

---

## 4. Feature 2: Catalog System Specification

### Data Model & Unified Timeline Query (`src/lib/catalog.ts`)

```ts
export type CatalogMediaType = "all" | "book" | "movie" | "album";
export type CatalogMode = "friends" | "self";

export type CatalogItem = {
  id: string;
  type: "book" | "movie" | "album";
  name: string;
  cover_url: string | null;
  rating: number | null;
  status: string | null;
  liked: boolean;
  review: string | null;
  pages?: number | null;
  runtime?: number | null;
  started_date?: string | null;
  finished_date?: string | null;
  created_at: string;
  owner: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    isSelf: boolean;
  };
};

export type CatalogFeedResponse = {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    books: number;
    movies: number;
    albums: number;
  };
};
```

### High-Performance Query Strategy

1. **Profile Security Verification:**
   - `mode === "self"`: Target profile IDs = `[currentProfileId]`.
   - `mode === "friends"`: Call `listAcceptedFriends(currentProfileId)` to obtain verified friends. Target profile IDs = `[currentProfileId, ...acceptedFriendIds]`.
   - This ensures **zero exposure** of unaccepted or stranger profiles, maintaining strict privacy.

2. **Dual-Tier Query Execution:**
   - **Single Category Queries (`category !== "all"`):**
     - Executes a direct database query against the single target table (`book_logs`, `movie_logs`, or `album_logs`).
     - Uses database pagination: `.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)` with `.order("created_at", { ascending: false })` and `{ count: "exact" }`.
   - **Unified Queries (`category === "all"`):**
     - Queries `book_logs`, `movie_logs`, and `album_logs` for `profile_id in (targetProfileIds)`.
     - Fetches the most recent 150 records per table with `.order("created_at", { ascending: false })`.
     - Tags each record with its `type`, merges the lists, sorts chronologically (`newest first`), calculates total count, and slices the requested 12-item page.

3. **In-Memory Profile Hydration:**
   - Rather than executing N+1 profile lookups, the server builds a lookup `Map<string, PublicProfile>` from the current user profile and the friends list already fetched in memory.
   - Attaches `owner: { id, display_name, avatar_url, isSelf }` with zero extra queries.

4. **Empty State & Zero-Friends Handling:**
   - If `mode === "friends"` and the user has 0 accepted friends and 0 self logs:
     Displays a warm empty state:  
     `"Your social library is quiet. Connect with fellow readers in the Friends Lounge!"`  
     `[ 👥 Visit Friends Lounge → ]`

---

## 5. UI Components & Interactivity

### 1. `CatalogSection.tsx` (Catalog Manager)
- Mounted at the top of `/pages/library/page.tsx`.
- Receives `initialFeed` from Server Component for instant first paint (0ms delay, zero cumulative layout shift).
- State:
  - `mode`: `"friends"` (default) | `"self"`
  - `filter`: `"all"` (default) | `"book"` | `"movie"` | `"album"`
  - `page`: `1` (resets to 1 when mode or filter changes)
  - `selectedItem`: `CatalogItem | null` (controls detail modal)
  - `isPending`: `boolean` (visual transition indicator for page changes)
- Client-side navigation calls `getCatalogFeedAction(mode, filter, page)` using `useTransition`.

### 2. `CatalogCard.tsx` (Card Item)
- **Container:** Uniform `aspect-ratio: 2 / 3;`, `border-radius: 8px;`, `background: #232136;`, `border: 1px solid rgba(235, 188, 186, 0.12)`.
- **Hover Effect:** `transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35); border-color: rgba(235, 188, 186, 0.35);`.
- **Cover Image:** `<img />` with `object-fit: cover;`. If no cover exists, displays a neutral gray surface with the category icon.
- **Micro-Badge:** Floating translucent badge in the top-right corner (`📚`, `🎬`, `🎵`).
- **Title Underneath:**
  ```css
  .catalog-card-title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
    max-height: 2.5em;
    font-size: 0.825rem;
    font-weight: 600;
    color: #e0def4;
    text-align: center;
    margin-top: 0.35rem;
  }
  ```
- **Attribution Tag:** On friends mode, displays a small pill below the title: `👤 Alice` or `👤 You`.

### 3. `CatalogDetailModal.tsx` (Centered Pop-up Dialog)
- **Scroll Lock:** Sets `document.body.style.overflow = "hidden"` on mount, restores on unmount.
- **Dismissal:** Accessible `✕` close button, click on blurred backdrop, or pressing the `Escape` key.
- **Content Layout:**
  - Two-column desktop view (cover on left, detailed metadata on right).
  - Title, Media Type Badge, and Owner Info (Avatar + Name).
  - Star Rating: Rendered star icons (`★ ★ ★ ★ ☆`) with numeric score (`4.5 / 5`).
  - Status Tag (`Reading`, `Finished`, `Want to watch`, etc.).
  - Date Stamps: `Started: May 12, 2026`, `Finished: May 18, 2026`.
  - Specific Metrics: `Pages: 384` (books) or `Runtime: 148 min` (movies).
  - Liked indicator (`❤️ Favorited`).
  - Personal Notes / Review block with stylized quote borders.
- **Action Buttons:**
  - For Books: `"💬 Discuss in Forum →"` (links to `/pages/forum?mode=per_book&book={title}`).
  - If `owner.isSelf === true`:
    - `"✏️ Edit Entry"` (jumps to the bottom editor or opens edit fields).
    - `"🗑️ Delete Entry"` (triggers deletion action with instant optimistic UI update).

---

## 6. Styling & Aesthetics (`catalog.css`)

Storyhaven uses the cozy **Rosé Pine Dark** palette. The catalog adheres strictly to this theme:

```css
:root {
  --cat-bg-base: #191724;
  --cat-bg-surface: #232136;
  --cat-bg-overlay: #2a273f;
  --cat-bg-subtle: #1f1d2e;

  --cat-text-primary: #e0def4;
  --cat-text-secondary: #908caa;
  --cat-text-muted: #6e6a86;

  --cat-gold: #f6c177;
  --cat-rose: #eb6f92;
  --cat-pine: #31748f;
  --cat-foam: #9ccfd8;
  --cat-iris: #c4a7e7;

  --cat-border-subtle: rgba(235, 188, 186, 0.12);
  --cat-border-default: rgba(235, 188, 186, 0.22);
  --cat-border-active: rgba(235, 188, 186, 0.45);
}
```

### Responsive Grid Layout
```css
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .catalog-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 840px) {
  .catalog-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1100px) {
  .catalog-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 1.5rem;
  }
}
```

---

## 7. Implementation Checklist

- [ ] **Step 1: Public Cover Search Engine & Server Actions**
  - Implement `src/lib/media-search.ts` with Open Library and iTunes search routines, 5s timeout, and 24h cache.
  - Implement `fetchMediaCoverAction(type, title)` in `src/app/pages/library/actions.ts`.
- [ ] **Step 2: Auto-Cover Preview Component**
  - Implement `src/app/pages/library/CoverPreviewBox.tsx` with 1000ms debounce, `onBlur` trigger, abort controller, and loading spinner.
  - Update `CreateLogForms.tsx` to mount `CoverPreviewBox` next to Title input in Book, Movie, and Album forms.
  - Bind resolved URL to hidden `cover_url` input with an optional "Edit URL" text toggle.
  - Implement form submission reset listener to restore idle gray state.
- [ ] **Step 3: Catalog Data Layer & Security**
  - Implement `src/lib/catalog.ts` supporting `listCatalogFeed(profileId, mode, category, page, pageSize)`.
  - Implement friend-scoped security queries and profile name/avatar hydration.
  - Implement `getCatalogFeedAction(mode, category, page)` in `src/app/pages/library/actions.ts`.
- [ ] **Step 4: Catalog UI Components & Pop-up Modal**
  - Create `src/app/pages/library/catalog.css` with Rose-Pine styling, responsive 2/3/4/6 grid, and animations.
  - Implement `CatalogCard.tsx` with 2:3 aspect ratio, category micro-badge, 2-line title ellipsis, and friend attribution.
  - Implement `CatalogDetailModal.tsx` with backdrop blur, scroll locking, ESC key dismissal, forum cross-links, and self-owner delete shortcut.
  - Implement `CatalogSection.tsx` combining switch, category pills, grid, pagination, and modal.
- [ ] **Step 5: Library Page Assembly**
  - Update `src/app/pages/library/page.tsx` to pre-fetch Page 1 of the default Friends Catalog on the server.
  - Mount `<CatalogSection initialFeed={initialFeed} />` above `<CreateLogForms />`.
  - Apply `className="library-main"` to `<main>` for seamless Rose-Pine dark theme integration.
- [ ] **Step 6: End-to-End Verification**
  - Verify 1s debounce and `onBlur` cover preview on Book, Movie, and Album forms.
  - Test empty input clearing and fast-typing race conditions.
  - Verify switching between Friends Catalog and My Catalog.
  - Test category filter pills (`All`, `Books`, `Movies`, `Albums`).
  - Test pagination controls (`Previous`, `Page X of Y`, `Next`).
  - Test detail modal opening, ESC close, scroll lock, and forum cross-linking.
