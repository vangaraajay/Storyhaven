"use client";

import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import {
  deleteBookAction,
  deleteMovieAction,
  deleteAlbumAction,
} from "./actions";
import PixelButton from "@/components/pixel/PixelButton";

type CatalogDetailModalProps = {
  item: CatalogItem | null;
  onClose: () => void;
  onItemDeleted?: (id: string) => void;
};

export default function CatalogDetailModal({
  item,
  onClose,
  onItemDeleted,
}: CatalogDetailModalProps) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const backdropRef = useRef<HTMLDivElement>(null);

  // Background scroll lock & ESC key listener
  useEffect(() => {
    if (!item) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) return null;

  const typeName =
    item.type === "book" ? "Book" : item.type === "movie" ? "Movie" : "Album";
  const typeIcon =
    item.type === "book" ? "📚" : item.type === "movie" ? "🎬" : "🎵";

  const renderStars = (rating: number | null) => {
    if (rating == null) return "Unrated";
    const stars = Math.round(rating);
    const filled = "★".repeat(stars);
    const empty = "☆".repeat(Math.max(0, 5 - stars));
    return `${filled}${empty} (${rating}/5)`;
  };

  const handleDelete = () => {
    if (
      !confirm(`Are you sure you want to delete "${item.name}" from your catalog?`)
    ) {
      return;
    }

    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);

      if (item.type === "book") {
        await deleteBookAction(formData);
      } else if (item.type === "movie") {
        await deleteMovieAction(formData);
      } else if (item.type === "album") {
        await deleteAlbumAction(formData);
      }

      onItemDeleted?.(item.id);
      onClose();
    });
  };

  return (
    <div
      ref={backdropRef}
      className="catalog-modal-backdrop"
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-modal-title"
    >
      <div className="catalog-modal">
        <PixelButton
          type="button"
          onClick={onClose}
          aria-label="Close details"
        >
          ✕
        </PixelButton>

        <div className="catalog-modal-body">
          <div className="catalog-modal-cover-wrap">
            {item.cover_url ? (
              <img
                src={item.cover_url}
                alt={item.name}
                className="catalog-modal-cover-img"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="catalog-card-placeholder">
                <span className="catalog-card-placeholder-icon">
                  {typeIcon}
                </span>
                <span className="catalog-card-placeholder-text">No Cover</span>
              </div>
            )}
          </div>

          <div className="catalog-modal-content">
            <div className="catalog-modal-header">
              <div className="catalog-modal-type-tag">
                {typeIcon} {typeName}
              </div>
              <h3 id="catalog-modal-title" className="catalog-modal-title">
                {item.name}
              </h3>
            </div>

            <div className="catalog-modal-meta-grid">
              <div className="catalog-meta-item">
                <span className="catalog-meta-label">Logged By</span>
                <span className="catalog-meta-value">
                  👤 {item.owner.isSelf ? "You" : item.owner.display_name}
                </span>
              </div>

              <div className="catalog-meta-item">
                <span className="catalog-meta-label">Rating</span>
                <span className="catalog-meta-value">
                  {renderStars(item.rating)}
                </span>
              </div>

              {item.status && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Status</span>
                  <span className="catalog-meta-value" style={{ textTransform: "capitalize" }}>
                    {item.status}
                  </span>
                </div>
              )}

              {item.pages != null && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Pages</span>
                  <span className="catalog-meta-value">{item.pages}</span>
                </div>
              )}

              {item.runtime != null && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Runtime</span>
                  <span className="catalog-meta-value">{item.runtime} min</span>
                </div>
              )}

              {item.started_date && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Started</span>
                  <span className="catalog-meta-value">{item.started_date}</span>
                </div>
              )}

              {item.finished_date && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Finished</span>
                  <span className="catalog-meta-value">{item.finished_date}</span>
                </div>
              )}

              {item.liked && (
                <div className="catalog-meta-item">
                  <span className="catalog-meta-label">Favorite</span>
                  <span className="catalog-meta-value">❤️ Favorited</span>
                </div>
              )}
            </div>

            {item.review && (
              <div className="catalog-modal-review">
                "{item.review}"
              </div>
            )}

            <div className="catalog-modal-actions">
              {item.type === "book" && (
                <Link
                  href={`/pages/forum?mode=per_book&book=${encodeURIComponent(item.name)}`}
                  className="catalog-modal-btn-forum"
                  onClick={onClose}
                >
                  💬 Discuss in Forum →
                </Link>
              )}

              {item.owner.isSelf && (
                <PixelButton
                  type="button"
                  className="catalog-modal-btn-delete"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting…" : "🗑️ Delete Entry"}
                </PixelButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
