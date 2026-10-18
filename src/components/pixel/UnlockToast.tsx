"use client";

import { useEffect, useState } from "react";
import Toast from "./Toast";

function nice(key: string): string {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Toast for newly unlocked decorations. Shows each new `keys` array until dismissed or 5 s. */
export default function UnlockToast({ keys }: { keys?: string[] }) {
  const [dismissed, setDismissed] = useState<string[] | undefined>();

  useEffect(() => {
    if (!keys?.length) return;
    const t = setTimeout(() => setDismissed(keys), 5000);
    return () => clearTimeout(t);
  }, [keys]);

  if (!keys?.length || dismissed === keys) return null;
  return (
    <Toast onClose={() => setDismissed(keys)}>
      Unlocked: {keys.map(nice).join(", ")}! Place it from your shelf in Decorate mode.
    </Toast>
  );
}
