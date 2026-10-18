import { AVATAR_ART } from "@/lib/sprites";

/** Key colors in the layer art, in [light, mid, shadow] order. */
export const KEY_COLORS = ["#FF00FF", "#CC00CC", "#990099"] as const;

export type Palette = readonly [light: string, mid: string, shadow: string];

export const SKIN_PALETTES = {
  porcelain: ["#F6DCCB", "#E8BFA5", "#C89A82"],
  sand: ["#EDC9A2", "#D9A97C", "#B58459"],
  honey: ["#DDAA72", "#C48A52", "#9C6A3C"],
  bronze: ["#B77B4F", "#9A603A", "#774628"],
  umber: ["#8A5A3C", "#6E4329", "#52301D"],
  ebony: ["#5E3B2B", "#46291D", "#2F1A12"],
} as const satisfies Record<string, Palette>;

export const HAIR_PALETTES = {
  black: ["#4A4458", "#2E2A3A", "#1A1722"],
  brown: ["#9A6A4A", "#74482F", "#4F2F1D"],
  auburn: ["#C0623E", "#97442A", "#6B2D1B"],
  blonde: ["#F2D38A", "#D9B25F", "#B08A3E"],
  rose: ["#F2A0B8", "#E0708F", "#B04A68"],
  iris: ["#C4A7E7", "#9C7CC8", "#6F5498"],
  foam: ["#9CCFD8", "#6FA9B5", "#46808C"],
  silver: ["#E6E3EE", "#BDB8CC", "#8E8AA3"],
} as const satisfies Record<string, Palette>;

export const TOP_PALETTES = {
  rose: ["#EB6F92", "#C24E70", "#8F3552"],
  gold: ["#F6C177", "#D9A055", "#A87636"],
  foam: ["#9CCFD8", "#6FA9B5", "#46808C"],
  pine: ["#3E8FB0", "#31748F", "#215266"],
  iris: ["#C4A7E7", "#9C7CC8", "#6F5498"],
  moss: ["#8FBF7F", "#68995A", "#46703C"],
  cream: ["#F3E9D2", "#D9CBAA", "#B0A07F"],
  ink: ["#6E6A86", "#4A4660", "#2E2A3F"],
} as const satisfies Record<string, Palette>;

export type SkinId = keyof typeof SKIN_PALETTES;
export type HairColorId = keyof typeof HAIR_PALETTES;
export type TopColorId = keyof typeof TOP_PALETTES;
export type EyesId = keyof typeof AVATAR_ART.eyes;
export type MouthId = keyof typeof AVATAR_ART.mouth;
export type TopId = keyof typeof AVATAR_ART.top;
export type HairId = keyof typeof AVATAR_ART.hair;
export type AccessoryId = keyof typeof AVATAR_ART.accessory;
export type BodyFrame = keyof typeof AVATAR_ART.body;
export type EyeFrame = "open" | "blink" | "left" | "right";

/** Stored in profiles.avatar (jsonb). */
export type Avatar = {
  v: 1;
  skin: SkinId;
  eyes: EyesId;
  mouth: MouthId;
  top: TopId;
  topColor: TopColorId;
  hair: HairId;
  hairColor: HairColorId;
  accessory: AccessoryId | null;
};

export const DEFAULT_AVATAR: Avatar = {
  v: 1,
  skin: "sand",
  eyes: "eyes",
  mouth: "smile",
  top: "tshirt",
  topColor: "pine",
  hair: "short",
  hairColor: "brown",
  accessory: null,
};

export const AVATAR_OPTIONS = {
  skin: Object.keys(SKIN_PALETTES) as SkinId[],
  eyes: Object.keys(AVATAR_ART.eyes) as EyesId[],
  mouth: Object.keys(AVATAR_ART.mouth) as MouthId[],
  top: Object.keys(AVATAR_ART.top) as TopId[],
  topColor: Object.keys(TOP_PALETTES) as TopColorId[],
  hair: Object.keys(AVATAR_ART.hair) as HairId[],
  hairColor: Object.keys(HAIR_PALETTES) as HairColorId[],
  accessory: Object.keys(AVATAR_ART.accessory) as AccessoryId[],
};

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Validates untrusted JSON (form data, DB). Missing or unknown fields get defaults. */
export function parseAvatar(input: unknown): Avatar {
  let raw: unknown = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return DEFAULT_AVATAR;
    }
  }
  if (!raw || typeof raw !== "object") return DEFAULT_AVATAR;
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_AVATAR;
  const accessory =
    typeof o.accessory === "string" &&
    (AVATAR_OPTIONS.accessory as string[]).includes(o.accessory)
      ? (o.accessory as AccessoryId)
      : null;
  return {
    v: 1,
    skin: pick(o.skin, AVATAR_OPTIONS.skin, d.skin),
    eyes: pick(o.eyes, AVATAR_OPTIONS.eyes, d.eyes),
    mouth: pick(o.mouth, AVATAR_OPTIONS.mouth, d.mouth),
    top: pick(o.top, AVATAR_OPTIONS.top, d.top),
    topColor: pick(o.topColor, AVATAR_OPTIONS.topColor, d.topColor),
    hair: pick(o.hair, AVATAR_OPTIONS.hair, d.hair),
    hairColor: pick(o.hairColor, AVATAR_OPTIONS.hairColor, d.hairColor),
    accessory,
  };
}
