"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/phaser/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="haven-loading" role="status">
      Opening Storyhaven…
    </div>
  ),
});

export type HavenAuth = {
  isLoggedIn: boolean;
  displayName: string | null;
  needsProfile: boolean;
};

/** Home mounts Phaser only. Auth Desk handles logout / finish profile in-world. */
export default function HavenHome({ auth }: { auth: HavenAuth }) {
  return (
    <PhaserGame
      isLoggedIn={auth.isLoggedIn}
      needsProfile={auth.needsProfile}
      displayName={auth.displayName}
    />
  );
}
