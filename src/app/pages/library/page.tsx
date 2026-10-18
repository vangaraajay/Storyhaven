import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { listLogs } from "@/lib/logging";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import Bookcase, { type MediaItem } from "@/components/shelf/Bookcase";
import { getShelfData } from "@/lib/shelf";
import { listCatalogFeed } from "@/lib/catalog";
import CatalogSection from "./CatalogSection";
import CreateLogForms from "./CreateLogForms";
import LibraryEntries from "./LibraryEntries";

async function LibraryContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  const [initialFriendsFeed, initialSelfFeed, logs] = await Promise.all([
    listCatalogFeed(profile.id, "friends", "all", 1, 12),
    listCatalogFeed(profile.id, "self", "all", 1, 12),
    listLogs(profile.id),
  ]);
  // Shelf data needs supabase/shelf_tables.sql; an unmigrated DB shows the library without a shelf.
  const shelf = await getShelfData(profile.id).catch(() => null);
  const media: MediaItem[] = [
    ...logs.books.map((l) => ({ id: l.id, kind: "book" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
    ...logs.movies.map((l) => ({ id: l.id, kind: "movie" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
    ...logs.albums.map((l) => ({ id: l.id, kind: "album" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(({ at: _at, ...m }) => m); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <>
      <p className="library-header">
        Logged in as {profile.display_name} ·{" "}
        <Link href="/create?returnTo=/pages/library">Edit character</Link>
      </p>
      {shelf ? (
        <Bookcase theme={shelf.theme} items={media} placed={shelf.placed} unlocked={shelf.unlocked} avatar={profile.avatar ?? null} avatarLabel={profile.display_name ?? undefined} />
      ) : null}
      <div className="library-body">
        {/* Friends / personal catalog with type filters, above the creation forms */}
        <CatalogSection
          initialFriendsFeed={initialFriendsFeed}
          initialSelfFeed={initialSelfFeed}
        />
        <CreateLogForms />
        <LibraryEntries
          books={logs.books}
          movies={logs.movies}
          albums={logs.albums}
        />
      </div>
    </>
  );
}

export default function LibraryPage() {
  return (
    <main className="library-main">
      <header className="library-header">
        <h1>Library</h1>
        <Link href="/">← Return to Haven</Link>
      </header>
      <Suspense
        fallback={
          <div className="haven-loading" style={{ height: "60dvh" }}>
            Loading your Haven Library…
          </div>
        }
      >
        <LibraryContent />
      </Suspense>
    </main>
  );
}
