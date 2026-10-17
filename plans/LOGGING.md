# Logging

Media logging for Storyhaven. See **`plans/main.md`** for app structure and routes.

## Flow

1. `/pages/login` — Log in / Sign up  
2. `/` — Phaser haven  
3. Library Bookshelf → `/pages/library`  
4. Auth Desk → profile or log out → `/pages/login`

## Routes (library)

| URL | Code |
|---|---|
| `/pages/library` | `src/app/pages/library/` |

Self-contained files:

- `page.tsx` — gate + list  
- `CreateLogForms.tsx` — create forms  
- `LibraryEntries.tsx` — compact list; Update opens form; Delete  
- `actions.ts` — create / update / delete  

Shared helpers: `src/lib/logging.ts`, `src/lib/supabase/server.ts`.

## Database

Run `supabase/logging_tables.sql` in the Supabase SQL Editor.

### `book_logs`
name, cover_url, rating (0–5), started_date, finished_date, liked, review, status (`want`/`reading`/`finished`/`dropped`), pages

### `movie_logs`
name, cover_url, rating (0–5), finished_date, liked, review, runtime (minutes)

### `album_logs`
name, cover_url, rating (0–5), finished_date, liked, review

All FK to `profiles.id`. Server uses service role after Auth0 session check.

## Env

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Plus Auth0 vars. Never commit `.env`.
