import { TOWN_SPAWN } from '@content/town';
import type { TownWorld } from '@game/systems/town-world';
import type { FirstAidMission } from '@game/systems/first-aid-mission';
import { TownSaveStore } from '@game/systems/town-save';

const MESSAGES = {
  new: 'Автосохранение включено',
  restored: 'Прогресс восстановлен',
  recovered: 'Прогресс восстановлен из резервной копии',
  corrupt: 'Сохранение повреждено. Начата новая игра.',
  unavailable: 'Сохранение недоступно. Не закрывайте эту вкладку.',
  saved: 'Прогресс сохранён на этом устройстве',
  pending: 'Сохраняем прогресс…',
} as const;
export class TownSession {
  private status: keyof typeof MESSAGES;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastState: string;
  private lastStage: string;
  private lastInterior: string | null;
  private suspended = false;
  private readonly listeners = new Set<(message: string) => void>();
  private readonly unsubscribe: () => void;

  constructor(private readonly world: TownWorld, private readonly mission: FirstAidMission, private readonly store = new TownSaveStore()) {
    const loaded = store.load();
    this.status = loaded.status;
    if (loaded.data) {
      world.restore(loaded.data.world);
      mission.restore(loaded.data.stage);
    }
    this.lastState = this.fingerprint();
    this.lastStage = mission.snapshot.stage;
    this.lastInterior = world.interior?.id ?? null;
    this.unsubscribe = mission.subscribe(() => this.changed());
  }
  get message(): string { return MESSAGES[this.status]; }
  subscribe(listener: (message: string) => void): () => void {
    this.listeners.add(listener); listener(this.message);
    return () => this.listeners.delete(listener);
  }
  flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const state = this.fingerprint();
    if (state === this.lastState) return;
    const success = this.store.save({ schemaVersion: 1, buildId: 'cybershield-first-aid', savedAt: Date.now(), world: this.world.snapshot, stage: this.mission.snapshot.stage });
    if (success) this.lastState = state;
    this.setStatus(success ? 'saved' : 'unavailable');
  }
  newGame(): void {
    this.suspended = true;
    this.world.restore({ interiorId: null, position: TOWN_SPAWN, outdoorReturn: TOWN_SPAWN });
    this.mission.restore('meet-master');
    this.suspended = false;
    this.lastState = '';
    this.lastStage = 'meet-master';
    this.lastInterior = null;
    this.flush();
  }
  destroy(): void {
    this.flush(); this.unsubscribe(); this.listeners.clear();
  }
  private fingerprint(): string { return JSON.stringify({ world: this.world.snapshot, stage: this.mission.snapshot.stage }); }
  private changed(): void {
    if (this.suspended || this.fingerprint() === this.lastState) return;
    const stage = this.mission.snapshot.stage;
    const interior = this.world.interior?.id ?? null;
    const immediate = stage !== this.lastStage || interior !== this.lastInterior;
    this.lastStage = stage; this.lastInterior = interior;
    if (immediate) this.flush();
    else if (this.timer === null) {
      if (this.status !== 'unavailable') this.setStatus('pending');
      this.timer = setTimeout(() => this.flush(), 500);
    }
  }
  private setStatus(status: keyof typeof MESSAGES): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(this.message);
  }
}
