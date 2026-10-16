import * as THREE from 'three';
import { SteppedAnimationOptions } from '../../types/models';

export interface AnimationControllerConfig {
  fps?: number;
  stepped?: boolean;
  timeScale?: number;
}

/**
 * Animation controller supporting discrete stepped frame quantization
 * for authentic pixel-art cadence (e.g. 4 fps for hero idle, 10 fps for walk, 2 fps for robot idle).
 */
export class PixelArtAnimationController {
  public readonly mixer: THREE.AnimationMixer;
  private clips: Map<string, THREE.AnimationClip> = new Map();
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentClipName: string | null = null;
  private currentAction: THREE.AnimationAction | null = null;

  private fps = 8;
  private stepped = true;
  private timeScale = 1.0;
  private isPaused = false;
  private stepAccumulator = 0;

  private finishCallbacks: Map<string, Set<() => void>> = new Map();
  private loopCallbacks: Map<string, Set<() => void>> = new Map();

  constructor(
    public readonly root: THREE.Object3D,
    initialClips: readonly THREE.AnimationClip[] = [],
    config: AnimationControllerConfig = {}
  ) {
    this.mixer = new THREE.AnimationMixer(this.root);
    if (config.fps !== undefined) this.fps = config.fps;
    if (config.stepped !== undefined) this.stepped = config.stepped;
    if (config.timeScale !== undefined) this.timeScale = config.timeScale;

    for (const clip of initialClips) {
      this.registerClip(clip);
    }

    this.mixer.addEventListener('finished', this.handleFinished);
    this.mixer.addEventListener('loop', this.handleLoop);
  }

  public registerClip(clip: THREE.AnimationClip): void {
    this.clips.set(clip.name, clip);
    const action = this.mixer.clipAction(clip);
    this.actions.set(clip.name, action);
  }

  public getClipNames(): readonly string[] {
    return Array.from(this.clips.keys());
  }

  public hasClip(name: string): boolean {
    return this.clips.has(name);
  }

  public getCurrentClipName(): string | null {
    return this.currentClipName;
  }

  public getCurrentAction(): THREE.AnimationAction | null {
    return this.currentAction;
  }

  public isPlaying(): boolean {
    return this.currentAction !== null && this.currentAction.isRunning() && !this.isPaused;
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public setFps(fps: number): void {
    this.fps = Math.max(1, fps);
  }

  public getFps(): number {
    return this.fps;
  }

  public setStepped(stepped: boolean): void {
    this.stepped = stepped;
    this.stepAccumulator = 0;
  }

  public isStepped(): boolean {
    return this.stepped;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = scale;
    this.mixer.timeScale = scale;
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public play(name: string, options: SteppedAnimationOptions = {}): THREE.AnimationAction | null {
    const action = this.actions.get(name);
    if (!action) {
      return null;
    }

    if (options.fps !== undefined) this.fps = options.fps;
    if (options.stepped !== undefined) this.stepped = options.stepped;

    const loop = options.loop ?? true;
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = options.clampWhenFinished ?? !loop;

    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.stop();
    }

    action.reset();
    action.play();

    this.currentClipName = name;
    this.currentAction = action;
    this.isPaused = false;
    this.stepAccumulator = 0;

    return action;
  }

  public crossFadeTo(
    name: string,
    duration = 0.2,
    options: SteppedAnimationOptions = {}
  ): THREE.AnimationAction | null {
    const nextAction = this.actions.get(name);
    if (!nextAction) {
      return null;
    }

    if (this.currentClipName === name && this.isPlaying()) {
      return nextAction;
    }

    if (!this.currentAction) {
      return this.play(name, options);
    }

    if (options.fps !== undefined) this.fps = options.fps;
    if (options.stepped !== undefined) this.stepped = options.stepped;

    const loop = options.loop ?? true;
    nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    nextAction.clampWhenFinished = options.clampWhenFinished ?? !loop;

    nextAction.reset();
    nextAction.play();
    this.currentAction.crossFadeTo(nextAction, duration, true);

    this.currentClipName = name;
    this.currentAction = nextAction;
    this.isPaused = false;
    this.stepAccumulator = 0;

    return nextAction;
  }

  public stop(): void {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
      this.currentClipName = null;
    }
    this.mixer.stopAllAction();
    this.stepAccumulator = 0;
  }

  public onAnimationFinished(clipName: string, callback: () => void): () => void {
    let set = this.finishCallbacks.get(clipName);
    if (!set) {
      set = new Set();
      this.finishCallbacks.set(clipName, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
    };
  }

  public onLoop(clipName: string, callback: () => void): () => void {
    let set = this.loopCallbacks.get(clipName);
    if (!set) {
      set = new Set();
      this.loopCallbacks.set(clipName, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
    };
  }

  /**
   * Advances the animation mixer.
   * If stepped is true, frames advance in discrete quantized increments
   * matching this.fps (stepped keyframes for pixel art feel).
   */
  public update(deltaTime: number): void {
    if (this.isPaused || deltaTime <= 0) return;

    if (!this.stepped) {
      this.mixer.update(deltaTime * this.timeScale);
      return;
    }

    // Stepped frame quantization
    const stepDuration = 1.0 / this.fps;
    this.stepAccumulator += deltaTime * this.timeScale;

    if (this.stepAccumulator >= stepDuration) {
      const steps = Math.floor(this.stepAccumulator / stepDuration);
      const steppedDelta = steps * stepDuration;
      this.mixer.update(steppedDelta);
      this.stepAccumulator -= steppedDelta;
    }
  }

  private handleFinished = (event: { action: THREE.AnimationAction }): void => {
    const clip = event.action.getClip();
    if (!clip) return;
    const callbacks = this.finishCallbacks.get(clip.name);
    if (callbacks) {
      callbacks.forEach((cb) => cb());
    }
  };

  private handleLoop = (event: { action: THREE.AnimationAction }): void => {
    const clip = event.action.getClip();
    if (!clip) return;
    const callbacks = this.loopCallbacks.get(clip.name);
    if (callbacks) {
      callbacks.forEach((cb) => cb());
    }
  };

  public dispose(): void {
    this.stop();
    this.mixer.removeEventListener('finished', this.handleFinished);
    this.mixer.removeEventListener('loop', this.handleLoop);
    this.mixer.uncacheRoot(this.root);
    this.clips.clear();
    this.actions.clear();
    this.finishCallbacks.clear();
    this.loopCallbacks.clear();
  }
}
