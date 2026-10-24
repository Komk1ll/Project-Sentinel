import type { Vector2D } from '@/types';

export const DISTRICT_SIZE = 32;

/** Keeps continuous player coordinates inside the playable district. */
export function clampDistrictPosition(position: Vector2D): Vector2D {
  return {
    x: Math.min(DISTRICT_SIZE - 1, Math.max(0, position.x)),
    y: Math.min(DISTRICT_SIZE - 1, Math.max(0, position.y)),
  };
}
