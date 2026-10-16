import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLBModelLoader } from '../../src/game/render/GLBModelLoader';

// Polyfill FileReader for Node.js test environment if missing
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

/**
 * Helper to build an in-memory binary GLB ArrayBuffer containing
 * a SkinnedMesh, bones, and an animation clip.
 */
function generateTestGLBBuffer(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const scene = new THREE.Scene();

    const rootBone = new THREE.Bone();
    rootBone.name = 'root';
    const headBone = new THREE.Bone();
    headBone.name = 'head';
    headBone.position.y = 1.0;
    rootBone.add(headBone);

    const bones = [rootBone, headBone];
    const skeleton = new THREE.Skeleton(bones);

    const geom = new THREE.CylinderGeometry(0.5, 0.5, 2, 8, 4);
    const position = geom.attributes.position;
    if (!position) return reject(new Error('Missing position attribute'));

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    for (let i = 0; i < position.count; i++) {
      skinIndices.push(0, 1, 0, 0);
      skinWeights.push(0.5, 0.5, 0, 0);
    }
    geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
    skinnedMesh.name = 'TestSkinnedMesh';
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);
    scene.add(skinnedMesh);

    // Animation clip
    const track = new THREE.VectorKeyframeTrack('head.position', [0, 0.5, 1], [0, 1, 0, 0, 1.2, 0, 0, 1, 0]);
    const clip = new THREE.AnimationClip('idle', 1, [track]);

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        resolve(gltf as ArrayBuffer);
      },
      (error) => {
        reject(error);
      },
      { binary: true, animations: [clip] }
    );
  });
}

describe('GLBModelLoader', () => {
  let testGlbBuffer: ArrayBuffer;

  beforeAll(async () => {
    testGlbBuffer = await generateTestGLBBuffer();
  });

  it('parses binary GLB ArrayBuffer into a GLTF object', async () => {
    const loader = new GLBModelLoader();
    const gltf = await loader.load(testGlbBuffer, { cacheKey: 'test-model' });

    expect(gltf).toBeDefined();
    expect(gltf.scene).toBeDefined();
    expect(gltf.animations.length).toBe(1);
    expect(gltf.animations[0]?.name).toBe('idle');
  });

  it('retrieves cached models on subsequent loads with the same key', async () => {
    const loader = new GLBModelLoader();
    await loader.load(testGlbBuffer, { cacheKey: 'test-cached' });

    expect(loader.hasCache('test-cached')).toBe(true);
    const cached = loader.getCached('test-cached');
    expect(cached).toBeDefined();
  });

  it('instantiates isolated instances via SkeletonUtils.clone', async () => {
    const loader = new GLBModelLoader();
    const gltf = await loader.load(testGlbBuffer, { cacheKey: 'test-clone' });

    const instance1 = loader.instantiate(gltf, { defaultAnimation: 'idle' });
    const instance2 = loader.instantiate(gltf, { defaultAnimation: 'idle' });

    expect(instance1).toBeDefined();
    expect(instance2).toBeDefined();

    // Verify bone instances are completely distinct objects in memory
    const head1 = instance1.skeleton.findBone('head');
    const head2 = instance2.skeleton.findBone('head');

    expect(head1).toBeDefined();
    expect(head2).toBeDefined();
    expect(head1).not.toBe(head2);

    // Rotating head1 should NOT rotate head2
    head1?.rotation.set(0, 1.5, 0);
    expect(head2?.rotation.y).toBe(0);
  });

  it('automatically configures pixel-art animation controller on instantiation', async () => {
    const loader = new GLBModelLoader();
    const gltf = await loader.load(testGlbBuffer);

    const instance = loader.instantiate(gltf, {
      fps: 4,
      stepped: true,
      defaultAnimation: 'idle',
    });

    expect(instance.animation.getClipNames()).toContain('idle');
    expect(instance.animation.getCurrentClipName()).toBe('idle');
    expect(instance.animation.getFps()).toBe(4);
    expect(instance.animation.isStepped()).toBe(true);
  });

  it('clears in-memory cache and disposes assets cleanly', async () => {
    const loader = new GLBModelLoader();
    await loader.load(testGlbBuffer, { cacheKey: 'to-clear' });
    expect(loader.hasCache('to-clear')).toBe(true);

    loader.clearCache();
    expect(loader.hasCache('to-clear')).toBe(false);
  });
});
