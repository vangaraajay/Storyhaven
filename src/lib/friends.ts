import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/profiles";

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
};

export type PublicProfile = Pick<
  Profile,
  "id" | "display_name" | "avatar_url"
>;

export type RelationshipKind =
  | "none"
  | "friends"
  | "outgoing"
  | "incoming"
  | "declined";

export type MatchBreakdown = {
  books: number;
  movies: number;
  albums: number;
};

export type MatchCandidate = {
  profile: PublicProfile;
  score: number;
  breakdown: MatchBreakdown;
  relationship: RelationshipKind;
  friendshipId: string | null;
};

export type FriendRow = {
  friendshipId: string;
  profile: PublicProfile;
};

export type ChatGroupSummary = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: PublicProfile | null;
};

type LogRow = {
  profile_id: string;
  name: string;
  liked: boolean;
  status?: string | null;
};

type MediaBag = {
  titles: Map<string, { liked: boolean; status: string | null }>;
};

function normalizeTitle(name: string): string {
  return name.trim().toLowerCase();
}

function publicProfile(row: {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}): PublicProfile {
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
  };
}

function buildBag(logs: LogRow[]): MediaBag {
  const titles = new Map<string, { liked: boolean; status: string | null }>();
  for (const log of logs) {
    const key = normalizeTitle(log.name);
    if (!key) continue;
    const prev = titles.get(key);
    titles.set(key, {
      liked: Boolean(prev?.liked || log.liked),
      status: log.status ?? prev?.status ?? null,
    });
  }
  return { titles };
}

function scoreAgainst(
  mine: { books: MediaBag; movies: MediaBag; albums: MediaBag },
  theirs: { books: MediaBag; movies: MediaBag; albums: MediaBag },
): { score: number; breakdown: MatchBreakdown } {
  let score = 0;
  const breakdown: MatchBreakdown = { books: 0, movies: 0, albums: 0 };

  for (const [title, myMeta] of mine.books.titles) {
    const their = theirs.books.titles.get(title);
    if (!their) continue;
    breakdown.books += 1;
    score += 3;
    if (myMeta.liked && their.liked) score += 1;
    if (
      myMeta.status &&
      their.status &&
      myMeta.status === their.status
    ) {
      score += 1;
    }
  }

  for (const [title, myMeta] of mine.movies.titles) {
    const their = theirs.movies.titles.get(title);
    if (!their) continue;
    breakdown.movies += 1;
    score += 3;
    if (myMeta.liked && their.liked) score += 1;
  }

  for (const [title, myMeta] of mine.albums.titles) {
    const their = theirs.albums.titles.get(title);
    if (!their) continue;
    breakdown.albums += 1;
    score += 3;
    if (myMeta.liked && their.liked) score += 1;
  }

  return { score, breakdown };
}

async function loadLogsForProfiles(profileIds: string[]): Promise<{
  books: LogRow[];
  movies: LogRow[];
  albums: LogRow[];
}> {
  if (profileIds.length === 0) {
    return { books: [], movies: [], albums: [] };
  }

  const supabase = createServiceSupabaseClient();

  const [booksRes, moviesRes, albumsRes] = await Promise.all([
    supabase
      .from("book_logs")
      .select("profile_id, name, liked, status")
      .in("profile_id", profileIds),
    supabase
      .from("movie_logs")
      .select("profile_id, name, liked")
      .in("profile_id", profileIds),
    supabase
      .from("album_logs")
      .select("profile_id, name, liked")
      .in("profile_id", profileIds),
  ]);

  if (booksRes.error) {
    throw new Error(`Failed to load book logs: ${booksRes.error.message}`);
  }
  if (moviesRes.error) {
    throw new Error(`Failed to load movie logs: ${moviesRes.error.message}`);
  }
  if (albumsRes.error) {
    throw new Error(`Failed to load album logs: ${albumsRes.error.message}`);
  }

  return {
    books: (booksRes.data ?? []) as LogRow[],
    movies: (moviesRes.data ?? []) as LogRow[],
    albums: (albumsRes.data ?? []) as LogRow[],
  };
}

function bagsByProfile(
  logs: { books: LogRow[]; movies: LogRow[]; albums: LogRow[] },
  profileId: string,
) {
  return {
    books: buildBag(logs.books.filter((l) => l.profile_id === profileId)),
    movies: buildBag(logs.movies.filter((l) => l.profile_id === profileId)),
    albums: buildBag(logs.albums.filter((l) => l.profile_id === profileId)),
  };
}

