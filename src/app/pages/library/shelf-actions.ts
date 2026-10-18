"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import { isTheme, setShelfItem, setShelfTheme } from "@/lib/shelf";

async function requireProfileId(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("You must be logged in.");
  const profile = await getProfile(session.user);
  if (!profile || !isProfileComplete(profile)) throw new Error("Create your profile first.");
  return profile.id;
}

export async function placeDecorAction(slot: number, itemKey: string | null): Promise<{ error: string | null }> {
  try {
    await setShelfItem(await requireProfileId(), slot, itemKey);
    revalidatePath("/pages/library");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save decoration." };
  }
}

export async function setThemeAction(theme: string): Promise<{ error: string | null }> {
  try {
    if (!isTheme(theme)) throw new Error("Unknown theme.");
    await setShelfTheme(await requireProfileId(), theme);
    revalidatePath("/pages/library");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save theme." };
  }
}
