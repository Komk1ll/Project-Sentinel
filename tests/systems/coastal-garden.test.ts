import { expect,it } from 'vitest';
import { COAST_CLIFFS,GARDEN_OBSTACLES,GARDEN_TREE_OBSTACLES,GARDEN_WALKS,gardenBridgeHeight,onGardenBridge } from '@content/coastal-garden';
import { COAST_PATH,coastRadius,shorelineRadius,ISLAND_CENTER } from '@content/island';
import { TownWorld,isTownWorldState,isWalkableTownPosition } from '@game/systems/town-world';
import { clearWalkingSegment,walkingRoute } from '@game/systems/town-navigation';
import { parseTownSave } from '@game/systems/town-save';
import { pathRibbon } from '@game/render/world-surface';
import { createIslandTerrain,createOcean } from '@game/render/island-terrain';
import * as THREE from 'three';

it.each([...GARDEN_OBSTACLES,...GARDEN_TREE_OBSTACLES])('blocks new solid scenery at $x,$z',point=>expect(isWalkableTownPosition(point)).toBe(false));
it('keeps garden walks and the existing full promenade clear',()=>{
  for(const walk of GARDEN_WALKS)for(const point of walk.points)expect(isWalkableTownPosition(point),JSON.stringify(point)).toBe(true);
  for(const p of COAST_PATH)expect(isWalkableTownPosition(p)).toBe(true);
});
it('crosses the pond on the bridge, rejects water alongside and stops at the rails',()=>{
  expect(onGardenBridge({x:88,z:58})).toBe(true);
  expect(isWalkableTownPosition({x:88,z:60})).toBe(false);
  for(let x=79;x<=97;x+=.1)expect(isWalkableTownPosition({x,z:58}),`${x}`).toBe(true);
  const world=new TownWorld({x:88,z:58});for(let i=0;i<30;i++)world.move(0,1,.05);
  expect(world.position.z).toBeLessThan(58.9);
  expect(gardenBridgeHeight({x:88,z:58})).toBe(.24);expect(gardenBridgeHeight({x:79.5,z:58})).toBe(0);
  expect(gardenBridgeHeight({x:88,z:62})).toBe(0);
});
it.each([{x:88,z:58},{x:76.5,z:58},{x:98,z:58},{x:80,z:12}])('routes to garden destination $x,$z',goal=>{
  const path=walkingRoute({x:32,z:35},goal,null);expect(path.length).toBeGreaterThan(1);
  for(let i=1;i<path.length;i++)expect(clearWalkingSegment(path[i-1]!,path[i]!,null)).toBe(true);
});
const encode=(point:{x:number;z:number},layout:string)=>JSON.stringify({schemaVersion:1,layout,buildId:'cybershield-first-aid',savedAt:1,stage:'completed',world:{interiorId:null,position:point,outdoorReturn:point}});
it('validates historical positions before migration, retains mission progress and saves the new bridge',()=>{
  const point={x:2,z:52.5},restored=parseTownSave(encode(point,'coastal-island-v4'));
  expect(restored?.stage).toBe('completed');expect(restored?.layout).toBe('coastal-island-v5');
  expect(isTownWorldState(restored?.world)).toBe(true);expect(restored?.world.position).not.toEqual(point);
  expect(parseTownSave(encode(point,'coastal-island-v5'))).toBeNull();
  expect(parseTownSave(encode({x:88,z:58},'coastal-island-v4'))).toBeNull();
  expect(parseTownSave(encode({x:88,z:58},'coastal-island-v5'))?.world.position).toEqual({x:88,z:58});
});
it('keeps cliff modules outside stable walking land and preserves a shoreline envelope',()=>{
  for(const p of COAST_CLIFFS){const a=Math.atan2(p.z-ISLAND_CENTER.z,p.x-ISLAND_CENTER.x);expect(Math.hypot(p.x-46,p.z-32)).toBeGreaterThan(coastRadius(a)*.98);}
  for(let i=0;i<360;i++)expect(shorelineRadius(i*Math.PI/180)/coastRadius(i*Math.PI/180)).toBeGreaterThan(.94);
  const terrain=createIslandTerrain(),positions=terrain.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)expect([positions.getX(i),positions.getY(i),positions.getZ(i)].every(Number.isFinite)).toBe(true);
  const ocean=createOcean({value:0});expect(ocean.geometry.index!.count/3).toBe(18432);
});
it('does not close an open garden connector with an unintended triangle strip',()=>{
  const mesh=pathRibbon([{x:0,z:0},{x:0,z:2},{x:2,z:2}],1,0xffffff,.055,false);
  expect(mesh.geometry.index!.count).toBe(12);
  expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
});
