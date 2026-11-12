import { COASTAL_V1,COASTAL_V2,COASTAL_V3,COASTAL_V4 } from '@content/legacy-coastal-layouts';
import { GARDEN_OBSTACLES,GARDEN_TREE_OBSTACLES,onGardenBridge,onParkCreek } from '@content/coastal-garden';
import { LIGHTHOUSE,HARBOR_OBSTACLES,HARBOR_BOATS,isPierPosition,isNavigableWater } from '@content/harbor';
import { isIslandLand, ISLAND_BOUNDS, MILL } from '@content/island';
import { WILD_TREES, WILD_BENCHES, ISLAND_PONDS } from '@content/town-life';
import { isPreviousPlanetState } from '@game/systems/legacy-planet-state';
import { ROAD_CENTERS, TOWN_SIZE, buildingEntrance, LEGACY_TOWN_BUILDINGS, TOWN_BUILDINGS, TOWN_SPAWN, type TownBuilding } from '@content/town';
import { carFootprint, PARKED_CAR_OBSTACLES, TOWN_CARS, OUTDOOR_OBSTACLES, LEGACY_OUTDOOR_OBSTACLES, type TownObstacle } from '@content/town-props';
import { getInteriorLayout, HOME_LAMP, STAIR_LANDING } from '@content/interiors';

export interface TownPosition {
  readonly x: number;
  readonly z: number;
}

export interface TownWorldState {
  readonly interiorId: string | null;
  readonly interiorFloor?: number;
  readonly position: TownPosition;
  readonly outdoorReturn: TownPosition;
}

const ENTERABLE_BUILDINGS: readonly TownBuilding[] = [...TOWN_BUILDINGS, LIGHTHOUSE];

const PLAYER_RADIUS = 0.3;
const MOVEMENT_SPEED = 5;
const INTERACTION_DISTANCE = 2.4;
const INTERIOR_EXIT: TownPosition = { x: 0, z: 3 };
const SHARED_COLLIDERS = [...TOWN_BUILDINGS, ...WILD_TREES.map(t=>({...t,width:.4*t.scale,depth:.4*t.scale})),
  ...WILD_BENCHES.map(b=>({...b,width:1.6,depth:.55}))];
