"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createGame } from "./game";

export default function PhaserGame() {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    const game = createGame(parent, {
      onNavigate: (route) => {
        router.push(route);
      },
    });

    return () => {
      game.destroy(true);
    };
  }, [router]);

  return <div ref={parentRef} className="phaser-root" />;
}
