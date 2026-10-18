/**
 * Project Sentinel - QuestSystem State Engine
 * Implements IQuestEngine contract for the 15-quest CyberShield campaign.
 * Handles quest lifecycle (locked -> available -> active -> completed),
 * single-active-quest invariant, ordered objective tracking, Quest 13 branching,
 * automatic prerequisite re-evaluation, and SaveData v1 synchronization.
 */

import type { InventorySlot, SaveData } from '@/types';
import type {
  CampaignQuestRecord,
  QuestState,
  EndingChoice,
  CampaignEndingBranch,
  CampaignEndingChoice,
  IQuestEngine,
  QuestSystemEvents,
} from '@/types/campaign';
import defaultQuestsJson from '@/content/quests/cybershield_quests.json';

export class QuestSystem implements IQuestEngine {
  private quests: Map<string, CampaignQuestRecord> = new Map();
  private states: Map<string, QuestState> = new Map();
  private worldFlags: Record<string, boolean | string> = {};
  private activeQuestId: string | null = null;
  private inventoryRef: InventorySlot[] = [];
  private campaignEnding: CampaignEndingChoice | null = null;

  private listeners: Map<keyof QuestSystemEvents, Set<unknown>> = new Map();

  constructor(
    questDefinitions?: CampaignQuestRecord[],
    initialFlags: Record<string, boolean | string | undefined> = {},
    inventoryRef: InventorySlot[] = []
  ) {
    const definitions = questDefinitions ?? (defaultQuestsJson as unknown as CampaignQuestRecord[]);
    this.worldFlags = {};
    for (const [key, val] of Object.entries(initialFlags)) {
      if (typeof val === 'boolean' || typeof val === 'string') {
        this.worldFlags[key] = val;
      }
    }
    this.inventoryRef = inventoryRef;

    for (const q of definitions) {
      this.quests.set(q.id, q);
      this.states.set(q.id, {
        id: q.id,
        status: 'locked',
        currentObjectiveIndex: 0,
        completedObjectives: [],
      });
    }

    this.initFirstQuest();
  }

  /**
   * Initializes initial root quest(s) without prerequisites.
   */
  private initFirstQuest(): void {
    const firstQuest = Array.from(this.quests.values()).find(q => q.prerequisites.length === 0);
    if (firstQuest) {
      const state = this.states.get(firstQuest.id);
      if (state) {
        state.status = 'available';
        if (firstQuest.autoActivate) {
          this.startQuest(firstQuest.id);
        }
      }
    }
  }

  /**
   * Returns the currently active quest record, or null if none is active.
   */
  public getActiveQuest(): CampaignQuestRecord | null {
    if (!this.activeQuestId) return null;
    return this.quests.get(this.activeQuestId) ?? null;
  }

  /**
   * Returns the state of a specific quest, or null if quest does not exist.
   */
  public getQuestState(questId: string): QuestState | null {
    const state = this.states.get(questId);
    if (!state) return null;
    return {
      ...state,
      completedObjectives: [...state.completedObjectives],
    };
  }

  /**
   * Starts an available quest.
   * Returns false if quest is not available or if another quest is already active.
   */
  public startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    const state = this.states.get(questId);
    if (!quest || !state) return false;
    if (state.status !== 'available') return false;

    // Single active quest invariant
    if (this.activeQuestId && this.activeQuestId !== questId) {
      console.warn(`[QuestSystem] Cannot start quest ${questId}: quest ${this.activeQuestId} is already active`);
      return false;
    }

