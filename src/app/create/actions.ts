"use server";

import { auth0 } from "@/lib/auth0";
import { parseAvatar } from "@/lib/avatar/types";
import { saveAvatar } from "@/lib/profiles";

/** Saves profiles.avatar for the signed-in user (server-side, after Auth0). */
export async function saveAvatarAction(
  avatarJson: string,
): Promise<{ error: string | null }> {
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user) return { error: "You must be logged in." };

  try {
    await saveAvatar(user, parseAvatar(avatarJson));
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save character.",
    };
  }
}
