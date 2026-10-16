import * as THREE from 'three';
import { PixelArtMaterialOptions } from '../../types/models';

/**
 * Configure a texture with nearest-neighbor filtering and no mipmaps
 * to preserve crisp pixel-art texels without blur.
 */
export function applyPixelArtTextureFilter(texture: THREE.Texture): void {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
}

/**
 * Generates a 1D stepped data texture to serve as a cel-shading gradient map (ramp).
 * For example, 3 steps produces 3 discrete shading bands (highlight, midtone, shadow).
 */
export function createToonGradientMap(steps = 3): THREE.DataTexture {
  const clampedSteps = Math.max(2, Math.min(steps, 8));
  const data = new Uint8Array(clampedSteps);

  for (let i = 0; i < clampedSteps; i++) {
    // Quantized linear step from ~40 to 255
    data[i] = Math.round((i / (clampedSteps - 1)) * 215 + 40);
  }

  const gradientTexture = new THREE.DataTexture(
    data,
    clampedSteps,
    1,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  gradientTexture.magFilter = THREE.NearestFilter;
  gradientTexture.minFilter = THREE.NearestFilter;
  gradientTexture.generateMipmaps = false;
  gradientTexture.needsUpdate = true;

  return gradientTexture;
}

/**
 * Converts a standard material to a pixel-art styled material based on options.
 */
export function convertMaterialToPixelArt(
  material: THREE.Material,
  options: PixelArtMaterialOptions = {}
): THREE.Material {
  const mode = options.shadingMode ?? 'standard';
  const forceNearest = options.forceNearestFilter ?? true;

  // Process any associated textures
  if (forceNearest) {
    const matWithMaps = material as unknown as Record<string, unknown>;
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
      const tex = matWithMaps[key];
      if (tex && (tex as THREE.Texture).isTexture) {
        applyPixelArtTextureFilter(tex as THREE.Texture);
      }
    }
  }

  if (mode === 'unlit') {
    const basic = new THREE.MeshBasicMaterial();
    if ('color' in material && (material as THREE.MeshBasicMaterial).color) {
      basic.color.copy((material as THREE.MeshBasicMaterial).color);
    }
    if ('map' in material && (material as THREE.MeshBasicMaterial).map) {
      basic.map = (material as THREE.MeshBasicMaterial).map;
    }
    if ('transparent' in material) basic.transparent = material.transparent;
    if ('opacity' in material) basic.opacity = material.opacity;
    if ('alphaTest' in material) basic.alphaTest = material.alphaTest;
    basic.needsUpdate = true;
    return basic;
  }

  if (mode === 'toon' || mode === 'pixelart') {
    const toon = new THREE.MeshToonMaterial();
    if ('color' in material && (material as THREE.MeshToonMaterial).color) {
      toon.color.copy((material as THREE.MeshToonMaterial).color);
    }
    if ('map' in material && (material as THREE.MeshToonMaterial).map) {
      toon.map = (material as THREE.MeshToonMaterial).map;
    }
    if ('emissive' in material && (material as THREE.MeshStandardMaterial).emissive) {
      toon.emissive.copy((material as THREE.MeshStandardMaterial).emissive);
    }
    if ('transparent' in material) toon.transparent = material.transparent;
    if ('opacity' in material) toon.opacity = material.opacity;
    if ('alphaTest' in material) toon.alphaTest = material.alphaTest;

    toon.gradientMap = createToonGradientMap(3);
    toon.needsUpdate = true;
    return toon;
  }

  // Standard mode: keep MeshStandardMaterial or MeshPhysicalMaterial, but ensure roughness/metalness fit retro look
  if (material instanceof THREE.MeshStandardMaterial) {
    if (options.roughness !== undefined) material.roughness = options.roughness;
    if (options.metalness !== undefined) material.metalness = options.metalness;
  }

  return material;
}

/**
 * Traverses an Object3D hierarchy and applies pixel-art texture filtering and material conversion.
 */
export function applyPixelArtToHierarchy(
  root: THREE.Object3D,
  options: PixelArtMaterialOptions = {}
): void {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => convertMaterialToPixelArt(mat, options));
      } else if (mesh.material) {
        mesh.material = convertMaterialToPixelArt(mesh.material, options);
      }

      if (options.outline) {
        const outlineMesh = createMeshOutline(mesh, {
          outlineColor: options.outlineColor,
          thickness: options.outlineThickness,
        });
        mesh.add(outlineMesh);
      }
    }
  });
}

/**
 * Creates an inverted-hull outline mesh for crisp retro pixel-art silhouettes.
 */
export function createMeshOutline(
  mesh: THREE.Mesh,
  options: { outlineColor?: number; thickness?: number } = {}
): THREE.Mesh {
  const thickness = options.thickness ?? 0.03;
  const outlineColor = options.outlineColor ?? 0x000000;

  const outlineGeometry = mesh.geometry.clone();
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: outlineColor,
    side: THREE.BackSide,
    depthWrite: true,
  });

  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outlineMesh.name = `${mesh.name}_Outline`;
  outlineMesh.scale.multiplyScalar(1 + thickness);

  return outlineMesh;
}
