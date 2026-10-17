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
