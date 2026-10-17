# Connect

Detailed hub/auth wiring. Prefer **`plans/main.md`** for the overall map.

## Access rule

Logged out → `/pages/login` only (no Phaser).  
Logged in → `/` Phaser haven.

## Landmarks → routes

| Landmark | Goes to |
|---|---|
| Auth Desk (no profile) | `/pages/profile` |
| Auth Desk (complete) | `/auth/logout?returnTo=<origin>/pages/login` |
| Library Bookshelf | `/pages/library` |
| Daily Story podium | `/pages/daily-story` |
| Forums / Friends | `/pages/library` (temp) |

## Auth0 dashboard checklist

- Callback: `http://localhost:3000/auth/callback`
- Logout URLs: `http://localhost:3000`, `http://localhost:3000/pages/login`

## Related docs

- `plans/main.md` — structure & routes
- `plans/LOGGING.md` — library tables & UI
