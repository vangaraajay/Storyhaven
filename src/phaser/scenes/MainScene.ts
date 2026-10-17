import Phaser from "phaser";
import { Player } from "../entities/Player";
import { FurnitureManager } from "../entities/FurnitureManager";
import { DEFAULT_FURNITURE } from "../constants/furniture";
import {
  getActiveZones,
  type LandmarkZone,
} from "../constants/zones";
import { COLORS } from "../constants/colors";

export interface MainSceneData {
  onNavigate?: (route: string) => void;
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private furnitureManager!: FurnitureManager;
  private onNavigate?: (route: string) => void;
  private isLoggedIn = false;
  private needsProfile = false;
  private displayName: string | null = null;
  private zones: LandmarkZone[] = [];

  private activeZone: LandmarkZone | null = null;
  private timeInZone = 0;
  private readonly DWELL_THRESHOLD = 500; // ms
  private isNavigating = false;
  private suppressedZoneId: string | null = null;

  private hudPromptContainer!: Phaser.GameObjects.Container;
  private hudPromptText!: Phaser.GameObjects.Text;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private isDebugVisible = false;

  constructor() {
    super("main");
  }

  public init(data: MainSceneData): void {
    if (data && typeof data.onNavigate === "function") {
      this.onNavigate = data.onNavigate;
    }
    this.isLoggedIn = Boolean(data?.isLoggedIn);
    this.needsProfile = Boolean(data?.needsProfile);
    this.displayName = data?.displayName ?? null;
    this.zones = getActiveZones(this.needsProfile, this.displayName);
  }

  public create(): void {
    const { width, height } = this.scale;

    // 1. Draw floor background with subtle parquet / pixel floor grid
    this.createFloor(width, height);

    // 2. Initialize and populate furniture
    this.furnitureManager = new FurnitureManager(this);
    for (const item of DEFAULT_FURNITURE) {
      this.furnitureManager.addFurniture(item);
    }

    // 3. Render Landmark Sensor Pads
    this.createSensorPads();

    // 4. Create Player (restore position if returning from a landmark, or default to room center)
    let spawnX = 400;
    let spawnY = 320;
    this.suppressedZoneId = null;

    try {
      const saved = sessionStorage.getItem("storyhaven_player_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          spawnX = parsed.x;
          spawnY = parsed.y;
          this.suppressedZoneId = parsed.suppressedZoneId ?? null;
        }
      }
    } catch (err) {
      console.warn("Failed to restore player position from sessionStorage", err);
    }

    this.player = new Player(this, spawnX, spawnY);

    // Smooth camera fade-in on entry / return to room
    this.cameras.main.fadeIn(180, 0, 0, 0);

    // 5. Create Floating HUD Prompt
    this.createHUD();

    // 6. Debug view toggle (D key)
    this.debugGraphics = this.add.graphics().setDepth(100).setVisible(false);
    this.input.keyboard?.on("keydown-D", () => {
      this.isDebugVisible = !this.isDebugVisible;
      this.debugGraphics.setVisible(this.isDebugVisible);
      this.drawDebugOverlay();
    });

