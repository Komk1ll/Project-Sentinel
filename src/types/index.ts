/**
 * Project Sentinel - Core Type Definitions
 * Following strict TypeScript rules from technical specifications.
 */

export * from './models';
export * from './campaign';
import type {
  CampaignEndingChoice,
  QuestState,
  DioramaSaveState,
} from './campaign';

export type EntityId = string;

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type PriorityLevel = 'P0' | 'P1' | 'P2';

export interface AssetRecord {
  readonly id: string;
  readonly category: 'terrain' | 'building' | 'prop' | 'character' | 'robot' | 'decal';
  readonly priority: PriorityLevel;
  readonly sourcePath: string;
  readonly atlasKey?: string;
  readonly frameNames?: readonly string[];
  readonly anchor?: Vector2D;
  readonly footprint?: { readonly width: number; readonly height: number };
  readonly occluder?: boolean;
  readonly interactionOffset?: Vector2D;
  readonly states?: readonly string[];
}

export interface ItemRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly stackMax: number;
  readonly icon: string;
  readonly questReserved: boolean;
  readonly usable: boolean;
}

export interface InventorySlot {
  readonly itemId: string;
  readonly count: number;
}

export interface QuestObjective {
  readonly id: string;
  readonly description: string;
  readonly completed: boolean;
}

export interface QuestRecord {
  readonly id: string;
  readonly title: string;
  readonly prerequisites: readonly string[];
  readonly objectives: readonly QuestObjective[];
  readonly rewards: readonly InventorySlot[];
  readonly completionFlag: string;
}

export interface RobotState {
  readonly id: string;
  readonly name: string;
  readonly position: Vector2D;
  readonly status: 'patrol' | 'idle' | 'malfunction' | 'repaired' | 'following';
  readonly charge: number;
}

export interface SaveData {
  readonly schemaVersion: number;
  readonly buildId: string;
  readonly timestamp: number;
  readonly playerScene: string;
  readonly position: Vector2D;
  readonly stamina: number;
  readonly toolCharge: number;
  readonly inventory: readonly InventorySlot[];
  readonly storage: readonly InventorySlot[];
  readonly collectedIds: readonly string[];
  readonly containerStates: Record<string, boolean>;
  readonly doorStates: Record<string, boolean>;
  readonly questStates: Record<string, 'inactive' | 'active' | 'completed'>;
  readonly worldFlags: Record<string, boolean | string | undefined>;
  readonly robotStates: readonly RobotState[];
  readonly settings: {
    readonly soundVolume: number;
    readonly musicVolume: number;
    readonly language: string;
  };
  // Optional additive extensions for CyberShield Campaign (v1 schema compatible)
  readonly activeQuestId?: string | null;
  readonly completedQuestIds?: readonly string[];
  readonly currentAct?: 1 | 2 | 3 | 4;
  readonly campaignEnding?: CampaignEndingChoice | null;
  readonly detailedQuestStates?: Record<string, QuestState>;
  readonly dioramaState?: DioramaSaveState;
  readonly groundDrops?: readonly unknown[];
}

export interface GameState {
  player: {
    position: Vector2D;
    stamina: number;
    toolCharge: number;
    inventory: InventorySlot[];
  };
  activeScene: string;
  quests: Record<string, 'inactive' | 'active' | 'completed'>;
  worldFlags: Record<string, boolean | string | undefined>;
  robots: RobotState[];
}
