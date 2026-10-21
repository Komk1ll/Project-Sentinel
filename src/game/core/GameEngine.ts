import { ThreeRenderer } from '@game/render/ThreeRenderer';
import { PlayerProgress } from '@game/systems/player-progress';
import { TownWorld } from '@game/systems/town-world';
import { CameraZoom } from '@game/systems/camera-zoom';

export interface GameEngineConfig {
  readonly gameContainerId: string;
  readonly threeContainerId: string;
}

/** Coordinates simulation, input, and presentation without DOM concerns in the world model. */
export class GameEngine {
  public readonly playerProgress = new PlayerProgress();
  public readonly world = new TownWorld();
  public readonly cameraZoom = new CameraZoom();
  public threeRenderer!: ThreeRenderer;
  private animationFrameId: number | null = null;
  private readonly keys = new Set<string>();
  private lastFrame = 0;
  private readonly cleanups = new Set<() => void>();

  constructor(private readonly config: GameEngineConfig) {}

  public init(): void {
    this.threeRenderer = new ThreeRenderer({ containerId: this.config.threeContainerId, world: this.world, zoom: this.cameraZoom });
    this.registerCleanup(this.world.subscribe(world => this.cameraZoom.setInterior(world.interior !== null)));
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearInput);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public registerCleanup(cleanup: () => void): void {
    this.cleanups.add(cleanup);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
    if (event.target instanceof HTMLElement && event.target.closest('button') && ['Space', 'Enter'].includes(event.code)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    this.keys.add(event.code);
    if (event.code === 'KeyE' && !event.repeat) this.world.interact();
    if (['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'Home'].includes(event.code)) {
      event.preventDefault();
      if (event.code === 'Home') this.cameraZoom.reset();
      else this.cameraZoom.adjust(['Minus', 'NumpadSubtract'].includes(event.code) ? .14 : -.14);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.code); };
  private readonly clearInput = (): void => { this.keys.clear(); };

  private readonly loop = (time: number): void => {
    const delta = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, .05) : 1 / 60;
    this.lastFrame = time;
    const right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const up = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    this.world.move((right - up) / Math.SQRT2, (-right - up) / Math.SQRT2, delta);
    this.cameraZoom.step(delta);
    this.threeRenderer.render(delta);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public destroy(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearInput);
    this.keys.clear();
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups.clear();
    this.threeRenderer.destroy();
  }
}
