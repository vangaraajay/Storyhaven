import { Suspense } from "react";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import { listLogs } from "@/lib/logging";
import {
  fetchForumFeed,
  getDistinctBookTitles,
  getBookDiscussionStats,
  type FeedSort,
  type MediaFilter,
} from "@/lib/forum";
import ForumFeed from "./ForumFeed";
import "./forum.css";

export const instant = false;

interface PageProps {
  searchParams: Promise<{
    mode?: string;
    book?: string;
    sort?: string;
    filter?: string;
    from?: string;
  }>;
}

async function ForumContent({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const mode =
    resolvedParams.mode === "per_book" ? "per_book" : "universal";
  const book = resolvedParams.book?.trim() || undefined;
  const fromDailyStory = resolvedParams.from === "daily-story";

  const validSorts: FeedSort[] = ["discover", "top", "new"];
  const sort: FeedSort = validSorts.includes(resolvedParams.sort as FeedSort)
    ? (resolvedParams.sort as FeedSort)
    : "discover";

  const validFilters: MediaFilter[] = [
    "all",
    "book",
    "movie",
    "album",
    "general",
  ];
  const filter: MediaFilter = validFilters.includes(
    resolvedParams.filter as MediaFilter
  )
    ? (resolvedParams.filter as MediaFilter)
    : "all";

  // Check auth session & profile
  let profile = null;
  let isLoggedIn = false;
  let userBooks: string[] = [];

  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (user) {
      profile = await getProfile(user);
      if (profile && isProfileComplete(profile)) {
        isLoggedIn = true;
        const userLogs = await listLogs(profile.id);
        userBooks = Array.from(new Set(userLogs.books.map((b) => b.name.trim())));
      }
    }
  } catch {
    // Unauthenticated guest browsing
  }

  // Fetch available book titles across all forum posts
  const availableBooks = await getDistinctBookTitles();

  // If in Per-Book mode and a title is selected, fetch discussion statistics
  let bookStats: { postCount: number; commentCount: number } | undefined;
  if (mode === "per_book" && book) {
    bookStats = await getBookDiscussionStats(book);
  }

  // Fetch initial batch of posts
  const { posts, nextCursor, hasMore } = await fetchForumFeed({
    mode,
    bookTitle: book,
    sort,
    filter,
    limit: 15,
    profileId: profile?.id ?? null,
  });

  return (
    <ForumFeed
      key={`${mode}-${book ?? ""}-${sort}-${filter}`}
      initialPosts={posts}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
      initialMode={mode}
      initialBook={book}
      initialSort={sort}
      initialFilter={filter}
      userBooks={userBooks}
      availableBooks={availableBooks}
      bookStats={bookStats}
      isLoggedIn={isLoggedIn}
      currentProfileId={isLoggedIn ? profile?.id ?? null : null}
      fromDailyStory={fromDailyStory}
    />
  );
}

export default function ForumPage(props: PageProps) {
  return (
    <main className="forum-main" suppressHydrationWarning>
      <Suspense
        fallback={
          <div className="forum-container" style={{ padding: "3rem 1rem", textAlign: "center", fontFamily: "var(--forum-font-mono)", fontSize: "0.85rem", color: "var(--forum-text-secondary)" }}>
            <span style={{ display: "inline-block", marginRight: "0.5rem" }}>⏳</span>
            Opening the community library…
          </div>
        }
      >
        <ForumContent {...props} />
      </Suspense>
    </main>
  );
}
