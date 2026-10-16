import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { DistrictScene } from '../scenes/DistrictScene';
import { ThreeRenderer } from '../render/ThreeRenderer';

export interface GameEngineConfig {
  gameContainerId: string;
  threeContainerId: string;
}

export class GameEngine {
  public phaserGame!: Phaser.Game;
  public threeRenderer!: ThreeRenderer;
  private animationFrameId: number | null = null;

  constructor(private config: GameEngineConfig) {}

  public init(): void {
    // 1. Initialize Phaser 3 (HTML5 Canvas / WebGL)
    const phaserConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: this.config.gameContainerId,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, DistrictScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
    };

    this.phaserGame = new Phaser.Game(phaserConfig);

    // 2. Initialize Three.js (WebGL / OpenGL 3D renderer)
    this.threeRenderer = new ThreeRenderer({
      containerId: this.config.threeContainerId,
    });

    // 3. Start render loop for 3D overlay
    this.startLoop();
  }

  private startLoop(): void {
    const loop = (): void => {
      this.threeRenderer.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
    }
    if (this.threeRenderer) {
      this.threeRenderer.destroy();
    }
  }
}
