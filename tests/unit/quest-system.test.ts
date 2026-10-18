import { describe, it, expect, beforeEach } from 'vitest';
import { QuestSystem } from '@/game/systems/QuestSystem';
import type { InventorySlot } from '@/types';
import questDefinitionsJson from '@/content/quests/cybershield_quests.json';
import type { CampaignQuestRecord } from '@/types/campaign';

describe('QuestSystem Unit Tests', () => {
  let questSystem: QuestSystem;
  let inventory: InventorySlot[];

  beforeEach(() => {
    inventory = [];
    questSystem = new QuestSystem(questDefinitionsJson as unknown as CampaignQuestRecord[], {}, inventory);
  });

  describe('1. Initialization & Invariants', () => {
    it('initializes with exactly 15 quests', () => {
      expect(questDefinitionsJson).toHaveLength(15);
      const state = questSystem.getState();
      expect(Object.keys(state)).toHaveLength(15);
    });

    it('initializes Quest 1 as active and Quests 2-15 as locked', () => {
      const activeQuest = questSystem.getActiveQuest();
      expect(activeQuest).not.toBeNull();
      expect(activeQuest?.id).toBe('quest_01_gate_barrier');

      const stateQ1 = questSystem.getQuestState('quest_01_gate_barrier');
      expect(stateQ1?.status).toBe('active');
      expect(stateQ1?.completedObjectives).toEqual([]);
      expect(stateQ1?.currentObjectiveIndex).toBe(0);

      const stateQ2 = questSystem.getQuestState('quest_02_deans_password');
      expect(stateQ2?.status).toBe('locked');

      const stateQ15 = questSystem.getQuestState('quest_15_final_b_cleanup');
      expect(stateQ15?.status).toBe('locked');
    });

    it('enforces single-active-quest policy', () => {
      // Trying to manually start Quest 2 when Quest 1 is active fails
      const started = questSystem.startQuest('quest_02_deans_password');
      expect(started).toBe(false);
      expect(questSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
    });
  });

  describe('2. Objective Completion & State Transitions', () => {
    it('tracks ordered objective completion and advances index', () => {
      const res1 = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(res1).toBe(true);

      const state = questSystem.getQuestState('quest_01_gate_barrier');
      expect(state?.completedObjectives).toEqual(['obj_01_radio_curator']);
      expect(state?.currentObjectiveIndex).toBe(1);

      // Idempotency: completing the same objective again returns false
      const resDup = questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      expect(resDup).toBe(false);
      expect(questSystem.getQuestState('quest_01_gate_barrier')?.completedObjectives).toHaveLength(1);
    });

    it('rejects invalid objective IDs or inactive quests', () => {
      // Non-existent objective
      const resInvalidObj = questSystem.completeObjective('quest_01_gate_barrier', 'obj_non_existent');
      expect(resInvalidObj).toBe(false);

      // Inactive/locked quest
      const resLockedQuest = questSystem.completeObjective('quest_02_deans_password', 'obj_02_inspect_terminal');
      expect(resLockedQuest).toBe(false);
    });

    it('auto-completes quest when all objectives finish and unlocks next quest', () => {
      // Quest 1 has 3 objectives
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      // Q1 should now be completed
      expect(questSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
      expect(questSystem.getWorldFlags()['FLAG_GATE_BYPASSED']).toBe(true);

      // Q2 should have automatically unlocked and transitioned to active
      const activeQuest = questSystem.getActiveQuest();
      expect(activeQuest?.id).toBe('quest_02_deans_password');
      expect(questSystem.getQuestState('quest_02_deans_password')?.status).toBe('active');
    });
  });

  describe('3. Inventory & Quest Rewards', () => {
    it('awards Impulse Debugger upon completing Quest 2', () => {
      // Complete Quest 1
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      // Complete Quest 2
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_inspect_terminal');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_find_passcode');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_unlock_keypad');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_take_debugger');

      expect(questSystem.isQuestCompleted('quest_02_deans_password')).toBe(true);
      expect(questSystem.getWorldFlags()['FLAG_DEANS_DOOR_UNLOCKED']).toBe(true);

      // Inventory check
      const debuggerItem = inventory.find(i => i.itemId === 'item_impulse_debugger');
      expect(debuggerItem).toBeDefined();
      expect(debuggerItem?.count).toBe(1);
    });

    it('awards 4 robot modules upon completing Quest 3', () => {
      // Finish Q1 and Q2
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      questSystem.completeObjective('quest_02_deans_password', 'obj_02_inspect_terminal');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_find_passcode');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_unlock_keypad');
      questSystem.completeObjective('quest_02_deans_password', 'obj_02_take_debugger');

      // Finish Q3
      expect(questSystem.getActiveQuest()?.id).toBe('quest_03_blocker_disassembly');
      questSystem.completeObjective('quest_03_blocker_disassembly', 'obj_03_locate_blocker');
      questSystem.completeObjective('quest_03_blocker_disassembly', 'obj_03_aim_and_pulse');
      questSystem.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');

      expect(questSystem.isQuestCompleted('quest_03_blocker_disassembly')).toBe(true);
      expect(questSystem.getWorldFlags()['FLAG_FIRST_BLOCKER_DISASSEMBLED']).toBe(true);

      expect(inventory.find(i => i.itemId === 'item_module_wheels')?.count).toBe(4);
      expect(inventory.find(i => i.itemId === 'item_module_casing')?.count).toBe(1);
      expect(inventory.find(i => i.itemId === 'item_module_camera')?.count).toBe(1);
      expect(inventory.find(i => i.itemId === 'item_module_battery')?.count).toBe(1);
    });
  });

  describe('4. Full Linear Campaign Playthrough (Quests 1–12)', () => {
    it('steps through all 12 linear quests setting respective flags', () => {
      const questsToRun = (questDefinitionsJson as unknown as CampaignQuestRecord[]).slice(0, 12);

      for (const q of questsToRun) {
        expect(questSystem.getActiveQuest()?.id).toBe(q.id);

        for (const obj of q.objectives) {
          const ok = questSystem.completeObjective(q.id, obj.id);
          expect(ok).toBe(true);
        }

        expect(questSystem.isQuestCompleted(q.id)).toBe(true);
        expect(questSystem.getWorldFlags()[q.completionFlag]).toBe(true);
      }

      // Quest 13 should now be active
      expect(questSystem.getActiveQuest()?.id).toBe('quest_13_protocol_init');
    });
  });

  describe('5. Quest 13 Branching & Epilogue Resolution', () => {
    function advanceToQuest13(): void {
      const questsToRun = (questDefinitionsJson as unknown as CampaignQuestRecord[]).slice(0, 12);
      for (const q of questsToRun) {
        for (const obj of q.objectives) {
          questSystem.completeObjective(q.id, obj.id);
        }
      }
      expect(questSystem.getActiveQuest()?.id).toBe('quest_13_protocol_init');
    }

    it('throws error if selectEnding is called when Quest 13 is not active', () => {
      expect(() => questSystem.selectEnding('A')).toThrow('selectEnding must be called while quest_13_protocol_init is active');
    });

    it('Choice A branches into Quest 14 (Final A) and locks Quest 15', () => {
      advanceToQuest13();

      const branchTarget = questSystem.selectEnding('A');
      expect(branchTarget).toBe('quest_14_finale_ideal');
      expect(questSystem.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');

      expect(questSystem.getWorldFlags()['FLAG_PROTOCOL_A']).toBe(true);
      expect(questSystem.getWorldFlags()['CAMPAIGN_ENDING_A']).toBe(true);
      expect(questSystem.getQuestState('quest_15_final_b_cleanup')?.status).toBe('locked');

      // Finish Quest 14
      questSystem.completeObjective('quest_14_final_a_celebration', 'obj_14_observe_fountain');
      questSystem.completeObjective('quest_14_final_a_celebration', 'obj_14_watch_friendly_bots');
      questSystem.completeObjective('quest_14_final_a_celebration', 'obj_14_professor_handshake');
      questSystem.completeObjective('quest_14_final_a_celebration', 'obj_14_view_credits');

      expect(questSystem.isQuestCompleted('quest_14_final_a_celebration')).toBe(true);
      expect(questSystem.getWorldFlags()['FLAG_CAMPAIGN_COMPLETE_ENDING_A']).toBe(true);
      expect(inventory.find(i => i.itemId === 'item_trophy_ideal')?.count).toBe(1);
    });

    it('Choice B branches into Quest 15 (Final B) and locks Quest 14', () => {
      advanceToQuest13();

      const branchTarget = questSystem.selectEnding('B');
      expect(branchTarget).toBe('quest_15_finale_pragmatic');
      expect(questSystem.getActiveQuest()?.id).toBe('quest_15_final_b_cleanup');

      expect(questSystem.getWorldFlags()['FLAG_PROTOCOL_B']).toBe(true);
      expect(questSystem.getWorldFlags()['CAMPAIGN_ENDING_B']).toBe(true);
      expect(questSystem.getQuestState('quest_14_final_a_celebration')?.status).toBe('locked');

      // Finish Quest 15
      questSystem.completeObjective('quest_15_final_b_cleanup', 'obj_15_join_volunteers');
      questSystem.completeObjective('quest_15_final_b_cleanup', 'obj_15_load_trolley');
      questSystem.completeObjective('quest_15_final_b_cleanup', 'obj_15_curator_radio');
      questSystem.completeObjective('quest_15_final_b_cleanup', 'obj_15_view_credits');

      expect(questSystem.isQuestCompleted('quest_15_final_b_cleanup')).toBe(true);
      expect(questSystem.getWorldFlags()['FLAG_CAMPAIGN_COMPLETE_ENDING_B']).toBe(true);
      expect(inventory.find(i => i.itemId === 'item_trophy_pragmatic')?.count).toBe(1);
    });

    it('Choice C branches into Quest 15 (Final B) and locks Quest 14', () => {
      advanceToQuest13();

      const branchTarget = questSystem.selectEnding('C');
      expect(branchTarget).toBe('quest_15_finale_pragmatic');
      expect(questSystem.getActiveQuest()?.id).toBe('quest_15_final_b_cleanup');

      expect(questSystem.getWorldFlags()['FLAG_PROTOCOL_C']).toBe(true);
      expect(questSystem.getWorldFlags()['CAMPAIGN_ENDING_B']).toBe(true);
      expect(questSystem.getQuestState('quest_14_final_a_celebration')?.status).toBe('locked');
    });

    it('supports calling selectEnding when Quest 13 objectives have already completed', () => {
      advanceToQuest13();
      questSystem.completeObjective('quest_13_protocol_init', 'obj_13_isolate_virus');
      questSystem.completeObjective('quest_13_protocol_init', 'obj_13_connect_power_block');
      questSystem.completeObjective('quest_13_protocol_init', 'obj_13_choose_protocol');
      expect(questSystem.isQuestCompleted('quest_13_protocol_init')).toBe(true);

      const branchTarget = questSystem.selectEnding('A');
      expect(branchTarget).toBe('quest_14_finale_ideal');
      expect(questSystem.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
    });

    it('throws error for invalid choice', () => {
      advanceToQuest13();
      // @ts-expect-error invalid choice testing
      expect(() => questSystem.selectEnding('D')).toThrow('Invalid ending choice: D');
      // @ts-expect-error invalid choice testing
      expect(() => questSystem.selectEnding('')).toThrow(/Invalid ending choice/);
      // @ts-expect-error invalid choice testing
      expect(() => questSystem.selectEnding(null)).toThrow(/Invalid ending choice/);
      // @ts-expect-error invalid choice testing
      expect(() => questSystem.selectEnding(undefined)).toThrow(/Invalid ending choice/);
    });
  });

  describe('6. State Serialization & SaveData v1 Sync', () => {
    it('exports and restores exact state via getState and loadState', () => {
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');

      const savedState = questSystem.getState();
      const savedFlags = questSystem.getWorldFlags();

      const newQuestSystem = new QuestSystem(questDefinitionsJson as unknown as CampaignQuestRecord[]);
      newQuestSystem.loadState(savedState, savedFlags);

      const restoredState = newQuestSystem.getState();
      expect(restoredState['quest_01_gate_barrier']?.completedObjectives).toEqual(['obj_01_radio_curator']);
      expect(restoredState['quest_01_gate_barrier']?.status).toBe('active');
      expect(newQuestSystem.getActiveQuest()?.id).toBe('quest_01_gate_barrier');
    });

    it('exports legacy states in inactive | active | completed format', () => {
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      const legacy = questSystem.exportLegacyStates();
      expect(legacy['quest_01_gate_barrier']).toBe('completed');
      expect(legacy['quest_02_deans_password']).toBe('active');
      expect(legacy['quest_03_blocker_disassembly']).toBe('inactive');
    });

    it('synchronizes with SaveData v1 format properly', () => {
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      const dummySave = {
        schemaVersion: 1,
        buildId: 'test',
        timestamp: Date.now(),
        playerScene: 'zone_02_deans_basement',
        position: { x: 0, y: 0 },
        stamina: 100,
        toolCharge: 100,
        inventory: [],
        storage: [],
        collectedIds: [],
        containerStates: {},
        doorStates: {},
        questStates: {},
        worldFlags: {},
        robotStates: [],
        settings: { soundVolume: 1, musicVolume: 1, language: 'ru' },
      };

      const synced = questSystem.syncToSaveData(dummySave);
      expect(synced.schemaVersion).toBe(1);
      expect(synced.activeQuestId).toBe('quest_02_deans_password');
      expect(synced.completedQuestIds).toContain('quest_01_gate_barrier');
      expect(synced.questStates['quest_01_gate_barrier']).toBe('completed');
      expect(synced.questStates['quest_02_deans_password']).toBe('active');
      expect(synced.worldFlags['FLAG_GATE_BYPASSED']).toBe(true);
    });

    it('serializes campaignEnding to SaveData v1 when ending is selected', () => {
      const questsToRun = (questDefinitionsJson as unknown as CampaignQuestRecord[]).slice(0, 12);
      for (const q of questsToRun) {
        for (const obj of q.objectives) {
          questSystem.completeObjective(q.id, obj.id);
        }
      }
      expect(questSystem.getActiveQuest()?.id).toBe('quest_13_protocol_init');

      questSystem.selectEnding('A');
      const dummySave = {
        schemaVersion: 1,
        buildId: 'test',
        timestamp: Date.now(),
        playerScene: 'zone_09_datacenter',
        position: { x: 0, y: 0 },
        stamina: 100,
        toolCharge: 100,
        inventory: [],
        storage: [],
        collectedIds: [],
        containerStates: {},
        doorStates: {},
        questStates: {},
        worldFlags: {},
        robotStates: [],
        settings: { soundVolume: 1, musicVolume: 1, language: 'ru' },
      };

      const synced = questSystem.syncToSaveData(dummySave);
      expect(synced.campaignEnding).toBe('FINAL_A');
    });
  });
});
