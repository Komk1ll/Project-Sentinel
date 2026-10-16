import type { Vector2D } from '../types';

/**
 * 2:1 Isometric coordinate transformations
 * World unit: 1 tile = 2m x 2m
 * Screen projection: 128px width x 64px height
 */
export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 64;
export const WORLD_TILE_METERS = 2;

/**
 * Converts world grid coordinates (meters or tile units) to isometric screen coordinates.
 */
export function gridToIso(gridX: number, gridY: number): Vector2D {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2),
  };
}

/**
 * Converts screen coordinates back to grid coordinates.
 */
export function isoToGrid(screenX: number, screenY: number): Vector2D {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  return {
    x: Math.floor((screenX / halfW + screenY / halfH) / 2),
    y: Math.floor((screenY / halfH - screenX / halfW) / 2),
  };
}

/**
 * Calculates depth / z-order for isometric sorting.
 */
export function calculateIsometricDepth(gridX: number, gridY: number, elevation = 0): number {
  return (gridX + gridY) * 100 + elevation;
}
