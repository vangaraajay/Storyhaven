"use client";

import type { ReactNode } from "react";
import PixelTabs from "@/components/pixel/PixelTabs";
import type { FeedSort } from "@/lib/forum";
import Icon from "@/components/pixel/Icon";

interface FeedTabsProps {
  currentSort: FeedSort;
  onChangeSort: (sort: FeedSort) => void;
}

const TABS: { id: FeedSort; label: string; icon: ReactNode }[] = [
  { id: "discover", label: "Discover", icon: <Icon name="dice" size={1} /> },
  { id: "top", label: "Top", icon: <Icon name="flame" size={1} /> },
  { id: "new", label: "New", icon: <Icon name="sparkle" size={1} /> },
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
