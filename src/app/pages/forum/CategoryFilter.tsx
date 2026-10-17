"use client";

import type { ReactNode } from "react";
import PixelTabs from "@/components/pixel/PixelTabs";
import type { MediaFilter } from "@/lib/forum";
import Icon from "@/components/pixel/Icon";

interface CategoryFilterProps {
  currentFilter: MediaFilter;
  onChangeFilter: (filter: MediaFilter) => void;
}

const FILTERS: { id: MediaFilter; label: string; icon: ReactNode }[] = [
  { id: "all", label: "All", icon: "🌌" },
  { id: "book", label: "Books", icon: <Icon name="book" size={1} /> },
  { id: "movie", label: "Movies", icon: <Icon name="film" size={1} /> },
  { id: "album", label: "Music", icon: <Icon name="vinyl" size={1} /> },
  { id: "general", label: "General", icon: "☕" },
];

export default function CategoryFilter({
  currentFilter,
  onChangeFilter,
}: CategoryFilterProps) {
  return (
    <PixelTabs
      tabs={FILTERS}
      value={currentFilter}
      onChange={onChangeFilter}
      aria-label="Filter by category"
    />
  );
}
