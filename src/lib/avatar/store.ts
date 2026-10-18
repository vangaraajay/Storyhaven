"use client";

import { useSyncExternalStore } from "react";
import { parseAvatar, type Avatar } from "./types";

const KEY = "storyhaven_avatar";
const EVENT = "storyhaven-avatar-changed";

/** Remember the signed-in user's avatar in this browser so loading screens can show it. */
export function rememberAvatar(avatar: Avatar | null): void {
  try {
    if (avatar) localStorage.setItem(KEY, JSON.stringify(avatar));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage unavailable (private mode, blocked): loading screens just use the default avatar
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

// useSyncExternalStore needs a stable snapshot, so compare the raw string and cache the parse.
let cachedRaw: string | null = null;
let cachedAvatar: Avatar | null = null;

function getSnapshot(): Avatar | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedAvatar = raw ? parseAvatar(raw) : null;
  }
  return cachedAvatar;
}

/** The remembered avatar (null on the server, before first sign-in, or if storage is unavailable). */
export function useRememberedAvatar(): Avatar | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
