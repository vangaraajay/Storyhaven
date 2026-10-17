import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

export interface GameOptions {
  onNavigate?: (route: string) => void;
  isLoggedIn?: boolean;
  needsProfile?: boolean;
  displayName?: string | null;
}

export function createGame(parent: HTMLElement, options?: GameOptions) {
  class ConfiguredMainScene extends MainScene {
    init() {
      super.init({
        onNavigate: options?.onNavigate,
        isLoggedIn: options?.isLoggedIn,
        needsProfile: options?.needsProfile,
        displayName: options?.displayName ?? null,
      });
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#191724",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 800,
      height: 600,
    },
    scene: [ConfiguredMainScene],
  });
}
