import type Phaser from "phaser";
import { Furniture } from "./Furniture";
import type { FurnitureConfig } from "../constants/furniture";

export class FurnitureManager {
  private readonly scene: Phaser.Scene;
  private readonly items = new Map<string, Furniture>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public addFurniture(config: FurnitureConfig): Furniture {
    if (this.items.has(config.id)) {
      this.removeFurniture(config.id);
    }
    const item = new Furniture(this.scene, config);
    this.items.set(config.id, item);
    return item;
  }

  public removeFurniture(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;
    item.destroy();
    return this.items.delete(id);
  }

  public getSolidColliders(): Phaser.Geom.Rectangle[] {
    const colliders: Phaser.Geom.Rectangle[] = [];
    for (const item of this.items.values()) {
      if (item.isSolid) {
        colliders.push(item.getBounds());
      }
    }
    return colliders;
  }

  public getAll(): Furniture[] {
    return Array.from(this.items.values());
  }

  public getById(id: string): Furniture | undefined {
    return this.items.get(id);
  }

  public clear(): void {
    for (const item of this.items.values()) {
      item.destroy();
    }
    this.items.clear();
  }
}
