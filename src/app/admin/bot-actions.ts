"use server";

import { isPasswordValid } from "@/lib/admin-auth";
import {
  getBotStats,
  purgeAllBots,
  type BotStats,
} from "@/lib/bot-generator";

export async function getBotStatsAction(
  password: string,
): Promise<{ success: boolean; data?: BotStats; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }

  try {
    const data = await getBotStats();
    return { success: true, data };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load bot statistics.";
    return { success: false, error: message };
  }
}

export async function purgeBotsAction(
  password: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }

  try {
    const { deletedProfiles } = await purgeAllBots();
    return { success: true, count: deletedProfiles };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to purge bot content.";
    return { success: false, error: message };
  }
}
