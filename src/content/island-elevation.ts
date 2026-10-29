import type { TownPosition } from '@game/systems/town-world';
import { ISLAND_CENTER, coastRadius } from '@content/island';

export interface RetainingWall {
  readonly x: number;
  readonly z: number;
  readonly rotation: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/**
 * Continuous analytical elevation model for the island terrain.
 * Town core (x <= 64, z <= 64) remains flat at y = 0 for building foundations and doorways.
 * Eastern park features gentle rolling slopes and distinct terraces around the Mill,
 * pond basin, and eastern belvedere overlook.
 */
export function islandElevation(x: number, z: number): number {
  // Town core and western district remain flat at y = 0
  if (x <= 64 && z <= 64) {
    return 0;
  }

  // Western shore and southern harbour apron remain flat
  if (x <= 60 || (z >= 68 && x <= 76)) {
    return 0;
  }

  let elevation = 0;

  // 1. Mill Terrace (centered around x: 86, z: 24)
  // Peak elevation ~0.72m with a smooth plateau
  const dMillX = x - 86;
  const dMillZ = z - 24;
  const millDist = Math.hypot(dMillX / 14, dMillZ / 11);
  if (millDist < 1) {
    const t = 1 - millDist * millDist * (3 - 2 * millDist);
    elevation += 0.72 * t;
  }

  // 2. Eastern Belvedere Ridge / Overlook (x: 92..102, z: 28..48)
  // Scenic elevation ~0.55m overlooking the sea cliffs
  const dRidgeX = x - 96;
  const dRidgeZ = z - 38;
  const ridgeDist = Math.hypot(dRidgeX / 10, dRidgeZ / 14);
  if (ridgeDist < 1) {
    const t = 1 - ridgeDist * ridgeDist * (3 - 2 * ridgeDist);
    elevation += 0.55 * t;
  }

  // 3. North-Eastern Terrace (x: 76..92, z: 4..16)
  // Gentle orchard & upper garden terrace ~0.40m
  const dNorthX = x - 82;
  const dNorthZ = z - 8;
  const northDist = Math.hypot(dNorthX / 12, dNorthZ / 9);
  if (northDist < 1) {
    const t = 1 - northDist * northDist * (3 - 2 * northDist);
    elevation += 0.40 * t;
  }

  // 4. Central Garden Slope (smooth ramp connecting town x: 64 to the eastern terrace x: 78)
  if (x > 64 && x < 78 && z >= 12 && z <= 52) {
    const rampX = (x - 64) / 14;
    const smoothRamp = rampX * rampX * (3 - 2 * rampX);
    const zWeight = 1 - Math.abs((z - 32) / 22);
    elevation = Math.max(elevation, 0.35 * smoothRamp * Math.max(0, zWeight));
  }

  // 5. Pond Depression (pond center at x: 88, z: 58)
  // The pond banks gently slope down to the water line (~0.12m)
  const dPondX = x - 88;
  const dPondZ = z - 58;
  const pondDist = Math.hypot(dPondX / 13, dPondZ / 8);
  if (pondDist < 1) {
    const pondBowl = (1 - pondDist) * 0.32;
    elevation = Math.max(0.08, elevation - pondBowl);
  }

  // Shore slope attenuation: taper to sea level as we approach the coast
  const dxCenter = x - ISLAND_CENTER.x;
  const dzCenter = z - ISLAND_CENTER.z;
  const angle = Math.atan2(dzCenter, dxCenter);
  const radius = coastRadius(angle);
  const distCenter = Math.hypot(dxCenter, dzCenter);
  const landFraction = distCenter / radius;

  if (landFraction > 0.88) {
    const taper = Math.max(0, 1 - (landFraction - 0.88) / 0.08);
    elevation *= taper;
  }

  return Math.max(0, Number(elevation.toFixed(4)));
}

/**
 * Returns surface altitude for any point, taking into account land elevation,
 * bridge crossing, and interior floor level.
 */
export function getSurfaceAltitude(point: TownPosition, isInterior = false): number {
  if (isInterior) return 0;
  return islandElevation(point.x, point.z);
}

/**
 * Stone retaining walls structuring the terraces in the eastern park.
 * Placed along terrace steps with gaps left for walkable paths.
 */
export const RETAINING_WALLS: readonly RetainingWall[] = [
  // Upper Mill Terrace western border (with wide opening for Mill Ascent Walk)
  { x: 76.5, z: 14.5, rotation: 0.15, width: 0.5, depth: 7.0, height: 0.65 },
  // Upper Mill Terrace southern slope (clear of walker at z:30..34 and neighbour at z:38..40)
  { x: 84.5, z: 36.0, rotation: 1.55, width: 0.5, depth: 6.0, height: 0.65 },

  // Eastern Overlook Terrace southern border (gap for path to resting plaza, clear of coastal promenade)
  { x: 92.0, z: 46.5, rotation: 1.45, width: 0.5, depth: 6.0, height: 0.55 },

  // Pond northern bank terrace edge
  { x: 83.5, z: 51.5, rotation: 0.35, width: 0.5, depth: 5.5, height: 0.40 },
  { x: 93.5, z: 51.5, rotation: -0.30, width: 0.5, depth: 5.5, height: 0.40 },
];
