"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [labels, setLabels] = useState<PadLabel[]>([]);
  const [prompt, setPrompt] = useState<PromptInfo | null>(null);
  const [box, setBox] = useState<CanvasBox>({ left: 0, top: 0, scale: 1 });
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetFade = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    setIsFadingOut(false);
  }, []);

  const startFadeOut = useCallback(() => {
    setIsFadingOut(true);
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    // Safety auto-reset: ensures labels are never permanently hidden if navigation
    // is delayed, cancelled, or user returns via browser cache
    fadeTimeoutRef.current = setTimeout(() => {
      setIsFadingOut(false);
    }, 1500);
  }, []);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const canvas = wrap.querySelector("canvas");
    if (!canvas) return;
    const w = wrap.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    if (c.width <= 0) return;
    const left = Math.round(c.left - w.left);
    const top = Math.round(c.top - w.top);
    const scale = c.width / GAME_W;
    if (scale <= 0) return;

    setBox((prev) => {
      if (
        Math.abs(prev.left - left) < 0.5 &&
        Math.abs(prev.top - top) < 0.5 &&
        Math.abs(prev.scale - scale) < 0.002
      ) {
        return prev;
      }
      return { left, top, scale };
    });
  }, []);

  // Reset fade and re-measure if page is restored from bfcache
  useEffect(() => {
    const handlePageShow = () => {
      resetFade();
      measure();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [resetFade, measure]);

  // Keep the overlay aligned with the (letterboxed, scaled) canvas.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);

    const checkCanvas = () => {
      const canvas = wrap.querySelector("canvas");
      if (canvas) {
        ro.observe(canvas);
        measure();
      }
    };
    checkCanvas();

    window.addEventListener("resize", measure);
    const poll = window.setInterval(checkCanvas, 200);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.clearInterval(poll);
    };
  }, [measure]);

  const avatarJson = JSON.stringify(avatar ?? DEFAULT_AVATAR);

  // Failsafe: Ensure the loading screen is never stuck indefinitely.
  // If Phaser asset preloading or font loading takes more than 3 seconds,
  // dismiss the loading screen automatically.
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      measure();
      resetFade();
      setReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [ready, measure, resetFade]);

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

      // Wait for the pixel font so Phaser text measures correctly, capped at 400ms
      // so pending or lazy webfonts never stall haven entry.
      try {
        await Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((resolve) => setTimeout(resolve, 400)),
        ]);
      } catch {}
      if (cancelled) return;

      game = createGame(parent, {
        isLoggedIn,
        needsProfile,
        displayName,
        avatarFrames,
        onZones: (l) => {
          setLabels(l);
          measure();
        },
        onPrompt: (pr) => setPrompt(pr),
        onFadeOut: () => {
          startFadeOut();
        },
        onResize: () => {
          measure();
        },
        onReady: () => {
          if (!cancelled) {
            measure();
            resetFade();
            setReady(true);
          }
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
      resetFade();
      game?.destroy(true);
    };
  }, [router, isLoggedIn, needsProfile, displayName, avatarJson, measure, startFadeOut, resetFade]);

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100dvh" }}>
        <div ref={parentRef} className="phaser-root" />
        {ready && (
          <HavenOverlay
            labels={labels}
            prompt={prompt}
            box={box}
            fading={isFadingOut}
          />
        )}
      </div>
      {ready ? null : <LoadingScreen scene="haven" />}
    </>
  );
}
