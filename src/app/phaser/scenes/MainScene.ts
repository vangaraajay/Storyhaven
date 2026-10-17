import Phaser from "phaser";
import { Player } from "../entities/Player";
import { FurnitureManager } from "../entities/FurnitureManager";
import { DEFAULT_FURNITURE } from "../constants/furniture";
import { LANDMARK_ZONES, type LandmarkZone } from "../constants/zones";
import { COLORS } from "../constants/colors";

export interface MainSceneData {
  onNavigate?: (route: string) => void;
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private furnitureManager!: FurnitureManager;
  private onNavigate?: (route: string) => void;

  private activeZone: LandmarkZone | null = null;
  private timeInZone = 0;
  private readonly DWELL_THRESHOLD = 500; // ms
  private isNavigating = false;

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

    // 4. Create Player (Spawn in center of room)
    this.player = new Player(this, 400, 320);

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
      .text(width / 2, 85, "Use WASD or Arrows to walk • Step onto a landmark zone to visit", {
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

    if (currentZone) {
      if (this.activeZone?.id === currentZone.id) {
        this.timeInZone += delta;
        if (this.timeInZone >= this.DWELL_THRESHOLD) {
          this.triggerNavigation(currentZone.route);
        }
      } else {
        this.activeZone = currentZone;
        this.timeInZone = 0;
        this.showHUD(currentZone.prompt);
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
    for (const zone of LANDMARK_ZONES) {
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

  private triggerNavigation(route: string): void {
    this.isNavigating = true;
    this.player.isMovementLocked = true;

    // Quick camera fade out transition
    this.cameras.main.fade(180, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      if (this.onNavigate) {
        this.onNavigate(route);
      } else {
        window.location.href = route;
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

    for (const zone of LANDMARK_ZONES) {
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
    for (const zone of LANDMARK_ZONES) {
      const { x, y, width, height } = zone.sensorRect;
      this.debugGraphics.fillRect(x, y, width, height);
      this.debugGraphics.strokeRect(x, y, width, height);
    }
  }
}
