/**
 * Milestone 5: Full Narrative Campaign Acceptance Walkthrough
 * End-to-end integration test suite exercising the complete "CyberShield: Code of Legacy"
 * storyline across Acts I–IV, 15 quests, branching endings (Final A vs Final B),
 * state serialization via storage.ts, scene transitions across 11 diorama zones,
 * and victory credits.
 *
 * Authoritative sources: Документ.pdf, ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from './harness';
import { StorageService } from '@/utils/storage';

describe('Milestone 5: Full Narrative Campaign Acceptance Walkthrough', () => {
  let driver: CampaignDriver;

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
    driver = createCampaignDriver();
    mockStorage = new StorageMock();
    originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    StorageService.clearMemoryFallback();
  });

  it('Campaign Acceptance Walkthrough 1: Full Playthrough to Final A Ideal (Quests 1–14)', async () => {
    // =========================================================================
    // ACT I: PERIMETER & INFILTRATION (Quests 1–4)
    // =========================================================================

    // --- Quest 1: Digital Barrier of the Main Gates ---
    await driver.diorama.loadZone('zone_01_gate');
    expect(driver.diorama.getActiveZone()).toBe('zone_01_gate');
    expect(driver.diorama.getLightingState()).toBe('twilight');

    driver.dialogue.startDialogue('curator_radio_q1');
    driver.dialogue.advance();
    driver.dialogue.advance();

    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    expect(driver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(driver.getWorldFlags().FLAG_GATE_BYPASSED).toBe(true);

    // --- Quest 2: Forgotten Password of the Dean's Office ---
    await driver.diorama.loadZone('zone_02_deans_basement');
    expect(driver.diorama.getActiveZone()).toBe('zone_02_deans_basement');
    driver.quest.startQuest('quest_02_deans_password');

    // Terminal inspection revealed founding year code 1984
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');

    // Electronic door keypad
    driver.keypad.inputDigit(1);
    driver.keypad.inputDigit(9);
    driver.keypad.inputDigit(8);
    const unlockResult = driver.keypad.inputDigit(4);
    expect(unlockResult.success).toBe(true);
    expect(driver.keypad.isUnlocked()).toBe(true);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');

    // Acquire Impulse Debugger gadget
    driver.addItem('item_impulse_debugger', 1);
    expect(driver.hasItem('item_impulse_debugger')).toBe(true);
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');
    expect(driver.quest.isQuestCompleted('quest_02_deans_password')).toBe(true);
    expect(driver.getWorldFlags().FLAG_DEANS_DOOR_UNLOCKED).toBe(true);

    // --- Quest 3: First Encounter: Blocker Disassembly ---
    await driver.diorama.loadZone('zone_03_courtyard_alley');
    expect(driver.diorama.getActiveZone()).toBe('zone_03_courtyard_alley');
    driver.quest.startQuest('quest_03_blocker_disassembly');

    const aimed = driver.debugger.aimAt('blocker_bot_01');
    expect(aimed).toBe(true);
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_01_aim_debugger');

    const pulseResult = driver.debugger.firePulse();
    expect(pulseResult.hit).toBe(true);
    expect(pulseResult.disassembledModules).toHaveLength(4);
    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_02_disassemble_bot');

    // Collect modular pickups (wheels x4, casing x1, camera x1, battery x1)
    for (const mod of pulseResult.disassembledModules!) {
      driver.addItem(mod, 1);
    }
    expect(driver.getItemCount('item_module_wheels')).toBe(1);
    expect(driver.getItemCount('item_module_battery')).toBe(1);

    driver.quest.completeObjective('quest_03_blocker_disassembly', 'obj_03_collect_modules');
    expect(driver.quest.isQuestCompleted('quest_03_blocker_disassembly')).toBe(true);
    expect(driver.getWorldFlags().FLAG_FIRST_BLOCKER_DISASSEMBLED).toBe(true);

    // --- Checkpoint Save 1 via StorageService ---
    const checkpoint1 = driver.createSaveData();
    expect(StorageService.validateSaveData(checkpoint1)).toBe(true);
    const save1Success = StorageService.saveGame(checkpoint1);
    expect(save1Success).toBe(true);

    // =========================================================================
    // ACT II: INVESTIGATION & KEY SEARCH (Quests 4–8)
    // =========================================================================

    // --- Quest 4: Darkness in the Laboratory Wing ---
    await driver.diorama.loadZone('zone_04_lab_corridor');
    expect(driver.diorama.getActiveZone()).toBe('zone_04_lab_corridor');
    expect(driver.diorama.getLightingState()).toBe('dark_emergency');

    driver.quest.startQuest('quest_04_lab_darkness');
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_01_enter_corridor');

    driver.dialogue.startDialogue('professor_q4');
    driver.dialogue.advance();
    driver.dialogue.advance();
    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_02_contact_professor');

    driver.quest.completeObjective('quest_04_lab_darkness', 'obj_03_inspect_switchboard');
    expect(driver.quest.isQuestCompleted('quest_04_lab_darkness')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROFESSOR_CONTACTED).toBe(true);

    // --- Quest 5: Dead End at Server Room & Security Post ---
    await driver.diorama.loadZone('zone_05_security_room');
    driver.quest.startQuest('quest_05_server_deadend');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_01_inspect_server_door');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_02_find_mechanical_lock');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_03_inspect_security_post');
    expect(driver.quest.isQuestCompleted('quest_05_server_deadend')).toBe(true);
    expect(driver.getWorldFlags().FLAG_SERVER_DOOR_INSPECTED).toBe(true);

    // --- Quest 6: Evidence from Cameras: Robo-Dog Chase ---
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
    expect(driver.diorama.getActiveZone()).toBe('zone_06_winter_garden');

    driver.quest.startQuest('quest_07_winter_garden_dog');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_01_enter_greenhouse');

    // Pacify Robo-Dog with debugger
    driver.debugger.aimAt('robo_dog_01');
    const dogPulse = driver.debugger.firePulse();
    expect(dogPulse.hit).toBe(true);
    expect(dogPulse.disassembledModules).toContain('item_server_keyring');
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_02_deactivate_dog');

    // Retrieve master brass keys
    driver.addItem('item_server_keyring', 1);
    expect(driver.hasItem('item_server_keyring')).toBe(true);
    driver.quest.completeObjective('quest_07_winter_garden_dog', 'obj_03_retrieve_keys');
    expect(driver.quest.isQuestCompleted('quest_07_winter_garden_dog')).toBe(true);
    expect(driver.getWorldFlags().FLAG_KEYS_RECOVERED).toBe(true);

    // --- Quest 8: Restoring Power to the Laboratory ---
    await driver.diorama.loadZone('zone_04_lab_corridor');
    driver.quest.startQuest('quest_08_lab_power_restore');

    // 3-step switchboard restoration
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

    // --- Checkpoint Save 2 via StorageService ---
    const checkpoint2 = driver.createSaveData();
    StorageService.saveGame(checkpoint2);
    const loaded2 = StorageService.loadGame();
    expect(loaded2?.worldFlags['FLAG_POWER_RESTORED']).toBe(true);
    expect(loaded2?.inventory.some((i) => i.itemId === 'item_server_keyring')).toBe(true);

    // =========================================================================
    // ACT III: CLIMAX & SERVER ROOM (Quests 9–12)
    // =========================================================================

    // --- Quest 9: Service Tunnel Under the Courtyard ---
    await driver.diorama.loadZone('zone_07_cable_tunnel');
    expect(driver.diorama.getActiveZone()).toBe('zone_07_cable_tunnel');
    driver.quest.startQuest('quest_09_subway_tunnel');

    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_01_evade_aerial_drones');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_02_descend_manhole');
    driver.quest.completeObjective('quest_09_subway_tunnel', 'obj_03_traverse_tunnel');
    expect(driver.quest.isQuestCompleted('quest_09_subway_tunnel')).toBe(true);
    expect(driver.getWorldFlags().FLAG_TUNNEL_TRAVERSED).toBe(true);

    // --- Quest 10: Rogue Access Point at Main Entrance ---
    driver.quest.startQuest('quest_10_rogue_access_point');
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_01_surface_stairs');
    driver.quest.completeObjective('quest_10_rogue_access_point', 'obj_02_identify_jammer');

    // EMP pulse disables rogue jammer
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

    // --- Quest 12: Heart of Legacy Code / Main Server Room ---
    await driver.diorama.loadZone('zone_09_datacenter');
    expect(driver.diorama.getActiveZone()).toBe('zone_09_datacenter');
    driver.quest.startQuest('quest_12_datacenter_heart');

    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');
    expect(driver.quest.isQuestCompleted('quest_12_datacenter_heart')).toBe(true);
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);

    // =========================================================================
    // ACT IV: FINALES & RESOLUTION (Quests 13–14: Final A Ideal)
    // =========================================================================

    // --- Quest 13: Initialization of the Recovery Protocol ---
    driver.quest.startQuest('quest_13_protocol_init');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.quest.isQuestCompleted('quest_13_protocol_init')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);

    // Climax terminal choice: Option A (Full Reflash)
    const endingBranchA = driver.quest.selectEnding('A');
    expect(endingBranchA).toBe('quest_14_finale_ideal');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');

    // --- Quest 14: Celebration in the Courtyard (Final A Ideal) ---
    await driver.diorama.loadZone('zone_10_finale_celebration');
    expect(driver.diorama.getActiveZone()).toBe('zone_10_finale_celebration');
    expect(driver.diorama.getLightingState()).toBe('sunny_day');

    const activeEpilogueA = driver.quest.getActiveQuest();
    expect(activeEpilogueA?.id).toBe('quest_14_final_a_celebration');

    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_01_enter_sunlit_plaza');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_02_observe_docile_bots');
    driver.quest.completeObjective('quest_14_final_a_celebration', 'obj_03_handshake_professor');

    // Award Ideal Trophy
    driver.addItem('item_trophy_ideal', 1);
    expect(driver.hasItem('item_trophy_ideal')).toBe(true);

    expect(driver.quest.isQuestCompleted('quest_14_final_a_celebration')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_A).toBe(true);

    // Invariant: unselected Quest 15 remains uncompleted
    expect(driver.quest.isQuestCompleted('quest_15_final_b_cleanup')).toBe(false);

    // Final Save Verification
    const finalSaveA = driver.createSaveData();
    expect(StorageService.validateSaveData(finalSaveA)).toBe(true);
    StorageService.saveGame(finalSaveA);

    const reloadedFinalA = StorageService.loadGame();
    expect(reloadedFinalA?.worldFlags['FLAG_CAMPAIGN_COMPLETE_ENDING_A']).toBe(true);
    expect(reloadedFinalA?.inventory.some((i) => i.itemId === 'item_trophy_ideal')).toBe(true);
  });

  it('Campaign Acceptance Walkthrough 2: Full Playthrough to Final B Pragmatic (Quests 1–13, 15)', async () => {
    // Advance cleanly through Acts I to III
    driver.advanceToQuest('quest_13_protocol_init');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_13_protocol_init');

    // Complete Quest 13 objectives
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.quest.isQuestCompleted('quest_13_protocol_init')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);

    // Climax terminal choice: Option B (Emergency Reset / Safe Actuator Conservation)
    const endingBranchB = driver.quest.selectEnding('B');
    expect(endingBranchB).toBe('quest_15_finale_pragmatic');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');

    // --- Quest 15: Cleanup and Restoration (Final B Pragmatic) ---
    await driver.diorama.loadZone('zone_11_finale_cleanup');
    expect(driver.diorama.getActiveZone()).toBe('zone_11_finale_cleanup');
    expect(driver.diorama.getLightingState()).toBe('twilight');

    const activeEpilogueB = driver.quest.getActiveQuest();
    expect(activeEpilogueB?.id).toBe('quest_15_final_b_cleanup');

    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_01_enter_twilight_plaza');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_02_load_parts_trolley');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_03_curator_commendation');

    // Award Pragmatic Trophy
    driver.addItem('item_trophy_pragmatic', 1);
    expect(driver.hasItem('item_trophy_pragmatic')).toBe(true);

    expect(driver.quest.isQuestCompleted('quest_15_final_b_cleanup')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_B).toBe(true);

    // Invariant: unselected Quest 14 remains uncompleted
    expect(driver.quest.isQuestCompleted('quest_14_final_a_celebration')).toBe(false);

    // Final Save Verification
    const finalSaveB = driver.createSaveData();
    expect(StorageService.validateSaveData(finalSaveB)).toBe(true);
    StorageService.saveGame(finalSaveB);

    const reloadedFinalB = StorageService.loadGame();
    expect(reloadedFinalB?.worldFlags['FLAG_CAMPAIGN_COMPLETE_ENDING_B']).toBe(true);
    expect(reloadedFinalB?.inventory.some((i) => i.itemId === 'item_trophy_pragmatic')).toBe(true);
  });

  it('Campaign Acceptance Walkthrough 3: Round-Trip Persistence & Resilience Across All Act Boundaries', async () => {
    // 1. Act I State Checkpoint
    driver.addItem('item_impulse_debugger', 1);
    driver.addItem('item_module_battery', 1);
    driver.setWorldFlag('FLAG_FIRST_BLOCKER_DISASSEMBLED', true);
    await driver.diorama.loadZone('zone_03_courtyard_alley');
    driver.playerPosition = { x: 8.0, y: 14.5 };

    const saveAct1 = driver.createSaveData();
    expect(StorageService.validateSaveData(saveAct1)).toBe(true);
    StorageService.saveGame(saveAct1);

    // 2. Restore into new driver instance
    const driverAct2 = createCampaignDriver();
    const loadedAct1 = StorageService.loadGame();
    expect(loadedAct1).not.toBeNull();
    driverAct2.loadSaveData(loadedAct1!);

    expect(driverAct2.hasItem('item_impulse_debugger')).toBe(true);
    expect(driverAct2.hasItem('item_module_battery')).toBe(true);
    expect(driverAct2.getWorldFlags().FLAG_FIRST_BLOCKER_DISASSEMBLED).toBe(true);
    expect(driverAct2.playerPosition.x).toBe(8.0);
    expect(driverAct2.playerPosition.y).toBe(14.5);

    // 3. Act II Switchboard Power Restoration and Zone Change to Datacenter
    driverAct2.setWorldFlag('FLAG_POWER_RESTORED', true);
    driverAct2.addItem('item_server_keyring', 1);
    await driverAct2.diorama.loadZone('zone_09_datacenter');

    const saveAct3 = driverAct2.createSaveData();
    StorageService.saveGame(saveAct3);

    // 4. Restore into fresh driver instance
    const driverAct4 = createCampaignDriver();
    const loadedAct3 = StorageService.loadGame();
    expect(loadedAct3).not.toBeNull();
    driverAct4.loadSaveData(loadedAct3!);

    expect(driverAct4.getWorldFlags().FLAG_POWER_RESTORED).toBe(true);
    expect(driverAct4.hasItem('item_server_keyring')).toBe(true);
    expect(driverAct4.diorama.getActiveZone()).toBe('zone_09_datacenter');
  });
});
