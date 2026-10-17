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
}

export const DEFAULT_FURNITURE: FurnitureConfig[] = [
  // Full-width top bookshelf wall
  {
    id: "bookshelf-top",
    type: "bookshelf",
    label: "Library Archives",
    x: 0,
    y: 0,
    width: 800,
    height: 70,
    isSolid: true,
    color: COLORS.BOOKSHELF,
  },
  // Daily Story desk / podium (center-left)
  {
    id: "daily-story-desk",
    type: "desk",
    label: "Today's Story Podium",
    x: 90,
    y: 200,
    width: 120,
    height: 60,
    isSolid: true,
    color: COLORS.DESK,
  },
  // Forums notice board (bottom-left)
  {
    id: "forums-board",
    type: "board",
    label: "Community Bulletin",
    x: 20,
    y: 450,
    width: 140,
    height: 60,
    isSolid: true,
    color: COLORS.BOARD,
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
