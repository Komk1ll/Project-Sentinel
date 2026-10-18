/**
 * Project Sentinel - CyberShield Campaign Type Definitions
 * Covers QuestState, CampaignQuestRecord, DialogueSystem interfaces,
 * world flags, and diorama persistence contracts.
 */

import type { InventorySlot, QuestObjective, QuestRecord, Vector2D } from './index';

// ==========================================
// Quest System Types & Contracts
// ==========================================

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed' | 'inactive';

export type EndingChoice = 'A' | 'B' | 'C';
export type CampaignEndingBranch = 'quest_14_finale_ideal' | 'quest_15_finale_pragmatic';

export interface CampaignQuestObjective extends QuestObjective {
  readonly descriptionRu?: string;
  readonly descriptionEn?: string;
  readonly optional?: boolean;
  readonly targetEntityId?: string;
  readonly targetCount?: number;
  readonly currentCount?: number;
}

export interface CampaignQuestRecord extends QuestRecord {
  readonly act: 1 | 2 | 3 | 4;
  readonly titleRu: string;
  readonly titleEn?: string;
  readonly descriptionEn: string;
  readonly descriptionRu: string;
  readonly locationZoneId: string;
  readonly autoActivate?: boolean;
  readonly branchCondition?: {
    readonly parentQuestId: string;
    readonly allowedChoices: readonly EndingChoice[];
  };
  readonly requiredFlags?: readonly string[];
  readonly dialogueTreeId?: string;
  readonly targetZoneId?: string;
  readonly branchType?: 'linear' | 'branch_choice' | 'epilogue_branch';
  readonly nextQuestId?: string | { readonly optionA: string; readonly optionB: string; readonly optionC: string };
  readonly objectives: readonly CampaignQuestObjective[];
}

export interface QuestState {
  id: string;
  status: QuestStatus;
  currentObjectiveIndex: number;
  completedObjectives: string[];
  startedAt?: number;
  completedAt?: number;
}

export interface QuestSystemEvents {
  questAvailable: (quest: CampaignQuestRecord) => void;
  questStarted: (quest: CampaignQuestRecord) => void;
  objectiveCompleted: (payload: { quest: CampaignQuestRecord; objective: CampaignQuestObjective; index: number }) => void;
  questCompleted: (payload: { quest: CampaignQuestRecord; rewards: readonly InventorySlot[] }) => void;
  questFailed: (quest: CampaignQuestRecord) => void;
  branchSelected: (payload: { choice: EndingChoice; targetQuestId: string }) => void;
}

export interface IQuestEngine {
  getActiveQuest(): CampaignQuestRecord | QuestRecord | null;
  startQuest(questId: string): boolean;
  completeObjective(questId: string, objectiveId: string): boolean;
  completeQuest(questId: string): boolean;
  isQuestCompleted(questId: string): boolean;
  selectEnding(choice: EndingChoice): CampaignEndingBranch;
  getState(): Record<string, QuestState>;
  loadState(state: Record<string, QuestState>, flags?: Record<string, boolean | string | undefined>): void;
}

// ==========================================
// Dialogue System Types & Contracts
// ==========================================

export type DialogueSpeaker = 'alexey' | 'curator' | 'professor' | 'console' | 'system';
export type DialogueLanguage = 'ru' | 'en';
export type DialogueAdvanceMode = 'interactive' | 'auto_advance';

export interface SpeakerMetadata {
  readonly id: DialogueSpeaker;
  readonly nameRu: string;
  readonly nameEn: string;
  readonly titleRu: string;
  readonly titleEn: string;
  readonly avatar: string;
  readonly theme: 'standard' | 'radio' | 'terminal' | 'system';
  readonly soundCue?: string;
}

export interface DialogueOption {
  readonly id: string;
  readonly labelRu: string;
  readonly labelEn: string;
  readonly nextNodeId: string;
  readonly actionFlag?: string;
  readonly endingChoice?: 'FINAL_A' | 'FINAL_B';
  readonly onSelectEvent?: string;
  readonly onSelect?: () => void;
}

