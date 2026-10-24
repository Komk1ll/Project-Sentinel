import type { TownPosition } from '@game/systems/town-world';
export const LIGHTHOUSE={x:66,z:65,width:4.4,depth:4.4} as const;
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
  {x:58,z:90.6,width:13.6,depth:.055},
];
export const HARBOR_BOATS=[{x:62.2,z:82,rotation:.08},{x:53.6,z:83,rotation:-.12}] as const;

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
  {x:62,z:68.5,width:12,depth:2.4},
  {x:66,z:67.8,width:2.4,depth:2.6},
] as const;
/** Both arms attach to the beach; the gap between their heads remains open. */
export const BREAKWATERS=[
  [{x:46,z:74},{x:46,z:88},{x:49,z:93},{x:52,z:94}],
  [{x:71,z:74},{x:71,z:88},{x:68,z:93},{x:65,z:94}],
] as const;
export const BREAKWATER_ROCKS=BREAKWATERS.flatMap((arm,side)=>arm.slice(1).flatMap((end,index)=>{
  const start=arm[index]!,dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz),steps=Math.ceil(length/1.25);
  return Array.from({length:steps},(_,i)=>[-1,0,1].map(row=>({
    x:start.x+dx*(i+.5)/steps-dz/length*row*.62,
    z:start.z+dz*(i+.5)/steps+dx/length*row*.62,
    y:row===0?-.28:-.65,scale:row===0?1.35:1.2,rotation:i*1.73+side+row,
  }))).flat();
}));

/** The inner rocks reach the beach and must block walking as well. */
export const HARBOR_OBSTACLES=[
  LIGHTHOUSE,...HARBOR_RAILS,
  {x:52,z:89.5,width:.3,depth:.3},{x:64,z:89.5,width:.3,depth:.3},
  ...COASTAL_TREES.map(p=>({...p,width:.4*p.scale,depth:.4*p.scale})),
  ...BREAKWATER_ROCKS.filter(p=>p.z<78).map(p=>({...p,width:2.6,depth:2.6})),
];
