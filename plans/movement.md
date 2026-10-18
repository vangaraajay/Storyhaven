# Storyhaven Character Movement & Momentum — Implementation Plan

**Branch:** `main`  
**Target Files:**  
- `src/phaser/constants/physics.ts` (New centralized config)  
- `src/phaser/entities/Player.ts` (Velocity, acceleration, deceleration, wall sliding)  
**Status:** Planning only — do not implement until instructed.  
**Last updated:** 2026-10-17 (V2 — Scrutinized physics: added delta spike protection, turnaround braking, boundary zeroing, and lock reset)

---

## 1. Overview & Objectives

Currently, character movement in [`src/phaser/entities/Player.ts`](file:///home/logicle/Coding/swamphacks/Storyhaven/src/phaser/entities/Player.ts) is strictly binary:
- Pressing a direction key instantly snaps the player to top speed (`130 px/sec`).
- Releasing the key instantly brings the player to an abrupt full stop (`0 px/sec`).

### Goals:
1. **Centralized Physics Config (`src/phaser/constants/physics.ts`):** Place all movement and physics constants in one dedicated file with clear comments so you can tweak the numbers easily without touching entity logic.
2. **~20% Higher Max Speed:** Increase base speed from `130 px/sec` to `156 px/sec` (`130 * 1.20 = 156`) for a more dynamic and enjoyable room navigation speed.
3. **Subtle Momentum (Acceleration & Deceleration):**
   - **Acceleration:** Subtle ramp-up from stationary to top speed (~0.15s – 0.18s), giving the character weight without sluggish input lag.
   - **Deceleration / Friction:** Subtle coasting when keys are released (~0.12s – 0.15s glide to stop), avoiding jarring abrupt halts.
   - **Active Turnaround Braking:** When pressing the opposite direction while moving, apply a subtle braking multiplier so the player pivots crisply instead of ice-skating backwards.
4. **Preserved Wall Sliding & Border Safety:**
   - When colliding with solid furniture on the X axis, zero out horizontal momentum (`vx = 0`) while preserving vertical momentum (`vy`), ensuring wall-sliding remains butter-smooth.
   - Zero out velocity on world boundary impacts (canvas borders) so momentum doesn't build up offscreen.
5. **Robust Delta-Time & Lag Spike Protection:** Clamp frame delta time to prevent tunneling through bookshelves if the browser tab lags or is unfocused.

---

## 2. Centralized Physics Configuration (`src/phaser/constants/physics.ts`)

A dedicated configuration file containing all tunable movement parameters:

```ts
/**
 * Player physics and movement configuration for Storyhaven.
 * Tweak these values to adjust the movement feel.
 */
export const MOVEMENT_CONFIG = {
  /**
   * Top movement speed in pixels per second.
   * Baseline was 130 px/sec; 156 px/sec is ~20% faster.
   */
  maxSpeed: 156,

  /**
   * Acceleration rate in pixels per second squared when directional keys are held.
   * At 900 px/s², reaches max speed in ~0.17 seconds (subtle ramp-up, feels responsive).
   * - Higher (e.g. 1400) = snappier, instant arcade feel.
   * - Lower (e.g. 500) = more inertia/weight.
   */
  acceleration: 900,

  /**
   * Deceleration rate in pixels per second squared when directional keys are released.
   * At 1100 px/s², glides to a complete stop in ~0.14 seconds.
   * - Higher (e.g. 1800) = stops quickly with minimal coasting.
   * - Lower (e.g. 500) = slippery / icy coasting.
   */
  deceleration: 1100,

  /**
   * Multiplier applied to deceleration when actively pressing in the OPPOSITE
   * direction of current velocity (active braking/pivot).
   * - 1.0 = symmetric slide (takes equal time to reverse direction).
   * - 1.8 = crisp turn-around (recommended: responsive pivot without floatiness).
   */
  turnBrakeMultiplier: 1.8,

  /**
   * Velocity cutoff threshold in pixels per second.
   * Once absolute velocity falls below this value, snap to 0 to prevent sub-pixel drift.
   */
  stopThreshold: 4,

  /**
   * Maximum delta time in milliseconds allowed per physics step.
   * Prevents wall-tunneling during background tab throttling or lag spikes.
   */
  maxDeltaMs: 50,
} as const;

export type MovementConfig = typeof MOVEMENT_CONFIG;
```

---

## 3. Movement Mathematics & Velocity Integration (`Player.ts`)

### State Fields
Replace direct position displacement with persistent 2D velocity components:
```ts
export class Player {
  // Current velocity vector (px/sec)
  public vx = 0;
  public vy = 0;

  // Track movement locked state
  public isMovementLocked = false;
  ...
```

### Delta-Time Clamping & Lag Protection
```ts
// Clamp delta to protect against tab-switch tunneling
const safeDelta = Math.min(delta, MOVEMENT_CONFIG.maxDeltaMs);
const dt = safeDelta / 1000;
```

### Frame-Rate Independent Velocity Update Loop
In `Player.update(delta, solidColliders)`:

```ts
// If movement is locked (e.g. during camera transition), zero velocity and exit
if (this.isMovementLocked) {
  this.vx = 0;
  this.vy = 0;
  return;
}

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
  // Check if actively reversing direction (opposite signs)
  const isReversingX = (this.vx > 0 && targetVx < 0) || (this.vx < 0 && targetVx > 0);
  const rateX = isReversingX
    ? MOVEMENT_CONFIG.deceleration * MOVEMENT_CONFIG.turnBrakeMultiplier
    : MOVEMENT_CONFIG.acceleration;
  const changeX = rateX * dt;

  if (this.vx < targetVx) this.vx = Math.min(this.vx + changeX, targetVx);
  else if (this.vx > targetVx) this.vx = Math.max(this.vx - changeX, targetVx);
} else {
  // Decelerating / coasting to a stop
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
  const decelY = MOVEMENT_CONFIG.deceleration * dt;
  if (this.vy > 0) this.vy = Math.max(0, this.vy - decelY);
  else if (this.vy < 0) this.vy = Math.min(0, this.vy + decelY);
}

// 5. Zero out micro-velocities to prevent sub-pixel drift
if (Math.abs(this.vx) < MOVEMENT_CONFIG.stopThreshold && targetVx === 0) this.vx = 0;
if (Math.abs(this.vy) < MOVEMENT_CONFIG.stopThreshold && targetVy === 0) this.vy = 0;

// 6. Early exit if completely stationary and no pending input
if (this.vx === 0 && this.vy === 0 && targetVx === 0 && targetVy === 0) return;
```

---

## 4. Collision Resolution with Momentum Absorption

When the player glides into a wall, desk, or screen boundary:
- On solid collider overlap on the X axis, set `this.vx = 0` immediately (momentum absorbed).
- On solid collider overlap on the Y axis, set `this.vy = 0` immediately.
- On canvas border clamp (`minX`, `maxX`, `minY`, `maxY`), also zero out that axis's velocity.
- This prevents the character from vibrating against walls or sliding after contact, while preserving the perpendicular axis so the player continues sliding smoothly along bookshelves and tables.

```ts
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
  
  // Zero velocity if hitting screen borders
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
    // Absorb horizontal momentum on impact
    this.vx = 0;
  }
}

// --- Y Axis Movement & Collision Check ---
if (stepY !== 0) {
  const nextY = Phaser.Math.Clamp(this.y + stepY, minY, maxY);

  // Zero velocity if hitting screen borders
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
    // Absorb vertical momentum on impact
    this.vy = 0;
  }
}

// Synchronize visual container and bounding box
this.container.setPosition(this.x, this.y);
this.bounds.setPosition(this.x - this.width / 2, this.y - this.height / 2);
```

---

## 5. Movement Comparison Matrix

| Property | Current (Linear) | Proposed (Momentum) | Gameplay Effect |
| :--- | :--- | :--- | :--- |
| **Max Speed** | `130 px/sec` | `156 px/sec` | ~20% faster traversal across the library room |
| **Acceleration** | Instantaneous (`∞`) | `900 px/sec²` (~0.17s to max) | Subtle ramp-up; gives character organic weight |
| **Deceleration** | Instantaneous (`∞`) | `1100 px/sec²` (~0.14s to stop) | Gentle coasting finish; no abrupt jarring halt |
| **Turnaround (Pivot)** | Instantaneous (`∞`) | `1980 px/sec²` (~0.08s brake) | Snappy reversal without ice-skating backwards |
| **Diagonal Speed** | Normalized (`130 px/s`) | Normalized (`156 px/s`) | No diagonal speed exploit |
| **Wall Contact** | Slides along free axis | Slides & zeros blocked axis | Retains responsive wall-sliding |
| **Lag Spikes** | Unprotected | Clamped to `maxDeltaMs = 50` | Zero risk of tunneling through obstacles |

---

## 6. Manual Tuning Guide (For the User)

When tweaking the feel in `src/phaser/constants/physics.ts`:

- **Want a snappier, more instant response?**  
  Increase `acceleration` (e.g. to `1400`) and `deceleration` (e.g. to `1600`).
- **Want a softer, weightier, cozier glide?**  
  Lower `deceleration` (e.g. to `800`) and lower `acceleration` (e.g. to `700`).
- **Want more or less slide when reversing directions?**  
  Tweak `turnBrakeMultiplier`:
  - `1.0` = completely symmetric glide (slides a bit when reversing).
  - `2.0+` = instant snappy reversal with zero backwards slip.
- **Want faster or slower traversal?**  
  Tweak `maxSpeed` up (e.g. `175`) or down (e.g. `140`).

---

## 7. Implementation Checklist

- [ ] **Step 1:** Create `src/phaser/constants/physics.ts` with `MOVEMENT_CONFIG`.
- [ ] **Step 2:** Update `Player.ts`:
  - Add `vx` and `vy` velocity state fields and `stop()` method.
  - Implement delta clamping (`maxDeltaMs = 50`).
  - Implement frame-rate independent acceleration, deceleration, and turnaround braking.
  - Implement velocity zeroing on solid collisions and world border clamping.
  - Reset `vx = 0, vy = 0` if `isMovementLocked` is set to `true`.
- [ ] **Step 3:** Run `npx tsc --noEmit` to verify type safety.
- [ ] **Step 4:** Launch dev server (`npm run dev`) and test feel:
  - Verify smooth acceleration and gentle glide to stop.
  - Test quick A/D and W/S pivots.
  - Test wall-sliding along bookshelves, central table, and desks.
  - Verify sensor pad dwell detection triggers reliably.
