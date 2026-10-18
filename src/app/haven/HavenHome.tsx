"use client";

import dynamic from "next/dynamic";
import type { Avatar } from "@/lib/avatar/types";
import LoadingScreen from "@/components/pixel/LoadingScreen";
import RememberAvatar from "@/components/pixel/RememberAvatar";

const PhaserGame = dynamic(() => import("@/phaser/PhaserGame"), {
  ssr: false,
  loading: () => <LoadingScreen scene="haven" />,
});

export type HavenAuth = {
  isLoggedIn: boolean;
  displayName: string | null;
  needsProfile: boolean;
  avatar: Avatar | null;
};

/** Home mounts Phaser only. Auth Desk handles logout / finish profile in-world. */
export default function HavenHome({ auth }: { auth: HavenAuth }) {
  return (
    <>
    <RememberAvatar avatar={auth.avatar} />
    <PhaserGame
      isLoggedIn={auth.isLoggedIn}
      needsProfile={auth.needsProfile}
      displayName={auth.displayName}
      avatar={auth.avatar}
    />
    </>
  );
}
