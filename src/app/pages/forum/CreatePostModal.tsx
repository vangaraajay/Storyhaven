"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "./actions";
import type { MediaType } from "@/lib/forum";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput, { PixelSelect, PixelTextarea } from "@/components/pixel/PixelInput";
import Icon from "@/components/pixel/Icon";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  initialBookTitle?: string;
  userBooks?: string[];
}

export default function CreatePostModal({
  isOpen,
  onClose,
  isLoggedIn,
  initialBookTitle,
  userBooks = [],
}: CreatePostModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>(
    initialBookTitle ? "book" : "general"
  );
  const [mediaTitle, setMediaTitle] = useState(initialBookTitle || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("media_type", mediaType);
    if (mediaTitle.trim()) {
      formData.set("media_title", mediaTitle.trim());
    }

    startTransition(async () => {
      const res = await createPostAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.postId) {
        onClose();
        router.push(`/pages/forum/${res.postId}`);
      }
    });
  };

  const insertSpoilerTemplate = () => {
    setContent((prev) => `${prev} >!spoiler text goes here!< `);
  };

  return (
    <div className="forum-modal-backdrop">
      <div className="forum-modal-box">
        {/* Header */}
        <div className="forum-modal-header">
          <h2 className="forum-modal-title">
            <Icon name="pencil" size={1} /> Create Forum Discussion
          </h2>
          <PixelButton
            type="button"
            onClick={onClose}
          >
            <Icon name="close" size={1} />
          </PixelButton>
        </div>

        {!isLoggedIn ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <p style={{ color: "var(--forum-text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              You must be logged in to start a new discussion.
            </p>
            <PixelButton
              type="button"
              onClick={() => router.push("/pages/login?returnTo=/pages/forum")}
            >
              Sign In to Post
            </PixelButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "10px",
                  backgroundColor: "rgba(225, 29, 72, 0.15)",
                  border: "1px solid rgba(225, 29, 72, 0.4)",
                  color: "#fda4af",
                  fontSize: "0.775rem",
                  marginBottom: "1rem",
                  fontFamily: "var(--forum-font-mono)",
                }}
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div className="forum-form-group">
              <label className="forum-label">
                Post Title *
              </label>
              <PixelInput
                type="text"
                required
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What would you like to discuss?"
                className="forum-input"
              />
            </div>

            {/* Media Type & Title */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label className="forum-label">
                  Category
                </label>
                <PixelSelect
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as MediaType)}
                  className="forum-select"
                >
                  <option value="general">General Discussion</option>
                  <option value="book">Book</option>
                  <option value="movie">Movie</option>
                  <option value="album">Music / Album</option>
                </PixelSelect>
              </div>

              {mediaType !== "general" && (
                <div>
                  <label className="forum-label">
                    {mediaType === "book" ? "Book Title" : "Media Title"}
                  </label>
                  <PixelInput
                    type="text"
                    list="user-books-list"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g. Piranesi"
                    className="forum-input"
                  />
                  {userBooks.length > 0 && (
                    <datalist id="user-books-list">
                      {userBooks.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  )}
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="forum-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label className="forum-label" style={{ margin: 0 }}>Content *</label>
                <PixelButton
                  type="button"
                  onClick={insertSpoilerTemplate}
                  style={{
                    color: "#ff8fa3",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "var(--forum-font-mono)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  + Add Spoiler Tag
                </PixelButton>
              </div>
              <PixelTextarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, reviews, theories, or questions..."
                className="forum-textarea"
              />
              <p style={{ fontSize: "0.725rem", color: "var(--forum-text-muted)", marginTop: "0.35rem", fontFamily: "var(--forum-font-mono)" }}>
                Tip: wrap spoilers in <code style={{ color: "var(--forum-accent-rose)" }}>&gt;!spoiler!&lt;</code> to blur them.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem" }}>
              <PixelButton
                type="button"
                onClick={onClose}
              >
                Cancel
              </PixelButton>
              <PixelButton
                type="submit"
                disabled={isPending}
                style={{ opacity: isPending ? 0.6 : 1 }}
              >
                {isPending ? "Posting…" : "Publish Post"}
              </PixelButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
