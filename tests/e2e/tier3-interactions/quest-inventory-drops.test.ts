/**
 * Tier 3: Cross-Feature Interactions — Quest Progression + Inventory Drops
 * Pairwise integration: Disassembly drops in Act I -> Crafting in Act II -> Vault unlock in Act III
 * Authoritative source: Документ.pdf p. 2, 4, 6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 3: Quest Progression + Inventory Drops Interactions', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('completes the item lifecycle: bot disassembly in Quest 3 provides fuse for switchboard repair in Quest 8', () => {
    // 1. Advance through Quest 1 & 2
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');

    driver.quest.startQuest('quest_02_deans_password');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');
    driver.addItem('item_impulse_debugger', 1);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');

    // 2. Quest 3: Disassemble Courier Bot
    driver.quest.startQuest('quest_03_blocker_disassembly');
    driver.debugger.aimAt('blocker_bot_01');
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_01_aim_debugger');
    const pulse = driver.debugger.firePulse();
    expect(pulse.hit).toBe(true);

    // Collect all 4 parts
    for (const mod of pulse.disassembledModules!) {
      driver.addItem(mod, 1);
    }
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_02_disassemble_bot');
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');

    expect(driver.hasItem('item_module_battery')).toBe(true);
    expect(driver.hasItem('item_module_wheels')).toBe(true);
    expect(driver.hasItem('item_module_casing')).toBe(true);
    expect(driver.hasItem('item_module_camera')).toBe(true);

    // 3. Advance through Quests 4, 5, 6, 7
    driver.quest.startQuest('quest_04_lab_darkness');
    driver.quest.completeQuest('quest_04_lab_darkness');

    driver.quest.startQuest('quest_05_server_deadend');
    driver.quest.completeQuest('quest_05_server_deadend');

    driver.quest.startQuest('quest_06_cctv_clue');
    driver.quest.completeQuest('quest_06_cctv_clue');

    driver.quest.startQuest('quest_07_winter_garden_dog');
    driver.quest.completeQuest('quest_07_winter_garden_dog');

    // 4. Quest 8: Power Switchboard Repair consumes battery module from Quest 3
    driver.quest.startQuest('quest_08_lab_power_restore');
    expect(driver.hasItem('item_module_battery')).toBe(true);

    driver.switchboard.isolateLine();
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_01_isolate_phase');

    const fuseInsert = driver.switchboard.insertFuse('item_module_battery');
    expect(fuseInsert.success).toBe(true);
    driver.removeItem('item_module_battery', 1);
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_02_replace_fuse');

    const reboot = driver.switchboard.rebootGrid();
    expect(reboot.powerRestored).toBe(true);
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_03_reboot_master_grid');

    expect(driver.quest.isQuestCompleted('quest_08_lab_power_restore')).toBe(true);
    expect(driver.hasItem('item_module_battery')).toBe(false); // Consumed
  });

  it('completes the key retrieval lifecycle: Robo-Dog in Quest 7 drops keys required for vault in Quest 12', () => {
    driver.advanceToQuest('quest_07_winter_garden_dog');
    expect(driver.hasItem('item_server_keyring')).toBe(false);

    // Deactivate Robo-Dog
    driver.debugger.aimAt('robo_dog_01');
    const pulse = driver.debugger.firePulse();
    expect(pulse.hit).toBe(true);
    expect(pulse.disassembledModules).toContain('item_server_keyring');

    // Pick up key ring
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_01_enter_greenhouse');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_02_deactivate_dog');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_03_retrieve_keys');
    expect(driver.quest.isQuestCompleted('quest_07_winter_garden_dog')).toBe(true);

    // Advance to Quest 12
    driver.advanceToQuest('quest_12_datacenter_heart');
    expect(driver.hasItem('item_server_keyring')).toBe(true);

    // Vault door unlocked with brass key ring
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');

    expect(driver.quest.isQuestCompleted('quest_12_datacenter_heart')).toBe(true);
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);
  });
});
