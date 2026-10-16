import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { GLBModelLoader } from '../../src/game/render/GLBModelLoader';

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

describe('Generated GLB Assets Verification', () => {
  it('loads and validates public/assets/models/sentinel_robot.glb', async () => {
    const filePath = path.resolve('public/assets/models/sentinel_robot.glb');
    expect(fs.existsSync(filePath)).toBe(true);

    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'sentinel_robot' });

    expect(gltf.scene).toBeDefined();
    expect(gltf.animations.length).toBe(4);

    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('idle');
    expect(clipNames).toContain('move');
    expect(clipNames).toContain('scan');
    expect(clipNames).toContain('shutdown');

    const robot = loader.instantiate(gltf, {
      defaultAnimation: 'idle',
      fps: 2,
      stepped: true,
    });

    expect(robot.skeleton.hasSkeleton()).toBe(true);
    expect(robot.skeleton.getBoneNames()).toContain('scanner_arm');
    expect(robot.skeleton.getBoneNames()).toContain('sensor_eye');
    expect(robot.animation.getCurrentClipName()).toBe('idle');

    robot.destroy();
  });

  it('loads and validates public/assets/models/character_hero.glb', async () => {
    const filePath = path.resolve('public/assets/models/character_hero.glb');
    expect(fs.existsSync(filePath)).toBe(true);

    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'character_hero' });

    expect(gltf.scene).toBeDefined();
    expect(gltf.animations.length).toBe(3);

    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('idle');
    expect(clipNames).toContain('walk');
    expect(clipNames).toContain('interact');

    const hero = loader.instantiate(gltf, {
      defaultAnimation: 'idle',
      fps: 4,
      stepped: true,
    });

    expect(hero.skeleton.hasSkeleton()).toBe(true);
    expect(hero.skeleton.getBoneNames()).toContain('head');
    expect(hero.skeleton.getBoneNames()).toContain('hand_R');
    expect(hero.animation.getCurrentClipName()).toBe('idle');

    hero.destroy();
  });
});
