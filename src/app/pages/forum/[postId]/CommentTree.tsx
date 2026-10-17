"use client";

import CommentItem from "./CommentItem";
import type { CommentNode } from "@/lib/forum";

interface CommentTreeProps {
  nodes: CommentNode[];
  postId: string;
  isLoggedIn: boolean;
  currentProfileId: string | null;
}

export default function CommentTree({
  nodes,
  postId,
  isLoggedIn,
  currentProfileId,
}: CommentTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="forum-empty-card" style={{ padding: "2.5rem 1rem", margin: "1rem 0" }}>
        <p style={{ color: "var(--forum-text-secondary)", fontSize: "0.875rem", margin: 0, fontFamily: "var(--forum-font-mono)" }}>
          No comments yet. Be the first to share your thoughts!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {nodes.map((rootNode) => (
        <CommentItem
          key={rootNode.id}
          node={rootNode}
          postId={postId}
          isLoggedIn={isLoggedIn}
          currentProfileId={currentProfileId}
          depth={0}
        />
      ))}
    </div>
  );
}
