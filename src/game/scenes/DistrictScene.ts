import Phaser from 'phaser';
import {
  gridToIso,
  screenToGridDelta,
  getIsometricDirectionFromScreen,
} from '../../utils/isometric';
import { ThreeRenderer } from '../render/ThreeRenderer';
import { PixelArtModelInstance } from '../render/PixelArtModelInstance';

export class DistrictScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private playerGridPos = { x: 4, y: 4 };
  private playerSpeed = 0.08; // Grid units per frame
  private isMoving = false;

  private threeRenderer?: ThreeRenderer;
  private heroModel?: PixelArtModelInstance;
  private robotModel?: PixelArtModelInstance;

  public getHeroModel(): PixelArtModelInstance | undefined {
    return this.heroModel;
  }

  public getRobotModel(): PixelArtModelInstance | undefined {
    return this.robotModel;
  }

  constructor() {
    super({ key: 'DistrictScene' });
  }

  public create(): void {
    this.threeRenderer = this.registry.get('threeRenderer') as ThreeRenderer | undefined;

    // 1. Render Isometric Ground Grid (District Area)
    const gridSize = 12;
    const originX = this.cameras.main.width / 2;
    const originY = 160;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const iso = gridToIso(x, y);
        const tile = this.add.image(originX + iso.x, originY + iso.y, 'iso_tile_default');
        tile.setOrigin(0.5, 0.5);
        tile.setDepth((x + y) * 10);
      }
    }

    // 2. Setup Player Sprite (subtle guide shadow under 3D model)
    const initialIso = gridToIso(this.playerGridPos.x, this.playerGridPos.y);
    this.player = this.add.sprite(originX + initialIso.x, originY + initialIso.y - 16, 'player_placeholder');
    this.player.setOrigin(0.5, 0.8);
    this.player.setDepth(1000);
    this.player.setAlpha(0.25);

    // 3. Setup Input Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Camera follow player with smooth lerp
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 4. Load & Spawn 3D GLB Pixel-Art Models
    void this.init3DModels();
  }

  private async init3DModels(): Promise<void> {
    if (!this.threeRenderer) return;

    try {
      // Spawn Hero model with stepped pixel-art animations (idle 4 fps, walk 10 fps)
      this.heroModel = await this.threeRenderer.spawnModel('./assets/models/character_hero.glb', {
        position: this.playerGridPos,
        elevation: 0,
        facing: 'SE',
        defaultAnimation: 'idle',
        fps: 4,
        stepped: true,
        scale: 1.0,
      });

      // Spawn Sentinel Robot model with stepped pixel-art animations (idle 2 fps, move 8 fps, scan 6 fps)
      this.robotModel = await this.threeRenderer.spawnModel('./assets/models/sentinel_robot.glb', {
        position: { x: 7, y: 5 },
        elevation: 0,
        facing: 'NW',
        defaultAnimation: 'scan',
        fps: 6,
        stepped: true,
        scale: 1.1,
      });
    } catch (err) {
      console.warn('[DistrictScene] 3D models could not be loaded, using 2D fallback:', err);
    }
  }

  public override update(): void {
    let screenX = 0;
    let screenY = 0;

    if (this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown) {
      screenX -= 1;
    }
    if (this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown) {
      screenX += 1;
    }
    if (this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown) {
      screenY -= 1;
    }
    if (this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown) {
      screenY += 1;
    }

    const movingNow = screenX !== 0 || screenY !== 0;

    if (movingNow) {
      // Convert screen-relative input into normalized isometric grid delta
      const gridDelta = screenToGridDelta(screenX, screenY, this.playerSpeed);

      this.playerGridPos.x = Phaser.Math.Clamp(this.playerGridPos.x + gridDelta.x, 0, 11);
      this.playerGridPos.y = Phaser.Math.Clamp(this.playerGridPos.y + gridDelta.y, 0, 11);

      const originX = this.cameras.main.width / 2;
      const originY = 160;
      const iso = gridToIso(this.playerGridPos.x, this.playerGridPos.y);

      this.player.setPosition(originX + iso.x, originY + iso.y - 16);
      this.player.setDepth((this.playerGridPos.x + this.playerGridPos.y) * 10 + 5);

      if (this.heroModel) {
        this.heroModel.setGridPosition(this.playerGridPos.x, this.playerGridPos.y);
        const direction = getIsometricDirectionFromScreen(screenX, screenY);
        this.heroModel.setFacingDirection(direction);

        if (!this.isMoving) {
          this.heroModel.animation.crossFadeTo('walk', 0.15, { fps: 10, stepped: true });
        }
      }

      this.isMoving = true;
    } else {
      if (this.isMoving && this.heroModel) {
        this.heroModel.animation.crossFadeTo('idle', 0.2, { fps: 4, stepped: true });
      }
      this.isMoving = false;
    }
  }
}
