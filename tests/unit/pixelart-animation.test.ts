import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PixelArtAnimationController } from '../../src/game/render/PixelArtAnimationController';

describe('PixelArtAnimationController (Stepped & Pixel-Art Animations)', () => {
  function createTestModelWithClips() {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.name = 'TestMesh';
    root.add(mesh);

    // Track 1: idle animation (1 second, position moves up and down)
    const posTrack = new THREE.VectorKeyframeTrack(
      'TestMesh.position',
      [0, 0.5, 1],
      [0, 0, 0, 0, 1, 0, 0, 0, 0]
    );
    const idleClip = new THREE.AnimationClip('idle', 1, [posTrack]);

    // Track 2: walk animation (0.8 seconds, rotation)
    const rotTrack = new THREE.QuaternionKeyframeTrack(
      'TestMesh.quaternion',
      [0, 0.4, 0.8],
      [0, 0, 0, 1, 0, 0.707, 0, 0.707, 0, 0, 0, 1]
    );
    const walkClip = new THREE.AnimationClip('walk', 0.8, [rotTrack]);

    // Track 3: attack/interact animation (0.5s, non-looping)
    const interactClip = new THREE.AnimationClip('interact', 0.5, [posTrack]);

    return { root, mesh, clips: [idleClip, walkClip, interactClip] };
  }

  it('initializes and registers animation clips', () => {
    const { root, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips);

    expect(controller.getClipNames()).toEqual(expect.arrayContaining(['idle', 'walk', 'interact']));
    expect(controller.hasClip('idle')).toBe(true);
    expect(controller.hasClip('unknown')).toBe(false);
    expect(controller.getCurrentClipName()).toBeNull();
  });

  it('plays an animation and updates current clip state', () => {
    const { root, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips);

    const action = controller.play('idle');
    expect(action).toBeDefined();
    expect(controller.getCurrentClipName()).toBe('idle');
    expect(controller.isPlaying()).toBe(true);
  });

  it('executes stepped frame quantization at configured FPS (e.g. 4 FPS)', () => {
    const { root, mesh, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips, {
      fps: 4, // 4 frames per second => step interval is 0.25s
      stepped: true,
    });

    controller.play('idle');
    expect(mesh.position.y).toBe(0);

    // Delta time of 0.1s is less than 0.25s step interval: animation keyframe should NOT advance
    controller.update(0.1);
    expect(mesh.position.y).toBe(0);

    // Another 0.1s (total 0.2s) still less than 0.25s: should remain at step 0
    controller.update(0.1);
    expect(mesh.position.y).toBe(0);

    // Another 0.06s (total 0.26s) reaches and exceeds 0.25s step: now advances to 0.25s step!
    controller.update(0.06);
    expect(mesh.position.y).toBeGreaterThan(0);
  });

  it('supports smooth mode when stepped is disabled', () => {
    const { root, mesh, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips, {
      stepped: false,
    });

    controller.play('idle');
    controller.update(0.05);
    // Smooth mode immediately updates every frame
    expect(mesh.position.y).toBeGreaterThan(0);
  });

  it('crossfades between clips cleanly', () => {
    const { root, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips);

    controller.play('idle');
    expect(controller.getCurrentClipName()).toBe('idle');

    controller.crossFadeTo('walk', 0.2);
    expect(controller.getCurrentClipName()).toBe('walk');
  });

  it('supports pause and resume', () => {
    const { root, mesh, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips, { stepped: false });

    controller.play('idle');
    controller.pause();
    expect(controller.isPausedState()).toBe(true);

    controller.update(0.5);
    expect(mesh.position.y).toBe(0); // Paused, no movement

    controller.resume();
    expect(controller.isPausedState()).toBe(false);
    controller.update(0.5);
    expect(mesh.position.y).toBeGreaterThan(0);
  });

  it('supports one-shot animations and completion callbacks', () => {
    const { root, clips } = createTestModelWithClips();
    const controller = new PixelArtAnimationController(root, clips, { stepped: false });

    let finishedCalled = false;
    controller.play('interact', {
      loop: false,
      clampWhenFinished: true,
    });
    controller.onAnimationFinished('interact', () => {
      finishedCalled = true;
    });

    // Advance beyond interact clip duration (0.5s)
    controller.update(0.6);
    expect(finishedCalled).toBe(true);
  });
});
