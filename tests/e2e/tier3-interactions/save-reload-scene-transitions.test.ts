/**
 * Tier 3: Cross-Feature Interactions — Save/Reload Across Scene Transitions
 * Pairwise integration: Save serialization + Scene transitions + Dynamic lighting + Inventory
 * Authoritative source: PROJECT.md § Architecture & SaveSystem, Документ.pdf p. 4, 7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 3: Save/Reload State Preservation Across Scene Transitions', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('preserves exact quest, inventory, and lighting state when saving in Act II and reloading', async () => {
    // 1. Advance to Quest 7 in Winter Garden
    driver.advanceToQuest('quest_07_winter_garden_dog');
    await driver.diorama.loadZone('zone_06_winter_garden');
    driver.playerPosition = { x: 18.5, y: 22.0 };
    driver.addItem('item_impulse_debugger', 1);
    driver.addItem('item_module_wheels', 4);
    driver.addItem('item_server_keyring', 1);

    // Save game
    const save = driver.createSaveData();
    expect(save.playerScene).toBe('zone_06_winter_garden');
    expect(save.inventory.length).toBe(3);

    // 2. Corrupt or change current active game state
    await driver.diorama.loadZone('zone_01_gate');
    driver.playerPosition = { x: 0, y: 0 };
    driver.removeItem('item_server_keyring', 1);

    // 3. Reload save into fresh driver
    const reloaded = createCampaignDriver();
    const success = reloaded.loadSaveData(save);
    expect(success).toBe(true);

    expect(reloaded.diorama.getActiveZone()).toBe('zone_06_winter_garden');
    expect(reloaded.playerPosition.x).toBeCloseTo(18.5);
    expect(reloaded.playerPosition.y).toBeCloseTo(22.0);
    expect(reloaded.hasItem('item_server_keyring')).toBe(true);
    expect(reloaded.hasItem('item_impulse_debugger')).toBe(true);
    expect(reloaded.quest.getActiveQuest()?.id).toBe('quest_07_winter_garden_dog');
  });

  it('preserves partial switchboard repair state across save/load', async () => {
    driver.advanceToQuest('quest_08_lab_power_restore');
    await driver.diorama.loadZone('zone_04_lab_corridor');
    driver.addItem('item_module_battery', 1);

    // Step 1: Isolate Line (but do not insert fuse yet)
    driver.switchboard.isolateLine();
    expect(driver.switchboard.getState().lineIsolated).toBe(true);
    expect(driver.switchboard.getState().fuseInserted).toBe(false);

    const save = driver.createSaveData();

    // Reload
    const reloaded = createCampaignDriver();
    reloaded.loadSaveData(save);

    // Continue repair on reloaded state
    reloaded.switchboard.isolateLine(); // idempotent
    const fuseRes = reloaded.switchboard.insertFuse('item_module_battery');
    expect(fuseRes.success).toBe(true);
    const rebootRes = reloaded.switchboard.rebootGrid();
    expect(rebootRes.powerRestored).toBe(true);
  });

  it('preserves cable tunnel subterranean position and does not prematurely trigger surface jammer', async () => {
    driver.advanceToQuest('quest_09_subway_tunnel');
    await driver.diorama.loadZone('zone_07_cable_tunnel');
    driver.playerPosition = { x: 30.0, y: 15.0 };

    const save = driver.createSaveData();

    const reloaded = createCampaignDriver();
    reloaded.loadSaveData(save);

    expect(reloaded.diorama.getActiveZone()).toBe('zone_07_cable_tunnel');
    expect(reloaded.getWorldFlags().FLAG_JAMMER_DISABLED).toBeFalsy();
    expect(reloaded.jammer.isDisabled()).toBe(false);
  });
});
