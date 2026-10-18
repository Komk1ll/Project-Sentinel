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

describe('Generated Campaign GLB Models Verification in Three.js', () => {
  const modelsDir = path.resolve('public/assets/models');

  it('verifies all 13 campaign GLB models exist and exceed 1KB with valid glTF headers', () => {
    const expectedModels = [
      'character_hero.glb',
      'character_professor.glb',
      'sentinel_robot.glb',
      'robot_patrol_droid.glb',
      'robot_courier_blocker.glb',
      'robot_dog.glb',
      'robot_recon_drone.glb',
      'prop_impulse_debugger.glb',
      'prop_terminal_security.glb',
      'prop_power_switchboard.glb',
      'prop_jammer_antenna.glb',
      'prop_server_rack.glb',
      'prop_holo_console.glb',
    ];

    for (const filename of expectedModels) {
      const filePath = path.join(modelsDir, filename);
      expect(fs.existsSync(filePath), `File ${filename} must exist`).toBe(true);

      const fileBuffer = fs.readFileSync(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      expect(arrayBuffer.byteLength, `File ${filename} must be > 1000 bytes`).toBeGreaterThan(1000);

      // Verify glTF 2.0 binary magic header using DataView
      const view = new DataView(arrayBuffer);
      const magic = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      expect(magic, `File ${filename} must start with glTF magic bytes`).toBe('glTF');

      const version = view.getUint32(4, true);
      expect(version, `File ${filename} must be glTF version 2`).toBe(2);
    }
  });

  it('loads and validates character_hero.glb (Hero Alexey with teal jacket, orange backpack, animations)', async () => {
    const filePath = path.join(modelsDir, 'character_hero.glb');
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'hero_test' });

    expect(gltf.scene).toBeDefined();
    expect(gltf.animations.length).toBeGreaterThanOrEqual(3);

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

  it('loads and validates character_professor.glb (Professor in lab coat, animations: idle, talk)', async () => {
    const filePath = path.join(modelsDir, 'character_professor.glb');
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'prof_test' });

    expect(gltf.scene).toBeDefined();
    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('idle');
    expect(clipNames).toContain('talk');

    const prof = loader.instantiate(gltf, {
      defaultAnimation: 'idle',
      fps: 4,
      stepped: true,
    });

    expect(prof.skeleton.hasSkeleton()).toBe(true);
    expect(prof.skeleton.getBoneNames()).toContain('head');
    expect(prof.animation.getCurrentClipName()).toBe('idle');

    prof.destroy();
  });

  it('loads and validates sentinel_robot.glb and robot_patrol_droid.glb (scan, move, idle, shutdown)', async () => {
    const fileNames = ['sentinel_robot.glb', 'robot_patrol_droid.glb'];

    for (const fileName of fileNames) {
      const filePath = path.join(modelsDir, fileName);
      const fileBuffer = fs.readFileSync(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const loader = new GLBModelLoader();
      const gltf = await loader.load(arrayBuffer, { cacheKey: `droid_${fileName}` });

      expect(gltf.scene).toBeDefined();
      expect(gltf.animations.length).toBe(4);

      const clipNames = gltf.animations.map((c) => c.name);
      expect(clipNames).toContain('idle');
      expect(clipNames).toContain('move');
      expect(clipNames).toContain('scan');
      expect(clipNames).toContain('shutdown');

      const robot = loader.instantiate(gltf, {
        defaultAnimation: 'scan',
        fps: 6,
        stepped: true,
      });

      expect(robot.skeleton.hasSkeleton()).toBe(true);
      expect(robot.skeleton.getBoneNames()).toContain('scanner_arm');
      expect(robot.skeleton.getBoneNames()).toContain('sensor_eye');
      expect(robot.animation.getCurrentClipName()).toBe('scan');

      robot.destroy();
    }
  });

  it('loads and validates robot_courier_blocker.glb (modular disassembly, wheel/battery bones)', async () => {
    const filePath = path.join(modelsDir, 'robot_courier_blocker.glb');
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'blocker_test' });

    expect(gltf.scene).toBeDefined();
    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('idle');
    expect(clipNames).toContain('disassemble');

    const bot = loader.instantiate(gltf, {
      defaultAnimation: 'disassemble',
      fps: 8,
      stepped: true,
    });

    expect(bot.skeleton.hasSkeleton()).toBe(true);
    expect(bot.skeleton.getBoneNames()).toContain('wheel_FL');
    expect(bot.skeleton.getBoneNames()).toContain('battery_pack');
    expect(bot.animation.getCurrentClipName()).toBe('disassemble');

    bot.destroy();
  });

  it('loads and validates robot_dog.glb (quadruped robo-dog with jaw, keyring, run/drop_keys)', async () => {
    const filePath = path.join(modelsDir, 'robot_dog.glb');
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'dog_test' });

    expect(gltf.scene).toBeDefined();
    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('idle');
    expect(clipNames).toContain('run');
    expect(clipNames).toContain('drop_keys');

    const dog = loader.instantiate(gltf, {
      defaultAnimation: 'run',
      fps: 10,
      stepped: true,
    });

    expect(dog.skeleton.hasSkeleton()).toBe(true);
    expect(dog.skeleton.getBoneNames()).toContain('jaw');
    expect(dog.skeleton.getBoneNames()).toContain('keyring');
    expect(dog.animation.getCurrentClipName()).toBe('run');

    dog.destroy();
  });

  it('loads and validates robot_recon_drone.glb (aerial surveillance, hover/patrol)', async () => {
    const filePath = path.join(modelsDir, 'robot_recon_drone.glb');
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const loader = new GLBModelLoader();
    const gltf = await loader.load(arrayBuffer, { cacheKey: 'drone_test' });

    expect(gltf.scene).toBeDefined();
    const clipNames = gltf.animations.map((c) => c.name);
    expect(clipNames).toContain('hover');
    expect(clipNames).toContain('patrol');

    const drone = loader.instantiate(gltf, {
      defaultAnimation: 'hover',
      fps: 6,
      stepped: true,
    });

    expect(drone.skeleton.hasSkeleton()).toBe(true);
    expect(drone.animation.getCurrentClipName()).toBe('hover');

    drone.destroy();
  });

  it('loads and validates all 6 interactive campaign props', async () => {
    const props = [
      'prop_impulse_debugger.glb',
      'prop_terminal_security.glb',
      'prop_power_switchboard.glb',
      'prop_jammer_antenna.glb',
      'prop_server_rack.glb',
      'prop_holo_console.glb',
    ];

    const loader = new GLBModelLoader();
    for (const propName of props) {
      const filePath = path.join(modelsDir, propName);
      const fileBuffer = fs.readFileSync(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      const gltf = await loader.load(arrayBuffer, { cacheKey: propName });
      expect(gltf.scene, `Prop ${propName} should load scene`).toBeDefined();
      expect(gltf.scene.children.length, `Prop ${propName} should have children`).toBeGreaterThan(0);

      const instance = loader.instantiate(gltf);
      expect(instance.root).toBeDefined();
      instance.destroy();
    }
  });
});
