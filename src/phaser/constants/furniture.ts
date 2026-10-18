import { COLORS } from "./colors";

export interface FurnitureConfig {
  id: string;
  type: "bookshelf" | "desk" | "board" | "table" | "chair" | "custom";
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSolid: boolean;
  color?: number;
  /** Optional art. The config rect stays the collider; art is anchored to its bottom edge. */
  sprite?: FurnitureSprite;
}

export interface FurnitureSprite {
  /** Texture key(s). With several, setFrame(i) switches between them. */
  keys: string[];
  /** Integer magnification. */
  scale: number;
  /** Repeat the art horizontally across the collider width (e.g. bookshelf wall). */
  tile?: boolean;
}

/** Shared magnification for all haven art. */
export const ART_SCALE = 2;

/** Landmark objects (podium, board, fireplace, counter) are drawn larger so they read as destinations. */
export const LANDMARK_SCALE = 3;

export const DEFAULT_FURNITURE: FurnitureConfig[] = [
  // Full-width top bookshelf wall
  {
    id: "bookshelf-top",
    type: "bookshelf",
    label: "Library Archives",
    x: 0,
    y: 0,
    width: 800,
    height: 128,
    isSolid: true,
    color: COLORS.BOOKSHELF,
    sprite: { keys: ["bookshelf", "bookshelf_alt1", "bookshelf_alt2"], scale: ART_SCALE, tile: true },
  },
  // Daily Story desk / podium (center-left)
  {
    id: "daily-story-desk",
    type: "desk",
    label: "Today's Story Podium",
    x: 70,
    y: 250,
    width: 96,
    height: 40,
    isSolid: true,
    color: COLORS.DESK,
    sprite: { keys: ["podium", "podiumup", "podiumupper"], scale: LANDMARK_SCALE },
  },
  // Forums notice board (bottom-left)
  {
    id: "forums-board",
    type: "board",
    label: "Community Bulletin",
    x: 40,
    y: 460,
    width: 144,
    height: 50,
    isSolid: true,
    color: COLORS.BOARD,
    sprite: { keys: ["board"], scale: LANDMARK_SCALE },
  },
  // Friends lounge: animated fireplace (bottom-right). Collider = hearth base; art (96x96) rises above it.
  {
    id: "friends-board",
    type: "custom",
    label: "Companions Lounge",
    x: 630,
    y: 454,
    width: 144,
    height: 56,
    isSolid: true,
    color: COLORS.BOARD,
    sprite: { keys: ["fireplace1", "fireplace2", "fireplace3"], scale: LANDMARK_SCALE },
  },
  // Auth Desk: counter sprite (sensor sits just in front). Collider = counter base; art (96x64) rises above it.
  {
    id: "auth-desk",
    type: "table",
    label: "Auth Desk",
    x: 638,
    y: 264,
    width: 144,
    height: 44,
    isSolid: true,
    color: COLORS.TABLE,
    sprite: { keys: ["counter"], scale: LANDMARK_SCALE },
  },
];