function relationshipFromFriendship(
  friendship: Friendship | null,
  myId: string,
): RelationshipKind {
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friends";
  if (friendship.status === "declined") return "declined";
  if (friendship.status === "pending") {
    return friendship.requester_id === myId ? "outgoing" : "incoming";
  }
  return "none";
}

export async function listFriendshipsForProfile(
  profileId: string,
): Promise<Friendship[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

  if (error) {
    throw new Error(`Failed to load friendships: ${error.message}`);
  }

  return (data ?? []) as Friendship[];
}

export async function listAcceptedFriends(
  profileId: string,
): Promise<FriendRow[]> {
  const friendships = await listFriendshipsForProfile(profileId);
  const accepted = friendships.filter((f) => f.status === "accepted");
  if (accepted.length === 0) return [];

  const otherIds = accepted.map((f) =>
    f.requester_id === profileId ? f.addressee_id : f.requester_id,
  );

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", otherIds);

  if (error) {
    throw new Error(`Failed to load friend profiles: ${error.message}`);
  }

  const byId = new Map(
    (data ?? []).map((p) => [p.id as string, publicProfile(p as Profile)]),
  );

  return accepted
    .map((f) => {
      const otherId =
        f.requester_id === profileId ? f.addressee_id : f.requester_id;
      const profile = byId.get(otherId);
      if (!profile) return null;
      return { friendshipId: f.id, profile };
    })
    .filter((row): row is FriendRow => row !== null)
    .sort((a, b) =>
      (a.profile.display_name ?? "").localeCompare(
        b.profile.display_name ?? "",
      ),
    );
}

export async function listIncomingRequests(
  profileId: string,
): Promise<MatchCandidate[]> {
  const friendships = await listFriendshipsForProfile(profileId);
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === profileId,
  );
  if (incoming.length === 0) return [];

  const requesterIds = incoming.map((f) => f.requester_id);
  return enrichCandidates(profileId, requesterIds, friendships);
}

export async function listOutgoingRequests(
  profileId: string,
): Promise<MatchCandidate[]> {
  const friendships = await listFriendshipsForProfile(profileId);
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === profileId,
  );
  if (outgoing.length === 0) return [];

  const addresseeIds = outgoing.map((f) => f.addressee_id);
  return enrichCandidates(profileId, addresseeIds, friendships);
}

async function enrichCandidates(
  myId: string,
  otherIds: string[],
  friendships: Friendship[],
): Promise<MatchCandidate[]> {
  if (otherIds.length === 0) return [];

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", otherIds);

  if (error) {
    throw new Error(`Failed to load profiles: ${error.message}`);
  }

  const logs = await loadLogsForProfiles([myId, ...otherIds]);
  const myBags = bagsByProfile(logs, myId);

  const friendshipByOther = new Map<string, Friendship>();
  for (const f of friendships) {
    const other = f.requester_id === myId ? f.addressee_id : f.requester_id;
    friendshipByOther.set(other, f);
  }

  return (data ?? [])
    .map((row) => {
      const profile = publicProfile(row as Profile);
      const friendship = friendshipByOther.get(profile.id) ?? null;
      const { score, breakdown } = scoreAgainst(
        myBags,
        bagsByProfile(logs, profile.id),
      );
      return {
        profile,
        score,
        breakdown,
        relationship: relationshipFromFriendship(friendship, myId),
        friendshipId: friendship?.id ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.profile.display_name ?? "").localeCompare(
          b.profile.display_name ?? "",
        ),
    );
}

export async function listMatchCandidates(
  profileId: string,
  limit = 40,
): Promise<MatchCandidate[]> {
  const friendships = await listFriendshipsForProfile(profileId);
  const acceptedOtherIds = new Set(
    friendships
      .filter((f) => f.status === "accepted")
      .map((f) =>
        f.requester_id === profileId ? f.addressee_id : f.requester_id,
      ),
  );

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .not("display_name", "is", null)
    .neq("id", profileId);

  if (error) {
    throw new Error(`Failed to load match candidates: ${error.message}`);
  }

  const candidates = (data ?? [])
    .map((row) => publicProfile(row as Profile))
    .filter(
      (p) =>
        Boolean(p.display_name?.trim()) && !acceptedOtherIds.has(p.id),
    );

  if (candidates.length === 0) return [];

  const otherIds = candidates.map((c) => c.id);
  const logs = await loadLogsForProfiles([profileId, ...otherIds]);
  const myBags = bagsByProfile(logs, profileId);

  const friendshipByOther = new Map<string, Friendship>();
  for (const f of friendships) {
    const other =
      f.requester_id === profileId ? f.addressee_id : f.requester_id;
    friendshipByOther.set(other, f);
  }

  return candidates
    .map((profile) => {
      const friendship = friendshipByOther.get(profile.id) ?? null;
      const { score, breakdown } = scoreAgainst(
        myBags,
        bagsByProfile(logs, profile.id),
      );
      return {
        profile,
        score,
        breakdown,
        relationship: relationshipFromFriendship(friendship, profileId),
        friendshipId: friendship?.id ?? null,
      };
    })
    .filter((c) => c.score >= 1)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.profile.display_name ?? "").localeCompare(
          b.profile.display_name ?? "",
        ),
    )
    .slice(0, limit);
}

