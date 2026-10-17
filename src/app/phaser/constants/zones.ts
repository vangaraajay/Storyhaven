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

export const LANDMARK_ZONES: LandmarkZone[] = [
  {
    id: "bookshelf",
    name: "Library Bookshelf",
    sensorRect: {
      x: 100,
      y: 70,
      width: 600,
      height: 50,
    },
    route: "/pages", // Temporary: /pages is currently implemented in repo
    prompt: "📖 Bookshelf — Browse Books",
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
    route: "/pages/daily-story", // Temporary
    prompt: "📜 Daily Story — Read Today's Tale",
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
    route: "/pages/forums", // Temporary
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
    route: "/pages/friends", // Temporary
    prompt: "👥 Friends — Match & Connect",
    color: 0x31748f,
  },
];
