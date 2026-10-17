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
  // Central reading table (decorative & collidable obstacle)
  {
    id: "center-table",
    type: "table",
    label: "Study Table",
    x: 350,
    y: 400,
    width: 100,
    height: 60,
    isSolid: true,
    color: COLORS.TABLE,
  },
  // Left chair for center table
  {
    id: "center-chair-left",
    type: "chair",
    x: 315,
    y: 415,
    width: 25,
    height: 30,
    isSolid: true,
    color: COLORS.CHAIR,
  },
  // Right chair for center table
  {
    id: "center-chair-right",
    type: "chair",
    x: 460,
    y: 415,
    width: 25,
    height: 30,
    isSolid: true,
    color: COLORS.CHAIR,
  },
];
