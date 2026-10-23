// @vitest-environment jsdom
import { URL as NodeURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, Box3, Vector3, Quaternion, ShaderMaterial, MeshStandardMaterial, ShaderLib } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeRenderer } from '@game/render/ThreeRenderer';
import { TownWorld } from '@game/systems/town-world';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { CameraZoom } from '@game/systems/camera-zoom';
import { buildingEntrance, TOWN_BUILDINGS } from '@content/town';
import { MASTER, MEDIC } from '@content/first-aid';
import { approachMaster, leaveWorkshop, walkTo } from '../fixtures/first-aid-route';


// Retain the production scene and meshes, stubbing only the unavailable GPU backend.
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      shadowMap = { enabled: false, type: 0 };
      toneMapping = 0;
      toneMappingExposure = 1;
      outputColorSpace = '';
      setPixelRatio(): void {}
      setClearColor(): void {}
      setSize(): void {}
      render(): void {}
      dispose(): void {}
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

it('loads the shipped GLBs, delivers the parcel, reuses rooms and releases their geometry', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const requested: string[] = [];
  // Replace transport only: decode the exact shipped binaries with the real GLTFLoader.
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async function (url) {
    const path = new URL(url).pathname;
    const filename = path.split('/').at(-1)!;
    requested.push(filename);
    const bytes = await readFile(new NodeURL(`../../public${path}`, import.meta.url));
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new GLTFLoader().parseAsync(buffer, '');
  });
  const host = document.createElement('div'); host.id = 'cozy-test'; document.body.append(host);
  const world = new TownWorld();
  const firstAid = new FirstAidMission(world);
  const renderer = new ThreeRenderer({ containerId: host.id, world, firstAid, zoom: new CameraZoom() });
  try {
    // Models can finish loading after the player has already entered a fallback room.
    approachMaster(firstAid); renderer.render();
    await renderer.loadVisuals(); renderer.render();
    expect(requested).toHaveLength(12);
    const workshop = renderer.scene.getObjectByName('cozy-interior-station')!;
    const town = renderer.scene.getObjectByName('web-town')!;
    const hero = renderer.scene.getObjectByName('web-hero')!;
    expect(workshop).toBeDefined(); expect(town.visible).toBe(false);
    expect(renderer.scene.getObjectByName('island-ocean')!.visible).toBe(false);
    expect(hero.getObjectByName('left-leg')).toBeDefined();
    const parcel = hero.getObjectByName('aid-kit-parcel')!;
    expect(parcel.parent?.name).toBe('aid-kit-socket');
    expect(parcel.visible).toBe(false);
    expect(new Box3().setFromObject(hero).getSize(new Vector3()).y).toBeCloseTo(1.7);
    // The stub GPU does not perform WebGLRenderer's matrix propagation.
    renderer.scene.updateMatrixWorld(true);
    for (const id of ['station', 'clinic', 'home-7']) {
      const building=town.getObjectByName(`building-${id}`)!;
      expect(building.scale.toArray()).toEqual([1,1,1]);
      const data=TOWN_BUILDINGS.find(b=>b.id===id)!;
      const frame={position:new Vector3(data.x,0,data.z),up:new Vector3(0,1,0)};
      expect(building.position.distanceTo(frame.position)).toBeLessThan(1e-6);
      expect(new Vector3(0,1,0).applyQuaternion(building.quaternion).distanceTo(frame.up)).toBeLessThan(1e-6);
      const local=building.clone(true);local.position.set(0,0,0);local.quaternion.identity();local.updateMatrixWorld(true);
      const door=new Box3().setFromObject(local.getObjectByName('door-panel')!);
      const entry=buildingEntrance(TOWN_BUILDINGS.find(b=>b.id===id)!);
      expect(door.getSize(new Vector3()).y).toBeCloseTo(2.2);
      expect(door.getCenter(new Vector3()).x).toBeCloseTo(0);
      expect(door.max.z).toBeCloseTo(entry.z-TOWN_BUILDINGS.find(b=>b.id===id)!.z-(id === 'station' ? 1.07 : 1));
    }
    expect(requested).not.toContain('town.glb');
    expect(requested).not.toContain('interior-home-7.glb');
    expect(town.getObjectByName('building-home-6')).toBeUndefined();
    expect(town.getObjectByName('tree-instances')).toBeDefined();
    expect(town.getObjectByName('bench-instances')).toBeDefined();
    const master = renderer.scene.getObjectByName(MASTER.id)!;
    expect(master.getObjectByName('aid-kit-parcel')!.visible).toBe(true);
    firstAid.interact(); renderer.render();
    expect(master.getObjectByName('aid-kit-parcel')!.visible).toBe(false);
    expect(parcel.visible).toBe(true);
    expect(hero.getObjectByName('left-arm')!.rotation.x).toBeCloseTo(-.75);
    const leg=hero.getObjectByName('left-leg')!;
    const before=new Box3().setFromObject(leg).clone();
    world.move(-1,0,.04);renderer.render(.04);renderer.scene.updateMatrixWorld(true);
    expect(new Box3().setFromObject(leg).equals(before)).toBe(false);
    expect(hero.scale.toArray()).toEqual([1,1,1]);
    leaveWorkshop(firstAid); renderer.render();
    expect(town.visible).toBe(true);
    walkTo(world, { x: 32, z: 46 }); walkTo(world, { x: 40, z: 46 }); firstAid.interact();
    walkTo(world, { x: 0, z: .25 }); walkTo(world, { x: .75, z: .25 }); renderer.render();
    const medic = renderer.scene.getObjectByName(MEDIC.id)!;
    const resident = renderer.scene.getObjectByName('clinic-resident')!;
    expect(medic.visible).toBe(true); expect(resident.visible).toBe(false);
    firstAid.interact(); renderer.render();
    expect(firstAid.snapshot.stage).toBe('completed');
    expect(parcel.visible).toBe(false);
    expect(medic.getObjectByName('aid-kit-parcel')!.visible).toBe(true);
    expect(resident.visible).toBe(true);
    expect(new Box3().setFromObject(resident).getSize(new Vector3()).y).toBeLessThan(1.6);
    const clinic = renderer.scene.getObjectByName('cozy-interior-clinic')!;
    walkTo(world, { x: 0, z: .25 }); walkTo(world, { x: 0, z: 2 }); firstAid.interact(); renderer.render();
    firstAid.interact(); renderer.render();
    expect(renderer.scene.getObjectByName('cozy-interior-clinic')).toBe(clinic);
    // Actors and camera keep the same metric scale and vertical axis around the island.
    for(const position of [{x:98,z:32},{x:32,z:-6}]){
      expect(world.restore({interiorId:null,position,outdoorReturn:position})).toBe(true);
      for(let i=0;i<100;i++)renderer.render(.05);
      renderer.scene.updateMatrixWorld(true);renderer.camera.updateMatrixWorld(true);
      const up=new Vector3(0,1,0).applyQuaternion(hero.getWorldQuaternion(new Quaternion()));
      expect(up.distanceTo(new Vector3(0,1,0))).toBeLessThan(1e-6);
      const screen=hero.getWorldPosition(new Vector3()).project(renderer.camera);
      expect(Math.abs(screen.x)).toBeLessThan(.1);expect(Math.abs(screen.y)).toBeLessThan(.1);
    }
    expect(renderer.scene.getObjectByName('planet-ground')).toBeUndefined();
    const ocean=renderer.scene.getObjectByName('island-ocean') as Mesh;
    expect(ocean.visible).toBe(true);
    const water=ocean.material as ShaderMaterial,previousTime=water.uniforms.uTime!.value as number;
    renderer.render(.05);expect(water.uniforms.uTime!.value).toBeGreaterThan(previousTime);
    const terrain=renderer.scene.getObjectByName('island-terrain') as Mesh;
    const material=terrain.material as MeshStandardMaterial;
    const shader={...ShaderLib.standard,uniforms:{...ShaderLib.standard.uniforms}};
    material.onBeforeCompile(shader as unknown as Parameters<typeof material.onBeforeCompile>[0],renderer.renderer);
    expect(shader.fragmentShader).toContain('islandGrain');
    expect(shader.fragmentShader).toContain('sentinelPlayer');
    expect(shader.vertexShader).toContain('instanceMatrix * sentinelWorld');
    const waterDisposed=vi.spyOn(water,'dispose');
    const sails=renderer.scene.getObjectByName('windmill-sails')!,rotation=sails.rotation.z;
    const walker=renderer.scene.getObjectByName('resident-walker')!,beforeWalker=walker.position.clone();
    for(let i=0;i<100;i++){firstAid.life.update(.05);renderer.render(.05);}
    expect(sails.rotation.z).not.toBe(rotation);expect(walker.position.distanceTo(beforeWalker)).toBeGreaterThan(.1);
    // Both the active room and a detached cached room must release GPU resources.
    const meshes: Mesh[] = [];
    for (const room of [clinic, workshop]) room.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    const disposed = meshes.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    renderer.destroy();
    expect(waterDisposed).toHaveBeenCalledOnce();
    expect(disposed.every(spy => spy.mock.calls.length > 0)).toBe(true);
  } finally {
    renderer.destroy(); firstAid.destroy();
  }
});
