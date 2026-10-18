/**
 * Tier 2: Boundary & Corner Cases — Master Console & Ending Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #14, Документ.pdf p. 7–8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Master Console & Ending Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
    driver.advanceToQuest('quest_13_protocol_init');
  });

  it('Edge Case 1: keeps console selection modal pinned until player confirms an option', () => {
    driver.dialogue.startDialogue('console_protocol_q13');
    const node = driver.dialogue.getCurrentNode();
    expect(node?.options?.length).toBe(3);

    // Player tries to advance without choosing an option
    const advanceTry1 = driver.dialogue.advance();
    expect(advanceTry1?.id).toBe(node?.id);
    expect(driver.dialogue.isActive()).toBe(true);

    const advanceTry2 = driver.dialogue.advance();
    expect(advanceTry2?.id).toBe(node?.id);
    expect(driver.dialogue.isActive()).toBe(true);
  });

  it('Edge Case 2: rejects invalid option indexes outside the choices range', () => {
    driver.dialogue.startDialogue('console_protocol_q13');

    // Index -1 or 99
    const invalidUnder = driver.dialogue.selectOption(-1);
    expect(invalidUnder).toBeNull();

    const invalidOver = driver.dialogue.selectOption(99);
    expect(invalidOver).toBeNull();
  });

  it('Edge Case 3: cleanly routes both Option B and Option C to Final B Pragmatic outcome', () => {
    // Complete Quest 13 objectives
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    // Choice B
    const endingB = driver.quest.selectEnding('B');
    expect(endingB).toBe('quest_15_finale_pragmatic');
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');

    // Reset and test Choice C
    const driverC = createCampaignDriver();
    driverC.advanceToQuest('quest_13_protocol_init');
    driverC.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driverC.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driverC.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');

    const endingC = driverC.quest.selectEnding('C');
    expect(endingC).toBe('quest_15_finale_pragmatic');
    expect(driverC.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');
  });

  it('Edge Case 4: preserves selected ending state across save/load', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    driver.quest.selectEnding('A');

    const save = driver.createSaveData();
    expect(save.worldFlags.CAMPAIGN_ENDING).toBe('FINAL_A');

    const fresh = createCampaignDriver();
    fresh.loadSaveData(save);
    expect(fresh.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');
    expect(fresh.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
  });

  it('Edge Case 5: prevents re-selecting ending choice once epilogue quest has started', () => {
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
    driver.quest.selectEnding('A');

    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');

    // Second selectEnding call while Quest 14 active
    driver.quest.selectEnding('A'); // idempotent
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
  });
});
