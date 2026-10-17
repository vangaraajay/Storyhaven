import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { listAcceptedFriends } from "@/lib/friends";
import type { BookLog, MovieLog, AlbumLog } from "@/lib/logging";

export type CatalogMediaType = "all" | "book" | "movie" | "album";
export type CatalogMode = "friends" | "self";

export type CatalogItem = {
  id: string;
  type: "book" | "movie" | "album";
  name: string;
  cover_url: string | null;
  rating: number | null;
  status: string | null;
  liked: boolean;
  review: string | null;
  pages?: number | null;
  runtime?: number | null;
  started_date?: string | null;
  finished_date?: string | null;
  created_at: string;
  owner: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    isSelf: boolean;
  };
};

export type CatalogFeedResponse = {
  items: CatalogItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasFriends: boolean;
  counts: {
    all: number;
    books: number;
    movies: number;
    albums: number;
  };
};

export async function listCatalogFeed(
  profileId: string,
  mode: CatalogMode = "friends",
  category: CatalogMediaType = "all",
  page = 1,
  pageSize = 12,
): Promise<CatalogFeedResponse> {
  const supabase = createServiceSupabaseClient();

  // Determine target profiles
  let targetProfileIds: string[] = [profileId];
  let hasFriends = false;

  if (mode === "friends") {
    const friends = await listAcceptedFriends(profileId);
    if (friends.length > 0) {
      hasFriends = true;
      const friendIds = friends.map((f) => f.profile.id);
      targetProfileIds = [profileId, ...friendIds];
    }
  } else {
    // Strictly isolate to self
    targetProfileIds = [profileId];
  }

  // Hydrate profiles map for attribution
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", targetProfileIds);

  const profileMap = new Map<
    string,
    { display_name: string; avatar_url: string | null }
  >();
  for (const p of profileRows ?? []) {
    profileMap.set(p.id, {
      display_name: p.display_name?.trim() || "Haven Reader",
      avatar_url: p.avatar_url ?? null,
    });
  }

  const resolveOwner = (ownerId: string) => {
    const prof = profileMap.get(ownerId);
    return {
      id: ownerId,
      display_name: prof?.display_name || "Haven Reader",
      avatar_url: prof?.avatar_url ?? null,
      isSelf: ownerId === profileId,
    };
  };

  // Helper to strictly apply profile filtering
  const applyFilter = <T>(query: T): T => {
    const q = query as any;
    if (mode === "self") {
      return q.eq("profile_id", profileId);
    }
    return q.in("profile_id", targetProfileIds);
  };

  // Get exact counts for each category
  const [booksCountRes, moviesCountRes, albumsCountRes] = await Promise.all([
    applyFilter(
      supabase.from("book_logs").select("id", { count: "exact", head: true }),
    ),
    applyFilter(
      supabase.from("movie_logs").select("id", { count: "exact", head: true }),
    ),
    applyFilter(
      supabase.from("album_logs").select("id", { count: "exact", head: true }),
    ),
  ]);

  const booksCount = booksCountRes.count ?? 0;
  const moviesCount = moviesCountRes.count ?? 0;
  const albumsCount = albumsCountRes.count ?? 0;
  const allCount = booksCount + moviesCount + albumsCount;

  let totalCount = allCount;
  if (category === "book") totalCount = booksCount;
  else if (category === "movie") totalCount = moviesCount;
  else if (category === "album") totalCount = albumsCount;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  let items: CatalogItem[] = [];

  if (category === "book") {
    const baseQuery = applyFilter(supabase.from("book_logs").select("*"));
    const { data, error } = await (baseQuery as any)
      .order("created_at", { ascending: false })
      .range((safePage - 1) * pageSize, safePage * pageSize - 1);

    if (error) {
      throw new Error(`Failed to load books: ${error.message}`);
    }

    items = (data ?? []).map((row: BookLog) => ({
      id: row.id,
      type: "book",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: row.status,
      liked: Boolean(row.liked),
      review: row.review,
      pages: row.pages,
      started_date: row.started_date,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));
  } else if (category === "movie") {
    const baseQuery = applyFilter(supabase.from("movie_logs").select("*"));
    const { data, error } = await (baseQuery as any)
      .order("created_at", { ascending: false })
      .range((safePage - 1) * pageSize, safePage * pageSize - 1);

    if (error) {
      throw new Error(`Failed to load movies: ${error.message}`);
    }

    items = (data ?? []).map((row: MovieLog) => ({
      id: row.id,
      type: "movie",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: null,
      liked: Boolean(row.liked),
      review: row.review,
      runtime: row.runtime,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));
  } else if (category === "album") {
    const baseQuery = applyFilter(supabase.from("album_logs").select("*"));
    const { data, error } = await (baseQuery as any)
      .order("created_at", { ascending: false })
      .range((safePage - 1) * pageSize, safePage * pageSize - 1);

    if (error) {
      throw new Error(`Failed to load albums: ${error.message}`);
    }

    items = (data ?? []).map((row: AlbumLog) => ({
      id: row.id,
      type: "album",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: null,
      liked: Boolean(row.liked),
      review: row.review,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));
  } else {
    // "all" - Unified timeline query
    const fetchLimit = Math.max(pageSize * safePage + 20, 50);
    const [booksRes, moviesRes, albumsRes] = await Promise.all([
      (applyFilter(supabase.from("book_logs").select("*")) as any)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
      (applyFilter(supabase.from("movie_logs").select("*")) as any)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
      (applyFilter(supabase.from("album_logs").select("*")) as any)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
    ]);

    if (booksRes.error) throw new Error(booksRes.error.message);
    if (moviesRes.error) throw new Error(moviesRes.error.message);
    if (albumsRes.error) throw new Error(albumsRes.error.message);

    const bookItems: CatalogItem[] = (booksRes.data ?? []).map((row: BookLog) => ({
      id: row.id,
      type: "book",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: row.status,
      liked: Boolean(row.liked),
      review: row.review,
      pages: row.pages,
      started_date: row.started_date,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));

    const movieItems: CatalogItem[] = (moviesRes.data ?? []).map((row: MovieLog) => ({
      id: row.id,
      type: "movie",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: null,
      liked: Boolean(row.liked),
      review: row.review,
      runtime: row.runtime,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));

    const albumItems: CatalogItem[] = (albumsRes.data ?? []).map((row: AlbumLog) => ({
      id: row.id,
      type: "album",
      name: row.name,
      cover_url: row.cover_url,
      rating: row.rating != null ? Number(row.rating) : null,
      status: null,
      liked: Boolean(row.liked),
      review: row.review,
      finished_date: row.finished_date,
      created_at: row.created_at,
      owner: resolveOwner(row.profile_id),
    }));

    // Merge & sort chronologically descending (newest first)
    const combined = [...bookItems, ...movieItems, ...albumItems].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const startIndex = (safePage - 1) * pageSize;
    items = combined.slice(startIndex, startIndex + pageSize);
  }

  // Strict defense-in-depth isolation for "self" mode
  if (mode === "self") {
    items = items.filter((item) => item.owner.id === profileId);
  }

  return {
    items,
    totalCount,
    totalPages,
    currentPage: safePage,
    hasFriends,
    counts: {
      all: allCount,
      books: booksCount,
      movies: moviesCount,
      albums: albumsCount,
    },
  };
}
