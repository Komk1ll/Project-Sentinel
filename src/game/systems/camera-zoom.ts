interface ZoomRange {
  readonly initial: number;
  readonly minimum: number;
  readonly maximum: number;
}

interface ZoomState {
  readonly range: ZoomRange;
  current: number;
  target: number;
}

const OUTDOOR_RANGE: ZoomRange = { initial: 11, minimum: 5, maximum: 75 };
const INDOOR_RANGE: ZoomRange = { initial: 6.5, minimum: 3.5, maximum: 11 };

function createState(range: ZoomRange): ZoomState {
  return { range, current: range.initial, target: range.initial };
}

/** Smooth magnification with separate remembered indoor and outdoor views. */
export class CameraZoom {
  private readonly outdoor = createState(OUTDOOR_RANGE);
  private readonly indoor = createState(INDOOR_RANGE);
  private inside = false;
  private readonly listeners = new Set<(zoom: CameraZoom) => void>();

  private get active(): ZoomState {
    return this.inside ? this.indoor : this.outdoor;
  }

  get span(): number {
    return this.active.current;
  }

  get percent(): number {
    return Math.round(100 * this.active.range.initial / this.span);
  }

  /** Wide indoor views frame the room; close views follow the player. */
  get followWeight(): number {
    if (!this.inside) return 1;
    return Math.max(0, Math.min(1, (INDOOR_RANGE.initial - this.span) / (INDOOR_RANGE.initial - INDOOR_RANGE.minimum)));
  }

  setInterior(inside: boolean): void {
    if (this.inside === inside) return;
    this.inside = inside;
    this.notify();
  }

  /** Positive input moves away from the scene; negative input moves closer. */
  adjust(amount: number): void {
    if (!Number.isFinite(amount)) return;
    const state = this.active;
    state.target = Math.max(state.range.minimum, Math.min(state.range.maximum, state.target * Math.exp(amount)));
  }

  step(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const state = this.active;
    const previous = state.current;
    const smoothing = 1 - Math.exp(-Math.min(deltaSeconds, 0.1) * 12);
    state.current += (state.target - state.current) * smoothing;
    if (Math.abs(state.target - state.current) < 0.00001) state.current = state.target;
    if (state.current !== previous) this.notify();
  }

  showPlanet(): void {if(!this.inside)this.outdoor.target=56;}

  reset(): void {
    this.active.target = this.active.range.initial;
  }

  subscribe(listener: (zoom: CameraZoom) => void): () => void {
    this.listeners.add(listener);
    listener(this);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this);
  }
}
