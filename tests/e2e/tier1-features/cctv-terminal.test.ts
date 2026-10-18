/**
 * Tier 1: Feature Coverage — Feature 16: CCTV Playback Terminal
 * Authoritative source: Документ.pdf p. 3–4, panel 6, PROJECT.md § Feature Inventory #16
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: CCTV Playback Terminal (Feature 16)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('rejects access when terminal is unpowered and prompts for power restoration', () => {
    expect(driver.cctv.isPowered()).toBe(false);
    const result = driver.cctv.rewind(15);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Terminal unpowered');
    expect(driver.cctv.isComplete()).toBe(false);
  });

  it('powers on terminal successfully when backup battery or wing power is connected', () => {
    const powered = driver.cctv.powerTerminal(true);
    expect(powered).toBe(true);
    expect(driver.cctv.isPowered()).toBe(true);
  });

  it('requires rewinding at least 10 minutes to locate incident footage', () => {
    driver.cctv.powerTerminal(true);
    const insufficientRewind = driver.cctv.rewind(5);

    expect(insufficientRewind.success).toBe(false);
    expect(insufficientRewind.error).toContain('Incident occurred 15 minutes ago');
  });

  it('successfully plays security footage revealing Robo-Dog fleeing to Winter Garden', () => {
    driver.cctv.powerTerminal(true);
    const result = driver.cctv.rewind(15);

    expect(result.success).toBe(true);
    expect(result.footageId).toBe('cctv_archive_dog_heist');
    expect(result.clueLocation).toBe('zone_06_winter_garden');
    expect(driver.cctv.isComplete()).toBe(true);
  });

  it('updates quest state and unlocks Winter Garden investigation objective upon CCTV review', () => {
    // Start Quest 6
    driver.advanceToQuest('quest_06_cctv_clue');

    driver.cctv.powerTerminal(true);
    const footage = driver.cctv.rewind(15);
    expect(footage.success).toBe(true);

    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_01_power_cctv');
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_02_rewind_footage');
    driver.quest.completeObjective('quest_06_cctv_clue', 'obj_03_locate_dog_path');

    expect(driver.quest.isQuestCompleted('quest_06_cctv_clue')).toBe(true);
    expect(driver.getWorldFlags().FLAG_CCTV_REVIEWED).toBe(true);
  });
});
