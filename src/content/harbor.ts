import type { TownPosition } from '@game/systems/town-world';
import type { TownBuilding } from '@content/town';
import { coastRatio, SEA_LEVEL } from '@content/island';

export const LIGHTHOUSE = {
  id: 'lighthouse', name: 'Морской маяк', kind: 'lighthouse',
  x: 70.5, z: 65, width: 4.4, depth: 4.4, floors: 1, color: 0xd8d0b7, roof: 0x3c5356,
} as const satisfies TownBuilding;
export const PIER_ORIGIN={x:58,z:68} as const;
export const PIER_DECKS=[{x:58,z:77.6,width:3.6,depth:19.2},{x:58,z:89,width:14,depth:3.6}] as const;
export const COASTAL_TREES=[
  [20,-1],[26,-1],[38,-1],[44,-1],[58,-1],[64,0],
  [20,67],[26,67],[38,67],[44,67],[62,66],[64,61],
].map(([x,z],i)=>({x:x!,z:z!,scale:.8+(i%3)*.1,rotation:i*1.7}));
/** Rail footprints also block the short shore section where land meets the deck. */
export const HARBOR_RAILS=[
  ...[-1,1].flatMap(side=>[
    {x:58+side*1.66,z:81,width:.055,depth:12},
    {x:58+side*6.8,z:89,width:.055,depth:3.2},
    {x:58+side*4.35,z:87.35,width:5.1,depth:.055},
  ]),
  ...[{x:52,width:1.6},{x:58,width:5.6},{x:64,width:1.6}].map(rail=>({...rail,z:90.6,depth:.055})),
];
export const HARBOR_BOATS = [54, 62].map(x => ({
  x, z: 93.35, rotation: 0, boarding: { x, z: 90.15 },
}));
export const BOAT_RADIUS = 2.4;

export function boatAltitude(time: number, index: number): number {
  return SEA_LEVEL + .15 + Math.sin(time * 1.1 + index * 2) * .035;
}

export function isNavigableWater(point: TownPosition, boatIndex: number): boolean {
  const coast = coastRatio(point);
  // The shoreline and the edge of the ocean mesh are the only world limits.
  if (!Number.isFinite(coast) || coast < 1.04 || Math.max(Math.abs(point.x), Math.abs(point.z)) > 340) return false;
  if (PIER_DECKS.some(deck => Math.abs(point.x - deck.x) < deck.width / 2 + BOAT_RADIUS &&
      Math.abs(point.z - deck.z) < deck.depth / 2 + BOAT_RADIUS)) return false;
  return HARBOR_BOATS.every((boat, index) => index === boatIndex ||
    Math.hypot(point.x - boat.x, point.z - boat.z) >= BOAT_RADIUS * 2);
}

/** Test the union before adding player clearance, keeping the T-junction open. */
export function isPierPosition(point:TownPosition):boolean {
  const inside=(x:number,z:number):boolean=>PIER_DECKS.some(d=>Math.abs(x-d.x)<=d.width/2&&Math.abs(z-d.z)<=d.depth/2);
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||!inside(point.x,point.z))return false;
  for(let i=0;i<8;i++)if(!inside(point.x+Math.cos(i*Math.PI/4)*.3,point.z+Math.sin(i*Math.PI/4)*.3))return false;
  return true;
}

/** Shore-side forecourt connects the lighthouse entrance to the pier and promenade. */
export const HARBOR_PATHS=[
  {x:58,z:66,width:3.6,depth:5},
  {x:64.3,z:68.5,width:16.6,depth:2.4},
  {x:LIGHTHOUSE.x,z:67.8,width:2.4,depth:2.6},
] as const;
export const HARBOR_OBSTACLES=[
  LIGHTHOUSE,...HARBOR_RAILS,
  {x:52,z:89.5,width:.3,depth:.3},{x:64,z:89.5,width:.3,depth:.3},
  ...COASTAL_TREES.map(p=>({...p,width:.4*p.scale,depth:.4*p.scale})),
];
