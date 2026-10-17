"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type {
  CatalogFeedResponse,
  CatalogItem,
  CatalogMediaType,
  CatalogMode,
} from "@/lib/catalog";
import { getCatalogFeedAction } from "./actions";
import CatalogCard from "./CatalogCard";
import CatalogDetailModal from "./CatalogDetailModal";

type CatalogSectionProps = {
  initialFriendsFeed: CatalogFeedResponse;
  initialSelfFeed: CatalogFeedResponse;
};

export default function CatalogSection({
  initialFriendsFeed,
  initialSelfFeed,
}: CatalogSectionProps) {
  const [mode, setMode] = useState<CatalogMode>("friends");
  const [category, setCategory] = useState<CatalogMediaType>("all");
  const [page, setPage] = useState<number>(1);
  const [feed, setFeed] = useState<CatalogFeedResponse>(initialFriendsFeed);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Mode-aware synchronization when props update from server revalidation
  useEffect(() => {
    if (category === "all" && page === 1) {
      if (mode === "friends") {
        setFeed(initialFriendsFeed);
      } else {
        setFeed(initialSelfFeed);
      }
    }
  }, [initialFriendsFeed, initialSelfFeed, mode, category, page]);

  const loadFeed = (
    nextMode: CatalogMode,
    nextCategory: CatalogMediaType,
    nextPage: number,
  ) => {
    startTransition(async () => {
      try {
        const nextFeed = await getCatalogFeedAction(
          nextMode,
          nextCategory,
          nextPage,
        );
        // Double-check mode matches when async response returns
        setFeed(nextFeed);
        setMode(nextMode);
        setCategory(nextCategory);
        setPage(nextPage);
      } catch (err) {
        console.error("Failed to load catalog feed:", err);
      }
    });
  };

  const handleModeChange = (newMode: CatalogMode) => {
    if (newMode === mode) return;

    // Immediately swap to preloaded feed if at page 1 and "all" category
    if (category === "all") {
      setFeed(newMode === "friends" ? initialFriendsFeed : initialSelfFeed);
      setMode(newMode);
      setPage(1);
    }
    loadFeed(newMode, category, 1);
  };

  const handleCategoryChange = (newCategory: CatalogMediaType) => {
    if (newCategory === category) return;
    loadFeed(mode, newCategory, 1);
  };

  const handlePageChange = (newPage: number) => {
    loadFeed(mode, category, newPage);
  };

  const handleItemDeleted = (deletedId: string) => {
    setFeed((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== deletedId),
      totalCount: Math.max(0, prev.totalCount - 1),
    }));
    // Re-fetch current page to backfill
    loadFeed(mode, category, page);
  };

  // Defense-in-depth isolation: when viewing "My Catalog", strictly filter to self-owned items
  const displayItems =
    mode === "self"
      ? feed.items.filter((item) => item.owner.isSelf)
      : feed.items;

  return (
    <section className="catalog-section" aria-label="Media Catalog">
      {/* Header with Title and Mode Switch */}
      <div className="catalog-header-bar">
        <div className="catalog-title-col">
          <h2 className="catalog-heading">
            {mode === "friends"
              ? "👥 Friends & Community Catalog"
              : "👤 My Personal Catalog"}
          </h2>
          <span className="catalog-subheading">
            {mode === "friends"
              ? "Recent books, movies, and albums logged across your friend circle"
              : "All your logged media in one cozy timeline"}
          </span>
        </div>

        {/* Switch: Friends Catalog (Default) vs My Catalog */}
        <div
          className="catalog-mode-switch"
          role="group"
          aria-label="Catalog View Mode"
        >
          <button
            type="button"
            className={`catalog-mode-btn ${mode === "friends" ? "active" : ""}`}
            onClick={() => handleModeChange("friends")}
            disabled={isPending}
          >
            👥 Friends Catalog
          </button>
          <button
            type="button"
            className={`catalog-mode-btn ${mode === "self" ? "active" : ""}`}
            onClick={() => handleModeChange("self")}
            disabled={isPending}
          >
            👤 My Catalog
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        className="catalog-filters"
        role="tablist"
        aria-label="Media Type Filters"
      >
        <button
          type="button"
          className={`catalog-filter-pill ${category === "all" ? "active" : ""}`}
          onClick={() => handleCategoryChange("all")}
          disabled={isPending}
        >
          All ({feed.counts.all})
        </button>
        <button
          type="button"
          className={`catalog-filter-pill ${category === "book" ? "active" : ""}`}
          onClick={() => handleCategoryChange("book")}
          disabled={isPending}
        >
          📚 Books ({feed.counts.books})
        </button>
        <button
          type="button"
          className={`catalog-filter-pill ${category === "movie" ? "active" : ""}`}
          onClick={() => handleCategoryChange("movie")}
          disabled={isPending}
        >
          🎬 Movies ({feed.counts.movies})
        </button>
        <button
          type="button"
          className={`catalog-filter-pill ${category === "album" ? "active" : ""}`}
          onClick={() => handleCategoryChange("album")}
          disabled={isPending}
        >
          🎵 Albums ({feed.counts.albums})
        </button>
      </div>

      {/* Grid or Empty State */}
      <div
        style={{
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        {displayItems.length === 0 ? (
          <div className="catalog-empty">
            <span className="catalog-empty-icon">📖</span>
            {mode === "friends" && !feed.hasFriends ? (
              <>
                <p>
                  Your social library is quiet. Connect with fellow readers and
                  friends in the Haven lounge to see their shared media logs!
                </p>
                <Link href="/pages/friends" className="catalog-empty-action">
                  👥 Go to Friends Lounge →
                </Link>
              </>
            ) : (
              <p>
                {category === "all"
                  ? mode === "self"
                    ? "You haven't logged any media yet. Add your first book, movie, or album below!"
                    : "No logs found in this view yet. Add your first book, movie, or album below!"
                  : `No ${category}s logged in this view yet. Start by logging one below!`}
              </p>
            )}
          </div>
        ) : (
          <div className="catalog-grid">
            {displayItems.map((item) => (
              <CatalogCard
                key={`${item.type}-${item.id}`}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {feed.totalPages > 1 && (
        <div className="catalog-pagination">
          <button
            type="button"
            className="catalog-page-btn"
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isPending}
          >
            ← Previous
          </button>
          <span className="catalog-page-indicator">
            Page {feed.currentPage} of {feed.totalPages} ({feed.totalCount} items)
          </span>
          <button
            type="button"
            className="catalog-page-btn"
            onClick={() => handlePageChange(Math.min(feed.totalPages, page + 1))}
            disabled={page >= feed.totalPages || isPending}
          >
            Next →
          </button>
        </div>
      )}

      {/* Detail Pop-up Modal */}
      <CatalogDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onItemDeleted={handleItemDeleted}
      />
    </section>
  );
}
