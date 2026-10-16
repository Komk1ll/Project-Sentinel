import * as THREE from 'three';

export interface ThreeRendererOptions {
  containerId: string;
  width?: number;
  height?: number;
}

/**
 * Three.js WebGL / OpenGL Renderer Integration
 * Configured for isometric orthographic camera (azimuth 45°, elevation 30°)
 * matching Project Sentinel Blender model render standards.
 */
export class ThreeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private isDestroyed = false;

  constructor(options: ThreeRendererOptions) {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`[ThreeRenderer] Container #${options.containerId} not found in DOM`);
    }
    this.container = container;

    const width = options.width ?? container.clientWidth ?? window.innerWidth;
    const height = options.height ?? container.clientHeight ?? window.innerHeight;

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

    // 3. WebGL Renderer (OpenGL via browser WebGL)
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. Default Lighting
    this.setupLighting();

    // 5. Add Sentinel Robot Demo Model Placeholder (clean 3D mesh)
    this.setupDemoSentinelMesh();

    // Window resize handler
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  private setupDemoSentinelMesh(): void {
    // Demo mesh representing a municipal sentinel robot in 3D
    const group = new THREE.Group();
    group.name = 'SentinelRobotPlaceholder';

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.8,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Head / Sensor Dome
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x054f32,
      roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.15;
    group.add(head);

    this.scene.add(group);
  }

  public render(): void {
    if (this.isDestroyed) return;
    // Slow idle rotation for demo mesh
    const demoMesh = this.scene.getObjectByName('SentinelRobotPlaceholder');
    if (demoMesh) {
      demoMesh.rotation.y += 0.01;
    }
    this.renderer.render(this.scene, this.camera);
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
  }

  private onResize = (): void => {
    if (!this.container) return;
    this.resize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
  };

  public destroy(): void {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
