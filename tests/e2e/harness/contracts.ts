/**
 * E2E Test Contracts & Canonical Campaign Types
 * Authoritative types based on PROJECT.md, Документ.pdf, and spec_miner report.
 */

import type { Vector2D, QuestRecord, SaveData } from '@/types';

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';

export interface QuestState {
  id: string;
  status: QuestStatus;
  currentObjectiveIndex: number;
  completedObjectives: string[];
}

export interface IQuestEngine {
  getActiveQuest(): QuestRecord | null;
  startQuest(questId: string): boolean;
  completeObjective(questId: string, objectiveId: string): boolean;
  completeQuest(questId: string): boolean;
  isQuestCompleted(questId: string): boolean;
  selectEnding(choice: 'A' | 'B' | 'C'): 'quest_14_finale_ideal' | 'quest_15_finale_pragmatic';
  getState(): Record<string, QuestState>;
  loadState(state: Record<string, QuestState>): void;
}

export type DialogueSpeaker = 'alexey' | 'curator' | 'professor' | 'console' | 'system';

export interface DialogueNode {
  id: string;
  speaker: DialogueSpeaker;
  textRu: string;
  textEn: string;
  next?: string;
  options?: Array<{
    labelRu: string;
    labelEn: string;
    nextNodeId: string;
    onSelect?: () => void;
  }>;
}

export interface IDialogueEngine {
  startDialogue(dialogueTreeId: string, onComplete?: () => void): void;
  advance(): DialogueNode | null;
  selectOption(optionIndex: number): DialogueNode | null;
  getCurrentNode(): DialogueNode | null;
  isActive(): boolean;
}

export interface IKeypadPuzzle {
  inputDigit(digit: number): { buffer: string; success?: boolean; error?: boolean };
  clear(): void;
  isUnlocked(): boolean;
}

export interface ISwitchboardPuzzle {
  isolateLine(): { success: boolean; message: string };
  insertFuse(fuseItemId: string): { success: boolean; message: string };
  rebootGrid(): { success: boolean; powerRestored: boolean; message: string };
  getState(): { lineIsolated: boolean; fuseInserted: boolean; gridRebooted: boolean; isComplete: boolean };
}

export interface IDebuggerSystem {
  aimAt(targetEntityId: string): boolean;
  firePulse(): { hit: boolean; targetId?: string; disassembledModules?: string[]; error?: string };
  registerTarget(id: string, type: 'robot' | 'npc' | 'prop', inRange?: boolean): void;
}

export interface ICCTVSystem {
  powerTerminal(batteryConnected: boolean): boolean;
  rewind(minutes: number): { success: boolean; footageId?: string; clueLocation?: string; error?: string };
  isPowered(): boolean;
  isComplete(): boolean;
}

export interface IJammerSystem {
  approach(distance: number): { status: 'safe' | 'hud_distortion' | 'barrier_repulsion'; message?: string };
  disableWithPulse(equippedToolId: string, chargeTimeMs: number): { success: boolean; doorsUnlocked: boolean; error?: string };
  isDisabled(): boolean;
}

export type DioramaZoneId =
  | 'zone_01_gate'
  | 'zone_02_deans_basement'
  | 'zone_03_courtyard_alley'
  | 'zone_04_lab_corridor'
  | 'zone_05_security_room'
  | 'zone_06_winter_garden'
  | 'zone_07_cable_tunnel'
  | 'zone_08_grand_lobby'
  | 'zone_09_datacenter'
  | 'zone_10_finale_celebration'
  | 'zone_11_finale_cleanup';

export type LightingState = 'dark_emergency' | 'warm_restored' | 'twilight' | 'sunny_day';

export interface IDioramaManager {
  loadZone(zoneId: DioramaZoneId): Promise<void>;
  getActiveZone(): DioramaZoneId;
  setLightingState(state: LightingState): void;
  getLightingState(): LightingState;
}

export interface CyberShieldWorldFlags {
  FLAG_GATE_BYPASSED: boolean;
  FLAG_DEANS_DOOR_UNLOCKED: boolean;
  FLAG_FIRST_BLOCKER_DISASSEMBLED: boolean;
  FLAG_PROFESSOR_CONTACTED: boolean;
  FLAG_SERVER_DOOR_INSPECTED: boolean;
  FLAG_CCTV_REVIEWED: boolean;
  FLAG_KEYS_RECOVERED: boolean;
  FLAG_POWER_RESTORED: boolean;
  FLAG_TUNNEL_TRAVERSED: boolean;
  FLAG_JAMMER_DISABLED: boolean;
  FLAG_LOBBY_ENTERED: boolean;
  FLAG_DATACENTER_ACCESSED: boolean;
  FLAG_PROTOCOL_INITIALIZED: boolean;
  FLAG_CAMPAIGN_COMPLETE_ENDING_A?: boolean;
  FLAG_CAMPAIGN_COMPLETE_ENDING_B?: boolean;
  CAMPAIGN_ENDING?: 'FINAL_A' | 'FINAL_B';
  [key: string]: boolean | string | undefined;
}

export interface GroundItemDrop {
  id: string;
  itemId: string;
  position: Vector2D;
  zone: DioramaZoneId;
}

export interface CyberShieldCampaignSave extends SaveData {
  worldFlags: CyberShieldWorldFlags;
  groundDrops: GroundItemDrop[];
  currentAct: 1 | 2 | 3 | 4;
}