export interface DialogueEventTrigger {
  readonly event: string;
  readonly payload?: unknown;
}

export interface DialogueNode {
  readonly id: string;
  readonly speaker: DialogueSpeaker;
  readonly textRu: string;
  readonly textEn: string;
  readonly mode?: DialogueAdvanceMode;
  readonly autoAdvanceDelayMs?: number;
  readonly audioCue?: string;
  readonly isRadio?: boolean;
  readonly next?: string | null;
  readonly options?: readonly DialogueOption[];
  readonly events?: readonly DialogueEventTrigger[];
}

export interface DialogueTree {
  readonly id: string;
  readonly questId?: string;
  readonly act?: number;
  readonly isRadio?: boolean;
  readonly priority?: number;
  readonly initialNodeId: string;
  readonly onCompleteFlag?: string;
  readonly onCompleteEvent?: string;
  readonly nodes: Record<string, DialogueNode>;
}

export interface DialogueDatabase {
  readonly speakers: Record<string, SpeakerMetadata>;
  readonly trees: Record<string, DialogueTree>;
}

export interface LocalizedOption {
  readonly index: number;
  readonly id: string;
  readonly label: string;
  readonly nextNodeId: string;
}

export interface DialogueStateSnapshot {
  readonly active: boolean;
  readonly treeId: string | null;
  readonly currentNodeId: string | null;
  readonly speaker: DialogueSpeaker | null;
  readonly speakerName: string;
  readonly speakerTitle: string;
  readonly text: string;
  readonly language: DialogueLanguage;
  readonly isRadio: boolean;
  readonly isBranching: boolean;
  readonly options: readonly LocalizedOption[];
  readonly queuedRadioCount: number;
}

export type DialogueEventListener = (event: string, payload?: unknown) => void;
export type DialogueStateListener = (snapshot: DialogueStateSnapshot) => void;

export interface IDialogueEngine {
  setLanguage(lang: DialogueLanguage): void;
  getLanguage(): DialogueLanguage;
  loadDatabase(data: DialogueDatabase): void;
  startDialogue(dialogueTreeId: string, onComplete?: () => void): boolean;
  enqueueRadio(dialogueTreeId: string, onComplete?: () => void): boolean;
  advance(): DialogueNode | null;
  selectOption(optionIndex: number): DialogueNode | null;
  getCurrentNode(): DialogueNode | null;
  getCurrentSpeaker(): SpeakerMetadata | null;
  isActive(): boolean;
  isRadioActive(): boolean;
  isBranching(): boolean;
  getQueuedRadioCount(): number;
  stopDialogue(): void;
  getStateSnapshot(): DialogueStateSnapshot;
  onEvent(listener: DialogueEventListener): () => void;
  onStateChange(listener: DialogueStateListener): () => void;
}

// ==========================================
// Campaign World Flags & Dioramas
// ==========================================

