import type { CSSProperties } from "react";

/** On-screen magnification applied to every sprite. */
export const SPRITE_SCALE = 2;

/** `slice` is the 9-slice corner size in source pixels. Files live in /public. */
export type Sprite = { src: string; slice: number };

export const SPRITES = {
  frame: { src: "/frame.png", slice: 6 },
  toast: { src: "/toast.png", slice: 6 },
  button: { src: "/Button.png", slice: 4 },
  buttonHover: { src: "/button_hover.png", slice: 4 },
  buttonPressed: { src: "/button_pressed.png", slice: 4 },
  input: { src: "/input_field.png", slice: 4 },
  inputFocus: { src: "/input_field_focus.png", slice: 4 },
  tab: { src: "/tab.png", slice: 4 },
  tabActive: { src: "/tab_active.png", slice: 4 },
  badge: { src: "/badge.png", slice: 3 },
  // No divider art yet: PixelDivider falls back to a 2px ink line.
  divider: null,
} as const satisfies Record<string, Sprite | null>;

export type SpriteKey = keyof typeof SPRITES;

/**
 * CSS variables consumed by the pixel CSS modules (--px-src, --px-slice,
 * --px-bw = slice x SPRITE_SCALE). Returns null when the base sprite is
 * missing so the component applies its fallback class. Extra states fall back
 * to the base image when their sprite is missing.
 */
export function spriteVars(
  base: SpriteKey,
  states: Partial<Record<"hover" | "pressed" | "focus", SpriteKey>> = {},
): CSSProperties | null {
  const sprite: Sprite | null = SPRITES[base];
  if (!sprite) return null;

  const vars: Record<string, string | number> = {
    "--px-src": `url(${sprite.src})`,
    "--px-slice": sprite.slice,
    "--px-bw": `${sprite.slice * SPRITE_SCALE}px`,
  };
  for (const [state, key] of Object.entries(states)) {
    const s: Sprite | null = SPRITES[key];
    vars[`--px-src-${state}`] = `url(${(s ?? sprite).src})`;
  }
  return vars as CSSProperties;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 16x16 icon art in /public. Add a key here to make it available to <Icon>. */
export const ICONS = {
  book: "/book.png",
  chat: "/chat.png",
  film: "/film.png",
  heart: "/heart.png",
  lock: "/lock.png",
  match: "/match.png",
  search: "/search.png",
  settings: "/settings.png",
  star_empty: "/star_empty.png",
  star_full: "/star_full.png",
  upvote: "/upvote.png",
  vinyl: "/vinyl.png",
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Avatar layer art (32x32 PNGs in /public). Layers drawn bottom to top:
 * body, eyes, mouth, top, hair, accessory. Key colors #FF00FF / #CC00CC /
 * #990099 in body, hair and top art are replaced by the chosen palette.
 */
export const AVATAR_ART = {
  body: { idle: "/body.png", walk_l: "/walk_l.png", walk_r: "/walk_r.png" },
  eyes: {
    eyes: { open: "/eyes.png", blink: "/eyes_blink.png", left: "/eyes_left.png", right: "/eyes_right.png" },
    eyes_sp: { open: "/eyes_sp.png", blink: "/eyes_sp_blink.png", left: "/eyes_sp_left.png", right: "/eyes_sp_right.png" },
    happy: { open: "/happy.png", blink: "/happy_blink.png", left: "/happy_left.png", right: "/happy_right.png" },
    sleepy: { open: "/sleepy.png", blink: "/sleepy_blink.png", left: "/sleepy_left.png", right: "/sleepy_right.png" },
  },
  mouth: { smile: "/smile.png", flat: "/flat.png", flat_wide: "/flat_wide.png" },
  top: {
    tshirt: "/tshirt.png",
    hoodie: "/hoodie.png",
    cardigan: "/cardigan.png",
    overalls: "/overalls.png",
    jersey: "/jersey.png",
    turtleneck: "/turtleneck.png",
  },
  hair: {
    short: "/short.png",
    straight: "/straight.png",
    curls: "/curls.png",
    buzz_cut: "/buzz_cut.png",
    crop_cut: "/crop_cut.png",
    curly_pigtails: "/curly_pigtails.png",
  },
  accessory: {
    glasses: "/glasses.png",
    "3d_glasses": "/3D_glasses.png",
    headphones: "/headphones.png",
  },
} as const;

/** Bookcase art. null = missing: Bookcase draws a CSS fallback. Source px; drawn at 2x. */
export const SHELF_ART = {
  capL: { src: "/end_left.png", w: 8, h: 16 },
  capR: { src: "/end_right.png", w: 8, h: 16 },
  post: { src: "/post.png", w: 8, h: 32 },
  plank: { src: "/plank.png" }, // tiled horizontally; CSS fallback if the file is missing
  back: { src: "/back.png", w: 32, h: 32 }, // recolorable tile
  slot: { src: "/slot.png", w: 32, h: 32 }, // empty decor slot marker
  pouf: null, // no art yet
  floor: { src: "/floor.png", w: 64, h: 40 },
} as const;

/** Decoration art (32x32) a user can place in decor slots once unlocked. */
export const DECOR = {
  candle: "/candle.png",
  cactus: "/cactus.png",
  lily: "/lily.png",
  chest: "/chest.png",
  popcorn: "/popcorn.png",
  paperbacks: "/paperbacks.png",
  vinyl: "/vinyl.png",
  trophy: "/Trophy.png",
  record_player: "/record_player.png",
} as const;

export type DecorKey = keyof typeof DECOR;
