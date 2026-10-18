"use client";

import UnlockChest from "./UnlockChest";

/** Shows the chest reveal for newly unlocked decorations (kept under this name for existing call sites). */
export default function UnlockToast({ keys }: { keys?: string[] }) {
  return <UnlockChest keys={keys} />;
}
