// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWebTown } from '@game/render/web-town';
import { enhanceSurfaceMaterials } from '@game/render/surface-materials';
import { disposeObject } from '@game/render/town-assets';
import { TownLifeView } from '@game/render/town-life-view';
import { TownLife } from '@game/systems/town-life';
import { TownWorld } from '@game/systems/town-world';
import { TOWN_BUILDINGS } from '@content/town';
import { TOWN_TREES } from '@content/town-props';
import { WILD_TREES } from '@content/town-life';

afterEach(()=>vi.restoreAllMocks());

it('loads every authored lot and instances every tree with matching wind shadows',async()=>{
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  const assets=new Map<string,THREE.Group>();
  for(const name of ['tree','architecture-details']){
    const bytes=await readFile(new NodeURL(`../../public/assets/models/island-detail/${name}.glb`,import.meta.url));
    const data=new ArrayBuffer(bytes.byteLength);new Uint8Array(data).set(bytes);
    assets.set(name,(await new GLTFLoader().parseAsync(data,'')).scene);
  }
  const time={value:2},town=createWebTown(assets,time);
  enhanceSurfaceMaterials(town);
  for(const lot of TOWN_BUILDINGS){
    const building=town.getObjectByName(`building-${lot.id}`)!;
    expect(building.getObjectByName(`detail-${lot.id}`)).toBeDefined();
    expect(building.scale.toArray()).toEqual([1,1,1]);
    expect(building.position.toArray()).toEqual([lot.x,0,lot.z]);
  }
  const foliage:THREE.InstancedMesh[]=[];
  town.traverse(object=>{if(object instanceof THREE.InstancedMesh && object.userData.animatedFoliage)foliage.push(object);});
  expect(foliage).toHaveLength(3);
  expect(foliage.reduce((sum,mesh)=>sum+mesh.count,0)).toBe(TOWN_TREES.length+WILD_TREES.length);
  const depthDisposals=[];
  for(const mesh of foliage){
    const material=mesh.material as THREE.MeshStandardMaterial;
    const color={...THREE.ShaderLib.standard,uniforms:{...THREE.ShaderLib.standard.uniforms}};
    const depth={...THREE.ShaderLib.depth,uniforms:{...THREE.ShaderLib.depth.uniforms}};
    material.onBeforeCompile(color as Parameters<typeof material.onBeforeCompile>[0],{} as THREE.WebGLRenderer);
    mesh.customDepthMaterial!.onBeforeCompile(depth as Parameters<typeof material.onBeforeCompile>[0],{} as THREE.WebGLRenderer);
    expect(color.uniforms.foliageTime).toBe(time);expect(depth.uniforms.foliageTime).toBe(time);
    expect(color.vertexShader.match(/vec3 windOrigin[\s\S]*?transformed.z[^;]+;/)?.[0])
      .toBe(depth.vertexShader.match(/vec3 windOrigin[\s\S]*?transformed.z[^;]+;/)?.[0]);
    expect(color.fragmentShader).toContain('islandGrain');
    expect(material.customProgramCacheKey()).toContain('foliage-wind-v2');
    const expanded=mesh.boundingSphere!.radius;mesh.computeBoundingSphere();
    expect(expanded-mesh.boundingSphere!.radius).toBeCloseTo(.2);
    depthDisposals.push(vi.spyOn(mesh.customDepthMaterial!,'dispose'));
  }
  disposeObject(town);
  expect(depthDisposals.every(spy=>spy.mock.calls.length===1)).toBe(true);
});

it('animates birds and idle arms without changing resident scale or simulation positions',()=>{
  const life=new TownLife(new TownWorld()),prototype=new THREE.Group();
  for(const name of ['left-arm','right-arm','left-leg','right-leg']){const limb=new THREE.Group();limb.name=name;prototype.add(limb);}
  const view=new TownLifeView(life,prototype),simulation=life.residents.map(r=>({...r.position}));
  const bird=view.group.getObjectByName('coastal-bird-0')!,position=bird.position.clone();
  const actor=view.group.getObjectByName('resident-gardener')!,arm=actor.getObjectByName('left-arm')!;
  const before=arm.rotation.x;
  for(let i=0;i<30;i++)view.update(.05);
  expect(bird.position.distanceTo(position)).toBeGreaterThan(.1);
  expect(arm.rotation.x).not.toBe(before);expect(actor.scale.toArray()).toEqual([1,1,1]);
  expect(life.residents.map(r=>r.position)).toEqual(simulation);
  const current=bird.position.clone();view.update(Number.NaN);view.update(Infinity);view.update(-1);
  expect(bird.position.toArray()).toEqual(current.toArray());
  disposeObject(view.group);life.destroy();
});
