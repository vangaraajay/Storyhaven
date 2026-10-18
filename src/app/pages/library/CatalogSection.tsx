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
import Icon from "@/components/pixel/Icon";
import PixelTabs from "@/components/pixel/PixelTabs";
import CatalogCard from "./CatalogCard";
import CatalogDetailModal from "./CatalogDetailModal";
import PixelButton from "@/components/pixel/PixelButton";

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
              ? <><Icon name="match" size={1} /> Friends &amp; Community Catalog</>
              : "My Personal Catalog"}
          </h2>
          <span className="catalog-subheading">
            {mode === "friends"
              ? "Recent books, movies, and albums logged across your friend circle"
              : "All your logged media in one cozy timeline"}
          </span>
        </div>

        {/* Switch: Friends Catalog (Default) vs My Catalog */}
        <PixelTabs
          aria-label="Catalog View Mode"
          tabs={[
            { id: "friends", label: "Friends Catalog" },
            { id: "self", label: "My Catalog" },
          ]}
          value={mode}
          onChange={(id) => !isPending && handleModeChange(id)}
        />
      </div>

      {/* Category Filters */}
      <PixelTabs
        aria-label="Media Type Filters"
        tabs={[
          { id: "all", label: `All (${feed.counts.all})` },
          { id: "book", label: `Books (${feed.counts.books})`, icon: <Icon name="book" size={1} /> },
          { id: "movie", label: `Movies (${feed.counts.movies})`, icon: <Icon name="film" size={1} /> },
          { id: "album", label: `Albums (${feed.counts.albums})`, icon: <Icon name="vinyl" size={1} /> },
        ]}
        value={category}
        onChange={(id) => !isPending && handleCategoryChange(id)}
      />

      {/* Grid or Empty State */}
      <div
        style={{
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        {displayItems.length === 0 ? (
          <div className="catalog-empty">
            <span className="catalog-empty-icon"><Icon name="book" size={2} /></span>
            {mode === "friends" && !feed.hasFriends ? (
              <>
                <p>
                  Your social library is quiet. Connect with fellow readers and
                  friends in the Haven lounge to see their shared media logs!
                </p>
                <Link href="/pages/friends" className="catalog-empty-action">
                  <Icon name="match" size={1} /> Go to Friends Lounge →
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
          <PixelButton
            type="button"
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isPending}
          >
            ← Previous
          </PixelButton>
          <span className="catalog-page-indicator">
            Page {feed.currentPage} of {feed.totalPages} ({feed.totalCount} items)
          </span>
          <PixelButton
            type="button"
            onClick={() => handlePageChange(Math.min(feed.totalPages, page + 1))}
            disabled={page >= feed.totalPages || isPending}
          >
            Next →
          </PixelButton>
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
