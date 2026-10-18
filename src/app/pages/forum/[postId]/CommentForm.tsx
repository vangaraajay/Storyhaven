"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCommentAction } from "../actions";
import UnlockToast from "@/components/pixel/UnlockToast";
import PixelButton from "@/components/pixel/PixelButton";
import { PixelTextarea } from "@/components/pixel/PixelInput";

interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  isLoggedIn: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CommentForm({
  postId,
  parentId,
  isLoggedIn,
  onSuccess,
  onCancel,
  placeholder = "Write a thoughtful reply…",
  autoFocus = false,
}: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string[] | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!isLoggedIn) {
      router.push(`/pages/login?returnTo=/pages/forum/${postId}`);
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("post_id", postId);
    if (parentId) {
      formData.set("parent_id", parentId);
    }
    formData.set("content", content);

    startTransition(async () => {
      const res = await createCommentAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setContent("");
        setUnlocked(res.unlocked);
        onSuccess?.();
      }
    });
  };

  const insertSpoilerTemplate = () => {
    setContent((prev) => `${prev} >!spoiler!< `);
  };

  if (!isLoggedIn) {
    return (
      <div
        className="forum-comment-card"
        style={{ textAlign: "center", padding: "1.25rem 1rem", margin: "0.75rem 0" }}
      >
        <p style={{ color: "var(--forum-text-secondary)", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
          Join the conversation by signing in.
        </p>
        <PixelButton
          type="button"
          onClick={() =>
            router.push(`/pages/login?returnTo=/pages/forum/${postId}`)
          }
        >
          Sign In to Reply
        </PixelButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ margin: "0.75rem 0", fontFamily: "var(--forum-font-mono)", fontSize: "0.775rem" }}>
      <UnlockToast keys={unlocked} />
      {error && (
        <div style={{ padding: "0.5rem 0.75rem", marginBottom: "0.5rem", borderRadius: "8px", background: "rgba(225, 29, 72, 0.15)", border: "1px solid rgba(225, 29, 72, 0.4)", color: "#fda4af" }}>
          {error}
        </div>
      )}

      <div>
        <PixelTextarea
          required
          autoFocus={autoFocus}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%", minHeight: "5rem" }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.5rem" }}>
          <PixelButton
            type="button"
            onClick={insertSpoilerTemplate}
          >
            + Spoiler tag
          </PixelButton>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {onCancel && (
              <PixelButton
                type="button"
                onClick={onCancel}
              >
                Cancel
              </PixelButton>
            )}

            <PixelButton
              type="submit"
              disabled={isPending || !content.trim()}
            >
              {isPending ? "Posting…" : "Reply"}
            </PixelButton>
          </div>
        </div>
      </div>
    </form>
  );
}
