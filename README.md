<div align="center">

# 🏰 Storyhaven

### *A cozy 2D virtual pixel haven where readers gather, log media, and connect.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-4.2-F35B25?style=for-the-badge&logo=phaser&logoColor=white)](https://phaser.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Auth0](https://img.shields.io/badge/Auth0-Authentication-EB5424?style=for-the-badge&logo=auth0&logoColor=white)](https://auth0.com/)
[![Rosé Pine](https://img.shields.io/badge/Theme-Rosé%20Pine-eb6f92?style=for-the-badge)](https://rosepinetheme.com/)

[**Explore Features**](#-core-features) • [**Architecture**](#-architecture--file-structure) • [**Quickstart**](#-getting-started) • [**Database Setup**](#-database-schema) • [**Controls**](#-controls)

---

</div>

## 📖 Overview

**Storyhaven** reimagines social media and reading logs as a cozy, interactive pixel-art sanctuary. Stepping into Storyhaven feels like entering a warm, moonlit library lounge: walk your character through a 2D interactive world, sit by the fireplace to discuss books in the forum, log your favorite media at the library desk, and connect with fellow readers whose taste in books, movies, and albums closely matches your own.

Crafted with the soothing **Rosé Pine Dark** aesthetic, Storyhaven balances playful gamification with deep, responsive utility for bookworms, cinephiles, and music lovers alike.

---

## ✨ Core Features

```
                    ┌─────────────────────────────────────────┐
                    │          🏰 STORYHAVEN HUB              │
                    │      (Top-Down 2D Pixel Lounge)         │
                    └────────────────────┬────────────────────┘
                                         │
        ┌───────────────────┬────────────┴────────────┬───────────────────┐
        ▼                   ▼                         ▼                   ▼
┌───────────────┐   ┌───────────────┐         ┌───────────────┐   ┌───────────────┐
│  📚 LIBRARY   │   │   💬 FORUM    │         │  👥 FRIENDS   │   │  📜 DAILY     │
│   & CATALOG   │   │  DISCUSSIONS  │         │  & TASTE MATCH│   │    STORY      │
│ Auto-Covers,  │   │  Book Hubs,   │         │ DMs, Groups,  │   │ Curated Daily │
│ Friends Feed  │   │  Markdown     │         │ Compatibility │   │ Literature    │
└───────────────┘   └───────────────┘         └───────────────┘   └───────────────┘
```

### 🎮 1. The Interactive Pixel Haven (`src/phaser/`)
- **Top-Down Virtual Room:** Built on **Phaser 4**, featuring a charming pixel lounge with wooden floors, cozy carpets, bookshelves, tea tables, and glowing fireplaces.
- **Physics-Driven Movement:** Character movement features subtle acceleration, deceleration, and momentum for a tactile, responsive feel.
- **Interactive Proximity Zones:** Walking up to furniture reveals interaction bubbles that open haven destinations directly without menu clutter.

### 📚 2. Media Library & Interactive Catalog (`/pages/library`)
- **Social & Self Catalogs:**
  - `[ 👥 Friends Catalog ]` — Interleaves logs from all accepted friends and yourself into a unified, chronological social feed.
  - `[ 👤 My Catalog ]` — A private timeline dedicated exclusively to your personal logs.
- **Universal Multi-Media Logging:** Track **Books**, **Movies**, and **Albums** with star ratings, statuses (Want, Reading, Finished, Dropped), runtimes, page counts, dates, and reviews.
- **Live Auto-Cover Preview (1s Debounce + onBlur):**
  - Type in any title, and Storyhaven automatically searches public keyless APIs:
    - 📚 **Books:** Open Library Search API
    - 🎬 **Movies:** Official IMDb Suggestions API (Amazon CloudFront posters)
    - 🎵 **Albums:** Apple iTunes Search API (crisp 600×600 artwork)
  - Features an always-visible 2:3 preview box, loading spinner, and neutral gray fallback.
- **Centered Detail Pop-up Modal:**
  - Click any card in the catalog grid to view high-resolution covers, metadata, ratings, and quotes.
  - Includes a direct `"💬 Discuss in Forum →"` shortcut for books and inline `"🗑️ Delete Entry"` for owners.

### 💬 3. Community Forum & Book Hubs (`/pages/forum`)
- **Dual Discussion Modes:**
  - **General Community Feed:** Share reading milestones, recommendations, and reviews.
  - **Per-Book Discussion Hubs:** Every book has its own dedicated discussion hub (`?mode=per_book&book={title}`) linking directly from the library catalog.
- **Rich Experience:** Full GitHub-flavored Markdown support, category badges, upvoting/downvoting, comment threads, and optimistic instantaneous deletions.

### 👥 4. Friends & Taste-Matching Lounge (`/pages/friends`)
- **Media Compatibility Matching:** An algorithm computes taste affinity scores between users based on shared books, movies, and albums in their logs.
- **Social Management:** Send, accept, decline, and cancel friend requests.
- **Real-Time Communication:** Direct 1-on-1 messaging (DMs) and customizable group chats with fellow readers.

### 📜 5. Daily Story Nook (`/pages/daily-story`)
- A quiet corner offering a fresh, curated short story or literary excerpt every day to inspire your reading journey.

---

## 🛠️ Tech Stack & Design System

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** (App Router & Turbopack) | Partial Pre-rendering, Server Actions, Suspense Streaming |
| **Frontend** | **React 19** + **TypeScript 5** | Strict type safety, `useActionState`, `useTransition` |
| **Game Engine** | **Phaser 4** (`phaser`) | 2D canvas/WebGL rendering, arcade physics, tile animations |
| **Database** | **Supabase** (PostgreSQL) | Managed Postgres with RLS policies, triggers, and indices |
| **Authentication** | **Auth0** (`@auth0/nextjs-auth0`) | Secure OAuth2 session management with profile auto-sync |
| **Styling** | **Custom CSS & Rosé Pine Dark** | Glassmorphism, tailored tokens (`#191724`, `#232136`, `#eb6f92`, `#f6c177`) |
| **Public APIs** | **Open Library**, **IMDb**, **iTunes** | Zero-config, keyless media metadata and cover retrieval |

---

## 📁 Architecture & File Structure

```
Storyhaven/
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root HTML & body layout
│   │   ├── globals.css                    # Design tokens & global typography
│   │   ├── page.tsx                       # Haven entry route & session guard
│   │   ├── haven/
│   │   │   └── HavenHome.tsx              # Overlay UI & Phaser canvas wrapper
│   │   └── pages/                         # Core Haven feature pages
│   │       ├── daily-story/               # Daily curated literature
│   │       ├── forum/                     # Community feeds, book hubs, & posts
│   │       │   ├── [postId]/              # Threaded post detail view
│   │       │   ├── actions.ts             # Post/comment/vote server actions
│   │       │   └── forum.css              # Forum Rosé Pine stylesheet
│   │       ├── friends/                   # Match candidate panel & chat
│   │       │   ├── FriendsShell.tsx       # Sidebar & DM/group chat shell
│   │       │   └── MatchPanel.tsx         # Taste compatibility feed
│   │       ├── library/                   # Library catalog & media logger
│   │       │   ├── CatalogSection.tsx     # Friends vs. Self catalog & pills
│   │       │   ├── CatalogCard.tsx        # 2:3 aspect ratio media card
│   │       │   ├── CatalogDetailModal.tsx # Centered detail pop-up modal
│   │       │   ├── CoverPreviewBox.tsx    # Debounced public cover previewer
│   │       │   ├── CreateLogForms.tsx     # Book/Movie/Album logging forms
│   │       │   ├── actions.ts             # Logging & cover search server actions
│   │       │   └── catalog.css            # Catalog grid & modal styles
│   │       ├── login/                     # Auth0 login welcome page
│   │       └── profile/                   # User profile setup & avatar
│   ├── components/                        # Shared UI components
│   │   └── forum/                         # Markdown renderer, badges, vote controls
│   ├── lib/                               # Data access, search & business logic
│   │   ├── auth0.ts                       # Auth0 client configuration
│   │   ├── catalog.ts                     # Catalog feed queries & friends-timeline
│   │   ├── forum.ts                       # Forum posts, comments & vote database logic
│   │   ├── friends.ts                     # Friendship graph, matching & messaging
│   │   ├── logging.ts                     # Book, movie, album database models
│   │   ├── media-search.ts                # Public API cover fetcher (OpenLibrary, IMDb, iTunes)
│   │   ├── profiles.ts                    # Profile resolution & onboarding
│   │   └── supabase/server.ts             # Supabase service role client
│   └── phaser/                            # 2D game engine implementation
│       ├── constants/                     # Furniture coordinates, physics, & zones
│       ├── entities/                      # Player sprite, momentum, furniture managers
│       └── scenes/MainScene.ts            # Primary interactive Haven lounge scene
├── supabase/                              # Database migration scripts
│   ├── logging_tables.sql                 # Book, movie, and album logs schema
│   ├── forum_tables.sql                   # Forum posts, comments, and votes schema
│   └── friends_tables.sql                 # Friendships and direct messages schema
└── plans/                                 # Architectural plans & specifications
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher (Node 22+ recommended)
- **npm**: `v10.0.0` or higher
- A free **Supabase** project
- A free **Auth0** application (Regular Web Application)

### 1. Clone the Repository
```bash
git clone https://github.com/vangaraajay/Storyhaven.git
cd Storyhaven
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Auth0 Configuration
AUTH0_SECRET="your-32-character-random-secret"
APP_BASE_URL="http://localhost:3000"
AUTH0_DOMAIN="your-auth0-tenant.us.auth0.com"
AUTH0_CLIENT_ID="your-auth0-client-id"
AUTH0_CLIENT_SECRET="your-auth0-client-secret"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

> [!TIP]
> Generate a secure `AUTH0_SECRET` by running:
> ```bash
> node -e "console.log(crypto.randomBytes(32).toString('hex'))"
> ```

---

## 🗄️ Database Schema

Storyhaven uses Supabase with PostgreSQL. Run the three SQL scripts located in the `supabase/` folder inside your **Supabase SQL Editor**:

1. **`supabase/logging_tables.sql`**: Creates `book_logs`, `movie_logs`, and `album_logs` tables with constraints, timestamps, and row-level security.
2. **`supabase/forum_tables.sql`**: Creates `forum_posts`, `forum_comments`, and `forum_votes` tables with auto-updating vote counts and foreign keys.
3. **`supabase/friends_tables.sql`**: Creates `friendships`, `dm_messages`, and `chat_groups` tables with status enums and message order indices.

---

## 🏃 Running Locally

Run the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build and test compilation:
```bash
npm run build
npm run start
```

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Move Up / Down / Left / Right** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Interact with Lounge Area** | Walk near furniture and click the prompt bubble |
| **Open Library Desk** | Approach the Bookcase & Study Desk |
| **Open Forum Table** | Approach the Fireplace & Discussion Table |
| **Open Friends Lounge** | Approach the Social Couch & Coffee Table |
| **Close Detail Modal** | Press `Escape` or click the modal backdrop |

---

## 🎨 Rosé Pine Palette Tokens

Storyhaven embraces the soothing, dark-mode tones of Rosé Pine:

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Base** | `#191724` | Main page and game canvas background |
| **Surface** | `#232136` | Card containers, modals, and input panels |
| **Overlay** | `#2a273f` | Elevated headers, button hovers, and active tabs |
| **Rose** | `#eb6f92` | Primary buttons, spinners, and favorite badges |
| **Gold** | `#f6c177` | Headings, star ratings, and review accents |
| **Pine** | `#31748f` | Active navigation tabs and primary links |
| **Foam** | `#9ccfd8` | Focus rings and interactive secondary highlights |
| **Text** | `#e0def4` | Crisp, high-contrast typography |

---

## 🤝 Contributing

Contributions, feedback, and ideas are warmly welcomed!
1. Fork the project
2. Create your feature branch (`git checkout -b feature/cozy-tea-table`)
3. Commit your changes (`git commit -m "Add tea-table interaction zone"`)
4. Push to the branch (`git push origin feature/cozy-tea-table`)
5. Open a Pull Request

---

<div align="center">

*Made with ❤️ for book lovers, gamers, and storytellers.*

</div>
