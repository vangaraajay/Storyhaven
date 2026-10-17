import Phaser from "phaser";
import type { FurnitureConfig } from "../constants/furniture";
import { COLORS } from "../constants/colors";

export class Furniture {
  public readonly config: FurnitureConfig;
  public readonly bounds: Phaser.Geom.Rectangle;
  public readonly isSolid: boolean;
  private readonly container: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Image | null = null;

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
        const src = scene.textures.get(spec.keys[0]).getSourceImage();
        const tile = scene.add
          .tileSprite(0, config.height, config.width, src.height * spec.scale, spec.keys[0])
          .setOrigin(0, 1)
          .setTileScale(spec.scale, spec.scale);
        this.container.add(tile);
      } else {
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
    if (this.art.texture.key !== key) this.art.setTexture(key);
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
