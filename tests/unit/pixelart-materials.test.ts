import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyPixelArtTextureFilter,
  createToonGradientMap,
  convertMaterialToPixelArt,
  applyPixelArtToHierarchy,
  createMeshOutline,
} from '../../src/game/render/PixelArtMaterialProcessor';

describe('PixelArtMaterialProcessor', () => {
  it('enforces NearestFilter and disables mipmaps on textures', () => {
    const canvas = { width: 16, height: 16 };
    const texture = new THREE.Texture(canvas as unknown as TexImageSource);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    applyPixelArtTextureFilter(texture);

    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
    expect(texture.generateMipmaps).toBe(false);
  });

  it('generates a stepped toon gradient ramp texture for cel shading', () => {
    const steps = 3;
    const gradient = createToonGradientMap(steps);

    expect(gradient).toBeInstanceOf(THREE.DataTexture);
    expect(gradient.magFilter).toBe(THREE.NearestFilter);
    expect(gradient.minFilter).toBe(THREE.NearestFilter);
    expect(gradient.generateMipmaps).toBe(false);
    expect(gradient.image.width).toBe(steps);
    expect(gradient.image.height).toBe(1);
  });

  it('converts MeshStandardMaterial to MeshToonMaterial with nearest filtering', () => {
    const map = new THREE.Texture();
    const sourceMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      map,
    });

    const converted = convertMaterialToPixelArt(sourceMat, { shadingMode: 'toon' });

    expect(converted).toBeInstanceOf(THREE.MeshToonMaterial);
    const toonMat = converted as THREE.MeshToonMaterial;
    expect(toonMat.color.getHex()).toBe(0x3b82f6);
    expect(toonMat.map).toBe(map);
    expect(toonMat.gradientMap).toBeDefined();
    expect(map.magFilter).toBe(THREE.NearestFilter);
  });

  it('converts to unlit MeshBasicMaterial when shadingMode is unlit', () => {
    const sourceMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const converted = convertMaterialToPixelArt(sourceMat, { shadingMode: 'unlit' });

    expect(converted).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect((converted as THREE.MeshBasicMaterial).color.getHex()).toBe(0xff0000);
  });

  it('recursively processes an entire Object3D hierarchy', () => {
    const group = new THREE.Group();
    const mesh1 = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x112233 })
    );
    const mesh2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: 0x445566 })
    );
    group.add(mesh1);
    mesh1.add(mesh2);

    applyPixelArtToHierarchy(group, { shadingMode: 'toon' });

    expect(mesh1.material).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(mesh2.material).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(mesh1.castShadow).toBe(true);
    expect(mesh1.receiveShadow).toBe(true);
  });

  it('generates an inverted hull outline mesh', () => {
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    const outline = createMeshOutline(baseMesh, {
      outlineColor: 0x000000,
      thickness: 0.05,
    });

    expect(outline).toBeInstanceOf(THREE.Mesh);
    expect(outline.name).toContain('Outline');
    const outlineMat = outline.material as THREE.MeshBasicMaterial;
    expect(outlineMat.side).toBe(THREE.BackSide);
    expect(outlineMat.color.getHex()).toBe(0x000000);
  });
});
