import { buildingEntrance, TOWN_BUILDINGS, TOWN_SIZE, TOWN_SPAWN, type TownBuilding } from '@content/town';
import { OUTDOOR_OBSTACLES } from '@content/town-props';
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
const TOWN_COLLIDERS = [...TOWN_BUILDINGS, ...OUTDOOR_OBSTACLES];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(first: TownPosition, second: TownPosition): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validPosition(value: unknown, interior: TownBuilding | null): value is TownPosition {
  if (!record(value) || typeof value.x !== 'number' || typeof value.z !== 'number'
    || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return false;
  if (value.x < (interior ? -4.5 : .5) || value.x > (interior ? 4.5 : TOWN_SIZE - .5)
    || value.z < (interior ? -3.5 : .5) || value.z > (interior ? 3.5 : TOWN_SIZE - .5)) return false;
  const obstacles = interior ? getInteriorLayout(interior).obstacles : TOWN_COLLIDERS;
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

/** Shared collision query for movement and map guidance; never mutates the world. */
export function isWalkableTownPosition(position: TownPosition, interior: TownBuilding | null = null): boolean {
  const { x, z } = position;
  if (!Number.isFinite(x) || !Number.isFinite(z) || x < (interior ? -4.5 : .5)
    || x > (interior ? 4.5 : TOWN_SIZE-.5) || z < (interior ? -3.5 : .5)
    || z > (interior ? 3.5 : TOWN_SIZE-.5)) return false;
  const obstacles = interior ? getInteriorLayout(interior).obstacles : TOWN_COLLIDERS;
  return !obstacles.some(item => Math.abs(x-item.x) < item.width/2+PLAYER_RADIUS
    && Math.abs(z-item.z) < item.depth/2+PLAYER_RADIUS);
}

/** Pure movement and doorway transitions, independent of the renderer. */
export class TownWorld {
  private currentPosition: TownPosition;
  private currentInterior: TownBuilding | null = null;
  private outdoorReturn: TownPosition;
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
    const minX = this.currentInterior ? -4.5 : 0.5;
    const maxX = this.currentInterior ? 4.5 : TOWN_SIZE - 0.5;
    const minZ = this.currentInterior ? -3.5 : 0.5;
    const maxZ = this.currentInterior ? 3.5 : TOWN_SIZE - 0.5;
    const nextX = clamp(previousPosition.x + dx * step, minX, maxX);
    const xPosition = { x: nextX, z: previousPosition.z };
    if (this.isWalkable(xPosition)) this.currentPosition = xPosition;
    const nextZ = clamp(previousPosition.z + dz * step, minZ, maxZ);
    const zPosition = { x: this.currentPosition.x, z: nextZ };
    if (this.isWalkable(zPosition)) this.currentPosition = zPosition;
    if (distance(previousPosition, this.currentPosition) > 0) this.notify();
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
