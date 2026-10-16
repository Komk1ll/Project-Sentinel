import * as THREE from 'three';
import { ModelSkeleton } from './ModelSkeleton';
import { PixelArtAnimationController } from './PixelArtAnimationController';
import { IsometricDirection } from '../../types/models';
import { Vector2D } from '../../types';

export interface ModelInstanceConfig {
  root: THREE.Object3D;
  skeleton: ModelSkeleton;
  animation: PixelArtAnimationController;
  cellScale?: number;
}

/**
 * Converts 2:1 isometric metric grid coordinates (x, y) into Three.js 3D world coordinates.
 * Aligns with the 45° azimuth isometric camera.
 */
export function gridTo3DWorld(
  gridX: number,
  gridY: number,
  elevation = 0,
  cellScale = 2.0
): THREE.Vector3 {
  // Rotate 45 degrees so grid axes align with isometric diagonals
  const halfDiag = (Math.SQRT1_2 * cellScale);
  const worldX = (gridX - gridY) * halfDiag;
  const worldZ = (gridX + gridY) * halfDiag;
  return new THREE.Vector3(worldX, elevation, worldZ);
}

/**
 * Maps an 8-way compass direction to a rotation angle around the 3D Y-axis
 * conforming to the 45° isometric viewpoint.
 */
export function isometricDirectionToAngle(direction: IsometricDirection): number {
  switch (direction) {
    case 'S':
      return 0;
    case 'SE':
      return -Math.PI / 4;
    case 'E':
      return -Math.PI / 2;
    case 'NE':
      return (-3 * Math.PI) / 4;
    case 'N':
      return Math.PI;
    case 'NW':
      return (3 * Math.PI) / 4;
    case 'W':
      return Math.PI / 2;
    case 'SW':
      return Math.PI / 4;
  }
}

/**
 * High-level entity wrapper for a loaded and instantiated 3D GLB model.
 * Bundles scene node, skeleton, animation controller, and isometric transform logic.
 */
export class PixelArtModelInstance {
  public readonly root: THREE.Object3D;
  public readonly skeleton: ModelSkeleton;
  public readonly animation: PixelArtAnimationController;

  private gridPosition: Vector2D = { x: 0, y: 0 };
  private elevation = 0;
  private currentDirection: IsometricDirection = 'S';
  private cellScale: number;
  private isDestroyed = false;

  constructor(config: ModelInstanceConfig) {
    this.root = config.root;
    this.skeleton = config.skeleton;
    this.animation = config.animation;
    this.cellScale = config.cellScale ?? 2.0;
  }

  public setGridPosition(gridX: number, gridY: number, elevation = 0): void {
    this.gridPosition = { x: gridX, y: gridY };
    this.elevation = elevation;
    const worldPos = gridTo3DWorld(gridX, gridY, elevation, this.cellScale);
    this.root.position.copy(worldPos);
  }

  public getGridPosition(): Vector2D {
    return this.gridPosition;
  }

  public getElevation(): number {
    return this.elevation;
  }

  public setFacingDirection(direction: IsometricDirection | number): void {
    if (typeof direction === 'string') {
      this.currentDirection = direction;
      this.root.rotation.y = isometricDirectionToAngle(direction);
    } else {
      this.root.rotation.y = direction;
    }
  }

  public getFacingDirection(): IsometricDirection {
    return this.currentDirection;
  }

  public update(deltaTime: number): void {
    if (this.isDestroyed) return;
    this.animation.update(deltaTime);
  }

  public setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  public isVisible(): boolean {
    return this.root.visible;
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.animation.dispose();
    this.skeleton.dispose();

    // Dispose all child meshes, geometries and materials
    this.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
