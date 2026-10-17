"use client";

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
    <div className="forum-tabs">
      {TABS.map((tab) => {
        const isActive = currentSort === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeSort(tab.id)}
            className={`forum-tab ${isActive ? "active" : ""}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        );
      })}
    </div>
  );
}
