/**
 * Tier 4: Real-World Scenarios — Scenario B: Complete Pragmatic Campaign Playthrough (Final B)
 * Authoritative source: Документ.pdf (Acts I–IV, Quests 1–13, 15), ORIGINAL_REQUEST.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 4: Canonical Campaign Playthrough — Final B Pragmatic (Quests 1–13, 15)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('plays through Acts I–III and completes Act IV via the Pragmatic Cleanup finale without errors', async () => {
    // Complete Acts I to III
    driver.advanceToQuest('quest_13_protocol_init');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_13_protocol_init');

    // Quest 13: Protocol Initialization
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    expect(driver.quest.isQuestCompleted('quest_13_protocol_init')).toBe(true);
    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);

    // Terminal Choice: Option B (Emergency Reset / Pragmatic Hardware Shutdown)
    const branchChoice = driver.quest.selectEnding('B');
    expect(branchChoice).toBe('quest_15_finale_pragmatic');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');

    // --- Quest 15: Cleanup and Restoration (Final B — Pragmatic) ---
    await driver.diorama.loadZone('zone_11_finale_cleanup');
    expect(driver.diorama.getActiveZone()).toBe('zone_11_finale_cleanup');
    expect(driver.diorama.getLightingState()).toBe('twilight');

    const active = driver.quest.getActiveQuest();
    expect(active?.id).toBe('quest_15_final_b_cleanup');

    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_01_enter_twilight_plaza');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_02_load_parts_trolley');
    driver.quest.completeObjective('quest_15_final_b_cleanup', 'obj_03_curator_commendation');

    expect(driver.quest.isQuestCompleted('quest_15_final_b_cleanup')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CAMPAIGN_COMPLETE_ENDING_B).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_14_final_a_celebration')).toBe(false);
  });
});
