/**
 * Tier 2: Boundary & Corner Cases — Campaign Save & State Persistence Boundaries
 * Authoritative source: TEST_INFRA.md line 45, PROJECT.md § Feature #4, src/utils/storage.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService, CURRENT_SCHEMA_VERSION } from '@/utils/storage';
import { createCampaignDriver } from '../harness';
import type { SaveData } from '@/types';

describe('Tier 2: Campaign Save/Load & StorageService Boundaries (Feature 4)', () => {
  const SAVE_KEY = 'project_sentinel_savedata';
  const BACKUP_KEY = 'project_sentinel_savedata_backup';

  class StorageMock {
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

  let mockStorage: StorageMock;
  let originalLocalStorage: unknown;

  beforeEach(() => {
    mockStorage = new StorageMock();
    originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    StorageService.clearMemoryFallback();
  });

  const createValidBaseSave = (): SaveData => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    buildId: 'v1.0.0-cybershield',
    timestamp: 1729255800000,
    playerScene: 'DioramaScene',
    position: { x: 10.5, y: 15.0 },
    stamina: 100,
    toolCharge: 100,
    inventory: [
      { itemId: 'item_impulse_debugger', count: 1 },
      { itemId: 'item_module_battery', count: 1 },
    ],
    storage: [],
    collectedIds: ['prop_debugger_desk'],
    containerStates: {},
    doorStates: { deans_door: true },
    questStates: {
      quest_01_gate_barrier: 'completed',
      quest_02_deans_password: 'completed',
      quest_03_blocker_disassembly: 'active',
    },
    worldFlags: {
      FLAG_GATE_BYPASSED: true,
      FLAG_DEANS_DOOR_UNLOCKED: true,
    },
    robotStates: [],
    settings: {
      soundVolume: 0.9,
      musicVolume: 0.8,
      language: 'ru',
    },
    activeQuestId: 'quest_03_blocker_disassembly',
    completedQuestIds: ['quest_01_gate_barrier', 'quest_02_deans_password'],
    currentAct: 1,
    campaignEnding: null,
  });

  it('Edge Case 1: recovers valid backup when primary save JSON string is corrupted (SyntaxError)', () => {
    const validSave = createValidBaseSave();

    // 1. Initial save sets primary and backup
    StorageService.saveGame(validSave);
    expect(mockStorage.getItem(SAVE_KEY)).not.toBeNull();

    // 2. Modify and save again so BACKUP_KEY holds valid previous save
    const updatedSave: SaveData = {
      ...validSave,
      position: { x: 12.0, y: 18.0 },
      activeQuestId: 'quest_04_lab_darkness',
    };
    StorageService.saveGame(updatedSave);

    expect(mockStorage.getItem(BACKUP_KEY)).toContain('quest_03_blocker_disassembly');

    // 3. Corrupt primary save with malformed JSON
    mockStorage.setItem(SAVE_KEY, '<<<CORRUPTED_RAW_BINARY_DATA_{{{');

    // 4. loadGame should catch parse error, warn, and restore from BACKUP_KEY
    const restored = StorageService.loadGame();
    expect(restored).not.toBeNull();
    expect(restored?.activeQuestId).toBe('quest_03_blocker_disassembly');
    expect(restored?.position.x).toBe(10.5);
  });

  it('Edge Case 2: rejects schema mismatches and invalid structural types cleanly', () => {
    const base = createValidBaseSave();

    // 1. Invalid schema version
    expect(StorageService.validateSaveData({ ...base, schemaVersion: 2 })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, schemaVersion: 0 })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, schemaVersion: -1 })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, schemaVersion: '1' })).toBe(false);

    // 2. Non-object or null root
    expect(StorageService.validateSaveData(null)).toBe(false);
    expect(StorageService.validateSaveData(undefined)).toBe(false);
    expect(StorageService.validateSaveData('not_an_object')).toBe(false);
    expect(StorageService.validateSaveData(12345)).toBe(false);

    // 3. Invalid coordinates or missing position
    expect(StorageService.validateSaveData({ ...base, position: null })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, position: { x: 'ten', y: 15 } })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, position: { x: 10 } })).toBe(false);

    // 4. Non-array inventory
    expect(StorageService.validateSaveData({ ...base, inventory: null })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, inventory: 'item_impulse_debugger' })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, inventory: { itemId: 'item_impulse_debugger', count: 1 } })).toBe(false);

    // 5. Missing buildId or playerScene
    expect(StorageService.validateSaveData({ ...base, buildId: null })).toBe(false);
    expect(StorageService.validateSaveData({ ...base, playerScene: 42 })).toBe(false);
  });

  it('Edge Case 3: returns null gracefully without throwing when both primary and backup saves are corrupt', () => {
    mockStorage.setItem(SAVE_KEY, 'MALFORMED_PRIMARY_{');
    mockStorage.setItem(BACKUP_KEY, 'MALFORMED_BACKUP_{');

    expect(() => {
      const result = StorageService.loadGame();
      expect(result).toBeNull();
    }).not.toThrow();

    expect(() => {
      const backupResult = StorageService.loadBackup();
      expect(backupResult).toBeNull();
    }).not.toThrow();
  });

  it('Edge Case 4: preserves Cyrillic UTF-8 encoding across save and load cycles without corruption', () => {
    const saveWithCyrillic: SaveData = {
      ...createValidBaseSave(),
      buildId: 'cybershield-сборка-0.1.0-финал',
      worldFlags: {
        FLAG_GATE_BYPASSED: true,
        FLAG_СЕРВЕР_РАЗБЛОКИРОВАН: true,
      },
      robotStates: [
        {
          id: 'robot_dog_01',
          name: 'Робопёс-хранитель ключей деканата',
          position: { x: 18.5, y: 22.0 },
          status: 'idle',
          charge: 95,
        },
      ],
      settings: {
        soundVolume: 1.0,
        musicVolume: 0.5,
        language: 'ru',
      },
    };

    const saved = StorageService.saveGame(saveWithCyrillic);
    expect(saved).toBe(true);

    const loaded = StorageService.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.buildId).toBe('cybershield-сборка-0.1.0-финал');
    expect(loaded?.robotStates?.[0]?.name).toBe('Робопёс-хранитель ключей деканата');
    expect(loaded?.worldFlags?.['FLAG_СЕРВЕР_РАЗБЛОКИРОВАН']).toBe(true);
  });

  it('Edge Case 5: handles empty, minimal payloads and backward-compatible baseline saves safely', () => {
    // 1. Completely empty object rejects validation
    expect(StorageService.validateSaveData({})).toBe(false);

    // 2. Minimal valid schema with empty arrays and zero position passes validation
    const minimalSave: SaveData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      buildId: 'v1.0.0-min',
      timestamp: Date.now(),
      playerScene: 'DistrictScene',
      position: { x: 0, y: 0 },
      stamina: 0,
      toolCharge: 0,
      inventory: [],
      storage: [],
      collectedIds: [],
      containerStates: {},
      doorStates: {},
      questStates: {},
      worldFlags: {},
      robotStates: [],
      settings: { soundVolume: 1, musicVolume: 1, language: 'en' },
    };

    expect(StorageService.validateSaveData(minimalSave)).toBe(true);
    StorageService.saveGame(minimalSave);
    const restored = StorageService.loadGame();
    expect(restored).not.toBeNull();
    expect(restored?.inventory).toEqual([]);

    // 3. CampaignDriver gracefully restores from minimal save
    const freshDriver = createCampaignDriver();
    const loadedIntoDriver = freshDriver.loadSaveData(minimalSave);
    expect(loadedIntoDriver).toBe(true);
  });

  it('Edge Case 6: falls back to in-memory storage safely when localStorage is undefined', () => {
    // Unset localStorage completely (simulating headless Node without DOM)
    delete (globalThis as { localStorage?: unknown }).localStorage;

    const testSave = createValidBaseSave();

    // Must not throw ReferenceError: localStorage is not defined
    expect(() => {
      const saved = StorageService.saveGame(testSave);
      expect(saved).toBe(true);
    }).not.toThrow();

    expect(() => {
      const loaded = StorageService.loadGame();
      expect(loaded).not.toBeNull();
      expect(loaded?.activeQuestId).toBe('quest_03_blocker_disassembly');
    }).not.toThrow();
  });
});
