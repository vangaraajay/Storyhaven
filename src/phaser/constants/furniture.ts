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
    sprite: { keys: ["bookshelf"], scale: ART_SCALE, tile: true },
  },
  // Daily Story desk / podium (center-left)
  {
    id: "daily-story-desk",
    type: "desk",
    label: "Today's Story Podium",
    // Collider = podium base (64x40); art (64x96) rises above it.
    x: 118,
    y: 220,
    width: 64,
    height: 40,
    isSolid: true,
    color: COLORS.DESK,
    sprite: { keys: ["podium", "podiumup", "podiumupper"], scale: ART_SCALE },
  },
  // Forums notice board (bottom-left)
  {
    id: "forums-board",
    type: "board",
    label: "Community Bulletin",
    // Collider = bottom of the board; art (96x80) is anchored to it.
    x: 40,
    y: 470,
    width: 96,
    height: 40,
    isSolid: true,
    color: COLORS.BOARD,
    sprite: { keys: ["board"], scale: ART_SCALE },
  },
  // Friends meeting board / couch (bottom-right)
  {
    id: "friends-board",
    type: "board",
    label: "Companions Lounge",
    x: 640,
    y: 450,
    width: 140,
    height: 60,
    isSolid: true,
    color: COLORS.BOARD,
  },
  // Auth Desk — log in / log out (sensor sits just in front)
  {
    id: "auth-desk",
    type: "table",
    label: "Auth Desk",
    x: 340,
    y: 400,
    width: 120,
    height: 55,
    isSolid: true,
    color: COLORS.TABLE,
  },
  {
    id: "auth-chair-left",
    type: "chair",
    x: 310,
    y: 415,
    width: 25,
    height: 30,
    isSolid: true,
    color: COLORS.CHAIR,
  },
  {
    id: "auth-chair-right",
    type: "chair",
    x: 465,
    y: 415,
    width: 25,
    height: 30,
    isSolid: true,
    color: COLORS.CHAIR,
  },
];
