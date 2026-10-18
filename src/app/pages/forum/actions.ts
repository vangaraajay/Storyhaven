"use server";

import { revalidatePath } from "next/cache";
import { checkUnlocks } from "@/lib/unlocks";
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
  unlocked?: string[];
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
    const unlocked = await checkUnlocks(profile.id, "forum_post");
    return { error: null, postId: data.id, unlocked };
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
  unlocked?: string[];
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
    const unlocked = await checkUnlocks(profile.id, "forum_comment");
    return { error: null, commentId: data.id, unlocked };
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

export async function deletePostAction(postId: string): Promise<{
  error: string | null;
}> {
  try {
    const profile = await requireProfile();
    const id = postId.trim();
    if (!id) {
      return { error: "Missing post ID." };
    }

    const supabase = createServiceSupabaseClient();
    const { data: existing, error: loadError } = await supabase
      .from("forum_posts")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return { error: `Failed to load post: ${loadError.message}` };
    }
    if (!existing) {
      return { error: "Post not found." };
    }
    if (existing.profile_id !== profile.id) {
      return { error: "You can only delete posts you created." };
    }

    const { error } = await supabase.from("forum_posts").delete().eq("id", id);
    if (error) {
      return { error: `Failed to delete post: ${error.message}` };
    }

    revalidatePath("/pages/forum");
    revalidatePath(`/pages/forum/${id}`);
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete post.",
    };
  }
}

export async function deleteCommentAction(
  commentId: string,
  postId: string,
): Promise<{ error: string | null }> {
  try {
    const profile = await requireProfile();
    const id = commentId.trim();
    const threadId = postId.trim();
    if (!id || !threadId) {
      return { error: "Missing comment or post ID." };
    }

    const supabase = createServiceSupabaseClient();
    const { data: existing, error: loadError } = await supabase
      .from("forum_comments")
      .select("id, profile_id, post_id")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return { error: `Failed to load comment: ${loadError.message}` };
    }
    if (!existing) {
      return { error: "Comment not found." };
    }
    if (existing.profile_id !== profile.id) {
      return { error: "You can only delete comments you created." };
    }
    if (existing.post_id !== threadId) {
      return { error: "Comment does not belong to this post." };
    }

    const { error } = await supabase.from("forum_comments").delete().eq("id", id);
    if (error) {
      return { error: `Failed to delete comment: ${error.message}` };
    }

    revalidatePath(`/pages/forum/${threadId}`);
    revalidatePath("/pages/forum");
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete comment.",
    };
  }
}
