import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService, CURRENT_SCHEMA_VERSION } from '@/utils/storage';
import { QuestSystem } from '@/game/systems/QuestSystem';
import { DialogueSystem } from '@/game/systems/DialogueSystem';
import type { SaveData, InventorySlot } from '@/types';
import type {
  CampaignQuestRecord,
  DialogueTree,
  QuestState,
} from '@/types/campaign';
import itemsJson from '@/content/items/items.json';
import questsJson from '@/content/quests/cybershield_quests.json';

describe('Challenger 2: Empirical State Serialization & Memory/Queue Robustness', () => {
  // Mock localStorage for storage testing
  class LocalStorageMock {
    private store: Map<string, string> = new Map();
    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
    removeItem(key: string): void {
      this.store.delete(key);
    }
    clear(): void {
      this.store.clear();
    }
  }

  const mockStorage = new LocalStorageMock();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).localStorage = mockStorage;

  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // =========================================================================
  // Challenge 1: Full Round-Trip Serialization & Deserialization of SaveData v1
  // =========================================================================
  describe('Dimension 1: Full Round-Trip Serialization (All 15 Quests, 14 Items, 15 World Flags)', () => {
    // 1. Verify item catalog count
    it('CH-SER-01: items.json catalog contains exactly 14 items', () => {
      expect(itemsJson).toHaveLength(14);
      const uniqueIds = new Set(itemsJson.map(i => i.id));
      expect(uniqueIds.size).toBe(14);
    });

    // 2. Verify quest catalog count
    it('CH-SER-02: cybershield_quests.json catalog contains exactly 15 quests', () => {
      expect(questsJson).toHaveLength(15);
      const uniqueIds = new Set(questsJson.map(q => q.id));
      expect(uniqueIds.size).toBe(15);
    });

    // 3. Full SaveData v1 fixture construction and round-trip
    it('CH-SER-03: flawless round-trip serialization of SaveData v1 with all 15 quests, 14 items, and 15 world flags', () => {
      // Build inventory with all 14 items at their maximum stack limits
      const fullInventory: InventorySlot[] = itemsJson.map(item => ({
        itemId: item.id,
        count: item.stackMax,
      }));
      expect(fullInventory).toHaveLength(14);

      // Build all 15 campaign world flags
      const all15WorldFlags: Record<string, boolean> = {
        FLAG_GATE_BYPASSED: true,
        FLAG_DEANS_DOOR_UNLOCKED: true,
        FLAG_FIRST_BLOCKER_DISASSEMBLED: true,
        FLAG_PROFESSOR_CONTACTED: true,
        FLAG_SERVER_DOOR_INSPECTED: true,
        FLAG_CCTV_REVIEWED: true,
        FLAG_KEYS_RECOVERED: true,
        FLAG_POWER_RESTORED: true,
        FLAG_TUNNEL_TRAVERSED: true,
        FLAG_JAMMER_DISABLED: true,
        FLAG_LOBBY_ENTERED: true,
        FLAG_DATACENTER_ACCESSED: true,
        FLAG_PROTOCOL_INITIALIZED: true,
        FLAG_CAMPAIGN_COMPLETE_ENDING_A: true,
        FLAG_CAMPAIGN_COMPLETE_ENDING_B: false,
        // Sub-puzzle flags
        FLAG_IMPULSE_DEBUGGER_ACQUIRED: true,
        FLAG_SWITCHBOARD_ISOLATED: true,
        FLAG_SWITCHBOARD_FUSE_REPLACED: true,
        FLAG_SWITCHBOARD_GRID_REBOOTED: true,
        FLAG_PROTOCOL_A: true,
        FLAG_PROTOCOL_B: false,
        FLAG_PROTOCOL_C: false,
        FLAG_SENTINEL_RESTORED: true,
      };

      // Verify at least 15 primary campaign flags exist
      const primaryFlags = Object.keys(all15WorldFlags).filter(k => 
        k.startsWith('FLAG_') && 
        !k.startsWith('FLAG_SWITCHBOARD_') && 
        k !== 'FLAG_IMPULSE_DEBUGGER_ACQUIRED' && 
        k !== 'FLAG_SENTINEL_RESTORED' &&
        k !== 'FLAG_PROTOCOL_A' &&
        k !== 'FLAG_PROTOCOL_B' &&
        k !== 'FLAG_PROTOCOL_C'
      );
      expect(primaryFlags.length).toBeGreaterThanOrEqual(15);

      // Build all 15 quest states: Quests 1-13 completed, Quest 14 active (Final A), Quest 15 locked (Final B)
      const detailedQuestStates: Record<string, QuestState> = {};
      const legacyQuestStates: Record<string, 'inactive' | 'active' | 'completed'> = {};
      const completedQuestIds: string[] = [];

      for (const q of questsJson as CampaignQuestRecord[]) {
        if (q.id === 'quest_14_final_a_celebration') {
          detailedQuestStates[q.id] = {
            id: q.id,
            status: 'active',
            currentObjectiveIndex: 1,
            completedObjectives: [q.objectives[0]!.id],
            startedAt: 1729255000000,
          };
          legacyQuestStates[q.id] = 'active';
        } else if (q.id === 'quest_15_final_b_cleanup') {
          detailedQuestStates[q.id] = {
            id: q.id,
            status: 'locked',
            currentObjectiveIndex: 0,
            completedObjectives: [],
          };
          legacyQuestStates[q.id] = 'inactive';
        } else {
          // Completed quests 1 to 13
          detailedQuestStates[q.id] = {
            id: q.id,
            status: 'completed',
            currentObjectiveIndex: q.objectives.length,
            completedObjectives: q.objectives.map(o => o.id),
            startedAt: 1729250000000,
            completedAt: 1729254000000,
          };
          legacyQuestStates[q.id] = 'completed';
          completedQuestIds.push(q.id);
        }
      }
      expect(Object.keys(detailedQuestStates)).toHaveLength(15);
      expect(Object.keys(legacyQuestStates)).toHaveLength(15);
      expect(completedQuestIds).toHaveLength(13);

      const comprehensiveSave: SaveData = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        buildId: 'cybershield-m1-adversarial-0.1.0',
        timestamp: 1729256000000,
        playerScene: 'zone_09_datacenter',
        position: { x: 18.5, y: 12.25 },
        stamina: 95,
        toolCharge: 100,
        inventory: fullInventory,
        storage: [
          { itemId: 'scrap_copper_wire', count: 15 },
          { itemId: 'power_cell_unit', count: 3 },
        ],
        collectedIds: [
          'pickup_impulse_debugger',
          'pickup_blocker_modules',
          'pickup_server_keys',
          'pickup_tape_corridor',
        ],
        containerStates: {
          chest_lab_01: true,
          cabinet_deans_02: true,
          lockbox_greenhouse_01: true,
        },
        doorStates: {
          door_deans_basement: true,
          door_corridor_emergency: true,
          door_winter_garden: true,
          door_datacenter_vault: true,
        },
        questStates: legacyQuestStates,
        worldFlags: all15WorldFlags,
        robotStates: [
          {
            id: 'patrol_droid_01',
            name: 'Gate Patrol Sentry',
            position: { x: 4.0, y: 8.0 },
            status: 'patrol',
            charge: 90,
          },
          {
            id: 'blocker_bot_01',
            name: 'Courier Blocker Bot',
            position: { x: 6.5, y: 3.0 },
            status: 'repaired',
            charge: 100,
          },
        ],
        settings: {
          soundVolume: 0.9,
          musicVolume: 0.75,
          language: 'ru',
        },
        activeQuestId: 'quest_14_final_a_celebration',
        completedQuestIds,
        currentAct: 4,
        campaignEnding: 'FINAL_A',
        detailedQuestStates,
        dioramaState: {
          currentZoneId: 'zone_10_finale_celebration',
          lightingState: 'sunny_day',
          interactedPropIds: ['prop_main_terminal', 'prop_server_rack_01'],
          playerCoordinates: { x: 18.5, y: 12.25 },
        },
      };

      // 1. Validate against StorageService schema validator
      expect(StorageService.validateSaveData(comprehensiveSave)).toBe(true);

      // 2. Perform save
      const saveResult = StorageService.saveGame(comprehensiveSave);
      expect(saveResult).toBe(true);

      // 3. Perform load
      const loadedSave = StorageService.loadGame();
      expect(loadedSave).not.toBeNull();
      expect(StorageService.validateSaveData(loadedSave!)).toBe(true);

      // 4. Strict Deep Equality check
      expect(loadedSave).toEqual(comprehensiveSave);

      // 5. Inspect individual sections
      expect(loadedSave?.inventory).toHaveLength(14);
      for (const item of itemsJson) {
        const slot = loadedSave?.inventory.find(i => i.itemId === item.id);
        expect(slot).toBeDefined();
        expect(slot?.count).toBe(item.stackMax);
      }

      // Check all 15 world flags
      for (const [k, v] of Object.entries(all15WorldFlags)) {
        expect(loadedSave?.worldFlags[k]).toBe(v);
      }

      // Check all 15 detailed quest states
      expect(Object.keys(loadedSave?.detailedQuestStates || {})).toHaveLength(15);
      expect(loadedSave?.activeQuestId).toBe('quest_14_final_a_celebration');
      expect(loadedSave?.completedQuestIds).toHaveLength(13);
      expect(loadedSave?.campaignEnding).toBe('FINAL_A');
      expect(loadedSave?.currentAct).toBe(4);

      // 6. Restore loaded data into a fresh QuestSystem instance
      const restoredQuestSystem = new QuestSystem(
        questsJson as CampaignQuestRecord[],
        loadedSave!.worldFlags,
        [...(loadedSave!.inventory as InventorySlot[])]
      );
      restoredQuestSystem.loadState(loadedSave!.detailedQuestStates!, loadedSave!.worldFlags);

      expect(restoredQuestSystem.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
      expect(restoredQuestSystem.isQuestCompleted('quest_13_protocol_init')).toBe(true);
      expect(restoredQuestSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
      expect(restoredQuestSystem.isQuestCompleted('quest_14_final_a_celebration')).toBe(false);
      expect(restoredQuestSystem.getQuestState('quest_15_final_b_cleanup')?.status).toBe('locked');

      // 7. Verify sync back to SaveData maintains invariant
      const reSyncedSave = restoredQuestSystem.syncToSaveData(loadedSave!);
      expect(reSyncedSave.activeQuestId).toBe('quest_14_final_a_celebration');
      expect(reSyncedSave.completedQuestIds).toEqual(completedQuestIds);
      expect(reSyncedSave.currentAct).toBe(4);
      expect(reSyncedSave.campaignEnding).toBe('FINAL_A');
    });

    // 4. Test corrupted or boundary conditions during save
    it('CH-SER-04: handles extreme payload size without data truncation or corruption', () => {
      // Generate large collected IDs list and dense state
      const largeCollected: string[] = [];
      for (let i = 0; i < 500; i++) {
        largeCollected.push(`prop_mesh_instance_marker_${i}`);
      }

      const largeSave: SaveData = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        buildId: 'stress-build-id',
        timestamp: Date.now(),
        playerScene: 'zone_07_cable_tunnel',
        position: { x: 100.999, y: -200.555 },
        stamina: 0,
        toolCharge: 0,
        inventory: itemsJson.map(i => ({ itemId: i.id, count: 9999 })),
        storage: [],
        collectedIds: largeCollected,
        containerStates: Object.fromEntries(largeCollected.map(id => [id, true])),
        doorStates: Object.fromEntries(largeCollected.map(id => [id, false])),
        questStates: {},
        worldFlags: Object.fromEntries(largeCollected.map(id => [id, true])),
        robotStates: [],
        settings: { soundVolume: 0, musicVolume: 0, language: 'ru' },
      };

      expect(StorageService.saveGame(largeSave)).toBe(true);
      const retrieved = StorageService.loadGame();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.collectedIds).toHaveLength(500);
      expect(retrieved?.inventory).toHaveLength(14);
    });

    it('CH-SER-05: gracefully rejects save payload missing required schema fields', () => {
      // Missing inventory array
      const invalidSaveA = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        buildId: 'test',
        playerScene: 'zone_01_gate',
        position: { x: 0, y: 0 },
      };
      expect(StorageService.validateSaveData(invalidSaveA)).toBe(false);

      // Null position
      const invalidSaveB = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        buildId: 'test',
        playerScene: 'zone_01_gate',
        position: null,
        inventory: [],
      };
      expect(StorageService.validateSaveData(invalidSaveB)).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 2: Backward Compatibility & Pre-M1 Baseline Saves
  // =========================================================================
  describe('Dimension 2: Backward Compatibility & Pre-M1 Baseline Upgrades', () => {
    const preM1BaselineSave: SaveData = {
      schemaVersion: 1,
      buildId: 'v0.9.0-pre-m1-baseline',
      timestamp: 1729000000000,
      playerScene: 'DistrictScene',
      position: { x: 5.5, y: 10.2 },
      stamina: 80,
      toolCharge: 45,
      inventory: [
        { itemId: 'repair_tool_v1', count: 1 },
        { itemId: 'power_cell_unit', count: 2 },
        { itemId: 'scrap_copper_wire', count: 7 },
      ],
      storage: [{ itemId: 'scrap_copper_wire', count: 20 }],
      collectedIds: ['legacy_pickup_01'],
      containerStates: { legacy_chest_01: true },
      doorStates: { legacy_gate_door: false },
      questStates: {
        p0_robot_recovery: 'active',
        tutorial_movement: 'completed',
      },
      worldFlags: {
        FLAG_TUTORIAL_DONE: true,
      },
      robotStates: [
        {
          id: 'sentinel_01',
          name: 'Municipal Sentinel Bot',
          position: { x: 8, y: 8 },
          status: 'malfunction',
          charge: 20,
        },
      ],
      settings: {
        soundVolume: 0.8,
        musicVolume: 0.7,
        language: 'en',
      },
      // Note: ALL campaign fields (activeQuestId, completedQuestIds, currentAct,
      // campaignEnding, detailedQuestStates, dioramaState) are completely absent.
    };

    it('CH-BWD-01: validates and loads pre-M1 baseline save files without modification', () => {
      expect(StorageService.validateSaveData(preM1BaselineSave)).toBe(true);

      StorageService.saveGame(preM1BaselineSave);
      const loaded = StorageService.loadGame();
      expect(loaded).not.toBeNull();
      expect(loaded?.buildId).toBe('v0.9.0-pre-m1-baseline');
      expect(loaded?.detailedQuestStates).toBeUndefined();
      expect(loaded?.activeQuestId).toBeUndefined();
      expect(loaded?.currentAct).toBeUndefined();
      expect(loaded?.campaignEnding).toBeUndefined();
      expect(loaded?.inventory).toHaveLength(3);
      expect(loaded?.robotStates).toHaveLength(1);
    });

    it('CH-BWD-02: upgrades pre-M1 baseline save to full Campaign v1 schema via QuestSystem.syncToSaveData', () => {
      // Hydrate into QuestSystem
      const inventoryCopy = [...preM1BaselineSave.inventory] as InventorySlot[];
      const qs = new QuestSystem(
        questsJson as CampaignQuestRecord[],
        preM1BaselineSave.worldFlags,
        inventoryCopy
      );

      // Verify fresh QuestSystem starts at Quest 1 (first available/auto-activated quest)
      expect(qs.getActiveQuest()?.id).toBe('quest_01_gate_barrier');

      // Now upgrade baseline save using syncToSaveData
      const upgradedSave = qs.syncToSaveData(preM1BaselineSave);

      // 1. Schema must remain valid
      expect(StorageService.validateSaveData(upgradedSave)).toBe(true);
      expect(upgradedSave.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

      // 2. Non-campaign fields must be strictly preserved
      expect(upgradedSave.buildId).toBe(preM1BaselineSave.buildId);
      expect(upgradedSave.playerScene).toBe(preM1BaselineSave.playerScene);
      expect(upgradedSave.position).toEqual(preM1BaselineSave.position);
      expect(upgradedSave.stamina).toBe(preM1BaselineSave.stamina);
      expect(upgradedSave.toolCharge).toBe(preM1BaselineSave.toolCharge);
      expect(upgradedSave.storage).toEqual(preM1BaselineSave.storage);
      expect(upgradedSave.collectedIds).toEqual(preM1BaselineSave.collectedIds);
      expect(upgradedSave.containerStates).toEqual(preM1BaselineSave.containerStates);
      expect(upgradedSave.doorStates).toEqual(preM1BaselineSave.doorStates);
      expect(upgradedSave.robotStates).toEqual(preM1BaselineSave.robotStates);
      expect(upgradedSave.settings).toEqual(preM1BaselineSave.settings);

      // 3. Upgraded campaign fields must be populated accurately
      expect(upgradedSave.activeQuestId).toBe('quest_01_gate_barrier');
      expect(upgradedSave.completedQuestIds).toEqual([]);
      expect(upgradedSave.currentAct).toBe(1);
      expect(upgradedSave.detailedQuestStates).toBeDefined();
      expect(Object.keys(upgradedSave.detailedQuestStates!)).toHaveLength(15);
      expect(upgradedSave.detailedQuestStates!['quest_01_gate_barrier']?.status).toBe('active');

      // 4. World flags must contain original legacy flags + campaign flags
      expect(upgradedSave.worldFlags['FLAG_TUTORIAL_DONE']).toBe(true);

      // 5. Save and reload upgraded state through StorageService
      StorageService.saveGame(upgradedSave);
      const reloaded = StorageService.loadGame();
      expect(reloaded).not.toBeNull();
      expect(reloaded?.activeQuestId).toBe('quest_01_gate_barrier');
      expect(reloaded?.detailedQuestStates!['quest_01_gate_barrier']?.status).toBe('active');
    });

    it('CH-BWD-03: verifies loadState re-initializes root quest cleanly when loading empty states', () => {
      const qs = new QuestSystem();
      expect(qs.getActiveQuest()?.id).toBe('quest_01_gate_barrier');

      // Calling loadState with empty detailedQuestStates (e.g. from baseline save)
      qs.loadState({}, preM1BaselineSave.worldFlags);

      const q1State = qs.getQuestState('quest_01_gate_barrier');
      const activeQuest = qs.getActiveQuest();

      // FIX VERIFIED:
      // In QuestSystem.loadState():
      // Empty state re-initializes root quest so quest_01 is active and activeQuestId is synchronized
      expect(q1State?.status).toBe('active');
      expect(activeQuest?.id).toBe('quest_01_gate_barrier');

      // Consequence: syncToSaveData produces consistent save data
      const synced = qs.syncToSaveData(preM1BaselineSave);
      expect(synced.activeQuestId).toBe('quest_01_gate_barrier');
      expect(synced.detailedQuestStates!['quest_01_gate_barrier']?.status).toBe('active');
    });

    it('CH-BWD-05: verifies single-active-quest policy is preserved when loading partial quest states', () => {
      const qs = new QuestSystem();
      // Initially, quest_01_gate_barrier is active
      expect(qs.getActiveQuest()?.id).toBe('quest_01_gate_barrier');

      // Load a state that specifies quest_02_deans_password as active, but omits quest_01
      const partialState: Record<string, QuestState> = {
        quest_02_deans_password: {
          id: 'quest_02_deans_password',
          status: 'active',
          currentObjectiveIndex: 0,
          completedObjectives: [],
        },
      };

      qs.loadState(partialState);

      const allStates = qs.getState();
      const activeQuests = Object.values(allStates).filter(s => s.status === 'active');

      // FIX VERIFIED:
      // Exactly ONE quest is marked 'active': quest_02_deans_password.
      // Strict single-active-quest invariant is maintained.
      expect(activeQuests.map(q => q.id)).toEqual(['quest_02_deans_password']);
      expect(activeQuests.length).toBe(1);
      expect(qs.getActiveQuest()?.id).toBe('quest_02_deans_password');
    });

    it('CH-BWD-04: preserves existing legacy inventory items during campaign quest progression', () => {
      const inventory: InventorySlot[] = [
        { itemId: 'repair_tool_v1', count: 1 },
        { itemId: 'scrap_copper_wire', count: 10 },
      ];

      const qs = new QuestSystem(
        questsJson as CampaignQuestRecord[],
        {},
        inventory
      );

      // Complete Quest 1 and Quest 2 (awards item_impulse_debugger)
      qs.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
      qs.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
      qs.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

      expect(qs.getActiveQuest()?.id).toBe('quest_02_deans_password');

      qs.completeObjective('quest_02_deans_password', 'obj_02_inspect_terminal');
      qs.completeObjective('quest_02_deans_password', 'obj_02_find_passcode');
      qs.completeObjective('quest_02_deans_password', 'obj_02_unlock_keypad');
      qs.completeObjective('quest_02_deans_password', 'obj_02_take_debugger');

      // Check inventory: must still contain repair_tool_v1 and scrap_copper_wire, plus item_impulse_debugger
      const inv = qs.getInventory();
      expect(inv.find(i => i.itemId === 'repair_tool_v1')?.count).toBe(1);
      expect(inv.find(i => i.itemId === 'scrap_copper_wire')?.count).toBe(10);
      expect(inv.find(i => i.itemId === 'item_impulse_debugger')?.count).toBe(1);
    });
  });

  // =========================================================================
  // Challenge 3: Radio Transmission Queue Stress Testing
  // =========================================================================
  describe('Dimension 3: Radio Transmission Queue Stress & Memory Robustness', () => {
    let dialogue: DialogueSystem;

    // Helper to generate N mock radio transmission dialogue trees
    function createMockRadioTrees(count: number, basePriority: number = 0): Record<string, DialogueTree> {
      const trees: Record<string, DialogueTree> = {};
      for (let i = 0; i < count; i++) {
        const treeId = `tree_stress_radio_${String(i).padStart(3, '0')}`;
        trees[treeId] = {
          id: treeId,
          isRadio: true,
          priority: basePriority,
          initialNodeId: `node_${treeId}_0`,
          nodes: {
            [`node_${treeId}_0`]: {
              id: `node_${treeId}_0`,
              speaker: 'curator',
              textRu: `Радиосообщение #${i}`,
              textEn: `Radio message #${i}`,
              next: `node_${treeId}_1`,
            },
            [`node_${treeId}_1`]: {
              id: `node_${treeId}_1`,
              speaker: 'curator',
              textRu: `Конец сообщения #${i}`,
              textEn: `End of transmission #${i}`,
              next: null, // End of tree
            },
          },
        };
      }
      return trees;
    }

    beforeEach(() => {
      dialogue = new DialogueSystem();
      dialogue.setQueueCooldown(0);
    });

    it('CH-RAD-01: handles queuing 60 rapid radio transmissions in exact FIFO order', () => {
      const transmissionCount = 60;
      const trees = createMockRadioTrees(transmissionCount, 0);

      for (const tree of Object.values(trees)) {
        dialogue.registerTree(tree);
      }

      const completedOrder: string[] = [];

      // Rapidly enqueue all 60 transmissions
      for (let i = 0; i < transmissionCount; i++) {
        const treeId = `tree_stress_radio_${String(i).padStart(3, '0')}`;
        const enqueued = dialogue.enqueueRadio(treeId, () => {
          completedOrder.push(treeId);
        });
        expect(enqueued).toBe(true);
      }

      // First transmission should be active immediately because engine was idle
      expect(dialogue.isActive()).toBe(true);
      expect(dialogue.getCurrentNode()?.textRu).toBe('Радиосообщение #0');
      // The remaining 59 should be in queue
      expect(dialogue.getQueuedRadioCount()).toBe(59);

      // Advance through all 60 transmissions to completion
      for (let i = 0; i < transmissionCount; i++) {
        const currentTreeId = `tree_stress_radio_${String(i).padStart(3, '0')}`;

        expect(dialogue.isActive()).toBe(true);
        expect(dialogue.getCurrentNode()?.id).toBe(`node_${currentTreeId}_0`);

        // Advance to node 1
        const n1 = dialogue.advance();
        expect(n1).not.toBeNull();
        expect(n1?.id).toBe(`node_${currentTreeId}_1`);

        // Advance to finish (next is null -> triggers finishCurrentDialogue -> pops next in queue)
        dialogue.advance();

        // If not the last transmission, the next transmission should now be playing
        if (i < transmissionCount - 1) {
          expect(dialogue.isActive()).toBe(true);
          const nextTreeId = `tree_stress_radio_${String(i + 1).padStart(3, '0')}`;
          expect(dialogue.getCurrentNode()?.id).toBe(`node_${nextTreeId}_0`);
          expect(dialogue.getQueuedRadioCount()).toBe(transmissionCount - 2 - i);
        }
      }

      // After completing all 60 transmissions:
      expect(dialogue.isActive()).toBe(false);
      expect(dialogue.getQueuedRadioCount()).toBe(0);
      expect(completedOrder).toHaveLength(60);

      // Verify strict FIFO order
      for (let i = 0; i < transmissionCount; i++) {
        const expectedId = `tree_stress_radio_${String(i).padStart(3, '0')}`;
        expect(completedOrder[i]).toBe(expectedId);
      }
    });

    it('CH-RAD-02: respects priority ordering over FIFO for urgent transmissions', () => {
      // 10 normal priority transmissions (priority = 0)
      // 5 emergency transmissions (priority = 10)
      const normalTrees = createMockRadioTrees(10, 0);
      for (const tree of Object.values(normalTrees)) {
        dialogue.registerTree(tree);
      }

      // Start an active non-radio dialogue to hold the line
      dialogue.registerTree({
        id: 'tree_holding_dialogue',
        initialNodeId: 'node_hold',
        nodes: {
          node_hold: {
            id: 'node_hold',
            speaker: 'alexey',
            textRu: 'Ожидание...',
            textEn: 'Holding...',
            next: null,
          },
        },
      });
      dialogue.startDialogue('tree_holding_dialogue');
      expect(dialogue.isActive()).toBe(true);

      const completedLog: string[] = [];

      // Enqueue 5 normal priority transmissions
      for (let i = 0; i < 5; i++) {
        const id = `tree_stress_radio_${String(i).padStart(3, '0')}`;
        dialogue.enqueueRadio(id, () => completedLog.push(id));
      }

      // Enqueue 2 high priority transmissions (priority = 10)
      const urgentTrees: Record<string, DialogueTree> = {
        tree_urgent_01: {
          id: 'tree_urgent_01',
          isRadio: true,
          priority: 10,
          initialNodeId: 'node_u1',
          nodes: { node_u1: { id: 'node_u1', speaker: 'curator', textRu: 'Срочно 1', textEn: 'Urgent 1', next: null } },
        },
        tree_urgent_02: {
          id: 'tree_urgent_02',
          isRadio: true,
          priority: 10,
          initialNodeId: 'node_u2',
          nodes: { node_u2: { id: 'node_u2', speaker: 'curator', textRu: 'Срочно 2', textEn: 'Urgent 2', next: null } },
        },
      };
      for (const t of Object.values(urgentTrees)) {
        dialogue.registerTree(t);
        dialogue.enqueueRadio(t.id, () => completedLog.push(t.id));
      }

      // Enqueue 2 more normal priority transmissions
      for (let i = 5; i < 7; i++) {
        const id = `tree_stress_radio_${String(i).padStart(3, '0')}`;
        dialogue.enqueueRadio(id, () => completedLog.push(id));
      }

      // Release holding dialogue
      dialogue.advance(); // holding finished -> queue starts processing

      // Drain all queued transmissions
      while (dialogue.isActive()) {
        dialogue.advance();
      }

      expect(completedLog).toHaveLength(9);
      // Urgent transmissions must have executed before normal transmissions
      expect(completedLog[0]).toBe('tree_urgent_01');
      expect(completedLog[1]).toBe('tree_urgent_02');
      // Followed by normal transmissions in FIFO order
      expect(completedLog[2]).toBe('tree_stress_radio_000');
      expect(completedLog[3]).toBe('tree_stress_radio_001');
      expect(completedLog[4]).toBe('tree_stress_radio_002');
      expect(completedLog[5]).toBe('tree_stress_radio_003');
      expect(completedLog[6]).toBe('tree_stress_radio_004');
      expect(completedLog[7]).toBe('tree_stress_radio_005');
      expect(completedLog[8]).toBe('tree_stress_radio_006');
    });

    it('CH-RAD-03: handles re-entrant transmission queuing from within onComplete callbacks', () => {
      const trees = createMockRadioTrees(10, 0);
      for (const tree of Object.values(trees)) {
        dialogue.registerTree(tree);
      }

      const executionTrace: string[] = [];

      // When transmission 0 finishes, it enqueues transmission 2
      dialogue.enqueueRadio('tree_stress_radio_000', () => {
        executionTrace.push('complete_000');
        dialogue.enqueueRadio('tree_stress_radio_002', () => {
          executionTrace.push('complete_002');
        });
      });

      // Enqueue transmission 1
      dialogue.enqueueRadio('tree_stress_radio_001', () => {
        executionTrace.push('complete_001');
      });

      // Drain
      while (dialogue.isActive()) {
        dialogue.advance();
      }

      // Expected order:
      // 000 finishes -> completes, enqueues 002 at end of queue
      // 001 finishes -> completes
      // 002 runs and finishes -> completes
      expect(executionTrace).toEqual(['complete_000', 'complete_001', 'complete_002']);
      expect(dialogue.getQueuedRadioCount()).toBe(0);
      expect(dialogue.isActive()).toBe(false);
    });

    it('CH-RAD-04: verifies event listener cleanup and prevention of memory leaks', () => {
      let eventCount = 0;
      const unsubs: Array<() => void> = [];

      // Register 50 listeners
      for (let i = 0; i < 50; i++) {
        unsubs.push(
          dialogue.onEvent(() => {
            eventCount++;
          })
        );
      }

      const trees = createMockRadioTrees(5, 0);
      for (const tree of Object.values(trees)) {
        dialogue.registerTree(tree);
      }

      // Enqueue one transmission: triggers RADIO_ENQUEUED and DIALOGUE_STARTED
      dialogue.enqueueRadio('tree_stress_radio_000');
      const eventsAfterOne = eventCount;
      expect(eventsAfterOne).toBeGreaterThan(0);

      // Unsubscribe all 50 listeners
      for (const unsub of unsubs) {
        unsub();
      }

      // Advance and complete
      dialogue.advance(); // node 1
      dialogue.advance(); // complete

      // Event count should not have increased after unsubscription
      expect(eventCount).toBe(eventsAfterOne);
    });

    it('CH-RAD-05: prevents auto-advance timer collisions during rapid advance calls', () => {
      vi.useFakeTimers();

      // Tree with auto_advance mode
      dialogue.registerTree({
        id: 'tree_auto_stress',
        isRadio: true,
        initialNodeId: 'node_auto_0',
        nodes: {
          node_auto_0: {
            id: 'node_auto_0',
            speaker: 'curator',
            textRu: 'Текст 0',
            textEn: 'Text 0',
            mode: 'auto_advance',
            autoAdvanceDelayMs: 5000,
            next: 'node_auto_1',
          },
          node_auto_1: {
            id: 'node_auto_1',
            speaker: 'curator',
            textRu: 'Текст 1',
            textEn: 'Text 1',
            mode: 'auto_advance',
            autoAdvanceDelayMs: 5000,
            next: null,
          },
        },
      });

      dialogue.enqueueRadio('tree_auto_stress');
      expect(dialogue.getCurrentNode()?.id).toBe('node_auto_0');

      // User manually advances immediately before timer fires
      dialogue.advance();
      expect(dialogue.getCurrentNode()?.id).toBe('node_auto_1');

      // Fast-forward time past 5000ms: the old timer from node 0 must NOT trigger another advance
      // Only the timer for node 1 should fire after 5000ms
      vi.advanceTimersByTime(4999);
      expect(dialogue.isActive()).toBe(true);
      expect(dialogue.getCurrentNode()?.id).toBe('node_auto_1');

      vi.advanceTimersByTime(1);
      // Now node 1 timer fires and finishes the dialogue
      expect(dialogue.isActive()).toBe(false);

      vi.useRealTimers();
    });

    it('CH-RAD-06: gracefully rejects non-existent tree without corrupting existing queue', () => {
      const trees = createMockRadioTrees(3, 0);
      for (const tree of Object.values(trees)) {
        dialogue.registerTree(tree);
      }

      dialogue.enqueueRadio('tree_stress_radio_000');
      // Attempt to queue a non-existent tree
      const invalidResult = dialogue.enqueueRadio('NON_EXISTENT_TREE_ID');
      expect(invalidResult).toBe(false);

      // Queue valid tree
      dialogue.enqueueRadio('tree_stress_radio_001');

      expect(dialogue.getQueuedRadioCount()).toBe(1); // 000 is active, 001 is queued

      // Drain
      while (dialogue.isActive()) {
        dialogue.advance();
      }
      expect(dialogue.getQueuedRadioCount()).toBe(0);
      expect(dialogue.isActive()).toBe(false);
    });

    it('CH-RAD-07: edge case: stopDialogue halts active transmission but preserves or clears safely', () => {
      const trees = createMockRadioTrees(3, 0);
      for (const tree of Object.values(trees)) {
        dialogue.registerTree(tree);
      }

      dialogue.enqueueRadio('tree_stress_radio_000');
      dialogue.enqueueRadio('tree_stress_radio_001');
      expect(dialogue.isActive()).toBe(true);

      dialogue.stopDialogue();
      expect(dialogue.isActive()).toBe(false);
      expect(dialogue.getCurrentNode()).toBeNull();
      expect(dialogue.getCurrentSpeaker()).toBeNull();

      // Enqueueing a new transmission should resume playback smoothly
      dialogue.enqueueRadio('tree_stress_radio_002');
      expect(dialogue.isActive()).toBe(true);
    });

    it('CH-RAD-08: verifies queue recovery when a queued tree has a missing initialNodeId', () => {
      // Register a malformed tree where initialNodeId points to non-existent node
      dialogue.registerTree({
        id: 'tree_malformed',
        isRadio: true,
        initialNodeId: 'node_does_not_exist',
        nodes: {},
      });

      const validTrees = createMockRadioTrees(3, 0);
      for (const tree of Object.values(validTrees)) {
        dialogue.registerTree(tree);
      }

      // Enqueue valid 000, malformed, then valid 001
      dialogue.enqueueRadio('tree_stress_radio_000');
      dialogue.enqueueRadio('tree_malformed');
      dialogue.enqueueRadio('tree_stress_radio_001');

      expect(dialogue.isActive()).toBe(true);
      expect(dialogue.getQueuedRadioCount()).toBe(2);

      // Finish tree 000:
      // node 0 -> node 1 -> finish
      dialogue.advance(); // node 1
      dialogue.advance(); // finish tree 000 -> pops 'tree_malformed' -> startDialogue logs error and recovers queue

      // FIX VERIFIED:
      // When startDialogue fails on 'tree_malformed', processNextInQueue() is called:
      // 'tree_stress_radio_001' automatically plays!
      expect(dialogue.isActive()).toBe(true);
      expect(dialogue.getCurrentNode()?.id).toBe('node_tree_stress_radio_001_0');
      expect(dialogue.getQueuedRadioCount()).toBe(0);
    });
  });
});
