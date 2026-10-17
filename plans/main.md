# Storyhaven — main plan

Source of truth for how the app is organized. Update this when you add routes, move folders, or change auth/haven behavior.

## High-level flow

1. Guest hits the app → **`/pages/login`** (Log in / Sign up via Auth0).
2. After Auth0 → **`/`** Phaser haven (no HTML chrome).
3. Incomplete profile → Auth Desk or Library sends you to **`/pages/profile`**.
4. Library Bookshelf → **`/pages/library`** (log books / movies / albums).
5. Daily Story podium → **`/pages/daily-story`** (hardcoded tale for now).
6. Auth Desk → log out → back to **`/pages/login`**.

Phaser is blocked until the user is signed in.

## Directory layout

```text
src/
  app/
    page.tsx                 # Auth gate → HavenHome (Phaser)
    layout.tsx
    globals.css
    haven/
      HavenHome.tsx          # Client: mounts Phaser only
    pages/                   # All traditional web screens (self-contained)
      login/
        page.tsx
      profile/
        page.tsx
        ProfileForm.tsx
        actions.ts
      library/
        page.tsx
        CreateLogForms.tsx   # Create book/movie/album
        LibraryEntries.tsx   # List + update/delete
        actions.ts
      daily-story/
        page.tsx
        story.ts             # Hardcoded daily tale text
  phaser/                    # Self-contained game (outside pages/)
    PhaserGame.tsx
    game.ts
    scenes/
    entities/
    constants/
  lib/                       # Shared server utilities
    auth0.ts
    profiles.ts
    logging.ts
    supabase/server.ts
  proxy.ts                   # Auth0 middleware mount (/auth/*)
```

## Routes

| URL | Folder | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` + `haven/` | Phaser haven (requires session) |
| `/pages/login` | `pages/login/` | Guest log in / sign up |
| `/pages/profile` | `pages/profile/` | Create display name / profile |
| `/pages/library` | `pages/library/` | Media logging CRUD |
| `/pages/daily-story` | `pages/daily-story/` | Daily Story podium reading |
| `/auth/*` | Auth0 SDK via `proxy.ts` | Login, logout, callback |

Removed / unused: `/phaser`, bare `/pages` index, `/page`, `book-logging` stubs.

## Haven (Phaser) landmarks

| Zone | Destination |
|---|---|
| Auth Desk (center table) | `/pages/profile` if no profile; else `/auth/logout` → `/pages/login` |
| Library Bookshelf | `/pages/library` |
| Daily Story podium | `/pages/daily-story` |
| Forums / Friends | `/pages/library` (placeholders for now) |

Logout `returnTo` must be an **absolute** URL (e.g. `http://localhost:3000/pages/login`) and listed in Auth0 **Allowed Logout URLs**.

## Auth + data

- **Auth0** — identity (Universal Login from `/pages/login`).
- **Supabase** — `profiles`, `book_logs`, `movie_logs`, `album_logs`.
- Server uses **service role** only after `auth0.getSession()` (BFF). Never expose service role to the browser.
- Details for logging schema: `plans/LOGGING.md`.
- Shorter connect notes: `plans/connect.md` (keep in sync with this file).

## Naming conventions

- Web feature folders live under `src/app/pages/<feature>/` and own their UI + server actions.
- Game code lives under `src/phaser/` and is imported by the haven entry only.
- Shared DB/auth helpers live under `src/lib/`.

## When you change things

1. New web screen → new folder under `src/app/pages/<name>/`, add row to Routes table above.
2. New landmark → `src/phaser/constants/furniture.ts` + `zones.ts`, update Haven landmarks table.
3. Route renames → update zones, redirects, `revalidatePath`, Auth0 logout URLs, and this plan.
