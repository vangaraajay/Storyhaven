"use client";

import Link from "next/link";
import Icon from "@/components/pixel/Icon";
import PixelButton from "@/components/pixel/PixelButton";

interface BookDetailHeaderProps {
  bookTitle: string;
  postCount?: number;
  commentCount?: number;
  onClearBook: () => void;
}

export default function BookDetailHeader({
  bookTitle,
  postCount = 0,
  commentCount = 0,
  onClearBook,
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
              Book Discussion Hub
            </span>
            <PixelButton
              type="button"
              onClick={onClearBook}
              style={{
                fontSize: "0.75rem",
                color: "#8a5a1e",
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

      <div style={{ display: "flex", alignItems: "center" }}>
        <Link
          href="/pages/library"
          className="forum-btn-secondary"
          style={{ color: "var(--forum-accent-gold)" }}
        >
          View in Library →
        </Link>
      </div>
    </div>
  );
}
