/**
 * DynamicLightingController
 * Manages environmental lighting states, color palettes, and transitions
 * for Project Sentinel's isometric diorama pipeline.
 *
 * Visual Direction: Документ.pdf Page 9 thumbnails
 * Fully compatible with ThreeRenderer (WebGL runtime) and headless Node/Vitest test execution.
 */

import type { LightingState } from '@/types/campaign';

export interface LightingPalette {
  readonly state: LightingState;
  readonly ambientHex: string;
  readonly ambientColor: number;
  readonly ambientIntensity: number;
  readonly directionalHex: string;
  readonly directionalColor: number;
  readonly directionalIntensity: number;
  readonly directionalPosition: [number, number, number];
  readonly accentColor?: number;
  readonly accentIntensity?: number;
  readonly accentPosition?: [number, number, number];
}

/**
 * Authoritative color palettes and intensities matching Документ.pdf Page 9
 */
export const LIGHTING_PALETTES: Readonly<Record<LightingState, LightingPalette>> = {
  dark_emergency: {
    state: 'dark_emergency',
    ambientHex: '#1a0f0f',
    ambientColor: 0x1a0f0f,
    ambientIntensity: 0.2,
    directionalHex: '#ff3b30',
    directionalColor: 0xff3b30,
    directionalIntensity: 0.5,
    directionalPosition: [15, 30, 15],
    accentColor: 0xff2200,
    accentIntensity: 1.0,
    accentPosition: [10, 3, 2],
  },
  warm_restored: {
    state: 'warm_restored',
    ambientHex: '#fff5ea',
    ambientColor: 0xfff5ea,
    ambientIntensity: 0.8,
    directionalHex: '#ffeedd',
    directionalColor: 0xffeedd,
    directionalIntensity: 1.3,
    directionalPosition: [20, 40, 20],
    accentColor: 0x38bdf8,
    accentIntensity: 0.4,
    accentPosition: [6, 2, 6],
  },
  twilight: {
    state: 'twilight',
    ambientHex: '#1e293b',
    ambientColor: 0x1e293b,
    ambientIntensity: 0.5,
    directionalHex: '#60a5fa',
    directionalColor: 0x60a5fa,
    directionalIntensity: 0.8,
    directionalPosition: [20, 40, 20],
    accentColor: 0x38bdf8,
    accentIntensity: 0.3,
    accentPosition: [0, 4, 0],
  },
  sunny_day: {
    state: 'sunny_day',
    ambientHex: '#ffffff',
    ambientColor: 0xffffff,
    ambientIntensity: 0.9,
    directionalHex: '#fffbeb',
    directionalColor: 0xfffbeb,
    directionalIntensity: 1.4,
    directionalPosition: [25, 45, 25],
    accentColor: 0xffffff,
    accentIntensity: 0.0,
  },
};

export type LightingTransitionMode = 'stepped' | 'continuous' | 'instant';

export interface LightingTransitionOptions {
  /**
   * Transition duration in seconds. Default: 1.0s (or 0 for instant)
   */
  readonly duration?: number;

  /**
   * Transition mode: 'stepped' (retro pixel-art palette quantization),
   * 'continuous' (smooth lerp), or 'instant'. Default: 'stepped'.
   */
  readonly mode?: LightingTransitionMode;

  /**
   * Number of discrete steps for stepped mode. Default: 6.
   */
  readonly steps?: number;

  /**
   * Callback fired on each discrete step.
   */
  readonly onStep?: (stepIndex: number, totalSteps: number, currentPalette: LightingPalette) => void;

  /**
   * Callback fired when transition completes.
   */
  readonly onComplete?: (finalState: LightingState) => void;
}

export interface DynamicLightingControllerConfig {
  readonly initialState?: LightingState;
  readonly defaultTransitionMode?: LightingTransitionMode;
  readonly defaultDuration?: number;
  readonly ambientLight?: unknown;
  readonly directionalLight?: unknown;
  readonly accentLight?: unknown;
  readonly onStateChanged?: (state: LightingState, palette: LightingPalette) => void;
}

export class DynamicLightingController {
  private currentState: LightingState;
  private targetState: LightingState;
  private currentPalette: LightingPalette;
  private fromPalette: LightingPalette;
  private toPalette: LightingPalette;

  private isTransitionActive: boolean = false;
  private transitionElapsed: number = 0;
  private transitionDuration: number = 0;
  private transitionMode: LightingTransitionMode = 'stepped';
  private transitionSteps: number = 6;
  private lastReportedStep: number = -1;

  private onStepCallback?: (stepIndex: number, totalSteps: number, currentPalette: LightingPalette) => void;
  private onCompleteCallback?: (finalState: LightingState) => void;

  private ambientLight?: unknown;
  private directionalLight?: unknown;
  private accentLight?: unknown;

