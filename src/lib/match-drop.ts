import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/friends";

export type SharedMediaType = "book" | "movie" | "album";

export type SharedMediaItem = {
  name: string;
  type: SharedMediaType;
};

export type PeriodicMatchRow = {
  id: string;
  round_id: string;
  user_a: string;
  user_b: string;
  user_a_connected: boolean;
  user_b_connected: boolean;
  user_a_dismissed: boolean;
  user_b_dismissed: boolean;
  friendship_id: string | null;
  score: number;
  shared_titles: SharedMediaItem[];
  icebreaker: string | null;
  status: "pending" | "connected" | "dismissed";
  created_at: string;
};

export type ActiveMatchView = {
  matchId: string;
  roundId: string;
  partner: PublicProfile;
  isUserA: boolean;
  myConnected: boolean;
  otherConnected: boolean;
  myDismissed: boolean;
  status: "pending" | "connected" | "dismissed";
  score: number;
  sharedTitles: SharedMediaItem[];
  icebreaker: string;
  isDiscovery: boolean;
};

export type AdminMatchView = {
  id: string;
  roundId: string;
  userA: PublicProfile;
  userB: PublicProfile;
  userAConnected: boolean;
  userBConnected: boolean;
  status: "pending" | "connected" | "dismissed";
  score: number;
  sharedTitles: SharedMediaItem[];
  icebreaker: string | null;
  createdAt: string;
};

export type AdminStatus = {
  latestRoundId: string | null;
  latestRoundCreatedAt: string | null;
  totalMatches: number;
  connectedCount: number;
  pendingCount: number;
  dismissedCount: number;
  activeLoggersCount: number;
  recentMatches: AdminMatchView[];
};

export type MatchDropResult = {
  success: boolean;
  roundId: string;
  pairsCreated: number;
  leftoverProfile: PublicProfile | null;
  message: string;
  pairings: Array<{
    userA: PublicProfile;
    userB: PublicProfile;
    sharedTitles: SharedMediaItem[];
    score: number;
    icebreaker: string;
    isDiscovery: boolean;
  }>;
};

