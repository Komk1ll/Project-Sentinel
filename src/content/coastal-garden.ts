import { COAST_PATH, ISLAND_CENTER, coastRadius, isIslandLand } from '@content/island';
import { RETAINING_WALLS, islandElevation } from '@content/island-elevation';
import type { TownPosition } from '@game/systems/town-world';

export interface GardenWalk {
  readonly points: readonly TownPosition[];
  readonly width: number;
  readonly closed: boolean;
}

export interface RestingArea {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

/** Smooth Catmull-Rom spline interpolation through key route waypoints. */
function smoothSpline(waypoints: readonly TownPosition[], segmentsPerHop = 6, closed = false): TownPosition[] {
  const result: TownPosition[] = [];
  const n = waypoints.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p1 = waypoints[i]!;
    const p2 = closed ? waypoints[(i + 1) % n]! : waypoints[i + 1]!;
    const p0 = closed ? waypoints[(i - 1 + n) % n]! : (i === 0 ? { x: 2 * p1.x - p2.x, z: 2 * p1.z - p2.z } : waypoints[i - 1]!);
    const p3 = closed ? waypoints[(i + 2) % n]! : (i + 2 < n ? waypoints[i + 2]! : { x: 2 * p2.x - p1.x, z: 2 * p2.z - p1.z });
    for (let s = 0; s < segmentsPerHop; s++) {
      const t = s / segmentsPerHop;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (
        2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );
      const z = 0.5 * (
        2 * p1.z +
        (-p0.z + p2.z) * t +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
      );
      result.push({ x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) });
    }
  }
  if (!closed) {
    const last = waypoints[n - 1]!;
    result.push({ x: last.x, z: last.z });
  }
  return result;
}

// 1. Central Promenade & Mill Ascent Walk (connects town at x: 64 to mill terrace at x: 86)
const MILL_ASCENT_WAYPOINTS: readonly TownPosition[] = [
  { x: 64, z: 24 },
  { x: 69, z: 24 },
  { x: 74, z: 23 },
  { x: 78, z: 21 },
  { x: 82, z: 19 },
  { x: 86, z: 18.5 },
  { x: 91.5, z: 22 },
  { x: 91.5, z: 26 },
  { x: 91.5, z: 30.5 },
  { x: 86, z: 30.5 },
  { x: 80.5, z: 30.5 },
  { x: 76.5, z: 25 },
  { x: 70, z: 24 },
];

// 2. Belvedere Overlook Ridge Walk (sweeps from mill east side to the scenic ocean overlook)
const BELVEDERE_WAYPOINTS: readonly TownPosition[] = [
  { x: 91.5, z: 30.5 },
  { x: 94, z: 34 },
  { x: 96, z: 38 }, // Belvedere Resting Plaza
  { x: 97.3, z: 42.5 }, // Smooth curve east of garden bush
  { x: 97.2, z: 47 }, // Passage through retaining wall gap
  { x: 98.0, z: 52 }, // Scenic descent east of pond retaining wall
  { x: 98.0, z: 56 }, // Approach clear of northern rail tip
  { x: 96.0, z: 58 }, // Bridge east deck entrance
  { x: 88.0, z: 58 }, // Bridge center
];

// 3. Pond Shore & Bridge Walk (loops along pond banks, crossing bridge at x: 88, z: 58)
const POND_SHORE_WAYPOINTS: readonly TownPosition[] = [
  { x: 64, z: 36 },
  { x: 69, z: 38 },
  { x: 74, z: 43 },
  { x: 77, z: 48 },
  { x: 76.5, z: 54 },
  { x: 79.2, z: 56.0 }, // Clear of bush at [78, 58] and rail at 79.9
  { x: 79.5, z: 58.0 }, // Bridge deck centerline entrance
  { x: 84, z: 58 },
  { x: 88, z: 58 }, // Bridge center
  { x: 94, z: 58 },
  { x: 96, z: 58 }, // Bridge East exit
  { x: 98, z: 54 },
  { x: 96, z: 48 },
];