  private stateChangeListeners: Set<(state: LightingState, palette: LightingPalette) => void> = new Set();
  private completeListeners: Set<(state: LightingState) => void> = new Set();

  constructor(config: DynamicLightingControllerConfig = {}) {
    this.currentState = config.initialState ?? 'twilight';
    this.targetState = this.currentState;
    this.currentPalette = { ...LIGHTING_PALETTES[this.currentState] };
    this.fromPalette = { ...this.currentPalette };
    this.toPalette = { ...this.currentPalette };

    this.transitionMode = config.defaultTransitionMode ?? 'stepped';
    this.transitionDuration = config.defaultDuration ?? 1.0;

    if (config.ambientLight || config.directionalLight) {
      this.attachLights(config.ambientLight, config.directionalLight, config.accentLight);
    }

    if (config.onStateChanged) {
      this.stateChangeListeners.add(config.onStateChanged);
    }

    this.applyPaletteToLights(this.currentPalette);
  }

  /**
   * Attaches Three.js light instances to this controller.
   */
  public attachLights(ambientLight: unknown, directionalLight: unknown, accentLight?: unknown): void {
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;
    this.accentLight = accentLight;
    this.applyPaletteToLights(this.currentPalette);
  }

  /**
   * Detaches Three.js lights.
   */
  public detachLights(): void {
    this.ambientLight = undefined;
    this.directionalLight = undefined;
    this.accentLight = undefined;
  }

  /**
   * Returns current active lighting state name.
   */
  public getState(): LightingState {
    return this.currentState;
  }

  /**
   * Returns target lighting state name if transitioning, otherwise current.
   */
  public getTargetState(): LightingState {
    return this.targetState;
  }

  /**
   * Returns current interpolated/quantized lighting palette.
   */
  public getCurrentPalette(): LightingPalette {
    return { ...this.currentPalette };
  }

  /**
   * Returns true if transition is actively running.
   */
  public isTransitioning(): boolean {
    return this.isTransitionActive;
  }

  /**
   * Returns progress fraction [0.0 - 1.0] of current transition.
   */
  public getProgress(): number {
    if (!this.isTransitionActive || this.transitionDuration <= 0) return 1.0;
    return Math.min(1.0, this.transitionElapsed / this.transitionDuration);
  }

  /**
   * Instantly applies a lighting state without transition.
   */
  public setState(state: LightingState): void {
    this.isTransitionActive = false;
    this.currentState = state;
    this.targetState = state;
    this.currentPalette = { ...LIGHTING_PALETTES[state] };
    this.fromPalette = { ...this.currentPalette };
    this.toPalette = { ...this.currentPalette };

    this.applyPaletteToLights(this.currentPalette);
    this.notifyStateChanged(state, this.currentPalette);
  }

  /**
   * Starts a transition to the target lighting state.
   */
  public transitionTo(state: LightingState, options: LightingTransitionOptions = {}): void {
    const duration = options.duration ?? (options.mode === 'instant' ? 0 : 1.0);
    const mode = options.mode ?? (duration <= 0 ? 'instant' : 'stepped');

    if (duration <= 0 || mode === 'instant') {
      this.setState(state);
      options.onComplete?.(state);
      return;
    }

    if (this.currentState === state && !this.isTransitionActive) {
      options.onComplete?.(state);
      return;
    }

    this.targetState = state;
    this.fromPalette = { ...this.currentPalette };
    this.toPalette = { ...LIGHTING_PALETTES[state] };

    this.isTransitionActive = true;
    this.transitionElapsed = 0;
    this.transitionDuration = duration;
    this.transitionMode = mode;
    this.transitionSteps = Math.max(2, options.steps ?? 6);
    this.lastReportedStep = -1;

    this.onStepCallback = options.onStep;
    this.onCompleteCallback = options.onComplete;
  }

  /**
   * Per-frame update tick.
   * Call from render loop with elapsed delta time in seconds.
   */
  public update(deltaSeconds: number): void {
    if (!this.isTransitionActive) return;

    this.transitionElapsed += deltaSeconds;
    const rawT = Math.min(1.0, this.transitionElapsed / this.transitionDuration);

    let progress = rawT;

    if (this.transitionMode === 'stepped') {
      const stepIndex = Math.min(
        this.transitionSteps,
        Math.floor(rawT * this.transitionSteps)
      );
      progress = stepIndex / this.transitionSteps;

      if (stepIndex !== this.lastReportedStep) {
        this.lastReportedStep = stepIndex;
        this.computeCurrentPalette(progress);
        this.onStepCallback?.(stepIndex, this.transitionSteps, this.currentPalette);
      }
    } else {
      // Smooth continuous lerp
      this.computeCurrentPalette(progress);
    }

    this.applyPaletteToLights(this.currentPalette);

    if (rawT >= 1.0) {
      this.isTransitionActive = false;
      this.currentState = this.targetState;
      this.currentPalette = { ...LIGHTING_PALETTES[this.currentState] };
      this.applyPaletteToLights(this.currentPalette);

      this.notifyStateChanged(this.currentState, this.currentPalette);
      this.onCompleteCallback?.(this.currentState);
      this.notifyComplete(this.currentState);
    }
  }

