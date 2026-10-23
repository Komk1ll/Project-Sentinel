import { AID_KIT, CLINIC_ID, FIRST_AID_TEXT, MASTER } from '@content/first-aid';
import type { TownWorld } from '@game/systems/town-world';

export type FirstAidStage = 'meet-master' | 'deliver-aid';

export interface FirstAidSnapshot {
  readonly stage: FirstAidStage;
  readonly inventory: readonly (typeof AID_KIT)[];
  readonly objective: string;
  readonly hint: string;
  readonly targetBuildingId: string;
  readonly dialogue: string | null;
}

export interface TownInteraction {
  readonly kind: 'master' | 'enter' | 'exit';
  readonly label: string;
}

/** Routes contextual actions and owns the first aid handoff, without DOM or rendering. */
export class FirstAidMission {
  private stage: FirstAidStage = 'meet-master';
  private dialogue: string | null = null;
  private readonly listeners = new Set<(snapshot: FirstAidSnapshot) => void>();
  private readonly unsubscribeWorld: () => void;

  constructor(public readonly world: TownWorld) {
    this.unsubscribeWorld = world.subscribe(() => this.notify());
  }

  get snapshot(): FirstAidSnapshot {
    const received = this.stage === 'deliver-aid';
    let hint: string = FIRST_AID_TEXT.meetHint;
    if (received) {
      hint = this.world.interior?.id === CLINIC_ID ? FIRST_AID_TEXT.clinicHint
        : this.world.interior ? FIRST_AID_TEXT.deliverHint : FIRST_AID_TEXT.outdoorHint;
    } else if (this.world.interior?.id === MASTER.buildingId) {
      hint = FIRST_AID_TEXT.interiorHint;
    }
    return {
      stage: this.stage,
      inventory: received ? [{ ...AID_KIT }] : [],
      objective: received ? FIRST_AID_TEXT.deliverObjective : FIRST_AID_TEXT.meetObjective,
      hint,
      targetBuildingId: received ? CLINIC_ID : MASTER.buildingId,
      dialogue: this.dialogue,
    };
  }

  get interaction(): TownInteraction | null {
    if (this.world.interior?.id === MASTER.buildingId
      && Math.hypot(this.world.position.x - MASTER.x, this.world.position.z - MASTER.z) <= MASTER.interactionRadius) {
      return { kind: 'master', label: this.stage === 'meet-master' ? FIRST_AID_TEXT.talkAction : FIRST_AID_TEXT.remindAction };
    }
    if (this.world.canExit) return { kind: 'exit', label: 'Выйти на улицу' };
    const building = this.world.nearbyBuilding;
    return building ? { kind: 'enter', label: `Войти · ${building.name}` } : null;
  }

  /** Both the keyboard and the HUD button use this same location-checked action. */
  interact(): boolean {
    const target = this.interaction;
    if (!target) return false;
    if (target.kind !== 'master') return this.world.interact();
    if (this.stage === 'meet-master') {
      // Inventory is derived from the stage, so repeat actions cannot issue another kit.
      this.stage = 'deliver-aid';
      this.dialogue = FIRST_AID_TEXT.received;
    } else {
      this.dialogue = FIRST_AID_TEXT.reminder;
    }
    this.notify();
    return true;
  }

  subscribe(listener: (snapshot: FirstAidSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.unsubscribeWorld();
    this.listeners.clear();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
