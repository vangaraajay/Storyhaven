import Phaser from "phaser";
import { COLORS } from "../constants/colors";
import { MOVEMENT_CONFIG } from "../constants/physics";

export class Player {
  public x: number;
  public y: number;
  public readonly width = 18;
  public readonly height = 26;
  public speed = MOVEMENT_CONFIG.maxSpeed;
  public isMovementLocked = false;

  // 2D Velocity vector in pixels per second
  public vx = 0;
  public vy = 0;

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

  public stop(): void {
    this.vx = 0;
    this.vy = 0;
  }

  public update(delta: number, solidColliders: Phaser.Geom.Rectangle[]): void {
    if (this.isMovementLocked) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Clamp delta time to protect against background tab lag spikes / obstacle tunneling
    const safeDelta = Math.min(delta, MOVEMENT_CONFIG.maxDeltaMs);
    const dt = safeDelta / 1000;

    // 1. Collect raw directional intent (-1, 0, 1)
    let inputX = 0;
    let inputY = 0;

    if (this.keys.A.isDown || this.keys.LEFT.isDown) inputX -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) inputX += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) inputY -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) inputY += 1;

    // 2. Compute normalized target velocity
    let targetVx = 0;
    let targetVy = 0;

    if (inputX !== 0 || inputY !== 0) {
      const len = Math.hypot(inputX, inputY);
      targetVx = (inputX / len) * MOVEMENT_CONFIG.maxSpeed;
      targetVy = (inputY / len) * MOVEMENT_CONFIG.maxSpeed;
      this.updateFacing(inputX, inputY);
    }

    // 3. Accelerate or Decelerate along X axis
    if (targetVx !== 0) {
      const isReversingX = (this.vx > 0 && targetVx < 0) || (this.vx < 0 && targetVx > 0);
      const rateX = isReversingX
        ? MOVEMENT_CONFIG.deceleration * MOVEMENT_CONFIG.turnBrakeMultiplier
        : MOVEMENT_CONFIG.acceleration;
      const changeX = rateX * dt;

      if (this.vx < targetVx) this.vx = Math.min(this.vx + changeX, targetVx);
      else if (this.vx > targetVx) this.vx = Math.max(this.vx - changeX, targetVx);
    } else {
      // Coasting / deceleration to a stop
      const decelX = MOVEMENT_CONFIG.deceleration * dt;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - decelX);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + decelX);
    }

    // 4. Accelerate or Decelerate along Y axis
    if (targetVy !== 0) {
      const isReversingY = (this.vy > 0 && targetVy < 0) || (this.vy < 0 && targetVy > 0);
      const rateY = isReversingY
        ? MOVEMENT_CONFIG.deceleration * MOVEMENT_CONFIG.turnBrakeMultiplier
        : MOVEMENT_CONFIG.acceleration;
      const changeY = rateY * dt;

      if (this.vy < targetVy) this.vy = Math.min(this.vy + changeY, targetVy);
      else if (this.vy > targetVy) this.vy = Math.max(this.vy - changeY, targetVy);
    } else {
      // Coasting / deceleration to a stop
      const decelY = MOVEMENT_CONFIG.deceleration * dt;
      if (this.vy > 0) this.vy = Math.max(0, this.vy - decelY);
      else if (this.vy < 0) this.vy = Math.min(0, this.vy + decelY);
    }

    // 5. Zero out micro-velocities below stop threshold
    if (Math.abs(this.vx) < MOVEMENT_CONFIG.stopThreshold && targetVx === 0) {
      this.vx = 0;
    }
    if (Math.abs(this.vy) < MOVEMENT_CONFIG.stopThreshold && targetVy === 0) {
      this.vy = 0;
    }

    // 6. Early exit if stationary and no input
    if (this.vx === 0 && this.vy === 0 && targetVx === 0 && targetVy === 0) {
      return;
    }

    const stepX = this.vx * dt;
    const stepY = this.vy * dt;

    // Canvas world bounds (800 x 600)
    const minX = this.width / 2;
    const maxX = 800 - this.width / 2;
    const minY = this.height / 2;
    const maxY = 600 - this.height / 2;

    // --- X Axis Movement & Collision Check ---
    if (stepX !== 0) {
      const nextX = Phaser.Math.Clamp(this.x + stepX, minX, maxX);

      // Zero horizontal velocity on boundary impact
      if (nextX === minX || nextX === maxX) {
        this.vx = 0;
      }

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
      } else {
        // Absorb horizontal momentum on obstacle collision
        this.vx = 0;
      }
    }

    // --- Y Axis Movement & Collision Check ---
    if (stepY !== 0) {
      const nextY = Phaser.Math.Clamp(this.y + stepY, minY, maxY);

      // Zero vertical velocity on boundary impact
      if (nextY === minY || nextY === maxY) {
        this.vy = 0;
      }

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
      } else {
        // Absorb vertical momentum on obstacle collision
        this.vy = 0;
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
