import Phaser from "phaser";
import { Player } from "../entities/Player";
import { FurnitureManager } from "../entities/FurnitureManager";
import { ART_SCALE, DEFAULT_FURNITURE } from "../constants/furniture";
import {
  getActiveZones,
  type LandmarkZone,
} from "../constants/zones";
import { COLORS } from "../constants/colors";
import { ICONS } from "@/lib/sprites";

/** Where a sensor pad's label goes (game coordinates); rendered as crisp DOM text by HavenOverlay. */
export interface PadLabel {
  id: string;
  name: string;
  icon?: string;
  color: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface PromptInfo {
  id: string;
  text: string;
  icon?: string;
}

export interface MainSceneData {
  onZones?: (labels: PadLabel[]) => void;
  onPrompt?: (prompt: PromptInfo | null) => void;
  onNavigate?: (route: string) => void;
  onReady?: () => void;
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
  avatarFrames?: { idle: HTMLCanvasElement; walk_l: HTMLCanvasElement; walk_r: HTMLCanvasElement };
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private furnitureManager!: FurnitureManager;
  private onNavigate?: (route: string) => void;
  private onReady?: () => void;
  private onZones?: (labels: PadLabel[]) => void;
  private onPrompt?: (prompt: PromptInfo | null) => void;
  private isLoggedIn = false;
  private needsProfile = false;
  private displayName: string | null = null;
  private zones: LandmarkZone[] = [];
  private avatarFrames?: MainSceneData["avatarFrames"];

  private activeZone: LandmarkZone | null = null;
  private timeInZone = 0;
  private readonly DWELL_THRESHOLD = 500; // ms
  private isNavigating = false;
  private suppressedZoneId: string | null = null;

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
    this.avatarFrames = data?.avatarFrames;
    this.onReady = data?.onReady;
    this.onZones = data?.onZones;
    this.onPrompt = data?.onPrompt;
    this.zones = getActiveZones(this.needsProfile, this.displayName);
  }

  public preload(): void {
    const art: Record<string, string> = {
      floor: "/floor_soft.png",
      counter: "/counter.png",
      fireplace1: "/fireplace1.png",
      fireplace2: "/fireplace2.png",
      fireplace3: "/fireplace3.png",
      bookshelf_alt1: "/bookshelf_alt1.png",
      bookshelf_alt2: "/bookshelf_alt2.png",
      bookshelf: "/bookshelf.png",
      podium: "/podium.png",
      podiumup: "/podiumup.png",
      podiumupper: "/podiumupper.png",
      board: "/board.png",
    };
    for (const [key, url] of Object.entries(art)) this.load.image(key, url);
    // Pixel icons for the zone prompts.
    for (const [name, url] of Object.entries(ICONS)) this.load.image(`icon-${name}`, url);
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
    let spawnY = 250;
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

    // Register the composed character as nearest-filtered textures for the player sprite.
    let spriteKeys: { idle: string; walk_l: string; walk_r: string } | undefined;
    if (this.avatarFrames) {
      spriteKeys = { idle: "avatar-idle", walk_l: "avatar-walk-l", walk_r: "avatar-walk-r" };
      const sources = { idle: this.avatarFrames.idle, walk_l: this.avatarFrames.walk_l, walk_r: this.avatarFrames.walk_r };
      for (const frame of ["idle", "walk_l", "walk_r"] as const) {
        const key = spriteKeys[frame];
        if (this.textures.exists(key)) this.textures.remove(key);
        const tex = this.textures.addCanvas(key, sources[frame]);
        tex?.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    this.player = new Player(this, spawnX, spawnY, spriteKeys);

    this.onReady?.();

    // Smooth camera fade-in on entry / return to room
    this.cameras.main.fadeIn(180, 0, 0, 0);

    // 5. Create Floating HUD Prompt

    // 6. Debug view toggle (D key)
    this.debugGraphics = this.add.graphics().setDepth(100).setVisible(false);
    this.input.keyboard?.on("keydown-D", () => {
      this.isDebugVisible = !this.isDebugVisible;
      this.debugGraphics.setVisible(this.isDebugVisible);
      this.drawDebugOverlay();
    });
  }

  public update(time: number, delta: number): void {
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
        this.refreshPads();
        this.timeInZone = 0;
        this.showHUD(effectiveZone);
      }
    } else {
      if (this.activeZone !== null) {
        this.activeZone = null;
        this.refreshPads();
        this.timeInZone = 0;
        this.hideHUD();
      }
    }

    // Podium: closed -> lifting -> open while the player stands on its pad.
    // Idle: every ~4 s a page lifts and turns (2 frames, 180 ms each); skipped under reduced motion.
    let podiumFrame = 0;
    if (this.activeZone?.id === "daily-story") {
      podiumFrame = this.timeInZone < this.DWELL_THRESHOLD / 2 ? 1 : 2;
    } else if (document.documentElement.dataset.motion !== "reduced") {
      const t = time % 4000;
      podiumFrame = t < 180 ? 1 : t < 360 ? 2 : 0;
    }
    this.furnitureManager.getById("daily-story-desk")?.setFrame(podiumFrame);

    // Fireplace: flicker through its 3 frames (~220 ms each); a still first frame under reduced motion.
    const fireFrame = document.documentElement.dataset.motion === "reduced" ? 0 : Math.floor(time / 220) % 3;
    this.furnitureManager.getById("friends-board")?.setFrame(fireFrame);

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
    const WALL_H = 128; // matches the bookshelf wall collider
    const base = this.add.graphics().setDepth(-10);
    base.fillStyle(COLORS.FLOOR, 1);
    base.fillRect(0, 0, width, height);

    if (this.textures.exists("floor")) {
      this.add
        .tileSprite(0, WALL_H, width, height - WALL_H, "floor")
        .setOrigin(0, 0)
        .setDepth(-9)
        .setTileScale(ART_SCALE, ART_SCALE);
      return;
    }

    // Fallback: checkered rectangles when the art is missing.
    base.fillStyle(COLORS.FLOOR_GRID, 0.4);
    const tileSize = 32;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = WALL_H; y < height; y += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          base.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
  }

