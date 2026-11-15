import { ThreeRenderer } from '@game/render/ThreeRenderer';
import { PlayerProgress } from '@game/systems/player-progress';
import { TownWorld } from '@game/systems/town-world';
import { TownSession } from '@game/systems/town-session';
import { FirstAidMission } from '@game/systems/first-aid-mission';
import { CameraZoom } from '@game/systems/camera-zoom';

const FRAME_INTERVAL_MS = 1000 / 60;

export interface GameEngineConfig {
  readonly gameContainerId: string;
  readonly threeContainerId: string;
}

/** Coordinates simulation, input, and presentation without DOM concerns in the world model. */
export class GameEngine {
  public readonly playerProgress = new PlayerProgress();
  public readonly world = new TownWorld();
  public readonly firstAid = new FirstAidMission(this.world);
  public readonly session = new TownSession(this.world, this.firstAid);
  public readonly cameraZoom = new CameraZoom();
  public threeRenderer!: ThreeRenderer;
  public visualsReady: Promise<void> = Promise.resolve();
  private animationFrameId: number | null = null;
  private readonly keys = new Set<string>();
  private lastFrame = 0;
  private nextFrame = 0;
  private readonly cleanups = new Set<() => void>();

  constructor(private readonly config: GameEngineConfig) {}

  public init(): void {
    this.threeRenderer = new ThreeRenderer({ containerId: this.config.threeContainerId, world: this.world, zoom: this.cameraZoom, firstAid: this.firstAid });
    this.visualsReady = this.threeRenderer.loadVisuals();
    this.registerCleanup(this.world.subscribe(world => this.cameraZoom.setInterior(world.interior !== null)));
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearInput);
    window.addEventListener('pagehide', this.saveProgress);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();
  }

  public registerCleanup(cleanup: () => void): void {
    this.cleanups.add(cleanup);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
    if (event.target instanceof HTMLElement && event.target.closest('button') && ['Space', 'Enter'].includes(event.code)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Escape' && !event.repeat) {
      this.clearInput();
      this.firstAid.toggleMenu();
      return;
    }
    if (this.firstAid.storyPanel) return;
    this.keys.add(event.code);
    if (event.code === 'KeyE' && !event.repeat) this.firstAid.interact();
    if (event.code === 'KeyQ' && !event.repeat) this.world.changeFloor(-1);
    if (['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'Home'].includes(event.code)) {
      event.preventDefault();
      if (event.code === 'Home') this.cameraZoom.reset();
      else this.cameraZoom.adjust(['Minus', 'NumpadSubtract'].includes(event.code) ? .14 : -.14);
    }
  };

  private readonly saveProgress = (): void => { this.session.flush(); };
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.lastFrame = this.nextFrame = 0;
      this.clearInput();
      this.session.flush();
    } else if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => { this.keys.delete(event.code); };
  private readonly clearInput = (): void => { this.keys.clear(); };

  private readonly loop = (time: number): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    if (time + .25 < this.nextFrame) return;
    this.nextFrame = Math.max(time - FRAME_INTERVAL_MS, this.nextFrame || time) + FRAME_INTERVAL_MS;
    const frameTime = this.lastFrame ? time - this.lastFrame : FRAME_INTERVAL_MS;
    const delta = Math.min(frameTime / 1000, .05);
    this.lastFrame = time;
    const right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const up = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const dx=(right-up)/Math.SQRT2,dz=(-right-up)/Math.SQRT2;
    if (this.firstAid.storyPanel) { this.clearInput(); return; }
    this.threeRenderer.observeFrameTime?.(frameTime);
    if (this.world.activeCar !== null) this.world.driveCar(up, right, delta);
    else this.world.move(dx,dz,delta);
    this.firstAid.life.update(delta);
    this.cameraZoom.step(delta);
    this.threeRenderer.render(delta);
  };

  public destroy(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearInput);
    window.removeEventListener('pagehide', this.saveProgress);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.session.destroy();
    this.keys.clear();
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups.clear();
    this.firstAid.destroy();
    this.threeRenderer.destroy();
  }
}
