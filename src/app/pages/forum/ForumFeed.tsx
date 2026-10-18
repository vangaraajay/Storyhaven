"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import FeedModeToggle from "./FeedModeToggle";
import BookHubSelector from "./BookHubSelector";
import BookDetailHeader from "./BookDetailHeader";
import FeedTabs from "./FeedTabs";
import CategoryFilter from "./CategoryFilter";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";
import { fetchMorePostsAction } from "./actions";
import type { ForumPost, FeedSort, MediaFilter, FeedCursor } from "@/lib/forum";
import Icon from "@/components/pixel/Icon";
import PixelButton from "@/components/pixel/PixelButton";

interface ForumFeedProps {
  initialPosts: ForumPost[];
  initialCursor: FeedCursor | null;
  initialHasMore: boolean;
  initialMode: "universal" | "per_book";
  initialBook?: string;
  initialSort: FeedSort;
  initialFilter: MediaFilter;
  userBooks: string[];
  availableBooks: string[];
  bookStats?: { postCount: number; commentCount: number };
  isLoggedIn: boolean;
  currentProfileId: string | null;
}

export default function ForumFeed({
  initialPosts,
  initialCursor,
  initialHasMore,
  initialMode,
  initialBook,
  initialSort,
  initialFilter,
  userBooks,
  availableBooks,
  bookStats,
  isLoggedIn,
  currentProfileId,
}: ForumFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"universal" | "per_book">(initialMode);
  const [selectedBook, setSelectedBook] = useState<string | undefined>(initialBook);
  const [sort, setSort] = useState<FeedSort>(initialSort);
  const [filter, setFilter] = useState<MediaFilter>(initialFilter);

  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [cursor, setCursor] = useState<FeedCursor | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Sync state if server component revalidates / re-renders
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
  }, [initialPosts, initialCursor, initialHasMore]);

  // Immediate optimistic removal when a post is deleted
  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };


  // Update URL helper
  const updateRoute = useCallback(
    (newParams: {
      mode?: "universal" | "per_book";
      book?: string | null;
      sort?: FeedSort;
      filter?: MediaFilter;
    }) => {
      setIsRefreshing(true);
      const params = new URLSearchParams(searchParams.toString());

      const nextMode = newParams.mode ?? mode;
      params.set("mode", nextMode);

      if (newParams.book !== undefined) {
        if (newParams.book) {
          params.set("book", newParams.book);
        } else {
          params.delete("book");
        }
      }

      if (newParams.sort) {
        params.set("sort", newParams.sort);
      }
      if (newParams.filter) {
        params.set("filter", newParams.filter);
      }

      router.replace(`/pages/forum?${params.toString()}`, { scroll: false });
    },
    [mode, router, searchParams]
  );

  const handleModeChange = (newMode: "universal" | "per_book") => {
    setMode(newMode);
    updateRoute({ mode: newMode });
  };

  const handleSelectBook = (book: string) => {
    setSelectedBook(book);
    setMode("per_book");
    updateRoute({ mode: "per_book", book });
  };

  const handleClearBook = () => {
    setSelectedBook(undefined);
    updateRoute({ book: null });
  };

  const handleSortChange = (newSort: FeedSort) => {
    setSort(newSort);
    updateRoute({ sort: newSort });
  };

  const handleFilterChange = (newFilter: MediaFilter) => {
    setFilter(newFilter);
    updateRoute({ filter: newFilter });
  };

  // Load next batch via Server Action
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchMorePostsAction({
        mode,
        bookTitle: selectedBook,
        sort,
        filter,
        cursor,
      });

      setPosts((prev) => [...prev, ...result.posts]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, cursor, mode, selectedBook, sort, filter]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMorePosts]);

  const isPerBook = mode === "per_book";

  return (
    <div className="forum-container">
      {/* Top Navigation */}
      <div style={{ marginBottom: "0.85rem" }}>
        <Link href="/" className="forum-back-btn">
          <span aria-hidden="true">←</span> Return to Haven
        </Link>
      </div>

      {/* Top Header & New Post Action */}
      <div className="forum-header">
        <div className="forum-title-group">
          <div className="forum-title-row">
            <span className="forum-title-icon"><Icon name="chat" /></span>
            <h1 className="forum-title">Community Forum</h1>
          </div>
          <p className="forum-subtitle">
            Discuss books, films, albums, and stories with fellow readers.
          </p>
        </div>

        <div>
          <PixelButton
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span>✍️</span> Create Discussion
          </PixelButton>
        </div>
      </div>

      {/* Mode Switcher */}
      <FeedModeToggle mode={mode} onChangeMode={handleModeChange} />

      {/* Per-Book Hub Selector & Banner */}
      {isPerBook && (
        <>
          <BookHubSelector
            userBooks={userBooks}
            availableBooks={availableBooks}
            selectedBook={selectedBook}
            onSelectBook={handleSelectBook}
          />

          {selectedBook && (
            <BookDetailHeader
              bookTitle={selectedBook}
              postCount={bookStats?.postCount}
              commentCount={bookStats?.commentCount}
              onClearBook={handleClearBook}
            />
          )}
        </>
      )}

      {/* Sorting & Category Filtering Bar */}
      <div className="forum-bar">
        <FeedTabs currentSort={sort} onChangeSort={handleSortChange} />

        {!isPerBook && (
          <CategoryFilter
            currentFilter={filter}
            onChangeFilter={handleFilterChange}
          />
        )}
      </div>

      {/* Feed Posts List */}
      <div className="forum-post-list">
        {isRefreshing ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              fontFamily: "var(--forum-font-mono)",
              fontSize: "0.85rem",
              color: "var(--forum-text-secondary)",
            }}
          >
            <span style={{ display: "inline-block", marginRight: "0.5rem" }}>⏳</span>
            Refreshing discussions…
          </div>
        ) : posts.length === 0 ? (
          <div className="forum-empty-card">
            <span className="forum-empty-icon">📜</span>
            <h3 className="forum-empty-title">No discussions yet</h3>
            <p className="forum-empty-desc">
              {isPerBook && selectedBook
                ? `Be the first to start a conversation about "${selectedBook}"!`
                : "Be the first to share your review, thoughts, or questions."}
            </p>
            <PixelButton
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Start First Discussion
            </PixelButton>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLoggedIn={isLoggedIn}
              currentProfileId={currentProfileId}
              onSelectBook={handleSelectBook}
              onDelete={handleDeletePost}
            />
          ))
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div
        ref={observerTarget}
        style={{
          padding: "2rem 1rem",
          textAlign: "center",
          fontFamily: "var(--forum-font-mono)",
          fontSize: "0.775rem",
          color: "var(--forum-text-secondary)",
        }}
      >
        {isLoadingMore && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <span>⏳</span>
            <span>Unfolding more stories…</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && !isLoadingMore && (
          <p style={{ color: "var(--forum-text-muted)", margin: 0 }}>
            You’ve reached the bottom of this shelf.
          </p>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        isLoggedIn={isLoggedIn}
        initialBookTitle={isPerBook ? selectedBook : undefined}
        userBooks={userBooks}
      />
    </div>
  );
}