const EVENING_COLLIDERS=COASTAL_V2;
const HARBOR_V3_COLLIDERS=COASTAL_V3;
const LANDSCAPE_V4_COLLIDERS=COASTAL_V4;
const GARDEN_BASE_COLLIDERS = [...SHARED_COLLIDERS, ...OUTDOOR_OBSTACLES, ...HARBOR_OBSTACLES, ...GARDEN_OBSTACLES];
const PRE_CREEK_COLLIDERS = [...GARDEN_BASE_COLLIDERS, { x: 86, z: 24, width: 3.8, depth: 3.8 }, ...GARDEN_TREE_OBSTACLES.filter(tree => tree.z < 54 || tree.z > 64 || tree.x < 78)];
const TOWN_COLLIDERS = [...GARDEN_BASE_COLLIDERS, ...GARDEN_TREE_OBSTACLES, { ...MILL, width: 3.8, depth: 3.8 }];
const PRE_EVENING_COLLIDERS=COASTAL_V1;
const PARKED_CAR_SET = new Set<TownObstacle>(PARKED_CAR_OBSTACLES);
const STATIC_TOWN_COLLIDERS = TOWN_COLLIDERS.filter(obstacle => !PARKED_CAR_SET.has(obstacle));
export type CarPose = TownPosition & { readonly rotation: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(first: TownPosition, second: TownPosition): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validPosition(value: unknown, interior: TownBuilding | null, outdoor: readonly TownObstacle[] = TOWN_COLLIDERS, liveObstacles = outdoor, floor = 0, oldFurniture?: readonly TownObstacle[]): value is TownPosition {
  if (!record(value) || typeof value.x !== 'number' || typeof value.z !== 'number'
    || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return false;
  if (interior) {
    if(value.x < -4.5 || value.x > 4.5 || value.z < -3.5 || value.z > 3.5) return false;
  } else if(outdoor===TOWN_COLLIDERS || outdoor===PRE_CREEK_COLLIDERS || outdoor===LANDSCAPE_V4_COLLIDERS || outdoor===HARBOR_V3_COLLIDERS || outdoor===PRE_EVENING_COLLIDERS || outdoor===EVENING_COLLIDERS) {
    const point = { x: value.x, z: value.z };
    const currentLayout = outdoor === TOWN_COLLIDERS;
    const previousGarden = outdoor === PRE_CREEK_COLLIDERS;
    const pierLayout = currentLayout || previousGarden || outdoor === LANDSCAPE_V4_COLLIDERS || outdoor === HARBOR_V3_COLLIDERS;
    if (!isIslandLand(point) && !(pierLayout && isPierPosition(point))) return false;
    if (currentLayout) {
      if (inPond(point.x, point.z, ISLAND_PONDS[1])) return false;
      if (!onGardenBridge(point) && onParkCreek(point, PLAYER_RADIUS)) return false;
    } else if (inPond(point.x, point.z, ISLAND_PONDS[1]) ||
      (!(previousGarden && onGardenBridge(point)) && inPond(point.x, point.z, ISLAND_PONDS[0]))) return false;
  } else if(value.x<.5 || value.x>63.5 || value.z<.5 || value.z>63.5) return false;
  const obstacles = interior ? oldFurniture ?? getInteriorLayout(interior, floor).obstacles : liveObstacles;
  const x = value.x;
  const z = value.z;
  return !obstacles.some(item => Math.abs(x - item.x) < item.width / 2 + PLAYER_RADIUS - 1e-7
    && Math.abs(z - item.z) < item.depth / 2 + PLAYER_RADIUS - 1e-7);
}

// The two ground-floor plans changed without a new coastal save layout tag.
function previousHomeObstacles(room: TownBuilding): readonly TownObstacle[] | undefined {
  if (room.id !== 'home-3' && room.id !== 'home-7') return undefined;
  const { furniture, partitions, actors } = getInteriorLayout(room);
  const variant = [...room.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const replaced = room.id === 'home-3' ? ['workbench'] : ['sofa', 'piano'];
  const oldPieces = room.id === 'home-3'
    ? [{ x: -4, z: 2.7, width: 1.4, depth: .75 }]
    : [{ x: 3.8, z: 1.7, width: 1.1, depth: 2.3 }, { x: 2.7 + variant * .15, z: -1.45, width: 1.2, depth: 1 }];
  return [...partitions, ...actors, ...furniture.filter(item => !replaced.includes(item.kind)), ...oldPieces];
}

function inPond(x: number, z: number, p: (typeof ISLAND_PONDS)[number]): boolean {
  return ((x - p.x) / (p.width / 2 + PLAYER_RADIUS)) ** 2 + ((z - p.z) / (p.depth / 2 + PLAYER_RADIUS)) ** 2 < 1;
}

export function isTownWorldState(value: unknown): value is TownWorldState {
  if (!record(value)) return false;
  const interior = value.interiorId === null ? null : ENTERABLE_BUILDINGS.find(building => building.id === value.interiorId);
  const floor = value.interiorFloor === undefined ? 0 : value.interiorFloor;
  if (typeof floor !== 'number' || !Number.isInteger(floor) || floor < 0 || floor >= (interior?.floors ?? 1)) return false;
  if (interior === undefined || !validPosition(value.position, interior, TOWN_COLLIDERS, TOWN_COLLIDERS, floor) || !validPosition(value.outdoorReturn, null)) return false;
  return !interior || distance(value.outdoorReturn, buildingEntrance(interior)) <= INTERACTION_DISTANCE + 1e-7;
}

function safeNear(point: TownPosition, maxDistance = 4, room: TownBuilding | null = null): TownPosition | null {
    if (isWalkableTownPosition(point, room)) return point;
    for (let radius = .5; radius <= maxDistance; radius += .5) for (let i=0; i<16; i++) {
      const candidate = {x: point.x+Math.sin(i*Math.PI/8)*radius, z: point.z+Math.cos(i*Math.PI/8)*radius};
      if (isWalkableTownPosition(candidate, room)) return candidate;
    }
    return null;
  }

/** Only validated earlier coastal saves may relocate around newly placed scenery. */
export function migrateCoastalWorldState(value: unknown, layout='coastal-island-v1'): TownWorldState | null {
  const oldColliders=layout==='coastal-island-v5'?PRE_CREEK_COLLIDERS:layout==='coastal-island-v4'?LANDSCAPE_V4_COLLIDERS:layout==='coastal-island-v3'?HARBOR_V3_COLLIDERS:layout==='coastal-island-v2'?EVENING_COLLIDERS:PRE_EVENING_COLLIDERS;
  if (!record(value)) return null;
  const room=value.interiorId===null?null:TOWN_BUILDINGS.find(b=>b.id===value.interiorId);
  const floor = value.interiorFloor === undefined ? 0 : value.interiorFloor;
  if (room === undefined || typeof floor !== 'number' || !Number.isInteger(floor) || floor < 0 || floor >= (room?.floors ?? 1)) return null;
  const oldFurniture = room && floor === 0 ? previousHomeObstacles(room) : undefined;
  if (!validPosition(value.position, room, oldColliders, oldColliders, floor) &&
      (!oldFurniture || !validPosition(value.position, room, oldColliders, oldColliders, floor, oldFurniture))) return null;
  if (!validPosition(value.outdoorReturn, null, oldColliders) &&
      !(oldFurniture && validPosition(value.outdoorReturn, null))) return null;
  if(room && distance(value.outdoorReturn,buildingEntrance(room))>INTERACTION_DISTANCE+1e-7)return null;
  if (isTownWorldState(value)) return value;
  const position = room
    ? (floor === 0 ? safeNear(value.position, 4, room) ?? { x: 0, z: 2 } : value.position)
    : safeNear(value.position) ?? TOWN_SPAWN;
  const outdoorReturn=safeNear(value.outdoorReturn,room?1:4)??(room?buildingEntrance(room):position);
  const state={interiorId:room?.id??null,...(floor ? { interiorFloor: floor } : {}),position,outdoorReturn};
  return isTownWorldState(state)?state:null;
}

/** Accept a previous-layout save only after full validation against its old geometry. */
export function migrateTownWorldState(value: unknown): TownWorldState | null {
  const coastal=migrateCoastalWorldState(value);
  if(coastal)return coastal;
  if (!record(value)) return null;
  const previousPlanet = isPreviousPlanetState(value);
  const oldRoom = value.interiorId === null ? null : LEGACY_TOWN_BUILDINGS.find(b => b.id === value.interiorId);
  const oldObstacles = [...LEGACY_TOWN_BUILDINGS, ...LEGACY_OUTDOOR_OBSTACLES];
  if (!previousPlanet && (oldRoom === undefined || !validPosition(value.position, oldRoom, oldObstacles)
    || !validPosition(value.outdoorReturn, null, oldObstacles))) return null;
  const state = value as unknown as TownWorldState;
  if (oldRoom && distance(state.outdoorReturn, buildingEntrance(oldRoom)) > INTERACTION_DISTANCE+1e-7) return null;
  const currentRoom = oldRoom ? TOWN_BUILDINGS.find(b => b.id === oldRoom.id) : null;

  if (currentRoom) {
    const entry = buildingEntrance(currentRoom);
    const outdoorReturn = safeNear(state.outdoorReturn, 1) ?? entry;
    if (distance(outdoorReturn, entry) <= INTERACTION_DISTANCE && isWalkableTownPosition(outdoorReturn))
      return { interiorId: currentRoom.id, position: state.position, outdoorReturn };
  }
  const position = safeNear(oldRoom ? state.outdoorReturn : state.position) ?? { ...TOWN_SPAWN };
  return { interiorId: null, position, outdoorReturn: position };
}

export function townNavigationObstacles(cars: readonly CarPose[]): TownObstacle[] {
  return [...STATIC_TOWN_COLLIDERS, ...cars.map(carFootprint)];
}

/** Shared collision query for movement and map guidance; never mutates the world. */
export function isWalkableTownPosition(position: TownPosition, interior: TownBuilding | null = null, outdoorObstacles: readonly TownObstacle[] = TOWN_COLLIDERS): boolean {
  if(!validPosition(position,interior,TOWN_COLLIDERS,outdoorObstacles)) return false;
  return !interior || !getInteriorLayout(interior).obstacles.some(item=>Math.abs(position.x-item.x)<item.width/2+PLAYER_RADIUS && Math.abs(position.z-item.z)<item.depth/2+PLAYER_RADIUS);
}

/** Pure movement and doorway transitions, independent of the renderer. */
export class TownWorld {
  private currentPosition: TownPosition;
  private currentInterior: TownBuilding | null = null;
  private floor = 0;
  private outdoorReturn: TownPosition;
  private facing = 0;
  private boat: number | null = null;
  private car: number | null = null;
  private readonly litHomes = new Set<string>();
  private readonly cars: CarPose[] = TOWN_CARS.map(car => ({ ...car }));
  private readonly liveObstacles = townNavigationObstacles(this.cars);
  private readonly listeners = new Set<(world: TownWorld) => void>();

  constructor(spawn: TownPosition = TOWN_SPAWN) {
    this.currentPosition = { ...spawn };
    this.outdoorReturn = { ...spawn };
  }

  get snapshot(): TownWorldState {
    const position = this.boat !== null ? HARBOR_BOATS[this.boat]!.boarding
      : this.currentInterior ? this.currentPosition
      : safeNear(this.carExit ?? this.currentPosition) ?? TOWN_SPAWN;
    return { interiorId: this.currentInterior?.id ?? null, ...(this.floor ? { interiorFloor: this.floor } : {}), position: { ...position }, outdoorReturn: { ...this.outdoorReturn } };
  }

  restore(state: TownWorldState): boolean {
    if (!isTownWorldState(state)) return false;
    this.boat = null;
    this.car = null;
    TOWN_CARS.forEach((car, index) => {
      this.cars[index] = { ...car };
      this.liveObstacles[STATIC_TOWN_COLLIDERS.length + index] = carFootprint(car);
    });
    this.currentInterior = ENTERABLE_BUILDINGS.find(building => building.id === state.interiorId) ?? null;
    this.floor = state.interiorFloor ?? 0;
    this.currentPosition = { ...state.position };
    this.outdoorReturn = { ...state.outdoorReturn };
    this.notify();
    return true;
  }

  get position(): TownPosition {
    return this.currentPosition;
  }

  get activeBoat(): number | null { return this.boat; }
  get activeCar(): number | null { return this.car; }
  get carPoses(): readonly CarPose[] { return this.cars; }

  private get nearbyCar(): number {
    if (this.interior || this.boat !== null) return -1;
    let nearest = -1;
    let closest = 2.25;
    this.cars.forEach((car, index) => {
      const separation = distance(this.position, car);
      if (separation <= closest) { nearest = index; closest = separation; }
    });
    return nearest;
  }

  private get carExit(): TownPosition | null {
    if (this.car === null) return null;
    const pose = this.cars[this.car]!;
    for (const [offset, radius] of [[Math.PI / 2, 1.5], [-Math.PI / 2, 1.5], [0, 2.3], [Math.PI, 2.3]] as const) {
      const angle = pose.rotation + offset;
      const exit = { x: pose.x + Math.sin(angle) * radius, z: pose.z + Math.cos(angle) * radius };
      if (this.isWalkable(exit)) return exit;
    }
    return null;
  }

  get carAction(): 'enter' | 'exit' | null {
    if (this.car !== null) return this.carExit ? 'exit' : null;
    return this.nearbyCar >= 0 && !this.nearbyBuilding ? 'enter' : null;
  }

  get boatAction(): 'board' | 'moor' | null {
    if (this.boat !== null) return distance(this.position, HARBOR_BOATS[this.boat]!) <= 1.1 ? 'moor' : null;
    return this.boardingBoat >= 0 ? 'board' : null;
  }

  private get boardingBoat(): number {
    return this.interior || this.car !== null || !isPierPosition(this.position) ? -1
      : HARBOR_BOATS.findIndex(boat => distance(this.position, boat.boarding) <= 1.35);
  }

  get heading(): number { return this.facing; }

  get interior(): TownBuilding | null {
    return this.currentInterior;
  }

  get nearbyBuilding(): TownBuilding | null {
    if (this.currentInterior || this.boat !== null || this.car !== null) return null;
    let nearest: TownBuilding | null = null;
    let nearestDistance = INTERACTION_DISTANCE;
    for (const building of ENTERABLE_BUILDINGS) {
      const entranceDistance = distance(this.currentPosition, buildingEntrance(building));
      if (entranceDistance <= nearestDistance) {
        nearest = building;
        nearestDistance = entranceDistance;
      }
    }
    return nearest;
  }

  get interiorFloor(): number { return this.floor; }

  get stairAction(): 'up' | 'down' | null {
    if (!this.currentInterior || this.currentInterior.floors < 2 || distance(this.position, STAIR_LANDING) > .82) return null;
    return this.floor < this.currentInterior.floors - 1 ? 'up' : 'down';
  }

  changeFloor(direction: 1 | -1): boolean {
    const next = this.floor + direction;
    const building = this.currentInterior;
    if (!building || !this.stairAction || next < 0 || next >= building.floors) return false;
    this.floor = next;
    this.currentPosition = { ...STAIR_LANDING };
    this.notify();
    return true;
  }

  get canToggleLamp(): boolean {
    return this.floor === 0 && this.currentInterior?.kind === 'home' && distance(this.position, HOME_LAMP) <= 1.25;
  }

  get homeLampOn(): boolean {
    return this.currentInterior !== null && this.litHomes.has(this.currentInterior.id);
  }

  get canExit(): boolean {
    return this.floor === 0 && this.currentInterior !== null && distance(this.currentPosition, INTERIOR_EXIT) <= 1.5;
  }

  move(dx: number, dz: number, deltaSeconds: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(deltaSeconds)) return;
    const directionLength = Math.hypot(dx, dz);
    if (directionLength === 0 || deltaSeconds <= 0) return;

    if (this.boat !== null) {
      const step = 8 * Math.min(deltaSeconds, .05) / directionLength;
      const next = { x: this.position.x + dx * step, z: this.position.z + dz * step };
      if (isNavigableWater(next, this.boat)) {
        this.currentPosition = next;
        this.facing = Math.atan2(dx, dz);
        this.notify();
      }
      return;
    }

    if (this.car !== null) return;

    const step = MOVEMENT_SPEED * Math.min(deltaSeconds, 0.05) / directionLength;
    const previousPosition = this.currentPosition;
    const minX = this.currentInterior ? -4.5 : ISLAND_BOUNDS.minX;
    const maxX = this.currentInterior ? 4.5 : ISLAND_BOUNDS.maxX;
    const minZ = this.currentInterior ? -3.5 : ISLAND_BOUNDS.minZ;
    const maxZ = this.currentInterior ? 3.5 : ISLAND_BOUNDS.maxZ;
    const nextX = clamp(previousPosition.x + dx * step, minX, maxX);
    const xPosition = { x: nextX, z: previousPosition.z };
    if (this.isWalkable(xPosition)) this.currentPosition = xPosition;
    const nextZ = clamp(previousPosition.z + dz * step, minZ, maxZ);
    const zPosition = { x: this.currentPosition.x, z: nextZ };
    if (this.isWalkable(zPosition)) this.currentPosition = zPosition;
    if (distance(previousPosition, this.currentPosition) > 0) {
      this.facing = Math.atan2(this.currentPosition.x-previousPosition.x, this.currentPosition.z-previousPosition.z);
      this.notify();
    }
  }

  driveCar(throttle: number, steering: number, delta: number): void {
    const index = this.car;
    if (index === null || !Number.isFinite(throttle) || !Number.isFinite(steering) || !Number.isFinite(delta) || delta <= 0 || !throttle) return;
    const dt = Math.min(delta, .05);
    const direction = Math.sign(throttle);
    const wheel = clamp(steering, -1, 1);
    const speed = direction > 0 ? 10 - 4 * Math.abs(wheel) : -5;
    const distance = dt * speed * Math.abs(clamp(throttle, -1, 1));
    const heading = this.cars[index]!.rotation;
    const turn = -wheel * direction * dt * 2.42;
    if (!this.tryDrive(index, heading + turn, distance) && turn) this.tryDrive(index, heading, distance);
  }

  private tryDrive(index: number, rotation: number, distance: number): boolean {
    const next = { x: this.position.x + Math.sin(rotation) * distance,
      z: this.position.z + Math.cos(rotation) * distance, rotation };
    const onRoad = (across: number, along: number): boolean => along >= 1 && along <= TOWN_SIZE - 1
      && ROAD_CENTERS.some(center => Math.abs(across - center) <= 2.05);
    if (!onRoad(next.x, next.z) && !onRoad(next.z, next.x)) return false;
    const footprint = carFootprint(next);
    const ownCollider = STATIC_TOWN_COLLIDERS.length + index;
    if (this.liveObstacles.some((obstacle, i) => i !== ownCollider &&
      Math.abs(next.x - obstacle.x) < (footprint.width + obstacle.width) / 2 &&
      Math.abs(next.z - obstacle.z) < (footprint.depth + obstacle.depth) / 2)) return false;
    this.cars[index] = next;
    this.liveObstacles[ownCollider] = footprint;
    this.currentPosition = { x: next.x, z: next.z };
    this.facing = next.rotation;
    this.notify();
    return true;
  }

  interact(): boolean {
    if (this.car !== null) {
      const exit = this.carExit;
      if (!exit) return false;
      this.car = null;
      this.currentPosition = exit;
      this.notify();
      return true;
    }
    if (this.carAction === 'enter') {
      const index = this.nearbyCar;
      const car = this.cars[index]!;
      this.car = index;
      this.currentPosition = { x: car.x, z: car.z };
      this.facing = car.rotation;
      this.notify();
      return true;
    }
    if (this.boat !== null) {
      if (this.boatAction !== 'moor') return false;
      this.currentPosition = HARBOR_BOATS[this.boat]!.boarding;
      this.boat = null;
      this.notify();
      return true;
    }
    const index = this.boardingBoat;
    if (index >= 0) {
      const berth = HARBOR_BOATS[index]!;
      this.boat = index;
      this.currentPosition = { x: berth.x, z: berth.z };
      this.facing = berth.rotation;
      this.notify();
      return true;
    }
    if (this.currentInterior) {
      if (this.stairAction) return this.changeFloor(this.stairAction === 'up' ? 1 : -1);
      if (!this.canExit) {
        if (!this.canToggleLamp) return false;
        if (this.homeLampOn) this.litHomes.delete(this.currentInterior.id);
        else this.litHomes.add(this.currentInterior.id);
        this.notify();
        return true;
      }
      this.currentInterior = null;
      this.currentPosition = this.outdoorReturn;
      this.notify();
      return true;
    }

    const building = this.nearbyBuilding;
    if (!building) return false;
    this.outdoorReturn = this.currentPosition;
    this.currentInterior = building;
    this.currentPosition = { x: 0, z: 2 };
    this.notify();
    return true;
  }

  subscribe(listener: (world: TownWorld) => void): () => void {
    this.listeners.add(listener);
    listener(this);
    return () => this.listeners.delete(listener);
  }

  private isWalkable(position: TownPosition): boolean {
    if (this.currentInterior) {
      if (this.floor === 0) return isWalkableTownPosition(position, this.currentInterior);
      return validPosition(position, this.currentInterior, TOWN_COLLIDERS, TOWN_COLLIDERS, this.floor);
    }
    return validPosition(position, null, TOWN_COLLIDERS, this.liveObstacles);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
