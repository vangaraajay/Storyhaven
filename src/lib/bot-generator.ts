import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { generateBotId, generateRandomBotAvatar } from "@/lib/bots";
import { callGemma, extractAndParseJson } from "@/lib/gemini";
import type { Avatar } from "@/lib/avatar/types";

export type BotGenerationConfig = {
  botCount: number;
  postCount: number;
  commentCount: number;
  nestedRatio?: number; // 0.0 to 0.7, default 0.4
  simulateVotes?: boolean; // default true
};

export type GenerationProgressCallback = (event: {
  step: number;
  totalSteps: number;
  message: string;
}) => void | Promise<void>;

export type GenerationResult = {
  botsActive: number;
  newBotsCreated: number;
  postsCreated: number;
  commentsCreated: number;
  votesSimulated: number;
};

export type BotStats = {
  botProfilesCount: number;
  botPostsCount: number;
  botCommentsCount: number;
  botVotesCount: number;
};

type BotProfile = {
  id: string;
  display_name: string | null;
  avatar?: Avatar | null;
  avatar_url?: string | null;
};

type RawPostItem = {
  title: string;
  content: string;
  media_type: "book" | "movie" | "album" | "general";
  media_title?: string | null;
};

type RawCommentItem = {
  temp_id: string;
  content: string;
  parent_temp_id: string | null;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function sampleMultiple<T>(array: readonly T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Returns current statistics about bot activity in Storyhaven.
 */
export async function getBotStats(): Promise<BotStats> {
  const supabase = createServiceSupabaseClient();

  const [profilesRes, postsRes, commentsRes, votesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .like("id", "b075%"),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .like("profile_id", "b075%"),
    supabase
      .from("forum_comments")
      .select("id", { count: "exact", head: true })
      .like("profile_id", "b075%"),
    supabase
      .from("forum_votes")
      .select("id", { count: "exact", head: true })
      .like("profile_id", "b075%"),
  ]);

  return {
    botProfilesCount: profilesRes.count ?? 0,
    botPostsCount: postsRes.count ?? 0,
    botCommentsCount: commentsRes.count ?? 0,
    botVotesCount: votesRes.count ?? 0,
  };
}

/**
 * Safely purges all bot accounts, cascading to their forum posts, comments,
 * votes, logs, friendships, and messages. Human accounts remain 100% untouched.
 */
export async function purgeAllBots(): Promise<{ deletedProfiles: number }> {
  const supabase = createServiceSupabaseClient();

  const [deletedIdsRes, deletedSubsRes] = await Promise.all([
    supabase.from("profiles").delete().like("id", "b075%").select("id"),
    supabase.from("profiles").delete().like("auth0_sub", "bot|%").select("id"),
  ]);

  const total =
    (deletedIdsRes.data?.length ?? 0) + (deletedSubsRes.data?.length ?? 0);
  return { deletedProfiles: total };
}

/**
 * Orchestrates full batch bot generation:
 * 1. Reuses existing bots; prompts Gemma 4 31B only for delta usernames.
 * 2. Generates forum posts via Gemma 4 31B and populates media catalog logs.
 * 3. Generates threaded comments/replies via Gemma 4 31B and performs topological insert.
 * 4. Simulates community votes and updates scores.
 */
export async function generateBotCommunity(
  config: BotGenerationConfig,
  onProgress?: GenerationProgressCallback,
): Promise<GenerationResult> {
  const supabase = createServiceSupabaseClient();
  const targetBotCount = Math.max(2, Math.min(config.botCount, 50));
  const targetPostCount = Math.max(1, Math.min(config.postCount, 25));
  const targetCommentCount = Math.max(1, Math.min(config.commentCount, 80));
  const nestedRatio = Math.max(0, Math.min(config.nestedRatio ?? 0.4, 0.7));

  // =========================================================================
  // STEP 1: Bot Pool Resolution (Reusability First)
  // =========================================================================
  await onProgress?.({
    step: 1,
    totalSteps: 4,
    message: "Resolving bot identity pool (checking existing bots)...",
  });

  const { data: existingProfiles, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar, avatar_url")
    .like("id", "b075%");

  if (fetchErr) {
    throw new Error(`Failed to load existing bots: ${fetchErr.message}`);
  }

  const existingBots: BotProfile[] = (existingProfiles ?? []) as BotProfile[];
  let botPool: BotProfile[] = [];
  let newBotsCreated = 0;

  if (existingBots.length >= targetBotCount) {
    // Reuse existing bots without any username LLM calls!
    botPool = sampleMultiple(existingBots, targetBotCount);
    await onProgress?.({
      step: 1,
      totalSteps: 4,
      message: `Reusing ${botPool.length} existing bot profiles (0 new profiles required).`,
    });
  } else {
    // Need delta usernames
    const delta = targetBotCount - existingBots.length;
    botPool = [...existingBots];

    await onProgress?.({
      step: 1,
      totalSteps: 4,
      message: `Reusing ${existingBots.length} existing bots; generating ${delta} new usernames via Gemma 4 31B...`,
    });

    const usernamePrompt = `You are a naming engine for "Storyhaven", a cozy retro fantasy pixel library where readers, cinephiles, and vinyl listeners gather.
Generate a JSON array of exactly ${delta} unique, creative, evocative usernames.
Guidelines:
- Themes: antique books, cozy tea, botany, vinyl grooves, cinema, constellations, quiet rain, late-night reading, candlelit shelves.
- Formats: CamelCase or kebab-case or single words (e.g., "MossyFolio", "StarlightSpine", "TeaAndTolkien", "CinephileCat", "NocturneReader", "VelvetLoom", "QuillAndFern", "Hearthbound").
- Output MUST be a valid JSON array of strings only with no markdown formatting:
["Username1", "Username2", ...]`;

    const rawNames = await callGemma(usernamePrompt, {
      reason: `Generating ${delta} bot usernames for identity pool`,
      jsonMode: true,
      temperature: 0.85,
    });
    const parsedNames = extractAndParseJson<string[]>(rawNames);

    // Filter and sanitize names
    const namesToInsert = parsedNames
      .map((n) => String(n).trim().replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean)
      .slice(0, delta);

    // If Gemma returned fewer than delta, generate fallback names
    while (namesToInsert.length < delta) {
      namesToInsert.push(`HavenSeeker${randomInt(100, 999)}`);
    }

    const newRows = namesToInsert.map((name) => {
      const id = generateBotId();
      return {
        id,
        auth0_sub: `bot|${id}`,
        display_name: name.slice(0, 32),
        avatar: generateRandomBotAvatar(),
        avatar_url: null,
      };
    });

    const { data: insertedNewBots, error: insertErr } = await supabase
      .from("profiles")
      .insert(newRows)
      .select("id, display_name, avatar, avatar_url");

    if (insertErr) {
      throw new Error(`Failed to insert new bot profiles: ${insertErr.message}`);
    }

    newBotsCreated = insertedNewBots?.length ?? 0;
    botPool.push(...((insertedNewBots ?? []) as BotProfile[]));
  }

  if (botPool.length === 0) {
    throw new Error("Bot pool is unexpectedly empty.");
  }

  // =========================================================================
  // STEP 2: Batch Forum Post Generation & Catalog Mirroring
  // =========================================================================
  await onProgress?.({
    step: 2,
    totalSteps: 4,
    message: `Authoring ${targetPostCount} forum posts via Gemma 4 31B...`,
  });

  const postsPrompt = `You are community members posting on Storyhaven's cozy library forum.
Generate a JSON array of exactly ${targetPostCount} realistic, authentic forum posts.
Categories to cover: 'book', 'movie', 'album', 'general'.
Mix insightful book reflections, warm film thoughts, vinyl record discussions, and cozy library musings.
Requirements:
- "title": max 200 chars, thoughtful or intriguing.
- "content": post body in markdown (1 to 4 cozy paragraphs).
- "media_type": one of "book", "movie", "album", "general".
- "media_title": optional exact title of work if media_type is book/movie/album, or null.
Output MUST be a valid JSON array of objects:
[
  {
    "title": "A quiet reflection on Piranesi",
    "content": "There is something about the halls of Piranesi that resonates with the quiet rhythm of our library...",
    "media_type": "book",
    "media_title": "Piranesi"
  }
]`;

  const rawPosts = await callGemma(postsPrompt, {
    reason: `Batch generating ${targetPostCount} forum posts across categories`,
    jsonMode: true,
    temperature: 0.8,
  });
  const parsedPosts = extractAndParseJson<RawPostItem[]>(rawPosts);

  type InsertedPost = {
    id: string;
    profile_id: string;
    title: string;
    content: string;
    media_type: string;
    media_title: string | null;
    created_at: string;
  };

  const insertedPosts: InsertedPost[] = [];
  const now = Date.now();

  for (let i = 0; i < Math.min(parsedPosts.length, targetPostCount); i++) {
    const rawP = parsedPosts[i];
    const author = sample(botPool);
    // Stagger timestamps across past 1 to 7 days
    const postAgeMs = randomInt(3600 * 1000, 7 * 86400 * 1000);
    const postCreatedAt = new Date(now - postAgeMs).toISOString();

    const mediaType = ["book", "movie", "album", "general"].includes(
      rawP.media_type,
    )
      ? rawP.media_type
      : "general";

    const mediaTitle = rawP.media_title?.trim() || null;

    const { data: postRow, error: pErr } = await supabase
      .from("forum_posts")
      .insert({
        profile_id: author.id,
        title: rawP.title.trim().slice(0, 300),
        content: rawP.content.trim(),
        media_type: mediaType,
        media_title: mediaTitle,
        created_at: postCreatedAt,
      })
      .select("id, profile_id, title, content, media_type, media_title, created_at")
      .single();

    if (pErr) {
      console.warn("Failed to insert bot forum post:", pErr.message);
      continue;
    }

    insertedPosts.push(postRow as InsertedPost);

    // Automatic Bot Catalog Population
    if (mediaTitle) {
      try {
        if (mediaType === "book") {
          await supabase.from("book_logs").insert({
            profile_id: author.id,
            name: mediaTitle,
            liked: true,
            rating: 4.5,
            status: "finished",
            created_at: postCreatedAt,
          });
        } else if (mediaType === "movie") {
          await supabase.from("movie_logs").insert({
            profile_id: author.id,
            name: mediaTitle,
            liked: true,
            rating: 4.5,
            runtime: 110,
            created_at: postCreatedAt,
          });
        } else if (mediaType === "album") {
          await supabase.from("album_logs").insert({
            profile_id: author.id,
            name: mediaTitle,
            liked: true,
            rating: 4.5,
            created_at: postCreatedAt,
          });
        }
      } catch (logErr) {
        console.warn("Failed to populate bot catalog log:", logErr);
      }
    }
  }

  if (insertedPosts.length === 0) {
    throw new Error("No forum posts could be inserted.");
  }

  // =========================================================================
  // STEP 3: Threaded Comments & Replies Generation
  // =========================================================================
  await onProgress?.({
    step: 3,
    totalSteps: 4,
    message: `Generating ${targetCommentCount} threaded comments & replies via Gemma 4 31B...`,
  });

  const postsSummary = insertedPosts
    .map(
      (p, idx) =>
        `post_${idx}: [${p.media_type}] "${p.title}" - ${p.content.slice(0, 150)}...`,
    )
    .join("\n");

  const commentsPrompt = `Here is a list of ${insertedPosts.length} forum posts from Storyhaven:
${postsSummary}

Generate a total of approximately ${targetCommentCount} thoughtful comments and conversational replies distributed across these posts.
Requirements:
1. Include both initial reactions (top-level) and conversational replies (subcomments).
2. Target approximately ${Math.round(nestedRatio * 100)}% of comments to be replies to preceding comments on the same post.
3. Assign each comment a temporary ID ("temp_id": "c1", "c2", ...). For top-level comments, "parent_temp_id": null. For subcomments, set "parent_temp_id" to the "temp_id" of the preceding comment it is responding to.
Output MUST be a JSON object mapping each post index ("post_0", "post_1", ...) to its array of comments:
{
  "post_0": [
    {
      "temp_id": "c1",
      "content": "This captured the atmosphere so beautifully.",
      "parent_temp_id": null
    },
    {
      "temp_id": "c2",
      "content": "I completely agree with c1! Especially the part about the quiet halls.",
      "parent_temp_id": "c1"
    }
  ]
}`;

  let commentsInserted = 0;
  const insertedCommentIds: Array<{ id: string; profile_id: string }> = [];

  try {
    const rawComments = await callGemma(commentsPrompt, {
      reason: `Batch generating ${targetCommentCount} threaded comments & replies`,
      jsonMode: true,
      temperature: 0.8,
    });
    const parsedCommentsMap =
      extractAndParseJson<Record<string, RawCommentItem[]>>(rawComments);

    for (let pIdx = 0; pIdx < insertedPosts.length; pIdx++) {
      const post = insertedPosts[pIdx];
      const commentItems = parsedCommentsMap[`post_${pIdx}`] || [];
      if (!Array.isArray(commentItems) || commentItems.length === 0) continue;

      const tempIdToDb = new Map<
        string,
        { dbId: string; authorId: string; createdAt: Date }
      >();

      // Group into Tier 0 (roots) and Tier 1+ (replies)
      const rootComments = commentItems.filter((c) => !c.parent_temp_id);
      const subComments = commentItems.filter((c) => Boolean(c.parent_temp_id));

      // 1. Insert Root Comments
      for (const rc of rootComments) {
        const author = sample(botPool);
        const postDate = new Date(post.created_at).getTime();
        // Comment delayed 10m to 18h after post
        const commentDate = new Date(
          Math.min(
            now - 60 * 1000,
            postDate + randomInt(600 * 1000, 18 * 3600 * 1000),
          ),
        );

        const { data: dbComment } = await supabase
          .from("forum_comments")
          .insert({
            post_id: post.id,
            profile_id: author.id,
            content: rc.content.trim(),
            parent_id: null,
            created_at: commentDate.toISOString(),
          })
          .select("id, profile_id, created_at")
          .single();

        if (dbComment) {
          commentsInserted++;
          tempIdToDb.set(rc.temp_id, {
            dbId: dbComment.id,
            authorId: author.id,
            createdAt: commentDate,
          });
          insertedCommentIds.push({
            id: dbComment.id,
            profile_id: author.id,
          });
        }
      }

      // 2. Insert Subcomments (Topological parent resolution)
      for (const sc of subComments) {
        const parentInfo = sc.parent_temp_id
          ? tempIdToDb.get(sc.parent_temp_id)
          : null;

        // Choose an author different from parent if pool allows
        let author = sample(botPool);
        if (parentInfo && botPool.length > 1) {
          const others = botPool.filter((b) => b.id !== parentInfo.authorId);
          if (others.length > 0) author = sample(others);
        }

        const baseTime = parentInfo
          ? parentInfo.createdAt.getTime()
          : new Date(post.created_at).getTime();

        const subDate = new Date(
          Math.min(
            now - 30 * 1000,
            baseTime + randomInt(300 * 1000, 6 * 3600 * 1000),
          ),
        );

        const { data: dbComment } = await supabase
          .from("forum_comments")
          .insert({
            post_id: post.id,
            profile_id: author.id,
            content: sc.content.trim(),
            parent_id: parentInfo ? parentInfo.dbId : null,
            created_at: subDate.toISOString(),
          })
          .select("id, profile_id, created_at")
          .single();

        if (dbComment) {
          commentsInserted++;
          tempIdToDb.set(sc.temp_id, {
            dbId: dbComment.id,
            authorId: author.id,
            createdAt: subDate,
          });
          insertedCommentIds.push({
            id: dbComment.id,
            profile_id: author.id,
          });
        }
      }
    }
  } catch (commErr) {
    console.warn("Error threading comments:", commErr);
  }

  // =========================================================================
  // STEP 4: Simulated Community Votes (Server Code Only)
  // =========================================================================
  let votesSimulated = 0;

  if (config.simulateVotes !== false) {
    await onProgress?.({
      step: 4,
      totalSteps: 4,
      message: "Simulating authentic community votes & discussion scoring...",
    });

    const castVotes = new Set<string>();

    // Simulate Post Votes
    for (const post of insertedPosts) {
      const voterCount = randomInt(2, Math.min(6, botPool.length));
      const voters = sampleMultiple(botPool, voterCount);

      for (const voter of voters) {
        if (voter.id === post.profile_id) continue; // don't vote on own post
        const voteKey = `p:${voter.id}:${post.id}`;
        if (castVotes.has(voteKey)) continue;
        castVotes.add(voteKey);

        const val = Math.random() < 0.9 ? 1 : -1;
        const { error: vErr } = await supabase.from("forum_votes").insert({
          profile_id: voter.id,
          post_id: post.id,
          comment_id: null,
          vote_value: val,
        });

        if (!vErr) votesSimulated++;
      }
    }

    // Simulate Comment Votes
    for (const comment of insertedCommentIds) {
      const voterCount = randomInt(1, Math.min(3, botPool.length));
      const voters = sampleMultiple(botPool, voterCount);

      for (const voter of voters) {
        if (voter.id === comment.profile_id) continue;
        const voteKey = `c:${voter.id}:${comment.id}`;
        if (castVotes.has(voteKey)) continue;
        castVotes.add(voteKey);

        const val = Math.random() < 0.92 ? 1 : -1;
        const { error: vErr } = await supabase.from("forum_votes").insert({
          profile_id: voter.id,
          post_id: null,
          comment_id: comment.id,
          vote_value: val,
        });

        if (!vErr) votesSimulated++;
      }
    }
  }

  return {
    botsActive: botPool.length,
    newBotsCreated,
    postsCreated: insertedPosts.length,
    commentsCreated: commentsInserted,
    votesSimulated,
  };
}
