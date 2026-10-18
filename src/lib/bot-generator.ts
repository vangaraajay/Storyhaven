import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  BOT_UUID_MAX,
  BOT_UUID_MIN,
  generateBotId,
  generateRandomBotAvatar,
} from "@/lib/bots";
import {
  callGemma,
  extractAndParseJson,
  parseDelimitedComments,
  parseDelimitedPosts,
  parseDelimitedUsernames,
  type RawCommentItem,
  type RawPostItem,
} from "@/lib/gemini";
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
      .gte("id", BOT_UUID_MIN)
      .lte("id", BOT_UUID_MAX),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("profile_id", BOT_UUID_MIN)
      .lte("profile_id", BOT_UUID_MAX),
    supabase
      .from("forum_comments")
      .select("id", { count: "exact", head: true })
      .gte("profile_id", BOT_UUID_MIN)
      .lte("profile_id", BOT_UUID_MAX),
    supabase
      .from("forum_votes")
      .select("id", { count: "exact", head: true })
      .gte("profile_id", BOT_UUID_MIN)
      .lte("profile_id", BOT_UUID_MAX),
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
    supabase
      .from("profiles")
      .delete()
      .gte("id", BOT_UUID_MIN)
      .lte("id", BOT_UUID_MAX)
      .select("id"),
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
    .gte("id", BOT_UUID_MIN)
    .lte("id", BOT_UUID_MAX);

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
Generate exactly ${delta} unique, creative, evocative usernames.
Guidelines:
- Themes: antique books, cozy tea, botany, vinyl grooves, cinema, constellations, quiet rain, late-night reading, candlelit shelves.
- Formats: CamelCase or single evocative words (e.g., MossyFolio, StarlightSpine, TeaAndTolkien, CinephileCat, NocturneReader, VelvetLoom, QuillAndFern, Hearthbound).

Format: Output ONLY the usernames separated by a pipe character (|). Do not include bullet points, numbering, or preamble.
Example:
MossyFolio | StarlightSpine | TeaAndTolkien | CinephileCat`;

    const rawNames = await callGemma(usernamePrompt, {
      reason: `Generating ${delta} bot usernames for identity pool`,
      temperature: 0.85,
    });
    const parsedNames = parseDelimitedUsernames(rawNames, delta);

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
Generate exactly ${targetPostCount} authentic, engaging forum posts across categories: book, movie, album, general.
Mix book reflections, film thoughts, vinyl record discussions, and cozy library musings.

Format each post using the exact delimiter "===POST===" like this:

===POST===
TITLE: Post title here
MEDIA_TYPE: book
MEDIA_TITLE: Title of Work
CONTENT:
Post body in markdown (1 to 3 cozy paragraphs).

===POST===
TITLE: Rainy Day in the Reading Lounge
MEDIA_TYPE: general
MEDIA_TITLE: None
CONTENT:
The sound of rain against the stained glass windows makes the library feel like an enclave away from time...`;

  const rawPosts = await callGemma(postsPrompt, {
    reason: `Batch generating ${targetPostCount} forum posts across categories`,
    temperature: 0.8,
  });

  let parsedPosts = parseDelimitedPosts(rawPosts);
  if (parsedPosts.length === 0) {
    try {
      parsedPosts = extractAndParseJson<RawPostItem[]>(rawPosts);
    } catch {
      // keep fallback
    }
  }

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

Generate approximately ${targetCommentCount} thoughtful comments and replies distributed across these posts.
Target approximately ${Math.round(nestedRatio * 100)}% of comments to be replies to preceding comments on the same post.

Format each comment using the exact delimiter "===COMMENT===" like this:

===COMMENT===
POST_INDEX: 0
TEMP_ID: c1
PARENT_TEMP_ID: NONE
CONTENT:
First reaction or observation...

===COMMENT===
POST_INDEX: 0
TEMP_ID: c2
PARENT_TEMP_ID: c1
CONTENT:
Reply responding specifically to c1...`;

  let commentsInserted = 0;
  const insertedCommentIds: Array<{ id: string; profile_id: string }> = [];

  try {
    const rawComments = await callGemma(commentsPrompt, {
      reason: `Batch generating ${targetCommentCount} threaded comments & replies`,
      temperature: 0.8,
    });

    let parsedCommentsMap = parseDelimitedComments(rawComments);
    if (Object.keys(parsedCommentsMap).length === 0) {
      try {
        parsedCommentsMap =
          extractAndParseJson<Record<string, RawCommentItem[]>>(rawComments);
      } catch {
        // fallback
      }
    }

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
