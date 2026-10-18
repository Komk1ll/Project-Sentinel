/**
 * Tier 1: Feature Coverage — Feature 2: Epilogue Branching Engine
 * Authoritative source: Документ.pdf p. 7–8, PROJECT.md § Feature Inventory #2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Epilogue Branching Engine (Feature 2)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
    // Advance campaign to Quest 13 completed state
    for (let q = 1; q <= 12; q++) {
      const qId = driver.quest.getActiveQuest()?.id;
      if (qId) {
        driver.quest.completeQuest(qId);
        // Start next quest
        const nextId =
          q === 1 ? 'quest_02_deans_password' :
          q === 2 ? 'quest_03_blocker_disassembly' :
          q === 3 ? 'quest_04_lab_darkness' :
          q === 4 ? 'quest_05_server_deadend' :
          q === 5 ? 'quest_06_cctv_clue' :
          q === 6 ? 'quest_07_winter_garden_dog' :
          q === 7 ? 'quest_08_lab_power_restore' :
          q === 8 ? 'quest_09_subway_tunnel' :
          q === 9 ? 'quest_10_rogue_access_point' :
          q === 10 ? 'quest_11_grand_doors_open' :
          q === 11 ? 'quest_12_datacenter_heart' :
          'quest_13_protocol_init';
        driver.quest.startQuest(nextId);
      }
    }
  });

  it('routes to Quest 14 (Final A — Ideal) upon selecting Option A (Full Reflash)', () => {
    // Complete Quest 13
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.quest.isQuestCompleted('quest_13_protocol_init')).toBe(true);

    const branch = driver.quest.selectEnding('A');
    expect(branch).toBe('quest_14_finale_ideal');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');

    const active = driver.quest.getActiveQuest();
    expect(active?.id).toBe('quest_14_final_a_celebration');
    expect(driver.quest.getState()['quest_15_final_b_cleanup']?.status).toBe('locked');
  });

  it('routes to Quest 15 (Final B — Pragmatic) upon selecting Option B (Emergency Reset)', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    const branch = driver.quest.selectEnding('B');
    expect(branch).toBe('quest_15_finale_pragmatic');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');

    const active = driver.quest.getActiveQuest();
    expect(active?.id).toBe('quest_15_final_b_cleanup');
    expect(driver.quest.getState()['quest_14_final_a_celebration']?.status).toBe('locked');
  });

  it('routes to Quest 15 (Final B — Pragmatic) upon selecting Option C (Autonomous Quarantine)', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    const branch = driver.quest.selectEnding('C');
    expect(branch).toBe('quest_15_finale_pragmatic');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');

    const active = driver.quest.getActiveQuest();
    expect(active?.id).toBe('quest_15_final_b_cleanup');
  });

  it('throws an error if attempting to select ending before Quest 13 is completed', () => {
    // Quest 13 is active but NOT completed
    expect(() => driver.quest.selectEnding('A')).toThrow('Cannot select ending before Quest 13 is completed');
  });

  it('throws an error when invalid choice key is provided', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    // @ts-expect-error Testing invalid option key
    expect(() => driver.quest.selectEnding('D')).toThrow('Invalid ending choice: D');
  });

  it('locks the unselected branch and prevents simultaneous activation of both epilogues', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    driver.quest.selectEnding('A');
    const state = driver.quest.getState();
    expect(state['quest_14_final_a_celebration']?.status).toBe('active');
    expect(state['quest_15_final_b_cleanup']?.status).toBe('locked');

    // Attempting to manually start Quest 15 while Quest 14 is active
    const invalidStart = driver.quest.startQuest('quest_15_final_b_cleanup');
    expect(invalidStart).toBe(false);
  });
});
