import { ARCHIVE_ENTRIES, START_CAMPAIGN, STORY_TITLES, campaignTarget, nearbyCampaignTarget, campaignPanel, networkRestored,
  type CampaignPanel, type CampaignProgress } from '@game/systems/campaign';
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
  readonly kind: 'master' | 'medic' | 'enter' | 'exit' | 'ambient' | 'boat' | 'car' | 'lamp' | 'stairs' | 'story';
  readonly label: string;
}

/** One authoritative stage drives inventory, completion and the visible clinic result. */
export class FirstAidMission {
  readonly life: TownLife;
  private stage: FirstAidStage = 'meet-master';
  private campaign: CampaignProgress = START_CAMPAIGN;
  private panel: CampaignPanel | null = null;
  private sound = true;
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
    if (this.panel) return null;
    for (const actor of [MASTER, MEDIC]) {
      if (this.world.interiorFloor > 0 || this.world.interior?.id !== actor.buildingId
        || Math.hypot(this.world.position.x - actor.x, this.world.position.z - actor.z) > actor.interactionRadius) continue;
      if (actor.id === MASTER.id) return { kind: 'master', label: this.stage === 'meet-master' ? FIRST_AID_TEXT.talkAction : 'Мастер · поговорить' };
      return { kind: 'medic', label: this.stage === 'deliver-aid' ? 'Медработник · передать набор' : 'Медработник · поговорить' };
    }
    const boatAction = this.world.boatAction;
    if (boatAction) return { kind: 'boat', label: boatAction === 'board' ? 'Сесть в лодку' : 'Пришвартоваться и выйти' };
    if (this.world.activeBoat !== null) return null;
    const carAction = this.world.carAction;
    if (carAction) return { kind: 'car', label: carAction === 'enter' ? 'Сесть за руль' : 'Выйти из машины' };
    if (this.world.activeCar !== null) return null;
    if (this.world.canExit) return { kind: 'exit', label: 'Выйти на улицу' };
    if (this.world.stairAction) return { kind: 'stairs', label: this.world.stairAction === 'up' ? 'Подняться на этаж' : 'Спуститься на этаж' };
    if (this.world.canToggleLamp)
      return { kind: 'lamp', label: this.world.homeLampOn ? 'Выключить настольную лампу' : 'Включить настольную лампу' };
    const story = this.stage === 'completed' ? nearbyCampaignTarget(this.campaign, this.world) : null;
    if (story) return { kind: 'story', label: story.label };
    const building = this.world.nearbyBuilding;
    if(building)return {kind:'enter',label:`Войти · ${building.name}`};
    const ambient=this.life.interaction;
    return ambient?{kind:'ambient',label:ambient.label}:null;
  }

  interact(): boolean {
    const target = this.interaction;
    if (!target) return false;
    if (target.kind === 'story') return this.openStory();
    if(target.kind==='ambient')return this.life.interact();
    if (target.kind === 'enter' || target.kind === 'exit' || target.kind === 'boat' || target.kind === 'car' || target.kind === 'lamp' || target.kind === 'stairs') return this.world.interact();
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

  restore(stage: FirstAidStage, campaign = START_CAMPAIGN): void {
    this.campaign = campaign;
    this.panel = null;
    this.stage = stage;
    this.dialogue = stage === 'completed' ? FIRST_AID_TEXT.delivered : null;
    this.notify();
  }

  get campaignProgress(): CampaignProgress { return this.campaign; }
  get storyPanel(): CampaignPanel | null { return this.panel; }
  get storyTarget() { return this.stage === 'completed' ? campaignTarget(this.campaign) : null; }
  get storyEpisode(): number {
    if (this.stage !== 'completed') return 0;
    if (this.campaign.repair < 3) return 1;
    if (!this.campaign.archived) return 2;
    return this.campaign.ending || networkRestored(this.campaign.network) ? 4 : 3;
  }
  get storyTitle(): string { return STORY_TITLES[this.storyEpisode]!; }

  private openStory(): boolean {
    const target = nearbyCampaignTarget(this.campaign, this.world);
    if (!target) return false;
    if (target.id === 'photo' || target.id === 'drawing') {
      const bit = target.id === 'photo' ? 1 : 2;
      this.campaign = { ...this.campaign, fragments: this.campaign.fragments | bit };
      this.dialogue = 'Фрагмент найден. ' + (this.campaign.fragments === 3
        ? 'Вернись к библиотекарю для резервного копирования.' : 'Найди второй фрагмент.');
    } else this.panel = campaignPanel(target.id, this.campaign);
    this.notify();
    return true;
  }

  toggleMenu(): void {
    if (this.panel) { this.closeStory(); return; }
    this.panel = this.menu();
    this.notify();
  }

  get soundEnabled(): boolean { return this.sound; }

  private menu(): CampaignPanel {
    const introduction = 'Алексей помогает Зареченску после сбоя городской сети. На старом снимке соседи открывают мастерскую «Маяк», где сегодня собирают наборы помощи.';
    const journal = STORY_TITLES.map((title, i) => (i + 1) + '. ' + title + ' — ' +
      (this.campaign.ending || i < this.storyEpisode ? 'пройден' : i === this.storyEpisode ? 'текущий' : 'впереди')).join('\n');
    return { target: 'menu', title: 'Пауза · журнал', text: introduction + '\n\n' + journal,
      actions: [{ id: 'resume', label: 'Продолжить игру' },
        { id: 'toggle-sound', label: this.sound ? 'Выключить звук' : 'Включить звук' }] };
  }

  closeStory(): void {
    if (!this.panel) return;
    this.panel = null;
    this.notify();
  }

  chooseStory(action: string): boolean {
    const panel = this.panel;
    if (!panel?.actions.some(item => item.id === action && !item.disabled)) return false;
    if (action === 'resume') { this.closeStory(); return true; }
    if (action === 'toggle-sound') {
      this.sound = !this.sound;
      this.panel = this.menu();
      this.notify();
      return true;
    }
    if (panel.target === 'menu') return false;
    if (action.startsWith('archive-read-')) {
      const entry = ARCHIVE_ENTRIES[Number(action.slice(13))]!;
      this.panel = { ...panel, title: entry.title, text: entry.text };
      this.notify();
      return true;
    }
    const p = this.campaign;
    let note = '';
    if (action === 'repair-wrong') note = 'Этот шаг не устраняет сбой. Проверь подсказку: ' + panel.actions[0]!.label.toLowerCase() + '.';
    else if (action === 'repair-right') {
      this.campaign = { ...p, repair: p.repair + 1 };
      if (this.campaign.repair === 3) {
        this.dialogue = 'Доставщик снова работает. Пока он везёт ящик в поликлинику, загляни в библиотеку.';
        this.closeStory();
        return true;
      }
    } else if (action === 'archive-start' || action === 'archive-save') {
      const archived = action === 'archive-save';
      this.campaign = { ...p, archiveStarted: true, archived, network: archived ? 8 : 0 };
      this.dialogue = archived ? 'Резерв готов. Сеть можно проверить в администрации, а решение обсудить в парке.'
        : 'Найди фотографию и рисунок в библиотеке. Их позиции отмечены на мини-карте.';
      this.closeStory();
      return true;
    } else if (action.startsWith('edge-')) {
      const index = Number(action.slice(5));
      this.campaign = { ...p, network: (p.network & 15) ^ (1 << index) };
    } else if (action === 'network-hint') {
      note = 'Три службы подключаются к рабочему источнику. Отключи четвёртую связь: она ведёт к неисправному узлу.';
    } else if (action === 'network-check') {
      if (p.network === 7 || networkRestored(p.network)) {
        this.campaign = { ...p, network: 23 };
        this.dialogue = 'Проверка пройдена. В парке можно решить, как запустить службы.';
        this.closeStory();
        return true;
      }
      note = 'Схема пока не готова: проверь питание трёх служб и изоляцию неисправного узла.';
    } else if (action === 'finish-network' || action === 'finish-volunteers') {
      this.campaign = { ...p, ending: action === 'finish-network' ? 'network' : 'volunteers' };
    }
    this.panel = campaignPanel(panel.target, this.campaign, note);
    this.notify();
    return true;
  }

  subscribe(listener: (snapshot: FirstAidSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  destroy(): void { this.life.destroy();this.unsubscribeWorld(); this.listeners.clear(); }
  private notify(): void { for (const listener of this.listeners) listener(this.snapshot); }
}
