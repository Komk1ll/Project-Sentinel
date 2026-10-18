/**
 * Project Sentinel - DioramaScene
 * Unified isometric diorama scene combining Phaser 3 (2D input, tile grid, guide shadows)
 * and Three.js (3D GLB model rendering, stepped animation, and dynamic lighting).
 */

import Phaser from 'phaser';
import {
  gridToIso,
  screenToGridDelta,
  getIsometricDirectionFromScreen,
} from '../../utils/isometric';
import type { Vector2D } from '../../types';
import type { IsometricDirection } from '../../types/models';
import type { DioramaZoneId, ZoneDescriptor, ZoneEntityDescriptor } from '../../types/campaign';
import { ThreeRenderer } from '../render/ThreeRenderer';
import { PixelArtModelInstance, gridTo3DWorld } from '../render/PixelArtModelInstance';
import { DioramaManager } from '../systems/DioramaManager';

export interface ProximityPromptEvent {
  entity: ZoneEntityDescriptor;
  distance: number;
}

export class DioramaScene extends Phaser.Scene {
  private dioramaManager!: DioramaManager;
  private threeRenderer?: ThreeRenderer;

  private tileSprites: Phaser.GameObjects.Image[] = [];
  private playerShadow!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private playerGridPos: Vector2D = { x: 2, y: 3 };
  private playerSpeed = 0.08; // Grid units per frame
  private isMoving = false;

  private heroModel?: PixelArtModelInstance;
  private entityModelMap: Map<string, PixelArtModelInstance> = new Map();
  private activeZoneDescriptor?: ZoneDescriptor;
  private activeProximityEntityId: string | null = null;
  private zoneLoadGeneration: number = 0;

  constructor(dioramaManager?: DioramaManager) {
    super({ key: 'DioramaScene' });
    if (dioramaManager) {
      this.dioramaManager = dioramaManager;
    }
  }

  public getDioramaManager(): DioramaManager {
    return this.dioramaManager;
  }

  public getHeroModel(): PixelArtModelInstance | undefined {
    return this.heroModel;
  }

  public getEntityModel(entityId: string): PixelArtModelInstance | undefined {
    return this.entityModelMap.get(entityId);
  }

  public getPlayerGridPosition(): Vector2D {
    return { ...this.playerGridPos };
  }

  public setPlayerGridPosition(x: number, y: number): void {
    this.playerGridPos = { x, y };
    this.updatePlayerVisualPosition();
  }

  public create(): void {
    // 1. Resolve or initialize DioramaManager & ThreeRenderer
    if (!this.dioramaManager) {
      const regManager = this.registry.get('dioramaManager') as DioramaManager | undefined;
      this.dioramaManager = regManager ?? new DioramaManager();
    }

    this.threeRenderer = this.registry.get('threeRenderer') as ThreeRenderer | undefined;
    if (this.threeRenderer) {
      this.dioramaManager.setThreeRenderer(this.threeRenderer);
    }

    // 2. Setup Guide Shadow Sprite
    const originX = this.cameras.main.width / 2;
    const originY = 160;
    this.playerShadow = this.add.sprite(originX, originY, 'player_placeholder');
    this.playerShadow.setOrigin(0.5, 0.8);
    this.playerShadow.setDepth(1000);
    this.playerShadow.setAlpha(0.25);

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
    this.cameras.main.startFollow(this.playerShadow, true, 0.08, 0.08);

    // 4. Subscribe to DioramaManager zone changes
    this.dioramaManager.onZoneChange((zoneId, descriptor) => {
      void this.renderZone(zoneId, descriptor);
    });

    // Initial zone render
    const initialDesc = this.dioramaManager.getActiveZoneDescriptor();
    void this.renderZone(this.dioramaManager.getActiveZone(), initialDesc);
  }

