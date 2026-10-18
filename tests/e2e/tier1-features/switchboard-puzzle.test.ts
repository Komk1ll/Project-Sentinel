/**
 * Tier 1: Feature Coverage — Feature 15: 3-Step Switchboard Repair Puzzle
 * Authoritative source: Документ.pdf p. 4–5, panels 4, 8, PROJECT.md § Feature Inventory #15
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: 3-Step Switchboard Repair Puzzle (Feature 15)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
    driver.addItem('item_module_battery', 1); // Fuse replacement item
  });

  it('completes full repair sequence in correct order (Isolate -> Insert Fuse -> Reboot Grid)', () => {
    expect(driver.switchboard.getState().isComplete).toBe(false);

    // Step 1: Isolate Line
    const step1 = driver.switchboard.isolateLine();
    expect(step1.success).toBe(true);
    expect(driver.switchboard.getState().lineIsolated).toBe(true);

    // Step 2: Insert Fuse
    const step2 = driver.switchboard.insertFuse('item_module_battery');
    expect(step2.success).toBe(true);
    expect(driver.switchboard.getState().fuseInserted).toBe(true);

    // Step 3: Reboot Master Grid
    const step3 = driver.switchboard.rebootGrid();
    expect(step3.success).toBe(true);
    expect(step3.powerRestored).toBe(true);
    expect(driver.switchboard.getState().isComplete).toBe(true);
  });

  it('warns of residual voltage and rejects fuse insertion if line is not isolated first', () => {
    // Attempt Step 2 before Step 1
    const invalidStep = driver.switchboard.insertFuse('item_module_battery');
    expect(invalidStep.success).toBe(false);
    expect(invalidStep.message).toContain('residual voltage');
    expect(driver.switchboard.getState().fuseInserted).toBe(false);
  });

  it('trips circuit breaker if attempting to reboot grid before installing fuse', () => {
    // Step 1 done, but Step 2 skipped
    driver.switchboard.isolateLine();
    const prematureReboot = driver.switchboard.rebootGrid();

    expect(prematureReboot.success).toBe(false);
    expect(prematureReboot.powerRestored).toBe(false);
    expect(prematureReboot.message).toContain('Circuit breaker tripped');
  });

  it('blocks fuse insertion if required replacement component is missing from inventory', () => {
    driver.removeItem('item_module_battery', 1); // Remove fuse from backpack
    driver.switchboard.isolateLine();

    const missingFuseRes = driver.switchboard.insertFuse('item_module_battery');
    expect(missingFuseRes.success).toBe(false);
    expect(missingFuseRes.message).toContain('Required component missing');
    expect(driver.switchboard.getState().fuseInserted).toBe(false);
  });

  it('exposes complete state object detailing all 3 circuit phases', () => {
    const initialState = driver.switchboard.getState();
    expect(initialState.lineIsolated).toBe(false);
    expect(initialState.fuseInserted).toBe(false);
    expect(initialState.gridRebooted).toBe(false);
    expect(initialState.isComplete).toBe(false);

    driver.switchboard.isolateLine();
    driver.switchboard.insertFuse('item_module_battery');
    driver.switchboard.rebootGrid();

    const finalState = driver.switchboard.getState();
    expect(finalState.isComplete).toBe(true);
  });
});
