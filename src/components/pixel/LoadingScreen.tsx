"use client";

import { useEffect, useState } from "react";
import { ICONS, type IconName } from "@/lib/sprites";
import { useRememberedAvatar } from "@/lib/avatar/store";
import Avatar from "./Avatar";
import PixelFrame from "./PixelFrame";
import TypingDots from "./TypingDots";
import styles from "./LoadingScreen.module.css";

/** Which page the user is heading to; picks the message, icon and the prop standing on the floor. */
export type LoadingScene = "haven" | "library" | "forum" | "friends" | "story" | "create" | "login";

type Prop = { frames: string[]; w: number; h: number; scale: number; right: string };

const SCENES: Record<LoadingScene, { title: string; message: string; icon: IconName; prop?: Prop }> = {
  haven: { title: "Storyhaven", message: "Entering the haven", icon: "door", prop: { frames: ["/counter.png"], w: 48, h: 32, scale: 3, right: "10%" } },
  library: { title: "The Library", message: "Dusting off the shelves", icon: "book", prop: { frames: ["/bookshelf.png", "/bookshelf_alt1.png", "/bookshelf_alt2.png"], w: 48, h: 64, scale: 3, right: "10%" } },
  forum: { title: "The Forum", message: "Pinning up new posts", icon: "chat", prop: { frames: ["/board.png"], w: 48, h: 40, scale: 3, right: "10%" } },
  friends: { title: "Friends Lounge", message: "Stoking the fire", icon: "match", prop: { frames: ["/fireplace1.png", "/fireplace2.png", "/fireplace3.png"], w: 48, h: 48, scale: 3, right: "10%" } },
  story: { title: "Daily Story", message: "Turning to today's page", icon: "scroll", prop: { frames: ["/podium.png", "/podium.png", "/podium.png", "/podium.png", "/podiumup.png", "/podiumupper.png"], w: 32, h: 48, scale: 3, right: "10%" } },
  create: { title: "Character Creator", message: "Finding your outfit", icon: "user" },
  login: { title: "Storyhaven", message: "Opening the door", icon: "door" },
};

export type LoadingScreenProps = {
  /** Page being loaded; picks the scene. */
  scene?: LoadingScene;
  /** Overrides the scene's message. */
  message?: string;
  /** Cover the whole viewport (default) or sit inline inside a page. */
  variant?: "full" | "inline";
};

/**
 * Pixel loading screen shown between pages: a framed card with a stepping progress bar,
 * and a character who walks across a floor strip. Motion only when html[data-motion="full"].
 */
export default function LoadingScreen({ scene = "haven", message, variant = "full" }: LoadingScreenProps) {
  const avatar = useRememberedAvatar();
  const preset = SCENES[scene];
  const text = message ?? preset.message;
  // Alternate the two walk frames while the character crosses the floor.
  const [tick, setTick] = useState(0);
  const step = tick % 2 === 1;
  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") return;
    const t = setInterval(() => setTick((n) => n + 1), 160);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={`${styles.screen} ${variant === "full" ? styles.full : styles.inline}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className={styles.stage}>
        <PixelFrame className={styles.card}>
          <h1 className={styles.title}>{preset.title}</h1>
          <span className={styles.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICONS[preset.icon]} alt="" width={32} height={32} className="px-art" draggable={false} />
            {text}
            <TypingDots label="" />
          </span>
          <div className={styles.bar} aria-hidden>
            <div className={styles.fill} />
          </div>
        </PixelFrame>
      </div>
      <div className={styles.floor} aria-hidden>
        {preset.prop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preset.prop.frames[tick % preset.prop.frames.length]}
            alt=""
            className={`px-art ${styles.prop}`}
            style={{ width: preset.prop.w * preset.prop.scale, height: preset.prop.h * preset.prop.scale, right: preset.prop.right }}
            draggable={false}
          />
        ) : null}
        <div className={styles.walker}>
          <Avatar avatar={avatar} scale={4} body={step ? "walk_l" : "walk_r"} look="right" />
        </div>
      </div>
    </div>
  );
}
