import * as THREE from 'three';
import { GLBModelLoader, LoadGLBOptions, InstantiateModelOptions } from './GLBModelLoader';
import { PixelArtModelInstance, gridTo3DWorld } from './PixelArtModelInstance';
import { PixelArtPostProcessor } from './PixelArtPostProcessor';
import { IsometricDirection } from '../../types/models';
import { Vector2D } from '../../types';

import { DynamicLightingController } from './DynamicLightingController';

export interface ThreeRendererOptions {
  containerId?: string;
  containerElement?: HTMLElement;
  width?: number;
  height?: number;
  pixelScale?: number;
  customRenderer?: THREE.WebGLRenderer;
}

export interface SpawnModelOptions extends InstantiateModelOptions {
  position?: Vector2D;
  elevation?: number;
  facing?: IsometricDirection | number;
}

/**
 * Three.js WebGL / OpenGL Renderer Integration
 * Configured for isometric orthographic camera (azimuth 45°, elevation 30° / 35.264°)
 * with full support for GLB pixel-art models, animations, skeleton attachments,
 * and low-resolution retro pixel-art rendering.
 */
export class ThreeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  public modelLoader: GLBModelLoader;
  public pixelArtPostProcessor: PixelArtPostProcessor;
  public ambientLight!: THREE.AmbientLight;
  public directionalLight!: THREE.DirectionalLight;
  public lightingController?: DynamicLightingController;

  private activeModels: Set<PixelArtModelInstance> = new Set();
  private container: HTMLElement | null = null;
  private clock = new THREE.Clock();
  private isDestroyed = false;

  constructor(options: ThreeRendererOptions = {}) {
    let container: HTMLElement | null = options.containerElement ?? null;
    if (!container && options.containerId && typeof document !== 'undefined') {
      container = document.getElementById(options.containerId);
    }

    if (!container && typeof document !== 'undefined' && options.containerId) {
      throw new Error(`[ThreeRenderer] Container #${options.containerId} not found in DOM`);
    }
    this.container = container;

    const width = options.width ?? container?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
    const height = options.height ?? container?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 600);

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Isometric Orthographic Camera
    const aspect = width / height;
    const d = 10;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

    // Setup 45° azimuth, ~35.264° / 30° elevation isometric view
    const isoAngle = Math.atan(1 / Math.SQRT2); // true isometric elevation (~35.264°)
    const distance = 50;
    this.camera.position.set(
      distance * Math.cos(Math.PI / 4) * Math.cos(isoAngle),
      distance * Math.sin(isoAngle),
      distance * Math.sin(Math.PI / 4) * Math.cos(isoAngle)
    );
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    if (options.customRenderer) {
      this.renderer = options.customRenderer;
    } else {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false, // Turned off for crisp pixel art
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      if (typeof window !== 'undefined') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if (this.container && this.renderer.domElement) {
        this.container.appendChild(this.renderer.domElement);
      }
    }

    // 4. Pixel-Art Post-Processor (low-res offscreen rendering buffer)
    this.pixelArtPostProcessor = new PixelArtPostProcessor({
      pixelScale: options.pixelScale ?? 2,
    });
    this.pixelArtPostProcessor.setSize(width, height);

    // 5. GLB Model Loader
    this.modelLoader = new GLBModelLoader();

    // 6. Default Lighting
    this.setupLighting();

    // 7. Window resize handler
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize);
    }
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x1e293b, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
    this.directionalLight.position.set(20, 40, 20);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);

    this.lightingController = new DynamicLightingController({
      ambientLight: this.ambientLight,
      directionalLight: this.directionalLight,
      initialState: 'twilight',
    });
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  public setLighting(
    ambientColor: number | string,
    ambientIntensity: number,
    dirColor: number | string,
    dirIntensity: number
  ): void {
    if (typeof ambientColor === 'number') {
      this.ambientLight.color.setHex(ambientColor);
    } else {
      this.ambientLight.color.set(ambientColor as THREE.ColorRepresentation);
    }
    this.ambientLight.intensity = ambientIntensity;

    if (typeof dirColor === 'number') {
      this.directionalLight.color.setHex(dirColor);
    } else {
      this.directionalLight.color.set(dirColor as THREE.ColorRepresentation);
    }
    this.directionalLight.intensity = dirIntensity;
  }

  /**
   * Loads a GLB binary model and stores it in the cache.
   */
  public async loadGLB(url: string, options?: LoadGLBOptions): Promise<THREE.Object3D> {
    const gltf = await this.modelLoader.load(url, options);
    return gltf.scene;
  }

  /**
   * Spawns an animated pixel-art model instance into the Three.js scene.
   */
  public async spawnModel(
    url: string | ArrayBuffer,
    options: SpawnModelOptions = {}
  ): Promise<PixelArtModelInstance> {
    const gltf = await this.modelLoader.load(url, {
      materialOptions: options.materialOptions,
    });

    const instance = this.modelLoader.instantiate(gltf, options);

    if (options.position) {
      instance.setGridPosition(options.position.x, options.position.y, options.elevation ?? 0);
    }
    if (options.facing !== undefined) {
      instance.setFacingDirection(options.facing);
    }

    this.scene.add(instance.root);
    this.activeModels.add(instance);

    return instance;
  }

  /**
   * Removes and disposes an active model instance.
   */
  public removeModel(instance: PixelArtModelInstance): void {
    this.activeModels.delete(instance);
    this.scene.remove(instance.root);
    instance.destroy();
  }

  public getActiveModels(): readonly PixelArtModelInstance[] {
    return Array.from(this.activeModels);
  }

  public setPixelScale(scale: number): void {
    this.pixelArtPostProcessor.setPixelScale(scale);
  }

  public gridToWorld(gridX: number, gridY: number, elevation = 0, cellScale = 2.0): THREE.Vector3 {
    return gridTo3DWorld(gridX, gridY, elevation, cellScale);
  }

  public render(): void {
    if (this.isDestroyed) return;

    const delta = this.clock.getDelta();

    // Update lighting transition if active
    this.lightingController?.update(delta);

    // Update all active pixel-art model animations
    for (const model of this.activeModels) {
      model.update(delta);
    }

    // Render using pixel art post processor
    this.pixelArtPostProcessor.render(this.renderer, this.scene, this.camera);
  }

  public resize(width: number, height: number): void {
    const aspect = width / height;
    const d = 10;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.pixelArtPostProcessor.setSize(width, height);
  }

  private onResize = (): void => {
    if (!this.container && typeof window === 'undefined') return;
    const width = this.container?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
    const height = this.container?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.resize(width, height);
  };

  public destroy(): void {
    this.isDestroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
    }

    for (const model of this.activeModels) {
      model.destroy();
    }
    this.activeModels.clear();

    this.pixelArtPostProcessor.dispose();
    this.modelLoader.clearCache();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