// 4. Northern Meadow Walk (connects north town exit x: 64, z: 16 to the mill hill and north garden)
const NORTH_MEADOW_WAYPOINTS: readonly TownPosition[] = [
  { x: 64, z: 16 },
  { x: 69, z: 17 },
  { x: 73, z: 19 },
  { x: 76.5, z: 21.5 }, // Terrace entrance gap
  { x: 82, z: 16 }, // Mill Hill Terrace Rest plaza
  { x: 88, z: 15 }, // Northern mill slope
  { x: 93, z: 16 },
  { x: 95, z: 21 },
  { x: 91.5, z: 26 }, // Joins mill promenade
];

/**
 * Connected, naturally curved walks replacing earlier crude geometric ellipses.
 * Paths link town approaches, the mill terrace, the scenic belvedere overlook,
 * the willow pond shore, and the walkable bridge.
 */
export const GARDEN_WALKS: readonly GardenWalk[] = [
  { points: smoothSpline(MILL_ASCENT_WAYPOINTS, 6, true), width: 1.9, closed: true },
  { points: smoothSpline(BELVEDERE_WAYPOINTS, 6, false), width: 1.85, closed: false },
  { points: smoothSpline(POND_SHORE_WAYPOINTS, 6, false), width: 1.9, closed: false },
  { points: smoothSpline(NORTH_MEADOW_WAYPOINTS, 6, false), width: 1.8, closed: false },
];

export function segmentDistance(p: TownPosition, a: TownPosition, b: TownPosition): number {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length)) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

export function onGardenWalk(p: TownPosition, clearance = 0): boolean {
  return GARDEN_WALKS.some(w => w.points.some((a, i) => {
    const b = w.points[i + 1] ?? (w.closed ? w.points[0] : undefined);
    return b !== undefined && segmentDistance(p, a, b) < w.width / 2 + clearance;
  }));
}

/** Small paved resting pockets along scenic path viewpoints. */
export const RESTING_AREAS: readonly RestingArea[] = [
  { id: 'belvedere', name: 'Belvedere Ocean Overlook', x: 96, z: 38, radius: 3.2 },
  { id: 'mill-rest', name: 'Mill Hill Terrace Rest', x: 82, z: 16, radius: 2.4 },
  { id: 'pond-rest', name: 'Willow Pond Shore Rest', x: 80, z: 50, radius: 2.5 },
];

export const RESTING_BENCHES = [
  { x: 98.2, z: 36.5, rotation: -Math.PI / 2 },
  { x: 98.2, z: 39.5, rotation: -Math.PI / 2 },
  { x: 80.0, z: 15.0, rotation: 0.3 },
  { x: 81.2, z: 48.5, rotation: -0.6 },
];

export const GARDEN_BRIDGE = { x: 88, z: 58, width: 17, depth: 2.6 } as const;
export function onGardenBridge(p: TownPosition, inset = 0.3): boolean {
  return Math.abs(p.x - 88) <= 8.5 - inset && Math.abs(p.z - 58) <= 1.3 - inset;
}
export function gardenBridgeHeight(p: TownPosition): number {
  return onGardenBridge(p, 0) ? Math.min(0.24, (8.5 - Math.abs(p.x - 88)) * 0.12) : 0;
}
export const BRIDGE_RAILS = [-1, 1].map(side => ({ x: 88, z: 58 + side * 1.18, width: 16.2, depth: 0.075 }));

export const ORCHARD_FENCES = [
  ...[2, 12.2].flatMap(x => [52.5, 59.5].map(z => ({ x, z, rotation: Math.PI / 2 }))),
  ...[4.2, 11.2].flatMap(x => [51.6, 61.7].map(z => ({ x, z, rotation: 0 }))),
];

export const SEAWALLS = COAST_PATH.flatMap((p, i) => {
  const b = COAST_PATH[(i + 1) % COAST_PATH.length]!;
  const length = Math.hypot(b.x - p.x, b.z - p.z);
  const count = Math.floor(length / 2.1);
  const dx = b.x - p.x, dz = b.z - p.z;
  return Array.from({ length: count }, (_, j) => {
    const t = (j + 0.5) / count, x = p.x + dx * t, z = p.z + dz * t;
    const r = Math.hypot(x - ISLAND_CENTER.x, z - ISLAND_CENTER.z);
    return { x: x + (x - ISLAND_CENTER.x) / r * 2.2, z: z + (z - ISLAND_CENTER.z) / r * 2.2, rotation: -Math.atan2(dz, dx) };
  });
}).filter(p => (p.x < 4 || p.z > 65) && !(p.x > 41 && p.x < 76 && p.z > 62)
  && ![16, 32, 48].some(c => p.x < 0 && Math.abs(p.z - c) < 2.5));

