import * as THREE from 'three';
import { PixelArtViewportOptions } from '../../types/models';

/**
 * PixelArtPostProcessor provides virtual low-resolution offscreen rendering
 * using an off-screen WebGLRenderTarget with NearestFilter sampling.
 * This gives 3D geometry and characters the authentic pixel-art rasterization look.
 */
export class PixelArtPostProcessor {
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private orthoCamera: THREE.OrthographicCamera;
  private quadScene: THREE.Scene;
  private quadMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private pixelScale = 2;
  private enabled = true;
  private currentWidth = 800;
  private currentHeight = 600;

  constructor(options: PixelArtViewportOptions = {}) {
    if (options.pixelScale !== undefined) {
      this.pixelScale = Math.max(1, options.pixelScale);
    }
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }

    // Full-screen quad setup for blitting low-res target to canvas
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();

    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMaterial = new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });

    this.quadMesh = new THREE.Mesh(quadGeometry, quadMaterial);
    this.quadScene.add(this.quadMesh);
  }

  public setSize(width: number, height: number): void {
    this.currentWidth = Math.max(1, width);
    this.currentHeight = Math.max(1, height);

    const targetWidth = Math.max(1, Math.floor(this.currentWidth / this.pixelScale));
    const targetHeight = Math.max(1, Math.floor(this.currentHeight / this.pixelScale));

    if (this.renderTarget) {
      this.renderTarget.setSize(targetWidth, targetHeight);
    } else {
      this.renderTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
        generateMipmaps: false,
      });
    }

    this.quadMesh.material.map = this.renderTarget.texture;
    this.quadMesh.material.needsUpdate = true;
  }

  public setPixelScale(scale: number): void {
    const newScale = Math.max(1, scale);
    if (this.pixelScale !== newScale) {
      this.pixelScale = newScale;
      this.setSize(this.currentWidth, this.currentHeight);
    }
  }

  public getPixelScale(): number {
    return this.pixelScale;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.renderTarget;
  }

  /**
   * Renders the scene through the low-resolution pixel-art pipeline if enabled,
   * or directly to the canvas if disabled or pixelScale is 1.
   */
  public render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.enabled || this.pixelScale <= 1 || !this.renderTarget) {
      renderer.render(scene, camera);
      return;
    }

    // Pass 1: Render scene to low-resolution render target
    const currentRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // Pass 2: Blit low-res texture to canvas using nearest-neighbor fullscreen quad
    renderer.setRenderTarget(currentRenderTarget);
    renderer.render(this.quadScene, this.orthoCamera);
  }

  public dispose(): void {
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
    this.quadMesh.geometry.dispose();
    this.quadMesh.material.dispose();
  }
}
