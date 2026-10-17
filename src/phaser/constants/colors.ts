export const COLORS = {
  // World
  FLOOR: 0x232136,
  FLOOR_GRID: 0x2a273f,

  // Furniture
  BOOKSHELF: 0x5c3d2e,
  BOOKSHELF_TOP: 0x7a523e,
  DESK: 0x6e4b3b,
  BOARD: 0x47384e,
  TABLE: 0x533e5c,
  CHAIR: 0x3e3146,

  // Sensor zones (semi-transparent overlays for debug/hints)
  SENSOR_PAD: 0x56949f,
  SENSOR_ACTIVE: 0x9ccfd8,

  // Player
  PLAYER: 0xf6c177,
  PLAYER_DETAILS: 0xeb6f92,

  // UI
  TEXT: "#e0def4",
  TEXT_MUTED: "#908caa",
  TEXT_BG: "#191724",
  PROMPT_BORDER: "#ebbcba",
} as const;
