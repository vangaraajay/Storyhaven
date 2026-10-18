"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { DECOR, type DecorKey } from "@/lib/sprites";
import PixelButton from "./PixelButton";
import PixelFrame from "./PixelFrame";
import styles from "./UnlockChest.module.css";

/** Chest sequence timings (ms from start). Tune here. */
export const CHEST_TIMINGS = { opening: 700, open: 1100, item: 1400 } as const;

type Stage = "closed" | "opening" | "open" | "item";

const CHEST_FRAMES: Record<Exclude<Stage, "item">, string> = {
  closed: "/chest.png",
  opening: "/chest_opening.png",
  open: "/chest_open.png",
};

function nice(key: string): string {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function motionFull(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "full";
}

/** One chest reveal. Mount with key={itemKey} so each item starts fresh. */
function Reveal({ itemKey, index, total, onNext, onClose, onPlace }: {
  itemKey: string;
  index: number;
  total: number;
  onNext: () => void;
  onClose: () => void;
  onPlace: () => void;
}) {
  // Reduced motion: jump straight to the final frame.
  const [stage, setStage] = useState<Stage>(() => (motionFull() ? "closed" : "item"));
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (stage === "item" && !motionFull()) return;
    const timers = [
      setTimeout(() => setStage("opening"), CHEST_TIMINGS.opening),
      setTimeout(() => setStage("open"), CHEST_TIMINGS.open),
      setTimeout(() => setStage("item"), CHEST_TIMINGS.item),
    ];
    return () => timers.forEach(clearTimeout);
    // The sequence runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus: move into the dialog, restore on unmount.
  useEffect(() => {
    opener.current = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const art = DECOR[itemKey as DecorKey];
  const revealed = stage === "item";
  const frame = stage === "item" ? CHEST_FRAMES.open : CHEST_FRAMES[stage];

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <PixelFrame
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`You unlocked ${nice(itemKey)}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div ref={dialogRef} style={{ display: "contents" }}>
          <strong>{revealed ? `Unlocked: ${nice(itemKey)}!` : "A chest appears…"}</strong>
          <div className={styles.stage} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frame} alt="" className={`px-art ${styles.chest} ${stage === "closed" ? "px-mo-shake" : ""}`} draggable={false} />
            {revealed && art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt="" className={`px-art ${styles.item} ${styles.itemShown}`} draggable={false} />
            ) : null}
          </div>
          {total > 1 ? <span className={styles.count}>{index + 1} of {total}</span> : null}
          <div className={styles.buttons}>
            <PixelButton onClick={onPlace}>Place it</PixelButton>
            <PixelButton onClick={index + 1 < total ? onNext : onClose}>
              {index + 1 < total ? "Next" : "Close"}
            </PixelButton>
          </div>
        </div>
      </PixelFrame>
    </div>
  );
}

export type UnlockChestProps = {
  /** Newly unlocked decoration keys; a new array starts a new queue. */
  keys?: string[];
  onDone?: () => void;
};

/** Queue of unlock reveals: chest animation in a modal, one key at a time. */
export default function UnlockChest({ keys, onDone }: UnlockChestProps) {
  const router = useRouter();
  const [seen, setSeen] = useState(keys);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);

  // A new keys array resets the queue (state adjusted during render, per React docs).
  if (seen !== keys) {
    setSeen(keys);
    setIndex(0);
    setClosed(false);
  }

  if (!keys?.length || closed || index >= keys.length) return null;
  const key = keys[index];

  const close = () => {
    setClosed(true);
    onDone?.();
  };

  return (
    <Reveal
      key={key}
      itemKey={key}
      index={index}
      total={keys.length}
      onNext={() => setIndex((i) => i + 1)}
      onClose={close}
      onPlace={() => {
        close();
        router.push(`/pages/library?decorate=1&item=${encodeURIComponent(key)}`);
      }}
    />
  );
}
