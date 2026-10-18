/**
 * Tier 2: Boundary & Corner Cases — CCTV Playback Boundaries
 * Authoritative source: spec_miner_survey_1/handoff.md § Edge Cases #11, Документ.pdf p. 3–4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaignDriver, CampaignDriver } from '../harness';

describe('Tier 2: CCTV Playback Boundary & Corner Cases', () => {
  let driver: CampaignDriver;

  beforeEach(() => {
    driver = createCampaignDriver();
  });

  it('Edge Case 1: rejects access to CCTV playback while terminal remains unpowered', () => {
    expect(driver.cctv.isPowered()).toBe(false);
    const result = driver.cctv.rewind(15);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Terminal unpowered');
    expect(result.footageId).toBeUndefined();
  });

  it('Edge Case 2: rejects rewind query when timeline offset is insufficient (<10 minutes)', () => {
    driver.cctv.powerTerminal(true);
    const result = driver.cctv.rewind(2);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Incident occurred 15 minutes ago');
  });

  it('Edge Case 3: handles zero or negative rewind values safely without crashing', () => {
    driver.cctv.powerTerminal(true);
    const zeroRewind = driver.cctv.rewind(0);
    expect(zeroRewind.success).toBe(false);

    const negRewind = driver.cctv.rewind(-5);
    expect(negRewind.success).toBe(false);
  });

  it('Edge Case 4: maintains complete state upon multiple review iterations', () => {
    driver.cctv.powerTerminal(true);
    const review1 = driver.cctv.rewind(15);
    expect(review1.success).toBe(true);
    expect(driver.cctv.isComplete()).toBe(true);

    const review2 = driver.cctv.rewind(20);
    expect(review2.success).toBe(true);
    expect(driver.cctv.isComplete()).toBe(true);
  });

  it('Edge Case 5: toggling power state off resets terminal readiness', () => {
    driver.cctv.powerTerminal(true);
    expect(driver.cctv.isPowered()).toBe(true);

    driver.cctv.powerTerminal(false);
    expect(driver.cctv.isPowered()).toBe(false);

    const attempt = driver.cctv.rewind(15);
    expect(attempt.success).toBe(false);
    expect(attempt.error).toContain('Terminal unpowered');
  });
});
