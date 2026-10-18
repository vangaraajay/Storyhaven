import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getLogs } from "@/lib/cachedLogs";
import { getProfile, isProfileComplete, type Profile } from "@/lib/profiles";
import Bookcase, { type MediaItem } from "@/components/shelf/Bookcase";
import { getShelfData } from "@/lib/shelf";
import { listCatalogFeed } from "@/lib/catalog";
import CatalogSection from "./CatalogSection";
import CreateLogForms from "./CreateLogForms";
import LibraryEntries from "./LibraryEntries";
import Icon from "@/components/pixel/Icon";
import PixelLink from "@/components/pixel/PixelLink";
import LoadingScreen from "@/components/pixel/LoadingScreen";
import RememberAvatar from "@/components/pixel/RememberAvatar";

type LibrarySearchParams = Promise<{ decorate?: string; item?: string }>;

/** Shelf: needs the logs (for covers) and the shelf tables; slow, so it streams in on its own. */
async function ShelfSection({ profile, searchParams }: { profile: Profile; searchParams: LibrarySearchParams }) {
  const { decorate, item } = await searchParams;
  const [logs, shelf] = await Promise.all([
    getLogs(profile.id),
    // Shelf data needs supabase/shelf_tables.sql; an unmigrated DB shows the library without a shelf.
    getShelfData(profile.id).catch(() => null),
  ]);
  if (!shelf) return null;

  const media: MediaItem[] = [
    ...logs.books.map((l) => ({ id: l.id, kind: "book" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
    ...logs.movies.map((l) => ({ id: l.id, kind: "movie" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
    ...logs.albums.map((l) => ({ id: l.id, kind: "album" as const, name: l.name, cover_url: l.cover_url, at: l.created_at })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(({ at: _at, ...m }) => m); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <Bookcase
      theme={shelf.theme}
      items={media}
      placed={shelf.placed}
      unlocked={shelf.unlocked}
      avatar={profile.avatar ?? null}
      avatarLabel={profile.display_name ?? undefined}
      initialDecorate={decorate === "1"}
      initialItem={item}
    />
  );
}

/** Friends / personal catalog (two feeds), above the creation forms. */
async function CatalogBlock({ profileId }: { profileId: string }) {
  const [initialFriendsFeed, initialSelfFeed] = await Promise.all([
    listCatalogFeed(profileId, "friends", "all", 1, 12),
    listCatalogFeed(profileId, "self", "all", 1, 12),
  ]);
  return <CatalogSection initialFriendsFeed={initialFriendsFeed} initialSelfFeed={initialSelfFeed} />;
}

async function EntriesBlock({ profileId }: { profileId: string }) {
  const logs = await getLogs(profileId);
  return <LibraryEntries books={logs.books} movies={logs.movies} albums={logs.albums} />;
}

/** Shelf, catalog and entries load in parallel behind one loading screen. */
async function LibraryContent({ searchParams }: { searchParams: LibrarySearchParams }) {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  return (
    <>
      <RememberAvatar avatar={profile.avatar ?? null} />
      <p className="library-header">
        Logged in as {profile.display_name} ·{" "}
        <PixelLink href="/create?returnTo=/pages/library">Edit character</PixelLink>
      </p>
      <ShelfSection profile={profile} searchParams={searchParams} />
      <div className="library-body">
        <CatalogBlock profileId={profile.id} />
        {/* The forms need no data, so they render immediately. */}
        <CreateLogForms />
        <EntriesBlock profileId={profile.id} />
      </div>
    </>
  );
}

export default function LibraryPage({ searchParams }: { searchParams: LibrarySearchParams }) {
  return (
    <main className="library-main">
      <header className="library-header">
        <h1>Library</h1>
        <PixelLink href="/"><Icon name="arrow_left" size={1} /> Return to Haven</PixelLink>
      </header>
      <Suspense fallback={<LoadingScreen scene="library" />}>
        <LibraryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
