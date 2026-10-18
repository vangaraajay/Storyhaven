import type Phaser from "phaser";

/**
 * Builds `${key}-shadow`: the sprite's silhouette filled solid black (same size, hard edges).
 * Drawn offset behind the sprite at partial alpha, it reads as a pixel-art drop shadow.
 * Returns the texture key, or null if the source can't be read.
 */
export function makeShadow(scene: Phaser.Scene, key: string): string | null {
  const shadowKey = `${key}-shadow`;
  if (scene.textures.exists(shadowKey)) return shadowKey;
  if (!scene.textures.exists(key)) return null;

  const src = scene.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] > 0) {
      data.data[i] = 0;
      data.data[i + 1] = 0;
      data.data[i + 2] = 0;
      data.data[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);

  const tex = scene.textures.addCanvas(shadowKey, canvas);
  tex?.setFilter(1 /* NEAREST */);
  return shadowKey;
}
