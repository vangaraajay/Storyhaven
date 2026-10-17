"use client";

import Link from "next/link";
import VoteControls from "@/components/forum/VoteControls";
import MediaBadge from "@/components/forum/MediaBadge";
import MarkdownRenderer from "@/components/forum/MarkdownRenderer";
import CommentForm from "./CommentForm";
import CommentTree from "./CommentTree";
import type { ForumPost, CommentNode } from "@/lib/forum";

interface ThreadViewProps {
  post: ForumPost;
  commentTree: CommentNode[];
  isLoggedIn: boolean;
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

export default function ThreadView({
  post,
  commentTree,
  isLoggedIn,
}: ThreadViewProps) {
  const authorName = post.profile?.display_name || "Anonymous";

  return (
    <div className="forum-thread-container">
      {/* Navigation Breadcrumb */}
      <div className="forum-breadcrumb">
        <Link href="/pages/forum" className="forum-breadcrumb-link">
          <span>←</span> Back to Discussions
        </Link>
      </div>

      {/* Main Post Card */}
      <article className="forum-thread-card">
        {/* Left Vote Column */}
        <div className="forum-vote-gutter">
          <VoteControls
            targetType="post"
            targetId={post.id}
            initialScore={post.score}
            initialUserVote={post.user_vote}
            isLoggedIn={isLoggedIn}
            layout="vertical"
          />
        </div>

        {/* Post Content */}
        <div className="forum-thread-main">
          {/* Header Meta */}
          <div className="forum-post-meta">
            <div className="forum-avatar">
              {authorName.charAt(0).toUpperCase()}
            </div>

            <span>
              Posted by <span style={{ color: "var(--forum-text-primary)", fontWeight: 600 }}>{authorName}</span>
            </span>

            <span style={{ color: "var(--forum-text-muted)" }}>•</span>
            <span>{timeAgo(post.created_at)}</span>

            <MediaBadge type={post.media_type} title={post.media_title} />
          </div>

          {/* Title */}
          <h1 className="forum-thread-title">
            {post.title}
          </h1>

          {/* Full Body Markdown */}
          <div className="forum-thread-body">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* Bottom Stats */}
          <div className="forum-post-footer" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "0.75rem" }}>
            <span>💬 {post.comments_count} comments</span>
            {post.media_title && post.media_type === "book" && (
              <Link
                href={`/pages/forum?mode=per_book&book=${encodeURIComponent(
                  post.media_title
                )}`}
                style={{ color: "var(--forum-accent-foam)", textDecoration: "underline" }}
              >
                More on &quot;{post.media_title}&quot; →
              </Link>
            )}
          </div>
        </div>
      </article>

      {/* Comment Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--forum-text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--forum-font-mono)" }}>
          <span>💬</span> Comments ({post.comments_count})
        </h2>

        {/* Top-Level Reply Box */}
        <div style={{ marginBottom: "1.5rem" }}>
          <CommentForm
            postId={post.id}
            isLoggedIn={isLoggedIn}
            placeholder="Add to the discussion…"
          />
        </div>

        {/* Nested Comments */}
        <CommentTree
          nodes={commentTree}
          postId={post.id}
          isLoggedIn={isLoggedIn}
        />
      </section>
    </div>
  );
}
