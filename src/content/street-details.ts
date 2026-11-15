import { COAST_PATH, ISLAND_CENTER } from '@content/island';

export const CAR_SIZE = {width:1.58,depth:3.42} as const;
export const STREET_BUSHES = [
  [2,37],[2,38],[2,43],[11.8,37],[11.8,38],[11.8,43],
  [3,53],[3,58],[3,61],[11.8,53],[11.8,58],[11.8,61],
  [52.1,21],[52.1,26],[52.1,27],[61,21],[61,26],[61,27],
  [76,9],[84,9.5],[92,12],[95,53],[78,58],[79,61.5],[96,42],
].map(([x,z],i)=>({x:x!,z:z!,rotation:i*1.3,width:1.3,depth:1.25}));
export const STREET_BEDS = [
  [21.5,20],[26.5,28],[5,36],[10,44],[4,38],[11,42.5],
  [54,20],[58,28],[59,22],[36.5,54.3],[44,58],
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
