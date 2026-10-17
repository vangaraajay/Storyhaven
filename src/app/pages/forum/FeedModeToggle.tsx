"use client";

interface FeedModeToggleProps {
  mode: "universal" | "per_book";
  onChangeMode: (mode: "universal" | "per_book") => void;
}

export default function FeedModeToggle({ mode, onChangeMode }: FeedModeToggleProps) {
  return (
    <div className="forum-mode-toggle-wrap">
      <button
        type="button"
        onClick={() => onChangeMode("universal")}
        className={`forum-mode-btn ${mode === "universal" ? "active-universal" : ""}`}
      >
        <span>🌐</span> Universal Feed
      </button>

      <button
        type="button"
        onClick={() => onChangeMode("per_book")}
        className={`forum-mode-btn ${mode === "per_book" ? "active-perbook" : ""}`}
      >
        <span>📖</span> Per-Book Hubs
      </button>
    </div>
  );
}
