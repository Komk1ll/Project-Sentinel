import { COAST_PATH, ISLAND_CENTER } from '@content/island';

export const CAR_SIZE = {width:1.58,depth:3.42} as const;
export const STREET_BUSHES = [
  [2,37],[2,41],[2,45],[13,37],[13,41],[13,45],
  [3,53],[3,57],[3,61],[13,53],[13,57],[13,61],
  [51,21],[51,25],[51,29],[61,21],[61,25],[61,29],
  [76,9],[84,12],[92,12],[97,54],[78,58],[80,64],[96,42],
].map(([x,z],i)=>({x:x!,z:z!,rotation:i*1.3,width:1.3,depth:1.25}));
export const STREET_BEDS = [
  [21.5,20],[26.5,28],[5,36],[10,44],[4,40],[12,40],
  [54,20],[58,28],[60,24],[35,54],[45,58],
].map(([x,z])=>({x:x!,z:z!,rotation:0,width:1.35,depth:1.05}));
export const STREET_LAMPS = [
  ...[16,32,48].flatMap(x=>[8,24,40,56].map(z=>({x:x-2.8,z}))),
  ...Array.from({length:20},(_,i)=>{
    const p=COAST_PATH[Math.floor(i*COAST_PATH.length/20)]!;
    const dx=p.x-ISLAND_CENTER.x,dz=p.z-ISLAND_CENTER.z,length=Math.hypot(dx,dz);
    return {x:p.x+dx/length*2.2,z:p.z+dz/length*2.2};
  }),
].map(p=>({...p,rotation:0,width:.34,depth:.34}));
// Bins sit beside the garden benches, away from the residents' patrol paths.
export const STREET_BINS = [[22.15,26],[28.15,22],[36.15,45],[6.15,42],[12.15,38],[55.15,26]]
  .map(([x,z])=>({x:x!,z:z!,rotation:0,width:.5,depth:.5}));
export const STREET_OBSTACLES = [...STREET_BUSHES,...STREET_BEDS,...STREET_LAMPS,...STREET_BINS];
