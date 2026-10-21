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
export const OUTDOOR_OBSTACLES: readonly TownObstacle[] = [
  ...TOWN_CARS.map((car) => ({
    x: car.x,
    z: car.z,
    width: Math.abs(Math.sin(car.rotation)) > 0.5 ? 2.7 : 1.3,
    depth: Math.abs(Math.sin(car.rotation)) > 0.5 ? 1.3 : 2.7,
  })),
  { x: 24, z: 24, width: 1.8, depth: 1.8 },
];
