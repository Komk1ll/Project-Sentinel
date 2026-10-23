// @vitest-environment jsdom
import { URL as NodeURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeRenderer } from '@game/render/ThreeRenderer';
import { TownWorld } from '@game/systems/town-world';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { CameraZoom } from '@game/systems/camera-zoom';
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
    const filename = new URL(url).pathname.split('/').at(-1)!;
    requested.push(filename);
    const bytes = await readFile(new NodeURL(`../../public/assets/models/cozy/${filename}`, import.meta.url));
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
    expect(requested).toHaveLength(24);
    const workshop = renderer.scene.getObjectByName('cozy-interior-station')!;
    const town = renderer.scene.getObjectByName('cozy-town')!;
    const hero = renderer.scene.getObjectByName('cozy-hero')!;
    expect(workshop).toBeDefined(); expect(town.visible).toBe(false);
    expect(hero.getObjectByName('left-leg')).toBeDefined();
    const master = renderer.scene.getObjectByName(MASTER.id)!;
    expect(master.getObjectByName('aid-kit-parcel')!.visible).toBe(true);
    firstAid.interact(); renderer.render();
    expect(master.getObjectByName('aid-kit-parcel')!.visible).toBe(false);
    leaveWorkshop(firstAid); renderer.render();
    expect(town.visible).toBe(true);
    walkTo(world, { x: 32, z: 46 }); walkTo(world, { x: 40, z: 46 }); firstAid.interact();
    walkTo(world, { x: 0, z: .25 }); walkTo(world, { x: .75, z: .25 }); renderer.render();
    const medic = renderer.scene.getObjectByName(MEDIC.id)!;
    const resident = renderer.scene.getObjectByName('clinic-resident')!;
    expect(medic.visible).toBe(true); expect(resident.visible).toBe(false);
    firstAid.interact(); renderer.render();
    expect(firstAid.snapshot.stage).toBe('completed');
    expect(medic.getObjectByName('aid-kit-parcel')!.visible).toBe(true);
    expect(resident.visible).toBe(true);
    const clinic = renderer.scene.getObjectByName('cozy-interior-clinic')!;
    walkTo(world, { x: 0, z: .25 }); walkTo(world, { x: 0, z: 2 }); firstAid.interact(); renderer.render();
    firstAid.interact(); renderer.render();
    expect(renderer.scene.getObjectByName('cozy-interior-clinic')).toBe(clinic);
    // Both the active room and a detached cached room must release GPU resources.
    const meshes: Mesh[] = [];
    for (const room of [clinic, workshop]) room.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    const disposed = meshes.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    renderer.destroy();
    expect(disposed.every(spy => spy.mock.calls.length > 0)).toBe(true);
  } finally {
    renderer.destroy(); firstAid.destroy();
  }
});
