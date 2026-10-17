import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type MediaType = "book" | "movie" | "album" | "general";
export type FeedSort = "discover" | "top" | "new";
export type MediaFilter = "all" | "book" | "movie" | "album" | "general";

export interface ForumProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ForumPost {
  id: string;
  profile_id: string;
  title: string;
  content: string;
  media_type: MediaType;
  media_title: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
  comments_count: number;
  random_bucket: number;
  created_at: string;
  updated_at: string;
  profile: ForumProfile | null;
  user_vote: 1 | -1 | null;
}

export interface ForumComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  profile_id: string;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profile: ForumProfile | null;
  user_vote: 1 | -1 | null;
}

export interface CommentNode extends ForumComment {
  children: CommentNode[];
}

export interface FeedCursor {
  sort: FeedSort;
  bucket?: number;
  lastId?: string;
  lastScore?: number;
  lastCreatedAt?: string;
  cycles?: number;
}

export interface FeedOptions {
  mode: "universal" | "per_book";
  bookTitle?: string;
  sort: FeedSort;
  filter: MediaFilter;
  cursor?: FeedCursor;
  limit?: number;
  profileId?: string | null;
}

export interface FeedResult {
  posts: ForumPost[];
  nextCursor: FeedCursor | null;
  hasMore: boolean;
}

/**
 * Builds a recursive comment tree from a flat list in O(N) time.
 */
export function buildCommentTree(comments: ForumComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, {
      ...c,
      children: [],
    });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Hydrates an array of posts with the active user's vote status.
 */
async function attachUserPostVotes(
  posts: Array<Record<string, unknown> & { id: string; profile?: ForumProfile | null }>,
  profileId?: string | null
): Promise<ForumPost[]> {
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const voteMap = new Map<string, 1 | -1>();

  if (profileId) {
    const supabase = createServiceSupabaseClient();
    const { data: votes } = await supabase
      .from("forum_votes")
      .select("post_id, vote_value")
      .eq("profile_id", profileId)
      .in("post_id", postIds);

    if (votes) {
      for (const v of votes) {
        if (v.post_id) {
          voteMap.set(v.post_id, v.vote_value as 1 | -1);
        }
      }
    }
  }

  return posts.map((p) => ({
    ...p,
    profile: p.profile ?? null,
    user_vote: voteMap.get(p.id) ?? null,
  })) as unknown as ForumPost[];
}

/**
 * Fetches feed posts with multi-bucket random walker, top, or new ordering.
 */
