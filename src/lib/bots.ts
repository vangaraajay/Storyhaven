import crypto from "crypto";
import {
  AVATAR_OPTIONS,
  type Avatar,
  type AccessoryId,
  type EyesId,
  type HairColorId,
  type HairId,
  type MouthId,
  type SkinId,
  type TopColorId,
  type TopId,
} from "@/lib/avatar/types";

/**
 * Canonical hexadecimal range for PostgreSQL UUIDs starting with 'b075'.
 * Used for range filtering (.gte / .lte) on PostgreSQL uuid columns since
 * Postgres does not support the LIKE operator (~~) on uuid types.
 */
export const BOT_UUID_MIN = "b0750000-0000-0000-0000-000000000000";
export const BOT_UUID_MAX = "b075ffff-ffff-ffff-ffff-ffffffffffff";

/**
 * Returns true if the provided UUID string belongs to a Storyhaven bot.
 * Bot IDs always begin with 'b075' (hex for 'BOTS').
 */
export function isBotId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.toLowerCase().startsWith("b075");
}

/**
 * Generates a valid PostgreSQL UUID with the dedicated bot prefix ('b075').
 */
export function generateBotId(): string {
  const raw = crypto.randomUUID().toLowerCase();
  return `b075${raw.slice(4)}`;
}

/**
 * Checks if a profile object is a bot.
 */
export function isBotProfile(
  profile: { id?: string; auth0_sub?: string | null } | null | undefined,
): boolean {
  if (!profile) return false;
  return isBotId(profile.id) || (profile.auth0_sub?.startsWith("bot|") ?? false);
}

function sample<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generates a randomized, valid retro pixel avatar configuration for bots.
 */
export function generateRandomBotAvatar(): Avatar {
  const hasAccessory = Math.random() < 0.35;
  const accessory = hasAccessory
    ? sample(AVATAR_OPTIONS.accessory as readonly AccessoryId[])
    : null;

  return {
    v: 1,
    skin: sample(AVATAR_OPTIONS.skin as readonly SkinId[]),
    eyes: sample(AVATAR_OPTIONS.eyes as readonly EyesId[]),
    mouth: sample(AVATAR_OPTIONS.mouth as readonly MouthId[]),
    top: sample(AVATAR_OPTIONS.top as readonly TopId[]),
    topColor: sample(AVATAR_OPTIONS.topColor as readonly TopColorId[]),
    hair: sample(AVATAR_OPTIONS.hair as readonly HairId[]),
    hairColor: sample(AVATAR_OPTIONS.hairColor as readonly HairColorId[]),
    accessory,
  };
}
