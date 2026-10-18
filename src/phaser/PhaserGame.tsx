"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { composeFlat } from "@/lib/avatar/compose";
import { DEFAULT_AVATAR, type Avatar } from "@/lib/avatar/types";
import { createGame } from "./game";

type PhaserGameProps = {
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
  avatar?: Avatar | null;
};

export default function PhaserGame({
  isLoggedIn = false,
  needsProfile = false,
  displayName = null,
  avatar = null,
}: PhaserGameProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  const avatarJson = JSON.stringify(avatar ?? DEFAULT_AVATAR);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    let cancelled = false;
    let game: ReturnType<typeof createGame> | null = null;

    (async () => {
      // Compose the player's character (idle + two walk frames) before the scene starts.
      let avatarFrames: { idle: HTMLCanvasElement; walk_l: HTMLCanvasElement; walk_r: HTMLCanvasElement } | undefined;
      try {
        const a = JSON.parse(avatarJson) as Avatar;
        const [idle, walk_l, walk_r] = await Promise.all([
          composeFlat(a, { body: "idle" }),
          composeFlat(a, { body: "walk_l" }),
          composeFlat(a, { body: "walk_r" }),
        ]);
        avatarFrames = { idle, walk_l, walk_r };
      } catch (err) {
        console.warn("Avatar failed to compose; using the placeholder player", err);
      }
      if (cancelled) return;

      game = createGame(parent, {
        isLoggedIn,
        needsProfile,
        displayName,
        avatarFrames,
        onNavigate: (route) => {
          if (route === "/auth/logout" || route.startsWith("/auth/logout?")) {
            // Auth0 requires an absolute post_logout_redirect_uri.
            const returnTo = `${window.location.origin}/pages/login`;
            window.location.href = `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          if (route.startsWith("/auth/")) {
            window.location.href = route;
            return;
          }
          router.push(route);
        },
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [router, isLoggedIn, needsProfile, displayName, avatarJson]);

  return <div ref={parentRef} className="phaser-root" />;
}
