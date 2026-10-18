/**
 * Tier 1: Feature Coverage — Feature 21: Full Campaign Integration & Acceptance
 * Authoritative source: ORIGINAL_REQUEST.md § Acceptance Criteria, PROJECT.md § Feature Inventory #21
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Full Campaign Integration & Acceptance (Feature 21)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('completes Act I (Quests 1–4) sequentially with 100% state validation', () => {
    // Quest 1
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    expect(driver.getWorldFlags().FLAG_GATE_BYPASSED).toBe(true);

    // Quest 2
    driver.quest.startQuest('quest_02_deans_password');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    driver.keypad.inputDigit(4);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');
    driver.addItem('item_impulse_debugger', 1);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');
    expect(driver.getWorldFlags().FLAG_DEANS_DOOR_UNLOCKED).toBe(true);

    // Quest 3
    driver.quest.startQuest('quest_03_blocker_disassembly');
    driver.debugger.aimAt('blocker_bot_01');
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_01_aim_debugger');
    const pulse = driver.debugger.firePulse();
    expect(pulse.hit).toBe(true);
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_02_disassemble_bot');
    for (const mod of pulse.disassembledModules!) {
      driver.addItem(mod, 1);
    }
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');
    expect(driver.getWorldFlags().FLAG_FIRST_BLOCKER_DISASSEMBLED).toBe(true);

    // Quest 4
    driver.quest.startQuest('quest_04_lab_darkness');
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_01_enter_corridor');
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_02_contact_professor');
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_03_inspect_switchboard');
    expect(driver.getWorldFlags().FLAG_PROFESSOR_CONTACTED).toBe(true);

    // Verify all 4 Act I quests complete
    expect(driver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_02_deans_password')).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_03_blocker_disassembly')).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_04_lab_darkness')).toBe(true);
  });

  it('completes Act II (Quests 5–8) sequentially with 100% state validation', () => {
    // Setup preconditions
    driver.advanceToQuest('quest_05_server_deadend');
    driver.addItem('item_module_battery', 1);

    // Quest 5
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_01_inspect_server_door');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_02_find_mechanical_lock');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_03_inspect_security_post');
    expect(driver.getWorldFlags().FLAG_SERVER_DOOR_INSPECTED).toBe(true);

    // Quest 6
    driver.quest.startQuest('quest_06_cctv_clue');
    driver.cctv.powerTerminal(true);
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_01_power_cctv');
    driver.cctv.rewind(15);
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_02_rewind_footage');
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_03_locate_dog_path');
    expect(driver.getWorldFlags().FLAG_CCTV_REVIEWED).toBe(true);

    // Quest 7
    driver.quest.startQuest('quest_07_winter_garden_dog');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_01_enter_greenhouse');
    driver.debugger.aimAt('robo_dog_01');
    driver.debugger.firePulse();
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_02_deactivate_dog');
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_03_retrieve_keys');
    expect(driver.getWorldFlags().FLAG_KEYS_RECOVERED).toBe(true);

    // Quest 8
    driver.quest.startQuest('quest_08_lab_power_restore');
    driver.switchboard.isolateLine();
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_01_isolate_phase');
    driver.switchboard.insertFuse('item_module_battery');
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_02_replace_fuse');
    driver.switchboard.rebootGrid();
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_03_reboot_master_grid');
    expect(driver.getWorldFlags().FLAG_POWER_RESTORED).toBe(true);
  });

  it('completes Act III (Quests 9–12) sequentially with 100% state validation', () => {
    // Setup preconditions
    driver.advanceToQuest('quest_09_subway_tunnel');
    driver.addItem('item_impulse_debugger', 1);
    driver.addItem('item_server_keyring', 1);

    // Quest 9
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_01_evade_aerial_drones');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_02_descend_manhole');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_03_traverse_tunnel');
    expect(driver.getWorldFlags().FLAG_TUNNEL_TRAVERSED).toBe(true);

    // Quest 10
    driver.quest.startQuest('quest_10_rogue_access_point');
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_01_surface_stairs');
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_02_identify_jammer');
    driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_03_disable_jammer');
    expect(driver.getWorldFlags().FLAG_JAMMER_DISABLED).toBe(true);

    // Quest 11
    driver.quest.startQuest('quest_11_grand_doors_open');
    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_01_doors_unlocked');
    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_02_enter_marble_lobby');
    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_03_descend_elevator');
    expect(driver.getWorldFlags().FLAG_LOBBY_ENTERED).toBe(true);

    // Quest 12
    driver.quest.startQuest('quest_12_datacenter_heart');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);
  });

  it('completes Act IV with Final A epilogue celebration', () => {
    // Advance to Quest 13
    driver.advanceToQuest('quest_13_protocol_init');

    // Quest 13
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);

    // Branch A
    driver.quest.selectEnding('A');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');

    // Complete Quest 14
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_01_enter_sunlit_plaza');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_02_observe_docile_bots');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_03_handshake_professor');
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_A).toBe(true);
  });

  it('completes Act IV with Final B volunteer cleanup', () => {
    // Advance to Quest 13
    driver.advanceToQuest('quest_13_protocol_init');

    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    // Branch B
    driver.quest.selectEnding('B');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_15_final_b_cleanup');

    // Complete Quest 15
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_01_enter_twilight_plaza');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_02_load_parts_trolley');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_03_curator_commendation');
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_B).toBe(true);
  });
});
