"use client";

import { useEffect } from "react";
import PixelErrorScreen from "@/components/pixel/PixelErrorScreen";

/** Route-level boundary: a failure here keeps the rest of the app (and layout) intact. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PixelErrorScreen
      inline
      title="Couldn't load the forum"
      message="Something went wrong loading this page. Try again in a moment."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
