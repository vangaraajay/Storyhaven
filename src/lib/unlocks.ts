import { createServiceSupabaseClient } from "@/lib/supabase/server";

/** Domain events that can unlock decorations. */
export type UnlockEvent =
  | "log_created"
  | "review_saved"
  | "forum_post"
  | "forum_comment"
  | "match_made";

type CountName = "books" | "movies" | "albums" | "logs" | "reviews" | "posts" | "comments" | "friends";

type Rule = {
  /** Decoration key (see DECOR in lib/sprites.ts). */
  key: string;
  label: string;
  /** Re-check this rule when any of these events happen. */
  events: UnlockEvent[];
  /** Unlocked when counts[count] >= atLeast. */
  count: CountName;
  atLeast: number;
};

/** Rules table: add a row to add an unlock. */
export const UNLOCK_RULES: Rule[] = [
  { key: "candle", label: "Candle", events: ["log_created"], count: "logs", atLeast: 1 },
  { key: "paperbacks", label: "Paperbacks", events: ["log_created"], count: "books", atLeast: 5 },
  { key: "popcorn", label: "Popcorn", events: ["log_created"], count: "movies", atLeast: 3 },
  { key: "vinyl", label: "Vinyl", events: ["log_created"], count: "albums", atLeast: 3 },
  { key: "chest", label: "Treasure chest", events: ["review_saved"], count: "reviews", atLeast: 1 },
  { key: "trophy", label: "Trophy", events: ["log_created"], count: "logs", atLeast: 10 },
  { key: "cactus", label: "Cactus", events: ["forum_post"], count: "posts", atLeast: 1 },
  { key: "lily", label: "Lily", events: ["forum_comment"], count: "comments", atLeast: 1 },
  { key: "record_player", label: "Record player", events: ["match_made"], count: "friends", atLeast: 1 },
];

type Supabase = ReturnType<typeof createServiceSupabaseClient>;

async function count(
  supabase: Supabase,
  table: string,
  column: string,
  profileId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: (q: any) => any,
): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true }).eq(column, profileId);
  if (extra) q = extra(q);
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

async function loadCount(supabase: Supabase, name: CountName, profileId: string): Promise<number> {
  switch (name) {
    case "books": return count(supabase, "book_logs", "profile_id", profileId);
    case "movies": return count(supabase, "movie_logs", "profile_id", profileId);
    case "albums": return count(supabase, "album_logs", "profile_id", profileId);
    case "logs": {
      const [b, m, a] = await Promise.all([
        loadCount(supabase, "books", profileId),
        loadCount(supabase, "movies", profileId),
        loadCount(supabase, "albums", profileId),
      ]);
      return b + m + a;
    }
    case "reviews": {
      const rev = (q: any) => q.not("review", "is", null); // eslint-disable-line @typescript-eslint/no-explicit-any
      const [b, m, a] = await Promise.all([
        count(supabase, "book_logs", "profile_id", profileId, rev),
        count(supabase, "movie_logs", "profile_id", profileId, rev),
        count(supabase, "album_logs", "profile_id", profileId, rev),
      ]);
      return b + m + a;
    }
    case "posts": return count(supabase, "forum_posts", "profile_id", profileId);
    case "comments": return count(supabase, "forum_comments", "profile_id", profileId);
    case "friends": {
      const { count: n, error } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
      if (error) throw new Error(error.message);
      return n ?? 0;
    }
  }
}

/**
 * Evaluates the rules triggered by `event`, stores newly met ones in `unlocks`
 * and returns only the NEW keys (so the client can toast them). Never throws:
 * a failed check must not fail the save that triggered it.
 */
export async function checkUnlocks(
  profileId: string,
  event: UnlockEvent | UnlockEvent[],
): Promise<string[]> {
  try {
    const events = Array.isArray(event) ? event : [event];
    const rules = UNLOCK_RULES.filter((r) => r.events.some((e) => events.includes(e)));
    if (!rules.length) return [];

    const supabase = createServiceSupabaseClient();
    const { data: have, error } = await supabase
      .from("unlocks")
      .select("item_key")
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
    const owned = new Set((have ?? []).map((r) => r.item_key as string));

    const pending = rules.filter((r) => !owned.has(r.key));
    if (!pending.length) return [];

    const names = [...new Set(pending.map((r) => r.count))];
    const counts = new Map<CountName, number>();
    await Promise.all(
      names.map(async (n) => counts.set(n, await loadCount(supabase, n, profileId))),
    );

    const earned = pending.filter((r) => (counts.get(r.count) ?? 0) >= r.atLeast).map((r) => r.key);
    if (!earned.length) return [];

    // ignoreDuplicates: a concurrent save may have inserted the same key; only the inserter reports it.
    const { data: inserted, error: insErr } = await supabase
      .from("unlocks")
      .upsert(
        earned.map((item_key) => ({ profile_id: profileId, item_key })),
        { onConflict: "profile_id,item_key", ignoreDuplicates: true },
      )
      .select("item_key");
    if (insErr) throw new Error(insErr.message);
    return (inserted ?? []).map((r) => r.item_key as string);
  } catch (err) {
    console.error("checkUnlocks failed", err);
    return [];
  }
}
