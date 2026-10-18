"use client";

import Link from "next/link";
import VoteControls from "@/components/forum/VoteControls";
import MediaBadge from "@/components/forum/MediaBadge";
import MarkdownRenderer from "@/components/forum/MarkdownRenderer";
import CommentForm from "./CommentForm";
import CommentTree from "./CommentTree";
import DeleteControl from "../DeleteControl";
import type { ForumPost, CommentNode } from "@/lib/forum";
import Icon from "@/components/pixel/Icon";
import Avatar from "@/components/pixel/Avatar";
import PixelLink from "@/components/pixel/PixelLink";

interface ThreadViewProps {
  post: ForumPost;
  commentTree: CommentNode[];
  isLoggedIn: boolean;
  currentProfileId: string | null;
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
  currentProfileId,
}: ThreadViewProps) {
  const authorName = post.profile?.display_name || "Anonymous";
  const isOwner = Boolean(
    currentProfileId && currentProfileId === post.profile_id,
  );

  return (
    <div className="forum-thread-container">
      {/* Navigation Breadcrumb */}
      <div className="forum-breadcrumb" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <PixelLink href="/" style={{ marginBottom: 0 }}>
          <Icon name="arrow_left" size={1} /> Return to Haven
        </PixelLink>
        <span style={{ color: "var(--forum-border-subtle)" }}>•</span>
        <Link href="/pages/forum" className="forum-breadcrumb-link">
          Back to Discussions
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
            <Avatar avatar={post.profile?.avatar} scale={1} crop="head" label={authorName} />

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
            <span><Icon name="chat" size={1} /> {post.comments_count} comments</span>
            {post.media_title && post.media_type === "book" && (
              <PixelLink
                href={`/pages/forum?mode=per_book&book=${encodeURIComponent(
                  post.media_title
                )}`}
              >
                More on &quot;{post.media_title}&quot; <Icon name="arrow_right" size={1} />
              </PixelLink>
            )}
            {isOwner && <DeleteControl kind="post" postId={post.id} />}
          </div>
        </div>
      </article>

      {/* Comment Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--forum-text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--forum-font-mono)" }}>
          <Icon name="chat" size={1} /> Comments ({post.comments_count})
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
          currentProfileId={currentProfileId}
        />
      </section>
    </div>
  );
}
