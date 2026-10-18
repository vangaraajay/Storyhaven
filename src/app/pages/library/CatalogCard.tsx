"use client";

import type { CatalogItem } from "@/lib/catalog";

type CatalogCardProps = {
  item: CatalogItem;
  onClick: () => void;
};

export default function CatalogCard({ item, onClick }: CatalogCardProps) {
  const categoryBadge =
    item.type === "book" ? "📚" : item.type === "movie" ? "🎬" : "🎵";

  return (
    <button
      type="button"
      className="catalog-card"
      onClick={onClick}
      title={`${item.name} (${item.owner.display_name})`}
    >
      <div className="catalog-card-cover-wrap">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.name}
            className="catalog-card-img"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="catalog-card-placeholder">
            <span className="catalog-card-placeholder-icon">
              {categoryBadge}
            </span>
            <span className="catalog-card-placeholder-text">No Cover</span>
          </div>
        )}

        <span className="catalog-card-badge" title={item.type}>
          {categoryBadge}
        </span>

        {item.rating != null && (
          <span className="catalog-card-rating-badge">★ {item.rating}</span>
        )}
      </div>

      <div className="catalog-card-info">
        <h4 className="catalog-card-title">{item.name}</h4>
        <div
          className={`catalog-card-owner ${item.owner.isSelf ? "is-self" : ""}`}
        >
          <span>👤</span>
          <span>{item.owner.isSelf ? "You" : item.owner.display_name}</span>
        </div>
      </div>
    </button>
  );
}
