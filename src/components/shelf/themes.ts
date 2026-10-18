import type { Palette } from "@/lib/avatar/types";
import type { ShelfTheme } from "@/lib/shelf";

/** [light, mid, shadow] per theme; recolors the magenta key colors in the shelf art. */
export const THEME_PALETTES: Record<ShelfTheme, Palette> = {
  oak: ["#D9A36A", "#B97D45", "#8A5A2E"],
  walnut: ["#9A6A4A", "#74482F", "#4F2F1D"],
  birch: ["#F0E2C4", "#D6C29A", "#A8956C"],
  rose: ["#D4A5A0", "#B07C7A", "#80524F"],
};

const KEYS: Array<[number, number, number]> = [
  [0xff, 0x00, 0xff],
  [0xcc, 0x00, 0xcc],
  [0x99, 0x00, 0x99],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const cache = new Map<string, Promise<string>>();

/** Recolors exact key colors and returns a PNG data URL. Cached per src + theme. */
export function recoloredUrl(src: string, theme: ShelfTheme): Promise<string> {
  const key = `${src}|${theme}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return reject(new Error("2D canvas unavailable"));
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        const to = THEME_PALETTES[theme].map(hexToRgb);
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
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}
