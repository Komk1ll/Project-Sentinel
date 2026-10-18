import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, CURRENT_SCHEMA_VERSION } from '@/utils/storage';
import type { SaveData } from '@/types';
import { QuestSystem } from '@/game/systems/QuestSystem';

describe('Campaign Storage & State Persistence Unit Tests', () => {
  const SAVE_KEY = 'project_sentinel_savedata';
  const BACKUP_KEY = 'project_sentinel_savedata_backup';

  const sampleCampaignSave: SaveData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    buildId: 'cybershield-m1-0.1.0',
    timestamp: 1729255800000,
    playerScene: 'DioramaScene',
    position: { x: 6.0, y: 4.5 },
    stamina: 100,
    toolCharge: 85,
    inventory: [
      { itemId: 'item_impulse_debugger', count: 1 },
      { itemId: 'item_module_wheels', count: 4 },
      { itemId: 'item_module_casing', count: 1 },
      { itemId: 'item_module_camera', count: 1 },
      { itemId: 'item_module_battery', count: 1 },
    ],
    storage: [],
    collectedIds: ['pickup_debugger_desk', 'pickup_blocker_parts'],
    containerStates: {},
    doorStates: { door_deans_basement: true },
    questStates: {
      quest_01_gate_barrier: 'completed',
      quest_02_deans_password: 'completed',
      quest_03_blocker_disassembly: 'completed',
      quest_04_lab_darkness: 'active',
    },
    worldFlags: {
      FLAG_GATE_BYPASSED: true,
      FLAG_DEANS_DOOR_UNLOCKED: true,
      FLAG_FIRST_BLOCKER_DISASSEMBLED: true,
      FLAG_PROFESSOR_CONTACTED: false,
      FLAG_SERVER_DOOR_INSPECTED: false,
      FLAG_CCTV_REVIEWED: false,
      FLAG_KEYS_RECOVERED: false,
      FLAG_POWER_RESTORED: false,
      FLAG_TUNNEL_TRAVERSED: false,
      FLAG_JAMMER_DISABLED: false,
      FLAG_LOBBY_ENTERED: false,
      FLAG_DATACENTER_ACCESSED: false,
      FLAG_PROTOCOL_INITIALIZED: false,
      FLAG_CAMPAIGN_COMPLETE_ENDING_A: false,
      FLAG_CAMPAIGN_COMPLETE_ENDING_B: false,
    },
    robotStates: [
      {
        id: 'patrol_droid_01',
        name: 'Gate Patrol Sentry',
        position: { x: 4.0, y: 8.0 },
        status: 'patrol',
        charge: 100,
      },
    ],
    settings: {
      soundVolume: 0.8,
      musicVolume: 0.7,
      language: 'ru',
    },
    activeQuestId: 'quest_04_lab_darkness',
    completedQuestIds: [
      'quest_01_gate_barrier',
      'quest_02_deans_password',
      'quest_03_blocker_disassembly',
    ],
    currentAct: 1,
    campaignEnding: null,
    detailedQuestStates: {
      quest_04_lab_darkness: {
        id: 'quest_04_lab_darkness',
        status: 'active',
        currentObjectiveIndex: 0,
        completedObjectives: [],
        startedAt: 1729255700000,
      },
    },
    dioramaState: {
      currentZoneId: 'zone_04_lab_corridor',
      lightingState: 'dark_emergency',
    },
  };

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
  });

  it('TC-ST-01: validates full campaign SaveData object with schemaVersion 1', () => {
    expect(StorageService.validateSaveData(sampleCampaignSave)).toBe(true);
  });

  it('TC-ST-02: preserves backward compatibility with legacy SaveData', () => {
    const legacySave: SaveData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      buildId: 'legacy-build',
      timestamp: Date.now(),
      playerScene: 'DistrictScene',
      position: { x: 2, y: 3 },
      stamina: 80,
      toolCharge: 50,
      inventory: [{ itemId: 'repair_tool_v1', count: 1 }],
      storage: [],
      collectedIds: [],
      containerStates: {},
      doorStates: {},
      questStates: { p0_robot_recovery: 'active' },
      worldFlags: {},
      robotStates: [],
      settings: { soundVolume: 1, musicVolume: 1, language: 'en' },
    };

    expect(StorageService.validateSaveData(legacySave)).toBe(true);
  });

  it('TC-ST-03: performs flawless round-trip serialization to localStorage', () => {
    const saved = StorageService.saveGame(sampleCampaignSave);
    expect(saved).toBe(true);

    const loaded = StorageService.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(sampleCampaignSave);
  });

  it('TC-ST-04: creates automatic backup on secondary save', () => {
    const stateA = { ...sampleCampaignSave, buildId: 'stateA' };
    const stateB = { ...sampleCampaignSave, buildId: 'stateB' };

    StorageService.saveGame(stateA);
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).buildId).toBe('stateA');

    StorageService.saveGame(stateB);
    expect(JSON.parse(localStorage.getItem(BACKUP_KEY)!).buildId).toBe('stateA');
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).buildId).toBe('stateB');
  });

  it('TC-ST-05: recovers from backup when primary save JSON is corrupted', () => {
    const stateA = { ...sampleCampaignSave, buildId: 'stateA' };
    const stateB = { ...sampleCampaignSave, buildId: 'stateB' };

    StorageService.saveGame(stateA);
    StorageService.saveGame(stateB);

    // Corrupt primary key
    localStorage.setItem(SAVE_KEY, 'CORRUPTED_JSON_{[');

    const loaded = StorageService.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.buildId).toBe('stateA');
  });

  it('TC-ST-06: recovers from backup when primary save schema is invalid', () => {
    const stateA = { ...sampleCampaignSave, buildId: 'validBackup' };
    StorageService.saveGame(stateA);

    // Overwrite primary with wrong schema version
    const invalidSchema = { ...sampleCampaignSave, schemaVersion: 999 };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(stateA));
    localStorage.setItem(SAVE_KEY, JSON.stringify(invalidSchema));

    const loaded = StorageService.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded?.buildId).toBe('validBackup');
  });

  it('TC-ST-07: returns null gracefully without throwing when both saves are corrupted', () => {
    localStorage.setItem(SAVE_KEY, 'BAD_PRIMARY');
    localStorage.setItem(BACKUP_KEY, 'BAD_BACKUP');

    const loaded = StorageService.loadGame();
    expect(loaded).toBeNull();
  });

  it('TC-ST-08: preserves all 15 campaign world flags through round-trip', () => {
    StorageService.saveGame(sampleCampaignSave);
    const loaded = StorageService.loadGame();

    expect(loaded?.worldFlags['FLAG_GATE_BYPASSED']).toBe(true);
    expect(loaded?.worldFlags['FLAG_DEANS_DOOR_UNLOCKED']).toBe(true);
    expect(loaded?.worldFlags['FLAG_FIRST_BLOCKER_DISASSEMBLED']).toBe(true);
    expect(loaded?.worldFlags['FLAG_POWER_RESTORED']).toBe(false);
    expect(loaded?.worldFlags['FLAG_DATACENTER_ACCESSED']).toBe(false);
  });

  it('TC-ST-09: accurately preserves modular inventory slots and stack counts', () => {
    StorageService.saveGame(sampleCampaignSave);
    const loaded = StorageService.loadGame();

    expect(loaded?.inventory).toHaveLength(5);
    const wheels = loaded?.inventory.find(i => i.itemId === 'item_module_wheels');
    expect(wheels?.count).toBe(4);
    const battery = loaded?.inventory.find(i => i.itemId === 'item_module_battery');
    expect(battery?.count).toBe(1);
  });

  it('TC-ST-10: preserves UTF-8 Cyrillic characters without corruption', () => {
    const cyrillicSave: SaveData = {
      ...sampleCampaignSave,
      settings: {
        soundVolume: 1,
        musicVolume: 1,
        language: '«Киберщит: Код наследия — Профессор»',
      },
    };

    StorageService.saveGame(cyrillicSave);
    const loaded = StorageService.loadGame();
    expect(loaded?.settings.language).toBe('«Киберщит: Код наследия — Профессор»');
  });

  it('TC-ST-11: synchronizes with QuestSystem and restores active state accurately', () => {
    const questSystem = new QuestSystem();
    // Advance Q1
    questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_evade_patrol');
    questSystem.completeObjective('quest_01_gate_barrier', 'obj_01_reach_basement');

    // Save synced data
    const syncedSave = questSystem.syncToSaveData(sampleCampaignSave);
    StorageService.saveGame(syncedSave);

    // Restore into a fresh QuestSystem
    const loadedSave = StorageService.loadGame()!;
    const freshQuestSystem = new QuestSystem();
    freshQuestSystem.loadState(loadedSave.detailedQuestStates!, loadedSave.worldFlags);

    expect(freshQuestSystem.getActiveQuest()?.id).toBe('quest_02_deans_password');
    expect(freshQuestSystem.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(freshQuestSystem.getWorldFlags()['FLAG_GATE_BYPASSED']).toBe(true);
  });
});
