"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  createGroup,
  declineFriendRequest,
  searchProfilesByName,
  sendDmMessage,
  sendFriendRequest,
  sendGroupMessage,
  type MatchCandidate,
} from "@/lib/friends";
import { getProfile, isProfileComplete } from "@/lib/profiles";

export type FriendsActionState = {
  error: string | null;
};

async function requireProfileId(): Promise<string> {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  return profile.id;
}

function revalidateFriends() {
  revalidatePath("/pages/friends");
}

export async function addFriendAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const addresseeId = String(formData.get("addresseeId") ?? "").trim();

  try {
    await sendFriendRequest(profileId, addresseeId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add friend.",
    };
  }

  revalidateFriends();
  return { error: null };
}

export async function acceptRequestAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const friendshipId = String(formData.get("friendshipId") ?? "").trim();

  try {
    await acceptFriendRequest(friendshipId, profileId);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to accept request.",
    };
  }

  revalidateFriends();
  return { error: null };
}

export async function declineRequestAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const friendshipId = String(formData.get("friendshipId") ?? "").trim();

  try {
    await declineFriendRequest(friendshipId, profileId);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to decline request.",
    };
  }

  revalidateFriends();
  return { error: null };
}

export async function cancelRequestAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const friendshipId = String(formData.get("friendshipId") ?? "").trim();

  try {
    await cancelFriendRequest(friendshipId, profileId);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to cancel request.",
    };
  }

  revalidateFriends();
  return { error: null };
}

export async function searchFriendsAction(
  query: string,
): Promise<{ error: string | null; results: MatchCandidate[] }> {
  const profileId = await requireProfileId();

  try {
    const results = await searchProfilesByName(profileId, query);
    return { error: null, results };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Search failed.",
      results: [],
    };
  }
}

export async function sendDmAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const friendshipId = String(formData.get("friendshipId") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const otherId = String(formData.get("otherId") ?? "").trim();

  try {
    await sendDmMessage(friendshipId, profileId, body);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send message.",
    };
  }

  revalidateFriends();
  redirect(`/pages/friends?with=${encodeURIComponent(otherId)}`);
}

export async function sendGroupMessageAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const groupId = String(formData.get("groupId") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  try {
    await sendGroupMessage(groupId, profileId, body);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send message.",
    };
  }

  revalidateFriends();
  redirect(`/pages/friends?group=${encodeURIComponent(groupId)}`);
}

export async function createGroupAction(
  _prev: FriendsActionState,
  formData: FormData,
): Promise<FriendsActionState> {
  const profileId = await requireProfileId();
  const name = String(formData.get("name") ?? "");
  const memberIds = formData
    .getAll("memberIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  let groupId = "";
  try {
    const group = await createGroup(profileId, name, memberIds);
    groupId = group.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create group.",
    };
  }

  revalidateFriends();
  redirect(`/pages/friends?group=${encodeURIComponent(groupId)}`);
}
