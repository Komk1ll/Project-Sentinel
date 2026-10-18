/**
 * Tier 2: Boundary & Corner Cases — Jammer Antenna Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #13, Документ.pdf p. 5–6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: Jammer Antenna Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: approaching antenna within 6m triggers HUD static noise distortion', () => {
    const feedback = driver.jammer.approach(5.8);
    expect(feedback.status).toBe('hud_distortion');
    expect(feedback.message).toContain('Warning: Strong electromagnetic interference');
  });

  it('Edge Case 2: approaching within 3m triggers physical repulsion barrier', () => {
    const feedback = driver.jammer.approach(2.0);
    expect(feedback.status).toBe('barrier_repulsion');
    expect(feedback.message).toContain('repulsion pushes you back');
  });

  it('Edge Case 3: firing pulse with insufficient charge time (<1000ms) fails to disable transmitter', () => {
    driver.addItem('item_impulse_debugger', 1);
    const result = driver.jammer.disableWithPulse('item_impulse_debugger', 800);

    expect(result.success).toBe(false);
    expect(result.doorsUnlocked).toBe(false);
    expect(result.error).toContain('Insufficient charge time');
    expect(driver.jammer.isDisabled()).toBe(false);
  });

  it('Edge Case 4: firing with invalid/unrelated tool fails to trigger EMP disruption', () => {
    const result = driver.jammer.disableWithPulse('item_scrap_metal', 2000);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Impulse Debugger required');
    expect(driver.jammer.isDisabled()).toBe(false);
  });

  it('Edge Case 5: interacting with jammer after already disabled is safe and does not re-enable barrier', () => {
    driver.addItem('item_impulse_debugger', 1);
    driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    expect(driver.jammer.isDisabled()).toBe(true);

    // Second disable call
    const redundant = driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    expect(redundant.success).toBe(true);
    expect(redundant.doorsUnlocked).toBe(true);
    expect(driver.jammer.isDisabled()).toBe(true);

    const safeApproach = driver.jammer.approach(1.5);
    expect(safeApproach.status).toBe('safe');
  });
});
