import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PixelArtPostProcessor } from '../../src/game/render/PixelArtPostProcessor';

describe('PixelArtPostProcessor (Low-Resolution Render Target)', () => {
  it('initializes with default pixel scale of 2', () => {
    const postProcessor = new PixelArtPostProcessor({ pixelScale: 2 });
    expect(postProcessor.getPixelScale()).toBe(2);
    expect(postProcessor.isEnabled()).toBe(true);
  });

  it('calculates downscaled render target resolution based on pixel scale', () => {
    const postProcessor = new PixelArtPostProcessor({ pixelScale: 3 });
    postProcessor.setSize(960, 540);

    const target = postProcessor.getRenderTarget();
    expect(target).toBeDefined();
    expect(target?.width).toBe(320);
    expect(target?.height).toBe(180);
    expect(target?.texture.magFilter).toBe(THREE.NearestFilter);
    expect(target?.texture.minFilter).toBe(THREE.NearestFilter);
    expect(target?.texture.generateMipmaps).toBe(false);
  });

  it('updates dimensions when pixel scale changes dynamically', () => {
    const postProcessor = new PixelArtPostProcessor({ pixelScale: 2 });
    postProcessor.setSize(800, 600);

    expect(postProcessor.getRenderTarget()?.width).toBe(400);

    postProcessor.setPixelScale(4);
    expect(postProcessor.getRenderTarget()?.width).toBe(200);
    expect(postProcessor.getRenderTarget()?.height).toBe(150);
  });

  it('supports enabling and disabling post-processor', () => {
    const postProcessor = new PixelArtPostProcessor();
    expect(postProcessor.isEnabled()).toBe(true);

    postProcessor.setEnabled(false);
    expect(postProcessor.isEnabled()).toBe(false);
  });

  it('disposes render target and mesh resources cleanly', () => {
    const postProcessor = new PixelArtPostProcessor();
    postProcessor.setSize(640, 480);
    expect(postProcessor.getRenderTarget()).not.toBeNull();

    postProcessor.dispose();
    expect(postProcessor.getRenderTarget()).toBeNull();
  });
});
