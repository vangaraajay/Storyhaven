import Phaser from "phaser";
import { COLORS } from "../constants/colors";

export class Player {
  public x: number;
  public y: number;
  public readonly width = 18;
  public readonly height = 26;
  public speed = 130; // px/sec
  public isMovementLocked = false;

  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly bodyRect: Phaser.GameObjects.Rectangle;
  private readonly eyeLeft: Phaser.GameObjects.Rectangle;
  private readonly eyeRight: Phaser.GameObjects.Rectangle;
  private readonly bounds: Phaser.Geom.Rectangle;

  private readonly keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, startX: number, startY: number) {
    this.scene = scene;
    this.x = startX;
    this.y = startY;

    this.bounds = new Phaser.Geom.Rectangle(
      startX - this.width / 2,
      startY - this.height / 2,
      this.width,
      this.height
    );

    this.container = scene.add.container(startX, startY);

    // Subtle drop shadow under feet
    const shadow = scene.add.ellipse(0, this.height / 2 + 1, 16, 6, 0x000000, 0.25);
    this.container.add(shadow);

    // Player base body (pixel art prototype)
    this.bodyRect = scene.add.rectangle(
      0,
      0,
      this.width,
      this.height,
      COLORS.PLAYER
    );
    this.container.add(this.bodyRect);

    // Eyes / directional indicators
    this.eyeLeft = scene.add.rectangle(-3, -4, 2, 4, COLORS.PLAYER_DETAILS);
    this.eyeRight = scene.add.rectangle(3, -4, 2, 4, COLORS.PLAYER_DETAILS);
    this.container.add(this.eyeLeft);
    this.container.add(this.eyeRight);

    // Setup input keys safely
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.keys = {
        W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        UP: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        LEFT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        DOWN: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        RIGHT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      };
    } else {
      throw new Error("Keyboard input plugin unavailable in Phaser Scene.");
    }
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return this.bounds;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public update(delta: number, solidColliders: Phaser.Geom.Rectangle[]): void {
    if (this.isMovementLocked) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.A.isDown || this.keys.LEFT.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) dx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) dy += 1;

    if (dx === 0 && dy === 0) return;

    // Normalize diagonal movement
    const moveDist = this.speed * (delta / 1000);
    const length = Math.hypot(dx, dy);
    const vx = (dx / length) * moveDist;
    const vy = (dy / length) * moveDist;

    // Update eye facing direction
    this.updateFacing(dx, dy);

    // Canvas world bounds (800 x 600)
    const minX = this.width / 2;
    const maxX = 800 - this.width / 2;
    const minY = this.height / 2;
    const maxY = 600 - this.height / 2;

    // --- X Axis Movement & Collision Check ---
    if (vx !== 0) {
      const nextX = Phaser.Math.Clamp(this.x + vx, minX, maxX);
      const testBoundsX = new Phaser.Geom.Rectangle(
        nextX - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );

      let collidedX = false;
      for (const collider of solidColliders) {
        if (Phaser.Geom.Rectangle.Overlaps(testBoundsX, collider)) {
          collidedX = true;
          break;
        }
      }

      if (!collidedX) {
        this.x = nextX;
      }
    }

    // --- Y Axis Movement & Collision Check ---
    if (vy !== 0) {
      const nextY = Phaser.Math.Clamp(this.y + vy, minY, maxY);
      const testBoundsY = new Phaser.Geom.Rectangle(
        this.x - this.width / 2,
        nextY - this.height / 2,
        this.width,
        this.height
      );

      let collidedY = false;
      for (const collider of solidColliders) {
        if (Phaser.Geom.Rectangle.Overlaps(testBoundsY, collider)) {
          collidedY = true;
          break;
        }
      }

      if (!collidedY) {
        this.y = nextY;
      }
    }

    // Sync container and bounds
    this.container.setPosition(this.x, this.y);
    this.bounds.setPosition(this.x - this.width / 2, this.y - this.height / 2);
  }

  private updateFacing(dx: number, dy: number): void {
    if (dx < 0) {
      // Facing Left
      this.eyeLeft.setPosition(-5, -4);
      this.eyeRight.setPosition(-1, -4);
    } else if (dx > 0) {
      // Facing Right
      this.eyeLeft.setPosition(1, -4);
      this.eyeRight.setPosition(5, -4);
    } else if (dy < 0) {
      // Facing Up
      this.eyeLeft.setPosition(-3, -7);
      this.eyeRight.setPosition(3, -7);
    } else if (dy > 0) {
      // Facing Down
      this.eyeLeft.setPosition(-3, -2);
      this.eyeRight.setPosition(3, -2);
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
