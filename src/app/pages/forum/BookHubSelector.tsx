"use client";

import { useState } from "react";
import Icon from "@/components/pixel/Icon";

interface BookHubSelectorProps {
  userBooks: string[];
  availableBooks: string[];
  selectedBook?: string;
  onSelectBook: (book: string) => void;
}

export default function BookHubSelector({
  userBooks,
  availableBooks,
  selectedBook,
  onSelectBook,
}: BookHubSelectorProps) {
  const [search, setSearch] = useState("");

  const combinedSuggestions = Array.from(
    new Set([...userBooks, ...availableBooks])
  ).filter((b) => b.toLowerCase().includes(search.toLowerCase().trim()));

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onSelectBook(search.trim());
      setSearch("");
    }
  };

  return (
    <div className="forum-book-selector">
      <div className="forum-book-selector-header">
        <div>
          <span className="forum-book-selector-title">
            <Icon name="book" size={1} /> Select a Book Discussion Hub
          </span>
          <p className="forum-book-selector-desc">
            Filter all forum threads to a single book title, or pick one from your shelf.
          </p>
        </div>

        {/* Search / Enter Title Form */}
        <form onSubmit={handleCustomSubmit} className="forum-book-search-form">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or enter book…"
            className="forum-book-search-input"
          />
          <button
            type="submit"
            className="forum-btn-secondary"
          >
            Go
          </button>
        </form>
      </div>

      {/* User's Logged Shelf Quick Chips */}
      {userBooks.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--forum-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
            From Your Library Shelf:
          </span>
          <div className="forum-chip-group">
            {userBooks.map((book) => {
              const isSelected =
                selectedBook?.toLowerCase() === book.toLowerCase();
              return (
                <button
                  key={book}
                  type="button"
                  onClick={() => onSelectBook(book)}
                  className={`forum-book-chip ${isSelected ? "active" : ""}`}
                >
                  <Icon name="book" size={1} /> {book}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtered Suggestions / Popular Books */}
      {search && combinedSuggestions.length > 0 && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--forum-text-secondary)", display: "block", marginBottom: "0.4rem" }}>
            Matching Titles:
          </span>
          <div className="forum-chip-group">
            {combinedSuggestions.slice(0, 8).map((book) => (
              <button
                key={book}
                type="button"
                onClick={() => {
                  onSelectBook(book);
                  setSearch("");
                }}
                className="forum-book-chip"
                style={{ color: "var(--forum-accent-foam)" }}
              >
                {book}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
