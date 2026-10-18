import {
  AVATAR_OPTIONS,
  HAIR_PALETTES,
  SKIN_PALETTES,
  TOP_PALETTES,
  type AccessoryId,
  type Avatar,
  type Palette,
} from "./types";

export type Swatch = { id: string; name: string; palette: Palette };

function swatches(palettes: Record<string, Palette>): Swatch[] {
  return Object.entries(palettes).map(([id, palette]) => ({
    id,
    name: id.replace(/_/g, " "),
    palette,
  }));
}

/** Swatch lists (name + [light, mid, shadow]) for each recolorable layer. */
export const SWATCHES = {
  skin: swatches(SKIN_PALETTES),
  hair: swatches(HAIR_PALETTES),
  top: swatches(TOP_PALETTES),
};

export type PartName = "hair" | "eyes" | "mouth" | "top" | "accessory";

export type PartOption = { id: string; name: string };

function opts(ids: readonly string[]): PartOption[] {
  return ids.map((id) => ({
    id,
    name: id.replace(/_/g, " ").replace(/^3d/, "3D"),
  }));
}

/** Option lists derived from the AVATAR_ART keys in lib/sprites.ts. Accessory has "none". */
export const PART_OPTIONS: Record<PartName, PartOption[]> = {
  hair: opts(AVATAR_OPTIONS.hair),
  eyes: opts(AVATAR_OPTIONS.eyes),
  mouth: opts(AVATAR_OPTIONS.mouth),
  top: opts(AVATAR_OPTIONS.top),
  accessory: [{ id: "none", name: "None" }, ...opts(AVATAR_OPTIONS.accessory)],
};

function oneOf<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Uniformly random avatar. Call on the server for SSR-stable initial values. */
export function randomAvatar(): Avatar {
  const accessory: AccessoryId | null =
    Math.random() < 0.5 ? null : oneOf(AVATAR_OPTIONS.accessory);
  return {
    v: 1,
    skin: oneOf(AVATAR_OPTIONS.skin),
    eyes: oneOf(AVATAR_OPTIONS.eyes),
    mouth: oneOf(AVATAR_OPTIONS.mouth),
    top: oneOf(AVATAR_OPTIONS.top),
    topColor: oneOf(AVATAR_OPTIONS.topColor),
    hair: oneOf(AVATAR_OPTIONS.hair),
    hairColor: oneOf(AVATAR_OPTIONS.hairColor),
    accessory,
  };
}