export const CAMPAIGN_WORLD_FLAGS = {
  // Act I
  FLAG_GATE_BYPASSED: 'FLAG_GATE_BYPASSED',
  FLAG_DEANS_DOOR_UNLOCKED: 'FLAG_DEANS_DOOR_UNLOCKED',
  FLAG_FIRST_BLOCKER_DISASSEMBLED: 'FLAG_FIRST_BLOCKER_DISASSEMBLED',
  FLAG_PROFESSOR_CONTACTED: 'FLAG_PROFESSOR_CONTACTED',

  // Act II
  FLAG_SERVER_DOOR_INSPECTED: 'FLAG_SERVER_DOOR_INSPECTED',
  FLAG_CCTV_REVIEWED: 'FLAG_CCTV_REVIEWED',
  FLAG_KEYS_RECOVERED: 'FLAG_KEYS_RECOVERED',
  FLAG_POWER_RESTORED: 'FLAG_POWER_RESTORED',

  // Act III
  FLAG_TUNNEL_TRAVERSED: 'FLAG_TUNNEL_TRAVERSED',
  FLAG_JAMMER_DISABLED: 'FLAG_JAMMER_DISABLED',
  FLAG_LOBBY_ENTERED: 'FLAG_LOBBY_ENTERED',
  FLAG_DATACENTER_ACCESSED: 'FLAG_DATACENTER_ACCESSED',

  // Act IV
  FLAG_PROTOCOL_INITIALIZED: 'FLAG_PROTOCOL_INITIALIZED',
  FLAG_CAMPAIGN_COMPLETE_ENDING_A: 'FLAG_CAMPAIGN_COMPLETE_ENDING_A',
  FLAG_CAMPAIGN_COMPLETE_ENDING_B: 'FLAG_CAMPAIGN_COMPLETE_ENDING_B',

  // Sub-puzzle state flags
  FLAG_IMPULSE_DEBUGGER_ACQUIRED: 'FLAG_IMPULSE_DEBUGGER_ACQUIRED',
  FLAG_SWITCHBOARD_ISOLATED: 'FLAG_SWITCHBOARD_ISOLATED',
  FLAG_SWITCHBOARD_FUSE_REPLACED: 'FLAG_SWITCHBOARD_FUSE_REPLACED',
  FLAG_SWITCHBOARD_GRID_REBOOTED: 'FLAG_SWITCHBOARD_GRID_REBOOTED',
  FLAG_PROTOCOL_A: 'FLAG_PROTOCOL_A',
  FLAG_PROTOCOL_B: 'FLAG_PROTOCOL_B',
  FLAG_PROTOCOL_C: 'FLAG_PROTOCOL_C',
  FLAG_SENTINEL_RESTORED: 'FLAG_SENTINEL_RESTORED',
} as const;

export type CampaignWorldFlag = keyof typeof CAMPAIGN_WORLD_FLAGS;
export type CampaignEndingChoice = 'FINAL_A' | 'FINAL_B';

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

export interface DioramaSaveState {
  readonly currentZoneId: DioramaZoneId | string;
  readonly lightingState: LightingState | string;
  readonly interactedPropIds?: readonly string[];
  readonly playerCoordinates?: Vector2D;
  readonly isPowerRestored?: boolean;
  readonly clearedEntityIds?: readonly string[];
}

export interface ZoneEntityDescriptor {
  readonly id: string;
  readonly modelUrl: string;
  readonly type: 'robot' | 'npc' | 'prop' | 'interactive';
  readonly position: Vector2D;
  readonly elevation?: number;
  readonly facing?: string;
  readonly defaultAnimation?: string;
  readonly fps?: number;
  readonly stepped?: boolean;
  readonly scale?: number;
  readonly interactive?: boolean;
  readonly interactionId?: string;
  readonly blockedTiles?: readonly Vector2D[];
}

export interface ZonePortalDescriptor {
  readonly id: string;
  readonly targetZoneId: DioramaZoneId;
  readonly triggerBounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
  readonly targetSpawn: Vector2D;
  readonly requiredFlag?: string;
}

export interface ZoneDescriptor {
  readonly id: DioramaZoneId;
  readonly act?: 1 | 2 | 3 | 4;
  readonly panelNumber?: number;
  readonly titleRu: string;
  readonly titleEn: string;
  readonly width: number;
  readonly height: number;
  readonly dimensions?: { readonly width: number; readonly height: number };
  readonly defaultLighting: LightingState;
  readonly lightingConfigs?: Record<string, unknown>;
  readonly playerSpawn: Vector2D & {
    readonly elevation?: number;
    readonly facing?: string;
    readonly position?: Vector2D;
  };
  readonly walkabilityBounds?: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
  readonly blockedTiles?: readonly Vector2D[];
  readonly entities: readonly ZoneEntityDescriptor[];
  readonly portals?: readonly ZonePortalDescriptor[];
  readonly tileTextureKey?: string;
}

