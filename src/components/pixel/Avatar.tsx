"use client";

import { useEffect, useRef, useState } from "react";
import { AVATAR_SIZE, LAYER_ORDER, composeAvatar } from "@/lib/avatar/compose";
import { DEFAULT_AVATAR, type Avatar as AvatarData, type BodyFrame } from "@/lib/avatar/types";

/** Head crop inside the 32x32 art (hair spans x 5-26, y 1-19). */
const HEAD = { x: 4, y: 0, w: 24, h: 21 } as const;

export type AvatarProps = {
  /** Null/undefined renders the default character. */
  avatar?: AvatarData | null;
  scale?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  crop?: "full" | "head";
  /** Blink every 3-5 s. Only runs when an ancestor has data-motion="full". */
  blink?: boolean;
  body?: BodyFrame;
  /** Accessible name; omit for decorative use. */
  label?: string;
  className?: string;
};

function motionAllowed(el: HTMLElement | null): boolean {
  return el?.closest("[data-motion]")?.getAttribute("data-motion") === "full";
}

/** Layered pixel character drawn into one canvas (body, eyes, mouth, top, hair, accessory). */
export default function Avatar({
  avatar,
  scale = 2,
  crop = "full",
  blink = false,
  body = "idle",
  label,
  className,
}: AvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [eyes, setEyes] = useState<"open" | "blink">("open");
  const data = avatar ?? DEFAULT_AVATAR;
  const json = JSON.stringify(data);

  const src = crop === "head" ? HEAD : { x: 0, y: 0, w: AVATAR_SIZE, h: AVATAR_SIZE };

  // Blink timer.
  useEffect(() => {
    if (!blink || !motionAllowed(canvasRef.current)) return;
    let wait: ReturnType<typeof setTimeout>;
    let close: ReturnType<typeof setTimeout>;
    const schedule = () => {
      wait = setTimeout(() => {
        setEyes("blink");
        close = setTimeout(() => {
          setEyes("open");
          schedule();
        }, 140);
      }, 3000 + Math.random() * 2000);
    };
    schedule();
    return () => {
      clearTimeout(wait);
      clearTimeout(close);
      setEyes("open");
    };
  }, [blink]);

  // Draw.
  useEffect(() => {
    let cancelled = false;
    composeAvatar(JSON.parse(json) as AvatarData, { body, eyes })
      .then((layers) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (cancelled || !canvas || !ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const name of LAYER_ORDER) {
          const layer = layers[name];
          if (layer) ctx.drawImage(layer, src.x, src.y, src.w, src.h, 0, 0, src.w, src.h);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [json, body, eyes, src.x, src.y, src.w, src.h]);

  return (
    <canvas
      ref={canvasRef}
      width={src.w}
      height={src.h}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className ? `px-art ${className}` : "px-art"}
      style={{ width: src.w * scale, height: src.h * scale, imageRendering: "pixelated" }}
    />
  );
}