    state.status = 'active';
    state.startedAt = Date.now();
    this.activeQuestId = questId;
    this.emit('questStarted', quest);
    return true;
  }

  /**
   * Marks a specific objective as complete.
   * Idempotent: returns false if objective is already completed.
   * Automatically triggers completeQuest when all objectives are finished.
   */
  public completeObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    const state = this.states.get(questId);
    if (!quest || !state || state.status !== 'active') return false;

    const objIndex = quest.objectives.findIndex(o => o.id === objectiveId);
    if (objIndex === -1) return false;

    // Check if already completed
    if (state.completedObjectives.includes(objectiveId)) return false;

    // Record completion
    state.completedObjectives.push(objectiveId);
    state.currentObjectiveIndex = Math.min(objIndex + 1, quest.objectives.length);

    const objective = quest.objectives[objIndex];
    if (objective) {
      this.emit('objectiveCompleted', { quest, objective, index: objIndex });
    }

    // Check if all objectives completed
    const allCompleted = quest.objectives.every(o => state.completedObjectives.includes(o.id));
    if (allCompleted) {
      this.completeQuest(questId);
    }

    return true;
  }

  /**
   * Completes the given quest, sets its completion flag, awards rewards,
   * and evaluates prerequisites for dependent quests.
   */
  public completeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    const state = this.states.get(questId);
    if (!quest || !state || state.status !== 'active') return false;

    state.status = 'completed';
    state.completedAt = Date.now();
    this.activeQuestId = null;

    // Set completion flag in worldFlags
    if (quest.completionFlag) {
      this.worldFlags[quest.completionFlag] = true;
    }

    // Award rewards into inventory
    if (quest.rewards && quest.rewards.length > 0) {
      for (const reward of quest.rewards) {
        const existingIndex = this.inventoryRef.findIndex(i => i.itemId === reward.itemId);
        if (existingIndex >= 0 && this.inventoryRef[existingIndex]) {
          this.inventoryRef[existingIndex] = {
            ...this.inventoryRef[existingIndex]!,
            count: this.inventoryRef[existingIndex]!.count + reward.count,
          };
        } else {
          this.inventoryRef.push({ itemId: reward.itemId, count: reward.count });
        }
      }
    }

    this.emit('questCompleted', { quest, rewards: quest.rewards });

    // Evaluate prerequisites for remaining quests
    this.evaluatePrerequisites();
    return true;
  }

  /**
   * Checks whether a quest has status 'completed'.
   */
  public isQuestCompleted(questId: string): boolean {
    return this.states.get(questId)?.status === 'completed';
  }

  /**
   * Resolves the Quest 13 narrative choice, activating either Quest 14 (Choice A)
   * or Quest 15 (Choice B or C).
   */
  public selectEnding(choice: EndingChoice): CampaignEndingBranch {
    // 1. Strict validation of choice input
    if (choice !== 'A' && choice !== 'B' && choice !== 'C') {
      throw new Error(`[QuestSystem] Invalid ending choice: ${choice}`);
    }

    // 2. Validate Quest 13 state: must be active or completed, and epilogue must not have started
    const q13State = this.states.get('quest_13_protocol_init');
    const isQ13Active = this.activeQuestId === 'quest_13_protocol_init';
    const isQ13Completed = q13State?.status === 'completed';

    if (!isQ13Active && !isQ13Completed) {
      throw new Error('[QuestSystem] Cannot select ending before Quest 13 is completed: selectEnding must be called while quest_13_protocol_init is active');
    }

    const q14State = this.states.get('quest_14_final_a_celebration');
    const q15State = this.states.get('quest_15_final_b_cleanup');
    const isEpilogueActiveOrDone =
      (q14State && (q14State.status === 'active' || q14State.status === 'completed')) ||
      (q15State && (q15State.status === 'active' || q15State.status === 'completed'));

    if (isEpilogueActiveOrDone) {
      if (this.campaignEnding === 'FINAL_A' && choice === 'A') {
        return 'quest_14_finale_ideal';
      }
      if (this.campaignEnding === 'FINAL_B' && (choice === 'B' || choice === 'C')) {
        return 'quest_15_finale_pragmatic';
      }
      throw new Error('[QuestSystem] selectEnding must be called while quest_13_protocol_init is active');
    }

    // 3. Complete all objectives of Quest 13 and finalize it if active
    if (isQ13Active) {
      const q13 = this.quests.get('quest_13_protocol_init');
      if (q13 && q13State) {
        for (const obj of q13.objectives) {
          if (!q13State.completedObjectives.includes(obj.id)) {
            q13State.completedObjectives.push(obj.id);
          }
        }
        q13State.currentObjectiveIndex = q13.objectives.length;
        this.completeQuest('quest_13_protocol_init');
      }
    }

    // 4. Branch outcome configuration
    let targetQuestId: 'quest_14_final_a_celebration' | 'quest_15_final_b_cleanup';
    let returnContract: CampaignEndingBranch;

    if (choice === 'A') {
      targetQuestId = 'quest_14_final_a_celebration';
      returnContract = 'quest_14_finale_ideal';
      this.campaignEnding = 'FINAL_A';
      this.worldFlags['FLAG_PROTOCOL_A'] = true;
      this.worldFlags['CAMPAIGN_ENDING_A'] = true;
      this.worldFlags['CAMPAIGN_ENDING'] = true;
      if (q15State) q15State.status = 'locked';
    } else {
      targetQuestId = 'quest_15_final_b_cleanup';
      returnContract = 'quest_15_finale_pragmatic';
      this.campaignEnding = 'FINAL_B';
      this.worldFlags['FLAG_PROTOCOL_B'] = choice === 'B';
      this.worldFlags['FLAG_PROTOCOL_C'] = choice === 'C';
      this.worldFlags['CAMPAIGN_ENDING_B'] = true;
      this.worldFlags['CAMPAIGN_ENDING'] = true;
      if (q14State) q14State.status = 'locked';
    }

    const targetState = this.states.get(targetQuestId);
    if (targetState) {
      targetState.status = 'available';
      this.startQuest(targetQuestId);
    }

    this.emit('branchSelected', { choice, targetQuestId });
    return returnContract;
  }

  /**
   * Evaluates prerequisite dependencies and auto-activates ready quests.
   */
  private evaluatePrerequisites(): void {
    for (const [id, quest] of this.quests.entries()) {
      const state = this.states.get(id);
      if (!state || state.status !== 'locked') continue;

      if (quest.branchCondition) continue; // Handled exclusively via selectEnding

      const prereqsMet = quest.prerequisites.every(pId => this.states.get(pId)?.status === 'completed');
      if (!prereqsMet) continue;

      if (quest.requiredFlags) {
        const flagsMet = quest.requiredFlags.every(f => Boolean(this.worldFlags[f]));
        if (!flagsMet) continue;
      }

      state.status = 'available';
      this.emit('questAvailable', quest);

      if (quest.autoActivate && !this.activeQuestId) {
        this.startQuest(id);
      }
    }
  }

  /**
   * Returns a snapshot of all quest states.
   */
  public getState(): Record<string, QuestState> {
    const result: Record<string, QuestState> = {};
    for (const [id, state] of this.states.entries()) {
      result[id] = {
        ...state,
        completedObjectives: [...state.completedObjectives],
      };
    }
    return result;
  }

  /**
   * Exports quest states mapped to the legacy 'inactive' | 'active' | 'completed' schema.
   */
  public exportLegacyStates(): Record<string, 'inactive' | 'active' | 'completed'> {
    const legacy: Record<string, 'inactive' | 'active' | 'completed'> = {};
    for (const [id, state] of this.states.entries()) {
      if (state.status === 'completed') {
        legacy[id] = 'completed';
      } else if (state.status === 'active') {
        legacy[id] = 'active';
      } else {
        legacy[id] = 'inactive';
      }
    }
    return legacy;
  }

  /**
   * Loads serialized quest states and restores the active quest.
   * Enforces single-active-quest invariant and handles baseline / partial states.
   */
  public loadState(state: Record<string, QuestState>, flags?: Record<string, boolean | string | undefined>): void {
    if (flags) {
      this.worldFlags = {};
      for (const [key, val] of Object.entries(flags)) {
        if (typeof val === 'boolean') {
          this.worldFlags[key] = val;
        } else if (typeof val === 'string') {
          if (key === 'CAMPAIGN_ENDING') {
            if (val === 'FINAL_A' || val === 'FINAL_B') {
              this.campaignEnding = val;
            }
          }
        }
      }
      if (flags['CAMPAIGN_ENDING_A'] || flags['FLAG_CAMPAIGN_COMPLETE_ENDING_A'] || flags['CAMPAIGN_ENDING'] === 'FINAL_A') {
        this.campaignEnding = 'FINAL_A';
      } else if (flags['CAMPAIGN_ENDING_B'] || flags['FLAG_CAMPAIGN_COMPLETE_ENDING_B'] || flags['CAMPAIGN_ENDING'] === 'FINAL_B') {
        this.campaignEnding = 'FINAL_B';
      } else if (!flags['CAMPAIGN_ENDING']) {
        this.campaignEnding = null;
      }
    }
    this.activeQuestId = null;

    // Reset all quests to default locked state before applying snapshot
    for (const qState of this.states.values()) {
      qState.status = 'locked';
      qState.currentObjectiveIndex = 0;
      qState.completedObjectives = [];
      delete qState.startedAt;
      delete qState.completedAt;
    }

    // Apply provided state entries
    for (const [id, qState] of Object.entries(state)) {
      if (this.states.has(id)) {
        this.states.set(id, {
          id,
          status: qState.status,
          currentObjectiveIndex: qState.currentObjectiveIndex,
          completedObjectives: [...qState.completedObjectives],
          startedAt: qState.startedAt,
          completedAt: qState.completedAt,
        });
        if (qState.status === 'active') {
          this.activeQuestId = id;
        }
      }
    }

    // If no active quest was restored from state and state is empty (e.g. baseline pre-M1 save),
    // initialize root quest to avoid bricking
    if (!this.activeQuestId && Object.keys(state).length === 0) {
      this.initFirstQuest();
    } else if (this.activeQuestId) {
      // Enforce strict single-active-quest invariant:
      // Ensure ONLY activeQuestId remains 'active' in this.states; downgrade any other active quests to completed
      for (const [id, qState] of this.states.entries()) {
        if (id !== this.activeQuestId && qState.status === 'active') {
          qState.status = 'completed';
        }
      }
    } else {
      // State was loaded with completed quests but no active quest; evaluate prerequisites
      this.evaluatePrerequisites();
    }
  }

  /**
   * Returns all world flags currently registered.
   */
  public getWorldFlags(): Readonly<Record<string, boolean | string>> {
    const ending = this.campaignEnding ?? (this.worldFlags['CAMPAIGN_ENDING'] as unknown as string);
    return {
      ...this.worldFlags,
      ...(ending !== undefined ? { CAMPAIGN_ENDING: ending } : {}),
    };
  }

  /**
   * Sets or updates a world flag.
   */
  public setWorldFlag(key: string, value: boolean): void {
    this.worldFlags[key] = value;
  }

  /**
   * Returns read-only reference to the active inventory slots.
   */
  public getInventory(): readonly InventorySlot[] {
    return this.inventoryRef;
  }

  /**
   * Synchronizes current campaign quest and flags into a full SaveData v1 structure.
   */
  public syncToSaveData(base: SaveData): SaveData {
    const activeQuest = this.getActiveQuest();
    const completedQuestIds = Array.from(this.states.entries())
      .filter(([_, s]) => s.status === 'completed')
      .map(([id]) => id);

    let currentAct: 1 | 2 | 3 | 4 = 1;
    if (activeQuest) {
      currentAct = activeQuest.act;
    } else {
      const lastCompleted = completedQuestIds[completedQuestIds.length - 1];
      if (lastCompleted) {
        const q = this.quests.get(lastCompleted);
        if (q) currentAct = q.act;
      }
    }

    const campaignEnding: CampaignEndingChoice | null | undefined =
      this.campaignEnding
      ?? (this.worldFlags['CAMPAIGN_ENDING_A'] || this.worldFlags['FLAG_CAMPAIGN_COMPLETE_ENDING_A'] ? 'FINAL_A' : undefined)
      ?? (this.worldFlags['CAMPAIGN_ENDING_B'] || this.worldFlags['FLAG_CAMPAIGN_COMPLETE_ENDING_B'] ? 'FINAL_B' : undefined)
      ?? base.campaignEnding;

    return {
      ...base,
      questStates: this.exportLegacyStates(),
      worldFlags: { ...this.worldFlags },
      activeQuestId: this.activeQuestId,
      completedQuestIds,
      currentAct,
      detailedQuestStates: this.getState(),
      inventory: [...this.inventoryRef],
      ...(campaignEnding !== undefined ? { campaignEnding } : {}),
    };
  }

  /**
   * Subscribes to QuestSystem lifecycle events.
   */
  public on<K extends keyof QuestSystemEvents>(event: K, callback: QuestSystemEvents[K]): () => void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(callback);
    return () => {
      handlers?.delete(callback);
    };
  }

  /**
   * Unsubscribes from QuestSystem lifecycle events.
   */
  public off<K extends keyof QuestSystemEvents>(event: K, callback: QuestSystemEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  private emit<K extends keyof QuestSystemEvents>(event: K, payload: Parameters<QuestSystemEvents[K]>[0]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        if (typeof handler === 'function') {
          (handler as (p: Parameters<QuestSystemEvents[K]>[0]) => void)(payload);
        }
      }
    }
  }
}