export interface IDioramaManager {
  loadZone(zoneId: DioramaZoneId): Promise<void>;
  getActiveZone(): DioramaZoneId;
  setLightingState(state: LightingState): void;
  getLightingState(): LightingState;
  getZoneDescriptor?(zoneId: DioramaZoneId): ZoneDescriptor;
  getActiveZoneDescriptor?(): ZoneDescriptor;
  getAllZoneDescriptors?(): Record<DioramaZoneId, ZoneDescriptor>;
  isWalkable?(gridX: number, gridY: number): boolean;
  notifyPowerRestored?(): void;
  saveState?(): DioramaSaveState;
  loadState?(state: Partial<DioramaSaveState>): void;
  onZoneChange?(callback: (zoneId: DioramaZoneId, descriptor: ZoneDescriptor) => void): () => void;
  onLightingChange?(callback: (state: LightingState) => void): () => void;
}


// ==========================================
// Puzzle & Interaction Systems Contracts
// ==========================================

// --- Impulse Debugger & Modular Disassembly Contracts ---

export type TargetEntityType = 'robot' | 'npc' | 'prop';

export interface TargetEntity {
  readonly id: string;
  readonly type: TargetEntityType;
  inRange?: boolean;
  position?: Vector2D;
  deactivated?: boolean;
  hasLineOfSight?: boolean;
  disassembledModules?: readonly string[];
}

export interface PulseResult {
  readonly hit: boolean;
  readonly targetId?: string;
  readonly disassembledModules?: readonly string[];
  readonly error?: string;
}

export interface IDebuggerSystem {
  aimAt(targetEntityId: string): boolean;
  firePulse(): PulseResult;
  registerTarget(id: string, type: TargetEntityType, inRange?: boolean, options?: Partial<TargetEntity>): void;
}

export interface GroundItemDrop {
  readonly id: string;
  readonly itemId: string;
  readonly position: Vector2D;
  readonly zone: DioramaZoneId;
}

export interface ImpulseDebuggerSystemConfig {
  readonly effectiveRange?: number;
  readonly playerPosition?: Vector2D;
  readonly activeZone?: DioramaZoneId;
  readonly losChecker?: (from: Vector2D, to: Vector2D) => boolean;
}

// --- Keypad Passcode Puzzle Contracts ---

export interface KeypadInputResult {
  readonly buffer: string;
  readonly success?: boolean;
  readonly error?: boolean;
}

export interface IKeypadPuzzle {
  inputDigit(digit: number): KeypadInputResult;
  clear(): void;
  isUnlocked(): boolean;
  getBuffer?(): string;
  reset?(): void;
  serialize?(): { buffer: string; unlocked: boolean };
  loadState?(state: { buffer?: string; unlocked?: boolean }): void;
}

export interface KeypadPuzzleConfig {
  readonly targetCode?: string;
  readonly maxDigits?: number;
  readonly initialUnlocked?: boolean;
  readonly onUnlock?: (code: string) => void;
  readonly onError?: (attemptedCode: string) => void;
  readonly onDigitInput?: (digit: number, buffer: string) => void;
  readonly onClear?: () => void;
}

// --- Switchboard Repair Puzzle Contracts ---

export interface SwitchboardState {
  readonly lineIsolated: boolean;
  readonly fuseInserted: boolean;
  readonly gridRebooted: boolean;
  readonly isComplete: boolean;
}

export interface SwitchboardStepResult {
  readonly success: boolean;
  readonly message: string;
}

export interface SwitchboardRebootResult {
  readonly success: boolean;
  readonly powerRestored: boolean;
  readonly message: string;
}

export interface ISwitchboardPuzzle {
  isolateLine(tapeItemId?: string): SwitchboardStepResult;
  insertFuse(fuseItemId: string): SwitchboardStepResult;
  rebootGrid(): SwitchboardRebootResult;
  getState(): SwitchboardState;
  reset?(): void;
  serialize?(): SwitchboardState;
  loadState?(state: Partial<SwitchboardState>): void;
}

export interface SwitchboardPuzzleConfig {
  readonly inventoryChecker?: (itemId: string) => boolean;
  readonly inventoryConsumer?: (itemId: string, count: number) => boolean;
  readonly requireTapeForIsolation?: boolean;
  readonly requiredFuseItemId?: string;
  readonly requiredTapeItemId?: string;
  readonly onPowerRestored?: () => void;
  readonly onLineIsolated?: () => void;
  readonly onFuseInserted?: (itemId: string) => void;
  readonly onCircuitBreakerTripped?: (reason: string) => void;
  readonly onResidualVoltageWarning?: () => void;
  readonly initialState?: Partial<SwitchboardState>;
}

