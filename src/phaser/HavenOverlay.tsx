"use client";

import type { CSSProperties } from "react";
import { ICONS, type IconName } from "@/lib/sprites";
import type { PadLabel, PromptInfo } from "./scenes/MainScene";
import styles from "./HavenOverlay.module.css";

/** Game-space size (matches game.ts). */
const GAME_W = 800;

export type CanvasBox = { left: number; top: number; scale: number };

function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

/**
 * Pad names, the controls hint and the zone prompt, drawn as real DOM text over the canvas.
 * Phaser text is rasterized at game size and then scaled with the canvas, which blurs it; DOM text
 * is rendered at the screen's own resolution, so it stays sharp.
 */
export default function HavenOverlay({
  labels,
  prompt,
  box,
  fading = false,
  visible = true,
}: {
  labels: PadLabel[];
  prompt: PromptInfo | null;
  box: CanvasBox;
  fading?: boolean;
  visible?: boolean;
}) {
  // Text grows with the canvas but never gets smaller than 14px.
  const font = Math.max(14, Math.round(14 * box.scale * 1.15));
  const iconPx = (px: number) => px * Math.max(1, Math.round(box.scale));
  const isHidden = fading || !visible;

  return (
    <div
      className={`${styles.overlay} ${isHidden ? styles.fadingOut : ""}`}
      style={{ fontSize: font }}
      aria-hidden={isHidden}
    >
      <div className={styles.hint} style={{ top: box.top + 6 }}>
        Use WASD or Arrows • Library for logs • Auth Desk to log out
      </div>

      {labels.map((l) => {
        const icon = l.icon && l.icon in ICONS ? ICONS[l.icon as IconName] : null;
        const active = prompt?.id === l.id;
        const style = {
          left: box.left + l.cx * box.scale,
          top: box.top + (l.cy + 10) * box.scale,
          ["--pad" as string]: hex(l.color),
        } as CSSProperties;
        return (
          <div key={l.id} className={`${styles.label} ${active ? styles.active : ""}`} style={style}>
            <div className={styles.plate}>
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" width={iconPx(16)} height={iconPx(16)} draggable={false} />
              ) : null}
              {l.name}
            </div>
          </div>
        );
      })}

      {prompt ? (
        <div className={styles.bottom} role="status" style={{ bottom: `calc(2% + ${Math.max(0, box.top)}px)` }}>
          {prompt.icon && prompt.icon in ICONS ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ICONS[prompt.icon as IconName]} alt="" width={iconPx(16)} height={iconPx(16)} draggable={false} />
          ) : null}
          {prompt.text}
        </div>
      ) : null}
    </div>
  );
}

export { GAME_W };
