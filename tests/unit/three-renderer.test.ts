import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ThreeRenderer } from '../../src/game/render/ThreeRenderer';

beforeAll(() => {
  if (typeof (globalThis as unknown as { FileReader: unknown }).FileReader === 'undefined') {
    (globalThis as unknown as { FileReader: unknown }).FileReader = class NodeFileReader {
      public result: ArrayBuffer | null = null;
      public onloadend: (() => void) | null = null;

      public async readAsArrayBuffer(blob: Blob): Promise<void> {
        this.result = await blob.arrayBuffer();
        if (this.onloadend) this.onloadend();
      }
    };
  }
});

function createMockRenderer(): THREE.WebGLRenderer {
  return {
    domElement: {} as HTMLCanvasElement,
    setSize: () => {},
    setPixelRatio: () => {},
    setRenderTarget: () => {},
    getRenderTarget: () => null,
    clear: () => {},
    render: () => {},
    dispose: () => {},
    shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
  } as unknown as THREE.WebGLRenderer;
}

function generateSimpleGLB(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    mesh.name = 'Box';
    scene.add(mesh);

    const track = new THREE.VectorKeyframeTrack('Box.position', [0, 1], [0, 0, 0, 0, 1, 0]);
    const clip = new THREE.AnimationClip('idle', 1, [track]);

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => resolve(gltf as ArrayBuffer),
      (err) => reject(err),
      { binary: true, animations: [clip] }
    );
  });
}

describe('ThreeRenderer Integration', () => {
  let glbBuffer: ArrayBuffer;

  beforeAll(async () => {
    glbBuffer = await generateSimpleGLB();
  });

  it('initializes isometric orthographic camera with azimuth 45°', () => {
    const mockRenderer = createMockRenderer();
    const renderer = new ThreeRenderer({
      width: 800,
      height: 600,
      customRenderer: mockRenderer,
    });

    expect(renderer.camera.isOrthographicCamera).toBe(true);
    // Camera azimuth 45°: X and Z should be equal
    expect(renderer.camera.position.x).toBeCloseTo(renderer.camera.position.z);
    expect(renderer.camera.position.y).toBeGreaterThan(0);

    renderer.destroy();
  });

  it('spawns and tracks active model instances in the scene', async () => {
    const mockRenderer = createMockRenderer();
    const renderer = new ThreeRenderer({
      width: 800,
      height: 600,
      customRenderer: mockRenderer,
    });

    const model = await renderer.spawnModel(glbBuffer, {
      position: { x: 3, y: 2 },
      elevation: 0,
      facing: 'SE',
      defaultAnimation: 'idle',
      fps: 4,
      stepped: true,
    });

    expect(model).toBeDefined();
    expect(renderer.getActiveModels()).toContain(model);
    expect(renderer.scene.children).toContain(model.root);
    expect(model.getGridPosition()).toEqual({ x: 3, y: 2 });
    expect(model.getFacingDirection()).toBe('SE');

    // Remove model
    renderer.removeModel(model);
    expect(renderer.getActiveModels()).not.toContain(model);
    expect(renderer.scene.children).not.toContain(model.root);

    renderer.destroy();
  });

  it('converts isometric grid cells to 3D world coordinates', () => {
    const mockRenderer = createMockRenderer();
    const renderer = new ThreeRenderer({ customRenderer: mockRenderer });

    const world = renderer.gridToWorld(2, 2, 1);
    expect(world.x).toBeCloseTo(0); // (2 - 2) * halfDiag = 0
    expect(world.y).toBe(1);
    expect(world.z).toBeGreaterThan(0);

    renderer.destroy();
  });

  it('updates pixel scale via setPixelScale', () => {
    const mockRenderer = createMockRenderer();
    const renderer = new ThreeRenderer({ customRenderer: mockRenderer, pixelScale: 2 });

    expect(renderer.pixelArtPostProcessor.getPixelScale()).toBe(2);
    renderer.setPixelScale(3);
    expect(renderer.pixelArtPostProcessor.getPixelScale()).toBe(3);

    renderer.destroy();
  });
});
