import { CAR_SIZE, STREET_OBSTACLES } from '@content/street-details';
export const TOWN_CARS = [
  { x: 17.25, z: 7.5, color: 0x967b57, rotation: 0 },
  { x: 46.75, z: 23, color: 0x536f72, rotation: Math.PI },
  { x: 39, z: 49.25, color: 0x8d4e3d, rotation: Math.PI / 2 },
  { x: 7, z: 33.25, color: 0xa1a39a, rotation: Math.PI / 2 },
  { x: 49.25, z: 57, color: 0x566b59, rotation: 0 },
] as const;

export interface TownObstacle {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
}

/** Ground footprints shared by presentation and outdoor collision. */
export const LEGACY_OUTDOOR_OBSTACLES: readonly TownObstacle[] = [
  ...TOWN_CARS.map((car) => ({
    x: car.x,
    z: car.z,
    width: Math.abs(Math.sin(car.rotation)) > 0.5 ? 2.7 : 1.3,
    depth: Math.abs(Math.sin(car.rotation)) > 0.5 ? 1.3 : 2.7,
  })),
  { x: 24, z: 24, width: 1.8, depth: 1.8 },
];

export const TOWN_TREES = [
  [20,20], [28,20], [20,28], [28,28],
  [3,36], [12,36], [3,44], [12,44],
  [4,52], [8,52], [12,52], [4,60], [8,60], [12,60],
  [52,20], [56,20], [60,20], [52,28], [56,28], [60,28],
  [35,52], [45,52], [35,60], [45,60],
  [19,36], [29,36], [35,36], [46,36], [3,19], [61,44],
].map(([x,z], index) => ({ x: x!, z: z!, scale: index % 3 === 0 ? .85 : 1, rotation: index*1.7 }));

export const TOWN_BENCHES = [
  [21,26,0], [27,22,Math.PI], [35,45,0],
  [5,42,0], [11,38,Math.PI], [54,26,0],
  [38,53,Math.PI], [42,59,0], [6,58,0],
].map(([x,z,rotation]) => ({ x: x!, z: z!, rotation: rotation! }));

export const TOWN_PLANTERS = [
  { x: 37, z: 56, width: 1.4, depth: 1.4 },
  { x: 43, z: 56, width: 1.4, depth: 1.4 },
];

/** Only the trunk blocks walking; the canopy remains an overhead visual. */
export const PRE_EVENING_OUTDOOR_OBSTACLES: readonly TownObstacle[] = [
  ...LEGACY_OUTDOOR_OBSTACLES,
  ...TOWN_TREES.map(tree => ({ x: tree.x, z: tree.z, width: .4*tree.scale, depth: .4*tree.scale })),
  ...TOWN_BENCHES.map(bench => ({ x: bench.x, z: bench.z,
    width: Math.abs(Math.sin(bench.rotation)) > .5 ? .55 : 1.6,
    depth: Math.abs(Math.sin(bench.rotation)) > .5 ? 1.6 : .55 })),
  ...TOWN_PLANTERS,
];

/** Current scenery keeps the historical footprint list frozen for save migration. */
export const OUTDOOR_OBSTACLES: readonly TownObstacle[] = [
  ...PRE_EVENING_OUTDOOR_OBSTACLES.slice(TOWN_CARS.length),
  ...TOWN_CARS.map(car=>({x:car.x,z:car.z,
    width:Math.abs(Math.sin(car.rotation))>.5?CAR_SIZE.depth:CAR_SIZE.width,
    depth:Math.abs(Math.sin(car.rotation))>.5?CAR_SIZE.width:CAR_SIZE.depth})),
  ...STREET_OBSTACLES,
];
