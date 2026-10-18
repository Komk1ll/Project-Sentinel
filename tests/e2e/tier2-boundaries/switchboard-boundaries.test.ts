/**
 * Tier 2: Boundary & Corner Cases — Switchboard Puzzle Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #8, #9, #10, Документ.pdf p. 4–5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Switchboard Puzzle Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
    driver.addItem('item_module_battery', 1);
  });

  it('Edge Case 1: throws circuit breaker if master switch is turned on before replacing fuse', () => {
    // Attempt reboot with 0 steps done
    const res = driver.switchboard.rebootGrid();
    expect(res.success).toBe(false);
    expect(res.powerRestored).toBe(false);
    expect(res.message).toContain('Circuit breaker tripped');

    // Attempt reboot with only Step 1 done
    driver.switchboard.isolateLine();
    const res2 = driver.switchboard.rebootGrid();
    expect(res2.success).toBe(false);
    expect(res2.powerRestored).toBe(false);
  });

  it('Edge Case 2: generates electrical arc spark warning if fuse is inserted before line isolation', () => {
    const invalidInsert = driver.switchboard.insertFuse('item_module_battery');
    expect(invalidInsert.success).toBe(false);
    expect(invalidInsert.message).toContain('residual voltage');
    expect(driver.switchboard.getState().fuseInserted).toBe(false);
  });

  it('Edge Case 3: rejects fuse insertion if inventory does not contain battery/fuse module', () => {
    driver.removeItem('item_module_battery', 1);
    driver.switchboard.isolateLine();

    const result = driver.switchboard.insertFuse('item_module_battery');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Required component missing');
    expect(driver.switchboard.getState().fuseInserted).toBe(false);
  });

  it('Edge Case 4: handles duplicate line isolation calls idempotently', () => {
    const step1a = driver.switchboard.isolateLine();
    expect(step1a.success).toBe(true);
    const step1b = driver.switchboard.isolateLine();
    expect(step1b.success).toBe(true);

    expect(driver.switchboard.getState().lineIsolated).toBe(true);
  });

  it('Edge Case 5: retains completed power state upon subsequent redundant interactions', () => {
    driver.switchboard.isolateLine();
    driver.switchboard.insertFuse('item_module_battery');
    const firstReboot = driver.switchboard.rebootGrid();
    expect(firstReboot.powerRestored).toBe(true);

    // Second reboot call
    const secondReboot = driver.switchboard.rebootGrid();
    expect(secondReboot.success).toBe(true);
    expect(secondReboot.powerRestored).toBe(true);
    expect(driver.switchboard.getState().isComplete).toBe(true);
  });
});
