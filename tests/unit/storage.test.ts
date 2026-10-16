import { describe, it, expect } from 'vitest';
import { StorageService, CURRENT_SCHEMA_VERSION } from '../../src/utils/storage';
import type { SaveData } from '../../src/types';

describe('StorageService Validation & Fallback', () => {
  const validSave: SaveData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    buildId: 'v1.0.0-test',
    timestamp: Date.now(),
    playerScene: 'DistrictScene',
    position: { x: 5, y: 5 },
    stamina: 100,
    toolCharge: 100,
    inventory: [],
    storage: [],
    collectedIds: [],
    containerStates: {},
    doorStates: {},
    questStates: { p0_robot_recovery: 'active' },
    worldFlags: {},
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
  };

  it('validates a correct SaveData object', () => {
    expect(StorageService.validateSaveData(validSave)).toBe(true);
  });

  it('rejects invalid or outdated schema version', () => {
    const invalid = { ...validSave, schemaVersion: 999 };
    // Should still fail if schema version doesn't match CURRENT_SCHEMA_VERSION
    expect(StorageService.validateSaveData(invalid)).toBe(false);
  });

  it('rejects malformed data structures', () => {
    expect(StorageService.validateSaveData(null)).toBe(false);
    expect(StorageService.validateSaveData({})).toBe(false);
    expect(StorageService.validateSaveData({ schemaVersion: CURRENT_SCHEMA_VERSION })).toBe(false);
  });
});
