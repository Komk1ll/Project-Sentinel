import { longitudeDelta, wrapLongitude } from '@game/systems/planet';
import { buildingEntrance, TOWN_BUILDINGS, type TownBuilding } from '@content/town';
import { MASTER, MEDIC } from '@content/first-aid';
import { isWalkableTownPosition, type TownPosition, type TownWorld } from '@game/systems/town-world';

export interface NavigationGoal { readonly position: TownPosition; readonly label: string; }

export function navigationGoal(world: TownWorld, buildingId: string | null): NavigationGoal | null {
  if (!buildingId) return null;
  if (world.interior) {
    const actor = [MASTER, MEDIC].find(actor => actor.buildingId === world.interior?.id && actor.buildingId === buildingId);
    // Actors are colliders too: guide to a free interaction point beside them.
    const approach = actor ? [-Math.PI/2, 0, Math.PI, Math.PI/2].map(angle => ({ x: actor.x+Math.sin(angle), z: actor.z+Math.cos(angle) }))
      .find(point => isWalkableTownPosition(point, world.interior)) : undefined;
    return actor && approach ? { position: approach, label: actor === MASTER ? 'Мастер' : 'Медработник' }
      : { position: { x: 0, z: 3 }, label: 'Выход на улицу' };
  }
  const building = TOWN_BUILDINGS.find(building => building.id === buildingId);
  return building ? { position: buildingEntrance(building), label: buildingId === 'station' ? 'Маяк · вход' : 'Поликлиника · вход' } : null;
}

/** Check every short segment against the same player-radius collision query as movement. */
export function clearWalkingSegment(a: TownPosition, b: TownPosition, interior: TownBuilding | null): boolean {
  const dx=interior?b.x-a.x:longitudeDelta(a.x,b.x);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, b.z-a.z)/.1));
  for (let i = 0; i <= steps; i++) if (!isWalkableTownPosition({ x:interior?a.x+dx*i/steps:wrapLongitude(a.x+dx*i/steps), z:a.z+(b.z-a.z)*i/steps }, interior)) return false;
  return true;
}

interface Grid { readonly points: TownPosition[]; readonly adjacent: number[][]; readonly minX: number; readonly minZ: number; readonly step: number; readonly width: number; readonly height: number; }
const grids = new Map<string, Grid>();
function gridFor(interior: TownBuilding | null, local:boolean): Grid {
  const key = interior?.id ?? (local?'town':'planet');
  const cached = grids.get(key); if (cached) return cached;
  const step = interior ? .5 : local?1:2, minX = interior ? -4.5 : 0, minZ = interior ? -3.5 : local?0:-30;
  const width = interior ? 19 : local?65:128, height = interior ? 15 : 63+(local?2:0);
  const points = Array.from({length:width*height}, (_,i) => ({x:minX+i%width*step,z:minZ+Math.floor(i/width)*step}));
  const free = points.map(point => isWalkableTownPosition(point, interior));
  const adjacent = points.map((point,i) => {
    if (!free[i]) return [];
    return [i%width>0 ? i-1 : interior||local?-1:i+width-1, i%width<width-1 ? i+1 : interior||local?-1:i-width+1, i-width, i+width]
      .filter(j=> j>=0 && j<points.length && free[j] && clearWalkingSegment(point, points[j]!, interior));
  });
  const grid = {points,adjacent,minX,minZ,step,width,height}; grids.set(key,grid); return grid;
}

/** Shortest four-neighbour path, then safe line-of-sight simplification. No diagonal corner cutting. */
export function walkingRoute(start: TownPosition, goal: TownPosition, interior: TownBuilding | null): TownPosition[] {
  if (clearWalkingSegment(start, goal, interior)) return [start, goal];
  const local=[start,goal].every(p=>p.x>=0&&p.x<=64&&p.z>=0&&p.z<=64);
  const grid = gridFor(interior,local);
  const anchor = (point: TownPosition): number => {
    const cx = Math.round((point.x-grid.minX)/grid.step), cz = Math.round((point.z-grid.minZ)/grid.step);
    const candidates: number[] = [];
    for (let z = Math.max(0,cz-2); z <= Math.min(grid.height-1,cz+2); z++)
      for (let x = cx-2; x <= cx+2; x++) {const col=interior||local?x:((x%grid.width)+grid.width)%grid.width;if(col>=0&&col<grid.width)candidates.push(z*grid.width+col);}
    return candidates.sort((a,b)=>Math.hypot(interior?grid.points[a]!.x-point.x:longitudeDelta(point.x,grid.points[a]!.x),grid.points[a]!.z-point.z)-Math.hypot(interior?grid.points[b]!.x-point.x:longitudeDelta(point.x,grid.points[b]!.x),grid.points[b]!.z-point.z))
      .find(i=>grid.adjacent[i]!.length && clearWalkingSegment(point,grid.points[i]!,interior)) ?? -1;
  };
  const first = anchor(start), last = anchor(goal);
  if (first<0 || last<0) return [];
  const previous = new Int32Array(grid.points.length).fill(-1), queue = [first]; previous[first] = first;
  for (let head=0;head<queue.length && previous[last]===-1;head++) {
    for (const next of grid.adjacent[queue[head]!]!) if (previous[next]===-1) { previous[next]=queue[head]!; queue.push(next); }
  }
  if (previous[last]===-1) return [];
  const reversed: TownPosition[] = [goal];
  for (let i=last;i!==first;i=previous[i]!) reversed.push(grid.points[i]!);
  const path = [start, grid.points[first]!, ...reversed.reverse()];
  const route: TownPosition[] = [start]; let current=0;
  while (current<path.length-1) {
    let next=path.length-1;
    while (next>current+1 && !clearWalkingSegment(path[current]!,path[next]!,interior)) next--;
    route.push(path[next]!); current=next;
  }
  return route;
}
