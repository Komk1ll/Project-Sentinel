/**
 * Tier 1: Feature Coverage — Feature 1: 15-Quest Campaign State Machine
 * Authoritative source: Документ.pdf, PROJECT.md § Feature Inventory #1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: 15-Quest Campaign State Machine (Feature 1)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('initializes with Quest 1 active and subsequent quests locked', () => {
    const active = driver.quest.getActiveQuest();
    expect(active).not.toBeNull();
    expect(active?.id).toBe('quest_01_gate_barrier');

    const state = driver.quest.getState();
    expect(state['quest_01_gate_barrier']?.status).toBe('active');
    expect(state['quest_02_deans_password']?.status).toBe('locked');
    expect(state['quest_12_datacenter_heart']?.status).toBe('locked');
  });

  it('progresses sequentially through objectives within Quest 1', () => {
    const q1 = driver.quest.getActiveQuest();
    expect(q1?.id).toBe('quest_01_gate_barrier');

    // Complete objective 1
    const res1 = driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    expect(res1).toBe(true);

    let state = driver.quest.getState()['quest_01_gate_barrier'];
    expect(state?.currentObjectiveIndex).toBe(1);
    expect(state?.completedObjectives).toContain('obj_01_radio_curator');

    // Attempt completing out-of-order objective 3 directly (must fail)
    const invalidSkip = driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    expect(invalidSkip).toBe(false);

    // Complete objective 2
    const res2 = driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    expect(res2).toBe(true);

    // Complete objective 3
    const res3 = driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');
    expect(res3).toBe(true);

    // Quest 1 should now be completed
    state = driver.quest.getState()['quest_01_gate_barrier'];
    expect(state?.status).toBe('completed');
    expect(driver.getWorldFlags().FLAG_GATE_BYPASSED).toBe(true);
  });

  it('prevents starting future quests before prerequisites are met', () => {
    // Attempt starting Quest 5 while Quest 1 is still incomplete
    const startedPremature = driver.quest.startQuest('quest_05_server_deadend');
    expect(startedPremature).toBe(false);

    const state = driver.quest.getState();
    expect(state['quest_05_server_deadend']?.status).toBe('locked');
  });

  it('unlocks dependent Quest 2 immediately upon Quest 1 completion', () => {
    // Complete Quest 1
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');

    expect(driver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);

    const state = driver.quest.getState();
    expect(state['quest_02_deans_password']?.status).toBe('available');

    // Start Quest 2
    const started = driver.quest.startQuest('quest_02_deans_password');
    expect(started).toBe(true);
    expect(driver.quest.getActiveQuest()?.id).toBe('quest_02_deans_password');
  });

  it('tracks completed quest flags accurately across multiple quests', () => {
    // Complete Quest 1
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');

    // Start & complete Quest 2
    driver.quest.startQuest('quest_02_deans_password');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_01_read_monitor_hint');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_02_enter_keypad_code');
    driver.quest.completeObjective('quest_02_deans_password', 'obj_03_acquire_debugger');

    expect(driver.quest.isQuestCompleted('quest_01_gate_barrier')).toBe(true);
    expect(driver.quest.isQuestCompleted('quest_02_deans_password')).toBe(true);

    const flags = driver.getWorldFlags();
    expect(flags.FLAG_GATE_BYPASSED).toBe(true);
    expect(flags.FLAG_DEANS_DOOR_UNLOCKED).toBe(true);
  });

  it('queries active quest record and returns null when no quest is currently active', () => {
    // Complete Quest 1 without starting Quest 2
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_01_radio_curator');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_02_evade_patrol');
    driver.quest.completeObjective('quest_01_gate_barrier', 'obj_03_reach_basement');

    expect(driver.quest.getActiveQuest()).toBeNull();
  });
});
