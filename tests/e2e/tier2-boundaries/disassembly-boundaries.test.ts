/**
 * Tier 2: Boundary & Corner Cases — Disassembly & Item Drops Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #3, #4, Документ.pdf p. 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Disassembly & Item Drops Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: handles robot disassembly when inventory is 100% full', () => {
    // Fill up all inventory slots
    driver.setMaxInventorySlots(2);
    driver.addItem('dummy_item_1', 1);
    driver.addItem('dummy_item_2', 1);

    // Disassemble Blocker Bot
    driver.debugger.aimAt('blocker_bot_01');
    const pulse = driver.debugger.firePulse();
    expect(pulse.hit).toBe(true);

    // Drops spawn on ground because backpack is full
    for (const mod of pulse.disassembledModules!) {
      driver.spawnGroundDrop(mod, { x: 5, y: 5 });
    }

    expect(driver.groundDrops.length).toBe(4);
    // Attempting collection should fail because inventory is full
    const collectAttempt = driver.collectGroundDrop(driver.groundDrops[0]!.id);
    expect(collectAttempt).toBe(false);
    expect(driver.groundDrops.length).toBe(4); // Remains on ground
  });

  it('Edge Case 2: preserves ground drops when player changes scenes and returns', async () => {
    await driver.diorama.loadZone('zone_03_courtyard_alley');
    const drop = driver.spawnGroundDrop('item_module_wheels', { x: 4.2, y: 8.1 });
    expect(driver.groundDrops.length).toBe(1);

    // Player transitions to Lab corridor
    await driver.diorama.loadZone('zone_04_lab_corridor');
    // Ground drop remains in state
    expect(driver.groundDrops.length).toBe(1);
    expect(driver.groundDrops[0]?.zone).toBe('zone_03_courtyard_alley');

    // Player returns to Courtyard
    await driver.diorama.loadZone('zone_03_courtyard_alley');
    const collected = driver.collectGroundDrop(drop.id);
    expect(collected).toBe(true);
    expect(driver.groundDrops.length).toBe(0);
    expect(driver.getItemCount('item_module_wheels')).toBe(1);
  });

  it('Edge Case 3: handles partial pickup of dropped modules', () => {
    const drop1 = driver.spawnGroundDrop('item_module_wheels', { x: 1, y: 1 });
    const drop2 = driver.spawnGroundDrop('item_module_casing', { x: 1, y: 2 });
    const drop3 = driver.spawnGroundDrop('item_module_camera', { x: 1, y: 3 });
    const drop4 = driver.spawnGroundDrop('item_module_battery', { x: 1, y: 4 });

    // Collect 2 of 4 items
    driver.collectGroundDrop(drop1.id);
    driver.collectGroundDrop(drop4.id);

    expect(driver.groundDrops.length).toBe(2);
    expect(driver.groundDrops.map((d) => d.id)).toEqual([drop2.id, drop3.id]);
    expect(driver.hasItem('item_module_wheels')).toBe(true);
    expect(driver.hasItem('item_module_battery')).toBe(true);
    expect(driver.hasItem('item_module_casing')).toBe(false);
  });

  it('Edge Case 4: serializes and restores ground drops across game saves', () => {
    driver.spawnGroundDrop('item_module_camera', { x: 7.7, y: 3.3 });
    const save = driver.createSaveData();
    expect(save.groundDrops.length).toBe(1);

    const freshDriver = createCampaignDriver();
    freshDriver.loadSaveData(save);

    expect(freshDriver.groundDrops.length).toBe(1);
    expect(freshDriver.groundDrops[0]?.itemId).toBe('item_module_camera');
    expect(freshDriver.groundDrops[0]?.position.x).toBeCloseTo(7.7);
  });

  it('Edge Case 5: handles stress conditions with multiple simultaneous drops in single diorama', () => {
    for (let i = 0; i < 20; i++) {
      driver.spawnGroundDrop(`item_scrap_${i}`, { x: i, y: i });
    }
    expect(driver.groundDrops.length).toBe(20);

    // Collect 10 items
    for (let i = 0; i < 10; i++) {
      const drop = driver.groundDrops[0];
      if (drop) driver.collectGroundDrop(drop.id);
    }
    expect(driver.groundDrops.length).toBe(10);
  });
});