function normalizeTitle(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns the upcoming target timestamp (Monday at 00:00:00 UTC).
 */
export function getNextDropTarget(from = new Date()): Date {
  const target = new Date(from);
  const day = target.getUTCDay();
  // If Monday, diff is 7 (next Monday), otherwise days remaining until Monday
  const diff = (7 - day + 1) % 7 || 7;
  target.setUTCDate(target.getUTCDate() + diff);
  target.setUTCHours(0, 0, 0, 0);
  target.setMilliseconds(0);
  return target;
}

/**
 * Generates a warm, engaging icebreaker prompt based on common media or discovery.
 */
export function generateIcebreaker(
  sharedTitles: SharedMediaItem[],
  partnerName: string,
): string {
  const name = partnerName.trim() || "there";
  if (sharedTitles.length === 0) {
    return `Hey ${name}! We were matched as kindred spirits on Storyhaven! What are you currently reading or watching in the lounge?`;
  }

  const primary = sharedTitles[0];
  const typeLabel =
    primary.type === "book"
      ? "book"
      : primary.type === "movie"
        ? "movie"
        : "album";

  if (sharedTitles.length === 1) {
    return `Hey ${name}! Saw we were matched on Storyhaven because we both logged the ${typeLabel} "${primary.name}". What did you think of it?`;
  }

  const secondary = sharedTitles[1];
  return `Hey ${name}! We both logged "${primary.name}" and "${secondary.name}" on Storyhaven. Always fun to find someone with matching tastes! What did you think?`;
}

export type HavenMatchState =
  | {
      mode: "waiting";
      match: null;
    }
  | {
      mode: "active";
      hasMatch: false;
      match: null;
    }
  | {
      mode: "active";
      hasMatch: true;
      match: ActiveMatchView;
    };

/**
 * Evaluates the server's Haven Match state for a given profile.
 * - 'waiting': No active matches exist on the server. Clients display the countdown timer.
 * - 'active' (hasMatch = false): An active match round exists, but this user is unmatched (Scout).
 * - 'active' (hasMatch = true): An active match round exists and this user has a match.
 */
export async function getHavenMatchStateForProfile(
  profileId: string,
): Promise<HavenMatchState> {
  const supabase = createServiceSupabaseClient();

  // Find the latest round with active matches
  const { data: latestRow, error: latestError } = await supabase
    .from("periodic_matches")
    .select("round_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError || !latestRow) {
    // Mode 1: No active matches on server => Waiting state
    return { mode: "waiting", match: null };
  }

  const currentRoundId = latestRow.round_id;

  // Find user's match in this active round
  const { data: matchRow, error: matchError } = await supabase
    .from("periodic_matches")
    .select("*")
    .eq("round_id", currentRoundId)
    .or(`user_a.eq.${profileId},user_b.eq.${profileId}`)
    .maybeSingle();

  if (matchError || !matchRow) {
    // Mode 2: Active drop exists, but this user was unmatched
    return { mode: "active", hasMatch: false, match: null };
  }

  const match = matchRow as PeriodicMatchRow;
  const isUserA = match.user_a === profileId;
  const partnerId = isUserA ? match.user_b : match.user_a;
  const myDismissed = isUserA ? match.user_a_dismissed : match.user_b_dismissed;

  if (myDismissed) {
    // If dismissed by user, treat as unmatched for the remainder of this cycle
    return { mode: "active", hasMatch: false, match: null };
  }

  // Load partner's profile
  const { data: partnerData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", partnerId)
    .maybeSingle();

  const partner: PublicProfile = {
    id: partnerId,
    display_name: partnerData?.display_name ?? "Kindred Spirit",
    avatar_url: partnerData?.avatar_url ?? null,
  };

  const sharedTitles = Array.isArray(match.shared_titles)
    ? (match.shared_titles as SharedMediaItem[])
    : [];

  const icebreaker =
    match.icebreaker || generateIcebreaker(sharedTitles, partner.display_name ?? "");

  const activeMatch: ActiveMatchView = {
    matchId: match.id,
    roundId: match.round_id,
    partner,
    isUserA,
    myConnected: isUserA ? match.user_a_connected : match.user_b_connected,
    otherConnected: isUserA ? match.user_b_connected : match.user_a_connected,
    myDismissed,
    status: match.status,
    score: match.score,
    sharedTitles,
    icebreaker,
    isDiscovery: sharedTitles.length === 0,
  };

  return {
    mode: "active",
    hasMatch: true,
    match: activeMatch,
  };
}

/**
 * Loads the active match for a given user profile, if one exists for the latest round.
 */
export async function getActiveMatchForProfile(
  profileId: string,
): Promise<ActiveMatchView | null> {
  const state = await getHavenMatchStateForProfile(profileId);
  return state.mode === "active" && state.hasMatch ? state.match : null;
}

/**
 * Handles the mutual connect flow. If both users have connected, safely creates
 * or upgrades the friendship and marks the match status as 'connected'.
 */
export async function connectMatch(
  matchId: string,
  actorId: string,
): Promise<{
  success: boolean;
  friendshipId?: string;
  isMutual: boolean;
  message: string;
}> {
  const supabase = createServiceSupabaseClient();

  const { data: matchData, error: matchError } = await supabase
    .from("periodic_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !matchData) {
    throw new Error("Match not found.");
  }

  const match = matchData as PeriodicMatchRow;
  if (match.user_a !== actorId && match.user_b !== actorId) {
    throw new Error("You are not a participant in this match.");
  }

  const isUserA = match.user_a === actorId;
  const updatePayload = isUserA
    ? { user_a_connected: true }
    : { user_b_connected: true };

  const { data: updatedMatch, error: updateError } = await supabase
    .from("periodic_matches")
    .update(updatePayload)
    .eq("id", matchId)
    .select("*")
    .single();

  if (updateError || !updatedMatch) {
    throw new Error(`Failed to update match: ${updateError?.message}`);
  }

  const row = updatedMatch as PeriodicMatchRow;
  const bothConnected = row.user_a_connected && row.user_b_connected;

  if (!bothConnected) {
    return {
      success: true,
      isMutual: false,
      message: "Connected! Waiting for your match to connect back.",
    };
  }

  // Both have connected! Concurrency safeguard: attempt atomic status transition to 'connected'
  const { data: transitioned } = await supabase
    .from("periodic_matches")
    .update({ status: "connected" })
    .eq("id", matchId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  let friendshipId = row.friendship_id;

  // If this call won the transition (or friendship_id not yet set), ensure friendship row exists
  if (!friendshipId || transitioned) {
    const userA = row.user_a;
    const userB = row.user_b;

    // Check existing friendship
    const { data: existingFriendship } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`,
      )
      .maybeSingle();

    if (existingFriendship) {
      friendshipId = existingFriendship.id;
      if (existingFriendship.status !== "accepted") {
        await supabase
          .from("friendships")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", existingFriendship.id);
      }
    } else {
      // Create new accepted friendship
      const { data: newFriendship, error: createFriendshipErr } = await supabase
        .from("friendships")
        .insert({
          requester_id: userA,
          addressee_id: userB,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!createFriendshipErr && newFriendship) {
        friendshipId = newFriendship.id;
      }
    }

    if (friendshipId) {
      await supabase
        .from("periodic_matches")
        .update({ friendship_id: friendshipId })
        .eq("id", matchId);
    }
  }

  return {
    success: true,
    isMutual: true,
    friendshipId: friendshipId ?? undefined,
    message: "Mutual match! Direct chat unlocked.",
  };
}

/**
 * Allows a user to discreetly pass on their current match for this cycle.
 */
export async function dismissMatch(
  matchId: string,
  actorId: string,
): Promise<{ success: boolean }> {
  const supabase = createServiceSupabaseClient();

  const { data: matchData, error: matchError } = await supabase
    .from("periodic_matches")
    .select("id, user_a, user_b")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !matchData) {
    throw new Error("Match not found.");
  }

  const isUserA = matchData.user_a === actorId;
  const isUserB = matchData.user_b === actorId;
  if (!isUserA && !isUserB) {
    throw new Error("You are not a participant in this match.");
  }

  const updatePayload = isUserA
    ? { user_a_dismissed: true, status: "dismissed" }
    : { user_b_dismissed: true, status: "dismissed" };

  const { error: updateError } = await supabase
    .from("periodic_matches")
    .update(updatePayload)
    .eq("id", matchId);

  if (updateError) {
    throw new Error(`Failed to dismiss match: ${updateError.message}`);
  }

  return { success: true };
}

/**
 * Admin action to clear all matches in periodic_matches, resetting the system to 'waiting' mode.
 */
export async function clearActiveMatches(): Promise<{ success: boolean; count: number }> {
  const supabase = createServiceSupabaseClient();

  const { data: deleted, error } = await supabase
    .from("periodic_matches")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) {
    throw new Error(`Failed to clear active matches: ${error.message}`);
  }

  return { success: true, count: deleted?.length ?? 0 };
}

/**
 * Returns aggregated statistics and recent matches for the admin console.
 */
export async function getAdminMatchStatus(): Promise<AdminStatus> {
  const supabase = createServiceSupabaseClient();

  const [matchesRes, loggersRes] = await Promise.all([
    supabase
      .from("periodic_matches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id")
      .limit(200),
  ]);

  const matches = (matchesRes.data ?? []) as PeriodicMatchRow[];
  const activeLoggersCount = loggersRes.data?.length ?? 0;

  const latestRoundId = matches[0]?.round_id ?? null;
  const latestRoundCreatedAt = matches[0]?.created_at ?? null;

  const connectedCount = matches.filter((m) => m.status === "connected").length;
  const pendingCount = matches.filter((m) => m.status === "pending").length;
  const dismissedCount = matches.filter((m) => m.status === "dismissed").length;

  // Gather unique profile IDs to enrich with names and avatars
  const profileIdSet = new Set<string>();
  for (const m of matches) {
    profileIdSet.add(m.user_a);
    profileIdSet.add(m.user_b);
  }

  const profileMap = new Map<string, PublicProfile>();
  if (profileIdSet.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", Array.from(profileIdSet));

    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      });
    }
  }

  const recentMatches: AdminMatchView[] = matches.map((m) => ({
    id: m.id,
    roundId: m.round_id,
    userA: profileMap.get(m.user_a) ?? {
      id: m.user_a,
      display_name: "User A",
      avatar_url: null,
    },
    userB: profileMap.get(m.user_b) ?? {
      id: m.user_b,
      display_name: "User B",
      avatar_url: null,
    },
    userAConnected: m.user_a_connected,
    userBConnected: m.user_b_connected,
    status: m.status,
    score: m.score,
    sharedTitles: Array.isArray(m.shared_titles)
      ? (m.shared_titles as SharedMediaItem[])
      : [],
    icebreaker: m.icebreaker,
    createdAt: m.created_at,
  }));

  return {
    latestRoundId,
    latestRoundCreatedAt,
    totalMatches: matches.length,
    connectedCount,
    pendingCount,
    dismissedCount,
    activeLoggersCount,
    recentMatches,
  };
}

/**
 * Runs the relaxed similarity pairing engine across all active readers.
 */
export async function runMatchDrop(
  customRoundId?: string,
  dryRun = false,
): Promise<MatchDropResult> {
  const supabase = createServiceSupabaseClient();
  const roundId = customRoundId?.trim() || `round-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  // 1. Gather active readers with logged media
  const [booksRes, moviesRes, albumsRes, profilesRes, friendshipsRes] =
    await Promise.all([
      supabase.from("book_logs").select("profile_id, name, liked, status"),
      supabase.from("movie_logs").select("profile_id, name, liked"),
      supabase.from("album_logs").select("profile_id, name, liked"),
      supabase.from("profiles").select("id, display_name, avatar_url"),
      supabase.from("friendships").select("requester_id, addressee_id, status"),
    ]);

  const profiles = (profilesRes.data ?? []) as PublicProfile[];
  const profileMap = new Map<string, PublicProfile>(profiles.map((p) => [p.id, p]));

  // Build media title sets for each user
  type UserMedia = {
    books: Map<string, { liked: boolean }>;
    movies: Map<string, { liked: boolean }>;
    albums: Map<string, { liked: boolean }>;
  };

  const userMediaMap = new Map<string, UserMedia>();

  for (const b of booksRes.data ?? []) {
    if (!b.profile_id || !b.name) continue;
    let u = userMediaMap.get(b.profile_id);
    if (!u) {
      u = { books: new Map(), movies: new Map(), albums: new Map() };
      userMediaMap.set(b.profile_id, u);
    }
    const key = normalizeTitle(b.name);
    u.books.set(key, { liked: Boolean(b.liked) });
  }

  for (const m of moviesRes.data ?? []) {
    if (!m.profile_id || !m.name) continue;
    let u = userMediaMap.get(m.profile_id);
    if (!u) {
      u = { books: new Map(), movies: new Map(), albums: new Map() };
      userMediaMap.set(m.profile_id, u);
    }
    const key = normalizeTitle(m.name);
    u.movies.set(key, { liked: Boolean(m.liked) });
  }

  for (const a of albumsRes.data ?? []) {
    if (!a.profile_id || !a.name) continue;
    let u = userMediaMap.get(a.profile_id);
    if (!u) {
      u = { books: new Map(), movies: new Map(), albums: new Map() };
      userMediaMap.set(a.profile_id, u);
    }
    const key = normalizeTitle(a.name);
    u.albums.set(key, { liked: Boolean(a.liked) });
  }

  // Active user IDs (who have at least 1 logged media item)
  const activeUserIds = Array.from(userMediaMap.keys()).filter((id) =>
    profileMap.has(id),
  );

  if (activeUserIds.length < 2) {
    return {
      success: false,
      roundId,
      pairsCreated: 0,
      leftoverProfile: null,
      message: `Need at least 2 active readers with logged media to run a match drop. Found ${activeUserIds.length}.`,
      pairings: [],
    };
  }

  function getPairKey(a: string, b: string): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  // Build exclusion graph of already accepted friends (mutual friendships)
  // Excludes 'accepted' friendships so existing friends are NEVER matched.
  // Note: 'pending' requests are intentionally NOT excluded so matched users can still connect.
  const acceptedFriendsPairs = new Set<string>();
  for (const f of friendshipsRes.data ?? []) {
    if (f.status === "accepted") {
      acceptedFriendsPairs.add(getPairKey(f.requester_id, f.addressee_id));
    }
  }

  // Check previous round to avoid repeating immediate pairings
  const { data: prevMatches } = await supabase
    .from("periodic_matches")
    .select("user_a, user_b")
    .order("created_at", { ascending: false })
    .limit(50);

  const prevRoundPairs = new Set<string>();
  for (const pm of prevMatches ?? []) {
    prevRoundPairs.add(getPairKey(pm.user_a, pm.user_b));
  }

  // Calculate similarity between all pairs of active users
  type CandidatePair = {
    userAId: string;
    userBId: string;
    score: number;
    sharedTitles: SharedMediaItem[];
  };

  const candidatePairs: CandidatePair[] = [];

  for (let i = 0; i < activeUserIds.length; i++) {
    for (let j = i + 1; j < activeUserIds.length; j++) {
      const u1 = activeUserIds[i];
      const u2 = activeUserIds[j];
      const key = getPairKey(u1, u2);

      // STRICT EXCLUSION: If users are already mutual accepted friends, never pair them
      if (acceptedFriendsPairs.has(key)) {
        continue;
      }

      const media1 = userMediaMap.get(u1)!;
      const media2 = userMediaMap.get(u2)!;

      let score = 0;
      const shared: SharedMediaItem[] = [];

      // Check books
      for (const [title, meta1] of media1.books) {
        const meta2 = media2.books.get(title);
        if (meta2) {
          shared.push({ name: title, type: "book" });
          score += 3 + (meta1.liked && meta2.liked ? 1 : 0);
        }
      }

      // Check movies
      for (const [title, meta1] of media1.movies) {
        const meta2 = media2.movies.get(title);
        if (meta2) {
          shared.push({ name: title, type: "movie" });
          score += 2 + (meta1.liked && meta2.liked ? 1 : 0);
        }
      }

      // Check albums
      for (const [title, meta1] of media1.albums) {
        const meta2 = media2.albums.get(title);
        if (meta2) {
          shared.push({ name: title, type: "album" });
          score += 2 + (meta1.liked && meta2.liked ? 1 : 0);
        }
      }

      // De-prioritize repeating the previous round match
      if (prevRoundPairs.has(key)) {
        score -= 5;
      }

      candidatePairs.push({
        userAId: u1,
        userBId: u2,
        score,
        sharedTitles: shared,
      });
    }
  }

  // Sort candidate pairs descending by score
  candidatePairs.sort((a, b) => b.score - a.score);

  // Greedily match users
  const pairedUserIds = new Set<string>();
  const finalPairs: CandidatePair[] = [];

  for (const pair of candidatePairs) {
    if (!pairedUserIds.has(pair.userAId) && !pairedUserIds.has(pair.userBId)) {
      pairedUserIds.add(pair.userAId);
      pairedUserIds.add(pair.userBId);
      finalPairs.push(pair);
    }
  }

  // Fallback: Pair remaining unpaired active users as "Curated Discovery" matches
  // CRITICAL: NEVER pair two users who are already accepted friends!
  const unpairedUsers = activeUserIds.filter((id) => !pairedUserIds.has(id));

  for (let i = 0; i < unpairedUsers.length; i++) {
    const u1 = unpairedUsers[i];
    if (pairedUserIds.has(u1)) continue;

    for (let j = i + 1; j < unpairedUsers.length; j++) {
      const u2 = unpairedUsers[j];
      if (pairedUserIds.has(u2)) continue;

      const key = getPairKey(u1, u2);
      if (acceptedFriendsPairs.has(key)) {
        // Skip existing friends in discovery fallback
        continue;
      }

      pairedUserIds.add(u1);
      pairedUserIds.add(u2);
      finalPairs.push({
        userAId: u1,
        userBId: u2,
        score: 1,
        sharedTitles: [],
      });
      break;
    }
  }

  // If no valid non-friend pairings can be formed across the entire active pool
  if (finalPairs.length === 0) {
    return {
      success: false,
      roundId,
      pairsCreated: 0,
      leftoverProfile: null,
      message:
        "All active members in Storyhaven are already mutual friends! Invite new readers to expand the lounge.",
      pairings: [],
    };
  }

  // Leftover unpaired users become Haven Scouts for this cycle
  let leftoverProfile: PublicProfile | null = null;
  const remainingScouts = activeUserIds.filter((id) => !pairedUserIds.has(id));
  if (remainingScouts.length > 0) {
    leftoverProfile = profileMap.get(remainingScouts[0]) ?? null;
  }

  // Build full pairing representations with canonical user ordering (user_a < user_b)
  const preparedPairings = finalPairs.map((p) => {
    const isOrdered = p.userAId < p.userBId;
    const aId = isOrdered ? p.userAId : p.userBId;
    const bId = isOrdered ? p.userBId : p.userAId;
    const profA = profileMap.get(aId)!;
    const profB = profileMap.get(bId)!;

    const isDiscovery = p.sharedTitles.length === 0;
    const icebreaker = generateIcebreaker(
      p.sharedTitles,
      profB.display_name ?? "",
    );

    return {
      userAId: aId,
      userBId: bId,
      userA: profA,
      userB: profB,
      sharedTitles: p.sharedTitles,
      score: Math.max(1, p.score),
      icebreaker,
      isDiscovery,
    };
  });

  if (!dryRun && preparedPairings.length > 0) {
    const rowsToInsert = preparedPairings.map((p) => ({
      round_id: roundId,
      user_a: p.userAId,
      user_b: p.userBId,
      score: p.score,
      shared_titles: p.sharedTitles,
      icebreaker: p.icebreaker,
      status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("periodic_matches")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert match drop: ${insertError.message}`);
    }
  }

  return {
    success: true,
    roundId,
    pairsCreated: preparedPairings.length,
    leftoverProfile,
    message: dryRun
      ? `Dry run complete. Simulated ${preparedPairings.length} pairs.`
      : `Successfully dropped ${preparedPairings.length} Haven matches for round "${roundId}".`,
    pairings: preparedPairings.map((p) => ({
      userA: p.userA,
      userB: p.userB,
      sharedTitles: p.sharedTitles,
      score: p.score,
      icebreaker: p.icebreaker,
      isDiscovery: p.isDiscovery,
    })),
  };
}
