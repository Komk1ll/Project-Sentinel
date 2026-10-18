/**
 * Tier 3: Cross-Feature Interactions — Dialogue Branching + Quest Triggers
 * Pairwise integration: Dialogue options + Quest state + World flags + Speaker roles
 * Authoritative source: Документ.pdf p. 1, 4, 7–8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 3: Dialogue Branching + Quest Triggers Interactions', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('triggers Quest 1 objective completion upon finishing opening radio transmission from Curator', () => {
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_01_gate_barrier');

    driver.dialogue.startDialogue('curator_radio_q1', () => {
      // Callback completes radio objective in quest engine
      driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    });

    driver.dialogue.advance(); // node_2
    driver.dialogue.advance(); // complete

    const qState = driver.quest.getState()['quest_01_gate_barrier'];
    expect(qState?.completedObjectives).toContain('obj_01_radio_curator');
    expect(qState?.currentObjectiveIndex).toBe(1);
  });

  it('routes ending selection dialogue to Quest 14 activation via option callback (Final A)', () => {
    driver.advanceToQuest('quest_13_protocol_init');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');

    driver.dialogue.startDialogue('console_protocol_q13');
    const node = driver.dialogue.getCurrentNode();
    expect(node?.options?.length).toBe(3);

    // Attach callback to option 0 (Full Reflash)
    node!.options![0]!.onSelect = () => {
      driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
      driver.quest.selectEnding('A');
    };

    driver.dialogue.selectOption(0);

    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_A');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_14_final_a_celebration');
  });

  it('routes ending selection dialogue to Quest 15 activation via option callback (Final B)', () => {
    driver.advanceToQuest('quest_13_protocol_init');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_01_boot_holo_console');
    driver.quest.completeObjective('quest_13_protocol_init', 'obj_02_stabilize_memory');

    driver.dialogue.startDialogue('console_protocol_q13');
    const node = driver.dialogue.getCurrentNode();

    // Attach callback to option 1 (Emergency Reset)
    node!.options![1]!.onSelect = () => {
      driver.quest.completeObjective('quest_13_protocol_init', 'obj_03_select_vector');
      driver.quest.selectEnding('B');
    };

    driver.dialogue.selectOption(1);

    expect(driver.getWorldFlags().FLAG_PROTOCOL_INITIALIZED).toBe(true);
    expect(driver.getWorldFlags().CAMPAIGN_ENDING).toBe('FINAL_B');
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_15_final_b_cleanup');
  });
});
