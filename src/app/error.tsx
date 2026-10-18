"use client";

import { useEffect } from "react";
import PixelErrorScreen from "@/components/pixel/PixelErrorScreen";

/** Catches errors thrown while rendering any route below the root layout. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <PixelErrorScreen onRetry={reset} digest={error.digest} />;
}
