"use server";

import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { parseAvatar } from "@/lib/avatar/types";
import { saveProfile } from "@/lib/profiles";

export type ProfileFormState = {
  error: string | null;
};

export async function createProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    return { error: "You must be logged in to create a profile." };
  }

  const displayName = String(formData.get("display_name") ?? "");
  const avatar = parseAvatar(String(formData.get("avatar") ?? ""));

  try {
    await saveProfile(user, {
      display_name: displayName,
      avatar,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save profile.",
    };
  }

  redirect(formData.get("editing") ? "/pages/library" : "/");
}
