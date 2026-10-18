import Phaser from "phaser";
import type { FurnitureConfig } from "../constants/furniture";
import { COLORS } from "../constants/colors";
import { makeShadow } from "./makeShadow";

export class Furniture {
  public readonly config: FurnitureConfig;
  public readonly bounds: Phaser.Geom.Rectangle;
  public readonly isSolid: boolean;
  private readonly container: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Image | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private shadowKeys: Record<string, string> = {};

  constructor(scene: Phaser.Scene, config: FurnitureConfig) {
    this.config = config;
    this.isSolid = config.isSolid;
    this.bounds = new Phaser.Geom.Rectangle(
      config.x,
      config.y,
      config.width,
      config.height
    );

    this.container = scene.add.container(config.x, config.y);

    const spec = config.sprite;
    if (spec && scene.textures.exists(spec.keys[0])) {
      if (spec.tile) {
        // Repeat the art across the width. With several keys they are mixed in a fixed
        // pattern (no neighbours alike, same layout every load).
        const keys = spec.keys.filter((k) => scene.textures.exists(k));
        const PATTERN = [0, 2, 1, 0, 1, 2, 1, 0, 2, 0, 2, 1];
        const cellW = scene.textures.get(keys[0]).getSourceImage().width * spec.scale;
        for (let i = 0, x = 0; x < config.width; i++, x += cellW) {
          const key = keys.length > 1 ? keys[PATTERN[i % PATTERN.length] % keys.length] : keys[0];
          // Wall shelves cast a hard shadow straight down onto the floor.
          const sk = makeShadow(scene, key);
          if (sk) {
            this.container.add(
              scene.add.image(x, config.height + 8, sk).setOrigin(0, 1).setScale(spec.scale).setAlpha(0.3),
            );
          }
          const piece = scene.add.image(x, config.height, key).setOrigin(0, 1).setScale(spec.scale);
          this.container.add(piece);
        }
      } else {
        // Hard-edged drop shadow: the sprite's silhouette, offset down-right behind it.
        for (const k of spec.keys) {
          const sk = makeShadow(scene, k);
          if (sk) this.shadowKeys[k] = sk;
        }
        const first = this.shadowKeys[spec.keys[0]];
        if (first) {
          this.shadow = scene.add
            .image(config.width / 2 + 6, config.height + 5, first)
            .setOrigin(0.5, 1)
            .setScale(spec.scale)
            .setAlpha(0.35);
          this.container.add(this.shadow);
        }
        this.art = scene.add
          .image(config.width / 2, config.height, spec.keys[0])
          .setOrigin(0.5, 1)
          .setScale(spec.scale);
        this.container.add(this.art);
      }
      return; // art replaces the placeholder rectangle and label
    }

    // Main base body
    const baseColor = config.color ?? COLORS.DESK;
    const body = scene.add.rectangle(
      config.width / 2,
      config.height / 2,
      config.width,
      config.height,
      baseColor
    );
    this.container.add(body);

    // Pixel highlight / rim on top edge to give depth
    const rimHeight = Math.min(4, Math.max(2, Math.floor(config.height * 0.1)));
    const rim = scene.add.rectangle(
      config.width / 2,
      rimHeight / 2,
      config.width,
      rimHeight,
      0xffffff,
      0.15
    );
    this.container.add(rim);

    // Optional pixel label for landmarks during prototyping
    if (config.label && config.height >= 40) {
      const labelText = scene.add
        .text(config.width / 2, config.height / 2, config.label, {
          fontSize: "12px",
          color: COLORS.TEXT,
          align: "center",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);
      this.container.add(labelText);
    }
  }

  /** Switch to the i-th texture of a multi-frame sprite. No-op without art. */
  public setFrame(i: number): void {
    const keys = this.config.sprite?.keys;
    if (!this.art || !keys) return;
    const key = keys[Math.min(i, keys.length - 1)];
    if (this.art.texture.key !== key) {
      this.art.setTexture(key);
      const sk = this.shadowKeys[key];
      if (sk && this.shadow) this.shadow.setTexture(sk);
    }
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return this.bounds;
  }

  public setPosition(x: number, y: number): void {
    this.bounds.x = x;
    this.bounds.y = y;
    this.container.setPosition(x, y);
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
