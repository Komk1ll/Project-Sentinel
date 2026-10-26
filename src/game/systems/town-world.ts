import { COASTAL_V1,COASTAL_V2,COASTAL_V3,COASTAL_V4 } from '@content/legacy-coastal-layouts';
import { GARDEN_OBSTACLES,GARDEN_TREE_OBSTACLES,onGardenBridge } from '@content/coastal-garden';
import { HARBOR_OBSTACLES,isPierPosition } from '@content/harbor';
import { isIslandLand, ISLAND_BOUNDS, MILL } from '@content/island';
import { WILD_TREES, WILD_BENCHES, ISLAND_PONDS } from '@content/town-life';
import { isPreviousPlanetState } from '@game/systems/legacy-planet-state';
import { buildingEntrance, LEGACY_TOWN_BUILDINGS, TOWN_BUILDINGS, TOWN_SPAWN, type TownBuilding } from '@content/town';
import { OUTDOOR_OBSTACLES, LEGACY_OUTDOOR_OBSTACLES, type TownObstacle } from '@content/town-props';
import { getInteriorLayout } from '@content/interiors';

export interface TownPosition {
  readonly x: number;
  readonly z: number;
}

export interface TownWorldState {
  readonly interiorId: string | null;
  readonly position: TownPosition;
  readonly outdoorReturn: TownPosition;
}

const PLAYER_RADIUS = 0.3;
const MOVEMENT_SPEED = 5;
const INTERACTION_DISTANCE = 2.4;
const INTERIOR_EXIT: TownPosition = { x: 0, z: 3 };
const SHARED_COLLIDERS = [...TOWN_BUILDINGS, ...WILD_TREES.map(t=>({...t,width:.4*t.scale,depth:.4*t.scale})),
  ...WILD_BENCHES.map(b=>({...b,width:1.6,depth:.55})), {...MILL,width:3.8,depth:3.8}];