  /**
   * Interpolates colors and intensities between fromPalette and toPalette.
   */
  private computeCurrentPalette(t: number): void {
    const ambientColor = lerpColor(this.fromPalette.ambientColor, this.toPalette.ambientColor, t);
    const ambientIntensity = lerpScalar(this.fromPalette.ambientIntensity, this.toPalette.ambientIntensity, t);

    const directionalColor = lerpColor(this.fromPalette.directionalColor, this.toPalette.directionalColor, t);
    const directionalIntensity = lerpScalar(this.fromPalette.directionalIntensity, this.toPalette.directionalIntensity, t);

    const dirPos: [number, number, number] = [
      lerpScalar(this.fromPalette.directionalPosition[0], this.toPalette.directionalPosition[0], t),
      lerpScalar(this.fromPalette.directionalPosition[1], this.toPalette.directionalPosition[1], t),
      lerpScalar(this.fromPalette.directionalPosition[2], this.toPalette.directionalPosition[2], t),
    ];

    let accentColor = this.toPalette.accentColor;
    let accentIntensity = this.toPalette.accentIntensity;
    if (this.fromPalette.accentColor !== undefined && this.toPalette.accentColor !== undefined) {
      accentColor = lerpColor(this.fromPalette.accentColor, this.toPalette.accentColor, t);
    }
    if (this.fromPalette.accentIntensity !== undefined && this.toPalette.accentIntensity !== undefined) {
      accentIntensity = lerpScalar(this.fromPalette.accentIntensity, this.toPalette.accentIntensity, t);
    }

    this.currentPalette = {
      state: t >= 1.0 ? this.targetState : this.currentState,
      ambientHex: '#' + ambientColor.toString(16).padStart(6, '0'),
      ambientColor,
      ambientIntensity,
      directionalHex: '#' + directionalColor.toString(16).padStart(6, '0'),
      directionalColor,
      directionalIntensity,
      directionalPosition: dirPos,
      accentColor,
      accentIntensity,
    };
  }

  /**
   * Applies palette colors, intensities, and positions to attached Three.js lights.
   */
  private applyPaletteToLights(palette: LightingPalette): void {
    const ambient = this.ambientLight as { color?: { setHex?: (c: number) => void }; intensity?: number } | undefined;
    if (ambient) {
      if (typeof ambient.color?.setHex === 'function') {
        ambient.color.setHex(palette.ambientColor);
      }
      ambient.intensity = palette.ambientIntensity;
    }

    const dir = this.directionalLight as {
      color?: { setHex?: (c: number) => void };
      intensity?: number;
      position?: { set?: (x: number, y: number, z: number) => void };
    } | undefined;
    if (dir) {
      if (typeof dir.color?.setHex === 'function') {
        dir.color.setHex(palette.directionalColor);
      }
      dir.intensity = palette.directionalIntensity;
      if (typeof dir.position?.set === 'function') {
        dir.position.set(
          palette.directionalPosition[0],
          palette.directionalPosition[1],
          palette.directionalPosition[2]
        );
      }
    }

    const accent = this.accentLight as { color?: { setHex?: (c: number) => void }; intensity?: number } | undefined;
    if (accent && palette.accentColor !== undefined) {
      if (typeof accent.color?.setHex === 'function') {
        accent.color.setHex(palette.accentColor);
      }
      if (palette.accentIntensity !== undefined) {
        accent.intensity = palette.accentIntensity;
      }
    }
  }

  private notifyStateChanged(state: LightingState, palette: LightingPalette): void {
    for (const listener of this.stateChangeListeners) {
      listener(state, palette);
    }
  }

  private notifyComplete(state: LightingState): void {
    for (const listener of this.completeListeners) {
      listener(state);
    }
  }

  public onStateChange(listener: (state: LightingState, palette: LightingPalette) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  public onTransitionComplete(listener: (state: LightingState) => void): () => void {
    this.completeListeners.add(listener);
    return () => this.completeListeners.delete(listener);
  }
}

/**
 * Pure linear RGB color interpolation between two 24-bit hex colors.
 */
export function lerpColor(c1: number, c2: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);

  return (r << 16) | (g << 8) | b;
}

/**
 * Scalar linear interpolation.
 */
export function lerpScalar(a: number, b: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return a + (b - a) * clampedT;
}
