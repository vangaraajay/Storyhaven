"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Avatar from "@/components/pixel/Avatar";
import type { Avatar as AvatarData } from "@/lib/avatar/types";
import PixelButton from "@/components/pixel/PixelButton";
import PixelFrame from "@/components/pixel/PixelFrame";
import { PixelSwatchRow } from "@/components/pixel/PixelRadioGrid";
import Toast from "@/components/pixel/Toast";
import { placeDecorAction, setThemeAction } from "@/app/pages/library/shelf-actions";
import { DECOR, SHELF_ART, type DecorKey } from "@/lib/sprites";
import { SHELF_THEMES, SLOTS_PER_ROW, isDecorSlot, type ShelfTheme } from "@/lib/shelf";
import { THEME_PALETTES, recoloredUrl } from "./themes";
import styles from "./Bookcase.module.css";

export type MediaItem = {
  id: string;
  kind: "book" | "movie" | "album";
  name: string;
  cover_url: string | null;
};

export type BookcaseProps = {
  theme: ShelfTheme;
  items: MediaItem[];
  /** slot -> decoration key */
  placed: Record<number, string>;
  /** decoration keys the user may place */
  unlocked: string[];
  /** Minimum number of shelf rows to show. */
  minRows?: number;
  /** Sits on the top plank. */
  avatar?: AvatarData | null;
  avatarLabel?: string;
};

/** Pixel scale by viewport width; the shelf then adds columns to span the full width. */
function scaleFor(width: number): number {
  return width < 640 ? 2 : width < 1800 ? 3 : 4;
}

/** Stable fallback color from the title, for covers that can't be sampled. */
function hashColor(text: string, theme: ShelfTheme): string {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const pal = [...THEME_PALETTES[theme], "#6fa9b5", "#c24e70", "#68995a", "#9c7cc8"];
  return pal[Math.abs(h) % pal.length];
}

/** Average color of the cover image (needs CORS); falls back to a title hash. */
function useCoverColor(url: string | null, name: string, theme: ShelfTheme): string {
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 8;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 8) continue;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        if (alive && n) setColor(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch {
        // tainted canvas: keep the fallback color
      }
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return color ?? hashColor(name, theme);
}

function Media({ item, theme }: { item: MediaItem; theme: ShelfTheme }) {
  const color = useCoverColor(item.cover_url, item.name, theme);
  const label = `${item.kind}: ${item.name}`;
  return (
    <span
      className={`${styles.media} ${styles[item.kind]}`}
      style={{ background: color }}
      title={item.name}
      role="img"
      aria-label={label}
    />
  );
}

type Position =
  | { slot: number; type: "item"; item: MediaItem }
  | { slot: number; type: "decor" }
  | { slot: number; type: "empty" };

/** Lay media into positions; every SLOTS_PER_ROW-th position (6th, 12th, ...) is a decor slot. */
function layout(items: MediaItem[], minRows: number, cols: number): Position[] {
  const out: Position[] = [];
  let next = 0;
  let slot = 0;
  while (next < items.length || out.length < minRows * cols || out.length % cols !== 0) {
    if (isDecorSlot(slot)) out.push({ slot, type: "decor" });
    else if (next < items.length) out.push({ slot, type: "item", item: items[next++] });
    else out.push({ slot, type: "empty" });
    slot++;
  }
  return out;
}

