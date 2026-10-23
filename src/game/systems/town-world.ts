import { buildingEntrance, LEGACY_TOWN_BUILDINGS, TOWN_BUILDINGS, TOWN_SPAWN, type TownBuilding } from '@content/town';
import { WILD_TREES, WILD_BENCHES, PLANET_PONDS } from '@content/planet-life';
import { OUTDOOR_OBSTACLES, LEGACY_OUTDOOR_OBSTACLES, type TownObstacle } from '@content/town-props';
import { latitudeScale, normalizePlanetPosition, PLANET_NORTH, PLANET_SOUTH, PLANET_RADIUS, longitudeDelta, stepAtPole } from '@game/systems/planet';
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
const TOWN_COLLIDERS = [...TOWN_BUILDINGS, ...OUTDOOR_OBSTACLES,
  ...WILD_TREES.map(tree=>({...tree,width:.4*tree.scale,depth:.4*tree.scale})),
  ...WILD_BENCHES.map(bench=>({...bench,width:1.6,depth:.55})),
  {x:152,z:24,width:3.8,depth:3.8}];
/** Project into each rigid obstacle's tangent frame, matching radial model placement. */
function outdoorBlocked(point:TownPosition):boolean {
  if(PLANET_PONDS.some(pond=>{
    const dx=longitudeDelta(pond.x,point.x)/(pond.width/2+PLAYER_RADIUS/latitudeScale(point.z));
    const dz=(point.z-pond.z)/(pond.depth/2+PLAYER_RADIUS);
    return dx*dx+dz*dz<1;
  }))return true;
  const lat=(point.z-32)/PLANET_RADIUS,cp=Math.cos(lat),sp=Math.sin(lat);
  return TOWN_COLLIDERS.some(item=>{
    if(Math.abs(point.z-item.z)>item.depth+2)return false;
    const lon=longitudeDelta(item.x,point.x)/PLANET_RADIUS;
    if(Math.abs(lon)>Math.PI/2)return false;
    const base=(item.z-32)/PLANET_RADIUS;
    const x=PLANET_RADIUS*cp*Math.sin(lon);
    const z=PLANET_RADIUS*(sp*Math.cos(base)-cp*Math.sin(base)*Math.cos(lon));
    return Math.abs(x)<item.width/2+PLAYER_RADIUS-1e-7 && Math.abs(z)<item.depth/2+PLAYER_RADIUS-1e-7;
  });
}

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
  if (value.x < (interior ? -4.5 : 0) || value.x > (interior ? 4.5 : 256-1e-9)
    || value.z < (interior ? -3.5 : PLANET_NORTH) || value.z > (interior ? 3.5 : PLANET_SOUTH)) return false;
  if(!interior && outdoor===TOWN_COLLIDERS)return !outdoorBlocked({x:value.x,z:value.z});
  if(!interior && (value.x<.5||value.x>63.5||value.z<.5||value.z>63.5))return false;
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

/** Accept a previous-layout save only after full validation against its old geometry. */
export function migrateTownWorldState(value: unknown): TownWorldState | null {
  if (isTownWorldState(value)) return value;
  if (!record(value)) return null;
  const oldRoom = value.interiorId === null ? null : LEGACY_TOWN_BUILDINGS.find(b => b.id === value.interiorId);
  const oldObstacles = [...LEGACY_TOWN_BUILDINGS, ...LEGACY_OUTDOOR_OBSTACLES];
  if (oldRoom === undefined || !validPosition(value.position, oldRoom, oldObstacles)
    || !validPosition(value.outdoorReturn, null, oldObstacles)) return null;
  if (oldRoom && distance(value.outdoorReturn, buildingEntrance(oldRoom)) > INTERACTION_DISTANCE+1e-7) return null;
  const currentRoom = oldRoom ? TOWN_BUILDINGS.find(b => b.id === oldRoom.id) : null;
  const safeNear = (point: TownPosition, maxDistance = 4): TownPosition | null => {
    if (isWalkableTownPosition(point)) return point;
    for (let radius = .5; radius <= maxDistance; radius += .5) for (let i=0; i<16; i++) {
      const candidate = {x: point.x+Math.sin(i*Math.PI/8)*radius, z: point.z+Math.cos(i*Math.PI/8)*radius};
      if (isWalkableTownPosition(candidate)) return candidate;
    }
    return null;
  };
  if (currentRoom) {
    const entry = buildingEntrance(currentRoom);
    const outdoorReturn = safeNear(value.outdoorReturn, 1) ?? entry;
    if (distance(outdoorReturn, entry) <= INTERACTION_DISTANCE && isWalkableTownPosition(outdoorReturn))
      return { interiorId: currentRoom.id, position: value.position, outdoorReturn };
  }
  const position = safeNear(oldRoom ? value.outdoorReturn : value.position) ?? { ...TOWN_SPAWN };
  return { interiorId: null, position, outdoorReturn: position };
}