const EVENING_COLLIDERS=COASTAL_V2;
const HARBOR_V3_COLLIDERS=COASTAL_V3;
const LANDSCAPE_V4_COLLIDERS=COASTAL_V4;
const TOWN_COLLIDERS=[...SHARED_COLLIDERS,...OUTDOOR_OBSTACLES,...HARBOR_OBSTACLES,...GARDEN_OBSTACLES,...GARDEN_TREE_OBSTACLES];
const PRE_EVENING_COLLIDERS=COASTAL_V1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(first: TownPosition, second: TownPosition): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validPosition(value: unknown, interior: TownBuilding | null, outdoor: readonly TownObstacle[] = TOWN_COLLIDERS): value is TownPosition {
  if (!record(value) || typeof value.x !== 'number' || typeof value.z !== 'number'
    || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return false;
  if (interior) {
    if(value.x < -4.5 || value.x > 4.5 || value.z < -3.5 || value.z > 3.5) return false;
  } else if(outdoor===TOWN_COLLIDERS || outdoor===LANDSCAPE_V4_COLLIDERS || outdoor===HARBOR_V3_COLLIDERS || outdoor===PRE_EVENING_COLLIDERS || outdoor===EVENING_COLLIDERS) {
    if((!isIslandLand({x:value.x,z:value.z}) && !((outdoor===TOWN_COLLIDERS || outdoor===LANDSCAPE_V4_COLLIDERS || outdoor===HARBOR_V3_COLLIDERS) && isPierPosition({x:value.x,z:value.z}))) || (!(outdoor===TOWN_COLLIDERS&&onGardenBridge({x:value.x,z:value.z})) && ISLAND_PONDS.some(p=>
      ((value.x as number)-p.x)**2/(p.width/2+PLAYER_RADIUS)**2+((value.z as number)-p.z)**2/(p.depth/2+PLAYER_RADIUS)**2<1))) return false;
  } else if(value.x<.5 || value.x>63.5 || value.z<.5 || value.z>63.5) return false;
  const obstacles = interior ? getInteriorLayout(interior).obstacles : outdoor;
  const x = value.x;
  const z = value.z;
  return !obstacles.some(item => Math.abs(x - item.x) < item.width / 2 + PLAYER_RADIUS - 1e-7
    && Math.abs(z - item.z) < item.depth / 2 + PLAYER_RADIUS - 1e-7);
}

export function isTownWorldState(value: unknown): value is TownWorldState {
  if (!record(value)) return false;
  const interior = value.interiorId === null ? null : TOWN_BUILDINGS.find(building => building.id === value.interiorId);
  if (interior === undefined || !validPosition(value.position, interior) || !validPosition(value.outdoorReturn, null)) return false;
  return !interior || distance(value.outdoorReturn, buildingEntrance(interior)) <= INTERACTION_DISTANCE + 1e-7;
}

function safeNear(point: TownPosition, maxDistance = 4): TownPosition | null {
    if (isWalkableTownPosition(point)) return point;
    for (let radius = .5; radius <= maxDistance; radius += .5) for (let i=0; i<16; i++) {
      const candidate = {x: point.x+Math.sin(i*Math.PI/8)*radius, z: point.z+Math.cos(i*Math.PI/8)*radius};
      if (isWalkableTownPosition(candidate)) return candidate;
    }
    return null;
  }

/** Only validated earlier coastal saves may relocate around newly placed scenery. */
export function migrateCoastalWorldState(value: unknown, layout='coastal-island-v1'): TownWorldState | null {
  const oldColliders=layout==='coastal-island-v4'?LANDSCAPE_V4_COLLIDERS:layout==='coastal-island-v3'?HARBOR_V3_COLLIDERS:layout==='coastal-island-v2'?EVENING_COLLIDERS:PRE_EVENING_COLLIDERS;
  if (!record(value)) return null;
  const room=value.interiorId===null?null:TOWN_BUILDINGS.find(b=>b.id===value.interiorId);
  if(room===undefined || !validPosition(value.position,room,oldColliders)
    || !validPosition(value.outdoorReturn,null,oldColliders))return null;
  if(room && distance(value.outdoorReturn,buildingEntrance(room))>INTERACTION_DISTANCE+1e-7)return null;
  if(isTownWorldState(value))return value;
  const position=room?value.position:safeNear(value.position)??{...TOWN_SPAWN};
  const outdoorReturn=safeNear(value.outdoorReturn,room?1:4)??(room?buildingEntrance(room):position);
  const state={interiorId:room?.id??null,position,outdoorReturn};
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

/** Shared collision query for movement and map guidance; never mutates the world. */
export function isWalkableTownPosition(position: TownPosition, interior: TownBuilding | null = null): boolean {
  if(!validPosition(position,interior)) return false;
  const obstacles=interior?getInteriorLayout(interior).obstacles:TOWN_COLLIDERS;
  return !obstacles.some(item=>Math.abs(position.x-item.x)<item.width/2+PLAYER_RADIUS && Math.abs(position.z-item.z)<item.depth/2+PLAYER_RADIUS);
}

/** Pure movement and doorway transitions, independent of the renderer. */
export class TownWorld {
  private currentPosition: TownPosition;
  private currentInterior: TownBuilding | null = null;
  private outdoorReturn: TownPosition;
  private facing = 0;
  private readonly listeners = new Set<(world: TownWorld) => void>();

  constructor(spawn: TownPosition = TOWN_SPAWN) {
    this.currentPosition = { ...spawn };
    this.outdoorReturn = { ...spawn };
  }

  get snapshot(): TownWorldState {
    return { interiorId: this.currentInterior?.id ?? null, position: { ...this.currentPosition }, outdoorReturn: { ...this.outdoorReturn } };
  }

  restore(state: TownWorldState): boolean {
    if (!isTownWorldState(state)) return false;
    this.currentInterior = TOWN_BUILDINGS.find(building => building.id === state.interiorId) ?? null;
    this.currentPosition = { ...state.position };
    this.outdoorReturn = { ...state.outdoorReturn };
    this.notify();
    return true;
  }

  get position(): TownPosition {
    return this.currentPosition;
  }

  get heading(): number { return this.facing; }

  get interior(): TownBuilding | null {
    return this.currentInterior;
  }

  get nearbyBuilding(): TownBuilding | null {
    if (this.currentInterior) return null;
    let nearest: TownBuilding | null = null;
    let nearestDistance = INTERACTION_DISTANCE;
    for (const building of TOWN_BUILDINGS) {
      const entranceDistance = distance(this.currentPosition, buildingEntrance(building));
      if (entranceDistance <= nearestDistance) {
        nearest = building;
        nearestDistance = entranceDistance;
      }
    }
    return nearest;
  }

  get canExit(): boolean {
    return this.currentInterior !== null && distance(this.currentPosition, INTERIOR_EXIT) <= 1.5;
  }

  move(dx: number, dz: number, deltaSeconds: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(deltaSeconds)) return;
    const directionLength = Math.hypot(dx, dz);
    if (directionLength === 0 || deltaSeconds <= 0) return;

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

  interact(): boolean {
    if (this.currentInterior) {
      if (!this.canExit) return false;
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
    return isWalkableTownPosition(position, this.currentInterior);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
