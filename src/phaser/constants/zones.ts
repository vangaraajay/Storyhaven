export interface LandmarkZone {
  id: string;
  name: string;
  sensorRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  route: string;
  prompt: string;
  color?: number;
}

const AUTH_DESK_RECT = {
  x: 330,
  y: 460,
  width: 140,
  height: 70,
};

/** Auth Desk is only used inside the haven (always signed in). */
export function buildAuthDeskZone(
  needsProfile: boolean,
  displayName: string | null,
): LandmarkZone {
  if (needsProfile) {
    return {
      id: "auth-desk",
      name: "Auth Desk",
      sensorRect: AUTH_DESK_RECT,
      route: "/pages/profile",
      prompt: "🪪 Auth Desk — Create your profile",
      color: 0xc4a7e7,
    };
  }

  const who = displayName?.trim() || "signed in";
  return {
    id: "auth-desk",
    name: "Auth Desk",
    sensorRect: AUTH_DESK_RECT,
    route: "/auth/logout",
    prompt: `🚪 Auth Desk — Log out (${who})`,
    color: 0xc4a7e7,
  };
}

export const LANDMARK_ZONES: LandmarkZone[] = [
  {
    id: "bookshelf",
    name: "Library Bookshelf",
    sensorRect: {
      x: 100,
      y: 128,
      width: 600,
      height: 50,
    },
    route: "/pages/library",
    prompt: "📖 Library — Log books, movies & albums",
    color: 0x9ccfd8,
  },
  {
    id: "daily-story",
    name: "Daily Story",
    sensorRect: {
      x: 90,
      y: 260,
      width: 120,
      height: 50,
    },
    route: "/pages/daily-story",
    prompt: "📜 Daily Story — Read today's tale",
    color: 0xf6c177,
  },
  {
    id: "forums",
    name: "Forums",
    sensorRect: {
      x: 20,
      y: 510,
      width: 140,
      height: 70,
    },
    route: "/pages/forum",
    prompt: "💬 Forums — Community Discussions",
    color: 0xeb6f92,
  },
  {
    id: "friends",
    name: "Friends",
    sensorRect: {
      x: 640,
      y: 510,
      width: 140,
      height: 70,
    },
    route: "/pages/friends",
    prompt: "👥 Friends — Match & chat",
    color: 0x31748f,
  },
];

export function getActiveZones(
  needsProfile: boolean,
  displayName: string | null,
): LandmarkZone[] {
  return [buildAuthDeskZone(needsProfile, displayName), ...LANDMARK_ZONES];
}
