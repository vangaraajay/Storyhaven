"use client";

import { useEffect } from "react";

const TRACK = "/audio/music_pond_day.ogg";
const VOLUME = 0.35;

/** Survives client navigations; only one instance for the whole app. */
let shared: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement {
  if (!shared) {
    shared = new Audio(TRACK);
    shared.loop = true;
    shared.preload = "auto";
    shared.volume = VOLUME;
  }
  return shared;
}

async function tryPlay() {
  const audio = getAudio();
  try {
    await audio.play();
    unlocked = true;
  } catch {
    // Autoplay blocked until a user gesture.
  }
}

/**
 * Sitewide looping music. Mount once from the root layout.
 * Starts on first pointer/key interaction if the browser blocks autoplay.
 */
export default function BackgroundMusic() {
  useEffect(() => {
    void tryPlay();

    if (unlocked) return;

    const unlock = () => {
      void tryPlay().then(() => {
        if (unlocked) {
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        }
      });
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      // Do not pause/destroy — music should keep playing across routes.
    };
  }, []);

  return null;
}
