import { readFile } from 'node:fs/promises';
import { expect,it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ActorAnimation } from '@game/render/actor-animation';
import { createStreetDressing } from '@game/render/street-dressing';
import { STREET_LAMPS,STREET_BUSHES } from '@content/street-details';
import { parseTownSave } from '@game/systems/town-save';
import { isWalkableTownPosition,isTownWorldState } from '@game/systems/town-world';

async function load(name:string){
  const bytes=await readFile(new URL(`../../public/assets/models/evening/${name}.glb`,import.meta.url));
  const data=new ArrayBuffer(bytes.byteLength);new Uint8Array(data).set(bytes);
  return new GLTFLoader().parseAsync(data,'');
}
function save(point:{x:number;z:number},layout='coastal-island-v1'){
  return JSON.stringify({schemaVersion:1,layout,buildId:'cybershield-first-aid',savedAt:123,stage:'completed',world:{interiorId:null,position:point,outdoorReturn:point}});
}
it('relocates a valid earlier save out of a new shrub without losing completion',()=>{
  const point={x:52.1,z:26};expect(isWalkableTownPosition(point)).toBe(false);
  const restored=parseTownSave(save(point));
  expect(restored?.stage).toBe('completed');expect(restored?.layout).toBe('coastal-island-v5');
  expect(isTownWorldState(restored?.world)).toBe(true);
  expect(Math.hypot(restored!.world.position.x-point.x,restored!.world.position.z-point.z)).toBeLessThanOrEqual(4);
  expect(parseTownSave(save({x:51,z:25},'coastal-island-v2'))).toBeNull();
  expect(parseTownSave(save({x:40,z:40}))).toBeNull();
  expect(parseTownSave(save({x:88,z:58}))).toBeNull();
});
it('retains an interior and its delivery progress while migrating its layout',()=>{
  const encoded=JSON.parse(save({x:32,z:35}));encoded.stage='deliver-aid';
  encoded.world={interiorId:'clinic',position:{x:0,z:3},outdoorReturn:{x:40,z:45}};
  const restored=parseTownSave(JSON.stringify(encoded));
  expect(restored?.world).toEqual(encoded.world);expect(restored?.stage).toBe('deliver-aid');
});
it('plays the shipped Blender clips, blends back to rest and keeps world position and scale',async()=>{
  const gltf=await load('hero'),root=gltf.scene;
  expect(gltf.animations.map(clip=>clip.name).sort()).toEqual(['Greet','Idle','Walk']);
  const animation=new ActorAnimation(root,gltf.animations),limb=root.getObjectByName('left-leg')!;
  const rest=limb.quaternion.clone();root.position.set(32,0,35);
  for(let i=0;i<5;i++)animation.update(.05,true);
  expect(limb.quaternion.angleTo(rest)).toBeGreaterThan(.3);
  for(let i=0;i<30;i++)animation.update(.05,false);
  expect(limb.quaternion.angleTo(rest)).toBeLessThan(1e-4);
  const arm=root.getObjectByName('right-arm')!,idle=arm.quaternion.clone();
  for(let i=0;i<20;i++)animation.update(.05,false,true);
  expect(arm.quaternion.angleTo(idle)).toBeGreaterThan(.5);
  const pose=arm.quaternion.clone();animation.update(NaN,false,true);animation.update(-1,false,true);
  expect(arm.quaternion.angleTo(pose)).toBeLessThan(1e-5);
  expect(root.position.toArray()).toEqual([32,0,35]);expect(root.scale.toArray()).toEqual([1,1,1]);
  animation.dispose();expect(limb.quaternion.angleTo(rest)).toBeLessThan(1e-4);
});
it('instances the street foliage and light pools without adding real lights',async()=>{
  const kit=(await load('street-kit')).scene,group=createStreetDressing(kit,{value:0});
  const lights:THREE.Light[]=[],bushes:THREE.InstancedMesh[]=[];
  group.traverse(object=>{
    if(object instanceof THREE.Light)lights.push(object);
    if(object instanceof THREE.InstancedMesh&&object.name==='street-shrub')bushes.push(object);
  });
  expect(lights).toHaveLength(0);expect(bushes.every(mesh=>mesh.count===STREET_BUSHES.length)).toBe(true);
  expect(bushes.some(mesh=>mesh.customDepthMaterial!==undefined)).toBe(true);
  expect((group.getObjectByName('lantern-light-pools') as THREE.InstancedMesh).count).toBe(STREET_LAMPS.length);
  expect(group.getObjectByName('illuminated-windows')).toBeDefined();
  expect(group.children.filter(object=>object.name.startsWith('parked-car-'))).toHaveLength(5);
});
