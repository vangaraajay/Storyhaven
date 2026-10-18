export const COLORS = {
  // World
  FLOOR: 0x3a281c,
  FLOOR_GRID: 0x4a3426,

  // Furniture
  BOOKSHELF: 0x5c3d2e,
  BOOKSHELF_TOP: 0x7a523e,
  DESK: 0x6e4b3b,
  BOARD: 0x6b4a32,
  TABLE: 0x7a5238,
  CHAIR: 0x5a3d2a,

  // Sensor zones (semi-transparent overlays for debug/hints)
  SENSOR_PAD: 0x8aa86a,
  SENSOR_ACTIVE: 0xa9c98a,

  // Player
  PLAYER: 0xf6c177,
  PLAYER_DETAILS: 0xe08a5a,

  // UI
  TEXT: "#f3e6c8",
  TEXT_MUTED: "#c4a882",
  TEXT_BG: "#2b1d14",
  PROMPT_BORDER: "#e8c9a0",
} as const;