    // Helpful instruction tip at top
    this.add
      .text(width / 2, 85, "Use WASD or Arrows • Library for logs • Auth Desk to log out", {
        fontSize: "13px",
        color: COLORS.TEXT_MUTED,
        fontFamily: "monospace",
        backgroundColor: "rgba(25, 23, 36, 0.7)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  public update(_time: number, delta: number): void {
    if (this.isNavigating) return;

    // Update player movement and collision against all solid furniture
    const solidColliders = this.furnitureManager.getSolidColliders();
    this.player.update(delta, solidColliders);

    // Check Landmark Sensors
    const playerCenter = this.player.getCenter();
    const currentZone = this.findMatchingZone(playerCenter.x, playerCenter.y);

    // Determine effective zone with suppression guard
    let effectiveZone = currentZone;

    if (this.suppressedZoneId) {
      if (currentZone && currentZone.id === this.suppressedZoneId) {
        // Player is still standing in the spawn pad: suppress dwell timer & navigation
        effectiveZone = null;
        this.timeInZone = 0;
      } else {
        // Player took a step outside the sensor pad boundaries!
        // Re-arm the sensor pad and clean up stored state
        this.suppressedZoneId = null;
        try {
          sessionStorage.removeItem("storyhaven_player_pos");
        } catch {}
      }
    }

    if (effectiveZone) {
      if (this.activeZone?.id === effectiveZone.id) {
        this.timeInZone += delta;
        if (this.timeInZone >= this.DWELL_THRESHOLD) {
          this.triggerNavigation(effectiveZone);
        }
      } else {
        this.activeZone = effectiveZone;
        this.timeInZone = 0;
        this.showHUD(effectiveZone.prompt);
      }
    } else {
      if (this.activeZone !== null) {
        this.activeZone = null;
        this.timeInZone = 0;
        this.hideHUD();
      }
    }
  }

  private findMatchingZone(x: number, y: number): LandmarkZone | null {
    for (const zone of this.zones) {
      const rect = new Phaser.Geom.Rectangle(
        zone.sensorRect.x,
        zone.sensorRect.y,
        zone.sensorRect.width,
        zone.sensorRect.height
      );
      if (rect.contains(x, y)) {
        return zone;
      }
    }
    return null;
  }

  private resolveRoute(zone: LandmarkZone): string {
    if (this.needsProfile && zone.id !== "auth-desk") {
      return "/pages/profile";
    }
    return zone.route;
  }

  private triggerNavigation(zone: LandmarkZone): void {
    this.isNavigating = true;
    this.player.isMovementLocked = true;

    // Save player coordinates and zone ID to sessionStorage before navigation
    try {
      const playerState = {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        suppressedZoneId: zone.id,
      };
      sessionStorage.setItem("storyhaven_player_pos", JSON.stringify(playerState));
    } catch (err) {
      console.warn("Could not save player position to sessionStorage", err);
    }

    const destination = this.resolveRoute(zone);

    // Quick camera fade out transition
    this.cameras.main.fade(180, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      if (this.onNavigate) {
        this.onNavigate(destination);
      } else {
        window.location.href = destination;
      }
    });
  }

  private createFloor(width: number, height: number): void {
    const floor = this.add.graphics();
    floor.fillStyle(COLORS.FLOOR, 1);
    floor.fillRect(0, 0, width, height);

    // Subtle checkered floor tiles (32x32)
    floor.fillStyle(COLORS.FLOOR_GRID, 0.4);
    const tileSize = 32;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 70; y < height; y += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          floor.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
  }

  private createSensorPads(): void {
    const sensorGraphics = this.add.graphics();

    for (const zone of this.zones) {
      const { x, y, width, height } = zone.sensorRect;
      const padColor = zone.color ?? COLORS.SENSOR_PAD;

      // Glow sensor fill
      sensorGraphics.fillStyle(padColor, 0.18);
      sensorGraphics.fillRect(x, y, width, height);

      // Sensor pad perimeter border
      sensorGraphics.lineStyle(2, padColor, 0.6);
      sensorGraphics.strokeRect(x, y, width, height);

      // In-world subtle tag
      this.add
        .text(x + width / 2, y + height / 2, `[ ${zone.name} ]`, {
          fontSize: "11px",
          color: COLORS.TEXT_MUTED,
          fontFamily: "monospace",
        })
        .setOrigin(0.5);
    }
  }

  private createHUD(): void {
    this.hudPromptContainer = this.add.container(400, 560).setDepth(200).setVisible(false);

    const bg = this.add.rectangle(0, 0, 360, 36, 0x191724, 0.92);
    bg.setStrokeStyle(1.5, 0xebbcba, 0.9);

    this.hudPromptText = this.add
      .text(0, 0, "", {
        fontSize: "14px",
        color: COLORS.TEXT,
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.hudPromptContainer.add([bg, this.hudPromptText]);

    // Gentle floating sine animation
    this.tweens.add({
      targets: this.hudPromptContainer,
      y: 556,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private showHUD(text: string): void {
    this.hudPromptText.setText(text);
    this.hudPromptContainer.setVisible(true);
  }

  private hideHUD(): void {
    this.hudPromptContainer.setVisible(false);
  }

  private drawDebugOverlay(): void {
    this.debugGraphics.clear();
    if (!this.isDebugVisible) return;

    // Draw solid furniture colliders in semi-transparent red
    this.debugGraphics.fillStyle(0xff0000, 0.35);
    this.debugGraphics.lineStyle(1, 0xff0000, 0.8);
    for (const item of this.furnitureManager.getAll()) {
      const bounds = item.getBounds();
      this.debugGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Draw sensor zones in semi-transparent green
    this.debugGraphics.fillStyle(0x00ff88, 0.3);
    this.debugGraphics.lineStyle(1, 0x00ff88, 0.9);
    for (const zone of this.zones) {
      const { x, y, width, height } = zone.sensorRect;
      this.debugGraphics.fillRect(x, y, width, height);
      this.debugGraphics.strokeRect(x, y, width, height);
    }
  }
}
