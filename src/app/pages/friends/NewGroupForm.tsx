"use client";

import { useActionState } from "react";
import type { FriendRow } from "@/lib/friends";
import { createGroupAction, type FriendsActionState } from "./actions";

const initial: FriendsActionState = { error: null };

export default function NewGroupForm({ friends }: { friends: FriendRow[] }) {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initial,
  );

  if (friends.length === 0) {
    return (
      <p className="friends-muted">
        Add friends before creating a group chat.
      </p>
    );
  }

  return (
    <form action={formAction} className="friends-new-group">
      <h3>New group</h3>
      <label>
        Group name
        <input name="name" type="text" required maxLength={80} />
      </label>
      <fieldset>
        <legend>Members</legend>
        {friends.map((friend) => (
          <label key={friend.profile.id} className="friends-check">
            <input
              type="checkbox"
              name="memberIds"
              value={friend.profile.id}
            />
            {friend.profile.display_name ?? "Unnamed"}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create group"}
      </button>
      {state.error && <p className="friends-error">{state.error}</p>}
    </form>
  );
}
