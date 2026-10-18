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
  /** Key of a pixel icon (lib/sprites ICONS) drawn beside the prompt. */
  icon?: string;
  color?: number;
}

const AUTH_DESK_RECT = {
  x: 638,
  y: 312,
  width: 144,
  height: 50,
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
      prompt: "Auth Desk — Create your profile",
      icon: "id_card",
      color: 0xd9a0b0,
    };
  }

  const who = displayName?.trim() || "signed in";
  return {
    id: "auth-desk",
    name: "Auth Desk",
    sensorRect: AUTH_DESK_RECT,
    route: "/auth/logout",
    prompt: `Auth Desk — Log out (${who})`,
    icon: "door",
    color: 0xd9a0b0,
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
    prompt: "Library — Log books, movies & albums",
    icon: "book",
    color: 0xa9c98a,
  },
  {
    id: "daily-story",
    name: "Daily Story",
    sensorRect: {
      x: 58,
      y: 292,
      width: 120,
      height: 60,
    },
    route: "/pages/daily-story",
    prompt: "Daily Story — Read today's tale",
    icon: "scroll",
    color: 0xf6c177,
  },
  {
    id: "forums",
    name: "Forums",
    sensorRect: {
      x: 30,
      y: 512,
      width: 160,
      height: 70,
    },
    route: "/pages/forum",
    prompt: "Forums — Community Discussions",
    icon: "chat",
    color: 0xe08a5a,
  },
  {
    id: "friends",
    name: "Friends",
    sensorRect: {
      x: 630,
      y: 512,
      width: 150,
      height: 70,
    },
    route: "/pages/friends",
    prompt: "Friends — Match & chat",
    icon: "match",
    color: 0x5c7040,
  },
];

export function getActiveZones(
  needsProfile: boolean,
  displayName: string | null,
): LandmarkZone[] {
  return [buildAuthDeskZone(needsProfile, displayName), ...LANDMARK_ZONES];
}
