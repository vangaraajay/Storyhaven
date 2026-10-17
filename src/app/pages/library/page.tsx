import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { listLogs } from "@/lib/logging";
import { getProfile, isProfileComplete } from "@/lib/profiles";
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

  return (
    <div className="library-container">
      <header className="library-top-nav">
        <div className="library-title-group">
          <Link href="/" className="library-back-link">
            ← Return to Haven
          </Link>
          <h1>Storyhaven Library</h1>
        </div>
        <div className="library-user-badge">
          <span>Logged in as </span>
          <strong style={{ color: "#e0def4" }}>{profile.display_name}</strong>
        </div>
      </header>

      {/* Interactive Catalog Section (Positioned Above Creation Forms) */}
      <CatalogSection
        initialFriendsFeed={initialFriendsFeed}
        initialSelfFeed={initialSelfFeed}
      />

      {/* Creation Forms with Auto-Cover Preview */}
      <CreateLogForms />

      {/* Existing Detailed Inline Entries */}
      <LibraryEntries
        books={logs.books}
        movies={logs.movies}
        albums={logs.albums}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <main className="library-main">
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
