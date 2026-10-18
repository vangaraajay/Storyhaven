import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { DECOR } from "@/lib/sprites";

export const SHELF_THEMES = ["oak", "walnut", "birch", "rose"] as const;
export type ShelfTheme = (typeof SHELF_THEMES)[number];

/** Every 6th position (6th, 12th, ...) is a decoration slot. Slots are 0-based. */
export const SLOTS_PER_ROW = 6;
export const isDecorSlot = (slot: number) => (slot + 1) % SLOTS_PER_ROW === 0;

export type ShelfData = {
  theme: ShelfTheme;
  placed: Record<number, string>;
  unlocked: string[];
};

export function isTheme(v: unknown): v is ShelfTheme {
  return typeof v === "string" && (SHELF_THEMES as readonly string[]).includes(v);
}

export async function getShelfData(profileId: string): Promise<ShelfData> {
  const supabase = createServiceSupabaseClient();
  const [profile, items, unlocks] = await Promise.all([
    supabase.from("profiles").select("shelf_theme").eq("id", profileId).maybeSingle(),
    supabase.from("shelf_items").select("slot, item_key").eq("profile_id", profileId),
    supabase.from("unlocks").select("item_key").eq("profile_id", profileId),
  ]);
  for (const r of [profile, items, unlocks]) {
    if (r.error) throw new Error(`Failed to load shelf: ${r.error.message}`);
  }
  const theme = profile.data?.shelf_theme;
  return {
    theme: isTheme(theme) ? theme : "oak",
    placed: Object.fromEntries((items.data ?? []).map((r) => [r.slot as number, r.item_key as string])),
    unlocked: (unlocks.data ?? []).map((r) => r.item_key as string),
  };
}

/** Places (or clears, with itemKey null) a decoration. Must be an unlocked key in a decor slot. */
export async function setShelfItem(profileId: string, slot: number, itemKey: string | null) {
  if (!Number.isInteger(slot) || slot < 0 || !isDecorSlot(slot)) {
    throw new Error("That slot cannot hold a decoration.");
  }
  const supabase = createServiceSupabaseClient();

  if (itemKey === null) {
    const { error } = await supabase.from("shelf_items").delete().eq("profile_id", profileId).eq("slot", slot);
    if (error) throw new Error(error.message);
    return;
  }

  if (!(itemKey in DECOR)) throw new Error("Unknown decoration.");
  const { data, error: uErr } = await supabase
    .from("unlocks").select("item_key").eq("profile_id", profileId).eq("item_key", itemKey).maybeSingle();
  if (uErr) throw new Error(uErr.message);
  if (!data) throw new Error("You haven't unlocked that decoration yet.");

  const { error } = await supabase
    .from("shelf_items")
    .upsert({ profile_id: profileId, slot, item_key: itemKey, updated_at: new Date().toISOString() }, { onConflict: "profile_id,slot" });
  if (error) throw new Error(error.message);
}

export async function setShelfTheme(profileId: string, theme: ShelfTheme) {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("profiles").update({ shelf_theme: theme }).eq("id", profileId);
  if (error) throw new Error(error.message);
}
