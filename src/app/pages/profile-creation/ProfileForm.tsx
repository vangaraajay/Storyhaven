"use client";

import { useActionState } from "react";
import {
  createProfileAction,
  type ProfileFormState,
} from "./actions";

const initialState: ProfileFormState = { error: null };

type ProfileFormProps = {
  defaultDisplayName?: string;
  defaultAvatarUrl?: string;
};

export default function ProfileForm({
  defaultDisplayName = "",
  defaultAvatarUrl = "",
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(
    createProfileAction,
    initialState,
  );

  return (
    <form action={action}>
      <div>
        <label htmlFor="display_name">Display name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={defaultDisplayName}
        />
      </div>
      <div>
        <label htmlFor="avatar_url">Avatar URL (optional)</label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="url"
          defaultValue={defaultAvatarUrl}
        />
      </div>
      {state.error ? <p>{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create profile"}
      </button>
    </form>
  );
}
