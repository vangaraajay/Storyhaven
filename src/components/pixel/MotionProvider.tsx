"use client";

import { useEffect } from "react";

/**
 * Sets html[data-motion] to "full" or "reduced" from prefers-reduced-motion and keeps it
 * in sync. All UI motion CSS and the avatar blink are gated on html[data-motion="full"].
 */
export default function MotionProvider() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      document.documentElement.dataset.motion = query.matches ? "reduced" : "full";
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return null;
}