// --- CCTV Playback Terminal Contracts ---

export interface CCTVPlaybackResult {
  readonly success: boolean;
  readonly footageId?: string;
  readonly clueLocation?: string;
  readonly error?: string;
}

export interface CCTVState {
  readonly powered: boolean;
  readonly completed: boolean;
  readonly lastScrubbedMinutes: number;
  readonly discoveredFootageId: string | null;
  readonly clueTargetZone: string | null;
}

export interface ICCTVSystem {
  powerTerminal(batteryConnected: boolean): boolean;
  rewind(minutes: number): CCTVPlaybackResult;
  isPowered(): boolean;
  isComplete(): boolean;
  getState?(): CCTVState;
  reset?(): void;
  serialize?(): CCTVState;
  loadState?(state: Partial<CCTVState>): void;
}

export interface CCTVSystemConfig {
  readonly initialPowered?: boolean;
  readonly minRewindMinutes?: number;
  readonly requiredFootageId?: string;
  readonly clueTargetZone?: string;
  readonly onPowerChanged?: (powered: boolean) => void;
  readonly onFootageDiscovered?: (result: CCTVPlaybackResult) => void;
}

// --- Rogue Signal Jammer Disruption Contracts ---

export type JammerApproachStatus = 'safe' | 'hud_distortion' | 'barrier_repulsion';

export interface JammerApproachResult {
  readonly status: JammerApproachStatus;
  readonly message?: string;
}

export interface JammerPulseResult {
  readonly success: boolean;
  readonly doorsUnlocked: boolean;
  readonly error?: string;
}

export interface JammerState {
  readonly disabled: boolean;
  readonly mastPosition?: Vector2D;
  readonly interferenceRadius: number;
  readonly repulsionRadius: number;
  readonly minChargeDurationMs: number;
}

export interface IJammerSystem {
  approach(distance: number): JammerApproachResult;
  disableWithPulse(equippedToolId: string, chargeTimeMs: number): JammerPulseResult;
  isDisabled(): boolean;
  getState?(): JammerState;
  reset?(): void;
  serialize?(): { disabled: boolean };
  loadState?(state: { disabled?: boolean }): void;
}

export interface JammerSystemConfig {
  readonly mastPosition?: Vector2D;
  readonly interferenceRadius?: number;
  readonly repulsionRadius?: number;
  readonly minChargeDurationMs?: number;
  readonly requiredToolId?: string;
  readonly onDisrupted?: () => void;
  readonly onRepulsionTriggered?: (distance: number) => void;
  readonly onDistortionTriggered?: (distance: number) => void;
}

// --- Server Recovery Protocol & Server Vault Door Contracts ---

export interface ServerVaultDoorResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface IServerVaultDoor {
  attemptUnlock(inventory: { hasItem(itemId: string, count?: number): boolean }): ServerVaultDoorResult;
  isUnlocked(): boolean;
  reset?(): void;
  serialize?(): { unlocked: boolean };
  loadState?(state: { unlocked?: boolean }): void;
}

export type ServerProtocolChoice = 'A' | 'B' | 'C';

export interface ServerProtocolResult {
  readonly success: boolean;
  readonly endingBranch?: CampaignEndingBranch;
  readonly error?: string;
}

export interface IServerRecoveryProtocolSystem {
  bootConsole(): { success: boolean; dialogueStarted: boolean };
  selectProtocol(optionIndex: number): ServerProtocolResult;
  isPinned(): boolean;
  isCompleted(): boolean;
  getSelectedProtocol(): ServerProtocolChoice | null;
  reset?(): void;
}

export interface ServerRecoveryProtocolConfig {
  readonly onProtocolSelected?: (choice: ServerProtocolChoice, branch: CampaignEndingBranch) => void;
  readonly onConsoleBooted?: () => void;
  readonly onDoorUnlocked?: () => void;
}
