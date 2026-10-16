import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { applyPixelArtToHierarchy, applyPixelArtTextureFilter } from './PixelArtMaterialProcessor';
import { ModelSkeleton } from './ModelSkeleton';
import { PixelArtAnimationController } from './PixelArtAnimationController';
import { PixelArtModelInstance } from './PixelArtModelInstance';
import { PixelArtMaterialOptions } from '../../types/models';

export interface LoadGLBOptions {
  cacheKey?: string;
  forceNearestFilter?: boolean;
  materialOptions?: PixelArtMaterialOptions;
}

export interface InstantiateModelOptions {
  defaultAnimation?: string;
  fps?: number;
  stepped?: boolean;
  scale?: number;
  cellScale?: number;
  materialOptions?: PixelArtMaterialOptions;
}

/**
 * Service for loading, caching, and instantiating 3D GLB models.
 * Applies pixel-art texture filtering and handles skinned meshes using SkeletonUtils.clone.
 */
export class GLBModelLoader {
  private loader: GLTFLoader;
  private cache: Map<string, GLTF> = new Map();

  constructor(customLoader?: GLTFLoader) {
    this.loader = customLoader ?? new GLTFLoader();
  }

  /**
   * Loads a .glb binary model from a URL path or ArrayBuffer.
   * Caches the result if cacheKey is provided or if source is a URL string.
   */
  public async load(source: string | ArrayBuffer, options: LoadGLBOptions = {}): Promise<GLTF> {
    const cacheKey = options.cacheKey ?? (typeof source === 'string' ? source : undefined);

    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    let gltf: GLTF;

    if (typeof source === 'string') {
      gltf = await this.loader.loadAsync(source);
    } else {
      gltf = await new Promise<GLTF>((resolve, reject) => {
        this.loader.parse(
          source,
          '',
          (result) => resolve(result),
          (error) => reject(error)
        );
      });
    }

    // Apply pixel art texture filtering to all extracted textures
    const forceNearest = options.forceNearestFilter ?? true;
    if (forceNearest) {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            if (!mat) continue;
            const matRecord = mat as unknown as Record<string, unknown>;
            for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
              const tex = matRecord[key];
              if (tex && (tex as THREE.Texture).isTexture) {
                applyPixelArtTextureFilter(tex as THREE.Texture);
              }
            }
          }
        }
      });
    }

    if (options.materialOptions) {
      applyPixelArtToHierarchy(gltf.scene, options.materialOptions);
    }

    if (cacheKey) {
      this.cache.set(cacheKey, gltf);
    }

    return gltf;
  }

  /**
   * Instantiates a new independent model instance from a loaded GLTF object or cache key.
   * Crucially uses SkeletonUtils.clone to properly clone SkinnedMesh and Bone hierarchies.
   */
  public instantiate(
    source: string | GLTF,
    options: InstantiateModelOptions = {}
  ): PixelArtModelInstance {
    let gltf: GLTF;

    if (typeof source === 'string') {
      const cached = this.cache.get(source);
      if (!cached) {
        throw new Error(`[GLBModelLoader] Model with key "${source}" not found in cache. Call load() first.`);
      }
      gltf = cached;
    } else {
      gltf = source;
    }

    // Deep-clone scene using SkeletonUtils to ensure SkinnedMesh has independent bones
    const clonedRoot = SkeletonUtils.clone(gltf.scene);

    if (options.scale !== undefined && options.scale !== 1.0) {
      clonedRoot.scale.setScalar(options.scale);
    }

    if (options.materialOptions) {
      applyPixelArtToHierarchy(clonedRoot, options.materialOptions);
    }

    // Wrap skeleton and bone hierarchy
    const skeleton = new ModelSkeleton(clonedRoot);

    // Create animation controller bound to this cloned instance and original clips
    const animation = new PixelArtAnimationController(clonedRoot, gltf.animations, {
      fps: options.fps ?? 8,
      stepped: options.stepped ?? true,
    });

    if (options.defaultAnimation && animation.hasClip(options.defaultAnimation)) {
      animation.play(options.defaultAnimation);
    }

    return new PixelArtModelInstance({
      root: clonedRoot,
      skeleton,
      animation,
      cellScale: options.cellScale,
    });
  }

  public hasCache(key: string): boolean {
    return this.cache.has(key);
  }

  public getCached(key: string): GLTF | null {
    return this.cache.get(key) ?? null;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
