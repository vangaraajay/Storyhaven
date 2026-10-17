/**
 * Player physics and movement configuration for Storyhaven.
 * Tweak these values to adjust the character movement feel.
 */
export const MOVEMENT_CONFIG = {
  /**
   * Top movement speed in pixels per second.
   * Baseline was 130 px/sec; 156 px/sec is ~20% faster.
   */
  maxSpeed: 170,

  /**
   * Acceleration rate in pixels per second squared when directional keys are held.
   * At 900 px/s², reaches max speed in ~0.17 seconds (subtle ramp-up, feels responsive).
   * - Higher (e.g. 1400) = snappier, instant arcade feel.
   * - Lower (e.g. 500) = heavier inertia / floatier ramp-up.
   */
  acceleration: 1400,

  /**
   * Deceleration rate in pixels per second squared when directional keys are released.
   * At 1100 px/s², glides to a complete stop in ~0.14 seconds.
   * - Higher (e.g. 1800) = stops quickly with minimal coasting.
   * - Lower (e.g. 500) = slippery / icy coasting.
   */
  deceleration: 1500,

  /**
   * Multiplier applied to deceleration when actively pressing in the OPPOSITE
   * direction of current velocity (active braking/pivot).
   * - 1.0 = symmetric slide (takes equal time to reverse direction).
   * - 1.8 = crisp turn-around (responsive pivot without floatiness).
   */
  turnBrakeMultiplier: 2,

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