export async function searchProfilesByName(
  profileId: string,
  query: string,
  limit = 20,
): Promise<MatchCandidate[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const friendships = await listFriendshipsForProfile(profileId);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${q}%`)
    .neq("id", profileId)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search profiles: ${error.message}`);
  }

  const ids = (data ?? []).map((p) => p.id as string);
  return enrichCandidates(profileId, ids, friendships);
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<Friendship> {
  if (requesterId === addresseeId) {
    throw new Error("You cannot friend yourself.");
  }

  const supabase = createServiceSupabaseClient();
  const existing = await findPairFriendship(requesterId, addresseeId);

  if (existing) {
    if (existing.status === "accepted") {
      throw new Error("You are already friends.");
    }
    if (
      existing.status === "pending" &&
      existing.requester_id === addresseeId &&
      existing.addressee_id === requesterId
    ) {
      // Reverse pending → auto-accept
      return acceptFriendRequest(existing.id, requesterId);
    }
    if (existing.status === "pending") {
      return existing;
    }
    // declined → allow new request by updating row
    const { data, error } = await supabase
      .from("friendships")
      .update({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: "pending",
        accepted_at: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to send friend request: ${error.message}`);
    }
    return data as Friendship;
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to send friend request: ${error.message}`);
  }

  return data as Friendship;
}

async function findPairFriendship(
  a: string,
  b: string,
): Promise<Friendship | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`,
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up friendship: ${error.message}`);
  }

  return (data as Friendship | null) ?? null;
}

export async function acceptFriendRequest(
  friendshipId: string,
  actorId: string,
): Promise<Friendship> {
  const supabase = createServiceSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load friendship: ${loadError.message}`);
  }
  if (!existing) {
    throw new Error("Friend request not found.");
  }

  const friendship = existing as Friendship;
  if (friendship.addressee_id !== actorId) {
    throw new Error("Only the recipient can accept this request.");
  }
  if (friendship.status !== "pending") {
    throw new Error("This request is no longer pending.");
  }

  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to accept friend request: ${error.message}`);
  }

  return data as Friendship;
}

export async function declineFriendRequest(
  friendshipId: string,
  actorId: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load friendship: ${loadError.message}`);
  }
  if (!existing) {
    throw new Error("Friend request not found.");
  }

  const friendship = existing as Friendship;
  if (friendship.addressee_id !== actorId) {
    throw new Error("Only the recipient can decline this request.");
  }
  if (friendship.status !== "pending") {
    throw new Error("This request is no longer pending.");
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status: "declined", accepted_at: null })
    .eq("id", friendshipId);

  if (error) {
    throw new Error(`Failed to decline friend request: ${error.message}`);
  }
}

export async function cancelFriendRequest(
  friendshipId: string,
  actorId: string,
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load friendship: ${loadError.message}`);
  }
  if (!existing) {
    throw new Error("Friend request not found.");
  }

  const friendship = existing as Friendship;
  if (friendship.requester_id !== actorId) {
    throw new Error("Only the sender can cancel this request.");
  }
  if (friendship.status !== "pending") {
    throw new Error("This request is no longer pending.");
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) {
    throw new Error(`Failed to cancel friend request: ${error.message}`);
  }
}

export async function getAcceptedFriendshipBetween(
  myId: string,
  otherId: string,
): Promise<Friendship | null> {
  const friendship = await findPairFriendship(myId, otherId);
  if (!friendship || friendship.status !== "accepted") return null;
  return friendship;
}