  private pads = new Map<string, { fill: Phaser.GameObjects.Rectangle; border: Phaser.GameObjects.Rectangle; color: number }>();

  private createSensorPads(): void {
    const reduced = document.documentElement.dataset.motion === "reduced";

    // Names and icons are drawn as DOM text over the canvas (crisp at any size), not as Phaser text.
    this.onZones?.(
      this.zones.map((z) => ({
        id: z.id,
        name: z.name,
        icon: z.icon,
        color: z.color ?? COLORS.SENSOR_PAD,
        cx: z.sensorRect.x + z.sensorRect.width / 2,
        cy: z.sensorRect.y + z.sensorRect.height / 2,
        width: z.sensorRect.width,
        height: z.sensorRect.height,
      })),
    );

    for (const zone of this.zones) {
      const { x, y, width, height } = zone.sensorRect;
      const color = zone.color ?? COLORS.SENSOR_PAD;

      // Doormat: solid fill + hard 2px border + inner 1px line, with square corner studs.
      const fill = this.add.rectangle(x + width / 2, y + height / 2, width, height, color, 0.3).setDepth(-7);
      const border = this.add
        .rectangle(x + width / 2, y + height / 2, width, height)
        .setStrokeStyle(2, color, 1)
        .setDepth(-7);
      this.add
        .rectangle(x + width / 2, y + height / 2, width - 10, height - 10)
        .setStrokeStyle(1, color, 0.55)
        .setDepth(-7);
      for (const [cx, cy] of [[x, y], [x + width, y], [x, y + height], [x + width, y + height]]) {
        this.add.rectangle(cx, cy, 6, 6, color, 1).setDepth(-7);
      }

      this.pads.set(zone.id, { fill, border, color });

      // Gentle idle pulse (stepped, skipped for reduced motion).
      if (!reduced) {
        this.tweens.add({ targets: fill, alpha: 0.5, duration: 700, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [3] });
      }
    }
  }

  /** Brighten the pad the player is standing on. */
  private refreshPads(): void {
    for (const [id, pad] of this.pads) {
      const active = this.activeZone?.id === id;
      pad.fill.setFillStyle(pad.color, active ? 0.6 : 0.3);
      pad.border.setStrokeStyle(active ? 4 : 2, active ? 0xf3e6c8 : pad.color, 1);
    }
  }

  private showHUD(zone: LandmarkZone): void {
    this.onPrompt?.({ id: zone.id, text: zone.prompt, icon: zone.icon });
  }

  private hideHUD(): void {
    this.onPrompt?.(null);
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
