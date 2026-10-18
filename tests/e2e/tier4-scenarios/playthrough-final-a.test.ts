/**
 * Tier 4: Real-World Scenarios — Scenario A: Complete Canonical Campaign Playthrough (Final A — Ideal)
 * Authoritative source: Документ.pdf (Acts I–IV, Quests 1–14), ORIGINAL_REQUEST.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 4: Canonical Campaign Playthrough — Final A Ideal (Quests 1–14)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('plays through the complete 14-quest campaign storyline to the Ideal Celebration finale without errors', async () => {
    // =========================================================================
    // ACT I: PERIMETER & INFILTRATION (Quests 1–4)
    // =========================================================================

    // --- Quest 1: Digital Barrier of the Main Gates ---
    await driver.diorama.loadZone('zone_01_gate');
    expect(driver.diorama.getActiveZone()).toBe('zone_01_gate');
    expect(driver.diorama.getLightingState()).toBe('twilight');

    driver.dialogue.startDialogue('curator_radio_q1');
    driver.dialogue.advance(); // Alexey responds
    driver.dialogue.advance(); // finish dialogue

    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    expect(driver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(driver.getWorldFlags().FLAG_GATE_BYPASSED).toBe(true);

    // --- Quest 2: Forgotten Password of the Dean's Office ---
    await driver.diorama.loadZone('zone_02_deans_basement');
    driver.quest.startQuest('quest_02_deans_password');

    // Read lab assistant monitor hint (Founding year: 1984)
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');

    // Enter keypad code 1984
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    const unlock = driver.keypad.inputDigit(4);
    expect(unlock.success).toBe(true);
    expect(driver.keypad.isUnlocked()).toBe(true);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');

    // Pick up Impulse Debugger
    driver.addItem('item_impulse_debugger', 1);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');
    expect(driver.quest.isQuestCompleted('quest_02_deans_password')).toBe(true);
    expect(driver.getWorldFlags().FLAG_DEANS_DOOR_UNLOCKED).toBe(true);

    // --- Quest 3: First Encounter: Blocker Disassembly ---
    await driver.diorama.loadZone('zone_03_courtyard_alley');
    driver.quest.startQuest('quest_03_blocker_disassembly');

    // Aim and fire Impulse Debugger
    const aimed = driver.debugger.aimAt('blocker_bot_01');
    expect(aimed).toBe(true);
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_01_aim_debugger');

    const pulse = driver.debugger.firePulse();
    expect(pulse.hit).toBe(true);
    expect(pulse.disassembledModules).toHaveLength(4);
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_02_disassemble_bot');

    // Collect dropped parts into backpack
    for (const mod of pulse.disassembledModules!) {
      driver.addItem(mod, 1);
    }
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');
    expect(driver.quest.isQuestCompleted('quest_03_blocker_disassembly')).toBe(true);
    expect(driver.getWorldFlags().FLAG_FIRST_BLOCKER_DISASSEMBLED).toBe(true);
    expect(driver.hasItem('item_module_battery')).toBe(true);

    // --- Quest 4: Darkness in the Laboratory Wing ---
    await driver.diorama.loadZone('zone_04_lab_corridor');
    expect(driver.diorama.getLightingState()).toBe('dark_emergency');
    driver.quest.startQuest('quest_04_lab_darkness');

    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_01_enter_corridor');

    // Speak with trapped Professor through door
    driver.dialogue.startDialogue('professor_q4');
    driver.dialogue.advance();
    driver.dialogue.advance();
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_02_contact_professor');

    // Inspect switchboard
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_03_inspect_switchboard');
    expect(driver.quest.isQuestCompleted('quest_04_lab_darkness')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROFESSOR_CONTACTED).toBe(true);

    // =========================================================================
    // ACT II: INVESTIGATION & KEY SEARCH (Quests 5–8)
    // =========================================================================

    // --- Quest 5: Dead End at the Server Room & Security Post ---
    await driver.diorama.loadZone('zone_05_security_room');
    driver.quest.startQuest('quest_05_server_deadend');

    driver.quest.completeObjective('quest_05_server_deadend', 'obj_01_inspect_server_door');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_02_find_mechanical_lock');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_03_inspect_security_post');
    expect(driver.quest.isQuestCompleted('quest_05_server_deadend')).toBe(true);
    expect(driver.getWorldFlags().FLAG_SERVER_DOOR_INSPECTED).toBe(true);

    // --- Quest 6: Evidence from the Cameras: Robo-Dog Chase ---
    driver.quest.startQuest('quest_06_cctv_clue');

    driver.cctv.powerTerminal(true);
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_01_power_cctv');

    const footage = driver.cctv.rewind(15);
    expect(footage.success).toBe(true);
    expect(footage.clueLocation).toBe('zone_06_winter_garden');
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_02_rewind_footage');
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_03_locate_dog_path');
    expect(driver.quest.isQuestCompleted('quest_06_cctv_clue')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CCTV_REVIEWED).toBe(true);

    // --- Quest 7: Winter Garden & Robo-Dog Interception ---
    await driver.diorama.loadZone('zone_06_winter_garden');
    driver.quest.startQuest('quest_07_winter_garden_dog');

    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_01_enter_greenhouse');

    // Deactivate Robo-Dog non-lethally
    driver.debugger.aimAt('robo_dog_01');
    const dogPulse = driver.debugger.firePulse();
    expect(dogPulse.hit).toBe(true);
    expect(dogPulse.disassembledModules).toContain('item_server_keyring');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_02_deactivate_dog');

    // Retrieve master keys
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_03_retrieve_keys');
    expect(driver.quest.isQuestCompleted('quest_07_winter_garden_dog')).toBe(true);
    expect(driver.getWorldFlags().FLAG_KEYS_RECOVERED).toBe(true);
    expect(driver.hasItem('item_server_keyring')).toBe(true);

    // --- Quest 8: Restoring Power to the Laboratory ---
    await driver.diorama.loadZone('zone_04_lab_corridor');
    driver.quest.startQuest('quest_08_lab_power_restore');

    // 3-step switchboard repair
    driver.switchboard.isolateLine();
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_01_isolate_phase');

    const fuseRes = driver.switchboard.insertFuse('item_module_battery');
    expect(fuseRes.success).toBe(true);
    driver.removeItem('item_module_battery', 1);
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_02_replace_fuse');

    const rebootRes = driver.switchboard.rebootGrid();
    expect(rebootRes.powerRestored).toBe(true);
    driver.diorama.setLightingState('warm_restored');
    driver.quest.completeObjective('quest_08_lab_power_restore', 'obj_03_reboot_master_grid');
    expect(driver.quest.isQuestCompleted('quest_08_lab_power_restore')).toBe(true);
    expect(driver.getWorldFlags().FLAG_POWER_RESTORED).toBe(true);
    expect(driver.diorama.getLightingState()).toBe('warm_restored');

    // =========================================================================
    // ACT III: CLIMAX & SERVER ROOM (Quests 9–12)
    // =========================================================================

    // --- Quest 9: Service Tunnel Under the Courtyard ---
    await driver.diorama.loadZone('zone_07_cable_tunnel');
    driver.quest.startQuest('quest_09_subway_tunnel');

    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_01_evade_aerial_drones');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_02_descend_manhole');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_03_traverse_tunnel');
    expect(driver.quest.isQuestCompleted('quest_09_subway_tunnel')).toBe(true);
    expect(driver.getWorldFlags().FLAG_TUNNEL_TRAVERSED).toBe(true);

    // --- Quest 10: Rogue Access Point at the Main Entrance ---
    driver.quest.startQuest('quest_10_rogue_access_point');

    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_01_surface_stairs');
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_02_identify_jammer');

    // Discard jammer with amplified pulse
    const jammerRes = driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    expect(jammerRes.success).toBe(true);
    expect(jammerRes.doorsUnlocked).toBe(true);
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_03_disable_jammer');
    expect(driver.quest.isQuestCompleted('quest_10_rogue_access_point')).toBe(true);
    expect(driver.getWorldFlags().FLAG_JAMMER_DISABLED).toBe(true);

    // --- Quest 11: Opening of the Grand Entrance Doors ---
    await driver.diorama.loadZone('zone_08_grand_lobby');
    driver.quest.startQuest('quest_11_grand_doors_open');

    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_01_doors_unlocked');
    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_02_enter_marble_lobby');
    driver.quest.completeObjective('quest_11_grand_doors_open', 'obj_03_descend_elevator');
    expect(driver.quest.isQuestCompleted('quest_11_grand_doors_open')).toBe(true);
    expect(driver.getWorldFlags().FLAG_LOBBY_ENTERED).toBe(true);

    // --- Quest 12: Heart of the Legacy Code / Main Server Room ---
    await driver.diorama.loadZone('zone_09_datacenter');
    driver.quest.startQuest('quest_12_datacenter_heart');

    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');
    expect(driver.quest.isQuestCompleted('quest_12_datacenter_heart')).toBe(true);
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);

    // =========================================================================
    // ACT IV: FINALES & RESOLUTION (Quests 13–14: Final A)
    // =========================================================================

    // --- Quest 13: Initialization of the Recovery Protocol ---
    driver.quest.startQuest('quest_13_protocol_init');

    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.quest.isQuestCompleted('quest_13_protocol_init')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);

    // Terminal Choice: Option A (Full Reflash)
    const branchChoice = driver.quest.selectEnding('A');
    expect(branchChoice).toBe('quest_14_finale_ideal');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');

    // --- Quest 14: Celebration in the Courtyard (Final A — Ideal) ---
    await driver.diorama.loadZone('zone_10_finale_celebration');
    expect(driver.diorama.getLightingState()).toBe('sunny_day');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');

    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_01_enter_sunlit_plaza');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_02_observe_docile_bots');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_03_handshake_professor');
    expect(driver.quest.isQuestCompleted('quest_14_final_a_celebration')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_A).toBe(true);

    // Final verification of whole campaign
    expect(driver.quest.isQuestCompleted('quest_15_final_b_cleanup')).toBe(false); // Unselected branch untouched
  });
});
