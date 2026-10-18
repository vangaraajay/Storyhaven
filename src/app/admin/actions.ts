"use server";

import crypto from "crypto";
import {
  clearActiveMatches,
  getAdminMatchStatus,
  runMatchDrop,
  type AdminStatus,
  type MatchDropResult,
} from "@/lib/match-drop";

/**
 * Constant-time password verification resistant to timing attacks.
 */
function isPasswordValid(input: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass || typeof adminPass !== "string" || !adminPass.trim()) {
    return false;
  }
  const inputHash = crypto.createHash("sha256").update(input.trim()).digest();
  const targetHash = crypto.createHash("sha256").update(adminPass.trim()).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}

export async function verifyAdminPasswordAction(
  password: string,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.ADMIN_PASSWORD) {
    return {
      success: false,
      error: "ADMIN_PASSWORD is not configured on the server.",
    };
  }
  if (!isPasswordValid(password)) {
    return { success: false, error: "Invalid admin password." };
  }
  return { success: true };
}

export async function getAdminStatusAction(
  password: string,
): Promise<{ success: boolean; data?: AdminStatus; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }
  try {
    const data = await getAdminMatchStatus();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load admin status.";
    return { success: false, error: message };
  }
}

export async function triggerMatchDropAction(
  password: string,
  roundId?: string,
): Promise<{ success: boolean; result?: MatchDropResult; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }
  try {
    const result = await runMatchDrop(roundId, false);
    return { success: true, result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute match drop.";
    return { success: false, error: message };
  }
}

export async function dryRunMatchDropAction(
  password: string,
): Promise<{ success: boolean; result?: MatchDropResult; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }
  try {
    const result = await runMatchDrop(undefined, true);
    return { success: true, result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to simulate match drop.";
    return { success: false, error: message };
  }
}

export async function clearActiveMatchesAction(
  password: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!isPasswordValid(password)) {
    return { success: false, error: "Unauthorized: Invalid admin credentials." };
  }
  try {
    const result = await clearActiveMatches();
    return { success: true, count: result.count };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to clear active matches.";
    return { success: false, error: message };
  }
}
