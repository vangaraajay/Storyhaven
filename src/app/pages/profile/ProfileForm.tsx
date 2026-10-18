"use client";

import { useActionState } from "react";
import AvatarCreator from "@/components/pixel/AvatarCreator";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput from "@/components/pixel/PixelInput";
import type { Avatar } from "@/lib/avatar/types";
import {
  createProfileAction,
  type ProfileFormState,
} from "./actions";

const initialState: ProfileFormState = { error: null };

type ProfileFormProps = {
  defaultDisplayName?: string;
  defaultAvatar?: Avatar | null;
  /** True when the profile already exists (edit from the library). */
  isEditing?: boolean;
};

export default function ProfileForm({
  defaultDisplayName = "",
  defaultAvatar = null,
  isEditing = false,
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(
    createProfileAction,
    initialState,
  );

  return (
    <form action={action}>
      <div>
        <label htmlFor="display_name">Display name</label>
        <PixelInput
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={defaultDisplayName}
        />
      </div>
      <h2>{isEditing ? "Edit your character" : "Create your character"}</h2>
      <input type="hidden" name="editing" value={isEditing ? "1" : ""} />
      <AvatarCreator name="avatar" defaultValue={defaultAvatar} />
      {state.error ? <p>{state.error}</p> : null}
      <PixelButton type="submit" disabled={pending}>
        {pending ? "Saving…" : isEditing ? "Save profile" : "Create profile"}
      </PixelButton>
    </form>
  );
}
