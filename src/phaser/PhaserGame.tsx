"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "./game";

type PhaserGameProps = {
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
};

export default function PhaserGame({
  isLoggedIn = false,
  needsProfile = false,
  displayName = null,
}: PhaserGameProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    const game = createGame(parent, {
      isLoggedIn,
      needsProfile,
      displayName,
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

    return () => {
      game.destroy(true);
    };
  }, [router, isLoggedIn, needsProfile, displayName]);

  return <div ref={parentRef} className="phaser-root" />;
}
