import Phaser from "phaser";
import { MainScene, type PadLabel, type PromptInfo } from "./scenes/MainScene";

export interface GameOptions {
  onNavigate?: (route: string) => void;
  /** Called once the first scene has been created. */
  onReady?: () => void;
  onZones?: (labels: PadLabel[]) => void;
  onPrompt?: (prompt: PromptInfo | null) => void;
  onFadeOut?: () => void;
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
  /** Composed 32x32 character frames for the player sprite. */
  avatarFrames?: Record<string, HTMLCanvasElement>;
}

export function createGame(parent: HTMLElement, options?: GameOptions) {
  class ConfiguredMainScene extends MainScene {
    init() {
      super.init({
        onNavigate: options?.onNavigate,
        isLoggedIn: options?.isLoggedIn,
        needsProfile: options?.needsProfile,
        displayName: options?.displayName ?? null,
        avatarFrames: options?.avatarFrames,
        onReady: options?.onReady,
        onFadeOut: options?.onFadeOut,
        onZones: options?.onZones,
        onPrompt: options?.onPrompt,
      });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#2b1d14",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 800,
      height: 600,
    },
    scene: [ConfiguredMainScene],
  });

  if (options?.onResize) {
    game.scale.on(Phaser.Scale.Events.RESIZE, options.onResize);
  }

  return game;
}