  /**
   * Rebuilds the Phaser 2D isometric grid and Three.js 3D entity models for the zone.
   */
  public async renderZone(zoneId: DioramaZoneId, descriptor: ZoneDescriptor): Promise<void> {
    const currentGen = ++this.zoneLoadGeneration;
    this.activeZoneDescriptor = descriptor;

    // 1. Teardown existing Phaser tiles
    for (const tile of this.tileSprites) {
      tile.destroy();
    }
    this.tileSprites = [];

    // 2. Teardown existing Three.js entity models
    if (this.threeRenderer) {
      for (const [, model] of this.entityModelMap) {
        this.threeRenderer.removeModel(model);
      }
      this.entityModelMap.clear();

      if (this.heroModel) {
        this.threeRenderer.removeModel(this.heroModel);
        this.heroModel = undefined;
      }
    }

    // 3. Mount 2:1 Isometric Ground Grid in Phaser
    const originX = this.cameras.main.width / 2;
    const originY = 160;
    const tileTexture = descriptor.tileTextureKey ?? 'iso_tile_default';

    for (let x = 0; x < descriptor.width; x++) {
      for (let y = 0; y < descriptor.height; y++) {
        const iso = gridToIso(x, y);
        const tile = this.add.image(originX + iso.x, originY + iso.y, tileTexture);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth((x + y) * 10);
        this.tileSprites.push(tile);
      }
    }

    // 4. Reset Player Position to Zone Spawn
    this.playerGridPos = {
      x: descriptor.playerSpawn.x,
      y: descriptor.playerSpawn.y,
    };
    this.updatePlayerVisualPosition();

    // 5. Build Environment & Spawn 3D Models in ThreeRenderer
    if (this.threeRenderer) {
      try {
        // Build rich 3D diorama environment
        this.threeRenderer.setEnvironment(descriptor);

        // Frame camera on spawn position immediately
        const spawnWorld = gridTo3DWorld(this.playerGridPos.x, this.playerGridPos.y);
        this.threeRenderer.setCameraTarget(spawnWorld, true);

        // Spawn Hero
        const hero = await this.threeRenderer.spawnModel('./assets/models/character_hero.glb', {
          position: this.playerGridPos,
          elevation: descriptor.playerSpawn.elevation ?? 0,
          facing: (descriptor.playerSpawn.facing as IsometricDirection) ?? 'SE',
          defaultAnimation: 'idle',
          fps: 4,
          stepped: true,
          scale: 1.0,
        });

        if (this.zoneLoadGeneration === currentGen) {
          this.heroModel = hero;
        } else {
          this.threeRenderer.removeModel(hero);
          return;
        }

        // Spawn Zone Entities (Robots, NPCs, Props)
        for (const entity of descriptor.entities) {
          try {
            const entityModel = await this.threeRenderer.spawnModel(entity.modelUrl, {
              position: entity.position,
              elevation: entity.elevation ?? 0,
              facing: (entity.facing as IsometricDirection) ?? 'S',
              defaultAnimation: entity.defaultAnimation ?? 'idle',
              fps: entity.fps ?? 4,
              stepped: entity.stepped ?? true,
              scale: entity.scale ?? 1.0,
            });

            if (this.zoneLoadGeneration === currentGen) {
              this.entityModelMap.set(entity.id, entityModel);
            } else {
              this.threeRenderer.removeModel(entityModel);
            }
          } catch (modelErr) {
            console.warn(`[DioramaScene] Failed to spawn entity ${entity.id}:`, modelErr);
          }
        }
      } catch (err) {
        console.warn(`[DioramaScene] Error loading 3D models for zone ${zoneId}:`, err);
      }
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
      // 1. Convert screen delta to isometric grid delta
      const gridDelta = screenToGridDelta(screenX, screenY, this.playerSpeed);
      const targetX = this.playerGridPos.x + gridDelta.x;
      const targetY = this.playerGridPos.y + gridDelta.y;

      // 2. Collision checking with sliding
      let finalX = this.playerGridPos.x;
      let finalY = this.playerGridPos.y;

      if (this.dioramaManager.isWalkable(targetX, targetY)) {
        finalX = targetX;
        finalY = targetY;
      } else {
        // Attempt horizontal slide
        if (this.dioramaManager.isWalkable(targetX, this.playerGridPos.y)) {
          finalX = targetX;
        }
        // Attempt vertical slide
        if (this.dioramaManager.isWalkable(this.playerGridPos.x, targetY)) {
          finalY = targetY;
        }
      }

      this.playerGridPos = { x: finalX, y: finalY };

      this.updatePlayerVisualPosition();

      // 3. Update 3D Hero Model orientation and animation
      if (this.heroModel) {
        this.heroModel.setGridPosition(this.playerGridPos.x, this.playerGridPos.y);
        const direction = getIsometricDirectionFromScreen(screenX, screenY);
        this.heroModel.setFacingDirection(direction);

        if (!this.isMoving) {
          this.heroModel.animation.crossFadeTo('walk', 0.15, { fps: 10, stepped: true });
        }
      }

      if (this.threeRenderer) {
        const playerWorld = gridTo3DWorld(this.playerGridPos.x, this.playerGridPos.y);
        this.threeRenderer.setCameraTarget(playerWorld);
      }

      this.isMoving = true;
    } else {
      if (this.isMoving && this.heroModel) {
        this.heroModel.animation.crossFadeTo('idle', 0.2, { fps: 4, stepped: true });
      }
      this.isMoving = false;
    }

    // 4. Proximity Trigger Checks
    this.checkProximityTriggers();

    // 5. Portal Trigger Checks
    this.checkPortalTriggers();
  }

  private checkPortalTriggers(): void {
    if (!this.activeZoneDescriptor?.portals) return;
    for (const portal of this.activeZoneDescriptor.portals) {
      const bounds = portal.triggerBounds;
      if (
        this.playerGridPos.x >= bounds.minX &&
        this.playerGridPos.x <= bounds.maxX &&
        this.playerGridPos.y >= bounds.minY &&
        this.playerGridPos.y <= bounds.maxY
      ) {
        void this.dioramaManager.loadZone(portal.targetZoneId);
        break;
      }
    }
  }

  private updatePlayerVisualPosition(): void {
    const originX = this.cameras.main.width / 2;
    const originY = 160;
    const iso = gridToIso(this.playerGridPos.x, this.playerGridPos.y);

    if (this.playerShadow) {
      this.playerShadow.setPosition(originX + iso.x, originY + iso.y - 16);
      this.playerShadow.setDepth((this.playerGridPos.x + this.playerGridPos.y) * 10 + 5);
    }
  }

  private checkProximityTriggers(): void {
    if (!this.activeZoneDescriptor) return;

    let closestEntity: ZoneEntityDescriptor | null = null;
    let minDistance = Infinity;

    for (const entity of this.activeZoneDescriptor.entities) {
      if (!entity.interactive) continue;

      const dx = this.playerGridPos.x - entity.position.x;
      const dy = this.playerGridPos.y - entity.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5 && dist < minDistance) {
        minDistance = dist;
        closestEntity = entity;
      }
    }

    if (closestEntity) {
      if (this.activeProximityEntityId !== closestEntity.id) {
        this.activeProximityEntityId = closestEntity.id;
        this.events.emit('proximityPrompt', {
          entity: closestEntity,
          distance: minDistance,
        } satisfies ProximityPromptEvent);
      }
    } else {
      if (this.activeProximityEntityId !== null) {
        this.activeProximityEntityId = null;
        this.events.emit('proximityLeave');
      }
    }
  }
}
