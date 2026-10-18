"use client";

import Icon from "@/components/pixel/Icon";
import PixelButton from "@/components/pixel/PixelButton";
import PixelLink from "@/components/pixel/PixelLink";

interface BookDetailHeaderProps {
  bookTitle: string;
  postCount?: number;
  commentCount?: number;
  onClearBook: () => void;
  fromDailyStory?: boolean;
}

export default function BookDetailHeader({
  bookTitle,
  postCount = 0,
  commentCount = 0,
  onClearBook,
  fromDailyStory = false,
}: BookDetailHeaderProps) {
  return (
    <div className="forum-book-banner">
      <div className="forum-book-banner-left">
        <div className="forum-book-icon-badge">
          <Icon name="book" />
        </div>
        <div>
          <div className="forum-book-banner-meta">
            <span className="forum-book-banner-tag">
              {fromDailyStory ? "Daily Story Discussion" : "Book Discussion Hub"}
            </span>
            <PixelButton
              type="button"
              onClick={onClearBook}
              style={{
                fontSize: "0.75rem",
                color: "var(--forum-accent-gold)",
                fontWeight: 600,
                fontFamily: "var(--forum-font-mono)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              (Switch Book)
            </PixelButton>
          </div>
          <h1 className="forum-book-banner-title">
            {bookTitle}
          </h1>
          <p className="forum-book-banner-stats">
            {postCount} {postCount === 1 ? "thread" : "threads"} • {commentCount}{" "}
            {commentCount === 1 ? "comment" : "comments"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {fromDailyStory ? (
          <PixelLink
            href="/pages/daily-story"
            style={{ color: "var(--forum-accent-foam)" }}
          >
            <Icon name="arrow_left" size={1} /> Back to Daily Story
          </PixelLink>
        ) : (
          <PixelLink
            href="/pages/library"
            style={{ color: "var(--forum-accent-gold)" }}
          >
            View in Library <Icon name="arrow_right" size={1} />
          </PixelLink>
        )}
      </div>
    </div>
  );
}
