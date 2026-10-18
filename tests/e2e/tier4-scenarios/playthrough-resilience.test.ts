/**
 * Tier 4: Real-World Scenarios — Scenario C: Campaign Resilience & State Recovery
 * Tests intermediate save/load persistence at Act boundaries and recovery from edge errors.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 4: Campaign Resilience & State Recovery Scenario', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('completes campaign with checkpoint saves at every Act boundary, recovering without state degradation', async () => {
    // -------------------------------------------------------------
    // ACT I + Checkpoint Save 1
    // -------------------------------------------------------------
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');

    driver.quest.startQuest('quest_02_deans_password');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');

    // Input wrong code first, verify recovery, then input correct code
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(9); // Error
    expect(driver.keypad.isUnlocked()).toBe(false);

    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);
    expect(driver.keypad.isUnlocked()).toBe(true);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');
    driver.addItem('item_impulse_debugger', 1);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');

    driver.quest.startQuest('quest_03_blocker_disassembly');
    driver.debugger.aimAt('blocker_bot_01');
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_01_aim_debugger');
    const pulse = driver.debugger.firePulse();
    for (const mod of pulse.disassembledModules!) {
      driver.addItem(mod, 1);
    }
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_02_disassemble_bot');
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');

    driver.quest.startQuest('quest_04_lab_darkness');
    driver.quest.completeQuest('quest_04_lab_darkness');

    // Checkpoint Save 1 (End of Act I)
    const saveAct1 = driver.createSaveData();
    expect(saveAct1.worldFlags.FLAG_PROFESSOR_CONTACTED).toBe(true);

    // Reload into fresh instance to simulate session restart
    driver = createCampaignDriver();
    driver.loadSaveData(saveAct1);
    expect(driver.hasItem('item_module_battery')).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_04_lab_darkness')).toBe(true);

    // -------------------------------------------------------------
    // ACT II + Checkpoint Save 2
    // -------------------------------------------------------------
    driver.quest.startQuest('quest_05_server_deadend');
    driver.quest.completeQuest('quest_05_server_deadend');

    driver.quest.startQuest('quest_06_cctv_clue');
    driver.cctv.powerTerminal(true);
    driver.cctv.rewind(15);
    driver.quest.completeQuest('quest_06_cctv_clue');

    driver.quest.startQuest('quest_07_winter_garden_dog');
    driver.debugger.aimAt('robo_dog_01');
    driver.debugger.firePulse();
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeQuest('quest_07_winter_garden_dog');

    driver.quest.startQuest('quest_08_lab_power_restore');
    driver.switchboard.isolateLine();
    driver.switchboard.insertFuse('item_module_battery');
    driver.removeItem('item_module_battery', 1);
    driver.switchboard.rebootGrid();
    driver.quest.completeQuest('quest_08_lab_power_restore');

    // Checkpoint Save 2 (End of Act II)
    const saveAct2 = driver.createSaveData();
    expect(saveAct2.worldFlags.FLAG_POWER_RESTORED).toBe(true);

    // Reload into fresh instance
    driver = createCampaignDriver();
    driver.loadSaveData(saveAct2);
    expect(driver.hasItem('item_server_keyring')).toBe(true);

    // -------------------------------------------------------------
    // ACT III + Checkpoint Save 3
    // -------------------------------------------------------------
    driver.quest.startQuest('quest_09_subway_tunnel');
    driver.quest.completeQuest('quest_09_subway_tunnel');

    driver.quest.startQuest('quest_10_rogue_access_point');
    driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    driver.quest.completeQuest('quest_10_rogue_access_point');

    driver.quest.startQuest('quest_11_grand_doors_open');
    driver.quest.completeQuest('quest_11_grand_doors_open');

    driver.quest.startQuest('quest_12_datacenter_heart');
    driver.quest.completeQuest('quest_12_datacenter_heart');

    // Checkpoint Save 3 (End of Act III)
    const saveAct3 = driver.createSaveData();
    expect(saveAct3.worldFlags.FLAG_DATACENTER_ACCESSED).toBe(true);

    // Reload into fresh instance
    driver = createCampaignDriver();
    driver.loadSaveData(saveAct3);

    // -------------------------------------------------------------
    // ACT IV: Resolution
    // -------------------------------------------------------------
    driver.quest.startQuest('quest_13_protocol_init');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    driver.quest.selectEnding('A');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
    driver.quest.completeQuest('quest_14_final_a_celebration');
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_A).toBe(true);
  });
});
