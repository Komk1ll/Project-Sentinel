import { buildingEntrance, TOWN_BUILDINGS, type TownBuilding } from '@content/town';
import type { CampaignTarget } from '@game/systems/campaign';
import { MASTER, MEDIC } from '@content/first-aid';
import { isWalkableTownPosition, townNavigationObstacles, type CarPose, type TownPosition, type TownWorld } from '@game/systems/town-world';
import type { TownObstacle } from '@content/town-props';

export interface NavigationGoal { readonly position: TownPosition; readonly label: string; }

export function navigationGoal(world: TownWorld, buildingId: string | null): NavigationGoal | null {
  if (!buildingId) return null;
  if (world.interior) {
    if (world.interiorFloor > 0) return null;
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

export function storyNavigationGoal(world: TownWorld, target: CampaignTarget | null, buildingId: string | null): NavigationGoal | null {
  if (!target) return navigationGoal(world, buildingId);
  if (world.interiorFloor > 0) return null;
  if ((world.interior?.id ?? null) === target.buildingId) return { position: target.point, label: target.label };
  if (world.interior) return { position: { x: 0, z: 3 }, label: 'Выход на улицу' };
  const building = TOWN_BUILDINGS.find(item => item.id === target.buildingId);
  return building ? { position: buildingEntrance(building), label: building.name + ' · вход' } : null;
}

/** Check every short segment against the same player-radius collision query as movement. */
export function clearWalkingSegment(a: TownPosition, b: TownPosition, interior: TownBuilding | null, obstacles?: readonly TownObstacle[]): boolean {
  const dx=b.x-a.x;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, b.z-a.z)/.1));
  for (let i = 0; i <= steps; i++) if (!isWalkableTownPosition({ x:a.x+dx*i/steps, z:a.z+(b.z-a.z)*i/steps }, interior, obstacles)) return false;
  return true;
}

interface Grid { readonly points: TownPosition[]; readonly adjacent: number[][]; readonly minX: number; readonly minZ: number; readonly step: number; readonly width: number; readonly height: number; }
const grids = new Map<string, { carKey: string; grid: Grid }>();
function gridFor(interior: TownBuilding | null, local: boolean, carKey: string, obstacles?: readonly TownObstacle[]): Grid {
  const key = interior?.id ?? (local?'town':'island');
  const cached = grids.get(key); if (cached?.carKey === carKey) return cached.grid;
  const step = interior ? .5 : 1, minX = interior ? -4.5 : local?0:-18, minZ = interior ? -3.5 : local?0:-16;
  const width = interior ? 19 : local?65:129, height = interior ? 15 : local?65:111;
  const points = Array.from({length:width*height}, (_,i) => ({x:minX+i%width*step,z:minZ+Math.floor(i/width)*step}));
  const free = points.map(point => isWalkableTownPosition(point, interior, obstacles));
  const adjacent = points.map((point,i) => {
    if (!free[i]) return [];
    return [i%width>0 ? i-1 : -1, i%width<width-1 ? i+1 : -1, i-width, i+width]
      .filter(j=> j>=0 && j<points.length && free[j] && clearWalkingSegment(point, points[j]!, interior, obstacles));
  });
  const grid = {points,adjacent,minX,minZ,step,width,height}; grids.set(key,{carKey,grid}); return grid;
}

/** Shortest four-neighbour path, then safe line-of-sight simplification. No diagonal corner cutting. */
export function walkingRoute(start: TownPosition, goal: TownPosition, interior: TownBuilding | null, cars?: readonly CarPose[]): TownPosition[] {
  const liveCars = interior ? undefined : cars;
  const obstacles = liveCars && townNavigationObstacles(liveCars);
  if (!isWalkableTownPosition(start, interior, obstacles) || !isWalkableTownPosition(goal, interior, obstacles)) return [];
  const clear = (a: TownPosition, b: TownPosition) => clearWalkingSegment(a, b, interior, obstacles);
  if (clear(start, goal)) return [start, goal];
  const local=[start,goal].every(p=>p.x>=0&&p.x<=64&&p.z>=0&&p.z<=64);
  const grid = gridFor(interior, local, liveCars ? JSON.stringify(liveCars.map(({ x, z, rotation }) => [x, z, rotation])) : '', obstacles);
  const anchor = (point: TownPosition): number => {
    const cx = Math.round((point.x-grid.minX)/grid.step), cz = Math.round((point.z-grid.minZ)/grid.step);
    const candidates: number[] = [];
    for (let z = Math.max(0,cz-2); z <= Math.min(grid.height-1,cz+2); z++)
      for (let x = cx-2; x <= cx+2; x++) {const col=x;if(col>=0&&col<grid.width)candidates.push(z*grid.width+col);}
    return candidates.sort((a,b)=>Math.hypot(grid.points[a]!.x-point.x,grid.points[a]!.z-point.z)-Math.hypot(grid.points[b]!.x-point.x,grid.points[b]!.z-point.z))
      .find(i=>grid.adjacent[i]!.length && clear(point,grid.points[i]!)) ?? -1;
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
    while (next>current+1 && !clear(path[current]!,path[next]!)) next--;
    route.push(path[next]!); current=next;
  }
  return route;
}