export default function Bookcase({ theme: initialTheme, items, placed: initialPlaced, unlocked, minRows = 3, avatar, avatarLabel }: BookcaseProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Integer pixel scale that fills the available width (2x to 6x).
  const [S, setS] = useState(2);
  const [cols, setCols] = useState(SLOTS_PER_ROW);
  const [theme, setTheme] = useState(initialTheme);
  const [placed, setPlaced] = useState(initialPlaced);
  const [decorating, setDecorating] = useState(false);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [art, setArt] = useState<{ capL?: string; capR?: string; post?: string; back?: string; plank?: string }>({});

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const fit = () => {
      const scale = scaleFor(el.clientWidth);
      const post = SHELF_ART.post.w * scale;
      // Fill the width: as many 32px-source slots as fit between the two posts.
      setS(scale);
      setCols(Math.max(SLOTS_PER_ROW, Math.floor((el.clientWidth - 2 * post) / (32 * scale))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Precompute the themed art (recolored data URLs, cached per theme).
  useEffect(() => {
    let alive = true;
    Promise.all([
      recoloredUrl(SHELF_ART.capL.src, theme),
      recoloredUrl(SHELF_ART.capR.src, theme),
      recoloredUrl(SHELF_ART.post.src, theme),
      recoloredUrl(SHELF_ART.back.src, theme),
    ])
      .then(([capL, capR, post, back]) => alive && setArt((a) => ({ ...a, capL, capR, post, back })))
      .catch(() => alive && setArt({}));
    // Plank is optional art: a missing file keeps the CSS strip.
    recoloredUrl(SHELF_ART.plank.src, theme)
      .then((plank) => alive && setArt((a) => ({ ...a, plank })))
      .catch(() => alive && setArt((a) => ({ ...a, plank: undefined })));
    return () => {
      alive = false;
    };
  }, [theme]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(t);
  }, [message]);

  const positions = useMemo(() => layout(items, minRows, cols), [items, minRows, cols]);
  const rows: Position[][] = [];
  for (let i = 0; i < positions.length; i += cols) rows.push(positions.slice(i, i + cols));

  const rootStyle = {
    "--u": `${S}px`,
    "--slot": `${32 * S}px`,
    "--cols": cols,
    "--post-w": `${SHELF_ART.post.w * S}px`,
    "--post-h": `${SHELF_ART.post.h * S}px`,
    "--cap-w": `${SHELF_ART.capL.w * S}px`,
    "--cap-h": `${SHELF_ART.capL.h * S}px`,
  } as CSSProperties;

  const availableDecor = (Object.keys(DECOR) as DecorKey[]).filter((k) => unlocked.includes(k));

  async function place(slot: number, key: string | null) {
    const prev = placed;
    setPlaced((p) => {
      const n = { ...p };
      if (key) n[slot] = key;
      else delete n[slot];
      return n;
    });
    setPickSlot(null);
    const res = await placeDecorAction(slot, key);
    if (res.error) {
      setPlaced(prev);
      setMessage({ text: res.error, error: true });
    }
  }

  async function chooseTheme(next: string) {
    const prev = theme;
    setTheme(next as ShelfTheme);
    const res = await setThemeAction(next);
    if (res.error) {
      setTheme(prev);
      setMessage({ text: res.error, error: true });
    }
  }

  return (
    <div ref={hostRef} data-motion="full" className={`${styles.root} ${styles[`theme_${theme}`]} ${decorating ? styles.decorate : ""}`} style={rootStyle}>
      <div className={styles.toolbar}>
        <PixelButton pressed={decorating} aria-pressed={decorating} onClick={() => setDecorating((d) => !d)}>
          {decorating ? "Done decorating" : "Decorate"}
        </PixelButton>
        {decorating ? (
          <PixelSwatchRow
            label="Shelf theme"
            items={SHELF_THEMES.map((t) => ({ id: t, name: t, palette: THEME_PALETTES[t] }))}
            value={theme}
            onChange={chooseTheme}
          />
        ) : null}
      </div>

      <div className={styles.case} role="list" aria-label="Your shelf">
        {avatar !== undefined ? (
          <div className={styles.row} role="listitem">
            <div className={styles.shelf}>
              <span className={styles.post} style={art.post ? { backgroundImage: `url(${art.post})` } : undefined} aria-hidden />
              <div className={styles.slots} style={art.back ? { backgroundImage: `url(${art.back})` } : undefined}>
                {/* The avatar sits on this row's plank, third slot from the left. */}
                <span className={styles.slot} style={{ gridColumn: 3 }}>
                  <Avatar avatar={avatar} scale={S as 2} blink label={avatarLabel ?? "Your character"} />
                </span>
              </div>
              <span className={styles.post} style={art.post ? { backgroundImage: `url(${art.post})`, transform: "scaleX(-1)" } : undefined} aria-hidden />
            </div>
            <div className={styles.planks} aria-hidden>
              <span className={styles.cap} style={art.capL ? { backgroundImage: `url(${art.capL})` } : undefined} />
              <span className={`${styles.plank} ${art.plank ? styles.plankArt : ""}`} style={art.plank ? { backgroundImage: `url(${art.plank})` } : undefined} />
              <span className={styles.cap} style={art.capR ? { backgroundImage: `url(${art.capR})` } : undefined} />
            </div>
          </div>
        ) : null}
        {rows.map((row, r) => (
          <div key={r} className={styles.row} role="listitem">
            <div className={styles.shelf}>
              <span className={styles.post} style={art.post ? { backgroundImage: `url(${art.post})` } : undefined} aria-hidden />
              <div className={styles.slots} style={art.back ? { backgroundImage: `url(${art.back})` } : undefined}>
                {row.map((pos) => {
                  if (pos.type === "item") {
                    return (
                      <span key={pos.slot} className={styles.slot}>
                        <Media item={pos.item} theme={theme} />
                      </span>
                    );
                  }
                  if (pos.type === "empty") return <span key={pos.slot} className={styles.slot} />;
                  const key = placed[pos.slot] as DecorKey | undefined;
                  const img = key && DECOR[key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={DECOR[key]} alt="" className={`px-art ${styles.decorImg}`} draggable={false} />
                  ) : null;
                  if (!decorating) {
                    return (
                      <span key={pos.slot} className={styles.slot} aria-label={key ? `Decoration: ${key.replace(/_/g, " ")}` : undefined}>
                        {img}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={pos.slot}
                      type="button"
                      className={`${styles.slot} ${styles.decorSlot}`}
                      aria-label={key ? `Change decoration (${key.replace(/_/g, " ")})` : "Add a decoration"}
                      onClick={() => setPickSlot(pos.slot)}
                    >
                      {img ?? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={SHELF_ART.slot.src} alt="" className={`px-art ${styles.decorImg}`} draggable={false} />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className={styles.post} style={art.post ? { backgroundImage: `url(${art.post})`, transform: "scaleX(-1)" } : undefined} aria-hidden />
            </div>
            <div className={styles.planks} aria-hidden>
              <span className={styles.cap} style={art.capL ? { backgroundImage: `url(${art.capL})` } : undefined} />
              <span className={`${styles.plank} ${art.plank ? styles.plankArt : ""}`} style={art.plank ? { backgroundImage: `url(${art.plank})` } : undefined} />
              <span className={styles.cap} style={art.capR ? { backgroundImage: `url(${art.capR})` } : undefined} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.floor} style={{ backgroundImage: `url(${SHELF_ART.floor.src})` }} aria-hidden>
        <span className={styles.pouf} />
      </div>

      {pickSlot !== null ? (
        <div className={styles.pickerWrap} onClick={() => setPickSlot(null)}>
          <PixelFrame
            className={styles.picker}
            role="dialog"
            aria-label="Choose a decoration"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && setPickSlot(null)}
          >
            <strong>Choose a decoration</strong>
            {availableDecor.length ? (
              <div className={styles.pickerGrid} role="radiogroup" aria-label="Unlocked decorations">
                {availableDecor.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={placed[pickSlot] === k}
                    className={styles.pickerItem}
                    onClick={() => place(pickSlot, k)}
                    autoFocus={placed[pickSlot] === k}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={DECOR[k]} alt="" className="px-art" width={64} height={64} draggable={false} />
                    {k.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            ) : (
              <p>Nothing unlocked yet. Log books, movies and albums, post in the forum, and make friends to earn decorations.</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {placed[pickSlot] ? <PixelButton onClick={() => place(pickSlot, null)}>Remove</PixelButton> : null}
              <PixelButton onClick={() => setPickSlot(null)}>Close</PixelButton>
            </div>
          </PixelFrame>
        </div>
      ) : null}

      {message ? (
        <div className={styles.toastHost}>
          <Toast role={message.error ? "alert" : "status"}>{message.text}</Toast>
        </div>
      ) : null}
    </div>
  );
}
