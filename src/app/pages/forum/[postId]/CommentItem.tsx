"use client";

import { useState } from "react";
import VoteControls from "@/components/forum/VoteControls";
import MarkdownRenderer from "@/components/forum/MarkdownRenderer";
import CommentForm from "./CommentForm";
import type { CommentNode } from "@/lib/forum";

interface CommentItemProps {
  node: CommentNode;
  postId: string;
  isLoggedIn: boolean;
  depth?: number;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function CommentItem({
  node,
  postId,
  isLoggedIn,
  depth = 0,
}: CommentItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const author = node.profile?.display_name || "Anonymous";

  return (
    <div style={{ position: "relative", marginLeft: depth > 0 ? (depth > 3 ? "0.75rem" : "1.25rem") : 0, paddingLeft: depth > 0 ? "0.75rem" : 0, marginTop: "0.5rem" }}>
      {/* Left guide line for indentation */}
      {depth > 0 && (
        <div
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="forum-comment-guide"
          title="Click to collapse thread"
        />
      )}

      {/* Comment Container */}
      <div className="forum-comment-card">
        {/* Header Row */}
        <div className="forum-comment-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="forum-avatar" style={{ width: "20px", height: "20px", fontSize: "9px" }}>
              {author.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 600, color: "var(--forum-text-primary)" }}>{author}</span>
            <span style={{ color: "var(--forum-text-muted)" }}>•</span>
            <span style={{ color: "var(--forum-text-secondary)", fontSize: "0.75rem" }}>
              {timeAgo(node.created_at)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            style={{ fontSize: "0.775rem", color: "#c5c3ce", fontWeight: 700, cursor: "pointer", padding: "0 0.35rem" }}
          >
            {isCollapsed ? "[+]" : "[−]"}
          </button>
        </div>

        {/* Comment Body & Actions */}
        {!isCollapsed && (
          <>
            <div style={{ marginBottom: "0.6rem", fontSize: "0.875rem", color: "var(--forum-text-primary)" }}>
              <MarkdownRenderer content={node.content} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontFamily: "var(--forum-font-mono)", fontSize: "0.75rem", color: "var(--forum-text-secondary)" }}>
              {/* Horizontal Vote Controls */}
              <VoteControls
                targetType="comment"
                targetId={node.id}
                initialScore={node.score}
                initialUserVote={node.user_vote}
                isLoggedIn={isLoggedIn}
                layout="horizontal"
              />

              {/* Reply Button */}
              <button
                type="button"
                onClick={() => setIsReplying((prev) => !prev)}
                className="forum-btn-ghost"
              >
                {isReplying ? "Cancel Reply" : "Reply"}
              </button>
            </div>

            {/* Inline Reply Form */}
            {isReplying && (
              <div style={{ marginTop: "0.75rem", paddingLeft: "0.25rem" }}>
                <CommentForm
                  postId={postId}
                  parentId={node.id}
                  isLoggedIn={isLoggedIn}
                  autoFocus
                  onSuccess={() => setIsReplying(false)}
                  onCancel={() => setIsReplying(false)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Recursive Children (when not collapsed) */}
      {!isCollapsed && node.children && node.children.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              postId={postId}
              isLoggedIn={isLoggedIn}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
