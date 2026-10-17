# Logging

Media logging for Storyhaven. Users with a completed profile can log books, movies, and albums.

## Route

- `/pages/logging` — create logs, list them, update, delete
- Requires Auth0 login + completed profile (`/pages/profile-creation`)

## App files

| Path | Role |
|---|---|
| `src/app/pages/logging/page.tsx` | Page shell, auth/profile gate, loads logs |
| `src/app/pages/logging/LoggingForms.tsx` | Create forms (book / movie / album) |
| `src/app/pages/logging/LogEntries.tsx` | Compact list; **Update** opens edit form; **Delete** |
| `src/app/pages/logging/actions.ts` | Server actions for create / update / delete |
| `src/lib/logging.ts` | Supabase helpers |
| `supabase/logging_tables.sql` | SQL to create the three tables |

## Database

Run `supabase/logging_tables.sql` in the Supabase SQL Editor.

All tables FK to `profiles.id`. App uses the **service role** on the server after Auth0 auth. RLS is enabled; `anon` / `authenticated` have no direct table grants.

### `book_logs`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | FK → profiles |
| `name` | text | required |
| `cover_url` | text | optional |
| `rating` | numeric | 0–5 |
| `started_date` | date | books only |
| `finished_date` | date | |
| `liked` | boolean | default false |
| `review` | text | notes |
| `status` | text | `want` / `reading` / `finished` / `dropped` |
| `pages` | integer | books only |
| `created_at` / `updated_at` | timestamptz | |

### `movie_logs`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | FK → profiles |
| `name` | text | required |
| `cover_url` | text | optional |
| `rating` | numeric | 0–5 |
| `finished_date` | date | no started date |
| `liked` | boolean | |
| `review` | text | |
| `runtime` | integer | minutes |
| `created_at` / `updated_at` | timestamptz | |

### `album_logs`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `profile_id` | uuid | FK → profiles |
| `name` | text | required |
| `cover_url` | text | optional |
| `rating` | numeric | 0–5 |
| `finished_date` | date | no started date |
| `liked` | boolean | |
| `review` | text | |
| `created_at` / `updated_at` | timestamptz | |

## UI behavior

1. Create via the three forms at the top of `/pages/logging`
2. Lists show a compact summary (name, rating, a few details)
3. **Update** expands the full edit form; **Cancel** / successful save collapses it
4. **Delete** removes the row (scoped to the signed-in profile)

## Env required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Plus existing Auth0 vars. Never commit `.env` or the service role key.
