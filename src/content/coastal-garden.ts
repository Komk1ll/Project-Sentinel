import { COAST_PATH,ISLAND_CENTER,coastRadius,isIslandLand } from '@content/island';
import type { TownPosition } from '@game/systems/town-world';

export interface GardenWalk { readonly points:readonly TownPosition[]; readonly width:number; readonly closed:boolean; }
const ellipse=(x:number,z:number,rx:number,rz:number):TownPosition[]=>Array.from({length:64},(_,i)=>({x:x+Math.cos(i/64*Math.PI*2)*rx*(1+.035*Math.sin(i/64*Math.PI*6)+.025*Math.cos(i/64*Math.PI*10)),z:z+Math.sin(i/64*Math.PI*2)*rz*(1+.035*Math.sin(i/64*Math.PI*6)+.025*Math.cos(i/64*Math.PI*10))}));
/** Smooth paths remain data shared with placement clearance and the minimap. */
export const GARDEN_WALKS:readonly GardenWalk[]=[
  {points:ellipse(80,5,10,7),width:1.8,closed:true},
  {points:ellipse(88,58,11.5,8.8),width:1.8,closed:true},
  {points:ellipse(85.5,23,12,8.5),width:1.8,closed:true},
  {points:[{x:70,z:16},{x:70,z:24},{x:72,z:32},{x:74,z:40},{x:78,z:46},{x:80,z:50}],width:2,closed:false},
];
export function segmentDistance(p:TownPosition,a:TownPosition,b:TownPosition):number {
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
  return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
export function onGardenWalk(p:TownPosition,clearance=0):boolean {
  return GARDEN_WALKS.some(w=>w.points.some((a,i)=>{
    const b=w.points[i+1]??(w.closed?w.points[0]:undefined);
    return b!==undefined&&segmentDistance(p,a,b)<w.width/2+clearance;
  }));
}
export const GARDEN_BRIDGE={x:88,z:58,width:17,depth:2.6} as const;
export function onGardenBridge(p:TownPosition,inset=.3):boolean {
  return Math.abs(p.x-88)<=8.5-inset&&Math.abs(p.z-58)<=1.3-inset;
}
export function gardenBridgeHeight(p:TownPosition):number {
  return onGardenBridge(p,0)?Math.min(.24,(8.5-Math.abs(p.x-88))*.12):0;
}
export const BRIDGE_RAILS=[-1,1].map(side=>({x:88,z:58+side*1.18,width:16.2,depth:.075}));

export const ORCHARD_FENCES=[
  ...[2,12.2].flatMap(x=>[52.5,59.5].map(z=>({x,z,rotation:Math.PI/2}))),
  ...[4.2,11.2].flatMap(x=>[51.6,61.7].map(z=>({x,z,rotation:0}))),
];
export const SEAWALLS=COAST_PATH.flatMap((p,i)=>{
  const b=COAST_PATH[(i+1)%COAST_PATH.length]!,length=Math.hypot(b.x-p.x,b.z-p.z),count=Math.floor(length/2.1);
  const dx=b.x-p.x,dz=b.z-p.z;
  return Array.from({length:count},(_,j)=>{
    const t=(j+.5)/count,x=p.x+dx*t,z=p.z+dz*t,r=Math.hypot(x-ISLAND_CENTER.x,z-ISLAND_CENTER.z);
    return {x:x+(x-ISLAND_CENTER.x)/r*2.2,z:z+(z-ISLAND_CENTER.z)/r*2.2,rotation:-Math.atan2(dz,dx)};
  });
}).filter(p=>(p.x<4||p.z>65)&&!(p.x>41&&p.x<76&&p.z>62)
  && ![16,32,48].some(c=>p.x<0&&Math.abs(p.z-c)<2.5));
export const GARDEN_OBSTACLES=[
  ...BRIDGE_RAILS,
  ...ORCHARD_FENCES.map(p=>({...p,width:Math.abs(Math.cos(p.rotation))*2+.1,depth:Math.abs(Math.sin(p.rotation))*2+.1})),
  ...SEAWALLS.map(p=>({...p,width:Math.abs(Math.cos(p.rotation))*2+Math.abs(Math.sin(p.rotation))*.53,depth:Math.abs(Math.sin(p.rotation))*2+Math.abs(Math.cos(p.rotation))*.53})),
];
/** Shore models are outside the playable envelope and leave two sandy coves. */
export const COAST_CLIFFS=[[-2.2,-1.0,25],[-.7,.65,30],[1.95,2.25,9]].flatMap(([start,end,count])=>
  Array.from({length:count!},(_,i)=>{
    const a=start!+(end!-start!)*(i+.5)/count!,r=coastRadius(a)*(1.005+.012*Math.sin(i*2.3));
    return {x:ISLAND_CENTER.x+Math.cos(a)*r,z:ISLAND_CENTER.z+Math.sin(a)*r,
      rotation:-a-Math.PI/2+(i%3-.5)*.22,scale:1+(i*7%6)*.16,y:-.28+Math.sin(i*1.7)*.18};
  })).filter(p=>!(p.x>36&&p.x<78&&p.z>66));

export const GARDEN_TREES=[[68,2],[70,8],[94,6],[96,10],[94,38],[100,42],[78,43],[74,56],[95,68]]
  .map(([x,z],i)=>({x:x!,z:z!,rotation:i*2.4,scale:.85+(i%3)*.12}))
  .filter(p=>isIslandLand(p)&&!onGardenWalk(p,1.4)&&COAST_PATH.every((q,i)=>segmentDistance(p,q,COAST_PATH[(i+1)%COAST_PATH.length]!)>2.8));
export const GARDEN_TREE_OBSTACLES=GARDEN_TREES.map(p=>({...p,width:.4*p.scale,depth:.4*p.scale}));
