import { Vector3D } from './index';

/**
 * Pixel art shading modes for 3D meshes.
 * - 'standard': MeshStandardMaterial with nearest-neighbor texture filtering.
 * - 'toon': MeshToonMaterial with stepped lighting gradient.
 * - 'unlit': MeshBasicMaterial preserving flat pixel-art texture colors.
 * - 'pixelart': Cel-shaded with quantization and outline support.
 */
export type PixelArtShadingMode = 'standard' | 'toon' | 'unlit' | 'pixelart';

export interface PixelArtMaterialOptions {
  readonly shadingMode?: PixelArtShadingMode;
  readonly forceNearestFilter?: boolean;
  readonly disableMipmaps?: boolean;
  readonly outline?: boolean;
  readonly outlineColor?: number;
  readonly outlineThickness?: number;
  readonly roughness?: number;
  readonly metalness?: number;
}

export interface PixelArtViewportOptions {
  /**
   * Virtual pixel scale factor (1 = native resolution, 2 = 2x pixel size, 3 = 3x, 4 = 4x).
   * Default is 2 for crisp pixelation on high-DPI displays.
   */
  readonly pixelScale?: number;
  readonly targetWidth?: number;
  readonly targetHeight?: number;
  readonly enabled?: boolean;
}

export interface SteppedAnimationOptions {
  /**
   * Target frame rate for stepped animation playback (e.g. 2, 4, 6, 8, 10 fps).
   * When stepped is true, frames are held to recreate authentic pixel-art cadence.
   */
  readonly fps?: number;
  /**
   * If true, animation keyframes advance in discrete quantized steps.
   * If false, advances smoothly at 60+ Hz.
   */
  readonly stepped?: boolean;
  readonly loop?: boolean;
  readonly clampWhenFinished?: boolean;
  readonly timeScale?: number;
  readonly crossFadeDuration?: number;
}

export interface BoneAttachmentOptions {
  readonly offset?: Vector3D;
  readonly rotation?: Vector3D; // Euler angles in radians
  readonly scale?: Vector3D;
}

/**
 * 8-directional compass headings for 2:1 isometric movement.
 */
export type IsometricDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface GLBModelMetadata {
  readonly id: string;
  readonly sourcePath: string;
  readonly name: string;
  readonly category: 'robot' | 'character' | 'prop' | 'building';
  readonly availableAnimations: readonly string[];
  readonly defaultAnimation?: string;
  readonly targetFps?: Record<string, number>;
  readonly rootBoneName?: string;
  readonly scale?: number;
}
