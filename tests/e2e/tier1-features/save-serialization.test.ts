/**
 * Tier 1: Feature Coverage — Feature 4: Campaign Save/Load Serialization
 * Authoritative source: PROJECT.md § Feature Inventory #4, src/utils/storage.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';
import { StorageService, CURRENT_SCHEMA_VERSION } from '@/utils/storage';

describe('Tier 1: Campaign Save/Load Serialization (Feature 4)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('serializes complete campaign state matching SaveData v1 schema', () => {
    driver.addItem('item_impulse_debugger', 1);
    driver.addItem('item_module_wheels', 4);
    driver.playerPosition = { x: 7.5, y: 12.0 };
    driver.setWorldFlag('FLAG_GATE_BYPASSED', true);

    const save = driver.createSaveData();
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(save.buildId).toBe('v1.0.0-cybershield');
    expect(save.position.x).toBe(7.5);
    expect(save.position.y).toBe(12.0);
    expect(save.inventory.length).toBe(2);
    expect(save.worldFlags.FLAG_GATE_BYPASSED).toBe(true);

    // Validate with StorageService
    // StorageService validates standard SaveData format
    const isValid = StorageService.validateSaveData({
      ...save,
      worldFlags: { FLAG_GATE_BYPASSED: true },
    });
    expect(isValid).toBe(true);
  });

  it('restores active quest and completed quest progress across save/load', () => {
    // Complete Quest 1 and start Quest 2
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    driver.quest.startQuest('quest_02_deans_password');

    const save = driver.createSaveData();

    // Create a new fresh driver and restore
    const restoredDriver = createCampaignDriver();
    const success = restoredDriver.loadSaveData(save);
    expect(success).toBe(true);

    expect(restoredDriver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(restoredDriver.quest.getActiveQuest()?.id).toBe('quest_02_deans_password');
    expect(restoredDriver.getWorldFlags().FLAG_GATE_BYPASSED).toBe(true);
  });

  it('preserves inventory items and stack counts exactly across save/load', () => {
    driver.addItem('item_server_keyring', 1);
    driver.addItem('item_module_battery', 3);
    driver.addItem('item_module_casing', 2);

    const save = driver.createSaveData();

    const restoredDriver = createCampaignDriver();
    restoredDriver.loadSaveData(save);

    expect(restoredDriver.getItemCount('item_server_keyring')).toBe(1);
    expect(restoredDriver.getItemCount('item_module_battery')).toBe(3);
    expect(restoredDriver.getItemCount('item_module_casing')).toBe(2);
    expect(restoredDriver.hasItem('non_existent_item')).toBe(false);
  });

  it('restores diorama zone location, coordinates, and lighting conditions', async () => {
    await driver.diorama.loadZone('zone_04_lab_corridor');
    driver.setWorldFlag('FLAG_POWER_RESTORED', true);
    driver.diorama.setLightingState('warm_restored');
    driver.playerPosition = { x: 14.2, y: 3.8 };

    const save = driver.createSaveData();
    expect(save.playerScene).toBe('zone_04_lab_corridor');

    const restoredDriver = createCampaignDriver();
    restoredDriver.loadSaveData(save);

    expect(restoredDriver.diorama.getActiveZone()).toBe('zone_04_lab_corridor');
    expect(restoredDriver.diorama.getLightingState()).toBe('warm_restored');
    expect(restoredDriver.playerPosition.x).toBeCloseTo(14.2);
    expect(restoredDriver.playerPosition.y).toBeCloseTo(3.8);
  });

  it('preserves door states and persistent world flags across save/load', () => {
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);
    expect(driver.keypad.isUnlocked()).toBe(true);

    driver.setWorldFlag('FLAG_DEANS_DOOR_UNLOCKED', true);
    driver.setWorldFlag('FLAG_JAMMER_DISABLED', true);

    const save = driver.createSaveData();
    expect(save.doorStates.deans_office_door).toBe(true);

    const restoredDriver = createCampaignDriver();
    restoredDriver.loadSaveData(save);

    expect(restoredDriver.getWorldFlags().FLAG_DEANS_DOOR_UNLOCKED).toBe(true);
    expect(restoredDriver.getWorldFlags().FLAG_JAMMER_DISABLED).toBe(true);
  });

  it('rejects corrupted or incompatible save schema versions upon load', () => {
    const save = driver.createSaveData();
    // Corrupt schema version
    const invalidSave = { ...save, schemaVersion: 999 };

    const restoredDriver = createCampaignDriver();
    const result = restoredDriver.loadSaveData(invalidSave);
    expect(result).toBe(false);
  });
});
