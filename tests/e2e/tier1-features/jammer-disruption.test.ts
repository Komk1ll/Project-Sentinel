/**
 * Tier 1: Feature Coverage — Feature 17: Rogue Signal Jammer Disruption
 * Authoritative source: Документ.pdf p. 5–6, panel 10, PROJECT.md § Feature Inventory #17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 1: Rogue Signal Jammer Disruption (Feature 17)', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
    driver.addItem('item_impulse_debugger', 1);
  });

  it('triggers HUD electromagnetic static warning when player approaches within 6 meters', () => {
    const feedback = driver.jammer.approach(5.5);
    expect(feedback.status).toBe('hud_distortion');
    expect(feedback.message).toContain('electromagnetic interference');
  });

  it('triggers physical repulsion field when approaching within 3 meters without disabling antenna', () => {
    const feedback = driver.jammer.approach(2.5);
    expect(feedback.status).toBe('barrier_repulsion');
    expect(feedback.message).toContain('repulsion pushes you back');
  });

  it('rejects pulse discharge if player does not have Impulse Debugger equipped', () => {
    const result = driver.jammer.disableWithPulse('item_unrelated_tool', 1500);
    expect(result.success).toBe(false);
    expect(result.doorsUnlocked).toBe(false);
    expect(result.error).toContain('Impulse Debugger required');
    expect(driver.jammer.isDisabled()).toBe(false);
  });

  it('rejects pulse discharge if windup charge time is under required threshold (<1000ms)', () => {
    const prematurePulse = driver.jammer.disableWithPulse('item_impulse_debugger', 500);
    expect(prematurePulse.success).toBe(false);
    expect(prematurePulse.error).toContain('Insufficient charge time');
    expect(driver.jammer.isDisabled()).toBe(false);
  });

  it('disables rogue antenna mast with full-power EMP pulse and unlocks grand lobby doors', () => {
    expect(driver.jammer.isDisabled()).toBe(false);

    const result = driver.jammer.disableWithPulse('item_impulse_debugger', 1500);
    expect(result.success).toBe(true);
    expect(result.doorsUnlocked).toBe(true);
    expect(driver.jammer.isDisabled()).toBe(true);

    // Approaching now is completely safe
    const feedbackAfter = driver.jammer.approach(1.0);
    expect(feedbackAfter.status).toBe('safe');
    expect(feedbackAfter.message).toContain('Path clear');
  });
});
