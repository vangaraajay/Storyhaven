"use client";

import type { ReactNode } from "react";
import PixelTabs from "@/components/pixel/PixelTabs";
import Icon from "@/components/pixel/Icon";

type FeedMode = "universal" | "per_book";

interface FeedModeToggleProps {
  mode: FeedMode;
  onChangeMode: (mode: FeedMode) => void;
}

const MODES: { id: FeedMode; label: string; icon: ReactNode }[] = [
  { id: "universal", label: "Universal Feed", icon: <Icon name="globe" size={1} /> },
  { id: "per_book", label: "Per-Book Hubs", icon: <Icon name="book" size={1} /> },
];

export default function FeedModeToggle({ mode, onChangeMode }: FeedModeToggleProps) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <PixelTabs
        tabs={MODES}
        value={mode}
        onChange={onChangeMode}
        aria-label="Feed mode"
      />
    </div>
  );
}
