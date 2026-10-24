import { TownLife } from '@game/systems/town-life';
import { AID_KIT, CLINIC_ID, FIRST_AID_TEXT, MASTER, MEDIC } from '@content/first-aid';
import type { TownWorld } from '@game/systems/town-world';

export type FirstAidStage = 'meet-master' | 'deliver-aid' | 'completed';
export function isFirstAidStage(value: unknown): value is FirstAidStage {
  return value === 'meet-master' || value === 'deliver-aid' || value === 'completed';
}

export interface FirstAidSnapshot {
  readonly stage: FirstAidStage;
  readonly inventory: readonly (typeof AID_KIT)[];
  readonly objective: string;
  readonly hint: string;
  readonly targetBuildingId: string | null;
  readonly dialogue: string | null;
  readonly clinicSupplied: boolean;
}
export interface TownInteraction {
  readonly kind: 'master' | 'medic' | 'enter' | 'exit' | 'ambient';
  readonly label: string;
}

/** One authoritative stage drives inventory, completion and the visible clinic result. */
export class FirstAidMission {
  readonly life: TownLife;
  private stage: FirstAidStage = 'meet-master';
  private dialogue: string | null = null;
  private readonly listeners = new Set<(snapshot: FirstAidSnapshot) => void>();
  private readonly unsubscribeWorld: () => void;

  constructor(public readonly world: TownWorld) {
    this.life=new TownLife(world);
    this.unsubscribeWorld = world.subscribe(() => this.notify());
  }

  get snapshot(): FirstAidSnapshot {
    const carrying = this.stage === 'deliver-aid';
    const completed = this.stage === 'completed';
    let hint: string = FIRST_AID_TEXT.meetHint;
    if (completed) hint = FIRST_AID_TEXT.completedHint;
    else if (carrying) hint = this.world.interior?.id === CLINIC_ID ? FIRST_AID_TEXT.clinicHint
      : this.world.interior ? FIRST_AID_TEXT.deliverHint : FIRST_AID_TEXT.outdoorHint;
    else if (this.world.interior?.id === MASTER.buildingId) hint = FIRST_AID_TEXT.interiorHint;
    return {
      stage: this.stage,
      inventory: carrying ? [{ ...AID_KIT }] : [],
      objective: completed ? FIRST_AID_TEXT.completedObjective : carrying ? FIRST_AID_TEXT.deliverObjective : FIRST_AID_TEXT.meetObjective,
      hint,
      targetBuildingId: completed ? null : carrying ? CLINIC_ID : MASTER.buildingId,
      dialogue: this.dialogue,
      clinicSupplied: completed,
    };
  }

  get interaction(): TownInteraction | null {
    for (const actor of [MASTER, MEDIC]) {
      if (this.world.interior?.id !== actor.buildingId
        || Math.hypot(this.world.position.x - actor.x, this.world.position.z - actor.z) > actor.interactionRadius) continue;
      if (actor.id === MASTER.id) return { kind: 'master', label: this.stage === 'meet-master' ? FIRST_AID_TEXT.talkAction : 'Мастер · поговорить' };
      return { kind: 'medic', label: this.stage === 'deliver-aid' ? 'Медработник · передать набор' : 'Медработник · поговорить' };
    }
    if (this.world.canExit) return { kind: 'exit', label: 'Выйти на улицу' };
    const building = this.world.nearbyBuilding;
    if(building)return {kind:'enter',label:`Войти · ${building.name}`};
    const ambient=this.life.interaction;
    return ambient?{kind:'ambient',label:ambient.label}:null;
  }

  interact(): boolean {
    const target = this.interaction;
    if (!target) return false;
    if(target.kind==='ambient')return this.life.interact();
    if (target.kind === 'enter' || target.kind === 'exit') return this.world.interact();
    if (target.kind === 'master') {
      if (this.stage === 'meet-master') {
        this.stage = 'deliver-aid';
        this.dialogue = FIRST_AID_TEXT.received;
      } else this.dialogue = this.stage === 'completed' ? FIRST_AID_TEXT.masterThanks : FIRST_AID_TEXT.reminder;
    } else if (this.stage === 'deliver-aid') {
      // Removing the item, completing the task and supplying the clinic are one transition.
      this.stage = 'completed';
      this.dialogue = FIRST_AID_TEXT.delivered;
    } else this.dialogue = this.stage === 'completed' ? FIRST_AID_TEXT.medicThanks : FIRST_AID_TEXT.needKit;
    this.notify();
    return true;
  }

  restore(stage: FirstAidStage): void {
    this.stage = stage;
    this.dialogue = stage === 'completed' ? FIRST_AID_TEXT.delivered : null;
    this.notify();
  }

  subscribe(listener: (snapshot: FirstAidSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  destroy(): void { this.life.destroy();this.unsubscribeWorld(); this.listeners.clear(); }
  private notify(): void { for (const listener of this.listeners) listener(this.snapshot); }
}
