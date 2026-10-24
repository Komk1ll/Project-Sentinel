export interface PlayerProgressState {
  readonly health: number;
  readonly stamina: number;
  readonly hunger: number;
  readonly mood: number;
  readonly level: number;
  readonly experience: number;
}

type ProgressListener = (state: PlayerProgressState) => void;

function boundedValue(value: number, maximum: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 0;
}

/** Game-owned progress; future consumables and rewards update this shared state. */
export class PlayerProgress {
  private state: PlayerProgressState = Object.freeze({
    health: 0,
    stamina: 0,
    hunger: 0,
    mood: 0,
    level: 0,
    experience: 0,
  });
  private readonly listeners = new Set<ProgressListener>();

  public get snapshot(): PlayerProgressState {
    return this.state;
  }

  public update(patch: Partial<PlayerProgressState>): void {
    const next = { ...this.state, ...patch };
    this.state = Object.freeze({
      health: boundedValue(next.health, 100),
      stamina: boundedValue(next.stamina, 100),
      hunger: boundedValue(next.hunger, 100),
      mood: boundedValue(next.mood, 100),
      level: Math.floor(boundedValue(next.level, Number.MAX_SAFE_INTEGER)),
      experience: boundedValue(next.experience, 100),
    });
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }
}
