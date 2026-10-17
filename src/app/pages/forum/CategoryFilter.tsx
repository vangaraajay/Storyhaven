"use client";

import type { MediaFilter } from "@/lib/forum";

interface CategoryFilterProps {
  currentFilter: MediaFilter;
  onChangeFilter: (filter: MediaFilter) => void;
}

const FILTERS: { id: MediaFilter; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "🌌" },
  { id: "book", label: "Books", icon: "📚" },
  { id: "movie", label: "Movies", icon: "🎬" },
  { id: "album", label: "Music", icon: "🎵" },
  { id: "general", label: "General", icon: "☕" },
];

export default function CategoryFilter({
  currentFilter,
  onChangeFilter,
}: CategoryFilterProps) {
  return (
    <div className="forum-filter-list">
      {FILTERS.map((f) => {
        const isActive = currentFilter === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChangeFilter(f.id)}
            className={`forum-filter-chip ${isActive ? "active" : ""}`}
          >
            <span>{f.icon}</span> {f.label}
          </button>
        );
      })}
    </div>
  );
}
