import Phaser from 'phaser';
import { gridToIso } from '@utils/isometric';
import { clampDistrictPosition, DISTRICT_SIZE } from '@game/systems/district';

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
  private readonly mapOrigin = { x: 0, y: 0 };

  constructor() {
    super({ key: 'DistrictScene' });
  }

  public create(): void {
    // 1. Render Isometric Ground Grid (District Area)
    const gridSize = DISTRICT_SIZE;
    const { x: originX, y: originY } = this.mapOrigin;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const iso = gridToIso(x, y);
        const tile = this.add.image(originX + iso.x, originY + iso.y, 'iso_tile_default');
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(-1);
      }
    }

    // 2. Setup Player Sprite
    const initialIso = gridToIso(this.playerGridPos.x, this.playerGridPos.y);
    this.player = this.add.sprite(originX + initialIso.x, originY + initialIso.y - 16, 'player_placeholder');
    this.player.setOrigin(0.5, 0.8);
    this.player.setDepth(1000);

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
  }

  public override update(): void {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left?.isDown || this.wasdKeys.A.isDown) {
      dx -= 1;
    }
    if (this.cursors.right?.isDown || this.wasdKeys.D.isDown) {
      dx += 1;
    }
    if (this.cursors.up?.isDown || this.wasdKeys.W.isDown) {
      dy -= 1;
    }
    if (this.cursors.down?.isDown || this.wasdKeys.S.isDown) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal speed
      const length = Math.hypot(dx, dy);
      const moveX = (dx / length) * this.playerSpeed;
      const moveY = (dy / length) * this.playerSpeed;

      this.playerGridPos = clampDistrictPosition({
        x: this.playerGridPos.x + moveX,
        y: this.playerGridPos.y + moveY,
      });

      const { x: originX, y: originY } = this.mapOrigin;
      const iso = gridToIso(this.playerGridPos.x, this.playerGridPos.y);

      this.player.setPosition(originX + iso.x, originY + iso.y - 16);
      this.player.setDepth((this.playerGridPos.x + this.playerGridPos.y) * 10 + 5);
    }
  }
}
