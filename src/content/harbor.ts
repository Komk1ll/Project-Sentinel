import type { TownPosition } from '@game/systems/town-world';
export const LIGHTHOUSE={x:0,z:63,width:4.4,depth:4.4} as const;
export const PIER_ORIGIN={x:58,z:68} as const;
export const PIER_DECKS=[{x:58,z:77.6,width:3.6,depth:19.2},{x:58,z:89,width:14,depth:3.6}] as const;
export const COASTAL_TREES=[
  [20,-1],[26,-1],[38,-1],[44,-1],[58,-1],[64,0],
  [20,67],[26,67],[38,67],[44,67],[62,66],[66,64],
].map(([x,z],i)=>({x:x!,z:z!,scale:.8+(i%3)*.1,rotation:i*1.7}));
/** Rail footprints also block the short shore section where land meets the deck. */
export const HARBOR_RAILS=[
  ...[-1,1].flatMap(side=>[
    {x:58+side*1.66,z:81,width:.055,depth:12},
    {x:58+side*6.8,z:89,width:.055,depth:3.2},
    {x:58+side*4.35,z:87.35,width:5.1,depth:.055},
  ]),
  {x:58,z:90.6,width:13.6,depth:.055},
];
export const HARBOR_OBSTACLES=[LIGHTHOUSE,...HARBOR_RAILS,{x:52,z:89.5,width:.3,depth:.3},{x:64,z:89.5,width:.3,depth:.3},...COASTAL_TREES.map(p=>({...p,width:.4*p.scale,depth:.4*p.scale}))];
export const HARBOR_BOATS=[{x:62.2,z:82,rotation:.08},{x:53.6,z:83,rotation:-.12}] as const;

/** Test the union before adding player clearance, keeping the T-junction open. */
export function isPierPosition(point:TownPosition):boolean {
  const inside=(x:number,z:number):boolean=>PIER_DECKS.some(d=>Math.abs(x-d.x)<=d.width/2&&Math.abs(z-d.z)<=d.depth/2);
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||!inside(point.x,point.z))return false;
  for(let i=0;i<8;i++)if(!inside(point.x+Math.cos(i*Math.PI/4)*.3,point.z+Math.sin(i*Math.PI/4)*.3))return false;
  return true;
}