/** Shared collision query for movement and map guidance; never mutates the world. */
export function isWalkableTownPosition(position: TownPosition, interior: TownBuilding | null = null): boolean {
  const { x, z } = position;
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < (interior ? -4.5 : 0)
    || x > (interior ? 4.5 : 256-1e-9) || z < (interior ? -3.5 : PLANET_NORTH)
    || z > (interior ? 3.5 : PLANET_SOUTH)) return false;
  if(!interior)return !outdoorBlocked(position);
  const obstacles = getInteriorLayout(interior).obstacles;
  return !obstacles.some(item => Math.abs(x-item.x) < item.width/2+PLAYER_RADIUS
    && Math.abs(z-item.z) < item.depth/2+PLAYER_RADIUS);
}

/** Pure movement and doorway transitions, independent of the renderer. */
export class TownWorld {
  private currentPosition: TownPosition;
  private currentInterior: TownBuilding | null = null;
  private outdoorReturn: TownPosition;
  private facing = 0;
  private poleTurn = 0;
  get viewTurn(): number { return this.currentInterior ? 0 : this.poleTurn; }
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
    this.poleTurn = 0;
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
    let arrivalHeading=Math.atan2(dx,dz);
    if(!this.currentInterior && (previousPosition.z<-30 || previousPosition.z>94)) {
      const next=stepAtPole(previousPosition,dx,dz,step*directionLength,this.poleTurn);
      if(this.isWalkable(next.position)){this.currentPosition=next.position;this.poleTurn=next.viewTurn;arrivalHeading=next.heading;}
    } else if (this.currentInterior) {
      const xPosition = {x:clamp(previousPosition.x+dx*step,-4.5,4.5),z:previousPosition.z};
      if(this.isWalkable(xPosition)) this.currentPosition=xPosition;
      const zPosition = {x:this.currentPosition.x,z:clamp(previousPosition.z+dz*step,-3.5,3.5)};
      if(this.isWalkable(zPosition)) this.currentPosition=zPosition;
    } else {
      const next=normalizePlanetPosition(previousPosition.x+dx*step/latitudeScale(previousPosition.z),previousPosition.z+dz*step);
      if(this.isWalkable(next.position)) {
        this.currentPosition=next.position;
        if(next.crossedPole) this.poleTurn=(this.poleTurn+Math.PI)%(2*Math.PI);
      } else {
        const xOnly=normalizePlanetPosition(previousPosition.x+dx*step/latitudeScale(previousPosition.z),previousPosition.z).position;
        if(this.isWalkable(xOnly)) this.currentPosition=xOnly;
        const zOnly=normalizePlanetPosition(this.currentPosition.x,previousPosition.z+dz*step);
        if(this.isWalkable(zOnly.position)) { this.currentPosition=zOnly.position; if(zOnly.crossedPole) this.poleTurn=(this.poleTurn+Math.PI)%(2*Math.PI); }
      }
    }
    if (distance(previousPosition, this.currentPosition) > 0) {
      this.facing = arrivalHeading;
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
