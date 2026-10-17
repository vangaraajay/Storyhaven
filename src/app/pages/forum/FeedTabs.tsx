"use client";

import PixelTabs from "@/components/pixel/PixelTabs";
import type { FeedSort } from "@/lib/forum";

interface FeedTabsProps {
  currentSort: FeedSort;
  onChangeSort: (sort: FeedSort) => void;
}

const TABS: { id: FeedSort; label: string; icon: string }[] = [
  { id: "discover", label: "Discover", icon: "🎲" },
  { id: "top", label: "Top", icon: "🔥" },
  { id: "new", label: "New", icon: "✨" },
];

export default function FeedTabs({ currentSort, onChangeSort }: FeedTabsProps) {
  return (
    <PixelTabs
      tabs={TABS}
      value={currentSort}
      onChange={onChangeSort}
      aria-label="Sort feed"
    />
  );
}
