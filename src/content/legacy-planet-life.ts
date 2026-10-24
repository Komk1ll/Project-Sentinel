/** Frozen globe geometry for validating old saves before island migration. */
export const PLANET_PONDS = [{x:208,z:18,width:15,depth:10},{x:112,z:59,width:11,depth:8}] as const;
export const WILD_BENCHES = [
  {x:85,z:38,rotation:0},{x:91,z:38,rotation:0},{x:205,z:27,rotation:Math.PI},
  {x:211,z:27,rotation:Math.PI},{x:149,z:36,rotation:0},{x:155,z:36,rotation:0},
];
export const WILD_TREES = Array.from({length:120},(_,i)=>({
  x:70+(i%20)*8.7+Math.sin(i*3.7)*2.4,
  z:3+Math.floor(i/20)*11+Math.cos(i*2.3)*2.8,
  rotation:i*1.7,scale:.85+(i%4)*.1,
})).filter(tree=>Math.abs(tree.z-32)>5 && !PLANET_PONDS.some(pond=>Math.abs(tree.x-pond.x)<pond.width/2+2&&Math.abs(tree.z-pond.z)<pond.depth/2+2)
  && !(Math.abs(tree.x-152)<6&&Math.abs(tree.z-24)<7));
