/**
 * Tier 1: Feature Coverage — Feature 13: Modular Robot Disassembly
 * Authoritative source: Документ.pdf p. 2, panel 3, PROJECT.md § Feature Inventory #13
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Modular Robot Disassembly (Feature 13)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('produces exactly 4 constituent module types upon Blocker Bot disassembly', () => {
    driver.debugger.aimAt('blocker_bot_01');
    const result = driver.debugger.firePulse();

    expect(result.hit).toBe(true);
    expect(result.disassembledModules).toEqual([
      'item_module_wheels',
      'item_module_casing',
      'item_module_camera',
      'item_module_battery',
    ]);
  });

  it('spawns ground pickups at world coordinates when robot dissociates', () => {
    driver.debugger.aimAt('blocker_bot_01');
    const result = driver.debugger.firePulse();

    for (const mod of result.disassembledModules!) {
      driver.spawnGroundDrop(mod, { x: 5.0, y: 8.0 });
    }

    expect(driver.groundDrops.length).toBe(4);
    const dropTypes = driver.groundDrops.map((d) => d.itemId);
    expect(dropTypes).toContain('item_module_wheels');
    expect(dropTypes).toContain('item_module_battery');
  });

  it('collects ground item pickups into player inventory', () => {
    const drop = driver.spawnGroundDrop('item_module_battery', { x: 2.0, y: 4.0 });
    expect(driver.groundDrops.length).toBe(1);
    expect(driver.hasItem('item_module_battery')).toBe(false);

    const collected = driver.collectGroundDrop(drop.id);
    expect(collected).toBe(true);
    expect(driver.groundDrops.length).toBe(0);
    expect(driver.getItemCount('item_module_battery')).toBe(1);
  });

  it('deactivates Quadruped Robo-Dog cleanly to drop server key ring and canine modules', () => {
    driver.debugger.aimAt('robo_dog_01');
    const result = driver.debugger.firePulse();

    expect(result.hit).toBe(true);
    expect(result.targetId).toBe('robo_dog_01');
    expect(result.disassembledModules).toContain('item_server_keyring');
    expect(result.disassembledModules).toContain('item_dog_modules');
  });

  it('preserves ground pickups persistently when inventory cannot accept items', () => {
    driver.setMaxInventorySlots(0); // Backpack full
    const drop = driver.spawnGroundDrop('item_module_casing', { x: 10, y: 10 });

    const collected = driver.collectGroundDrop(drop.id);
    expect(collected).toBe(false);
    expect(driver.groundDrops.length).toBe(1);
    expect(driver.groundDrops[0]?.itemId).toBe('item_module_casing');
  });
});
