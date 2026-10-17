"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete, type Profile } from "@/lib/profiles";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  castVote,
  fetchForumFeed,
  type FeedOptions,
  type FeedResult,
  type MediaType,
} from "@/lib/forum";

async function getAuthenticatedProfile(): Promise<Profile | null> {
  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user) return null;

    const profile = await getProfile(user);
    if (!profile || !isProfileComplete(profile)) return null;

    return profile;
  } catch {
    return null;
  }
}

async function requireProfile(): Promise<Profile> {
  const profile = await getAuthenticatedProfile();
  if (!profile) {
    throw new Error("You must be signed in with a completed profile to perform this action.");
  }
  return profile;
}

export async function createPostAction(formData: FormData): Promise<{
  error: string | null;
  postId: string | null;
}> {
  try {
    const profile = await requireProfile();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const rawMediaType = String(formData.get("media_type") ?? "general").trim();
    const mediaTitle = String(formData.get("media_title") ?? "").trim() || null;

    if (!title) {
      return { error: "Please enter a post title.", postId: null };
    }
    if (title.length > 300) {
      return { error: "Title must be 300 characters or fewer.", postId: null };
    }
    if (!content) {
      return { error: "Please write some post content.", postId: null };
    }

    const validMediaTypes: MediaType[] = ["book", "movie", "album", "general"];
    const mediaType: MediaType = validMediaTypes.includes(rawMediaType as MediaType)
      ? (rawMediaType as MediaType)
      : "general";

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        profile_id: profile.id,
        title,
        content,
        media_type: mediaType,
        media_title: mediaTitle,
      })
      .select("id")
      .single();

    if (error) {
      return { error: `Failed to create post: ${error.message}`, postId: null };
    }

    revalidatePath("/pages/forum");
    return { error: null, postId: data.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
      postId: null,
    };
  }
}

export async function createCommentAction(formData: FormData): Promise<{
  error: string | null;
  commentId: string | null;
}> {
  try {
    const profile = await requireProfile();
    const postId = String(formData.get("post_id") ?? "").trim();
    const parentId = String(formData.get("parent_id") ?? "").trim() || null;
    const content = String(formData.get("content") ?? "").trim();

    if (!postId) {
      return { error: "Missing post ID.", commentId: null };
    }
    if (!content) {
      return { error: "Comment cannot be empty.", commentId: null };
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("forum_comments")
      .insert({
        post_id: postId,
        parent_id: parentId,
        profile_id: profile.id,
        content,
      })
      .select("id")
      .single();

    if (error) {
      return { error: `Failed to post comment: ${error.message}`, commentId: null };
    }

    revalidatePath(`/pages/forum/${postId}`);
    return { error: null, commentId: data.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
      commentId: null,
    };
  }
}

export async function voteAction({
  targetType,
  targetId,
  voteValue,
}: {
  targetType: "post" | "comment";
  targetId: string;
  voteValue: 1 | -1 | 0;
}): Promise<{ error: string | null; success: boolean }> {
  try {
    const profile = await requireProfile();
    await castVote(profile.id, targetType, targetId, voteValue);
    // Non-blocking: optimistic UI handles local update
    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to vote.",
      success: false,
    };
  }
}

export async function fetchMorePostsAction(options: FeedOptions): Promise<FeedResult> {
  const profile = await getAuthenticatedProfile();
  return fetchForumFeed({
    ...options,
    profileId: profile?.id ?? null,
  });
}
