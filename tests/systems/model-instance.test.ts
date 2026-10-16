import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLBModelLoader } from '../../src/game/render/GLBModelLoader';
import { gridTo3DWorld, isometricDirectionToAngle } from '../../src/game/render/PixelArtModelInstance';

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

function createTestSentinelGLB(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const scene = new THREE.Scene();

    // Robot skeleton: root -> chassis -> head -> scanner_arm
    const rootBone = new THREE.Bone();
    rootBone.name = 'root';
    const chassisBone = new THREE.Bone();
    chassisBone.name = 'chassis';
    chassisBone.position.y = 0.5;
    rootBone.add(chassisBone);

    const headBone = new THREE.Bone();
    headBone.name = 'head';
    headBone.position.y = 0.6;
    chassisBone.add(headBone);

    const scannerArmBone = new THREE.Bone();
    scannerArmBone.name = 'scanner_arm';
    scannerArmBone.position.x = 0.4;
    headBone.add(scannerArmBone);

    const bones = [rootBone, chassisBone, headBone, scannerArmBone];
    const skeleton = new THREE.Skeleton(bones);

    const geom = new THREE.BoxGeometry(0.8, 1.2, 0.8, 2, 2, 2);
    const position = geom.attributes.position;
    if (!position) return reject(new Error('Missing position attribute'));

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    for (let i = 0; i < position.count; i++) {
      skinIndices.push(1, 2, 0, 0);
      skinWeights.push(0.7, 0.3, 0, 0);
    }
    geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const mat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
    const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
    skinnedMesh.name = 'SentinelChassis';
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);
    scene.add(skinnedMesh);

    // Animations: idle (2 fps), move (8 fps), scan (6 fps)
    const idleTrack = new THREE.VectorKeyframeTrack('chassis.position', [0, 0.5, 1], [0, 0.5, 0, 0, 0.55, 0, 0, 0.5, 0]);
    const idleClip = new THREE.AnimationClip('idle', 1, [idleTrack]);

    const moveTrack = new THREE.VectorKeyframeTrack('chassis.position', [0, 0.25, 0.5], [0, 0.5, 0, 0, 0.6, 0, 0, 0.5, 0]);
    const moveClip = new THREE.AnimationClip('move', 0.5, [moveTrack]);

    const scanTrack = new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.5, 1], [0, 0, 0, 1, 0, 0.38, 0, 0.92, 0, 0, 0, 1]);
    const scanClip = new THREE.AnimationClip('scan', 1, [scanTrack]);

    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => resolve(gltf as ArrayBuffer),
      (err) => reject(err),
      { binary: true, animations: [idleClip, moveClip, scanClip] }
    );
  });
}

describe('PixelArtModelInstance Integration System', () => {
  let sentinelBuffer: ArrayBuffer;
  let loader: GLBModelLoader;

  beforeAll(async () => {
    sentinelBuffer = await createTestSentinelGLB();
    loader = new GLBModelLoader();
  });

  it('correctly maps 2D isometric grid coordinates to 3D world space', () => {
    const origin3D = gridTo3DWorld(0, 0, 0, 2);
    expect(origin3D.x).toBeCloseTo(0);
    expect(origin3D.y).toBeCloseTo(0);
    expect(origin3D.z).toBeCloseTo(0);

    const stepX = gridTo3DWorld(1, 0, 1.5, 2);
    // (1 - 0) * sqrt(0.5) * 2 = sqrt(2) approx 1.4142
    expect(stepX.x).toBeCloseTo(Math.SQRT2);
    expect(stepX.y).toBe(1.5);
    expect(stepX.z).toBeCloseTo(Math.SQRT2);

    const stepY = gridTo3DWorld(0, 1, 0, 2);
    expect(stepY.x).toBeCloseTo(-Math.SQRT2);
    expect(stepY.z).toBeCloseTo(Math.SQRT2);
  });

  it('instantiates sentinel robot and updates position on isometric grid', async () => {
    const gltf = await loader.load(sentinelBuffer, { cacheKey: 'sentinel' });
    const robot = loader.instantiate(gltf, {
      defaultAnimation: 'idle',
      fps: 2, // 2 fps for robot idle as per spec
      stepped: true,
      cellScale: 2.0,
    });

    robot.setGridPosition(4, 5, 0.5);
    expect(robot.getGridPosition()).toEqual({ x: 4, y: 5 });
    expect(robot.getElevation()).toBe(0.5);

    const expectedWorld = gridTo3DWorld(4, 5, 0.5, 2.0);
    expect(robot.root.position.x).toBeCloseTo(expectedWorld.x);
    expect(robot.root.position.y).toBeCloseTo(expectedWorld.y);
    expect(robot.root.position.z).toBeCloseTo(expectedWorld.z);

    robot.destroy();
  });

  it('rotates model to face 8 isometric directions', async () => {
    const gltf = await loader.load(sentinelBuffer, { cacheKey: 'sentinel' });
    const robot = loader.instantiate(gltf);

    robot.setFacingDirection('SE');
    expect(robot.getFacingDirection()).toBe('SE');
    expect(robot.root.rotation.y).toBeCloseTo(isometricDirectionToAngle('SE'));

    robot.setFacingDirection('NW');
    expect(robot.root.rotation.y).toBeCloseTo(isometricDirectionToAngle('NW'));

    robot.destroy();
  });

  it('attaches equipment (scanner tool) to robot scanner_arm bone', async () => {
    const gltf = await loader.load(sentinelBuffer, { cacheKey: 'sentinel' });
    const robot = loader.instantiate(gltf);

    const scannerSensor = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );

    const attached = robot.skeleton.attachToBone('scanner_arm', scannerSensor, {
      offset: { x: 0.1, y: 0, z: 0 },
    });

    expect(attached).toBe(true);
    expect(scannerSensor.parent?.name).toBe('scanner_arm');

    robot.destroy();
  });

  it('switches between idle, move and scan animations', async () => {
    const gltf = await loader.load(sentinelBuffer, { cacheKey: 'sentinel' });
    const robot = loader.instantiate(gltf, {
      defaultAnimation: 'idle',
      fps: 8,
      stepped: true,
    });

    expect(robot.animation.getCurrentClipName()).toBe('idle');

    robot.animation.crossFadeTo('move', 0.1, { fps: 8 });
    expect(robot.animation.getCurrentClipName()).toBe('move');

    robot.update(0.15); // Trigger stepped animation update

    robot.animation.crossFadeTo('scan', 0.1, { fps: 6 });
    expect(robot.animation.getCurrentClipName()).toBe('scan');

    robot.destroy();
  });
});
