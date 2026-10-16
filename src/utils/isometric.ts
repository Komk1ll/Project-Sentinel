import type { Vector2D, IsometricDirection } from '../types';

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

/**
 * Determines the 8-way isometric direction from a grid motion delta vector (dx, dy).
 * Applies an epsilon threshold to prevent floating-point rounding jitter from
 * biasing diagonal headings.
 */
export function getIsometricDirectionFromDelta(
  dx: number,
  dy: number,
  epsilon = 1e-4
): IsometricDirection {
  const x = Math.abs(dx) < epsilon ? 0 : dx;
  const y = Math.abs(dy) < epsilon ? 0 : dy;

  if (x > 0 && y > 0) return 'S';
  if (x < 0 && y < 0) return 'N';
  if (x > 0 && y < 0) return 'E';
  if (x < 0 && y > 0) return 'W';
  if (x > 0) return 'SE';
  if (x < 0) return 'NW';
  if (y > 0) return 'SW';
  if (y < 0) return 'NE';
  return 'S';
}

/**
 * Converts a 2D screen direction vector (e.g. from WASD or arrow inputs) into
 * an isometric grid delta vector.
 *
 * Screen coordinate space:
 * - W / Up: (0, -1) -> Grid (-1/√2, -1/√2) [North, moves Up on screen]
 * - S / Down: (0, 1) -> Grid (+1/√2, +1/√2) [South, moves Down on screen]
 * - A / Left: (-1, 0) -> Grid (-1/√2, +1/√2) [West, moves Left on screen]
 * - D / Right: (1, 0) -> Grid (+1/√2, -1/√2) [East, moves Right on screen]
 * - W+D / Up-Right: (1, -1) -> Grid (0, -1) [North-East, moves Up-Right on screen]
 * - W+A / Up-Left: (-1, -1) -> Grid (-1, 0) [North-West, moves Up-Left on screen]
 * - S+D / Down-Right: (1, 1) -> Grid (1, 0) [South-East, moves Down-Right on screen]
 * - S+A / Down-Left: (-1, 1) -> Grid (0, 1) [South-West, moves Down-Left on screen]
 *
 * Diagonal vector is normalized so movement speed does not increase when
 * traveling diagonally, satisfying the game design specification:
 * "WASD и стрелки перемещают персонажа относительно экрана; диагональный вектор нормализуется, скорость не увеличивается".
 */
export function screenToGridDelta(screenX: number, screenY: number, speed = 1): Vector2D {
  if (screenX === 0 && screenY === 0) {
    return { x: 0, y: 0 };
  }

  const length = Math.hypot(screenX, screenY);
  const normX = screenX / length;
  const normY = screenY / length;

  // In 2:1 isometric projection:
  // screenX = (gridX - gridY) * (W/2)
  // screenY = (gridX + gridY) * (H/2)
  // Inverting and scaling by speed / SQRT2 guarantees constant speed magnitude:
  const factor = speed / Math.SQRT2;
  const gridDx = (normX + normY) * factor;
  const gridDy = (-normX + normY) * factor;

  return {
    x: Math.abs(gridDx) < 1e-9 ? 0 : gridDx,
    y: Math.abs(gridDy) < 1e-9 ? 0 : gridDy,
  };
}

/**
 * Resolves the 8-way isometric direction from screen input (WASD / cursor vector).
 * Screen axes: +X is right, -X is left, +Y is down, -Y is up.
 *
 * Returns:
 * - Up: 'N'
 * - Down: 'S'
 * - Left: 'W'
 * - Right: 'E'
 * - Up-Right: 'NE'
 * - Up-Left: 'NW'
 * - Down-Right: 'SE'
 * - Down-Left: 'SW'
 */
export function getIsometricDirectionFromScreen(
  screenX: number,
  screenY: number
): IsometricDirection {
  if (screenX === 0 && screenY === 0) {
    return 'S';
  }

  // Calculate angle in screen space: 0 = East, PI/2 = South, PI = West, -PI/2 = North
  const angle = Math.atan2(screenY, screenX);
  const octant = Math.round(angle / (Math.PI / 4));

  switch (octant) {
    case 0:
      return 'E';
    case 1:
      return 'SE';
    case 2:
      return 'S';
    case 3:
      return 'SW';
    case 4:
    case -4:
      return 'W';
    case -3:
      return 'NW';
    case -2:
      return 'N';
    case -1:
      return 'NE';
    default:
      return 'S';
  }
}

