"use client";

import { AVATAR_ART } from "@/lib/sprites";
import {
  HAIR_PALETTES,
  SKIN_PALETTES,
  TOP_PALETTES,
  type Avatar,
  type BodyFrame,
  type EyeFrame,
  type Palette,
} from "./types";

export const AVATAR_SIZE = 32;
/** Draw order, bottom to top. Hair is a single layer. */
export const LAYER_ORDER = ["body", "eyes", "mouth", "top", "hair", "accessory"] as const;
export type LayerName = (typeof LAYER_ORDER)[number];
export type AvatarFrame = { body?: BodyFrame; eyes?: EyeFrame };
export type AvatarLayers = Partial<Record<LayerName, HTMLCanvasElement>>;

/** Exact key colors, [light, mid, shadow]. */
const KEYS: Array<[number, number, number]> = [
  [0xff, 0x00, 0xff],
  [0xcc, 0x00, 0xcc],
  [0x99, 0x00, 0x99],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/** Replaces exact key colors with the palette's [light, mid, shadow]; no blending. */
function recolor(ctx: CanvasRenderingContext2D, palette: Palette) {
  const data = ctx.getImageData(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const px = data.data;
  const to = palette.map(hexToRgb);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    for (let k = 0; k < 3; k++) {
      if (px[i] === KEYS[k][0] && px[i + 1] === KEYS[k][1] && px[i + 2] === KEYS[k][2]) {
        px[i] = to[k][0];
        px[i + 1] = to[k][1];
        px[i + 2] = to[k][2];
        break;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}

async function buildLayer(src: string, palette?: Palette): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  if (palette) recolor(ctx, palette);
  return canvas;
}

const cache = new Map<string, Promise<AvatarLayers>>();

/**
 * One recolored 32x32 canvas per layer (skin, hair and top are recolored).
 * Cached by avatar JSON + frame; callers must not draw into the returned canvases.
 */
export function composeAvatar(
  avatar: Avatar,
  frame: AvatarFrame = {},
): Promise<AvatarLayers> {
  const bodyFrame = frame.body ?? "idle";
  const eyeFrame = frame.eyes ?? "open";
  const key = `${JSON.stringify(avatar)}|${bodyFrame}|${eyeFrame}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const [body, eyes, mouth, top, hair, accessory] = await Promise.all([
        buildLayer(AVATAR_ART.body[bodyFrame], SKIN_PALETTES[avatar.skin]),
        buildLayer(AVATAR_ART.eyes[avatar.eyes][eyeFrame]),
        buildLayer(AVATAR_ART.mouth[avatar.mouth]),
        buildLayer(AVATAR_ART.top[avatar.top], TOP_PALETTES[avatar.topColor]),
        buildLayer(AVATAR_ART.hair[avatar.hair], HAIR_PALETTES[avatar.hairColor]),
        avatar.accessory
          ? buildLayer(AVATAR_ART.accessory[avatar.accessory])
          : Promise.resolve(undefined),
      ]);
      return { body, eyes, mouth, top, hair, accessory };
    })();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}