export async function assertDmAccess(
  friendshipId: string,
  profileId: string,
): Promise<Friendship> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load friendship: ${error.message}`);
  }
  if (!data) {
    throw new Error("Friendship not found.");
  }

  const friendship = data as Friendship;
  if (friendship.status !== "accepted") {
    throw new Error("You can only view messages with accepted friends.");
  }
  if (
    friendship.requester_id !== profileId &&
    friendship.addressee_id !== profileId
  ) {
    throw new Error("You are not part of this friendship.");
  }

  return friendship;
}

export async function listDmMessages(
  friendshipId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, sender_id, body, created_at")
    .eq("friendship_id", friendshipId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return attachSenders((data ?? []) as Omit<ChatMessage, "sender">[]);
}

export async function sendDmMessage(
  friendshipId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  const text = body.trim();
  if (!text) {
    throw new Error("Message cannot be empty.");
  }
  if (text.length > 4000) {
    throw new Error("Message is too long.");
  }

  const supabase = createServiceSupabaseClient();
  const { data: friendship, error: loadError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load friendship: ${loadError.message}`);
  }
  if (!friendship) {
    throw new Error("Friendship not found.");
  }

  const f = friendship as Friendship;
  if (f.status !== "accepted") {
    throw new Error("You can only message accepted friends.");
  }
  if (f.requester_id !== senderId && f.addressee_id !== senderId) {
    throw new Error("You are not part of this friendship.");
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({ friendship_id: friendshipId, sender_id: senderId, body: text })
    .select("id, sender_id, body, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  const [withSender] = await attachSenders([
    data as Omit<ChatMessage, "sender">,
  ]);
  return withSender;
}

export async function listMyGroups(
  profileId: string,
): Promise<ChatGroupSummary[]> {
  const supabase = createServiceSupabaseClient();
  const { data: memberships, error: memError } = await supabase
    .from("chat_group_members")
    .select("group_id")
    .eq("profile_id", profileId);

  if (memError) {
    throw new Error(`Failed to load group memberships: ${memError.message}`);
  }

  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("chat_groups")
    .select("id, name, created_by, created_at")
    .in("id", groupIds)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load groups: ${error.message}`);
  }

  return (data ?? []) as ChatGroupSummary[];
}

export async function createGroup(
  creatorId: string,
  name: string,
  memberIds: string[],
): Promise<ChatGroupSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Group name is required.");
  }

  const friends = await listAcceptedFriends(creatorId);
  const friendIds = new Set(friends.map((f) => f.profile.id));
  const uniqueMembers = Array.from(
    new Set(memberIds.filter((id) => id !== creatorId && friendIds.has(id))),
  );

  const supabase = createServiceSupabaseClient();
  const { data: group, error } = await supabase
    .from("chat_groups")
    .insert({ name: trimmed, created_by: creatorId })
    .select("id, name, created_by, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create group: ${error.message}`);
  }

  const rows = [
    { group_id: group.id, profile_id: creatorId, role: "owner" },
    ...uniqueMembers.map((id) => ({
      group_id: group.id,
      profile_id: id,
      role: "member",
    })),
  ];

  const { error: memError } = await supabase
    .from("chat_group_members")
    .insert(rows);

  if (memError) {
    throw new Error(`Failed to add group members: ${memError.message}`);
  }

  return group as ChatGroupSummary;
}

export async function assertGroupMember(
  groupId: string,
  profileId: string,
): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("chat_group_members")
    .select("profile_id")
    .eq("group_id", groupId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check group membership: ${error.message}`);
  }

  return Boolean(data);
}

export async function listGroupMessages(
  groupId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("group_messages")
    .select("id, sender_id, body, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load group messages: ${error.message}`);
  }

  return attachSenders((data ?? []) as Omit<ChatMessage, "sender">[]);
}

export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  const text = body.trim();
  if (!text) {
    throw new Error("Message cannot be empty.");
  }
  if (text.length > 4000) {
    throw new Error("Message is too long.");
  }

  const isMember = await assertGroupMember(groupId, senderId);
  if (!isMember) {
    throw new Error("You are not a member of this group.");
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, sender_id: senderId, body: text })
    .select("id, sender_id, body, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to send group message: ${error.message}`);
  }

  const [withSender] = await attachSenders([
    data as Omit<ChatMessage, "sender">,
  ]);
  return withSender;
}

async function attachSenders(
  messages: Omit<ChatMessage, "sender">[],
): Promise<ChatMessage[]> {
  if (messages.length === 0) return [];

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", senderIds);

  if (error) {
    throw new Error(`Failed to load message senders: ${error.message}`);
  }

  const byId = new Map(
    (data ?? []).map((p) => [p.id as string, publicProfile(p as Profile)]),
  );

  return messages.map((m) => ({
    ...m,
    sender: byId.get(m.sender_id) ?? null,
  }));
}

export function formatMatchWhy(breakdown: MatchBreakdown): string {
  return `${breakdown.books} books · ${breakdown.movies} movies · ${breakdown.albums} albums`;
}
