"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/pixel/Icon";
import { voteAction } from "@/app/pages/forum/actions";

interface VoteControlsProps {
  targetType: "post" | "comment";
  targetId: string;
  initialScore: number;
  initialUserVote: 1 | -1 | null;
  isLoggedIn: boolean;
  layout?: "vertical" | "horizontal";
}

export default function VoteControls({
  targetType,
  targetId,
  initialScore,
  initialUserVote,
  isLoggedIn,
  layout = "vertical",
}: VoteControlsProps) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVote = (direction: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isLoggedIn) {
      router.push(`/pages/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const prevVote = userVote;
    const prevScore = score;
    let nextVote: 1 | -1 | null = null;
    let nextScore = prevScore;

    if (prevVote === direction) {
      // Unvote (cancelling vote)
      nextVote = null;
      nextScore = prevScore - direction;
    } else if (prevVote === null) {
      // First vote
      nextVote = direction;
      nextScore = prevScore + direction;
    } else {
      // Flipping vote (+1 -> -1 or -1 -> +1)
      nextVote = direction;
      nextScore = prevScore + direction * 2;
    }

    // Apply optimistic update immediately
    setUserVote(nextVote);
    setScore(nextScore);
    setErrorMsg(null);

    startTransition(async () => {
      const voteValueToSend: 1 | -1 | 0 = nextVote === null ? 0 : nextVote;
      const res = await voteAction({
        targetType,
        targetId,
        voteValue: voteValueToSend,
      });

      if (!res.success) {
        // Rollback on error
        setUserVote(prevVote);
        setScore(prevScore);
        setErrorMsg(res.error ?? "Failed to save vote");
      }
    });
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  const isVertical = layout === "vertical";

  return (
    <div
      className={`forum-vote-wrap ${isVertical ? "vertical" : "horizontal"}`}
      title={errorMsg ?? undefined}
    >
      {/* Upvote Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleVote(1, e)}
        aria-label="Upvote"
        className={`forum-vote-arrow up ${isUpvoted ? "voted" : ""}`}
      >
        <Icon name="upvote" size={1} />
      </button>

      {/* Score */}
      <span
        className={`forum-vote-score ${isUpvoted ? "up" : isDownvoted ? "down" : ""}`}
      >
        {score}
      </span>

      {/* Downvote Button */}
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleVote(-1, e)}
        aria-label="Downvote"
        className={`forum-vote-arrow down ${isDownvoted ? "voted" : ""}`}
      >
        <Icon name="upvote" size={1} className="px-flip-y" />
      </button>
    </div>
  );
}
