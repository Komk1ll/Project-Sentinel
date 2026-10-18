/**
 * Campaign E2E Test Driver
 * High-level opaque-box driver unifying all campaign subsystems.
 */

import type { InventorySlot, Vector2D, SaveData } from '@/types';
import {
  ReferenceQuestEngine,
  ReferenceKeypadPuzzle,
  ReferenceSwitchboardPuzzle,
  ReferenceDebuggerSystem,
  ReferenceCCTVSystem,
  ReferenceJammerSystem,
  ReferenceDialogueEngine,
  ReferenceDioramaManager,
} from './CampaignReferenceEngine';
import type {
  IQuestEngine,
  IKeypadPuzzle,
  ISwitchboardPuzzle,
  IDebuggerSystem,
  ICCTVSystem,
  IJammerSystem,
  IDialogueEngine,
  IDioramaManager,
  CyberShieldWorldFlags,
  CyberShieldCampaignSave,
  GroundItemDrop,
} from './contracts';

export class CampaignDriver {
  public quest: IQuestEngine;
  public keypad: IKeypadPuzzle;
  public switchboard: ISwitchboardPuzzle;
  public debugger: IDebuggerSystem;
  public cctv: ICCTVSystem;
  public jammer: IJammerSystem;
  public dialogue: IDialogueEngine;
  public diorama: IDioramaManager;

  private inventory: Map<string, number> = new Map();
  private maxInventorySlots: number = 16;
  public groundDrops: GroundItemDrop[] = [];
  public playerPosition: Vector2D = { x: 0, y: 0 };
  public currentAct: 1 | 2 | 3 | 4 = 1;

  constructor() {
    this.quest = new ReferenceQuestEngine();
    this.keypad = new ReferenceKeypadPuzzle();
    this.switchboard = new ReferenceSwitchboardPuzzle((itemId) => this.hasItem(itemId));
    this.debugger = new ReferenceDebuggerSystem();
    this.cctv = new ReferenceCCTVSystem();
    this.jammer = new ReferenceJammerSystem();
    this.dialogue = new ReferenceDialogueEngine();
    this.diorama = new ReferenceDioramaManager();
  }

  // --- Inventory API ---
  public addItem(itemId: string, count: number = 1): boolean {
    if (this.inventory.size >= this.maxInventorySlots && !this.inventory.has(itemId)) {
      return false; // Inventory full
    }
    const current = this.inventory.get(itemId) || 0;
    this.inventory.set(itemId, current + count);
    return true;
  }

  public removeItem(itemId: string, count: number = 1): boolean {
    const current = this.inventory.get(itemId) || 0;
    if (current < count) return false;
    if (current === count) {
      this.inventory.delete(itemId);
    } else {
      this.inventory.set(itemId, current - count);
    }
    return true;
  }

  public hasItem(itemId: string, count: number = 1): boolean {
    return (this.inventory.get(itemId) || 0) >= count;
  }

  public getItemCount(itemId: string): number {
    return this.inventory.get(itemId) || 0;
  }

  public getInventory(): InventorySlot[] {
    const slots: InventorySlot[] = [];
    for (const [itemId, count] of this.inventory.entries()) {
      slots.push({ itemId, count });
    }
    return slots;
  }

  public setMaxInventorySlots(slots: number) {
    this.maxInventorySlots = slots;
  }

  // --- Ground Drops API ---
  public spawnGroundDrop(itemId: string, position: Vector2D): GroundItemDrop {
    const drop: GroundItemDrop = {
      id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId,
      position,
      zone: this.diorama.getActiveZone(),
    };
    this.groundDrops.push(drop);
    return drop;
  }

  public collectGroundDrop(dropId: string): boolean {
    const index = this.groundDrops.findIndex((d) => d.id === dropId);
    if (index === -1) return false;
    const drop = this.groundDrops[index];
    if (!drop) return false;
    const added = this.addItem(drop.itemId, 1);
    if (added) {
      this.groundDrops.splice(index, 1);
      return true;
    }
    return false;
  }

