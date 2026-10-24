import { expect,it } from 'vitest';
import * as THREE from 'three';
import { addHeroSilhouette } from '@game/render/hero-silhouette';
import { HARBOR_OBSTACLES,isPierPosition } from '@content/harbor';
import { TownWorld,isWalkableTownPosition,isTownWorldState } from '@game/systems/town-world';
import { walkingRoute,clearWalkingSegment } from '@game/systems/town-navigation';
import { parseTownSave } from '@game/systems/town-save';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { updateHarbor } from '@game/render/harbor-view';

it('orders a depth-tested silhouette before normal hero geometry without copying buffers',()=>{
  const root=new THREE.Group(),pivot=new THREE.Group(),source=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
  root.add(pivot);pivot.add(source);addHeroSilhouette(root);
  const proxy=source.children[0] as THREE.Mesh;const material=proxy.material as THREE.MeshBasicMaterial;
  expect(proxy.geometry).toBe(source.geometry);expect(material.depthFunc).toBe(THREE.GreaterDepth);
  expect(material.depthWrite).toBe(false);expect(material.transparent).toBe(false);
  expect(proxy.renderOrder).toBeLessThan(source.renderOrder);expect(proxy.renderOrder).toBeGreaterThan(0);
  expect(proxy.castShadow).toBe(false);pivot.rotation.x=.5;root.updateMatrixWorld(true);
  expect(proxy.matrixWorld.equals(source.matrixWorld)).toBe(true);
});
it('keeps the pier T-junction connected and stops at the sea edge',()=>{
  for(let z=68;z<90.2;z+=.1)expect(isWalkableTownPosition({x:58,z})).toBe(true);
  for(let x=51.6;x<=64.4;x+=.1)expect(isWalkableTownPosition({x,z:88.5})).toBe(true);
  expect(isPierPosition({x:58,z:90.7})).toBe(false);expect(isWalkableTownPosition({x:60.2,z:82})).toBe(false);
  const world=new TownWorld({x:58,z:89});for(let i=0;i<60;i++)world.move(0,1,.05);
  expect(world.position.z).toBeLessThanOrEqual(90.5);expect(world.position.z).toBeGreaterThan(89);
});
it.each(HARBOR_OBSTACLES)('blocks solid coastal furniture at $x,$z',obstacle=>{
  expect(isWalkableTownPosition(obstacle)).toBe(false);
});
it.each([{x:58,z:89},{x:0,z:66.5}])('routes from town to the landmark at $x,$z',goal=>{
  const path=walkingRoute({x:32,z:35},goal,null);expect(path.length).toBeGreaterThan(1);
  for(let i=1;i<path.length;i++)expect(clearWalkingSegment(path[i-1]!,path[i]!,null)).toBe(true);
});
it('migrates a validated pre-lighthouse save and round-trips a new pier save',()=>{
  const encode=(point:{x:number;z:number},layout:string)=>JSON.stringify({schemaVersion:1,layout,buildId:'cybershield-first-aid',savedAt:123,stage:'completed',world:{interiorId:null,position:point,outdoorReturn:point}});
  const old=parseTownSave(encode({x:0,z:63},'coastal-island-v2'));
  expect(old?.stage).toBe('completed');expect(isTownWorldState(old?.world)).toBe(true);
  expect(old?.world.position).not.toEqual({x:0,z:63});
  const pier=parseTownSave(encode({x:58,z:89},'coastal-island-v3'));
  expect(pier?.world.position).toEqual({x:58,z:89});
  expect(parseTownSave(encode({x:58,z:89},'coastal-island-v2'))).toBeNull();
});
it('offers coastal information without consuming mission progress',()=>{
  const mission=new FirstAidMission(new TownWorld({x:0,z:66.5}));
  expect(mission.interaction?.kind).toBe('ambient');expect(mission.interact()).toBe(true);
  expect(mission.life.message).toContain('Морской маяк');expect(mission.snapshot.stage).toBe('meet-master');mission.destroy();
});
it('animates the beacon and moored boats without drifting their mooring positions',()=>{
  const root=new THREE.Group(),beacon=new THREE.Group(),boat=new THREE.Group();beacon.name='lighthouse-beacon';boat.name='harbor-boat-0';boat.position.set(62.2,0,82);root.add(beacon,boat);
  updateHarbor(root,12);expect(beacon.rotation.y).toBeCloseTo(2.64);expect(boat.position.x).toBe(62.2);expect(boat.position.z).toBe(82);
  const before=boat.position.clone();updateHarbor(root,NaN);expect(boat.position).toEqual(before);
});
