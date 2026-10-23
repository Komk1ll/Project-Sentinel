import type { TownPosition } from '@game/systems/town-world';
export const ISLAND_CENTER={x:46,z:32};
export const ISLAND_BOUNDS={minX:-20,maxX:112,minZ:-18,maxZ:82};
export const SEA_LEVEL=-.65;

/** Shared irregular superellipse, keeping every existing town lot safely inland. */
export function coastRadius(angle:number):number {
  return Math.pow(Math.pow(Math.cos(angle)/62,4)+Math.pow(Math.sin(angle)/46,4),-.25)
    *(1+.025*Math.sin(angle*3)+.018*Math.sin(angle*7));
}
export function coastRatio(point:TownPosition):number {
  const dx=point.x-ISLAND_CENTER.x,dz=point.z-ISLAND_CENTER.z;
  return Math.hypot(dx,dz)/coastRadius(Math.atan2(dz,dx));
}
export function isIslandLand(point:TownPosition):boolean {
  return Number.isFinite(point.x)&&Number.isFinite(point.z)&&coastRatio(point)<=.94;
}
export function coastOutline(fraction=1):TownPosition[]{
  return Array.from({length:192},(_,i)=>{const angle=i/192*Math.PI*2,r=coastRadius(angle)*fraction;
    return {x:ISLAND_CENTER.x+Math.cos(angle)*r,z:ISLAND_CENTER.z+Math.sin(angle)*r};});
}
/** Rounded rectangular promenade with a complete, walkable loop. */
export const COAST_PATH:readonly TownPosition[]=Array.from({length:4},(_,corner)=>{
  const centers=[{x:84,z:10},{x:84,z:54},{x:8,z:54},{x:8,z:10}];
  const center=centers[corner]!;
  return Array.from({length:17},(_,i)=>{const angle=-Math.PI/2+corner*Math.PI/2+i/16*Math.PI/2;
    return {x:center.x+Math.cos(angle)*16,z:center.z+Math.sin(angle)*16};});
}).flat();
export const MILL={x:86,z:24};
