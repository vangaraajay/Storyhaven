import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  create() {
    this.add
      .text(400, 250, "Phaser", {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const button = this.add
      .text(400, 320, "Go to page", {
        fontSize: "20px",
        color: "#9ad1ff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerup", () => {
      window.location.href = "/page";
    });
  }
}

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent,
    backgroundColor: "#1a1a2e",
    scene: [MainScene],
  });
}