/**
 * Solid obstacles with strict rotated bounding boxes (AABB) taking complete
 * rotated dimensions into account to ensure walking corridors and building entries
 * are 100% collision-free.
 */
export const GARDEN_OBSTACLES = [
  ...BRIDGE_RAILS,
  ...ORCHARD_FENCES.map(p => ({
    ...p,
    width: Math.abs(Math.cos(p.rotation)) * 2 + Math.abs(Math.sin(p.rotation)) * 0.1,
    depth: Math.abs(Math.sin(p.rotation)) * 2 + Math.abs(Math.cos(p.rotation)) * 0.1,
  })),
  ...SEAWALLS.map(p => ({
    ...p,
    width: Math.abs(Math.cos(p.rotation)) * 2 + Math.abs(Math.sin(p.rotation)) * 0.53,
    depth: Math.abs(Math.sin(p.rotation)) * 2 + Math.abs(Math.cos(p.rotation)) * 0.53,
  })),
  ...RETAINING_WALLS.map(w => ({
    x: w.x,
    z: w.z,
    rotation: w.rotation,
    width: Math.abs(Math.sin(w.rotation)) * w.depth + Math.abs(Math.cos(w.rotation)) * w.width,
    depth: Math.abs(Math.cos(w.rotation)) * w.depth + Math.abs(Math.sin(w.rotation)) * w.width,
  })),
  ...RESTING_BENCHES.map(b => ({
    x: b.x,
    z: b.z,
    rotation: b.rotation,
    width: Math.abs(Math.cos(b.rotation)) * 1.6 + Math.abs(Math.sin(b.rotation)) * 0.55,
    depth: Math.abs(Math.sin(b.rotation)) * 1.6 + Math.abs(Math.cos(b.rotation)) * 0.55,
  })),
];

/**
 * Diversified coastal rock headlands with multi-tiered heights, staggered scales,
 * and varying rotations. Open sandy coves and the boat channel remain fully unobstructed.
 */
export const COAST_CLIFFS = [
  // Headland 1: North-East Promontory
  [-2.25, -1.05, 26, 1.01],
  // Headland 2: East & South-East Ocean Cliffs (multi-tiered)
  [-0.65, 0.60, 32, 1.012],
  // Headland 3: South-West Rocks
  [1.95, 2.22, 10, 1.008],
].flatMap(([start, end, count, radiusMultiplier]) =>
  Array.from({ length: count! }, (_, i) => {
    const a = start! + (end! - start!) * (i + 0.5) / count!;
    const r = coastRadius(a) * (radiusMultiplier! + 0.012 * Math.sin(i * 2.3));
    const x = ISLAND_CENTER.x + Math.cos(a) * r;
    const z = ISLAND_CENTER.z + Math.sin(a) * r;
    const groundElevation = islandElevation(x, z);
    const scale = 0.88 + ((i * 7) % 6) * 0.14 + Math.sin(i * 1.6) * 0.12;
    const y = groundElevation - 0.28 + Math.sin(i * 1.7) * 0.16;
    return {
      x,
      z,
      rotation: -a - Math.PI / 2 + (i % 3 - 0.5) * 0.25,
      scale,
      y,
    };
  })
).filter(p => !(p.x > 36 && p.x < 78 && p.z > 66));

export const GARDEN_TREES = [
  [68, 2], [70, 8], [94, 6], [96, 10], [94, 38], [100, 42], [78, 43], [74, 56], [95, 68]
]
  .map(([x, z], i) => ({ x: x!, z: z!, rotation: i * 2.4, scale: 0.85 + (i % 3) * 0.12 }))
  .filter(p => isIslandLand(p)
    && !onGardenWalk(p, 1.4)
    && !RETAINING_WALLS.some(w => Math.hypot(p.x - w.x, p.z - w.z) < 2.0)
    && COAST_PATH.every((q, i) => segmentDistance(p, q, COAST_PATH[(i + 1) % COAST_PATH.length]!) > 2.8));

export const GARDEN_TREE_OBSTACLES = GARDEN_TREES.map(p => ({
  x: p.x,
  z: p.z,
  width: 0.4 * p.scale,
  depth: 0.4 * p.scale,
}));
