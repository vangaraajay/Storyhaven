"use client";

import Link from "next/link";
import VoteControls from "@/components/forum/VoteControls";
import MediaBadge from "@/components/forum/MediaBadge";
import MarkdownRenderer from "@/components/forum/MarkdownRenderer";
import DeleteControl from "./DeleteControl";
import type { ForumPost } from "@/lib/forum";
import Icon from "@/components/pixel/Icon";
import Avatar from "@/components/pixel/Avatar";

interface PostCardProps {
  post: ForumPost;
  isLoggedIn: boolean;
  currentProfileId: string | null;
  onSelectBook?: (book: string) => void;
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

export default function PostCard({
  post,
  isLoggedIn,
  currentProfileId,
  onSelectBook,
}: PostCardProps) {
  const authorName = post.profile?.display_name || "Anonymous";
  const isOwner = Boolean(
    currentProfileId && currentProfileId === post.profile_id,
  );

  return (
    <article className="forum-post-card">
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

      {/* Main Post Content */}
      <div className="forum-post-main">
        {/* Meta Header */}
        <div className="forum-post-meta">
          <Avatar avatar={post.profile?.avatar} scale={1} crop="head" label={authorName} />

          <span>
            Posted by <span style={{ color: "var(--forum-text-primary)", fontWeight: 600 }}>{authorName}</span>
          </span>

          <span style={{ color: "var(--forum-text-muted)" }}>•</span>
          <span>{timeAgo(post.created_at)}</span>

          {/* Media flair badge */}
          <MediaBadge
            type={post.media_type}
            title={post.media_title}
            onClick={
              post.media_type === "book" && post.media_title && onSelectBook
                ? () => onSelectBook(post.media_title!)
                : undefined
            }
          />
        </div>

        {/* Post Title */}
        <Link href={`/pages/forum/${post.id}`} className="forum-post-title-link">
          <h2 className="forum-post-title">{post.title}</h2>
        </Link>

        {/* Content Snippet */}
        <div className="forum-post-snippet">
          <MarkdownRenderer content={post.content} />
        </div>

        {/* Footer Actions */}
        <div className="forum-post-footer">
          <Link href={`/pages/forum/${post.id}`} className="forum-comment-count-btn">
            <Icon name="chat" size={1} />
            <span>
              {post.comments_count} {post.comments_count === 1 ? "comment" : "comments"}
            </span>
          </Link>
          {isOwner && <DeleteControl kind="post" postId={post.id} />}
        </div>
      </div>
    </article>
  );
}