  // --- World Flags API ---
  public getWorldFlags(): CyberShieldWorldFlags {
    if ('worldFlags' in this.quest) {
      return (this.quest as ReferenceQuestEngine).worldFlags;
    }
    if ('getWorldFlags' in this.quest && typeof (this.quest as unknown as { getWorldFlags: () => unknown }).getWorldFlags === 'function') {
      return (this.quest as unknown as { getWorldFlags: () => CyberShieldWorldFlags }).getWorldFlags();
    }
    return {} as CyberShieldWorldFlags;
  }

  public setWorldFlag(flag: keyof CyberShieldWorldFlags, value: boolean | string): void {
    const flags = this.getWorldFlags();
    flags[flag] = value as never;
  }

  public advanceToQuest(targetQuestId: string): void {
    if ('forceCompleteQuest' in this.quest) {
      const ref = this.quest as ReferenceQuestEngine;
      const order = [
        'quest_01_gate_barrier',
        'quest_02_deans_password',
        'quest_03_blocker_disassembly',
        'quest_04_lab_darkness',
        'quest_05_server_deadend',
        'quest_06_cctv_clue',
        'quest_07_winter_garden_dog',
        'quest_08_lab_power_restore',
        'quest_09_subway_tunnel',
        'quest_10_rogue_access_point',
        'quest_11_grand_doors_open',
        'quest_12_datacenter_heart',
        'quest_13_protocol_init',
      ];
      for (const q of order) {
        if (q === targetQuestId) {
          ref.startQuest(q);
          break;
        }
        ref.forceCompleteQuest(q);
      }
    }
  }

  // --- Save / Load API ---
  public createSaveData(): CyberShieldCampaignSave {
    const questStates: Record<string, 'inactive' | 'active' | 'completed'> = {};
    for (const [k, v] of Object.entries(this.quest.getState())) {
      if (v.status === 'completed') questStates[k] = 'completed';
      else if (v.status === 'active') questStates[k] = 'active';
      else questStates[k] = 'inactive';
    }

    return {
      schemaVersion: 1,
      buildId: 'v1.0.0-cybershield',
      timestamp: Date.now(),
      playerScene: this.diorama.getActiveZone(),
      position: { ...this.playerPosition },
      stamina: 100,
      toolCharge: 100,
      inventory: this.getInventory(),
      storage: [],
      collectedIds: [],
      containerStates: {},
      doorStates: {
        deans_office_door: this.keypad.isUnlocked(),
        server_vault_door: Boolean(this.getWorldFlags().FLAG_DATACENTER_ACCESSED),
        grand_lobby_doors: this.jammer.isDisabled(),
      },
      questStates,
      worldFlags: { ...this.getWorldFlags() },
      robotStates: [],
      settings: {
        soundVolume: 1.0,
        musicVolume: 0.8,
        language: 'ru',
      },
      groundDrops: JSON.parse(JSON.stringify(this.groundDrops)),
      currentAct: this.currentAct,
    };
  }

  public loadSaveData(save: CyberShieldCampaignSave | SaveData): boolean {
    if (save.schemaVersion !== 1) return false;

    this.playerPosition = { ...save.position };
    this.currentAct = (save as Partial<CyberShieldCampaignSave>).currentAct || 1;
    this.inventory.clear();
    for (const slot of save.inventory) {
      this.inventory.set(slot.itemId, slot.count);
    }
    this.groundDrops = JSON.parse(JSON.stringify((save as Partial<CyberShieldCampaignSave>).groundDrops || []));

    // Restore World Flags
    const flags = this.getWorldFlags();
    for (const [k, v] of Object.entries(save.worldFlags)) {
      flags[k] = v as never;
    }

    // Restore Quests
    const qStates: Record<string, any> = {};
    for (const [k, v] of Object.entries(save.questStates)) {
      qStates[k] = {
        id: k,
        status: v === 'completed' ? 'completed' : v === 'active' ? 'active' : 'locked',
        currentObjectiveIndex: 0,
        completedObjectives: [],
      };
    }
    this.quest.loadState(qStates);

    // Restore Zone & Lighting
    this.diorama.loadZone(save.playerScene as any);
    if (flags.FLAG_POWER_RESTORED) {
      this.diorama.setLightingState('warm_restored');
    }

    return true;
  }
}

export function createCampaignDriver(): CampaignDriver {
  return new CampaignDriver();
}