export async function fetchForumFeed(options: FeedOptions): Promise<FeedResult> {
  const supabase = createServiceSupabaseClient();
  const limit = options.limit ?? 15;
  const isPerBook = options.mode === "per_book" && Boolean(options.bookTitle?.trim());
  const cleanBookTitle = options.bookTitle?.trim();

  // 1. DISCOVER MODE (Indexed Bucket-Walker in a single query)
  if (options.sort === "discover") {
    const currentBucket =
      options.cursor?.bucket ?? Math.floor(Math.random() * 100);
    const lastId = options.cursor?.lastId;

    let query = supabase
      .from("forum_posts")
      .select("*, profile:profiles(display_name, avatar_url)")
      .order("random_bucket", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (isPerBook && cleanBookTitle) {
      query = query.ilike("media_title", cleanBookTitle);
    } else if (options.filter !== "all") {
      query = query.eq("media_type", options.filter);
    }

    if (lastId) {
      query = query.or(
        `random_bucket.gt.${currentBucket},and(random_bucket.eq.${currentBucket},id.gt.${lastId})`
      );
    } else {
      query = query.gte("random_bucket", currentBucket);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(
        "Notice: Supabase forum_posts table query returned error (run supabase/forum_tables.sql in Supabase):",
        error.message
      );
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const accumulated: Array<Record<string, unknown> & { id: string; random_bucket: number }> = [
      ...(data ?? []),
    ];

    // If starting bucket was near the end (e.g. 95) and we got fewer than limit,
    // do a single wrap-around query starting from bucket 0
    if (accumulated.length < limit && !lastId && currentBucket > 0) {
      const remaining = limit - accumulated.length;
      let wrapQuery = supabase
        .from("forum_posts")
        .select("*, profile:profiles(display_name, avatar_url)")
        .lt("random_bucket", currentBucket)
        .order("random_bucket", { ascending: true })
        .order("id", { ascending: true })
        .limit(remaining);

      if (isPerBook && cleanBookTitle) {
        wrapQuery = wrapQuery.ilike("media_title", cleanBookTitle);
      } else if (options.filter !== "all") {
        wrapQuery = wrapQuery.eq("media_type", options.filter);
      }

      const { data: wrapData } = await wrapQuery;
      if (wrapData && wrapData.length > 0) {
        accumulated.push(...wrapData);
      }
    }

    const posts = await attachUserPostVotes(accumulated, options.profileId);
    const lastItem = accumulated[accumulated.length - 1];
    const hasMore = accumulated.length === limit;

    return {
      posts,
      nextCursor:
        hasMore && lastItem
          ? {
              sort: "discover",
              bucket: lastItem.random_bucket,
              lastId: lastItem.id,
            }
          : null,
      hasMore,
    };
  }

  // 2. TOP & NEW MODES (Keyset / Timestamp cursor)
  let query = supabase
    .from("forum_posts")
    .select("*, profile:profiles(display_name, avatar_url)")
    .limit(limit);

  if (isPerBook && cleanBookTitle) {
    query = query.ilike("media_title", cleanBookTitle);
  } else if (options.filter !== "all") {
    query = query.eq("media_type", options.filter);
  }

  if (options.sort === "top") {
    query = query
      .order("score", { ascending: false })
      .order("created_at", { ascending: false });

    if (options.cursor?.lastScore !== undefined && options.cursor?.lastCreatedAt) {
      query = query.or(
        `score.lt.${options.cursor.lastScore},and(score.eq.${options.cursor.lastScore},created_at.lt.${options.cursor.lastCreatedAt})`
      );
    }
  } else {
    // NEW mode
    query = query.order("created_at", { ascending: false });

    if (options.cursor?.lastCreatedAt) {
      query = query.lt("created_at", options.cursor.lastCreatedAt);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.warn(
      "Notice: Supabase forum_posts table query returned error (run supabase/forum_tables.sql in Supabase):",
      error.message
    );
    return {
      posts: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const posts = await attachUserPostVotes(data ?? [], options.profileId);
  const lastItem = posts[posts.length - 1];
  const hasMore = posts.length === limit;

  return {
    posts,
    nextCursor:
      hasMore && lastItem
        ? {
            sort: options.sort,
            lastScore: lastItem.score,
            lastCreatedAt: lastItem.created_at,
            lastId: lastItem.id,
          }
        : null,
    hasMore,
  };
}

/**
 * Fetches a single post by ID with user vote.
 */
export async function getPostById(
  postId: string,
  profileId?: string | null
): Promise<ForumPost | null> {
  const supabase = createServiceSupabaseClient();

  const { data: post, error } = await supabase
    .from("forum_posts")
    .select("*, profile:profiles(display_name, avatar_url)")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.warn("Notice: getPostById query error (run supabase/forum_tables.sql):", error.message);
    return null;
  }
  if (!post) return null;

  const [hydrated] = await attachUserPostVotes([post], profileId);
  return hydrated;
}

/**
 * Fetches all comments for a post, with user votes, ordered by created_at.
 */
export async function getCommentsByPostId(
  postId: string,
  profileId?: string | null
): Promise<ForumComment[]> {
  const supabase = createServiceSupabaseClient();

  const { data: comments, error } = await supabase
    .from("forum_comments")
    .select("*, profile:profiles(display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Notice: getCommentsByPostId query error (run supabase/forum_tables.sql):", error.message);
    return [];
  }
  if (!comments || comments.length === 0) return [];

  const commentIds = comments.map((c) => c.id);
  const voteMap = new Map<string, 1 | -1>();

  if (profileId) {
    const { data: votes } = await supabase
      .from("forum_votes")
      .select("comment_id, vote_value")
      .eq("profile_id", profileId)
      .in("comment_id", commentIds);

    if (votes) {
      for (const v of votes) {
        if (v.comment_id) {
          voteMap.set(v.comment_id, v.vote_value as 1 | -1);
        }
      }
    }
  }

  return comments.map((c) => ({
    ...c,
    profile: c.profile ?? null,
    user_vote: voteMap.get(c.id) ?? null,
  })) as ForumComment[];
}

/**
 * Fetches distinct book titles mentioned in forum posts for search auto-completion.
 */
export async function getDistinctBookTitles(): Promise<string[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("forum_posts")
    .select("media_title")
    .eq("media_type", "book")
    .not("media_title", "is", null)
    .order("media_title", { ascending: true })
    .limit(100);

  if (error || !data) return [];

  const unique = Array.from(
    new Set(
      data
        .map((row) => row.media_title?.trim())
        .filter((t): t is string => Boolean(t))
    )
  );
  return unique;
}

/**
 * Fetches discussion count and comment count for a specific book title.
 */
export async function getBookDiscussionStats(
  bookTitle: string
): Promise<{ postCount: number; commentCount: number }> {
  const supabase = createServiceSupabaseClient();
  const clean = bookTitle.trim();

  const { data, error } = await supabase
    .from("forum_posts")
    .select("comments_count")
    .ilike("media_title", clean);

  if (error || !data) {
    return { postCount: 0, commentCount: 0 };
  }

  const postCount = data.length;
  const commentCount = data.reduce(
    (acc, row) => acc + (row.comments_count || 0),
    0
  );

  return { postCount, commentCount };
}

/**
 * Casts or cancels an upvote/downvote on a post or comment.
 */
export async function castVote(
  profileId: string,
  targetType: "post" | "comment",
  targetId: string,
  value: 1 | -1 | 0
): Promise<{ success: boolean }> {
  const supabase = createServiceSupabaseClient();
  const isPost = targetType === "post";

  if (value === 0) {
    // Delete existing vote (unvote)
    const matchCriteria = isPost
      ? { profile_id: profileId, post_id: targetId }
      : { profile_id: profileId, comment_id: targetId };

    const { error } = await supabase
      .from("forum_votes")
      .delete()
      .match(matchCriteria);

    if (error) {
      throw new Error(`Failed to remove vote: ${error.message}`);
    }
  } else {
    // Upsert vote record
    const payload = {
      profile_id: profileId,
      post_id: isPost ? targetId : null,
      comment_id: !isPost ? targetId : null,
      vote_value: value,
    };

    const { error } = await supabase
      .from("forum_votes")
      .upsert(payload, {
        onConflict: isPost ? "profile_id,post_id" : "profile_id,comment_id",
      });

    if (error) {
      throw new Error(`Failed to cast vote: ${error.message}`);
    }
  }

  return { success: true };
}
