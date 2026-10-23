/** Frozen validator for the previous globe layout. Never used for live movement. */
import { buildingEntrance, TOWN_BUILDINGS, type TownBuilding } from '@content/town';
import { WILD_TREES,WILD_BENCHES,PLANET_PONDS } from '@content/legacy-planet-life';
import { OUTDOOR_OBSTACLES,type TownObstacle } from '@content/town-props';
import { latitudeScale,longitudeDelta,PLANET_RADIUS,PLANET_NORTH,PLANET_SOUTH } from '@game/systems/planet';
import { getInteriorLayout } from '@content/interiors';
import type { TownPosition,TownWorldState } from '@game/systems/town-world';
const PLAYER_RADIUS = 0.3;
const INTERACTION_DISTANCE = 2.4;
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

export function isPreviousPlanetState(value: unknown): value is TownWorldState {
  if (!record(value)) return false;
  const interior = value.interiorId === null ? null : TOWN_BUILDINGS.find(building => building.id === value.interiorId);
  if (interior === undefined || !validPosition(value.position, interior) || !validPosition(value.outdoorReturn, null)) return false;
  return !interior || distance(value.outdoorReturn, buildingEntrance(interior)) <= INTERACTION_DISTANCE + 1e-7;
}

