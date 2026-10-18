"use client";

import { useEffect, useRef, useState } from "react";
import LoadingScreen from "@/components/pixel/LoadingScreen";
import { useRouter } from "next/navigation";
import { composeFlat } from "@/lib/avatar/compose";
import { rememberAvatar } from "@/lib/avatar/store";
import { DEFAULT_AVATAR, type Avatar } from "@/lib/avatar/types";
import { createGame } from "./game";
import HavenOverlay, { GAME_W, type CanvasBox } from "./HavenOverlay";
import type { PadLabel, PromptInfo } from "./scenes/MainScene";

type PhaserGameProps = {
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
  avatar?: Avatar | null;
};

export default function PhaserGame({
  isLoggedIn = false,
  needsProfile = false,
  displayName = null,
  avatar = null,
}: PhaserGameProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [labels, setLabels] = useState<PadLabel[]>([]);
  const [prompt, setPrompt] = useState<PromptInfo | null>(null);
  const [box, setBox] = useState<CanvasBox>({ left: 0, top: 0, scale: 1 });

  // Keep the overlay aligned with the (letterboxed, scaled) canvas.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const canvas = wrap.querySelector("canvas");
      if (!canvas) return;
      const w = wrap.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      setBox({ left: c.left - w.left, top: c.top - w.top, scale: c.width / GAME_W });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    const poll = window.setInterval(measure, 500); // canvas is created asynchronously and can be resized by Phaser
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.clearInterval(poll);
    };
  }, []);

  const avatarJson = JSON.stringify(avatar ?? DEFAULT_AVATAR);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    let cancelled = false;
    let game: ReturnType<typeof createGame> | null = null;

    (async () => {
      // Compose the player's character (idle + two walk frames) before the scene starts.
      let avatarFrames: Record<string, HTMLCanvasElement> | undefined;
      try {
        const a = JSON.parse(avatarJson) as Avatar;
        // 3 body poses x 3 looks (ahead / left / right), keyed "body|look".
        const bodies = ["idle", "walk_l", "walk_r"] as const;
        const looks = ["open", "left", "right"] as const;
        const entries = await Promise.all(
          bodies.flatMap((body) =>
            looks.map(async (look) => [`${body}|${look}`, await composeFlat(a, { body, eyes: look })] as const),
          ),
        );
        avatarFrames = Object.fromEntries(entries);
      } catch (err) {
        console.warn("Avatar failed to compose; using the placeholder player", err);
      }
      // Wait for the pixel font so Phaser text measures correctly.
      try {
        await document.fonts?.ready;
      } catch {}
      if (cancelled) return;

      game = createGame(parent, {
        isLoggedIn,
        needsProfile,
        displayName,
        avatarFrames,
        onZones: (l) => setLabels(l),
        onPrompt: (pr) => setPrompt(pr),
        onReady: () => {
          if (!cancelled) setReady(true);
        },
        onNavigate: (route) => {
          if (route === "/auth/logout" || route.startsWith("/auth/logout?")) {
            // Forget this user's avatar so the next sign-in doesn't flash it on loading screens.
            rememberAvatar(null);
            // Auth0 requires an absolute post_logout_redirect_uri.
            const returnTo = `${window.location.origin}/pages/login`;
            window.location.href = `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          if (route.startsWith("/auth/")) {
            window.location.href = route;
            return;
          }
          router.push(route);
        },
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [router, isLoggedIn, needsProfile, displayName, avatarJson]);

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100dvh" }}>
        <div ref={parentRef} className="phaser-root" />
        <HavenOverlay labels={labels} prompt={prompt} box={box} />
      </div>
      {ready ? null : <LoadingScreen scene="haven" />}
    </>
  );
}
