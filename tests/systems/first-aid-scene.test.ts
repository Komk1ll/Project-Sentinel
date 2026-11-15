// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { ThreeRenderer } from '@game/render/ThreeRenderer';
import { TownWorld } from '@game/systems/town-world';
import { CameraZoom } from '@game/systems/camera-zoom';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { MASTER } from '@content/first-aid';
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

it('shows the master only in the workshop and removes his parcel after pickup across room transitions', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const host = document.createElement('div');
  host.id = 'scene-test';
  document.body.append(host);
  const world = new TownWorld();
  const firstAid = new FirstAidMission(world);
  const renderer = new ThreeRenderer({ containerId: host.id, world, firstAid, zoom: new CameraZoom() });
  try {
    const master = renderer.scene.getObjectByName(MASTER.id)!;
    const parcel = master.getObjectByName('aid-kit-parcel')!;
    renderer.render();
    expect(master.visible).toBe(false);
    approachMaster(firstAid);
    renderer.render();
    expect(master.visible).toBe(true);
    expect(parcel.visible).toBe(true);
    firstAid.interact();
    renderer.render();
    expect(parcel.visible).toBe(false);
    leaveWorkshop(firstAid);
    renderer.render();
    expect(master.visible).toBe(false);
    walkTo(world, { x: 32, z: 46 });
    walkTo(world, { x: 40, z: 46 });
    firstAid.interact();
    renderer.render();
    expect(world.interior?.id).toBe('clinic');
    expect(master.visible).toBe(false);
    firstAid.interact();
    walkTo(world, { x: 32, z: 46 });
    walkTo(world, { x: 24, z: 46 });
    firstAid.interact();
    renderer.render();
    expect(master.visible).toBe(true);
    expect(parcel.visible).toBe(false);
  } finally {
    renderer.destroy();
    firstAid.destroy();
  }
  expect(host.querySelector('canvas')).toBeNull();
});
