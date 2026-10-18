/**
 * Tier 2: Boundary & Corner Cases — Server Door & Mechanical Vault Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #12, Документ.pdf p. 3, 6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Server Door & Mechanical Vault Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: electronic access rejected when attempting digital unlock on server vault door', () => {
    // Attempting digital interaction without physical keys
    driver.advanceToQuest('quest_05_server_deadend');
    const hasKeys = driver.hasItem('item_server_keyring');
    expect(hasKeys).toBe(false);

    // Player discovers digital hacking fails
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_01_inspect_server_door');
    driver.quest.completeObjective('quest_05_server_deadend', 'obj_02_find_mechanical_lock');
    expect(driver.getWorldFlags().FLAG_SERVER_DOOR_INSPECTED).toBe(false); // only 2/3 done

    driver.quest.completeObjective('quest_05_server_deadend', 'obj_03_inspect_security_post');
    expect(driver.getWorldFlags().FLAG_SERVER_DOOR_INSPECTED).toBe(true);
  });

  it('Edge Case 2: fails to unlock vault door when holding incorrect items (casing or battery)', () => {
    driver.addItem('item_module_casing', 1);
    driver.addItem('item_module_battery', 1);

    expect(driver.hasItem('item_server_keyring')).toBe(false);
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBeFalsy();
  });

  it('Edge Case 3: unlocks vault door successfully when master brass key ring is in inventory', () => {
    driver.advanceToQuest('quest_12_datacenter_heart');
    driver.addItem('item_server_keyring', 1);

    expect(driver.hasItem('item_server_keyring')).toBe(true);
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');

    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);
  });

  it('Edge Case 4: maintains unlocked door state persistently across save/load', () => {
    driver.advanceToQuest('quest_12_datacenter_heart');
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_01_reach_vault_door');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_02_use_brass_keys');
    driver.quest.completeObjective('quest_12_datacenter_heart', 'obj_03_rendezvous_professor');

    const save = driver.createSaveData();
    expect(save.doorStates.server_vault_door).toBe(true);

    const fresh = createCampaignDriver();
    fresh.loadSaveData(save);
    expect(fresh.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);
  });

  it('Edge Case 5: handles interaction after door is already unlocked without redundant consumption', () => {
    driver.advanceToQuest('quest_12_datacenter_heart');
    driver.addItem('item_server_keyring', 1);
    driver.quest.completeQuest('quest_12_datacenter_heart');

    expect(driver.quest.isQuestCompleted('quest_12_datacenter_heart')).toBe(true);
    // Door remains unlocked
    expect(driver.getWorldFlags().FLAG_DATACENTER_ACCESSED).toBe(true);
  });
});
