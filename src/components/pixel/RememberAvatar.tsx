"use client";

import { useEffect } from "react";
import { rememberAvatar } from "@/lib/avatar/store";
import type { Avatar } from "@/lib/avatar/types";

/** Renders nothing; stores the user's avatar so loading screens can show their character. */
export default function RememberAvatar({ avatar }: { avatar: Avatar | null | undefined }) {
  const json = JSON.stringify(avatar ?? null);
  useEffect(() => {
    rememberAvatar(JSON.parse(json) as Avatar | null);
  }, [json]);
  return null;
}
