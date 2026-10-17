"use client";

import { useEffect, useRef } from "react";
import { createGame } from "./game";

export default function PhaserGame() {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    const game = createGame(parent);
    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={parentRef} className="phaser-root" />;
}
