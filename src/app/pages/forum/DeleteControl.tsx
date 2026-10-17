"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCommentAction, deletePostAction } from "./actions";

type DeleteControlProps =
  | {
      kind: "post";
      postId: string;
      onDeleted?: () => void;
    }
  | {
      kind: "comment";
      commentId: string;
      postId: string;
      onDeleted?: () => void;
    };

export default function DeleteControl(props: DeleteControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const label = props.kind === "post" ? "topic" : "comment";
    if (
      !window.confirm(
        `Delete this ${label}? This cannot be undone${
          props.kind === "post" ? " (all comments will be removed too)" : ""
        }.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result =
        props.kind === "post"
          ? await deletePostAction(props.postId)
          : await deleteCommentAction(props.commentId, props.postId);

      if (result.error) {
        setError(result.error);
        return;
      }

      props.onDeleted?.();

      if (props.kind === "post") {
        router.push("/pages/forum");
        router.refresh();
        return;
      }

      router.refresh();
    });
  }

  return (
    <span className="forum-delete-wrap">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="forum-btn-danger"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="forum-delete-error">{error}</span>}
    </span>
  );
}
