import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Generate simple geometric graphics fallback placeholder for isometric tiles
    const tileGraphic = this.make.graphics({ x: 0, y: 0 });
    tileGraphic.fillStyle(0x23272d, 1);
    tileGraphic.lineStyle(2, 0x3f4651, 1);

    // Draw 128x64 isometric rhombus tile
    tileGraphic.beginPath();
    tileGraphic.moveTo(64, 0);
    tileGraphic.lineTo(128, 32);
    tileGraphic.lineTo(64, 64);
    tileGraphic.lineTo(0, 32);
    tileGraphic.closePath();
    tileGraphic.fillPath();
    tileGraphic.strokePath();
    tileGraphic.generateTexture('iso_tile_default', 128, 64);

    // Draw player placeholder sprite
    const playerGraphic = this.make.graphics({ x: 0, y: 0 });
    playerGraphic.fillStyle(0x38bdf8, 1);
    playerGraphic.fillCircle(16, 16, 14);
    playerGraphic.lineStyle(2, 0xffffff, 1);
    playerGraphic.strokeCircle(16, 16, 14);
    playerGraphic.generateTexture('player_placeholder', 32, 32);
  }

  public create(): void {
    this.scene.start('DioramaScene');
  }
}
